// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import "@chainlink/contracts/src/v0.8/automation/AutomationCompatible.sol";

/**
 * @title AegisSentinel
 * @notice Decentralized security layer that monitors risk signals via Chainlink
 *         and selectively blocks dangerous functions during threat conditions.
 */
contract AegisSentinel is Ownable, ReentrancyGuard, Pausable, AutomationCompatibleInterface {

    // ─── State ───────────────────────────────────────────────────────────────

    AggregatorV3Interface public priceFeed;

    uint256 public riskScore;            // 0-100
    uint256 public priceThreshold;       // % deviation that raises risk (default 5)
    uint256 public lastAnalyzedAt;
    uint256 public lastPrice;
    uint256 public totalDeposits;
    uint256 public upkeepInterval;       // seconds between automated checks

    // Per-function blocking: selector => blocked
    mapping(bytes4 => bool) public functionBlocked;

    // Burst detection: selector => (callCount, windowStart)
    mapping(bytes4 => uint256) public selectorCallCount;
    mapping(bytes4 => uint256) public selectorWindowStart;
    uint256 public burstWindow    = 60;  // 60-second window
    uint256 public burstThreshold = 5;   // >5 calls in window → spike risk

    // Risk thresholds
    uint256 public constant RISK_LOW       = 40;
    uint256 public constant RISK_MED       = 70;
    uint256 public constant RISK_HIGH      = 85;

    // Function selectors
    bytes4 public constant SEL_DEPOSIT    = bytes4(keccak256("deposit()"));
    bytes4 public constant SEL_WITHDRAW   = bytes4(keccak256("withdraw(uint256)"));
    bytes4 public constant SEL_TRADE      = bytes4(keccak256("trade(string,uint256)"));
    bytes4 public constant SEL_BORROW     = bytes4(keccak256("borrow(uint256)"));
    bytes4 public constant SEL_REPAY      = bytes4(keccak256("repay(uint256)"));
    bytes4 public constant SEL_LIQUIDATE  = bytes4(keccak256("liquidate(address)"));

    // ─── Events ──────────────────────────────────────────────────────────────

    event RiskUpdated(uint256 indexed newScore, uint256 priceDeviation, string trigger);
    event FunctionBlocked(bytes4 indexed selector, string name, uint256 riskScore);
    event FunctionUnblocked(bytes4 indexed selector, string name);
    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event Traded(address indexed user, string pair, uint256 amount);
    event Borrowed(address indexed user, uint256 amount);
    event Repaid(address indexed user, uint256 amount);
    event Liquidated(address indexed caller, address indexed target);
    event AttackSimulated(uint256 riskLevel, address triggeredBy);
    event EmergencyPauseTriggered(address by);

    // ─── Modifiers ───────────────────────────────────────────────────────────

    modifier functionAllowed() {
        require(!functionBlocked[msg.sig], "AegisSentinel: function blocked due to elevated risk");
        _trackBurst(msg.sig);
        _;
    }

    // ─── Constructor ─────────────────────────────────────────────────────────

    constructor(address _priceFeed, uint256 _priceThreshold) Ownable(msg.sender) {
        priceFeed       = AggregatorV3Interface(_priceFeed);
        priceThreshold  = _priceThreshold;
        upkeepInterval  = 600; // 10 minutes
        lastAnalyzedAt  = block.timestamp;

        (, int256 price,,,) = priceFeed.latestRoundData();
        lastPrice = uint256(price);
    }

    // ─── Guarded Protocol Functions ───────────────────────────────────────────

    function deposit() external payable whenNotPaused functionAllowed nonReentrant {
        require(msg.value > 0, "Must send ETH");
        totalDeposits += msg.value;
        emit Deposited(msg.sender, msg.value);
    }

    function withdraw(uint256 amount) external whenNotPaused functionAllowed nonReentrant {
        require(address(this).balance >= amount, "Insufficient balance");
        (bool ok,) = payable(msg.sender).call{value: amount}("");
        require(ok, "Transfer failed");
        emit Withdrawn(msg.sender, amount);
    }

    function trade(string calldata pair, uint256 amount) external whenNotPaused functionAllowed {
        emit Traded(msg.sender, pair, amount);
    }

    function borrow(uint256 amount) external whenNotPaused functionAllowed {
        emit Borrowed(msg.sender, amount);
    }

    function repay(uint256 amount) external payable whenNotPaused functionAllowed {
        emit Repaid(msg.sender, amount);
    }

    function liquidate(address target) external whenNotPaused functionAllowed {
        emit Liquidated(msg.sender, target);
    }

    // ─── Risk Engine ─────────────────────────────────────────────────────────

    function analyzeRisk() public {
        (, int256 currentPriceInt,,,) = priceFeed.latestRoundData();
        uint256 currentPrice = uint256(currentPriceInt);

        uint256 deviation = 0;
        if (lastPrice > 0) {
            uint256 delta = currentPrice > lastPrice
                ? currentPrice - lastPrice
                : lastPrice - currentPrice;
            deviation = (delta * 100) / lastPrice;
        }

        uint256 score = 0;

        // Price deviation component (max 60 pts)
        if (deviation >= 20) {
            score += 60;
        } else if (deviation >= 10) {
            score += 40;
        } else if (deviation >= priceThreshold) {
            score += deviation * 3;
        }

        // Burst detection (max 40 pts)
        bytes4[4] memory dangerSelectors = [SEL_WITHDRAW, SEL_TRADE, SEL_BORROW, SEL_LIQUIDATE];
        for (uint i = 0; i < dangerSelectors.length; i++) {
            uint256 cnt = selectorCallCount[dangerSelectors[i]];
            if (cnt > burstThreshold) {
                score += 10;
            }
        }
        if (score > 100) score = 100;

        riskScore  = score;
        lastPrice  = currentPrice;
        lastAnalyzedAt = block.timestamp;

        emit RiskUpdated(score, deviation, "auto");
        _executeResponse();
    }

    function _executeResponse() internal {
        if (riskScore >= RISK_HIGH) {
            // Block: withdraw, trade, borrow, liquidate
            _setBlocked(SEL_WITHDRAW,  "withdraw",  true);
            _setBlocked(SEL_TRADE,     "trade",     true);
            _setBlocked(SEL_BORROW,    "borrow",    true);
            _setBlocked(SEL_LIQUIDATE, "liquidate", true);
            // Keep deposit and repay open
            _setBlocked(SEL_DEPOSIT, "deposit", false);
            _setBlocked(SEL_REPAY,   "repay",   false);
        } else if (riskScore >= RISK_MED) {
            _setBlocked(SEL_WITHDRAW,  "withdraw",  true);
            _setBlocked(SEL_TRADE,     "trade",     true);
            _setBlocked(SEL_BORROW,    "borrow",    true);
            _setBlocked(SEL_LIQUIDATE, "liquidate", false);
            _setBlocked(SEL_DEPOSIT,   "deposit",   false);
            _setBlocked(SEL_REPAY,     "repay",     false);
        } else if (riskScore >= RISK_LOW) {
            _setBlocked(SEL_TRADE,    "trade",    true);
            _setBlocked(SEL_WITHDRAW, "withdraw", false);
            _setBlocked(SEL_BORROW,   "borrow",   false);
            _setBlocked(SEL_LIQUIDATE,"liquidate",false);
            _setBlocked(SEL_DEPOSIT,  "deposit",  false);
            _setBlocked(SEL_REPAY,    "repay",    false);
        } else {
            // All clear
            _setBlocked(SEL_DEPOSIT,  "deposit",   false);
            _setBlocked(SEL_WITHDRAW, "withdraw",  false);
            _setBlocked(SEL_TRADE,    "trade",     false);
            _setBlocked(SEL_BORROW,   "borrow",    false);
            _setBlocked(SEL_REPAY,    "repay",     false);
            _setBlocked(SEL_LIQUIDATE,"liquidate", false);
        }
    }

    function _setBlocked(bytes4 sel, string memory name, bool blocked) internal {
        if (functionBlocked[sel] != blocked) {
            functionBlocked[sel] = blocked;
            if (blocked) emit FunctionBlocked(sel, name, riskScore);
            else         emit FunctionUnblocked(sel, name);
        }
    }

    function _trackBurst(bytes4 sel) internal {
        if (block.timestamp > selectorWindowStart[sel] + burstWindow) {
            selectorWindowStart[sel] = block.timestamp;
            selectorCallCount[sel]   = 0;
        }
        selectorCallCount[sel]++;
    }

    // ─── Chainlink Automation ────────────────────────────────────────────────

    function checkUpkeep(bytes calldata /* checkData */)
        external
        view
        override
        returns (bool upkeepNeeded, bytes memory performData)
    {
        bool timeElapsed = (block.timestamp - lastAnalyzedAt) >= upkeepInterval;

        (, int256 currentPriceInt,,,) = priceFeed.latestRoundData();
        uint256 currentPrice = uint256(currentPriceInt);
        uint256 deviation = 0;
        if (lastPrice > 0) {
            uint256 delta = currentPrice > lastPrice
                ? currentPrice - lastPrice
                : lastPrice - currentPrice;
            deviation = (delta * 100) / lastPrice;
        }
        bool priceSpike = deviation >= priceThreshold;

        upkeepNeeded = timeElapsed || priceSpike;
        performData = "";
    }

    function performUpkeep(bytes calldata /* performData */) external override {
        analyzeRisk();
    }

    // ─── Admin Functions ──────────────────────────────────────────────────────

    /// @notice Manually block or unblock a function by its 4-byte selector
    function setBlockedManually(bytes4 selector, string calldata name, bool blocked) external onlyOwner {
        functionBlocked[selector] = blocked;
        if (blocked) emit FunctionBlocked(selector, name, riskScore);
        else         emit FunctionUnblocked(selector, name);
    }

    function setPriceFeed(address _feed) external onlyOwner {
        priceFeed = AggregatorV3Interface(_feed);
    }

    function setPriceThreshold(uint256 _threshold) external onlyOwner {
        priceThreshold = _threshold;
    }

    function setUpkeepInterval(uint256 _interval) external onlyOwner {
        upkeepInterval = _interval;
    }

    function setBurstParams(uint256 _window, uint256 _threshold) external onlyOwner {
        burstWindow    = _window;
        burstThreshold = _threshold;
    }

    function setRiskScoreManually(uint256 _score) external onlyOwner {
        require(_score <= 100, "Out of range");
        riskScore = _score;
        emit RiskUpdated(_score, 0, "manual");
        _executeResponse();
    }

    /// @notice Simulate an attack for demos (sets risk and triggers response)
    function simulateAttack(uint256 _riskLevel) external onlyOwner {
        require(_riskLevel <= 100, "Out of range");
        riskScore = _riskLevel;
        emit AttackSimulated(_riskLevel, msg.sender);
        emit RiskUpdated(_riskLevel, 0, "simulated");
        _executeResponse();
    }

    function emergencyPause() external onlyOwner {
        _pause();
        emit EmergencyPauseTriggered(msg.sender);
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function resetRisk() external onlyOwner {
        riskScore = 0;
        _executeResponse();
        emit RiskUpdated(0, 0, "reset");
    }

    receive() external payable {}
}

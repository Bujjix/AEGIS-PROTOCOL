const { expect } = require("chai");
const { ethers } = require("hardhat");

// ── Mock Chainlink Aggregator ────────────────────────────────────────────────
const MockAggregatorABI = [
    "function setPrice(int256 _price) external",
    "function latestRoundData() external view returns (uint80,int256,uint256,uint256,uint80)",
];

async function deployMockAggregator(deployer) {
    // Inline mock – deploy a simple mock contract
    const Mock = await ethers.getContractFactory("MockV3Aggregator");
    const mock = await Mock.deploy(8, 200000000000); // 8 decimals, $2000.00
    await mock.waitForDeployment();
    return mock;
}

describe("AegisSentinel", function () {
    let sentinel, mock, owner, user1;

    beforeEach(async () => {
        [owner, user1] = await ethers.getSigners();

        // Deploy mock price feed
        const Mock = await ethers.getContractFactory("MockV3Aggregator");
        mock = await Mock.deploy(8, 200000000000n); // $2000
        await mock.waitForDeployment();

        // Deploy AegisSentinel
        const Sentinel = await ethers.getContractFactory("AegisSentinel");
        sentinel = await Sentinel.deploy(await mock.getAddress(), 5);
        await sentinel.waitForDeployment();
    });

    // ── Deposit / Withdraw ─────────────────────────────────────────────────────

    describe("deposit & withdraw", () => {
        it("accepts ETH deposits", async () => {
            await expect(
                sentinel.connect(user1).deposit({ value: ethers.parseEther("1") })
            ).to.emit(sentinel, "Deposited").withArgs(user1.address, ethers.parseEther("1"));
        });

        it("allows withdrawal when risk is low", async () => {
            await sentinel.deposit({ value: ethers.parseEther("2") });
            await expect(
                sentinel.withdraw(ethers.parseEther("1"))
            ).to.emit(sentinel, "Withdrawn");
        });

        it("reverts withdraw when function is blocked", async () => {
            // Simulate high-risk attack to block withdraw
            await sentinel.simulateAttack(85);

            await sentinel.deposit({ value: ethers.parseEther("1") });
            await expect(
                sentinel.withdraw(ethers.parseEther("0.5"))
            ).to.be.revertedWith("AegisSentinel: function blocked due to elevated risk");
        });
    });

    // ── Risk Engine ────────────────────────────────────────────────────────────

    describe("risk engine", () => {
        it("starts with zero risk", async () => {
            expect(await sentinel.riskScore()).to.equal(0n);
        });

        it("simulateAttack sets risk correctly", async () => {
            await sentinel.simulateAttack(75);
            expect(await sentinel.riskScore()).to.equal(75n);
        });

        it("blocks withdraw/trade/borrow at risk >= 70", async () => {
            await sentinel.simulateAttack(75);

            const withdrawSel = sentinel.interface.getFunction("withdraw(uint256)").selector;
            const tradeSel = sentinel.interface.getFunction("trade(string,uint256)").selector;
            const borrowSel = sentinel.interface.getFunction("borrow(uint256)").selector;

            expect(await sentinel.functionBlocked(withdrawSel)).to.be.true;
            expect(await sentinel.functionBlocked(tradeSel)).to.be.true;
            expect(await sentinel.functionBlocked(borrowSel)).to.be.true;
        });

        it("keeps deposit and repay open at risk >= 70", async () => {
            await sentinel.simulateAttack(75);

            const depositSel = sentinel.interface.getFunction("deposit()").selector;
            const repaySel = sentinel.interface.getFunction("repay(uint256)").selector;

            expect(await sentinel.functionBlocked(depositSel)).to.be.false;
            expect(await sentinel.functionBlocked(repaySel)).to.be.false;
        });

        it("only blocks trade at risk >= 40 and < 70", async () => {
            await sentinel.simulateAttack(50);

            const tradeSel = sentinel.interface.getFunction("trade(string,uint256)").selector;
            const withdrawSel = sentinel.interface.getFunction("withdraw(uint256)").selector;

            expect(await sentinel.functionBlocked(tradeSel)).to.be.true;
            expect(await sentinel.functionBlocked(withdrawSel)).to.be.false;
        });

        it("unblocks all functions after resetRisk", async () => {
            await sentinel.simulateAttack(85);
            await sentinel.resetRisk();

            expect(await sentinel.riskScore()).to.equal(0n);

            const withdrawSel = sentinel.interface.getFunction("withdraw(uint256)").selector;
            expect(await sentinel.functionBlocked(withdrawSel)).to.be.false;
        });
    });

    // ── Price Feed Risk Calculation ────────────────────────────────────────────

    describe("analyzeRisk with price deviation", () => {
        it("raises risk score on large price deviation", async () => {
            // Price jumps from $2000 to $2400 (+20%)
            await mock.updateAnswer(240000000000n);
            await sentinel.analyzeRisk();

            const score = await sentinel.riskScore();
            expect(score).to.be.gte(40n); // at least medium risk
        });
    });

    // ── Access Control ─────────────────────────────────────────────────────────

    describe("access control", () => {
        it("reverts simulateAttack from non-owner", async () => {
            await expect(
                sentinel.connect(user1).simulateAttack(85)
            ).to.be.revertedWithCustomError(sentinel, "OwnableUnauthorizedAccount");
        });

        it("reverts setBlockedManually from non-owner", async () => {
            const sel = sentinel.interface.getFunction("deposit()").selector;
            await expect(
                sentinel.connect(user1).setBlockedManually(sel, "deposit", true)
            ).to.be.revertedWithCustomError(sentinel, "OwnableUnauthorizedAccount");
        });

        it("allows owner to emergency pause and unpause", async () => {
            await sentinel.emergencyPause();
            await expect(
                sentinel.deposit({ value: ethers.parseEther("1") })
            ).to.be.revertedWithCustomError(sentinel, "EnforcedPause");

            await sentinel.unpause();
            await expect(
                sentinel.deposit({ value: ethers.parseEther("1") })
            ).to.emit(sentinel, "Deposited");
        });
    });

    // ── Chainlink Automation ───────────────────────────────────────────────────

    describe("checkUpkeep / performUpkeep", () => {
        it("upkeep not needed immediately", async () => {
            const [needed] = await sentinel.checkUpkeep("0x");
            expect(needed).to.be.false;
        });

        it("upkeep needed after price spike", async () => {
            await mock.updateAnswer(250000000000n); // big spike
            const [needed] = await sentinel.checkUpkeep("0x");
            expect(needed).to.be.true;
        });
    });
});

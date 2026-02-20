// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MockV3Aggregator
 * @notice Minimal Chainlink AggregatorV3Interface mock for local testing.
 */
contract MockV3Aggregator {
    uint8  public decimals;
    int256 public latestAnswer;
    uint80 private _roundId;

    constructor(uint8 _decimals, int256 _initialAnswer) {
        decimals     = _decimals;
        latestAnswer = _initialAnswer;
        _roundId     = 1;
    }

    function updateAnswer(int256 _answer) external {
        latestAnswer = _answer;
        _roundId++;
    }

    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        return (_roundId, latestAnswer, block.timestamp, block.timestamp, _roundId);
    }
}

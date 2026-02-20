const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying with:", deployer.address);
    console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

    // Sepolia ETH/USD Chainlink Price Feed
    const PRICE_FEED = process.env.PRICE_FEED_ADDRESS || "0x694AA1769357215DE4FAC081bf1f309aDC325306";
    const THRESHOLD = process.env.PRICE_THRESHOLD || 5;

    console.log("\nDeploying AegisSentinel...");
    console.log("  Price Feed :", PRICE_FEED);
    console.log("  Threshold  :", THRESHOLD, "%");

    const AegisSentinel = await ethers.getContractFactory("AegisSentinel");
    const sentinel = await AegisSentinel.deploy(PRICE_FEED, THRESHOLD);
    await sentinel.waitForDeployment();

    const address = await sentinel.getAddress();
    console.log("\n✅ AegisSentinel deployed to:", address);
    console.log("\nAdd this to your .env:");
    console.log(`NEXT_PUBLIC_CONTRACT_ADDRESS=${address}`);
}

main().catch((e) => { console.error(e); process.exit(1); });

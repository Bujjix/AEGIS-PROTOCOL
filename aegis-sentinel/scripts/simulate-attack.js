const { ethers } = require("hardhat");

async function main() {
    const CONTRACT = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
    if (!CONTRACT) throw new Error("Set NEXT_PUBLIC_CONTRACT_ADDRESS in .env");

    const [owner] = await ethers.getSigners();
    const sentinel = await ethers.getContractAt("AegisSentinel", CONTRACT, owner);

    console.log("── Aegis Sentinel Attack Simulator ──────────────────");
    console.log("Contract :", CONTRACT);

    // 1. Read initial state
    let risk = await sentinel.riskScore();
    console.log("\n[BEFORE] Risk Score:", risk.toString());

    // 2. Simulate oracle attack — set risk to 85
    console.log("\n🚨 Triggering simulated oracle attack (risk=85)...");
    const tx = await sentinel.simulateAttack(85);
    await tx.wait();
    console.log("   tx:", tx.hash);

    // 3. Print new state
    risk = await sentinel.riskScore();
    const iface = new ethers.Interface([
        "function withdraw(uint256)",
        "function trade(string,uint256)",
        "function borrow(uint256)",
        "function liquidate(address)",
        "function deposit()",
        "function repay(uint256)",
    ]);

    const fns = ["withdraw(uint256)", "trade(string,uint256)", "borrow(uint256)", "liquidate(address)", "deposit()", "repay(uint256)"];
    console.log("\n[AFTER] Risk Score:", risk.toString());
    console.log("\nFunction Status:");
    for (const fn of fns) {
        const sel = iface.getFunction(fn).selector;
        const blocked = await sentinel.functionBlocked(sel);
        console.log(`  ${fn.padEnd(28)} → ${blocked ? "🔴 BLOCKED" : "🟢 ACTIVE"}`);
    }

    // 4. Wait 15 seconds then reset
    console.log("\n⏳ Waiting 15 seconds then resetting...");
    await new Promise(r => setTimeout(r, 15000));
    const rtx = await sentinel.resetRisk();
    await rtx.wait();

    risk = await sentinel.riskScore();
    console.log("\n✅ Risk reset. Score:", risk.toString());
}

main().catch((e) => { console.error(e); process.exit(1); });

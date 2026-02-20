# 🛡️ Aegis Sentinel Protocol

> **Decentralized real-time security layer for smart contracts — powered by Chainlink.**

---

## Problem Statement

DeFi protocols are vulnerable to oracle manipulation, flash loan attacks, and liquidity exploits. Traditional security relies on post-incident patches. **Aegis Sentinel** monitors risk signals *on-chain in real time* and selectively blocks dangerous functions (e.g., `withdraw` during an oracle attack) while keeping safe functions (e.g., `deposit`, `repay`) open.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    AEGIS SENTINEL                        │
│                                                         │
│   Chainlink Price Feed ──→ Risk Engine (analyzeRisk)    │
│         │                        │                      │
│   Chainlink Automation    Response Engine               │
│   (checkUpkeep /          (_executeResponse)            │
│    performUpkeep)                │                      │
│                          mapping (selector → blocked)   │
│                                  │                      │
│        ┌─────────────────────────┴──────────────┐      │
│        ▼           ▼           ▼        ▼        ▼      │
│   deposit()  withdraw()  trade()  borrow()  repay()     │
│   ✅ OPEN    🔴 BLOCKED  🔴BLOCK  🔴BLOCK  ✅ OPEN     │
└─────────────────────────────────────────────────────────┘
```

### How It Works

1. **Chainlink Automation** calls `performUpkeep` every 10 min, or when price deviation exceeds threshold.
2. `analyzeRisk()` computes a 0–100 risk score from: price deviation + call burst detection.
3. `_executeResponse()` applies tier-based blocking:
   - **0–39**: All functions open
   - **40–69**: `trade()` blocked
   - **70–84**: `withdraw`, `trade`, `borrow` blocked
   - **85–100**: All high-risk functions blocked (`withdraw`, `trade`, `borrow`, `liquidate`)
4. Admin can manually block/unblock, set thresholds, and emergency-pause.
5. Frontend polls state every 15 seconds (or via Chainlink events) and visualises risk.

---

## Tech Stack

| Layer         | Technology                                         |
|---------------|----------------------------------------------------|
| Smart Contract| Solidity 0.8.19, OpenZeppelin, Chainlink           |
| Tests         | Hardhat + Chai                                     |
| Frontend      | Next.js 14, TypeScript, TailwindCSS, Framer Motion |
| Charts        | Recharts (RadarChart, LineChart)                   |
| Web3          | Ethers.js v6, Wagmi v2, RainbowKit v2              |

---

## Project Structure

```
aegis-sentinel/
├── contracts/
│   ├── AegisSentinel.sol        # Main guarded contract
│   └── MockV3Aggregator.sol     # Local test price feed
├── scripts/
│   ├── deploy.js
│   └── simulate-attack.js
├── test/
│   └── AegisSentinel.test.js
├── frontend/
│   ├── pages/
│   │   ├── _app.tsx             # RainbowKit + Wagmi providers
│   │   └── index.tsx            # Dashboard
│   ├── components/
│   │   ├── Layout.tsx
│   │   ├── RiskMeter.tsx        # Animated SVG gauge
│   │   ├── FunctionGrid.tsx     # Per-function status cards
│   │   ├── ThreatRadar.tsx      # Recharts RadarChart
│   │   └── ActivityFeed.tsx     # Alerts + transaction feed
│   ├── hooks/
│   │   ├── useContract.ts
│   │   └── useWeb3.ts
│   └── styles/globals.css
├── hardhat.config.js
├── .env.example
└── README.md
```

---

## Quick Start (Demo Mode — no wallet needed)

```bash
# 1. Clone & install root (Hardhat)
cd aegis-sentinel
npm install

# 2. Install frontend
cd frontend
npm install

# 3. Run frontend
npm run dev
# → open http://localhost:3000
```

The dashboard runs entirely in **demo mode** with mock data. Wallet connection is optional.

---

## Compile & Test Contracts

```bash
# From aegis-sentinel/
npx hardhat compile
npx hardhat test
```

---

## Deploy to Sepolia

```bash
# 1. Copy .env.example → .env and fill in values
cp .env.example .env

# 2. Deploy
npx hardhat run scripts/deploy.js --network sepolia

# 3. Copy contract address into .env frontend variable
# NEXT_PUBLIC_CONTRACT_ADDRESS=0x...

# 4. Run attack simulation
npx hardhat run scripts/simulate-attack.js --network sepolia
```

---

## Demo Scenario

1. Open http://localhost:3000 — all functions **green**, risk score **~12**.
2. Click **SIMULATE ATTACK → 🔮 Oracle Attack**.
3. Watch risk meter ramp to **85** (red critical).
4. `withdraw`, `trade`, `borrow`, `liquidate` cards turn **red/BLOCKED**.
5. `deposit` and `repay` stay **green/ACTIVE**.
6. Critical alert appears in Activity Feed.
7. After **30 seconds** (or click **RESET**), system normalises.

---

## Deployment Addresses (Sepolia Testnet)

> Fill in after deploying:

| Contract       | Address |
|----------------|---------|
| AegisSentinel  | `TBD`   |
| Price Feed     | `0x694AA1769357215DE4FAC081bf1f309aDC325306` (Chainlink ETH/USD) |

---

## Environment Variables

See [`.env.example`](.env.example) for all required variables.

---

*Built for DeFi security. Powered by Chainlink. ⛓🛡️*

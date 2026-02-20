/**
 * hooks/useOraclePrice.ts
 *
 * Fetches Chainlink ETH/USD price feed data using direct JSON-RPC calls (fetch API).
 * This approach works in ALL browsers with NO library dependencies, NO CORS issues.
 * Updates every 15 seconds.
 */
import { useState, useEffect, useRef } from 'react';
import { useChainId } from 'wagmi';

// ── Feed addresses ────────────────────────────────────────────────────────────
const ETH_USD_FEEDS: Record<number, string> = {
    1: '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419', // Mainnet ETH/USD
    11155111: '0x694AA1769357215DE4FAC081bf1f309aDC325306', // Sepolia ETH/USD
};
const DEFAULT_FEED = '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419';

// ── Public RPC endpoints (all support CORS + browser fetch) ───────────────────
const MAINNET_RPCS = [
    'https://cloudflare-eth.com',
    'https://eth.llamarpc.com',
    'https://rpc.ankr.com/eth',
    'https://ethereum.publicnode.com',
];
const SEPOLIA_RPCS = [
    'https://eth-sepolia.public.blastapi.io',
    'https://rpc.sepolia.org',
    'https://sepolia.publicnode.com',
];

// latestRoundData() selector
const SELECTOR = '0xfeaf968c';

// ── JSON-RPC helper ───────────────────────────────────────────────────────────
async function rpcCall(rpc: string, to: string): Promise<string> {
    const res = await fetch(rpc, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            jsonrpc: '2.0', id: 1,
            method: 'eth_call',
            params: [{ to, data: SELECTOR }, 'latest'],
        }),
        signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.error) throw new Error(json.error.message ?? 'RPC error');
    if (!json.result || json.result === '0x') throw new Error('Empty result');
    return json.result as string;
}

async function rpcCallWithFallback(rpcs: string[], to: string): Promise<string> {
    const errors: string[] = [];
    for (const rpc of rpcs) {
        try { return await rpcCall(rpc, to); } catch (e) { errors.push(String(e)); }
    }
    throw new Error(`All RPCs failed: ${errors.join('; ')}`);
}

// ── ABI decode latestRoundData ────────────────────────────────────────────────
// Returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
function decodeRoundData(hex: string): { roundId: bigint; answer: bigint; updatedAt: bigint } {
    const d = hex.startsWith('0x') ? hex.slice(2) : hex;
    const roundId = BigInt('0x' + (d.slice(0, 64) || '0'));
    const rawAnswer = BigInt('0x' + (d.slice(64, 128) || '0'));
    const updatedAt = BigInt('0x' + (d.slice(192, 256) || '0'));
    // Handle int256 two's complement (price feeds are always positive, but be safe)
    const BIT255 = BigInt(1) << BigInt(255);
    const answer = rawAnswer >= BIT255 ? rawAnswer - (BigInt(1) << BigInt(256)) : rawAnswer;
    return { roundId, answer, updatedAt };
}

function fmtAge(unixSecs: number): string {
    const diff = Math.floor(Date.now() / 1000) - unixSecs;
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
}

// ── Exported types ────────────────────────────────────────────────────────────
export interface OracleData {
    price: number | null;
    priceChange: number;          // % Δ between last two polls
    deviation: number;          // % Δ from session baseline, scaled 0-100
    lastUpdated: string;          // "Xs ago"
    feedAddress: string;
    network: string;
    roundId: string;
    isLoading: boolean;
    error: boolean;
}

const NETWORK: Record<number, string> = { 1: 'Mainnet', 11155111: 'Sepolia', 31337: 'Localhost' };

export function useOraclePrice(): OracleData {
    const chainId = useChainId();

    const [data, setData] = useState<OracleData>({
        price: null, priceChange: 0, deviation: 0,
        lastUpdated: '--', feedAddress: DEFAULT_FEED,
        network: 'Mainnet', roundId: '--', isLoading: true, error: false,
    });

    const baseRef = useRef<number | null>(null);
    const prevRef = useRef<number | null>(null);

    useEffect(() => {
        const feedAddress = ETH_USD_FEEDS[chainId] ?? DEFAULT_FEED;
        const rpcs = chainId === 11155111 ? SEPOLIA_RPCS : MAINNET_RPCS;
        const network = NETWORK[chainId] ?? 'Mainnet';
        baseRef.current = null;
        prevRef.current = null;

        let cancelled = false;

        const poll = async () => {
            try {
                const hex = await rpcCallWithFallback(rpcs, feedAddress);
                if (cancelled) return;
                const { roundId, answer, updatedAt } = decodeRoundData(hex);
                const price = Number(answer) / 1e8;

                if (baseRef.current === null) baseRef.current = price;

                const priceChange = prevRef.current != null
                    ? ((price - prevRef.current) / prevRef.current) * 100 : 0;
                const deviation = Math.min(
                    Math.abs((price - baseRef.current) / baseRef.current) * 500, 100);

                prevRef.current = price;

                setData({
                    price, priceChange, deviation,
                    lastUpdated: fmtAge(Number(updatedAt)),
                    feedAddress, network,
                    roundId: `#${roundId.toString().slice(-8)}`,
                    isLoading: false, error: false,
                });
            } catch (err) {
                console.warn('[useOraclePrice]', err);
                if (!cancelled) setData(p => ({ ...p, isLoading: false, error: true }));
            }
        };

        poll();
        const iv = setInterval(poll, 15_000);
        return () => { cancelled = true; clearInterval(iv); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chainId]);

    return data;
}

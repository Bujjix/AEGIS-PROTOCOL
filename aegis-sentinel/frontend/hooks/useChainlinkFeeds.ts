/**
 * hooks/useChainlinkFeeds.ts
 *
 * Fetches multiple Chainlink price feeds simultaneously for the CRE panel.
 * All calls use direct JSON-RPC fetch — no library deps, works in all browsers.
 */
import { useState, useEffect, useRef } from 'react';
import { useChainId } from 'wagmi';

// ── Feed registry ─────────────────────────────────────────────────────────────
export interface FeedConfig { symbol: string; label: string; address: string; decimals: number; color: string }

export const MAINNET_FEEDS: FeedConfig[] = [
    { symbol: 'ETH', label: 'ETH / USD', address: '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419', decimals: 8, color: '#627EEA' },
    { symbol: 'BTC', label: 'BTC / USD', address: '0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88b', decimals: 8, color: '#F7931A' },
    { symbol: 'LINK', label: 'LINK / USD', address: '0x2c1d072e956AFFC0D435Cb7AC38EF18d24d9127c', decimals: 8, color: '#2A5ADA' },
    { symbol: 'MATIC', label: 'MATIC / USD', address: '0x7bAC85A8a13A4BcD8abb3eB7d6b4d632c895966', decimals: 8, color: '#8247E5' },
    { symbol: 'AVAX', label: 'AVAX / USD', address: '0xFF3EEb22B5E3dE6e705b44749C2559d704923FD', decimals: 8, color: '#E84142' },
    { symbol: 'BNB', label: 'BNB / USD', address: '0x14e613AC84a31f709eadbEF3bf98bBb1f7Dre706c', decimals: 8, color: '#F3BA2F' },
];

export const SEPOLIA_FEEDS: FeedConfig[] = [
    { symbol: 'ETH', label: 'ETH / USD', address: '0x694AA1769357215DE4FAC081bf1f309aDC325306', decimals: 8, color: '#627EEA' },
    { symbol: 'BTC', label: 'BTC / USD', address: '0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43', decimals: 8, color: '#F7931A' },
    { symbol: 'LINK', label: 'LINK / USD', address: '0xc59E3633BAAC79493d908e63626716e204A45EdF', decimals: 8, color: '#2A5ADA' },
];

const MAINNET_RPCS = [
    'https://cloudflare-eth.com',
    'https://eth.llamarpc.com',
    'https://rpc.ankr.com/eth',
    'https://ethereum.publicnode.com',
];
const SEPOLIA_RPCS = [
    'https://eth-sepolia.public.blastapi.io',
    'https://rpc.sepolia.org',
];

const SELECTOR = '0xfeaf968c';

// ── Types ─────────────────────────────────────────────────────────────────────
export interface FeedData {
    symbol: string;
    label: string;
    color: string;
    price: number | null;
    prevPrice: number | null;
    change24h: number;        // approximated from session delta
    priceChange: number;        // % Δ since last poll
    deviation: number;        // % Δ from session baseline
    updatedAt: number;        // unix timestamp from Chainlink
    ageSeconds: number;        // seconds since last oracle update
    roundId: string;
    status: 'live' | 'stale' | 'offline' | 'loading';
    riskScore: number;        // 0-100 per-feed risk contribution
}

export interface ChainlinkFeedsState {
    feeds: FeedData[];
    compositeRisk: number;          // 0-100 overall oracle risk
    anomalyDetected: boolean;
    isLoading: boolean;
    lastFetch: number;          // Date.now() of last successful batch
}

// ── Helpers ───────────────────────────────────────────────────────────────────
async function rpcCall(rpc: string, to: string): Promise<string> {
    const res = await fetch(rpc, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_call', params: [{ to, data: SELECTOR }, 'latest'] }),
        signal: AbortSignal.timeout(5000),
    });
    const json = await res.json();
    if (json.error || !json.result || json.result === '0x') throw new Error('RPC failed');
    return json.result as string;
}

async function fetchFeed(rpcs: string[], feed: FeedConfig): Promise<{ roundId: bigint; price: number; updatedAt: number } | null> {
    for (const rpc of rpcs) {
        try {
            const hex = await rpcCall(rpc, feed.address);
            const d = hex.startsWith('0x') ? hex.slice(2) : hex;
            const roundId = BigInt('0x' + d.slice(0, 64));
            const rawAnswer = BigInt('0x' + d.slice(64, 128));
            const updatedAt = Number(BigInt('0x' + d.slice(192, 256)));
            const BIT255 = BigInt(1) << BigInt(255);
            const answer = rawAnswer >= BIT255 ? rawAnswer - (BigInt(1) << BigInt(256)) : rawAnswer;
            return { roundId, price: Number(answer) / Math.pow(10, feed.decimals), updatedAt };
        } catch { /* try next rpc */ }
    }
    return null;
}

function computeFeedRisk(price: number | null, baseline: number | null, ageSeconds: number): number {
    if (price === null) return 80; // offline = high risk
    if (ageSeconds > 7200) return 75; // very stale
    if (ageSeconds > 3600) return 50; // stale
    if (baseline === null) return 5;
    const devPct = Math.abs((price - baseline) / baseline) * 100;
    return Math.min(devPct * 3, 60);
}

// ── Hook ─────────────────────────────────────────────────────────────────────
export function useChainlinkFeeds(): ChainlinkFeedsState {
    const chainId = useChainId();
    const feeds = chainId === 11155111 ? SEPOLIA_FEEDS : MAINNET_FEEDS;
    const rpcs = chainId === 11155111 ? SEPOLIA_RPCS : MAINNET_RPCS;

    const baselineRef = useRef<Record<string, number>>({});
    const prevRef = useRef<Record<string, number>>({});

    const [state, setState] = useState<ChainlinkFeedsState>({
        feeds: feeds.map(f => ({
            symbol: f.symbol, label: f.label, color: f.color,
            price: null, prevPrice: null, change24h: 0, priceChange: 0, deviation: 0,
            updatedAt: 0, ageSeconds: 0, roundId: '--',
            status: 'loading', riskScore: 0,
        })),
        compositeRisk: 0, anomalyDetected: false, isLoading: true, lastFetch: 0,
    });

    useEffect(() => {
        baselineRef.current = {};
        prevRef.current = {};
        let cancelled = false;

        const poll = async () => {
            const results = await Promise.allSettled(feeds.map(f => fetchFeed(rpcs, f)));
            if (cancelled) return;

            const now = Math.floor(Date.now() / 1000);
            const feedData: FeedData[] = [];
            let totalRisk = 0;
            let anomaly = false;

            results.forEach((r, i) => {
                const cfg = feeds[i];
                const prev = prevRef.current[cfg.symbol] ?? null;
                const base = baselineRef.current[cfg.symbol] ?? null;

                if (r.status === 'fulfilled' && r.value) {
                    const { price, updatedAt, roundId } = r.value;
                    if (base === null) baselineRef.current[cfg.symbol] = price;
                    prevRef.current[cfg.symbol] = price;

                    const ageSeconds = now - updatedAt;
                    const priceChange = prev != null ? ((price - prev) / prev) * 100 : 0;
                    const deviation = base != null ? ((price - base) / base) * 100 : 0;
                    const riskScore = computeFeedRisk(price, base, ageSeconds);
                    totalRisk += riskScore;
                    if (Math.abs(priceChange) > 3) anomaly = true;

                    feedData.push({
                        symbol: cfg.symbol, label: cfg.label, color: cfg.color,
                        price, prevPrice: prev, change24h: deviation, priceChange, deviation,
                        updatedAt, ageSeconds,
                        roundId: `#${roundId.toString().slice(-8)}`,
                        status: ageSeconds > 3600 ? 'stale' : 'live', riskScore,
                    });
                } else {
                    feedData.push({
                        symbol: cfg.symbol, label: cfg.label, color: cfg.color,
                        price: null, prevPrice: prev, change24h: 0, priceChange: 0, deviation: 0,
                        updatedAt: 0, ageSeconds: 0, roundId: '--',
                        status: 'offline', riskScore: 80,
                    });
                    totalRisk += 80;
                }
            });

            const compositeRisk = Math.min(Math.round(totalRisk / feeds.length), 100);

            setState({ feeds: feedData, compositeRisk, anomalyDetected: anomaly, isLoading: false, lastFetch: Date.now() });
        };

        poll();
        const iv = setInterval(poll, 15_000);
        return () => { cancelled = true; clearInterval(iv); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chainId]);

    return state;
}

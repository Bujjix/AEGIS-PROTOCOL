/**
 * components/Dashboard.tsx
 *
 * Loaded via next/dynamic with ssr:false from pages/index.tsx.
 * Safe to use all wagmi / RainbowKit hooks here — never SSR'd.
 */
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LineChart, Line, ResponsiveContainer,
} from 'recharts';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import {
    Shield, RefreshCw, Zap, Activity, Users,
    Lock, ChevronDown, X, AlertCircle,
    TrendingUp, TrendingDown, Wifi, WifiOff, ExternalLink,
} from 'lucide-react';

import Layout from './Layout';
import RiskMeter from './RiskMeter';
import FunctionGrid, { FunctionInfo } from './FunctionGrid';
import ThreatRadar, { RadarMetrics } from './ThreatRadar';
import ActivityFeed, { Alert, Transaction } from './ActivityFeed';
import LoadingScreen from './LoadingScreen';
import { useContract } from '../hooks/useContract';
import { useWeb3 } from '../hooks/useWeb3';
import { useOraclePrice } from '../hooks/useOraclePrice';
import ChainlinkRiskEngine from './ChainlinkRiskEngine';

// ── Constants ────────────────────────────────────────────────────────────────

const FUNCTION_DEFAULTS: FunctionInfo[] = [
    { name: 'deposit', selector: '0xd0e30db0', blocked: false, callCount: 142, lastCalled: '12s ago', riskLevel: 'low', description: 'Deposit ETH into the protocol' },
    { name: 'withdraw', selector: '0x2e1a7d4d', blocked: false, callCount: 87, lastCalled: '1m ago', riskLevel: 'high', description: 'Withdraw ETH from the protocol' },
    { name: 'trade', selector: '0x16b7b7b7', blocked: false, callCount: 234, lastCalled: '3s ago', riskLevel: 'medium', description: 'Execute a trade on a pair' },
    { name: 'borrow', selector: '0xc5ebeaec', blocked: false, callCount: 45, lastCalled: '5m ago', riskLevel: 'high', description: 'Borrow funds from the protocol' },
    { name: 'repay', selector: '0x3d18b912', blocked: false, callCount: 33, lastCalled: '8m ago', riskLevel: 'low', description: 'Repay borrowed funds' },
    { name: 'liquidate', selector: '0x96cd4ddd', blocked: false, callCount: 12, lastCalled: '22m ago', riskLevel: 'critical', description: 'Liquidate an undercollateralised position' },
];

const RADAR_DEFAULTS: RadarMetrics = { priceVolatility: 12, callFrequency: 20, liquidityRisk: 8, oracleHealth: 95, mevActivity: 5, networkLoad: 30 };
const ORACLE_ATTACK_RADAR: RadarMetrics = { priceVolatility: 92, callFrequency: 78, liquidityRisk: 65, oracleHealth: 15, mevActivity: 88, networkLoad: 74 };
const FLASH_ATTACK_RADAR: RadarMetrics = { priceVolatility: 55, callFrequency: 95, liquidityRisk: 88, oracleHealth: 60, mevActivity: 72, networkLoad: 91 };
const LIQUIDITY_ATTACK_RADAR: RadarMetrics = { priceVolatility: 45, callFrequency: 40, liquidityRisk: 96, oracleHealth: 75, mevActivity: 35, networkLoad: 55 };

function uid() { return Math.random().toString(36).slice(2, 9); }
function now() { return new Date().toLocaleTimeString('en-US', { hour12: false }); }
function short(addr: string) { return `${addr.slice(0, 6)}…${addr.slice(-4)}`; }

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, color, live }: {
    icon: any; label: string; value: string; sub: string; color: string; live?: boolean;
}) {
    return (
        <motion.div whileHover={{ scale: 1.02, y: -2 }} className="glass-panel p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg relative" style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
                <Icon className="w-5 h-5" style={{ color }} />
                {live && (
                    <motion.div
                        className="absolute -top-1 -right-1 w-2 h-2 rounded-full"
                        animate={{ scale: [1, 1.5, 1], backgroundColor: color }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                    />
                )}
            </div>
            <div className="min-w-0">
                <p className="text-lg font-mono font-bold text-slate-100 truncate">{value}</p>
                <p className="text-[10px] font-mono text-slate-500">{label}</p>
                <p className="text-[9px] font-mono mt-0.5 truncate" style={{ color }}>{sub}</p>
            </div>
        </motion.div>
    );
}

function OracleFeedBanner({ oracle, isConnected }: { oracle: ReturnType<typeof useOraclePrice>; isConnected: boolean }) {
    if (oracle.isLoading && !oracle.price) return null;
    const up = oracle.priceChange >= 0;
    return (
        <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="glass-panel px-4 py-2.5 mb-4 flex items-center gap-4 flex-wrap"
            style={{ borderColor: 'rgba(0,212,255,0.2)' }}
        >
            <div className="flex items-center gap-2">
                <motion.div
                    className="w-2 h-2 rounded-full"
                    animate={{ scale: [1, 1.5, 1], backgroundColor: oracle.error ? '#ff6b35' : '#00ff9d' }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                />
                <span className="text-[10px] font-mono text-slate-500 tracking-widest">
                    CHAINLINK DATAFEED {isConnected ? `· ${oracle.network}` : '· Public RPC'}
                </span>
            </div>
            <div className="flex items-center gap-1.5">
                {up
                    ? <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                    : <TrendingDown className="w-3.5 h-3.5 text-red-400" />}
                <span className="text-sm font-mono font-bold" style={{ color: up ? '#00ff9d' : '#ff6b35' }}>
                    ETH/USD  {oracle.price ? `$${oracle.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '–'}
                </span>
                <span className="text-[10px] font-mono" style={{ color: up ? '#00ff9d' : '#ff6b35' }}>
                    {up ? '+' : ''}{oracle.priceChange.toFixed(4)}%
                </span>
            </div>
            <div className="flex items-center gap-3 text-[9px] font-mono text-slate-500 ml-auto flex-wrap">
                <span>ROUND {oracle.roundId}</span>
                <span>·</span>
                <span>UPDATED {oracle.lastUpdated}</span>
                <span>·</span>
                <a
                    href={`https://etherscan.io/address/${oracle.feedAddress}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-0.5 text-cyan-500 hover:text-cyan-300 transition-colors"
                >
                    {oracle.feedAddress.slice(0, 10)}… <ExternalLink className="w-2.5 h-2.5" />
                </a>
            </div>
        </motion.div>
    );
}

function WalletCTA() {
    return (
        <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="glass-panel px-4 py-3 mb-4 flex items-center gap-3 flex-wrap"
            style={{ borderColor: 'rgba(124,58,237,0.3)', background: 'rgba(124,58,237,0.04)' }}
        >
            <div className="flex items-center gap-2">
                <WifiOff className="w-4 h-4 text-purple-400" />
                <span className="text-[10px] font-mono text-purple-300">DEMO MODE</span>
            </div>
            <p className="text-[10px] font-mono text-slate-500">
                Connect MetaMask to read live on-chain data from the deployed AegisSentinel contract on Sepolia.
            </p>
            <ConnectButton.Custom>
                {({ openConnectModal }) => (
                    <motion.button
                        onClick={openConnectModal}
                        whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                        className="ml-auto px-4 py-1.5 text-xs font-mono rounded border text-purple-300 transition-all"
                        style={{ borderColor: 'rgba(124,58,237,0.4)', background: 'rgba(124,58,237,0.08)' }}
                    >
                        <Wifi className="w-3 h-3 inline mr-1.5" />
                        CONNECT WALLET
                    </motion.button>
                )}
            </ConnectButton.Custom>
        </motion.div>
    );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

export default function Dashboard() {
    const { state: contractState, refetch } = useContract();
    const { address, chainName, blockNumber, isConnected } = useWeb3() as any;
    const oracle = useOraclePrice();

    // Backend state
    const [backendStatus, setBackendStatus] = useState<'offline' | 'connecting' | 'online'>('offline');
    const [creData, setCreData] = useState<any>(null);

    // Loading screen
    const [isLoaded, setIsLoaded] = useState(false);

    // Core risk state
    const [riskScore, setRiskScore] = useState(12);
    const [functions, setFunctions] = useState<FunctionInfo[]>(FUNCTION_DEFAULTS);
    const [radar, setRadar] = useState<RadarMetrics>(RADAR_DEFAULTS);
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [riskHistory, setRiskHistory] = useState<{ t: string; v: number }[]>([]);

    // UI state
    const [isAttacking, setIsAttacking] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [autoScan, setAutoScan] = useState(true);
    const [lastScan, setLastScan] = useState('--');
    const [scanPulse, setScanPulse] = useState(false);
    const [blockedCount, setBlockedCount] = useState(0);
    const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const isCritical = riskScore >= 85;

    // ── Mount-only init ───────────────────────────────────────────────────────
    useEffect(() => {
        setLastScan(now());
        setRiskHistory(Array.from({ length: 12 }, (_, i) => ({ t: `${i * 5}m`, v: Math.floor(Math.random() * 15) + 5 })));

        // Probe Backend
        setBackendStatus('connecting');
        fetch('http://localhost:3005/api/cre/status')
            .then(res => res.json())
            .then(data => {
                if (data.status === 'ready') setBackendStatus('online');
            })
            .catch(() => setBackendStatus('offline'));
    }, []);

    // ── Sync live contract state ──────────────────────────────────────────────
    useEffect(() => {
        if (!contractState) return;
        setRiskScore(contractState.riskScore);
        setFunctions(prev => prev.map(fn => ({ ...fn, blocked: contractState.blocked[fn.name] ?? fn.blocked })));
    }, [contractState]);

    // ── Oracle → risk nudge ───────────────────────────────────────────────────
    useEffect(() => {
        if (isAttacking || oracle.isLoading || oracle.error) return;
        const target = Math.max(5, Math.min(35, Math.min(oracle.deviation, 30) + 5));
        setRiskScore(prev => Math.round(prev * 0.85 + target * 0.15));
        const vol = Math.min(Math.abs(oracle.priceChange) * 20, 100);
        setRadar(r => ({ ...r, priceVolatility: Math.round(r.priceVolatility * 0.8 + vol * 0.2) }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [oracle.price]);

    // ── Wallet connected alert ────────────────────────────────────────────────
    useEffect(() => {
        if (isConnected && address) {
            setAlerts(prev => [{ id: uid(), type: 'success' as const, message: `Wallet connected: ${short(address)}`, detail: `Network: ${chainName} · Chainlink feeds activated`, time: now() }, ...prev.slice(0, 14)]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isConnected]);

    // ── Auto-scan ─────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!autoScan || isAttacking) return;
        const t = setInterval(() => {
            setScanPulse(true);
            setLastScan(now());
            setTimeout(() => setScanPulse(false), 600);
            if (!isConnected) setRiskScore(s => Math.max(5, Math.min(30, s + (Math.random() - 0.5) * 4)));
            setRiskHistory(h => [...h.slice(-19), { t: now(), v: riskScore }]);
            refetch();
        }, 8000);
        return () => clearInterval(t);
    }, [autoScan, isAttacking, riskScore, refetch, isConnected]);

    // ── Blocked count ─────────────────────────────────────────────────────────
    useEffect(() => { setBlockedCount(functions.filter(f => f.blocked).length); }, [functions]);

    // ── Helpers ───────────────────────────────────────────────────────────────
    const pushAlert = useCallback((type: Alert['type'], message: string, detail?: string) => {
        setAlerts(prev => [{ id: uid(), type, message, detail, time: now() }, ...prev.slice(0, 14)]);
    }, []);

    const pushTx = useCallback((fn: string, status: Transaction['status']) => {
        setTransactions(prev => [{ hash: `0x${Math.random().toString(16).slice(2, 18)}`, fn, status, timeAgo: 'just now' }, ...prev.slice(0, 19)]);
    }, []);

    const toggleFunction = useCallback((name: string) => {
        setFunctions(prev => prev.map(f => {
            if (f.name !== name) return f;
            const nb = !f.blocked;
            pushAlert(nb ? 'warning' : 'success', `${name}() ${nb ? 'manually blocked' : 're-enabled'} by admin`, `Selector: ${f.selector}`);
            return { ...f, blocked: nb };
        }));
    }, [pushAlert]);

    const applyBlocking = useCallback((score: number) => {
        setFunctions(prev => prev.map(fn => {
            let blocked = false;
            if (score >= 85) blocked = ['withdraw', 'trade', 'borrow', 'liquidate'].includes(fn.name);
            else if (score >= 70) blocked = ['withdraw', 'trade', 'borrow'].includes(fn.name);
            else if (score >= 40) blocked = fn.name === 'trade';
            if (blocked && !fn.blocked) { pushAlert('critical', `${fn.name}() BLOCKED — risk ${score}`, `Selector ${fn.selector}`); pushTx(fn.name, 'blocked'); }
            return { ...fn, blocked };
        }));
    }, [pushAlert, pushTx]);

    const simulateAttack = useCallback((type: 'oracle' | 'flash' | 'liquidity') => {
        if (isAttacking) return;
        setIsAttacking(true);
        setShowDropdown(false);
        const targetScore = type === 'oracle' ? 90 : type === 'flash' ? 78 : 72;
        const targetRadar = type === 'oracle' ? ORACLE_ATTACK_RADAR : type === 'flash' ? FLASH_ATTACK_RADAR : LIQUIDITY_ATTACK_RADAR;
        const label = type === 'oracle' ? 'Oracle Manipulation' : type === 'flash' ? 'Flash Loan Attack' : 'Liquidity Drain';
        pushAlert('critical', `🚨 ${label} DETECTED`, 'Aegis response engine activated · Chainlink deviation triggered');
        let current = riskScore, i = 0;
        const step = (targetScore - current) / 10;
        const ramp = setInterval(() => {
            current += step;
            const rounded = Math.round(current);
            setRiskScore(rounded);
            setRiskHistory(h => [...h.slice(-19), { t: now(), v: rounded }]);
            if (++i >= 10) {
                clearInterval(ramp);
                setRiskScore(targetScore);
                applyBlocking(targetScore);
                setRadar(targetRadar);
                pushAlert('warning', 'Response engine: blocking high-risk functions', 'withdraw, trade, borrow → BLOCKED');
                pushTx('withdraw', 'blocked');
                pushTx('trade', 'blocked');
            }
        }, 200);
        if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
        resetTimerRef.current = setTimeout(() => resetSystem(true), 30000);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAttacking, riskScore, applyBlocking, pushAlert, pushTx]);

    const resetSystem = useCallback((auto = false) => {
        if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
        setIsAttacking(false);
        setRiskScore(12);
        setFunctions(FUNCTION_DEFAULTS);
        setRadar(RADAR_DEFAULTS);
        pushAlert('success', auto ? '✅ Auto-recovery: system normalised' : '✅ System reset', 'All functions re-enabled');
        setLastScan(now());
    }, [pushAlert]);

    const triggerScan = useCallback(() => {
        setScanPulse(true);
        setLastScan(now());
        setTimeout(() => setScanPulse(false), 600);
        refetch();
        pushAlert('info', 'Manual scan triggered', `Block #${blockNumber}`);

        // Backend Integration
        if (backendStatus === 'online') {
            fetch('http://localhost:3005/api/scan', { method: 'POST' })
                .then(res => res.json())
                .then(payload => {
                    setCreData(payload.data);
                    pushAlert('success', 'CRE Backend: Scan successful', `Source: ${payload.data.source}`);
                })
                .catch(err => {
                    console.error('Backend scan failed:', err);
                    pushAlert('warning', 'CRE Backend: Scan failed', 'Falling back to local simulation');
                });
        }
    }, [refetch, blockNumber, pushAlert, backendStatus]);

    // ── Stats ─────────────────────────────────────────────────────────────────
    const ethLabel = oracle.price != null
        ? `$${oracle.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : 'Syncing…';
    const ethSub = oracle.price != null
        ? `${oracle.priceChange >= 0 ? '+' : ''}${oracle.priceChange.toFixed(4)}%  ${oracle.lastUpdated}`
        : 'Chainlink ETH/USD feed';

    const stats = [
        { icon: Lock, label: 'Funds Protected', value: '$4.82M', sub: '+2.1% today', color: '#00d4ff', live: false },
        { icon: Users, label: 'Active Sessions', value: '1,247', sub: '↑12 since last scan', color: '#7c3aed', live: false },
        { icon: Shield, label: 'Blocked Functions', value: String(blockedCount), sub: `of ${functions.length} total`, color: blockedCount > 0 ? '#ff2d55' : '#00ff9d', live: false },
        { icon: oracle.priceChange >= 0 ? TrendingUp : TrendingDown, label: 'ETH/USD · Chainlink', value: ethLabel, sub: ethSub, color: oracle.priceChange >= 0 ? '#00ff9d' : '#ff6b35', live: true },
    ];

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <>
            {!isLoaded && <LoadingScreen onComplete={() => setIsLoaded(true)} />}

            <Layout title="Aegis Sentinel Protocol | Real-Time Smart Contract Security">

                {/* Critical red flash overlay */}
                <AnimatePresence>
                    {isCritical && (
                        <motion.div
                            className="fixed inset-0 pointer-events-none z-20"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: [0, 0.12, 0] }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 1, repeat: Infinity }}
                            style={{ background: 'radial-gradient(ellipse at center, rgba(255,45,85,0.3) 0%, transparent 70%)' }}
                        />
                    )}
                </AnimatePresence>

                <div className="max-w-[1600px] mx-auto px-4 py-4">

                    {/* ── Header ─────────────────────────────────────────────── */}
                    <header className="glass-panel px-5 py-3 mb-4 flex items-center justify-between flex-wrap gap-3 relative z-[100]">
                        <div className="flex items-center gap-3">
                            <motion.div
                                animate={{ rotate: isAttacking ? [0, 5, -5, 0] : 0 }}
                                transition={{ duration: 0.4, repeat: isAttacking ? Infinity : 0 }}
                            >
                                <Shield className="w-8 h-8 neon-blue" />
                            </motion.div>
                            <div>
                                <h1 className="text-base font-mono font-bold neon-blue tracking-widest">AEGIS SENTINEL</h1>
                                <p className="text-[9px] font-mono text-slate-500 tracking-widest">DECENTRALIZED SECURITY PROTOCOL v1.0</p>
                            </div>

                            {isAttacking && (
                                <motion.span
                                    className="px-2 py-0.5 text-[10px] font-mono font-bold text-red-400 border border-red-500/40 rounded"
                                    animate={{ opacity: [1, 0.3, 1] }}
                                    transition={{ duration: 0.6, repeat: Infinity }}
                                    style={{ background: 'rgba(255,45,85,0.1)' }}
                                >
                                    ⚠ ATTACK DETECTED
                                </motion.span>
                            )}

                            {isConnected && address && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                                    className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono mr-2"
                                    style={{ background: 'rgba(0,255,157,0.08)', border: '1px solid rgba(0,255,157,0.25)', color: '#00ff9d' }}
                                >
                                    <Wifi className="w-2.5 h-2.5" />
                                    {short(address)}
                                </motion.div>
                            )}

                            {/* Backend status badge */}
                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-mono"
                                style={{
                                    background: backendStatus === 'online' ? 'rgba(0,212,255,0.08)' : 'rgba(255,45,85,0.08)',
                                    border: `1px solid ${backendStatus === 'online' ? 'rgba(0,212,255,0.2)' : 'rgba(255,45,85,0.2)'}`,
                                    color: backendStatus === 'online' ? '#00d4ff' : '#ff2d55'
                                }}>
                                <motion.div
                                    className="w-1.5 h-1.5 rounded-full"
                                    animate={{
                                        opacity: [1, 0.4, 1],
                                        backgroundColor: backendStatus === 'online' ? '#00d4ff' : '#ff2d55'
                                    }}
                                    transition={{ duration: 1.5, repeat: Infinity }}
                                />
                                CRE BACKEND: {backendStatus.toUpperCase()}
                            </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                            {/* Auto-scan toggle */}
                            <button
                                onClick={() => setAutoScan(v => !v)}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded border transition-all"
                                style={{
                                    borderColor: autoScan ? 'rgba(0,255,157,0.3)' : 'rgba(100,116,139,0.3)',
                                    color: autoScan ? '#00ff9d' : '#64748b',
                                    background: autoScan ? 'rgba(0,255,157,0.05)' : 'transparent',
                                }}
                            >
                                <motion.div
                                    className="w-1.5 h-1.5 rounded-full"
                                    animate={{ scale: autoScan ? [1, 1.4, 1] : 1, backgroundColor: autoScan ? '#00ff9d' : '#64748b' }}
                                    transition={{ duration: 1, repeat: Infinity }}
                                />
                                AUTO-SCAN
                            </button>

                            {/* Manual refresh */}
                            <button
                                onClick={triggerScan}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 transition-all"
                            >
                                <motion.div animate={{ rotate: scanPulse ? 360 : 0 }} transition={{ duration: 0.5 }}>
                                    <RefreshCw className="w-3 h-3" />
                                </motion.div>
                                REFRESH
                            </button>

                            {/* Simulate Attack */}
                            <div className="relative">
                                <button
                                    onClick={() => setShowDropdown(v => !v)}
                                    disabled={isAttacking}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded border border-red-500/40 text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-40"
                                    style={{ background: isAttacking ? 'rgba(255,45,85,0.1)' : undefined }}
                                >
                                    <Zap className="w-3 h-3" />
                                    SIMULATE ATTACK
                                    <ChevronDown className="w-3 h-3" />
                                </button>
                                <AnimatePresence>
                                    {showDropdown && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -8, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: -8, scale: 0.95 }}
                                            className="absolute right-0 top-full mt-1 glass-panel py-1 z-[200] min-w-[200px]"
                                        >
                                            {([
                                                { key: 'oracle', label: '🔮 Oracle Manipulation', score: 90 },
                                                { key: 'flash', label: '⚡ Flash Loan Attack', score: 78 },
                                                { key: 'liquidity', label: '💧 Liquidity Drain', score: 72 },
                                            ] as const).map(a => (
                                                <button
                                                    key={a.key}
                                                    onClick={() => simulateAttack(a.key)}
                                                    className="w-full text-left px-4 py-2.5 text-xs font-mono text-slate-300 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                                >
                                                    {a.label}
                                                    <span className="ml-2 text-red-500/60">risk→{a.score}</span>
                                                </button>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Reset (shown during attack) */}
                            {isAttacking && (
                                <motion.button
                                    initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                                    onClick={() => resetSystem(false)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded border border-green-500/40 text-green-400 hover:bg-green-500/10 transition-all"
                                >
                                    <X className="w-3 h-3" />
                                    RESET
                                </motion.button>
                            )}

                            <ConnectButton showBalance={false} chainStatus="icon" />
                        </div>
                    </header>

                    {/* ── Status Bar ─────────────────────────────────────────── */}
                    <div className="flex items-center gap-3 mb-4 px-1 flex-wrap text-[10px] font-mono text-slate-500">
                        <span><span className="text-slate-600">LAST SCAN </span><span className="text-cyan-400">{lastScan}</span></span>
                        <span>·</span>
                        <span><span className="text-slate-600">NETWORK </span><span className="text-slate-300">{isConnected ? chainName : 'DEMO MODE'}</span></span>
                        <span>·</span>
                        <span><span className="text-slate-600">BLOCK </span><span className="text-slate-300">#{blockNumber}</span></span>
                        <span>·</span>
                        <span className="flex items-center gap-1.5">
                            <motion.div
                                className="w-1.5 h-1.5 rounded-full"
                                animate={{ scale: [1, 1.4, 1], backgroundColor: oracle.error ? '#ff6b35' : oracle.isLoading ? '#ffd700' : '#00ff9d' }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                            />
                            <span className="text-slate-600">ORACLE </span>
                            <span style={{ color: oracle.error ? '#ff6b35' : '#00d4ff' }}>
                                {oracle.isLoading ? 'SYNCING…' : oracle.error ? 'OFFLINE' : `ETH $${oracle.price?.toFixed(2)}`}
                            </span>
                        </span>
                        {isAttacking && (
                            <>
                                <span>·</span>
                                <motion.span className="text-red-400" animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 0.7, repeat: Infinity }}>
                                    ◉ THREAT ACTIVE
                                </motion.span>
                            </>
                        )}
                        {isConnected && (
                            <>
                                <span>·</span>
                                <span className="flex items-center gap-1 text-emerald-500">
                                    <Wifi className="w-2.5 h-2.5" />
                                    LIVE CONTRACT DATA
                                </span>
                            </>
                        )}
                    </div>

                    {/* ── Wallet CTA (demo only) ─────────────────────────────── */}
                    {!isConnected && <WalletCTA />}

                    {/* ── Chainlink Oracle Banner ─────────────────────────────── */}
                    <OracleFeedBanner oracle={oracle} isConnected={isConnected} />

                    {/* ── Stat Cards ─────────────────────────────────────────── */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                        {stats.map(s => <StatCard key={s.label} {...s} />)}
                    </div>

                    {/* ── Main Grid ──────────────────────────────────────────── */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">

                        {/* Risk Meter */}
                        <div className={`glass-panel p-5 flex flex-col gap-3 ${isCritical ? 'risk-flash' : ''}`}>
                            <div className="flex items-center justify-between">
                                <h2 className="text-xs font-mono font-semibold text-slate-400 tracking-widest flex items-center gap-2">
                                    <Activity className="w-3.5 h-3.5 text-cyan-400" />
                                    RISK MONITOR
                                </h2>
                                <span className="text-[9px] font-mono text-slate-600">{isConnected ? '● LIVE' : '○ DEMO'}</span>
                            </div>
                            <RiskMeter score={riskScore} />
                            <div className="mt-2">
                                <p className="text-[9px] font-mono text-slate-600 mb-1 tracking-widest">RISK HISTORY</p>
                                <ResponsiveContainer width="100%" height={60}>
                                    <LineChart data={riskHistory}>
                                        <Line
                                            type="monotone" dataKey="v"
                                            stroke={riskScore >= 70 ? '#ff2d55' : riskScore >= 40 ? '#ffd700' : '#00ff9d'}
                                            strokeWidth={1.5} dot={false} animationDuration={500}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Function Grid */}
                        <div className="glass-panel p-5">
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-xs font-mono font-semibold text-slate-400 tracking-widest flex items-center gap-2">
                                    <Shield className="w-3.5 h-3.5 text-cyan-400" />
                                    FUNCTION GUARDS
                                </h2>
                                <span
                                    className="text-[9px] font-mono px-2 py-0.5 rounded-full"
                                    style={{
                                        color: blockedCount > 0 ? '#ff2d55' : '#00ff9d',
                                        background: blockedCount > 0 ? 'rgba(255,45,85,0.1)' : 'rgba(0,255,157,0.08)',
                                        border: `1px solid ${blockedCount > 0 ? 'rgba(255,45,85,0.3)' : 'rgba(0,255,157,0.2)'}`,
                                    }}
                                >
                                    {blockedCount} BLOCKED
                                </span>
                            </div>
                            <FunctionGrid functions={functions} onToggle={toggleFunction} />
                        </div>

                        {/* Threat Radar */}
                        <div className="glass-panel p-5">
                            <div className="flex items-center justify-between mb-2">
                                <h2 className="text-xs font-mono font-semibold text-slate-400 tracking-widest flex items-center gap-2">
                                    <AlertCircle className="w-3.5 h-3.5 text-cyan-400" />
                                    THREAT RADAR
                                </h2>
                                <motion.div
                                    className="w-2 h-2 rounded-full"
                                    animate={{ scale: [1, 1.4, 1], backgroundColor: isAttacking ? '#ff2d55' : '#00ff9d' }}
                                    transition={{ duration: 1, repeat: Infinity }}
                                />
                            </div>
                            <ThreatRadar metrics={radar} isAttack={isAttacking} />
                        </div>
                    </div>

                    {/* ── CRE — Chainlink Risk Engine ─────────────────────── */}
                    <div className="mb-4">
                        <ChainlinkRiskEngine />
                    </div>

                    {creData && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="glass-panel p-4 mb-4 border-l-4"
                            style={{ borderColor: creData.metrics.anomaly_level === 'high' ? '#ff2d55' : '#00d4ff' }}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                                        <Terminal className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Decentralized Intelligence Report</h4>
                                        <p className="text-sm font-mono text-gray-200">
                                            Workflow: <span className="text-blue-400">{creData.workflow}</span> |
                                            Level: <span style={{ color: creData.metrics.anomaly_level === 'high' ? '#ff2d55' : '#00ff9d' }}>{creData.metrics.anomaly_level.toUpperCase()}</span>
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-gray-500 font-mono">Consensus: BFT (Byzantine Fault Tolerant)</p>
                                    <p className="text-[10px] text-gray-400 font-mono">{new Date(creData.timestamp).toLocaleString()}</p>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </div>

                {/* ── Activity Feed ───────────────────────────────────────── */}
                <div className="glass-panel p-5">
                    <ActivityFeed
                        alerts={alerts}
                        transactions={transactions}
                        onDismissAlert={(id) => setAlerts(prev => prev.filter(a => a.id !== id))}
                    />
                </div>

                {/* ── Footer ──────────────────────────────────────────────── */}
                <footer className="mt-4 text-center text-[9px] font-mono text-slate-700">
                    AEGIS SENTINEL PROTOCOL · CHAINLINK DATA FEEDS · OPENZEPPELIN · {isConnected ? `LIVE on ${chainName}` : 'DEMO MODE'}
                </footer>
            </Layout>
        </>
    );
}

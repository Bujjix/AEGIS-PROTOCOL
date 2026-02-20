/**
 * components/ChainlinkRiskEngine.tsx
 *
 * CRE — Chainlink Risk Engine
 * Real-time multi-feed oracle monitoring panel with risk analysis,
 * circuit breakers, staleness detection, and anomaly alerts.
 */
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
    TrendingUp, TrendingDown, Zap, AlertTriangle, CheckCircle2,
    WifiOff, Clock, Activity, BarChart3, Shield, ExternalLink, RefreshCw
} from 'lucide-react';
import { useChainlinkFeeds, FeedData } from '../hooks/useChainlinkFeeds';

// ── Gauge helpers ──────────────────────────────────────────────────────────────
function riskColor(score: number): string {
    if (score >= 80) return '#ff2d55';
    if (score >= 50) return '#ffd700';
    if (score >= 25) return '#ff6b35';
    return '#00ff9d';
}

function statusBadge(status: FeedData['status']): { label: string; color: string; bg: string } {
    switch (status) {
        case 'live': return { label: 'LIVE', color: '#00ff9d', bg: 'rgba(0,255,157,0.1)' };
        case 'stale': return { label: 'STALE', color: '#ffd700', bg: 'rgba(255,215,0,0.1)' };
        case 'offline': return { label: 'OFFLINE', color: '#ff2d55', bg: 'rgba(255,45,85,0.1)' };
        default: return { label: 'SYNCING', color: '#00d4ff', bg: 'rgba(0,212,255,0.08)' };
    }
}

function fmtPrice(price: number | null, symbol: string): string {
    if (price === null) return '—';
    if (symbol === 'LINK' || symbol === 'MATIC' || symbol === 'AVAX') {
        return `$${price.toFixed(4)}`;
    }
    return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ── Feed Card ──────────────────────────────────────────────────────────────────
function FeedCard({ feed }: { feed: FeedData }) {
    const badge = statusBadge(feed.status);
    const up = feed.priceChange >= 0;
    const rc = riskColor(feed.riskScore);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.015, y: -2 }}
            className="glass-panel p-4 flex flex-col gap-2 relative overflow-hidden"
            style={{ borderColor: `${feed.color}25` }}
        >
            {/* Color accent bar */}
            <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t" style={{ background: feed.color }} />

            {/* Header row */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-mono font-bold"
                        style={{ background: `${feed.color}20`, border: `1px solid ${feed.color}40`, color: feed.color }}>
                        {feed.symbol.slice(0, 2)}
                    </div>
                    <div>
                        <p className="text-xs font-mono font-bold text-slate-200">{feed.symbol}</p>
                        <p className="text-[9px] font-mono text-slate-500">{feed.label}</p>
                    </div>
                </div>
                {/* Status badge */}
                <span className="text-[9px] font-mono px-2 py-0.5 rounded-full flex items-center gap-1"
                    style={{ color: badge.color, background: badge.bg }}>
                    <motion.div
                        className="w-1.5 h-1.5 rounded-full"
                        animate={{ scale: feed.status === 'live' ? [1, 1.5, 1] : 1, backgroundColor: badge.color }}
                        transition={{ duration: 1.2, repeat: Infinity }}
                    />
                    {badge.label}
                </span>
            </div>

            {/* Price */}
            <div className="flex items-end justify-between">
                <AnimatePresence mode="wait">
                    <motion.p
                        key={feed.price?.toFixed(2)}
                        initial={{ y: up ? 8 : -8, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="text-xl font-mono font-bold"
                        style={{ color: feed.price ? '#f1f5f9' : '#475569' }}
                    >
                        {fmtPrice(feed.price, feed.symbol)}
                    </motion.p>
                </AnimatePresence>
                <div className="flex items-center gap-1 text-[11px] font-mono"
                    style={{ color: feed.priceChange === 0 ? '#64748b' : up ? '#00ff9d' : '#ff6b35' }}>
                    {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {feed.priceChange === 0 ? '—' : `${up ? '+' : ''}${feed.priceChange.toFixed(4)}%`}
                </div>
            </div>

            {/* Risk bar */}
            <div className="space-y-1">
                <div className="flex items-center justify-between text-[9px] font-mono">
                    <span className="text-slate-600">RISK SCORE</span>
                    <span style={{ color: rc }}>{feed.riskScore.toFixed(0)}/100</span>
                </div>
                <div className="h-1 rounded-full bg-slate-800 overflow-hidden">
                    <motion.div
                        className="h-full rounded-full"
                        animate={{ width: `${feed.riskScore}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        style={{ background: `linear-gradient(90deg, ${rc}80, ${rc})` }}
                    />
                </div>
            </div>

            {/* Footer metadata */}
            <div className="flex items-center justify-between text-[9px] font-mono text-slate-600">
                <span className="flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    {feed.ageSeconds > 0 ? `${feed.ageSeconds < 60 ? `${feed.ageSeconds}s` : `${Math.floor(feed.ageSeconds / 60)}m`} ago` : '--'}
                </span>
                <span>{feed.roundId}</span>
            </div>
        </motion.div>
    );
}

// ── Risk Matrix ────────────────────────────────────────────────────────────────
function RiskMatrix({ feeds }: { feeds: FeedData[] }) {
    const metrics = [
        { label: 'PRICE DEV', fn: (f: FeedData) => Math.min(Math.abs(f.deviation) * 5, 100) },
        { label: 'STALENESS', fn: (f: FeedData) => Math.min(f.ageSeconds / 36, 100) },
        { label: 'SPREAD', fn: (f: FeedData) => Math.min(Math.abs(f.priceChange) * 10, 100) },
    ];

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-[9px] font-mono border-collapse">
                <thead>
                    <tr>
                        <th className="text-left text-slate-600 pb-2 pr-3 w-12">ASSET</th>
                        {metrics.map(m => (
                            <th key={m.label} className="text-slate-600 pb-2 px-2 text-center">{m.label}</th>
                        ))}
                        <th className="text-slate-600 pb-2 pl-2 text-center">RISK</th>
                    </tr>
                </thead>
                <tbody className="space-y-1">
                    {feeds.map(f => (
                        <tr key={f.symbol}>
                            <td className="pr-3 py-1 font-bold" style={{ color: f.color }}>{f.symbol}</td>
                            {metrics.map(m => {
                                const val = m.fn(f);
                                const c = riskColor(val);
                                return (
                                    <td key={m.label} className="px-2 py-1">
                                        <div className="h-4 rounded flex items-center overflow-hidden"
                                            style={{ background: 'rgba(100,116,139,0.08)' }}>
                                            <motion.div
                                                className="h-full rounded flex items-center justify-end pr-1"
                                                animate={{ width: `${val}%` }}
                                                transition={{ duration: 0.7, ease: 'easeOut' }}
                                                style={{ background: `${c}30`, minWidth: val > 5 ? 16 : 0 }}
                                            >
                                                <span style={{ color: c, fontSize: 8 }}>{val.toFixed(0)}</span>
                                            </motion.div>
                                        </div>
                                    </td>
                                );
                            })}
                            <td className="pl-2 py-1 text-center font-bold"
                                style={{ color: riskColor(f.riskScore) }}>
                                {f.riskScore.toFixed(0)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// ── Circuit Breaker Panel ──────────────────────────────────────────────────────
function CircuitBreakers({ feeds }: { feeds: FeedData[] }) {
    const breakers = [
        { id: 'price-dev', label: 'Price Deviation >5%', triggered: feeds.some(f => Math.abs(f.deviation) > 5) },
        { id: 'staleness', label: 'Feed Stale >1h', triggered: feeds.some(f => f.status === 'stale') },
        { id: 'offline', label: 'Feed Offline', triggered: feeds.some(f => f.status === 'offline') },
        { id: 'volatility', label: 'Rapid Volatility (>3%/poll)', triggered: feeds.some(f => Math.abs(f.priceChange) > 3) },
        { id: 'multi-dev', label: 'Multi-Asset Anomaly', triggered: feeds.filter(f => Math.abs(f.deviation) > 2).length > 1 },
        { id: 'high-risk', label: 'Composite Risk >60', triggered: feeds.reduce((s, f) => s + f.riskScore, 0) / (feeds.length || 1) > 60 },
    ];

    return (
        <div className="grid grid-cols-1 gap-1.5">
            {breakers.map(b => (
                <motion.div
                    key={b.id}
                    animate={{ borderColor: b.triggered ? 'rgba(255,45,85,0.4)' : 'rgba(30,41,59,0.8)' }}
                    className="flex items-center justify-between px-3 py-2 rounded text-[10px] font-mono"
                    style={{ background: b.triggered ? 'rgba(255,45,85,0.06)' : 'rgba(15,23,42,0.4)' }}
                >
                    <div className="flex items-center gap-2">
                        <motion.div
                            className="w-2 h-2 rounded-full"
                            animate={{
                                backgroundColor: b.triggered ? '#ff2d55' : '#00ff9d',
                                scale: b.triggered ? [1, 1.4, 1] : 1
                            }}
                            transition={{ duration: 0.8, repeat: b.triggered ? Infinity : 0 }}
                        />
                        <span className="text-slate-400">{b.label}</span>
                    </div>
                    <span style={{ color: b.triggered ? '#ff2d55' : '#00ff9d' }} className="font-bold">
                        {b.triggered ? '⚡ TRIGGERED' : '✓ CLEAR'}
                    </span>
                </motion.div>
            ))}
        </div>
    );
}

// ── Composite Risk Arc ─────────────────────────────────────────────────────────
function CompositeRiskArc({ score }: { score: number }) {
    const radius = 42;
    const circumference = Math.PI * radius; // semicircle
    const dashOffset = circumference - (score / 100) * circumference;
    const c = riskColor(score);
    return (
        <div className="flex flex-col items-center">
            <svg width={120} height={70} viewBox="0 0 120 70">
                {/* Track */}
                <path d="M 10 65 A 50 50 0 0 1 110 65" fill="none" stroke="rgba(100,116,139,0.2)" strokeWidth={8} strokeLinecap="round" />
                {/* Value */}
                <path
                    d="M 10 65 A 50 50 0 0 1 110 65"
                    fill="none"
                    stroke={c}
                    strokeWidth={8}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={dashOffset}
                    style={{ transition: 'stroke-dashoffset 0.8s ease, stroke 0.4s ease' }}
                />
                {/* Glow */}
                <path
                    d="M 10 65 A 50 50 0 0 1 110 65"
                    fill="none"
                    stroke={c}
                    strokeWidth={3}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={dashOffset}
                    opacity={0.3}
                    style={{ filter: `blur(4px)`, transition: 'stroke-dashoffset 0.8s ease' }}
                />
                {/* Score text */}
                <text x="60" y="58" textAnchor="middle" fontSize={22} fontFamily="monospace" fontWeight="bold" fill={c}>
                    {score}
                </text>
            </svg>
            <p className="text-[9px] font-mono text-slate-500 -mt-2 tracking-widest">COMPOSITE RISK</p>
        </div>
    );
}

// ── Main CRE Component ─────────────────────────────────────────────────────────
export default function ChainlinkRiskEngine() {
    const cre = useChainlinkFeeds();
    const rc = riskColor(cre.compositeRisk);

    return (
        <div className="glass-panel p-5 space-y-5">

            {/* ── Header ───────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg" style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)' }}>
                        <Zap className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div>
                        <h2 className="text-sm font-mono font-bold tracking-widest text-slate-100">
                            CHAINLINK RISK ENGINE
                        </h2>
                        <p className="text-[9px] font-mono text-slate-500">
                            CRE v2 · Real-Time Oracle Intelligence · {cre.feeds.filter(f => f.status === 'live').length}/{cre.feeds.length} feeds live
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {cre.anomalyDetected && (
                        <motion.div
                            animate={{ opacity: [1, 0.4, 1] }}
                            transition={{ duration: 0.8, repeat: Infinity }}
                            className="flex items-center gap-1.5 px-3 py-1 rounded text-[10px] font-mono"
                            style={{ color: '#ffd700', background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.25)' }}
                        >
                            <AlertTriangle className="w-3 h-3" />
                            ANOMALY DETECTED
                        </motion.div>
                    )}
                    <motion.div
                        className="flex items-center gap-1.5 text-[9px] font-mono text-slate-600"
                        animate={{ opacity: cre.isLoading ? [1, 0.3, 1] : 1 }}
                        transition={{ duration: 1, repeat: cre.isLoading ? Infinity : 0 }}
                    >
                        <RefreshCw className="w-3 h-3" />
                        {cre.isLoading ? 'SYNCING…' : `UPDATE ${new Date(cre.lastFetch).toLocaleTimeString('en-US', { hour12: false })}`}
                    </motion.div>
                </div>
            </div>

            {/* ── Price Feed Grid + Composite Risk ─────────────────────────── */}
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_auto] gap-4">

                {/* Feed cards */}
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-3 gap-3">
                    {cre.feeds.map(f => <FeedCard key={f.symbol} feed={f} />)}
                </div>

                {/* Composite risk + summary */}
                <div className="flex flex-col gap-4 justify-center items-center min-w-[160px]">
                    <CompositeRiskArc score={cre.compositeRisk} />

                    {/* Overall status */}
                    <div className="text-center space-y-1">
                        <div className="flex items-center justify-center gap-1.5 text-[10px] font-mono"
                            style={{ color: rc }}>
                            {cre.compositeRisk >= 50
                                ? <AlertTriangle className="w-3 h-3" />
                                : <CheckCircle2 className="w-3 h-3" />}
                            {cre.compositeRisk >= 80 ? 'CRITICAL RISK' :
                                cre.compositeRisk >= 50 ? 'ELEVATED RISK' :
                                    cre.compositeRisk >= 25 ? 'MODERATE RISK' : 'SYSTEM HEALTHY'}
                        </div>
                        <p className="text-[9px] font-mono text-slate-600">
                            {cre.feeds.filter(f => f.status === 'live').length} live · {cre.feeds.filter(f => f.status === 'stale').length} stale · {cre.feeds.filter(f => f.status === 'offline').length} offline
                        </p>
                    </div>

                    {/* Quick stats */}
                    <div className="space-y-1.5 w-full">
                        {[
                            { label: 'AVG DEVIATION', value: `${(cre.feeds.reduce((s, f) => s + Math.abs(f.deviation), 0) / (cre.feeds.length || 1)).toFixed(3)}%` },
                            { label: 'MAX STALENESS', value: `${Math.max(...cre.feeds.map(f => f.ageSeconds), 0) < 60 ? Math.max(...cre.feeds.map(f => f.ageSeconds), 0) + 's' : `${Math.floor(Math.max(...cre.feeds.map(f => f.ageSeconds), 0) / 60)}m`}` },
                        ].map(s => (
                            <div key={s.label} className="flex justify-between items-center text-[9px] font-mono px-2 py-1 rounded"
                                style={{ background: 'rgba(15,23,42,0.5)' }}>
                                <span className="text-slate-600">{s.label}</span>
                                <span className="text-cyan-400">{s.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Risk Matrix ───────────────────────────────────────────────── */}
            <div className="glass-panel p-4" style={{ background: 'rgba(8,15,30,0.5)' }}>
                <div className="flex items-center gap-2 mb-3">
                    <BarChart3 className="w-3.5 h-3.5 text-cyan-400" />
                    <h3 className="text-[10px] font-mono text-slate-500 tracking-widest">ORACLE RISK MATRIX</h3>
                </div>
                <RiskMatrix feeds={cre.feeds} />
            </div>

            {/* ── Circuit Breakers ──────────────────────────────────────────── */}
            <div>
                <div className="flex items-center gap-2 mb-3">
                    <Shield className="w-3.5 h-3.5 text-cyan-400" />
                    <h3 className="text-[10px] font-mono text-slate-500 tracking-widest">CIRCUIT BREAKERS</h3>
                    <span className="ml-auto text-[9px] font-mono text-slate-600">
                        Auto-engaged at threshold breach
                    </span>
                </div>
                <CircuitBreakers feeds={cre.feeds} />
            </div>

            {/* ── Footer: feed etherscan links ──────────────────────────────── */}
            <div className="flex flex-wrap gap-3 pt-1 border-t border-slate-800">
                {cre.feeds.slice(0, 3).map(f => (
                    <a
                        key={f.symbol}
                        href={`https://etherscan.io/address/${f.status !== 'offline' ? '0x' + '0'.repeat(40) : ''}`}
                        target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[9px] font-mono text-slate-600 hover:text-cyan-400 transition-colors"
                        style={{ color: f.color + 'aa' }}
                    >
                        <ExternalLink className="w-2.5 h-2.5" />
                        {f.label}
                    </a>
                ))}
                <span className="ml-auto text-[9px] font-mono text-slate-700">
                    CHAINLINK DATA FEEDS · DECENTRALIZED ORACLE NETWORK
                </span>
            </div>
        </div>
    );
}

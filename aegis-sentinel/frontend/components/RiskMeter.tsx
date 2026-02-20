import { motion, useSpring, useTransform } from 'framer-motion';
import { useEffect, useId } from 'react';

interface RiskMeterProps {
    score: number; // 0-100
}

function getRiskColor(score: number) {
    if (score >= 85) return { stroke: '#ff2d55', text: '#ff2d55', label: 'CRITICAL', glow: 'rgba(255,45,85,0.5)' };
    if (score >= 70) return { stroke: '#ff6b35', text: '#ff6b35', label: 'HIGH', glow: 'rgba(255,107,53,0.5)' };
    if (score >= 40) return { stroke: '#ffd700', text: '#ffd700', label: 'MEDIUM', glow: 'rgba(255,215,0,0.5)' };
    return { stroke: '#00ff9d', text: '#00ff9d', label: 'LOW', glow: 'rgba(0,255,157,0.5)' };
}

// SVG arc params
const R = 80; // radius
const CX = 100;
const CY = 100;
const START_DEG = 210; // degrees
const SWEEP_DEG = 300; // total sweep 300°

function polarToXY(cx: number, cy: number, r: number, deg: number) {
    const rad = (deg - 90) * (Math.PI / 180);
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
    const s = polarToXY(cx, cy, r, startDeg);
    const e = polarToXY(cx, cy, r, endDeg);
    const large = endDeg - startDeg > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
}

export default function RiskMeter({ score }: RiskMeterProps) {
    const id = useId().replace(/:/g, '');
    const spring = useSpring(score, { stiffness: 60, damping: 18 });

    useEffect(() => { spring.set(score); }, [score, spring]);

    const colors = getRiskColor(score);
    const endDeg = START_DEG + (SWEEP_DEG * Math.min(score, 100)) / 100;

    const trackPath = arcPath(CX, CY, R, START_DEG, START_DEG + SWEEP_DEG);
    const fillPath = score > 0 ? arcPath(CX, CY, R, START_DEG, endDeg) : '';

    const needleEnd = score > 0 ? polarToXY(CX, CY, 65, endDeg) : polarToXY(CX, CY, 65, START_DEG);

    return (
        <div className="flex flex-col items-center gap-4 w-full">
            {/* SVG Gauge */}
            <div className="relative">
                <svg width="200" height="180" viewBox="0 0 200 200">
                    <defs>
                        <filter id={`glow-${id}`}>
                            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                        <linearGradient id={`arc-grad-${id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#00ff9d" />
                            <stop offset="40%" stopColor="#ffd700" />
                            <stop offset="70%" stopColor="#ff6b35" />
                            <stop offset="100%" stopColor="#ff2d55" />
                        </linearGradient>
                    </defs>

                    {/* Tick marks */}
                    {Array.from({ length: 11 }).map((_, i) => {
                        const deg = START_DEG + (SWEEP_DEG * i) / 10;
                        const inner = polarToXY(CX, CY, 68, deg);
                        const outer = polarToXY(CX, CY, 78, deg);
                        return (
                            <line
                                key={i}
                                x1={inner.x} y1={inner.y}
                                x2={outer.x} y2={outer.y}
                                stroke="rgba(0,212,255,0.3)"
                                strokeWidth={i % 5 === 0 ? 2 : 1}
                            />
                        );
                    })}

                    {/* Track arc */}
                    <path d={trackPath} fill="none" stroke="rgba(0,212,255,0.1)" strokeWidth="10" strokeLinecap="round" />

                    {/* Fill arc */}
                    {score > 0 && (
                        <motion.path
                            d={fillPath}
                            fill="none"
                            stroke={`url(#arc-grad-${id})`}
                            strokeWidth="10"
                            strokeLinecap="round"
                            filter={`url(#glow-${id})`}
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 1.2, ease: 'easeOut' }}
                        />
                    )}

                    {/* Needle */}
                    <motion.line
                        x1={CX} y1={CY}
                        x2={needleEnd.x} y2={needleEnd.y}
                        stroke={colors.stroke}
                        strokeWidth="2"
                        strokeLinecap="round"
                        filter={`url(#glow-${id})`}
                        animate={{ x2: needleEnd.x, y2: needleEnd.y }}
                        transition={{ type: 'spring', stiffness: 60, damping: 18 }}
                    />
                    <circle cx={CX} cy={CY} r="5" fill={colors.stroke} filter={`url(#glow-${id})`} />

                    {/* Center score */}
                    <text x={CX} y={CY + 28} textAnchor="middle" fontSize="28" fontWeight="700" fontFamily="JetBrains Mono, monospace" fill={colors.text}>
                        {Math.round(score)}
                    </text>
                    <text x={CX} y={CY + 44} textAnchor="middle" fontSize="10" fontFamily="JetBrains Mono, monospace" fill="rgba(226,232,240,0.5)">
                        RISK SCORE
                    </text>
                </svg>

                {/* Pulsing ring for critical */}
                {score >= 85 && (
                    <motion.div
                        className="absolute inset-0 rounded-full border-2 border-red-500 pointer-events-none"
                        animate={{ scale: [1, 1.08, 1], opacity: [0.8, 0, 0.8] }}
                        transition={{ duration: 1, repeat: Infinity }}
                    />
                )}
            </div>

            {/* Threat level badge */}
            <motion.div
                className="px-5 py-1.5 rounded-full text-xs font-mono font-semibold tracking-widest border"
                animate={{ scale: score >= 85 ? [1, 1.04, 1] : 1 }}
                transition={{ duration: 0.6, repeat: score >= 85 ? Infinity : 0 }}
                style={{ color: colors.text, borderColor: colors.stroke, boxShadow: `0 0 10px ${colors.glow}` }}
            >
                ⚡ {colors.label} THREAT
            </motion.div>

            {/* Progress bar */}
            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                    className="h-full rounded-full"
                    animate={{ width: `${score}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    style={{ background: `linear-gradient(90deg, #00ff9d, ${colors.stroke})`, boxShadow: `0 0 8px ${colors.glow}` }}
                />
            </div>

            {/* Segment labels */}
            <div className="flex w-full justify-between text-[9px] font-mono text-slate-600">
                <span>SAFE</span><span>LOW</span><span>MED</span><span>HIGH</span><span>CRITICAL</span>
            </div>
        </div>
    );
}

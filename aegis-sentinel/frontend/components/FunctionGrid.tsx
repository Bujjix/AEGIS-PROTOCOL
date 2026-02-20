import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, ShieldOff, TrendingUp, Clock, Hash } from 'lucide-react';

export interface FunctionInfo {
    name: string;
    selector: string;
    blocked: boolean;
    callCount: number;
    lastCalled: string;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    description: string;
}

interface FunctionGridProps {
    functions: FunctionInfo[];
    onToggle?: (name: string) => void;
}

const RISK_STYLES = {
    low: { badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', glow: 'rgba(0,255,157,0.15)' },
    medium: { badge: 'bg-yellow-500/10  text-yellow-400  border-yellow-500/30', glow: 'rgba(255,215,0,0.15)' },
    high: { badge: 'bg-orange-500/10  text-orange-400  border-orange-500/30', glow: 'rgba(255,107,53,0.15)' },
    critical: { badge: 'bg-red-500/10     text-red-400     border-red-500/30', glow: 'rgba(255,45,85,0.15)' },
};

export default function FunctionGrid({ functions, onToggle }: FunctionGridProps) {
    return (
        <div className="grid grid-cols-2 gap-3">
            {functions.map((fn) => {
                const risk = RISK_STYLES[fn.riskLevel];
                return (
                    <motion.div
                        key={fn.name}
                        layout
                        className="glass-panel p-4 cursor-pointer select-none relative overflow-hidden"
                        onClick={() => onToggle?.(fn.name)}
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        animate={{
                            borderColor: fn.blocked ? 'rgba(255,45,85,0.4)' : 'rgba(0,212,255,0.12)',
                            boxShadow: fn.blocked
                                ? '0 0 20px rgba(255,45,85,0.15), 0 4px 24px rgba(0,0,0,0.6)'
                                : '0 4px 24px rgba(0,0,0,0.6)',
                        }}
                        transition={{ duration: 0.4 }}
                    >
                        {/* Blocked overlay shimmer */}
                        <AnimatePresence>
                            {fn.blocked && (
                                <motion.div
                                    className="absolute inset-0 pointer-events-none"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: [0.05, 0.12, 0.05] }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 1.5, repeat: Infinity }}
                                    style={{ background: 'radial-gradient(ellipse at center, rgba(255,45,85,0.2) 0%, transparent 70%)' }}
                                />
                            )}
                        </AnimatePresence>

                        {/* Header row */}
                        <div className="flex items-center justify-between mb-3">
                            <motion.div
                                animate={{ color: fn.blocked ? '#ff2d55' : '#00ff9d' }}
                                transition={{ duration: 0.3 }}
                            >
                                {fn.blocked
                                    ? <ShieldOff className="w-5 h-5" style={{ filter: 'drop-shadow(0 0 6px rgba(255,45,85,0.7))' }} />
                                    : <ShieldCheck className="w-5 h-5" style={{ filter: 'drop-shadow(0 0 6px rgba(0,255,157,0.7))' }} />
                                }
                            </motion.div>

                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${risk.badge}`}>
                                {fn.riskLevel.toUpperCase()}
                            </span>
                        </div>

                        {/* Function name */}
                        <div className="mb-1">
                            <span className="text-sm font-mono font-semibold text-slate-100">{fn.name}()</span>
                        </div>

                        {/* Selector */}
                        <div className="flex items-center gap-1 mb-3">
                            <Hash className="w-3 h-3 text-slate-600" />
                            <span className="text-[10px] font-mono text-slate-500">{fn.selector}</span>
                        </div>

                        {/* Status pill */}
                        <motion.div
                            className="flex items-center gap-2 px-2 py-1 rounded-md mb-3"
                            animate={{ backgroundColor: fn.blocked ? 'rgba(255,45,85,0.1)' : 'rgba(0,255,157,0.06)' }}
                        >
                            <motion.div
                                className="w-2 h-2 rounded-full pulse-dot"
                                animate={{ backgroundColor: fn.blocked ? '#ff2d55' : '#00ff9d' }}
                            />
                            <motion.span
                                className="text-xs font-mono font-semibold"
                                animate={{ color: fn.blocked ? '#ff2d55' : '#00ff9d' }}
                            >
                                {fn.blocked ? 'BLOCKED' : 'ACTIVE'}
                            </motion.span>
                        </motion.div>

                        {/* Stats */}
                        <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                            <span className="flex items-center gap-1">
                                <TrendingUp className="w-3 h-3" />
                                {fn.callCount} calls
                            </span>
                            <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {fn.lastCalled}
                            </span>
                        </div>
                    </motion.div>
                );
            })}
        </div>
    );
}

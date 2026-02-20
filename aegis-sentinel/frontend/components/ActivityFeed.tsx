import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Info, CheckCircle, XCircle, X, ArrowRight } from 'lucide-react';
import { useState } from 'react';

// ── Types ────────────────────────────────────────────────────────────────────

export type AlertType = 'critical' | 'warning' | 'info' | 'success';

export interface Alert {
    id: string;
    type: AlertType;
    message: string;
    time: string;
    detail?: string;
}

export type TxStatus = 'success' | 'failed' | 'blocked';

export interface Transaction {
    hash: string;
    fn: string;
    status: TxStatus;
    timeAgo: string;
    gas?: string;
}

interface ActivityFeedProps {
    alerts: Alert[];
    transactions: Transaction[];
    onDismissAlert?: (id: string) => void;
}

// ── Sub-components ───────────────────────────────────────────────────────────

const ALERT_STYLES: Record<AlertType, { icon: React.ElementType; bg: string; border: string; text: string; dot: string }> = {
    critical: { icon: XCircle, bg: 'rgba(255,45,85,0.08)', border: 'rgba(255,45,85,0.3)', text: '#ff2d55', dot: '#ff2d55' },
    warning: { icon: AlertTriangle, bg: 'rgba(255,215,0,0.06)', border: 'rgba(255,215,0,0.25)', text: '#ffd700', dot: '#ffd700' },
    info: { icon: Info, bg: 'rgba(0,212,255,0.06)', border: 'rgba(0,212,255,0.2)', text: '#00d4ff', dot: '#00d4ff' },
    success: { icon: CheckCircle, bg: 'rgba(0,255,157,0.06)', border: 'rgba(0,255,157,0.2)', text: '#00ff9d', dot: '#00ff9d' },
};

const TX_STATUS_STYLES: Record<TxStatus, { label: string; color: string }> = {
    success: { label: 'SUCCESS', color: '#00ff9d' },
    failed: { label: 'FAILED', color: '#ff6b35' },
    blocked: { label: 'BLOCKED', color: '#ff2d55' },
};

function AlertItem({ alert, onDismiss }: { alert: Alert; onDismiss?: () => void }) {
    const s = ALERT_STYLES[alert.type];
    const Icon = s.icon;
    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: -20, height: 0 }}
            animate={{ opacity: 1, x: 0, height: 'auto' }}
            exit={{ opacity: 0, x: 20, height: 0 }}
            transition={{ duration: 0.3 }}
            className="rounded-lg px-3 py-2.5 flex items-start gap-2.5 mb-2 relative overflow-hidden"
            style={{ background: s.bg, border: `1px solid ${s.border}` }}
        >
            {/* Blink on critical */}
            {alert.type === 'critical' && (
                <motion.div
                    className="absolute inset-0 pointer-events-none"
                    animate={{ opacity: [0, 0.1, 0] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    style={{ background: 'rgba(255,45,85,0.2)' }}
                />
            )}
            <Icon className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: s.text }} />
            <div className="flex-1 min-w-0">
                <p className="text-xs font-mono leading-tight" style={{ color: s.text }}>{alert.message}</p>
                {alert.detail && <p className="text-[10px] text-slate-500 mt-0.5 font-mono">{alert.detail}</p>}
                <p className="text-[9px] text-slate-600 mt-1 font-mono">{alert.time}</p>
            </div>
            {onDismiss && (
                <button onClick={onDismiss} className="shrink-0 hover:opacity-70 transition-opacity">
                    <X className="w-3 h-3 text-slate-500" />
                </button>
            )}
        </motion.div>
    );
}

function TxRow({ tx }: { tx: Transaction }) {
    const st = TX_STATUS_STYLES[tx.status];
    const shortHash = `${tx.hash.slice(0, 6)}…${tx.hash.slice(-4)}`;
    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between py-2 border-b border-white/5 last:border-0 group"
        >
            <div className="flex items-center gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: st.color, boxShadow: `0 0 4px ${st.color}` }} />
                <div>
                    <span className="text-xs font-mono text-slate-300">{tx.fn}()</span>
                    <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-[9px] font-mono text-slate-600">{shortHash}</span>
                        <ArrowRight className="w-2.5 h-2.5 text-slate-700" />
                        <span className="text-[9px] font-mono text-slate-500">{tx.timeAgo}</span>
                    </div>
                </div>
            </div>
            <span
                className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded"
                style={{ color: st.color, backgroundColor: `${st.color}15`, border: `1px solid ${st.color}30` }}
            >
                {st.label}
            </span>
        </motion.div>
    );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ActivityFeed({ alerts, transactions, onDismissAlert }: ActivityFeedProps) {
    const [tab, setTab] = useState<'alerts' | 'txns'>('alerts');

    return (
        <div className="flex flex-col h-full">
            {/* Tab bar */}
            <div className="flex gap-1 mb-3">
                {(['alerts', 'txns'] as const).map((t) => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        className="relative px-3 py-1 text-xs font-mono rounded transition-colors"
                        style={{ color: tab === t ? '#00d4ff' : 'rgba(100,116,139,0.8)' }}
                    >
                        {tab === t && (
                            <motion.div
                                layoutId="tab-bg"
                                className="absolute inset-0 rounded"
                                style={{ background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.2)' }}
                            />
                        )}
                        <span className="relative z-10">
                            {t === 'alerts' ? `⚠ ALERTS (${alerts.length})` : `⛓ TXN FEED (${transactions.length})`}
                        </span>
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto pr-1" style={{ maxHeight: 260 }}>
                <AnimatePresence mode="wait">
                    {tab === 'alerts' ? (
                        <motion.div key="alerts" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            {alerts.length === 0 && (
                                <p className="text-xs font-mono text-slate-600 text-center py-8">No active alerts</p>
                            )}
                            <AnimatePresence>
                                {alerts.map(a => (
                                    <AlertItem key={a.id} alert={a} onDismiss={() => onDismissAlert?.(a.id)} />
                                ))}
                            </AnimatePresence>
                        </motion.div>
                    ) : (
                        <motion.div key="txns" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            {transactions.length === 0 && (
                                <p className="text-xs font-mono text-slate-600 text-center py-8">No recent transactions</p>
                            )}
                            {transactions.map((tx, i) => <TxRow key={i} tx={tx} />)}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

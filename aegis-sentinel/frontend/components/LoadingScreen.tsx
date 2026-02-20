import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Shield } from 'lucide-react';

interface LoadingScreenProps {
    onComplete: () => void;
}

const BOOT_LINES = [
    'Initializing Aegis Sentinel Protocol v1.0...',
    'Loading Chainlink oracle interfaces...',
    'Connecting to price feed: ETH/USD...',
    'Scanning function selectors...',
    'Deploying risk engine modules...',
    'Calibrating threat detection thresholds...',
    'Activating real-time monitoring...',
    'System armed. All guards active.',
];

export default function LoadingScreen({ onComplete }: LoadingScreenProps) {
    const [lines, setLines] = useState<string[]>([]);
    const [progress, setProgress] = useState(0);
    const [done, setDone] = useState(false);
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        let lineIndex = 0;
        const totalDuration = 2800; // ms total
        const lineInterval = totalDuration / BOOT_LINES.length;

        const addLine = setInterval(() => {
            if (lineIndex < BOOT_LINES.length) {
                const idx = lineIndex;
                setLines(prev => [...prev, BOOT_LINES[idx]]);
                setProgress(Math.round(((idx + 1) / BOOT_LINES.length) * 100));
                lineIndex++;
            } else {
                clearInterval(addLine);
                setTimeout(() => {
                    setDone(true);
                    setTimeout(() => {
                        setVisible(false);
                        setTimeout(onComplete, 500);
                    }, 600);
                }, 300);
            }
        }, lineInterval);

        return () => clearInterval(addLine);
    }, [onComplete]);

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
                    style={{ background: '#020813' }}
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    {/* Cyber grid */}
                    <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                            backgroundImage: 'linear-gradient(rgba(0,212,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.04) 1px, transparent 1px)',
                            backgroundSize: '40px 40px',
                        }}
                    />

                    {/* Corner brackets */}
                    {[
                        'top-0 left-0 border-t-2 border-l-2',
                        'top-0 right-0 border-t-2 border-r-2',
                        'bottom-0 left-0 border-b-2 border-l-2',
                        'bottom-0 right-0 border-b-2 border-r-2',
                    ].map((cls, i) => (
                        <div key={i} className={`absolute w-12 h-12 pointer-events-none ${cls}`} style={{ borderColor: 'rgba(0,212,255,0.5)' }} />
                    ))}

                    {/* Center content */}
                    <div className="relative z-10 flex flex-col items-center gap-8 w-full max-w-lg px-6">

                        {/* Shield logo */}
                        <motion.div
                            animate={{ scale: done ? 1.1 : [1, 1.06, 1], opacity: 1 }}
                            transition={{ duration: 1.5, repeat: done ? 0 : Infinity }}
                        >
                            <div className="relative">
                                <Shield
                                    className="w-20 h-20"
                                    style={{ color: '#00d4ff', filter: 'drop-shadow(0 0 20px rgba(0,212,255,0.8))' }}
                                />
                                {/* Spinning ring */}
                                <motion.div
                                    className="absolute inset-0 rounded-full border border-cyan-500/30"
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                                    style={{ width: 96, height: 96, top: -8, left: -8 }}
                                />
                                <motion.div
                                    className="absolute inset-0 rounded-full border border-purple-500/20"
                                    animate={{ rotate: -360 }}
                                    transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
                                    style={{ width: 112, height: 112, top: -16, left: -16 }}
                                />
                            </div>
                        </motion.div>

                        {/* Title */}
                        <div className="text-center">
                            <motion.h1
                                className="text-3xl font-mono font-bold tracking-[0.3em]"
                                style={{ color: '#00d4ff', textShadow: '0 0 20px rgba(0,212,255,0.7)' }}
                                animate={{ opacity: [0.8, 1, 0.8] }}
                                transition={{ duration: 2, repeat: Infinity }}
                            >
                                AEGIS SENTINEL
                            </motion.h1>
                            <p className="text-xs font-mono text-slate-500 tracking-[0.4em] mt-1">DECENTRALIZED SECURITY PROTOCOL</p>
                        </div>

                        {/* Boot log */}
                        <div
                            className="w-full rounded-lg p-4 font-mono text-xs space-y-1"
                            style={{ background: 'rgba(0,212,255,0.04)', border: '1px solid rgba(0,212,255,0.15)' }}
                        >
                            {lines.map((line, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="flex items-center gap-2"
                                >
                                    <span style={{ color: i === lines.length - 1 ? '#00ff9d' : 'rgba(0,212,255,0.6)' }}>›</span>
                                    <span style={{ color: i === lines.length - 1 ? '#00ff9d' : '#64748b' }}>{line}</span>
                                </motion.div>
                            ))}
                            {/* Blinking cursor */}
                            {!done && (
                                <motion.span
                                    className="inline-block w-2 h-3 ml-4"
                                    animate={{ opacity: [1, 0, 1] }}
                                    transition={{ duration: 0.6, repeat: Infinity }}
                                    style={{ background: '#00d4ff' }}
                                />
                            )}
                        </div>

                        {/* Progress bar */}
                        <div className="w-full">
                            <div className="flex justify-between text-[10px] font-mono text-slate-600 mb-1">
                                <span>BOOTING SYSTEM</span>
                                <motion.span
                                    animate={{ color: done ? '#00ff9d' : '#00d4ff' }}
                                >
                                    {progress}%
                                </motion.span>
                            </div>
                            <div className="h-1.5 rounded-full w-full" style={{ background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.12)' }}>
                                <motion.div
                                    className="h-full rounded-full"
                                    animate={{ width: `${progress}%` }}
                                    transition={{ duration: 0.3, ease: 'easeOut' }}
                                    style={{
                                        background: done
                                            ? 'linear-gradient(90deg, #00ff9d, #00d4ff)'
                                            : 'linear-gradient(90deg, #00d4ff, #7c3aed)',
                                        boxShadow: done
                                            ? '0 0 10px rgba(0,255,157,0.6)'
                                            : '0 0 10px rgba(0,212,255,0.6)',
                                    }}
                                />
                            </div>
                        </div>

                        {done && (
                            <motion.p
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-xs font-mono tracking-widest"
                                style={{ color: '#00ff9d', textShadow: '0 0 10px rgba(0,255,157,0.7)' }}
                            >
                                ✓ SYSTEM ARMED — ENTERING DASHBOARD
                            </motion.p>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

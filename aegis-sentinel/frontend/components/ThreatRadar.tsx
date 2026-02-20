import {
    RadarChart, Radar, PolarGrid, PolarAngleAxis,
    PolarRadiusAxis, ResponsiveContainer, Tooltip,
} from 'recharts';
import { motion } from 'framer-motion';

export interface RadarMetrics {
    priceVolatility: number;
    callFrequency: number;
    liquidityRisk: number;
    oracleHealth: number;
    mevActivity: number;
    networkLoad: number;
}

interface ThreatRadarProps {
    metrics: RadarMetrics;
    isAttack?: boolean;
}

const FULL_KEYS: Record<keyof RadarMetrics, string> = {
    priceVolatility: 'Price Volatility',
    callFrequency: 'Call Frequency',
    liquidityRisk: 'Liquidity Risk',
    oracleHealth: 'Oracle Health',
    mevActivity: 'MEV Activity',
    networkLoad: 'Network Load',
};

const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload?.length) {
        return (
            <div className="glass-panel px-3 py-2 text-xs font-mono">
                <span className="text-cyan-400">{payload[0].payload.metric}</span>
                <span className="text-slate-300 ml-2">{payload[0].value.toFixed(0)}</span>
            </div>
        );
    }
    return null;
};

export default function ThreatRadar({ metrics, isAttack }: ThreatRadarProps) {
    const data = (Object.keys(metrics) as (keyof RadarMetrics)[]).map(k => ({
        metric: FULL_KEYS[k],
        value: metrics[k],
    }));

    const radarColor = isAttack ? '#ff2d55' : '#00d4ff';
    const radarFill = isAttack ? 'rgba(255,45,85,0.15)' : 'rgba(0,212,255,0.08)';

    return (
        <motion.div
            animate={{ filter: isAttack ? 'drop-shadow(0 0 16px rgba(255,45,85,0.4))' : 'none' }}
            transition={{ duration: 0.5 }}
            className="w-full"
        >
            <ResponsiveContainer width="100%" height={260}>
                <RadarChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                    <PolarGrid stroke="rgba(0,212,255,0.1)" />
                    <PolarAngleAxis
                        dataKey="metric"
                        tick={{ fill: 'rgba(226,232,240,0.6)', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
                    />
                    <PolarRadiusAxis
                        angle={30}
                        domain={[0, 100]}
                        tick={{ fill: 'rgba(100,116,139,0.6)', fontSize: 8 }}
                        axisLine={false}
                    />
                    <Radar
                        name="Threat"
                        dataKey="value"
                        stroke={radarColor}
                        fill={radarFill}
                        strokeWidth={2}
                        dot={{ r: 3, fill: radarColor, strokeWidth: 0 }}
                        animationDuration={800}
                    />
                    <Tooltip content={<CustomTooltip />} />
                </RadarChart>
            </ResponsiveContainer>

            {/* Legend dots */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center mt-1">
                {data.map(d => (
                    <div key={d.metric} className="flex items-center gap-1.5">
                        <div
                            className="w-1.5 h-1.5 rounded-full"
                            style={{
                                backgroundColor: d.value > 70 ? '#ff2d55' : d.value > 40 ? '#ffd700' : '#00ff9d',
                                boxShadow: `0 0 4px ${d.value > 70 ? '#ff2d55' : d.value > 40 ? '#ffd700' : '#00ff9d'}`,
                            }}
                        />
                        <span className="text-[9px] font-mono text-slate-500">{d.metric.split(' ')[0]}</span>
                        <span className="text-[9px] font-mono text-slate-400">{d.value.toFixed(0)}</span>
                    </div>
                ))}
            </div>
        </motion.div>
    );
}

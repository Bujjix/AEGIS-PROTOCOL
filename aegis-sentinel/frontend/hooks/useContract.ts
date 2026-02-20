import { ethers } from 'ethers';
import { useEffect, useState, useCallback } from 'react';
import { usePublicClient } from 'wagmi';

// Minimal ABI for reading contract state
const AEGIS_ABI = [
    'function riskScore() view returns (uint256)',
    'function functionBlocked(bytes4) view returns (bool)',
    'function totalDeposits() view returns (uint256)',
    'function lastAnalyzedAt() view returns (uint256)',
    'function simulateAttack(uint256) external',
    'function resetRisk() external',
    'event RiskUpdated(uint256 indexed newScore, uint256 priceDeviation, string trigger)',
    'event FunctionBlocked(bytes4 indexed selector, string name, uint256 riskScore)',
    'event FunctionUnblocked(bytes4 indexed selector, string name)',
];

const FUNCTION_SELECTORS: Record<string, string> = {
    deposit: ethers.id('deposit()').slice(0, 10),
    withdraw: ethers.id('withdraw(uint256)').slice(0, 10),
    trade: ethers.id('trade(string,uint256)').slice(0, 10),
    borrow: ethers.id('borrow(uint256)').slice(0, 10),
    repay: ethers.id('repay(uint256)').slice(0, 10),
    liquidate: ethers.id('liquidate(address)').slice(0, 10),
};

export type ContractState = {
    riskScore: number;
    lastAnalyzedAt: number;
    totalDeposits: string;
    blocked: Record<string, boolean>;
};

export function useContract() {
    const publicClient = usePublicClient();
    const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}` | undefined;

    const [state, setState] = useState<ContractState | null>(null);
    const [loading, setLoading] = useState(false);

    const fetchState = useCallback(async () => {
        if (!contractAddress || !publicClient) return;
        setLoading(true);
        try {
            const provider = new ethers.JsonRpcProvider((publicClient as any).transport.url);
            const contract = new ethers.Contract(contractAddress, AEGIS_ABI, provider);

            const [risk, lastAt, deposits, ...blockedArr] = await Promise.all([
                contract.riskScore(),
                contract.lastAnalyzedAt(),
                contract.totalDeposits(),
                ...Object.values(FUNCTION_SELECTORS).map(sel => contract.functionBlocked(sel)),
            ]);

            const blocked: Record<string, boolean> = {};
            Object.keys(FUNCTION_SELECTORS).forEach((fn, i) => {
                blocked[fn] = blockedArr[i] as boolean;
            });

            setState({
                riskScore: Number(risk),
                lastAnalyzedAt: Number(lastAt),
                totalDeposits: ethers.formatEther(deposits),
                blocked,
            });
        } catch (e) {
            console.warn('[useContract] fetch error:', e);
        } finally {
            setLoading(false);
        }
    }, [contractAddress, publicClient]);

    useEffect(() => {
        fetchState();
        const t = setInterval(fetchState, 15000);
        return () => clearInterval(t);
    }, [fetchState]);

    return { state, loading, refetch: fetchState, contractAddress };
}

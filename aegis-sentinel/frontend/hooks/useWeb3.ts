import { useAccount, useChainId, useBlockNumber } from 'wagmi';

export function useWeb3() {
    const { address, isConnected, isConnecting } = useAccount();
    const chainId = useChainId();
    const { data: blockNumber } = useBlockNumber({ watch: true });

    const chainName: Record<number, string> = {
        1: 'Mainnet',
        11155111: 'Sepolia',
        31337: 'Localhost',
    };

    return {
        address,
        isConnected,
        isConnecting,
        chainId,
        chainName: chainName[chainId] ?? `Chain ${chainId}`,
        blockNumber: blockNumber?.toString() ?? '--',
    };
}

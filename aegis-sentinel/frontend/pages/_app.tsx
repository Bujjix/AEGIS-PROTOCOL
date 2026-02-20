'use client';
import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider, darkTheme, getDefaultConfig } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
import { sepolia, mainnet, hardhat } from 'wagmi/chains';

// ── Wagmi + RainbowKit config ────────────────────────────────────────────────
// getDefaultConfig is the recommended single-call setup for RainbowKit v2.
// MetaMask / injected wallets work out of the box with NO WalletConnect project ID.
const config = getDefaultConfig({
    appName: 'Aegis Sentinel Protocol',
    // WalletConnect project ID – required by RainbowKit even if you only need MetaMask.
    // Get a free one at https://cloud.walletconnect.com  (paste into .env as NEXT_PUBLIC_WC_PROJECT_ID)
    // Fallback 'sentinel-demo' works for localhost MetaMask connections.
    projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID ?? 'sentinel-demo-1234',
    chains: [sepolia, mainnet, hardhat],
    ssr: false, // disable SSR so wagmi hooks always run client-side (avoids hydration mismatches)
});

const queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: 10_000 } },
});

const rkTheme = darkTheme({
    accentColor: '#00d4ff',
    accentColorForeground: '#020813',
    borderRadius: 'medium',
    fontStack: 'system',
    overlayBlur: 'small',
});

export default function App({ Component, pageProps }: AppProps) {
    return (
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
                <RainbowKitProvider theme={rkTheme} coolMode>
                    <Component {...pageProps} />
                </RainbowKitProvider>
            </QueryClientProvider>
        </WagmiProvider>
    );
}

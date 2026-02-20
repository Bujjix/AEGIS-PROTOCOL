/**
 * pages/index.tsx
 *
 * Thin SSR-disabled wrapper.
 * All wallet/blockchain hooks run ONLY on the client, so we must never
 * server-render any component that touches wagmi / RainbowKit.
 * next/dynamic with ssr:false is the canonical fix for all Web3 dashboards.
 */
import dynamic from 'next/dynamic';

const Dashboard = dynamic(() => import('../components/Dashboard'), {
    ssr: false,
    loading: () => null,   // LoadingScreen inside Dashboard handles the splash
});

export default function Home() {
    return <Dashboard />;
}

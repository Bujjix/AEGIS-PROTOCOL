import React from 'react';
import Head from 'next/head';

interface LayoutProps {
    children: React.ReactNode;
    title?: string;
}

export default function Layout({ children, title = 'Aegis Sentinel Protocol' }: LayoutProps) {
    return (
        <>
            <Head>
                <title>{title}</title>
                <meta name="description" content="Decentralized security layer for smart contracts with real-time risk monitoring via Chainlink" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <link rel="icon" href="/favicon.ico" />
            </Head>

            {/* Scanline overlay */}
            <div className="scan-overlay" />

            {/* Grid background */}
            <div
                className="fixed inset-0 pointer-events-none"
                style={{
                    backgroundImage:
                        'linear-gradient(rgba(0,212,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.03) 1px, transparent 1px)',
                    backgroundSize: '40px 40px',
                    zIndex: 0,
                }}
            />

            {/* Corner decorations */}
            <div className="fixed top-0 left-0 w-16 h-16 pointer-events-none z-10" style={{ borderTop: '2px solid rgba(0,212,255,0.4)', borderLeft: '2px solid rgba(0,212,255,0.4)' }} />
            <div className="fixed top-0 right-0 w-16 h-16 pointer-events-none z-10" style={{ borderTop: '2px solid rgba(0,212,255,0.4)', borderRight: '2px solid rgba(0,212,255,0.4)' }} />
            <div className="fixed bottom-0 left-0 w-16 h-16 pointer-events-none z-10" style={{ borderBottom: '2px solid rgba(0,212,255,0.4)', borderLeft: '2px solid rgba(0,212,255,0.4)' }} />
            <div className="fixed bottom-0 right-0 w-16 h-16 pointer-events-none z-10" style={{ borderBottom: '2px solid rgba(0,212,255,0.4)', borderRight: '2px solid rgba(0,212,255,0.4)' }} />

            <main className="relative z-10 min-h-screen">
                {children}
            </main>
        </>
    );
}

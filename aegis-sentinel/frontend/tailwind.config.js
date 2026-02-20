/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                cyber: {
                    bg: "#020813",
                    card: "#06111f",
                    border: "#0d2137",
                    blue: "#00d4ff",
                    purple: "#7c3aed",
                    green: "#00ff9d",
                    yellow: "#ffd700",
                    orange: "#ff6b35",
                    red: "#ff2d55",
                    muted: "#334155",
                },
            },
            fontFamily: {
                mono: ["'JetBrains Mono'", "'Courier New'", "monospace"],
                sans: ["'Inter'", "sans-serif"],
            },
            animation: {
                "pulse-glow": "pulseGlow 2s ease-in-out infinite",
                "scan-line": "scanLine 3s linear infinite",
                "glitch": "glitch 0.3s ease-in-out infinite",
                "radar-spin": "radarSpin 4s linear infinite",
                "neon-flicker": "neonFlicker 1.5s ease-in-out infinite",
                "float": "float 3s ease-in-out infinite",
            },
            keyframes: {
                pulseGlow: {
                    "0%, 100%": { opacity: "1" },
                    "50%": { opacity: "0.5" },
                },
                scanLine: {
                    "0%": { transform: "translateY(-100%)" },
                    "100%": { transform: "translateY(100vh)" },
                },
                glitch: {
                    "0%": { transform: "translateX(0)" },
                    "20%": { transform: "translateX(-2px)" },
                    "40%": { transform: "translateX(2px)" },
                    "60%": { transform: "translateX(-1px)" },
                    "80%": { transform: "translateX(1px)" },
                    "100%": { transform: "translateX(0)" },
                },
                radarSpin: {
                    "0%": { transform: "rotate(0deg)" },
                    "100%": { transform: "rotate(360deg)" },
                },
                neonFlicker: {
                    "0%, 90%, 100%": { opacity: "1" },
                    "95%": { opacity: "0.3" },
                },
                float: {
                    "0%, 100%": { transform: "translateY(0px)" },
                    "50%": { transform: "translateY(-6px)" },
                },
            },
            boxShadow: {
                "neon-blue": "0 0 12px #00d4ff, 0 0 24px rgba(0,212,255,0.3)",
                "neon-green": "0 0 12px #00ff9d, 0 0 24px rgba(0,255,157,0.3)",
                "neon-red": "0 0 12px #ff2d55, 0 0 24px rgba(255,45,85,0.3)",
                "neon-purple": "0 0 12px #7c3aed, 0 0 24px rgba(124,58,237,0.3)",
                "panel": "0 4px 24px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)",
            },
            backgroundImage: {
                "cyber-grid": "linear-gradient(rgba(0,212,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.03) 1px, transparent 1px)",
                "panel-grad": "linear-gradient(135deg, rgba(6,17,31,0.9) 0%, rgba(2,8,19,0.95) 100%)",
            },
            backgroundSize: {
                "cyber-grid": "40px 40px",
            },
        },
    },
    plugins: [],
};

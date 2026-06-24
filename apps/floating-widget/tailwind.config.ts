import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      keyframes: {
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 12px 0 rgba(56, 189, 248, 0.40)' },
          '50%': { boxShadow: '0 0 28px 6px rgba(56, 189, 248, 0.85)' },
        },
      },
      animation: {
        'pulse-glow': 'pulseGlow 1.8s ease-in-out infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;

import type { Config } from 'tailwindcss';
import typography from '@tailwindcss/typography';

const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        industrial: {
          bg: '#0F172A', // Deep slate dark mode
          surface: '#1E293B',
          border: '#334155',
          accent: '#0EA5E9', // Vivid blue accent
          success: '#10B981',
          warning: '#F59E0B',
          danger: '#EF4444',
          muted: '#64748B'
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [typography],
};

export default config;

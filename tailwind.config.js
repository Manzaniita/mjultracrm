/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#0B0B0C',
        surface: '#121214',
        border: '#1F1F23',
        accent: '#7C3AED',
        accentGreen: '#00F5A0',
        textPrimary: '#F4F4F5',
        textMuted: '#A1A1AA',
        inputBg: '#161619',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['IBM Plex Sans', 'sans-serif'],
      },
      colors: {
        bg: '#020617',
        surface: '#0F172A',
        card: '#1E293B',
        border: '#334155',
        accent: '#22C55E',
        'accent-dim': '#16A34A',
        muted: '#94A3B8',
        text: '#F8FAFC',
      },
    },
  },
  plugins: [],
}

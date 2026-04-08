/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        bg:       '#09090B',
        surface:  '#111113',
        card:     '#18181B',
        border:   '#27272A',
        accent:   '#F97316',
        'accent-dim': '#EA6100',
        'accent2':    '#FB923C',
        muted:    '#71717A',
        'muted-2': '#52525B',
        text:     '#FAFAFA',
        'text-2': '#A1A1AA',
        positive: '#10B981',
        negative: '#F43F5E',
        warning:  '#FBBF24',
      },
      backgroundImage: {
        'gradient-accent': 'linear-gradient(135deg, #F97316, #FB923C)',
        'gradient-card':   'linear-gradient(135deg, rgba(249,115,22,0.08), rgba(251,146,60,0.04))',
        'gradient-glow':   'radial-gradient(ellipse at top, rgba(249,115,22,0.15) 0%, transparent 70%)',
      },
      boxShadow: {
        'glow-accent': '0 0 20px rgba(249,115,22,0.35)',
        'glow-sm':     '0 0 10px rgba(249,115,22,0.2)',
        'card':        '0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)',
        'card-hover':  '0 4px 12px rgba(0,0,0,0.5)',
      },
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        mc: {
          dark: 'var(--mc-dark)',
          darker: 'var(--mc-darker)',
          surface: 'var(--mc-surface)',
          'surface-light': 'var(--mc-surface-light)',
          border: 'var(--mc-border)',
          accent: 'var(--mc-accent)',
          'accent-hover': 'var(--mc-accent-hover)',
          gold: 'var(--mc-gold)',
          text: 'var(--mc-text)',
          'text-muted': 'var(--mc-text-muted)',
        }
      },
      fontFamily: {
        minecraft: ['"Minecraft"', 'VT323', 'monospace'],
      },
    },
  },
  plugins: [],
}

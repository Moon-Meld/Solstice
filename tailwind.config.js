/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        solstice: {
          950: '#06080F',
          900: '#0B0F19',
          850: '#111726',
          800: '#172033',
          700: '#23304A',
          gold: {
            DEFAULT: '#D4AF37',
            light: '#F5E6BE',
            dim: '#997E2B',
            dark: '#5E4B14',
            glow: '#FFE8A3'
          },
          celestial: {
            blue: '#38BDF8',
            emerald: '#10B981',
            purple: '#A855F7',
            rose: '#F43F5E'
          }
        }
      },
      fontFamily: {
        serif: ['Cinzel', 'Playfair Display', 'Songti SC', 'STSong', 'serif'],
        sans: ['Plus Jakarta Sans', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace']
      },
      boxShadow: {
        'gold-glow': '0 0 25px -5px rgba(212, 175, 55, 0.25)',
        'celestial-glow': '0 0 30px -5px rgba(56, 189, 248, 0.2)'
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 30s linear infinite',
      }
    },
  },
  plugins: [],
}

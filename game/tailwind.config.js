/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        rex: {
          bg: '#0f1419',
          card: '#1a2332',
          border: '#2d3748',
          green: '#4ade80',
          'green-dark': '#22c55e',
          amber: '#fbbf24',
          purple: '#a78bfa',
          cyan: '#22d3ee',
        },
      },
      fontFamily: {
        game: ['"Press Start 2P"', 'monospace'],
      },
    },
  },
  plugins: [],
}

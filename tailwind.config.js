/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Sporting Ethos brand — calm, clinical, trustworthy
        ethos: {
          green: '#10b981',
          deep: '#065f46',
          mist: '#ecfdf5',
          ink: '#0f172a',
          slate: '#334155',
        },
      },
      keyframes: {
        'flash-green': {
          '0%': { backgroundColor: '#10b981', transform: 'scale(1.02)' },
          '100%': { backgroundColor: 'var(--tw-bg-opacity, #ffffff)', transform: 'scale(1)' },
        },
        'slide-in': {
          '0%': { opacity: '0', transform: 'translateY(-12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pop': {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '60%': { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      animation: {
        'flash-green': 'flash-green 1.4s ease-out',
        'slide-in': 'slide-in 0.35s ease-out',
        'pop': 'pop 0.4s ease-out',
      },
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Minimal Ivory & Lavender Palette
        ivory: {
          50: '#FAF8F5',
          100: '#F5F0E8',
          200: '#EAE2D5',
          300: '#DDD3C1',
          800: '#332E27',
          900: '#231F19',
        },
        lavender: {
          50: '#FAF5FF',
          100: '#F3E8FF',
          200: '#E9D5FF',
          300: '#D8B4FE',
          400: '#C084FC',
          500: '#A855F7',
          600: '#8B5CF6',
          700: '#7C3AED',
          800: '#6D28D9',
          900: '#4C1D95',
        },
        ethos: {
          green: '#8B5CF6', // Lavender primary
          deep: '#5B21B6',  // Deep Lavender
          mist: '#F3E8FF',  // Soft Lavender tint
          ink: '#2E1C40',   // Dark Lavender text
          slate: '#4A355E', // Muted Lavender text
        },
      },
      keyframes: {
        'flash-green': {
          '0%': { backgroundColor: '#8B5CF6', transform: 'scale(1.02)' },
          '100%': { backgroundColor: 'var(--tw-bg-opacity, #FAF8F5)', transform: 'scale(1)' },
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

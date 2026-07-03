module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        mail: {
          bg: '#0a0a0a',
          surface: '#111111',
          panel: '#171717',
          elevated: '#1f1f1f',
          border: '#2a2a2a',
          muted: '#8a8a8a',
          text: '#f5f5f5',
        },
      },
    },
  },
  plugins: [],
};

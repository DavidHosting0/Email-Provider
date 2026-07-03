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
          bg: '#0a0e17',
          surface: '#0f1520',
          panel: '#151d2e',
          elevated: '#1c2638',
          border: '#2a3a52',
          muted: '#8899b4',
          text: '#e8edf4',
        },
      },
    },
  },
  plugins: [],
};

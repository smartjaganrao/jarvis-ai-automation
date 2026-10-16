/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './apps/desktop/src/renderer/**/*.{js,ts,jsx,tsx,html}',
    './src/renderer/**/*.{js,ts,jsx,tsx,html}'
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        jarvis: {
          dark: '#0B0F19',
          card: '#131A2A',
          border: '#1E293B',
          accent: '#3B82F6',
          cyan: '#06B6D4',
          emerald: '#10B981',
          purple: '#8B5CF6'
        }
      }
    }
  },
  plugins: []
};

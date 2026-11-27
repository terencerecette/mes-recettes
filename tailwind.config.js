/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '-apple-system', 'BlinkMacSystemFont', '"SF Pro Text"', 'sans-serif'],
        serif: ['"Fraunces"', 'Georgia', 'serif'],
      },
      colors: {
        cream: '#FAF8F5',
        sand: '#F3EFE8',
        line: '#EAE5DD',
        terracotta: '#C85A32',
        'terracotta-dark': '#AE4A26',
        sage: '#4A7C59',
        ink: '#26211D',
        muted: '#70675F',
      },
      boxShadow: {
        soft: '0 2px 10px -2px rgba(38, 33, 29, 0.05), 0 1px 3px 0 rgba(38, 33, 29, 0.04)',
        card: '0 4px 18px -4px rgba(38, 33, 29, 0.07), 0 1px 4px 0 rgba(38, 33, 29, 0.03)',
      },
    },
  },
  plugins: [],
};

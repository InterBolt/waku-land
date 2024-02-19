/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  plugins: [require('@tailwindcss/typography'), require('daisyui')],
  daisyui: {
    themes: ['dim'],
    prefix: 'daisy-',
  },
};

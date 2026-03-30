/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./*.html"],
  theme: {
    extend: {
        colors: {
            primary: '#007ACC',
            tabActive: '#3B74FF',
        },
        fontFamily: {
            sans: ['Inter', 'sans-serif'],
        }
    }
  },
  plugins: [],
}

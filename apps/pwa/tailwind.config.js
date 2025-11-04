/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "../../node_modules/streamdown/dist/**/*.js",
  ],
  theme: {
    extend: {
      colors: {
        'vs-dark': '#1e1e1e',
        'vs-blue': '#007acc',
        'vs-green': '#00aa00',
      }
    },
  },
  plugins: []
}

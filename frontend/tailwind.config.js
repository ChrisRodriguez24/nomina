/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        alo: {
          orange: '#fa8514', // Orange Nova
          blue: '#5169b7',   // TrustBlue
          noir: '#3e4a60',   // Noir
          fog: '#e3e8ff',    // Fog
        }
      },
      fontFamily: {
        montserrat: ['Montserrat', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
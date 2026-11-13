/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{html,js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#F0E9DD",
        secondary: "#3B2C25",
        // ธีมฝั่ง Super Admin — โทนเหลืองครีม (ทอง) ใช้กับปุ่ม/จุดโต้ตอบเท่านั้น ไม่ทาพื้นหลังทั้งหน้า
        admin: {
          50: "#fbf9f2",
          100: "#f5efdf",
          200: "#eadfbf",
          300: "#dcc79a",
          400: "#cfae6e",
          500: "#c2974a",
          600: "#ab7d33",
          700: "#8d6428",
          800: "#72521f",
          900: "#5d431d",
          950: "#3e2c12",
        },
      }
    },
  },
  plugins: [],
}


import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// แอปฝั่งผู้ดูแล — รันต่าง port จากเว็บร้านค้า (5173)
// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    // Google Sign-In (GSI) ใช้ popup + window.postMessage — ต้องเปิด COOP แบบ allow-popups
    // ไม่เช่นนั้น popup จะโดนบล็อก (Cross-Origin-Opener-Policy would block window.postMessage)
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    },
  },
})

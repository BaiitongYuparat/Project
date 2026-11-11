import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// แอปฝั่งผู้ดูแล — รันต่าง port จากเว็บร้านค้า (5173)
// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
  },
})

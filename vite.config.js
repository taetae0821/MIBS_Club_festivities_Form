import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // /api 요청을 백엔드(MIBS_Server)로 넘김
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
})

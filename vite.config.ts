import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/',  // 🚨 이것 추가!
  plugins: [react()],
})

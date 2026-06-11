import { defineConfig } from 'vite'
import react from '@vitejs/react-refresh' // ya taro jo pan plugin hoy

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: [
      'art-gallery-kbe1.onrender.com' // Aya taro render valo host nakhvo
    ]
  }
})
import { defineConfig } from 'vite'

export default defineConfig({
  base: '/ar-2/',
  server: {
    host: true,
    allowedHosts: true,
  },
})
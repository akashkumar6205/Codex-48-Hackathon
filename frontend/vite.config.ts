import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err, _req, res) => {
            // When Python backend is not running, return 503 cleanly without crashing proxy
            if (res && typeof res.writeHead === 'function' && !res.headersSent) {
              res.writeHead(503, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ offline: true, message: 'Backend offline, using Firestore' }))
            }
          })
        },
      },
      '/uploads': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err, _req, res) => {
            if (res && typeof res.writeHead === 'function' && !res.headersSent) {
              res.writeHead(404, { 'Content-Type': 'text/plain' })
              res.end('Upload asset not found on local disk')
            }
          })
        },
      },
    },
  },
})

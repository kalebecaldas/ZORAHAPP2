import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const viteApiUrl = env.VITE_API_URL?.trim()
  const portFromEnv = env.PORT?.trim() || '3001'
  const apiTarget =
    viteApiUrl && viteApiUrl.length > 0
      ? viteApiUrl.replace(/\/$/, '')
      : `http://127.0.0.1:${portFromEnv}`

  return {
    plugins: [
      react({
        // react-dev-locator no Babel deixa a 1ª compilação do Vite muito lenta (parece "travado").
        // Ative só quando precisar: VITE_REACT_DEV_LOCATOR=1 npm run client:dev
        ...(process.env.VITE_REACT_DEV_LOCATOR === '1'
          ? {
              babel: {
                plugins: ['react-dev-locator'] as string[],
              },
            }
          : {}),
      }),
      tsconfigPaths(),
    ],
    server: {
      port: 4002,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.log('proxy error', err)
            })
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              console.log('Sending Request to the Target:', req.method, req.url)
            })
            proxy.on('proxyRes', (proxyRes, req, _res) => {
              console.log('Received Response from the Target:', proxyRes.statusCode, req.url)
            })
          },
        },
        '/webhook': {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.log('webhook proxy error', err)
            })
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              console.log('Sending Webhook Request:', req.method, req.url)
            })
          },
        },
        '/socket.io': {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
          ws: true,
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.log('socket.io proxy error', err)
            })
          },
        },
      },
    },
  }
})

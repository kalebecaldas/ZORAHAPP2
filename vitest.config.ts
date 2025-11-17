import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'tests/**',
        'dist/**',
        '**/*.d.ts',
        '**/*.config.ts',
        '**/mockData.ts'
      ]
    }
  },
  resolve: {
    alias: {
      '@': join(__dirname, 'src'),
      '@api': join(__dirname, 'api')
    }
  }
})
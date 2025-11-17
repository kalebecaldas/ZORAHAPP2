import { beforeAll, afterAll } from 'vitest'
import { execSync } from 'child_process'

// Setup test environment
beforeAll(async () => {
  // Set test environment variables
  process.env.NODE_ENV = 'test'
  process.env.DATABASE_URL = 'file:./test.db'
  process.env.JWT_SECRET = 'test-secret-key'
  
  // Reset test database
  try {
    execSync('npx prisma migrate reset --force --skip-generate', { stdio: 'inherit' })
    execSync('npx prisma migrate deploy', { stdio: 'inherit' })
  } catch (error) {
    console.warn('Database reset failed, continuing with existing test database')
  }
})

// Cleanup after tests
afterAll(async () => {
  // Clean up test database
  try {
    execSync('rm -f test.db', { stdio: 'inherit' })
  } catch (error) {
    // Ignore cleanup errors
  }
})
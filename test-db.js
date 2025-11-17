import prisma from './api/prisma/client.js'

async function testConnection() {
  try {
    const users = await prisma.user.findMany()
    console.log('Database connection successful. Users:', users.length)
    
    const conversations = await prisma.conversation.findMany()
    console.log('Conversations:', conversations.length)
    
    process.exit(0)
  } catch (error) {
    console.error('Database connection failed:', error)
    process.exit(1)
  }
}

testConnection()
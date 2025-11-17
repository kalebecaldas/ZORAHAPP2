import * as prismaClient from '@prisma/client'

console.log('PrismaClient module:', prismaClient)
console.log('PrismaClient constructor:', prismaClient.PrismaClient)

if (prismaClient.PrismaClient) {
  const prisma = new prismaClient.PrismaClient()
  
  async function testPrisma() {
    try {
      console.log('Testing Prisma Client...')
      console.log('Prisma object keys:', Object.keys(prisma))
      console.log('Prisma user property:', prisma.user)
      
      if (prisma.user) {
        const users = await prisma.user.findMany()
        console.log('Users found:', users.length)
        console.log('Prisma Client is working!')
      } else {
        console.log('User property not found in prisma object')
      }
    } catch (error) {
      console.error('Prisma Client error:', error)
    } finally {
      await prisma.$disconnect()
    }
  }
  
  testPrisma()
} else {
  console.error('PrismaClient is not defined in the module')
}
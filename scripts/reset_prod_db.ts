import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const MASTER_EMAIL = process.env.MASTER_EMAIL || 'kalebe.caldas@hotmail.com'
const MASTER_NAME = process.env.MASTER_NAME || 'Kalebe Caldas'
const MASTER_PASSWORD = process.env.MASTER_PASSWORD || 'mxskqgltne'

async function ensureMasterUser(): Promise<void> {
  const existingMaster = await prisma.user.findUnique({ where: { email: MASTER_EMAIL } })
  if (!existingMaster) {
    const passwordHash = await bcrypt.hash(MASTER_PASSWORD, 10)
    await prisma.user.create({
      data: {
        email: MASTER_EMAIL,
        name: MASTER_NAME,
        password: passwordHash,
        role: 'MASTER',
        isMasterFrozen: true,
      },
    })
    return
  }

  await prisma.user.update({
    where: { id: existingMaster.id },
    data: {
      role: 'MASTER',
      isMasterFrozen: true,
    },
  })
}

async function resetDatabase(): Promise<void> {
  console.log('🧹 Clearing operational tables...')
  await prisma.message.deleteMany({})
  await prisma.conversation.deleteMany({})
  await prisma.patientInteraction.deleteMany({})
  await prisma.appointment.deleteMany({})
  await prisma.patient.deleteMany({})
  await prisma.aILearningData.deleteMany({})
  await prisma.auditLog.deleteMany({})
  await prisma.template.deleteMany({})
  await prisma.workflow.deleteMany({})

  console.log('👥 Pruning users (keeping master only)...')
  await ensureMasterUser()
  await prisma.user.deleteMany({
    where: {
      email: { not: MASTER_EMAIL },
    },
  })
}

async function main(): Promise<void> {
  try {
    await resetDatabase()
    console.log('✅ Database reset complete. Master user preserved.')
  } catch (error) {
    console.error('❌ Failed to reset database:', error)
    process.exitCode = 1
  } finally {
    await prisma.$disconnect()
  }
}

void main()


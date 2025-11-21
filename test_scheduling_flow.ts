import { processIncomingMessage } from './api/routes/conversations';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import dotenv from 'dotenv';

dotenv.config();

async function runSchedulingTest() {
    console.log('=== Testing Complete Scheduling Flow ===\n');

    const testPhone = '5592999999999';

    // Clean up previous test data
    try {
        const conv = await prisma.conversation.findFirst({ where: { phone: testPhone } });
        if (conv) {
            await prisma.message.deleteMany({ where: { conversationId: conv.id } });
            await prisma.conversation.delete({ where: { id: conv.id } });
        }
        const patient = await prisma.patient.findFirst({ where: { phone: testPhone } });
        if (patient) {
            await prisma.patient.delete({ where: { id: patient.id } });
        }
        console.log('✅ Cleaned up previous test data\n');
    } catch (e) {
        console.log('No previous data to clean\n');
    }

    const messages = [
        'Oi',
        '1', // Select Unidade Vieiralves
        'quero agendar',
        'Mario Silva',
        'bradesco',
        '15/08/1990',
        '1', // Select first procedure from list
        '25/12/2024',
        'manhã'
    ];

    for (const msg of messages) {
        console.log(`\n📤 USER: ${msg}`);
        console.log('─'.repeat(50));
        try {
            const response = await processIncomingMessage(testPhone, msg, 'whatsapp');
            console.log(`🤖 BOT: ${response}`);
        } catch (e: any) {
            console.error(`❌ Error: ${e.message}`);
            break;
        }
    }

    console.log('\n=== Test Complete ===');
    process.exit(0);
}

runSchedulingTest();

import { processIncomingMessage } from './api/routes/conversations.js';

// Simular recebimento de uma imagem
const testMediaMessage = async () => {
    const phone = '559285026981';
    const text = 'Teste de imagem recebida';
    const messageId = `test-${Date.now()}`;
    const messageType = 'IMAGE';
    const mediaUrl = '/api/conversations/files/test-image.jpg';
    const metadata = {
        mime_type: 'image/jpeg',
        originalName: 'test-image.jpg'
    };

    console.log('📤 Simulando recebimento de imagem...');
    await processIncomingMessage(phone, text, messageId, messageType, mediaUrl, metadata);
    console.log('✅ Mensagem de teste criada!');
};

testMediaMessage().catch(console.error);

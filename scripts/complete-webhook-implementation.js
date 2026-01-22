import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, '../api/routes/conversations.ts');

console.log('🔧 Completando implementação de webhooks consolidados...\n');

// Ler arquivo
let content = fs.readFileSync(filePath, 'utf8');

// Substituir log
const oldLog = 'console.log(`📤 Webhook \\"conversation_closed\\" disparado para ${conversation.phone}`)';
const newLog = `console.log(\`📤 Webhook consolidado disparado com \${events.length} eventos para \${conversation.phone}\`)
          
          // Limpar eventos após envio bem-sucedido
          await clearWebhookEvents(conversation.id)`;

if (content.includes(oldLog)) {
    content = content.replace(oldLog, newLog);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✅ Implementação completada com sucesso!');
    console.log('\n📋 Mudanças aplicadas:');
    console.log('   - Log atualizado para mostrar quantidade de eventos');
    console.log('   - Adicionada limpeza de eventos após envio');
    console.log('\n🧪 Próximo passo: Testar webhook!');
} else {
    console.log('⚠️  Log já foi atualizado ou não foi encontrado');
    console.log('   Verifique manualmente o arquivo: api/routes/conversations.ts');
}

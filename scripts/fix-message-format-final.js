import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔧 Corrigindo formatação final...\n');

const webhookPath = path.join(__dirname, '../api/routes/webhook-n8n.ts');
let content = fs.readFileSync(webhookPath, 'utf8');

// Linha 218: corrigir mensagem de transferência
const oldLine218 = "messageText: `🤖 Bot transferiu conversa:\\n\\nMotivo: ${entities?.transferReason || 'Paciente solicitou atendimento humano'}\\n\\nÚltima intenção: ${intent}\\nHistórico: Paciente estava em conversa com bot N8N`,";

const newLine218 = "messageText: `🤖 Bot transferiu conversa:\n\nMotivo: ${entities?.transferReason || req.body.queueName || 'Paciente solicitou atendimento'}\nÚltima intenção: ${intent}\nHistórico: Paciente estava em conversa com bot N8N`,";

if (content.includes(oldLine218)) {
    content = content.replace(oldLine218, newLine218);
    console.log('✅ Linha 218 corrigida');
} else {
    console.log('⚠️  Linha 218 não encontrada ou já corrigida');
}

// Procurar e corrigir outras mensagens com \\n\\n
const regex = /messageText: `([^`]*?)\\\\n\\\\n([^`]*?)`/g;
content = content.replace(regex, (match, before, after) => {
    return `messageText: \`${before}\n\n${after}\``;
});

fs.writeFileSync(webhookPath, content, 'utf8');

console.log('✅ Formatação corrigida!');
console.log('\n📋 Mudanças:');
console.log('   - Removido escapes \\\\n\\\\n');
console.log('   - Quebras de linha reais');
console.log('   - Mensagens mais legíveis');

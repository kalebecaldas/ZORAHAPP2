import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔧 Melhorando formatação das mensagens de sistema...\n');

const webhookPath = path.join(__dirname, '../api/routes/webhook-n8n.ts');
let content = fs.readFileSync(webhookPath, 'utf8');

// Remover ** das mensagens de sistema
content = content.replace(
    /messageText: `🤖 Bot transferiu conversa:\\\\n\\\\n\*\*Motivo:\*\* \$\{entities\?\.transferReason \|\| 'Paciente solicitou atendimento humano'\}\\\\n\\\\n\*\*Última intenção:\*\* \$\{intent\}\\\\n\*\*Histórico:\*\* Paciente estava em conversa com bot N8N`/g,
    'messageText: `🤖 Bot transferiu conversa:\n\nMotivo: ${entities?.transferReason || req.body.queueName || \'Paciente solicitou atendimento\'}\nÚltima intenção: ${intent}\nHistórico: Paciente estava em conversa com bot N8N`'
);

// Também corrigir outras mensagens de sistema se houver
content = content.replace(/\*\*Motivo:\*\*/g, 'Motivo:');
content = content.replace(/\*\*Última intenção:\*\*/g, 'Última intenção:');
content = content.replace(/\*\*Histórico:\*\*/g, 'Histórico:');
content = content.replace(/\*\*Procedimento:\*\*/g, 'Procedimento:');
content = content.replace(/\*\*Unidade:\*\*/g, 'Unidade:');
content = content.replace(/\*\*Data:\*\*/g, 'Data:');
content = content.replace(/\*\*Horário:\*\*/g, 'Horário:');
content = content.replace(/\*\*Convênio:\*\*/g, 'Convênio:');

fs.writeFileSync(webhookPath, content, 'utf8');

console.log('✅ Formatação melhorada!');
console.log('\n📋 Mudanças:');
console.log('   - Removido ** (negrito) das mensagens');
console.log('   - Mensagens mais limpas e legíveis');
console.log('\n🚀 Próximo passo: git commit e push');

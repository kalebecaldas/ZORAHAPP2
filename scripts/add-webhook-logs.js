import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔧 Adicionando logs de debug ao webhook...\n');

const webhooksPath = path.join(__dirname, '../api/routes/webhooks.ts');
let content = fs.readFileSync(webhooksPath, 'utf8');

// Adicionar log no início da função POST
const oldStart = "router.post('/', async (req: Request, res: Response) => {\n  try {\n    const { name, description, url, events, metadata } = req.body";

const newStart = `router.post('/', async (req: Request, res: Response) => {
  try {
    console.log('📥 Recebendo requisição para criar webhook:', {
      body: req.body,
      hasName: !!req.body.name,
      hasUrl: !!req.body.url,
      events: req.body.events
    })
    
    const { name, description, url, events, metadata } = req.body`;

if (content.includes(oldStart)) {
    content = content.replace(oldStart, newStart);
    console.log('✅ Log de entrada adicionado');
} else {
    console.log('⚠️  Padrão não encontrado ou já modificado');
}

// Adicionar log após validação de nome/url
content = content.replace(
    /if \(!name \|\| !url\) {\s+return res\.status\(400\)\.json\(/,
    `if (!name || !url) {
      console.log('❌ Validação falhou: nome ou URL faltando', { name, url })
      return res.status(400).json(`
);

// Adicionar log após validação de URL
content = content.replace(
    /new URL\(url\)\s+} catch {/,
    `new URL(url)
      console.log('✅ URL válida:', url)
    } catch (urlError) {
      console.log('❌ URL inválida:', url, urlError)`
);

// Adicionar log antes de criar webhook
content = content.replace(
    /const subscription = await WebhookService\.createSubscription\({/,
    `console.log('✅ Validações passaram, criando webhook...')
    const subscription = await WebhookService.createSubscription({`
);

// Adicionar log após criar webhook
content = content.replace(
    /res\.status\(201\)\.json\({ \n      success: true,/,
    `console.log('✅ Webhook criado com sucesso:', subscription.id)
    res.status(201).json({ 
      success: true,`
);

fs.writeFileSync(webhooksPath, content, 'utf8');

console.log('✅ Logs adicionados!');
console.log('\n📋 Logs adicionados:');
console.log('   - Log de entrada com payload');
console.log('   - Log de validação de nome/URL');
console.log('   - Log de validação de URL');
console.log('   - Log antes de criar');
console.log('   - Log após criar com sucesso');

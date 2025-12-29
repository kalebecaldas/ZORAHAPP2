import { Router, type Request, type Response } from 'express'
import { promises as fs } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = Router()

/**
 * Rota pública para documentação de Webhooks (sem autenticação)
 * GET /api/docs/webhooks
 */
router.get('/webhooks', async (req: Request, res: Response) => {
  try {
    const docsPath = path.join(__dirname, '../../WEBHOOKS_API.md')
    const content = await fs.readFile(docsPath, 'utf-8')
    
    // Retornar como HTML renderizado ou markdown raw
    const format = req.query.format as string
    
    if (format === 'raw') {
      res.setHeader('Content-Type', 'text/markdown; charset=utf-8')
      res.send(content)
    } else {
      // HTML com design moderno e profissional
      const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>📡 API de Webhooks - ZoraH</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/github-markdown-css@5/github-markdown.min.css">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css">
  <style>
    * {
      box-sizing: border-box;
    }
    
    body {
      margin: 0;
      padding: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      min-height: 100vh;
    }
    
    .header {
      background: rgba(255, 255, 255, 0.98);
      padding: 24px 32px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      position: sticky;
      top: 0;
      z-index: 100;
      backdrop-filter: blur(10px);
    }
    
    .header-content {
      max-width: 1200px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      gap: 16px;
    }
    
    .logo {
      font-size: 32px;
      animation: pulse 2s ease-in-out infinite;
    }
    
    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.1); }
    }
    
    .header h1 {
      margin: 0;
      font-size: 24px;
      color: #1a202c;
      font-weight: 700;
    }
    
    .header-subtitle {
      color: #64748b;
      font-size: 14px;
      margin-top: 4px;
    }
    
    .container {
      max-width: 1200px;
      margin: 40px auto;
      padding: 0 20px;
    }
    
    .markdown-body {
      background: white;
      padding: 48px 56px;
      border-radius: 16px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
      animation: fadeIn 0.5s ease-in;
    }
    
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    .markdown-body h1 {
      color: #667eea !important;
      border-bottom: 3px solid #667eea;
      padding-bottom: 12px;
      margin-top: 0;
    }
    
    .markdown-body h2 {
      color: #764ba2 !important;
      border-bottom: none;
      padding: 16px 24px;
      margin-top: 48px;
      background: linear-gradient(to right, #f8f9ff 0%, transparent 100%);
      border-left: 4px solid #667eea;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    }
    
    .markdown-body h3 {
      color: #4a5568 !important;
      margin-top: 32px;
    }
    
    .markdown-body h4,
    .markdown-body h5,
    .markdown-body h6 {
      color: #2d3748 !important;
    }
    
    .markdown-body p,
    .markdown-body li,
    .markdown-body td {
      color: #2d3748 !important;
    }
    
    .markdown-body strong {
      color: #1a202c !important;
    }
    
    /* Code inline - roxo suave */
    .markdown-body code {
      background: linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%);
      padding: 3px 8px;
      border-radius: 6px;
      color: #6b21a8;
      font-size: 0.9em;
      font-weight: 600;
      border: 1px solid #ddd6fe;
    }
    
    /* Code blocks - tema escuro moderno */
    .markdown-body pre {
      background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%) !important;
      border-radius: 12px;
      padding: 24px;
      overflow-x: auto;
      box-shadow: 0 8px 16px rgba(102, 126, 234, 0.2);
      border: 1px solid rgba(167, 139, 250, 0.2);
    }
    
    .markdown-body pre code {
      background: transparent;
      color: #e0e7ff;
      padding: 0;
      border: none;
      font-weight: normal;
    }
    
    /* Tabelas modernas e limpas */
    .markdown-body table {
      border-collapse: separate;
      border-spacing: 0;
      width: 100%;
      margin: 32px 0;
      box-shadow: 0 4px 20px rgba(102, 126, 234, 0.1);
      border-radius: 12px;
      overflow: hidden;
      background: white;
    }
    
    .markdown-body table thead {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    
    .markdown-body table th {
      padding: 16px 20px;
      font-weight: 700;
      text-align: left;
      border: none !important;
      font-size: 14px;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    
    .markdown-body table td {
      padding: 16px 20px;
      border: none;
      border-bottom: 1px solid #f1f5f9;
      font-size: 14px;
      vertical-align: middle;
    }
    
    /* Code na primeira coluna - estilizado como badge */
    .markdown-body table td:first-child code {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 6px 12px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 13px;
      border: none;
      display: inline-block;
      box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
    }
    
    .markdown-body table tr {
      transition: all 0.2s ease;
    }
    
    .markdown-body table tbody tr:hover {
      background: linear-gradient(to right, #f8fafc 0%, #f1f5f9 100%);
      transform: scale(1.01);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    }
    
    .markdown-body table tr:last-child td {
      border-bottom: none;
    }
    
    /* Blockquotes modernos com gradiente */
    .markdown-body blockquote {
      border-left: 4px solid #667eea;
      background: linear-gradient(to right, #f8f9ff 0%, #f3f4f6 100%);
      padding: 20px 24px;
      margin: 24px 0;
      border-radius: 12px;
      color: #4a5568 !important;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
      position: relative;
    }
    
    .markdown-body blockquote::before {
      content: '💡';
      position: absolute;
      left: -12px;
      top: 18px;
      background: white;
      border-radius: 50%;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    
    .markdown-body blockquote p {
      color: #4a5568 !important;
      margin: 0;
      font-style: italic;
    }
    
    .markdown-body blockquote strong {
      color: #667eea !important;
    }
    
    .markdown-body a {
      color: #667eea !important;
      text-decoration: none;
      font-weight: 500;
      transition: color 0.2s;
    }
    
    .markdown-body a:hover {
      color: #764ba2 !important;
      text-decoration: underline;
    }
    
    /* Garantir que todo texto seja legível */
    .markdown-body * {
      color: inherit;
    }
    
    .markdown-body {
      color: #2d3748;
    }
    
    .back-button {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: #667eea;
      color: white;
      padding: 10px 20px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      margin-bottom: 32px;
      transition: all 0.3s;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    }
    
    .back-button:hover {
      background: #764ba2;
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
    }
    
    .toc {
      background: #f7fafc;
      border: 2px solid #e2e8f0;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 32px;
    }
    
    .toc h2 {
      margin-top: 0;
      color: #667eea !important;
      border: none;
      padding-bottom: 8px;
      border-bottom: 2px solid #667eea;
    }
    
    .toc ul {
      margin: 16px 0 0 0;
      padding-left: 20px;
    }
    
    .toc li {
      margin: 8px 0;
      color: #2d3748 !important;
    }
    
    .toc a {
      color: #667eea !important;
      text-decoration: none;
      font-weight: 500;
    }
    
    .toc a:hover {
      color: #764ba2 !important;
      text-decoration: underline;
    }
    
    @media (max-width: 767px) {
      .header {
        padding: 16px 20px;
      }
      
      .header h1 {
        font-size: 18px;
      }
      
      .markdown-body {
        padding: 24px 20px;
      }
      
      .container {
        margin: 20px auto;
      }
    }
    
    /* Scroll suave */
    html {
      scroll-behavior: smooth;
    }
    
    /* Loading animation */
    .loading {
      display: inline-block;
      width: 20px;
      height: 20px;
      border: 3px solid rgba(255,255,255,.3);
      border-radius: 50%;
      border-top-color: #fff;
      animation: spin 1s ease-in-out infinite;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  </style>
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
</head>
<body>
  <div class="header">
    <div class="header-content">
      <span class="logo">📡</span>
      <div>
        <h1>API de Webhooks - ZoraH</h1>
        <div class="header-subtitle">Documentação completa do sistema de webhooks para integrações externas</div>
      </div>
    </div>
  </div>
  
  <div class="container">
    <a href="/ai-config" class="back-button">
      ← Voltar para Configurações
    </a>
    
    <div class="markdown-body" id="content">
      <div class="loading"></div> Carregando documentação...
    </div>
  </div>
  
  <script>
    const markdown = ${JSON.stringify(content)};
    
    // Configurar marked
    marked.setOptions({
      breaks: true,
      gfm: true,
      headerIds: true,
      mangle: false
    });
    
    // Renderizar markdown
    document.getElementById('content').innerHTML = marked.parse(markdown);
    
    // Aplicar syntax highlighting
    document.querySelectorAll('pre code').forEach((block) => {
      hljs.highlightElement(block);
    });
    
    // Adicionar ícones aos headers
    document.querySelectorAll('h2').forEach((h2) => {
      const text = h2.textContent;
      if (text.includes('Visão Geral')) h2.innerHTML = '🎯 ' + text;
      if (text.includes('Como Funciona')) h2.innerHTML = '⚙️ ' + text;
      if (text.includes('Eventos')) h2.innerHTML = '📨 ' + text;
      if (text.includes('Autenticação')) h2.innerHTML = '🔐 ' + text;
      if (text.includes('Criando')) h2.innerHTML = '🛠️ ' + text;
      if (text.includes('Recebendo')) h2.innerHTML = '📥 ' + text;
      if (text.includes('API Endpoints')) h2.innerHTML = '🔗 ' + text;
      if (text.includes('Monitoramento')) h2.innerHTML = '📊 ' + text;
      if (text.includes('Exemplos')) h2.innerHTML = '💻 ' + text;
      if (text.includes('Troubleshooting')) h2.innerHTML = '🐛 ' + text;
    });
    
    // Estilizar badges de status nas tabelas
    document.querySelectorAll('table td').forEach((td) => {
      const text = td.textContent.trim();
      
      // Status badges
      if (text === '✅ Ativo') {
        td.innerHTML = '<span style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 6px 14px; border-radius: 20px; font-weight: 600; font-size: 12px; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);"><span style="font-size: 14px;">✅</span> Ativo</span>';
      }
      if (text === '🔜 Em breve') {
        td.innerHTML = '<span style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 6px 14px; border-radius: 20px; font-weight: 600; font-size: 12px; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);"><span style="font-size: 14px;">🔜</span> Em breve</span>';
      }
    });
  </script>
</body>
</html>
      `
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      res.send(html)
    }
  } catch (error: any) {
    console.error('❌ Erro ao servir documentação:', error)
    res.status(500).json({
      success: false,
      error: 'Erro ao carregar documentação',
      message: error.message
    })
  }
})

/**
 * Listar documentações disponíveis
 * GET /api/docs
 */
router.get('/', async (req: Request, res: Response) => {
  res.json({
    success: true,
    docs: [
      {
        id: 'webhooks',
        title: '📡 API de Webhooks',
        description: 'Sistema de webhooks para notificar parceiros externos sobre eventos importantes',
        url: '/api/docs/webhooks',
        markdown: '/api/docs/webhooks?format=raw'
      }
    ]
  })
})

export default router

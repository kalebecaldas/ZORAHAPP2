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
      // HTML simples com markdown formatado
      const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>📡 API de Webhooks - Documentação</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/github-markdown-css@5/github-markdown.min.css">
  <style>
    body {
      margin: 0;
      padding: 20px;
      background: #f6f8fa;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }
    .markdown-body {
      max-width: 980px;
      margin: 0 auto;
      background: white;
      padding: 45px;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.12);
    }
    @media (max-width: 767px) {
      .markdown-body {
        padding: 15px;
      }
    }
  </style>
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
</head>
<body>
  <div class="markdown-body" id="content"></div>
  <script>
    const markdown = ${JSON.stringify(content)};
    document.getElementById('content').innerHTML = marked.parse(markdown);
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

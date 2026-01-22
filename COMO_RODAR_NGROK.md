# 🚀 Como Rodar o Ngrok

## 📋 Pré-requisitos

1. ✅ **Ngrok instalado** (já está instalado: `/opt/homebrew/bin/ngrok`)
2. ✅ **Servidor rodando na porta 3001** (execute `npm run up` primeiro)

## 🎯 Passo a Passo

### 1. Certifique-se que o servidor está rodando

```bash
# Verificar se está rodando
curl http://localhost:3001/api/health

# Se não estiver rodando, inicie:
npm run up
```

### 2. Iniciar o Ngrok

Abra um **novo terminal** (deixe o `npm run up` rodando) e execute:

```bash
ngrok http 3001
```

### 3. Copiar a URL do Ngrok

Você verá algo assim:

```
Forwarding    https://xxxx-xxxx-xxxx.ngrok-free.app -> http://localhost:3001
```

**📝 COPIE A URL HTTPS:** `https://xxxx-xxxx-xxxx.ngrok-free.app`

### 4. Verificar se está funcionando

Em outro terminal, teste:

```bash
curl https://SUA-URL-NGROK.ngrok-free.app/api/health
```

Deve retornar: `{"success":true,"status":"healthy",...}`

## 🔧 Para Usar com N8N

Se você está usando o ngrok para conectar o N8N ao backend local:

1. **Atualize os nodes HTTP Request no N8N:**
   - Substitua todas as URLs antigas pela nova URL do ngrok
   - Exemplo: `https://SUA-URL-NGROK.ngrok-free.app/api/clinic/data`

2. **Adicione o header (se necessário):**
   - Header: `ngrok-skip-browser-warning`
   - Valor: `true`

## ⚠️ Importante

- **URL muda a cada reinício:** No plano free, a URL do ngrok muda toda vez que você reinicia
- **Mantenha o ngrok rodando:** O ngrok precisa estar ativo enquanto você testa
- **Mantenha o servidor rodando:** O backend deve estar rodando na porta 3001

## 🛑 Parar o Ngrok

Pressione `Ctrl+C` no terminal onde o ngrok está rodando.

## 📊 Interface Web do Ngrok

Acesse para ver estatísticas e logs:

```
http://localhost:4040
```

## 🎯 Comandos Rápidos

```bash
# Verificar se ngrok está rodando
curl http://localhost:4040/api/tunnels

# Iniciar ngrok
ngrok http 3001

# Testar URL do ngrok
curl https://SUA-URL-NGROK.ngrok-free.app/api/health
```

## 📝 Checklist

- [ ] Servidor rodando (`npm run up`)
- [ ] Ngrok iniciado (`ngrok http 3001`)
- [ ] URL copiada
- [ ] Teste realizado (`curl https://.../api/health`)
- [ ] URLs atualizadas no N8N (se necessário)

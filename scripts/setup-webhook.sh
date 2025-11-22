#!/bin/bash

# Script para configurar webhook do WhatsApp com ngrok

echo "🔧 Configurando Webhook do WhatsApp..."
echo ""

# Verificar se ngrok está instalado
if ! command -v ngrok &> /dev/null; then
    echo "❌ ngrok não está instalado!"
    echo ""
    echo "📥 Instale o ngrok:"
    echo "   macOS: brew install ngrok"
    echo "   Ou baixe em: https://ngrok.com/download"
    echo ""
    exit 1
fi

# Verificar se o servidor está rodando
if ! lsof -ti tcp:3001 &> /dev/null; then
    echo "⚠️  Servidor não está rodando na porta 3001"
    echo "   Execute: npm run up"
    echo ""
    exit 1
fi

# Verificar variável de ambiente
if [ -z "$META_WEBHOOK_VERIFY_TOKEN" ]; then
    echo "⚠️  META_WEBHOOK_VERIFY_TOKEN não está definido"
    echo "   Adicione no seu .env:"
    echo "   META_WEBHOOK_VERIFY_TOKEN=seu-token-aqui"
    echo ""
fi

echo "✅ Iniciando ngrok na porta 3001..."
echo ""
echo "📋 Use esta URL no Meta:"
echo "   https://[sua-url-ngrok].ngrok.io/webhook"
echo ""
echo "🔑 Token de verificação:"
echo "   $META_WEBHOOK_VERIFY_TOKEN"
echo ""
echo "🚀 Iniciando ngrok..."
echo ""

ngrok http 3001


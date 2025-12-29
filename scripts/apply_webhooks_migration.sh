#!/bin/bash

echo "🔧 Aplicando migration de Webhooks..."
echo ""

# Verificar se está no diretório correto
if [ ! -f "prisma/schema.prisma" ]; then
    echo "❌ Erro: Execute este script da raiz do projeto"
    exit 1
fi

echo "1️⃣ Regenerando Prisma Client..."
npx prisma generate

echo ""
echo "2️⃣ Criando tabelas no banco de dados..."
npx prisma db push --accept-data-loss

echo ""
echo "✅ Migration aplicada com sucesso!"
echo ""
echo "Tabelas criadas:"
echo "  - WebhookSubscription"
echo "  - WebhookLog"
echo ""
echo "Reinicie o servidor: Ctrl+C e depois npm run up"

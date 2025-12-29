#!/bin/bash

# Script de migração e seed para Railway (executável via SSH)
# Uso: bash scripts/railway_migrate_and_seed.sh

set -e  # Parar em caso de erro

echo "🚀 Iniciando migração e seed para Railway..."
echo ""

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    echo "❌ Erro: Execute este script a partir da raiz do projeto"
    exit 1
fi

# Verificar se DATABASE_URL está definida
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Erro: DATABASE_URL não está definida"
    exit 1
fi

echo "1️⃣ Aplicando schema do Prisma..."
npx prisma db push --skip-generate || {
    echo "⚠️  Prisma db push falhou, tentando continuar..."
}

echo ""
echo "2️⃣ Executando migração e seed..."
npx tsx scripts/railway_migrate_and_seed.ts || {
    echo "❌ Erro ao executar migração e seed"
    exit 1
}

echo ""
echo "✅ Migração e seed concluídos com sucesso!"

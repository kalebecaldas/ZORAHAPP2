#!/bin/bash

# Script completo de deploy para Railway (executável via SSH)
# Uso: bash scripts/railway_deploy_complete.sh

set -e  # Parar em caso de erro

echo "🚀 Iniciando deploy completo para Railway..."
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
echo "2️⃣ Executando migração e seed das novas tabelas..."
npx tsx scripts/railway_migrate_and_seed.ts || {
    echo "❌ Erro ao executar migração e seed"
    exit 1
}

echo ""
echo "3️⃣ Executando seed completo..."
npx tsx scripts/seed_complete.ts || {
    echo "⚠️  Seed completo falhou, mas continuando..."
}

echo ""
echo "4️⃣ Importando workflows..."
npx tsx scripts/import_workflow_definitivo.ts || {
    echo "⚠️  Import de workflows falhou, mas continuando..."
}

echo ""
echo "✅ Deploy completo concluído com sucesso!"
echo ""
echo "📝 Próximos passos:"
echo "   - Verifique os logs acima para erros"
echo "   - Execute 'npx tsx scripts/verify_rules.ts' para verificar regras"
echo "   - Execute 'npm run verify:ai-config' para verificar configuração da IA"

#!/bin/bash

echo "🧹 LIMPEZA COMPLETA DO PRISMA"
echo "=============================="

cd /Users/kalebecaldas/Documents/cursor_projects/ZORAHAPP2-1

echo ""
echo "1. Matando processos Node..."
lsof -ti:3001 | xargs kill -9 2>/dev/null && echo "✅ Backend morto" || echo "⚠️ Nenhum processo na porta 3001"

echo ""
echo "2. Limpando node_modules do Prisma..."
rm -rf node_modules/.prisma
rm -rf node_modules/@prisma
echo "✅ Cache do Prisma removido"

echo ""
echo "3. Gerando Prisma Client do backend..."
cd api
npx prisma generate
cd ..
echo "✅ Prisma Client gerado"

echo ""
echo "4. Reinicie o backend manualmente:"
echo "   npm run server:dev"
echo ""
echo "✅ CONCLUÍDO! Agora reinicie o backend e teste novamente."

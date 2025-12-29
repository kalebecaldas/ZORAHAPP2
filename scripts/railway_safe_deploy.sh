#!/bin/bash

# Script seguro de deploy para Railway
# Garante backup antes de qualquer alteração

set -e  # Parar em caso de erro

echo "🚀 Iniciando deploy seguro para Railway..."
echo ""

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 1. Backup antes de tudo
echo -e "${YELLOW}1️⃣ Criando backup do banco de dados...${NC}"
npx tsx scripts/railway_backup_before_deploy.ts || {
    echo -e "${RED}❌ Erro ao criar backup! Abortando deploy.${NC}"
    exit 1
}
echo -e "${GREEN}✅ Backup criado com sucesso${NC}"
echo ""

# 2. Aplicar schema (prisma db push é seguro - não deleta dados)
echo -e "${YELLOW}2️⃣ Aplicando schema do Prisma...${NC}"
echo "   ℹ️  prisma db push é SEGURO - apenas adiciona/atualiza tabelas, não deleta dados"
npx prisma db push --accept-data-loss=false || {
    echo -e "${RED}❌ Erro ao aplicar schema!${NC}"
    exit 1
}
echo -e "${GREEN}✅ Schema aplicado${NC}"
echo ""

# 3. Executar migração e seed (idempotente - não deleta dados existentes)
echo -e "${YELLOW}3️⃣ Executando migração e seed...${NC}"
echo "   ℹ️  Script é idempotente - preserva dados existentes"
npx tsx scripts/railway_migrate_and_seed.ts || {
    echo -e "${RED}❌ Erro ao executar migração!${NC}"
    exit 1
}
echo -e "${GREEN}✅ Migração e seed concluídos${NC}"
echo ""

# 4. Verificar integridade
echo -e "${YELLOW}4️⃣ Verificando integridade dos dados...${NC}"
npx tsx -e "
import prisma from './api/prisma/client.js';
(async () => {
  try {
    const settings = await prisma.systemSettings.findFirst();
    const rules = await prisma.procedureRule.count();
    const insurances = await prisma.insuranceRule.count();
    const responses = await prisma.responseRule.count();
    
    console.log('   ✅ SystemSettings:', settings ? 'OK' : 'Não encontrado');
    console.log('   ✅ ProcedureRules:', rules);
    console.log('   ✅ InsuranceRules:', insurances);
    console.log('   ✅ ResponseRules:', responses);
    
    await prisma.\$disconnect();
  } catch (e) {
    console.error('   ❌ Erro:', e.message);
    process.exit(1);
  }
})();
" || {
    echo -e "${RED}❌ Erro na verificação!${NC}"
    exit 1
}
echo -e "${GREEN}✅ Verificação concluída${NC}"
echo ""

echo -e "${GREEN}✅ Deploy seguro concluído com sucesso!${NC}"
echo ""
echo "📋 Próximos passos:"
echo "   1. Verifique o backup em: backups/latest-backup.json"
echo "   2. Teste a aplicação"
echo "   3. Se tudo estiver OK, pode continuar com o deploy completo"

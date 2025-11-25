#!/bin/bash

# Script simplificado para clonar banco do Railway (usa usuário atual)

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}🚀 Clonando banco de dados do Railway...${NC}"
echo ""

# Verificar se DATABASE_URL do Railway está configurada
if [ -z "$RAILWAY_DATABASE_URL" ]; then
    echo -e "${RED}❌ Erro: Variável RAILWAY_DATABASE_URL não encontrada${NC}"
    echo ""
    echo "Para obter a DATABASE_URL do Railway:"
    echo "1. Acesse: https://railway.app/project/seu-projeto"
    echo "2. Vá em 'Variables' ou 'Settings'"
    echo "3. Copie o valor de DATABASE_URL"
    echo ""
    echo "Depois execute:"
    echo "  export RAILWAY_DATABASE_URL='postgresql://...'"
    echo "  ./scripts/clone_database_simple.sh"
    exit 1
fi

# Configurações locais
LOCAL_DB="zorahapp"
LOCAL_USER=$(whoami)

echo -e "${GREEN}📥 Fazendo dump do banco Railway...${NC}"
echo "Origem: Railway"
echo ""

# Nome do arquivo de dump
DUMP_FILE="railway_dump_$(date +%Y%m%d_%H%M%S).sql"

# Fazer dump do banco Railway
pg_dump "$RAILWAY_DATABASE_URL" > "$DUMP_FILE"

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Erro ao fazer dump do banco Railway${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Dump criado: $DUMP_FILE${NC}"
echo ""

# Verificar se banco local existe
if ! psql -lqt | cut -d \| -f 1 | grep -qw "$LOCAL_DB"; then
    echo -e "${YELLOW}⚠️  Banco local '$LOCAL_DB' não existe. Criando...${NC}"
    createdb "$LOCAL_DB"
    echo -e "${GREEN}✅ Banco criado${NC}"
fi

echo -e "${GREEN}📤 Importando dados para banco local...${NC}"
echo "Destino: $LOCAL_DB"
echo ""

# Importar dump no banco local
psql "$LOCAL_DB" < "$DUMP_FILE"

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Erro ao importar dados${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Banco clonado com sucesso!${NC}"
echo ""
echo "Dados importados para: postgresql://$LOCAL_USER@localhost:5432/$LOCAL_DB"
echo ""
echo "Próximos passos:"
echo "1. Verifique o .env está configurado:"
echo "   DATABASE_URL=\"postgresql://$LOCAL_USER@localhost:5432/$LOCAL_DB\""
echo ""
echo "2. Gere o Prisma Client (se necessário):"
echo "   npx prisma generate"
echo ""
echo "3. Inicie o servidor:"
echo "   npm run dev"
echo ""


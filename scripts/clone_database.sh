#!/bin/bash

# Script para clonar banco de dados do Railway para local

set -e

echo "🚀 Clonando banco de dados do Railway..."

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Verificar se DATABASE_URL do Railway está configurada
if [ -z "$RAILWAY_DATABASE_URL" ]; then
    echo -e "${RED}❌ Erro: Variável RAILWAY_DATABASE_URL não encontrada${NC}"
    echo ""
    echo "Para obter a DATABASE_URL do Railway:"
    echo "1. Acesse: https://railway.app/project/seu-projeto"
    echo "2. Vá em 'Variables'"
    echo "3. Copie o valor de DATABASE_URL"
    echo ""
    echo "Depois execute:"
    echo "  export RAILWAY_DATABASE_URL='postgresql://...'"
    echo "  ./scripts/clone_database.sh"
    exit 1
fi

# Verificar se DATABASE_URL local está configurada
if [ -z "$LOCAL_DATABASE_URL" ]; then
    echo -e "${YELLOW}⚠️  LOCAL_DATABASE_URL não configurada${NC}"
    echo "Usando padrão: postgresql://postgres:postgres@localhost:5432/zorahapp"
    LOCAL_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/zorahapp"
fi

# Nome do arquivo de dump
DUMP_FILE="railway_dump_$(date +%Y%m%d_%H%M%S).sql"

echo ""
echo -e "${GREEN}📥 Fazendo dump do banco Railway...${NC}"
echo "Origem: Railway"
echo "Arquivo: $DUMP_FILE"
echo ""

# Fazer dump do banco Railway
pg_dump "$RAILWAY_DATABASE_URL" > "$DUMP_FILE"

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Erro ao fazer dump do banco Railway${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Dump criado: $DUMP_FILE${NC}"
echo ""

# Verificar se PostgreSQL está rodando localmente
echo -e "${GREEN}🔍 Verificando PostgreSQL local...${NC}"
if ! pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
    echo -e "${RED}❌ PostgreSQL não está rodando localmente${NC}"
    echo ""
    echo "Para iniciar PostgreSQL:"
    echo "  # macOS (Homebrew):"
    echo "  brew services start postgresql@14"
    echo ""
    echo "  # Ou via Docker:"
    echo "  docker run -d --name postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:14"
    exit 1
fi

echo -e "${GREEN}✅ PostgreSQL está rodando${NC}"
echo ""

# Criar banco local se não existir
DB_NAME=$(echo "$LOCAL_DATABASE_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p')
echo -e "${GREEN}📦 Criando banco local '$DB_NAME' se não existir...${NC}"

# Extrair credenciais da URL
DB_USER=$(echo "$LOCAL_DATABASE_URL" | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo "$LOCAL_DATABASE_URL" | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_HOST=$(echo "$LOCAL_DATABASE_URL" | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo "$LOCAL_DATABASE_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')

# Criar banco se não existir
PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME;" 2>/dev/null || echo "Banco já existe ou erro ao criar"

echo ""
echo -e "${GREEN}📤 Importando dados para banco local...${NC}"
echo "Destino: $LOCAL_DATABASE_URL"
echo ""

# Importar dump no banco local
PGPASSWORD="$DB_PASS" psql "$LOCAL_DATABASE_URL" < "$DUMP_FILE"

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Erro ao importar dados${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Banco clonado com sucesso!${NC}"
echo ""
echo "Próximos passos:"
echo "1. Configure o .env local com:"
echo "   DATABASE_URL=\"$LOCAL_DATABASE_URL\""
echo ""
echo "2. Execute as migrações:"
echo "   npx prisma migrate deploy"
echo ""
echo "3. Gere o Prisma Client:"
echo "   npx prisma generate"
echo ""
echo "4. Inicie o servidor:"
echo "   npm run dev"
echo ""


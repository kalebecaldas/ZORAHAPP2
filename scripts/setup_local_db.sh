#!/bin/bash

# Script para configurar banco de dados PostgreSQL local

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}🚀 Configurando banco de dados local...${NC}"
echo ""

# Verificar se PostgreSQL está instalado
if ! command -v psql &> /dev/null; then
    echo -e "${RED}❌ PostgreSQL não está instalado${NC}"
    echo ""
    echo "Para instalar PostgreSQL:"
    echo ""
    echo "  # macOS (Homebrew):"
    echo "  brew install postgresql@14"
    echo "  brew services start postgresql@14"
    echo ""
    echo "  # Ou via Docker:"
    echo "  docker run -d --name postgres \\"
    echo "    -e POSTGRES_PASSWORD=postgres \\"
    echo "    -e POSTGRES_DB=zorahapp \\"
    echo "    -p 5432:5432 \\"
    echo "    postgres:14"
    echo ""
    exit 1
fi

# Verificar se PostgreSQL está rodando
if ! pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  PostgreSQL não está rodando${NC}"
    echo ""
    echo "Tentando iniciar..."
    
    # Tentar iniciar via Homebrew
    if command -v brew &> /dev/null; then
        brew services start postgresql@14 2>/dev/null || brew services start postgresql 2>/dev/null || true
        sleep 2
    fi
    
    # Verificar novamente
    if ! pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
        echo -e "${RED}❌ Não foi possível iniciar PostgreSQL${NC}"
        echo ""
        echo "Inicie manualmente:"
        echo "  brew services start postgresql@14"
        echo "  # ou"
        echo "  docker start postgres"
        exit 1
    fi
fi

echo -e "${GREEN}✅ PostgreSQL está rodando${NC}"
echo ""

# Configurações padrão
DB_NAME="zorahapp"
DB_USER="postgres"
DB_PASSWORD="postgres"
DB_HOST="localhost"
DB_PORT="5432"

# Criar banco de dados
echo -e "${GREEN}📦 Criando banco de dados '$DB_NAME'...${NC}"

PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres <<EOF
SELECT 'CREATE DATABASE $DB_NAME'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$DB_NAME')\gexec
EOF

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Banco de dados criado${NC}"
else
    echo -e "${YELLOW}⚠️  Banco pode já existir ou erro ao criar${NC}"
fi

echo ""

# Criar arquivo .env se não existir
ENV_FILE=".env"
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${GREEN}📝 Criando arquivo .env...${NC}"
    
    cat > "$ENV_FILE" <<EOF
# Database
DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME"

# Railway Database (para clonar)
# RAILWAY_DATABASE_URL="postgresql://..."

# Local Database
LOCAL_DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME"

# Server
PORT=4001
NODE_ENV=development

# OpenAI
OPENAI_API_KEY="your-openai-api-key-here"
OPENAI_MODEL="gpt-4o"
OPENAI_TIMEOUT=20000

# JWT
JWT_SECRET="your-jwt-secret-here-change-in-production"

# WhatsApp (opcional)
WHATSAPP_API_URL=""
WHATSAPP_API_TOKEN=""
EOF

    echo -e "${GREEN}✅ Arquivo .env criado${NC}"
    echo ""
    echo -e "${YELLOW}⚠️  IMPORTANTE: Edite o arquivo .env e configure:${NC}"
    echo "  - OPENAI_API_KEY"
    echo "  - JWT_SECRET"
    echo "  - RAILWAY_DATABASE_URL (se quiser clonar do Railway)"
    echo ""
else
    echo -e "${YELLOW}⚠️  Arquivo .env já existe${NC}"
fi

echo ""
echo -e "${GREEN}✅ Configuração concluída!${NC}"
echo ""
echo "Próximos passos:"
echo "1. Configure o .env com suas credenciais"
echo "2. Execute as migrações:"
echo "   npx prisma migrate deploy"
echo "3. Gere o Prisma Client:"
echo "   npx prisma generate"
echo "4. (Opcional) Clone dados do Railway:"
echo "   export RAILWAY_DATABASE_URL='postgresql://...'"
echo "   ./scripts/clone_database.sh"
echo "5. Inicie o servidor:"
echo "   npm run dev"
echo ""


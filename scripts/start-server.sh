#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SERVER_PORT=4001
CLIENT_PORT=4002
MAX_RETRIES=3
RETRY_DELAY=2

echo -e "${GREEN}🚀 Iniciando sistema de gerenciamento de clínica...${NC}"

# Function to check if port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Function to kill process on port
kill_port() {
    local port=$1
    local pids=$(lsof -ti tcp:$port 2>/dev/null)
    
    if [ ! -z "$pids" ]; then
        echo -e "${YELLOW}🔒 Porta $port em uso. Encerrando processos...${NC}"
        for pid in $pids; do
            if kill -9 $pid 2>/dev/null; then
                echo -e "${GREEN}✅ Processo $pid encerrado na porta $port${NC}"
            else
                echo -e "${RED}❌ Falha ao encerrar processo $pid na porta $port${NC}"
            fi
        done
        sleep 1
    fi
}

# Function to wait for port to be free
wait_for_port() {
    local port=$1
    local retries=0
    
    while check_port $port && [ $retries -lt $MAX_RETRIES ]; do
        echo -e "${YELLOW}⏳ Aguardando porta $port ficar livre...${NC}"
        sleep $RETRY_DELAY
        ((retries++))
    done
    
    if check_port $port; then
        echo -e "${RED}❌ Porta $port ainda em uso após $MAX_RETRIES tentativas${NC}"
        return 1
    fi
    
    return 0
}

# Main execution
echo -e "${GREEN}📋 Verificando portas...${NC}"

# Porta real da API (Express): PORT no .env ou 3001 (SERVER_PORT no script é legado/túnel local)
API_PORT=3001
if [ -f .env ]; then
  _api_line=$(grep -E '^[[:space:]]*PORT[[:space:]]*=' .env 2>/dev/null | head -1)
  if [ -n "$_api_line" ]; then
    API_PORT=$(echo "$_api_line" | cut -d= -f2- | tr -d ' \r' | tr -d '"' | tr -d "'")
    API_PORT=${API_PORT:-3001}
  fi
fi

# Check and kill ports if in use (3001 = API padrão; 4002 = Vite)
for port in $CLIENT_PORT 3001 $SERVER_PORT; do
    if check_port $port; then
        kill_port $port
        if ! wait_for_port $port; then
            echo -e "${RED}❌ Não foi possível liberar a porta $port${NC}"
            exit 1
        fi
    fi
done

echo -e "${GREEN}✅ Portas verificadas e liberadas!${NC}"

# Verify Prisma is ready
echo -e "${GREEN}🔍 Verificando banco de dados...${NC}"
if [ ! -f "prisma/schema.prisma" ]; then
    echo -e "${RED}❌ Arquivo prisma/schema.prisma não encontrado${NC}"
    exit 1
fi

# Generate Prisma client if needed
if [ ! -d "node_modules/.prisma" ] || [ ! -f "node_modules/.prisma/client/index.js" ]; then
    echo -e "${YELLOW}📦 Gerando cliente Prisma...${NC}"
    npx prisma generate
fi

# Check if database exists and run migrations if needed
if [ ! -f "prisma/dev.db" ]; then
    echo -e "${YELLOW}💾 Banco de dados não encontrado. Criando...${NC}"
    npx prisma migrate deploy
fi

echo -e "${GREEN}✅ Banco de dados verificado!${NC}"

# Sync active workflow with local file (if available)
if [ -f "workflow_completo_definitivo.json" ]; then
    echo -e "${GREEN}🔄 Sincronizando workflow ativo com arquivo local...${NC}"
    npx tsx scripts/import_workflow_definitivo.ts || echo -e "${YELLOW}⚠️ Falha ao importar workflow. Verifique DATABASE_URL e Prisma.${NC}"
fi

# Start the system
echo -e "${GREEN}🎯 Iniciando API e frontend...${NC}"
echo -e "${GREEN}📡 API (backend): http://localhost:${API_PORT}${NC}"
echo -e "${GREEN}🌐 App (Vite):    http://localhost:$CLIENT_PORT${NC}"
echo -e "${YELLOW}⏱️  O frontend só abre o Vite depois que a API responder em /api/health (evita ECONNREFUSED no proxy).${NC}"
echo -e "${YELLOW}   Se editar Conversas, a 1ª requisição HTTP ainda pode carregar o módulo grande.${NC}"
echo -e "${RED}⚠️  Evite salvar vários ficheiros de seguida: o nodemon pode reiniciar o tsx a meio e gerar ECANCELED.${NC}"
echo ""

export PORT="${API_PORT}"

# Use npm run dev to start both client and server
npm run dev

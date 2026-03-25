#!/bin/sh
# Aguarda GET /api/health antes de iniciar o Vite (evita rajada de ECONNREFUSED no proxy).
# PORT: variável de ambiente ou primeira entrada PORT= no .env; padrão 3001.

PORT_VAL="${PORT:-3001}"
if [ -z "${PORT:-}" ] && [ -f .env ]; then
  _line=$(grep -E '^[[:space:]]*PORT[[:space:]]*=' .env 2>/dev/null | head -1)
  if [ -n "$_line" ]; then
    PORT_VAL=$(echo "$_line" | cut -d= -f2- | tr -d ' \r' | tr -d '"' | tr -d "'")
    PORT_VAL="${PORT_VAL:-3001}"
  fi
fi

URL="http://127.0.0.1:${PORT_VAL}/api/health"
echo "⏳ Aguardando API em ${URL} (até 120s)..."
i=0
while [ "$i" -lt 120 ]; do
  if curl -sf "$URL" >/dev/null 2>&1; then
    echo "✅ API respondeu; iniciando Vite."
    exit 0
  fi
  sleep 1
  i=$((i + 1))
done
echo "❌ API não respondeu em 120s (verifique o log do nodemon)." >&2
exit 1

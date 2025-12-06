# Problemas Identificados e Soluções

## 🔴 Problemas Reportados

### 1. Usuário MASTER não aparece na lista
**Status**: ✅ Falso Positivo
- API retorna todos os usuários incluindo MASTER
- Frontend exibe corretamente
- Possível cache do navegador

### 2. Workflow Editor ainda ativo
**Status**: ⚠️ Confirmado
- Rota `/workflows/editor/:id` ainda existe
- Link no menu ainda aparece
- **Solução**: Remover da interface (manter código por enquanto)

### 3. Configurações não carregam dados
**Status**: ❌ CRÍTICO
- `/api/settings/clinic-data` retorna dados do banco
- Mas frontend pode estar com erro ao processar
- **Causa**: Formato de dados incompatível

---

## 🎯 Plano de Ação

### PRIORIDADE ALTA

#### 1. Verificar `/api/settings/clinic-data`
Testar se endpoint retorna dados:
```bash
curl http://localhost:3001/api/settings/clinic-data
```

#### 2. Simplificar Página de Configurações
**Opção A**: Refatorar para usar dados do banco
**Opção B**: Criar nova página do zero

**Recomendação**: Opção B - Criar nova página simples

---

## 📝 Nova Página de Configurações (Simplificada)

### Estrutura Proposta

**Abas**:
1. ✅ **Clínicas** - Listar/Editar clínicas do banco
2. ✅ **Convênios** - Listar/Editar convênios do banco
3. ✅ **Procedimentos** - Listar/Editar procedimentos do banco
4. ✅ **Sistema** - Nome, logo (manter atual)
5. ❌ **Chat + Bot** - REMOVER (usar `/ai-config`)
6. ✅ **Templates** - Manter

### Dados

**Fonte**: PostgreSQL (não mais JSON)
**Endpoints**:
- `GET /api/clinic` - Clínicas
- `GET /api/clinic/all/insurances` - Convênios
- `GET /api/clinic/all/procedures` - Procedimentos

---

## 🚀 Implementação

### Fase 1: Remover Workflow Editor da UI
- Remover link do Sidebar
- Manter código (pode ser útil depois)

### Fase 2: Criar Nova Página de Configurações
- Página simples com dados do banco
- Sem compatibilidade com JSON antigo
- Foco em funcionalidade, não perfeição

### Fase 3: Testar
- Verificar se dados carregam
- Verificar se edições funcionam

---

## ✅ Decisão

**Vou criar uma nova página de configurações simplificada que:**
1. Busca dados diretamente do PostgreSQL
2. Não tenta manter compatibilidade com JSON
3. Foca em listar e editar dados básicos
4. Remove redundâncias

**Estimativa**: 30-45 minutos

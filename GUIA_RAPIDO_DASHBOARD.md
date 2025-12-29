# 🚀 GUIA RÁPIDO - Dashboard de Otimizações

## Acesso Rápido

### 1. Iniciar o sistema
```bash
npm run dev
```

### 2. Acessar o dashboard
```
http://localhost:5173/bot-optimization
```

Ou clique em **"Otimizações do Bot"** no menu lateral esquerdo.

---

## 📊 O que você verá

### Seção 1: Cards Principais (topo)

```
┌─────────────┬─────────────┬─────────────┬─────────────┐
│ Economia    │ Custo       │ Conversas   │ Chamadas    │
│ Total       │ Mensal      │ Hoje        │ GPT         │
│ $0.0234     │ $12.45      │ 156         │ 342         │
└─────────────┴─────────────┴─────────────┴─────────────┘
```

### Seção 2: Gráficos

- **Esquerda:** Pizza mostrando distribuição de economia
- **Direita:** Barras mostrando modelos GPT mais usados

### Seção 3: Cards de Serviços

6 cards, cada um com:
- Nome e descrição
- Botão ON/OFF
- Estatísticas específicas
- Economia gerada

### Seção 4: Barra de Progresso

Mostra quanto falta para atingir a meta de $15/mês

---

## 🎯 Interpretando as Métricas

### Economia Total
- **O que é:** Quanto você economizou hoje vs usar só GPT
- **Bom:** Quanto maior, melhor!
- **Meta:** Manter crescendo

### Custo Mensal Projetado
- **O que é:** Se continuar assim, quanto vai gastar no mês
- **Bom:** Abaixo de $15
- **Alerta:** Acima de $15 (em laranja)

### Taxa de Acerto (Hit Rate)
- **O que é:** % de vezes que a otimização funcionou
- **Bom:** Acima de 70%
- **Ótimo:** Acima de 85%

---

## 🔧 Ações Disponíveis

### Botão "Atualizar"
- Atualiza estatísticas manualmente
- Auto-refresh a cada 30s

### Botão "Resetar Stats"
- Zera todas as contagens
- **CUIDADO:** Não tem como desfazer!

### Toggle de Serviços
- Clique em "Ativo"/"Inativo" em cada card
- Desabilita temporariamente uma otimização
- Útil para testar impacto

---

## 📈 Entendendo os Serviços

### 🧠 Local NLP
**O que faz:** Classifica intenção sem usar GPT
**Quando funciona:** Perguntas simples como "preço", "localização"
**Economia:** $0.0001 por classificação evitada

### 💾 Cache de Respostas
**O que faz:** Guarda respostas comuns
**Quando funciona:** Mesma pergunta aparece de novo
**Economia:** $0.0004 por resposta em cache

### ⚡ Respostas Rápidas
**O que faz:** Respostas hardcoded para coisas básicas
**Quando funciona:** "Oi", "Obrigado", "Onde fica"
**Economia:** $0.0005 por fallback

### 📝 Templates
**O que faz:** Fluxos estruturados (agendamento, cadastro)
**Quando funciona:** Processo passo-a-passo
**Economia:** $0.003 por conversa em template

### 🚦 Rate Limiter
**O que faz:** Impede spam de usuários
**Quando funciona:** Mais de X msgs em Y segundos
**Economia:** $0.0004 por bloqueio

### 📊 Monitoramento
**O que faz:** Rastreia tudo que acontece
**Sempre ativo:** Não pode desligar
**Economia:** Mostra onde gastar menos

---

## 🎨 Cores e Estados

### Verde ✅
- Tudo OK
- Dentro da meta
- Alta taxa de acerto

### Laranja ⚠️
- Atenção
- Acima da meta
- Taxa de acerto baixa

### Vermelho ❌
- Problema
- Muito acima da meta
- Serviço com erro

### Azul/Roxo ℹ️
- Informação
- Métricas normais

---

## 🔍 Troubleshooting

### "Não vejo estatísticas"
- ✅ Verifique se o backend está rodando
- ✅ Verifique console do navegador (F12)
- ✅ Clique em "Atualizar"

### "Economia está zerada"
- ✅ Normal no início do dia
- ✅ Aguarde algumas conversas
- ✅ Use o bot para gerar dados

### "Serviço não liga/desliga"
- ✅ Verifique permissões de admin
- ✅ Veja console do navegador
- ✅ Tente atualizar a página

### "Gráficos não aparecem"
- ✅ Aguarde carregar (3-5 segundos)
- ✅ Precisa ter dados (use o bot)
- ✅ Verifique se bibliotecas estão instaladas

---

## 💡 Dicas de Uso

### Para Economizar Mais
1. ✅ Mantenha todos os serviços ATIVOS
2. ✅ Monitore qual economiza mais
3. ✅ Foque em otimizar o que tem baixa taxa
4. ✅ Adicione mais fallbacks para perguntas comuns

### Para Monitorar Melhor
1. ✅ Acesse o dashboard diariamente
2. ✅ Compare projeção vs meta
3. ✅ Se acima da meta, investigue
4. ✅ Veja qual modelo GPT está gastando mais

### Para Testar
1. ✅ Desligue um serviço
2. ✅ Use o bot normalmente
3. ✅ Compare economia
4. ✅ Religue o serviço

---

## 📱 Mobile

O dashboard é **responsivo**:
- Tablets: 2 colunas
- Celulares: 1 coluna
- Desktop: 3-4 colunas

---

## 🚀 Próximos Passos

### Configurações Avançadas (futuro)
- Editar fallbacks
- Configurar thresholds
- Exportar relatórios
- Histórico mensal

### Por Enquanto
- ✅ Use o dashboard para **monitorar**
- ✅ Ajuste serviços via **toggle**
- ✅ Acompanhe **progresso da meta**

---

## ❓ FAQ

**P: Posso desligar todos os serviços?**
R: Sim, mas vai gastar mais! Recomendado: deixar tudo ON.

**P: O que acontece se desligar?**
R: O bot continua funcionando, mas usa mais GPT (mais caro).

**P: Estatísticas somem se eu resetar?**
R: Sim! Só resete se tiver certeza.

**P: Posso editar os valores?**
R: Não pelo dashboard (ainda). Por enquanto, só visualização.

**P: Como adicionar mais fallbacks?**
R: Edite `api/services/simpleFallbacks.ts` (por enquanto manual).

**P: Posso exportar relatórios?**
R: API existe (`/detailed-report`), mas UI não implementada ainda.

---

**Dúvidas?** Veja a documentação completa em:
- `DASHBOARD_OTIMIZACOES_IMPLEMENTADO.md`
- `IMPLEMENTACAO_AVANCADA_COMPLETA.md`

---

**Criado em:** 22/12/2024
**Versão:** 1.0

# Guia Rápido - Dashboards Personalizados

## Como Funciona

Quando você faz login, o sistema detecta automaticamente seu tipo de usuário e mostra o dashboard apropriado.

---

## Dashboard Gerencial

**Para:** MASTER, ADMIN, SUPERVISOR

### O que você vê:

#### 1. KPIs da Equipe (4 cards no topo)
- Conversas ativas no momento
- Quantos atendentes estão trabalhando
- Tempo médio de resposta da equipe
- Taxa de conversão geral

#### 2. Alertas de Atenção (se necessário)
Card laranja mostrando atendentes que precisam de ajuda:
- Tempo de resposta muito alto (> 10 min)
- Taxa de conversão muito baixa (< 30%)

#### 3. Ranking de Atendentes
Lista dos 5 melhores com:
- 🥇 Medalha de ouro para 1º lugar
- 🥈 Medalha de prata para 2º lugar
- 🥉 Medalha de bronze para 3º lugar
- Taxa de conversão em destaque
- Total de conversas atendidas

#### 4. Gráficos Comparativos
- **Gráfico 1:** Taxa de conversão de cada atendente
- **Gráfico 2:** Tempo de resposta de cada atendente

#### 5. Métricas Resumidas
- Total de conversas da equipe
- Performance do bot automático
- Identificação do top performer

#### 6. Ações Rápidas
Botões para:
- Ver Conversas (gerenciar filas)
- Gerenciar Equipe (usuários)
- Relatórios (análise detalhada)

---

## Dashboard Pessoal

**Para:** ATENDENTE

### O que você vê:

#### 1. Banner Motivacional (topo)
Card grande com:
- Seu nível de performance (Excelente/Ótimo/Bom/Pode Melhorar)
- Mensagem motivacional personalizada
- Sua posição no ranking (ex: #2 de 8)
- Ícone animado (🌟⭐👍📊)

Cores:
- Degradê azul → roxo
- Muda baseado no seu desempenho

#### 2. Suas Conquistas (badges)
Se você conquistou badges, aparece uma seção especial mostrando:
- Ícone grande de cada badge
- Nome da conquista
- Descrição (o que você fez para ganhar)

**Badges disponíveis:**
- ⚡ Resposta Rápida (tempo < 3 min)
- 🎯 Fechador (fecha > 80% das conversas)
- 🏆 Top Performer (1º lugar)
- 📈 Consistente (conversão > 70%)
- 💪 Produtivo (> 15 conversas)
- 🎁 Conversor (> 10 agendamentos)

#### 3. Meta Diária
Card com barra de progresso:
- Ex: "12 / 15 conversas encerradas"
- Barra azul enquanto não atingir
- Barra verde quando atingir ✅
- Mostra quanto falta

#### 4. Seus KPIs (4 cards)
- **Minhas Conversas**: Total + quantas ativas agora
- **Taxa de Conversão**: % que viraram agendamento
- **Tempo de Resposta**: Sua média
- **Taxa de Fechamento**: % que você encerra

#### 5. Comparação com a Equipe (3 cards)
Cada card mostra:
- **Sua métrica** (grande, em destaque)
- **Média da equipe** (abaixo)
- **Diferença** (+X ou -X)
- **Indicador visual** (↑ ↓ ─)
- **Cores:** Verde se você está melhor, laranja se pior

Métricas comparadas:
1. Tempo de Resposta (menor = melhor)
2. Taxa de Conversão (maior = melhor)
3. Taxa de Fechamento (maior = melhor)

#### 6. Dicas de Melhoria
Cards coloridos que aparecem SE você pode melhorar:

- **Azul** → "Responda Mais Rápido" (se tempo > 5 min)
- **Verde** → "Foque em Agendamentos" (se conversão < 50%)
- **Roxo** → "Encerre Conversas" (se fechamento < 70%)
- **Amarelo** → "Desbloqueie Badges" (se tem < 3 badges)

#### 7. Ações Rápidas
- Minhas Conversas (quantas ativas agora)
- Meu Histórico (relatórios completos)

---

## Exemplos Práticos

### Exemplo 1: Atendente João

**Métricas:**
- 18 conversas no período
- 15 encerradas (83%)
- 12 com agendamento (67%)
- Tempo médio: 4 minutos
- Posição: #2 de 8

**Dashboard mostra:**
- Banner: "⭐ Ótimo" + "Continue assim! Você está fazendo um ótimo trabalho"
- Badges: ⚡ Resposta Rápida, 🎯 Fechador, 💪 Produtivo
- Meta: 15/15 conversas ✅ (barra verde completa)
- Comparação: Tempo 2min melhor que equipe (↑ verde)
- Dica: "Desbloqueie Badges" (ainda faltam 3)

### Exemplo 2: Atendente Maria

**Métricas:**
- 8 conversas no período
- 5 encerradas (62%)
- 2 com agendamento (25%)
- Tempo médio: 8 minutos
- Posição: #7 de 8

**Dashboard mostra:**
- Banner: "📊 Pode Melhorar" + "Continue se esforçando! Cada conversa é uma oportunidade"
- Badges: Nenhuma ainda
- Meta: 5/15 conversas (barra azul 33%)
- Comparação: Tempo 2min pior que equipe (↓ laranja)
- Dicas: 
  - "Responda Mais Rápido" (tempo alto)
  - "Foque em Agendamentos" (conversão baixa)
  - "Encerre Conversas" (fechamento baixo)

### Exemplo 3: Gestor Ana (ADMIN)

**Equipe:**
- 8 atendentes ativos
- 2 precisam de atenção
- Tempo médio: 6 minutos
- Conversão: 58%

**Dashboard mostra:**
- KPIs: 24 conversas ativas, 8 atendentes, 6min médio, 58% conversão
- Alerta: "Maria e Pedro precisam de atenção"
- Ranking: João em 1º (🥇), Carlos em 2º (🥈), Ana em 3º (🥉)
- Gráfico: Barras mostrando conversão de cada um
- Ação rápida: "Gerenciar Equipe" destacado

---

## Perguntas Frequentes

### Como as metas são definidas?
Atualmente fixas (15 conversas/dia). Futuramente podem ser configuráveis por usuário.

### O ranking é atualizado em tempo real?
Sim! Usa Socket.IO para atualizar quando há novas conversas ou mudanças.

### Posso ver o dashboard de outro atendente?
Não. Atendentes só veem seus próprios dados. Gestores veem agregado de todos.

### Como funciona o cálculo de performance?
Score ponderado: 40% conversão + 30% tempo + 30% fechamento.

### Badges podem ser perdidas?
Não. Uma vez conquistada, a badge permanece (baseada no período selecionado).

### O que acontece se não houver dados?
Mostra mensagem "Sem dados disponíveis" ao invés de quebrar.

### Gestores podem mudar para dashboard pessoal?
Não. O dashboard é automático baseado no role. Se quiser ver pessoal, acesse /stats.

---

## Shortcuts

- **Atualizar dados:** Botão "Atualizar" (ou aguarde 30s para auto-refresh)
- **Mudar período:** Dropdown "Últimos 7 dias" / "Últimos 30 dias"
- **Ver detalhes:** Clique em "Ver todos" ou "Relatórios"
- **Acessar conversas:** Clique no card "Minhas Conversas" ou "Ver Conversas"

---

**Implementado em:** 25/01/2026  
**Pronto para uso!** 🚀

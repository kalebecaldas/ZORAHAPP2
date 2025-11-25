# 🎯 Como Usar o Workflow Completo

## 🚀 Início Rápido

### 1. Visualizar o Workflow no Editor

Acesse o WorkflowEditor:
```
http://localhost:4002/workflows/editor/cmid7ltiz0000xgvt817jchrx
```

Você verá:
- 🟢 **58 cards (nodes)** organizados visualmente
- 🔗 **77 conexões** entre os nodes
- 📝 Todas as mensagens configuradas

### 2. Testar o Bot

Acesse o TestChat:
```
http://localhost:4002/test-chat
```

---

## 📖 Fluxo de Uso

### Cenário 1: Paciente Pergunta sobre Valores

```
👤 Usuário: "Olá!"
🤖 Bot: [Mensagem de boas-vindas com lista de unidades]

👤 Usuário: "1"
🤖 Bot: [Informações da Unidade Vieiralves]

👤 Usuário: "qual valor da acupuntura?"
🤖 Bot: [Valores completos da acupuntura com placeholders]

👤 Usuário: "e da fisioterapia ortopédica?"
🤖 Bot: [Valores da fisioterapia ortopédica]

👤 Usuário: "obrigado"
🤖 Bot: [Loop continua - aguarda próxima pergunta]
```

### Cenário 2: Paciente Pergunta sobre Convênios

```
👤 Usuário: "1"
🤖 Bot: [Unidade Vieiralves]

👤 Usuário: "vocês atendem bradesco?"
🤖 Bot: [Lista geral de convênios]

👤 Usuário: "bradesco"
🤖 Bot: [Procedimentos cobertos pelo Bradesco]

👤 Usuário: "obrigado"
🤖 Bot: [Loop continua]
```

### Cenário 3: Paciente Quer Localização

```
👤 Usuário: "2"
🤖 Bot: [Unidade São José]

👤 Usuário: "onde vocês ficam?"
🤖 Bot: [Endereço completo, maps, horários, telefone]

👤 Usuário: "obrigado"
🤖 Bot: [Loop continua]
```

### Cenário 4: Paciente Quer Explicação Completa

```
👤 Usuário: "1"
🤖 Bot: [Unidade Vieiralves]

👤 Usuário: "o que é acupuntura?"
🤖 Bot: [Explicação completa: o que é, benefícios, indicações, valores]

👤 Usuário: "entendi, obrigado"
🤖 Bot: [Loop continua]
```

### Cenário 5: Agendamento Completo (Paciente Novo)

```
👤 Usuário: "1"
🤖 Bot: [Unidade Vieiralves]

👤 Usuário: "quero agendar"
🤖 Bot: [Verificando cadastro...] "Vou precisar de alguns dados"

🤖 Bot: "Nome completo:"
👤 Usuário: "João Silva"

🤖 Bot: "CPF:"
👤 Usuário: "12345678900"

🤖 Bot: "Data de nascimento:"
👤 Usuário: "15/05/1990"

🤖 Bot: "E-mail:"
👤 Usuário: "joao@email.com"

🤖 Bot: "Convênio:"
👤 Usuário: "Bradesco"

🤖 Bot: [Resumo dos dados] "Está correto?"
👤 Usuário: "sim"

🤖 Bot: "Cadastro realizado! Escolha os procedimentos:"
👤 Usuário: "Fisioterapia Ortopédica"

🤖 Bot: "Adicionar segundo procedimento?"
👤 Usuário: "sim"

🤖 Bot: "Segundo procedimento:"
👤 Usuário: "Acupuntura"

🤖 Bot: "Adicionar terceiro?"
👤 Usuário: "não"

🤖 Bot: [Lista de datas disponíveis]
👤 Usuário: "15/12"

🤖 Bot: "Escolha o turno: manhã, tarde ou noite"
👤 Usuário: "manhã"

🤖 Bot: [RESUMO COMPLETO DO AGENDAMENTO]
      - Unidade
      - Paciente
      - Procedimentos
      - Data e turno
      "Confirmar?"

👤 Usuário: "sim"

🤖 Bot: ✅ "Pré-agendamento realizado! Status: AGUARDANDO CONFIRMAÇÃO
      Nossa equipe entrará em contato em até 2 horas!"
```

### Cenário 6: Agendamento (Paciente Existente)

```
👤 Usuário: "1"
🤖 Bot: [Unidade Vieiralves]

👤 Usuário: "quero agendar"
🤖 Bot: "✅ Encontrei seu cadastro! João Silva - Bradesco"
      "Vamos prosseguir com o agendamento!"

🤖 Bot: "Escolha os procedimentos:"
[... continua o fluxo normal de escolha de procedimentos, data, turno]
```

### Cenário 7: Transferência para Humano

```
👤 Usuário: "1"
🤖 Bot: [Unidade Vieiralves]

👤 Usuário: "quero falar com atendente"
🤖 Bot: "🤝 Transferindo para atendente humano...
      Aguarde 2-5 minutos"
```

---

## 🎨 Placeholders Dinâmicos

O sistema substitui automaticamente os placeholders com dados reais:

### Dados da Unidade
- `${unidade_nome}` → "Unidade Vieiralves" ou "Unidade São José"
- `${endereco}` → Endereço completo da unidade
- `${horario_atendimento}` → Horários de funcionamento
- `${telefone}` → Telefone da unidade
- `${maps_url}` → Link do Google Maps

### Dados de Procedimentos
- `${procedimento_nome}` → Nome do procedimento
- `${valor_particular}` → Valor particular formatado
- `${valor_convenio}` → Valor com convênio
- `${duracao}` → Duração da sessão
- `${requer_avaliacao}` → "Requer avaliação prévia" ou não
- `${procedimento_1}`, `${procedimento_2}`, `${procedimento_3}` → Procedimentos escolhidos

### Dados do Paciente
- `${paciente.nome}` → Nome completo
- `${paciente.cpf}` → CPF formatado
- `${paciente.email}` → E-mail
- `${paciente.convenio}` → Convênio do paciente
- `${paciente.telefone}` → Telefone
- `${paciente.data_nascimento}` → Data de nascimento

### Dados do Agendamento
- `${data_escolhida}` → Data selecionada
- `${turno}` → Turno selecionado
- `${horario}` → Horário específico
- `${datas_disponiveis}` → Lista de datas

---

## 🔧 Editando o Workflow

### Via WorkflowEditor (Recomendado)

1. Acesse: `http://localhost:4002/workflows/editor/cmid7ltiz0000xgvt817jchrx`
2. Clique em qualquer card para editar
3. No painel direito, edite:
   - Mensagem
   - Condições
   - Actions
   - Prompts (para GPT_RESPONSE)
4. Clique em "Salvar Fluxo"
5. Teste imediatamente no TestChat

### Editando Mensagens

Ao clicar em um card MESSAGE:
- O painel direito mostra o campo "Mensagem"
- Edite o texto
- Use placeholders conforme necessário
- Os emojis são bem-vindos! 😊

### Editando Condições

Ao clicar em um card CONDITION:
- Campo "Condição": palavras-chave separadas por `|`
- Exemplo: `sim|confirmar|ok|yes`
- Exemplo: `bradesco|sulamerica|mediservice`

### Editando GPT Nodes

Ao clicar em um card GPT_RESPONSE:
- Campo "System Prompt": instruções para o GPT
- Seja específico e direto
- Defina claramente as opções de resposta

---

## 📊 Estrutura Visual no Editor

```
                    START
                      ↓
              CLINIC_SELECTION
                   ↙   ↘
         VIEIRALVES    SÃO JOSÉ
                   ↘   ↙
              GPT_CLASSIFIER ←────┐
               ↓  ↓  ↓  ↓  ↓  ↓   │
               1  2  3  4  5  6   │
               ↓  ↓  ↓  ↓  ↓  ↓   │
           [Todas as branches] ───┘
               (Loop de Info)
                      
                      5 → AGENDAMENTO
                          ↓
                    CHECK_PATIENT
                       ↙    ↘
                  FOUND   NOT_FOUND
                    ↓        ↓
              ASK_PROC   CADASTRO
                    ↓        ↓
                    └────┬───┘
                         ↓
                  ESCOLHA_PROC
                         ↓
                   ESCOLHA_DATA
                         ↓
                   ESCOLHA_TURNO
                         ↓
                      RESUMO
                         ↓
                    CONFIRMA?
                       ↙  ↘
                    SIM   NÃO
                     ↓     ↓
                  FILA  CANCEL
                     ↓
                    END
```

---

## 🐛 Troubleshooting

### Problema: Cards não aparecem no editor
**Solução:** Recarregue a página (F5)

### Problema: Mensagens não aparecem no painel
**Solução:** Verifique se o node tem campo `message`, `text` ou `welcomeMessage` no JSON

### Problema: Placeholders não são substituídos
**Solução:** Verifique se o placeholder está escrito corretamente: `${nome}` (não `$nome` ou `{nome}`)

### Problema: Loop não volta ao GPT
**Solução:** Verifique se a edge (conexão) do node MESSAGE aponta para `gpt_classifier`

### Problema: Workflow não está ativo
**Solução:** Vá em `/workflows` e clique no botão "Ativar"

---

## 📝 Checklist de Validação

Use este checklist para validar que tudo está funcionando:

### Visual (WorkflowEditor)
- [ ] Todos os 58 nodes estão visíveis
- [ ] Todas as 77 conexões estão desenhadas
- [ ] Cards têm cores diferentes por tipo
- [ ] Mensagens aparecem nos cards
- [ ] Painel de propriedades funciona

### Funcional (TestChat)
- [ ] Escolha de unidade funciona (1 ou 2)
- [ ] Loop de informações funciona
- [ ] Perguntas sobre valores retornam valores corretos
- [ ] Perguntas sobre convênios retornam convênios
- [ ] Localização retorna endereço
- [ ] Explicações retornam textos completos
- [ ] Agendamento completo funciona
- [ ] Cadastro novo funciona
- [ ] Cadastro existente é reconhecido
- [ ] Escolha de procedimentos (1-3) funciona
- [ ] Escolha de data funciona
- [ ] Escolha de turno funciona
- [ ] Resumo mostra todos os dados
- [ ] Confirmação cria agendamento
- [ ] Cancelamento volta ao loop
- [ ] Transferência para humano funciona

### Placeholders
- [ ] Placeholders de unidade funcionam
- [ ] Placeholders de procedimento funcionam
- [ ] Placeholders de paciente funcionam
- [ ] Placeholders de agendamento funcionam

---

## 🎓 Dicas Avançadas

### Adicionar Novo Procedimento

1. Crie um novo node MESSAGE com ID único (ex: `valor_pilates_clinico`)
2. Preencha a mensagem com valores e placeholders
3. Adicione uma condição no `branch_valores` para detectar "pilates clinico"
4. Conecte o novo node:
   - Input: vindo do `branch_valores`
   - Output: voltando para `gpt_classifier`
5. Salve o workflow

### Adicionar Novo Convênio Detalhado

1. Crie um novo node MESSAGE (ex: `convenio_mediservice`)
2. Preencha com os procedimentos cobertos
3. Adicione condição em `ask_convenio_procedimentos` para "mediservice"
4. Conecte ao `gpt_classifier`
5. Salve

### Personalizar Mensagens

Todas as mensagens podem ser personalizadas!
- Use emojis para deixar mais amigável
- Seja claro e objetivo
- Sempre termine perguntando se pode ajudar com mais algo
- Use formatação de lista quando necessário

---

## 🎉 Pronto para Usar!

O workflow está completamente configurado e pronto para uso em produção. Todas as funcionalidades planejadas foram implementadas com sucesso.

Para deploy no Railway:
1. Faça commit das mudanças
2. Push para o repositório
3. O Railway fará deploy automático
4. O workflow estará disponível imediatamente

**Boa sorte! 🚀**


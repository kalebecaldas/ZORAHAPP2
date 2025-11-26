# 📝 Como Editar Template de Mensagens de Procedimentos

## ✅ O que foi implementado

As mensagens de procedimentos agora são **editáveis** através do sistema de templates!

**Antes:**
- Mensagens hardcoded no código
- Para mudar, precisava editar código

**Depois:**
- Mensagens vêm de templates no banco de dados
- Você pode editar em: **Configurações > Templates**

---

## 🎯 Como Editar

### 1. Acesse a Página de Configurações

1. Abra o sistema
2. Vá em **Configurações** (ícone de engrenagem)
3. Clique na aba **Templates**

### 2. Encontre o Template

**Nome do Template:** `Informação Completa de Procedimento`
**Chave:** `procedure_info_complete`
**Categoria:** `procedures`

### 3. Edite o Template

Clique em **Editar** no template e você verá o conteúdo atual:

```
💉 *${procedimento_nome}*

📝 *Descrição:*
${procedimento_descricao}

⏱️ *Duração:* ${procedimento_duracao} minutos

💰 *Valor (Particular):* ${preco_particular}

${pacotes_disponiveis}

${convenios_aceitos}

💡 Valores com convênio podem variar. Consulte nossa equipe para valores específicos do seu plano.

📞 *Próximos passos:*
Para agendar uma sessão, entre em contato conosco ou use o comando de agendamento!
```

### 4. Personalize como Quiser!

Você pode:
- ✅ Mudar a ordem das seções
- ✅ Adicionar/remover emojis
- ✅ Alterar textos
- ✅ Mudar formatação
- ✅ Adicionar novas seções

**Exemplo de personalização:**
```
🏥 *${procedimento_nome}*

${procedimento_descricao}

⏱️ Duração: ${procedimento_duracao} minutos
💰 Valor: ${preco_particular}

${pacotes_disponiveis}

${convenios_aceitos}

📞 Entre em contato para agendar!
```

---

## 📋 Variáveis Disponíveis

Você pode usar estas variáveis no template:

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `${procedimento_nome}` | Nome do procedimento | Acupuntura |
| `${procedimento_descricao}` | Descrição completa | Técnica terapêutica... |
| `${procedimento_duracao}` | Duração em minutos | 30 |
| `${preco_particular}` | Preço (pode ser texto formatado) | R$ 180.00 |
| `${pacotes_disponiveis}` | Lista de pacotes (já formatada) | 🎁 *Pacotes Disponíveis:*\n• Pacote de 10... |
| `${convenios_aceitos}` | Lista de convênios (já formatada) | 💳 *Aceita os seguintes convênios:*\n• BRADESCO... |
| `${tem_pacotes}` | Se tem pacotes (true/false) | true |
| `${tem_convenios}` | Se tem convênios (true/false) | true |
| `${total_convenios}` | Total de convênios | 15 |

---

## 🔧 Como Funciona

### Fluxo:

1. Usuário pergunta: "qual valor da acupuntura?"
2. Sistema detecta procedimento "acupuntura"
3. Busca template `procedure_info_complete` no banco
4. Preenche variáveis com dados do procedimento
5. Retorna mensagem formatada

### Fallback:

Se o template não existir ou estiver inativo:
- ✅ Sistema usa formato hardcoded (fallback)
- ✅ Funciona normalmente mesmo sem template

---

## 📝 Criar Template Padrão

Se o template não existir, você pode criar executando:

```bash
npm run seed:procedure-template
```

Isso cria o template padrão com a formatação atual.

---

## ✅ Status

- ✅ Template criado no banco
- ✅ Código modificado para usar template
- ✅ Fallback para formato hardcoded se template não existir
- ✅ Editável em Configurações > Templates
- ✅ Variáveis documentadas

---

## 🎯 Próximos Passos

1. **Acesse:** Configurações > Templates
2. **Encontre:** "Informação Completa de Procedimento"
3. **Edite:** Personalize como quiser!
4. **Salve:** Clique em Salvar
5. **Teste:** Pergunte "qual valor da acupuntura?" no bot

---

**🎉 Agora você pode editar as mensagens de procedimentos sem precisar mexer no código!**


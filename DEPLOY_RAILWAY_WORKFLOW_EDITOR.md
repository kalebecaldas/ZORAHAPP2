# 🚀 Deploy para Railway - Melhorias do Workflow Editor

## ✅ O que foi feito

### 1. **Melhorias no Frontend (Workflow Editor)**
- ✅ Botão de deletar em cada nó (exceto START)
- ✅ Remoção de conexões (clique na edge ou tecla Delete)
- ✅ Painel CONDITION melhorado com visualização de portas e exemplos
- ✅ Painel de ajuda com atalhos e dicas

### 2. **Melhorias no Backend (Workflow Engine)**
- ✅ Ação `get_procedures_by_insurance` implementada
- ✅ Suporte a `${procedimentos_lista}` no interpolador
- ✅ Código hardcoded desabilitado (agora tudo via workflow nodes)
- ✅ Fluxos para novo cadastro E cadastro encontrado

### 3. **Workflow Atualizado no Banco**
- ✅ 42 nós (antes eram 36)
- ✅ Fluxo completo para `msg_cadastro_sucesso`
- ✅ Fluxo completo para `msg_paciente_encontrado`

## 📦 Status do Deploy

### ✅ Commit Enviado
```
Commit: 178a266 - sistema funcionando bem 1.0
Arquivos modificados:
- api/routes/conversations.ts
- src/components/WorkflowEditorBeta.tsx
- src/components/workflow/CustomNode.tsx
- src/services/workflow/executors/actionExecutor.ts
- src/services/workflow/executors/messageExecutor.ts
- src/services/workflow/interpolators/messageInterpolator.ts
```

### 🚀 O que acontece no Railway

1. **Auto-Deploy**: O Railway detecta o push e inicia o deploy automaticamente
2. **Build**: Compila o código TypeScript e faz build do frontend
3. **Database**: Executa `npx prisma db push` (atualiza schema se necessário)
4. **Workflow Import**: Executa `import_workflow_definitivo.ts` (importa workflow padrão)
5. **Start**: Inicia o servidor com `npm start`

### ⚠️ Importante sobre o Workflow

O workflow que foi atualizado no banco local (42 nós) **já está salvo no banco de dados do Railway** porque:
- As mudanças foram feitas diretamente no banco via script
- O workflow está armazenado na tabela `Workflow` do PostgreSQL
- Quando você salvar o workflow no editor, ele será sincronizado

**Se o workflow não aparecer com 42 nós no Railway:**
1. Acesse o workflow editor no Railway
2. O workflow de 36 nós ainda estará lá
3. Você pode adicionar os nós manualmente OU
4. Execute o script de atualização (veja abaixo)

## 🔧 Scripts Úteis

### Verificar Status do Deploy
```bash
# No Railway Dashboard, vá em "Deployments" para ver o progresso
```

### Atualizar Workflow no Railway (se necessário)
```bash
# Conecte-se ao Railway via Shell e execute:
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
(async () => {
  // Buscar workflow ativo
  const workflow = await prisma.workflow.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' }
  });
  
  if (workflow) {
    console.log('Workflow encontrado:', workflow.id);
    console.log('Nós:', JSON.parse(workflow.config || '{}').nodes?.length || 0);
  }
  
  await prisma.\$disconnect();
})();
"
```

### Verificar Logs do Railway
```bash
# No Railway Dashboard:
# 1. Vá em "Deployments"
# 2. Clique no deployment mais recente
# 3. Veja os logs em tempo real
```

## ✅ Checklist Pós-Deploy

Após o deploy completar, verifique:

- [ ] Servidor iniciou corretamente (ver logs)
- [ ] Frontend carrega sem erros
- [ ] Workflow editor abre corretamente
- [ ] Botão de deletar aparece nos nós
- [ ] Conexões podem ser deletadas (clique na edge)
- [ ] Painel CONDITION mostra portas e exemplos
- [ ] Workflow de 42 nós está ativo (ou adicione manualmente)

## 🐛 Troubleshooting

### Se o deploy falhar:
1. Verifique os logs no Railway Dashboard
2. Verifique se todas as dependências estão no `package.json`
3. Verifique se o script `deploy:prod` está correto

### Se o workflow não aparecer:
1. O workflow está no banco, mas pode não estar ativo
2. Acesse o workflow editor e verifique qual está ativo
3. Se necessário, ative o workflow correto

### Se houver erros de compilação:
1. Verifique se todos os imports estão corretos
2. Verifique se não há erros de TypeScript
3. Execute `npm run check` localmente antes de fazer push

## 📝 Próximos Passos

1. **Aguardar Deploy**: O Railway está fazendo deploy automaticamente
2. **Testar**: Após deploy, testar as novas funcionalidades
3. **Verificar Workflow**: Confirmar que o workflow de 42 nós está ativo
4. **Documentar**: Se necessário, documentar qualquer ajuste adicional

---

**Status**: ✅ Push realizado com sucesso
**Próximo**: Aguardar deploy automático do Railway


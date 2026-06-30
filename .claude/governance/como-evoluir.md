# Como Evoluir o Framework

> Guia para adicionar, modificar e remover componentes do Claude Engineering Framework.

---

## Princípios de Evolução

1. **Problema real primeiro**: só adicione o que resolve um problema concreto
2. **Consenso antes de mudança**: mudanças em regras obrigatórias precisam de aprovação
3. **Retrocompatibilidade**: prefira adições a remoções
4. **Documente o "porquê"**: o motivo de uma mudança é tão importante quanto a mudança
5. **Teste antes de adotar**: valide o novo padrão em prática antes de oficializar

---

## Processo de Evolução

### Passo 1 — Identificar a Necessidade

Antes de propor qualquer mudança, documente:
- Qual problema o framework atual não resolve?
- Quantas vezes este problema ocorreu?
- Qual é o impacto deste problema?
- Já existe algo similar no framework que poderia ser adaptado?

### Passo 2 — Propor a Mudança

Abra uma issue com:
```markdown
## Proposta de Evolução do Framework

**Tipo**: [ ] Novo padrão | [ ] Novo especialista | [ ] Novo workflow | [ ] Modificação | [ ] Remoção

**Problema**: {{DESCRICAO_DO_PROBLEMA_QUE_ESTA_SENDO_RESOLVIDO}}

**Proposta**: {{O_QUE_VOCE_PROPOE_ADICIONAR_OU_MUDAR}}

**Alternativas consideradas**: {{OUTRAS_OPCOES_QUE_VOCE_AVALIOU}}

**Impacto em componentes existentes**: {{QUAIS_ARQUIVOS_PRECISAM_SER_ATUALIZADOS}}

**Critérios de sucesso**: {{COMO_SABEMOS_QUE_A_MUDANÇA_FUNCIONOU}}
```

### Passo 3 — Discussão (mínimo 3 dias)

- Deixe a issue aberta por mínimo 3 dias úteis para feedback
- Para mudanças em regras obrigatórias (RO-*): mínimo 7 dias e aprovação do tech lead
- Incorpore o feedback antes de implementar

### Passo 4 — Implementar

```bash
git checkout -b framework/descricao-da-mudança
# Faça as mudanças
git commit -m "docs(framework): adicionar especialista X"
# Abra PR com referência à issue de proposta
```

### Passo 5 — Atualizar o Framework Evolution.md

Documente a mudança no CHANGELOG do framework:
```markdown
## [1.X.0] — YYYY-MM-DD

### Adicionado
- Novo especialista: `skills/nome.md` para cobrir [área] (#NNN)
```

### Passo 6 — Comunicar ao Time

Após o merge:
- Notifique o time sobre a mudança
- Se for breaking change, dê período de adaptação
- Atualize o README se a estrutura mudou

---

## Como Adicionar um Novo Especialista

1. **Crie o arquivo** em `skills/nome-do-especialista.md` com os 9 campos obrigatórios:
   - Objetivo
   - Quando Utilizar
   - Responsabilidades
   - Limites (o que NÃO faz)
   - O Que Revisar
   - O Que Nunca Fazer
   - Checklist
   - Critérios de Aprovação
   - Exemplos de Atuação

2. **Garanta que não há sobreposição** com especialistas existentes:
   - Verifique se as responsabilidades são realmente distintas
   - Defina claramente o que fica FORA das responsabilidades do novo especialista

3. **Atualize o `governance/mapa-especialistas.md`**:
   - Adicione o nó no diagrama Mermaid
   - Adicione na tabela de responsabilidades

4. **Crie ou atualize prompts** que ativem o novo especialista em `prompts/`

5. **Atualize o Framework Evolution.md**

---

## Como Adicionar um Novo Padrão

1. **Crie o arquivo** em `standards/nome-do-padrao.md` com:
   - Objetivo
   - Regras numeradas (com código como RP-01)
   - Exemplos corretos (com código)
   - Anti-padrões (com código)
   - Checklist

2. **Referencie no CLAUDE.md** se o padrão tiver regras obrigatórias

3. **Atualize os checklists** relevantes para incluir verificações do novo padrão

4. **Atualize o `governance/mapa-dependencias.md`**

---

## Como Adicionar um Novo Workflow

1. **Crie o arquivo** em `workflows/nome-do-workflow.md` com:
   - Objetivo
   - Pré-requisitos
   - Fases com passos detalhados
   - Skills envolvidas
   - Critérios de conclusão

2. **Crie o prompt correspondente** em `prompts/nome-do-workflow.md`

3. **Atualize `governance/mapa-workflows.md`**

---

## Como Modificar Conteúdo Existente

### Modificação PATCH (correção, clarificação)
- Faça a mudança e incremente o PATCH
- Não precisa de período de discussão
- Notifique o time no commit

### Modificação MINOR (nova capacidade, sem quebrar nada)
- Proposta com mínimo 3 dias
- Incremente o MINOR

### Modificação MAJOR (breaking change, renomeação, remoção)
- Proposta com mínimo 7 dias
- Aprovação do tech lead obrigatória
- Período de transição (mínimo 2 sprints) para mudanças impactantes
- Documentar guia de migração

---

## Quando Remover Algo do Framework

A remoção é o tipo mais arriscado de mudança. Remova apenas quando:

1. O componente foi substituído por algo melhor
2. O componente não está sendo usado há 3+ meses
3. O componente causa mais confusão do que ajuda

Para remover:
1. Marque como `[DEPRECIADO]` por 2 sprints antes de remover
2. Atualize referências para apontar para o substituto
3. Remova na versão MAJOR seguinte
4. Documente no CHANGELOG o que foi removido e por quê

---

## Critérios de Qualidade para Novos Conteúdos

Antes de adicionar qualquer novo componente, verifique:

- [ ] Resolve um problema real e recorrente?
- [ ] Não duplica algo que já existe no framework?
- [ ] Os exemplos são práticos e funcionais?
- [ ] A linguagem está em Português Brasileiro correto?
- [ ] As referências cruzadas estão atualizadas?
- [ ] O `Framework Evolution.md` foi atualizado?
- [ ] O time foi notificado?

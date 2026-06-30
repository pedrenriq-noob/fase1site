# Workflow: Refatoração

---

## Objetivo

Guiar o processo de melhoria da estrutura interna do código sem alterar seu comportamento externo, reduzindo débito técnico e melhorando manutenibilidade.

---

## Pré-requisitos

- [ ] Cobertura de testes adequada na área a ser refatorada (mínimo 70%)
- [ ] Aprovação do tech lead para o escopo da refatoração
- [ ] Motivação documentada (débito técnico identificado)
- [ ] Nenhuma outra mudança simultânea na mesma área

---

## Passos Detalhados

### Fase 1 — Auditoria

**Responsável**: Code Reviewer + Technical Critic

**Passo 1.1 — Identificar o problema**
- Liste os problemas específicos que motivam a refatoração:
  - Funções muito longas (> 30 linhas)
  - Código duplicado (DRY violation)
  - Nomes confusos ou enganosos
  - Responsabilidades misturadas
  - Dependências circulares
  - Código morto (não utilizado)
  - Complexidade excessiva (ciclomática > 10)

**Passo 1.2 — Medir o estado atual**
```bash
# Complexidade ciclomática
npx complexity-report src/

# Duplicação de código
npx jscpd src/

# Dependências circulares
npx madge --circular src/

# Cobertura de testes (precisa ser > 70% antes de refatorar)
npm test -- --coverage
```

**Passo 1.3 — Documentar o escopo**
- Delimite exatamente O QUE será refatorado
- Defina O QUE NÃO será alterado
- Identifique riscos

**Entregável**: Relatório de auditoria com métricas antes da refatoração

---

### Fase 2 — Planejamento

**Responsável**: Software Architect + Technical Critic

**Passo 2.1 — Definir a estratégia**

Escolha a técnica de refatoração adequada:

| Problema | Técnica |
|---|---|
| Função muito longa | Extract Method |
| Código duplicado | Extract to Shared Module |
| Parâmetros demais | Introduce Parameter Object |
| Switch/if longo por tipo | Replace with Polymorphism |
| Dados e comportamento separados | Move Method/Field |
| Dependência direta de implementação | Extract Interface/Abstraction |
| Módulo com muitas responsabilidades | Extract Module |

**Passo 2.2 — Criar plano de migração**
- Defina a ordem dos passos (menor risco primeiro)
- Identifique checkpoints de validação
- Estime impacto em outros módulos

**Passo 2.3 — Garantir cobertura de testes**
- Se cobertura < 70%, adicione testes ANTES de refatorar
- Testes de characterization: capturam comportamento atual (mesmo que "errado")
- Os testes são a rede de segurança da refatoração

**Entregável**: Plano de refatoração aprovado com estratégia clara

---

### Fase 3 — Implementação

**Responsável**: Developer (Vanilla JS Engineer / Supabase Specialist conforme área)

**Regra de Ouro**: Faça uma refatoração por commit. Nunca misture refatoração com mudança de comportamento.

**Passo 3.1 — Criar branch**
```bash
git checkout -b refactor/NNN-descricao-do-que-esta-sendo-refatorado
```

**Passo 3.2 — Executar refatorações atômicas**

Exemplos de refatorações atômicas:

```javascript
// ANTES — Extract Method
async function processOrder(orderId) {
  const order = await db.orders.findById(orderId);
  if (!order) throw new NotFoundError('Order');

  // validação misturada com lógica
  if (order.status !== 'pending') throw new ValidationError('...');
  if (order.items.length === 0) throw new ValidationError('...');

  // cálculo misturado com persistência
  let total = 0;
  for (const item of order.items) {
    total += item.price * item.quantity;
  }

  await db.orders.update(orderId, { total, status: 'processing' });
  return { orderId, total };
}

// DEPOIS — funções extraídas, cada uma com uma responsabilidade
async function processOrder(orderId) {
  const order = await fetchOrderOrThrow(orderId);
  validateOrderForProcessing(order);
  const total = calculateOrderTotal(order.items);
  return await persistOrderProcessing(orderId, total);
}

function fetchOrderOrThrow(orderId) { ... }
function validateOrderForProcessing(order) { ... }
function calculateOrderTotal(items) { ... }
function persistOrderProcessing(orderId, total) { ... }
```

**Passo 3.3 — Verificar testes a cada passo**
```bash
# Execute após CADA refatoração atômica
npm test
# Se algum teste falhar, você introduziu uma mudança de comportamento
# Reverta e reavalie
```

**Passo 3.4 — Commits atômicos**
```bash
# Um commit por refatoração
git commit -m "refactor(orders): extrair validateOrderForProcessing de processOrder"
git commit -m "refactor(orders): extrair calculateOrderTotal para módulo separado"
```

**Passo 3.5 — Atualizar nomenclatura**
- Renomeie variáveis e funções para seguir os padrões
- Atualize JSDoc para refletir as mudanças
- Remova comentários obsoletos

**Entregável**: Código refatorado com todos os testes passando

---

### Fase 4 — Validação

**Responsável**: Code Reviewer + QA Engineer

**Passo 4.1 — Validar que o comportamento não mudou**
```bash
# Todos os testes devem passar
npm test

# Cobertura não deve diminuir
npm test -- --coverage
```

**Passo 4.2 — Medir melhorias**
```bash
# Compare as métricas antes e depois
npx complexity-report src/     # complexidade deve diminuir
npx jscpd src/                 # duplicação deve diminuir
npx madge --circular src/      # dependências circulares devem diminuir/zero
```

**Passo 4.3 — Code Review focado em:**
- O comportamento externo foi preservado?
- Os nomes são mais claros agora?
- As responsabilidades estão bem separadas?
- A refatoração introduziu alguma abstração prematura?

**Passo 4.4 — QA valida comportamento**
- Execute os fluxos principais que usam o código refatorado
- Confirme que nenhum comportamento foi alterado
- Teste edge cases

**Entregável**: Refatoração aprovada pelo Code Reviewer e QA

---

### Fase 5 — Documentação

**Responsável**: Documentation Engineer

**Passo 5.1 — Atualizar documentação**
- Atualize JSDoc das funções alteradas
- Atualize README do módulo se a interface mudou
- Atualize diagramas arquiteturais se necessário

**Passo 5.2 — Documentar as métricas alcançadas**
```markdown
## Resultado da Refatoração

| Métrica | Antes | Depois | Melhoria |
|---|---|---|---|
| Linhas de código | 450 | 280 | -38% |
| Complexidade ciclomática média | 8.2 | 3.1 | -62% |
| Duplicação de código | 15% | 2% | -87% |
| Cobertura de testes | 55% | 82% | +49% |
```

**Passo 5.3 — Atualizar CHANGELOG**
```markdown
### Alterado
- Módulo `order-processing`: refatorado para melhorar legibilidade e reduzir complexidade (#NNN)
```

**Entregável**: Documentação atualizada, métricas documentadas

---

## Skills Envolvidas

| Fase | Skills Primárias | Skills de Apoio |
|---|---|---|
| Auditoria | Code Reviewer | Technical Critic |
| Planejamento | Software Architect | Technical Critic |
| Implementação | Vanilla JS Engineer | PostgreSQL Performance |
| Validação | Code Reviewer, QA Engineer | Business Rules Auditor |
| Documentação | Documentation Engineer | — |

---

## Critérios de Conclusão

- [ ] Comportamento externo preservado (todos os testes passam)
- [ ] Métricas de qualidade melhoradas (documentadas)
- [ ] Cobertura de testes igual ou maior que antes
- [ ] Nenhuma dependência circular nova introduzida
- [ ] Code review aprovado
- [ ] QA confirmou sem regressões
- [ ] Documentação atualizada
- [ ] CHANGELOG.md atualizado
- [ ] Débito técnico original resolvido (feche a issue correspondente)

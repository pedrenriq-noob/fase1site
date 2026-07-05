# Workflow: Correção de Bug

---

## Objetivo

Guiar o processo de identificação, diagnóstico e correção de bugs de forma sistemática e segura, garantindo que a correção não introduza novos problemas.

---

## Pré-requisitos

- [ ] Bug reportado com informações suficientes (use `templates/bug-report.md`)
- [ ] Severidade classificada (Crítico / Alto / Médio / Baixo)
- [ ] Ambiente onde o bug ocorre identificado (produção, staging, desenvolvimento)

---

## Classificação de Severidade

| Severidade | Critério | Tempo de Resposta |
|---|---|---|
| **Crítico** | Perda de dados, brecha de segurança, sistema fora do ar | Imediato (< 1h) |
| **Alto** | Feature principal não funciona, sem workaround | < 4h |
| **Médio** | Feature parcialmente quebrada, existe workaround | < 2 dias |
| **Baixo** | Problema cosmético, comportamento inconsistente | Próximo sprint |

---

## Passos Detalhados

### Fase 1 — Reporte e Triagem

**Responsável**: Quem reportou + QA Engineer

**Passo 1.1 — Coletar informações**
- Browser e versão
- Sistema operacional e versão
- Passos para reproduzir (numbered steps)
- Resultado esperado vs. resultado atual
- Capturas de tela ou vídeo
- Logs de erro (console, rede, servidor)
- Frequência (sempre, às vezes, uma vez)

**Passo 1.2 — Classificar severidade**
- Determine o impacto no usuário
- Verifique se afeta dados ou segurança
- Classifique e priorize

**Passo 1.3 — Assignar responsável**
- Para bugs Críticos: avisar tech lead imediatamente
- Para outros: adicionar ao sprint atual ou backlog conforme severidade

**Entregável**: Bug report completo na issue com severidade definida

---

### Fase 2 — Reprodução

**Responsável**: Developer assignado

**Passo 2.1 — Reproduzir localmente**
```bash
# Sempre reproduza o bug ANTES de tentar corrigir
1. Configure o ambiente idêntico ao relatado
2. Execute os passos do bug report passo a passo
3. Confirme que o bug existe no seu ambiente
```

**Passo 2.2 — Documentar a reprodução**
- Anote os passos exatos que reproduzem o bug
- Identifique se o bug é consistente ou intermitente
- Determine o menor conjunto de passos que reproduz o problema

**Passo 2.3 — Verificar em outros ambientes**
- O bug ocorre apenas em produção? Staging também?
- É específico de browser/dispositivo?
- Acontece com todos os usuários ou apenas alguns?

**Passo 2.4 — Escrever um teste que falha (TDD)**
```javascript
// ANTES de corrigir, escreva o teste que documenta o bug
test('deve calcular desconto corretamente para cupons percentuais', () => {
  const items = [{ price: 1000, quantity: 2 }];
  const result = calculateOrderTotal(items, { discountPercent: 10 });
  expect(result.total).toBe(1800); // estava retornando 1900 — bug!
});
```

**Entregável**: Bug reproduzido e documentado, teste falhando escrito

---

### Fase 3 — Diagnóstico

**Responsável**: Developer + (PostgreSQL Performance se bug de DB)

**Passo 3.1 — Identificar a causa raiz**
- Não corrija o sintoma — encontre a causa raiz
- Use o método dos "5 Porquês"
- Verifique logs de erro no Supabase
- Analise queries lentas com EXPLAIN ANALYZE

**Passo 3.2 — Mapear o impacto**
- Quais outros módulos podem ser afetados pelo mesmo bug?
- Existem outros locais no código com o mesmo problema?
- O bug pode ter criado dados inconsistentes no banco?

**Passo 3.3 — Identificar commits relacionados**
```bash
# Encontrar quando o bug foi introduzido
git log --oneline --all | grep -i "palavra-chave"
git bisect start
git bisect bad HEAD
git bisect good v1.2.0
```

**Passo 3.4 — Avaliar escopo da correção**
- A correção é cirúrgica ou requer refatoração?
- A correção pode introduzir breaking changes?
- É necessário rollback de dados no banco?

**Entregável**: Causa raiz identificada e documentada na issue

---

### Fase 4 — Correção

**Responsável**: Developer

**Passo 4.1 — Criar branch de fix**
```bash
git checkout main
git pull origin main
git checkout -b fix/NNN-descricao-curta-do-bug
# Para bugs críticos em produção:
git checkout -b hotfix/NNN-descricao-curta
```

**Passo 4.2 — Implementar a correção**
- Faça a menor mudança possível que resolve o problema
- Não aproveite para refatorar código não relacionado
- Documente o motivo da correção em comentário se não for óbvio

**Passo 4.3 — Verificar que o teste passa**
```bash
npm test -- --testPathPattern="nome-do-arquivo.test"
```

**Passo 4.4 — Executar suite completa de testes**
```bash
npm test
# Garanta que nenhum teste existente foi quebrado
```

**Passo 4.5 — Verificar casos relacionados**
- Teste todas as variações do fluxo corrigido
- Verifique os casos de borda identificados no diagnóstico
- Teste em múltiplos browsers se for bug de UI

**Entregável**: Correção implementada com testes passando

---

### Fase 5 — Revisão e Validação

**Responsável**: Code Reviewer + QA Engineer

**Passo 5.1 — Code Review focado**
- Verificar que a correção resolve a causa raiz (não o sintoma)
- Garantir que não introduz regressões
- Avaliar se o teste escrito é adequado
- Verificar segurança da correção

**Passo 5.2 — QA valida**
- Execute os passos de reprodução do bug
- Confirme que o bug foi corrigido
- Execute testes de regressão nos fluxos adjacentes
- Para bugs de produção: teste em staging primeiro

**Passo 5.3 — Business Rules Auditor (se bug de regra de negócio)**
- Valida que a correção está alinhada com as regras de negócio
- Verifica se há outros pontos do sistema com a mesma regra incorreta

**Entregável**: PR aprovado e validado pelo QA

---

### Fase 6 — Deploy e Monitoramento

**Responsável**: Developer + Tech Lead

**Passo 6.1 — Deploy**
- Para bugs críticos (hotfix): deploy direto com aprovação do tech lead
- Para outros: processo normal de deploy (`workflows/deploy.md`)

**Passo 6.2 — Monitoramento pós-deploy**
- Monitore logs por 1 hora após deploy de hotfix
- Monitore por 30 minutos para outros bugs
- Confirme que o erro não aparece mais nos logs

**Passo 6.3 — Comunicação**
- Atualize a issue com resolução
- Notifique usuários afetados (se necessário)
- Documente no CHANGELOG.md: `fix(área): descrição da correção`

**Passo 6.4 — Análise pós-mortem (para bugs críticos)**
- Por que o bug não foi detectado antes?
- Como prevenir bugs similares?
- Que testes faltavam?
- Qual processo falhou?

**Entregável**: Bug corrigido em produção, monitorado e documentado

---

## Skills Envolvidas

| Fase | Skills Primárias | Skills de Apoio |
|---|---|---|
| Reporte | QA Engineer | Business Rules Auditor |
| Reprodução | QA Engineer, Developer | — |
| Diagnóstico | Developer | PostgreSQL Performance (se DB) |
| Correção | Developer | Security Reviewer (se segurança) |
| Revisão | Code Reviewer | Business Rules Auditor |
| Deploy | Developer, Tech Lead | Documentation Engineer |

---

## Critérios de Conclusão

- [ ] Causa raiz identificada e documentada
- [ ] Teste automatizado que valida a correção (antes de corrigir)
- [ ] Todos os testes passando
- [ ] Code review aprovado
- [ ] QA validou a correção
- [ ] Bug não reproduz em produção
- [ ] CHANGELOG.md atualizado
- [ ] Issue fechada com descrição da resolução
- [ ] Análise pós-mortem realizada (para bugs críticos/altos)
- [ ] Dados inconsistentes corrigidos no banco (se aplicável)

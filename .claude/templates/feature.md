# Template: Especificação de Feature

```markdown
# Feature: {{NOME_DA_FEATURE}}

**Issue**: #{{NUMERO}}
**Sprint**: {{SPRINT}}
**Responsável**: {{NOME}}
**Status**: [ ] Em análise | [ ] Em desenvolvimento | [ ] Em revisão | [ ] Concluída

---

## Problema de Negócio

{{DESCRICAO_DO_PROBLEMA_QUE_ESTA_SENDO_RESOLVIDO}}

## Solução Proposta

{{DESCRICAO_DA_SOLUCAO}}

## Usuários Afetados

- {{PERSONA_1}}: {{COMO_AFETA}}
- {{PERSONA_2}}: {{COMO_AFETA}}

## Critérios de Aceite

### CA-01: {{TITULO_DO_CRITERIO}}
- **Dado** que {{CONTEXTO}}
- **Quando** {{ACAO}}
- **Então** {{RESULTADO_ESPERADO}}

### CA-02: {{TITULO_DO_CRITERIO}}
- **Dado** que {{CONTEXTO}}
- **Quando** {{ACAO}}
- **Então** {{RESULTADO_ESPERADO}}

## Fora do Escopo

- {{O_QUE_NAO_SERA_FEITO_NESTA_ITERACAO}}
- {{ITEM_2}}

## Design Técnico

### Módulos Afetados
- {{MODULO_1}}: {{O_QUE_MUDA}}
- {{MODULO_2}}: {{O_QUE_MUDA}}

### Banco de Dados
- [ ] Não requer mudanças
- [ ] Requer migration: {{DESCRICAO}}

### Edge Functions
- [ ] Não requer novas funções
- [ ] Nova função: `{{NOME_DA_FUNCAO}}`

## Métricas de Sucesso

- {{METRICA_1}}: {{META}}
- {{METRICA_2}}: {{META}}

## Riscos Identificados

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| {{RISCO_1}} | Alto/Médio/Baixo | Alto/Médio/Baixo | {{MITIGACAO}} |

## Dependências

- {{DEPENDENCIA_1}} (Issue #{{NUMERO}})
- {{DEPENDENCIA_2}}

## Histórico de Decisões

| Data | Decisão | Motivo |
|------|---------|--------|
| {{DATA}} | {{DECISAO}} | {{MOTIVO}} |
```

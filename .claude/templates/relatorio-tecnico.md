# Template: Relatório Técnico

```markdown
# Relatório Técnico: {{TITULO}}

**Data**: {{YYYY-MM-DD}}
**Responsável**: {{NOME}}
**Tipo**: {{Auditoria | Análise de Performance | Revisão de Segurança | Pós-mortem}}
**Escopo**: {{MODULOS_OU_AREAS_ANALISADAS}}

---

## Sumário Executivo

{{RESUMO_DE_3_A_5_FRASES_SOBRE_O_QUE_FOI_ENCONTRADO_E_RECOMENDACOES_PRINCIPAIS}}

---

## Metodologia

{{COMO_A_ANALISE_FOI_CONDUZIDA}}

Ferramentas utilizadas:
- {{FERRAMENTA_1}}
- {{FERRAMENTA_2}}

Período de análise: {{DATA_INICIO}} a {{DATA_FIM}}

---

## Findings

### Críticos (Ação Imediata)

| # | Título | Área | Impacto | Esforço | Issue |
|---|--------|------|---------|---------|-------|
| 1 | {{TITULO}} | {{AREA}} | Alto | {{HORAS}} | #{{NR}} |
| 2 | {{TITULO}} | {{AREA}} | Alto | {{HORAS}} | #{{NR}} |

**Detalhes**:

#### Finding 1: {{TITULO}}
- **Descrição**: {{DESCRICAO_DETALHADA}}
- **Evidência**: {{CODIGO_OU_LOG_OU_SCREENSHOT}}
- **Recomendação**: {{O_QUE_FAZER}}

---

### Altos (Resolver neste Sprint)

| # | Título | Área | Impacto | Esforço | Issue |
|---|--------|------|---------|---------|-------|
| 3 | {{TITULO}} | {{AREA}} | Médio | {{HORAS}} | #{{NR}} |

---

### Médios (Próximo Sprint)

| # | Título | Área | Impacto | Esforço | Issue |
|---|--------|------|---------|---------|-------|
| 5 | {{TITULO}} | {{AREA}} | Baixo | {{HORAS}} | #{{NR}} |

---

### Baixos / Melhorias (Backlog)

- {{MELHORIA_1}}
- {{MELHORIA_2}}

---

## Métricas

| Métrica | Valor Atual | Meta | Status |
|---------|-------------|------|--------|
| {{METRICA_1}} | {{VALOR}} | {{META}} | ✅/⚠️/❌ |
| {{METRICA_2}} | {{VALOR}} | {{META}} | ✅/⚠️/❌ |

---

## Plano de Ação

| Prioridade | Ação | Responsável | Prazo |
|------------|------|-------------|-------|
| 1 (Crítico) | {{ACAO}} | {{NOME}} | {{DATA}} |
| 2 (Alto) | {{ACAO}} | {{NOME}} | {{DATA}} |
| 3 (Médio) | {{ACAO}} | {{NOME}} | {{SPRINT}} |

---

## Conclusão

{{CONCLUSAO_E_PROXIMOS_PASSOS}}

---

## Apêndices

### Apêndice A: {{TITULO}}

{{DADOS_COMPLEMENTARES}}
```

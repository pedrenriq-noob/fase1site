# Mapa de Dependências do Framework

> Diagrama mostrando como padrões, especialistas, workflows e checklists se relacionam.

---

## Diagrama Principal

```mermaid
graph LR
    subgraph Standards["📋 Padrões (standards/)"]
        S_ARQ[arquitetura.md]
        S_HTML[html.md]
        S_CSS[css.md]
        S_JS[javascript.md]
        S_SUP[supabase.md]
        S_SQL[sql.md]
        S_DOC[documentacao.md]
        S_COM[commits.md]
        S_VER[versionamento.md]
        S_NOM[nomenclatura.md]
        S_EST[estrutura-pastas.md]
    end

    subgraph Skills["🧑‍💼 Especialistas (skills/)"]
        SK_VJS[vanilla-js-engineer]
        SK_SUP[supabase-specialist]
        SK_SEC[security-reviewer]
        SK_PG[postgresql-performance]
        SK_CR[code-reviewer]
        SK_PWA[pwa-specialist]
        SK_MUX[mobile-ux-specialist]
        SK_SA[software-architect]
        SK_BA[business-architect]
        SK_QA[qa-engineer]
        SK_DE[documentation-engineer]
        SK_BRA[business-rules-auditor]
        SK_PO[product-owner]
        SK_TC[technical-critic]
    end

    subgraph Workflows["🔄 Workflows"]
        W_NF[nova-feature]
        W_BG[bug]
        W_RF[refatoracao]
        W_MG[migration]
        W_DP[deploy]
        W_DC[documentacao]
    end

    subgraph Checklists["✅ Checklists"]
        C_FE[frontend]
        C_BE[backend]
        C_DB[banco]
        C_SEC[seguranca]
        C_PERF[performance]
        C_UX[ux]
        C_PWA[pwa]
        C_DP[deploy]
        C_DOC[documentacao]
        C_QA[qa]
        C_SUP[supabase]
    end

    %% Standards → Skills
    S_JS --> SK_VJS
    S_HTML --> SK_VJS
    S_CSS --> SK_VJS
    S_SUP --> SK_SUP
    S_SQL --> SK_SUP
    S_SQL --> SK_PG
    S_ARQ --> SK_SA
    S_DOC --> SK_DE
    S_NOM --> SK_CR

    %% Standards → Checklists
    S_HTML --> C_FE
    S_CSS --> C_FE
    S_JS --> C_FE
    S_SUP --> C_BE
    S_SUP --> C_SUP
    S_SQL --> C_DB
    S_ARQ --> C_BE

    %% Skills → Workflows
    SK_BA --> W_NF
    SK_SA --> W_NF
    SK_VJS --> W_NF
    SK_SUP --> W_MG
    SK_PG --> W_MG
    SK_SEC --> W_NF
    SK_CR --> W_NF
    SK_QA --> W_NF
    SK_QA --> W_BG
    SK_CR --> W_RF
    SK_DE --> W_DC
    SK_DP --> W_DP

    %% Workflows → Checklists
    W_NF --> C_FE
    W_NF --> C_BE
    W_NF --> C_SEC
    W_MG --> C_DB
    W_MG --> C_SUP
    W_DP --> C_DP
    W_DC --> C_DOC
```

---

## Dependências por Padrão

| Padrão | Especialistas que o usam | Checklists que o referenciam |
|---|---|---|
| `arquitetura.md` | Software Architect, Code Reviewer | backend, supabase |
| `html.md` | Vanilla JS Engineer, Mobile UX | frontend, ux |
| `css.md` | Vanilla JS Engineer, Mobile UX | frontend, ux, pwa |
| `javascript.md` | Vanilla JS Engineer, Code Reviewer | frontend, backend |
| `supabase.md` | Supabase Specialist, Security Reviewer | supabase, backend, seguranca |
| `sql.md` | Supabase Specialist, PostgreSQL Performance | banco, supabase |
| `documentacao.md` | Documentation Engineer | documentacao |
| `nomenclatura.md` | Code Reviewer, todos os engineers | frontend, backend |
| `commits.md` | Todos | — |

---

## Dependências por Workflow

| Workflow | Padrões Consultados | Skills Ativadas | Checklists Usados |
|---|---|---|---|
| `nova-feature` | Todos | Todos (conforme área) | frontend, backend, supabase, seguranca |
| `bug` | Relevantes ao bug | QA, Developer, Security | backend, seguranca |
| `refatoracao` | arquitetura, javascript | Code Reviewer, Software Architect | frontend, backend |
| `migration` | sql, supabase | Supabase Specialist, PG Performance | banco, supabase |
| `deploy` | — | — | deploy |
| `documentacao` | documentacao | Documentation Engineer | documentacao |

---

## Impacto de Mudanças no Framework

```mermaid
graph TD
    MUD[Mudança em standards/supabase.md]

    MUD --> C1[Atualizar checklists/supabase.md]
    MUD --> C2[Atualizar checklists/backend.md]
    MUD --> C3[Revisar skills/supabase-specialist.md]
    MUD --> C4[Revisar skills/security-reviewer.md]
    MUD --> C5[Verificar workflows/migration.md]
    MUD --> C6[Atualizar Framework Evolution.md]
```

Ao mudar qualquer padrão, verifique o impacto em: checklists, skills e workflows que o referenciam.

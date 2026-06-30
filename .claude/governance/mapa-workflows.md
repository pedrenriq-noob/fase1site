# Mapa de Workflows

> Diagrama dos 6 workflows conectados entre si.

---

## Diagrama Mermaid

```mermaid
flowchart TD
    subgraph Entrada["Entrada de Trabalho"]
        REQ[Novo Requisito\nou Bug Report]
        DEBT[Débito Técnico\nIdentificado]
    end

    subgraph Workflows["Workflows Principais"]
        WF[workflow/nova-feature.md]
        WB[workflow/bug.md]
        WR[workflow/refatoracao.md]
        WM[workflow/migration.md]
        WD[workflow/deploy.md]
        WDoc[workflow/documentacao.md]
    end

    subgraph Saída["Saída"]
        PROD[Produção]
        DOCS[Documentação\nAtualizada]
    end

    REQ --> WF
    REQ --> WB
    DEBT --> WR

    WF -->|"Requer mudança\nde schema"| WM
    WB -->|"Requer mudança\nde schema"| WM
    WR -->|"Pode requerer\nmigration"| WM

    WM -->|"Migration\naplicada"| WF
    WM -->|"Migration\naplicada"| WB

    WF -->|"Feature\npronta para deploy"| WD
    WB -->|"Fix\npronto para deploy"| WD
    WR -->|"Refatoração\npronta para deploy"| WD

    WD --> PROD

    WF -->|"Documenta\nnova feature"| WDoc
    WM -->|"Documenta\nschema"| WDoc
    WB -->|"Documenta\nsolução"| WDoc
    WR -->|"Atualiza\ndocumentação"| WDoc

    WDoc --> DOCS
```

---

## Fluxo Detalhado por Cenário

### Cenário 1: Nova Feature Simples (sem DB)
```
Requisito → nova-feature.md → deploy.md → documentacao.md
```

### Cenário 2: Nova Feature com Banco de Dados
```
Requisito → nova-feature.md → migration.md → nova-feature.md → deploy.md → documentacao.md
```

### Cenário 3: Bug Crítico (Hotfix)
```
Bug Report → bug.md (urgente) → deploy.md (hotfix) → bug.md (pós-mortem)
```

### Cenário 4: Refatoração com Migration
```
Débito Técnico → refatoracao.md → migration.md (se necessário) → deploy.md → documentacao.md
```

---

## Decisão de Qual Workflow Usar

```mermaid
flowchart TD
    Start([Tenho uma tarefa]) --> Q1{Qual tipo?}

    Q1 -->|Nova funcionalidade| WF[nova-feature.md]
    Q1 -->|Comportamento\nerrado/bug| WB[bug.md]
    Q1 -->|Melhorar\ncódigo existente| WR[refatoracao.md]
    Q1 -->|Mudar banco\nde dados| WM[migration.md]
    Q1 -->|Publicar em\nprodução| WD[deploy.md]
    Q1 -->|Criar/atualizar\ndocumentação| WDoc[documentacao.md]
```

---

## Dependências Entre Workflows

| Workflow | Depende de | Alimenta |
|---|---|---|
| `nova-feature.md` | `migration.md` (se DB) | `deploy.md`, `documentacao.md` |
| `bug.md` | `migration.md` (se DB) | `deploy.md`, `documentacao.md` |
| `refatoracao.md` | `migration.md` (se DB) | `deploy.md`, `documentacao.md` |
| `migration.md` | — | `nova-feature.md`, `bug.md` |
| `deploy.md` | Todos os outros | — |
| `documentacao.md` | Todos os outros | — |

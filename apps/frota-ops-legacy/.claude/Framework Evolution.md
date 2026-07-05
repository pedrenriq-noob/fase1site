# Framework Evolution — Histórico de Versões

> Registro de todas as evoluções do Claude Engineering Framework, seguindo Versionamento Semântico (SemVer).

---

## Versionamento Semântico do Framework

O CEF segue o padrão **MAJOR.MINOR.PATCH**:

- **MAJOR**: mudanças incompatíveis com versões anteriores (ex: renomeação de estrutura, remoção de padrões)
- **MINOR**: novas funcionalidades retrocompatíveis (ex: novo especialista, novo workflow)
- **PATCH**: correções e melhorias menores (ex: clarificação de regra, correção de exemplo)

### Quando incrementar cada versão

| Tipo de Mudança | Versão |
|---|---|
| Adicionar novo especialista | MINOR |
| Adicionar novo workflow | MINOR |
| Adicionar novo padrão | MINOR |
| Renomear arquivo ou estrutura | MAJOR |
| Remover especialista ou padrão | MAJOR |
| Alterar regra obrigatória | MAJOR |
| Corrigir erro em exemplo | PATCH |
| Clarificar descrição | PATCH |
| Atualizar template | PATCH |
| Adicionar checklist item | MINOR |

---

## Template de Changelog

```markdown
## [X.Y.Z] — YYYY-MM-DD

### Adicionado
- Novo especialista: [nome] para cobrir [área]
- Novo workflow: [nome] para [cenário]
- Nova regra [código]: [descrição]

### Alterado
- Regra [código]: [o que mudou e por quê]
- Especialista [nome]: [refinamento de responsabilidades]

### Removido
- [Item removido]: [justificativa]

### Corrigido
- [Arquivo]: [o que foi corrigido]

### Segurança
- [Vulnerabilidade corrigida ou proteção adicionada]
```

---

## Changelog

### [1.0.0] — 2026-06-28

**Versão inicial do Claude Engineering Framework**

#### Adicionado — Estrutura Base
- `CLAUDE.md`: documento central com filosofia, princípios e 40+ regras organizadas por área
- `README.md`: visão geral do framework, fases de implementação e guias de uso

#### Adicionado — Padrões (11 arquivos)
- `standards/arquitetura.md`: arquitetura em camadas, separação de responsabilidades, fronteiras de módulos
- `standards/estrutura-pastas.md`: estrutura de diretórios e convenções de nomenclatura de arquivos
- `standards/html.md`: HTML5 semântico, acessibilidade, ARIA, padrões BEM
- `standards/css.md`: CSS Custom Properties, BEM, mobile-first, restrições de uso
- `standards/javascript.md`: Vanilla JS, ES Modules, async/await, JSDoc obrigatório
- `standards/supabase.md`: inicialização do cliente, padrões RLS, Edge Functions, Realtime
- `standards/sql.md`: convenções de nomenclatura, índices, padrões de query, performance
- `standards/documentacao.md`: o que documentar, formato JSDoc, READMEs de módulo
- `standards/commits.md`: Conventional Commits, regras de escopo, exemplos
- `standards/versionamento.md`: SemVer, changelog, estratégia de branches
- `standards/nomenclatura.md`: nomes de arquivos, variáveis, funções, classes, constantes

#### Adicionado — Workflows (6 arquivos)
- `workflows/nova-feature.md`: Negócio → Arquitetura → Implementação → Revisão → QA → Deploy
- `workflows/bug.md`: Reporte → Reprodução → Diagnóstico → Correção → Teste → Deploy
- `workflows/refatoracao.md`: Auditoria → Plano → Implementação → Validação → Documentação
- `workflows/migration.md`: Planejamento → SQL → Revisão → Teste → Aplicação → Validação
- `workflows/deploy.md`: Pre-flight → Build → Deploy → Smoke Test → Monitoramento
- `workflows/documentacao.md`: Auditoria → Escrita → Revisão → Publicação

#### Adicionado — Especialistas (14 arquivos)
- `skills/business-architect.md`: requisitos de negócio para specs técnicas
- `skills/software-architect.md`: design de sistema e decisões arquiteturais
- `skills/supabase-specialist.md`: configuração Supabase, RLS, Edge Functions
- `skills/vanilla-js-engineer.md`: frontend em JS puro, ES modules, DOM
- `skills/pwa-specialist.md`: service workers, manifests, offline-first
- `skills/mobile-ux-specialist.md`: experiência mobile, toque, responsividade
- `skills/security-reviewer.md`: OWASP, segurança de auth, validação de inputs
- `skills/postgresql-performance.md`: otimização de queries, indexação
- `skills/code-reviewer.md`: qualidade de código, padrões, legibilidade
- `skills/qa-engineer.md`: estratégia de testes, casos de teste, regressão
- `skills/business-rules-auditor.md`: validação de implementação vs regras de negócio
- `skills/documentation-engineer.md`: documentação técnica, runbooks, changelogs
- `skills/product-owner.md`: priorização, critérios de aceite
- `skills/technical-critic.md`: advogado do diabo, identificação de riscos

#### Adicionado — Prompts (12 arquivos)
- Prompts estruturados para: nova-feature, nova-tela, novo-componente, nova-migration, nova-api, nova-tabela, refatoracao, revisao-completa, auditoria, deploy, correcao-bugs, atualizacao-documentacao

#### Adicionado — Checklists (11 arquivos)
- Checklists para: frontend, backend, supabase, banco, performance, segurança, ux, pwa, deploy, documentação, qa

#### Adicionado — Templates (11 arquivos)
- Templates para: feature, migration, tela, componente, tabela, api, pull-request, bug-report, changelog, documentação, relatório-técnico

#### Adicionado — Governança (7 arquivos)
- `governance/mapa-especialistas.md`: diagrama Mermaid dos 14 especialistas
- `governance/mapa-workflows.md`: diagrama Mermaid dos 6 workflows
- `governance/mapa-dependencias.md`: diagrama Mermaid de dependências entre padrões, skills e workflows
- `governance/boas-praticas.md`: melhores práticas consolidadas de todas as áreas
- `governance/anti-padroes.md`: anti-padrões a evitar com exemplos
- `governance/erros-comuns.md`: erros comuns e como identificar e corrigir
- `governance/como-evoluir.md`: processo para evoluir o framework

#### Configuração Inicial
- Estabelecidas 8 Regras Obrigatórias (RO-01 a RO-08)
- Definidos 7 Princípios de Engenharia (P1 a P8)
- Definidas regras por área: Arquitetura (RA), Frontend (RF), Backend (RB), Supabase (RS), Documentação (RD), Migrations (RM), Revisão (RR), Segurança (RSeg), Performance (RP)

---

## Roadmap de Versões Futuras

### v1.1.0 — Planejado
- [ ] Especialista: `devops-engineer.md` para CI/CD e infraestrutura
- [ ] Workflow: `onboarding.md` para novos membros do time
- [ ] Checklist: `acessibilidade.md` com critérios WCAG detalhados
- [ ] Integração com GitHub Actions para verificação automática de checklists

### v1.2.0 — Planejado
- [ ] Especialista: `data-analyst.md` para análise de dados e relatórios
- [ ] Template: `adr.md` para Architecture Decision Records
- [ ] Padrão: `testes.md` com estratégias de teste por camada
- [ ] Prompt: `adr.md` para criação guiada de decisões arquiteturais

### v2.0.0 — Visão de Longo Prazo
- [ ] Suporte a múltiplos projetos com configuração por projeto
- [ ] Sistema de métricas de aderência ao framework
- [ ] Integração com ferramentas de análise estática de código
- [ ] Dashboard de saúde do projeto baseado nos checklists

---

## Processo de Release

1. **Proposta**: abra issue com label `framework-evolution`
2. **Discussão**: mínimo 3 dias para feedback do time
3. **Aprovação**: tech lead aprova formalmente
4. **Implementação**: crie branch `framework/vX.Y.Z`
5. **Review**: PR com diff do framework para revisão
6. **Merge**: merge para `main` após aprovação
7. **Tag**: crie tag `framework-vX.Y.Z` no git
8. **Comunicação**: notifique o time sobre as mudanças

---

## Compatibilidade Entre Versões

| Versão Framework | Versão Supabase | Versão Node | Versão Browsers |
|---|---|---|---|
| 1.0.0 | >= 2.0 | >= 18 LTS | ES2022+ |

# Claude Engineering Framework — Visão Geral

> Framework completo de engenharia de software para projetos com Supabase, Vanilla JS e PWA, operado com assistência do Claude AI.

---

## Objetivo do Framework

O Claude Engineering Framework (CEF) é um sistema estruturado de padrões, workflows, especialistas e checklists que garante **consistência, qualidade e segurança** em todos os aspectos do desenvolvimento de software.

O framework resolve os seguintes problemas:

- **Inconsistência de padrões**: diferentes desenvolvedores aplicando convenções diferentes
- **Decisões não documentadas**: escolhas arquiteturais perdidas no tempo
- **Falta de processo**: implementações ad-hoc sem revisão adequada
- **Silos de conhecimento**: dependência de indivíduos para áreas específicas
- **Débito técnico acumulado**: ausência de critérios claros de qualidade

---

## Estrutura do Framework

```
.claude/
├── CLAUDE.md                    # Cérebro do projeto — regras e filosofia
├── README.md                    # Este arquivo
├── Framework Evolution.md       # Histórico de versões do framework
│
├── standards/                   # Padrões técnicos por área
│   ├── arquitetura.md
│   ├── estrutura-pastas.md
│   ├── html.md
│   ├── css.md
│   ├── javascript.md
│   ├── supabase.md
│   ├── sql.md
│   ├── documentacao.md
│   ├── commits.md
│   ├── versionamento.md
│   └── nomenclatura.md
│
├── workflows/                   # Processos passo a passo
│   ├── nova-feature.md
│   ├── bug.md
│   ├── refatoracao.md
│   ├── migration.md
│   ├── deploy.md
│   └── documentacao.md
│
├── docs/                        # Documentação geral
│   └── introducao.md
│
├── skills/                      # Especialistas virtuais (14 no total)
│   ├── business-architect.md
│   ├── software-architect.md
│   ├── supabase-specialist.md
│   ├── vanilla-js-engineer.md
│   ├── pwa-specialist.md
│   ├── mobile-ux-specialist.md
│   ├── security-reviewer.md
│   ├── postgresql-performance.md
│   ├── code-reviewer.md
│   ├── qa-engineer.md
│   ├── business-rules-auditor.md
│   ├── documentation-engineer.md
│   ├── product-owner.md
│   └── technical-critic.md
│
├── prompts/                     # Prompts estruturados para tarefas comuns
│   ├── nova-feature.md
│   ├── nova-tela.md
│   ├── novo-componente.md
│   ├── nova-migration.md
│   ├── nova-api.md
│   ├── nova-tabela.md
│   ├── refatoracao.md
│   ├── revisao-completa.md
│   ├── auditoria.md
│   ├── deploy.md
│   ├── correcao-bugs.md
│   └── atualizacao-documentacao.md
│
├── checklists/                  # Checklists de qualidade por área
│   ├── frontend.md
│   ├── backend.md
│   ├── supabase.md
│   ├── banco.md
│   ├── performance.md
│   ├── seguranca.md
│   ├── ux.md
│   ├── pwa.md
│   ├── deploy.md
│   ├── documentacao.md
│   └── qa.md
│
├── templates/                   # Templates para artefatos comuns
│   ├── feature.md
│   ├── migration.md
│   ├── tela.md
│   ├── componente.md
│   ├── tabela.md
│   ├── api.md
│   ├── pull-request.md
│   ├── bug-report.md
│   ├── changelog.md
│   ├── documentacao.md
│   └── relatorio-tecnico.md
│
└── governance/                  # Governança e mapas do framework
    ├── mapa-especialistas.md
    ├── mapa-workflows.md
    ├── mapa-dependencias.md
    ├── boas-praticas.md
    ├── anti-padroes.md
    ├── erros-comuns.md
    └── como-evoluir.md
```

---

## Fases de Implementação

### Fase 1 — Fundação (Semanas 1-2)
**Objetivo**: Estabelecer os padrões básicos e garantir que toda a equipe os conhece.

Atividades:
- Leitura e assinatura do CLAUDE.md pela equipe
- Configuração do ambiente de desenvolvimento com os padrões
- Treinamento nos workflows básicos (nova-feature, bug)
- Configuração do CI com verificações automáticas

Critérios de conclusão:
- [ ] Todos os membros do time leram o CLAUDE.md
- [ ] Pipeline CI configurada com linting e testes
- [ ] Primeiro PR seguindo o processo completo aprovado
- [ ] Checklists integradas ao template de PR

### Fase 2 — Consolidação (Semanas 3-6)
**Objetivo**: Integrar os workflows no dia a dia e começar a usar os especialistas.

Atividades:
- Uso consistente dos workflows em todas as features
- Ativação dos especialistas para decisões técnicas
- Revisões de código usando os checklists
- Primeiras migrations seguindo o processo completo

Critérios de conclusão:
- [ ] 100% dos PRs seguindo o workflow de nova-feature
- [ ] Pelo menos 3 especialistas ativos em revisões
- [ ] Zero violações de regras obrigatórias (RO-*)
- [ ] Documentação atualizada para todos os módulos existentes

### Fase 3 — Maturidade (Semanas 7-12)
**Objetivo**: Otimizar processos e identificar gaps no framework.

Atividades:
- Retrospectivas mensais sobre eficácia dos padrões
- Identificação de anti-padrões emergentes
- Refinamento dos prompts baseado em uso real
- Adição de novos especialistas conforme necessidade

Critérios de conclusão:
- [ ] Tempo médio de code review < 4 horas
- [ ] Zero bugs críticos em produção por 30 dias
- [ ] Framework evoluído com pelo menos uma melhoria documentada
- [ ] Onboarding de novos membros < 1 semana

### Fase 4 — Evolução Contínua (Ongoing)
**Objetivo**: Manter o framework como um ativo vivo e relevante.

Atividades:
- Revisão trimestral de todos os padrões
- Atualização do Framework Evolution.md a cada mudança
- Compartilhamento de aprendizados com a comunidade
- Extensão do framework para novas áreas conforme necessidade

---

## Como Usar o Framework

### Para Desenvolvedores

1. **Antes de iniciar qualquer tarefa**: leia o prompt correspondente em `prompts/`
2. **Durante o desenvolvimento**: consulte os padrões em `standards/`
3. **Antes de abrir um PR**: preencha os checklists relevantes em `checklists/`
4. **Para decisões complexas**: ative os especialistas em `skills/`

### Para o Claude

1. **Início de sessão**: releia o CLAUDE.md para atualizar contexto
2. **Ao receber uma tarefa**: identifique qual prompt e workflow aplicar
3. **Ao escrever código**: verifique os padrões da área específica
4. **Ao revisar**: use os checklists como guia sistemático
5. **Ao fazer recomendações**: referencie o padrão ou regra específica

### Para Tech Leads

1. **Onboarding**: guie novos membros pelas Fases 1 e 2
2. **Revisões**: use os especialistas para perspectivas especializadas
3. **Evolução**: siga o processo em `governance/como-evoluir.md`
4. **Auditorias**: use os workflows de auditoria trimestralmente

---

## Como Estender o Framework

### Adicionando um Novo Padrão

1. Crie o arquivo em `standards/nome-do-padrao.md`
2. Siga a estrutura: Objetivo, Regras, Exemplos, Anti-padrões
3. Referencie o padrão no CLAUDE.md se for obrigatório
4. Atualize os checklists relevantes para incluir as novas verificações
5. Documente a mudança no `Framework Evolution.md`

### Adicionando um Novo Especialista

1. Crie o arquivo em `skills/nome-do-especialista.md`
2. Siga a estrutura exata dos 9 campos obrigatórios
3. Defina claramente o que o especialista NÃO faz (evitar sobreposição)
4. Atualize o `governance/mapa-especialistas.md` com o novo nó
5. Crie ou atualize prompts que ativem o novo especialista

### Adicionando um Novo Workflow

1. Crie o arquivo em `workflows/nome-do-workflow.md`
2. Inclua: Objetivo, Pré-requisitos, Passos, Skills envolvidas, Critérios de conclusão
3. Crie o prompt correspondente em `prompts/`
4. Atualize o `governance/mapa-workflows.md`

---

## Princípios de Governança

- **Consenso antes de mudança**: alterações em regras obrigatórias requerem aprovação do tech lead
- **Versionamento semântico**: o framework segue semver (veja Framework Evolution.md)
- **Retrocompatibilidade**: mudanças breaking são feitas em major versions com período de transição
- **Documentação first**: toda mudança é documentada antes de ser implementada
- **Revisão periódica**: todo o framework é revisado trimestralmente

---

## Contato e Contribuições

Para propor mudanças no framework:
1. Abra uma issue com o label `framework-evolution`
2. Descreva o problema que a mudança resolve
3. Proponha a solução com exemplos concretos
4. Aguarde revisão do tech lead antes de implementar

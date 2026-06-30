# Workflow: Nova Feature

---

## Objetivo

Guiar o desenvolvimento de uma nova funcionalidade desde o requisito de negócio até o deploy em produção, garantindo qualidade, segurança e documentação adequadas.

---

## Pré-requisitos

- [ ] Issue/ticket criado com descrição clara do problema de negócio
- [ ] Aprovação do Product Owner para o escopo
- [ ] Branch `main` atualizada localmente
- [ ] Ambiente de desenvolvimento funcionando

---

## Passos Detalhados

### Fase 1 — Negócio e Requisitos

**Responsável**: Business Architect + Product Owner

**Passo 1.1 — Entender o problema de negócio**
- Leia a issue/ticket completamente
- Identifique o problema que está sendo resolvido (não a solução)
- Liste as partes interessadas afetadas
- Identifique métricas de sucesso

**Passo 1.2 — Definir critérios de aceite**
- Escreva critérios de aceite em formato "Dado... Quando... Então..."
- Inclua casos de borda explicitamente
- Defina o que está FORA do escopo
- Valide com o PO antes de prosseguir

**Passo 1.3 — Análise de impacto**
- Identifique sistemas e módulos afetados
- Verifique conflitos com features em desenvolvimento
- Estime impacto em performance e segurança

**Entregável**: Documento de requisitos na issue (comentário estruturado)

---

### Fase 2 — Arquitetura e Design

**Responsável**: Software Architect + Technical Critic

**Passo 2.1 — Design da solução**
- Defina quais módulos serão criados ou modificados
- Estabeleça contratos de interface (assinaturas de funções, estrutura de dados)
- Identifique necessidades de banco de dados (novas tabelas, colunas, índices)
- Mapeie as Edge Functions necessárias

**Passo 2.2 — Revisão crítica do design**
- Technical Critic avalia riscos e alternativas
- Questione premissas do design
- Identifique pontos de falha
- Valide escalabilidade e manutenibilidade

**Passo 2.3 — ADR (se necessário)**
- Se a decisão for arquiteturalmente significativa, crie um ADR
- Documente alternativas consideradas e trade-offs

**Passo 2.4 — Aprovação do design**
- Apresente o design para o tech lead
- Incorpore feedback
- Obtenha aprovação formal antes de implementar

**Entregável**: Diagrama/descrição do design aprovado, ADR se aplicável

---

### Fase 3 — Implementação

**Responsável**: Vanilla JS Engineer + Supabase Specialist

**Passo 3.1 — Criar a branch**
```bash
git checkout main
git pull origin main
git checkout -b feature/NNN-descricao-curta
```

**Passo 3.2 — Migrations de banco (se necessário)**
- Siga o workflow de `migration.md`
- Crie migrations antes de implementar a camada de dados
- Teste as migrations localmente

**Passo 3.3 — Implementar camada de dados**
- Crie/atualize os repositórios
- Implemente as políticas RLS no Supabase
- Crie as Edge Functions necessárias

**Passo 3.4 — Implementar lógica de negócio**
- Siga os padrões de `standards/javascript.md`
- Implemente validações robustas
- Adicione JSDoc em todas as funções públicas
- Escreva funções pequenas e focadas

**Passo 3.5 — Implementar UI**
- Siga os padrões de `standards/html.md` e `standards/css.md`
- Garanta acessibilidade (WCAG AA)
- Implemente mobile-first
- Adicione loading states e error states

**Passo 3.6 — Commits frequentes**
- Faça commits atômicos seguindo Conventional Commits
- Não acumule grandes mudanças em um único commit
- Push para o remoto pelo menos uma vez por dia

**Entregável**: Código implementado com commits organizados

---

### Fase 4 — Revisão

**Responsável**: Code Reviewer + Security Reviewer

**Passo 4.1 — Self-review antes do PR**
- Revise seu próprio código com olhos críticos
- Execute os checklists relevantes:
  - `checklists/frontend.md`
  - `checklists/backend.md`
  - `checklists/supabase.md` (se aplicável)
  - `checklists/seguranca.md`

**Passo 4.2 — Criar o PR**
- Use o template em `templates/pull-request.md`
- Descreva o que foi feito, não como
- Inclua capturas de tela para mudanças visuais
- Marque o PR como "Ready for Review"

**Passo 4.3 — Code Review**
- Code Reviewer avalia qualidade e padrões
- Security Reviewer verifica aspectos de segurança
- Responda a todos os comentários (mesmo que seja para discordar)
- Faça as correções necessárias

**Passo 4.4 — Aprovação**
- Mínimo 1 aprovação (2 para features críticas)
- Todos os checks do CI devem estar verdes
- Nenhum conflito pendente

**Entregável**: PR aprovado e pronto para merge

---

### Fase 5 — QA

**Responsável**: QA Engineer

**Passo 5.1 — Testes funcionais**
- Execute todos os critérios de aceite definidos na Fase 1
- Teste casos de borda identificados
- Teste em múltiplos browsers (Chrome, Firefox, Safari)
- Teste em dispositivos móveis (iOS e Android)

**Passo 5.2 — Testes de regressão**
- Verifique que funcionalidades existentes não foram quebradas
- Execute os testes automatizados
- Verifique os fluxos principais da aplicação

**Passo 5.3 — Validação de performance**
- Execute Lighthouse na feature nova
- Verifique métricas de Core Web Vitals
- Identifique regressões de performance

**Passo 5.4 — Aprovação de QA**
- QA Engineer sinaliza aprovação na issue
- Documenta qualquer limitação conhecida

**Entregável**: Aprovação formal de QA

---

### Fase 6 — Deploy

**Responsável**: Developer + Tech Lead

**Passo 6.1 — Pré-deploy**
- Siga o workflow em `workflows/deploy.md`
- Verifique o checklist em `checklists/deploy.md`
- Comunique o deploy para o time

**Passo 6.2 — Merge e Deploy**
- Merge do PR (squash ou merge commit, conforme política)
- CI/CD executa automaticamente
- Monitore o pipeline

**Passo 6.3 — Verificação pós-deploy**
- Execute smoke tests em produção
- Monitore logs por 30 minutos
- Verifique métricas de erro

**Passo 6.4 — Atualizar documentação**
- Marque a issue como concluída
- Atualize o CHANGELOG.md em `[Unreleased]`
- Comunique o time sobre a nova feature

**Entregável**: Feature em produção, documentada e monitorada

---

## Skills Envolvidas

| Fase | Skills Primárias | Skills de Apoio |
|---|---|---|
| Negócio | Business Architect, Product Owner | Technical Critic |
| Arquitetura | Software Architect | Technical Critic, Security Reviewer |
| Implementação | Vanilla JS Engineer, Supabase Specialist | PostgreSQL Performance |
| Revisão | Code Reviewer, Security Reviewer | Business Rules Auditor |
| QA | QA Engineer | Business Rules Auditor |
| Deploy | (desenvolvedor + tech lead) | Documentation Engineer |

---

## Critérios de Conclusão

- [ ] Todos os critérios de aceite passam
- [ ] Checklists de qualidade preenchidos e aprovados
- [ ] Code review aprovado (mínimo 1 revisor)
- [ ] QA aprovou a feature
- [ ] CI/CD verde em produção
- [ ] CHANGELOG.md atualizado
- [ ] Issue marcada como concluída
- [ ] Documentação técnica atualizada (JSDoc, README)
- [ ] Nenhum `console.log` de debug no código
- [ ] Zero violações de regras obrigatórias (RO-*)

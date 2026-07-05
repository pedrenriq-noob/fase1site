# Introdução ao Claude Engineering Framework

---

## Propósito

O Claude Engineering Framework (CEF) é um sistema estruturado de engenharia de software desenvolvido para garantir **consistência, qualidade e segurança** em projetos que utilizam Supabase, Vanilla JavaScript e Progressive Web Apps.

Este framework foi criado a partir de experiências práticas de desenvolvimento e consolida melhores práticas em um sistema coerente e navegável.

---

## Escopo

O framework cobre:

- **Padrões técnicos**: HTML, CSS, JavaScript, SQL, Supabase, arquitetura
- **Processos**: workflows para features, bugs, migrations, deploys
- **Especialistas virtuais**: 14 perspectivas especializadas para tomada de decisão
- **Ferramentas**: prompts, checklists e templates prontos para uso
- **Governança**: como o framework evolui e se mantém relevante

O framework NÃO cobre:
- Infraestrutura de servidor (exceto Supabase/Edge Functions)
- Ferramentas de build específicas (decisão do projeto)
- Design de produto (UX, UI design, brand)
- Gerenciamento de projetos (scrum, kanban, etc.)

---

## Como Navegar

### Se você é novo no projeto
1. Comece pelo `CLAUDE.md` — entenda a filosofia e regras
2. Leia o `README.md` — entenda a estrutura do framework
3. Consulte `standards/` para os padrões da área em que vai trabalhar
4. Use o prompt correspondente à sua tarefa em `prompts/`

### Se você vai implementar uma feature
1. Leia `prompts/nova-feature.md`
2. Siga `workflows/nova-feature.md`
3. Consulte os padrões relevantes em `standards/`
4. Ative os especialistas necessários de `skills/`
5. Use os checklists de `checklists/` antes do PR

### Se você vai revisar código
1. Use os checklists em `checklists/` como guia
2. Ative o especialista `skills/code-reviewer.md`
3. Para segurança: `skills/security-reviewer.md`
4. Para performance: `skills/postgresql-performance.md`

### Se você vai fazer uma migration
1. Siga `workflows/migration.md` passo a passo
2. Consulte `standards/sql.md` para convenções
3. Use o template `templates/migration.md`
4. Ative `skills/supabase-specialist.md`

### Se você é o tech lead
1. Use `governance/` para manter o framework
2. Consulte `governance/como-evoluir.md` para adicionar conteúdo
3. Revise `Framework Evolution.md` para histórico de mudanças
4. Use `governance/boas-praticas.md` para treinamentos

---

## Estrutura de Referência Cruzada

O framework foi projetado com referências cruzadas:

```
Você tem uma tarefa
        ↓
    prompts/        ← Qual prompt usar?
        ↓
    workflows/      ← Qual processo seguir?
        ↓
    skills/         ← Quais especialistas ativar?
        ↓
    standards/      ← Quais padrões consultar?
        ↓
    checklists/     ← O que verificar antes de entregar?
        ↓
    templates/      ← Qual template usar para os artefatos?
```

---

## Glossário

**ADR** (Architecture Decision Record): documento que registra uma decisão arquitetural significativa com contexto, decisão e consequências.

**BEM** (Block Element Modifier): metodologia de nomenclatura de classes CSS que cria nomes previsíveis e sem conflito de especificidade.

**Core Web Vitals**: métricas do Google para experiência do usuário: LCP (carregamento), FID (interatividade), CLS (estabilidade visual).

**Edge Function**: função serverless executada na borda da rede (CDN), próxima ao usuário. No Supabase, baseada em Deno.

**RLS** (Row Level Security): mecanismo do PostgreSQL que filtra linhas de tabelas baseado em políticas de segurança, usado para multi-tenancy e isolamento de dados.

**SemVer** (Semantic Versioning): sistema de versionamento MAJOR.MINOR.PATCH com regras claras sobre quando incrementar cada parte.

**Skill/Especialista**: persona virtual com responsabilidades bem definidas que representa uma perspectiva especializada na revisão e implementação de código.

**Smoke Test**: conjunto mínimo de testes rápidos que verificam se os fluxos principais da aplicação estão funcionando após um deploy.

**Workflow**: processo passo a passo documentado para uma tarefa recorrente (nova feature, bug fix, deploy, etc.).

---

## Princípios de Design do Framework

O framework foi projetado seguindo estes princípios:

1. **Progressividade**: use apenas o que precisa — não precisa seguir tudo ao mesmo tempo
2. **Referência cruzada**: componentes do framework se referenciam mutuamente
3. **Vivacidade**: o framework muda com o projeto — não é estático
4. **Clareza sobre completude**: melhor uma regra clara do que dez regras vagas
5. **Exemplos práticos**: cada padrão tem exemplos corretos e anti-padrões

---

## Contribuindo com o Framework

O framework pertence ao time. Para contribuir:

1. Identifique um problema ou lacuna
2. Abra uma issue com label `framework-evolution`
3. Siga o processo em `governance/como-evoluir.md`
4. Sua melhoria pode se tornar parte permanente do framework

Todo time member é bem-vindo a propor melhorias. Boas propostas vêm de experiências reais de desenvolvimento — não de teoria.

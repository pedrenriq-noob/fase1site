# CLAUDE.md — Cérebro do Projeto

> Este arquivo define a filosofia, princípios e regras que guiam todas as decisões de engenharia deste projeto. O Claude deve ler e internalizar este documento antes de qualquer interação técnica.

---

## Filosofia do Projeto

Este projeto é construído sobre a convicção de que **software de qualidade nasce de disciplina, clareza e responsabilidade compartilhada**. Cada linha de código deve ter propósito claro, cada decisão arquitetural deve ser justificada, e cada entrega deve agregar valor real ao usuário final.

A filosofia central é:

- **Clareza antes de cleverness**: código legível supera código inteligente
- **Simplicidade deliberada**: a solução mais simples que resolve o problema corretamente é a melhor
- **Qualidade não é opcional**: não existe "depois eu melhoro" — a qualidade é construída desde o início
- **Responsabilidade coletiva**: o código pertence ao time, não ao indivíduo
- **Evolução contínua**: o sistema deve ser fácil de modificar, não apenas de criar

---

## Princípios de Engenharia

### P1 — Separação de Responsabilidades
Cada módulo, função e componente deve ter **uma única responsabilidade bem definida**. Misturar regras de negócio com lógica de apresentação é proibido.

### P2 — Contratos Explícitos
Interfaces entre módulos devem ser explícitas e documentadas. Dependências implícitas são fontes de bugs silenciosos.

### P3 — Falhe Rapidamente
Valide entradas na borda do sistema. Não propague dados inválidos para camadas internas.

### P4 — Observabilidade
O sistema deve ser observável por padrão. Logs estruturados, métricas e rastreamento não são opcionais.

### P5 — Segurança por Design
Segurança não é uma camada adicionada depois — é parte integral do design desde o início.

### P6 — Performance Consciente
Otimize onde há evidência de problema, não onde há suspeita. Use EXPLAIN ANALYZE antes de criar índices.

### P7 — Documentação como Código
Documentação desatualizada é pior que ausente. Mantenha docs próximos ao código que descrevem.

### P8 — Reversibilidade
Prefira decisões reversíveis. Quando não for possível, documente os trade-offs explicitamente.

---

## Regras Obrigatórias

> Estas regras não têm exceções. Violações devem ser corrigidas antes de qualquer merge.

### RO-01: Nenhum segredo no código
Jamais faça commit de chaves de API, senhas, tokens ou qualquer dado sensível. Use variáveis de ambiente.

### RO-02: Nenhuma migration sem revisão
Toda migration de banco de dados deve ser revisada por pelo menos um desenvolvedor sênior antes de ser aplicada em produção.

### RO-03: RLS obrigatório no Supabase
Toda tabela no Supabase deve ter Row Level Security habilitado. Tabelas sem RLS ativo são uma violação de segurança.

### RO-04: Commits seguem Conventional Commits
Todos os commits devem seguir o padrão Conventional Commits. Commits fora do padrão serão rejeitados no CI.

### RO-05: Nenhum `console.log` em produção
Remova todos os `console.log` de debug antes de qualquer deploy. Use o sistema de logging estruturado.

### RO-06: Testes antes de deploy
Nenhum deploy para produção sem que os testes automáticos passem. O CI é a lei.

### RO-07: Code review obrigatório
Nenhum PR pode ser mergeado sem aprovação de pelo menos um revisor. Auto-merge é proibido.

### RO-08: Branches protegidas
As branches `main` e `production` são protegidas. Pushes diretos são bloqueados por configuração.

---

## Regras de Arquitetura

### RA-01: Arquitetura em Camadas
O sistema segue uma arquitetura em camadas estrita:
```
Apresentação → Lógica de Negócio → Acesso a Dados → Banco de Dados
```
Camadas só se comunicam com a camada imediatamente adjacente. Pular camadas é proibido.

### RA-02: Inversão de Dependência
Módulos de alto nível não dependem de módulos de baixo nível. Ambos dependem de abstrações.

### RA-03: Composição sobre Herança
Prefira composição de comportamentos a hierarquias de herança profundas.

### RA-04: Módulos com Fronteiras Claras
Cada módulo expõe uma interface pública mínima. Internals são privados e não devem ser acessados diretamente.

### RA-05: Dados Imutáveis por Padrão
Prefira estruturas de dados imutáveis. Mutação deve ser explícita e localizada.

### RA-06: Sem Dependências Circulares
Dependências circulares entre módulos são proibidas. Use um grafo de dependências para verificar.

### RA-07: Configuração Externalizada
Toda configuração que varia por ambiente deve ser externalizada. Nenhum valor hardcoded de ambiente no código.

---

## Regras para Frontend

### RF-01: HTML Semântico
Use elementos HTML com significado semântico correto. Não use `<div>` onde `<article>`, `<section>`, `<nav>` ou `<button>` são apropriados.

### RF-02: CSS Custom Properties
Use CSS Custom Properties para valores reutilizáveis (cores, espaçamentos, tipografia). Não duplique valores.

### RF-03: BEM para Classes CSS
Siga a metodologia BEM (Block__Element--Modifier) para nomenclatura de classes CSS.

### RF-04: Mobile-First
Escreva CSS mobile-first com media queries para telas maiores. Nunca escreva CSS desktop-first.

### RF-05: Sem !important
O uso de `!important` é proibido exceto em classes utilitárias de override explicitamente documentadas.

### RF-06: Acessibilidade Obrigatória
Todo componente interativo deve ter atributos ARIA adequados, suporte a teclado e contraste mínimo WCAG AA.

### RF-07: JavaScript Vanilla
Este projeto usa JavaScript puro (vanilla JS). Nenhum framework JavaScript é permitido sem aprovação arquitetural explícita.

### RF-08: ES Modules
Use ES Modules (`import`/`export`) para organização de código. CommonJS (`require`) é proibido no frontend.

### RF-09: Sem Dependências CDN em Produção
Em produção, não carregue scripts de CDNs externas que não estejam sob controle do projeto.

---

## Regras para Backend

### RB-01: Edge Functions Stateless
Edge Functions do Supabase devem ser stateless. Estado persistente vai para o banco de dados.

### RB-02: Validação na Entrada
Valide todos os inputs na borda da Edge Function antes de qualquer processamento.

### RB-03: Erros Estruturados
Retorne erros com estrutura consistente: `{ error: { code, message, details } }`.

### RB-04: Sem Lógica de Negócio em SQL
SQL deve ser declarativo. Lógica de negócio complexa pertence à camada de aplicação.

### RB-05: Timeouts Explícitos
Toda chamada externa (APIs, banco) deve ter timeout configurado explicitamente.

### RB-06: Idempotência
Operações de escrita devem ser idempotentes onde possível. Use IDs únicos para detectar duplicatas.

---

## Regras para Supabase

### RS-01: RLS em Todas as Tabelas
Toda tabela pública deve ter RLS habilitado e políticas definidas. Sem exceções.

### RS-02: Políticas Mínimas
Defina políticas RLS com o menor privilégio possível. Comece negando tudo e libere apenas o necessário.

### RS-03: Auth via Supabase
Use exclusivamente o sistema de autenticação do Supabase. Não implemente auth customizado paralelo.

### RS-04: Realtime Controlado
Habilite Realtime apenas nas tabelas que realmente precisam. Não habilite globalmente.

### RS-05: Storage com Políticas
Buckets de Storage devem ter políticas de acesso configuradas. Buckets públicos são revisados caso a caso.

### RS-06: Migrations Versionadas
Use o sistema de migrations do Supabase. Nunca altere tabelas diretamente no SQL Editor em produção.

### RS-07: Secrets no Vault
Use o Supabase Vault para armazenar secrets. Nunca armazene secrets em variáveis de ambiente de Edge Functions sem o Vault.

---

## Regras para Documentação

### RD-01: JSDoc Obrigatório
Toda função pública deve ter JSDoc com descrição, parâmetros e retorno documentados.

### RD-02: README por Módulo
Módulos complexos devem ter um README.md explicando propósito, interface pública e exemplos de uso.

### RD-03: Decisões Arquiteturais em ADR
Decisões arquiteturais significativas devem ser registradas como Architecture Decision Records (ADRs).

### RD-04: Changelog Atualizado
O CHANGELOG.md deve ser atualizado a cada release seguindo o formato Keep a Changelog.

### RD-05: Código Auto-Documentado
Nomes de variáveis, funções e classes devem ser suficientemente descritivos. Comentários explicam o "porquê", não o "o quê".

---

## Regras para Migrations

### RM-01: Migrations São Imutáveis
Uma migration aplicada nunca é modificada. Crie uma nova migration para corrigir problemas.

### RM-02: Migrations São Reversíveis
Sempre que possível, escreva a migration `down` correspondente.

### RM-03: Dados Existentes
Migrations que alteram dados existentes devem ser testadas com volume real de dados antes de produção.

### RM-04: Naming de Migrations
Migrations seguem o padrão: `YYYYMMDD_HHMMSS_descricao_curta.sql`.

### RM-05: Sem Migrations Destrutivas sem Aprovação
Operações `DROP TABLE`, `DROP COLUMN`, `TRUNCATE` requerem aprovação de dois desenvolvedores sênior.

---

## Regras para Revisão

### RR-01: Checklist de Revisão
Todo PR deve ter o checklist de revisão preenchido pelo autor antes de solicitar review.

### RR-02: Revisão de Segurança
PRs que tocam em autenticação, autorização ou dados sensíveis requerem revisão de segurança específica.

### RR-03: Revisão de Performance
PRs que adicionam queries ao banco devem incluir o resultado do EXPLAIN ANALYZE.

### RR-04: Feedback Construtivo
Feedback em code review deve ser construtivo, específico e acionável. Comentários vagos são descartados.

### RR-05: Responsividade
O autor tem 24h para responder a comentários de revisão. Após 48h sem resposta, o PR é fechado.

---

## Regras para Segurança

### RSeg-01: OWASP Top 10
O projeto deve estar protegido contra todas as vulnerabilidades do OWASP Top 10. Auditorias regulares são obrigatórias.

### RSeg-02: Input Sanitization
Todo input de usuário deve ser sanitizado antes de uso. SQL Injection e XSS são inadmissíveis.

### RSeg-03: HTTPS Obrigatório
Toda comunicação deve usar HTTPS. HTTP é bloqueado em produção.

### RSeg-04: Headers de Segurança
A aplicação deve configurar todos os headers de segurança recomendados (CSP, HSTS, X-Frame-Options, etc.).

### RSeg-05: Autenticação Forte
Implemente MFA para contas privilegiadas. Passwords devem seguir política de complexidade.

### RSeg-06: Logs de Auditoria
Todas as ações privilegiadas devem gerar logs de auditoria imutáveis.

### RSeg-07: Dependency Scanning
Dependências são escaneadas automaticamente. Vulnerabilidades críticas bloqueiam o deploy.

---

## Regras para Performance

### RP-01: Core Web Vitals
A aplicação deve atingir pontuação "Good" em todos os Core Web Vitals (LCP < 2.5s, FID < 100ms, CLS < 0.1).

### RP-02: Budget de Bundle
O bundle JavaScript não pode exceder 200KB gzipped sem justificativa arquitetural documentada.

### RP-03: Lazy Loading
Imagens e componentes não críticos devem usar lazy loading.

### RP-04: Cache Strategy
Implemente estratégia de cache adequada para cada tipo de recurso. Service Workers para PWA.

### RP-05: Query Performance
Nenhuma query deve levar mais de 100ms em produção. Queries lentas são consideradas bugs.

### RP-06: Índices Justificados
Todo índice deve ter justificativa documentada. Índices sem uso são removidos.

---

## Convenções

### Nomenclatura
- **Arquivos**: kebab-case (`meu-componente.js`)
- **Variáveis e funções**: camelCase (`minhaVariavel`, `calcularTotal`)
- **Classes**: PascalCase (`MinhaClasse`)
- **Constantes**: SCREAMING_SNAKE_CASE (`MAX_RETRY_COUNT`)
- **Tabelas SQL**: snake_case plural (`user_profiles`)
- **Colunas SQL**: snake_case (`created_at`, `user_id`)

### Formatação
- Indentação: 2 espaços (sem tabs)
- Comprimento máximo de linha: 100 caracteres
- Ponto e vírgula: obrigatório em JavaScript
- Aspas: simples em JavaScript, duplas em HTML/SQL

### Git
- Branches: `feature/`, `fix/`, `refactor/`, `docs/`, `chore/`
- PRs: título em inglês seguindo Conventional Commits
- Commits: mensagens em inglês, corpo em português quando necessário

---

## Limitações

O Claude não deve:
- Tomar decisões arquiteturais sem consultar o arquiteto responsável
- Aplicar migrations em produção sem confirmação explícita
- Alterar políticas de RLS sem revisão de segurança
- Remover testes existentes sem justificativa documentada
- Fazer merge de PRs sem aprovação humana
- Expor dados de usuários em logs ou mensagens de erro
- Contornar validações de segurança "temporariamente"

---

## Responsabilidades do Claude

O Claude neste projeto atua como:

1. **Assistente de Implementação**: escreve código seguindo todos os padrões definidos neste framework
2. **Revisor de Qualidade**: identifica violações de padrões e sugere correções
3. **Consultor Técnico**: explica trade-offs e recomenda abordagens baseadas nos princípios do projeto
4. **Guardião dos Padrões**: recusa implementações que violem regras obrigatórias
5. **Documentador**: mantém documentação atualizada e precisa

O Claude deve sempre:
- Referenciar o padrão específico ao fazer uma recomendação
- Explicar o "porquê" de cada decisão técnica
- Sinalizar quando uma solicitação viola regras obrigatórias
- Sugerir alternativas quando não puder atender uma solicitação diretamente
- Manter consistência com decisões arquiteturais anteriores documentadas em ADRs

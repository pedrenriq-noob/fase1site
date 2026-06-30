# Parte 11 — Dependências Externas, Estrutura do Repositório, Estado Atual, Roadmap

## 22. Dependências Externas

| Serviço | Função | Módulos que dependem | Criticidade |
|---|---|---|---|
| **Supabase** (Postgres + Auth + Edge Functions + Realtime + Storage) | Backend único de todo o ecossistema (exceto Acessórios) | Todos exceto `extensions/acessorios` | 🔴 Crítica — sem ele, nada funciona |
| **Vercel** | Hospedagem estática de `apps/site`, `apps/intake-admin`, `apps/frota-ops`, roteada via `vercel.json` | Todos os 3 apps | 🔴 Crítica para acesso público |
| **GitHub** | Versionamento (`pedrenriq-noob/fase1site`), provavelmente gatilho de deploy automático na Vercel | Todo o time de desenvolvimento | 🟠 Alta (processo, não runtime) |
| **Google Sheets API** | Única integração da extensão Acessórios (OAuth2, escopo `spreadsheets`) | `extensions/acessorios` apenas | 🟡 Média — isolado, não afeta o resto |
| **Sistema legado/externo da locadora** | Fonte dos CSVs de "Contratos Abertos"/"Reservas Futuras" importados manualmente | `apps/frota-ops` (importação) | 🟠 Alta operacionalmente (processo manual crítico para manter `frota_reservas` atualizada) |
| **WhatsApp** (via link `wa.me`, não API oficial) | Canal de comunicação final com o cliente após a solicitação no site, e canal usado pela central de atendimento | `apps/site` (gera link), processo manual da central | 🟡 Média — não é uma integração de API, é só um link de deep-link |
| **Resend** | ~~Envio de e-mail de notificação ao admin~~ | **Removido nesta sessão.** `notificar-reserva` é stub | N/A — descontinuado |

### Notas sobre cada dependência

- **Supabase**: lock-in reconhecido no ADR-002. Projeto `lxfnqzuzohudqwibgdic`, região `us-west-2`, Postgres 17.
- **Vercel**: configuração de domínio/projeto Vercel **não auditada nesta sessão** (não há acesso ao dashboard Vercel a partir do repositório) — `vercel.json` define só o roteamento de paths, não o domínio nem variáveis de ambiente do projeto Vercel em si.
- **GitHub**: token de acesso pessoal que estava **vazado em texto puro** no `.git/config` do repositório `i-frotas` (`pawigufoz`) foi **revogado e o remote foi limpo nesta sessão** — ver Parte 9, item 7 da tabela de segurança.
- **Sistema legado**: nome/identidade do sistema **não documentada** em nenhum lugar do código ou da documentação encontrada — só se sabe que existe e que exporta CSV em `windows-1252` com colunas `locacao-*`/`veiculo-*`. Próximo desenvolvedor deve perguntar ao dono do produto qual é esse sistema, se há possibilidade de integração via API em vez de CSV manual.

---

## 23. Estrutura do Repositório

```
Fase 1/                                  ← raiz do monorepo (GitHub: pedrenriq-noob/fase1site)
│
├── .claude/                             ← Framework de governança Claude Code
│   ├── CLAUDE.md                          Constituição do projeto (princípios, regras obrigatórias)
│   ├── checklists/                        Checklists por área (backend, banco, deploy, frontend, performance, pwa, qa, segurança, supabase, ux)
│   ├── governance/                        Anti-padrões, boas práticas, mapas de dependência/especialistas/workflows
│   ├── prompts/                           Prompts prontos para tarefas recorrentes (nova feature, correção de bug, deploy, etc.)
│   ├── skills/                            Personas/especialistas definidos (arquiteto, revisor de código, especialista Supabase, etc.)
│   ├── standards/                         Padrões de código por linguagem/área (arquitetura, commits, CSS, HTML, JS, nomenclatura, SQL, Supabase, versionamento)
│   ├── templates/                         Templates de documento (API, bug report, changelog, componente, feature, migration, PR, etc.)
│   ├── workflows/                         Workflows documentados (bug, deploy, documentação, migration, nova feature, refatoração)
│   ├── launch.json                        Configuração de servidores de preview locais
│   └── settings.local.json                Config local da máquina (gitignored)
│
├── apps/
│   ├── site/                            ← Captação pública (HTML/CSS/JS vanilla)
│   │   ├── index.html, reserva.html
│   │   ├── script.js                      Toda a lógica do formulário multi-step + cálculo de preço client-side (estimativa)
│   │   ├── supabase.js                    Cliente Supabase + TENANT_ID hardcoded
│   │   ├── landing.css, shared.css, style.css
│   │   └── assets/                        Logos, imagens de categoria, fotos hero
│   │
│   ├── intake-admin/                    ← Back-office de solicitações
│   │   ├── index.html                     Tela de login + shell do app
│   │   ├── admin.js                       Roteamento, fetch helper, esc(), modal genérico
│   │   ├── supabase.js
│   │   ├── admin.css
│   │   ├── pages/                         Um módulo por aba: adicionais, auditoria (+ auditoria_page — nomes confusos, ver Parte 10), categorias, clientes, dashboard, locais, protecoes, reservas, sazonalidade, translados
│   │   └── assets/                        Logos
│   │
│   └── frota-ops/                       ← PWA operacional (importado do antigo repo i-frotas via git subtree)
│       ├── index.html, manifest.json, sw.js
│       ├── icons/                         icon-192.png, icon-512.png (gerados nesta sessão)
│       ├── css/                           base.css, components.css
│       ├── js/                            app.js (router), auth.js, realtime.js, supabase.js, utils.js (inclui calcularDisponibilidade — versão duplicada do algoritmo)
│       ├── pages/                         admin.js (inclui a importação CSV), dashboard.js, disponibilidade.js, patio.js, reservas.js, veiculo-detalhe.js, veiculos.js
│       └── CHANGELOG.md                   Changelog próprio deste app (separado do CHANGELOG.md raiz)
│
├── extensions/
│   ├── cotacao-rapida/                  ← Manifest V3, padrão sidebar (content.js + iframe)
│   ├── disponibilidade/                 ← Manifest V3, padrão sidebar (D.I.F — convertida nesta sessão de popup para sidebar)
│   └── acessorios/                      ← Manifest V3, popup clássico (não convertida), integração Google Sheets OAuth2
│
├── supabase/
│   └── functions/
│       ├── _shared/
│       │   ├── disponibilidade.ts         SLUG_MAP, checkDisponibilidade, calcularDisponivel, calcularSaidaLavador
│       │   └── http.ts                    errJson/okJson — padronização de resposta (criado nesta sessão)
│       ├── check-disponibilidade/
│       ├── criar-solicitacao/
│       └── notificar-reserva/             Stub (Resend removido nesta sessão)
│       (admin-user-manager existe deployada mas não está neste diretório — dívida técnica, ver Parte 10)
│
├── sql/                                  Migrations numeradas 001-021 + all_migrations.sql (consolidado) + seed.sql
│
├── docs/
│   ├── adr/                              5 ADRs (001-005)
│   ├── governance/                       Documentos legíveis de governança (Framework, Especialistas, Governança, Operação)
│   ├── handoff-tecnico/                  Este documento (12 arquivos)
│   ├── AUDITORIA_TECNICA_IGUFOZ.md       Auditoria técnica anterior (histórica)
│   ├── PROBLEMA_LOGIN_ADMIN_SEM_RESERVAS.md  Relato do bug do e-mail admin fantasma (já corrigido)
│   ├── handoff.md, handoff-frota.md      Handoffs anteriores (mais curtos que este documento)
│   └── igufoz-blueprint-texto.md, igufoz-fase1-blueprint.html  Material de planejamento/branding
│
├── .github/pull_request_template.md
├── .gitignore
├── CHANGELOG.md                          Changelog do site/admin/extensões (separado do de frota-ops)
├── package.json, package-lock.json       Dependência: @supabase/supabase-js
├── vercel.json                           Roteamento de paths para os 3 apps
└── serve-admin.cmd, serve-site.cmd       Scripts de desenvolvimento local (Windows)
```

---

## 24. Estado Atual

### ✅ Pronto e funcionando
- Site de reservas completo (4 steps, validação, cálculo de preço, integração WhatsApp).
- Back-office de solicitações (`apps/intake-admin`) com gestão de catálogo completa (categorias, proteções, adicionais, locais, sazonalidade) e dashboard.
- PWA operacional (`apps/frota-ops`) com dashboard, veículos, reservas, pátio, disponibilidade, importação CSV.
- Algoritmo de disponibilidade por pool, validado em produção (caso GRUPO J corrigido e testado nesta sessão).
- 3 extensões de navegador funcionais (2 no padrão sidebar moderno, 1 no padrão popup legado).
- RLS habilitado e funcional em todas as 19 tabelas de negócio.
- Correções de segurança críticas aplicadas e testadas em produção nesta sessão (IDOR, XSS, rate limit, formato de erro).
- Monorepo reorganizado, histórico Git preservado via `git subtree`.

### 🟡 Parcialmente implementado
- Notificação por e-mail: infraestrutura existe (trigger possivelmente ativo, Edge Function existe) mas **sem provedor configurado** — stub.
- Auditoria (`audit_log`): tabela e RLS prontas, mas não confirmado que todo fluxo relevante de fato grava nela.
- Validação de regras de negócio na borda: maioria implementada, mas faltam (janela de horário do local, limite de cadeirinhas por categoria).
- Sincronização frota↔sistema legado: funcional, mas manual (sem pipeline automático) e com bug latente de categoria (J-PREMIUM/U-UTILITARIO).

### 📋 Planejado (inferido de ADRs/comentários no código, não confirmado com o dono do produto)
- `pg_advisory_xact_lock` para eliminar a race condition de disponibilidade (ADR-003 já prescreve a solução).
- Novo provedor de e-mail (explicitamente mencionado pelo dono do produto nesta sessão: "deixei vago essa parte do email até eu pensar em uma nova plataforma").

### ❌ Descartado
- Resend como provedor de e-mail — removido deliberadamente nesta sessão.
- E-mail fantasma `admin@igufoz.com.br` como conta administrativa — removido deliberadamente nesta sessão.
- Estrutura de repositórios separados (`fase1site` + `i-frotas`) — consolidada em monorepo único nesta sessão (repositório `i-frotas`/`pawigufoz` original ainda existe intacto, não foi apagado, mas deixou de ser a estrutura ativa de trabalho).

---

## 25. Roadmap

> **Nota de honestidade**: nenhum roadmap formal foi encontrado documentado pelo dono do produto. O que segue é uma **inferência razoável** baseada nos pontos frágeis (Parte 10) e nas decisões explícitas tomadas nesta sessão — não é um compromisso confirmado, é uma recomendação de priorização técnica.

### Curto prazo (próximas semanas)
1. Corrigir a inconsistência `normalizeCategoria`/`SLUG_MAP` para J-PREMIUM/U-UTILITARIO **antes** da próxima sincronização que envolva essas categorias (Parte 10, item 4 — risco ativo e iminente).
2. Corrigir o `INSERT` não verificado em `admin-user-manager` (Parte 10, item 6).
3. Versionar `admin-user-manager` no repositório Git (Parte 10, item 5).
4. Decidir e implementar o novo provedor de e-mail para `notificar-reserva`.
5. Resolver as policies de INSERT redundantes em `solicitacoes`/`solicitacao_itens` (Parte 10, item 7).

### Médio prazo
1. Implementar `pg_advisory_xact_lock` na RPC de criação de solicitação (elimina a race condition documentada desde o ADR-003).
2. Criar migrations versionadas retroativas para `frota_veiculos`/`frota_reservas`/`frota_patios`/`frota_movimentacoes` (reconciliar `sql/` com o banco real).
3. Adicionar `tenant_id` às policies de leitura pública do catálogo (preparação para multi-tenant real).
4. Substituir os 4 pontos de `TENANT_ID` hardcoded por uma resolução dinâmica (config por domínio/deploy).
5. Validar server-side: janela de horário do local, limite de cadeirinhas por categoria.
6. Decidir o destino da tabela `categorias`/extensão Acessórios: unificar fonte de verdade ou documentar formalmente que são sistemas paralelos por design.

### Longo prazo
1. Avaliar migrar `extensions/acessorios` para o mesmo padrão sidebar+Supabase das outras duas extensões, encerrando a dependência de Google Sheets.
2. Avaliar transformar `frota_veiculos.categoria`/`frota_reservas.categoria` em foreign keys reais para `categorias`.
3. Implementar pipeline de CI/CD (testes automatizados, branch protection real, deploy gated por aprovação) — hoje inexistente.
4. Definir e implementar política de retenção/expurgo de dados (LGPD).
5. Avaliar onboarding de um segundo tenant real, validando que toda a dívida técnica multi-tenant (Parte 9/10) foi endereçada antes disso.
6. Automatizar a ponte `solicitacoes confirmada → frota_reservas` (hoje 100% manual).

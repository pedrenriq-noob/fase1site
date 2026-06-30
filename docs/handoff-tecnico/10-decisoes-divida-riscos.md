# Parte 10 — Decisões Arquiteturais, Dívida Técnica, Pontos Frágeis

## 19. Decisões Arquiteturais (ADRs)

Cinco ADRs formais existem em `docs/adr/`. Resumo crítico de cada uma (texto integral nos arquivos originais):

### ADR-001 — Vanilla JS sem framework
**Decisão**: nenhum framework de UI em lugar nenhum do frontend. **Motivação real**: zero build step (deploy estático direto), a extensão de navegador não pode depender de runtime de framework, bundle mínimo. **Alternativas descartadas**: React (build + bundle grande), Svelte (ainda exige compilação), Alpine.js (dependência CDN, violaria RF-09 do CLAUDE.md). **Trade-off aceito conscientemente**: reatividade manual, sem type-checking, funções de render tendem a crescer demais (o próprio ADR já alertava para isso — `apps/intake-admin/pages/dashboard.js` e `reservas.js`, por exemplo, têm centenas de linhas misturando template HTML em string e lógica).

### ADR-002 — Supabase como backend único
**Decisão**: Postgres + RLS + Edge Functions + Auth + Storage, tudo no Supabase. **Motivação real**: equipe pequena sem DevOps dedicado, RLS resolve autorização multi-tenant sem middleware adicional. **Trade-off aceito conscientemente**: lock-in no Supabase (migrar provider seria caro), cold start de ~200ms em Edge Functions (aceito como tolerável).

### ADR-003 — Algoritmo de disponibilidade por pool
**Decisão**: disponibilidade = veículos fisicamente livres − reservas sem placa atribuída no período (não verificação veículo-a-veículo). **Motivação real**: reservas chegam do site sem atribuição de placa; o operador atribui depois. **Risco já documentado no próprio ADR, e confirmado nesta auditoria**: condição de corrida TOCTOU (time-of-check-to-time-of-use) entre a checagem de disponibilidade e o insert da solicitação — **o ADR já prescreve a solução** (`pg_advisory_xact_lock` no RPC `inserir_solicitacao_completa`) **mas ela nunca foi implementada** (confirmado: a RPC atual, mesmo após a correção desta sessão, não usa nenhum lock). Também documenta que o offset de fuso horário `-03:00` é fixo no código (`calcularSaidaLavador`/`parseBRDate`) — frágil se o Brasil reintroduzir horário de verão.

### ADR-004 — Código compartilhado `_shared/` nas Edge Functions
**Decisão**: extrair lógica comum (`checkDisponibilidade`) para `supabase/functions/_shared/`. **Motivação real**: a primeira tentativa de importar uma function de dentro da outra (`../check-disponibilidade/index.ts`) **falhou em produção** porque o runtime Deno do Supabase não resolve imports cross-function dessa forma — `_shared/` é o padrão oficial suportado. **Trade-off aceito**: qualquer mudança em `_shared/disponibilidade.ts` exige redeploy de todas as functions que a usam (constatado nesta sessão: tivemos que reenviar o conteúdo de `_shared/` em cada um dos 3 deploys feitos).

### ADR-005 — Transição direta `solicitada → confirmada`
**Decisão**: permitir pular `em_analise` quando a solicitação já está clara. **Motivação real**: fricção operacional desnecessária reportada pelos operadores. **Trade-off aceito conscientemente**: perde rastreabilidade de "quem analisou" quando a confirmação é direta.

### Decisões não formalizadas em ADR, mas constatadas nesta auditoria
- **Remoção do Resend** (esta sessão): decisão do dono do produto, não documentada como ADR formal — deveria ser, dado que é uma mudança arquitetural real (perda de capacidade de notificação por e-mail).
- **Reorganização do monorepo** (esta sessão): consolidação de 2 repositórios Git em 1, decisão tomada nesta sessão sem ADR formal — recomenda-se criar um ADR-006 retroativo documentando essa decisão e o uso de `git subtree` para preservar histórico.

---

## 20. Dívida Técnica

Lista consolidada, incluindo achados desta sessão de auditoria que **não foram corrigidos** (fora do escopo das correções realizadas):

| # | Item | Onde | Impacto |
|---|---|---|---|
| 1 | `frota_veiculos`, `frota_reservas`, `frota_patios`, `frota_movimentacoes` nunca viraram migration versionada em `sql/` — foram criadas direto no banco | Banco vs. `sql/` | Impossível reconstruir o schema do zero só com as migrations do repositório; próximo dev pode achar que essas tabelas não existem |
| 2 | Duas funções de trigger praticamente idênticas para validar transição de status (`fn_validar_transicao_status` ativa, `validar_transicao_status_solicitacao` órfã) | Banco | Confusão para manutenção futura — qual é a "real"? |
| 3 | Função `notificar_reserva_trigger()` existe mas não foi confirmado se está de fato anexada a um trigger ativo | Banco | Comportamento incerto — pode estar chamando o stub silenciosamente a cada solicitação, ou pode estar morta |
| 4 | ~~`normalizeCategoria()` do import inconsistente com `SLUG_MAP` para J-PREMIUM~~ — **✅ Resolvido**: categoria J-PREMIUM eliminada (mesclada em "J") por decisão do dono do produto; código e os 5 registros históricos de `frota_reservas` corrigidos. **Mas o mesmo problema persiste para U-UTILITARIO** (`normalizeCategoria` gera `'U-UTILITARIO'` sem espaço, `SLUG_MAP` espera `'U - UTILITARIO'` com espaço) — não corrigido, pois o pedido foi só sobre J-PREMIUM | `apps/frota-ops/pages/admin.js` vs. `supabase/functions/_shared/disponibilidade.ts` | U-UTILITARIO **ainda é uma bomba-relógio idêntica** ao caso GRUPO J/J-PREMIUM já corrigido |
| 5 | `admin-user-manager` não versionada no Git, só existe deployada | Supabase vs. repositório | Não revisável em PR, não rastreável por `git blame`, risco de perda se alguém deletar sem backup |
| 6 | `admin-user-manager`: erro de INSERT em `usuarios` não verificado na ação `create` | `admin-user-manager/index.ts` (no banco) | Pode gerar usuário órfão no Auth sem perfil de aplicação — mesma classe de bug do "admin fantasma" já corrigido |
| 7 | Policies de INSERT redundantes/conflitantes em `solicitacoes` e `solicitacao_itens` (a mais permissiva sempre vence) | RLS | A policy mais restritiva (`tenant ativo`) nunca é de fato aplicada, pois coexiste com uma `WITH CHECK true` |
| 8 | Policies de leitura pública sem filtro de tenant (`categorias`, `protecoes`, `adicionais`, `sazonalidade`, `locais`) | RLS | Vazamento cross-tenant assim que existir um 2º tenant |
| 9 | `TENANT_ID` hardcoded em 4 lugares independentes (`apps/site/supabase.js`, `apps/intake-admin/supabase.js`, `apps/frota-ops/js/supabase.js`, `admin-user-manager`) | Frontend + Edge Function | Não escala para multi-tenant sem refatoração em todos os pontos |
| 10 | `frota_veiculos.categoria`/`frota_reservas.categoria` são texto livre, sem FK para `categorias` | Schema | Fonte do bug histórico do GRUPO J e do bug latente do item 4 — sem constraint, divergência de grafia é silenciosa |
| 11 | TOCTOU race condition na verificação de disponibilidade antes do insert (documentada no ADR-003, nunca corrigida) | `criar-solicitacao` + `inserir_solicitacao_completa` | Duas solicitações simultâneas podem ambas passar para a última vaga |
| 12 | Duas fontes de verdade para "acessórios/cadeirinhas": tabela `adicionais` (Postgres) e a extensão `extensions/acessorios` (Google Sheets), sem sincronização | Domínio | Inventário pode divergir entre os dois sistemas sem que ninguém perceba |
| 13 | `extensions/acessorios` não convertida ao padrão sidebar (ainda popup clássico Manifest V3), diferente de `cotacao-rapida`/`disponibilidade` | Extensões | Inconsistência de UX entre as 3 extensões da central de atendimento |
| 14 | Cotação rápida (`extensions/cotacao-rapida`) não aplica sazonalidade | `sidebar.js` | Preço cotado informalmente pode divergir do preço real cobrado pelo site |
| 15 | Sem validação server-side de janela de horário do local (`locais.hora_*`) nem de `max_cadeirinhas` da categoria | `criar-solicitacao` | Cliente pode, em teoria, solicitar fora da janela operacional ou com mais cadeirinhas do que o carro comporta, sem bloqueio automático |
| 16 | `dashboard_dados`: múltiplas sazonalidades sobrepostas têm prioridade indeterminada (`.limit(1)` sem `ORDER BY`) | `criar-solicitacao` | Preço cobrado pode ser imprevisível em datas com sazonalidades conflitantes |
| 17 | Não há tabela `clientes` normalizada — dado de cliente disperso em campos soltos de `solicitacoes` | Schema | Sem dedupe de cliente, sem CRM real, sem histórico consolidado por pessoa |
| 18 | Sem política de retenção/expurgo de dados (LGPD) | Todo o sistema | Risco de compliance |
| 19 | Sem CI/CD, sem branch protection confirmada, histórico mostra commits diretos em `main` | Processo | RO-07/RO-08 do próprio CLAUDE.md não são seguidos na prática |
| 20 | `RB-04` do CLAUDE.md ("sem lógica de negócio em SQL") é sistematicamente violado — boa parte das regras de negócio crítica (transição de status, numeração, log de auditoria) está em `plpgsql` | Banco vs. governança | Contradição entre a governança formal documentada e a prática real do projeto |
| 21 | `RD-01` (JSDoc obrigatório) não é seguido — funções auditadas nesta sessão não têm JSDoc consistente | Frontend/Edge Functions | Dificulta onboarding sem ler o código inteiro |

---

## 21. Pontos Frágeis

Onde o sistema pode falhar, duplicar dados, perder informação ou dessincronizar:

| Cenário de falha | Onde | Como mitigar (se não mitigado) |
|---|---|---|
| Duas solicitações simultâneas para a última vaga de uma categoria | `criar-solicitacao` | Implementar `pg_advisory_xact_lock` por `(tenant_id, categoria)` dentro de `inserir_solicitacao_completa`, como o próprio ADR-003 já prescreve |
| Importação CSV falha no meio do lote (upsert não é transacional entre chunks de 50) | `apps/frota-ops/pages/admin.js`, `executarSync` | Envolver tudo numa única transação via RPC, ou implementar idempotência/retry explícito |
| `normalizeCategoria` gerar categoria que não bate com `SLUG_MAP` (J-PREMIUM/U-UTILITARIO, item 4 da dívida técnica) | Import vs. Edge Function | Alinhar os dois formatos numa fonte única de verdade (idealmente uma tabela de mapeamento, não duas constantes hardcoded em arquivos diferentes) |
| Usuário criado via `admin-user-manager` com role inválida → órfão no Auth sem perfil | `admin-user-manager` | Verificar erro do INSERT e fazer rollback (deletar o usuário recém-criado no Auth) se o INSERT em `usuarios` falhar |
| Falha humana: operador esquece de criar a `frota_reservas` correspondente a uma `solicitacoes` confirmada | Processo manual, sem automação de ponte | Não há solução técnica hoje — é 100% disciplina operacional. Risco real de cliente "confirmado" no funil de captação, mas sem reserva real na operação |
| Dessincronização entre `adicionais`/`is_cadeirinha` (Postgres) e a extensão Acessórios (Google Sheets) | Domínio | Migrar a extensão Acessórios para o Supabase, unificando a fonte de verdade (mudança arquitetural maior, fora do escopo de uma correção pontual) |
| Múltiplas sazonalidades sobrepostas | `criar-solicitacao` | Adicionar `EXCLUDE` constraint no Postgres impedindo sazonalidades sobrepostas para o mesmo tenant, ou `ORDER BY` explícito com critério de prioridade definido |
| Perda de rastreabilidade de "quem analisou" quando solicitação pula `em_analise` (ADR-005, aceito conscientemente) | `solicitacoes` | Aceito como trade-off — não é bug, é decisão deliberada documentada |
| Vazamento de dados de catálogo entre tenants assim que houver um 2º tenant (item 8/9 da dívida técnica) | RLS | Adicionar filtro de `tenant_id` correspondente ao domínio/contexto de quem está lendo, antes de qualquer onboarding de um segundo tenant real |

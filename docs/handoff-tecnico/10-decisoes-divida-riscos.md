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

**Atualização**: a maior parte dos itens abaixo foi corrigida numa rodada de correções posterior a esta auditoria (mesma sessão, depois de listar tudo a pedido do dono do produto). Itens marcados ✅ estão resolvidos; os demais seguem abertos.

| # | Item | Onde | Impacto | Status |
|---|---|---|---|---|
| 1 | `frota_veiculos`, `frota_reservas`, `frota_patios`, `frota_movimentacoes` nunca viraram migration versionada em `sql/` | Banco vs. `sql/` | Impossível reconstruir o schema do zero só com as migrations | ✅ **Resolvido** — migration `022_reconciliacao_schema_frota.sql` (idempotente, `IF NOT EXISTS`) reconstrói tabelas, índices, triggers e RLS |
| 2 | Duas funções de trigger praticamente idênticas para validar transição de status | Banco | Confusão para manutenção futura | ✅ **Resolvido** — `validar_transicao_status_solicitacao()` (órfã, confirmada via `pg_trigger` que não estava anexada a nada) removida na migration `024` |
| 3 | Função `notificar_reserva_trigger()` com status de anexação incerto | Banco | Comportamento incerto | ✅ **Resolvido** — confirmado via `pg_trigger` que não estava anexada a nenhuma tabela; função removida na migration `024` |
| 4 | `normalizeCategoria()` do import inconsistente com `SLUG_MAP` para J-PREMIUM | `apps/frota-ops/pages/admin.js` vs. `_shared/disponibilidade.ts` | Bug latente reproduzindo o caso GRUPO J | ✅ **Resolvido** — categoria J-PREMIUM eliminada (mesclada em "J"); 5 registros históricos de `frota_reservas` corrigidos. **U-UTILITARIO tem o mesmo problema e não foi corrigida** — decisão explícita do dono do produto: U-UTILITARIO é categoria intencionalmente não-pública ("fantasma", atende um único cliente específico, nunca deve aparecer no site), então a divergência de grafia não é um bug a corrigir — é esperado que ela nunca seja exposta via `SLUG_MAP` mesmo |
| 5 | `admin-user-manager` não versionada no Git | Supabase vs. repositório | Não revisável em PR, sem `git blame` | ✅ **Resolvido** — versionada em `supabase/functions/admin-user-manager/index.ts` |
| 6 | `admin-user-manager`: erro de INSERT em `usuarios` não verificado na ação `create` | `admin-user-manager/index.ts` | Usuário órfão no Auth sem perfil de aplicação | ✅ **Resolvido** — erro agora verificado, com rollback (`deleteUser`) se o INSERT falhar; `ALLOWED_ROLES` também alinhado ao CHECK constraint real do banco (removida a role `'balcao'`, que não existe no banco e causava esse exato bug) |
| 7 | Policies de INSERT redundantes/conflitantes em `solicitacoes` e `solicitacao_itens` | RLS | Policy mais restritiva nunca aplicada de fato | ✅ **Resolvido** — migration `023` removeu as policies `WITH CHECK true` duplicadas, mantendo só a que exige tenant ativo |
| 8 | Policies de leitura pública sem filtro de tenant (`categorias`, `protecoes`, `adicionais`, `sazonalidade`, `locais`) | RLS | Vazamento cross-tenant assim que existir um 2º tenant | ❌ **Não corrigido** — requer decisão de arquitetura sobre como resolver o tenant de um visitante anônimo (domínio? subdomínio?) antes de implementar; inofensivo hoje com 1 único tenant |
| 9 | `TENANT_ID` hardcoded em 4 lugares independentes | Frontend + Edge Functions | Não escala para multi-tenant | ❌ **Não corrigido** — mesma dependência da decisão do item 8; estrutural, não é um patch pontual |
| 10 | `frota_veiculos.categoria`/`frota_reservas.categoria` são texto livre, sem FK para `categorias` | Schema | Fonte dos bugs de categoria (GRUPO J, J-PREMIUM) | ❌ **Não corrigido** — mudança estrutural maior (normalizar dados existentes + adicionar FK), precisa de migration dedicada e janela de manutenção |
| 11 | TOCTOU race condition na verificação de disponibilidade (ADR-003) | `criar-solicitacao` + `inserir_solicitacao_completa` | Duas solicitações simultâneas podem passar para a última vaga | ✅ **Resolvido** — `pg_advisory_xact_lock(hashtext(tenant_id || categoria_id))` adicionado em `inserir_solicitacao_completa` (migration `023`), serializando inserts concorrentes da mesma categoria/tenant |
| 12 | Duas fontes de verdade para acessórios/cadeirinhas (`adicionais` vs. extensão Google Sheets) | Domínio | Inventário pode divergir sem ninguém perceber | ❌ **Não corrigido** — exige migrar a extensão Acessórios pro Supabase, mudança arquitetural maior, fora do escopo de uma correção pontual |
| 13 | `extensions/acessorios` não convertida ao padrão sidebar | Extensões | Inconsistência de UX entre as 3 extensões | ❌ **Não corrigido** — mesma observação do item 12 |
| 14 | Cotação Rápida não aplica sazonalidade | `extensions/cotacao-rapida/sidebar.js` | Preço informal pode divergir do preço real | ⚠️ **Em andamento por fora desta sessão** — uma sessão paralela do usuário está mexendo em `extensions/cotacao-rapida/sidebar.js`/`sidebar.html` no momento desta auditoria (provavelmente a integração cotação+disponibilidade discutida); não tocado aqui para não conflitar |
| 15 | Sem validação server-side de janela de horário do local nem de `max_cadeirinhas` | `criar-solicitacao` | Cliente podia solicitar fora da janela operacional ou com cadeirinhas demais | ✅ **Resolvido** — `criar-solicitacao` agora valida `locais.permite_retirada/devolucao`, janela de horário (`hora_retirada/devolucao_inicio/fim`), `disponivel_domingo`, e soma de adicionais `is_cadeirinha` contra `categorias.max_cadeirinhas` |
| 16 | Sazonalidades sobrepostas com prioridade indeterminada | `criar-solicitacao` | Preço imprevisível em datas com sazonalidades conflitantes | ✅ **Resolvido** — `EXCLUDE` constraint (`sazonalidade_sem_sobreposicao`, GiST) impede cadastrar duas sazonalidades ativas sobrepostas no mesmo tenant (confirmado 0 sobreposições existentes antes de aplicar) |
| 17 | Não há tabela `clientes` normalizada | Schema | Sem dedupe de cliente, sem CRM real | ❌ **Não corrigido** — mudança de schema maior, precisa migrar dados existentes de `solicitacoes` |
| 18 | Sem política de retenção/expurgo de dados (LGPD) | Todo o sistema | Risco de compliance | ❌ **Não corrigido** — decisão de produto/jurídica, não é puramente técnica |
| 19 | Sem CI/CD, sem branch protection confirmada | Processo | RO-07/RO-08 do CLAUDE.md não seguidos | ❌ **Não corrigido** — requer acesso/decisão sobre configuração do GitHub, fora do escopo de mudança de código |
| 20 | `RB-04` do CLAUDE.md ("sem lógica de negócio em SQL") sistematicamente violado | Banco vs. governança | Contradição entre governança formal e prática real | ❌ **Não corrigido** — decisão de produto/arquitetura: revisar o CLAUDE.md ou migrar a lógica, não uma correção de código pontual |
| 21 | `RD-01` (JSDoc obrigatório) não seguido | Frontend/Edge Functions | Dificulta onboarding | ❌ **Não corrigido** — esforço de documentação amplo, não tratado nesta rodada |

**Adicionalmente corrigido nesta rodada** (RLS de escrita de frota antes não exigia admin/operador): as policies de INSERT/UPDATE/DELETE de `frota_veiculos`, `frota_reservas` e `frota_patios` agora exigem `fn_sou_admin()` — antes qualquer usuário autenticado do tenant, mesmo `role='cliente'`, podia escrever nessas tabelas via API direta.

---

## 21. Pontos Frágeis

Onde o sistema pode falhar, duplicar dados, perder informação ou dessincronizar:

| Cenário de falha | Onde | Status |
|---|---|---|
| Duas solicitações simultâneas para a última vaga de uma categoria | `criar-solicitacao` | ✅ **Corrigido** — `pg_advisory_xact_lock` por `(tenant_id, categoria_id)` em `inserir_solicitacao_completa` |
| Importação CSV falha no meio do lote (upsert não é transacional entre chunks de 50) | `apps/frota-ops/pages/admin.js`, `executarSync` | ❌ Não corrigido — envolver tudo numa única transação via RPC, ou implementar idempotência/retry explícito |
| `normalizeCategoria` gerar categoria que não bate com `SLUG_MAP` | Import vs. Edge Function | ✅ J-PREMIUM corrigida (eliminada). U-UTILITARIO **intencionalmente não corrigida** — categoria não-pública por design |
| Usuário criado via `admin-user-manager` com role inválida → órfão no Auth sem perfil | `admin-user-manager` | ✅ **Corrigido** — erro do INSERT verificado, rollback automático |
| Falha humana: operador esquece de criar a `frota_reservas` correspondente a uma `solicitacoes` confirmada | Processo manual, sem automação de ponte | ❌ Não corrigido — 100% disciplina operacional, sem solução técnica aplicada |
| Dessincronização entre `adicionais`/`is_cadeirinha` (Postgres) e a extensão Acessórios (Google Sheets) | Domínio | ❌ Não corrigido — exige migração arquitetural maior |
| Múltiplas sazonalidades sobrepostas | `criar-solicitacao` | ✅ **Corrigido** — `EXCLUDE` constraint (`sazonalidade_sem_sobreposicao`) impede cadastro sobreposto |
| Perda de rastreabilidade de "quem analisou" quando solicitação pula `em_analise` (ADR-005, aceito conscientemente) | `solicitacoes` | Aceito como trade-off — não é bug, é decisão deliberada documentada |
| Vazamento de dados de catálogo entre tenants assim que houver um 2º tenant | RLS | ❌ Não corrigido — requer decisão de arquitetura sobre resolução de tenant antes de onboardar um 2º tenant real |

# Handoff Técnico — Plataforma Igufoz (base para o SaaS unificado)

> Documento único, técnico e preciso, cobrindo os 4 sistemas que hoje operam separadamente e que serão a base do novo SaaS. Objetivo: dar a quem for desenhar a arquitetura do SaaS um retrato fiel do que existe, o que já é compartilhado, o que está duplicado, e onde estão as lacunas reais de integração — sem arredondar problemas.
>
> Complementa (não substitui) o handoff técnico já existente e mais aprofundado do i-Frotas em `docs/handoff-tecnico/` (12 partes). Este documento é a visão **de conjunto** que faltava.

---

## 1. Visão de negócio

A Igufoz é uma locadora de veículos. A plataforma de software cresceu organicamente como 4 sistemas separados, cada um resolvendo um problema pontual em um momento diferente, sem um projeto de arquitetura único por trás:

| Sistema | Para quem | Problema que resolve |
|---|---|---|
| `apps/site` | Cliente final (público, sem login) | Cotação e pedido de reserva online |
| `apps/intake-admin` | Atendimento/back-office | Gerenciar as solicitações que chegam pelo site (aprovar, editar, cadastrar preços/categorias/locais) |
| `apps/frota-ops` (i-Frotas) | Operação de pátio/frota | Controlar status dos veículos, reservas confirmadas, disponibilidade em tempo real, ociosidade comercial |
| `extensions/*` (3 extensões de navegador) | Atendentes (telefone/balcão) | Cotação rápida e consulta de disponibilidade sem abrir o site completo |

**Fato central para o desenho do SaaS:** existe um trigger automático de banco que sincroniza `solicitacoes` (site) → `frota_reservas` (frota-ops, seção 3) — mas os dados de produção mostram que **nenhuma reserva real passou por esse caminho ainda**: hoje, 100% do `frota_reservas` vem de um segundo canal, o "Sistema Oficial" (sistema de terceiros, fora deste monorepo, usado para reservas por telefone/balcão), via importação manual de CSV. Entender por que o canal automático nunca foi usado — e decidir se o canal telefone/balcão desaparece no SaaS ou continua existindo por outro motivo (ex: fiscal) — é provavelmente a decisão de produto mais importante do novo SaaS.

---

## 2. Inventário técnico dos 4 sistemas

Stack comum a todos: **JavaScript vanilla, sem framework, sem build step** (ADR-001) — HTML/CSS/JS servidos estaticamente, ES Modules nativos do browser. Backend único: **Supabase** (Postgres + Auth + Realtime + Edge Functions, ADR-002), banco compartilhado por todos.

### 2.1 `apps/site` — Site público de cotação

- Estrutura: `index.html` (landing) + `reserva.html` (fluxo de cotação/reserva) + `script.js` (lógica) + `shared/pricing.js` (cópia da fonte canônica de precificação).
- **Sem autenticação** — acesso público via chave `anon` do Supabase.
- Lê diretamente: `categorias`, `locais`, `protecoes`, `adicionais`, `sazonalidade`.
- Escreve via **Edge Function** `criar-solicitacao` (nunca insere direto na tabela — validação server-side de horário do local e regras de negócio antes de gravar em `solicitacoes`/`solicitacao_itens`).
- ~~Consulta disponibilidade via Edge Function `check-disponibilidade`~~ — **descontinuado em 2026-07-08** por decisão do Product Owner ("o site de disponibilidade não funcionou como eu queria"). O site não checa mais estoque em tempo real; `criar-solicitacao` também não bloqueia mais por falta de disponibilidade. Fica reservado para reintegração futura no SaaS, com desenho próprio (ver `docs/DECISION_LOG.md`, 2026-07-08).
- Deploy: Vercel (site estático).

### 2.2 `apps/intake-admin` — Painel de intake/back-office

- Estrutura: `admin.js` (shell + auth) + `pages/*.js` (uma por aba: `reservas`, `clientes`, `categorias`, `locais`, `sazonalidade`, `protecoes`, `adicionais`, `translados`, `auditoria`) + `shared/pricing.js` + `shared/locacao-status.js`.
- **Autenticação real** via `supabase.auth` (login por email/senha, `signInWithPassword`, troca de senha, `onAuthStateChange`) — usuário interno.
- Lê/escreve: `solicitacoes`, `solicitacao_itens`, `categorias`, `locais`, `protecoes`, `adicionais`, `sazonalidade`, `usuarios`, `audit_log`.
- É quem administra os dados que o `apps/site` só lê (categorias, locais, preços, sazonalidade) — **fonte de verdade de cadastro comercial**.
- Gerencia o ciclo de vida da `solicitacao` (`status`: `solicitada` → `em_analise` → `confirmada` → `concluida`/`cancelada`) — mas esse ciclo **termina aqui**; não existe código que transforme uma `solicitacao confirmada` em `frota_reservas` no i-Frotas (ver seção 3).
- Deploy: Vercel (site estático).

### 2.3 `apps/frota-ops` (i-Frotas) — Operação da frota

Já documentado em profundidade em `docs/handoff-tecnico/` (12 partes) e evoluído extensivamente nesta sessão (Design System operacional, VehicleStatusService, IdleWindowService, OportunidadeComercialService). Resumo para este documento:

- **Autenticação real** via `supabase.auth`, usuário interno com `role` (`admin`/`operador`/`balcao`) em `usuarios`.
- Lê/escreve: `frota_veiculos`, `frota_reservas`, `frota_patios`, `frota_movimentacoes`, `locais` (leitura, para horário de funcionamento), `usuarios`.
- Fonte de dados de `frota_reservas` hoje: **importação manual de CSV** exportado de um sistema de terceiros ("Sistema Oficial" — locadora legada, fora deste monorepo), feita na aba Admin → Importação. Não há integração automática nenhuma.
- Contém a lógica operacional mais rica da plataforma: `AvailabilityService` (disponibilidade por pool, ADR-003), `VehicleStatusService` (máquina de estado de status de veículo, deny-by-default), `IdleWindowService` + `OportunidadeComercialService` (ociosidade comercial).
- Deploy: Vercel (site estático), Realtime habilitado via Supabase Realtime (ADR-009).

### 2.4 Extensões de navegador (3, todas Chrome/Edge Manifest V3)

| Extensão | Propósito | Integração |
|---|---|---|
| `cotacao-rapida` | Sidebar de cotação rápida para atendentes, "funciona em qualquer aba" | Chama a Edge Function `check-disponibilidade` diretamente; usa `shared/pricing.js` — uma cópia **gerada mecanicamente** da fonte canônica (`sed 's/^export //'`, sem ES modules, carregada via `<script>` clássico) |
| `disponibilidade` (D.I.F) | Sidebar de disponibilidade de frota para atendentes | Consulta disponibilidade em tempo real, injetada como sidebar (padrão D.I.F consolidado nesta sessão) |
| `acessorios` | Gestão em tempo real de cadeirinhas/acessórios para aluguel | Popup + background script |

Nenhuma das 3 tem página própria com rotas — são ferramentas de apoio ao atendimento, não sistemas de gestão.

---

## 3. Jornada ponta a ponta — e a lacuna real

```
Cliente                    Atendimento                  Operação de frota
   │                            │                              │
   ▼                            │                              │
apps/site (cotação/reserva)     │                              │
   │  cria `solicitacoes`       │                              │
   │  (via Edge Function)       │                              │
   ▼                            │                              │
   ────────────────────────────▶│                              │
                          apps/intake-admin                     │
                          aprova/edita a solicitação             │
                          status: solicitada → confirmada       │
                                 │                              │
                                 │  ✅ trigger automático        │
                                 │  (fn_sincronizar_frota_reserva,│
                                 │   sql/027, ATIVO em produção) │
                                 ▼                              │
                          cria/atualiza frota_reservas ─────────▶ apps/frota-ops
                          (status CONFIRMADO/CONCLUIDO/          frota_reservas / frota_veiculos
                           CANCELADO conforme solicitacoes.status)

   (via de entrada PARALELA, hoje a única realmente usada)
                    ┌─────────────────────────┐
                    │  "Sistema Oficial"       │
                    │  (locadora legada,       │
                    │  fora deste monorepo —   │
                    │  reservas por telefone/  │
                    │  balcão, fora do site)   │
                    └─────────────────────────┘
                                 │  export CSV
                                 │  (Frota / Contratos Abertos /
                                 │   Reservas Futuras)
                                 ▼
                         Admin → Importação  ─────────▶  apps/frota-ops
                         (upload manual do CSV)          frota_reservas / frota_veiculos
```

**A ponte automática existe — mas nunca foi exercida em produção.** Confirmado consultando o banco diretamente (2026-07-06): o trigger `trg_solicitacoes_sync_frota`/`trg_solicitacoes_sync_frota_delete` está ativo, a tabela de mapeamento `categoria_frota_map` tem 9 categorias cadastradas — mas `SELECT count(*) FROM frota_reservas WHERE solicitacao_id IS NOT NULL` retorna **0**. Ou seja: **nenhuma `frota_reservas` em produção hoje veio de uma `solicitacao` do site.** Todo o `frota_reservas` real é alimentado pela importação manual de CSV do Sistema Oficial (reservas por telefone/balcão, fora do fluxo do site).

Isso não significa que a automação esteja quebrada — pode ser simplesmente que nenhuma solicitação do site tenha chegado a `status='confirmada'` ainda em produção (o volume real de vendas continua entrando pelo canal telefone/balcão no Sistema Oficial, não pelo site). Mas é um fato relevante para o SaaS: **hoje existem 2 canais de entrada de reserva** (site, via trigger automático; balcão/telefone, via Sistema Oficial + CSV) que nunca colidiram na prática, então a integração automática nunca foi testada com dado real. Antes de assumir que a automação "já resolve" a integração, seria prudente validar isso com uma solicitação real de ponta a ponta.

Para o desenho do SaaS, a pergunta de negócio central continua sendo: **o Sistema Oficial (canal balcão/telefone) desaparece no SaaS, ou continua existindo para alguma função que o SaaS não vai assumir?** Isso decide se o CSV manual deveria virar uma tela nativa de "criar reserva sem passar pelo site" no SaaS, ou se o Sistema Oficial legado permanece por outro motivo (fiscal, contrato jurídico).

---

## 4. O que já é compartilhado vs. o que está duplicado

### 4.1 Precificação (`pricing.js`) — já consolidado

Fonte canônica: `supabase/functions/_shared/pricing.js` (ES module, sem I/O). Confirmado por diff direto nesta sessão:
- `apps/site/shared/pricing.js` — **idêntico** à fonte canônica.
- `apps/intake-admin/shared/pricing.js` — **idêntico** à fonte canônica.
- `extensions/cotacao-rapida/shared/pricing.js` — variante sem `export` (extensão não suporta ES modules), gerada mecanicamente com `sed`, garantida por `tests/pricing-parity.test.js` (quebra se divergir).

Todos os 4 consumidores (`site/script.js`, `intake-admin/pages/reservas.js`, `cotacao-rapida/sidebar.js`, `frota-ops` via pricing embutido) **já importam** a lógica em vez de reimplementá-la — este ponto já está resolvido, não é uma dívida pendente. Um comentário desatualizado dentro do próprio `_shared/pricing.js` ainda fala de "cópias históricas" a migrar; na prática a migração já ocorreu.

### 4.2 Algoritmo de disponibilidade — ~~três~~ duas implementações, agora com fonte única (corrigido 2026-07-07)

- `supabase/functions/_shared/disponibilidade.ts` (Deno/TypeScript) — consumido pela Edge Function `check-disponibilidade`, usada por `apps/site` e `extensions/cotacao-rapida`.
- `apps/frota-ops/js/utils.js` (`calcularDisponibilidade`/`calcularDisponivel`, JavaScript) — usado internamente pelo i-Frotas (inclusive como buffer do `IdleWindowService`). `apps/frota-ops/pages/disponibilidade.js` **não é uma terceira implementação** (correção desta seção) — já delegava para `calcularDisponibilidade` de `utils.js`, só fazia sua própria consulta ao banco antes de chamá-la.

**Resolvido em 2026-07-07:** o núcleo compartilhado (`total`/`ocupados`/`disponivel`/`overbooking`/`alerta`) foi extraído para `supabase/functions/_shared/disponibilidade-core.js` (fonte canônica), com cópia física em `apps/frota-ops/js/disponibilidade-core.js` garantida por `tests/disponibilidade-core-parity.test.js` — mesmo padrão já usado por `pricing.js`. Também foi consolidado o mapeamento categoria→frota: o `SLUG_MAP` hardcoded em `disponibilidade.ts` foi removido, agora consulta `categoria_frota_map` (a mesma tabela que o trigger de sincronização usa). Ambas as correções foram testadas em produção (smoke test + `get_logs`) e documentadas em `docs/DECISION_LOG.md`.

### 4.3 `locais` vs. `frota_patios` — gap real, corrigido parcialmente nesta sessão

`locais` (horário de funcionamento, usada pelo site/intake-admin) e `frota_patios` (pátios físicos internos, usados pelo frota-ops em `patio_atual`) eram tabelas **sem nenhuma ligação**, com nomes que não correspondem entre si. Migration `031_locais_id_frota_patios.sql` (2026-07-06) adicionou uma FK nullable conectando as duas — mas o vínculo real ainda depende de preenchimento manual pelo operador (ver `docs/domain/OportunidadeComercial.md`). Para o SaaS, isso sinaliza que **local de retirada/devolução e pátio físico deveriam provavelmente ser o mesmo conceito desde o início**, não duas tabelas.

### 4.4 Cadastro comercial (categorias/locais/preços/sazonalidade) — únicos, mas só num lado

`categorias`, `locais`, `protecoes`, `adicionais`, `sazonalidade` são geridos exclusivamente pelo `intake-admin` e lidos pelo `site`. O `frota-ops` não participa desse cadastro (só lê `locais` para horário, ver 4.3) — ele tem seu próprio conceito de categoria como texto livre em `frota_veiculos.categoria`/`frota_reservas.categoria` (com uma FK `categoria_id` adicionada por migration 028, mas cujo uso no algoritmo de disponibilidade do frota-ops foi deliberadamente adiado, ver ADR-010). A ponte entre os dois modelos existe em duas formas:
- `categoria_frota_map` (migration 027, 9 categorias mapeadas em produção) — usada pelo trigger de sincronização `solicitacoes`→`frota_reservas` (ver seção 3).
- `SLUG_MAP` hardcoded em `_shared/disponibilidade.ts` — usado pela Edge Function de disponibilidade.

Ou seja: **categorias existem hoje em dois formatos** (tabela relacional `categorias` vs. texto livre em `frota_veiculos`/`frota_reservas`), com **dois mapeamentos paralelos e independentes** entre eles que precisam ser mantidos manualmente em sincronia — candidato natural a virar uma única tabela de categorias no SaaS.

Vale notar também que há **três enums de status conceitualmente relacionados, mas distintos**: `solicitacoes.status` (`solicitada/em_analise/confirmada/concluida/cancelada`, minúsculo), `frota_reservas.status` (`PREVISTO/CONFIRMADO/CONCLUIDO/CANCELADO`, maiúsculo) e `frota_veiculos.status` (`DISPONIVEL/LOCADO/DEVOLVIDO/NO_LAVADOR/MANUTENCAO` — este um conceito genuinamente diferente, status do veículo físico, não da reserva). Os dois primeiros já são sincronizados pelo trigger da seção 3; o SaaS deveria decidir se “status da reserva” continua precisando de dois nomes/valores diferentes ou se vira um único enum.

### 4.5 `_shared/` das Edge Functions

`supabase/functions/_shared/` contém `pricing.js` e `disponibilidade.ts`, consumidos por `check-disponibilidade` e `criar-solicitacao`. Padrão documentado em ADR-004: cada Edge Function importa desses arquivos; ao alterar `_shared/`, **todas** as functions que os importam precisam ser reimplantadas juntas (checklist em `supabase/functions/DEPLOY.md`).

### 4.6 Multi-tenancy — schema pronto, uso ainda single-tenant

Existe uma tabela `tenants` (`sql/001_tenants.sql`) e `tenant_id` em praticamente todas as tabelas de negócio — a arquitetura de dados já é multi-tenant no papel. Na prática, **os 3 apps client-side (`site`, `intake-admin`, `frota-ops`) hoje hardcodam o mesmo UUID de tenant** (`a1b2c3d4-0000-0000-0000-000000000001`) como constante no código-fonte (`TENANT_ID` em `apps/*/supabase.js`). Não há hoje mecanismo de "login descobre o tenant" ou subdomínio por cliente — isso é inteiramente pré-requisito de produto a resolver no SaaS (é o requisito mais óbvio de "SaaS de verdade": tenant deve vir do contexto de autenticação/URL, nunca de uma constante no bundle).

---

## 5. Modelo de dados — tabelas por sistema

| Tabela | Escrita por | Lida por |
|---|---|---|
| `tenants` | (seed manual) | todos, implicitamente via `tenant_id` |
| `usuarios` | intake-admin, frota-ops (via Edge Function `admin-user-manager`) | intake-admin, frota-ops |
| `categorias`, `protecoes`, `adicionais`, `sazonalidade` | intake-admin | site, intake-admin |
| `categoria_frota_map` | (seed manual, migration 027) | trigger `fn_sincronizar_frota_reserva` (só, sem policy pública) |
| `locais` | intake-admin | site, intake-admin, frota-ops (leitura, horário) |
| `solicitacoes`, `solicitacao_itens` | Edge Function `criar-solicitacao` (site), intake-admin | intake-admin, trigger de sincronização (seção 3) |
| `audit_log` | intake-admin (trigger/log de auditoria) | intake-admin |
| `frota_veiculos`, `frota_reservas`, `frota_patios`, `frota_movimentacoes` | frota-ops (incl. importação CSV), trigger de sincronização a partir de `solicitacoes` (`frota_reservas.solicitacao_id`, hoje sempre 0 linhas em produção) | frota-ops |

`frota_reservas.solicitacao_id` (FK única, migration 027) é o único elo direto entre as duas cadeias — existe no schema, mas nenhuma linha em produção o usa hoje (ver seção 3). Fora essa FK, nenhuma tabela é escrita por mais de um sistema diretamente (só via trigger).

---

## 6. Decisões arquiteturais já registradas (ADRs)

| ADR | Título |
|---|---|
| 001 | Vanilla JS, sem framework |
| 002 | Supabase como backend |
| 003 | Algoritmo de disponibilidade por pool |
| 004 | Código compartilhado em `_shared/` nas Edge Functions |
| 005 | Transição direta solicitada→confirmada |
| 006 | Design System Operacional do i-Frotas |
| 007 | Processo de evolução do Design System |
| 008 | Hash SPA routing |
| 009 | Realtime Supabase no frota-ops |
| 010 | Migração `categoria`→`categoria_id` no AvailabilityService (adiada) |
| 011 | Override manual de status em lote em veículos (bypass temporário do VehicleStatusService) |

Todas relevantes para o SaaS: 001/002/008 definem a stack técnica herdada (ou não) pelo novo projeto; 003/010 tratam do algoritmo mais sensível (disponibilidade) e sua dívida pendente; 006/007 são o processo de design system que já provou funcionar bem nesta sessão e pode ser reaproveitado como padrão do SaaS.

### 6.1 Dívida de segurança conhecida (documentada em `docs/handoff-tecnico/04-banco-de-dados.md`, ainda não corrigida)

Vale o SaaS herdar como checklist de correção, não como problema novo:
- Leitura pública de `categorias`/`protecoes`/`adicionais`/`sazonalidade`/`locais` **sem checagem de tenant** na policy — inofensivo hoje (single-tenant), mas vaza dado cross-tenant assim que existir um segundo tenant real.
- Policies de escrita de `frota_veiculos`/`frota_reservas`/`frota_patios` não distinguem `role` — qualquer usuário autenticado do tenant pode escrever via API direta, mesmo sem ser admin/operador.
- Função de trigger órfã (`notificar_reserva_trigger`) e função duplicada não conectada (`validar_transicao_status_solicitacao`) — código morto no banco.
- Divergência entre as migrations mais antigas (`sql/001`–`sql/018`) e o schema real de produção para as tabelas `frota_*` — foram criadas direto no banco antes de existir o processo de versionamento em `sql/`, reconciliadas depois pela migration 022. Sinal de que **nem tudo em produção está garantidamente refletido em `sql/`** — o SaaS não deveria assumir os arquivos `sql/` como 100% equivalentes ao banco real sem conferir.

---

## 7. Perguntas em aberto — decisões de produto, não de engenharia

Estas não podem ser respondidas pela engenharia sozinha; são pré-requisito para desenhar a arquitetura do SaaS:

1. **O canal balcão/telefone (hoje registrado no "Sistema Oficial" externo) desaparece no SaaS, ou continua existindo para alguma função que o SaaS não vai assumir (fiscal, jurídico, contábil)?** Determina se o CSV manual vira uma tela nativa de "criar reserva direta" no SaaS, e se vale a pena validar/reforçar a automação que já existe (trigger `sql/027`) mas nunca foi exercida com dado real.
2. **Multi-tenancy real é um requisito do dia 1 do SaaS, ou o produto nasce single-tenant e evolui depois?** Hoje a base de dados já suporta tenants no schema, mas nenhum app resolve o tenant dinamicamente — todos hardcodam o mesmo UUID.
3. **`categorias` (tabela relacional), o texto livre de categoria do frota-ops, e os dois mapeamentos paralelos entre eles (`categoria_frota_map` + `SLUG_MAP`) devem virar um único conceito desde o início do SaaS?** Hoje convivem 2 modelos de dado com 2 pontes independentes (ver 4.4), risco já materializado uma vez (bug histórico do GRUPO J).
4. **`locais` e `frota_patios` também devem virar um único conceito (retirada/devolução = pátio físico)?** A migration 031 já aponta nessa direção, mas ainda é só uma FK nullable — o dado real do vínculo não existe.
5. **As 3 extensões de navegador continuam existindo como ferramentas separadas no SaaS, ou viram funcionalidades embutidas no painel único (ex: uma busca rápida global)?**
6. **Qual sistema é "dono" do cliente (`cliente_nome`/`cliente_email`/`cliente_cpf`)?** Hoje `solicitacoes` guarda um snapshot do cliente no momento do pedido — não há uma tabela `clientes` central e persistente reaproveitada entre site/frota-ops (`usuarios` serve tanto para cliente final quanto para operador/admin, mas não é alimentada pelo fluxo de solicitação).
7. **Os dois/três enums de status de reserva (`solicitacoes.status`, `frota_reservas.status`) devem virar um único enum no SaaS?** Hoje um trigger traduz um no outro; um esquema novo poderia eliminar a tradução por completo.

---

## 8. Recomendação de uso deste documento

Este documento **não prescreve** a arquitetura do SaaS — descreve o estado atual com precisão suficiente para que a decisão de arquitetura (um módulo por sistema? tudo unificado desde o dia 1? qual banco/schema?) seja tomada com informação completa, em vez de suposições. As perguntas da seção 7 são o ponto de partida natural de uma próxima conversa de arquitetura.

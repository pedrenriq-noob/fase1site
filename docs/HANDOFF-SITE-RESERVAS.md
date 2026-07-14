# Handoff Técnico — Site Público de Reservas (`apps/site`)

> Documento de referência completo: da landing page ao envio da solicitação, cobrindo navegação, arquitetura, validações, precificação, modelo de dados (com histórico de RLS) e segurança. Base para qualquer decisão de mudança de layout ou arquitetura a partir daqui.

---

## 1. Visão Geral

`apps/site` é um site estático (sem build step, JavaScript vanilla ES Modules — ADR-001), servido diretamente, com 3 páginas HTML relevantes: `index.html` (landing), `reserva.html` (casca da SPA de reserva) e o motor `script.js` que renderiza tudo dentro de `reserva.html`. Não há autenticação — todo acesso é público, via chave `anon`/publicável do Supabase.

Dois arquivos centralizam configuração e regra de negócio compartilhada:
- `supabase.js` — cliente Supabase + constantes (`TENANT_ID`, `WHATSAPP`).
- `shared/pricing.js` — módulo canônico de precificação, **idêntico** ao usado pela Edge Function `criar-solicitacao` (mesma fonte, cópia física — ver ADR-004 e `tests/pricing-parity.test.js`).

---

## 2. Landing Page (`index.html`, 392 linhas)

### 2.1 Head e SEO

Título "IguFoz | Aluguel de carros em Foz do Iguaçu"; meta description (linha 7); `landing.css`. **Não há** Open Graph, favicon `<link>`, nem scripts de analytics/pixel de terceiros no `<head>`.

### 2.2 Seções (IDs reais)

| Âncora | Conteúdo |
|---|---|
| `#inicio` | Hero |
| `#reserva` | "Reserva rápida" — formulário `quickSearchForm` |
| `#frota` | Grid de categorias, `#fleet-grid` |
| `#carta-verde` | Seção institucional |
| `#duvidas` | FAQ — 17 blocos `<details>` |
| `#contato` | É o próprio `<footer class="footer">` |

Header com logo, nav (4 âncoras), CTA WhatsApp e "Reservar agora" → `reserva.html`.

### 2.3 Formulário de busca rápida (pré-preenchimento do wizard)

`#quickSearchForm` (campos `#qs-local`, `#qs-ret`, `#qs-dev`) pré-preenche datas com D+1 e sincroniza `min`/`value` da devolução ao mudar a retirada. No submit, grava em `sessionStorage` **apenas os campos preenchidos** (`qs_retData`, `qs_devData`, `qs_local` — todos opcionais) e redireciona para `reserva.html`. `reserva.js` consome e **remove** essas chaves na primeira carga (não persistem entre sessões).

Cada card de categoria na seção `#frota` tem um botão "Reservar agora" que grava `qs_cat` (o slug) e redireciona da mesma forma.

### 2.4 Bloco Supabase inline

A landing tem seu **próprio** bloco `<script type="module">` com cliente Supabase criado inline (URL e chave publicável hardcoded, duplicadas do `supabase.js`) — não importa o módulo compartilhado. Popula:
- `#qs-local`: `locais` filtrados por `tenant_id`/`ativo`/`permite_retirada`, com fallback hardcoded de 2 opções se a query falhar.
- `#fleet-grid`: `categorias` ativas, ordenadas, casadas com um dicionário local `CAT_META` (título/descrição/tags por slug) e imagem `assets/slug-${slug}.jpeg`.

**Duplicação a observar:** a criação do cliente Supabase existe em 2 lugares (`supabase.js` e inline em `index.html`) com as mesmas credenciais — candidato a unificação numa reforma futura.

---

## 3. `reserva.html` (153 linhas) — casca da SPA

Estrutura: `#app` → barra de progresso `#progress` → indicador de 4 etapas `#steps-bar` (🚗 Período / 🛡 Proteção / ➕ Adicionais / ✅ Confirmação) → `#content` (único container que `script.js` reescreve via `innerHTML`) → aside `#summary`/`#summaryContent` (resumo de preço sempre visível). Footer idêntico ao da landing. Único script: `script.js` como ES Module.

---

## 4. `script.js` (1436 linhas) — motor do wizard

### 4.1 Estado global `S`

Objeto único mutável: `step`, datas/horas/locais de retirada e devolução, `dias`, arrays carregados do Supabase (`categorias/protecoes/adicionais/sazonalidade/locais`), seleções (`catId`, `protId`, `adicionais_sel[]`) e dados do cliente (`nome/cpf/whatsapp/email/voo/companhia/pouso/pessoas/obs/termos/estrangeiro`).

### 4.2 Boot

`DOMContentLoaded` → `loadSession()` (recupera rascunho + quick-search) → `loadData()` (4 queries paralelas ao Supabase, todas filtradas por `tenant_id`, com fallback hardcoded de locais em caso de erro) → `renderStep()`.

### 4.3 Roteador — 5 telas

| `S.step` | Função | O que renderiza |
|---|---|---|
| 0 | `renderLanding()` | Residual — não é acionado no fluxo normal (a landing real é `index.html`, separada); candidato a limpeza, mas não removido sem confirmação por não ser 100% claro que é código morto. |
| 1 | `renderStep1()` | Período (datas/horas/2 locais) **+** grade de categorias — os dois conceitos ficam juntos na mesma tela |
| 2 | `renderStep2()` | Proteção |
| 3 | `renderStep3()` | Adicionais (com quantidade ou toggle booleano) |
| 4 | `renderStep4()` | Dados do cliente + resumo final + envio |

Navegação linear via `nextStep()`/`prevStep()` — sem pular etapas, sem editar por clique direto no indicador visual (os círculos do `#steps-bar` são só decorativos).

### 4.4 Componentes de suporte

- **Cards de categoria** (`renderCatCards`/`selectCat`): ao trocar de categoria, reajusta automaticamente a seleção de cadeirinhas ao novo limite (`max_cadeirinhas`).
- **Sidebar de resumo** (`updateSummary`): preço total ao vivo, com mini-editor de período embutido (`bindSbPeriod`), visível em todas as etapas.
- **Barra mobile sticky** (`ensureMobileBar`/`updateMobileBar`): categoria + preço + botão avançar, fixa na tela em telas pequenas.
- **Modal "sem proteção"** (`mostrarModalSemProtecao`): interceptação ao tentar avançar do Step 2 sem escolher proteção — confirmação explícita, não bloqueio silencioso.
- **Seletor de horário customizado**: dropdown próprio, não `<select>` nativo.

### 4.5 Envio (`submitReservation`)

Aviso não bloqueante (via `confirm()` nativo) se a retirada for em menos de 24h. Monta payload e envia via `fetch` para a Edge Function `criar-solicitacao`. Em caso de sucesso, limpa o rascunho da sessão, monta mensagem de fallback via WhatsApp (`buildWhatsMsg`) e mostra tela de sucesso.

---

## 5. Validações — client-side vs. server-side

| Validação | Client (`script.js`) | Server (`criar-solicitacao`) |
|---|---|---|
| Campos obrigatórios do Step 1 (datas, horas, 2 locais, categoria) | ✅ `validate()` | ✅ (implícito — `missing_field`) |
| `dias > 0` | ✅ | ✅ |
| Proteção ausente | Modal de confirmação, não bloqueia | Não valida (aceita `protecao_id: null`) |
| `pessoas ≤ max_pessoas` da categoria | ✅ | ❌ não revalidado |
| Email (`/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/`) | ✅ | ✅ (mesma regra, reimplementada) |
| WhatsApp (10–13 dígitos) | ✅ só checa mínimo (10) | ✅ checa mínimo **e** máximo (13) |
| CPF (mod-11) | ✅ (se não estrangeiro) | ✅ (mesmo algoritmo, reimplementado) |
| Documento do estrangeiro obrigatório | ✅ | ❌ não revalidado explicitamente |
| Termos aceitos (checkbox) | ✅ | ❌ (não é campo do payload) |
| Limite de cadeirinhas | ✅ (bloqueia incremento na UI) | ✅ (recalculado com preço/estoque reais do banco) |
| Tamanho máximo de campos de texto | ❌ não limitado no client | ✅ (`cliente_nome`≤120, `observacoes`≤1000 etc.) |
| Local ativo + permite retirada/devolução + janela de horário + domingo | ❌ (client não valida hora vs. janela do local) | ✅ (`horaDentroJanela`, `disponivel_domingo`) |
| Categoria/proteção ativas | ❌ | ✅ |
| Tenant ativo | ❌ | ✅ |

**Padrão geral confirmado**: o servidor não confia em nenhum dado sensível do cliente — recalcula preço, revalida CPF/email/WhatsApp com as mesmas regras, e adiciona validações que o client não faz (tamanho de campo, horário de funcionamento do local, domingo fechado).

---

## 6. Precificação — módulo canônico

`shared/pricing.js` (77 linhas, **idêntico byte-a-byte** a `supabase/functions/_shared/pricing.js`, garantido por `tests/pricing-parity.test.js`):

- **`calcDias(retirada, devolucao)`**: resto ≤1h → sem fração (mín. 1 diária); resto >4h → +1 diária inteira; caso intermediário → fração em quartos de diária.
- **`precoDiariaComSazonalidade(categoria, dataRetirada, sazonalidades)`**: primeiro período de sazonalidade que cobre a data e tem preço definido (jsonb) para o slug; senão, preço base.
- **`calcSubtotal(tipoPreco, preco, quantidade, dias)`**: multiplica por diárias só se `tipoPreco==='per_day'`.

O preço mostrado no client é **sempre estimativa** — o valor gravado (`valor_estimado`) é recalculado do zero no servidor, a partir do preço atual do banco (nunca do payload enviado pelo cliente).

---

## 7. Backend — `criar-solicitacao` (Edge Function, 285 linhas)

Fluxo completo de uma requisição:
1. CORS via `ALLOWED_ORIGINS` (env), fallback `*`.
2. Rate limit persistente: RPC `fn_checar_rate_limit('criar-solicitacao:<ip>', limite=10, janela=60s)`, contra tabela `rate_limits` — **fail-open** se a checagem falhar (não bloqueia requisição legítima por erro interno).
3. Validação de campos obrigatórios, tamanho, formato (UUID/email/WhatsApp/CPF).
4. Checagem de tenant/categoria/proteção ativos.
5. Checagem de local (ativo, permite retirada/devolução, janela de horário, domingo).
6. Recalcula preço (sazonalidade + módulo canônico).
7. Revalida adicionais e limite de cadeirinhas a partir do banco (ignora o que o client enviou).
8. Grava via **RPC transacional única** `inserir_solicitacao_completa(p_sol, p_itens)` — insere `solicitacoes` + `solicitacao_itens` atomicamente.

### 7.1 RPC `inserir_solicitacao_completa` — evolução

- Versão original (`sql/015`): sem validação.
- `sql/019`: adiciona validação de tenant/categoria/proteção dentro da própria função.
- `sql/023` (**versão atual**): adiciona `pg_advisory_xact_lock(hashtext(tenant_id||':'||categoria_id))` para fechar uma race condition TOCTOU (Time-Of-Check-Time-Of-Use) — duas requisições simultâneas para a última vaga de uma categoria não podem mais ambas passar a validação e gravar.

---

## 8. Modelo de Dados

### 8.1 `categorias`
`id, tenant_id, slug, nome, descricao, preco_diaria, transmissao (manual|automatico), max_pessoas (default 5), max_cadeirinhas (default 2), quantidade_frota (default 1), imagem_url, ordem, ativo, criado_em`. UNIQUE(tenant_id, slug).
**RLS:** leitura pública (`ativo=true`); escrita só admin do tenant (`fn_sou_admin()`).

### 8.2 `protecoes`
`id, tenant_id, nome, descricao, preco, tipo_preco (per_day|fixed), franquia, pre_autorizacao, ordem, ativo, criado_em`.
**RLS:** mesmo padrão de `categorias`.

### 8.3 `adicionais`
`id, tenant_id, nome, descricao, preco, tipo_preco (per_day|fixed), permite_quantidade, is_cadeirinha, estoque (null=ilimitado), ordem, ativo, criado_em`.
**RLS:** mesmo padrão.

### 8.4 `sazonalidade`
`id, tenant_id, nome, data_inicio, data_fim, precos (jsonb, mapa slug→preço), ativo, criado_em`. CHECK `data_fim >= data_inicio`; constraint EXCLUDE contra sobreposição de períodos (migration posterior).
**RLS:** mesmo padrão.

### 8.5 `locais`
`id, tenant_id, nome, permite_retirada, permite_devolucao, hora_retirada_inicio/fim, hora_devolucao_inicio/fim (NULL=sem restrição), disponivel_domingo, is_aeroporto, ativo, ordem, criado_em`. UNIQUE(tenant_id, nome).
**RLS diverge do padrão das outras tabelas de catálogo:** leitura pública igual, mas a escrita é `TO authenticated USING (tenant_id = ...)` **sem** o gate `fn_sou_admin()` — qualquer usuário autenticado do tenant pode escrever, não só admin. Vale revisar se isso é intencional.

### 8.6 `solicitacoes`
`id, tenant_id, usuario_id (null se anônimo), categoria_id, protecao_id, cliente_nome, cliente_email, cliente_whatsapp, cliente_cpf, data_retirada, data_devolucao, local_retirada, local_devolucao, numero_voo, horario_pouso, pessoas (default 1), valor_estimado, observacoes, motivo_cancelamento, status (solicitada|em_analise|confirmada|concluida|cancelada), criado_em/atualizado_em/status_alterado_em`. Adicionadas depois: `numero` (serial único), `estrangeiro`, `cliente_doc`. CHECK `data_devolucao > data_retirada`.

**Histórico de correção de RLS de INSERT (relevante para qualquer mudança futura no fluxo de envio):**
1. Original: `INSERT WITH CHECK(true)` — pública irrestrita.
2. Correção: substituída por `WITH CHECK (tenant ativo)`.
3. **Bug real encontrado depois**: a policy original nunca fora de fato removida (existia sob 2 nomes diferentes) — como o Postgres combina múltiplas policies permissivas com OR, a mais permissiva sempre vencia e anulava a correção. Ambas as duplicatas foram dropadas.
4. Só depois disso ganhou policy de **DELETE** (antes, RLS habilitado sem policy de DELETE = qualquer exclusão afetava 0 linhas silenciosamente, sem erro — e a tela de admin não checava isso, reportando sucesso falso).

### 8.7 `solicitacao_itens`
`id, solicitacao_id (FK ON DELETE CASCADE), adicional_id, quantidade (>0), preco_unitario (snapshot), tipo_preco (snapshot)`. Mesmo histórico de correção de RLS de INSERT que `solicitacoes`. **Sem policy de DELETE própria** — depende do `ON DELETE CASCADE` da FK.

---

## 9. Mapeamento — Estado do cliente → Banco de dados

| `S` (script.js) | Payload → `criar-solicitacao` | Coluna gravada |
|---|---|---|
| `nome` | `cliente_nome` | `solicitacoes.cliente_nome` |
| `email` | `cliente_email` | `solicitacoes.cliente_email` |
| `whatsapp` | `cliente_whatsapp` | `solicitacoes.cliente_whatsapp` |
| `cpf` | `cliente_cpf` | `solicitacoes.cliente_cpf` |
| `estrangeiro` | `estrangeiro` | `solicitacoes.estrangeiro` |
| doc do estrangeiro | `cliente_doc` | `solicitacoes.cliente_doc` |
| `catId` | `categoria_id` | `solicitacoes.categoria_id` (revalidado) |
| `protId` | `protecao_id` | `solicitacoes.protecao_id` (revalidado) |
| `retData`+`retHora` | `data_retirada` | `solicitacoes.data_retirada` |
| `devData`+`devHora` | `data_devolucao` | `solicitacoes.data_devolucao` |
| `retLocal`/`devLocal` | `local_retirada`/`local_devolucao` | idem |
| `companhia`/`voo`/`pouso` | `companhia_aerea`/`numero_voo`/`horario_pouso` | idem |
| `pessoas` | `pessoas` | `solicitacoes.pessoas` |
| `obs` | `observacoes` | `solicitacoes.observacoes` (+ texto concatenado no servidor) |
| preço calculado no client | *(não usado)* | `solicitacoes.valor_estimado` — **sempre recalculado no servidor** |
| `adicionais_sel[]` (`id`, `quantidade`) | `itens[]` | `solicitacao_itens` — `preco_unitario`/`tipo_preco` sempre lidos do banco no servidor, nunca do payload |

---

## 10. Persistência de sessão

`sessionStorage['igufoz_rascunho']` guarda o objeto `S` inteiro, salvo a cada mudança de etapa — permite retomar o formulário se a página recarregar. As chaves de pré-preenchimento da landing (`qs_retData`, `qs_devData`, `qs_local`, `qs_cat`) são lidas e **removidas** na primeira carga do wizard — não persistem além disso.

---

## 11. Segurança

- Chave `anon`/publicável do Supabase está exposta no client em **dois lugares** (`supabase.js` e inline em `index.html`, mesmas credenciais) — é o comportamento esperado para esse tipo de chave, mas a duplicação de código é evitável.
- CORS controlado por `ALLOWED_ORIGINS` (variável de ambiente da Edge Function), com fallback permissivo (`*`) se não configurado.
- Rate limiting persistente (tabela `rate_limits`, não em memória — sobrevive a reinícios da function), fail-open em caso de falha do próprio rate limiter.
- Função `esc()` escapa `& < > "` (não escapa `'`) para toda renderização de HTML dinâmico no client — usada consistentemente ao interpolar dados vindos do banco ou do usuário.
- Preço nunca é confiado do cliente — sempre recalculado no servidor.
- Histórico de correção de RLS em `solicitacoes`/`solicitacao_itens` (seção 8.6) é relevante: qualquer alteração futura no fluxo de gravação deve conferir se não está reintroduzindo policies duplicadas/permissivas demais.

---

## 12. Pontos de atenção conhecidos

- ~~`renderLanding()` dentro de `script.js` parece código morto~~ — **removido em 2026-07-08**, confirmado que nenhum caminho do código setava `S.step = 0`. Ver `docs/DECISION_LOG.md`.
- ~~Criação do cliente Supabase duplicada entre `supabase.js` e o bloco inline de `index.html`~~ — **unificado em 2026-07-08**: extraído para `apps/site/landing.js`, que importa `supabase.js`. `index.html` agora carrega um único `<script type="module" src="landing.js">`.
- `locais` tem RLS de escrita sem gate de admin (qualquer autenticado do tenant escreve) — os outros catálogos exigem `fn_sou_admin()`. Vale decidir se é intencional. **Não corrigido** — é decisão de produto, não técnica.
- Validação de WhatsApp no client só checa o mínimo de dígitos (10), não o máximo (13) — o servidor checa os dois. **Não corrigido.**
- Motor de disponibilidade em tempo real foi **descontinuado** do site em 2026-07-08 (decisão do Product Owner) — ver `docs/DECISION_LOG.md`. O site não checa mais estoque de frota antes de aceitar uma solicitação.

---

## 13. Documentos relacionados

- `docs/HANDOFF-PLATAFORMA-SAAS.md` — visão de conjunto dos 4 sistemas da plataforma.
- `docs/DECISION_LOG.md` — decisões pontuais recentes (remoção do motor de disponibilidade, consolidação de disponibilidade/categoria no i-Frotas).
- `docs/adr/` — ADR-001 (vanilla JS), ADR-002 (Supabase), ADR-004 (padrão `_shared/` nas Edge Functions).
- `supabase/functions/DEPLOY.md` — checklist obrigatório de deploy conjunto quando `_shared/` muda.

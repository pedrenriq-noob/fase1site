# AUDITORIA TÉCNICA — IGUFOZ LOCADORA
**Data:** 23/06/2026  
**Escopo:** Site público, Painel admin, Supabase, Edge Function, Vercel, GitHub  
**Auditor:** Análise automatizada + revisão de código-fonte  
**Status:** PRÉ-PRODUÇÃO — corrija os itens críticos antes de qualquer tráfego real

---

## 1. Resumo Executivo

O sistema está funcional para demonstração, mas **não está pronto para produção**.

Foram identificados **3 segredos reais expostos no repositório GitHub público** (chave Resend, URL Supabase, anon key), **1 vetor de spam/abuso sem autenticação** na Edge Function, **lógica de preço duplicada em 3 lugares com fórmulas divergentes**, **campo `companhia_aerea` inserido silenciosamente perdido** por não existir no schema, **número de WhatsApp placeholder errado no email de confirmação ao cliente**, e **filtro de busca do admin com índices de coluna errados**.

O banco de dados está bem modelado. O schema SQL e as migrations estão coerentes, exceto por dois campos ausentes (`numero` e `companhia_aerea`). O RLS está implementado mas com uma política de inserção pública que permite qualquer registro sem validação server-side do valor.

**Risco imediato mais grave:** A chave da API Resend está no código que está no GitHub. Qualquer pessoa com acesso ao repositório pode enviar emails ilimitados como "Igufoz Reservas" até que a chave seja revogada.

---

## 2. Mapa do Sistema

```
/
├── site/                    → Site público (landing + fluxo de reserva)
│   ├── index.html           → Landing page com FAQ, frota e quick-search
│   ├── reserva.html         → Container do fluxo de 4 etapas
│   ├── script.js            → TODA a lógica do cliente: estado, cotação, validação, submit
│   ├── supabase.js          → Cliente Supabase + TENANT_ID + WHATSAPP (hardcoded)
│   ├── shared.css           → Design system compartilhado (header, footer, tokens)
│   ├── landing.css          → Estilos específicos da landing
│   └── style.css            → Estilos do fluxo de reserva
│
├── admin/                   → Painel administrativo (SPA vanilla)
│   ├── index.html           → Shell do admin com login/modal/toast
│   ├── admin.js             → Auth, navegação, modal, toast (controller principal)
│   ├── supabase.js          → Mesmo cliente Supabase do site (duplicado)
│   └── pages/
│       ├── dashboard.js     → KPIs e reservas recentes (sem paginação)
│       ├── reservas.js      → CRUD de reservas + troca de status
│       ├── categorias.js    → CRUD de veículos
│       ├── protecoes.js     → CRUD de proteções
│       ├── adicionais.js    → CRUD de adicionais
│       ├── sazonalidade.js  → CRUD de precificação sazonal
│       ├── locais.js        → CRUD de locais de retirada/devolução
│       ├── translados.js    → Gestão de translados pendentes
│       └── clientes.js      → (não auditado em detalhe)
│
├── supabase/
│   └── functions/
│       └── notificar-reserva/
│           └── index.ts     → Edge Function: envia email ao admin e ao cliente via Resend
│
├── sql/                     → Migrations versionadas (001–010)
│   ├── 001_tenants.sql
│   ├── 002_usuarios.sql
│   ├── 003_categorias.sql
│   ├── 004_protecoes_adicionais.sql
│   ├── 005_sazonalidade.sql
│   ├── 006_solicitacoes.sql
│   ├── 007_documentos_condutores_translados.sql
│   ├── 008_triggers.sql
│   ├── 009_rls_policies.sql
│   ├── 010_locais.sql
│   └── seed.sql             → Dados iniciais (categorias, proteções, adicionais)
│
├── extension/               → Extensão Chrome (sidebar de cotação)
├── vercel.json              → Rewrites de rota
└── .gitignore               → Não protege arquivos JS com segredos
```

---

## 3. Fluxos Críticos

### Fluxo A — Cliente cria reserva

| Etapa | Arquivo | Tabela | Risco |
|-------|---------|--------|-------|
| 1. Carrega dados | `script.js:loadData()` | categorias, protecoes, adicionais, sazonalidade, locais | RLS pública expõe todos os dados — OK por design |
| 2. Preenche período + categoria | `script.js:renderStep1()` | — | `calcDias()` usa fórmula custom não documentada |
| 3. Escolhe proteção | `script.js:renderStep2()` | — | Sem proteção exige confirmação via modal — correto |
| 4. Escolhe adicionais | `script.js:renderStep3()` | — | `syncAeroAdd()` adiciona aeroporto automaticamente |
| 5. Preenche dados pessoais | `script.js:renderStep4()` | — | CPF, WhatsApp validados apenas no frontend |
| 6. Insere solicitação | `script.js:submitReservation()` | solicitacoes | `valor_estimado` calculado no frontend, sem verificação server-side |
| 7. Insere itens | `script.js:submitReservation()` | solicitacao_itens | OK |
| 8. Chama Edge Function | `script.js:1048` | — | `.catch(() => {})` silencia falha — cliente nunca sabe |
| 9. Edge Function envia emails | `notificar-reserva/index.ts` | — | Chave Resend hardcoded; WhatsApp errado no email do cliente |

### Fluxo B — Admin altera status

| Etapa | Arquivo | Tabela | Risco |
|-------|---------|--------|-------|
| 1. Carrega reservas | `reservas.js:renderReservas()` | solicitacoes, categorias | Sem paginação — carrega tudo |
| 2. Seleciona novo status | `reservas.js:bindReservas()` | — | Select mostra transição `solicitada → confirmada` que o trigger recusa |
| 3. Atualiza status | `reservas.js:trocarStatus()` | solicitacoes | Trigger valida transição corretamente no banco |

### Fluxo C — Admin edita categoria

| Etapa | Arquivo | Tabela | Risco |
|-------|---------|--------|-------|
| 1. Carrega lista | `categorias.js:renderCategorias()` | categorias | SELECT sem tenant_id (depende de RLS) |
| 2. Salva edição | `categorias.js:abrirFormCategoria()` | categorias | UPDATE sem `.eq('tenant_id', TENANT_ID)` |
| 3. Exclui | `categorias.js:excluirCategoria()` | categorias | DELETE sem `.eq('tenant_id', TENANT_ID)` |

---

## 4. Bugs Encontrados

---

### BUG-01 — WhatsApp placeholder errado no email do cliente
**Severidade:** CRÍTICO  
**Arquivo:** `supabase/functions/notificar-reserva/index.ts:107`  
**Evidência:**
```html
<a class="btn" href="https://wa.me/554599999999">💬 Falar no WhatsApp</a>
```
**Número real:** `5545988182995`  
**Impacto:** Todo cliente que recebe o email de confirmação e clica em "Falar no WhatsApp" é direcionado para um número inexistente. Perda direta de conversão.  
**Correção:** Substituir `554599999999` por `5545988182995`. Sem risco de quebra.

---

### BUG-02 — Campo `companhia_aerea` inserido mas não existe no schema
**Severidade:** ALTO  
**Arquivo:** `site/script.js:1025`  
**Evidência:**
```js
companhia_aerea: S.companhia || null,
```
**Tabela:** `solicitacoes` — `006_solicitacoes.sql` não define este campo  
**Impacto:** O Supabase descarta silenciosamente campos desconhecidos. A companhia aérea informada pelo cliente é **perdida permanentemente**. O admin nunca vê essa informação.  
**Nota:** A informação aparece concatenada em `observacoes` (linha 1000-1003), então não há perda total, mas a coluna dedicada falha silenciosamente.  
**Correção:** Criar migration `011_add_companhia_aerea.sql` ou remover o campo do payload (manter apenas em `observacoes`).

---

### BUG-03 — Campo `numero` em `solicitacoes` não está nas migrations
**Severidade:** ALTO  
**Evidência:** `006_solicitacoes.sql` não define o campo `numero`. O admin (`reservas.js:42`) e a Edge Function (`index.ts:95`) usam `row.numero` para exibição (#0001).  
**Impacto:** Provavelmente adicionado manualmente via Console Supabase. Qualquer rebuild do banco a partir das migrations perde este campo. O sistema quebra no admin e nos emails.  
**Correção:** Criar `011_add_numero_solicitacao.sql`:
```sql
ALTER TABLE solicitacoes ADD COLUMN IF NOT EXISTS numero SERIAL;
```

---

### BUG-04 — Filtro de busca do admin com índices de célula errados
**Severidade:** ALTO  
**Arquivo:** `admin/pages/reservas.js:141-142`  
**Evidência:**
```js
const nome = tr.cells[1]?.textContent.toLowerCase() ?? ''   // cells[1] = "Enviado em" (data)
const wpp  = tr.cells[2]?.textContent.toLowerCase() ?? ''   // cells[2] = "Cliente" (nome)
```
**Índices reais:** `cells[0]=#`, `cells[1]=Enviado em`, `cells[2]=Cliente`, `cells[3]=WhatsApp`  
**Impacto:** Buscar por nome do cliente pesquisa na coluna de data. Buscar por WhatsApp pesquisa na coluna do nome. O filtro não funciona corretamente.  
**Correção:**
```js
const nome = tr.cells[2]?.textContent.toLowerCase() ?? ''
const wpp  = tr.cells[3]?.textContent.toLowerCase() ?? ''
```

---

### BUG-05 — `transicoesPossiveis()` permite `solicitada → confirmada`, trigger recusa
**Severidade:** ALTO  
**Arquivo:** `admin/pages/reservas.js:277-285`  
**Evidência:**
```js
solicitada: ['solicitada', 'em_analise', 'confirmada', 'cancelada'],
```
**Trigger no banco** (`008_triggers.sql:97`):
```sql
(OLD.status = 'solicitada' AND NEW.status IN ('em_analise', 'cancelada'))
```
**Impacto:** O admin pode selecionar "Confirmada" a partir de "Solicitada". O banco recusa com erro. O admin vê uma mensagem de erro mas o select não reverte — fica em estado inconsistente visualmente até recarregar.  
**Correção:** Remover `'confirmada'` das transições permitidas a partir de `'solicitada'` no frontend.

---

### BUG-06 — `calcDias()` diverge entre frontend e Edge Function
**Severidade:** ALTO  
**Frontend** (`script.js:1181-1196`):
```js
if (resto <= 1)     S.dias = full
else if (resto > 4) S.dias = full + 1
else                S.dias = full + Math.floor(resto * 2) / 8
```
**Edge Function** (`index.ts:22-24`):
```js
Math.max(1, Math.round(diff / 36e5 / 24 * 10) / 10)
```
**Impacto:** O valor exibido ao cliente no site pode diferir do valor no email. Exemplo: retirada segunda 10:00, devolução quarta 16:00 (54h). Frontend: full=2, resto=6, dias=3. Edge: round(54/24*10)/10 = round(22.5)/10 = 2.3. O email mostra R$ X por 2.3 dias; o site mostrou R$ X por 3 dias.  
**Correção:** Centralizar `calcDias()` em um único lugar e importá-lo.

---

### BUG-07 — Texto da landing hardcoded menciona aeroporto como local de retirada
**Severidade:** MÉDIO  
**Arquivo:** `site/script.js:213`  
**Evidência:**
```js
<p class="hero-sub">Retirada no aeroporto ou centro.<br>Frota moderna, processo simples.</p>
```
**Impacto:** Contradiz a correção recente que removeu o aeroporto do select de local de retirada. Cria expectativa falsa no cliente.  
**Correção:** Alterar para "Retirada na Av. Brasil ou Av. das Cataratas."

---

### BUG-08 — Fallback de locais ainda inclui aeroporto como local de retirada
**Severidade:** MÉDIO  
**Arquivo:** `site/script.js:82`  
**Evidência:**
```js
{ nome: 'Estacionamento Leva e Trás 24h — Aeroporto', permite_retirada: true, ... }
```
**Impacto:** Se a tabela `locais` estiver vazia, o fluxo de reserva (Step 1) exibirá o aeroporto como opção de retirada, contradizendo a política do negócio.  
**Correção:** Remover `permite_retirada: true` do fallback do aeroporto (manter apenas `permite_devolucao: true`).

---

### BUG-09 — `valor_estimado` calculado no frontend sem validação server-side
**Severidade:** MÉDIO  
**Arquivo:** `site/script.js:993-996`  
**Impacto:** Usuário técnico pode modificar o JS no console e inserir `valor_estimado: 1.00`. O admin vê um total falso. Não é fraude de pagamento (não há pagamento online), mas distorce o faturamento estimado.  
**Correção:** Recalcular `valor_estimado` na Edge Function ou via trigger, com base nos IDs de categoria/proteção/adicionais e nas datas.

---

### BUG-10 — Dashboard sem paginação carrega todas as reservas
**Severidade:** MÉDIO  
**Arquivo:** `admin/pages/dashboard.js:5`  
**Evidência:**
```js
await supabase.from('solicitacoes').select('status, valor_estimado, criado_em')
  .eq('tenant_id', TENANT_ID).order('criado_em', { ascending: false })
```
**Impacto:** Com 1.000+ reservas, a query retorna tudo para o cliente. Lento e wasteful. A tabela de "Reservas Recentes" usa `.slice(0, 10)` mas o fetch é completo.  
**Correção:** Adicionar `.limit(100)` ao fetch e calcular KPIs via RPC server-side.

---

### BUG-11 — `seed.sql` tem preço de DEVOLUÇÃO NO AEROPORTO desatualizado
**Severidade:** BAIXO  
**Arquivo:** `sql/seed.sql:76`  
**Evidência:** `seed.sql` define R$ 50,00. Screenshot do sistema mostra R$ 69,90.  
**Impacto:** O banco foi editado manualmente. O seed está desatualizado e recriaria o banco com valor errado.  
**Correção:** Atualizar `seed.sql` com o preço atual e documentar que o banco foi alterado manualmente.

---

### BUG-12 — Falha silenciosa na chamada da Edge Function não é reportada
**Severidade:** BAIXO  
**Arquivo:** `site/script.js:1052`  
**Evidência:**
```js
}).catch(() => {}) // silencia erros de rede — não bloqueia o fluxo do cliente
```
**Impacto:** Se a Edge Function falhar (rede, chave inválida, Resend fora do ar), o cliente não sabe, o admin não recebe o email e a reserva não é notificada. Não há mecanismo de retry ou log acessível.

---

## 5. Riscos de Segurança

---

### SEC-01 — Chave API Resend hardcoded no repositório
**Severidade:** CRÍTICO  
**Arquivo:** `supabase/functions/notificar-reserva/index.ts:4`  
**Evidência:**
```ts
const RESEND_KEY = 're_51Rozuwe_Mk85nNbiLfteKshDW64jgaeh'
```
**Como explorar:** Qualquer pessoa com acesso ao repositório GitHub usa a chave para enviar emails ilimitados com o remetente "Igufoz Reservas", incluindo phishing, spam ou esgotamento do plano Resend.  
**Probabilidade:** Alta (repositório público ou acessível ao time).  
**Impacto:** Reputação do domínio queimada, conta Resend suspensa, possível blacklist do remetente.  
**Correção:** 
1. Revogar a chave no dashboard Resend **agora**.
2. Criar nova chave.
3. Adicionar como variável de ambiente no Supabase: `RESEND_API_KEY`.
4. No código: `const RESEND_KEY = Deno.env.get('RESEND_API_KEY') ?? ''`.
5. Adicionar `if (!RESEND_KEY) return new Response('missing key', { status: 500 })`.

---

### SEC-02 — Edge Function exposta sem autenticação — vetor de spam
**Severidade:** CRÍTICO  
**Arquivo:** `supabase/functions/notificar-reserva/index.ts:181-184` e `site/script.js:1048-1052`  
**Evidência:**
```ts
const CORS = { 'Access-Control-Allow-Origin': '*', ... }
```
A função aceita qualquer `POST` com `apikey` (anon key pública). Não verifica se o `id` da solicitação existe no banco. Não verifica `tenant_id`. Não verifica `cliente_email`.  
**Como explorar:**
```bash
curl -X POST https://lxfnqzuzohudqwibgdic.supabase.co/functions/v1/notificar-reserva \
  -H "apikey: sb_publishable_lZYtlQFkZCgUE-ppawmXHA_CPo0tPUF" \
  -H "Content-Type: application/json" \
  -d '{"record": {"cliente_nome": "Spam", "cliente_email": "vitima@email.com", "valor_estimado": 0}}'
```
Envia email para qualquer endereço como se fosse confirmação da Igufoz.  
**Correção:** 
1. Verificar se `row.id` existe em `solicitacoes` antes de enviar qualquer email.
2. Verificar `tenant_id` no payload contra lista de tenants válidos.
3. Mover a chamada para um trigger de banco (Database Webhook) em vez de chamada direta do frontend.

---

### SEC-03 — Supabase anon key exposta no GitHub
**Severidade:** ALTO  
**Arquivos:** `site/supabase.js:4`, `admin/supabase.js:7`, `supabase/functions/notificar-reserva/index.ts:8`  
**Evidência:**
```js
const SUPABASE_ANON = 'sb_publishable_lZYtlQFkZCgUE-ppawmXHA_CPo0tPUF'
```
**Nota:** A anon key é tecnicamente "pública" (equivalente a uma API key de leitura pública). O Supabase a documenta como segura para o frontend. O risco real é que o RLS precisa estar correto para que a anon key não dê acesso indevido a dados.  
**Risco real:** Se qualquer política RLS estiver mal configurada, a anon key exposta é o vetor de exfiltração.  
**Correção:** Mover para variáveis de ambiente do Vercel (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) e injetar em tempo de build. No curto prazo, a exposição é aceitável **somente se** as políticas RLS estiverem corretas.

---

### SEC-04 — RLS "solicitacoes: inserção pública" sem validação de valor
**Severidade:** ALTO**  
**Arquivo:** `sql/009_rls_policies.sql:142-144`  
**Evidência:**
```sql
CREATE POLICY "solicitacoes: inserção pública"
    ON solicitacoes FOR INSERT
    WITH CHECK (true);
```
**Impacto:** Qualquer pessoa com a anon key pode inserir uma solicitação com `valor_estimado: 0`, `categoria_id` de outro tenant, ou datas inválidas. O banco tem constraint `data_devolucao > data_retirada`, mas `valor_estimado`, `tenant_id` incorreto e `categoria_id` falso passam.  
**Correção:** Mover a inserção para a Edge Function (que usa service_role) e remover o acesso anon direto à tabela. Ou adicionar check de FK: `tenant_id` deve existir em `tenants`.

---

### SEC-05 — Admin sem proteção de rota no Vercel
**Severidade:** ALTO**  
**Arquivo:** `vercel.json`  
**Evidência:**
```json
{ "source": "/admin/(.*)", "destination": "/admin/$1" }
```
A rota `/admin/` é servida publicamente. A proteção é 100% client-side (JS verifica sessão Supabase). Se o RLS falhar ou houver bug no `verificarSessao()`, o painel fica exposto.  
**Impacto:** Baixo em produção normal (Supabase protege os dados), mas a superfície de ataque do painel admin fica desnecessariamente pública.  
**Correção:** Adicionar Vercel Password Protection ou mover admin para subdomínio com autenticação básica, ou usar Vercel Edge Middleware para verificar token JWT antes de servir os arquivos.

---

### SEC-06 — Edge Function usa SUPABASE_ANON como fallback do service_role
**Severidade:** MÉDIO  
**Arquivo:** `supabase/functions/notificar-reserva/index.ts:199`  
**Evidência:**
```ts
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? SUPABASE_ANON
```
**Impacto:** Se `SUPABASE_SERVICE_ROLE_KEY` não estiver configurada no ambiente da Edge Function, o cliente Supabase dentro da função usa a anon key. Isso significa que os SELECTs na função (buscar categoria, proteção, itens) podem ser bloqueados pelo RLS, e o email enviado terá campos "—" onde deveria haver dados reais.  
**Não verificável automaticamente:** Não é possível confirmar se `SUPABASE_SERVICE_ROLE_KEY` está configurada no ambiente Supabase da Edge Function sem acesso ao painel.

---

### SEC-07 — CPF trafega em texto puro para a Edge Function
**Severidade:** MÉDIO  
**Arquivo:** `site/script.js:1051`  
**Evidência:** `cliente_cpf: S.cpf.replace(/\D/g,'')` é enviado no payload JSON para a Edge Function via `fetch`. O Edge Function não usa HTTPS do Supabase? Sim, usa. Mas o CPF é armazenado em `solicitacoes.cliente_cpf` sem criptografia e acessível a qualquer usuário admin.  
**Impacto:** Dado pessoal sensível armazenado em texto puro. Não há criptografia em repouso além do que o Supabase oferece nativamente. Para compliance com LGPD, o acesso ao CPF precisa ser auditado e restrito.

---

## 6. Problemas de Arquitetura

### ARQ-01 — Motor de cotação duplicado em 3 lugares com fórmulas divergentes

| Implementação | Arquivo | Função `calcDias` |
|---|---|---|
| Frontend site | `site/script.js` | Fórmula custom com limiares 1h e 4h |
| Admin (detalhe) | `admin/pages/reservas.js:172` | `Math.max(1, Math.round(diffMs / 36e5 / 24 * 10) / 10)` |
| Edge Function | `notificar-reserva/index.ts:21` | `Math.max(1, Math.round(diff / 36e5 / 24 * 10) / 10)` |

O preço exibido ao cliente no site diverge do preço no email e do preço mostrado no admin. A regra de negócio de quantas diárias cobrar não está em um único lugar autorizado.

**Para SaaS:** Impossível criar um chat de atendimento que use a mesma regra de preço sem triplicar o bug.

**Correção recomendada:** Criar uma Edge Function `calcular-cotacao` que receba `categoria_id`, `data_retirada`, `data_devolucao` e retorne o preço. Tanto o site quanto o admin e o chat consumiriam essa função.

---

### ARQ-02 — `tenant_id` hardcoded em 3 arquivos

```js
// site/supabase.js, admin/supabase.js, index.ts
export const TENANT_ID = 'a1b2c3d4-0000-0000-0000-000000000001'
```

O schema suporta multi-tenant. O código é mono-tenant. Para virar SaaS, seria necessário:
1. Identificar o tenant pelo domínio (já existe `idx_tenants_dominio`)
2. Buscar o tenant_id dinamicamente na inicialização

Enquanto isso não for feito, o `TENANT_ID` hardcoded é uma dívida aceitável mas que cresce a cada arquivo novo.

---

### ARQ-03 — Validação de CPF, WhatsApp e email apenas no frontend

O CPF é validado com algoritmo completo (`validarCPF()`) — correto. Mas se o cliente desativar JS ou chamar o Supabase diretamente, não há validação server-side. A Edge Function não valida o payload além de verificar `if (!row)`.

**Impacto:** Dados inválidos chegam ao banco. Para volume pequeno, gerenciável. Para SaaS com múltiplos tenants, é risco de integridade.

---

### ARQ-04 — Admin depende de RLS correta mas não tem dupla verificação

O admin usa a anon key + token JWT do usuário logado. A proteção de dados depende 100% do RLS. Se uma policy estiver errada (e a policy de inserção está com `WITH CHECK (true)`), não há camada de defesa adicional no admin.

**Para SaaS:** O admin de um tenant nunca deve conseguir ler dados de outro tenant mesmo se o código tiver um bug. Isso já está implementado via `fn_meu_tenant_id()`, mas não testado.

---

### ARQ-05 — Sem rate limiting em nenhum endpoint público

- O site pode ser chamado por bots que criam reservas fake em loop
- A Edge Function pode ser chamada em loop para spam de email
- O Supabase não tem rate limiting configurado por padrão no plano free

---

## 7. Auditoria Supabase

### Schema

| Tabela | Status | Observação |
|--------|--------|------------|
| tenants | ✅ OK | Bem modelada. |
| usuarios | ✅ OK | Trigger de signup correto. |
| categorias | ✅ OK | Índices por tenant+slug. |
| protecoes | ✅ OK | |
| adicionais | ✅ OK | Campo `is_cadeirinha` bem usado. |
| sazonalidade | ✅ OK | Campo `precos` JSONB para mapa slug→preço. |
| locais | ✅ OK | `010_locais.sql` bem estruturado. |
| solicitacoes | ⚠️ ATENÇÃO | Campo `numero` não está na migration. Campo `companhia_aerea` não existe. |
| solicitacao_itens | ✅ OK | ON DELETE CASCADE correto. |
| documentos | ✅ OK | |
| condutores_adicionais | ✅ OK | |
| translados | ✅ OK | |

### Migrations

| Arquivo | Status |
|---------|--------|
| 001–005 | ✅ Parecem completas |
| 006 | ⚠️ Falta `numero SERIAL` e `companhia_aerea text` |
| 007 | Não verificado em detalhe |
| 008 | ✅ Triggers corretos |
| 009 | ⚠️ `solicitacoes: inserção pública` com `WITH CHECK (true)` — sem validação |
| 010 | ✅ OK |
| `all_migrations.sql` | ⚠️ Arquivo de bundle — risco de desincronização com migrations individuais |
| `seed.sql` | ⚠️ Preço de "DEVOLUÇÃO NO AEROPORTO" está R$ 50,00; banco tem R$ 69,90 |

### Triggers

| Trigger | Status |
|---------|--------|
| `trg_solicitacoes_atualizado_em` | ✅ Correto |
| `trg_solicitacoes_validar_status` | ✅ Correto, mas frontend expõe transição inválida |
| `trg_auth_criar_usuario` | ✅ Correto — só insere se `tenant_id` nos metadados |

### RLS — Avaliação

| Tabela | SELECT anon | INSERT anon | UPDATE anon | Risco |
|--------|-------------|-------------|-------------|-------|
| categorias | ✅ só ativas | ❌ bloqueado | ❌ bloqueado | OK |
| protecoes | ✅ só ativas | ❌ bloqueado | ❌ bloqueado | OK |
| adicionais | ✅ só ativas | ❌ bloqueado | ❌ bloqueado | OK |
| solicitacoes | ⚠️ só próprias (por usuario_id) | ⚠️ WITH CHECK (true) | ❌ bloqueado | **INSERT sem validação** |
| solicitacao_itens | ⚠️ só próprias | ⚠️ WITH CHECK (true) | ❌ bloqueado | **INSERT sem validação** |

**Nota:** A política "cliente lê as próprias" (`usuario_id = auth.uid()`) funciona para usuários logados. Para usuários anônimos (fluxo atual), `auth.uid()` retorna NULL. Isso significa que **um usuário anônimo não consegue ler suas próprias reservas depois de criadas** — o que é consistente com o fluxo atual (sem conta), mas não funciona para um futuro "minha conta".

---

## 8. Auditoria Vercel/Deploy

### vercel.json

```json
{
  "rewrites": [
    { "source": "/admin/(.*)", "destination": "/admin/$1" },
    { "source": "/(.*)",       "destination": "/site/$1"  }
  ]
}
```

**Problemas:**
1. `/admin/` sem trailing path não é capturado pelo rewrite `admin/(.*)` — pode retornar 404 ao acessar `https://fase1site.vercel.app/admin` sem barra.
2. Nenhuma variável de ambiente configurada no Vercel (chaves estão hardcoded no JS).
3. Nenhuma proteção de rota server-side para o admin.
4. O rewrite `/(.*) → /site/$1` captura tudo, incluindo `/admin/` se a primeira regra não casar — pode ser imprevisível dependendo da ordem de avaliação do Vercel.

**Não verificável:** Estado atual das variáveis de ambiente no painel Vercel, logs de deploy, domínio customizado.

---

## 9. Dívida Técnica

| Item | Impacto | Urgência |
|------|---------|---------|
| Motor de cotação em 3 lugares | Alto — preços divergem | Antes do Workspace |
| `tenant_id` hardcoded | Médio — bloqueia SaaS | Antes de SaaS |
| Sem paginação no dashboard | Baixo agora, alto com volume | Antes de 500 reservas |
| Admin sem middleware de auth | Médio — superfície de ataque | Antes de produção |
| `numero` não versionado | Alto — quebra em rebuild | Imediato |
| `all_migrations.sql` pode divergir das individuais | Médio | Imediato |
| `seed.sql` desatualizado | Baixo | Próxima atualização de preço |
| CPF em texto puro | Médio (LGPD) | Antes de crescer base de clientes |
| Sem logs de auditoria de ações admin | Médio | Antes de SaaS |
| Sem testes automatizados | Alto a longo prazo | Antes de refatoração grande |

---

## 10. Plano de Correção Priorizado

### Fase 1 — Antes de qualquer tráfego real (esta semana)

| # | Item | Prioridade | Dificuldade | Risco de quebra | Ordem |
|---|------|-----------|-------------|-----------------|-------|
| 1 | Revogar e rotacionar chave Resend (SEC-01) | 🔴 CRÍTICO | 1 | Nenhum | 1º |
| 2 | Corrigir WhatsApp no email do cliente (BUG-01) | 🔴 CRÍTICO | 1 | Nenhum | 2º |
| 3 | Adicionar validação de `row.id` na Edge Function (SEC-02) | 🔴 CRÍTICO | 2 | Baixo | 3º |
| 4 | Mover RESEND_KEY para variável de ambiente (SEC-01) | 🔴 CRÍTICO | 1 | Nenhum | 4º |
| 5 | Criar migration `011` com campo `numero` (BUG-03) | 🔴 CRÍTICO | 2 | Médio — testar em staging | 5º |
| 6 | Corrigir índices do filtro de busca (BUG-04) | 🟠 ALTO | 1 | Nenhum | 6º |
| 7 | Corrigir transições de status no frontend (BUG-05) | 🟠 ALTO | 1 | Nenhum | 7º |

### Fase 2 — Antes do Workspace/chat (próximas 2–4 semanas)

| # | Item | Prioridade | Dificuldade | Risco de quebra | Ordem |
|---|------|-----------|-------------|-----------------|-------|
| 8 | Centralizar `calcDias()` (ARQ-01, BUG-06) | 🟠 ALTO | 3 | Médio — testar cálculos | 1º |
| 9 | Criar Edge Function `calcular-cotacao` (ARQ-01) | 🟠 ALTO | 3 | Baixo | 2º |
| 10 | Mover inserção de solicitação para Edge Function (SEC-04) | 🟠 ALTO | 4 | Médio | 3º |
| 11 | Corrigir texto hardcoded da hero (BUG-07) | 🟡 MÉDIO | 1 | Nenhum | 4º |
| 12 | Corrigir fallback de locais (BUG-08) | 🟡 MÉDIO | 1 | Nenhum | 5º |
| 13 | Adicionar limite ao dashboard (BUG-10) | 🟡 MÉDIO | 1 | Nenhum | 6º |
| 14 | Adicionar migration de `companhia_aerea` (BUG-02) | 🟡 MÉDIO | 2 | Baixo | 7º |
| 15 | Atualizar `seed.sql` com preços atuais (BUG-11) | 🟡 MÉDIO | 1 | Nenhum | 8º |

### Fase 3 — Antes de virar SaaS

| # | Item | Prioridade | Dificuldade | Risco de quebra |
|---|------|-----------|-------------|-----------------|
| 16 | Resolver `tenant_id` por domínio em vez de hardcoded (ARQ-02) | 🟠 ALTO | 4 | Alto — refatoração completa |
| 17 | Mover chaves para variáveis de ambiente Vercel (SEC-03) | 🟠 ALTO | 2 | Baixo |
| 18 | Adicionar middleware de auth Vercel para /admin (SEC-05) | 🟠 ALTO | 3 | Baixo |
| 19 | Validação server-side de CPF/email na Edge Function (ARQ-03) | 🟡 MÉDIO | 2 | Nenhum |
| 20 | Rate limiting na Edge Function | 🟡 MÉDIO | 3 | Nenhum |
| 21 | Auditoria de ações admin (log de quem mudou o quê) | 🟡 MÉDIO | 3 | Nenhum |
| 22 | Criptografia de CPF em repouso (LGPD) | 🟡 MÉDIO | 4 | Alto |

### Fase 4 — Melhorias futuras

- Testes automatizados do motor de cotação
- Paginação cursor-based nas listagens do admin
- Webhooks de status para integração com WhatsApp API
- Portal do cliente com autenticação (ver histórico de reservas)
- Separar domínio do admin (`admin.igufoz.com.br`)
- Monitoramento de erros (Sentry ou similar)
- KPIs em tempo real via Supabase Realtime

---

## 11. Próximos Passos Recomendados

**Hoje (não espere):**
1. Acesse o dashboard do Resend, revogue a chave `re_51Rozuwe_*` e gere uma nova
2. Adicione a nova chave como variável de ambiente na Edge Function do Supabase
3. Corrija o WhatsApp no email (`554599999999` → `5545988182995`)

**Esta semana:**
4. Crie a migration `011` para o campo `numero`
5. Corrija os 3 bugs do admin (filtro, transições de status)
6. Verifique se `SUPABASE_SERVICE_ROLE_KEY` está configurada no ambiente da Edge Function

**Pergunta para você:** Posso iniciar as correções pelos **itens 1 a 7 da Fase 1** (os críticos e altos de impacto imediato)?

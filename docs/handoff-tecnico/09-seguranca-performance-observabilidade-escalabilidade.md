# Parte 9 — Segurança, Performance, Observabilidade, Escalabilidade

## 15. Segurança

### 15.1 Login / Sessão

Supabase Auth, e-mail+senha, fluxo **PKCE** (corrigido nesta sessão histórica — commit `b5cf19d` — para recuperação de senha funcionar via `onAuthStateChange`). Sessão gerenciada pelo SDK `@supabase/supabase-js` (localStorage do navegador), sem implementação de auth customizada (RS-03 do CLAUDE.md respeitado).

### 15.2 Permissões

Modelo de 3 papéis em `usuarios.role`: `cliente`, `operador`, `admin` (CHECK constraint no banco). `fn_sou_admin()` trata `admin` e `operador` como equivalentes para fins de autorização — **não há distinção de privilégio entre os dois** em nenhuma policy RLS ou Edge Function auditada (ou seja, `operador` tem, na prática, os mesmos poderes de `admin` em tudo que usa `fn_sou_admin()`, exceto onde código checa `role === 'admin'` explicitamente, como em `admin-user-manager`).

### 15.3 RLS — estado real (auditado direto no banco)

19 tabelas de negócio com RLS habilitado, confirmado via `pg_class.relrowsecurity` (não apenas inferido dos arquivos `.sql`, que estão desatualizados — ver Parte 4.6). Detalhamento completo na Parte 4.5.

**Problemas de segurança identificados nesta auditoria, com status de correção:**

| # | Problema | Severidade | Status |
|---|---|---|---|
| 1 | `dashboard_dados` RPC confiava no `tenant_id` enviado pelo chamador (IDOR — qualquer autenticado lia dados de outro tenant) | 🔴 Crítico | ✅ **Corrigido nesta sessão** (migration 019) |
| 2 | `inserir_solicitacao_completa` não revalidava tenant/categoria/proteção (bypassável via RPC direta) | 🟠 Alto | ✅ **Corrigido nesta sessão** (migration 019) |
| 3 | XSS em campos não escapados no `apps/intake-admin` (`dashboard.js`, `reservas.js`, `admin.js`) | 🟡 Médio | ✅ **Corrigido nesta sessão** |
| 4 | Rate limit de `criar-solicitacao` em memória por isolate (trivialmente contornável) | 🟢 Baixo | ✅ **Corrigido nesta sessão** (tabela `rate_limits` + `fn_checar_rate_limit`) |
| 5 | `numero` de solicitação `SERIAL` global vazando volume entre tenants | 🟢 Baixo | ✅ **Corrigido nesta sessão** (contador por tenant) |
| 6 | Formato de erro não estruturado (`{error: "string"}` em vez de `{error:{code,message,details}}`, RB-03) | 🟢 Baixo | ✅ **Corrigido nesta sessão** em `check-disponibilidade`, `criar-solicitacao`, `notificar-reserva` — **`admin-user-manager` ainda não corrigido** (fora do escopo, função descoberta só ao final desta sessão) |
| 7 | Token GitHub (`ghp_...`) salvo em texto puro no `.git/config` do repositório `pawigufoz`/`i-frotas` | 🔴 Crítico | ✅ **Revogado e remote limpo nesta sessão** |
| 8 | E-mail admin "fantasma" sem caixa real, impossibilitando recuperação de senha | 🟠 Alto | ✅ **Corrigido nesta sessão** (conta migrada para e-mail real, registros de auditoria reatribuídos antes da exclusão) |
| 9 | **Múltiplas policies de INSERT coexistindo em `solicitacoes` e `solicitacao_itens`**, sendo a mais permissiva (`WITH CHECK true`) sempre vencedora por serem combinadas em `OR` pelo Postgres — anula a policy mais restrita que valida tenant ativo | 🟡 Médio | ❌ **Não corrigido** — achado desta auditoria final, não tratado nas correções anteriores |
| 10 | Policies de leitura pública (`categorias`, `protecoes`, `adicionais`, `sazonalidade`, `locais`) filtram só `ativo=true`, **sem checar tenant** — em cenário multi-tenant real, dados de um tenant vazam para visitantes de outro | 🟡 Médio | ❌ **Não corrigido** — só não é explorável hoje porque existe 1 único tenant |
| 11 | RLS de `frota_veiculos`/`frota_reservas`/`frota_patios` permite escrita a **qualquer usuário autenticado do tenant**, sem exigir `fn_sou_admin()` — um `role='cliente'` tecnicamente pode escrever na frota via API direta (REST), só não tem como fazer isso pela UI | 🟡 Médio | ❌ **Não corrigido** |
| 12 | `admin-user-manager`: erro do `INSERT` em `usuarios` não verificado na ação `create`, podendo gerar usuário "fantasma" órfão no Auth se `role` inválida for enviada | 🟠 Alto | ❌ **Não corrigido** — descoberto só na escrita deste handoff |
| 13 | `normalizeCategoria()` do import gera `'J-PREMIUM'`/`'U-UTILITARIO'` sem espaço, inconsistente com o `SLUG_MAP` (com espaço) — bug latente que vai reproduzir o caso GRUPO J na próxima sincronização dessas categorias | 🟠 Alto (funcional, não segurança) | ❌ **Não corrigido** |
| 14 | Regra de horário de funcionamento do local (`locais.hora_retirada_inicio/fim` etc.) não validada server-side em `criar-solicitacao` | 🟢 Baixo | ❌ **Não corrigido** |
| 15 | `max_cadeirinhas` da categoria não validado server-side contra a quantidade de adicionais do tipo cadeirinha pedidos | 🟢 Baixo | ❌ **Não corrigido** |

### 15.4 Proteção de rotas

- Apps `apps/intake-admin` e `apps/frota-ops`: cada um implementa um guard de roteamento que checa sessão Supabase Auth ativa antes de renderizar qualquer página administrativa (login screen como fallback). Não há middleware de servidor — é tudo client-side, **a proteção real é a RLS do banco**, não a UI (correto do ponto de vista de segurança: mesmo que alguém burle a tela de login via DevTools, RLS ainda bloqueia leitura/escrita não autorizada).
- `apps/site`: nenhuma rota protegida — tudo público por natureza.

### 15.5 Proteção do banco

RLS em todas as tabelas de negócio (Parte 4.5), `SECURITY DEFINER` usado conscientemente nas funções que precisam elevar privilégio temporariamente (`fn_sou_admin`, `fn_meu_tenant_id`, RPCs de escrita complexa) — padrão correto, mas **sem `SET search_path` explícito em todas elas** (só `fn_criar_usuario_no_signup` tem `SET search_path TO 'public'`) — risco teórico de search_path hijacking nas demais `SECURITY DEFINER` functions, mitigado na prática porque o schema `public` é o padrão e não há schemas maliciosos no projeto, mas é uma prática de hardening recomendada e inconsistente.

### 15.6 Proteção das APIs (Edge Functions)

Ver Parte 7 — CORS configurável, rate limit persistente em `criar-solicitacao`, validação de entrada na borda (RB-02) na maioria dos campos, mas com lacunas pontuais (15.3, itens 14 e 15).

### 15.7 Dados sensíveis e LGPD

Dados pessoais armazenados: nome, e-mail, WhatsApp, CPF, passaporte (`cliente_doc`), documentos de identificação (`documentos.arquivo_url` — provavelmente Supabase Storage), data de nascimento.

**Não auditado nesta sessão**: políticas de Storage (buckets, RLS de Storage) para `documentos.arquivo_url` e fotos de categoria (`categorias.imagem_url`) — RS-05 do CLAUDE.md ("buckets com políticas de acesso configuradas") não foi verificado neste handoff. **Recomendação ao próximo desenvolvedor**: auditar Storage explicitamente, pois documentos de CNH/passaporte são dados pessoais sensíveis.

**Não há nenhuma política de retenção/expurgo de dados documentada** — `solicitacoes` canceladas, documentos de clientes antigos, tudo permanece indefinidamente. Sem direito ao esquecimento implementado (LGPD Art. 18). Risco de compliance real, não tratado nesta sessão.

---

## 16. Performance

### 16.1 Consultas críticas

- `checkDisponibilidade()`: 2 queries paralelas (`Promise.all`) em `frota_veiculos` e `frota_reservas`, cada uma filtrando por `tenant_id` + `categoria` — cobertas pelos índices `idx_frota_veiculos_tenant`/`_categoria` e `idx_frota_reservas_tenant`/`_categoria`/`_status`/`_datas`. Chamada **3 vezes** por fluxo completo de reserva (1x ao consultar disponibilidade no site, 1x dentro de `criar-solicitacao` antes de inserir, e potencialmente mais vezes se o cliente mudar categoria/data repetidamente no formulário) — sem cache entre chamadas.
- `dashboard_dados()`: agrega via CTEs (`WITH`) num único round-trip — desenhado deliberadamente para substituir uma versão anterior que carregava 500 registros no cliente (comentário no próprio SQL: "PERF-01 FIX").

### 16.2 Cache

**Nenhum cache de aplicação encontrado** (nem em memória, nem Redis, nem HTTP cache headers customizados nas Edge Functions). O único "cache" do sistema é o Service Worker do `apps/frota-ops` (cache-first para assets estáticos — CSS/JS/imagens, não para dados).

### 16.3 Índices

Documentados na Parte 4.2. Cobertura razoável para os padrões de query observados (`tenant_id` + filtro secundário). Não há `EXPLAIN ANALYZE` registrado em nenhum lugar do repositório — RP-06/RR-03 do CLAUDE.md (justificativa de índice documentada, EXPLAIN ANALYZE em PR que adiciona query) não são seguidos na prática.

### 16.4 Gargalos conhecidos/suspeitos

- `criar-solicitacao` faz **até 6 round-trips sequenciais ou semi-sequenciais** ao banco (tenant → categoria+proteção em paralelo → disponibilidade → sazonalidade → adicionais → RPC final) — não é paralelizado ao máximo possível (ex. a consulta de `tenant` poderia rodar em paralelo com `categoria`/`protecao`, mas roda antes, sequencialmente).
- `rate_limits`: cada chamada de `criar-solicitacao` agora faz um round-trip extra (RPC `fn_checar_rate_limit`) antes de processar — trade-off aceito conscientemente nesta sessão (segurança > latência marginal).
- Sem paginação visível em algumas listagens do admin (ex. `dashboard_dados` limita "recentes" a 10, mas outras telas como `pages/clientes.js` não foram auditadas quanto a paginação).

### 16.5 Tempo médio / consultas pesadas

**Não medido nesta sessão** — não há instrumentação de tempo de resposta em nenhum dos módulos (ver Observabilidade, 17).

### 16.6 Otimizações já realizadas

- Migração de `dashboard.js` de "carregar 500 registros no cliente e agregar em JS" para RPC `dashboard_dados` que agrega no banco (documentado no próprio código como "PERF-01 FIX").
- Índices compostos `(tenant_id, ativo)` em todas as tabelas de catálogo público.
- `Promise.all` usado consistentemente para paralelizar queries independentes onde aplicável.

---

## 17. Observabilidade

### 17.1 Logs

`console.log`/`console.warn`/`console.error` usados nas Edge Functions (ex. `[criar-solicitacao]`, `[check-disponibilidade]` como prefixo) — esses logs vão para o painel de Logs do Supabase (`get_logs` via MCP), mas **não há agregador externo** (Sentry, Datadog, etc.) integrado a nenhum módulo.

**RO-05 do CLAUDE.md** ("nenhum console.log em produção, usar logging estruturado") **não é seguido à risca**: `apps/frota-ops/js/utils.js` tem um objeto `logger` (visto em uso: `logger.error(...)` em `pages/disponibilidade.js`), sugerindo uma tentativa de logging estruturado nesse app específico — mas `apps/site` e `apps/intake-admin` usam `console.*` direto sem abstração.

### 17.2 Monitoramento

**Não há dashboard de monitoramento de aplicação configurado** além do painel nativo do Supabase (logs, métricas básicas de banco) e da Vercel (analytics de deploy/hosting básico). Sem alertas configurados (RSeg-04/observabilidade do CLAUDE.md não atendidos).

### 17.3 Tratamento de erros

- Frontend: `try/catch` ao redor de cada chamada de rede, com mensagem amigável ao usuário (`esc()`-escapada após a correção desta sessão).
- Edge Functions: `try/catch` no handler principal, sempre retornando resposta estruturada (após correção desta sessão) em vez de vazar stack trace.
- Banco: exceções de trigger (`RAISE EXCEPTION`) propagam como erro Postgres padrão até o chamador (Edge Function ou cliente Supabase), que precisa tratar `error.message`.

### 17.4 Alertas

**Nenhum configurado.**

### 17.5 Auditoria

`audit_log` (genérico, opt-in por código) e `frota_movimentacoes` (automático via trigger, só para frota) — ver Parte 4. Não foi localizado, nesta auditoria, qual código de fato popula `audit_log` a partir do frontend (a tabela existe, tem RLS, mas o "quem chama o insert" não foi rastreado até a origem em todos os fluxos — possível gap entre intenção e implementação real).

### 17.6 Métricas

**Nenhuma métrica de negócio é coletada e visualizada além do que `dashboard_dados` calcula sob demanda** (não há série temporal armazenada, é sempre cálculo ao vivo sobre o estado atual do banco).

---

## 18. Escalabilidade

### 18.1 Partes que suportam crescimento bem

- **Modelo multi-tenant desde a raiz do schema**: adicionar um segundo tenant real é, em teoria, só inserir uma linha em `tenants` e cadastrar o catálogo dele — a arquitetura de dados já suporta isso.
- **Edge Functions stateless**: escalam horizontalmente por natureza (Deno Deploy/Supabase Edge Runtime).
- **Índices compostos por `tenant_id`**: ajudam a manter performance conforme o volume cresce por tenant.

### 18.2 Partes que precisarão mudar antes de crescer

- **`solicitacoes` policy `anon pode inserir solicitacoes`** tem `tenant_id` **hardcoded** para o único tenant atual — isso **quebra completamente** assim que um segundo tenant existir (o site de um segundo tenant não conseguiria inserir solicitação nenhuma, a menos que vire uma policy nova ou seja generalizada). Mesma observação vale para o `TENANT_ID` hardcoded em 4 lugares de código (Parte 6.2/7.4) — multi-tenant real exige que isso vire dinâmico (subdomínio, config por deploy, etc.), não constante de código.
- **Policies de leitura pública sem filtro de tenant** (15.3, item 10): com 2+ tenants, vazam catálogo entre eles.
- **`frota_veiculos.placa` é UNIQUE globalmente, não por tenant**: duas locadoras (tenants) diferentes não podem ter, coincidentemente, a mesma placa cadastrada — fisicamente isso não devia colidir entre empresas diferentes mundo real, mas a constraint do banco impediria mesmo que fosse legítimo (ex. placas reaproveitadas/trocadas de estado).
- **Rate limit por IP**: numa escala maior, atendentes/clientes atrás do mesmo NAT/proxy corporativo podem ser injustamente limitados juntos — não há diferenciação por usuário autenticado, só por IP.

### 18.3 Gargalos atuais (se o volume crescer hoje, sem mudar nada)

- `checkDisponibilidade` roda em todo carregamento de formulário/sidebar sem nenhum cache — com volume alto de usuários simultâneos consultando disponibilidade, é puramente carga de leitura no Postgres (mitigável com índices já existentes, mas sem cache em camada alguma).
- Falta de paginação/cursor em algumas listagens administrativas pode degradar conforme `solicitacoes`/`frota_reservas` crescem para dezenas de milhares de linhas.
- Sem CDN/cache de borda para as respostas das Edge Functions (cada chamada bate direto no Postgres).

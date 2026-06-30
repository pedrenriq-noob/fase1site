# Parte 4 — Banco de Dados (Documentação Completa)

> Projeto Supabase: `lxfnqzuzohudqwibgdic` · PostgreSQL 17 · Auditado diretamente no banco em produção em 2026-06-30 (não apenas pelos arquivos `.sql` do repositório — há divergência entre os dois, ver nota no final).

## 8.1 Tabelas — colunas completas

### `tenants`
| Coluna | Tipo | Nulo? | Default |
|---|---|---|---|
| id | uuid | não | `gen_random_uuid()` |
| nome | text | não | — |
| cnpj | text | sim | — (UNIQUE) |
| plano | text | não | `'basic'` |
| whatsapp_central | text | não | — |
| dominio | text | sim | — |
| ativo | boolean | não | `true` |
| criado_em | timestamptz | não | `now()` |

### `usuarios`
| Coluna | Tipo | Nulo? | Default |
|---|---|---|---|
| id | uuid | não | — (PK = FK para `auth.users.id`) |
| tenant_id | uuid | não | — |
| nome | text | não | — |
| email | text | não | — (UNIQUE) |
| whatsapp | text | sim | — |
| cpf | text | sim | — |
| data_nascimento | date | sim | — |
| role | text | não | `'cliente'` (CHECK: cliente/admin/operador) |
| criado_em | timestamptz | não | `now()` |
| ativo | boolean | não | `true` |

### `categorias`
| Coluna | Tipo | Nulo? | Default |
|---|---|---|---|
| id | uuid | não | `gen_random_uuid()` |
| tenant_id | uuid | não | — |
| slug | text | não | — (UNIQUE com tenant_id) |
| nome | text | não | — |
| descricao | text | sim | — |
| preco_diaria | numeric | não | — |
| transmissao | text | sim | CHECK: manual/automatico |
| max_pessoas | integer | não | `5` |
| max_cadeirinhas | integer | não | `2` |
| quantidade_frota | integer | não | `1` |
| imagem_url | text | sim | — |
| ordem | integer | não | `0` |
| ativo | boolean | não | `true` |
| criado_em | timestamptz | não | `now()` |

### `protecoes`
| Coluna | Tipo | Nulo? | Default |
|---|---|---|---|
| id | uuid | não | `gen_random_uuid()` |
| tenant_id | uuid | não | — |
| nome | text | não | — |
| descricao | text | sim | — |
| preco | numeric | não | — |
| tipo_preco | text | não | CHECK: per_day/fixed |
| franquia | text | sim | — |
| pre_autorizacao | numeric | sim | — |
| ordem | integer | não | `0` |
| ativo | boolean | não | `true` |
| criado_em | timestamptz | não | `now()` |

### `adicionais`
| Coluna | Tipo | Nulo? | Default |
|---|---|---|---|
| id | uuid | não | `gen_random_uuid()` |
| tenant_id | uuid | não | — |
| nome | text | não | — |
| descricao | text | sim | — |
| preco | numeric | não | — |
| tipo_preco | text | não | CHECK: per_day/fixed |
| permite_quantidade | boolean | não | `false` |
| is_cadeirinha | boolean | não | `false` |
| estoque | integer | sim | — |
| ordem | integer | não | `0` |
| ativo | boolean | não | `true` |
| criado_em | timestamptz | não | `now()` |

### `sazonalidade`
| Coluna | Tipo | Nulo? | Default |
|---|---|---|---|
| id | uuid | não | `gen_random_uuid()` |
| tenant_id | uuid | não | — |
| nome | text | não | — |
| data_inicio | date | não | — |
| data_fim | date | não | — (CHECK `>= data_inicio`) |
| precos | jsonb | não | `'{}'` |
| ativo | boolean | não | `true` |
| criado_em | timestamptz | não | `now()` |

### `locais`
| Coluna | Tipo | Nulo? | Default |
|---|---|---|---|
| id | uuid | não | `gen_random_uuid()` |
| tenant_id | uuid | não | — |
| nome | text | não | — (UNIQUE com tenant_id) |
| permite_retirada | boolean | não | `true` |
| permite_devolucao | boolean | não | `true` |
| hora_retirada_inicio/fim | time | sim | — |
| hora_devolucao_inicio/fim | time | sim | — |
| disponivel_domingo | boolean | não | `true` |
| is_aeroporto | boolean | não | `false` |
| ativo | boolean | não | `true` |
| ordem | integer | não | `0` |
| criado_em | timestamptz | não | `now()` |

### `solicitacoes`
| Coluna | Tipo | Nulo? | Default |
|---|---|---|---|
| id | uuid | não | `gen_random_uuid()` |
| tenant_id | uuid | não | — |
| usuario_id | uuid | sim | — |
| categoria_id | uuid | não | — |
| protecao_id | uuid | sim | — |
| cliente_nome/email/whatsapp | text | não | — |
| cliente_cpf | text | sim | — |
| data_retirada/devolucao | timestamptz | não | — (CHECK devolucao > retirada) |
| local_retirada/devolucao | text | não | — |
| numero_voo | text | sim | — |
| horario_pouso | text | sim | — |
| pessoas | integer | não | `1` |
| valor_estimado | numeric | não | — |
| observacoes | text | sim | — |
| motivo_cancelamento | text | sim | — |
| status | text | não | `'solicitada'` (CHECK 5 valores) |
| criado_em/atualizado_em/status_alterado_em | timestamptz | não | `now()` |
| companhia_aerea | text | sim | — |
| numero | integer | sim | `nextval('solicitacoes_numero_seq')` — **sobrescrito pelo trigger `trg_numero_por_tenant`, ver 8.3** |
| estrangeiro | boolean | sim | `false` |
| cliente_doc | text | sim | — |

### `solicitacao_itens`
| Coluna | Tipo | Nulo? | Default |
|---|---|---|---|
| id | uuid | não | `gen_random_uuid()` |
| solicitacao_id | uuid | não | — (FK CASCADE) |
| adicional_id | uuid | não | — |
| quantidade | integer | não | `1` (CHECK `> 0`) |
| preco_unitario | numeric | não | — |
| tipo_preco | text | não | CHECK: per_day/fixed |

### `documentos`
| Coluna | Tipo | Nulo? | Default |
|---|---|---|---|
| id | uuid | não | `gen_random_uuid()` |
| usuario_id | uuid | não | — (FK CASCADE) |
| tenant_id | uuid | não | — |
| tipo | text | não | CHECK: cnh/passaporte/rg |
| numero | text | sim | — |
| validade | date | sim | — |
| categoria_cnh | text | sim | CHECK: A/B/AB/C/D/E |
| arquivo_url | text | sim | — |
| verificado | boolean | não | `false` |
| criado_em | timestamptz | não | `now()` |

### `condutores_adicionais`
| Coluna | Tipo | Nulo? | Default |
|---|---|---|---|
| id | uuid | não | `gen_random_uuid()` |
| usuario_id | uuid | não | — (FK CASCADE) |
| tenant_id | uuid | não | — |
| nome | text | não | — |
| cpf | text | sim | — |
| cnh_numero/validade/categoria/arquivo_url | text/date | sim | — |
| criado_em | timestamptz | não | `now()` |

### `translados`
| Coluna | Tipo | Nulo? | Default |
|---|---|---|---|
| id | uuid | não | `gen_random_uuid()` |
| solicitacao_id | uuid | não | — |
| usuario_id | uuid | não | — |
| tenant_id | uuid | não | — |
| numero_voo | text | não | — |
| data_voo | date | não | — |
| horario_pouso | time | não | — |
| pessoas | integer | não | — (CHECK `> 0`) |
| observacoes | text | sim | — |
| status | text | não | `'pendente'` (CHECK 3 valores) |
| confirmado_em | timestamptz | sim | — |
| solicitado_em | timestamptz | não | `now()` |

### `frota_veiculos`
| Coluna | Tipo | Nulo? | Default |
|---|---|---|---|
| id | uuid | não | `gen_random_uuid()` |
| tenant_id | uuid | não | — |
| placa | text | não | — (**UNIQUE global**, não por tenant) |
| categoria | text | não | — (texto livre, sem FK) |
| modelo | text | não | — |
| fabricante/cor | text | sim | — |
| status | text | não | `'DISPONIVEL'` (CHECK 5 valores) |
| limpo | boolean | não | `true` |
| patio_atual | text | sim | — |
| hora_entrada_lavador | timestamptz | sim | — |
| prev_retorno | timestamptz | sim | — |
| ponto_retorno/retirada | text | sim | — |
| updated_at | timestamptz | não | `now()` (auto via trigger) |
| updated_by | uuid | sim | — (FK `auth.users`) |

### `frota_reservas`
| Coluna | Tipo | Nulo? | Default |
|---|---|---|---|
| id | uuid | não | `gen_random_uuid()` |
| tenant_id | uuid | não | — |
| locacao_numero | text | sim | — (UNIQUE com tenant_id) |
| cliente | text | sim | — |
| categoria | text | não | — (texto livre, sem FK) |
| placa_atribuida | text | sim | — |
| data_saida/data_retorno_prev | timestamptz | não | — |
| ponto_retirada/retorno | text | sim | — |
| status | text | não | `'PREVISTO'` (CHECK 4 valores) |
| obs | text | sim | — |
| created_at | timestamptz | não | `now()` |
| created_by | uuid | sim | — (FK `auth.users`) |
| condutor | text | sim | — |
| frequencia | text | sim | — |
| locacao_id_ext | bigint | sim | — (id no sistema legado) |
| sincronizado_em | timestamptz | sim | — |

### `frota_patios`
| Coluna | Tipo | Nulo? | Default |
|---|---|---|---|
| id | uuid | não | `gen_random_uuid()` |
| tenant_id | uuid | não | — |
| nome | text | não | — (UNIQUE com tenant_id) |
| tipo | text | não | `'patio'` (CHECK: patio/retorno/retirada) |
| ativo | boolean | não | `true` |
| ordem | integer | não | `0` |
| created_at | timestamptz | não | `now()` |

### `frota_movimentacoes`
| Coluna | Tipo | Nulo? | Default |
|---|---|---|---|
| id | uuid | não | `gen_random_uuid()` |
| veiculo_id | uuid | não | — (FK CASCADE) |
| tipo | text | não | CHECK: 7 valores (SAIDA/RETORNO/PATIO/LIMPEZA/LAVADOR_ENTRADA/LAVADOR_SAIDA/STATUS) |
| valor_antes/valor_depois | jsonb | sim | — |
| obs | text | sim | — |
| created_at | timestamptz | não | `now()` |
| created_by | uuid | sim | — (FK `auth.users`) |

### `audit_log`
| Coluna | Tipo | Nulo? | Default |
|---|---|---|---|
| id | uuid | não | `gen_random_uuid()` |
| tenant_id | uuid | não | — |
| usuario_id | uuid | sim | — (FK `auth.users` `ON DELETE SET NULL`) |
| acao | text | não | — |
| entidade | text | não | — |
| entidade_id | uuid | sim | — |
| descricao | text | sim | — |
| dados_antes/dados_depois | jsonb | sim | — |
| criado_em | timestamptz | sim | `now()` |

### `rate_limits` *(criada na migration 020, sessão atual)*
| Coluna | Tipo | Nulo? | Default |
|---|---|---|---|
| chave | text | não | — (PK) |
| contagem | integer | não | `1` |
| reset_em | timestamptz | não | — |

### `solicitacao_contadores` *(criada na migration 021, sessão atual)*
| Coluna | Tipo | Nulo? | Default |
|---|---|---|---|
| tenant_id | uuid | não | — (PK, FK `tenants`) |
| ultimo_numero | integer | não | `0` |

---

## 8.2 Índices

Além dos índices automáticos de PK/UNIQUE, existem índices manuais de performance:

| Tabela | Índice | Colunas | Propósito |
|---|---|---|---|
| `adicionais` | `idx_adicionais_tenant_ativo` | `(tenant_id, ativo)` | filtro de catálogo público |
| `audit_log` | `idx_audit_entidade` | `(entidade, entidade_id)` | busca de histórico por entidade |
| `audit_log` | `idx_audit_tenant_criado` | `(tenant_id, criado_em DESC)` | listagem cronológica do tenant |
| `categorias` | `idx_categorias_tenant_ativo` | `(tenant_id, ativo)` | catálogo público |
| `condutores_adicionais` | `idx_condutores_usuario` | `(usuario_id)` | lookup por cliente |
| `documentos` | `idx_documentos_usuario`, `idx_documentos_tenant` | — | lookup |
| `frota_movimentacoes` | `idx_frota_mov_veiculo`, `idx_frota_mov_tipo`, `idx_frota_mov_created` | — | histórico de veículo, filtro por tipo, ordenação |
| `frota_reservas` | `idx_frota_reservas_tenant`, `_categoria`, `_status`, `_datas (data_saida, data_retorno_prev)`, `_placa` | — | **crítico para `checkDisponibilidade`**, que filtra por tenant+categoria+status e cruza datas |
| `frota_veiculos` | `idx_frota_veiculos_status`, `_categoria`, `_tenant` | — | **crítico para `checkDisponibilidade`** |
| `locais` | `idx_locais_tenant_ativo` | — | catálogo público |
| `protecoes` | `idx_protecoes_tenant_ativo` | — | catálogo público |
| `sazonalidade` | `idx_sazonalidade_tenant_periodo` | `(tenant_id, data_inicio, data_fim)` | busca de período ativo |
| `solicitacao_itens` | `idx_solicitacao_itens_solicitacao` | — | join com solicitação |
| `solicitacoes` | `idx_solicitacoes_tenant_criado`, `_tenant_status`, `_usuario`, `idx_solicitacoes_tenant_numero` (UNIQUE) | — | dashboard, listagens, unicidade do número por tenant |
| `tenants` | `idx_tenants_dominio` | — | resolução de tenant por domínio (não usada em código encontrado — possivelmente preparada para roteamento multi-domínio futuro) |
| `translados` | `idx_translados_tenant_status`, `_solicitacao` | — | listagem |
| `usuarios` | `idx_usuarios_tenant`, `idx_usuarios_email` | — | lookup |

**Não há nenhuma `EXPLAIN ANALYZE` documentada no repositório** — RP-06 do CLAUDE.md ("todo índice deve ter justificativa documentada") não está sendo seguido à risca; os índices existem mas a justificativa é só inferida por nome/uso, não registrada formalmente.

---

## 8.3 Triggers

| Trigger | Tabela | Momento | Função | O que faz |
|---|---|---|---|---|
| `trg_frota_veiculos_updated_at` | `frota_veiculos` | BEFORE UPDATE | `fn_frota_veiculos_updated_at()` | Seta `NEW.updated_at = now()` |
| `trg_frota_log_movimentacao` | `frota_veiculos` | AFTER UPDATE | `fn_log_frota_movimentacao()` | Insere em `frota_movimentacoes` se `status`, `patio_atual` ou `limpo` mudaram (lógica `CASE` mapeia a transição de status para um `tipo` de movimentação) |
| `trg_solicitacoes_atualizado_em` | `solicitacoes` | BEFORE UPDATE | `fn_set_status_alterado_em()` | Se `status` mudou, atualiza `status_alterado_em` e `atualizado_em` |
| `trg_solicitacoes_validar_status` | `solicitacoes` | BEFORE UPDATE | `fn_validar_transicao_status()` | Bloqueia transições inválidas (ver Parte 5, Regra de Transição de Status) e exige `motivo_cancelamento` ao cancelar |
| `trg_numero_por_tenant` | `solicitacoes` | BEFORE INSERT | `fn_atribuir_numero_solicitacao()` | **Adicionado nesta sessão (migration 021)**: sobrescreve `NEW.numero` com o próximo valor atômico de `solicitacao_contadores` para aquele tenant |

> **Trigger não confirmado/órfão**: existe uma função `notificar_reserva_trigger()` no banco (usa `net.http_post` para chamar a Edge Function `notificar-reserva`), mas **não foi encontrada na lista de triggers ativos** consultada nesta auditoria (`information_schema.triggers`). Isso sugere que o trigger que a invocava foi removido em algum momento, ou nunca foi de fato anexado a uma tabela — a função existe "solta" no banco. Se ele ainda estiver ativo em alguma tabela não capturada pela consulta, toda vez que uma `solicitacao` for inserida ele chamaria a Edge Function `notificar-reserva`, que hoje é um **stub que não envia e-mail** (ver Parte 10). **Ação recomendada para o próximo desenvolvedor**: confirmar com `\d+ solicitacoes` ou re-consultar `information_schema.triggers` se esse trigger está de fato pendurado em alguma tabela, e decidir se remove a função morta ou a reativa quando o novo provedor de e-mail for escolhido.

---

## 8.4 Functions / Procedures

| Function | Tipo retorno | SECURITY | Propósito |
|---|---|---|---|
| `fn_meu_tenant_id()` | uuid | DEFINER | Retorna o `tenant_id` do `auth.uid()` atual — usada em quase toda policy RLS |
| `fn_sou_admin()` | boolean | DEFINER | Retorna `true` se `auth.uid()` tem `role IN ('admin','operador')` — base de toda autorização administrativa |
| `dashboard_dados(p_tenant_id, p_de, p_ate)` | jsonb | DEFINER | RPC que agrega KPIs/segmentos/recentes para o dashboard do intake-admin. **Corrigida nesta sessão** (era IDOR — ignorava `p_tenant_id` recebido, agora usa sempre `fn_meu_tenant_id()` e exige `fn_sou_admin()`) |
| `inserir_solicitacao_completa(p_sol, p_itens)` | jsonb | DEFINER | RPC transacional que insere `solicitacoes` + `solicitacao_itens` atomicamente. **Corrigida nesta sessão** para revalidar tenant ativo e que categoria/proteção pertencem ao tenant (antes confiava 100% na Edge Function chamadora) |
| `fn_checar_rate_limit(p_chave, p_limite, p_janela_segundos)` | boolean | DEFINER | **Nova nesta sessão (migration 020)**: upsert atômico em `rate_limits`, substitui rate limit em memória |
| `fn_limpar_rate_limits()` | void | DEFINER | **Nova nesta sessão**: housekeeping — apaga chaves de `rate_limits` expiradas há mais de 1h (não há cron configurado chamando isso — ver Parte 10) |
| `fn_atribuir_numero_solicitacao()` | trigger | DEFINER | **Nova nesta sessão (migration 021)**: atribui `numero` sequencial por tenant via `solicitacao_contadores` |
| `fn_criar_usuario_no_signup()` | trigger | DEFINER | Cria linha em `usuarios` a partir de `raw_user_meta_data` no signup do Auth |
| `fn_frota_veiculos_updated_at()` | trigger | (padrão invoker) | Atualiza timestamp |
| `fn_log_frota_movimentacao()` | trigger | DEFINER | Gera log automático de auditoria de frota |
| `fn_set_status_alterado_em()` | trigger | (padrão invoker) | Atualiza timestamps de solicitação |
| `fn_validar_transicao_status()` | trigger | (padrão invoker) | Valida máquina de estados de `solicitacoes.status` (a que está de fato anexada via `trg_solicitacoes_validar_status`) |
| `validar_transicao_status_solicitacao()` | trigger | (padrão invoker) | **Função duplicada/órfã** — corpo praticamente idêntico a `fn_validar_transicao_status()`, mas **não está anexada a nenhum trigger ativo** encontrado. Dívida técnica — provável resquício de refatoração anterior (ver Parte 10) |
| `notificar_reserva_trigger()` | trigger | DEFINER | Chama a Edge Function `notificar-reserva` via `pg_net`. Status de anexação a uma tabela: **não confirmado** (ver nota acima) |

---

## 8.5 RLS Policies (todas as 36 policies do schema `public`)

Todas as 19 tabelas de negócio têm **RLS habilitado** (`relrowsecurity = true`, confirmado por consulta direta a `pg_class` nesta sessão — não apenas inferido dos arquivos `.sql`).

| Tabela | Policy | Comando | Regra (`USING`/`WITH CHECK`) |
|---|---|---|---|
| `tenants` | tenant: membro pode ler seu tenant | SELECT | `id = fn_meu_tenant_id()` |
| `usuarios` | cliente lê o próprio perfil | SELECT | `id = auth.uid()` |
| `usuarios` | admin lê todos do tenant | SELECT | `fn_sou_admin() AND tenant_id = fn_meu_tenant_id()` |
| `usuarios` | atualiza o próprio perfil | UPDATE | `id = auth.uid()` |
| `usuarios` | admin insere membros do tenant | INSERT | `fn_sou_admin() AND tenant_id = fn_meu_tenant_id()` |
| `categorias` | leitura pública | SELECT | `ativo = true` (**sem checagem de tenant** — qualquer pessoa, de qualquer tenant, vê categorias ativas de todos os tenants. Não é um bug per se hoje com 1 tenant, mas é uma policy "vazante" em cenário multi-tenant real — ver Parte 10) |
| `categorias` | admin escreve | ALL | `fn_sou_admin() AND tenant_id = fn_meu_tenant_id()` |
| `protecoes` | leitura pública / admin escreve | igual padrão de `categorias` | mesma observação de vazamento cross-tenant na leitura |
| `adicionais` | leitura pública / admin escreve | igual padrão | mesma observação |
| `sazonalidade` | leitura pública / admin escreve | igual padrão | mesma observação |
| `locais` | locais_anon_select | SELECT | `ativo = true` (mesma observação de vazamento cross-tenant) |
| `locais` | locais_auth_all | ALL | `tenant_id = (SELECT tenant_id FROM usuarios WHERE id=auth.uid() LIMIT 1)` — **sem `WITH CHECK` explícito** (ver nota de fragilidade na Parte 9) |
| `solicitacoes` | cliente lê as próprias | SELECT | `usuario_id = auth.uid()` |
| `solicitacoes` | admin lê todas do tenant | SELECT | `fn_sou_admin() AND tenant_id = fn_meu_tenant_id()` |
| `solicitacoes` | **duas policies de INSERT coexistindo**: "insercao publica" (`WITH CHECK true`) e "inserção pública" (`WITH CHECK EXISTS(...tenant ativo)`) | INSERT | Como são policies `OR`-combinadas pelo Postgres, a policy mais permissiva (`true`) **anula** a mais restritiva — ver Parte 10, achado de segurança não corrigido nesta sessão |
| `solicitacoes` | anon pode inserir solicitacoes | INSERT | `tenant_id = 'a1b2c3d4-...'` (hardcoded para o único tenant atual — **não escala para multi-tenant real**) |
| `solicitacoes` | admin atualiza | UPDATE | `fn_sou_admin() AND tenant_id = fn_meu_tenant_id()` |
| `solicitacao_itens` | **quatro policies de INSERT coexistindo** (mesma situação de redundância/permissividade que `solicitacoes`) | INSERT | A mais permissiva (`WITH CHECK true`, duas delas) domina |
| `solicitacao_itens` | cliente lê os próprios / admin lê todos do tenant | SELECT | via EXISTS em `solicitacoes` |
| `documentos` | cliente gerencia/lê os próprios | ALL/SELECT | `usuario_id = auth.uid()` |
| `documentos` | admin lê todos do tenant | SELECT | `fn_sou_admin() AND tenant_id = fn_meu_tenant_id()` |
| `condutores_adicionais` | mesmo padrão de `documentos` | — | — |
| `translados` | cliente lê/cria os próprios | SELECT/INSERT | `usuario_id = auth.uid()` |
| `translados` | admin lê/atualiza todos do tenant | SELECT/UPDATE | `fn_sou_admin() AND tenant_id = fn_meu_tenant_id()` |
| `frota_veiculos` | select/insert/update | todas | `tenant_id = (SELECT tenant_id FROM usuarios WHERE id=auth.uid())` — **sem distinção de role**: qualquer usuário autenticado do tenant (mesmo `role='cliente'`) pode em teoria escrever em `frota_veiculos` via API direta, não só admin/operador. Mitigado na prática porque só `apps/frota-ops` (uso interno) escreve aqui, mas a policy em si não impõe `fn_sou_admin()` — ver Parte 9 |
| `frota_reservas` | select/insert/update | todas | mesmo padrão de `frota_veiculos`, mesma observação |
| `frota_patios` | select/insert/update/delete | todas | mesmo padrão |
| `frota_movimentacoes` | select/insert | ambas | via EXISTS cruzando `frota_veiculos`+`usuarios` do mesmo tenant |
| `audit_log` | select/insert | ambas | `tenant_id = (SELECT tenant_id FROM usuarios WHERE id=auth.uid())` |

> **`rate_limits` e `solicitacao_contadores`**: RLS habilitado, **sem nenhuma policy pública** — só acessíveis via `service_role` (que sempre ignora RLS) ou via as funções `SECURITY DEFINER` correspondentes. Nenhum cliente deve (nem consegue) ler/escrever essas tabelas diretamente.

---

## 8.6 Divergência entre código (`sql/`) e banco real

Auditoria desta sessão confirmou que o banco de produção tem **mais policies, mais campos e mais lógica do que o que está documentado nos arquivos `sql/001` a `sql/018`** do repositório. Exemplos concretos:
- `frota_veiculos`, `frota_reservas`, `frota_patios`, `frota_movimentacoes` **não têm nenhum `CREATE TABLE` correspondente em `sql/`** — foram criadas direto no banco (provavelmente via Supabase Studio ou `execute_sql` em sessões anteriores) sem nunca virar migration versionada.
- Várias policies têm **nomes duplicados em português com/sem acento** (`"insercao publica"` vs `"inserção pública"`) coexistindo na mesma tabela — sinal de que migrations foram aplicadas fora de ordem, ou reaplicadas sem `DROP POLICY IF EXISTS` antes.

**Isso é o achado de dívida técnica mais importante deste documento** — ver Parte 10 para o detalhamento e recomendação de correção (gerar uma migration de "reconciliação" que documente o estado real do banco).

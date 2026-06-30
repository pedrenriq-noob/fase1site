# Parte 3 — Fonte de Verdade e Modelo de Domínio

## 6. Fonte de Verdade (Source of Truth)

| Entidade | Quem cria | Quem altera | Quem consome | Responsável |
|---|---|---|---|---|
| **Tenants** | Ninguém via UI hoje — inserido manualmente via SQL/dashboard Supabase | Idem | Todas as RLS policies (`fn_meu_tenant_id()`) | Dono do produto (operação manual no banco) |
| **Usuários** (`usuarios`) | Trigger `fn_criar_usuario_no_signup` no signup do Supabase Auth, OU admin via `apps/intake-admin` aba relacionada | Próprio usuário (perfil) ou admin (role) | Todas as RLS policies, `apps/intake-admin`, `apps/frota-ops` (auth) | Admin do tenant |
| **Categorias** | Admin via `apps/intake-admin` (`pages/categorias.js`) | Admin | `apps/site` (catálogo), `criar-solicitacao`, `check-disponibilidade` (via `SLUG_MAP`) | Admin |
| **Valores/Preços** (`categorias.preco_diaria`, `sazonalidade.precos`) | Admin via `apps/intake-admin` | Admin | `criar-solicitacao` (recalcula preço final), `apps/site` (preço exibido, não confiável) | Admin |
| **Veículos** (`frota_veiculos`) | Operação via `apps/frota-ops` (`pages/veiculos.js`) ou importação CSV | Operação (status, pátio, limpeza), trigger `fn_frota_veiculos_updated_at` (timestamp) | `checkDisponibilidade` (toda consulta de disponibilidade depende disso) | Equipe operacional / pátio |
| **Reservas operacionais** (`frota_reservas`) | Atendente via `apps/frota-ops` (`pages/reservas.js`) ou importação CSV | Atendente, ou importação (upsert por `locacao_numero`) | `checkDisponibilidade` (decrementa pool) | Central de reservas |
| **Solicitações** (`solicitacoes`) | Cliente via `apps/site` → `criar-solicitacao` (RPC `inserir_solicitacao_completa`) | Admin via `apps/intake-admin` (só transição de status, validada por trigger) | `apps/intake-admin` (dashboard, listagem), RPC `dashboard_dados` | Cliente cria, Admin processa |
| **Disponibilidade** | **Não é uma entidade persistida** — é sempre calculada on-the-fly a partir de `frota_veiculos` + `frota_reservas` | N/A | `apps/site`, `apps/frota-ops` (`pages/disponibilidade.js`), `extensions/disponibilidade` | Derivada — sem dono de escrita |
| **Acessórios** (`adicionais`, incluindo cadeirinhas via `is_cadeirinha`) | Admin via `apps/intake-admin` (`pages/adicionais.js`) | Admin | `apps/site` (seleção do cliente), `extensions/acessorios` (**não** — essa extensão usa Google Sheets, sistema paralelo desconectado deste catálogo) | Admin — **mas atenção: `extensions/acessorios` não lê esta tabela, é uma fonte de verdade duplicada e desconectada (ver Parte 10)** |
| **Contratos** | **Não existe entidade `contratos` no banco.** Não documentado, não implementado. | — | — | Nenhum — processo 100% fora do sistema |
| **Clientes** | Implícito — não há tabela `clientes` separada. O "cliente" existe como (a) linha em `auth.users`/`usuarios` se ele se cadastrou, ou (b) campos soltos (`cliente_nome`, `cliente_email`, `cliente_whatsapp`, `cliente_cpf`) dentro de cada `solicitacoes`, sem normalização/dedupe | Cliente (perfil) ou admin | `apps/intake-admin` aba `Clientes` (`pages/clientes.js` — provavelmente agrega por `solicitacoes`, não há tabela dedicada) | Ninguém — dado disperso, não normalizado (ver Parte 10) |
| **Tarifas** (sazonalidade) | Admin via `apps/intake-admin` (`pages/sazonalidade.js`) | Admin | `criar-solicitacao` (sobrepõe `preco_diaria` se a data cair dentro de um período sazonal ativo) | Admin |
| **Proteções** | Admin via `apps/intake-admin` (`pages/protecoes.js`) | Admin | `apps/site`, `criar-solicitacao` | Admin |
| **Imagens** (`categorias.imagem_url`, assets de logo) | Admin cadastra a URL (não há upload de arquivo nativo no admin — presumidamente upload manual no Supabase Storage e cola da URL) | Admin | `apps/site` | Admin |
| **Regras** (validações, transições de status) | **Hardcoded em triggers SQL e em código das Edge Functions** — não há tabela de configuração de regras | Só via migration (deploy de código) | Todo o sistema | Desenvolvedor (não há UI de configuração de regras de negócio) |
| **Locais** (retirada/devolução) | Admin via `apps/intake-admin` (`pages/locais.js`) | Admin | `apps/site`, `criar-solicitacao` | Admin |
| **Documentos** (CNH/RG/passaporte) | Cliente faz upload (presumido via Storage, campo `arquivo_url`) | Cliente (próprio) ou admin (`verificado`) | `apps/intake-admin` | Cliente / Admin valida |
| **Translados** | Cliente solicita (vinculado a uma `solicitacao`) | Admin confirma/cancela | `apps/intake-admin` aba `Translados` | Cliente solicita, Admin decide |
| **Auditoria de frota** (`frota_movimentacoes`) | **100% automático** — trigger `fn_log_frota_movimentacao` | Ninguém (somente trigger insere; não há UPDATE/DELETE manual) | `apps/frota-ops` (`pages/veiculo-detalhe.js`, histórico) | Sistema (trigger) |
| **Audit log geral** (`audit_log`) | Aplicação (RLS permite INSERT só do próprio tenant do usuário logado) — não há trigger automático genérico encontrado para todas as tabelas, então é **opt-in por código** que decide chamar o insert | Ninguém altera (log imutável por design) | `apps/intake-admin` aba `Auditoria` | Quem chamou explicitamente |

> **Achado de auditoria importante**: o catálogo de "Acessórios" (`adicionais` no Postgres) e a extensão `extensions/acessorios` (que fala com Google Sheets) **são duas fontes de verdade diferentes para conceitualmente a mesma coisa** (cadeirinhas/acessórios). Não há sincronização entre elas. Isso é uma dívida técnica/risco real — ver Parte 10 e Parte 5 (Regras de Negócio).

---

## 7. Modelo de Domínio

### 7.1 Entidades

#### `tenants`
- **Finalidade**: isolar dados de diferentes locadoras (multi-tenant).
- **Atributos**: `id` (uuid, PK), `nome`, `cnpj` (único), `plano`, `whatsapp_central`, `dominio`, `ativo`, `criado_em`.
- **Relacionamentos**: todas as outras tabelas de negócio referenciam `tenant_id`.
- **Regras**: só tenants `ativo=true` podem receber novas `solicitacoes` (verificado tanto na Edge Function quanto na RLS policy `solicitacoes: inserção pública`).
- **Dependências**: nenhuma — raiz da árvore de domínio.

#### `usuarios`
- **Finalidade**: perfil de aplicação vinculado a `auth.users` do Supabase Auth, carregando `tenant_id` e `role`.
- **Atributos**: `id` (uuid, PK, FK para `auth.users.id` com `ON DELETE CASCADE`), `tenant_id`, `nome`, `email` (único), `whatsapp`, `cpf`, `data_nascimento`, `role` (`cliente`|`admin`|`operador`, CHECK constraint), `criado_em`, `ativo`.
- **Relacionamentos**: 1:1 com `auth.users`; referenciado por `solicitacoes.usuario_id`, `documentos.usuario_id`, `condutores_adicionais.usuario_id`, `translados.usuario_id`.
- **Regras**: criado automaticamente no signup via trigger `fn_criar_usuario_no_signup` (lê `raw_user_meta_data->>'tenant_id'`); se não vier `tenant_id` no metadata do signup, **nenhuma linha é criada** (o usuário fica "órfão" em `auth.users` sem perfil de aplicação).
- **Dependências**: `tenants`.

#### `categorias`
- **Finalidade**: catálogo de grupos de veículos vendáveis (ex.: GRUPO B, GRUPO J).
- **Atributos**: `id`, `tenant_id`, `slug` (único por tenant — é a chave usada pelo `SLUG_MAP` nas Edge Functions), `nome`, `descricao`, `preco_diaria`, `transmissao` (`manual`|`automatico`), `max_pessoas`, `max_cadeirinhas`, `quantidade_frota`, `imagem_url`, `ordem`, `ativo`, `criado_em`.
- **Relacionamentos**: referenciada por `solicitacoes.categoria_id`. Conceitualmente ligada a `frota_veiculos.categoria` (texto, **não é FK** — ligação por convenção de nome, ver Parte 10).
- **Regras**: só categorias `ativo=true` aparecem no site e contam no `dashboard_dados`.
- **Dependências**: `tenants`.

#### `protecoes`
- **Finalidade**: catálogo de seguros/proteções vendáveis junto com a locação.
- **Atributos**: `id`, `tenant_id`, `nome`, `descricao`, `preco`, `tipo_preco` (`per_day`|`fixed`), `franquia`, `pre_autorizacao`, `ordem`, `ativo`, `criado_em`.
- **Relacionamentos**: referenciada por `solicitacoes.protecao_id`.
- **Dependências**: `tenants`.

#### `adicionais`
- **Finalidade**: catálogo de itens extras (cadeirinha infantil, GPS, etc.).
- **Atributos**: `id`, `tenant_id`, `nome`, `descricao`, `preco`, `tipo_preco`, `permite_quantidade`, `is_cadeirinha` (flag específica), `estoque`, `ordem`, `ativo`, `criado_em`.
- **Relacionamentos**: referenciada por `solicitacao_itens.adicional_id`.
- **Dependências**: `tenants`.

#### `sazonalidade`
- **Finalidade**: períodos com tabela de preço diferenciada por categoria.
- **Atributos**: `id`, `tenant_id`, `nome`, `data_inicio`, `data_fim` (CHECK `data_fim >= data_inicio`), `precos` (jsonb — mapa `slug → valor`), `ativo`, `criado_em`.
- **Regras**: `criar-solicitacao` busca sazonalidade ativa cuja janela contenha `data_retirada`; se existir e tiver chave para o slug da categoria, sobrepõe `preco_diaria`.
- **Dependências**: `tenants`.

#### `locais`
- **Finalidade**: pontos de retirada/devolução.
- **Atributos**: `id`, `tenant_id`, `nome` (único por tenant), `permite_retirada`, `permite_devolucao`, janelas de horário (`hora_retirada_inicio/fim`, `hora_devolucao_inicio/fim`), `disponivel_domingo`, `is_aeroporto`, `ativo`, `ordem`, `criado_em`.
- **Dependências**: `tenants`.

#### `solicitacoes`
- **Finalidade**: pedido de reserva originado no funil de captação (site).
- **Atributos principais**: `id`, `tenant_id`, `usuario_id` (nullable — cliente pode não estar logado), `categoria_id`, `protecao_id`, dados do cliente (`cliente_nome/email/whatsapp/cpf/doc`, `estrangeiro`), `data_retirada/devolucao` (CHECK `data_devolucao > data_retirada`), `local_retirada/devolucao`, `numero_voo`, `horario_pouso`, `companhia_aerea`, `pessoas`, `valor_estimado`, `observacoes`, `motivo_cancelamento`, `status` (CHECK: `solicitada`|`em_analise`|`confirmada`|`concluida`|`cancelada`), `numero` (sequencial por tenant — ver Parte 4 e Parte 10), `criado_em`, `atualizado_em`, `status_alterado_em`.
- **Relacionamentos**: 1:N com `solicitacao_itens`; N:1 com `categorias`, `protecoes`, `usuarios`, `tenants`.
- **Regras**: transição de status validada por trigger (`fn_validar_transicao_status`/`validar_transicao_status_solicitacao` — **duplicadas**, ver Parte 10); `motivo_cancelamento` obrigatório ao cancelar.
- **Dependências**: `tenants`, `categorias`, `protecoes`, `usuarios` (opcional).

#### `solicitacao_itens`
- **Finalidade**: itens adicionais escolhidos numa solicitação (linha de pedido).
- **Atributos**: `id`, `solicitacao_id` (FK `ON DELETE CASCADE`), `adicional_id`, `quantidade` (CHECK `> 0`), `preco_unitario` (congelado no momento da solicitação — não muda se o preço do catálogo mudar depois), `tipo_preco`.
- **Dependências**: `solicitacoes`, `adicionais`.

#### `documentos`
- **Finalidade**: documentos de identificação do cliente (CNH, RG, passaporte).
- **Atributos**: `id`, `usuario_id` (FK `ON DELETE CASCADE`), `tenant_id`, `tipo` (CHECK: `cnh`|`passaporte`|`rg`), `numero`, `validade`, `categoria_cnh` (CHECK: A/B/AB/C/D/E), `arquivo_url`, `verificado`, `criado_em`.
- **Dependências**: `usuarios`, `tenants`.

#### `condutores_adicionais`
- **Finalidade**: condutores extras autorizados a dirigir o veículo locado pelo cliente principal.
- **Atributos**: `id`, `usuario_id` (FK `ON DELETE CASCADE`), `tenant_id`, `nome`, `cpf`, `cnh_numero/validade/categoria/arquivo_url`, `criado_em`.
- **Dependências**: `usuarios`, `tenants`.

#### `translados`
- **Finalidade**: solicitação de transporte aeroporto↔local vinculada a uma solicitação de locação.
- **Atributos**: `id`, `solicitacao_id`, `usuario_id`, `tenant_id`, `numero_voo`, `data_voo`, `horario_pouso`, `pessoas` (CHECK `> 0`), `observacoes`, `status` (CHECK: `pendente`|`confirmado`|`cancelado`), `confirmado_em`, `solicitado_em`.
- **Dependências**: `solicitacoes`, `usuarios`, `tenants`.

#### `frota_veiculos`
- **Finalidade**: cadastro físico de cada veículo da frota operacional.
- **Atributos**: `id`, `tenant_id`, `placa` (único globalmente — **não só por tenant**, ver Parte 10), `categoria` (texto livre, convenção de nome com `categorias.slug`/`SLUG_MAP`, **não é FK**), `modelo`, `fabricante`, `cor`, `status` (CHECK: `DISPONIVEL`|`LOCADO`|`DEVOLVIDO`|`NO_LAVADOR`|`MANUTENCAO`), `limpo`, `patio_atual`, `hora_entrada_lavador`, `prev_retorno`, `ponto_retorno/retirada`, `updated_at`, `updated_by` (FK `auth.users`).
- **Regras**: `updated_at` atualizado automaticamente via trigger `fn_frota_veiculos_updated_at`; toda mudança relevante dispara `fn_log_frota_movimentacao`.
- **Dependências**: `tenants`.

#### `frota_reservas`
- **Finalidade**: reserva operacional real da frota (diferente de `solicitacoes` — ver nota na Parte 6).
- **Atributos**: `id`, `tenant_id`, `locacao_numero` (identificador do sistema legado, único por tenant), `cliente`, `categoria` (texto livre), `placa_atribuida` (opcional), `data_saida/data_retorno_prev`, `ponto_retirada/retorno`, `status` (CHECK: `PREVISTO`|`CONFIRMADO`|`CONCLUIDO`|`CANCELADO`), `obs`, `created_at`, `created_by`, `condutor`, `frequencia`, `locacao_id_ext` (id no sistema legado), `sincronizado_em`.
- **Regras**: `checkDisponibilidade` só considera reservas com `status IN ('PREVISTO','CONFIRMADO')`.
- **Dependências**: `tenants`.

#### `frota_patios`
- **Finalidade**: cadastro de pátios/pontos físicos de estacionamento da frota.
- **Atributos**: `id`, `tenant_id`, `nome` (único por tenant), `tipo` (CHECK: `patio`|`retorno`|`retirada`), `ativo`, `ordem`, `created_at`.
- **Dependências**: `tenants`.

#### `frota_movimentacoes`
- **Finalidade**: log de auditoria imutável de mudanças em `frota_veiculos` (status, pátio, limpeza).
- **Atributos**: `id`, `veiculo_id` (FK `ON DELETE CASCADE`), `tipo` (CHECK: `SAIDA`|`RETORNO`|`PATIO`|`LIMPEZA`|`LAVADOR_ENTRADA`|`LAVADOR_SAIDA`|`STATUS`), `valor_antes`/`valor_depois` (jsonb, snapshot dos campos relevantes), `obs`, `created_at`, `created_by`.
- **Regras**: **só é populada por trigger**, nunca por INSERT manual de aplicação.
- **Dependências**: `frota_veiculos`.

#### `audit_log`
- **Finalidade**: log de auditoria genérico de ações privilegiadas no sistema (mais amplo que `frota_movimentacoes`).
- **Atributos**: `id`, `tenant_id`, `usuario_id` (FK `auth.users`, `ON DELETE SET NULL` — preserva o log mesmo se o usuário for apagado), `acao`, `entidade`, `entidade_id`, `descricao`, `dados_antes/depois` (jsonb), `criado_em`.
- **Dependências**: `tenants`, `auth.users`.

#### `rate_limits` *(adicionada nesta sessão, ver Parte 10)*
- **Finalidade**: controle de taxa de requisição persistente e compartilhado entre instâncias da Edge Function `criar-solicitacao`.
- **Atributos**: `chave` (PK, texto — ex. `criar-solicitacao:<ip>`), `contagem`, `reset_em`.
- **Dependências**: nenhuma (tabela utilitária, sem `tenant_id`).

#### `solicitacao_contadores` *(adicionada nesta sessão, ver Parte 10)*
- **Finalidade**: contador atômico por tenant para gerar `solicitacoes.numero` sequencial (substituiu `SERIAL` global).
- **Atributos**: `tenant_id` (PK, FK `tenants`), `ultimo_numero`.
- **Dependências**: `tenants`.

### 7.2 Diagrama ER

```mermaid
erDiagram
    tenants ||--o{ usuarios : tem
    tenants ||--o{ categorias : tem
    tenants ||--o{ protecoes : tem
    tenants ||--o{ adicionais : tem
    tenants ||--o{ sazonalidade : tem
    tenants ||--o{ locais : tem
    tenants ||--o{ solicitacoes : tem
    tenants ||--o{ frota_veiculos : tem
    tenants ||--o{ frota_reservas : tem
    tenants ||--o{ frota_patios : tem
    tenants ||--o{ audit_log : tem
    tenants ||--o| solicitacao_contadores : tem

    usuarios ||--o{ solicitacoes : "cria (opcional)"
    usuarios ||--o{ documentos : possui
    usuarios ||--o{ condutores_adicionais : possui
    usuarios ||--o{ translados : solicita

    categorias ||--o{ solicitacoes : "escolhida em"
    protecoes  ||--o{ solicitacoes : "escolhida em"

    solicitacoes ||--o{ solicitacao_itens : contem
    solicitacoes ||--o{ translados : "pode ter"
    adicionais   ||--o{ solicitacao_itens : "referenciado em"

    frota_veiculos ||--o{ frota_movimentacoes : gera

    tenants {
        uuid id PK
        text nome
        text cnpj UK
        text plano
        boolean ativo
    }
    usuarios {
        uuid id PK_FK
        uuid tenant_id FK
        text email UK
        text role
    }
    categorias {
        uuid id PK
        uuid tenant_id FK
        text slug
        numeric preco_diaria
    }
    solicitacoes {
        uuid id PK
        uuid tenant_id FK
        uuid categoria_id FK
        uuid protecao_id FK
        uuid usuario_id FK
        integer numero
        text status
        numeric valor_estimado
    }
    frota_veiculos {
        uuid id PK
        uuid tenant_id FK
        text placa UK
        text categoria "texto livre, NAO eh FK"
        text status
    }
    frota_reservas {
        uuid id PK
        uuid tenant_id FK
        text categoria "texto livre, NAO eh FK"
        text status
        text placa_atribuida
    }
```

> **Nota crítica de modelagem**: `frota_veiculos.categoria` e `frota_reservas.categoria` são `text` livre, **não há foreign key para `categorias.slug` nem `categorias.id`**. A ligação existe só por convenção (o `SLUG_MAP` em `supabase/functions/_shared/disponibilidade.ts` traduz o slug do site para o texto usado na frota). Isso já causou um bug real nesta sessão (categoria "J - PREMIUM" vs "J" — ver Parte 10) e é um risco estrutural permanente enquanto não virar FK de verdade.

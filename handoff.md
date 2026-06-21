# Igufoz — Documento de Handoff Técnico
**Versão:** Fase 1 · **Data:** Junho 2026  
**Repositório:** github.com/pedrenriq-noob/fase1site (privado)  
**Autor do projeto:** Pedro Enrique  
**Construído com:** Claude Code (Anthropic)

---

## 1. O que é o projeto

**Igufoz** é uma plataforma de reservas de veículos para uma locadora em Foz do Iguaçu — PR.

O modelo de negócio funciona como um **garçom digital**: o cliente faz a solicitação no site, a equipe da locadora recebe, analisa e confirma. Não existe checkout automático nem pagamento online na Fase 1. Toda confirmação e pagamento é feita pelo atendimento humano após a solicitação chegar.

O sistema **já foi projetado para ser multi-tenant desde o primeiro dia**, ou seja: com ajustes mínimos, o mesmo código pode servir múltiplas locadoras diferentes, cada uma com seus próprios veículos, preços e equipe — como um SaaS.

---

## 2. Stack tecnológica

| Camada | Tecnologia | Por quê |
|---|---|---|
| **Frontend (site)** | HTML + CSS + JavaScript Vanilla | Zero dependências, carrega instantâneo, sem framework |
| **Frontend (admin)** | HTML + CSS + JavaScript Vanilla com ES Modules | Mesmo princípio, arquitetura modular por página |
| **Banco de dados** | PostgreSQL via **Supabase** | Gerenciado, RLS nativo, Auth integrado, API REST automática |
| **Backend serverless** | **Supabase Edge Functions** (Deno / TypeScript) | Funções na borda, sem servidor para gerenciar |
| **Autenticação** | Supabase Auth | JWT, sessões, signup com trigger automático |
| **Email transacional** | **Resend** | API simples, templates HTML, entrega confiável |
| **Storage (imagens)** | Supabase Storage | Bucket `categorias` com fotos dos grupos de veículos |
| **Hospedagem** | **Vercel** | Deploy automático a cada push no GitHub, CDN global |
| **Controle de versão** | Git + **GitHub** | Repositório privado, integrado ao Vercel |

---

## 3. Onde cada parte roda

```
+------------------------------------------------------------------+
|                      VERCEL (CDN global)                         |
|                                                                   |
|  fase1site.vercel.app/        ->  site/index.html  (cliente)    |
|  fase1site.vercel.app/admin/  ->  admin/index.html (painel)     |
+--------------------------------+---------------------------------+
                                 | fetch() via Supabase JS SDK
                                 v
+------------------------------------------------------------------+
|                  SUPABASE (lxfnqzuzohudqwibgdic)                |
|                                                                   |
|  +-------------+  +--------------+  +------------------------+  |
|  | PostgreSQL  |  |  Auth (JWT)  |  |  Edge Functions        |  |
|  | (banco)     |  |              |  |  (Deno serverless)     |  |
|  +-------------+  +--------------+  +-----------+------------+  |
|                                                  |               |
|  +-------------+                                 v               |
|  |  Storage    |                         RESEND API              |
|  |  (imagens)  |                      (emails transacionais)     |
|  +-------------+                                                  |
+------------------------------------------------------------------+
```

**Projeto Supabase:** `lxfnqzuzohudqwibgdic.supabase.co`  
**Projetos Vercel:** `fase1site` (principal) + 2 duplicatas a deletar (`fase1site-8j28`, `fase1site-yqif`)

O roteamento do Vercel é controlado pelo `vercel.json` na raiz:
```json
{
  "rewrites": [
    { "source": "/admin/(.*)", "destination": "/admin/$1" },
    { "source": "/(.*)",       "destination": "/site/$1"  }
  ]
}
```

---

## 4. Estrutura de arquivos

```
Fase 1/
├── vercel.json                    # Roteamento Vercel
│
├── site/                          # Site público (cliente)
│   ├── index.html
│   ├── script.js                  # Toda a lógica do fluxo de reserva
│   ├── style.css
│   └── supabase.js                # Configuração do cliente Supabase
│
├── admin/                         # Painel administrativo
│   ├── index.html
│   ├── admin.js                   # Controlador principal (auth, nav, modal)
│   ├── admin.css
│   ├── supabase.js
│   └── pages/
│       ├── dashboard.js           # Visão geral com métricas
│       ├── reservas.js            # Lista e gestão de reservas
│       ├── translados.js          # Reservas com voo
│       ├── categorias.js          # Grupos de veículos
│       ├── protecoes.js           # Planos de proteção
│       ├── adicionais.js          # Extras (cadeirinha, GPS etc)
│       ├── sazonalidade.js        # Multiplicadores de preço por período
│       └── locais.js              # Locais de retirada/devolução
│
├── supabase/
│   └── functions/
│       └── notificar-reserva/
│           └── index.ts           # Edge Function: envia emails via Resend
│
└── sql/                           # Migrations versionadas
    ├── 001_tenants.sql
    ├── 002_usuarios.sql
    ├── 003_categorias.sql
    ├── 004_protecoes_adicionais.sql
    ├── 005_sazonalidade.sql
    ├── 006_solicitacoes.sql
    ├── 007_documentos_condutores_translados.sql
    ├── 008_triggers.sql
    ├── 009_rls_policies.sql
    ├── 010_locais.sql
    └── seed.sql
```

---

## 5. Banco de dados — schema completo

### Diagrama de relacionamentos

```
tenants (1)
    +-- usuarios (N)          — admins e operadores da locadora
    +-- categorias (N)        — grupos de veiculos (A, B, C...)
    +-- protecoes (N)         — planos de proteção (Basico, Premium...)
    +-- adicionais (N)        — extras (GPS, cadeirinha, motorista...)
    +-- sazonalidade (N)      — multiplicadores de preço por data
    +-- locais (N)            — aeroporto, centro, hotel...
    +-- solicitacoes (N)      — cada pedido de reserva
            +-- solicitacao_itens (N)   — adicionais escolhidos
```

### Tabelas principais

#### `tenants`
Raiz multi-tenant. Cada locadora é um tenant.
```
id, nome, cnpj, plano, whatsapp_central, dominio, ativo, criado_em
```
> **TENANT_ID atual (Igufoz):** hardcoded no frontend em `site/supabase.js` e `admin/supabase.js`. Em um SaaS real, seria detectado pelo domínio de acesso.

#### `solicitacoes`
Coração do sistema. Cada reserva nasce aqui.
```
id (UUID), numero (INT sequencial), tenant_id, categoria_id, protecao_id,
cliente_nome, cliente_email, cliente_whatsapp, cliente_cpf,
data_retirada, data_devolucao, local_retirada, local_devolucao,
numero_voo, horario_pouso, companhia_aerea,
pessoas, valor_estimado, observacoes, motivo_cancelamento,
status CHECK('solicitada','em_analise','confirmada','concluida','cancelada'),
criado_em, atualizado_em, status_alterado_em
```

**Campo `numero`:** gerado por sequência PostgreSQL (`solicitacoes_numero_seq`), exibido como `#0001`, `#0002`...

#### `solicitacao_itens`
Snapshot dos adicionais no momento do pedido (preços congelados).
```
id, solicitacao_id, adicional_id, quantidade, preco_unitario, tipo_preco
```

#### `categorias`
Grupos de veículos (A, B, C, D+, E, F, G, H, J).
```
id, tenant_id, nome, slug, descricao, preco_diaria, imagem_url, ativo
```
Imagens armazenadas no Supabase Storage (bucket: `categorias`), URL pública.

#### `protecoes`
```
id, tenant_id, nome, descricao, preco, tipo_preco ('per_day'|'fixed'), ativo
```

#### `adicionais`
```
id, tenant_id, nome, descricao, preco, tipo_preco ('per_day'|'fixed'), ativo
```

#### `sazonalidade`
```
id, tenant_id, nome, data_inicio, data_fim, multiplicador (NUMERIC), ativo
```

#### `locais`
```
id, tenant_id, nome, endereco, tipo ('aeroporto'|'loja'|'hotel'|'outro'), ativo
```

### Maquina de estados (status das reservas)

```
solicitada --> em_analise --> confirmada --> concluida
     |              |              |
     v              v              v
  cancelada     cancelada      cancelada
```

Implementada em dois lugares (ambos precisam estar alinhados):
1. **Banco:** trigger `fn_validar_transicao_status()` — rejeita UPDATE invalido
2. **Frontend:** `transicoesPossiveis()` em `admin/pages/reservas.js` — controla o dropdown

> **Atencao:** O trigger foi atualizado diretamente no banco via SQL. O arquivo `sql/008_triggers.sql` esta desatualizado nessa funcao especifica. A versao em producao permite `solicitada -> confirmada` diretamente.

---

## 6. Segurança — Row Level Security (RLS)

Todas as tabelas têm RLS ativo no Supabase. Resumo:

| Tabela | Anonimo | Cliente logado | Admin/Operador |
|---|---|---|---|
| `categorias` | SELECT (ativas) | SELECT | ALL |
| `protecoes` | SELECT (ativas) | SELECT | ALL |
| `adicionais` | SELECT (ativas) | SELECT | ALL |
| `sazonalidade` | SELECT (ativas) | SELECT | ALL |
| `locais` | SELECT (ativas) | SELECT | ALL |
| `solicitacoes` | INSERT | SELECT (proprias) | ALL do tenant |
| `solicitacao_itens` | INSERT | SELECT (proprias) | ALL do tenant |
| `usuarios` | — | SELECT/UPDATE (proprio) | ALL do tenant |

**Regra de ouro:** o frontend nunca envia a `service_role key`. Apenas a `anon key` (publishable) fica no codigo do site. Operacoes privilegiadas usam a `service_role key` dentro das Edge Functions, que rodam no servidor.

---

## 7. Autenticação do admin

O painel admin usa **Supabase Auth** com email + senha.

- Login: `supabase.auth.signInWithPassword()`
- Sessão: JWT gerenciado pelo SDK
- Proteção: RLS valida o JWT em todas as queries

**Credenciais atuais:**
- Email: `pedrenriq@gmail.com`
- Senha: `Admin@2025!`

> Para producao: criar email dedicado `admin@igufoz.com.br` e trocar a senha.

---

## 8. Fluxo de reserva (site público)

Wizard de 4 etapas:

```
Passo 1 — Período
  Data/hora retirada e devolução, locais, número de dias calculado automaticamente

Passo 2 — Veiculo
  Cards de categorias com foto, nome, descrição, preco/dia
  Seleção do plano de proteção

Passo 3 — Adicionais
  GPS, cadeirinha, motorista adicional etc com quantidade e subtotal

Passo 4 — Dados pessoais + Confirmação
  Nome, CPF, WhatsApp, e-mail
  Companhia aérea, número do voo, horário de pouso (opcional)
  Observações livres
  Botão "Enviar Solicitação"
```

**Persistência:** dados do passo 1–3 salvos em `sessionStorage` (chave `igufoz_rascunho`). Dados pessoais **nunca** são salvos em storage.

**Submit (sequência):**
1. `crypto.randomUUID()` gera o UUID no cliente
2. INSERT em `solicitacoes`
3. INSERT em `solicitacao_itens`
4. `fetch()` para a Edge Function `notificar-reserva`
5. `sessionStorage.removeItem()` limpa o rascunho
6. Tela de sucesso + botão WhatsApp pré-preenchido

---

## 9. Edge Function — `notificar-reserva`

**URL:** `https://lxfnqzuzohudqwibgdic.supabase.co/functions/v1/notificar-reserva`  
**Runtime:** Deno (TypeScript) — sem `verify_jwt` (chamada direta do frontend)

**O que faz:**
1. Recebe `{ record: { id, tenant_id, categoria_id, ... } }` do frontend
2. Busca no banco (com `SUPABASE_SERVICE_ROLE_KEY`): numero da reserva, categoria, proteção, itens adicionais
3. Monta dois emails HTML:
   - **Email central** (`reservasigufoz@gmail.com`): todos os dados do cliente + tabela Produto/Valor Unit./Total
   - **Email cliente**: confirmação com numero da reserva, período, botão WhatsApp
4. Envia ambos via **Resend API**

**Assuntos dos emails incluem o numero:**
- Central: `Nova reserva #0003 — Pedro`
- Cliente: `Igufoz — Reserva #0003 recebida`

---

## 10. Painel administrativo — páginas

### Reservas
- Tabela: `#numero`, data, cliente, WhatsApp, veiculo, total, data retirada, status
- Dropdown de status inline com máquina de estados
- Filtro por nome/WhatsApp e status
- Modal: dados completos do cliente + tabela de valores + total estimado
- Cancelamento exige motivo obrigatório

### Translados
- Apenas reservas com `numero_voo IS NOT NULL`
- Seção Pendentes (status `solicitada` ou `em_analise`)
- Seção Histórico (demais status)
- Mostra: companhia aérea, voo, pouso, retirada, cliente, veículo, local, pessoas

### Catalogo
CRUD completo para Veiculos, Proteções, Adicionais, Sazonalidade e Locais via modal genérico reutilizável.

---

## 11. Imagens dos veículos

**Bucket Supabase Storage:** `categorias` (público)  
**Resolução:** 800×440px, JPG, crop centralizado 16:9  
**Script:** `C:\Users\User\Downloads\fotos\redimensionar.ps1` (PowerShell + WPF BitmapDecoder para WebP)

Grupos com imagem: B, C, D+, E, F, G, H, J  
**Grupo sem imagem: I** (foto não fornecida ainda)

---

## 12. O que está funcionando hoje

- [x] Fluxo completo de solicitação (4 passos)
- [x] Calculo de preço em tempo real com sazonalidade
- [x] Persistência de rascunho em sessionStorage
- [x] Envio da solicitação para o banco
- [x] Email automático para a central com tabela de valores completa
- [x] Email automático de confirmação para o cliente
- [x] Número sequencial de reserva (#0001, #0002...)
- [x] Painel admin com login protegido por JWT
- [x] Gestão de status com máquina de estados (banco + frontend)
- [x] Modal de detalhes com todos os valores e cálculos
- [x] Página de Translados filtrada por `numero_voo`
- [x] Companhia aérea como coluna dedicada
- [x] Badge de translados pendentes no menu lateral
- [x] WhatsApp pré-preenchido com dados da reserva
- [x] CRUD de veículos, proteções, adicionais, sazonalidade e locais
- [x] Imagens dos grupos no site e na sidebar de resumo
- [x] Scroll independente (sidebar fixa, conteúdo rola)
- [x] Deploy automático via GitHub → Vercel

---

## 13. O que está faltando / pendente

### Crítico para producao
- [ ] **Domínio proprio** (ex: `igufoz.com.br`) — sem ele, emails só chegam para o dono da conta Resend. Custo: ~R$40/ano no Registro.br
- [ ] **Verificar domínio no Resend** — após registrar, adicionar registros DNS (TXT + MX) no painel Resend para liberar envio a qualquer destinatário
- [ ] **Número de WhatsApp real** — atualmente hardcoded como `554599999999` no email do cliente
- [ ] **Rodapé no site** — mencionado mas não implementado
- [ ] **Foto do Grupo I** — não fornecida ainda

### Importantes mas não urgentes
- [ ] **Email do admin separado** — hoje usa `pedrenriq@gmail.com`, criar `admin@igufoz.com.br`
- [ ] **RESEND_KEY como variável de ambiente** — hoje hardcoded na Edge Function. Corrigir com: `supabase secrets set RESEND_KEY=re_51...` e no código `Deno.env.get('RESEND_KEY')`
- [ ] **Deletar projetos Vercel duplicados** — `fase1site-8j28` e `fase1site-yqif` podem ser removidos
- [ ] **Arquivo `008_triggers.sql` desatualizado** — trigger de status foi editado diretamente no banco, arquivo em disco precisa ser sincronizado

### Fase 2
- [ ] Notificação WhatsApp automática para a central (Z-API ~R$70/mes ou Evolution API self-hosted)
- [ ] Area do cliente autenticada (historico, documentos, CNH)
- [ ] Checkout com pagamento (Stripe, Mercado Pago ou PagSeguro)
- [ ] Controle de disponibilidade de frota por data
- [ ] Multi-tenant com painel de onboarding para novas locadoras
- [ ] Relatorios e exportacao (PDF, Excel)

---

## 14. Decisões técnicas importantes

### Por que Vanilla JS e não React/Vue/Next?
Para a Fase 1, o objetivo era velocidade de desenvolvimento e zero dependências. Um framework adicionaria build steps, node_modules e complexidade de deploy. O código carrega em menos de 1 segundo.

### Por que UUID gerado no cliente?
O Supabase com RLS bloqueia `.select()` após `.insert()` para o usuario anonimo (sem política SELECT). Gerar o UUID com `crypto.randomUUID()` no navegador elimina a necessidade de buscar o ID após o INSERT.

### Por que a Edge Function é chamada do frontend e não por trigger no banco?
O trigger disparava **antes** dos itens adicionais serem inseridos. O email chegava sem os produtos. Chamando do frontend, garantimos que ambos os INSERTs completaram antes de notificar.

### Por que sessionStorage e não localStorage?
Dados de negócio vivem apenas na sessão da aba. LocalStorage persistiria indefinidamente e poderia causar confusão em sessões futuras. Dados pessoais nunca são salvos em nenhum storage.

### Por que multi-tenant desde o início?
O sistema foi desenhado para ser um SaaS de locadoras. `tenant_id` esta em todas as tabelas de negócio. O RLS garante isolamento absoluto entre tenants no nível do banco de dados.

### Por que snapshot de precos nos itens?
O campo `preco_unitario` em `solicitacao_itens` congela o preco no momento do pedido. Se o admin alterar o preco de um adicional depois, reservas antigas nao sao afetadas.

---

## 15. Arquitetura de custos

| Servico | Plano | Custo |
|---|---|---|
| Supabase | Free (500MB banco, 1GB storage, 500K calls/mes) | R$0 |
| Vercel | Hobby | R$0 |
| GitHub | Free | R$0 |
| Resend | Free (3.000 emails/mes) | R$0 |
| **Total mensal atual** | | **R$0** |

**Para producao:**
- Dominio: ~R$40/ano
- Supabase Pro (se ultrapassar free): ~R$125/mes
- Resend Pro (mais de 3k emails): a partir de US$20/mes

---

## 16. Variaveis de configuração

```
# Supabase
SUPABASE_URL          = https://lxfnqzuzohudqwibgdic.supabase.co
SUPABASE_ANON_KEY     = sb_publishable_lZYtlQFkZCgUE-ppawmXHA_CPo0tPUF
SUPABASE_SERVICE_ROLE = [apenas nas Edge Functions — nunca no frontend]

# Resend (deve virar env var)
RESEND_API_KEY        = re_51Rozuwe_Mk85nNbiLfteKshDW64jgaeh

# Negocio
EMAIL_CENTRAL         = reservasigufoz@gmail.com
```

---

## 17. Git — commits principais

```
38d3140  feat: numero sequencial de reserva (#0001, #0002...)
1c61157  feat: adiciona companhia_aerea como coluna dedicada
6f00e70  chore: remove pagina Clientes do admin
368e004  fix(translados): buscar reservas com voo em solicitacoes
f702d41  fix: usa escape Unicode nos emojis do WhatsApp
fc9f6cf  feat: scroll independente — sidebar fixa
b4d5847  feat: valores de categoria e proteção no painel e email
fbd00cd  fix: Edge Function chamada apos todos os inserts
415d446  feat: persiste rascunho em sessionStorage
5999b58  fix: UUID gerado no cliente (RLS anon)
```

---

## 18. Para apresentar a um especialista em SaaS

### Pontos fortes arquiteturais
- Multi-tenant desde o inicio com isolamento por RLS no banco
- Maquina de estados no banco + validada no frontend (dupla proteção)
- Sem `service_role key` no frontend
- Edge Functions para operações com dados sensiveis
- Migrations versionadas em arquivos separados (`001_`, `002_`...)
- Snapshot de preços nos itens (preco congelado no pedido)
- UUID gerado no cliente para evitar race condition com RLS
- Deploy automático (GitHub → Vercel) com zero configuração manual

### Divida técnica a mencionar honestamente
- Trigger `fn_validar_transicao_status()` foi alterado via SQL direto — `008_triggers.sql` desatualizado
- `RESEND_API_KEY` hardcoded na Edge Function (deve virar secret)
- `TENANT_ID` hardcoded no frontend (correto para Fase 1, necessario tornar dinamico no SaaS)
- Dois projetos Vercel duplicados a deletar
- Sem testes automatizados (E2E, unitarios)
- Sem CI/CD com gates de qualidade

### Visao de produto para Fase 2
- Area do cliente autenticada
- Checkout com pagamento integrado
- Painel de onboarding para novas locadoras (SaaS)
- Controle de disponibilidade de frota
- Notificações WhatsApp automaticas

---

*Documento gerado em 19/06/2026.*

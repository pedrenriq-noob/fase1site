# Igufoz Platform — Fase 1 Handoff

**Data:** 16/06/2026  
**Status:** Esqueleto completo ✅  
**Próxima fase:** Área do cliente (magic link, minhas reservas, translado)

---

## Visão Geral

Plataforma de reservas para locadora de veículos em Foz do Iguaçu.  
Stack: HTML + CSS + JS Vanilla (ES Modules) + Supabase (PostgreSQL + RLS) + Netlify.  
Multi-tenant preparado — todas as queries usam `tenant_id = 'a1b2c3d4-0000-0000-0000-000000000001'`.

---

## Infraestrutura

| Serviço | Detalhes |
|---|---|
| Supabase | `https://lxfnqzuzohudqwibgdic.supabase.co` |
| Anon key | `sb_publishable_lZYtlQFkZCgUE-ppawmXHA_CPo0tPUF` |
| WhatsApp | `5545988182995` |
| Admin dev | `http://localhost:3001` (`serve-admin.cmd`) |
| Site dev | `http://localhost:3002` (`serve-site.cmd`) |

---

## Estrutura de Arquivos

```
Fase 1/
├── admin/                    ← Painel administrativo
│   ├── index.html
│   ├── admin.js              ← Controlador principal + auth + modal + toast
│   ├── admin.css
│   ├── supabase.js
│   └── pages/
│       ├── dashboard.js
│       ├── categorias.js     ← CRUD de grupos de veículos
│       ├── protecoes.js      ← CRUD de proteções
│       ├── adicionais.js     ← CRUD de adicionais (cadeirinhas, GPS, etc.)
│       ├── sazonalidade.js   ← CRUD de períodos de preço sazonal
│       ├── locais.js         ← CRUD de locais de retirada/devolução ✅ NOVO
│       ├── reservas.js       ← Lista e gerencia solicitações
│       ├── translados.js     ← Gerencia pedidos de translado
│       └── clientes.js       ← Lista clientes cadastrados
│
├── site/                     ← Site público de captação
│   ├── index.html            ← Shell com #content + .summary sidebar
│   ├── style.css             ← Layout two-column desktop, mobile responsive
│   ├── script.js             ← Fluxo 4 etapas, Supabase, validações
│   └── supabase.js           ← Client + TENANT_ID + WHATSAPP
│
├── sql/                      ← Migrations versionadas
│   ├── 001_tenants.sql
│   ├── 002_usuarios.sql
│   ├── 003_categorias.sql
│   ├── 004_protecoes_adicionais.sql
│   ├── 005_sazonalidade.sql
│   ├── 006_solicitacoes.sql
│   ├── 007_documentos_condutores_translados.sql
│   ├── 008_triggers.sql
│   ├── 009_rls_policies.sql
│   ├── 010_locais.sql        ← ✅ Executado em 16/06/2026
│   ├── seed.sql              ← Dados iniciais (categorias, proteções, adicionais)
│   └── all_migrations.sql   ← Todas as migrations consolidadas
│
├── serve-admin.cmd
├── serve-site.cmd
└── handoff.md                ← Este arquivo
```

---

## Banco de Dados — Tabelas

| Tabela | Descrição |
|---|---|
| `tenants` | Empresas multi-tenant |
| `usuarios` | Admins com `tenant_id` |
| `categorias` | Grupos de veículos com preço por diária |
| `protecoes` | Opções de proteção (per_day ou fixed) |
| `adicionais` | GPS, cadeirinhas, etc. (`permite_quantidade`, `is_cadeirinha`) |
| `sazonalidade` | Períodos com preços especiais por categoria (JSONB) |
| `locais` | Endereços com horários e regras de retirada/devolução |
| `solicitacoes` | Reservas enviadas pelos clientes |
| `solicitacao_itens` | Adicionais vinculados a cada reserva |
| `translados` | Pedidos de transfer (requer `usuario_id` — só usuários logados) |
| `condutores` | Motoristas adicionais vinculados a reservas |

---

## Site Público — Fluxo de 4 Etapas

### Step 1 — Período + Categoria
- Datas e horários de retirada/devolução
- Locais filtrados dinamicamente via tabela `locais` (horário, domingo, ativo)
- Grid de categorias com preço sazonal automático
- Auto-seleção de local quando só um disponível

### Step 2 — Proteções
- Cards de proteção do Supabase
- Seleção obrigatória

### Step 3 — Adicionais
- Toggle ou quantidade (cadeirinhas com limite por categoria)
- Addon "Devolução no Aeroporto" marcado automaticamente quando local de devolução tem `is_aeroporto = true`

### Step 4 — Dados do Cliente
- Nome, CPF (validação matemática completa), WhatsApp, e-mail
- Número do voo + previsão de pouso
- Nº de pessoas (validado contra `max_pessoas` da categoria)
- Termos obrigatórios
- Resumo inline com total
- Submit → INSERT em `solicitacoes` + `solicitacao_itens` → link WhatsApp formatado

### Sidebar (Steps 1–3)
- Atualiza em tempo real
- Dropdown de troca de categoria
- Total acumulado
- Botões de navegação

### Regras de Negócio
- Frações de diária: ≤1h gratuito, >1h e ≤4h proporcional, >4h = diária extra
- Preço sazonal: verifica tabela `sazonalidade` pela data de retirada
- Locais: filtrados por horário + disponibilidade domingo (configurável no admin)
- Aviso se reserva com < 24h de antecedência

---

## Painel Admin — Páginas

| Página | Função |
|---|---|
| Dashboard | Resumo de reservas recentes e métricas |
| Veículos | CRUD de categorias com imagem, câmbio, capacidade, frota |
| Proteções | CRUD com tipo de preço (diária ou fixo) e franquia |
| Adicionais | CRUD com controle de quantidade e flag cadeirinha |
| Sazonalidade | Períodos com preços por categoria (JSONB) |
| **Locais** | CRUD de endereços com horários de retirada/devolução, flag domingo e flag aeroporto |
| Reservas | Lista, filtra e gerencia solicitações (mudar status) |
| Translados | Pedidos de transfer aguardando confirmação |
| Clientes | Lista de clientes que fizeram reservas |

---

## Segurança

1. **Nunca** usar localStorage para dados de negócio
2. **Nunca** expor senha, service_role key ou qualquer chave privada no frontend
3. **Sempre** incluir `tenant_id` em todas as queries
4. **Sempre** tratar erros explicitamente — zero exceções silenciadas
5. **Sempre** validar inputs no servidor (Edge Function), não só no frontend
6. Código novo **nunca** quebra o que já está funcionando
7. Toda migration em arquivo separado e versionado (`001_`, `002_`...)
8. Toda Edge Function com log estruturado de entrada e saída

---

## Pendências / Próxima Fase

### Imediato (cosmético)
- [ ] Adicionar imagens das categorias — copiar de `C:\Users\User\Downloads\Projeto Site\ifozsite\imagemgrupos\` ou upload para Supabase Storage
- [ ] Limpar usuário de teste `teste123@igufoz.com.br` do `auth.users`

### Fase 2 — Área do Cliente
- [ ] Magic link auth (Supabase Auth, sem senha)
- [ ] Página "Minhas Reservas" — lista de `solicitacoes` do cliente logado
- [ ] Pedido de translado (requer `usuario_id` — só funciona autenticado)
- [ ] Upload de documentos do condutor

### Fase 3 — Produção
- [ ] Deploy no Netlify (site + admin)
- [ ] Variáveis de ambiente no Netlify (não colocar keys no código)
- [ ] Edge Functions para validações server-side (CPF, disponibilidade de frota)
- [ ] Webhook ou polling para notificação do admin quando chega reserva nova
- [ ] Domínio customizado

---

## Como Rodar Localmente

```cmd
# Terminal 1 — Admin
serve-admin.cmd
# acessa http://localhost:3001

# Terminal 2 — Site
serve-site.cmd
# acessa http://localhost:3002
```

Login admin: `admin@igufoz.com.br` / `Admin@Igufoz2025`

---

## Como Aplicar Nova Migration

1. Criar arquivo `sql/0NN_descricao.sql`
2. Abrir Supabase Dashboard → SQL Editor
3. Colar e executar o conteúdo do arquivo
4. Confirmar "Success" no resultado

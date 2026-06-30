# Handoff Técnico — Igufoz Platform
**Data:** 24/06/2026  
**Fase entregue:** Fase 1 — Sistema de Captação de Reservas  
**Responsável:** Pedro Henrique

---

## 1. Visão Geral do Produto

Sistema de reservas para locadora de veículos em Foz do Iguaçu, composto por três produtos integrados:

| Produto | Descrição | Status |
|---|---|---|
| **Site de Captação** | Fluxo de reserva para o cliente final | ✅ Produção |
| **Painel Admin** | Gestão de reservas, categorias, frota e dashboard | ✅ Produção |
| **Extensão de Cotação** | Ferramenta de cotação rápida para atendentes no WhatsApp | ✅ Produção |

**URL de produção:** https://fase1site.vercel.app

---

## 2. Stack Tecnológica

| Camada | Tecnologia | Papel |
|---|---|---|
| Frontend | HTML + CSS + JavaScript Vanilla | Site e painel admin (sem framework) |
| Banco de dados | Supabase (PostgreSQL) | Armazenamento de todos os dados |
| Autenticação | Supabase Auth | Login admin com e-mail + senha |
| Backend serverless | Supabase Edge Functions (Deno/TypeScript) | Processamento de reservas e notificações |
| Hospedagem | Vercel | Deploy automático a cada push no GitHub |
| E-mail | Resend API | Notificações de novas reservas para o admin |
| Extensão | Chrome Extension (JS Vanilla) | Sidebar de cotação no navegador do atendente |

---

## 3. Arquitetura do Banco de Dados

### Tabelas principais

| Tabela | Conteúdo |
|---|---|
| `tenants` | Empresas cadastradas (multi-tenant) |
| `categorias` | Grupos de veículos com preço por diária |
| `protecoes` | Planos de proteção disponíveis |
| `adicionais` | Itens extras (cadeirinha, GPS, etc.) |
| `sazonalidade` | Preços especiais por período e categoria |
| `locais` | Pontos de retirada e devolução |
| `solicitacoes` | Reservas enviadas pelos clientes |
| `solicitacao_itens` | Adicionais vinculados a cada reserva |
| `audit_log` | Registro de todas as ações administrativas |
| `documentos` | Documentos de clientes (estrutura pronta) |
| `condutores` | Condutores adicionais (estrutura pronta) |
| `translados` | Translados aeroporto (estrutura pronta) |

### Migrations aplicadas

```
001_tenants.sql              → estrutura multi-tenant
002_usuarios.sql             → perfis de usuário
003_categorias.sql           → grupos de veículos
004_protecoes_adicionais.sql → proteções e adicionais
005_sazonalidade.sql         → preços por período
006_solicitacoes.sql         → reservas
007_documentos_condutores_translados.sql → estruturas futuras
008_triggers.sql             → automações (número sequencial)
009_rls_policies.sql         → segurança por linha
010_locais.sql               → pontos de retirada/devolução
011_add_numero_solicitacao.sql
012_add_companhia_aerea.sql
013_audit_log.sql            → trilha de auditoria
014_solicitacoes_estrangeiro.sql → suporte a cliente estrangeiro
015_rpc_inserir_solicitacao.sql  → inserção atômica (transação)
016_rls_solicitacoes_insert_fix.sql → segurança de inserção
017_rpc_dashboard_dados.sql  → dados do dashboard em uma única query
```

**Próxima migration:** `018_` (módulo de contratos)

### Segurança (RLS — Row Level Security)
Todas as tabelas têm políticas de segurança ativas. Nenhum dado de um tenant é visível para outro. Inserções públicas são validadas contra a existência do tenant.

---

## 4. Edge Functions (Backend Serverless)

### `criar-solicitacao`
Processa cada nova reserva enviada pelo site.

**O que faz:**
- Valida todos os campos obrigatórios
- Valida e-mail, WhatsApp e CPF (com dígitos verificadores)
- Calcula o valor total com sazonalidade e adicionais
- Insere reserva + itens em uma única transação atômica (sem risco de reserva sem itens)
- Rate limiting: máximo 10 requisições por minuto por IP
- Aciona a notificação por e-mail após inserção

**Segurança:** usa `SUPABASE_SERVICE_ROLE_KEY` (nunca exposta no frontend). Sem ela, retorna erro 500.

### `notificar-reserva`
Envia e-mail ao admin quando uma nova reserva chega.

**O que faz:**
- Busca dados completos da reserva com joins
- Envia e-mail HTML via Resend API para `pedrenriq@gmail.com`
- Graceful: se `RESEND_API_KEY` não configurada, registra aviso mas não quebra o fluxo

---

## 5. Estrutura de Arquivos

```
Fase 1/
├── site/
│   ├── index.html          → site de captação (cliente final)
│   └── script.js           → toda a lógica do fluxo de reserva
│   └── supabase.js         → configuração única do Supabase para o site
├── admin/
│   ├── index.html          → painel administrativo
│   ├── admin.js            → núcleo do painel (auth, navegação, utilitários)
│   └── pages/
│       ├── dashboard.js    → KPIs e painéis segmentados
│       ├── reservas.js     → listagem, filtros, mudança de status
│       ├── categorias.js   → CRUD de grupos de veículos
│       ├── protecoes.js    → CRUD de proteções
│       ├── adicionais.js   → CRUD de adicionais
│       ├── sazonalidade.js → CRUD de preços sazonais
│       ├── locais.js       → CRUD de pontos de retirada/devolução
│       └── auditoria.js    → trilha de auditoria + confirmação com senha
├── extension/
│   ├── manifest.json       → configuração da extensão Chrome
│   └── sidebar.js          → toda a lógica da cotação
├── supabase/
│   └── functions/
│       ├── criar-solicitacao/index.ts
│       └── notificar-reserva/index.ts
└── sql/
    └── 001_ a 017_         → migrations versionadas
```

---

## 6. Regras de Negócio Implementadas

### Cálculo de diárias
```
Diferença ≤ 1h  → 1 diária (mínimo)
1h a 4h         → diária fracionada
> 4h            → diária completa adicional
```
Regra aplicada de forma idêntica no site, extensão e Edge Function.

### Fluxo de status de reserva
```
Solicitada → Em análise → Confirmada → Concluída
           ↘                        ↘
            → Confirmada (direto)    → Cancelada
```

### Sazonalidade
Preços especiais por período substituem automaticamente o preço base da categoria. A lógica consulta a tabela `sazonalidade` com base na data de retirada.

### Cliente estrangeiro
Campo `estrangeiro` ativado desabilita validação de CPF e exibe campo de documento estrangeiro.

### Cadeirinhas
Limite por veículo respeitado na seleção e ao trocar de categoria (excedente removido automaticamente).

---

## 7. Painel Administrativo — Funcionalidades

| Módulo | O que faz |
|---|---|
| **Dashboard** | KPIs (total, confirmadas, em análise, canceladas, faturamento), gráficos de barras por categoria/proteção/adicionais, tabela de reservas recentes — tudo em uma única query ao banco |
| **Reservas** | Listagem com busca por nome/e-mail, filtro por status, paginação (50 por vez), mudança de status inline, visualização completa, impressão, exclusão com confirmação |
| **Categorias** | CRUD completo com foto, preço, transmissão, lugares, cadeirinhas, ativo/inativo |
| **Proteções** | CRUD com preço fixo ou por diária |
| **Adicionais** | CRUD com flag de cadeirinha |
| **Sazonalidade** | CRUD de períodos com preço por categoria |
| **Locais** | CRUD de pontos com horários de funcionamento e flags de retirada/devolução |
| **Auditoria** | Log completo de todas as ações administrativas com dados antes/depois |

---

## 8. Variáveis de Ambiente (Supabase)

| Variável | Onde | Obrigatório |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Edge Functions | ✅ Sim — sem ela as funções retornam erro 500 |
| `RESEND_API_KEY` | Edge Functions | ⚠️ Opcional — sem ela e-mails não são enviados |
| `NOTIF_EMAIL` | Edge Functions | ⚠️ Opcional — padrão: pedrenriq@gmail.com |
| `ALLOWED_ORIGINS` | Edge Functions | ⚠️ Opcional — restringe CORS quando em produção fixa |

---

## 9. Decisões Técnicas Relevantes

| Decisão | Motivo |
|---|---|
| Vanilla JS sem framework | Zero dependência de build, deploy imediato, qualquer dev pode abrir e editar |
| `sessionStorage` (nunca `localStorage`) | Dados de rascunho somem ao fechar a aba — sem risco de dado pessoal persistido no dispositivo |
| Edge Function com `SERVICE_ROLE_KEY` | Garante que a inserção de reservas só acontece pelo backend validado, não diretamente pelo cliente |
| Inserção atômica via RPC | Reserva e itens inseridos em uma única transação PostgreSQL — impossível ter reserva sem itens ou itens sem reserva |
| Multi-tenant desde o início | Toda tabela tem `tenant_id` — o sistema pode atender múltiplas locadoras sem alteração de estrutura |
| Atendimento humano pelo WhatsApp | O sistema captura e organiza, o humano relaciona — diferencial estratégico deliberado |

---

## 10. O Que Está Pronto para o Próximo Módulo

O módulo de contratos pode ser construído diretamente sobre esta base:

- Tabelas `documentos`, `condutores` e `translados` já existem no banco
- `solicitacoes` tem o campo `status` com transição para `confirmada` — ponto de partida para abertura de contrato
- RLS, `tenant_id` e `audit_log` já estão ativos — segurança e rastreabilidade prontas
- Próximas migrations a partir de `018_`
- Sistema de permissões por perfil pode ser construído sobre o Supabase Auth já configurado

---

## 11. Acesso aos Sistemas

| Sistema | URL / Local |
|---|---|
| Site de captação | https://fase1site.vercel.app |
| Painel admin | https://fase1site.vercel.app/admin |
| Repositório | Git local — branch `main` |
| Supabase | https://supabase.com → projeto `lxfnqzuzohudqwibgdic` |
| Vercel | Deploy automático a cada push na `main` |

---

*Documento gerado em 24/06/2026.*

# IGUFOZ PLATFORM — BLUEPRINT FASE 1
# Documento de contexto para Claude Code
# Versão: 1.0 | Junho 2025

======================================================
CONTEXTO DO PROJETO
======================================================

Sistema: Igufoz Platform
Descrição: Plataforma de reservas para locadora de veículos em Foz do Iguaçu.
           Substitui sistema atual em localStorage/Google Sheets.

Stack:
  - Frontend: HTML + CSS + JavaScript Vanilla
  - Backend: Supabase (PostgreSQL + Auth + Storage + Edge Functions)
  - Deploy Frontend: Netlify
  - Deploy Backend: Supabase (managed)

Multi-tenant: SIM — tenant_id obrigatório em todas as tabelas de negócio.
              A Igufoz é o primeiro tenant. Estrutura preparada para SaaS futuro.

Autenticação:
  - Clientes: magic link por e-mail (Supabase Auth)
  - Admin/Operadores: e-mail + senha (Supabase Auth)
  - NUNCA mais: senha hardcoded em JavaScript

Idioma do código: português (snake_case para variáveis, funções e colunas)
Idioma dos comentários: português


======================================================
REGRAS QUE NUNCA QUEBRAM
======================================================

1. NUNCA usar localStorage para dados de negócio
2. NUNCA colocar senha, API key ou service_role key no frontend
3. SEMPRE incluir tenant_id em todas as queries de negócio
4. SEMPRE tratar erros explicitamente — zero exceções silenciadas
5. SEMPRE validar inputs no servidor (Edge Function), não só no frontend
6. Código novo NUNCA quebra o que já está funcionando
7. Toda migration em arquivo separado e versionado (001_, 002_...)
8. Toda Edge Function com log estruturado de entrada e saída


======================================================
OS 3 PRODUTOS DA FASE 1
======================================================

PRODUTO 1 — Site de Captação (público)
  URL: reservas.igufoz.com.br
  Descrição: Fluxo de 4 passos para solicitação de reserva.
             Lógica de negócio PRESERVADA do sistema atual.
             Visual NOVO — redesenho completo.
  O que muda: dados vêm do Supabase, solicitação salva no banco,
              confirmação automática via WhatsApp ao cliente.
  O que fica igual: calculateDays(), calculateTotal(),
                    getEffectiveCategoryPrice(), validarCPF(),
                    autoSelectAirportReturn(), generateWhatsAppMessage(),
                    limite de cadeirinhas por categoria,
                    regra de domingo, regra de aeroporto.

PRODUTO 2 — Área do Cliente (login obrigatório)
  URL: igufoz.com.br/minha-conta
  Descrição: Portal do cliente com magic link.
  Telas:
    1. Minhas Reservas — lista com status em tempo real
    2. Detalhe da Reserva + Solicitar Translado
    3. Solicitar Translado (formulário: voo, data, hora, pessoas)
    4. Meu Cadastro (dados pessoais + upload CNH + passaporte)
    5. Condutores Adicionais (pré-cadastro com upload de CNH)
    6. Nova Reserva logado (dados pré-preenchidos do cadastro)

PRODUTO 3 — Painel Admin (interno, login e-mail+senha)
  URL: igufoz.com.br/admin
  Telas desta fase:
    - Login real (Supabase Auth)
    - CRUD Categorias (com imagem via Storage)
    - CRUD Proteções
    - CRUD Adicionais
    - Sazonalidade (períodos com preço por categoria)
    - Reservas (listagem + troca de status + detalhes)
    - Translados pendentes (confirmar translado do cliente)
    - Clientes (ver cadastros e documentos)

NÃO entra na Fase 1:
  - Veículos por placa
  - Contratos
  - Check-in / Check-out
  - Manutenção
  - Financeiro
  - Frota
  - CRM
  - Ciclo de vida


======================================================
SCHEMA DO BANCO DE DADOS
======================================================

--- TABELA: tenants ---
id              uuid        PK DEFAULT gen_random_uuid()
nome            text        NOT NULL
cnpj            text        UNIQUE
plano           text        DEFAULT 'basic'
whatsapp_central text       NOT NULL
dominio         text
ativo           boolean     DEFAULT true
criado_em       timestamptz DEFAULT now()

--- TABELA: usuarios ---
-- id = mesmo id do auth.users (não gerar novo uuid)
id              uuid        PK REFERENCES auth.users(id)
tenant_id       uuid        NOT NULL REFERENCES tenants(id)
nome            text        NOT NULL
email           text        UNIQUE NOT NULL
whatsapp        text
cpf             text
data_nascimento date
role            text        DEFAULT 'cliente' -- cliente | admin | operador
criado_em       timestamptz DEFAULT now()

-- RLS: cliente só vê seu próprio registro
-- RLS: admin vê todos do seu tenant

--- TABELA: categorias ---
id              uuid        PK DEFAULT gen_random_uuid()
tenant_id       uuid        NOT NULL REFERENCES tenants(id)
slug            text        NOT NULL -- grupo_b, grupo_c, etc
nome            text        NOT NULL -- GRUPO B, GRUPO C, etc
descricao       text
preco_diaria    numeric(10,2) NOT NULL
transmissao     text        -- manual | automatico
max_pessoas     integer     DEFAULT 5
max_cadeirinhas integer     DEFAULT 2
quantidade_frota integer    DEFAULT 1
imagem_url      text
ordem           integer     DEFAULT 0
ativo           boolean     DEFAULT true
criado_em       timestamptz DEFAULT now()

UNIQUE(tenant_id, slug)
INDEX: (tenant_id, ativo)

--- TABELA: protecoes ---
id              uuid        PK DEFAULT gen_random_uuid()
tenant_id       uuid        NOT NULL REFERENCES tenants(id)
nome            text        NOT NULL
descricao       text
preco           numeric(10,2) NOT NULL
tipo_preco      text        NOT NULL -- per_day | fixed
franquia        text        -- texto livre ex: "até 20% do valor FIPE"
pre_autorizacao numeric(10,2)
ordem           integer     DEFAULT 0
ativo           boolean     DEFAULT true
criado_em       timestamptz DEFAULT now()

--- TABELA: adicionais ---
id              uuid        PK DEFAULT gen_random_uuid()
tenant_id       uuid        NOT NULL REFERENCES tenants(id)
nome            text        NOT NULL
descricao       text
preco           numeric(10,2) NOT NULL
tipo_preco      text        NOT NULL -- per_day | fixed
permite_quantidade boolean  DEFAULT false
is_cadeirinha   boolean     DEFAULT false
estoque         integer     -- null = ilimitado
ordem           integer     DEFAULT 0
ativo           boolean     DEFAULT true
criado_em       timestamptz DEFAULT now()

--- TABELA: sazonalidade ---
id              uuid        PK DEFAULT gen_random_uuid()
tenant_id       uuid        NOT NULL REFERENCES tenants(id)
nome            text        NOT NULL -- ex: "Carnaval 2026"
data_inicio     date        NOT NULL
data_fim        date        NOT NULL
precos          jsonb       NOT NULL -- {"grupo_b": 210.00, "grupo_c": 230.00}
ativo           boolean     DEFAULT true
criado_em       timestamptz DEFAULT now()

INDEX: (tenant_id, data_inicio, data_fim)

--- TABELA: solicitacoes ---
-- Coração do sistema. Cada reserva começa aqui.
id              uuid        PK DEFAULT gen_random_uuid()
tenant_id       uuid        NOT NULL REFERENCES tenants(id)
usuario_id      uuid        REFERENCES usuarios(id) -- null se anônimo
categoria_id    uuid        NOT NULL REFERENCES categorias(id)
protecao_id     uuid        REFERENCES protecoes(id)

-- Snapshot dos dados do cliente no momento da solicitação
cliente_nome    text        NOT NULL
cliente_email   text        NOT NULL
cliente_whatsapp text       NOT NULL
cliente_cpf     text

-- Período
data_retirada   timestamptz NOT NULL
data_devolucao  timestamptz NOT NULL
local_retirada  text        NOT NULL
local_devolucao text        NOT NULL

-- Voo (opcional — preenchido se vier de aeroporto)
numero_voo      text
horario_pouso   text

-- Outros
pessoas         integer     DEFAULT 1
valor_estimado  numeric(10,2) NOT NULL
observacoes     text

-- Status — ENUM de estados válidos
status          text        NOT NULL DEFAULT 'solicitada'
-- Valores válidos: solicitada | em_analise | confirmada | concluida | cancelada

-- Auditoria
criado_em       timestamptz DEFAULT now()
atualizado_em   timestamptz DEFAULT now()
status_alterado_em timestamptz DEFAULT now()

INDEX: (tenant_id, status)
INDEX: (tenant_id, criado_em DESC)
INDEX: (usuario_id)

-- TRIGGER: atualizar atualizado_em e status_alterado_em automaticamente

--- TABELA: solicitacao_itens ---
-- Adicionais de cada solicitação (cadeirinhas, carta verde, etc)
id              uuid        PK DEFAULT gen_random_uuid()
solicitacao_id  uuid        NOT NULL REFERENCES solicitacoes(id) ON DELETE CASCADE
adicional_id    uuid        NOT NULL REFERENCES adicionais(id)
quantidade      integer     NOT NULL DEFAULT 1
preco_unitario  numeric(10,2) NOT NULL  -- snapshot do preço no momento
tipo_preco      text        NOT NULL    -- snapshot do tipo no momento

-- Snapshot: preços são congelados no momento da solicitação.
-- Se o admin mudar o preço depois, a solicitação mantém o preço original.

--- TABELA: documentos ---
id              uuid        PK DEFAULT gen_random_uuid()
usuario_id      uuid        NOT NULL REFERENCES usuarios(id)
tenant_id       uuid        NOT NULL REFERENCES tenants(id)
tipo            text        NOT NULL -- cnh | passaporte | rg
numero          text
validade        date
categoria_cnh   text        -- A | B | AB | C | D | E
arquivo_url     text        -- URL do Supabase Storage (signed URL)
verificado      boolean     DEFAULT false  -- admin marca como verificado
criado_em       timestamptz DEFAULT now()

-- RLS: cliente só vê seus próprios documentos
-- Storage: bucket privado, URLs assinadas com expiração de 1h

--- TABELA: condutores_adicionais ---
id              uuid        PK DEFAULT gen_random_uuid()
usuario_id      uuid        NOT NULL REFERENCES usuarios(id)
tenant_id       uuid        NOT NULL REFERENCES tenants(id)
nome            text        NOT NULL
cpf             text
cnh_numero      text
cnh_validade    date
cnh_categoria   text
cnh_arquivo_url text        -- Supabase Storage
criado_em       timestamptz DEFAULT now()

-- RLS: cliente só vê seus próprios condutores

--- TABELA: translados ---
id              uuid        PK DEFAULT gen_random_uuid()
solicitacao_id  uuid        NOT NULL REFERENCES solicitacoes(id)
usuario_id      uuid        NOT NULL REFERENCES usuarios(id)
tenant_id       uuid        NOT NULL REFERENCES tenants(id)
numero_voo      text        NOT NULL
data_voo        date        NOT NULL
horario_pouso   time        NOT NULL
pessoas         integer     NOT NULL
observacoes     text
status          text        NOT NULL DEFAULT 'pendente' -- pendente | confirmado | cancelado
confirmado_em   timestamptz
solicitado_em   timestamptz DEFAULT now()

-- Regra de negócio: translado só pode ser criado se
-- solicitacoes.status = 'confirmada'
-- Esta validação deve ocorrer na Edge Function, não no frontend.

INDEX: (tenant_id, status)


======================================================
MÁQUINA DE ESTADOS — SOLICITAÇÃO
======================================================

Estados válidos e transições permitidas:

solicitada
  → em_analise     (quem: admin — abre para analisar)
  → cancelada      (quem: admin recusa | cliente desiste)

em_analise
  → confirmada     (quem: admin confirma)
  → cancelada      (quem: admin recusa)

confirmada
  → concluida      (quem: admin — após devolução do veículo)
  → cancelada      (quem: admin — em casos excepcionais)

concluida          FINAL — imutável
cancelada          FINAL — imutável

Ao mudar para 'confirmada':
  → Disparar WhatsApp automático ao cliente com detalhes
  → Liberar botão de translado na área do cliente

Ao mudar para 'cancelada':
  → Disparar WhatsApp informando o cliente
  → Registrar motivo obrigatório (campo motivo_cancelamento)

Ao criar nova solicitação:
  → Status nasce como 'solicitada'
  → WhatsApp automático ao cliente: "Recebemos sua solicitação"
  → Alerta no WhatsApp da central


======================================================
FLUXO DO TRANSLADO
======================================================

Pré-requisito: solicitacao.status DEVE ser 'confirmada'
               (verificar na Edge Function antes de criar o translado)

1. Cliente acessa detalhe da reserva confirmada
2. Clica em "Solicitar translado"
3. Preenche: número do voo, data, horário do pouso, nº de pessoas
4. Sistema salva em tabela translados com status 'pendente'
5. Admin recebe alerta no WhatsApp + destaque no painel
6. Admin clica "Confirmar translado" no painel
7. Sistema atualiza translado.status para 'confirmado'
8. WhatsApp automático ao cliente com confirmação


======================================================
REGRAS DE NEGÓCIO PRESERVADAS DO SISTEMA ATUAL
======================================================

Todas estas funções existem no script.js original e DEVEM ser preservadas:

calculateDays(pickupDateTime, returnDateTime):
  - Calcula diárias com regra de horas parciais
  - Até 1h extra: não cobra diária adicional
  - Entre 1h e 4h: cobra fração (blocos de 30 min)
  - Acima de 4h: cobra diária completa

getEffectiveCategoryPrice(categoryId):
  - Verifica se a data de retirada está em período sazonal
  - Se sim: usa preço sazonal da categoria
  - Se não: usa preço base da categoria
  - MIGRAÇÃO: em vez de localStorage, consulta tabela sazonalidade

autoSelectAirportReturn(location):
  - Se local de devolução = aeroporto: adiciona taxa aeroporto automaticamente
  - Se local mudar: remove a taxa automaticamente

Limite de cadeirinhas:
  - Cada categoria tem max_cadeirinhas
  - Sistema impede adicionar além do limite
  - Conta total de bebe_conforto + cadeirinha_infantil + assento_elevacao

Validação de domingo:
  - Se data de retirada for domingo: informar ao cliente sobre disponibilidade
  - (não bloqueia, apenas informa)


======================================================
SEED — DADOS INICIAIS (extraídos do admin.js original)
======================================================

TENANT:
  nome: "Igufoz Locadora"
  cnpj: (a preencher)
  whatsapp_central: "5545988182995"

CATEGORIAS:
  grupo_b:    GRUPO B            R$ 167,90/dia   Manual      max 5 pessoas  max 2 cadeirinhas
  grupo_c:    GRUPO C            R$ 182,93/dia   Manual      max 5 pessoas  max 2 cadeirinhas
  grupo_d:    GRUPO D+           R$ 249,96/dia   Automático  max 5 pessoas  max 2 cadeirinhas
  grupo_f:    GRUPO F            R$ 273,95/dia   Automático  max 5 pessoas  max 2 cadeirinhas
  grupo_i:    GRUPO I            R$ 289,90/dia   Automático  max 5 pessoas  max 2 cadeirinhas
  grupo_g:    GRUPO G            R$ 369,90/dia   Automático  max 5 pessoas  max 2 cadeirinhas
  grupo_j:    GRUPO J            R$ 402,93/dia   Automático  max 5 pessoas  max 2 cadeirinhas
  grupo_h:    GRUPO H (7 LUGARES) R$ 496,98/dia  Automático  max 7 pessoas  max 4 cadeirinhas

PROTEÇÕES:
  basic:   PROTEÇÃO A TERCEIROS          R$ 29,90/dia
  plus:    PROTEÇÃO PARCIAL + TERCEIROS  R$ 65,90/dia
  premium: PROTEÇÃO PLUS + TERCEIROS     R$ 87,00/dia

ADICIONAIS:
  bebe_conforto:        BEBÊ CONFORTO             R$ 30,00/dia  permite_quantidade=true   is_cadeirinha=true
  cadeirinha_infantil:  CADEIRINHA INFANTIL        R$ 30,00/dia  permite_quantidade=true   is_cadeirinha=true
  assento_elevacao:     ASSENTO DE ELEVAÇÃO        R$ 30,00/dia  permite_quantidade=true   is_cadeirinha=true
  carta_verde_3dias:    Aut. Travessia + CV 3d     R$ 125,00 fixo
  carta_verde_7dias:    Aut. Travessia + CV 7d     R$ 190,00 fixo
  devolucao_aeroporto:  DEVOLUÇÃO NO AEROPORTO     R$ 50,00 fixo
  condutor_adicional:   CONDUTOR ADICIONAL         R$ 10,00/dia
  lavagem_antecipada:   LAVAGEM ANTECIPADA         R$ 45,00 fixo
  protecao_pneus_vidros: PROTEÇÃO PNEUS E VIDROS   R$ 24,90/dia


======================================================
ORDEM DE EXECUÇÃO — 4 SEMANAS
======================================================

SEMANA 1 — Fundação (banco + auth + admin básico)
  Tarefa 1: Criar todas as migrations SQL
  Tarefa 2: Criar seed.sql com dados acima
  Tarefa 3: Configurar RLS para todas as tabelas
  Tarefa 4: Login admin via Supabase Auth (e-mail + senha)
  Tarefa 5: CRUD de Categorias no admin (com upload de imagem)
  Output: banco funcionando + admin com login real + categorias gerenciáveis

SEMANA 2 — Admin completo
  Tarefa 1: CRUD Proteções
  Tarefa 2: CRUD Adicionais
  Tarefa 3: Sazonalidade (períodos com preço por categoria)
  Tarefa 4: Listagem de Reservas com troca de status
  Tarefa 5: Painel de Translados pendentes com botão de confirmação
  Output: admin operacional para gestão do catálogo e reservas

SEMANA 3 — Site novo
  Tarefa 1: Novo layout visual — 4 passos (preservar toda lógica do script.js)
  Tarefa 2: Carregar dados do Supabase (não mais localDatabase)
  Tarefa 3: Salvar solicitação no banco via Supabase JS client
  Tarefa 4: Edge Function: WhatsApp automático ao submeter
  Tarefa 5: Mover campo e-mail para o Passo 1
  Tarefa 6: Sazonalidade via banco (com cache de 5 minutos)
  Output: site público funcionando com banco real

SEMANA 4 — Área do Cliente
  Tarefa 1: Login magic link (Supabase Auth)
  Tarefa 2: Minhas Reservas com status em tempo real (Realtime)
  Tarefa 3: Detalhe da Reserva + botão Solicitar Translado
  Tarefa 4: Formulário de translado → salva no banco → alerta admin
  Tarefa 5: Meu Cadastro (dados pessoais + upload CNH/passaporte)
  Tarefa 6: Condutores Adicionais (pré-cadastro + upload CNH)
  Output: área do cliente completa — Fase 1 concluída


======================================================
CONFIGURAÇÃO DE AGENTES — COMO USAR NO CLAUDE CODE
======================================================

AGENTE BANCO (usar nas tarefas de migration/schema/RLS):
Instrução de sistema:
  "Você é arquiteto de banco de dados PostgreSQL especializado em Supabase.
   Não escreva frontend. Não escreva lógica de negócio fora do banco.
   Apenas SQL: migrations, índices, RLS policies, triggers, funções.
   Cada migration em arquivo separado nomeado 001_*, 002_*, etc.
   Sempre verificar se objeto já existe antes de criar (IF NOT EXISTS).
   Sempre incluir tenant_id em tabelas de negócio."

AGENTE BACKEND (usar nas Edge Functions e integrações):
Instrução de sistema:
  "Você é desenvolvedor backend Supabase.
   Stack: TypeScript + Deno + Supabase Edge Functions.
   Não escreva HTML nem CSS.
   Cada Edge Function em arquivo separado com nome descritivo.
   Sempre validar tenant_id antes de qualquer query.
   Sempre usar service_role key apenas no servidor, nunca no frontend.
   Logs estruturados em toda função."

AGENTE FRONTEND (usar no site, admin e área do cliente):
Instrução de sistema:
  "Você é desenvolvedor frontend.
   Stack: HTML + CSS + JavaScript Vanilla + Supabase JS client.
   Não escreva SQL nem Edge Functions.
   Design system: --blue #0f2b4f, --orange #FF6B00, font Inter.
   Toda persistência via Supabase JS client com RLS ativo.
   Nunca usar localStorage para dados de negócio.
   Nunca expor credenciais no código frontend.
   Preservar toda lógica do script.js original (calculateDays, etc)."

AGENTE QA (usar antes de cada deploy):
Instrução de sistema:
  "Você é QA arquitetural.
   Não construa nada. Apenas revise e questione.
   Para cada feature: tente quebrar. Pergunte: o que acontece se X?
   Verifique: tenant_id presente em todas as queries?
   Verifique: RLS impede acesso cruzado entre clientes?
   Verifique: credenciais expostas em algum lugar?
   Liste problemas como: CRÍTICO | ALTO | MÉDIO | BAIXO."


======================================================
ARQUIVOS DE REFERÊNCIA PARA CADA SEMANA
======================================================

Semana 1: subir admin.js (só para extrair DEFAULT_DB) + este blueprint
Semana 2: subir admin.html + admin.css (referência visual do painel)
Semana 3: subir script.js (lógica a preservar) + style.css + index.html
Semana 4: nenhum arquivo novo — usar o que já está no banco


======================================================
FIM DO DOCUMENTO
======================================================

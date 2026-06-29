-- ==========================================
-- FILE: 001_tenants.sql
-- ==========================================

-- 001_tenants.sql
-- Tabela raiz do multi-tenant. Toda tabela de negócio referencia esta.

CREATE TABLE IF NOT EXISTS tenants (
    id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    nome             text        NOT NULL,
    cnpj             text        UNIQUE,
    plano            text        NOT NULL DEFAULT 'basic',
    whatsapp_central text        NOT NULL,
    dominio          text,
    ativo            boolean     NOT NULL DEFAULT true,
    criado_em        timestamptz NOT NULL DEFAULT now()
);

-- Índice para lookup por domínio (usado no frontend para identificar o tenant)
CREATE INDEX IF NOT EXISTS idx_tenants_dominio ON tenants (dominio);


-- ==========================================
-- FILE: 002_usuarios.sql
-- ==========================================

-- 002_usuarios.sql
-- Perfil público dos usuários autenticados via Supabase Auth.
-- O id é o mesmo do auth.users — nunca gerar novo uuid aqui.

CREATE TABLE IF NOT EXISTS usuarios (
    id               uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id        uuid        NOT NULL REFERENCES tenants(id),
    nome             text        NOT NULL,
    email            text        NOT NULL UNIQUE,
    whatsapp         text,
    cpf              text,
    data_nascimento  date,
    role             text        NOT NULL DEFAULT 'cliente'
                                 CHECK (role IN ('cliente', 'admin', 'operador')),
    criado_em        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_usuarios_tenant ON usuarios (tenant_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_email  ON usuarios (email);


-- ==========================================
-- FILE: 003_categorias.sql
-- ==========================================

-- 003_categorias.sql
-- Grupos de veículos com preço base por diária.

CREATE TABLE IF NOT EXISTS categorias (
    id               uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        uuid           NOT NULL REFERENCES tenants(id),
    slug             text           NOT NULL,  -- grupo_b, grupo_c, etc
    nome             text           NOT NULL,  -- GRUPO B, GRUPO C, etc
    descricao        text,
    preco_diaria     numeric(10,2)  NOT NULL,
    transmissao      text           CHECK (transmissao IN ('manual', 'automatico')),
    max_pessoas      integer        NOT NULL DEFAULT 5,
    max_cadeirinhas  integer        NOT NULL DEFAULT 2,
    quantidade_frota integer        NOT NULL DEFAULT 1,
    imagem_url       text,
    ordem            integer        NOT NULL DEFAULT 0,
    ativo            boolean        NOT NULL DEFAULT true,
    criado_em        timestamptz    NOT NULL DEFAULT now(),

    UNIQUE (tenant_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_categorias_tenant_ativo ON categorias (tenant_id, ativo);


-- ==========================================
-- FILE: 004_protecoes_adicionais.sql
-- ==========================================

-- 004_protecoes_adicionais.sql

CREATE TABLE IF NOT EXISTS protecoes (
    id               uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        uuid           NOT NULL REFERENCES tenants(id),
    nome             text           NOT NULL,
    descricao        text,
    preco            numeric(10,2)  NOT NULL,
    tipo_preco       text           NOT NULL CHECK (tipo_preco IN ('per_day', 'fixed')),
    franquia         text,          -- texto livre ex: "até 20% do valor FIPE"
    pre_autorizacao  numeric(10,2),
    ordem            integer        NOT NULL DEFAULT 0,
    ativo            boolean        NOT NULL DEFAULT true,
    criado_em        timestamptz    NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_protecoes_tenant_ativo ON protecoes (tenant_id, ativo);

-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS adicionais (
    id                  uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           uuid           NOT NULL REFERENCES tenants(id),
    nome                text           NOT NULL,
    descricao           text,
    preco               numeric(10,2)  NOT NULL,
    tipo_preco          text           NOT NULL CHECK (tipo_preco IN ('per_day', 'fixed')),
    permite_quantidade  boolean        NOT NULL DEFAULT false,
    is_cadeirinha       boolean        NOT NULL DEFAULT false,
    estoque             integer,       -- null = ilimitado
    ordem               integer        NOT NULL DEFAULT 0,
    ativo               boolean        NOT NULL DEFAULT true,
    criado_em           timestamptz    NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_adicionais_tenant_ativo ON adicionais (tenant_id, ativo);


-- ==========================================
-- FILE: 005_sazonalidade.sql
-- ==========================================

-- 005_sazonalidade.sql
-- Períodos com preço diferenciado por categoria.
-- O campo precos é um jsonb: {"slug_da_categoria": preco_diaria}
-- Ex: {"grupo_b": 210.00, "grupo_c": 230.00}
-- Categorias ausentes do jsonb usam o preco_diaria padrão da tabela categorias.

CREATE TABLE IF NOT EXISTS sazonalidade (
    id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id    uuid        NOT NULL REFERENCES tenants(id),
    nome         text        NOT NULL,  -- ex: "Carnaval 2026"
    data_inicio  date        NOT NULL,
    data_fim     date        NOT NULL,
    precos       jsonb       NOT NULL DEFAULT '{}',
    ativo        boolean     NOT NULL DEFAULT true,
    criado_em    timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT sazonalidade_datas_validas CHECK (data_fim >= data_inicio)
);

-- Índice composto para a query de "qual período cobre esta data de retirada?"
CREATE INDEX IF NOT EXISTS idx_sazonalidade_tenant_periodo
    ON sazonalidade (tenant_id, data_inicio, data_fim);


-- ==========================================
-- FILE: 006_solicitacoes.sql
-- ==========================================

-- 006_solicitacoes.sql
-- Coração do sistema. Cada reserva nasce aqui como 'solicitada'.

CREATE TABLE IF NOT EXISTS solicitacoes (
    id                   uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id            uuid           NOT NULL REFERENCES tenants(id),
    usuario_id           uuid           REFERENCES usuarios(id),  -- null se anônimo
    categoria_id         uuid           NOT NULL REFERENCES categorias(id),
    protecao_id          uuid           REFERENCES protecoes(id),

    -- Snapshot do cliente no momento da solicitação
    cliente_nome         text           NOT NULL,
    cliente_email        text           NOT NULL,
    cliente_whatsapp     text           NOT NULL,
    cliente_cpf          text,

    -- Período
    data_retirada        timestamptz    NOT NULL,
    data_devolucao       timestamptz    NOT NULL,
    local_retirada       text           NOT NULL,
    local_devolucao      text           NOT NULL,

    -- Voo (preenchido quando local é aeroporto)
    numero_voo           text,
    horario_pouso        text,

    pessoas              integer        NOT NULL DEFAULT 1,
    valor_estimado       numeric(10,2)  NOT NULL,
    observacoes          text,
    motivo_cancelamento  text,          -- obrigatório ao cancelar

    status               text           NOT NULL DEFAULT 'solicitada'
                                        CHECK (status IN (
                                            'solicitada',
                                            'em_analise',
                                            'confirmada',
                                            'concluida',
                                            'cancelada'
                                        )),

    criado_em            timestamptz    NOT NULL DEFAULT now(),
    atualizado_em        timestamptz    NOT NULL DEFAULT now(),
    status_alterado_em   timestamptz    NOT NULL DEFAULT now(),

    CONSTRAINT solicitacoes_datas_validas CHECK (data_devolucao > data_retirada)
);

CREATE INDEX IF NOT EXISTS idx_solicitacoes_tenant_status  ON solicitacoes (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_tenant_criado  ON solicitacoes (tenant_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_usuario        ON solicitacoes (usuario_id);

-- ---------------------------------------------------------------------------
-- Itens da solicitação (adicionais escolhidos pelo cliente)
-- Preços são congelados no momento da solicitação.

CREATE TABLE IF NOT EXISTS solicitacao_itens (
    id              uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
    solicitacao_id  uuid           NOT NULL REFERENCES solicitacoes(id) ON DELETE CASCADE,
    adicional_id    uuid           NOT NULL REFERENCES adicionais(id),
    quantidade      integer        NOT NULL DEFAULT 1 CHECK (quantidade > 0),
    preco_unitario  numeric(10,2)  NOT NULL,  -- snapshot do preço
    tipo_preco      text           NOT NULL   -- snapshot do tipo
                                   CHECK (tipo_preco IN ('per_day', 'fixed'))
);

CREATE INDEX IF NOT EXISTS idx_solicitacao_itens_solicitacao ON solicitacao_itens (solicitacao_id);


-- ==========================================
-- FILE: 007_documentos_condutores_translados.sql
-- ==========================================

-- 007_documentos_condutores_translados.sql

-- ---------------------------------------------------------------------------
-- Documentos do cliente (CNH, passaporte, RG)
-- Arquivos armazenados no Supabase Storage (bucket privado).
-- URLs são signed URLs com expiração de 1h — nunca armazenar URL pública.

CREATE TABLE IF NOT EXISTS documentos (
    id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id    uuid        NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    tenant_id     uuid        NOT NULL REFERENCES tenants(id),
    tipo          text        NOT NULL CHECK (tipo IN ('cnh', 'passaporte', 'rg')),
    numero        text,
    validade      date,
    categoria_cnh text        CHECK (categoria_cnh IN ('A', 'B', 'AB', 'C', 'D', 'E')),
    arquivo_url   text,       -- path no Storage, não URL pública
    verificado    boolean     NOT NULL DEFAULT false,
    criado_em     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_documentos_usuario   ON documentos (usuario_id);
CREATE INDEX IF NOT EXISTS idx_documentos_tenant    ON documentos (tenant_id);

-- ---------------------------------------------------------------------------
-- Condutores adicionais pré-cadastrados pelo cliente

CREATE TABLE IF NOT EXISTS condutores_adicionais (
    id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id     uuid        NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    tenant_id      uuid        NOT NULL REFERENCES tenants(id),
    nome           text        NOT NULL,
    cpf            text,
    cnh_numero     text,
    cnh_validade   date,
    cnh_categoria  text,
    cnh_arquivo_url text,      -- path no Storage
    criado_em      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_condutores_usuario ON condutores_adicionais (usuario_id);

-- ---------------------------------------------------------------------------
-- Translados solicitados pelo cliente após reserva confirmada
-- Pré-requisito: solicitacoes.status = 'confirmada' (validado na Edge Function)

CREATE TABLE IF NOT EXISTS translados (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    solicitacao_id  uuid        NOT NULL REFERENCES solicitacoes(id),
    usuario_id      uuid        NOT NULL REFERENCES usuarios(id),
    tenant_id       uuid        NOT NULL REFERENCES tenants(id),
    numero_voo      text        NOT NULL,
    data_voo        date        NOT NULL,
    horario_pouso   time        NOT NULL,
    pessoas         integer     NOT NULL CHECK (pessoas > 0),
    observacoes     text,
    status          text        NOT NULL DEFAULT 'pendente'
                                CHECK (status IN ('pendente', 'confirmado', 'cancelado')),
    confirmado_em   timestamptz,
    solicitado_em   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_translados_tenant_status ON translados (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_translados_solicitacao   ON translados (solicitacao_id);


-- ==========================================
-- FILE: 008_triggers.sql
-- ==========================================

-- 008_triggers.sql
-- Triggers automáticos para auditoria e integridade.

-- ---------------------------------------------------------------------------
-- Função genérica para atualizar atualizado_em em qualquer tabela

CREATE OR REPLACE FUNCTION fn_set_atualizado_em()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.atualizado_em = now();
    RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- Função para atualizar status_alterado_em apenas quando status muda

CREATE OR REPLACE FUNCTION fn_set_status_alterado_em()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
        NEW.status_alterado_em = now();
        NEW.atualizado_em      = now();
    END IF;
    RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- Trigger: solicitacoes — atualiza timestamps

CREATE OR REPLACE TRIGGER trg_solicitacoes_atualizado_em
    BEFORE UPDATE ON solicitacoes
    FOR EACH ROW
    EXECUTE FUNCTION fn_set_status_alterado_em();

-- ---------------------------------------------------------------------------
-- Função que cria o perfil do usuário automaticamente ao fazer signup
-- Disparada pelo Supabase Auth via trigger no schema auth.

CREATE OR REPLACE FUNCTION fn_criar_usuario_no_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tenant_id uuid;
BEGIN
    -- Tenta pegar o tenant_id dos metadados do signup
    -- O frontend deve passar: { data: { tenant_id: '...', nome: '...' } }
    v_tenant_id := (NEW.raw_user_meta_data->>'tenant_id')::uuid;

    -- Só insere se tiver tenant_id nos metadados (signup via plataforma)
    IF v_tenant_id IS NOT NULL THEN
        INSERT INTO public.usuarios (id, tenant_id, nome, email, role)
        VALUES (
            NEW.id,
            v_tenant_id,
            COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
            NEW.email,
            COALESCE(NEW.raw_user_meta_data->>'role', 'cliente')
        )
        ON CONFLICT (id) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$;

-- Trigger no schema auth (requer permissão de superuser — rodar como postgres no Supabase SQL Editor)
CREATE OR REPLACE TRIGGER trg_auth_criar_usuario
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION fn_criar_usuario_no_signup();

-- ---------------------------------------------------------------------------
-- Função para validar transições de status (máquina de estados)

CREATE OR REPLACE FUNCTION fn_validar_transicao_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Estados finais são imutáveis
    IF OLD.status IN ('concluida', 'cancelada') THEN
        RAISE EXCEPTION 'Solicitação no estado "%" não pode ser alterada.', OLD.status;
    END IF;

    -- Transições permitidas
    IF NOT (
        (OLD.status = 'solicitada'  AND NEW.status IN ('em_analise', 'confirmada', 'cancelada'))  OR
        (OLD.status = 'em_analise'  AND NEW.status IN ('confirmada', 'cancelada'))  OR
        (OLD.status = 'confirmada'  AND NEW.status IN ('concluida',  'cancelada'))  OR
        (OLD.status = NEW.status)   -- sem mudança: sempre permitido
    ) THEN
        RAISE EXCEPTION 'Transição de status inválida: "%" → "%".', OLD.status, NEW.status;
    END IF;

    -- Cancelamento exige motivo
    IF NEW.status = 'cancelada' AND (NEW.motivo_cancelamento IS NULL OR trim(NEW.motivo_cancelamento) = '') THEN
        RAISE EXCEPTION 'Campo motivo_cancelamento é obrigatório ao cancelar.';
    END IF;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_solicitacoes_validar_status
    BEFORE UPDATE OF status ON solicitacoes
    FOR EACH ROW
    EXECUTE FUNCTION fn_validar_transicao_status();


-- ==========================================
-- FILE: 009_rls_policies.sql
-- ==========================================

-- 009_rls_policies.sql
-- Row Level Security para todas as tabelas de negócio.
-- Premissa: todo request autenticado tem auth.uid() disponível.
-- Premissa: admins e operadores têm role salva na tabela usuarios.

-- ---------------------------------------------------------------------------
-- Funções auxiliares

-- Retorna o tenant_id do usuário logado
CREATE OR REPLACE FUNCTION fn_meu_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT tenant_id FROM public.usuarios WHERE id = auth.uid();
$$;

-- Retorna true se o usuário logado é admin ou operador no tenant
CREATE OR REPLACE FUNCTION fn_sou_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE id = auth.uid()
          AND role IN ('admin', 'operador')
    );
$$;

-- ---------------------------------------------------------------------------
-- TENANTS — somente leitura para membros do tenant

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant: membro pode ler seu tenant"
    ON tenants FOR SELECT
    USING (id = fn_meu_tenant_id());

-- ---------------------------------------------------------------------------
-- USUARIOS

ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

-- Cliente lê apenas seu próprio perfil
CREATE POLICY "usuarios: cliente lê o próprio perfil"
    ON usuarios FOR SELECT
    USING (id = auth.uid());

-- Admin/operador lê todos do seu tenant
CREATE POLICY "usuarios: admin lê todos do tenant"
    ON usuarios FOR SELECT
    USING (fn_sou_admin() AND tenant_id = fn_meu_tenant_id());

-- Qualquer usuário atualiza seu próprio perfil
CREATE POLICY "usuarios: atualiza o próprio perfil"
    ON usuarios FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- Inserção feita apenas via trigger de signup (fn_criar_usuario_no_signup)
-- ou por admin (para criar operadores)
CREATE POLICY "usuarios: admin insere membros do tenant"
    ON usuarios FOR INSERT
    WITH CHECK (fn_sou_admin() AND tenant_id = fn_meu_tenant_id());

-- ---------------------------------------------------------------------------
-- CATEGORIAS — leitura pública (site de captação), escrita só admin

ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categorias: leitura pública"
    ON categorias FOR SELECT
    USING (ativo = true);

CREATE POLICY "categorias: admin escreve"
    ON categorias FOR ALL
    USING (fn_sou_admin() AND tenant_id = fn_meu_tenant_id())
    WITH CHECK (fn_sou_admin() AND tenant_id = fn_meu_tenant_id());

-- ---------------------------------------------------------------------------
-- PROTECOES — leitura pública, escrita só admin

ALTER TABLE protecoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "protecoes: leitura pública"
    ON protecoes FOR SELECT
    USING (ativo = true);

CREATE POLICY "protecoes: admin escreve"
    ON protecoes FOR ALL
    USING (fn_sou_admin() AND tenant_id = fn_meu_tenant_id())
    WITH CHECK (fn_sou_admin() AND tenant_id = fn_meu_tenant_id());

-- ---------------------------------------------------------------------------
-- ADICIONAIS — leitura pública, escrita só admin

ALTER TABLE adicionais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "adicionais: leitura pública"
    ON adicionais FOR SELECT
    USING (ativo = true);

CREATE POLICY "adicionais: admin escreve"
    ON adicionais FOR ALL
    USING (fn_sou_admin() AND tenant_id = fn_meu_tenant_id())
    WITH CHECK (fn_sou_admin() AND tenant_id = fn_meu_tenant_id());

-- ---------------------------------------------------------------------------
-- SAZONALIDADE — leitura pública, escrita só admin

ALTER TABLE sazonalidade ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sazonalidade: leitura pública"
    ON sazonalidade FOR SELECT
    USING (ativo = true);

CREATE POLICY "sazonalidade: admin escreve"
    ON sazonalidade FOR ALL
    USING (fn_sou_admin() AND tenant_id = fn_meu_tenant_id())
    WITH CHECK (fn_sou_admin() AND tenant_id = fn_meu_tenant_id());

-- ---------------------------------------------------------------------------
-- SOLICITACOES

ALTER TABLE solicitacoes ENABLE ROW LEVEL SECURITY;

-- Cliente vê apenas suas próprias reservas
CREATE POLICY "solicitacoes: cliente lê as próprias"
    ON solicitacoes FOR SELECT
    USING (usuario_id = auth.uid());

-- Admin/operador lê todas do tenant
CREATE POLICY "solicitacoes: admin lê todas do tenant"
    ON solicitacoes FOR SELECT
    USING (fn_sou_admin() AND tenant_id = fn_meu_tenant_id());

-- Qualquer pessoa (anônima ou logada) pode criar solicitação
-- tenant_id e categoria_id são validados na Edge Function
CREATE POLICY "solicitacoes: inserção pública"
    ON solicitacoes FOR INSERT
    WITH CHECK (true);

-- Admin/operador atualiza (troca de status, etc)
CREATE POLICY "solicitacoes: admin atualiza"
    ON solicitacoes FOR UPDATE
    USING (fn_sou_admin() AND tenant_id = fn_meu_tenant_id())
    WITH CHECK (fn_sou_admin() AND tenant_id = fn_meu_tenant_id());

-- ---------------------------------------------------------------------------
-- SOLICITACAO_ITENS

ALTER TABLE solicitacao_itens ENABLE ROW LEVEL SECURITY;

-- Cliente lê itens das suas próprias solicitações
CREATE POLICY "solicitacao_itens: cliente lê os próprios"
    ON solicitacao_itens FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM solicitacoes s
            WHERE s.id = solicitacao_itens.solicitacao_id
              AND s.usuario_id = auth.uid()
        )
    );

-- Admin lê todos do tenant
CREATE POLICY "solicitacao_itens: admin lê todos do tenant"
    ON solicitacao_itens FOR SELECT
    USING (
        fn_sou_admin() AND EXISTS (
            SELECT 1 FROM solicitacoes s
            WHERE s.id = solicitacao_itens.solicitacao_id
              AND s.tenant_id = fn_meu_tenant_id()
        )
    );

-- Inserção pública (junto com a solicitação, via Edge Function)
CREATE POLICY "solicitacao_itens: inserção pública"
    ON solicitacao_itens FOR INSERT
    WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- DOCUMENTOS

ALTER TABLE documentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "documentos: cliente lê os próprios"
    ON documentos FOR SELECT
    USING (usuario_id = auth.uid());

CREATE POLICY "documentos: admin lê todos do tenant"
    ON documentos FOR SELECT
    USING (fn_sou_admin() AND tenant_id = fn_meu_tenant_id());

CREATE POLICY "documentos: cliente insere e atualiza os próprios"
    ON documentos FOR ALL
    USING (usuario_id = auth.uid())
    WITH CHECK (usuario_id = auth.uid());

-- Admin marca como verificado
CREATE POLICY "documentos: admin atualiza verificado"
    ON documentos FOR UPDATE
    USING (fn_sou_admin() AND tenant_id = fn_meu_tenant_id())
    WITH CHECK (fn_sou_admin() AND tenant_id = fn_meu_tenant_id());

-- ---------------------------------------------------------------------------
-- CONDUTORES_ADICIONAIS

ALTER TABLE condutores_adicionais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "condutores: cliente lê os próprios"
    ON condutores_adicionais FOR SELECT
    USING (usuario_id = auth.uid());

CREATE POLICY "condutores: admin lê todos do tenant"
    ON condutores_adicionais FOR SELECT
    USING (fn_sou_admin() AND tenant_id = fn_meu_tenant_id());

CREATE POLICY "condutores: cliente gerencia os próprios"
    ON condutores_adicionais FOR ALL
    USING (usuario_id = auth.uid())
    WITH CHECK (usuario_id = auth.uid());

-- ---------------------------------------------------------------------------
-- TRANSLADOS

ALTER TABLE translados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "translados: cliente lê os próprios"
    ON translados FOR SELECT
    USING (usuario_id = auth.uid());

CREATE POLICY "translados: admin lê todos do tenant"
    ON translados FOR SELECT
    USING (fn_sou_admin() AND tenant_id = fn_meu_tenant_id());

-- Cliente cria translado (pré-requisito validado na Edge Function)
CREATE POLICY "translados: cliente cria"
    ON translados FOR INSERT
    WITH CHECK (usuario_id = auth.uid());

-- Admin confirma ou cancela translado
CREATE POLICY "translados: admin atualiza"
    ON translados FOR UPDATE
    USING (fn_sou_admin() AND tenant_id = fn_meu_tenant_id())
    WITH CHECK (fn_sou_admin() AND tenant_id = fn_meu_tenant_id());


-- ==========================================
-- FILE: 010_locais.sql
-- ==========================================

-- 010_locais.sql
-- Locais de retirada e devolução com horários e regras configuráveis.

CREATE TABLE IF NOT EXISTS locais (
    id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id               uuid        NOT NULL REFERENCES tenants(id),
    nome                    text        NOT NULL,
    permite_retirada        boolean     NOT NULL DEFAULT true,
    permite_devolucao       boolean     NOT NULL DEFAULT true,
    -- NULL = sem restrição de horário (aceita qualquer hora)
    hora_retirada_inicio    time,
    hora_retirada_fim       time,
    hora_devolucao_inicio   time,
    hora_devolucao_fim      time,
    disponivel_domingo      boolean     NOT NULL DEFAULT true,
    is_aeroporto            boolean     NOT NULL DEFAULT false,
    ativo                   boolean     NOT NULL DEFAULT true,
    ordem                   integer     NOT NULL DEFAULT 0,
    criado_em               timestamptz NOT NULL DEFAULT now(),

    UNIQUE (tenant_id, nome)
);

CREATE INDEX IF NOT EXISTS idx_locais_tenant_ativo ON locais (tenant_id, ativo);

-- RLS
ALTER TABLE locais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "locais_anon_select"
    ON locais FOR SELECT
    TO anon
    USING (ativo = true);

CREATE POLICY "locais_auth_all"
    ON locais FOR ALL
    TO authenticated
    USING (tenant_id = (SELECT tenant_id FROM usuarios WHERE id = auth.uid() LIMIT 1));

-- Seed inicial com os 3 locais atuais
INSERT INTO locais (tenant_id, nome, permite_retirada, permite_devolucao,
    hora_retirada_inicio, hora_retirada_fim,
    hora_devolucao_inicio, hora_devolucao_fim,
    disponivel_domingo, is_aeroporto, ordem)
VALUES
    (
        'a1b2c3d4-0000-0000-0000-000000000001',
        'Av. Brasil, 90 — Centro',
        true, true,
        '08:00', '18:00',
        '08:00', '18:00',
        false,  -- não abre domingo
        false,
        1
    ),
    (
        'a1b2c3d4-0000-0000-0000-000000000001',
        'Av. das Cataratas, 1419 — Vila Yolanda',
        true, true,
        '08:00', '18:00',
        '08:00', '18:00',
        true,   -- abre domingo
        false,
        2
    ),
    (
        'a1b2c3d4-0000-0000-0000-000000000001',
        'Estacionamento Leva e Trás 24h — Aeroporto',
        true, true,
        '00:00', '23:59',
        '00:00', '23:59',
        true,   -- 24h, 7 dias
        true,   -- é aeroporto → ativa addon automático
        3
    )
ON CONFLICT (tenant_id, nome) DO NOTHING;


-- ==========================================
-- FILE: 011_add_numero_solicitacao.sql
-- ==========================================

-- 011_add_numero_solicitacao.sql
-- Adiciona campo numero (sequencial por tenant) à tabela solicitacoes.
-- ATENÇÃO: Se o banco já possui este campo (criado manualmente), este script
-- não fará nada graças ao IF NOT EXISTS.

ALTER TABLE solicitacoes
  ADD COLUMN IF NOT EXISTS numero SERIAL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_solicitacoes_numero ON solicitacoes (numero);


-- ==========================================
-- FILE: 012_add_companhia_aerea.sql
-- ==========================================

-- 012_add_companhia_aerea.sql
-- Adiciona campo companhia_aerea à tabela solicitacoes.
-- O campo era enviado pelo frontend mas descartado silenciosamente por não existir.

ALTER TABLE solicitacoes
  ADD COLUMN IF NOT EXISTS companhia_aerea text;


-- ==========================================
-- FILE: 013_audit_log.sql
-- ==========================================

-- 013_audit_log.sql
-- Trilha de auditoria para ações administrativas

CREATE TABLE IF NOT EXISTS audit_log (
    id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id   uuid        NOT NULL,
    usuario_id  uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
    acao        text        NOT NULL,   -- 'criar', 'atualizar', 'excluir', 'status'
    entidade    text        NOT NULL,   -- 'reserva', 'categoria', 'local', etc.
    entidade_id uuid,
    descricao   text,
    dados_antes jsonb,
    dados_depois jsonb,
    criado_em   timestamptz DEFAULT now()
);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Admin pode ler e inserir apenas registros do próprio tenant
CREATE POLICY audit_select ON audit_log
    FOR SELECT TO authenticated
    USING (tenant_id = (SELECT tenant_id FROM usuarios WHERE id = auth.uid() LIMIT 1));

CREATE POLICY audit_insert ON audit_log
    FOR INSERT TO authenticated
    WITH CHECK (tenant_id = (SELECT tenant_id FROM usuarios WHERE id = auth.uid() LIMIT 1));

-- Índices para queries comuns
CREATE INDEX IF NOT EXISTS idx_audit_tenant_criado ON audit_log (tenant_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_audit_entidade      ON audit_log (entidade, entidade_id);


-- ==========================================
-- FILE: 014_solicitacoes_estrangeiro.sql
-- ==========================================

-- 014_solicitacoes_estrangeiro.sql
-- Suporte a solicitantes estrangeiros (sem CPF brasileiro)

ALTER TABLE solicitacoes
  ADD COLUMN IF NOT EXISTS estrangeiro   boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS cliente_doc   text;  -- Passaporte, RNE, DNI, etc.


-- ==========================================
-- FILE: 015_rpc_inserir_solicitacao.sql
-- ==========================================

-- 015_rpc_inserir_solicitacao.sql
-- Garante atomicidade ao inserir solicitação + itens em uma única transação PostgreSQL.
-- Se a inserção dos itens falhar, a solicitação principal também é revertida (rollback automático).

CREATE OR REPLACE FUNCTION inserir_solicitacao_completa(
  p_sol   jsonb,
  p_itens jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id     uuid;
  v_numero integer;
  v_item   jsonb;
BEGIN
  INSERT INTO solicitacoes (
    tenant_id,        categoria_id,     protecao_id,
    cliente_nome,     cliente_email,    cliente_whatsapp,
    cliente_cpf,      estrangeiro,      cliente_doc,
    companhia_aerea,  data_retirada,    data_devolucao,
    local_retirada,   local_devolucao,  valor_estimado,
    pessoas,          numero_voo,       horario_pouso,
    observacoes,      status
  ) VALUES (
    (p_sol->>'tenant_id')::uuid,
    (p_sol->>'categoria_id')::uuid,
    NULLIF(p_sol->>'protecao_id', '')::uuid,
    p_sol->>'cliente_nome',
    p_sol->>'cliente_email',
    p_sol->>'cliente_whatsapp',
    NULLIF(p_sol->>'cliente_cpf', ''),
    COALESCE((p_sol->>'estrangeiro')::boolean, false),
    NULLIF(p_sol->>'cliente_doc', ''),
    NULLIF(p_sol->>'companhia_aerea', ''),
    (p_sol->>'data_retirada')::timestamptz,
    (p_sol->>'data_devolucao')::timestamptz,
    p_sol->>'local_retirada',
    p_sol->>'local_devolucao',
    (p_sol->>'valor_estimado')::numeric,
    COALESCE((p_sol->>'pessoas')::integer, 1),
    NULLIF(p_sol->>'numero_voo', ''),
    NULLIF(p_sol->>'horario_pouso', ''),
    NULLIF(p_sol->>'observacoes', ''),
    'solicitada'
  )
  RETURNING id, numero INTO v_id, v_numero;

  FOR v_item IN SELECT value FROM jsonb_array_elements(COALESCE(p_itens, '[]'::jsonb))
  LOOP
    INSERT INTO solicitacao_itens (
      solicitacao_id, adicional_id, quantidade, preco_unitario, tipo_preco
    ) VALUES (
      v_id,
      (v_item->>'adicional_id')::uuid,
      (v_item->>'quantidade')::integer,
      (v_item->>'preco_unitario')::numeric,
      v_item->>'tipo_preco'
    );
  END LOOP;

  RETURN jsonb_build_object('id', v_id, 'numero', v_numero);
END;
$$;


-- ==========================================
-- FILE: 016_rls_solicitacoes_insert_fix.sql
-- ==========================================

-- 016_rls_solicitacoes_insert_fix.sql
-- Substitui WITH CHECK (true) por validação de tenant ativo.
-- Impede inserção direta via REST API com tenant_id falso ou inativo.

-- Solicitações
DROP POLICY IF EXISTS "solicitacoes: inserção pública" ON solicitacoes;
CREATE POLICY "solicitacoes: inserção pública"
    ON solicitacoes FOR INSERT
    WITH CHECK (
        EXISTS (SELECT 1 FROM tenants WHERE id = solicitacoes.tenant_id AND ativo = true)
    );

-- Itens de solicitação: só permite se a solicitação-pai existe e pertence a tenant ativo
DROP POLICY IF EXISTS "solicitacao_itens: inserção pública" ON solicitacao_itens;
CREATE POLICY "solicitacao_itens: inserção pública"
    ON solicitacao_itens FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM solicitacoes s
            JOIN tenants t ON t.id = s.tenant_id
            WHERE s.id = solicitacao_itens.solicitacao_id
              AND t.ativo = true
        )
    );


-- ==========================================
-- FILE: 017_rpc_dashboard_dados.sql
-- ==========================================

-- 017_rpc_dashboard_dados.sql
-- Substitui o carregamento de 500 registros no cliente por uma única RPC
-- que retorna KPIs, segmentos e recentes já agregados no banco.

CREATE OR REPLACE FUNCTION dashboard_dados(
  p_tenant_id uuid,
  p_de  timestamptz DEFAULT NULL,
  p_ate timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
BEGIN
  WITH reservas AS (
    SELECT
      s.id, s.status, s.valor_estimado, s.criado_em,
      s.cliente_nome, s.numero,
      c.nome  AS cat_nome,
      pr.nome AS prot_nome
    FROM solicitacoes s
    LEFT JOIN categorias c  ON c.id  = s.categoria_id
    LEFT JOIN protecoes  pr ON pr.id = s.protecao_id
    WHERE s.tenant_id = p_tenant_id
      AND (p_de  IS NULL OR s.criado_em >= p_de)
      AND (p_ate IS NULL OR s.criado_em <= p_ate)
  ),
  kpis AS (
    SELECT
      COUNT(*)                                                               AS total,
      COUNT(*) FILTER (WHERE status = 'confirmada')                         AS confirmada,
      COUNT(*) FILTER (WHERE status = 'em_analise')                         AS em_analise,
      COUNT(*) FILTER (WHERE status = 'cancelada')                          AS cancelada,
      COALESCE(SUM(valor_estimado) FILTER (WHERE status <> 'cancelada'), 0) AS faturamento
    FROM reservas
  ),
  cats AS (
    SELECT cat_nome AS nome, COUNT(*) AS qty
    FROM reservas
    WHERE status <> 'cancelada' AND cat_nome IS NOT NULL
    GROUP BY cat_nome ORDER BY qty DESC
  ),
  prots AS (
    SELECT COALESCE(prot_nome, 'Sem proteção') AS nome, COUNT(*) AS qty
    FROM reservas
    WHERE status <> 'cancelada'
    GROUP BY prot_nome ORDER BY qty DESC
  ),
  adds AS (
    SELECT a.nome, SUM(si.quantidade) AS qty
    FROM solicitacao_itens si
    JOIN adicionais   a ON a.id = si.adicional_id
    JOIN solicitacoes s ON s.id = si.solicitacao_id
    WHERE s.tenant_id = p_tenant_id
      AND s.status <> 'cancelada'
      AND (p_de  IS NULL OR s.criado_em >= p_de)
      AND (p_ate IS NULL OR s.criado_em <= p_ate)
    GROUP BY a.nome ORDER BY qty DESC
  ),
  recentes AS (
    SELECT id, numero, status, cliente_nome, valor_estimado, criado_em, cat_nome, prot_nome
    FROM reservas ORDER BY criado_em DESC LIMIT 10
  )
  SELECT jsonb_build_object(
    'kpis',     (SELECT row_to_json(k)           FROM kpis k),
    'cats',     (SELECT jsonb_agg(row_to_json(c)) FROM cats c),
    'prots',    (SELECT jsonb_agg(row_to_json(p)) FROM prots p),
    'adds',     (SELECT jsonb_agg(row_to_json(a)) FROM adds a),
    'recentes', (SELECT jsonb_agg(row_to_json(r)) FROM recentes r)
  ) INTO v_result;

  RETURN v_result;
END;
$$;



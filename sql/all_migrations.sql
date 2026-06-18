-- 001_tenants.sql
-- Tabela raiz do multi-tenant. Toda tabela de negÃ³cio referencia esta.

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

-- Ãndice para lookup por domÃ­nio (usado no frontend para identificar o tenant)
CREATE INDEX IF NOT EXISTS idx_tenants_dominio ON tenants (dominio);


-- 002_usuarios.sql
-- Perfil pÃºblico dos usuÃ¡rios autenticados via Supabase Auth.
-- O id Ã© o mesmo do auth.users â€” nunca gerar novo uuid aqui.

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


-- 003_categorias.sql
-- Grupos de veÃ­culos com preÃ§o base por diÃ¡ria.

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


-- 004_protecoes_adicionais.sql

CREATE TABLE IF NOT EXISTS protecoes (
    id               uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        uuid           NOT NULL REFERENCES tenants(id),
    nome             text           NOT NULL,
    descricao        text,
    preco            numeric(10,2)  NOT NULL,
    tipo_preco       text           NOT NULL CHECK (tipo_preco IN ('per_day', 'fixed')),
    franquia         text,          -- texto livre ex: "atÃ© 20% do valor FIPE"
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


-- 005_sazonalidade.sql
-- PerÃ­odos com preÃ§o diferenciado por categoria.
-- O campo precos Ã© um jsonb: {"slug_da_categoria": preco_diaria}
-- Ex: {"grupo_b": 210.00, "grupo_c": 230.00}
-- Categorias ausentes do jsonb usam o preco_diaria padrÃ£o da tabela categorias.

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

-- Ãndice composto para a query de "qual perÃ­odo cobre esta data de retirada?"
CREATE INDEX IF NOT EXISTS idx_sazonalidade_tenant_periodo
    ON sazonalidade (tenant_id, data_inicio, data_fim);


-- 006_solicitacoes.sql
-- CoraÃ§Ã£o do sistema. Cada reserva nasce aqui como 'solicitada'.

CREATE TABLE IF NOT EXISTS solicitacoes (
    id                   uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id            uuid           NOT NULL REFERENCES tenants(id),
    usuario_id           uuid           REFERENCES usuarios(id),  -- null se anÃ´nimo
    categoria_id         uuid           NOT NULL REFERENCES categorias(id),
    protecao_id          uuid           REFERENCES protecoes(id),

    -- Snapshot do cliente no momento da solicitaÃ§Ã£o
    cliente_nome         text           NOT NULL,
    cliente_email        text           NOT NULL,
    cliente_whatsapp     text           NOT NULL,
    cliente_cpf          text,

    -- PerÃ­odo
    data_retirada        timestamptz    NOT NULL,
    data_devolucao       timestamptz    NOT NULL,
    local_retirada       text           NOT NULL,
    local_devolucao      text           NOT NULL,

    -- Voo (preenchido quando local Ã© aeroporto)
    numero_voo           text,
    horario_pouso        text,

    pessoas              integer        NOT NULL DEFAULT 1,
    valor_estimado       numeric(10,2)  NOT NULL,
    observacoes          text,
    motivo_cancelamento  text,          -- obrigatÃ³rio ao cancelar

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
-- Itens da solicitaÃ§Ã£o (adicionais escolhidos pelo cliente)
-- PreÃ§os sÃ£o congelados no momento da solicitaÃ§Ã£o.

CREATE TABLE IF NOT EXISTS solicitacao_itens (
    id              uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
    solicitacao_id  uuid           NOT NULL REFERENCES solicitacoes(id) ON DELETE CASCADE,
    adicional_id    uuid           NOT NULL REFERENCES adicionais(id),
    quantidade      integer        NOT NULL DEFAULT 1 CHECK (quantidade > 0),
    preco_unitario  numeric(10,2)  NOT NULL,  -- snapshot do preÃ§o
    tipo_preco      text           NOT NULL   -- snapshot do tipo
                                   CHECK (tipo_preco IN ('per_day', 'fixed'))
);

CREATE INDEX IF NOT EXISTS idx_solicitacao_itens_solicitacao ON solicitacao_itens (solicitacao_id);


-- 007_documentos_condutores_translados.sql

-- ---------------------------------------------------------------------------
-- Documentos do cliente (CNH, passaporte, RG)
-- Arquivos armazenados no Supabase Storage (bucket privado).
-- URLs sÃ£o signed URLs com expiraÃ§Ã£o de 1h â€” nunca armazenar URL pÃºblica.

CREATE TABLE IF NOT EXISTS documentos (
    id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id    uuid        NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    tenant_id     uuid        NOT NULL REFERENCES tenants(id),
    tipo          text        NOT NULL CHECK (tipo IN ('cnh', 'passaporte', 'rg')),
    numero        text,
    validade      date,
    categoria_cnh text        CHECK (categoria_cnh IN ('A', 'B', 'AB', 'C', 'D', 'E')),
    arquivo_url   text,       -- path no Storage, nÃ£o URL pÃºblica
    verificado    boolean     NOT NULL DEFAULT false,
    criado_em     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_documentos_usuario   ON documentos (usuario_id);
CREATE INDEX IF NOT EXISTS idx_documentos_tenant    ON documentos (tenant_id);

-- ---------------------------------------------------------------------------
-- Condutores adicionais prÃ©-cadastrados pelo cliente

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
-- Translados solicitados pelo cliente apÃ³s reserva confirmada
-- PrÃ©-requisito: solicitacoes.status = 'confirmada' (validado na Edge Function)

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


-- 008_triggers.sql
-- Triggers automÃ¡ticos para auditoria e integridade.

-- ---------------------------------------------------------------------------
-- FunÃ§Ã£o genÃ©rica para atualizar atualizado_em em qualquer tabela

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
-- FunÃ§Ã£o para atualizar status_alterado_em apenas quando status muda

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
-- Trigger: solicitacoes â€” atualiza timestamps

CREATE OR REPLACE TRIGGER trg_solicitacoes_atualizado_em
    BEFORE UPDATE ON solicitacoes
    FOR EACH ROW
    EXECUTE FUNCTION fn_set_status_alterado_em();

-- ---------------------------------------------------------------------------
-- FunÃ§Ã£o que cria o perfil do usuÃ¡rio automaticamente ao fazer signup
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

    -- SÃ³ insere se tiver tenant_id nos metadados (signup via plataforma)
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

-- Trigger no schema auth (requer permissÃ£o de superuser â€” rodar como postgres no Supabase SQL Editor)
CREATE OR REPLACE TRIGGER trg_auth_criar_usuario
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION fn_criar_usuario_no_signup();

-- ---------------------------------------------------------------------------
-- FunÃ§Ã£o para validar transiÃ§Ãµes de status (mÃ¡quina de estados)

CREATE OR REPLACE FUNCTION fn_validar_transicao_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Estados finais sÃ£o imutÃ¡veis
    IF OLD.status IN ('concluida', 'cancelada') THEN
        RAISE EXCEPTION 'SolicitaÃ§Ã£o no estado "%" nÃ£o pode ser alterada.', OLD.status;
    END IF;

    -- TransiÃ§Ãµes permitidas
    IF NOT (
        (OLD.status = 'solicitada'  AND NEW.status IN ('em_analise', 'cancelada'))  OR
        (OLD.status = 'em_analise'  AND NEW.status IN ('confirmada', 'cancelada'))  OR
        (OLD.status = 'confirmada'  AND NEW.status IN ('concluida',  'cancelada'))  OR
        (OLD.status = NEW.status)   -- sem mudanÃ§a: sempre permitido
    ) THEN
        RAISE EXCEPTION 'TransiÃ§Ã£o de status invÃ¡lida: "%" â†’ "%".', OLD.status, NEW.status;
    END IF;

    -- Cancelamento exige motivo
    IF NEW.status = 'cancelada' AND (NEW.motivo_cancelamento IS NULL OR trim(NEW.motivo_cancelamento) = '') THEN
        RAISE EXCEPTION 'Campo motivo_cancelamento Ã© obrigatÃ³rio ao cancelar.';
    END IF;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_solicitacoes_validar_status
    BEFORE UPDATE OF status ON solicitacoes
    FOR EACH ROW
    EXECUTE FUNCTION fn_validar_transicao_status();

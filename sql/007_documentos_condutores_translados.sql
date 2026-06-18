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

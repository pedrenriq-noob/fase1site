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

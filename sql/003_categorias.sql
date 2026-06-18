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

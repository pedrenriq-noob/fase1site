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

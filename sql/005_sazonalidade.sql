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

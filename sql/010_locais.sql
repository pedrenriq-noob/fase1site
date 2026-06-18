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

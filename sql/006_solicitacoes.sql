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

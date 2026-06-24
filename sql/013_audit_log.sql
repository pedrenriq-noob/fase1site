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

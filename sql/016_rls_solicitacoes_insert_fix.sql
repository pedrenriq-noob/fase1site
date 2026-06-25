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

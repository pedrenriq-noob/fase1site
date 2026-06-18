-- 009_rls_policies.sql
-- Row Level Security para todas as tabelas de negócio.
-- Premissa: todo request autenticado tem auth.uid() disponível.
-- Premissa: admins e operadores têm role salva na tabela usuarios.

-- ---------------------------------------------------------------------------
-- Funções auxiliares

-- Retorna o tenant_id do usuário logado
CREATE OR REPLACE FUNCTION fn_meu_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT tenant_id FROM public.usuarios WHERE id = auth.uid();
$$;

-- Retorna true se o usuário logado é admin ou operador no tenant
CREATE OR REPLACE FUNCTION fn_sou_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE id = auth.uid()
          AND role IN ('admin', 'operador')
    );
$$;

-- ---------------------------------------------------------------------------
-- TENANTS — somente leitura para membros do tenant

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant: membro pode ler seu tenant"
    ON tenants FOR SELECT
    USING (id = fn_meu_tenant_id());

-- ---------------------------------------------------------------------------
-- USUARIOS

ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

-- Cliente lê apenas seu próprio perfil
CREATE POLICY "usuarios: cliente lê o próprio perfil"
    ON usuarios FOR SELECT
    USING (id = auth.uid());

-- Admin/operador lê todos do seu tenant
CREATE POLICY "usuarios: admin lê todos do tenant"
    ON usuarios FOR SELECT
    USING (fn_sou_admin() AND tenant_id = fn_meu_tenant_id());

-- Qualquer usuário atualiza seu próprio perfil
CREATE POLICY "usuarios: atualiza o próprio perfil"
    ON usuarios FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- Inserção feita apenas via trigger de signup (fn_criar_usuario_no_signup)
-- ou por admin (para criar operadores)
CREATE POLICY "usuarios: admin insere membros do tenant"
    ON usuarios FOR INSERT
    WITH CHECK (fn_sou_admin() AND tenant_id = fn_meu_tenant_id());

-- ---------------------------------------------------------------------------
-- CATEGORIAS — leitura pública (site de captação), escrita só admin

ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categorias: leitura pública"
    ON categorias FOR SELECT
    USING (ativo = true);

CREATE POLICY "categorias: admin escreve"
    ON categorias FOR ALL
    USING (fn_sou_admin() AND tenant_id = fn_meu_tenant_id())
    WITH CHECK (fn_sou_admin() AND tenant_id = fn_meu_tenant_id());

-- ---------------------------------------------------------------------------
-- PROTECOES — leitura pública, escrita só admin

ALTER TABLE protecoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "protecoes: leitura pública"
    ON protecoes FOR SELECT
    USING (ativo = true);

CREATE POLICY "protecoes: admin escreve"
    ON protecoes FOR ALL
    USING (fn_sou_admin() AND tenant_id = fn_meu_tenant_id())
    WITH CHECK (fn_sou_admin() AND tenant_id = fn_meu_tenant_id());

-- ---------------------------------------------------------------------------
-- ADICIONAIS — leitura pública, escrita só admin

ALTER TABLE adicionais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "adicionais: leitura pública"
    ON adicionais FOR SELECT
    USING (ativo = true);

CREATE POLICY "adicionais: admin escreve"
    ON adicionais FOR ALL
    USING (fn_sou_admin() AND tenant_id = fn_meu_tenant_id())
    WITH CHECK (fn_sou_admin() AND tenant_id = fn_meu_tenant_id());

-- ---------------------------------------------------------------------------
-- SAZONALIDADE — leitura pública, escrita só admin

ALTER TABLE sazonalidade ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sazonalidade: leitura pública"
    ON sazonalidade FOR SELECT
    USING (ativo = true);

CREATE POLICY "sazonalidade: admin escreve"
    ON sazonalidade FOR ALL
    USING (fn_sou_admin() AND tenant_id = fn_meu_tenant_id())
    WITH CHECK (fn_sou_admin() AND tenant_id = fn_meu_tenant_id());

-- ---------------------------------------------------------------------------
-- SOLICITACOES

ALTER TABLE solicitacoes ENABLE ROW LEVEL SECURITY;

-- Cliente vê apenas suas próprias reservas
CREATE POLICY "solicitacoes: cliente lê as próprias"
    ON solicitacoes FOR SELECT
    USING (usuario_id = auth.uid());

-- Admin/operador lê todas do tenant
CREATE POLICY "solicitacoes: admin lê todas do tenant"
    ON solicitacoes FOR SELECT
    USING (fn_sou_admin() AND tenant_id = fn_meu_tenant_id());

-- Qualquer pessoa (anônima ou logada) pode criar solicitação
-- tenant_id e categoria_id são validados na Edge Function
CREATE POLICY "solicitacoes: inserção pública"
    ON solicitacoes FOR INSERT
    WITH CHECK (true);

-- Admin/operador atualiza (troca de status, etc)
CREATE POLICY "solicitacoes: admin atualiza"
    ON solicitacoes FOR UPDATE
    USING (fn_sou_admin() AND tenant_id = fn_meu_tenant_id())
    WITH CHECK (fn_sou_admin() AND tenant_id = fn_meu_tenant_id());

-- ---------------------------------------------------------------------------
-- SOLICITACAO_ITENS

ALTER TABLE solicitacao_itens ENABLE ROW LEVEL SECURITY;

-- Cliente lê itens das suas próprias solicitações
CREATE POLICY "solicitacao_itens: cliente lê os próprios"
    ON solicitacao_itens FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM solicitacoes s
            WHERE s.id = solicitacao_itens.solicitacao_id
              AND s.usuario_id = auth.uid()
        )
    );

-- Admin lê todos do tenant
CREATE POLICY "solicitacao_itens: admin lê todos do tenant"
    ON solicitacao_itens FOR SELECT
    USING (
        fn_sou_admin() AND EXISTS (
            SELECT 1 FROM solicitacoes s
            WHERE s.id = solicitacao_itens.solicitacao_id
              AND s.tenant_id = fn_meu_tenant_id()
        )
    );

-- Inserção pública (junto com a solicitação, via Edge Function)
CREATE POLICY "solicitacao_itens: inserção pública"
    ON solicitacao_itens FOR INSERT
    WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- DOCUMENTOS

ALTER TABLE documentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "documentos: cliente lê os próprios"
    ON documentos FOR SELECT
    USING (usuario_id = auth.uid());

CREATE POLICY "documentos: admin lê todos do tenant"
    ON documentos FOR SELECT
    USING (fn_sou_admin() AND tenant_id = fn_meu_tenant_id());

CREATE POLICY "documentos: cliente insere e atualiza os próprios"
    ON documentos FOR ALL
    USING (usuario_id = auth.uid())
    WITH CHECK (usuario_id = auth.uid());

-- Admin marca como verificado
CREATE POLICY "documentos: admin atualiza verificado"
    ON documentos FOR UPDATE
    USING (fn_sou_admin() AND tenant_id = fn_meu_tenant_id())
    WITH CHECK (fn_sou_admin() AND tenant_id = fn_meu_tenant_id());

-- ---------------------------------------------------------------------------
-- CONDUTORES_ADICIONAIS

ALTER TABLE condutores_adicionais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "condutores: cliente lê os próprios"
    ON condutores_adicionais FOR SELECT
    USING (usuario_id = auth.uid());

CREATE POLICY "condutores: admin lê todos do tenant"
    ON condutores_adicionais FOR SELECT
    USING (fn_sou_admin() AND tenant_id = fn_meu_tenant_id());

CREATE POLICY "condutores: cliente gerencia os próprios"
    ON condutores_adicionais FOR ALL
    USING (usuario_id = auth.uid())
    WITH CHECK (usuario_id = auth.uid());

-- ---------------------------------------------------------------------------
-- TRANSLADOS

ALTER TABLE translados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "translados: cliente lê os próprios"
    ON translados FOR SELECT
    USING (usuario_id = auth.uid());

CREATE POLICY "translados: admin lê todos do tenant"
    ON translados FOR SELECT
    USING (fn_sou_admin() AND tenant_id = fn_meu_tenant_id());

-- Cliente cria translado (pré-requisito validado na Edge Function)
CREATE POLICY "translados: cliente cria"
    ON translados FOR INSERT
    WITH CHECK (usuario_id = auth.uid());

-- Admin confirma ou cancela translado
CREATE POLICY "translados: admin atualiza"
    ON translados FOR UPDATE
    USING (fn_sou_admin() AND tenant_id = fn_meu_tenant_id())
    WITH CHECK (fn_sou_admin() AND tenant_id = fn_meu_tenant_id());

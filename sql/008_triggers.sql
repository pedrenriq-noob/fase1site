-- 008_triggers.sql
-- Triggers automáticos para auditoria e integridade.

-- ---------------------------------------------------------------------------
-- Função genérica para atualizar atualizado_em em qualquer tabela

CREATE OR REPLACE FUNCTION fn_set_atualizado_em()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.atualizado_em = now();
    RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- Função para atualizar status_alterado_em apenas quando status muda

CREATE OR REPLACE FUNCTION fn_set_status_alterado_em()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
        NEW.status_alterado_em = now();
        NEW.atualizado_em      = now();
    END IF;
    RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- Trigger: solicitacoes — atualiza timestamps

CREATE OR REPLACE TRIGGER trg_solicitacoes_atualizado_em
    BEFORE UPDATE ON solicitacoes
    FOR EACH ROW
    EXECUTE FUNCTION fn_set_status_alterado_em();

-- ---------------------------------------------------------------------------
-- Função que cria o perfil do usuário automaticamente ao fazer signup
-- Disparada pelo Supabase Auth via trigger no schema auth.

CREATE OR REPLACE FUNCTION fn_criar_usuario_no_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tenant_id uuid;
BEGIN
    -- Tenta pegar o tenant_id dos metadados do signup
    -- O frontend deve passar: { data: { tenant_id: '...', nome: '...' } }
    v_tenant_id := (NEW.raw_user_meta_data->>'tenant_id')::uuid;

    -- Só insere se tiver tenant_id nos metadados (signup via plataforma)
    IF v_tenant_id IS NOT NULL THEN
        INSERT INTO public.usuarios (id, tenant_id, nome, email, role)
        VALUES (
            NEW.id,
            v_tenant_id,
            COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
            NEW.email,
            COALESCE(NEW.raw_user_meta_data->>'role', 'cliente')
        )
        ON CONFLICT (id) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$;

-- Trigger no schema auth (requer permissão de superuser — rodar como postgres no Supabase SQL Editor)
CREATE OR REPLACE TRIGGER trg_auth_criar_usuario
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION fn_criar_usuario_no_signup();

-- ---------------------------------------------------------------------------
-- Função para validar transições de status (máquina de estados)

CREATE OR REPLACE FUNCTION fn_validar_transicao_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Estados finais são imutáveis
    IF OLD.status IN ('concluida', 'cancelada') THEN
        RAISE EXCEPTION 'Solicitação no estado "%" não pode ser alterada.', OLD.status;
    END IF;

    -- Transições permitidas
    IF NOT (
        (OLD.status = 'solicitada'  AND NEW.status IN ('em_analise', 'confirmada', 'cancelada'))  OR
        (OLD.status = 'em_analise'  AND NEW.status IN ('confirmada', 'cancelada'))  OR
        (OLD.status = 'confirmada'  AND NEW.status IN ('concluida',  'cancelada'))  OR
        (OLD.status = NEW.status)   -- sem mudança: sempre permitido
    ) THEN
        RAISE EXCEPTION 'Transição de status inválida: "%" → "%".', OLD.status, NEW.status;
    END IF;

    -- Cancelamento exige motivo
    IF NEW.status = 'cancelada' AND (NEW.motivo_cancelamento IS NULL OR trim(NEW.motivo_cancelamento) = '') THEN
        RAISE EXCEPTION 'Campo motivo_cancelamento é obrigatório ao cancelar.';
    END IF;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_solicitacoes_validar_status
    BEFORE UPDATE OF status ON solicitacoes
    FOR EACH ROW
    EXECUTE FUNCTION fn_validar_transicao_status();

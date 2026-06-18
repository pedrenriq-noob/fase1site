-- 002_usuarios.sql
-- Perfil público dos usuários autenticados via Supabase Auth.
-- O id é o mesmo do auth.users — nunca gerar novo uuid aqui.

CREATE TABLE IF NOT EXISTS usuarios (
    id               uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id        uuid        NOT NULL REFERENCES tenants(id),
    nome             text        NOT NULL,
    email            text        NOT NULL UNIQUE,
    whatsapp         text,
    cpf              text,
    data_nascimento  date,
    role             text        NOT NULL DEFAULT 'cliente'
                                 CHECK (role IN ('cliente', 'admin', 'operador')),
    criado_em        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_usuarios_tenant ON usuarios (tenant_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_email  ON usuarios (email);

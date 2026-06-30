-- 020_rate_limit_persistente.sql
-- O rate limit de criar-solicitacao era um Map em memória por isolate da
-- Edge Function — cada cold start zera a contagem e isolates concorrentes
-- não compartilham estado, então o limite era trivialmente contornável.
-- Substituído por uma tabela compartilhada, verificada atomicamente.

CREATE TABLE IF NOT EXISTS rate_limits (
  chave      text PRIMARY KEY,
  contagem   integer     NOT NULL DEFAULT 1,
  reset_em   timestamptz NOT NULL
);

ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
-- Sem políticas públicas: só acessível via service_role (Edge Functions),
-- que sempre bypassa RLS. Nenhum cliente deve ler/escrever esta tabela direto.

-- Verifica e incrementa atomicamente o contador de um IP/chave dentro da
-- janela de tempo. Retorna true se a requisição é permitida.
CREATE OR REPLACE FUNCTION fn_checar_rate_limit(
  p_chave           text,
  p_limite          integer,
  p_janela_segundos integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_permitido boolean;
BEGIN
  INSERT INTO rate_limits (chave, contagem, reset_em)
  VALUES (p_chave, 1, now() + (p_janela_segundos || ' seconds')::interval)
  ON CONFLICT (chave) DO UPDATE SET
    contagem = CASE
      WHEN rate_limits.reset_em <= now() THEN 1
      ELSE rate_limits.contagem + 1
    END,
    reset_em = CASE
      WHEN rate_limits.reset_em <= now() THEN now() + (p_janela_segundos || ' seconds')::interval
      ELSE rate_limits.reset_em
    END
  RETURNING (contagem <= p_limite) INTO v_permitido;

  RETURN v_permitido;
END;
$$;

-- Limpeza de chaves expiradas (chamar periodicamente, ou apenas deixar a
-- tabela crescer moderadamente — uma linha por IP ativo é leve).
CREATE OR REPLACE FUNCTION fn_limpar_rate_limits()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  DELETE FROM rate_limits WHERE reset_em < now() - interval '1 hour';
$$;

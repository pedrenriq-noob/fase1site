-- 033_bloquear_auto_promocao_admin.sql
-- Corrige duas vulnerabilidades de escalonamento de privilégio encontradas
-- em revisão de segurança (RLS) em 2026-07-14 — ver docs/DECISION_LOG.md.
--
-- 1) A policy de UPDATE em public.usuarios só validava id = auth.uid(),
--    sem restringir quais colunas podiam mudar — qualquer usuário
--    autenticado (mesmo "cliente") conseguia se autopromover a admin
--    com um UPDATE direto via API REST.
--
-- 2) O trigger de criação de usuário no signup (fn_criar_usuario_no_signup,
--    SECURITY DEFINER, bypassa RLS) confiava cegamente no `role` vindo dos
--    metadados informados pelo próprio usuário no cadastro. Combinado com
--    o tenant_id da Igufoz ser público (hardcoded em
--    apps/site/supabase.js), qualquer pessoa podia se cadastrar já como
--    admin do tenant via a API pública de signup do Supabase Auth.

-- 1) Trigger que impede alteração de role/tenant_id fora do fluxo admin.
create or replace function public.fn_impedir_auto_promocao_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not fn_sou_admin()
     and (new.role is distinct from old.role or new.tenant_id is distinct from old.tenant_id) then
    raise exception 'Não é permitido alterar role/tenant_id do próprio usuário.' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_impedir_auto_promocao_usuario on public.usuarios;
create trigger trg_impedir_auto_promocao_usuario
  before update on public.usuarios
  for each row
  execute function public.fn_impedir_auto_promocao_usuario();

-- 2) Signup sempre cria o usuário como 'cliente', ignorando qualquer role
--    informado pelo próprio cadastro. Promoção só via policy
--    "usuarios: admin insere membros do tenant" (feita por um admin já
--    existente) ou manualmente.
create or replace function public.fn_criar_usuario_no_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare v_tenant_id uuid;
begin
    v_tenant_id := (new.raw_user_meta_data->>'tenant_id')::uuid;
    if v_tenant_id is not null then
        insert into public.usuarios (id, tenant_id, nome, email, role)
        values (
            new.id, v_tenant_id,
            coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
            new.email,
            'cliente'
        ) on conflict (id) do nothing;
    end if;
    return new;
end; $function$;

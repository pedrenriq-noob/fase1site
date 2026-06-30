# Problema: e-mail de login/recuperação do admin não existe de fato

## Sintoma

- O painel admin usa um e-mail fixo (algo como `admin@igufoz.com.br` / equivalente na outra plataforma) para login e para "recuperar senha".
- Esse e-mail **não é um endereço real que eu controlo** — não chega nenhum e-mail de recuperação porque essa caixa não existe.
- Em algum momento esse e-mail acabou sendo tratado como "o admin oficial" do sistema (referenciado em configs, testes, etc.), mas isso foi um equívoco — nunca houve uma caixa de e-mail real correspondente.
- O e-mail real que eu uso e que deve ser o admin é **`pedrenriq@gmail.com`**.
- Isso provavelmente afeta outra plataforma também (i-frotas), que usa o mesmo padrão de e-mail "fantasma" como admin.

## Causa raiz

O sistema tem duas camadas de identidade que precisam estar sincronizadas:

1. **`auth.users`** (Supabase Auth) — onde a senha de fato existe e o login é autenticado.
2. **Tabela de autorização da aplicação** (ex: `public.usuarios`) — onde fica o `tenant_id` e o `role` (`admin`, `operador`, etc.) que o RLS usa para liberar acesso aos dados.

O e-mail "fantasma" (`admin@...`) estava registrado em uma ou ambas as camadas como sendo o admin do tenant, mas:
- Ninguém tem acesso real à caixa de e-mail desse domínio.
- Login com esse e-mail não pode ser recuperado (recovery não tem como chegar a lugar nenhum).
- Qualquer tentativa de "esqueci minha senha" é um beco sem saída.

## Solução

Substituir o e-mail fantasma pelo e-mail real (`pedrenriq@gmail.com`) nas duas camadas:

```sql
-- 1. Conferir o e-mail fantasma atual e o id associado
SELECT id, email FROM auth.users WHERE email = 'admin@igufoz.com.br'; -- trocar pelo e-mail fantasma da outra plataforma

-- 2. Ver se já existe um usuário pedrenriq@gmail.com em auth.users
SELECT id, email FROM auth.users WHERE email = 'pedrenriq@gmail.com';
```

### Caminho A — se `pedrenriq@gmail.com` ainda não existe em `auth.users`

1. Criar o usuário via **Supabase Dashboard → Authentication → Users → Add User**, com e-mail `pedrenriq@gmail.com`, senha temporária, "Auto Confirm User" marcado.
2. Migrar (ou inserir) a linha de autorização da aplicação apontando para o novo `id`:

```sql
-- pegar o tenant_id e role que o e-mail fantasma tinha
SELECT id, tenant_id, role FROM public.usuarios WHERE email = 'admin@igufoz.com.br';

-- inserir o novo usuário com os mesmos tenant_id/role
INSERT INTO public.usuarios (id, tenant_id, nome, email, role, ativo)
VALUES (
  '<id-do-pedrenriq-no-auth.users>',
  '<tenant_id-do-admin-fantasma>',
  'Pedro Henrique',
  'pedrenriq@gmail.com',
  '<role-do-admin-fantasma>', -- normalmente 'admin'
  true
);
```

3. (Opcional, recomendado) Remover/desativar o e-mail fantasma para não deixar acesso órfão:

```sql
UPDATE public.usuarios SET ativo = false WHERE email = 'admin@igufoz.com.br';
-- ou, se não houver nenhuma dependência (auditoria, fk, etc.):
DELETE FROM auth.users WHERE email = 'admin@igufoz.com.br';
```

### Caminho B — se `pedrenriq@gmail.com` já existe em `auth.users` mas sem autorização

Só falta o passo 2 do Caminho A (inserir/atualizar a linha em `public.usuarios` com o `tenant_id`/`role` corretos).

## Verificação final

```sql
SELECT u.id, u.tenant_id, u.role, u.ativo, au.email
FROM public.usuarios u
JOIN auth.users au ON au.id = u.id
WHERE au.email = 'pedrenriq@gmail.com';
```

Deve retornar uma linha com `role = 'admin'` (ou equivalente), `ativo = true`, e o `tenant_id` correto. Depois disso, login e recuperação de senha com `pedrenriq@gmail.com` funcionam normalmente, pois é um e-mail real.

## Lição para não repetir

Nunca usar um e-mail "placeholder"/fantasma (tipo `admin@dominio.com.br`) como conta administrativa real em produção — login e recuperação de senha dependem de a caixa existir de fato. O admin de cada tenant deve sempre ser um e-mail real de alguém com acesso a ele.

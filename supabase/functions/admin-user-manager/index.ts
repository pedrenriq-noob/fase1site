import { createClient } from 'jsr:@supabase/supabase-js@2';

// Alinhado ao CHECK constraint de usuarios.role (cliente/admin/operador).
// 'balcao' foi removido daqui: não existe no CHECK do banco, então criar um
// usuário com essa role fazia o auth.users ser criado mas o INSERT em
// usuarios falhar silenciosamente (erro não verificado) — usuário "fantasma"
// sem perfil de aplicação. Corrigido junto com a checagem de erro abaixo.
const ALLOWED_ROLES = ['admin', 'operador'];
const TENANT_ID = 'a1b2c3d4-0000-0000-0000-000000000001';

Deno.serve(async (req: Request) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // Verify caller is admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Unauthorized' }, 401, corsHeaders);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Verify caller role using their JWT
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    const { data: { user }, error: userErr } = await callerClient.auth.getUser();
    if (userErr || !user) return json({ error: 'Unauthorized' }, 401, corsHeaders);

    const { data: profile } = await callerClient
      .from('usuarios')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') return json({ error: 'Forbidden — admin only' }, 403, corsHeaders);

    // Use service role client for admin operations
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const body = await req.json();
    const { action } = body;

    // CREATE USER
    if (action === 'create') {
      const { email, password, nome, role } = body;
      if (!email || !password || !nome || !role) return json({ error: 'email, password, nome e role são obrigatórios' }, 400, corsHeaders);
      if (!ALLOWED_ROLES.includes(role)) return json({ error: 'role inválida' }, 400, corsHeaders);

      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true
      });
      if (createErr) return json({ error: createErr.message }, 400, corsHeaders);

      const { error: insertErr } = await admin.from('usuarios').insert({
        id: created.user.id,
        tenant_id: TENANT_ID,
        nome,
        email,
        role
      });

      if (insertErr) {
        // Rollback: sem o perfil em `usuarios` o usuário não consegue logar
        // em nenhum app — não deixar um usuário "fantasma" órfão no Auth.
        await admin.auth.admin.deleteUser(created.user.id);
        return json({ error: `Falha ao criar perfil: ${insertErr.message}` }, 400, corsHeaders);
      }

      return json({ success: true, user: { id: created.user.id, email, nome, role } }, 200, corsHeaders);
    }

    // UPDATE ROLE
    if (action === 'update_role') {
      const { userId, role } = body;
      if (!userId || !role) return json({ error: 'userId e role são obrigatórios' }, 400, corsHeaders);
      if (!ALLOWED_ROLES.includes(role)) return json({ error: 'role inválida' }, 400, corsHeaders);

      const { error: updateErr } = await admin.from('usuarios').update({ role }).eq('id', userId).eq('tenant_id', TENANT_ID);
      if (updateErr) return json({ error: updateErr.message }, 400, corsHeaders);
      return json({ success: true }, 200, corsHeaders);
    }

    // TOGGLE ATIVO
    if (action === 'toggle_ativo') {
      const { userId, ativo } = body;
      if (!userId || ativo === undefined) return json({ error: 'userId e ativo são obrigatórios' }, 400, corsHeaders);

      if (!ativo) {
        await admin.auth.admin.updateUserById(userId, { ban_duration: '876600h' });
      } else {
        await admin.auth.admin.updateUserById(userId, { ban_duration: 'none' });
      }
      await admin.from('usuarios').update({ ativo }).eq('id', userId).eq('tenant_id', TENANT_ID);
      return json({ success: true }, 200, corsHeaders);
    }

    // RESET PASSWORD
    if (action === 'reset_password') {
      const { userId, password } = body;
      if (!userId || !password) return json({ error: 'userId e password são obrigatórios' }, 400, corsHeaders);
      if (password.length < 8) return json({ error: 'Senha deve ter ao menos 8 caracteres' }, 400, corsHeaders);

      const { error: resetErr } = await admin.auth.admin.updateUserById(userId, { password });
      if (resetErr) return json({ error: resetErr.message }, 400, corsHeaders);
      return json({ success: true }, 200, corsHeaders);
    }

    return json({ error: 'action inválida' }, 400, corsHeaders);

  } catch (err) {
    return json({ error: String(err) }, 500, corsHeaders);
  }
});

function json(data: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' }
  });
}

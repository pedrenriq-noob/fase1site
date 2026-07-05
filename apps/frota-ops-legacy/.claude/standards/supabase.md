# Padrão: Supabase

> Referência: CLAUDE.md § Regras para Supabase (RS-01 a RS-07)

---

## Objetivo

Definir padrões para uso correto e seguro do Supabase, incluindo inicialização do cliente, Row Level Security, Edge Functions e Realtime.

---

## Inicialização do Cliente

### Arquivo de Configuração Central

```javascript
// src/lib/supabase/client.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY são obrigatórias'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: localStorage, // ou sessionStorage para maior segurança
  },
  global: {
    headers: {
      'X-App-Version': import.meta.env.VITE_APP_VERSION ?? '0.0.0',
    },
  },
  db: {
    schema: 'public',
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
```

### Regras de Inicialização

- **Um único cliente** por aplicação — use singleton
- **Nunca** use a service role key no frontend
- **Sempre** valide que as variáveis de ambiente existem
- **Nunca** exponha a service role key em código cliente

---

## Row Level Security (RLS)

### Template de Políticas Básicas

```sql
-- Habilitar RLS em todas as tabelas
ALTER TABLE tabela ENABLE ROW LEVEL SECURITY;

-- Forçar RLS mesmo para roles com bypass (segurança extra)
ALTER TABLE tabela FORCE ROW LEVEL SECURITY;

-- Política: usuário vê apenas seus próprios registros
CREATE POLICY "usuario_ve_proprios_registros"
  ON tabela
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Política: usuário cria apenas para si mesmo
CREATE POLICY "usuario_cria_proprios_registros"
  ON tabela
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Política: usuário edita apenas seus próprios registros
CREATE POLICY "usuario_edita_proprios_registros"
  ON tabela
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Política: usuário deleta apenas seus próprios registros
CREATE POLICY "usuario_deleta_proprios_registros"
  ON tabela
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
```

### Políticas por Role

```sql
-- Criar role customizado
CREATE ROLE app_admin;

-- Política para admins — acesso total
CREATE POLICY "admin_acesso_total"
  ON tabela
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Usando função auxiliar para verificar role (recomendado para reutilização)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  );
$$;

-- Política simplificada usando a função
CREATE POLICY "admin_acesso_total"
  ON tabela
  FOR ALL
  TO authenticated
  USING (is_admin());
```

### Padrão para Dados Compartilhados

```sql
-- Tabela com acesso baseado em organização/empresa
CREATE POLICY "membro_ve_dados_da_org"
  ON documentos
  FOR SELECT
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid()
      AND status = 'active'
    )
  );
```

### Verificação de RLS

```sql
-- Verificar se RLS está ativo em todas as tabelas
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled,
  forcerowsecurity as rls_forced
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Listar todas as políticas
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

---

## Edge Functions

### Estrutura de uma Edge Function

```typescript
// supabase/functions/nome-da-funcao/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Tipos
interface RequestBody {
  userId: string;
  action: string;
}

interface ResponseData {
  success: boolean;
  data?: unknown;
  error?: {
    code: string;
    message: string;
  };
}

// Handler principal
serve(async (req: Request): Promise<Response> => {
  // 1. CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // 2. Handle preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // 3. Validar método
  if (req.method !== 'POST') {
    return errorResponse('METHOD_NOT_ALLOWED', 'Método não permitido', 405, corsHeaders);
  }

  try {
    // 4. Autenticar usuário
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return errorResponse('UNAUTHORIZED', 'Token de autenticação necessário', 401, corsHeaders);
    }

    // 5. Criar cliente Supabase com contexto do usuário
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // 6. Verificar usuário autenticado
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return errorResponse('UNAUTHORIZED', 'Usuário não autenticado', 401, corsHeaders);
    }

    // 7. Parse e validar body
    let body: RequestBody;
    try {
      body = await req.json();
    } catch {
      return errorResponse('BAD_REQUEST', 'Body inválido', 400, corsHeaders);
    }

    if (!body.userId || !body.action) {
      return errorResponse('VALIDATION_ERROR', 'userId e action são obrigatórios', 400, corsHeaders);
    }

    // 8. Lógica de negócio
    const result = await processAction(supabaseClient, user.id, body);

    // 9. Resposta de sucesso
    return new Response(
      JSON.stringify({ success: true, data: result }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro interno:', error);
    return errorResponse('INTERNAL_ERROR', 'Erro interno do servidor', 500, corsHeaders);
  }
});

// Helper para respostas de erro padronizadas
function errorResponse(
  code: string,
  message: string,
  status: number,
  headers: Record<string, string>
): Response {
  const body: ResponseData = {
    success: false,
    error: { code, message }
  };
  return new Response(
    JSON.stringify(body),
    { status, headers: { ...headers, 'Content-Type': 'application/json' } }
  );
}
```

### Regras para Edge Functions

- **Stateless**: nenhum estado em memória entre requisições
- **Timeout**: Edge Functions têm limite de 60s — respeite este limite
- **Secrets**: use `Deno.env.get()` para acessar segredos (não hardcode)
- **CORS**: configure CORS adequadamente, não use `*` em produção
- **Validação**: valide todos os inputs antes de processar
- **Erros**: use estrutura de erro padronizada

---

## Realtime

### Configuração Controlada

```javascript
// Habilite Realtime apenas onde necessário
const channel = supabase
  .channel('chat-messages') // Nome único e descritivo
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `room_id=eq.${roomId}` // SEMPRE filtre — nunca ouça tudo
    },
    (payload) => {
      handleNewMessage(payload.new);
    }
  )
  .subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      console.log('Realtime conectado');
    }
    if (status === 'CHANNEL_ERROR') {
      handleRealtimeError();
    }
  });

// SEMPRE remova subscriptions quando não precisar mais
function cleanup() {
  supabase.removeChannel(channel);
}

// Em componentes de UI
window.addEventListener('beforeunload', cleanup);
```

---

## Autenticação

### Fluxo de Auth Completo

```javascript
// src/features/auth/auth.js

/** @returns {Promise<{user: User|null, error: AppError|null}>} */
export async function signInWithEmail(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    if (error.message === 'Invalid login credentials') {
      return { user: null, error: new AuthError('E-mail ou senha incorretos') };
    }
    return { user: null, error: new AppError(error.message) };
  }

  return { user: data.user, error: null };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw new AppError('Erro ao sair', { cause: error });
}

// Observer para mudanças de estado de auth
export function onAuthStateChange(callback) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (event, session) => {
      callback(event, session?.user ?? null);
    }
  );
  return () => subscription.unsubscribe(); // Retorna cleanup function
}
```

### Proteção de Rotas

```javascript
// src/lib/router/protected-route.js
export async function requireAuth() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    window.location.href = '/login';
    return null;
  }
  return user;
}
```

---

## Storage

```javascript
// src/lib/supabase/storage.js

/**
 * Faz upload de um arquivo para o Storage do Supabase.
 *
 * @param {string} bucket - Nome do bucket
 * @param {string} path - Caminho no bucket (ex: 'avatars/user-123.jpg')
 * @param {File} file - Arquivo a ser enviado
 * @returns {Promise<string>} URL pública do arquivo
 */
export async function uploadFile(bucket, path, file) {
  // Validar tipo de arquivo
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    throw new ValidationError('Tipo de arquivo não permitido');
  }

  // Validar tamanho (5MB máximo)
  const MAX_SIZE = 5 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    throw new ValidationError('Arquivo muito grande. Máximo: 5MB');
  }

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { upsert: true });

  if (error) throw new StorageError(error.message);

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
```

---

## Anti-Padrões Supabase

### Service Role Key no Frontend
```javascript
// NUNCA FAZER
const supabase = createClient(url, SERVICE_ROLE_KEY); // bypass de RLS!

// CORRETO
const supabase = createClient(url, ANON_KEY); // RLS aplicado
```

### Sem Tratamento de Erro
```javascript
// ERRADO
const { data } = await supabase.from('users').select('*');
renderUsers(data); // data pode ser null se houver erro

// CORRETO
const { data, error } = await supabase.from('users').select('*');
if (error) throw new DatabaseError(error.message);
if (!data) return [];
renderUsers(data);
```

### SELECT * sem Limite
```javascript
// ERRADO: busca tudo sem limite
const { data } = await supabase.from('logs').select('*');

// CORRETO: sempre com limit e campos específicos
const { data } = await supabase
  .from('logs')
  .select('id, created_at, message, level')
  .order('created_at', { ascending: false })
  .limit(50);
```

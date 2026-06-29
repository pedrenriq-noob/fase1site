import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://lxfnqzuzohudqwibgdic.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4Zm5xenV6b2h1ZHF3aWJnZGljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2NDEzODMsImV4cCI6MjA5NzIxNzM4M30.Ez3JO3OkennfNwT4aPaLeWmqo-fJjlZlmkJcYQ7KndM';

export const TENANT_ID = 'a1b2c3d4-0000-0000-0000-000000000001';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  }
});

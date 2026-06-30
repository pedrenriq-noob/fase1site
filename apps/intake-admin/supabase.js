// supabase.js — configuração central do cliente Supabase
// Importado por todos os módulos do admin

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL  = 'https://lxfnqzuzohudqwibgdic.supabase.co'
const SUPABASE_ANON = 'sb_publishable_lZYtlQFkZCgUE-ppawmXHA_CPo0tPUF'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON)

// ID fixo do tenant Igufoz (inserido no seed.sql)
export const TENANT_ID = 'a1b2c3d4-0000-0000-0000-000000000001'

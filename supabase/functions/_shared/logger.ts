// Logger estruturado para edge functions (RO-05) — mesmo espírito do logger
// de apps/frota-ops/js/utils.js, adaptado para o runtime Deno. Prefixa cada
// linha com o nome da function para facilitar filtragem nos logs do Supabase.
export function criarLogger(nomeFunction: string) {
  return {
    warn:  (...a: unknown[]) => console.warn(`[${nomeFunction}]`, ...a),
    error: (...a: unknown[]) => console.error(`[${nomeFunction}]`, ...a),
    info:  (...a: unknown[]) => console.log(`[${nomeFunction}]`, ...a),
  }
}

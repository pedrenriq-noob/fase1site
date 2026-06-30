# Parte 7 — APIs (Edge Functions)

Todas hospedadas em `https://lxfnqzuzohudqwibgdic.supabase.co/functions/v1/<nome>`. Não há REST API customizada além disso — o resto do acesso a dados é via PostgREST nativo do Supabase (`/rest/v1/<tabela>`), protegido por RLS, descrito na Parte 4.

## 7.1 `check-disponibilidade`

- **Arquivo**: `supabase/functions/check-disponibilidade/index.ts`
- **Método**: POST (+ OPTIONS para CORS)
- **Autenticação**: `verify_jwt: false` — pública, protegida só pela `apikey` (anon key) no header
- **Quem consome**: `apps/site`, `extensions/disponibilidade`, internamente por `criar-solicitacao`

**Payload de entrada**:
```json
{
  "tenant_id": "uuid",
  "categoria_slug": "grupo_j",
  "data_saida": "2026-07-01T10:00:00",
  "data_retorno_prev": "2026-07-03T10:00:00"
}
```

**Resposta de sucesso (200)**:
```json
{ "disponivel": 1, "total": 1, "reservas_periodo": 0, "fonte": "frota" }
```
ou, se a categoria não tem frota cadastrada:
```json
{ "disponivel": null, "total": 0, "reservas_periodo": 0, "fonte": "sem_dados" }
```

**Resposta de erro (formato padronizado desde a correção desta sessão)**:
```json
{ "error": { "code": "invalid_tenant_id", "message": "tenant_id inválido", "details": null } }
```

**Códigos de erro possíveis**: `missing_fields` (400), `invalid_tenant_id` (400), `invalid_period` (400), `server_misconfigured` (500), `internal_error` (500).

## 7.2 `criar-solicitacao`

- **Arquivo**: `supabase/functions/criar-solicitacao/index.ts`
- **Método**: POST
- **Autenticação**: `verify_jwt: false` — pública (cliente não logado pode criar solicitação)
- **Quem consome**: exclusivamente `apps/site`
- **Proteções**: rate limit persistente (10 req/60s por IP, via `fn_checar_rate_limit`), CORS configurável via `ALLOWED_ORIGINS` (se não setado, libera `*`)

**Payload de entrada** (campos obrigatórios marcados com *):
```json
{
  "tenant_id": "uuid*", "categoria_id": "uuid*",
  "cliente_nome": "string*", "cliente_email": "string*", "cliente_whatsapp": "string*",
  "cliente_cpf": "string", "cliente_doc": "string", "estrangeiro": false,
  "protecao_id": "uuid|null",
  "data_retirada": "ISO8601*", "data_devolucao": "ISO8601*",
  "local_retirada": "string*", "local_devolucao": "string*",
  "pessoas": 1, "numero_voo": "string", "horario_pouso": "string", "companhia_aerea": "string",
  "observacoes": "string",
  "itens": [{ "adicional_id": "uuid", "quantidade": 1 }]
}
```

**Resposta de sucesso (200)**:
```json
{ "ok": true, "id": "uuid", "numero": 7, "valor_estimado": 540.00 }
```

**Códigos de erro possíveis**: `rate_limited` (429), `missing_field` (400), `invalid_tenant_id`/`invalid_categoria_id` (400), `invalid_email`/`invalid_whatsapp`/`invalid_cpf` (400), `invalid_pessoas` (400), `invalid_dates`/`invalid_period` (400), `invalid_tenant` (400 — tenant inativo), `invalid_categoria`/`invalid_protecao` (400 — inativos), `sem_disponibilidade` (409), `server_misconfigured`/`internal_error` (500).

**Fluxo interno**: valida formato → valida tenant ativo → valida categoria/proteção pertencem ao tenant e estão ativas → consulta `checkDisponibilidade` (não bloqueia se a checagem falhar por erro técnico, só bloqueia se `fonte==='frota' && disponivel===0`) → calcula preço (sazonalidade + proteção + adicionais) → chama RPC `inserir_solicitacao_completa`.

## 7.3 `notificar-reserva`

- **Arquivo**: `supabase/functions/notificar-reserva/index.ts`
- **Método**: POST
- **Autenticação**: `verify_jwt: false`
- **Quem consome**: presumidamente um trigger de banco via `pg_net` (função `notificar_reserva_trigger()` existe no banco, mas **não foi confirmado que está de fato anexada a um trigger ativo** — ver Parte 4, seção 8.3)
- **Estado atual: STUB.** Não envia e-mail nenhum (integração Resend removida nesta sessão por decisão do dono do produto). Sempre retorna sucesso sem efeito colateral:
```json
{ "ok": true, "aviso": "Notificação por e-mail pendente — provedor não configurado" }
```
- **Pendência explícita**: quando o dono do produto escolher novo provedor de e-mail, reimplementar o envio aqui (ver Parte 10/11, Roadmap).

## 7.4 `admin-user-manager`

- **Arquivo**: não está em `supabase/functions/` no repositório local — **existe e está deployada no Supabase mas não foi versionada no repositório Git** (achado de auditoria, ver Parte 10). Conteúdo recuperado diretamente do banco nesta sessão.
- **Método**: POST
- **Autenticação**: `verify_jwt: true` — exige JWT válido, e **adicionalmente** verifica que o `role` do usuário chamador é `'admin'` (consultando `usuarios` com o próprio JWT do chamador antes de usar a `service_role`)
- **Quem consome**: `apps/intake-admin` (presumido — tela de gestão de usuários, não localizada/auditada nesta sessão dentro do código de `apps/intake-admin`, mas é a única consumidora plausível)
- **Ações suportadas** (campo `action` no body):

| Ação | Payload adicional | O que faz |
|---|---|---|
| `create` | `email, password, nome, role` | Cria usuário no Supabase Auth (`email_confirm: true`) + insere linha em `usuarios` |
| `update_role` | `userId, role` | Atualiza `usuarios.role` |
| `toggle_ativo` | `userId, ativo` | Bane (`ban_duration: '876600h'` ≈ 100 anos, truque para "desativar" sem deletar) ou desbane (`'none'`) o usuário no Auth, e sincroniza `usuarios.ativo` |
| `reset_password` | `userId, password` (mín. 8 caracteres) | Reseta senha via Admin API |

**🔴 Bug real encontrado nesta auditoria (não corrigido — fora do escopo desta sessão)**: na ação `create`, o `INSERT` em `usuarios` não verifica o retorno de erro:
```ts
await admin.from('usuarios').insert({ id: created.user.id, tenant_id: TENANT_ID, nome, email, role })
// erro não checado — função sempre retorna { success: true } mesmo se o insert falhar
```
`ALLOWED_ROLES` inclui `'balcao'`, mas a constraint `usuarios_role_check` no banco só permite `('cliente','admin','operador')`. Se alguém chamar `create` com `role: 'balcao'`, o usuário é criado no Auth, a função retorna sucesso, mas o `INSERT` em `usuarios` **falha silenciosamente** (viola CHECK) — resultado: usuário "fantasma" que existe em `auth.users` mas não tem perfil de aplicação, não consegue logar de fato em nenhum app (todos dependem de `usuarios` para resolver tenant/role). Mesmo padrão de bug que já causou o problema de "admin fantasma" corrigido nesta sessão (Parte 10) — recomenda-se correção prioritária.

**Outro achado**: `TENANT_ID` hardcoded aqui é a **quarta** ocorrência independente do mesmo literal no código (as outras três são `apps/site/supabase.js`, `apps/intake-admin/supabase.js`, `apps/frota-ops/js/supabase.js`) — ver Parte 10.

## 7.5 Tabela-resumo

| Function | verify_jwt | Pública? | Rate limit | Formato de erro | Versão atual (ao fim desta sessão) |
|---|---|---|---|---|---|
| `check-disponibilidade` | false | sim | não | estruturado (corrigido) | v4 |
| `criar-solicitacao` | false | sim | sim (persistente) | estruturado (corrigido) | v10 |
| `notificar-reserva` | false | sim (chamada só por trigger) | não | estruturado (corrigido) | v10 |
| `admin-user-manager` | **true** | não (exige JWT + role admin) | não | `{error: string}` simples (não padronizado, não tocado nesta sessão) | v1 |

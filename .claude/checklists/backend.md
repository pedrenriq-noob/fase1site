# Checklist: Backend (Edge Functions)

> Referência: standards/supabase.md, CLAUDE.md § RB-*

---

## Estrutura da Edge Function

- [ ] Arquivo em `supabase/functions/nome-da-funcao/index.ts`
- [ ] Exporta `serve()` como handler principal
- [ ] Função é stateless (sem estado em memória entre requisições)

## Autenticação e Autorização

- [ ] JWT verificado no início da função (`supabase.auth.getUser()`)
- [ ] Retorna 401 imediatamente se não autenticado
- [ ] Usa cliente Supabase com contexto do usuário (não service role no handler)
- [ ] Verificações de autorização explícitas (não depende apenas do RLS para lógica de negócio)

## Validação de Inputs

- [ ] Body JSON validado (type checking, não apenas presença)
- [ ] Campos obrigatórios verificados
- [ ] Tipos de dados validados (número é número, string não é vazia, etc.)
- [ ] Limites de tamanho/volume verificados (listas, strings)
- [ ] Valores enum validados contra lista permitida
- [ ] Retorna 400 com mensagem específica para cada validação falha

## Tratamento de Erros

- [ ] Todos os erros têm estrutura: `{ success: false, error: { code, message } }`
- [ ] Erros de DB não expõem detalhes internos ao cliente
- [ ] `try/catch` cobre todo o processamento
- [ ] Erros logados com contexto suficiente para debug
- [ ] Códigos de status HTTP corretos (400, 401, 403, 404, 500)

## CORS

- [ ] Headers CORS configurados
- [ ] `Access-Control-Allow-Origin` não é `*` em produção
- [ ] Preflight OPTIONS respondido corretamente
- [ ] Methods permitidos especificados

## Segurança

- [ ] Nenhum secret hardcoded (`Deno.env.get()` para tudo)
- [ ] Nenhuma query SQL construída por concatenação de strings
- [ ] Uploads (se houver) validam tipo e tamanho de arquivo
- [ ] Rate limiting considerado para endpoints públicos

## Performance

- [ ] Queries desnecessárias eliminadas
- [ ] `Promise.all` para operações independentes paralelas
- [ ] Timeout considerado para chamadas externas
- [ ] Resposta dentro do limite de 60s da Edge Function

## Documentação

- [ ] README no diretório da função
- [ ] Documentação da API em `docs/api/`
- [ ] Variáveis de ambiente documentadas em `.env.example`

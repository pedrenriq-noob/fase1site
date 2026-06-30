# Parte 12 — Guia para Novo Desenvolvedor e Autoavaliação Crítica

## 26. Guia para um Novo Desenvolvedor

### 26.1 Ordem de leitura recomendada

1. Este handoff completo, partes 1 a 11, nessa ordem.
2. `.claude/CLAUDE.md` — entender a governança formal pretendida (mesmo sabendo, pela Parte 10/12, que ela não é 100% seguida na prática — ainda assim é o padrão a perseguir).
3. Os 5 ADRs em `docs/adr/` na íntegra (este handoff resume, mas os originais têm nuances).
4. O código-fonte de `supabase/functions/_shared/disponibilidade.ts` — é o coração de todo o sistema (cálculo de disponibilidade é usado por 3+ módulos diferentes).
5. O schema do banco direto no Supabase Studio (não confiar 100% nos arquivos `sql/`, ver Parte 4.6/10 — há divergência real).

### 26.2 Módulos a compreender primeiro

Em ordem de prioridade:
1. **Banco de dados** (Parte 4) — é a fonte de verdade de tudo, e onde estão concentradas as regras mais críticas (triggers, RLS).
2. **`_shared/disponibilidade.ts`** — algoritmo mais reutilizado e mais sensível a bug do sistema.
3. **`criar-solicitacao`** — ponto de entrada de todo o funil de captação, mais validações de negócio concentradas.
4. **`apps/frota-ops`** — maior superfície de código (2.300+ linhas), onde a operação física da frota acontece.

### 26.3 Regras que nunca devem ser quebradas

- **Nunca remover RLS de uma tabela de negócio.** Toda tabela nova precisa de RLS habilitado desde o `CREATE TABLE`.
- **Nunca colocar a `SUPABASE_SERVICE_ROLE_KEY` em código de frontend ou extensão.** Só Edge Functions a usam, via variável de ambiente.
- **Nunca editar uma migration já aplicada** (`sql/NNN_*.sql` já mergeada) — sempre criar uma nova migration numerada sequencialmente (RM-01 do CLAUDE.md, seguido consistentemente nesta sessão: correções viraram `019`, `020`, `021`, nunca edição retroativa de `001`-`018`).
- **Nunca alterar `SLUG_MAP` sem conferir o texto real cadastrado em `frota_veiculos.categoria`** — é a causa raiz do bug mais caro já corrigido neste projeto (GRUPO J) e do bug latente ainda não corrigido (J-PREMIUM/U-UTILITARIO, Parte 10).
- **Nunca confiar em preço calculado no cliente (JS do navegador)** — sempre recalcular no servidor antes de gravar qualquer `valor_estimado`.
- **Nunca aplicar uma migration em produção sem ler o que ela realmente faz** — mesmo migrations pequenas (`CREATE OR REPLACE FUNCTION`) podem mudar comportamento de produção instantaneamente, sem janela de rollback automática.

### 26.4 Como executar o projeto localmente

```bash
# Site
serve-site.cmd          # roda npx serve em apps/site, porta 3002 (configurável em .claude/launch.json)

# Admin
serve-admin.cmd         # roda npx serve em apps/intake-admin, porta 3001

# Frota Ops (sem .cmd dedicado — usar diretamente)
npx serve apps/frota-ops -p 3003
```

Extensões: carregar via `chrome://extensions` → "Carregar sem compactação" → apontar para a pasta da extensão (`extensions/cotacao-rapida`, `extensions/disponibilidade` ou `extensions/acessorios`).

**Não há servidor de backend local** — todos os apps falam direto com o projeto Supabase de produção (`lxfnqzuzohudqwibgdic`) mesmo em desenvolvimento local. **Não existe ambiente de staging/homologação separado** — isso é um risco operacional real (qualquer teste local já mexe nos dados de produção).

### 26.5 Como publicar

- **Frontend**: push para `main` no GitHub → Vercel faz deploy automático (presumido — configuração do gatilho está no dashboard Vercel, não no repositório).
- **Edge Functions**: `supabase functions deploy <nome>` via Supabase CLI, ou via MCP `deploy_edge_function` (usado nesta sessão). **Atenção**: o conteúdo de `_shared/*.ts` precisa ser reenviado em cada deploy (ADR-004) — não é incluído automaticamente pelo MCP a menos que explicitamente passado no payload.
- **Migrations**: `supabase db push` via CLI, ou MCP `apply_migration` (usado nesta sessão). **Sempre criar um novo arquivo numerado em `sql/` correspondente**, mesmo aplicando via MCP, para manter o histórico do repositório sincronizado com o banco real (lição da Parte 10, item 1 — isso já não foi seguido para `frota_*`/`admin-user-manager` em sessões anteriores, não repita o erro).

### 26.6 Como testar

**Não há suíte de testes automatizados** (unitários, integração ou e2e) em nenhum módulo deste projeto — confirmado nesta auditoria, nenhum arquivo `*.test.js`, `*.spec.js`, nem framework de teste (Jest, Vitest, Playwright) configurado em `package.json`. RO-06 do CLAUDE.md ("nenhum deploy sem testes automáticos passarem") **não é seguido — não há o que rodar**.

Teste manual recomendado após qualquer mudança:
1. Rodar o app localmente (26.4).
2. Testar o fluxo afetado manualmente no navegador.
3. Para mudanças de Edge Function: testar via `curl` direto contra a função deployada (padrão usado nesta sessão — ver exemplos nas correções de segurança) antes de considerar concluído.
4. Para mudanças de RLS/RPC: testar com `execute_sql` simulando diferentes papéis/tenants quando possível (limitação: simular `auth.uid()` de um usuário real via SQL puro é difícil — o ideal é testar logado de fato pela UI).

### 26.7 Como debugar

- **Frontend**: DevTools do navegador, `console.error`/`console.warn` já presentes no código.
- **Edge Functions**: `supabase functions logs <nome>` ou MCP `get_logs` — todo `console.error`/`console.warn` das functions vai pros logs do Supabase.
- **Banco**: Supabase Studio → SQL Editor, ou MCP `execute_sql` para queries ad-hoc de diagnóstico (usado extensivamente nesta sessão de auditoria).
- **RLS**: se uma query "não retorna nada" inesperadamente, suspeitar de RLS antes de suspeitar de lógica de aplicação — testar a mesma query com a `service_role` key (que bypassa RLS) para confirmar se o dado existe mas está sendo filtrado, ou se realmente não existe.

---

## 27. Avaliação Técnica do Próprio Projeto

> Autoavaliação objetiva, conforme solicitado — sem otimismo artificial.

### 27.1 Maiores pontos fortes

1. **O algoritmo de disponibilidade por pool é genuinamente bem pensado** — reflete a realidade operacional (carro sujo, no lavador, em manutenção) em vez de uma contagem ingênua. O ADR-003 demonstra raciocínio de engenharia real, incluindo a identificação honesta de seus próprios limites (race condition documentada, ainda que não corrigida).
2. **RLS é levado a sério**: 19 tabelas de negócio, todas com RLS habilitado, policies usando funções auxiliares reutilizáveis (`fn_sou_admin`, `fn_meu_tenant_id`) em vez de lógica duplicada em cada policy. É um desenho de segurança de banco acima da média para um projeto deste porte.
3. **A correção de segurança feita nesta sessão (IDOR no `dashboard_dados`) foi bem direcionada** — o bug era real e explorável, a correção foi testada em produção antes de ser dada como concluída.
4. **Documentação de decisão (ADRs) existe e é honesta** — os 5 ADRs não escondem trade-offs negativos, inclusive documentam riscos conhecidos não resolvidos (a race condition do ADR-003 é o melhor exemplo: documentada há meses, ainda não corrigida, mas pelo menos visível).
5. **A reorganização de monorepo desta sessão preservou histórico Git real** via `git subtree`, em vez de simplesmente copiar arquivos e perder rastreabilidade.

### 27.2 Decisões arquiteturais acertadas

- **Vanilla JS sem framework** (ADR-001): para o tamanho e natureza deste projeto (3 apps simples + extensões de navegador que não podem carregar runtime de framework), foi uma escolha pragmaticamente correta, não só ideológica.
- **Supabase como BaaS único** (ADR-002): reduziu superfície operacional para uma equipe pequena — não há servidor para administrar, RLS resolve autorização sem middleware.
- **`_shared/` para código compartilhado entre Edge Functions** (ADR-004): evitou duplicação do algoritmo mais crítico do sistema, mesmo pagando o custo de redeploy coordenado.

### 27.3 Onde existem riscos reais (não hipotéticos)

1. **A divergência entre o schema documentado em `sql/` e o schema real do banco é o maior risco estrutural deste projeto.** Quatro tabelas inteiras (`frota_veiculos`, `frota_reservas`, `frota_patios`, `frota_movimentacoes`) e uma Edge Function inteira (`admin-user-manager`) existem em produção sem nenhum rastro versionado no Git. Isso significa que, se o banco de produção for perdido ou for preciso recriar o ambiente do zero, **uma parte significativa do sistema não é reconstruível só a partir do repositório**. Esse é o tipo de risco que normalmente só aparece quando já é tarde demais.
2. **O bug de categoria J-PREMIUM/U-UTILITARIO (Parte 8.3/10) é uma bomba-relógio conhecida e não corrigida** — ele vai se manifestar na próxima sincronização CSV que envolva essas categorias, exatamente como o bug do GRUPO J se manifestou antes de ser corrigido nesta sessão. É previsível e evitável, mas está documentado e não resolvido.
3. **A contradição entre a governança formal (`CLAUDE.md`, RB-04: "sem lógica de negócio em SQL") e a prática real (regras críticas de negócio vivendo em triggers `plpgsql`) sugere que o framework de governança foi escrito aspiracionalmente, não extraído da prática real do projeto.** Isso é um risco de credibilidade do próprio framework: se um novo desenvolvedor ler o CLAUDE.md e tentar segui-lo à risca, vai entrar em conflito direto com como o sistema já funciona.
4. **Ausência total de testes automatizados** é um risco que cresce proporcionalmente à idade e ao tamanho do código — hoje, com ~10 mil linhas de JS e ~20 migrations SQL, ainda é gerenciável manualmente; em mais 6 meses de crescimento, não vai ser.
5. **Sem ambiente de staging**, todo desenvolvimento e teste acontece contra o banco de produção real — isso já se provou arriscado nesta própria sessão (precisei tomar cuidado redobrado antes de cada `UPDATE`/`DELETE` em produção, com confirmação explícita do usuário).

### 27.4 O que precisa ser refeito

1. **Reconciliação banco↔repositório**: gerar migrations retroativas para as 4 tabelas `frota_*` e versionar `admin-user-manager`, antes de qualquer outra prioridade — sem isso, o "handoff técnico completo" pedido neste documento está, por definição, incompleto (eu mesmo só consegui documentar essas peças porque tive acesso direto ao banco de produção via MCP; um novo desenvolvedor só com o Git clonado não teria essa visibilidade).
2. **As policies de RLS de leitura pública** (categorias, proteções, adicionais, sazonalidade, locais) precisam de filtro de tenant antes que um segundo tenant real seja onboardado — hoje funcionam "por sorte" porque só existe um tenant.
3. **A camada de validação de negócio na borda** (`criar-solicitacao`) tem lacunas reais (janela de horário do local, limite de cadeirinhas) que deveriam ser fechadas antes que um cliente real explore essas brechas (seja maliciosamente ou por erro de boa-fé).

### 27.5 O que está excelente

- O algoritmo de pool de disponibilidade e seu tratamento de estados físicos do veículo (limpo/lavador/manutenção) — é a parte mais sofisticada e bem testada do sistema (validado em produção nesta sessão para o caso GRUPO J).
- A estrutura de RLS com funções auxiliares reutilizáveis.
- O cuidado com formato de erro estruturado e mensagens de validação claras na Edge Function `criar-solicitacao` (mesmo antes das correções desta sessão, já era a função com validação mais completa do sistema).

### 27.6 O que ainda precisa amadurecer

- **Disciplina de versionamento de schema** — o problema não é a qualidade do schema em si (que é razoável), é a falta de rastreabilidade de como ele chegou ao estado atual.
- **Coerência entre governança documentada e prática real** — ou o `CLAUDE.md` precisa ser revisado para refletir o que o projeto realmente faz (lógica em triggers SQL é aceitável e até elegante em muitos casos), ou o projeto precisa migrar gradualmente para a governança que escolheu adotar. Hoje vive uma contradição não resolvida.
- **Cultura de teste** — mesmo testes manuais documentados como checklist (o que o próprio `.claude/checklists/qa.md` sugere que deveria existir) ajudariam mais do que a ausência total atual.
- **Separação de ambientes** (dev/staging/produção) — atualmente o projeto inteiro roda contra um único banco de produção, o que é uma prática de risco crescente conforme a equipe e o volume de mudanças aumentam.

### 27.7 Veredito final

Este é um sistema **funcionalmente sólido e tecnicamente acima da média para seu porte**, construído por alguém (ou um processo, neste caso assistido por IA) que entende os problemas de negócio reais que está resolvendo — o algoritmo de disponibilidade é prova disso. Mas é um sistema com **dívida de rastreabilidade séria** (schema não totalmente versionado) e **lacunas de segurança/validação reais** que só não causaram incidente ainda porque o volume de uso e o número de tenants são pequenos. Ele vai precisar de um ciclo de "arrumação de casa" (reconciliação de schema, fechamento das lacunas de RLS/validação, decisão sobre testes automatizados) **antes** de qualquer expansão significativa de escala (mais tenants, mais volume, mais desenvolvedores na equipe) — não depois.

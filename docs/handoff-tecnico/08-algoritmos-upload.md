# Parte 8 — Upload de Planilhas e Algoritmos

## 13. Upload de Planilhas (Sincronização com Sistema Legado)

**Implementado em**: `apps/frota-ops/pages/admin.js`, aba "Importação" (`renderImportacao`).

### 13.1 Formato esperado

Dois arquivos CSV exportados manualmente do sistema oficial externo da locadora:
1. **Contratos Abertos** (locações já em andamento, com veículo atribuído)
2. **Reservas Futuras** (locações ainda sem veículo atribuído)

Encoding: **`windows-1252`** (não UTF-8 — `readFile()` usa `reader.readAsText(file, 'windows-1252')`, escolha deliberada porque o sistema legado exporta nesse encoding, comum em sistemas Windows/Excel brasileiros antigos).

Colunas esperadas no CSV (nomes de cabeçalho usados como chave do objeto parseado): `locacao-numero`, `locacao-id`, `cliente`, `condutor`, `locacao-grupo`/`veiculo-grupo`, `veiculo-placa`, `locacao-inicio`, `locacao-previsao`, `locacao-pontovenda`, `locacao-obs`, `locacao-frequencia`.

### 13.2 Parsing (`parseCSV`)

Parser CSV escrito à mão (sem biblioteca):
- Separador: vírgula.
- Suporta campos entre aspas duplas contendo vírgulas.
- Suporta campos multilinha (quebra de linha dentro de aspas) — detecta aspas ímpares na linha e concatena com a próxima até fechar.
- Remove BOM (`﻿`) do primeiro header.
- Descarta linhas sem `locacao-numero` preenchido.
- **Validação de schema**: nenhuma. Se o CSV exportado mudar de formato (coluna renomeada/removida), o parser não falha explicitamente — os campos esperados simplesmente vêm `undefined`/vazios e a linha é processada mesmo assim (silenciosamente incompleta). Não há mensagem de erro de "formato inesperado".

### 13.3 Transformação (`rowToReserva`)

| Campo CSV | Transformação | Campo destino (`frota_reservas`) |
|---|---|---|
| `locacao-numero` | direto | `locacao_numero` |
| `locacao-id` | `parseInt` | `locacao_id_ext` |
| `locacao-grupo`/`veiculo-grupo` | `normalizeCategoria()` (ver abaixo) | `categoria` |
| `veiculo-placa` | se vazio, `null` | `placa_atribuida` |
| `locacao-inicio`/`locacao-previsao` | `parseBRDate()`: regex `DD/MM/AAAA HH:MM` → ISO com timezone `-03:00` fixo | `data_saida`/`data_retorno_prev` |
| (derivado) | `placa_atribuida ? 'CONFIRMADO' : 'PREVISTO'` | `status` |

**🔴 Achado crítico de auditoria — bug latente não corrigido**: a função `normalizeCategoria()` (linha 165-171) normaliza para:
```js
.replace(/^J\s*-\s*PREMIUM$/i, 'J-PREMIUM')      // SEM espaços ao redor do hífen
.replace(/^U\s*-\s*UTILITARIO$/i, 'U-UTILITARIO') // SEM espaços ao redor do hífen
```
Mas o `SLUG_MAP` em `supabase/functions/_shared/disponibilidade.ts` (corrigido **nesta mesma sessão**, ver Parte 5.6 e Parte 10) mapeia para:
```js
grupo_j_premium: 'J - PREMIUM',   // COM espaços
grupo_u:         'U - UTILITARIO', // COM espaços
```
Essas duas strings **nunca vão bater** numa comparação `.eq('categoria', categoria)`. Ou seja: a próxima vez que o CSV de import trouxer um veículo/reserva de categoria J-PREMIUM ou U-UTILITARIO, ele será gravado em `frota_reservas.categoria` como `'J-PREMIUM'` (sem espaço), e `checkDisponibilidade()` vai procurar por `'J - PREMIUM'` (com espaço) — a reserva **não será contabilizada na disponibilidade**, reproduzindo exatamente o mesmo bug do GRUPO J que foi corrigido nesta sessão (Parte 10), só que pela importação em vez de cadastro manual. **Isso precisa ser corrigido antes da próxima sincronização que envolva essas duas categorias** — recomendação: padronizar os dois lados para o mesmo formato (sugestão: sem espaços, `'J-PREMIUM'`/`'U-UTILITARIO'`, e ajustar o `SLUG_MAP` de volta).

### 13.4 Cálculo de diferenças (`showPreview`)

Compara o CSV importado com as `frota_reservas` já existentes no banco com `status IN ('CONFIRMADO','PREVISTO')`, usando `locacao_numero` como chave de correlação:
- **Novos**: `locacao_numero` no CSV mas não no banco.
- **Atualizados**: `locacao_numero` em ambos.
- **A encerrar**: `locacao_numero` no banco mas não no CSV (interpretado como "contrato que não existe mais no sistema oficial" → será marcado `CONCLUIDO`).

**Deduplicação**: se o mesmo `locacao_numero` aparecer duas vezes entre os dois CSVs (ou duas vezes no mesmo arquivo), só a última ocorrência é mantida (`Map` sobrescreve), evitando erro de `upsert` com chave duplicada no mesmo batch — esse era exatamente o bug corrigido no commit `84ba38f` ("dedupe por locacao_numero antes do upsert").

### 13.5 Tratamento de erros

- Erro ao buscar `frota_reservas` existentes: exibe alerta, interrompe.
- Erro durante o `upsert` (em qualquer chunk de 50): lança exceção, **mas chunks anteriores já commitados permanecem no banco** — não é uma transação atômica. Importação parcial é possível em caso de falha no meio do processo.
- Não há retry automático.

### 13.6 Atualização da disponibilidade (efeito colateral da sincronização)

`executarSync()` faz, em sequência:
1. Upsert de todas as reservas importadas (`onConflict: 'tenant_id,locacao_numero'`), em lotes de 50.
2. Para cada reserva "a encerrar": marca `frota_reservas.status = 'CONCLUIDO'`; se tinha placa atribuída e estava `CONFIRMADO`, libera o veículo (`frota_veiculos.status = 'DEVOLVIDO', limpo = false, prev_retorno = null`).
3. Para cada reserva confirmada com placa: atualiza `frota_veiculos.status = 'LOCADO'` — **mas só se o veículo estiver atualmente em** `DISPONIVEL`, `LOCADO`, `DEVOLVIDO` ou `NO_LAVADOR` (a query tem `.in('status', [...])` que **exclui `MANUTENCAO`** deliberadamente, para não sobrescrever um veículo em manutenção com `LOCADO` por engano).

Como a disponibilidade é sempre calculada on-the-fly (Parte 5.1) a partir de `frota_veiculos`+`frota_reservas`, o efeito da sincronização aparece imediatamente na próxima consulta de disponibilidade, sem necessidade de "recalcular" nada à parte.

---

## 14. Algoritmos (detalhamento passo a passo)

### 14.1 Disponibilidade — pseudocódigo completo

```
FUNÇÃO checkDisponibilidade(tenant, categoriaSlug, dataSaida, dataRetorno):
  categoria = SLUG_MAP[categoriaSlug]
  SE categoria não existe: ERRO "Categoria inválida"

  veiculos = SELECT * FROM frota_veiculos WHERE tenant=tenant AND categoria=categoria
  reservas = SELECT * FROM frota_reservas
             WHERE tenant=tenant AND categoria=categoria
               AND status IN ('PREVISTO','CONFIRMADO')

  SE veiculos.length == 0:
    RETORNA { disponivel: null, total: 0, fonte: 'sem_dados' }

  reservasNoPeriodo = FILTRAR reservas ONDE
      reserva.data_saida < dataRetorno E reserva.data_retorno_prev > dataSaida

  placasReservadas = CONJUNTO de placa_atribuida das reservasNoPeriodo (ignorando nulas)
  reservasSemPlaca = CONTAR reservasNoPeriodo SEM placa_atribuida

  pool = []
  PARA CADA veiculo EM veiculos:
    SE veiculo.placa ESTÁ EM placasReservadas: PULAR
    SE veiculo.status == 'LOCADO':
      SE NÃO TEM prev_retorno OU prev_retorno > dataSaida: PULAR (ainda não voltou)
      SE calcularDisponivel(prev_retorno) > dataSaida: PULAR (ainda no buffer pós-devolução)
      ADICIONAR ao pool
      CONTINUAR
    SE veiculo.status == 'DEVOLVIDO' E NÃO limpo: PULAR
    SE veiculo.status == 'NO_LAVADOR':
      SE calcularSaidaLavador(hora_entrada_lavador) > dataSaida: PULAR (ainda lavando)
      ADICIONAR ao pool
      CONTINUAR
    SE veiculo.status == 'MANUTENCAO': PULAR
    ADICIONAR ao pool (qualquer outro status, ex. DISPONIVEL)

  disponivel = MAX(0, pool.length - reservasSemPlaca)
  RETORNA { disponivel, total: veiculos.length, reservas_periodo: reservasNoPeriodo.length, fonte: 'frota' }
```

### 14.2 Cotação (extensão `cotacao-rapida`)

**Implementado em**: `extensions/cotacao-rapida/sidebar.js`.

```
PARA categoria escolhida:
  preco = categorias.preco_diaria (lido direto do Supabase, SEM checar sazonalidade)
PARA proteção escolhida (opcional):
  precoProtecao = protecao.tipo_preco=='per_day' ? protecao.preco*dias : protecao.preco
PARA cada adicional escolhido:
  subtotal = adicional.tipo_preco=='per_day' ? adicional.preco*qty*dias : adicional.preco*qty
total = preco*dias + precoProtecao + soma(subtotais)
```

**Divergência importante**: a extensão **não aplica sazonalidade** (não consulta a tabela `sazonalidade`) — o preço mostrado na cotação rápida pode ficar desatualizado em períodos de alta temporada, diferente do preço que `criar-solicitacao` de fato cobraria. Isso é uma inconsistência funcional entre a "cotação informal" (extensão) e a "cotação formal" (site + edge function) — vale alinhar.

### 14.3 Categorias / Filtros / Prioridades

- **Filtro de exibição**: campo `ordem` (ascendente) em quase toda tabela de catálogo (Parte 5.16).
- **Filtro de "ativo"**: toda leitura pública filtra `ativo = true` (categorias, proteções, adicionais, sazonalidade, locais) — tanto na RLS quanto, redundantemente, em algumas queries client-side.
- **Prioridade de preço sazonal sobre preço base**: `criar-solicitacao` sempre prefere o preço de `sazonalidade.precos[slug]` quando uma sazonalidade ativa cobre a data de retirada — não há lógica de "maior prioridade vence" entre múltiplas sazonalidades sobrepostas (a query usa `.limit(1)` sem `ORDER BY` explícito definido — **se duas sazonalidades se sobrepuserem na mesma data, qual prevalece é indeterminado**, dependente da ordem física dos dados no banco). Risco latente não documentado em nenhum outro lugar do projeto.

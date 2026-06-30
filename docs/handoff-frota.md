# Handoff Técnico — Módulo de Gestão de Frota (I-Frotas)
**Data:** 28/06/2026  
**Status:** Planejado — pronto para iniciar implementação  
**Contexto:** Módulo novo, separado da extensão de acessórios (cadeirinhas). Produto independente.

---

## 1. Visão Geral

Sistema de gestão operacional da frota da Igufoz em tempo real. Permite que a equipe de pátio atualize localização e status dos veículos pelo celular, enquanto o balcão consulta disponibilidade real para fechar reservas sem overbooking.

**Forma:** PWA (Progressive Web App) — site instalável como app no celular, sem loja de aplicativos.  
**Hospedagem:** Vercel (mesma conta do projeto principal).  
**Banco:** Supabase (mesmo projeto — `lxfnqzuzohudqwibgdic`).  
**Pasta no repositório:** `frota/` (nova, não misturar com `cadeirinhas-extension/`).

---

## 2. Stack

| Camada | Tecnologia |
|---|---|
| Frontend | HTML + CSS + JavaScript Vanilla (mesmo padrão do projeto) |
| Banco | Supabase (PostgreSQL) — **não usar Google Sheets para frota** |
| Real-time | Supabase Realtime (subscriptions em tempo real) |
| Auth | Supabase Auth (mesmo do painel admin existente) |
| Hospedagem | Vercel |
| Instalação mobile | PWA via `manifest.json` + service worker básico |

**Por que Supabase e não Sheets:** múltiplos usuários atualizando ao mesmo tempo causaria conflito de dados no Sheets. Supabase tem controle de concorrência, real-time nativo e é mais rápido para consultas filtradas.

---

## 3. Identidade Visual

Seguir exatamente a paleta da extensão Igufoz (`extension/sidebar.html`):

```css
--blue:      #0f2b4f;   /* header, cor primária */
--orange:    #FF6B00;   /* destaque, botões de ação */
--orange-lt: #fff3ea;   /* fundos de alerta leve */
--border:    #e2e8f0;
--muted:     #64748b;
--red:       #dc2626;
--green:     #16a34a;
--radius:    8px;
--text:      #1a2332;
--bg:        #f8fafc;
```

---

## 4. Regras de Negócio

### 4.1 Disponibilidade de veículo

Um veículo está disponível **somente se**:
1. Está marcado como **LIMPO**
2. Seu horário de disponibilidade (calculado abaixo) já passou
3. Não possui reserva CONFIRMADA sobrepondo o período consultado

### 4.2 Buffer de tempo pós-retorno

| Dia de retorno | Horário de retorno | Disponível a partir de |
|---|---|---|
| Seg a Sab | até 12:00 | mesmo dia às 16:00 |
| Seg a Sab | 12:01 até 14:00 | dia seguinte às 08:00 |
| Seg a Sab | após 14:00 | dia seguinte às 10:00 |
| Domingo | qualquer horário | segunda-feira às 12:00 |

> Estas regras são **estimativas conservadoras** para fins de cálculo de overbooking. A disponibilidade real pode ser antecipada manualmente pelo operador.

### 4.3 Regra do Lavador

- Veículo que entra no Lavador: disponível **3 horas após o horário de entrada** (e somente se marcado como LIMPO ao sair)
- O sistema exibe "disponível estimado às HH:MM" com base na entrada
- O operador confirma manualmente quando o veículo sai limpo

### 4.4 Status do veículo (ciclo de vida)

```
LOCADO → DEVOLVIDO (sujo) → NO_LAVADOR → DISPONIVEL (limpo)
                  ↓
            (pode ir direto para pátio sem lavar → permanece INDISPONIVEL até marcar LIMPO)
```

### 4.5 Consulta de overbooking

Para uma solicitação de categoria X no período [início, fim]:

```
disponível = total da categoria
           − veículos LOCADO com prev_retorno > início do período
           − reservas PREVISTO/CONFIRMADO que se sobrepõem ao período
           − veículos DEVOLVIDO/SUJO que não estarão limpos antes do início
```

Se `disponível ≥ 1` em **todo** o intervalo solicitado → tem vaga.

---

## 5. Estrutura de Dados (Supabase)

### Tabela `frota_veiculos`

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | uuid PK | |
| `tenant_id` | uuid FK | multi-tenant (referência `tenants`) |
| `placa` | text unique | placa do veículo |
| `categoria` | text | grupo do veículo (Hatch, SUV, Van…) |
| `modelo` | text | ex: Onix, HB20, Compass |
| `cor` | text | opcional |
| `status` | text | `DISPONIVEL` / `LOCADO` / `DEVOLVIDO` / `NO_LAVADOR` / `MANUTENCAO` |
| `limpo` | boolean | true = limpo, false = sujo |
| `patio_atual` | text | `Oklahoma` / `Brasil` / `Garagem` / `Lavador` |
| `hora_entrada_lavador` | timestamptz | quando entrou no Lavador (para calcular +3h) |
| `prev_retorno` | timestamptz | previsão de retorno do cliente atual |
| `ponto_retorno` | text | `Oklahoma` / `Brasil` / `Aeroporto` |
| `ponto_retirada` | text | `Oklahoma` / `Brasil` |
| `updated_at` | timestamptz | atualizado automaticamente via trigger |
| `updated_by` | uuid FK | usuário que fez a última atualização |

### Tabela `frota_reservas`

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | uuid PK | |
| `tenant_id` | uuid FK | |
| `categoria` | text | grupo solicitado |
| `placa_atribuida` | text | placa atribuída (null até confirmar saída) |
| `data_saida` | timestamptz | data/hora de saída com cliente |
| `data_retorno_prev` | timestamptz | data/hora prevista de retorno |
| `ponto_retirada` | text | `Oklahoma` / `Brasil` |
| `ponto_retorno` | text | `Oklahoma` / `Brasil` / `Aeroporto` |
| `status` | text | `PREVISTO` / `CONFIRMADO` / `CONCLUIDO` / `CANCELADO` |
| `obs` | text | observações livres |
| `created_at` | timestamptz | |
| `created_by` | uuid FK | |

### Tabela `frota_movimentacoes` (log histórico)

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | uuid PK | |
| `veiculo_id` | uuid FK | |
| `tipo` | text | `SAIDA` / `RETORNO` / `PATIO` / `LIMPEZA` / `LAVADOR_ENTRADA` / `LAVADOR_SAIDA` |
| `valor_antes` | jsonb | snapshot do estado anterior |
| `valor_depois` | jsonb | snapshot do estado novo |
| `created_at` | timestamptz | |
| `created_by` | uuid FK | |

---

## 6. Telas do PWA

### 6.1 Dashboard (balcão / gestão)
- Cards por categoria: `X disponíveis / Y locados / Z no lavador / W em manutenção`
- Lista de veículos com retorno previsto para hoje (ordenados por horário)
- Indicador de veículos sujos aguardando lavagem

### 6.2 Consultar Disponibilidade
- Inputs: Categoria + Data/Hora Início + Data/Hora Fim + Ponto de Retirada
- Resultado: "✅ X veículo(s) disponível(is)" ou "❌ Sem disponibilidade neste período"
- Detalhe: lista quais veículos estarão disponíveis e por qual motivo outros não estarão

### 6.3 Lista de Veículos
- Filtros: categoria, status, pátio, limpo/sujo
- Card por veículo com status visual e botões de ação rápida

### 6.4 Detalhe do Veículo (operacional — uso no celular)
Botões de atualização rápida:
- **Trocar pátio** → dropdown (Oklahoma / Brasil / Garagem / Lavador)
  - Se selecionar Lavador: registra hora de entrada automaticamente
- **Marcar limpo** → muda `limpo = true`, status para `DISPONIVEL`
- **Marcar sujo** → muda `limpo = false`
- **Registrar retorno** → informa data/hora real de retorno, aplica regra de buffer
- **Registrar saída** → vincula placa a uma reserva, muda status para `LOCADO`

### 6.5 Reservas
- Lista de reservas com filtro por status e data
- Nova reserva: categoria + período + pontos de retirada/retorno
- Confirmar saída (atribui placa)
- Confirmar retorno (inicia ciclo de limpeza)

### 6.6 Frota Completa (visão de pátio)
- Grid visual de todos os veículos agrupados por pátio
- Indicador limpo/sujo por cor (verde/vermelho)

---

## 7. Perfis de Usuário

| Perfil | Acesso |
|---|---|
| **Balcão** | Dashboard, consulta disponibilidade, reservas, visualizar veículos |
| **Operacional** | Detalhe do veículo (atualizar pátio, limpeza, movimentações) |
| **Gestor** | Tudo acima + relatórios + cadastro de veículos |

Usar Supabase Auth + RLS por `tenant_id`. Perfis podem ser implementados com um campo `role` na tabela de usuários já existente.

---

## 8. Locais

| Tipo | Opções |
|---|---|
| Pátios | Oklahoma · Brasil · Garagem · Lavador |
| Pontos de retorno | Oklahoma · Brasil · Aeroporto |
| Pontos de retirada | Oklahoma · Brasil |

---

## 9. Ordem de Implementação Sugerida

1. **Migrations Supabase** — criar tabelas `frota_veiculos`, `frota_reservas`, `frota_movimentacoes` + RLS + triggers de `updated_at` + log automático em `frota_movimentacoes`
2. **PWA base** — estrutura de pasta `frota/`, `manifest.json`, service worker mínimo, roteamento de telas
3. **Tela de Veículo (operacional)** — a mais crítica; alimenta o sistema em tempo real
4. **Dashboard + Consulta de disponibilidade** — o núcleo do valor para o balcão
5. **Tela de Reservas** — criação, saída e retorno
6. **Visão de pátio** — grid visual (pode ficar para o final)

---

## 10. Migrations

Usar numeração a partir de `018_` para não conflitar com as migrations existentes do projeto principal (`001_` a `017_`).

```
018_frota_veiculos.sql
019_frota_reservas.sql
020_frota_movimentacoes.sql
021_frota_rls.sql
022_frota_triggers.sql
```

---

## 11. Referências no Projeto

| Arquivo | Por quê consultar |
|---|---|
| `handoff.md` | Contexto geral da plataforma, estrutura do Supabase, decisões técnicas |
| `extension/sidebar.html` | Paleta de cores e estilo visual a replicar |
| `cadeirinhas-extension/popup.js` | Lógica de ciclo de vida PREVISTO→CONFIRMADO→DISPONIVEL (mesma lógica para frota) |
| `cadeirinhas-extension/popup.html` | Componentes visuais (cards, badges, scroll lists) a reutilizar |
| `sql/` | Migrations existentes — próxima é `018_` |
| `admin/pages/reservas.js` | Padrão de listagem e filtros a seguir |

---

## 12. Contexto de Negócio

- Locadora em Foz do Iguaçu
- ~10 categorias de veículos, múltiplas placas por categoria
- Equipe operacional usa celular nos pátios
- Balcão fecha reservas por WhatsApp — precisa de resposta rápida sobre disponibilidade
- Overbooking é o problema principal a resolver
- Veículo disponível = veículo limpo + fora do período de buffer + sem reserva sobreposta

---

*Gerado em 28/06/2026. Iniciar implementação em novo chat usando este documento como briefing.*

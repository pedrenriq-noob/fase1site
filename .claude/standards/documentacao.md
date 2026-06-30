# Padrão: Documentação

> Referência: CLAUDE.md § Regras para Documentação (RD-01 a RD-05)

---

## Objetivo

Definir o que documentar, como documentar e os formatos aceitos. Boa documentação é parte integral do código, não um item extra.

---

## O Que Documentar

### Obrigatório
- Toda função pública exportada (JSDoc)
- Toda Edge Function (README no diretório)
- Toda tabela do banco (comentário SQL)
- Decisões arquiteturais significativas (ADR)
- APIs públicas (OpenAPI/Swagger ou markdown)
- Processos de setup e deploy (runbook)

### Recomendado
- Módulos complexos (README.md no diretório)
- Algoritmos não triviais (comentário inline)
- Workarounds e limitações conhecidas (comentário com link para issue)

### Não Documentar
- O óbvio (`// incrementa i por 1`)
- Implementação de funções simples (o nome é suficiente)
- Código gerado automaticamente

---

## Formato JSDoc

### Função Simples

```javascript
/**
 * Formata um valor em centavos para moeda brasileira.
 *
 * @param {number} cents - Valor em centavos
 * @param {string} [locale='pt-BR'] - Locale para formatação
 * @returns {string} Valor formatado (ex: "R$ 1.234,56")
 */
export function formatCurrency(cents, locale = 'pt-BR') {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'BRL'
  }).format(cents / 100);
}
```

### Função Complexa com Múltiplos Parâmetros

```javascript
/**
 * Processa um pagamento e registra a transação.
 *
 * Fluxo:
 * 1. Valida os dados de pagamento
 * 2. Chama o gateway de pagamento
 * 3. Registra a transação no banco
 * 4. Envia confirmação por e-mail
 *
 * @param {Object} params - Parâmetros do pagamento
 * @param {string} params.orderId - ID do pedido
 * @param {number} params.amountCents - Valor em centavos
 * @param {Object} params.paymentMethod - Método de pagamento
 * @param {'credit_card'|'pix'|'boleto'} params.paymentMethod.type - Tipo
 * @param {string} [params.paymentMethod.token] - Token do cartão (se crédito)
 * @param {Object} [options] - Opções adicionais
 * @param {boolean} [options.sendEmail=true] - Enviar e-mail de confirmação
 * @param {number} [options.retries=3] - Número de tentativas em caso de falha
 * @returns {Promise<PaymentResult>} Resultado do pagamento
 * @throws {ValidationError} Se os dados de pagamento forem inválidos
 * @throws {PaymentGatewayError} Se o gateway rejeitar o pagamento
 * @throws {DatabaseError} Se falhar ao registrar a transação
 *
 * @example
 * // Pagamento por PIX
 * const result = await processPayment({
 *   orderId: 'order-123',
 *   amountCents: 9990,
 *   paymentMethod: { type: 'pix' }
 * });
 *
 * @example
 * // Pagamento por cartão sem e-mail
 * const result = await processPayment(
 *   { orderId: 'order-456', amountCents: 5000, paymentMethod: { type: 'credit_card', token: 'tok_...' } },
 *   { sendEmail: false }
 * );
 */
export async function processPayment(params, options = {}) { ... }
```

### Tipos Customizados

```javascript
/**
 * @typedef {Object} PaymentResult
 * @property {boolean} success - Se o pagamento foi aprovado
 * @property {string} transactionId - ID da transação
 * @property {string} status - Status: 'approved' | 'rejected' | 'pending'
 * @property {number} amountCents - Valor processado em centavos
 * @property {Date} processedAt - Data/hora do processamento
 * @property {string|null} receiptUrl - URL do comprovante (se disponível)
 */

/**
 * @typedef {Object} PaginatedResult
 * @template T
 * @property {T[]} data - Lista de registros
 * @property {number} total - Total de registros (sem paginação)
 * @property {number} page - Página atual (base 1)
 * @property {number} pageSize - Tamanho da página
 * @property {boolean} hasMore - Se há mais páginas
 */
```

---

## README de Módulo

Todo módulo complexo deve ter um README.md:

```markdown
# Módulo: Gerenciamento de Pagamentos

## Propósito
Gerencia o ciclo de vida completo de pagamentos, desde a validação até a confirmação.

## Interface Pública

### Funções

#### `processPayment(params, options?)`
Processa um pagamento. Veja JSDoc em `payment-processor.js`.

#### `getPaymentStatus(transactionId)`
Consulta o status de uma transação.

#### `refundPayment(transactionId, options?)`
Inicia o estorno de um pagamento.

## Dependências

- `@supabase/supabase-js`: acesso ao banco de dados
- Gateway de pagamento: configurado via `PAYMENT_GATEWAY_KEY`

## Configuração

Variáveis de ambiente necessárias:
- `PAYMENT_GATEWAY_URL`: URL do gateway
- `PAYMENT_GATEWAY_KEY`: Chave de API do gateway

## Limitações Conhecidas

- Não suporta split de pagamento entre múltiplos vendedores
- Reembolsos parciais não são suportados via API (somente via dashboard)
- Issue #123: Gateway de pagamento tem latência alta nas segundas-feiras
```

---

## Architecture Decision Records (ADRs)

### Quando Criar um ADR

Crie um ADR para decisões que:
- Afetam a estrutura geral do sistema
- São difíceis de reverter
- Têm trade-offs significativos
- Podem ser questionadas no futuro

### Template ADR

```markdown
# ADR-001: Uso de Vanilla JS em vez de Framework

## Data
2024-01-15

## Status
Aceito

## Contexto
O projeto precisa de uma camada de apresentação web. As opções principais consideradas foram:
- Vanilla JavaScript (ES2022+)
- React
- Vue.js
- Svelte

## Decisão
Usar Vanilla JavaScript com ES Modules.

## Justificativa
- Sem overhead de framework no bundle (0KB vs 40KB+ minificado)
- Sem curva de aprendizado de framework para novos devs
- Controle total sobre o comportamento
- Menor número de dependências para manter
- O projeto não tem complexidade de estado que justifique um framework

## Consequências

### Positivas
- Bundle size mínimo
- Código mais próximo dos padrões web
- Menos dependências para atualizar

### Negativas
- Sem reatividade declarativa — updates manuais de DOM
- Sem component model out-of-the-box — precisamos de disciplina
- Mais código boilerplate para padrões comuns

## Alternativas Consideradas

### React
- Prós: ecossistema rico, team já conhece
- Contras: 40KB+ bundle, overhead de virtual DOM, atualizações frequentes

### Svelte
- Prós: compila para vanilla JS, bundle pequeno
- Contras: syntax proprietária, ecossistema menor
```

ADRs são numerados sequencialmente e ficam em `docs/adrs/ADR-NNN-titulo.md`.

---

## Comentários no Código

### O Que Comentar

```javascript
// BOM: Explica o "porquê" — não óbvio pelo código
// Workaround para bug do Safari com IntersectionObserver e iframes
// Ref: https://webkit.org/b/216364 — remover quando corrigido
const observer = new IntersectionObserver(..., { rootMargin: '1px' });

// BOM: Explica uma regra de negócio não óbvia
// Desconto apenas aplica se o usuário é cliente há mais de 6 meses
// Regra definida em reunião 2024-01-10 — ver issue #456
if (monthsSinceRegistration >= 6) { ... }

// BOM: Aviso importante para futuros devs
// ATENÇÃO: Esta função é chamada com alta frequência.
// Evite adicionar operações pesadas aqui sem profiling.

// RUIM: Explica o óbvio
// Incrementa o contador
counter++;

// RUIM: Código comentado (use git para histórico)
// const oldImplementation = () => { ... }
```

### TODO e FIXME

```javascript
// TODO: Adicionar cache após volume > 10k registros (#789)
// FIXME: Bug em Safari iOS 15 — aguardando fix do Supabase (#891)
// HACK: Contorna limitação da API até versão 2.0 — remover em jan/2025
// NOTE: Este comportamento é intencional — ver ADR-005
```

---

## Documentação de API

Para Edge Functions e endpoints públicos, documente no formato:

```markdown
## POST /api/send-notification

Envia uma notificação para um ou múltiplos usuários.

### Autenticação
Bearer Token (JWT do Supabase Auth)

### Request Body
```json
{
  "recipients": ["user-id-1", "user-id-2"],
  "title": "Título da notificação",
  "body": "Corpo da mensagem",
  "data": {
    "action": "open_order",
    "orderId": "order-123"
  }
}
```

### Respostas

#### 200 OK
```json
{
  "success": true,
  "data": {
    "sent": 2,
    "failed": 0
  }
}
```

#### 400 Bad Request
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Campo 'recipients' é obrigatório"
  }
}
```
```

---

## Anti-Padrões de Documentação

### Documentação Mentirosa
```javascript
// ERRADO: documentação desatualizada é pior que ausente
/**
 * @returns {string} Nome do usuário   ← MENTIRA: retorna um objeto agora
 */
async function getUser(id) {
  return await db.users.findById(id); // retorna {id, name, email}
}
```

### Comentários de Código Comentado
```javascript
// ERRADO: use git log para histórico
// const legacyImplementation = () => {
//   return fetch('/api/old-endpoint');
// };
```

### JSDoc Incompleto
```javascript
// ERRADO: parâmetros não documentados
/**
 * Processa o pedido.
 */
async function processOrder(orderId, userId, options) { ... }
```

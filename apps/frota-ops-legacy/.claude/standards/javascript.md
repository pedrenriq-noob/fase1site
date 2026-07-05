# Padrão: JavaScript

> Referência: CLAUDE.md § Regras para Frontend (RF-07, RF-08, RF-09)

---

## Objetivo

Definir padrões para escrita de JavaScript moderno (ES2022+), vanilla, sem frameworks. O código deve ser legível, testável e performático.

---

## Vanilla JS — Sem Frameworks

Este projeto usa **JavaScript puro**. Nenhum framework (React, Vue, Angular, Svelte) é permitido sem aprovação arquitetural explícita documentada em ADR.

**Justificativa**: Vanilla JS resulta em bundles menores, menos dependências para atualizar, e código que o time entende completamente.

---

## ES Modules

Use sempre ES Modules. CommonJS é proibido no frontend.

```javascript
// CORRETO: ES Modules
import { createUser } from './user-repository.js';
import { formatDate } from '../lib/utils/date.js';

export function UserCard(user) { ... }
export default function renderApp() { ... }

// ERRADO: CommonJS
const { createUser } = require('./user-repository');
module.exports = { UserCard };
```

### Regras de Import/Export

```javascript
// Sempre use extensão .js nos imports (obrigatório para ES Modules no browser)
import { fn } from './modulo.js'; // CORRETO
import { fn } from './modulo';    // ERRADO

// Imports nomeados são preferidos a default exports (mais fáceis de refatorar)
export function calcularTotal(items) { ... }  // PREFERIDO
export default function calcularTotal() { ... } // EVITAR (exceto entry points)

// Agrupe imports: externos primeiro, depois internos
import { supabase } from '../lib/supabase/client.js';
import { UserRepository } from '../repositories/user-repository.js';
import { formatCurrency } from '../lib/utils/format.js';
```

---

## Async/Await

Use `async/await` em vez de Promises encadeadas (.then/.catch).

```javascript
// CORRETO: async/await com tratamento de erro estruturado
async function loadUserProfile(userId) {
  try {
    const user = await UserRepository.findById(userId);
    const orders = await OrderRepository.findByUserId(userId);
    return { user, orders };
  } catch (error) {
    if (error instanceof NotFoundError) {
      return null;
    }
    throw new ApplicationError('Falha ao carregar perfil', { cause: error });
  }
}

// ERRADO: Promises encadeadas
function loadUserProfile(userId) {
  return UserRepository.findById(userId)
    .then(user => {
      return OrderRepository.findByUserId(userId)
        .then(orders => ({ user, orders }));
    })
    .catch(error => { ... });
}
```

### Operações Paralelas

```javascript
// CORRETO: operações independentes em paralelo
async function loadDashboardData(userId) {
  const [user, stats, notifications] = await Promise.all([
    UserRepository.findById(userId),
    StatsService.getUserStats(userId),
    NotificationService.getUnread(userId)
  ]);
  return { user, stats, notifications };
}

// ERRADO: operações independentes em sequência (desnecessariamente lento)
async function loadDashboardData(userId) {
  const user = await UserRepository.findById(userId);
  const stats = await StatsService.getUserStats(userId);
  const notifications = await NotificationService.getUnread(userId);
  return { user, stats, notifications };
}
```

---

## JSDoc — Obrigatório para Funções Públicas

Toda função pública (exportada) deve ter JSDoc completo:

```javascript
/**
 * Calcula o total de um pedido aplicando descontos e impostos.
 *
 * @param {Object[]} items - Lista de itens do pedido
 * @param {string} items[].id - ID do produto
 * @param {number} items[].price - Preço unitário em centavos
 * @param {number} items[].quantity - Quantidade
 * @param {Object} [options] - Opções de cálculo
 * @param {number} [options.discountPercent=0] - Percentual de desconto (0-100)
 * @param {string} [options.taxRegion='BR'] - Região para cálculo de impostos
 * @returns {Object} Resultado do cálculo
 * @returns {number} .subtotal - Subtotal em centavos
 * @returns {number} .discount - Valor do desconto em centavos
 * @returns {number} .tax - Valor dos impostos em centavos
 * @returns {number} .total - Total final em centavos
 * @throws {ValidationError} Se items estiver vazio ou contiver dados inválidos
 * @throws {TaxCalculationError} Se a região de imposto não for suportada
 *
 * @example
 * const result = calculateOrderTotal(
 *   [{ id: '1', price: 1000, quantity: 2 }],
 *   { discountPercent: 10 }
 * );
 * console.log(result.total); // 1800 (2000 - 200 desconto)
 */
export function calculateOrderTotal(items, options = {}) {
  // implementação...
}
```

### JSDoc para Tipos

```javascript
/**
 * @typedef {Object} User
 * @property {string} id - ID único do usuário (UUID)
 * @property {string} email - Endereço de e-mail
 * @property {string} name - Nome completo
 * @property {'admin' | 'editor' | 'viewer'} role - Papel do usuário
 * @property {Date} createdAt - Data de criação
 * @property {Date|null} lastLoginAt - Data do último login
 */

/**
 * @typedef {Object} ApiResponse
 * @template T
 * @property {T|null} data - Dados da resposta
 * @property {ApiError|null} error - Erro, se houver
 */
```

---

## Tratamento de Erros

### Hierarquia de Erros Customizados

```javascript
// lib/errors.js
export class AppError extends Error {
  constructor(message, options = {}) {
    super(message, { cause: options.cause });
    this.name = this.constructor.name;
    this.code = options.code ?? 'UNKNOWN_ERROR';
    this.statusCode = options.statusCode ?? 500;
    this.userMessage = options.userMessage ?? 'Ocorreu um erro inesperado';
  }
}

export class ValidationError extends AppError {
  constructor(message, fields = {}) {
    super(message, { code: 'VALIDATION_ERROR', statusCode: 400 });
    this.fields = fields;
    this.userMessage = 'Por favor, verifique os dados informados';
  }
}

export class NotFoundError extends AppError {
  constructor(resource) {
    super(`${resource} não encontrado`, { code: 'NOT_FOUND', statusCode: 404 });
    this.userMessage = `${resource} não foi encontrado`;
  }
}

export class AuthorizationError extends AppError {
  constructor(action) {
    super(`Não autorizado: ${action}`, { code: 'UNAUTHORIZED', statusCode: 403 });
    this.userMessage = 'Você não tem permissão para realizar esta ação';
  }
}
```

### Padrão de Resultado (sem throws em toda parte)

```javascript
// Para funções que podem falhar de forma esperada, use Result pattern
/**
 * @returns {{ data: User|null, error: AppError|null }}
 */
async function findUser(id) {
  try {
    const data = await UserRepository.findById(id);
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

// Uso
const { data: user, error } = await findUser(userId);
if (error) {
  showErrorMessage(error.userMessage);
  return;
}
renderUser(user);
```

---

## Organização de Código

### Ordem de Definições em um Módulo

```javascript
// 1. Imports
import { supabase } from '../lib/supabase/client.js';
import { ValidationError } from '../lib/errors.js';

// 2. Constantes e configurações do módulo
const TABLE_NAME = 'users';
const MAX_RESULTS = 100;

// 3. Tipos/typedefs (JSDoc)
/** @typedef {Object} UserFilters ... */

// 4. Funções privadas (sem export, prefixo _ opcional mas consistente)
function _validateUserData(data) { ... }
function _normalizeUser(raw) { ... }

// 5. Exports públicos
export async function getUser(id) { ... }
export async function createUser(data) { ... }
export async function updateUser(id, data) { ... }
export async function deleteUser(id) { ... }
```

### Tamanho de Funções

- Funções devem ter no máximo **30 linhas**
- Se uma função está crescendo, extraia responsabilidades
- O nome da função deve descrever completamente o que ela faz

```javascript
// CORRETO: funções pequenas e focadas
async function createUserWithProfile(userData) {
  const validated = validateUserData(userData);
  const user = await createUser(validated);
  await createDefaultProfile(user.id);
  await sendWelcomeEmail(user.email);
  return user;
}

async function createUser(data) {
  const { data: user, error } = await supabase
    .from('users')
    .insert(data)
    .select()
    .single();
  if (error) throw new DatabaseError(error.message);
  return user;
}
```

---

## DOM Manipulation

```javascript
// CORRETO: queries eficientes
const form = document.getElementById('login-form');
const submitBtn = form.querySelector('[type="submit"]');

// Use delegação de eventos para listas dinâmicas
document.getElementById('todo-list').addEventListener('click', (event) => {
  const deleteBtn = event.target.closest('[data-action="delete"]');
  if (deleteBtn) {
    deleteTodo(deleteBtn.dataset.id);
  }
});

// Crie elementos programaticamente (não innerHTML para conteúdo de usuário)
function createUserCard(user) {
  const article = document.createElement('article');
  article.className = 'user-card';

  const name = document.createElement('h3');
  name.className = 'user-card__name';
  name.textContent = user.name; // textContent, não innerHTML!

  article.appendChild(name);
  return article;
}

// ERRADO: XSS via innerHTML com dados do usuário
function createUserCard(user) {
  return `<article class="user-card"><h3>${user.name}</h3></article>`;
  // user.name pode conter <script>alert('xss')</script>
}
```

---

## Performance JavaScript

```javascript
// Debounce para inputs de busca
import { debounce } from '../lib/utils/debounce.js';

const handleSearch = debounce(async (query) => {
  const results = await searchUsers(query);
  renderResults(results);
}, 300);

searchInput.addEventListener('input', (e) => handleSearch(e.target.value));

// Observe elementos em vez de scroll events
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      loadMoreContent();
    }
  });
}, { threshold: 0.1 });

observer.observe(document.getElementById('load-more-trigger'));
```

---

## Anti-Padrões JavaScript

### Variáveis Globais
```javascript
// ERRADO
window.userData = {}; // Variável global
var counter = 0; // var tem escopo de função, não de bloco

// CORRETO
const userData = {}; // Escopo de módulo
let counter = 0; // Escopo de bloco com let
```

### Callback Hell
```javascript
// ERRADO
fetchUser(id, function(user) {
  fetchOrders(user.id, function(orders) {
    fetchProducts(orders[0].id, function(products) {
      // ...
    });
  });
});

// CORRETO
const user = await fetchUser(id);
const orders = await fetchOrders(user.id);
const products = await fetchProducts(orders[0].id);
```

### == em vez de ===
```javascript
// ERRADO
if (value == null) { }   // Coerção implícita
if (count == "0") { }    // Coerção implícita

// CORRETO
if (value === null || value === undefined) { }
if (value == null) { }   // ÚNICA exceção: null check conciso
if (count === 0) { }
```

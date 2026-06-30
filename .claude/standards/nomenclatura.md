# Padrão: Nomenclatura

> Referência: CLAUDE.md § Convenções

---

## Objetivo

Definir convenções de nomenclatura consistentes para todos os artefatos do projeto: arquivos, variáveis, funções, classes, constantes, banco de dados e mais.

---

## Arquivos e Diretórios

| Tipo | Convenção | Exemplos |
|---|---|---|
| Arquivos JS | kebab-case | `user-profile.js`, `order-calculator.js` |
| Arquivos CSS | kebab-case | `user-card.css`, `checkout-form.css` |
| Arquivos HTML | kebab-case | `login-page.html`, `about.html` |
| Arquivos de teste | mesmo nome + `.test` | `user-profile.test.js` |
| Arquivos de tipo | mesmo nome + `.types` | `user.types.js` |
| Diretórios | kebab-case | `user-management/`, `order-processing/` |
| Migrations SQL | timestamp + snake_case | `20240115_143022_add_users_table.sql` |
| Edge Functions | kebab-case (diretório) | `send-notification/index.ts` |
| Documentação | kebab-case | `getting-started.md`, `api-reference.md` |
| Config files | convencional do ecossistema | `.eslintrc.json`, `jest.config.js` |

### Regras Especiais de Arquivos

```
NUNCA use:
- Espaços em nomes de arquivos
- Caracteres especiais (@, #, $, etc.)
- Acentos ou cedilha em nomes de arquivo
- Letras maiúsculas (exceto convenções específicas como README.md)

SEMPRE use:
- Nomes descritivos que indicam o conteúdo
- Extensão explícita (.js, .css, .html)
- Hífen como separador (não underscore em arquivos)
```

---

## JavaScript — Variáveis

### camelCase para variáveis locais e parâmetros

```javascript
// CORRETO
const userName = 'João';
const orderTotal = 1500;
let isLoading = false;
let hasPermission = true;
const itemCount = items.length;

// ERRADO
const UserName = 'João';    // PascalCase é para classes
const order_total = 1500;   // snake_case é para SQL
const ISLOADING = false;    // SCREAMING é para constantes
```

### Nomes Booleanos — Prefixo is/has/can/should

```javascript
// CORRETO: prefixo indica que é booleano
const isAuthenticated = true;
const hasAdminRole = false;
const canEditPost = true;
const shouldRefreshToken = false;
const isVisible = false;
const hasChildren = true;
const canDelete = true;

// ERRADO: nome ambíguo
const authenticated = true;  // autenticado? número de autenticações?
const adminRole = false;     // tem ou não tem?
const edit = true;           // o quê?
```

### Nomes Descritivos — Sem Abreviações

```javascript
// CORRETO: nomes completos e descritivos
const userProfileData = await fetchUserProfile(userId);
const totalOrderAmount = calculateOrderTotal(items);
const currentPageIndex = 0;
const maximumRetryCount = 3;

// ERRADO: abreviações obscuras
const upd = await fetchUserProfile(userId); // o que é upd?
const tot = calculateOrderTotal(items);     // tot de total? totalidade?
const idx = 0;                             // use index se necessário
const maxRet = 3;                          // maxRetries é melhor
```

### Exceções Aceitáveis de Abreviação

```javascript
// Convencionais e amplamente reconhecidas
const i = 0;           // índice de loop simples
const e = event;       // parâmetro de evento em handlers curtos
const el = element;    // referência a elemento DOM
const fn = callback;   // função callback

// Em contexto muito local (< 5 linhas de escopo)
const [a, b] = coordinates;
```

---

## JavaScript — Funções

### camelCase, verbo no início

```javascript
// CORRETO: verbo + complemento descritivo
function getUserById(id) { ... }
function calculateOrderTotal(items) { ... }
function sendEmailNotification(user, template) { ... }
function validatePaymentData(data) { ... }
function formatCurrencyBRL(cents) { ... }
function handleFormSubmit(event) { ... }
function renderUserCard(user) { ... }
function updateUserProfile(id, data) { ... }
function deleteOrderById(id) { ... }

// ERRADO: sem verbo ou verbo obscuro
function userById(id) { ... }     // o que faz? retorna? atualiza?
function order(items) { ... }     // calcula? cria? exibe?
function doStuff(data) { ... }    // nunca use "doStuff"
function processIt(x) { ... }     // processa o quê?
```

### Verbos Recomendados por Ação

| Ação | Verbos |
|---|---|
| Buscar dados | `get`, `fetch`, `find`, `load`, `retrieve` |
| Criar | `create`, `add`, `insert`, `build`, `make` |
| Atualizar | `update`, `set`, `modify`, `change` |
| Remover | `delete`, `remove`, `clear`, `reset` |
| Verificar | `is`, `has`, `can`, `check`, `validate` |
| Calcular | `calculate`, `compute`, `count`, `sum` |
| Converter | `to`, `from`, `convert`, `transform`, `parse`, `format` |
| Exibir | `render`, `show`, `display`, `draw` |
| Ocultar | `hide`, `close`, `dismiss` |
| Enviar | `send`, `submit`, `dispatch`, `emit` |
| Lidar com | `handle`, `process` |

---

## JavaScript — Classes

### PascalCase, substantivo

```javascript
// CORRETO
class UserRepository { ... }
class OrderCalculator { ... }
class PaymentProcessor { ... }
class EventBus { ... }
class ValidationError extends Error { ... }

// ERRADO
class userRepository { ... }    // deve ser PascalCase
class order_calculator { ... }  // snake_case é errado
class processPayments { ... }   // deve ser substantivo, não verbo
```

---

## JavaScript — Constantes

### SCREAMING_SNAKE_CASE para constantes verdadeiras

```javascript
// CORRETO: valores que nunca mudam, configurações fixas
const MAX_RETRY_COUNT = 3;
const API_TIMEOUT_MS = 30_000;
const USER_ROLES = Object.freeze({
  ADMIN: 'admin',
  EDITOR: 'editor',
  VIEWER: 'viewer',
});
const HTTP_STATUS = Object.freeze({
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  INTERNAL_ERROR: 500,
});

// EVITAR SCREAMING_SNAKE_CASE para:
const userName = 'João'; // variável comum, não constante
const result = await fetchData(); // valor computado
```

### Constantes de Configuração

```javascript
// config/constants.js
export const APP_CONFIG = Object.freeze({
  APP_NAME: 'Meu Aplicativo',
  APP_VERSION: import.meta.env.VITE_APP_VERSION,
  MAX_FILE_SIZE_BYTES: 5 * 1024 * 1024,
  PAGINATION_DEFAULT_SIZE: 20,
  TOKEN_EXPIRY_HOURS: 24,
  SUPPORTED_LOCALES: ['pt-BR', 'en-US'],
});
```

---

## SQL — Tabelas e Colunas

### Tabelas: snake_case, plural, inglês

```sql
-- CORRETO
users
user_profiles
order_items
payment_transactions
audit_logs
email_templates

-- ERRADO
User           -- PascalCase
userProfile    -- camelCase
order_item     -- singular
tbl_payment    -- prefixo desnecessário
AUDIT_LOGS     -- SCREAMING
```

### Colunas: snake_case, singular

```sql
-- CORRETO
id
user_id
first_name
last_name
email_address
phone_number
created_at
updated_at
deleted_at
is_active
has_verified_email
total_amount_cents

-- ERRADO
userId         -- camelCase
FirstName      -- PascalCase
email          -- OK (se for o único campo de email)
createdAt      -- camelCase
isActive       -- camelCase
```

### Padrões por Tipo de Coluna

```sql
-- IDs: sempre uuid
id uuid DEFAULT gen_random_uuid() PRIMARY KEY

-- Foreign keys: {tabela_singular}_id
user_id uuid REFERENCES users(id)
product_id uuid REFERENCES products(id)

-- Timestamps: sempre com timezone
created_at timestamptz DEFAULT now()
updated_at timestamptz DEFAULT now()
deleted_at timestamptz  -- para soft delete

-- Booleanos: prefixo is_ ou has_
is_active boolean DEFAULT true
has_verified_email boolean DEFAULT false

-- Valores monetários: em centavos, com _cents
price_cents integer  -- nunca decimal para dinheiro
total_amount_cents integer

-- Enumerações: texto com CHECK constraint
status text CHECK (status IN ('pending', 'active', 'cancelled'))
```

---

## CSS — Classes BEM

```css
/* Blocos: kebab-case */
.user-card { }
.checkout-form { }
.navigation-menu { }

/* Elementos: block__element */
.user-card__avatar { }
.user-card__name { }
.checkout-form__submit-button { }

/* Modificadores: block--modifier ou block__element--modifier */
.user-card--featured { }
.user-card--compact { }
.user-card__avatar--large { }
.navigation-menu--mobile { }
```

---

## Variáveis de Ambiente

```bash
# Prefixo por propósito
VITE_*          # variáveis expostas ao frontend (Vite)
SUPABASE_*      # variáveis do Supabase (backend apenas)
*_URL           # URLs de serviços
*_KEY           # chaves de API (nunca commitadas)
*_SECRET        # segredos (nunca commitadas)

# Exemplos
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhb...
SUPABASE_SERVICE_ROLE_KEY=eyJhb...    # NUNCA no frontend
PAYMENT_GATEWAY_SECRET=sk_live_...    # NUNCA commitado

# Convenção: SCREAMING_SNAKE_CASE para env vars
```

---

## IDs de Elementos HTML

```html
<!-- IDs: kebab-case, descritivos do conteúdo/função -->
<form id="login-form">
<button id="submit-payment-btn">
<div id="user-profile-section">
<span id="error-message-email">

<!-- data-* attributes: kebab-case -->
<button data-action="delete" data-user-id="123">
<div data-loading="true">
<article data-product-id="456" data-category="electronics">
```

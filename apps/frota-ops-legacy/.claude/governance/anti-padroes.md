# Anti-Padrões a Evitar

> Padrões nocivos identificados no projeto, com exemplos e alternativas.

---

## Anti-Padrões de Código

### AP-01: God Function
**O problema**: Uma função que faz tudo.
```javascript
// ANTI-PADRÃO
async function handleOrderSubmit(event) {
  event.preventDefault();
  const formData = new FormData(event.target);
  const email = formData.get('email');
  if (!email || !email.includes('@')) {
    document.getElementById('email-error').textContent = 'E-mail inválido';
    return;
  }
  const { data: user } = await supabase.from('users').select().eq('email', email).single();
  const total = formData.getAll('items').reduce((sum, item) => sum + Number(item), 0);
  const { data: order } = await supabase.from('orders').insert({ user_id: user.id, total }).select().single();
  await fetch('/api/send-email', { method: 'POST', body: JSON.stringify({ orderId: order.id }) });
  document.getElementById('success-message').style.display = 'block';
  // ... mais 50 linhas
}

// CORRETO — responsabilidades separadas
async function handleOrderSubmit(event) {
  event.preventDefault();
  const formData = parseOrderForm(event.target);
  const validation = validateOrderForm(formData);
  if (!validation.isValid) { showValidationErrors(validation.errors); return; }
  const order = await OrderService.create(formData);
  showOrderSuccess(order);
}
```

### AP-02: Callback Hell / Promise Hell
```javascript
// ANTI-PADRÃO
fetchUser(id)
  .then(user => fetchOrders(user.id)
    .then(orders => fetchProducts(orders.map(o => o.productId))
      .then(products => render({ user, orders, products }))
      .catch(err => handleProductError(err)))
    .catch(err => handleOrderError(err)))
  .catch(err => handleUserError(err));

// CORRETO
try {
  const user = await fetchUser(id);
  const orders = await fetchOrders(user.id);
  const products = await fetchProducts(orders.map(o => o.productId));
  render({ user, orders, products });
} catch (error) {
  handleError(error);
}
```

### AP-03: Magic Numbers
```javascript
// ANTI-PADRÃO
if (user.role === 3) { grantAccess(); }
setTimeout(refresh, 86400000);
if (items.length > 50) { paginate(); }

// CORRETO
const ROLE_ADMIN = 3;
const ONE_DAY_MS = 86_400_000;
const MAX_ITEMS_PER_PAGE = 50;

if (user.role === ROLE_ADMIN) { grantAccess(); }
setTimeout(refresh, ONE_DAY_MS);
if (items.length > MAX_ITEMS_PER_PAGE) { paginate(); }
```

### AP-04: innerHTML com Dados de Usuário (XSS)
```javascript
// ANTI-PADRÃO — XSS!
searchResults.innerHTML = `<p>Resultados para: ${userQuery}</p>`;
// Se userQuery = '<script>alert("xss")</script>', executa!

// CORRETO
const p = document.createElement('p');
p.textContent = `Resultados para: ${userQuery}`; // textContent é seguro
searchResults.appendChild(p);
```

---

## Anti-Padrões de Banco de Dados

### AP-05: Tabela sem RLS
```sql
-- ANTI-PADRÃO — qualquer usuário pode ver tudo!
CREATE TABLE pedidos (
  id uuid PRIMARY KEY,
  user_id uuid,
  total integer
);
-- Sem ENABLE ROW LEVEL SECURITY → todos os usuários veem todos os pedidos!

-- CORRETO
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "usuario_ve_proprios_pedidos" ON pedidos
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
```

### AP-06: Float para Dinheiro
```sql
-- ANTI-PADRÃO — imprecisão de ponto flutuante
CREATE TABLE products (price DECIMAL(10,2));
-- 0.1 + 0.2 = 0.30000000000000004 em alguns contextos!

-- CORRETO — inteiro em centavos
CREATE TABLE products (price_cents INTEGER);
-- R$10,99 = 1099 centavos. Sem imprecisão.
```

### AP-07: SELECT * sem LIMIT
```sql
-- ANTI-PADRÃO — pode retornar milhões de linhas
SELECT * FROM logs;

-- CORRETO
SELECT id, created_at, message, level
FROM logs
ORDER BY created_at DESC
LIMIT 100;
```

### AP-08: FK sem Índice
```sql
-- ANTI-PADRÃO — JOIN lento!
ALTER TABLE orders ADD COLUMN user_id uuid REFERENCES users(id);
-- Sem índice → Seq Scan em cada JOIN com users

-- CORRETO
ALTER TABLE orders ADD COLUMN user_id uuid REFERENCES users(id);
CREATE INDEX idx_orders_user_id ON orders(user_id); -- sempre junto!
```

---

## Anti-Padrões de Arquitetura

### AP-09: Dependência Circular
```
ANTI-PADRÃO:
users.js → orders.js → users.js  ← dependência circular!

CORRETO:
users.js ← (sem dependência de orders)
orders.js → users.js (apenas uma direção)
```

### AP-10: Lógica de Negócio na UI
```javascript
// ANTI-PADRÃO — cálculo de desconto na UI
document.getElementById('btn').addEventListener('click', () => {
  const price = 1000;
  const discount = price * 0.1;
  const total = price - discount;
  document.getElementById('total').textContent = total;
  // E se a regra de desconto mudar? Precisa atualizar em toda a UI!
});

// CORRETO — lógica de negócio em módulo separado
import { calculateDiscount } from '../business/pricing.js';

document.getElementById('btn').addEventListener('click', () => {
  const { total } = calculateDiscount({ price: 1000, discountPercent: 10 });
  renderTotal(total);
});
```

---

## Anti-Padrões de Processo

### AP-11: Deploy sem Testes Passando
Nunca deploy quando os testes estão falhando. "Vou corrigir depois" não existe.

### AP-12: Migration Modificada Após Aplicada
```
ANTI-PADRÃO:
1. Aplicar migration em produção
2. Editar o arquivo da migration para corrigir algo
3. "Aplicar novamente"
→ Vai dar erro porque a migration já foi registrada!
→ Ou pior: vai criar um estado inconsistente

CORRETO:
1. Criar NOVA migration para corrigir o problema
2. A migration original permanece imutável
```

### AP-13: Aprovação de PR sem Review Real
```
ANTI-PADRÃO:
- Reviewer aprova sem ler o código
- "LGTM" sem verificar os checklists
- Aprovação por pressão ("precisa entrar hoje")

CORRETO:
- Review sistemático usando os checklists
- Feedback específico e fundamentado
- Bloqueio quando há violação de regras obrigatórias
```

### AP-14: Segredo no Código
```javascript
// ANTI-PADRÃO — NUNCA faça isso
const API_KEY = 'sk-live-abc123'; // vai para o git!
const supabase = createClient(url, 'eyJhb...service_role_key'); // PERIGO!

// CORRETO
const API_KEY = import.meta.env.VITE_API_KEY;
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY // nunca a service_role!
);
```

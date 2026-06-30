# Erros Comuns

> Erros frequentemente cometidos, como identificá-los e como corrigi-los.

---

## Erros de Implementação

### EC-01: Race Condition em Operações Paralelas
**Como identificar**: Resultados inconsistentes em operações que deveriam ser independentes.

```javascript
// ERRADO — race condition se ambas leem e escrevem o mesmo estado
async function updateUserAndOrders(userId) {
  await updateUser(userId);     // modifica user.updated_at
  await updateUserOrders(userId); // pode sobrescrever user.updated_at!
}

// CORRETO — se são realmente independentes, use Promise.all
async function updateUserAndOrders(userId) {
  await Promise.all([
    updateUser(userId),
    updateUserOrders(userId)
  ]);
}

// CORRETO — se dependem uma da outra, seja explícito na ordem
async function updateUserThenOrders(userId) {
  const updatedUser = await updateUser(userId);
  await updateUserOrders(userId, updatedUser.version); // passa o contexto
}
```

### EC-02: Event Listeners Acumulados
**Como identificar**: Performance degradando com o tempo, ou handlers sendo chamados múltiplas vezes.

```javascript
// ERRADO — adiciona novo listener toda vez que renderiza
function renderList(items) {
  items.forEach(item => {
    const btn = document.getElementById(`btn-${item.id}`);
    btn.addEventListener('click', () => deleteItem(item.id)); // acumula!
  });
}

// CORRETO — Event delegation com um único listener
const list = document.getElementById('items-list');
list.addEventListener('click', (event) => {
  const deleteBtn = event.target.closest('[data-action="delete"]');
  if (deleteBtn) deleteItem(deleteBtn.dataset.itemId);
});
```

### EC-03: Async Sem Await
**Como identificar**: Operação parece estar sendo ignorada, dados não salvos.

```javascript
// ERRADO — Promise não aguardada
function handleSubmit() {
  saveData(formData); // sem await! executa mas não espera
  showSuccessMessage(); // aparece antes de salvar!
}

// CORRETO
async function handleSubmit() {
  await saveData(formData); // aguarda completar
  showSuccessMessage();
}
```

---

## Erros de Banco de Dados

### EC-04: Transação Não Fechada
**Como identificar**: Locks no banco, queries travadas.

```sql
-- ERRADO — começou transação mas não fecha em caso de erro
BEGIN;
UPDATE orders SET status = 'processing' WHERE id = $1;
-- se o próximo UPDATE falhar, BEGIN fica aberta!
UPDATE inventory SET quantity = quantity - 1 WHERE product_id = $2;

-- CORRETO — use transação com tratamento de erro
BEGIN;
UPDATE orders SET status = 'processing' WHERE id = $1;
UPDATE inventory SET quantity = quantity - 1 WHERE product_id = $2;
COMMIT;
-- Em caso de erro, chame ROLLBACK
```

### EC-05: N+1 Query
**Como identificar**: Lentidão crescente com o volume de dados, muitas queries similares nos logs.

```javascript
// ERRADO — N+1
const orders = await supabase.from('orders').select('id, user_id').limit(20);
for (const order of orders.data) {
  // 1 query para cada pedido!
  const user = await supabase.from('users').select('name').eq('id', order.user_id).single();
  renderOrder(order, user.data);
}

// CORRETO — 1 query com JOIN
const { data } = await supabase
  .from('orders')
  .select('id, users(name)')
  .limit(20);
```

### EC-06: Update sem WHERE
**Como identificar**: Todos os registros foram alterados quando apenas um deveria.

```sql
-- ERRADO — atualiza TODOS os pedidos!
UPDATE orders SET status = 'cancelled';

-- CORRETO — sempre com WHERE
UPDATE orders SET status = 'cancelled' WHERE id = $1 AND user_id = $2;
```

---

## Erros de Segurança

### EC-07: Verificação de Autorização Apenas no Frontend
**Como identificar**: Dados protegidos acessíveis via DevTools ou Postman.

```javascript
// ERRADO — esconde o botão mas não protege o dado
if (!isAdmin) document.getElementById('admin-btn').style.display = 'none';
// Alguém pode chamar a Edge Function diretamente!

// CORRETO — verificação no servidor
// Edge Function:
const { data: { user } } = await supabase.auth.getUser();
const isAdmin = await checkUserRole(user.id, 'admin');
if (!isAdmin) return errorResponse('FORBIDDEN', 403);
```

### EC-08: Log de Dados Sensíveis
**Como identificar**: Tokens, senhas ou dados pessoais aparecem nos logs.

```javascript
// ERRADO
console.log('Usuário autenticado:', user); // pode incluir tokens!
console.log('Processando pagamento:', paymentData); // inclui número do cartão!

// CORRETO
console.log('Usuário autenticado:', { id: user.id, email: user.email });
console.log('Processando pagamento:', { orderId, amount, method: paymentData.type });
// Nunca logar token, senha, número de cartão, CPF completo
```

---

## Erros de Processo

### EC-09: Merge sem Checklists
**Sintoma**: Bugs frequentes em produção, padrões inconsistentes.
**Solução**: Configure o template de PR para incluir os checklists. Bloqueie o merge se os checklists não estiverem preenchidos.

### EC-10: Ignorar Feedback de Code Review
**Sintoma**: Os mesmos problemas aparecem repetidamente.
**Solução**: Responda a todos os comentários de review. Mesmo que discorde, explique o motivo. Nunca simplesmente ignore.

### EC-11: Deploy em Horário de Pico
**Sintoma**: Incidentes frequentemente após as 17h ou às sextas-feiras.
**Solução**: Defina janelas de deploy (10-12h e 14-16h) e bloqueie deploys fora da janela sem aprovação explícita.

---

## Como Identificar Erros Sistemáticos

### Revisão Semanal
Execute estas verificações toda semana:
```bash
# Dependências circulares
npx madge --circular src/

# Funções muito longas
npx complexity-report src/ --format json | jq '.[] | select(.complexity > 10)'

# Console.log em produção
grep -r "console.log" src/ --include="*.js"

# Índices faltando em FKs (SQL)
SELECT tablename, attname FROM pg_attribute
JOIN pg_class ON pg_class.oid = attrelid
WHERE attname LIKE '%_id'
  AND NOT attnum = ANY(
    SELECT unnest(indkey) FROM pg_index WHERE indrelid = pg_class.oid
  );
```

# Boas Práticas do Framework

> Consolidação das melhores práticas de todas as áreas do framework.

---

## Boas Práticas de Código

### BP-01: Nomeie com Intenção
Nomes devem comunicar propósito sem necessidade de comentário:
```javascript
// RUIM
const d = new Date();
const arr = items.filter(x => x.s === 'active');

// BOM
const currentDate = new Date();
const activeItems = items.filter(item => item.status === 'active');
```

### BP-02: Funções Pequenas e Focadas
Limite funções a 30 linhas. Se cresceu, extraia uma responsabilidade:
- Uma função = uma responsabilidade
- Nome da função descreve completamente o que faz
- Fácil de testar em isolamento

### BP-03: Falhe Explicitamente
Não engula erros silenciosamente:
```javascript
// RUIM
try { await doSomething(); } catch (e) {} // erro ignorado!

// BOM
try {
  await doSomething();
} catch (error) {
  logger.error('Falha ao processar', { error, context });
  throw new AppError('Falha ao processar', { cause: error });
}
```

### BP-04: Prefira Imutabilidade
```javascript
// RUIM — mutação implícita
function addItem(cart, item) {
  cart.items.push(item); // muta o argumento!
  return cart;
}

// BOM — retorna novo objeto
function addItem(cart, item) {
  return { ...cart, items: [...cart.items, item] };
}
```

---

## Boas Práticas de Banco de Dados

### BP-05: Sempre Especifique Colunas no SELECT
```sql
-- RUIM: busca tudo, ocupa mais memória e é frágil a mudanças de schema
SELECT * FROM users;

-- BOM: apenas o necessário
SELECT id, name, email, created_at FROM users WHERE active = true;
```

### BP-06: Índice Junto com a FK
```sql
-- Sempre crie o índice junto com a foreign key
ALTER TABLE orders ADD COLUMN user_id uuid REFERENCES users(id);
CREATE INDEX idx_orders_user_id ON orders(user_id); -- obrigatório!
```

### BP-07: EXPLAIN ANALYZE Antes de Deploy
Qualquer query nova deve ser analisada com EXPLAIN ANALYZE antes de ir para produção. Seq Scan em tabela grande é um bug de performance.

### BP-08: Valores Monetários em Centavos
```sql
-- RUIM: floating point tem imprecisão
price DECIMAL(10,2);

-- BOM: inteiro, sem imprecisão
price_cents INTEGER; -- R$10,99 = 1099
```

---

## Boas Práticas de Segurança

### BP-09: RLS é Não-Negociável
Toda tabela no schema public deve ter RLS habilitado. Sem exceções. Sem "habilito depois".

### BP-10: Valide no Servidor, Sempre
```javascript
// Validação no cliente é UX, não segurança
// Edge Function deve sempre revalidar:
if (!body.email || !isValidEmail(body.email)) {
  return errorResponse('INVALID_EMAIL', 400);
}
```

### BP-11: Princípio do Menor Privilégio
- Políticas RLS: comece negando tudo, libere apenas o necessário
- Roles de banco: use roles específicos, não o superuser
- Permissões de Storage: buckets privados por padrão

---

## Boas Práticas de Frontend

### BP-12: Mobile-First Não É Opcional
Escreva CSS para mobile primeiro. Adicione breakpoints para telas maiores. Nunca o contrário.

### BP-13: textContent para Dados de Usuário
```javascript
// RUIM — XSS
element.innerHTML = userInput;

// BOM — seguro
element.textContent = userInput;
```

### BP-14: Estados de UI São Parte da Feature
Toda feature de UI deve ter:
- Estado de loading (skeleton ou spinner)
- Estado de erro (com mensagem e ação)
- Estado vazio (com orientação ao usuário)
- Estado de sucesso

---

## Boas Práticas de Processo

### BP-15: Commits Atômicos
Um commit = uma mudança lógica coesa. Evite commits gigantes que misturem refatoração, nova feature e correção de bug.

### BP-16: Branch de Curta Duração
Branches devem durar horas ou dias, não semanas. Features longas devem ser divididas em partes menores e incremetadas via feature flags.

### BP-17: Documentação Como Parte da Task
Documentar não é uma tarefa separada. Faz parte da definição de "done". Se não está documentado, não está concluído.

### BP-18: Revisão Antes do Merge (Sempre)
Nenhum código vai para main sem revisão de pelo menos uma pessoa diferente de quem escreveu. Sem exceções, mesmo para "mudanças pequenas".

---

## Boas Práticas de Colaboração

### BP-19: Perguntas Antes de Suposições
Antes de implementar, confirme o entendimento do requisito. Uma pergunta evita horas de retrabalho.

### BP-20: Feedback Construtivo
Code review é sobre o código, não sobre a pessoa. Foco em: "este código viola o padrão X" não "você errou".

### BP-21: Transparência sobre Problemas
Se encontrar um problema, reporte imediatamente. Esconder problemas não os resolve.

### BP-22: Evolução Contínua
O framework existe para ser melhorado. Se identificar uma lacuna ou problema, abra uma issue com a proposta.

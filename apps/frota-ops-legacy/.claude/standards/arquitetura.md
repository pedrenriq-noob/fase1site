# Padrão: Arquitetura de Software

> Referência: CLAUDE.md § Regras de Arquitetura (RA-01 a RA-07)

---

## Objetivo

Definir os princípios arquiteturais que governam a estrutura, organização e comunicação entre componentes do sistema. Este padrão garante que o software seja maintainable, testável e evolutivo.

---

## Arquitetura em Camadas

O sistema é organizado em camadas com responsabilidades distintas e comunicação unidirecional:

```
┌─────────────────────────────────────────┐
│           CAMADA DE APRESENTAÇÃO         │
│   HTML + CSS + JavaScript (Vanilla JS)  │
│   Responsabilidade: renderização e UI   │
└────────────────────┬────────────────────┘
                     │ (apenas para baixo)
┌────────────────────▼────────────────────┐
│         CAMADA DE LÓGICA DE NEGÓCIO      │
│         Módulos JS / Edge Functions      │
│   Responsabilidade: regras de negócio   │
└────────────────────┬────────────────────┘
                     │ (apenas para baixo)
┌────────────────────▼────────────────────┐
│           CAMADA DE ACESSO A DADOS       │
│         Supabase Client / Queries        │
│   Responsabilidade: persistência        │
└────────────────────┬────────────────────┘
                     │ (apenas para baixo)
┌────────────────────▼────────────────────┐
│              BANCO DE DADOS              │
│           PostgreSQL (Supabase)          │
│   Responsabilidade: armazenamento       │
└─────────────────────────────────────────┘
```

### Regras de Comunicação entre Camadas

- **Regra RA-01**: Camadas se comunicam apenas com a camada imediatamente adjacente
- A camada de apresentação nunca faz queries SQL diretamente
- A camada de dados nunca renderiza HTML
- Lógica de negócio nunca depende de detalhes de implementação da UI

---

## Separação de Responsabilidades

### Single Responsibility Principle (SRP)
Cada módulo, classe ou função deve ter **uma única razão para mudar**.

**Correto:**
```javascript
// users.js — responsabilidade: operações de usuário
async function getUser(userId) {
  return await supabase.from('users').select('*').eq('id', userId).single();
}

// users-ui.js — responsabilidade: renderização de usuário
function renderUserCard(user) {
  return `<article class="user-card">...</article>`;
}

// users-validator.js — responsabilidade: validação de usuário
function validateUserData(data) {
  if (!data.email) throw new ValidationError('Email é obrigatório');
}
```

**Errado — mistura responsabilidades:**
```javascript
// ANTI-PADRÃO: uma função faz tudo
async function handleUser(userId) {
  const { data } = await supabase.from('users').select('*').eq('id', userId).single();
  if (!data.email) throw new Error('Invalid');
  document.getElementById('user-name').textContent = data.name; // ERRADO: UI na camada de dados
  return data;
}
```

---

## Fronteiras de Módulos

### Definição de Módulo
Um módulo é uma unidade de código com:
- Interface pública explícita (o que exporta)
- Implementação privada encapsulada
- Dependências declaradas explicitamente

### Estrutura de um Módulo
```javascript
// modulo/index.js — interface pública
export { createUser, updateUser, deleteUser } from './users.js';
export { UserValidationError } from './errors.js';
// NÃO exportar internals como: _normalizeData, _buildQuery

// modulo/users.js — implementação
import { _normalizeData } from './internal/normalize.js'; // privado ao módulo
import { UserValidationError } from './errors.js';

export async function createUser(data) { ... }
```

### Regras de Fronteiras
- Módulos exportam apenas o que é necessário para seus clientes
- Código externo ao módulo não deve conhecer sua estrutura interna
- Mudanças internas ao módulo não quebram código externo (exceto mudanças na interface pública)

---

## Regras de Dependência

### Grafo de Dependências Permitido
```
UI Components → Business Logic Modules → Data Access Layer → Supabase
                                       ↘ Utilities/Helpers
```

### Regras
- **RA-02 — Inversão de Dependência**: módulos de alto nível dependem de abstrações, não de implementações concretas
- **RA-06 — Sem Dependências Circulares**: módulo A não pode depender de B se B depende de A

**Verificação de dependências circulares:**
```bash
# Use madge para detectar dependências circulares
npx madge --circular src/
```

### Dependências Externas
- Toda dependência externa deve ser declarada em `package.json`
- Dependências de desenvolvimento vs. produção separadas
- Versões fixadas com lockfile (package-lock.json)
- Auditorias regulares: `npm audit`

---

## Padrões de Design Permitidos

### Observer Pattern
Para comunicação desacoplada entre módulos:
```javascript
// event-bus.js
const eventBus = {
  listeners: new Map(),
  on(event, callback) {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event).push(callback);
  },
  emit(event, data) {
    this.listeners.get(event)?.forEach(cb => cb(data));
  }
};
```

### Repository Pattern
Para abstrair o acesso a dados:
```javascript
// repositories/user-repository.js
export const UserRepository = {
  async findById(id) {
    const { data, error } = await supabase.from('users').select('*').eq('id', id).single();
    if (error) throw new DatabaseError(error.message);
    return data;
  },
  async save(user) { ... },
  async delete(id) { ... }
};
```

### Module Pattern
Para encapsulamento:
```javascript
// Módulo com estado privado
const CartModule = (() => {
  let _items = []; // privado

  return {
    addItem(item) { _items.push(item); },
    getTotal() { return _items.reduce((sum, item) => sum + item.price, 0); },
    clear() { _items = []; }
  };
})();
```

---

## Decisões Arquiteturais (ADRs)

Toda decisão arquitetural significativa deve ser documentada como um ADR no formato:

```markdown
# ADR-[número]: [título]

## Status
[Proposto | Aceito | Obsoleto | Substituído por ADR-X]

## Contexto
[Por que esta decisão foi necessária]

## Decisão
[O que foi decidido]

## Consequências
### Positivas
- [benefício 1]

### Negativas
- [trade-off 1]
```

ADRs são armazenados em `docs/adrs/`.

---

## Exemplos de Arquitetura Correta

### Fluxo de Nova Feature
```
1. UI captura input do usuário (Camada de Apresentação)
   ↓
2. Módulo de feature valida e processa (Camada de Negócio)
   ↓
3. Repository realiza a operação no banco (Camada de Dados)
   ↓
4. Supabase executa e retorna resultado (Banco de Dados)
   ↓
5. Resultado sobe pelas camadas até a UI
```

---

## Anti-Padrões a Evitar

### God Object
```javascript
// ERRADO: uma classe que faz tudo
class App {
  fetchUsers() { ... }
  renderUsers() { ... }
  validateUser() { ... }
  sendEmail() { ... }
  generateReport() { ... }
  // ... 50 outros métodos
}
```

### Spaghetti Architecture
```javascript
// ERRADO: UI chamando banco diretamente
document.getElementById('btn').addEventListener('click', async () => {
  const { data } = await supabase.from('orders').insert({ ... }); // ERRADO: banco direto na UI
  document.getElementById('result').textContent = data.id;
});
```

### Magic Numbers e Strings
```javascript
// ERRADO
if (user.role === 3) { ... }
setTimeout(fn, 86400000);

// CORRETO
const USER_ROLES = { ADMIN: 3, EDITOR: 2, VIEWER: 1 };
const ONE_DAY_MS = 86_400_000;
if (user.role === USER_ROLES.ADMIN) { ... }
setTimeout(fn, ONE_DAY_MS);
```

---

## Checklist de Conformidade Arquitetural

Antes de qualquer PR:
- [ ] Cada função tem uma única responsabilidade
- [ ] Camadas se comunicam apenas com a camada adjacente
- [ ] Módulos expõem interface mínima necessária
- [ ] Nenhuma dependência circular (verificado com madge)
- [ ] Decisões arquiteturais documentadas em ADR se necessário
- [ ] Configurações externas ao código (sem hardcode)
- [ ] Dependências externas declaradas no package.json

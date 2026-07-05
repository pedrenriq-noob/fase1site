# Template: Documentação de Componente

```markdown
# Componente: {{NomeDoComponente}}

**Arquivo**: `src/components/{{nome-do-componente}}/{{nome-do-componente}}.js`
**CSS**: `src/components/{{nome-do-componente}}/{{nome-do-componente}}.css`

---

## Propósito

{{DESCRICAO_DO_QUE_ESTE_COMPONENTE_FAZ}}

## Quando Usar

{{EM_QUE_SITUACOES_ESTE_COMPONENTE_DEVE_SER_USADO}}

---

## Interface Pública

### Parâmetros

| Parâmetro | Tipo | Obrigatório | Padrão | Descrição |
|-----------|------|-------------|--------|-----------|
| `{{param1}}` | `{{tipo}}` | Sim | — | {{descricao}} |
| `{{param2}}` | `{{tipo}}` | Não | `{{padrao}}` | {{descricao}} |

### Retorno

{{O_QUE_A_FUNCAO_RETORNA_OU_RENDERIZA}}

### Eventos Emitidos

| Evento | Quando | Payload |
|--------|--------|---------|
| `{{evento}}` | {{quando ocorre}} | `{{estrutura do payload}}` |

---

## Exemplo de Uso

```javascript
import { {{NomeDoComponente}} } from './{{nome-do-componente}}.js';

// Uso básico
const container = document.getElementById('container');
{{NomeDoComponente}}(container, {
  {{param1}}: {{valor}},
  on{{Evento}}: (data) => console.log(data)
});
```

## Variações (Modificadores BEM)

| Modificador | Classe CSS | Quando usar |
|-------------|-----------|-------------|
| Padrão | `.{{bloco}}` | Uso normal |
| {{variacao1}} | `.{{bloco}}--{{variacao1}}` | {{quando usar}} |
| {{variacao2}} | `.{{bloco}}--{{variacao2}}` | {{quando usar}} |

---

## Acessibilidade

- {{ROLE_ARIA_SE_APLICAVEL}}
- {{ATRIBUTOS_ARIA_NECESSARIOS}}
- {{COMPORTAMENTO_DE_TECLADO}}

---

## Dependências

- {{DEPENDENCIA_1}} (importado de `{{caminho}}`)

## Notas de Implementação

{{DECISOES_TECNICAS_IMPORTANTES_OU_LIMITACOES}}
```

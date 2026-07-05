# Prompt: Novo Componente

## Contexto

Use este prompt ao criar um novo componente reutilizável de UI. Componentes devem ser agnósticos a contexto, testáveis e bem documentados.

---

## Prompt para o Claude

```
Preciso criar o seguinte componente:

Nome: [NOME-DO-COMPONENTE]
Propósito: [O que este componente faz]
Reutilizável em: [Onde será usado]

Interface pública (props/params):
- [parâmetro 1]: [tipo] - [descrição]
- [parâmetro 2]: [tipo] - [descrição]

Variações (modificadores BEM):
- [variação 1]: [quando usar]
- [variação 2]: [quando usar]

Por favor, ative os especialistas:

1. Vanilla JS Engineer: implemente o componente com:
   - Função factory ou classe
   - JSDoc completo
   - Interface mínima (apenas o necessário)

2. Mobile UX Specialist: valide alvos de toque e acessibilidade

3. Code Reviewer: revise a qualidade e reutilizabilidade

Siga o template em templates/componente.md
Siga os padrões em standards/html.md, css.md e javascript.md
```

---

## Skills Ativadas

| Especialista | Responsabilidade |
|---|---|
| Vanilla JS Engineer | Implementação do componente |
| Mobile UX Specialist | UX mobile e acessibilidade |
| Code Reviewer | Qualidade e reutilizabilidade |

---

## Passos de Execução

1. **Interface**: definir API pública do componente (o que aceita e expõe)
2. **HTML**: estrutura semântica do componente
3. **CSS**: estilos BEM com variações (modificadores)
4. **JavaScript**: lógica, eventos, estados
5. **Acessibilidade**: ARIA roles e attributes
6. **Documentação**: JSDoc e exemplo de uso

---

## Entregáveis Esperados

- [ ] `components/nome-componente/nome-componente.js` com JSDoc
- [ ] `components/nome-componente/nome-componente.css` com BEM
- [ ] `components/nome-componente/nome-componente.test.js`
- [ ] Template documentado em templates/componente.md
- [ ] Exemplo de uso no JSDoc

# Template: Documentação de Tela

```markdown
# Tela: {{NOME_DA_TELA}}

**Route**: `{{/caminho/da/tela}}`
**Feature**: {{FEATURE_PAI}}
**Arquivo**: `src/pages/{{nome-da-tela}}/`

---

## Propósito

{{DESCRICAO_DO_QUE_O_USUARIO_CONSEGUE_FAZER_NESTA_TELA}}

## Usuários

- **Quem acessa**: {{ROLES OU PERFIS DE USUARIO}}
- **Pré-requisito**: {{AUTENTICADO? ADMIN? DONO DO RECURSO?}}

---

## Dados

### Exibidos na Tela
| Campo | Fonte | Descrição |
|-------|-------|-----------|
| {{campo}} | `{{tabela.coluna}}` | {{descricao}} |

### Coletados na Tela (formulários)
| Campo | Tipo | Obrigatório | Validação |
|-------|------|-------------|-----------|
| {{campo}} | {{text/email/number}} | Sim/Não | {{regra de validacao}} |

---

## Edge Functions Utilizadas

| Função | Método | Quando é chamada |
|--------|--------|-----------------|
| `{{nome-da-funcao}}` | POST | Ao submeter o formulário |

---

## Estados da Tela

| Estado | Quando | O que exibe |
|--------|--------|-------------|
| Loading | Buscando dados | Skeleton loader |
| Error | Falha ao buscar dados | Mensagem de erro + botão retry |
| Empty | Sem dados | Mensagem empty state + CTA |
| Success | Dados carregados | Conteúdo normal |

---

## Acessibilidade

- [ ] Título da página descritivo
- [ ] Foco gerenciado corretamente
- [ ] Mensagens de erro anunciadas (`aria-live`)
- [ ] Navegação por teclado funcional

---

## Comportamento Mobile

- [ ] Layout adaptado para 320px
- [ ] Alvos de toque adequados
- [ ] Teclado virtual não cobre campos importantes

---

## Relacionamentos

- **Vem de**: {{TELA_DE_ORIGEM}}
- **Vai para**: {{TELAS_DE_DESTINO}}
- **Componentes usados**: {{LISTA_DE_COMPONENTES}}
```

# Workflow: Documentação

---

## Objetivo

Garantir que a documentação técnica seja criada, mantida e publicada de forma sistemática e atualizada.

---

## Pré-requisitos

- [ ] Identificação do que precisa ser documentado (nova feature, module sem docs, processo desatualizado)
- [ ] Acesso ao repositório e ferramentas de documentação
- [ ] Clareza sobre o público-alvo da documentação

---

## Passos Detalhados

### Fase 1 — Auditoria

**Responsável**: Documentation Engineer

**Passo 1.1 — Inventariar documentação existente**
- O que existe: READMEs, JSDoc, ADRs, runbooks, wikis
- O que está desatualizado
- O que está faltando

**Passo 1.2 — Priorizar lacunas**

| Prioridade | Critério |
|---|---|
| Alta | Módulos sem documentação, APIs sem docs, processos críticos |
| Média | JSDoc incompleto, READMEs desatualizados |
| Baixa | Melhorias de clareza, exemplos adicionais |

**Passo 1.3 — Identificar público-alvo**
- Desenvolvedores do time (documentação técnica)
- Novos membros (onboarding)
- Stakeholders de negócio (documentação de produto)
- Usuários finais (manuais, guias)

**Entregável**: Lista priorizada de itens a documentar

---

### Fase 2 — Escrita

**Responsável**: Documentation Engineer

**Passo 2.1 — Escolher o formato adequado**

| Tipo de Doc | Formato | Localização |
|---|---|---|
| Função/módulo | JSDoc | No código |
| Módulo complexo | README.md | No diretório do módulo |
| Decisão arquitetural | ADR | `docs/adrs/` |
| API/Edge Function | Markdown | `docs/api/` |
| Processo de deploy | Runbook | `docs/runbooks/` |
| Onboarding | Guia | `docs/guides/` |
| Changelog | Keep a Changelog | Raiz do projeto |

**Passo 2.2 — Seguir os padrões de documentação**
- Veja `standards/documentacao.md` para todos os formatos
- Use os templates em `templates/documentacao.md`

**Passo 2.3 — Escrever com clareza**
- Escreva para quem não conhece o código
- Use exemplos concretos e funcionais
- Inclua casos de erro e limitações
- Seja específico sobre pré-requisitos

**Passo 2.4 — Revisão própria**
- Leia como se fosse a primeira vez
- Execute os exemplos fornecidos para confirmar que funcionam
- Verifique links e referências

**Entregável**: Documentação rascunhada

---

### Fase 3 — Revisão

**Responsável**: Documentation Engineer + (developer do módulo)

**Passo 3.1 — Revisão técnica**
- Developer do módulo verifica precisão técnica
- Confirma que exemplos são funcionais e corretos
- Identifica informações faltantes ou incorretas

**Passo 3.2 — Revisão de usabilidade**
- Alguém que não conhece o módulo consegue entender?
- Os exemplos são suficientes?
- Os casos de erro estão claros?

**Passo 3.3 — Revisão de consistência**
- Usa a nomenclatura consistente com o resto do projeto?
- Siga o estilo de escrita do projeto?
- Links funcionam?

**Entregável**: Documentação revisada e aprovada

---

### Fase 4 — Publicação

**Responsável**: Documentation Engineer

**Passo 4.1 — Integrar ao codebase**
- JSDoc: já está no código, basta fazer commit
- READMEs: commit no repositório
- ADRs: commit em `docs/adrs/`
- APIs: commit em `docs/api/`

**Passo 4.2 — Gerar documentação (se aplicável)**
```bash
# Gerar docs de API a partir do JSDoc
npx jsdoc -c jsdoc.config.json

# Ou usar TypeDoc (se TypeScript)
npx typedoc --entryPoints src/
```

**Passo 4.3 — Publicar**
- Push para o repositório (publica no GitHub Pages automaticamente)
- Atualizar links no README principal se necessário
- Notificar o time sobre nova documentação disponível

**Entregável**: Documentação publicada e acessível

---

## Skills Envolvidas

| Fase | Skills Primárias | Skills de Apoio |
|---|---|---|
| Auditoria | Documentation Engineer | Product Owner |
| Escrita | Documentation Engineer | (Developer do módulo) |
| Revisão | Documentation Engineer | Code Reviewer |
| Publicação | Documentation Engineer | — |

---

## Critérios de Conclusão

- [ ] Toda função pública tem JSDoc completo
- [ ] Módulos complexos têm README.md
- [ ] APIs têm documentação de request/response
- [ ] Processos críticos têm runbook
- [ ] Decisões arquiteturais documentadas em ADRs
- [ ] Exemplos testados e funcionando
- [ ] Linguagem clara e acessível para o público-alvo
- [ ] Publicada e acessível para o time

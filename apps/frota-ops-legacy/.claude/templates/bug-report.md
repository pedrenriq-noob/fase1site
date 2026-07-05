# Template: Bug Report

```markdown
## Título do Bug

{{TITULO_CURTO_E_DESCRITIVO}}

---

## Informações Gerais

**Severidade**: [ ] Crítico | [ ] Alto | [ ] Médio | [ ] Baixo
**Ambiente**: [ ] Produção | [ ] Staging | [ ] Desenvolvimento
**Reprodutível**: [ ] Sempre | [ ] Às vezes | [ ] Apenas uma vez
**Reportado por**: {{NOME}}
**Data**: {{DATA}}

---

## Descrição

{{DESCREVA_O_PROBLEMA_COM_CLAREZA}}

## Resultado Esperado

{{O_QUE_DEVERIA_ACONTECER}}

## Resultado Atual

{{O_QUE_ESTA_ACONTECENDO}}

---

## Passos para Reproduzir

1. {{PASSO_1}}
2. {{PASSO_2}}
3. {{PASSO_3}}
4. Observe: {{O_QUE_ACONTECE}}

---

## Ambiente

**Browser**: {{NAVEGADOR E VERSÃO}}
**Sistema Operacional**: {{OS E VERSAO}}
**Dispositivo**: {{DESKTOP/MOBILE/TABLET e modelo}}
**Resolução de tela**: {{RESOLUCAO}}
**Versão da aplicação**: {{VERSAO}}

---

## Evidências

**Capturas de tela**: {{ANEXAR}}
**Vídeo**: {{LINK SE DISPONIVEL}}
**Logs de console**: 
```
{{COLAR_ERROS_DO_CONSOLE_AQUI}}
```

**Logs de rede** (se request falhou):
- URL: {{URL_DA_REQUEST}}
- Status: {{STATUS_CODE}}
- Response: {{RESPOSTA}}

---

## Contexto Adicional

**Frequência**: {{OCORRE EM TODO ACESSO? SO EM ALGUNS USUARIOS?}}
**Desde quando**: {{QUANDO COMEÇOU A ACONTECER}}
**Impacto no negócio**: {{USUARIOS AFETADOS, FUNCIONALIDADE BLOQUEADA}}
**Workaround disponível**: {{SIM/NAO - DESCREVER}}

---

## Análise (preencher após investigação)

**Causa raiz identificada**: {{DESCREVER}}
**Módulos afetados**: {{LISTA}}
**Responsável pela correção**: {{NOME}}
**Previsão**: {{DATA OU SPRINT}}
```

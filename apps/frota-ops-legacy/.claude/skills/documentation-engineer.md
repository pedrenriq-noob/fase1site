# Especialista: Documentation Engineer

---

## 1. Objetivo

Criar e manter documentação técnica de alta qualidade que seja clara, precisa, atualizada e útil para todos os públicos-alvo do projeto.

---

## 2. Quando Utilizar

- Para criar documentação de novas features ou APIs
- Ao atualizar documentação desatualizada
- Para criar runbooks e guias operacionais
- Ao escrever o CHANGELOG de uma release
- Para criar guias de onboarding
- Ao documentar Architecture Decision Records (ADRs)
- Para revisar documentação existente quanto à precisão

---

## 3. Responsabilidades

- Escrever e revisar JSDoc para funções públicas
- Criar e manter READMEs de módulos
- Documentar APIs e Edge Functions
- Escrever e manter runbooks operacionais
- Criar guias de onboarding para novos membros
- Manter o CHANGELOG atualizado
- Criar ADRs quando solicitado pelo Arquiteto
- Revisar documentação quanto à clareza, precisão e completude
- Garantir que exemplos de código são funcionais e corretos

---

## 4. Limites

**O Documentation Engineer NÃO:**
- Toma decisões arquiteturais (Software Architect)
- Define requisitos de negócio
- Escreve código de produção
- Aprova PRs
- Decide o que deve ser documentado do ponto de vista de prioridade

---

## 5. O Que Revisar

- [ ] Documentação está atualizada com o código atual?
- [ ] Exemplos de código são funcionais e testados?
- [ ] JSDoc tem todos os parâmetros e retornos documentados?
- [ ] Casos de erro estão documentados?
- [ ] Pré-requisitos são claros?
- [ ] Terminologia é consistente com o restante da documentação?
- [ ] Links estão funcionando?
- [ ] A documentação é acessível para o público-alvo?

---

## 6. O Que Nunca Fazer

- Nunca publicar documentação com exemplos não testados
- Nunca deixar documentação desatualizada sem marcar como tal
- Nunca criar documentação genérica que não agrega valor específico
- Nunca assumir que o leitor conhece o contexto — seja explícito
- Nunca documentar "o quê" sem explicar "o porquê"

---

## 7. Checklist

### JSDoc
- [ ] Todas as funções públicas documentadas
- [ ] Parâmetros com tipo e descrição
- [ ] Valor de retorno documentado
- [ ] Exceções lançadas documentadas
- [ ] Pelo menos um exemplo prático

### README de Módulo
- [ ] Propósito do módulo claro
- [ ] Interface pública listada
- [ ] Dependências documentadas
- [ ] Configuração necessária explicada
- [ ] Limitações conhecidas listadas

### API Documentation
- [ ] Método e URL
- [ ] Autenticação necessária
- [ ] Parâmetros de request (body, query, path)
- [ ] Exemplos de request e response
- [ ] Códigos de erro e significados

---

## 8. Critérios de Aprovação

Documentação é aprovada quando:

1. **Precisão**: informações são tecnicamente corretas
2. **Exemplos**: todos os exemplos funcionam quando executados
3. **Completude**: cobre todos os casos de uso e erros comuns
4. **Clareza**: alguém sem contexto consegue seguir
5. **Atualização**: reflete o estado atual do código

---

## 9. Exemplos de Atuação

### Exemplo 1 — JSDoc Completo

```javascript
/**
 * Processa o pagamento de um pedido e registra a transação.
 *
 * Valida o pedido, chama o gateway de pagamento e registra o resultado.
 * Em caso de falha no gateway, realiza até `options.retries` tentativas
 * com backoff exponencial.
 *
 * @param {string} orderId - ID do pedido a ser pago (UUID v4)
 * @param {PaymentMethod} paymentMethod - Método de pagamento
 * @param {Object} [options] - Opções adicionais
 * @param {number} [options.retries=3] - Número de tentativas (1-5)
 * @param {boolean} [options.sendReceipt=true] - Enviar comprovante por e-mail
 * @returns {Promise<PaymentResult>} Resultado do processamento
 * @throws {ValidationError} Se o pedido não existir ou já estiver pago
 * @throws {PaymentGatewayError} Se o gateway rejeitar após todas as tentativas
 *
 * @example
 * // Pagamento por PIX
 * const result = await processPayment('order-uuid', {
 *   type: 'pix',
 *   pixKey: 'chave@email.com'
 * });
 * console.log(result.status); // 'approved'
 * console.log(result.pixQrCode); // string com QR Code PIX
 *
 * @example
 * // Pagamento por cartão sem envio de comprovante
 * const result = await processPayment(
 *   'order-uuid',
 *   { type: 'credit_card', token: 'tok_visa_...' },
 *   { sendReceipt: false }
 * );
 */
```

### Exemplo 2 — README de Módulo

```markdown
# Módulo: Sistema de Pagamentos

Gerencia o ciclo completo de pagamentos: validação, processamento, registro e notificação.

## Interface Pública

| Função | Descrição |
|--------|-----------|
| `processPayment(orderId, method, options?)` | Processa um pagamento |
| `refundPayment(transactionId, amount?)` | Inicia um estorno |
| `getPaymentStatus(transactionId)` | Consulta status de transação |

## Instalação e Configuração

Variáveis de ambiente necessárias:
```env
PAYMENT_GATEWAY_URL=https://api.gateway.com
PAYMENT_GATEWAY_KEY=sk_live_...
```

## Limitações Conhecidas

- Estornos parciais não são suportados (somente estorno total)
- Timeout de processamento: 30 segundos
- Issue #456: Pagamento por boleto tem delay de até 3 dias úteis para confirmação
```

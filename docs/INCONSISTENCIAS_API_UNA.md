# Inconsistências na Documentação da API UNA

Este documento detalha as divergências encontradas entre a documentação OpenAPI/Swagger e os exemplos funcionais fornecidos pela Digitro para integração com o sistema UNA.

> **Importante:** As informações dos "Exemplos Funcionais" foram testadas e validadas em ambiente de produção. A documentação OpenAPI apresenta erros que impedem a integração correta se seguida literalmente.

---

## Sumário

1. [Autenticação - Status Code de Resposta](#1-autenticação---status-code-de-resposta)
2. [Mensagem de Texto - Nome do Campo](#2-mensagem-de-texto---nome-do-campo)
3. [Envio de Arquivo - Campo de Destinatário](#3-envio-de-arquivo---campo-de-destinatário)
4. [Envio de Arquivo - Campo de Mensagem](#4-envio-de-arquivo---campo-de-mensagem)
5. [Autenticação - Formato do Token](#5-autenticação---formato-do-token)
6. [Headers Obrigatórios não Documentados](#6-headers-obrigatórios-não-documentados)
7. [Ordem dos Campos no FormData](#7-ordem-dos-campos-no-formdata)

---

## 1. Autenticação - Status Code de Resposta

### Endpoint: `POST /una/auth/v1/integration/login`

| Aspecto | OpenAPI Swagger | Comportamento Real |
|---------|-----------------|-------------------|
| Status de sucesso | `200 OK` | `401 Unauthorized` |
| Corpo da resposta | `{"challenge": "..."}` | `{"challenge": "..."}` |

### Problema

A documentação OpenAPI indica que uma requisição bem-sucedida retorna status `200`. Na prática, o endpoint **sempre retorna `401`**, mesmo quando a requisição é válida e o challenge é gerado corretamente.

### Exemplo OpenAPI (INCORRETO)
```yaml
responses:
  "200":
    description: "Chave de desafio criada"
```

### Comportamento Real
```
HTTP/1.1 401 Unauthorized
Content-Type: application/json

{"challenge":"LVIkI/9zjkyXPwIhZmPvirnQVXH3SDQSZ0Vw6sz97qc="}
```

### Impacto
Desenvolvedores que verificam `response.ok` ou `status === 200` terão suas implementações falhando, mesmo quando a API está funcionando corretamente.

---

## 2. Mensagem de Texto - Nome do Campo

### Endpoint: `POST /una/history/v1/chatMessages`

| Aspecto | OpenAPI Swagger | Exemplo Funcional |
|---------|-----------------|-------------------|
| Campo do texto | `message` | `text` |

### Schema OpenAPI (INCORRETO)
```json
{
  "chatMessage": {
    "id": "uuid",
    "chat": "destinatario",
    "message": "conteúdo da mensagem"  // ❌ ERRADO
  }
}
```

### Exemplo Funcional (CORRETO)
```javascript
const payload = {
  chatMessage: {
    id: messageId,
    chat: groupId,
    text: message,  // ✅ CORRETO
  },
};
```

### Observação
Curiosamente, o schema de **resposta** (`body_response_create_message`) documenta corretamente o campo como `text`, contradizendo o schema de **requisição**.

---

## 3. Envio de Arquivo - Campo de Destinatário

### Endpoint: `POST /una/history/v1/chatMessages/attachment`

| Aspecto | OpenAPI Swagger | Exemplo Funcional |
|---------|-----------------|-------------------|
| Campo do destinatário | `chat` | `to` |

### Schema OpenAPI (INCORRETO)
```json
{
  "chatMessage": {
    "id": "uuid",
    "chat": "destinatario",  // ❌ ERRADO
    "message": "texto"
  }
}
```

### Exemplo Funcional (CORRETO)
```javascript
const textMessage = {
  id: messageId,
  to: groupId,  // ✅ CORRETO
  text: message,
};
```

### Erro Retornado ao Usar `chat`
```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "child \"chatMessage\" fails because [child \"to\" fails because [\"to\" is required]]"
}
```

---

## 4. Envio de Arquivo - Campo de Mensagem

### Endpoint: `POST /una/history/v1/chatMessages/attachment`

| Aspecto | OpenAPI Swagger | Comportamento Real |
|---------|-----------------|-------------------|
| Campo de texto | `message` (obrigatório) | `text` (opcional) |
| Obrigatoriedade | Required | Opcional |

### Schema OpenAPI (INCORRETO)
```json
{
  "required": ["id", "chat", "message"]  // ❌ message é ERRADO e não é obrigatório
}
```

### Comportamento Real
- O campo `message` **não é aceito** (retorna erro de validação)
- O campo `text` é **opcional** e funciona corretamente
- É possível enviar arquivo sem nenhum texto

### Erro Retornado ao Usar `message`
```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "child \"chatMessage\" fails because [\"message\" is not allowed]"
}
```

---

## 5. Autenticação - Formato do Token

### Todos os Endpoints Autenticados

| Aspecto | OpenAPI Swagger | Exemplo Funcional |
|---------|-----------------|-------------------|
| Header | `token` (header customizado) | `cookie` |
| Formato | `__iunasid=token` | `__iunasid=token;` (com ponto e vírgula) |

### OpenAPI (INCORRETO)
```yaml
parameters:
  - name: token
    in: header
    example: "__iunasid=um_token_de_autenticacao"
```

### Exemplo Funcional (CORRETO)
```javascript
const headers = {
  'cookie': `${authToken};`,  // ✅ Usar 'cookie', não 'token'
  // ...
}
```

### Observação
O ponto e vírgula no final do valor do cookie é necessário conforme os exemplos funcionais.

---

## 6. Headers Obrigatórios não Documentados

### Endpoint: `POST /una/history/v1/chatMessages`

| Header | OpenAPI Swagger | Exemplo Funcional |
|--------|-----------------|-------------------|
| `Accept` | Não documentado | `application/json` |

### Exemplo Funcional
```javascript
const headers = {
  'cookie': `${authToken};`,
  'Accept': 'application/json',  // ✅ Necessário mas não documentado
}
```

### Impacto
A ausência do header `Accept` pode causar comportamentos inesperados em algumas implementações.

---

## 7. Ordem dos Campos no FormData

### Endpoint: `POST /una/history/v1/chatMessages/attachment`

| Aspecto | OpenAPI Swagger | Exemplo Funcional |
|---------|-----------------|-------------------|
| Ordem dos campos | Não especificada | `file` primeiro, `chatMessage` depois |

### OpenAPI
Não menciona ordem específica para os campos do multipart/form-data.

### Exemplo Funcional (CORRETO)
```javascript
const form = new FormData();
form.append('file', readStream);           // ✅ Primeiro
form.append('chatMessage', JSON.stringify(textMessage));  // ✅ Segundo
```

### Impacto
Inverter a ordem pode causar falhas na validação do servidor.

---

## Resumo das Correções Necessárias

| # | Endpoint | Campo OpenAPI | Campo Correto |
|---|----------|---------------|---------------|
| 1 | `/login` | Status 200 | Status 401 |
| 2 | `/chatMessages` | `message` | `text` |
| 3 | `/chatMessages/attachment` | `chat` | `to` |
| 4 | `/chatMessages/attachment` | `message` (required) | `text` (opcional) |
| 5 | Todos | Header `token` | Header `cookie` |
| 6 | `/chatMessages` | - | Header `Accept` |
| 7 | `/chatMessages/attachment` | - | Ordem: file, chatMessage |

---

## Recomendações

1. **Sempre priorizar os exemplos funcionais** em JavaScript/Node.js fornecidos pela Digitro sobre a documentação OpenAPI.

2. **Implementar logging detalhado** durante o desenvolvimento para identificar rapidamente divergências.

3. **Testar cada endpoint individualmente** antes de integrar, validando os campos aceitos.

4. **Manter este documento atualizado** conforme novas inconsistências forem descobertas ou correções forem aplicadas pela Digitro.

---

## Contato

Para reportar problemas ou solicitar correções na documentação oficial:
- Email: equipeuna@digitro.com.br

---

*Documento gerado em: Fevereiro de 2025*
*Baseado em testes realizados com o servidor: consultor.saas.digitro.cloud*

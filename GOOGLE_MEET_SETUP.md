# Configuração do Google Meet - Guia de Diagnóstico

## Status da Implementação

✅ Banco de dados configurado com colunas para tokens do Google
✅ Edge Function criada e deployada
✅ Interface de conexão implementada
✅ Secrets do Google configurados (GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET)

## Como Testar

### 1. Conectar Conta Google (Atendente)

1. Faça login como **Atendente**
2. Vá para **Configurações**
3. Clique em **"Conectar com Google"**
4. Autorize o acesso ao Google Calendar
5. Após autorizar, você será redirecionado de volta ao sistema
6. O status deve mostrar "Conta Google Conectada"

### 2. Fazer um Agendamento (Cliente)

1. Acesse a página pública de agendamentos
2. Escolha uma data e horário
3. Preencha o formulário com seus dados
4. Clique em "Confirmar Agendamento"

### 3. Verificar o Link do Meet

**Se o atendente conectou o Google:**
- O link deve começar com `https://meet.google.com/` seguido de um código real (ex: `abc-defg-hij`)
- O evento deve aparecer no Google Calendar do atendente
- O cliente deve receber um convite por email

**Se o atendente NÃO conectou o Google:**
- O link será temporário (aleatório)
- Nenhum evento será criado no Calendar

## Diagnóstico de Problemas

### Problema: Link temporário mesmo após conectar Google

**Verifique o Console do Navegador:**
```
1. Abra o DevTools (F12)
2. Vá para a aba "Console"
3. Faça um agendamento
4. Procure por mensagens como:
   - "Calling Google Meet API for attendant: [ID]"
   - "Google Meet API response: [response]"
   - "Real Google Meet link created: [link]"
```

**Mensagens de erro comuns:**

- **"Google account not connected"**: O atendente não conectou o Google ou os tokens não foram salvos
- **"Failed to refresh token"**: O refresh token expirou ou é inválido
- **"Failed to create Google Meet link - conferenceData not generated"**: O Google Calendar API não gerou o link do Meet

### Verificar se os Tokens foram Salvos

Execute no DevTools Console:
```javascript
// No dashboard do atendente, execute:
const { data } = await supabase.from('profiles').select('google_connected, google_email').eq('id', (await supabase.auth.getUser()).data.user.id).single();
console.log(data);
```

**Resultado esperado:**
```javascript
{
  google_connected: true,
  google_email: "seu-email@gmail.com"
}
```

### Verificar Logs da Edge Function

Os logs da Edge Function mostrarão detalhes sobre a criação do evento. Procure por:
- "Calendar event created: [evento completo]"
- "Meet link generated: [link]"

## Configuração Necessária no Google Cloud Console

Para que o Google Meet funcione, você precisa:

1. **OAuth 2.0 Client ID configurado** ✅ (já feito)
2. **Google Calendar API habilitada**
3. **Scopes corretos:** `https://www.googleapis.com/auth/calendar.events`
4. **Redirect URIs configurados** para incluir:
   - `http://localhost:5173/auth/callback` (desenvolvimento)
   - Seu domínio de produção

## Próximos Passos

1. **Teste a conexão do Google** - Conecte sua conta como atendente
2. **Faça um agendamento de teste** - Use um email real para receber o convite
3. **Verifique os logs** - Olhe o console do navegador e os logs da Edge Function
4. **Confirme no Google Calendar** - O evento deve aparecer no seu calendário

## Fallback Automático

O sistema tem um fallback automático:
- Se o atendente não tiver Google conectado → Link temporário
- Se houver erro na API do Google → Link temporário
- O agendamento SEMPRE é salvo, independente do tipo de link

## Suporte

Se ainda houver problemas:
1. Copie as mensagens do console do navegador
2. Verifique se o evento foi criado no Google Calendar
3. Confirme que os escopos corretos foram autorizados

# 🔐 Configuração do Google OAuth - GUIA COMPLETO

## ⚠️ PROBLEMA IDENTIFICADO

Você está usando **Supabase Auth** para fazer OAuth com Google. Isso significa que o fluxo de autenticação passa pelos servidores do Supabase, e você precisa configurar as URIs de redirecionamento CORRETAMENTE no Google Cloud Console.

## 📋 URIs de Redirecionamento Autorizados

Adicione TODAS estas URIs no **Google Cloud Console** → **APIs & Services** → **Credentials** → Seu OAuth 2.0 Client ID:

### 1. Desenvolvimento Local
```
http://localhost:5173/auth/callback
```

### 2. Supabase Auth (ESSENCIAL!)
```
https://iltnqfbyrdcmlhrlwuwn.supabase.co/auth/v1/callback
```

### 3. Produção (quando deployar)
```
https://seu-dominio.com/auth/callback
```

## 🔧 Passo a Passo - Google Cloud Console

### 1. Acesse o Google Cloud Console
🔗 https://console.cloud.google.com/

### 2. Selecione ou Crie um Projeto
- Se já tem um projeto → selecione
- Se não → crie um novo projeto

### 3. Habilite a Google Calendar API
1. Vá em **APIs & Services** → **Library**
2. Procure por "Google Calendar API"
3. Clique em **"Enable"**

### 4. Configure as Credenciais OAuth 2.0

**4.1. Vá em APIs & Services → Credentials**

**4.2. Crie ou Edite o OAuth 2.0 Client ID**
- Se não existe → clique em **"+ CREATE CREDENTIALS"** → **"OAuth client ID"**
- Se já existe → clique no nome para editar

**4.3. Tipo de Aplicação:**
- Application type: **Web application**
- Name: "Scheduling System" (ou qualquer nome)

**4.4. Authorized JavaScript origins:**
```
http://localhost:5173
https://iltnqfbyrdcmlhrlwuwn.supabase.co
```

**4.5. Authorized redirect URIs (COPIE EXATAMENTE):**
```
http://localhost:5173/auth/callback
https://iltnqfbyrdcmlhrlwuwn.supabase.co/auth/v1/callback
```

**4.6. Clique em SAVE**

### 5. Configure a OAuth Consent Screen

**5.1. Vá em APIs & Services → OAuth consent screen**

**5.2. Configure:**
- User Type: **External** (para testes) ou **Internal** (se for G Suite)
- App name: "Scheduling System"
- User support email: seu email
- Developer contact: seu email

**5.3. Scopes (Adicione):**
```
https://www.googleapis.com/auth/calendar.events
https://www.googleapis.com/auth/userinfo.email
https://www.googleapis.com/auth/userinfo.profile
```

**5.4. Test users (se External):**
- Adicione seu email como test user
- Adicione emails de quem vai testar

**5.5. Clique em SAVE AND CONTINUE até finalizar**

### 6. Copie as Credenciais

Após criar/editar o OAuth Client ID, você verá:
- **Client ID**: algo como `123456789-abc.apps.googleusercontent.com`
- **Client Secret**: algo como `GOCSPX-abc123def456`

⚠️ **IMPORTANTE**: Você já configurou estes secrets no Supabase Edge Functions (eles estão lá), mas se precisar reconfigurar, use os comandos do Supabase CLI ou o dashboard.

## 🔍 Verificação Rápida

Execute este checklist:

- [ ] Google Calendar API está habilitada
- [ ] OAuth 2.0 Client ID criado
- [ ] Redirect URI do Supabase adicionada: `https://iltnqfbyrdcmlhrlwuwn.supabase.co/auth/v1/callback`
- [ ] Redirect URI local adicionada: `http://localhost:5173/auth/callback`
- [ ] Scopes incluem `calendar.events`
- [ ] OAuth Consent Screen configurada
- [ ] Seu email está como test user (se External)

## 🧪 Como Testar Depois

1. **Limpe o cache do navegador** (Ctrl+Shift+Del)
2. Faça logout do sistema
3. Faça login como **Atendente**
4. Vá em **Configurações**
5. Clique em **"Conectar com Google"**
6. Você será redirecionado para o Google
7. **Autorize o acesso ao Calendar**
8. Você será redirecionado de volta ao sistema
9. Deve aparecer "Conta Google Conectada ✓"

## 🐛 Problemas Comuns

### Erro: "redirect_uri_mismatch"
**Causa**: A URI de redirecionamento não está configurada no Google Cloud Console

**Solução**:
1. Copie a URI exata do erro
2. Adicione ela no Google Cloud Console
3. Aguarde 5 minutos para propagar
4. Tente novamente

### Erro: "access_denied"
**Causa**: Você não está na lista de test users OU rejeitou a autorização

**Solução**:
1. Adicione seu email como test user
2. Tente novamente e clique em "Allow"

### Erro: "invalid_client"
**Causa**: Client ID ou Client Secret estão incorretos

**Solução**:
1. Verifique que copiou corretamente do Google Cloud Console
2. Reconfigure os secrets no Supabase

### Link do Meet não é criado
**Causa**: Tokens não foram salvos OU Google Calendar API não está habilitada

**Solução**:
1. Verifique que a Google Calendar API está habilitada
2. Reconecte o Google
3. Verifique o console do navegador por erros
4. Verifique os logs da Edge Function

## 📝 Resumo Visual

```
FLUXO DO OAUTH:

1. Usuário clica "Conectar com Google"
   ↓
2. Sistema redireciona para Google (via Supabase Auth)
   ↓
3. Usuário autoriza o acesso
   ↓
4. Google redireciona para: https://iltnqfbyrdcmlhrlwuwn.supabase.co/auth/v1/callback
   ↓
5. Supabase processa os tokens
   ↓
6. Supabase redireciona para: http://localhost:5173/auth/callback
   ↓
7. Sistema salva os tokens no banco
   ↓
8. Pronto! Google conectado ✓
```

## 🚀 Depois de Configurar

Após configurar tudo corretamente:

1. O link do Google Meet será REAL
2. Formato: `https://meet.google.com/abc-defg-hij`
3. O evento aparecerá no Google Calendar do atendente
4. O cliente receberá convite por email

## ❓ Ainda não funciona?

Se mesmo após seguir TODOS os passos ainda não funcionar:

1. Abra o DevTools (F12)
2. Vá na aba "Console"
3. Tente conectar o Google
4. Copie TODOS os erros que aparecerem
5. Verifique se os tokens foram salvos:
   ```javascript
   const { data } = await supabase.from('profiles').select('google_connected, google_email').eq('id', (await supabase.auth.getUser()).data.user.id).single();
   console.log(data);
   ```

---

**Última atualização**: 24 de Março de 2026
**Supabase URL**: https://iltnqfbyrdcmlhrlwuwn.supabase.co

# 🔧 Troubleshooting - Google OAuth no Bolt.new

## ❌ Erro: "Unable to exchange external code: 4/0A..."

Este erro acontece porque o Google OAuth está tentando redirecionar para `localhost`, mas você está usando o **Bolt.new WebContainer**.

---

## ✅ SOLUÇÃO - Passo a Passo

### 1️⃣ Descubra a URL do seu Bolt.new

Copie a URL que aparece na barra de endereço do navegador quando você acessa o app.

Exemplo:
```
https://stackblitz-abc123.webcontainer-api.io
```

### 2️⃣ Configure o Supabase Dashboard

**Acesse:**
🔗 https://supabase.com/dashboard/project/iltnqfbyrdcmlhrlwuwn/auth/url-configuration

**Configure 2 campos:**

**a) Site URL**
```
https://[sua-url].webcontainer-api.io
```

**b) Redirect URLs** (adicione esta linha):
```
https://[sua-url].webcontainer-api.io/**
```

⚠️ **IMPORTANTE**: O `/**` no final permite redirecionamentos para qualquer subrota!

**Clique em SAVE**

---

### 3️⃣ Configure o Google Cloud Console

**Acesse:**
🔗 https://console.cloud.google.com/apis/credentials

**Clique no seu OAuth 2.0 Client ID**

**Em "Authorized redirect URIs", adicione 2 URIs:**

```
https://iltnqfbyrdcmlhrlwuwn.supabase.co/auth/v1/callback
```

```
https://[sua-url].webcontainer-api.io/auth/callback
```

⚠️ Substitua `[sua-url]` pela URL real do seu Bolt.new

**Clique em SAVE**

**Aguarde 5 minutos** para as mudanças propagarem

---

### 4️⃣ Limpe o Cache e Teste

1. Abra o DevTools (F12)
2. Clique com botão direito no botão de reload
3. Selecione **"Empty Cache and Hard Reload"**
4. Feche todas as abas do Supabase e Google
5. Volte ao app
6. Faça login como **Atendente**
7. Clique em **"Conectar com Google"**

---

## 🔍 Como Verificar se Funcionou

### ✅ Sucesso:
1. Você será redirecionado para o Google
2. Após autorizar, voltará para o app
3. Verá a mensagem: **"Google conectado com sucesso!"**
4. Será redirecionado automaticamente para o dashboard
5. Em "Configurações", aparecerá: **"Conta Google Conectada ✓"**

### ❌ Ainda não funciona?

**Erro comum: redirect_uri_mismatch**

Se aparecer este erro:
1. Copie a URI EXATA que aparece na mensagem de erro
2. Adicione ela no Google Cloud Console
3. Aguarde 5 minutos
4. Tente novamente

---

## 🐛 Debug Avançado

Se mesmo após todos os passos ainda não funcionar:

### 1. Verifique os Tokens no Console

Abra o DevTools (F12) → Console → cole este código:

```javascript
const { data: { session } } = await supabase.auth.getSession();
console.log('Session:', session);
console.log('Provider Token:', session?.provider_token);
```

**Resultado esperado:**
- `provider_token` deve existir e ser uma string longa

### 2. Verifique se os Tokens foram Salvos

```javascript
const { data } = await supabase
  .from('profiles')
  .select('google_connected, google_email, google_access_token')
  .eq('id', (await supabase.auth.getUser()).data.user.id)
  .single();

console.log('Profile:', data);
```

**Resultado esperado:**
- `google_connected`: `true`
- `google_email`: seu email do Google
- `google_access_token`: uma string longa

### 3. Verifique os Logs da Edge Function

Quando fizer um agendamento, abra o DevTools → Console.

Se aparecer erro 401 ou 403, significa que os tokens não estão sendo passados corretamente.

---

## 📝 Checklist Final

Antes de testar novamente, confirme:

- [ ] URL do Bolt.new copiada corretamente
- [ ] Site URL configurada no Supabase Dashboard
- [ ] Redirect URLs configurada no Supabase Dashboard (com /**)
- [ ] URI do Supabase adicionada no Google Cloud Console
- [ ] URI do Bolt.new adicionada no Google Cloud Console
- [ ] Google Calendar API habilitada
- [ ] OAuth Consent Screen configurada
- [ ] Seu email como test user (se External)
- [ ] Aguardou 5 minutos após salvar no Google Cloud Console
- [ ] Cache do navegador limpo

---

## 🎯 Resultado Final Esperado

Após configurar corretamente:

1. **Conexão do Google funciona** ✓
2. **Links do Meet são REAIS** ✓
3. Formato: `https://meet.google.com/abc-defg-hij`
4. Evento aparece no Google Calendar do atendente
5. Cliente recebe convite por email automaticamente

---

## 💡 Dica Extra

Se você mudar a URL do Bolt.new (por exemplo, ao fazer refresh do preview), precisará:

1. Atualizar a Site URL no Supabase Dashboard
2. Atualizar a Redirect URL no Supabase Dashboard
3. Adicionar a nova URI no Google Cloud Console

---

**Última atualização**: 24 de Março de 2026
**Supabase URL**: https://iltnqfbyrdcmlhrlwuwn.supabase.co

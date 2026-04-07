import { Resend } from 'npm:resend@3.2.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface BookingConfirmationData {
  clientName: string;
  clientEmail: string;
  meetingType: string;
  date: string;
  time: string;
  duration: number;
  meetLink?: string;
}

interface AttendantNotificationData {
  attendantName: string;
  attendantEmail: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  meetingType: string;
  date: string;
  time: string;
  duration: number;
  meetLink?: string;
}

interface AttendantCredentialsData {
  attendantName: string;
  attendantEmail: string;
  temporaryPassword: string;
  loginUrl: string;
}

interface CancellationData {
  clientName: string;
  clientEmail: string;
  meetingType: string;
  date: string;
  time: string;
}

interface EmailRequest {
  type: 'booking-confirmation' | 'attendant-notification' | 'attendant-credentials' | 'cancellation';
  data: BookingConfirmationData | AttendantNotificationData | AttendantCredentialsData | CancellationData;
}

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

function getBookingConfirmationEmail(data: BookingConfirmationData) {
  const subject = `Confirmação de Agendamento - ${data.meetingType}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: white; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px; }
    .info-box { background: #f7fafc; border-left: 4px solid #667eea; padding: 15px; margin: 20px 0; }
    .info-row { margin: 10px 0; }
    .label { font-weight: 600; color: #4a5568; }
    .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .button-primary { display: inline-block; background: #f59e0b; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin: 20px 0; font-weight: 500; font-size: 14px; }
    .urgent-box { background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px; padding: 16px; margin: 25px 0; }
    .footer { text-align: center; color: #718096; font-size: 14px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">✅ Agendamento Confirmado</h1>
    </div>
    <div class="content">
      <p>Olá <strong>${data.clientName}</strong>,</p>
      <p>Seu agendamento foi confirmado com sucesso!</p>

      <div class="info-box">
        <div class="info-row">
          <span class="label">📅 Data:</span> ${data.date}
        </div>
        <div class="info-row">
          <span class="label">🕐 Horário:</span> ${data.time}
        </div>
        <div class="info-row">
          <span class="label">⏱️ Duração:</span> ${data.duration} minutos
        </div>
        <div class="info-row">
          <span class="label">📋 Tipo de Reunião:</span> ${data.meetingType}
        </div>
      </div>

      ${data.meetLink ? `
        <p><strong>Link da Reunião:</strong></p>
        <a href="${data.meetLink}" class="button">Entrar na Reunião</a>
        <p style="font-size: 14px; color: #718096;">Ou copie e cole este link: <br><code>${data.meetLink}</code></p>
      ` : ''}

      <div class="urgent-box">
        <p style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #92400e;">
          ⚠️ Ação obrigatória: preencha o Formulário de Aplicação do DSM antes da reunião.
        </p>
        <a href="https://form.typeform.com/to/k7QUgwq9" class="button-primary">Preencher formulário</a>
      </div>

      <p style="margin-top: 30px;">Caso precise cancelar ou reagendar, entre em contato conosco.</p>
      <p>Até breve!</p>
    </div>
    <div class="footer">
      <p>Este é um e-mail automático. Por favor, não responda.</p>
    </div>
  </div>
</body>
</html>
  `;

  return { subject, html };
}

function getAttendantNotificationEmail(data: AttendantNotificationData) {
  const subject = `Nova Reunião Agendada - ${data.meetingType}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: white; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px; }
    .info-box { background: #f7fafc; border-left: 4px solid #667eea; padding: 15px; margin: 20px 0; }
    .info-row { margin: 10px 0; }
    .label { font-weight: 600; color: #4a5568; }
    .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; color: #718096; font-size: 14px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">🔔 Nova Reunião Agendada</h1>
    </div>
    <div class="content">
      <p>Olá <strong>${data.attendantName}</strong>,</p>
      <p>Uma nova reunião foi agendada com você!</p>

      <div class="info-box">
        <h3 style="margin-top: 0; color: #667eea;">Informações da Reunião</h3>
        <div class="info-row">
          <span class="label">📅 Data:</span> ${data.date}
        </div>
        <div class="info-row">
          <span class="label">🕐 Horário:</span> ${data.time}
        </div>
        <div class="info-row">
          <span class="label">⏱️ Duração:</span> ${data.duration} minutos
        </div>
        <div class="info-row">
          <span class="label">📋 Tipo:</span> ${data.meetingType}
        </div>
      </div>

      <div class="info-box">
        <h3 style="margin-top: 0; color: #667eea;">Informações do Cliente</h3>
        <div class="info-row">
          <span class="label">👤 Nome:</span> ${data.clientName}
        </div>
        <div class="info-row">
          <span class="label">📧 E-mail:</span> <a href="mailto:${data.clientEmail}">${data.clientEmail}</a>
        </div>
        ${data.clientPhone ? `
          <div class="info-row">
            <span class="label">📱 Telefone:</span> ${data.clientPhone}
          </div>
        ` : ''}
      </div>

      ${data.meetLink ? `
        <p><strong>Link da Reunião:</strong></p>
        <a href="${data.meetLink}" class="button">Entrar na Reunião</a>
        <p style="font-size: 14px; color: #718096;">Ou copie e cole este link: <br><code>${data.meetLink}</code></p>
      ` : ''}

      <p style="margin-top: 30px;">Prepare-se para a reunião e esteja disponível no horário agendado.</p>
    </div>
    <div class="footer">
      <p>Este é um e-mail automático. Por favor, não responda.</p>
    </div>
  </div>
</body>
</html>
  `;

  return { subject, html };
}

function getAttendantCredentialsEmail(data: AttendantCredentialsData) {
  const subject = 'Bem-vindo! Suas Credenciais de Acesso';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: white; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px; }
    .credentials-box { background: #fef5e7; border: 2px solid #f39c12; border-radius: 6px; padding: 20px; margin: 20px 0; }
    .credential-row { margin: 15px 0; padding: 10px; background: white; border-radius: 4px; }
    .label { font-weight: 600; color: #4a5568; display: block; margin-bottom: 5px; }
    .value { font-family: monospace; font-size: 16px; color: #2c3e50; background: #f7fafc; padding: 8px; border-radius: 4px; display: inline-block; }
    .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
    .footer { text-align: center; color: #718096; font-size: 14px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">🎉 Bem-vindo ao Sistema</h1>
    </div>
    <div class="content">
      <p>Olá <strong>${data.attendantName}</strong>,</p>
      <p>Sua conta foi criada com sucesso! Abaixo estão suas credenciais de acesso:</p>

      <div class="credentials-box">
        <h3 style="margin-top: 0; color: #f39c12;">🔐 Credenciais de Acesso</h3>
        <div class="credential-row">
          <span class="label">E-mail:</span>
          <span class="value">${data.attendantEmail}</span>
        </div>
        <div class="credential-row">
          <span class="label">Senha Temporária:</span>
          <span class="value">${data.temporaryPassword}</span>
        </div>
      </div>

      <div class="warning">
        <strong>⚠️ Importante:</strong>
        <ul style="margin: 10px 0; padding-left: 20px;">
          <li>Esta é uma senha temporária</li>
          <li>Recomendamos que você altere sua senha após o primeiro login</li>
          <li>Mantenha suas credenciais em segurança</li>
        </ul>
      </div>

      <a href="${data.loginUrl}" class="button">Acessar o Sistema</a>

      <p style="margin-top: 30px;">Se você tiver alguma dúvida, entre em contato com o administrador.</p>
    </div>
    <div class="footer">
      <p>Este é um e-mail automático. Por favor, não responda.</p>
    </div>
  </div>
</body>
</html>
  `;

  return { subject, html };
}

function getCancellationEmail(data: CancellationData) {
  const subject = `Agendamento Cancelado - ${data.meetingType}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #f56565 0%, #c53030 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: white; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px; }
    .info-box { background: #fff5f5; border-left: 4px solid #f56565; padding: 15px; margin: 20px 0; }
    .info-row { margin: 10px 0; }
    .label { font-weight: 600; color: #4a5568; }
    .footer { text-align: center; color: #718096; font-size: 14px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">❌ Agendamento Cancelado</h1>
    </div>
    <div class="content">
      <p>Olá <strong>${data.clientName}</strong>,</p>
      <p>Seu agendamento foi cancelado.</p>

      <div class="info-box">
        <h3 style="margin-top: 0; color: #c53030;">Informações do Agendamento Cancelado</h3>
        <div class="info-row">
          <span class="label">📅 Data:</span> ${data.date}
        </div>
        <div class="info-row">
          <span class="label">🕐 Horário:</span> ${data.time}
        </div>
        <div class="info-row">
          <span class="label">📋 Tipo de Reunião:</span> ${data.meetingType}
        </div>
      </div>

      <p style="margin-top: 30px;">Se desejar fazer um novo agendamento, entre em contato conosco.</p>
    </div>
    <div class="footer">
      <p>Este é um e-mail automático. Por favor, não responda.</p>
    </div>
  </div>
</body>
</html>
  `;

  return { subject, html };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { type, data }: EmailRequest = await req.json();

    let emailContent: { subject: string; html: string };
    let toEmail: string;

    switch (type) {
      case 'booking-confirmation': {
        const bookingData = data as BookingConfirmationData;
        emailContent = getBookingConfirmationEmail(bookingData);
        toEmail = bookingData.clientEmail;
        break;
      }
      case 'attendant-notification': {
        const notificationData = data as AttendantNotificationData;
        emailContent = getAttendantNotificationEmail(notificationData);
        toEmail = notificationData.attendantEmail;
        break;
      }
      case 'attendant-credentials': {
        const credentialsData = data as AttendantCredentialsData;
        emailContent = getAttendantCredentialsEmail(credentialsData);
        toEmail = credentialsData.attendantEmail;
        break;
      }
      case 'cancellation': {
        const cancellationData = data as CancellationData;
        emailContent = getCancellationEmail(cancellationData);
        toEmail = cancellationData.clientEmail;
        break;
      }
      default:
        throw new Error(`Unknown email type: ${type}`);
    }

    const result = await resend.emails.send({
      from: 'Sistema de Agendamentos <onboarding@resend.dev>',
      to: [toEmail],
      subject: emailContent.subject,
      html: emailContent.html,
    });

    return new Response(
      JSON.stringify({ success: true, result }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error sending email:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});

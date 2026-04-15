import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface EventRequest {
  attendantId: string;
  clientName: string;
  clientEmail: string;
  startTime: string;
  duration: number;
  meetingType: string;
}

interface GoogleTokens {
  google_access_token: string | null;
  google_refresh_token: string | null;
  google_token_expires_at: string | null;
}

async function refreshGoogleToken(refreshToken: string): Promise<{ access_token: string; expires_in: number }> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: Deno.env.get('GOOGLE_CLIENT_ID') || '',
      client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET') || '',
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to refresh token: ${error}`);
  }

  return await response.json();
}

async function createGoogleCalendarEvent(
  accessToken: string,
  eventDetails: {
    summary: string;
    description: string;
    startTime: string;
    endTime: string;
    attendees: string[];
  }
) {
  const event = {
    summary: eventDetails.summary,
    description: eventDetails.description,
    start: {
      dateTime: eventDetails.startTime,
      timeZone: 'America/Sao_Paulo',
    },
    end: {
      dateTime: eventDetails.endTime,
      timeZone: 'America/Sao_Paulo',
    },
    attendees: eventDetails.attendees.map(email => ({ email })),
    conferenceData: {
      createRequest: {
        requestId: crypto.randomUUID(),
        conferenceSolutionKey: {
          type: 'hangoutsMeet',
        },
      },
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 24 * 60 },
        { method: 'popup', minutes: 30 },
      ],
    },
  };

  const response = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create event: ${error}`);
  }

  return await response.json();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { attendantId, clientName, clientEmail, startTime, duration, meetingType }: EventRequest = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    console.log('[create-google-meet-event] Fetching tokens for attendantId:', attendantId);

    const profilesRes = await fetch(
      `${supabaseUrl}/rest/v1/profiles?id=eq.${attendantId}&select=google_access_token,google_refresh_token,google_token_expires_at,google_connected`,
      {
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
      }
    );

    const profilesData = await profilesRes.json();
    console.log('[create-google-meet-event] Profiles query result:', JSON.stringify(profilesData));

    if (!Array.isArray(profilesData) || profilesData.length === 0) {
      throw new Error(`Atendente não encontrado no banco de dados (id: ${attendantId})`);
    }

    const attendantTokens: GoogleTokens = profilesData[0];

    if (!attendantTokens.google_access_token || !attendantTokens.google_refresh_token) {
      throw new Error('O atendente selecionado não tem o Google conectado. Por favor, solicite que o atendente conecte sua conta Google no painel.');
    }

    let accessToken = attendantTokens.google_access_token;

    const expiresAt = attendantTokens.google_token_expires_at
      ? new Date(attendantTokens.google_token_expires_at).getTime()
      : 0;

    if (expiresAt < Date.now()) {
      const refreshedTokens = await refreshGoogleToken(attendantTokens.google_refresh_token);
      accessToken = refreshedTokens.access_token;

      const newExpiresAt = new Date(Date.now() + refreshedTokens.expires_in * 1000).toISOString();

      await fetch(
        `${supabaseUrl}/rest/v1/profiles?id=eq.${attendantId}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({
            google_access_token: accessToken,
            google_token_expires_at: newExpiresAt,
          }),
        }
      );
    }

    const start = new Date(startTime);
    const end = new Date(start.getTime() + duration * 60000);

    const calendarEvent = await createGoogleCalendarEvent(accessToken, {
      summary: `${meetingType} - ${clientName}`,
      description: `Reunião agendada via sistema de agendamentos.\n\nCliente: ${clientName}\nEmail: ${clientEmail}`,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      attendees: [clientEmail],
    });

    console.log('Calendar event created:', JSON.stringify(calendarEvent, null, 2));

    let meetLink = calendarEvent.hangoutLink;

    if (!meetLink && calendarEvent.conferenceData) {
      const videoEntry = calendarEvent.conferenceData.entryPoints?.find(
        (ep: any) => ep.entryPointType === 'video'
      );
      meetLink = videoEntry?.uri;
    }

    if (!meetLink) {
      console.error('No meet link found in response:', JSON.stringify(calendarEvent, null, 2));
      throw new Error('Failed to create Google Meet link - conferenceData not generated');
    }

    console.log('Meet link generated:', meetLink);

    return new Response(
      JSON.stringify({
        success: true,
        meetLink,
        eventId: calendarEvent.id,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    console.error('Error creating Google Meet event:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error',
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

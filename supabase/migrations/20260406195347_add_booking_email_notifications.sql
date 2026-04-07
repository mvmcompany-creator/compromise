/*
  # Add Email Notification Triggers for Bookings

  1. Changes
    - Create trigger to send confirmation email to client when booking is created
    - Create trigger to send notification email to attendant when booking is created
    - Triggers call the send-email edge function automatically

  2. Notes
    - Uses the current bookings schema: date, time, client_name, client_email, client_phone, assigned_to, meeting_type, meet_link
    - Calls the deployed send-email edge function via HTTP POST
    - Only triggers for confirmed bookings
*/

-- Function to send booking confirmation email to client
CREATE OR REPLACE FUNCTION notify_client_booking_created()
RETURNS TRIGGER AS $$
DECLARE
  v_supabase_url TEXT;
  v_service_role_key TEXT;
  v_payload JSONB;
  v_response JSONB;
BEGIN
  -- Only send for confirmed bookings
  IF NEW.status != 'confirmed' THEN
    RETURN NEW;
  END IF;

  -- Get Supabase URL and service role key from environment
  v_supabase_url := current_setting('app.settings', true)::jsonb->>'supabase_url';
  v_service_role_key := current_setting('app.settings', true)::jsonb->>'service_role_key';

  -- If not found in app.settings, try direct settings (fallback)
  IF v_supabase_url IS NULL THEN
    v_supabase_url := 'https://zaydjjnbotpypndqcjez.supabase.co';
  END IF;

  -- Build email payload for client
  v_payload := jsonb_build_object(
    'type', 'booking-confirmation',
    'data', jsonb_build_object(
      'clientName', NEW.client_name,
      'clientEmail', NEW.client_email,
      'meetingType', NEW.meeting_type,
      'date', TO_CHAR(NEW.date::date, 'DD/MM/YYYY'),
      'time', NEW.time,
      'duration', 30,
      'meetLink', NEW.meet_link
    )
  );

  -- Call the send-email edge function
  PERFORM net.http_post(
    url := v_supabase_url || '/functions/v1/send-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(v_service_role_key, '')
    ),
    body := v_payload::text
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the insert
  RAISE WARNING 'Failed to send client email: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to send booking notification email to attendant
CREATE OR REPLACE FUNCTION notify_attendant_booking_created()
RETURNS TRIGGER AS $$
DECLARE
  v_supabase_url TEXT;
  v_service_role_key TEXT;
  v_attendant_name TEXT;
  v_attendant_email TEXT;
  v_payload JSONB;
BEGIN
  -- Only send for confirmed bookings with assigned attendant
  IF NEW.status != 'confirmed' OR NEW.assigned_to IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get attendant information
  SELECT full_name, email
  INTO v_attendant_name, v_attendant_email
  FROM profiles
  WHERE id = NEW.assigned_to;

  -- If attendant not found, skip notification
  IF v_attendant_email IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get Supabase URL and service role key
  v_supabase_url := current_setting('app.settings', true)::jsonb->>'supabase_url';
  v_service_role_key := current_setting('app.settings', true)::jsonb->>'service_role_key';

  -- Fallback URL
  IF v_supabase_url IS NULL THEN
    v_supabase_url := 'https://zaydjjnbotpypndqcjez.supabase.co';
  END IF;

  -- Build email payload for attendant
  v_payload := jsonb_build_object(
    'type', 'attendant-notification',
    'data', jsonb_build_object(
      'attendantName', v_attendant_name,
      'attendantEmail', v_attendant_email,
      'clientName', NEW.client_name,
      'clientEmail', NEW.client_email,
      'clientPhone', NEW.client_phone,
      'meetingType', NEW.meeting_type,
      'date', TO_CHAR(NEW.date::date, 'DD/MM/YYYY'),
      'time', NEW.time,
      'duration', 30,
      'meetLink', NEW.meet_link
    )
  );

  -- Call the send-email edge function
  PERFORM net.http_post(
    url := v_supabase_url || '/functions/v1/send-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(v_service_role_key, '')
    ),
    body := v_payload::text
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the insert
  RAISE WARNING 'Failed to send attendant email: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_notify_client_booking ON bookings;
DROP TRIGGER IF EXISTS trigger_notify_attendant_booking ON bookings;

-- Create trigger for client notification (runs after insert)
CREATE TRIGGER trigger_notify_client_booking
  AFTER INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION notify_client_booking_created();

-- Create trigger for attendant notification (runs after insert)
CREATE TRIGGER trigger_notify_attendant_booking
  AFTER INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION notify_attendant_booking_created();
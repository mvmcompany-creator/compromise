/*
  # Fix Email Notification System with pg_net

  1. Changes
    - Enable pg_net extension for HTTP requests
    - Update trigger functions to use pg_net.http_post correctly
    - Fix payload structure and error handling

  2. Notes
    - pg_net is the recommended Supabase extension for HTTP requests
    - Triggers will now properly call the send-email edge function
*/

-- Enable pg_net extension
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA extensions TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA extensions TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA extensions TO postgres, anon, authenticated, service_role;

-- Drop existing functions to recreate them
DROP FUNCTION IF EXISTS notify_client_booking_created() CASCADE;
DROP FUNCTION IF EXISTS notify_attendant_booking_created() CASCADE;

-- Function to send booking confirmation email to client
CREATE OR REPLACE FUNCTION notify_client_booking_created()
RETURNS TRIGGER AS $$
DECLARE
  v_request_id bigint;
  v_payload jsonb;
BEGIN
  -- Only send for confirmed bookings
  IF NEW.status != 'confirmed' THEN
    RETURN NEW;
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
      'meetLink', COALESCE(NEW.meet_link, '')
    )
  );

  -- Call the send-email edge function using pg_net
  SELECT extensions.http_post(
    url := current_setting('app.settings.api_url', true) || '/functions/v1/send-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := v_payload
  ) INTO v_request_id;

  RAISE LOG 'Client email request queued with ID: %', v_request_id;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the insert
  RAISE WARNING 'Failed to queue client email: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to send booking notification email to attendant
CREATE OR REPLACE FUNCTION notify_attendant_booking_created()
RETURNS TRIGGER AS $$
DECLARE
  v_request_id bigint;
  v_attendant_name text;
  v_attendant_email text;
  v_payload jsonb;
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
    RAISE WARNING 'Attendant email not found for ID: %', NEW.assigned_to;
    RETURN NEW;
  END IF;

  -- Build email payload for attendant
  v_payload := jsonb_build_object(
    'type', 'attendant-notification',
    'data', jsonb_build_object(
      'attendantName', v_attendant_name,
      'attendantEmail', v_attendant_email,
      'clientName', NEW.client_name,
      'clientEmail', NEW.client_email,
      'clientPhone', COALESCE(NEW.client_phone, ''),
      'meetingType', NEW.meeting_type,
      'date', TO_CHAR(NEW.date::date, 'DD/MM/YYYY'),
      'time', NEW.time,
      'duration', 30,
      'meetLink', COALESCE(NEW.meet_link, '')
    )
  );

  -- Call the send-email edge function using pg_net
  SELECT extensions.http_post(
    url := current_setting('app.settings.api_url', true) || '/functions/v1/send-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := v_payload
  ) INTO v_request_id;

  RAISE LOG 'Attendant email request queued with ID: %', v_request_id;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the insert
  RAISE WARNING 'Failed to queue attendant email: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
CREATE TRIGGER trigger_notify_client_booking
  AFTER INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION notify_client_booking_created();

CREATE TRIGGER trigger_notify_attendant_booking
  AFTER INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION notify_attendant_booking_created();
/*
  # Fix Email Triggers - Use Correct Schema

  1. Changes
    - Update trigger functions to use net.http_post (not extensions.http_post)
    - Use anon key instead of service role for public trigger access
    - Proper error handling and logging

  2. Notes
    - pg_net functions are in the 'net' schema
    - Triggers run async via pg_net background worker
*/

-- Drop existing functions
DROP FUNCTION IF EXISTS notify_client_booking_created() CASCADE;
DROP FUNCTION IF EXISTS notify_attendant_booking_created() CASCADE;

-- Function to send booking confirmation email to client
CREATE OR REPLACE FUNCTION notify_client_booking_created()
RETURNS TRIGGER AS $$
DECLARE
  v_request_id bigint;
  v_payload jsonb;
  v_supabase_url text := 'https://yhzkjmkqefftzycfdolq.supabase.co';
  v_anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InloemtqbWtxZWZmdHp5Y2Zkb2xxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNzU4MTMsImV4cCI6MjA4OTk1MTgxM30.UHx8bkIMepmDIibBau081mV4-L276j-CIhhI3hRiask';
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

  -- Call the send-email edge function using net.http_post
  SELECT net.http_post(
    url := v_supabase_url || '/functions/v1/send-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_anon_key
    ),
    body := v_payload
  ) INTO v_request_id;

  RAISE LOG 'Client email request queued with ID: % for booking: %', v_request_id, NEW.id;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the insert
  RAISE WARNING 'Failed to queue client email for booking %: % (SQLSTATE: %)', NEW.id, SQLERRM, SQLSTATE;
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
  v_supabase_url text := 'https://yhzkjmkqefftzycfdolq.supabase.co';
  v_anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InloemtqbWtxZWZmdHp5Y2Zkb2xxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNzU4MTMsImV4cCI6MjA4OTk1MTgxM30.UHx8bkIMepmDIibBau081mV4-L276j-CIhhI3hRiask';
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
    RAISE WARNING 'Attendant email not found for ID: % (booking: %)', NEW.assigned_to, NEW.id;
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

  -- Call the send-email edge function using net.http_post
  SELECT net.http_post(
    url := v_supabase_url || '/functions/v1/send-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_anon_key
    ),
    body := v_payload
  ) INTO v_request_id;

  RAISE LOG 'Attendant email request queued with ID: % for booking: %', v_request_id, NEW.id;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the insert
  RAISE WARNING 'Failed to queue attendant email for booking %: % (SQLSTATE: %)', NEW.id, SQLERRM, SQLSTATE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant access to net schema for the functions
GRANT USAGE ON SCHEMA net TO postgres;

-- Create triggers
CREATE TRIGGER trigger_notify_client_booking
  AFTER INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION notify_client_booking_created();

CREATE TRIGGER trigger_notify_attendant_booking
  AFTER INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION notify_attendant_booking_created();
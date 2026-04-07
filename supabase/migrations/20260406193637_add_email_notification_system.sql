/*
  # Add Email Notification System

  1. Changes
    - Add email notification function to trigger emails when bookings are created
    - Add email notification function to trigger emails when bookings are cancelled
    - Automatically send confirmation emails to clients
    - Automatically send notification emails to attendants
    - Integrate with send-email edge function

  2. Security
    - No RLS changes needed (triggers run with elevated privileges)
    - Function executes server-side via database triggers
*/

-- Function to send booking confirmation email
CREATE OR REPLACE FUNCTION send_booking_confirmation_email()
RETURNS TRIGGER AS $$
DECLARE
  v_attendant_name TEXT;
  v_attendant_email TEXT;
  v_meeting_type_name TEXT;
  v_booking_date TEXT;
  v_booking_time TEXT;
  v_payload JSONB;
BEGIN
  -- Only send email for confirmed bookings
  IF NEW.status != 'confirmed' THEN
    RETURN NEW;
  END IF;

  -- Get attendant information
  SELECT p.name, p.email
  INTO v_attendant_name, v_attendant_email
  FROM profiles p
  WHERE p.id = NEW.attendant_id;

  -- Get meeting type name
  SELECT name
  INTO v_meeting_type_name
  FROM meeting_types
  WHERE id = NEW.meeting_type_id;

  -- Format date and time
  v_booking_date := TO_CHAR(NEW.start_time, 'DD/MM/YYYY');
  v_booking_time := TO_CHAR(NEW.start_time, 'HH24:MI');

  -- Send email to client
  v_payload := jsonb_build_object(
    'type', 'booking-confirmation',
    'data', jsonb_build_object(
      'clientName', NEW.client_name,
      'clientEmail', NEW.client_email,
      'meetingType', v_meeting_type_name,
      'date', v_booking_date,
      'time', v_booking_time,
      'duration', NEW.duration,
      'meetLink', NEW.meet_link
    )
  );

  PERFORM net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/send-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
    ),
    body := v_payload
  );

  -- Send email to attendant
  v_payload := jsonb_build_object(
    'type', 'attendant-notification',
    'data', jsonb_build_object(
      'attendantName', v_attendant_name,
      'attendantEmail', v_attendant_email,
      'clientName', NEW.client_name,
      'clientEmail', NEW.client_email,
      'clientPhone', NEW.client_phone,
      'meetingType', v_meeting_type_name,
      'date', v_booking_date,
      'time', v_booking_time,
      'duration', NEW.duration,
      'meetLink', NEW.meet_link
    )
  );

  PERFORM net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/send-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
    ),
    body := v_payload
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to send cancellation email
CREATE OR REPLACE FUNCTION send_cancellation_email()
RETURNS TRIGGER AS $$
DECLARE
  v_meeting_type_name TEXT;
  v_booking_date TEXT;
  v_booking_time TEXT;
  v_payload JSONB;
BEGIN
  -- Only send email when status changes to cancelled
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    -- Get meeting type name
    SELECT name
    INTO v_meeting_type_name
    FROM meeting_types
    WHERE id = NEW.meeting_type_id;

    -- Format date and time
    v_booking_date := TO_CHAR(NEW.start_time, 'DD/MM/YYYY');
    v_booking_time := TO_CHAR(NEW.start_time, 'HH24:MI');

    -- Send cancellation email to client
    v_payload := jsonb_build_object(
      'type', 'cancellation',
      'data', jsonb_build_object(
        'clientName', NEW.client_name,
        'clientEmail', NEW.client_email,
        'meetingType', v_meeting_type_name,
        'date', v_booking_date,
        'time', v_booking_time
      )
    );

    PERFORM net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/send-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
      ),
      body := v_payload
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_send_booking_confirmation ON bookings;
DROP TRIGGER IF EXISTS trigger_send_cancellation_email ON bookings;

-- Create trigger for booking confirmations
CREATE TRIGGER trigger_send_booking_confirmation
  AFTER INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION send_booking_confirmation_email();

-- Create trigger for cancellations
CREATE TRIGGER trigger_send_cancellation_email
  AFTER UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION send_cancellation_email();

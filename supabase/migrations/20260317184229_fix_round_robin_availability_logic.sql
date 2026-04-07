/*
  # Fix Round Robin Availability Logic

  1. Problem
    - Round Robin function requires google_connected = true
    - New attendants cannot receive bookings until Google is connected
    - Daily limit is checked but attendants with limit > 0 should be available
  
  2. Changes
    - Remove google_connected requirement from assign_booking_to_attendant function
    - Ensure only is_active and daily_limit > 0 are checked
    - Allow all active attendants with available slots to receive bookings
  
  3. Impact
    - Public calendar will show time slots when attendants are available
    - Attendants can receive bookings immediately after creation
    - Google Calendar sync becomes optional feature, not requirement
*/

-- Drop and recreate the function without google_connected requirement
CREATE OR REPLACE FUNCTION public.assign_booking_to_attendant(booking_id uuid, booking_date date)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  selected_attendant uuid;
  attendant_record RECORD;
  available_attendants uuid[];
BEGIN
  -- Find active attendants who haven't reached their daily limit
  FOR attendant_record IN
    SELECT p.id, p.daily_limit
    FROM profiles p
    WHERE p.role = 'attendant'
      AND p.is_active = true
      AND p.daily_limit > 0
      AND (
        SELECT COUNT(*)
        FROM bookings b
        WHERE b.assigned_to = p.id
          AND b.assignment_date = booking_date
          AND b.status = 'confirmed'
      ) < p.daily_limit
  LOOP
    available_attendants := array_append(available_attendants, attendant_record.id);
  END LOOP;

  -- If no attendants are available, return NULL
  IF array_length(available_attendants, 1) IS NULL THEN
    RETURN NULL;
  END IF;

  -- Select an attendant randomly (Round Robin)
  selected_attendant := available_attendants[1 + floor(random() * array_length(available_attendants, 1))::int];

  -- Update the booking with assigned attendant
  UPDATE bookings
  SET assigned_to = selected_attendant,
      assignment_date = booking_date
  WHERE id = booking_id;

  RETURN selected_attendant;
END;
$$;

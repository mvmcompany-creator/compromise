/*
  # Fix assign_booking_to_attendant function

  1. Changes
    - Remove the old version of assign_booking_to_attendant function that references non-existent column p.name
    - Keep only the working version that uses p.id and p.daily_limit
  
  2. Security
    - Maintains security definer for proper permission handling
*/

DROP FUNCTION IF EXISTS public.assign_booking_to_attendant(uuid, date);
DROP FUNCTION IF EXISTS public.assign_booking_to_attendant(uuid);

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
  FOR attendant_record IN
    SELECT p.id, p.daily_limit
    FROM profiles p
    WHERE p.role = 'attendant'
      AND p.is_active = true
      AND p.daily_limit IS NOT NULL
      AND p.google_connected = true
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

  IF array_length(available_attendants, 1) IS NULL THEN
    RETURN NULL;
  END IF;

  selected_attendant := available_attendants[1 + floor(random() * array_length(available_attendants, 1))::int];

  UPDATE bookings
  SET assigned_to = selected_attendant,
      assignment_date = booking_date
  WHERE id = booking_id;

  RETURN selected_attendant;
END;
$$;
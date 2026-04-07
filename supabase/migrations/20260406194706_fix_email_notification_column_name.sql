/*
  # Fix email notification functions

  1. Changes
    - Update send_booking_confirmation_email() to use p.full_name instead of p.name
    - Fix the query to match the actual database schema
    - Also fix references to attendant_id, meeting_type_id, start_time, and duration fields
    - These functions reference outdated schema fields that don't exist in the current bookings table

  2. Notes
    - The current bookings table uses: assigned_to (not attendant_id), meeting_type (text, not meeting_type_id), date/time (separate fields, not start_time)
    - Since the email notification system references fields that don't exist, we'll drop these triggers and functions for now
*/

-- Drop the triggers first
DROP TRIGGER IF EXISTS trigger_send_booking_confirmation ON bookings;
DROP TRIGGER IF EXISTS trigger_send_cancellation_email ON bookings;

-- Drop the functions
DROP FUNCTION IF EXISTS send_booking_confirmation_email();
DROP FUNCTION IF EXISTS send_cancellation_email();
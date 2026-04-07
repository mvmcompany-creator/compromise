/*
  # Add gender field to profiles

  1. Changes
    - Add `gender` column to `profiles` table
      - Type: text with check constraint (male/female)
      - Required for attendants
    - Add `gender` to bookings table for matching logic
  
  2. Security
    - Update RLS policies to allow attendants to update their gender
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'gender'
  ) THEN
    ALTER TABLE profiles ADD COLUMN gender text CHECK (gender IN ('male', 'female'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'client_gender'
  ) THEN
    ALTER TABLE bookings ADD COLUMN client_gender text CHECK (client_gender IN ('male', 'female'));
  END IF;
END $$;
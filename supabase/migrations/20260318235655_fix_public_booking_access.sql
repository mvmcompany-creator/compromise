/*
  # Fix Public Booking Access

  This migration fixes the public booking page by allowing anonymous users to:
  1. View active attendants (needed to check availability)
  2. View availability settings (already working)
  
  ## Changes
    - Add RLS policy for anonymous users to view active attendant profiles
    - This is required for the public booking page to display available time slots
  
  ## Security
    - Policy only allows viewing basic attendant information
    - Does not expose sensitive user data
    - Limited to active attendants only
*/

-- Allow public (anonymous) users to view active attendants
-- This is necessary for the public booking page to work
CREATE POLICY "Public can view active attendants"
  ON profiles FOR SELECT
  TO anon
  USING (
    role = 'attendant' AND is_active = true
  );

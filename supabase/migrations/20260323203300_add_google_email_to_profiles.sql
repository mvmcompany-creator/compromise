/*
  # Add Google Email to Profiles

  1. Changes
    - Add `google_email` column to store the user's Google email address
    - This helps identify which Google account is connected

  2. Notes
    - This field is populated when the user connects their Google account
    - It's useful for display purposes in the UI
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'google_email'
  ) THEN
    ALTER TABLE profiles ADD COLUMN google_email text;
  END IF;
END $$;

COMMENT ON COLUMN profiles.google_email IS 'Email address of the connected Google account';
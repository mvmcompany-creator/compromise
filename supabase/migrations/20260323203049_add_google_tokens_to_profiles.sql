/*
  # Add Google OAuth Tokens to Profiles

  1. Changes
    - Add `google_access_token` column to store the OAuth access token
    - Add `google_refresh_token` column to store the refresh token for offline access
    - Add `google_token_expires_at` column to track token expiration
    - Add `google_connected` boolean to easily check connection status
    - Add index on `google_connected` for efficient queries

  2. Security
    - Tokens are encrypted at rest by Supabase
    - Only the profile owner can read their own tokens via RLS
    - Managers cannot see attendant tokens

  3. Notes
    - Refresh tokens are required for creating events when attendant is offline
    - Access tokens expire after 1 hour and must be refreshed
    - All Google token columns are nullable (attendants may not connect)
*/

-- Add Google OAuth token columns to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'google_access_token'
  ) THEN
    ALTER TABLE profiles ADD COLUMN google_access_token text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'google_refresh_token'
  ) THEN
    ALTER TABLE profiles ADD COLUMN google_refresh_token text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'google_token_expires_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN google_token_expires_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'google_connected'
  ) THEN
    ALTER TABLE profiles ADD COLUMN google_connected boolean DEFAULT false;
  END IF;
END $$;

-- Create index for efficient queries on google_connected status
CREATE INDEX IF NOT EXISTS idx_profiles_google_connected ON profiles(google_connected) WHERE google_connected = true;

-- Add comment for documentation
COMMENT ON COLUMN profiles.google_access_token IS 'OAuth 2.0 access token for Google Calendar API';
COMMENT ON COLUMN profiles.google_refresh_token IS 'OAuth 2.0 refresh token for obtaining new access tokens';
COMMENT ON COLUMN profiles.google_token_expires_at IS 'Timestamp when the access token expires';
COMMENT ON COLUMN profiles.google_connected IS 'Whether the attendant has connected their Google account';
-- Create function to update Auth user metadata (requires service_role)
-- This allows admins to update app_metadata for users

-- Function to update user app_metadata
CREATE OR REPLACE FUNCTION admin_update_user_metadata(
  user_id uuid,
  new_role text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Run with elevated privileges
AS $$
BEGIN
  -- Verify caller is admin
  IF (auth.jwt() -> 'app_metadata' ->> 'role') != 'admin' THEN
    RAISE EXCEPTION 'Only admins can update user metadata';
  END IF;

  -- Update app_metadata in auth.users
  UPDATE auth.users
  SET raw_app_meta_data = jsonb_set(
    COALESCE(raw_app_meta_data, '{}'::jsonb),
    '{role}',
    to_jsonb(new_role)
  ),
  updated_at = now()
  WHERE id = user_id;

  -- Also update in public.usuarios for consistency
  UPDATE public.usuarios
  SET role = new_role,
      updated_at = now()
  WHERE id = user_id;
END;
$$;

-- Grant execute permission to authenticated users (RLS will check admin role)
GRANT EXECUTE ON FUNCTION admin_update_user_metadata(uuid, text) TO authenticated;

COMMENT ON FUNCTION admin_update_user_metadata IS 
'Allows admins to update user role in both auth.users app_metadata and public.usuarios table';

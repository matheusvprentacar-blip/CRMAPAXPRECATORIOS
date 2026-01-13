-- Grant permissions on the VIEW precatorios_cards
-- Views need explicit grants even if underlying tables have RLS

GRANT SELECT ON public.precatorios_cards TO authenticated;

-- Ensure RLS on underlying table works (already done in 105, but reinforcing)
-- If precatorios_cards is a SECURITY DEFINER view, it bypasses RLS. 
-- If it's a standard view, it uses the user's RLS on 'precatorios'.

-- Just in case, grant SELECT on the view specifically to the roles
GRANT SELECT ON public.precatorios_cards TO postgres, anon, authenticated, service_role;

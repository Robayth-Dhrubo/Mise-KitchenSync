-- Permissions Fix V2
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

GRANT ALL ON TABLE public.profiles TO postgres, anon, authenticated, service_role;

-- Ensure trigger function is executable
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';

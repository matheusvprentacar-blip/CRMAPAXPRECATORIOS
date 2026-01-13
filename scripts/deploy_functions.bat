# Deploy Supabase Functions
# Certifique-se de que o Supabase CLI está instalado e autenticado (supabase login)

echo "Deploying admin-actions..."
npx supabase functions deploy admin-actions --no-verify-jwt

echo "Deploying import-json..."
npx supabase functions deploy import-json --no-verify-jwt

echo "All functions deployed!"
pause

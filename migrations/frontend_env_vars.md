## Variables à ajouter dans Vercel (setter-dashboard-saas)

```
NEXT_PUBLIC_SUPABASE_URL=https://lyrlvipkwzbsojqbposh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<Supabase → Settings → API → anon public key>
NEXT_PUBLIC_API_URL=<URL Railway de setter-agent-saas, ex: https://xxx.up.railway.app>
NEXT_PUBLIC_AGENT_NAME=<Nom affiché dans le dashboard>
```

### Comment récupérer NEXT_PUBLIC_SUPABASE_ANON_KEY

1. Ouvre ton projet sur https://supabase.com
2. Settings (icône engrenage) → API
3. Section "Project API keys" → copie **anon public**
4. Colle la valeur dans Vercel → Settings → Environment Variables

### Notes

- La clé **anon** est safe côté client (elle ne bypass pas le RLS)
- Ne jamais utiliser la **service_role** key côté frontend
- `NEXT_PUBLIC_API_URL` doit pointer vers l'API Railway sans slash final
- Ajouter aussi ces variables dans .env.local pour le développement local

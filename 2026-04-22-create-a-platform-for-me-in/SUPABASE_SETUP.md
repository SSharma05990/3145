1. Create a Supabase project.

2. In Supabase, open `SQL Editor` and run:
   - [supabase-setup.sql](/C:/Users/shaur/Documents/Codex/2026-04-22-create-a-platform-for-me-in/supabase-setup.sql)

3. In `Authentication` -> `Providers`, enable `Email`.

4. In `Authentication` -> `Users`, create:
   - one manager user
   - one or more employee users

5. In `Table Editor` -> `profiles`, change the manager user's `role` to `manager`.
   - all new users default to `employee`

6. Open:
   - `Project Settings` -> `API`
   - copy `Project URL`
   - copy `anon public key`

7. Update:
   - [supabase-config.js](/C:/Users/shaur/Documents/Codex/2026-04-22-create-a-platform-for-me-in/supabase-config.js)

   Replace:
   - `PASTE_YOUR_SUPABASE_PROJECT_URL_HERE`
   - `PASTE_YOUR_SUPABASE_ANON_KEY_HERE`

8. Commit these files to GitHub:
   - [index.html](/C:/Users/shaur/Documents/Codex/2026-04-22-create-a-platform-for-me-in/index.html)
   - [app.js](/C:/Users/shaur/Documents/Codex/2026-04-22-create-a-platform-for-me-in/app.js)
   - [styles.css](/C:/Users/shaur/Documents/Codex/2026-04-22-create-a-platform-for-me-in/styles.css)
   - [supabase-config.js](/C:/Users/shaur/Documents/Codex/2026-04-22-create-a-platform-for-me-in/supabase-config.js)

9. Deploy the site on Vercel.

10. Log in using the email/password users you created in Supabase Auth.

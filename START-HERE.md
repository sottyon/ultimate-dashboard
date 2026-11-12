# Ultimate Dashboard

Your Daymark dashboard and Paycheck Budget, combined into one site. It has one sign-in, one sidebar and one look: the Cause font, with headers at weight 672, and the palette `#fdbfce` · `#d0efef` · `#44362f` · `#dbdfeb`.

It was built from read-only copies of `sottyon/dash` (commit `33658ac`) and `sottyon/Finance` (commit `6b80d57`). **Neither original was changed.** Your live Daymark site and live budget app keep working exactly as before.

## What's in it

| Page | What it is |
|---|---|
| Dashboard | Tasks (with an optional due day and time), notes, text-reminder settings, and a **Finances** card showing what's left to spend this week |
| Week At A Glance, Habit Tracker, Book Tracker | Same as Daymark |
| Week in Depth | For each day: **tasks due** (with time), **Google Calendar events**, **habits** ticked in Habit Tracker or logged on the card, and a **"Monday Spending Overview"** drop-down with that day's total and transactions from Finances |
| **Finances** | The whole Paycheck Budget app, with its **Today · Activity · Month · Plan · Accounts** tabs at the top (shown only on this page), the **+** button, transfers, goals, balances and backup |
| Quarterly (was Monthly Spending) | Quarterly goals, wins and the parking lot. "Spending vs. budget" moved to **Finances → Month**, and "Money at a glance" moved to **Finances → Accounts** |
| Text Reminders | SMS opt-in page (now branded Ultimate Dashboard) |

## What changed from the originals

| Value | Was | Now |
|---|---|---|
| Budget storage key | `paycheck-budget-v1` | `ultimate-dash-budget-v1` |
| Budget sync | Claude account (`window.claude`) | Your Supabase account: one `budget_state` record in `dashboard_records` |
| Budget starting data (`SEED`) | Hard-coded in `index.html` | **Removed.** You import it once after signing in (the site is public) |
| Offline database | `daymark-dashboard-offline` | `ultimate-dashboard-offline` |
| Service worker caches | `daymark-shell-v3` / `daymark-vendor-v1` | `ultimate-shell-v1` / `ultimate-vendor-v1`. The theme, budget and font files are also precached |
| Brand | Sot Dash / Daymark / Paycheck Budget | Ultimate Dashboard (short name **Ultimate**) |
| Site URL | `https://sottyon.github.io/dash/` | `https://sottyon.github.io/ultimate-dashboard/` |
| Supabase Vault secret names | `daymark_supabase_url`, `daymark_service_role_key` | `ultimate_supabase_url`, `ultimate_service_role_key` |
| Scheduled job name | `daymark-daily-task-reminder` | `ultimate-daily-task-reminder` |
| Fonts | DM Sans, Fraunces, Valley Sans | Cause, self-hosted in `fonts/` (SIL Open Font License) |
| Colors | Daymark greens and pinks, budget dark mode | Project palette only, light theme |
| `supabase-config.js` | Live project keys | **Blank.** You fill these in for the new project |

## Manual setup, step by step

Plan on about 30 minutes for steps 1 to 7. Steps 8 and 9 are optional.

### 1. Create a new Supabase project
1. Go to https://supabase.com/dashboard and click **New project**.
2. Name it `ultimate-dashboard`, pick a strong database password (save it somewhere safe), choose the region closest to you, and click **Create new project**.
3. Wait about 2 minutes for it to finish setting up.
4. **Don't reuse the Daymark project.** Both sites would share and overwrite the same records.

### 2. Create the database tables
1. In the new project, open **SQL Editor** → **New query**.
2. Open `supabase-setup.sql` from this repo in a text editor, copy **all** of it, paste it into the query, and click **Run**. You should see "Success. No rows returned".
3. Do the same with `supabase/dashboard-delete-safety.sql`.
4. Don't paste file paths into the SQL Editor. It needs the file contents.

### 3. Lock down sign-in
1. Go to **Authentication → Sign In / Providers**, then **Email**. Make sure **Email** is enabled.
2. Go to **Authentication → Settings** (or **Sign In / Providers → User Signups**) and turn **off** "Allow new users to sign up".
3. Go to **Authentication → Users → Add user → Create new user**. Enter your email and a password, tick **Auto Confirm User**, and click **Create user**.

### 4. Set the site URL
1. Go to **Authentication → URL Configuration**.
2. Set **Site URL** to `https://sottyon.github.io/ultimate-dashboard/`.
3. Under **Redirect URLs**, click **Add URL** and add the same address. This makes password-reset emails come back to the site.

### 5. Connect the site to the project
1. Go to **Project Settings → API Keys** (or **Data API**). Copy the **Project URL** and the **publishable** key (it starts with `sb_publishable_`). **Never use the `service_role` / secret key here.**
2. In this repo, open `supabase-config.js` (on GitHub, open the file and click the pencil icon) and fill in:
   ```js
   url: "https://YOUR-PROJECT-REF.supabase.co",
   anonKey: "sb_publishable_…",
   ```
   Use only the project address, ending in `.supabase.co`. **Don't** paste the REST endpoint (`…supabase.co/rest/v1/`). If you do, sign-in fails with "Invalid path specified in request URL".
3. Commit the change.

### 6. Turn on GitHub Pages
1. In `sottyon/ultimate-dashboard` on GitHub, go to **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to **Deploy from a branch**, **Branch** to `main`, and the folder to `/ (root)`. Click **Save**.
3. After 1–2 minutes the site is live at `https://sottyon.github.io/ultimate-dashboard/`.
4. Pages sites are public. That's fine: there's no personal data in the code, and everything you enter is stored behind your sign-in.

### 7. Sign in and move your budget over
1. Open the site and sign in with the email and password from step 3.
2. In your **old** Paycheck Budget app, go to **Accounts**, scroll down to **Backup**, and tap **Copy backup**.
3. In the new site, open **Budget** in the sidebar, paste the backup into the box, and tap **Import**.
4. The badge should read **✓ Saved to your account**. Your transactions, balances, transfers, adjustments and budgets carry over. **Reset to imported starting data** (under Accounts) now resets to this import.
5. Prefer to start over? Tap **Start a blank budget** instead.
6. On your iPhone, open the site in Safari, tap **Share → Add to Home Screen**, and name it **Ultimate**.

### 8. Google Calendar (optional)
1. Go to https://console.cloud.google.com/ and create a project called `ultimate-dashboard`.
2. Go to **APIs & Services → Library**, search for **Google Calendar API**, and click **Enable**.
3. Go to **APIs & Services → OAuth consent screen**. Choose **External**, fill in the app name (Ultimate Dashboard) and your email, and add yourself as a **Test user**.
4. Go to **APIs & Services → Credentials → Create credentials → OAuth client ID → Web application**. Under **Authorized JavaScript origins**, add `https://sottyon.github.io` (no `/ultimate-dashboard/` path). Click **Create**.
5. Copy the **Client ID** (not the secret) into `googleClientId` in `supabase-config.js` and commit.

### 9. Daily task texts (optional; needs Twilio)
1. Before turning this on, open `terms.html` and `privacy.html` and replace both `CONTACT_EMAIL_HERE` placeholders with the email you want people to use. The effective date is set to November 11, 2026. These pages are a starting point, not legal advice.
2. In Supabase, go to **Edge Functions → Secrets** and add `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` and `TWILIO_FROM_NUMBER`.
3. Deploy the function. Either install the Supabase CLI and run `supabase functions deploy daily-task-reminder --project-ref YOUR-PROJECT-REF` from the repo root, or create a function named `daily-task-reminder` in **Edge Functions** and paste in `supabase/functions/daily-task-reminder/index.ts`.
4. In the **SQL Editor**, run these two lines, replacing the placeholders with values from **Project Settings → API** (use the **service_role** key here, and only here):
   ```sql
   select vault.create_secret('https://YOUR-PROJECT-REF.supabase.co', 'ultimate_supabase_url');
   select vault.create_secret('YOUR_SERVICE_ROLE_JWT', 'ultimate_service_role_key');
   ```
5. Copy the full contents of `supabase/daily-task-reminder-setup.sql` into a new query and run it.
6. Register a new A2P 10DLC campaign in Twilio. Use these URLs:
   - Opt-in: `https://sottyon.github.io/ultimate-dashboard/sms-reminders.html`
   - Terms: `https://sottyon.github.io/ultimate-dashboard/terms.html`
   - Privacy: `https://sottyon.github.io/ultimate-dashboard/privacy.html`

## Updating the Budget page later
`budget.js` is generated from the Paycheck Budget app. If you change the original app and want those changes here, clone `sottyon/Finance` next to this repo and run:
```
python3 tools/build-budget.py ../Finance/index.html budget.js
```
The storage, setup screen and theme changes live in `tools/budget-storage.js` and `tools/build-budget.py`.

## Preview locally
Run `python3 -m http.server` in this folder, then open http://localhost:8000.

## Old money views
Daymark's weekly spending (Week in Depth), monthly budget chart and account balances (Monthly Spending) are hidden rather than deleted, because the page scripts still look for them. Finances is now the only place to log spending and see budgets and balances. Daymark's Credit card, Savings bucket and Checking account entry types are hidden from the Quarterly "Add an entry" form.

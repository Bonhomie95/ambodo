# Ambodo — store launch kit

Everything the App Store and Google Play ask for, in order. The code side is done; the steps below need
your accounts, payment details, or a decision.

**Already done in code:** privacy policy, terms, support and account-deletion pages (served by the API) ·
in-app links to them · in-app account deletion · message reporting (long-press → Report) · paywall with price,
period, auto-renew terms, Restore and Terms/Privacy links · iOS privacy manifest · sign-in and invite-code
guessing limits · a build guard that stops store builds that would ship in test mode or pointed at
localhost · Render blueprint for the API · store art in `store/`.

---

## Ship it

### 1. Developer accounts
- **Apple Developer Program** — $99/year (developer.apple.com/programs).
- **Google Play Console** — $25 one-time (play.google.com/console).
  **New personal Play accounts must run a closed test with at least 12 testers for 14 days** before
  Production unlocks. Start it as soon as the first build is up. Organization accounts (D-U-N-S number) skip this.

### 2. Put the API online (HTTPS)
`render.yaml` deploys `server/` on Render: **Dashboard → New → Blueprint → this repo**. When asked, set:

| Variable | Value |
|---|---|
| `MONGODB_URI` | your Atlas connection string |
| `SUPPORT_EMAIL` | the inbox that answers users (shown on every store page) |
| `LEGAL_NAME` | your name or company, exactly as on the store listings |
| `REVENUECAT_SECRET_KEY` | from step 3 (`sk_…`) |

- Use the **Starter** plan: the free plan sleeps, and App Review would hit a cold start.
- In Atlas → Network Access, allow Render's outbound IPs (or `0.0.0.0/0` with a strong DB password).
- Check `https://<api-host>/health`, then `/privacy`, `/terms`, `/support`, `/delete-account`.
- Seed the review account: `cd server && API=https://<api-host> npm run seed`.
  Production has no test purchases, so the demo family starts on Free with no expenses.

### 3. Subscriptions (Ambodo Family)
**App Store Connect** → your app → Subscriptions → group **Ambodo Family**:

| Product ID | Duration | Price | Display name |
|---|---|---|---|
| `ambodo_family_annual` | 1 year | $89.00 | Ambodo Family — Yearly |
| `ambodo_family_monthly` | 1 month | $9.99 | Ambodo Family — Monthly |

Description for both: "One plan for both homes: expenses, calendar sync and unlimited ToneGuard."
Review screenshot: `store/review/paywall-ios.png`. The first subscription must be submitted *with* app version 1.0.

**Play Console** → Monetize → Subscriptions → product **`ambodo_family`** with two auto-renewing base plans:
`annual` (1 year, $89.00) and `monthly` (1 month, $9.99).

**RevenueCat:**
1. Create a project and add the iOS app (bundle `com.ambodo.app`, plus an In-App Purchase key from App Store
   Connect) and the Android app (package `com.ambodo.app`, plus a Google Play service-account JSON).
2. Import the products. Create entitlement **`family`** and attach all of them.
3. Make the **default** offering with an *Annual* and a *Monthly* package.
4. Copy the public SDK keys (`appl_…`, `goog_…`) and the secret key (`sk_…`, it goes on Render).

Whichever parent buys, the API stores the plan on the family, so both unlock. Renewals are picked up
automatically when the stored expiry passes. A RevenueCat outage never cancels a plan.

### 4. Build settings (EAS)
```bash
cd app
npx eas-cli@latest login
npx eas-cli@latest init
npx eas-cli@latest env:create --environment production --visibility plaintext --name EXPO_PUBLIC_API_URL --value https://<api-host>
npx eas-cli@latest env:create --environment production --visibility plaintext --name EXPO_PUBLIC_RC_IOS_KEY --value appl_xxx
npx eas-cli@latest env:create --environment production --visibility plaintext --name EXPO_PUBLIC_RC_ANDROID_KEY --value goog_xxx
```
`EXPO_PUBLIC_*` values ship inside the app, so they aren't secrets. Store builds refuse to start without them.
If `eas init` says it can't write the project ID to a dynamic config, put it in `app/app.json` under
`expo.extra.eas.projectId`. `app.config.ts` passes `app.json` straight through.

### 5. Build and submit
```bash
npx eas-cli@latest build --platform all --profile production
npx eas-cli@latest submit --platform ios --latest
```
- **iOS:** EAS creates the signing certificate with your Apple ID. The build lands in TestFlight. In App
  Store Connect, attach it and both subscriptions to version 1.0, then submit.
- **Android:** EAS creates the upload keystore and keeps it safe. Google needs the **first** `.aab`
  uploaded by hand: Play Console → Testing → Closed testing → Create release. After that,
  `eas submit --platform android` works with a service-account key.

### 6. App Review details (both stores)
- **Sign-in:** `ada@demo.ambodo.app`. The password is in `server/seed.mjs`. The co-parent is `bo@demo.ambodo.app` with the same password.
- **Notes for the reviewer:**
  > Ambodo is a co-parenting app: two parents share one private family space (joined by invite code).
  > The demo account is already connected to a co-parent with sample messages, events and a swap request.
  > Ambodo Family is an auto-renewing subscription (Family tab → Upgrade, or Expenses); one purchase
  > covers both parents. ToneGuard runs on-device. Messages can't be edited or deleted (that's the point
  > of the record); press and hold a message to report it. Account deletion: Family → Delete account.
  > No ads, no tracking.

---

## App Store listing
- **Name:** Ambodo: Co-Parenting
- **Subtitle:** Calm talk. Fair plans. Proof.
- **Promotional text:** One plan covers both homes. ToneGuard keeps messages calm, the custody calendar keeps everyone on the same page, and every record is sealed and court-ready.
- **Keywords:** coparenting,custody,calendar,divorce,family,parenting plan,shared,messages,expenses,court
- **Category:** Lifestyle (secondary: Productivity)
- **URLs:** Support `https://<api-host>/support` · Privacy policy `https://<api-host>/privacy`
- **Copyright:** 2026 <LEGAL_NAME>
- **Screenshots (6.9"):** `store/ios/01…06.jpg` (1320×2868). iPhone-only app, so no iPad shots are needed.
- **Age rating:** answer the questionnaire honestly. The app has private messaging between co-parents and no other mature content. Ambodo's terms require users to be 18+.
- **App Privacy** (all *linked to the user*, *not used for tracking*, purpose *App Functionality*):
  Name · Email Address · User ID · Health (kids' allergies, medications, doctor) · Emails or Text Messages ·
  Other User Content · Purchase History. These match the privacy manifest in `app/app.json`.

**Description**
```
Two homes. One team.

Ambodo keeps co-parenting calm, fair and on the record — for both of you, on one family plan.

• Talk calm — ToneGuard checks every message before it lands and offers a kinder version. Every message is sealed to the one before it, so history can't be quietly edited.
• Plan fair — one custody calendar you both see the same way. 2-2-3, week on/week off, 2-2-5-5 and more. Swap days in two taps; nothing changes until you both agree.
• Keep proof — handoff check-ins, shared expenses and swap history, exported as a court-ready PDF with seal verification.
• Know the kids — school, doctor, allergies and sizes in one shared place.
• Sync everywhere — custody days in Apple or Google Calendar.

Free: messages with ToneGuard checks, the shared calendar, swaps, kids' info, check-ins and court-ready exports.
Ambodo Family ($9.99/month or $89/year, one plan for both parents): expenses and settle-ups, calendar sync and unlimited ToneGuard rewrites. Fee waivers are available for families who need them.

Payment is charged to your Apple Account at confirmation. The subscription renews automatically unless cancelled at least 24 hours before the end of the period. Manage or cancel in your Apple Account settings.

Terms of Use: https://<api-host>/terms
Privacy Policy: https://<api-host>/privacy
```

## Google Play listing
- **App name:** Ambodo: Co-Parenting
- **Short description:** Co-parent calmly: sealed messages, one custody calendar, court-ready records.
- **Full description:** same as above, with "Google Play" in place of "Apple Account".
- **Category:** Parenting · **Contact email:** your `SUPPORT_EMAIL` · **Privacy policy:** `https://<api-host>/privacy`
- **Graphics:** icon `store/play-icon-512.png` · feature graphic `store/play-feature-graphic.png` · phone screenshots `store/android/01…06.jpg` (1080×1920)
- **App content:**
  - Ads: none
  - App access: restricted — give the demo sign-in above
  - Target audience: 18+
  - Content rating (IARC): users can interact (private messages); no other flagged content
  - News, COVID-19, government and health apps: no
  - Financial features: none (expenses are a ledger; no money moves)
  - **Account deletion URL:** `https://<api-host>/delete-account`
- **Data safety:**
  - Collected: Name, Email, User IDs (*account management*); Health info, Other in-app messages, other user-generated content, Purchase history (*app functionality*)
  - Shared with third parties: none (hosting, database and RevenueCat are service providers)
  - Encrypted in transit: yes · Users can request deletion: yes

---

## Running it after launch
- **Reports:** new ones land in the `reports` collection with `status: "open"`. The support page promises review within 24 hours. Set `status` to `"closed"` once handled.
- **Fee waivers:** `waiver.status: "pending"` on a family. To approve, set `waiver.status = "approved"` and `plan = { source: "waiver" }`.
- **Support inbox:** the support page promises a reply within 1–2 business days.
- **Refunds:** access ends at the stored expiry. If refunds must cut access instantly, add RevenueCat webhooks.

## Store art
`app/scripts/store-art.py` makes the framed screenshots, the Play icon and the feature graphic. Raw shots
come from the demo family: iPhone 17 Pro Max simulator (Release build) and the Android emulator.
```bash
python3 app/scripts/store-art.py <raw-shots-dir>   # needs ios/<name>.png and android/<name>.png
```

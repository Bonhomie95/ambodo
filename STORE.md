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

### 1. Developer accounts — done
Both stores are under **Bonhomie LLC**. Play is an organization account, so there's no 12-tester closed-test rule.

### 2. The API — live at `https://ambodo-api.onrender.com`
Render service **ambodo-api** (Frankfurt) builds `server/` from this repo on every push to `main`. `NODE_ENV`,
`HOST`, `MONGODB_DB`, `SUPPORT_EMAIL`, `LEGAL_NAME` and `LEGAL_ADDRESS` are set. (`render.yaml` describes the same service
as a Blueprint, in case it ever needs recreating.) `MONGODB_URI` is set and the pages are up.
- Still to do in Render → ambodo-api → Environment: `REVENUECAT_SECRET_KEY` (from step 3, `sk_…`).
- Free plan for now. It sleeps after 15 idle minutes, so the API pings itself every 10 minutes (`server/index.mjs`)
  and GitHub Actions pings it as a backup (`.github/workflows/keep-awake.yml`). That uses ~744 of the workspace's
  750 free hours a month, shared by every free Render service. Once revenue allows, switch to **Starter** and
  delete both pings.
- The review family is seeded on production. Its password is `SEED_PASSWORD` in `server/.env` (gitignored), not
  the public default in `server/seed.mjs`. To reset it:
  `cd server && API=https://ambodo-api.onrender.com node --env-file=.env seed.mjs`.
  Production has no test purchases, so the demo family starts on Free with no expenses.

### 3. Subscriptions (Ambodo Family)
**App Store Connect — set up:** group **Ambodo Family** has both subscriptions, priced in all 175 regions, with
English names. Each still needs its review screenshot (`store/review/paywall-ios.png`), and the account needs the
Paid Apps agreement plus tax and banking (Business → Agreements).

| Product ID | Duration | Price | Display name |
|---|---|---|---|
| `dev.bonhomieinc.ambodo.family.annual` | 1 year | $89.00 | Ambodo Family — Yearly |
| `dev.bonhomieinc.ambodo.family.monthly` | 1 month | $9.99 | Ambodo Family — Monthly |

Descriptions: "One plan for both homes, billed yearly." / "…billed monthly." The first subscriptions must be
submitted *with* app version 1.0.

**Play Console — set up:** product **`dev.bonhomieinc.ambodo.family`** ("Ambodo Family", four benefits and a description)
with two active auto-renewing base plans in every region: `annual` (1 year, US $89.99, because Play enforces .99 endings)
and `monthly` (1 month, US $9.99).

**RevenueCat** (project `27c0c1e9`, "Bonhomie LLC"):
- Done: App Store and Play apps. Entitlement **`family`** has all four products: App Store
  `dev.bonhomieinc.ambodo.family.annual` / `.monthly` and Play `dev.bonhomieinc.ambodo.family:annual` / `:monthly`.
  The current **default** offering (`$rc_annual`, `$rc_monthly`) carries both stores. The public keys are in `eas.json`.
- Still to do:
  - Upload the service-account JSON to the Play app.
  - Create a **V1** secret key for Render's `REVENUECAT_SECRET_KEY`. The API calls `/v1/subscribers`.

Whichever parent buys, the API stores the plan on the family, so both unlock. Renewals are picked up
automatically when the stored expiry passes. A RevenueCat outage never cancels a plan.

### 4. Build settings (EAS)
The EAS project is linked: **@bonhomie95/ambodo** (ID in `app/app.json`). The `production` profile in `eas.json`
carries `EXPO_PUBLIC_API_URL` and both RevenueCat public keys. They ship inside the app, so they aren't secrets.
Store builds refuse to start without them. Build numbers are kept by EAS (`appVersionSource: remote`).

### 5. Build and submit
```bash
cd app
npx eas-cli@latest build --platform ios --profile production --auto-submit   # Apple sign-in the first time; lands in TestFlight
npx eas-cli@latest build --platform android --profile production
```
- **iOS:** EAS keeps the signing certificate. `--auto-submit` sends the build to App Store Connect app `6832982834`.
  Then attach the build and both subscriptions to version 1.0, and submit.
- **Android:** EAS created and keeps the upload keystore. Google needs the **first** `.aab` uploaded by hand: Play
  Console → Test and release → Internal testing → Create release. After that, `eas submit --platform android`
  works with the service-account key.
- **Status:** Android build 2 (1.0.0) is uploaded. Production release "1.0.0 (2)" covers all 178 countries and is
  saved in Publishing overview, which sends it for review together with the listing and app content (managed
  publishing is off, so it goes live once approved). The internal-testing draft holds the same build and has no testers.

### 6. App Review details (both stores)
- **Sign-in:** both use `SEED_PASSWORD` from `server/.env`. The password field is left blank in both stores.
  - **Apple:** `ada@demo.ambodo.app` (co-parent `bo@…`), on Free, so the reviewer can buy Ambodo Family in the sandbox.
  - **Google:** `ada.play@demo.ambodo.app` (co-parent `bo.play@…`), with Family unlocked by a waiver, because Play
    reviewers can't make purchases. To recreate it: `SEED_TAG=play` in the seed command, then set that family's
    `plan = { source: "waiver" }`.
- **Notes for the reviewer:**
  > Ambodo is a co-parenting app: two parents share one private family space (joined by invite code).
  > The demo account is already connected to a co-parent with sample messages, events and a swap request.
  > Ambodo Family is an auto-renewing subscription (Family tab → Upgrade, or Expenses); one purchase
  > covers both parents. ToneGuard runs on-device. Messages can't be edited or deleted (that's the point
  > of the record); press and hold a message to report it. Account deletion: Family → Delete account.
  > No ads, no tracking.

---

## App Store listing
Already entered in App Store Connect: everything below except screenshots, age rating and App Privacy. Price is
Free in 175 regions; iPhone only, with Mac and Vision Pro availability off.
- **Name:** Ambodo: Co-Parenting
- **Subtitle:** Calm talk. Fair plans. Proof.
- **Promotional text:** One plan covers both homes. ToneGuard keeps messages calm, the custody calendar keeps everyone on the same page, and every record is sealed and court-ready.
- **Keywords:** coparenting,custody,calendar,divorce,family,parenting plan,shared,messages,expenses,court
- **Category:** Lifestyle (secondary: Productivity)
- **URLs:** Support `https://ambodo-api.onrender.com/support` · Privacy policy `https://ambodo-api.onrender.com/privacy`
- **Copyright:** 2026 Bonhomie LLC
- **Screenshots:** App Store Connect's required slot is *iPhone with Dynamic Island (medium display)*, so upload
  `store/ios-6.3/01…06.jpg` (1206×2622). The 6.9" originals in `store/ios/` are optional. iPhone-only app, so no iPad
  shots are needed. To remake the 6.3" set after new art:
  `for f in store/ios/*.jpg; do sips -z 2622 1206 "$f" --out "store/ios-6.3/${f##*/}"; done`
- **Content rights:** Yes, it shows third-party content and you have the rights (co-parents' messages, which the terms
  license; Google Fonts under the open font licence).
- **Age rating:** Messaging and Chat **Yes**. Everything else is **No/None**: parental controls, age assurance,
  unrestricted web, user-generated content (only shared within one family), social media, ads, and all the content
  questions. Made for Kids: No.
- **App Privacy:** "Yes, we collect data." Every type is *linked to the user*, *not used for tracking*, purpose
  *App Functionality* only: Name · Email Address · User ID · Health (allergies, doctor, notes) · Other Financial Info
  (expenses, settle-ups, fee-waiver reason) · Purchase History · Emails or Text Messages · Other User Content.
  Nothing else: no location, contacts, photos, browsing, usage data, diagnostics or device ID. These match the
  privacy manifest in `app/app.json`.

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

Terms of Use: https://ambodo-api.onrender.com/terms
Privacy Policy: https://ambodo-api.onrender.com/privacy
```

## Google Play listing
Already entered in Play Console (app `4975389166503960722`): the listing text and all graphics (saved as a draft; it
needs the AI-asset answer and Save), category, contact email and website, and the privacy policy.
- **App name:** Ambodo: Co-Parenting
- **Short description:** Co-parent calmly: sealed messages, one custody calendar, court-ready records.
- **Full description:** same as above but "$89.99/year", with a Google Play payment paragraph ("renews automatically until you cancel;
  manage or cancel any time in Google Play → Payments & subscriptions").
- **Category:** Parenting · **Contact email:** `support@bonhomieinc.dev` · **Website:** `https://bonhomieinc.dev/` · **Privacy policy:** `https://ambodo-api.onrender.com/privacy`
- **Graphics:** icon `store/play-icon-512.png` · feature graphic `store/play-feature-graphic.png` · phone screenshots `store/android/01…06.jpg` (1080×1920)
- **App content:**
  - Ads: no · Advertising ID: no (the build doesn't request `AD_ID`) · Government app: no
  - Financial features: "My app doesn't provide any financial features" (expenses are a ledger; no money moves)
  - Health: no health features (allergies and doctor are free-text notes on the kids' card)
  - Sign in details: restricted. `ada.play@demo.ambodo.app` (Family unlocked), with "full access" ticked. The password is yours to add
  - Target audience: 18 and over only
  - Content rating (IARC): category *All other app types*. All content questions No. Users interact (text): **Yes**.
    Shares location: No. Digital purchases: **Yes**. Web browser or search: No
  - Trader status: Yes (Bonhomie LLC). Terms link `https://ambodo-api.onrender.com/terms`
- **Data safety:**
  - Collects data: yes · Encrypted in transit: yes · Shared with third parties: none (hosting, database and
    RevenueCat are service providers) · Account creation: email + password, deletion URL
    `https://ambodo-api.onrender.com/delete-account` · Users can request deletion: yes
  - Required, for *App functionality* and *Account management*: Name. Email address and User IDs add *Fraud
    prevention, security, and compliance*, because the sign-in and invite-code guessing limits use them
  - Required, for *App functionality*: Other info (kids' names and birthdays)
  - Optional, for *App functionality*: Purchase history (only when someone subscribes), Health info, Other financial
    info (expenses), Other in-app messages, Other user-generated content
  - Nothing is processed ephemerally; there's no location, photos, contacts, calendar, app activity analytics or crash logs

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

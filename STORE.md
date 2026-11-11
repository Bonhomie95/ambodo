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
- `REVENUECAT_SECRET_KEY` holds the **public** iOS key (`appl_…`, also in `eas.json`). The API only reads
  `/v1/subscribers`, which accepts public keys, so no secret is needed. A V1 `sk_…` key also works if you swap it in.
- Free plan for now. It sleeps after 15 idle minutes, so the API pings itself every 10 minutes (`server/index.mjs`)
  and GitHub Actions pings it as a backup (`.github/workflows/keep-awake.yml`). That uses ~744 of the workspace's
  750 free hours a month, shared by every free Render service. Once revenue allows, switch to **Starter** and
  delete both pings.
- The review family is seeded on production. Its password is `SEED_PASSWORD` in `server/.env` (gitignored), not
  the public default in `server/seed.mjs`. The seed adds a co-parent, a second kid, events, swaps and expenses,
  which are Family features, so it runs under a test plan and drops back to Free at the end. Production has no
  test plans, so to reset it: set `BILLING_DEV=true` on Render, run
  `cd server && API=https://ambodo-api.onrender.com node --env-file=.env seed.mjs`, then remove `BILLING_DEV` right
  away (while it's on, anyone can give themselves a test plan).

### 3. Subscriptions (Ambodo Family)
**App Store Connect — set up:** group **Ambodo Family** has both subscriptions, priced in all 175 regions, with
English names and review screenshots (`store/review/paywall-ios.png`). The API still reports them as "Missing
Metadata" until the Paid Apps agreement is active, which is waiting on the W-9 and the bank check (Business → Agreements).

| Product ID | Duration | Price | Display name |
|---|---|---|---|
| `dev.bonhomieinc.ambodo.family.annual` | 1 year | $89.00 | Ambodo Family — Yearly |
| `dev.bonhomieinc.ambodo.family.monthly` | 1 month | $9.99 | Ambodo Family — Monthly |

Descriptions: "One plan for both homes, billed yearly." / "…billed monthly." The first subscriptions must be
submitted *with* app version 1.0.

**What Family unlocks:** connecting a co-parent (the inviter's plan covers whoever joins), adding events and swap
requests, more than one kid, the court-ready PDF export, expenses and settle-ups, calendar sync and unlimited
ToneGuard rewrites. Free is a solo family space: one kid, the custody schedule, handoff check-ins, ToneGuard checks
and 5 rewrites a month. A lapsed family stays connected and keeps its data, but adding new Family items locks again.

**Play Console — set up:** product **`dev.bonhomieinc.ambodo.family`** ("Ambodo Family"; benefits: Connect your
co-parent · Court-ready PDF records · Shared events, swaps and expenses · Unlimited ToneGuard rewrites)
with two active auto-renewing base plans in every region: `annual` (1 year, US $89.99, because Play enforces .99 endings)
and `monthly` (1 month, US $9.99).

**RevenueCat** (project `27c0c1e9`, "Bonhomie LLC"):
- Done: App Store and Play apps. Entitlement **`family`** has all four products: App Store
  `dev.bonhomieinc.ambodo.family.annual` / `.monthly` and Play `dev.bonhomieinc.ambodo.family:annual` / `:monthly`.
  The current **default** offering (`$rc_annual`, `$rc_monthly`) carries both stores. The public keys are in `eas.json`.
- The Play app has its service-account JSON. Render uses the public iOS key (see step 2).

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
  works with the service-account key (`app/play-service-account.json`, gitignored), but only once that service
  account has release permissions on this app: Play Console → Users and permissions →
  `play-console-api-access@…` → App permissions → Add app → Ambodo. Otherwise Play answers "The Google service
  account cannot submit this app".
- **Status (Nov 11):** build 3 (the paywall fix and the new Family gates) replaces build 2.
  - iOS: version **1.0.0 (3)** is waiting for review with the subscription group and both subscriptions.
  - Play: build 3 (`281a05a0-c185-41a6-b73d-9fc7e62c11a8`) is built but not uploaded, because the service account
    has no permissions on Ambodo yet (see above). After that's granted: `cd app && eas submit -p android --id
    281a05a0-c185-41a6-b73d-9fc7e62c11a8`, then Production → Create new release → Add from library → version code 3,
    and send it for review with the saved listing changes (managed publishing is off, so it goes live once approved).
  - The server's Family gates are live. They don't affect build 2's Play review, because the Play reviewer's family
    is on a waiver.
  - The Paid Apps agreement is still pending the W-9 (Apple accepts it once the bank update clears), so Apple's
    reviewers may not be able to buy yet.

### 6. App Review details (both stores)
- **Sign-in:** both use `SEED_PASSWORD` from `server/.env`. The password field is left blank in both stores.
  - **Apple:** `ada@demo.ambodo.app` (co-parent `bo@…`), on Free, so the reviewer can buy Ambodo Family in the sandbox.
  - **Google:** `ada.play@demo.ambodo.app` (co-parent `bo.play@…`), with Family unlocked by a waiver, because Play
    reviewers can't make purchases. To recreate it: `SEED_TAG=play` in the seed command, then set that family's
    `plan = { source: "waiver" }`.
- **Notes for the reviewer:**
  > Ambodo is a co-parenting app: two parents share one private family space (joined by invite code).
  > The demo account is on Free and already connected to a co-parent with sample messages, events and a swap request.
  > Ambodo Family is an auto-renewing subscription (Family tab → Upgrade, or any locked feature); one purchase
  > covers both parents. It unlocks connecting a co-parent, adding events, swap requests and more kids, the
  > court-ready PDF export (Family → Court-ready records), expenses, calendar sync and unlimited ToneGuard
  > rewrites. ToneGuard runs on-device. Messages can't be edited or deleted (that's the point
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

Free: set up your family space with one kid's profile, the custody schedule and handoff check-ins.
Ambodo Family ($9.99/month or $89/year, one plan for both parents): connect your co-parent for sealed messages, shared events and swap requests, add all your kids, court-ready PDF records, expenses and settle-ups, calendar sync and unlimited ToneGuard rewrites. Fee waivers are available for families who need them.

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

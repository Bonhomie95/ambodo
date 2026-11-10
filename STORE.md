# Store listing — Ambodo

**Name:** Ambodo: Co-Parenting
**Subtitle (iOS, 30):** Calm talk. Fair plans. Proof.
**Short description (Play, 80):** Co-parent calmly: sealed messages, a shared custody calendar and court-ready records.
**Category:** Lifestyle (secondary: Productivity) · **Age rating:** 4+ / Everyone

## Description
Two homes. One team.

Ambodo keeps co-parenting calm, fair and on the record — for both of you, on one family plan.

• **Talk calm** — ToneGuard checks every message before it lands and offers a kinder version. Every message is sealed to the one before it, so history can't be quietly edited.
• **Plan fair** — one custody calendar you both see the same way. 2-2-3, week-on/week-off, 2-2-5-5 and more. Swap days in two taps; nothing changes until you both agree.
• **Keep proof** — handoff check-ins, shared expenses and swap history, exported as a court-ready PDF with chain verification.
• **Know the kids** — school, doctor, allergies and sizes in one shared place.
• **Sync everywhere** — subscribe to custody days in Apple or Google Calendar.

## Keywords (iOS, 100)
coparenting,custody,calendar,divorce,family,parenting plan,shared,messages,expenses,court

## Privacy (App Store nutrition label / Play Data safety)
- Collected, linked to the user, not used for tracking: **Name, Email, User content (messages, events, expenses)** — app functionality only.
- No ads, no third-party analytics, no data sold. Data is encrypted in transit (HTTPS in production).
- Account deletion: in-app (Family → Delete account). Shared family records stay with the co-parent.
- Export compliance: standard HTTPS only (`ITSAppUsesNonExemptEncryption = false`).

## Before submitting
- Host the API over HTTPS and set `EXPO_PUBLIC_API_URL` (see `app/eas.json`).
- Add a privacy-policy URL and support URL in App Store Connect / Play Console.
- Screenshots: 6.9" iPhone + Android phone (Today, Talk with ToneGuard, Calendar, Records, the paywall).
- Publish `https://ambodo.app/terms` and `/privacy` — the paywall links to both (App Store 3.1.2 requires it).

## Ambodo Family subscription (go-live checklist)
The app ships with it wired; until keys exist it runs in **test mode** (no charge, plan granted by the API).

1. **App Store Connect** → Subscriptions → group "Ambodo Family": `ambodo_family_annual` ($89/yr) and `ambodo_family_monthly` ($9.99/mo).
2. **Play Console** → Subscriptions: same two product IDs and prices.
3. **RevenueCat**: add both apps, attach the products, create entitlement **`family`** and an offering whose
   *Annual* and *Monthly* packages hold the products.
4. Keys:
   - `app/.env` → `EXPO_PUBLIC_RC_IOS_KEY=appl_…`, `EXPO_PUBLIC_RC_ANDROID_KEY=goog_…` (public SDK keys)
   - `server/.env` → `REVENUECAT_SECRET_KEY=sk_…` and `BILLING_DEV=false` (turns test mode off)
5. Rebuild the app. Whichever parent buys, the API stores the plan on the family, so both unlock.

What's on Free vs Family is enforced by the API (402 = Family feature): expenses + settle-ups and the calendar
feed are Family; ToneGuard "calmer version" sends are capped at 5 per parent per month on Free.
Fee waivers land as `waiver.status = "pending"` on the family — approve by setting it to `approved` and
`plan = { source: "waiver" }`.

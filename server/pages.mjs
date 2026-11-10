// Public pages the stores require: privacy policy, terms of use, support, and account deletion (Google Play).
// Served by the API so they live wherever it does — the app links to `${API_URL}/privacy` etc.
const UPDATED = 'November 10, 2026';
const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);

const shell = (title, body) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} · Ambodo</title><meta name="color-scheme" content="light dark">
<style>
:root{--bg:#FFF8F1;--card:#fff;--text:#141A33;--muted:#6E7189;--line:#EFE4D8;--coral:#FF6B5B;--teal:#17A396;--sun:#F2B022}
@media (prefers-color-scheme:dark){:root{--bg:#0D1124;--card:#171C36;--text:#F6F2EA;--muted:#9DA1BA;--line:#262B4B;--teal:#3FD3C4}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:16px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
main{max-width:720px;margin:0 auto;padding:28px 18px 64px}a{color:var(--teal)}
.mark{font:800 30px/1 Georgia,serif;letter-spacing:-1px;text-decoration:none;color:var(--text)}.mark b{color:var(--coral)}.mark i{color:var(--sun);font-style:normal}.mark u{color:var(--teal);text-decoration:none}
nav{display:flex;flex-wrap:wrap;gap:6px 16px;margin:14px 0 26px;font-size:14px}nav a{color:var(--muted);text-decoration:none}nav a:hover{color:var(--text)}
h1{font:600 36px/1.15 Georgia,serif;margin:0 0 6px;letter-spacing:-.5px}h2{font-size:18px;margin:30px 0 6px}.muted{color:var(--muted)}
.card{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:16px 18px;margin:16px 0}ul{padding-left:20px}li{margin:4px 0}
footer{margin-top:40px;font-size:13px;color:var(--muted)}
</style></head><body><main>
<a class="mark" href="/support" aria-label="Ambodo"><b>b</b><i>·</i><u>d</u></a>
<nav><a href="/support">Support</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/delete-account">Delete account</a></nav>
${body}
<footer>Last updated ${UPDATED}</footer>
</main></body></html>`;

export function pages({ supportEmail, legalName, address = '' }) {
  const email = `<a href="mailto:${esc(supportEmail)}">${esc(supportEmail)}</a>`;
  const us = esc(legalName);
  // Apple's minimum EULA terms ask for the developer's name and address.
  const contact = `<div class="card">Contact: ${us}${address ? ` · ${esc(address)}` : ''} · ${email}</div>`;

  const privacy = shell('Privacy Policy', `
<h1>Privacy Policy</h1>
<p class="muted">Ambodo helps two parents run one family calmly. You trust us with private things — messages, schedules, your kids’ details. Here is exactly what we collect, why, who sees it, and how to delete it. Ambodo is run by ${us} (“we”, “us”). Questions: ${email}.</p>

<h2>What we collect</h2>
<ul>
<li><b>Account:</b> your name, email address and password. Passwords are stored only as a salted scrypt hash — nobody can read them.</li>
<li><b>Your family space:</b> what you and your co-parent add — your children’s names and any details you choose (birthday, school and teacher, doctor and dentist, allergies and medications, sizes, notes), the custody schedule, messages, calendar events, swap requests, expense records (title, amount, category, split) and handoff check-ins (time, drop-off or pick-up, optional note). Allergy, medication and doctor details are health information; add only what helps you co-parent.</li>
<li><b>Plan and billing:</b> whether your family has Ambodo Family, where it came from (App Store, Google Play or a fee waiver), when it ends, and any fee-waiver request you send. Apple or Google take the payment — we never see card details. RevenueCat, our subscription service, receives a random app user ID (not your name or email) and the purchase records Apple or Google provide.</li>
<li><b>Free-plan limits:</b> a monthly count of ToneGuard “calmer version” sends.</li>
<li><b>Reports:</b> if you report a message, we keep the report and a copy of that message.</li>
<li><b>Technical:</b> our servers and hosting providers process your IP address and basic request details to run and protect the service.</li>
</ul>
<p>ToneGuard runs on your phone: drafts are never sent to us until you press Send. We use no analytics or advertising SDKs and we don’t track you across apps or websites.</p>

<h2>How we use it</h2>
<ul>
<li>To run Ambodo: keep both parents’ apps in sync, show the custody calendar, seal the message record, and power exports you create.</li>
<li>To provide Ambodo Family and review fee waivers.</li>
<li>To keep accounts safe (for example, limiting repeated sign-in attempts) and to answer support requests and reports.</li>
<li>To meet legal obligations.</li>
</ul>
<p>We don’t sell your data, use it for advertising, or use it to train AI models.</p>

<h2>Who can see it</h2>
<ul>
<li><b>Your co-parent.</b> Everything in your family space is shared with the other parent in it — that’s the point. Messages can’t be edited or deleted after sending; that is what makes the record trustworthy.</li>
<li><b>Anyone you share with.</b> A PDF you export or a calendar link you share shows what it contains. Treat your calendar link like a password.</li>
<li><b>Service providers</b> that process data for us under contract and only to provide their service: MongoDB Atlas (database), our application host, RevenueCat (subscriptions), Apple and Google (purchases).</li>
<li><b>Legal requests.</b> We disclose information only when the law, a subpoena or a court order requires it, or to protect someone’s safety. Where allowed, we tell you first.</li>
</ul>

<h2>Keeping and deleting data</h2>
<p>We keep your data while your account exists. You can delete your account at any time — in the app (Family → Delete account) or as described on <a href="/delete-account">Delete account</a>. Your login, profile and sessions are erased immediately. Records you added to a shared family space (messages you sent, events, expenses, check-ins) stay with your co-parent so their record stays complete; when the last parent in a family deletes their account, the whole family space is deleted. Residual copies may remain in encrypted backups for a limited time before they are overwritten.</p>

<h2>Security</h2>
<p>Data is encrypted in transit (HTTPS) and at rest by our database provider. Passwords are hashed, sign-in tokens are stored hashed on our side and in your phone’s secure keychain or keystore, and the message history is sealed with a SHA-256 hash chain so any tampering shows. No system is perfect — if you find a problem, tell us at ${email}.</p>

<h2>Children</h2>
<p>Ambodo is for adults (18+) and is not directed to children. Parents add information about their own children, and we use it only to provide the service to that family. If you believe a child has created an account, contact us and we will delete it.</p>

<h2>Your rights</h2>
<p>Depending on where you live (for example under the GDPR in the EU and UK, or the CCPA in California), you can access, correct, export or delete your data, restrict or object to its use, and withdraw consent. Most of this is in the app — edit details, export a PDF, delete your account — or email ${email} and we will respond within 30 days. You may also complain to your local data-protection authority. We process data to provide the service you signed up for, for our legitimate interest in keeping it secure, and to meet legal obligations. Our providers may process data in the United States and other countries with appropriate safeguards.</p>

<h2>Changes</h2>
<p>If we change this policy we will update the date below, and tell you in the app if the change is significant.</p>
${contact}`);

  const terms = shell('Terms of Use', `
<h1>Terms of Use</h1>
<p class="muted">The short version: be honest, be kind, keep your records. The details are below. Ambodo is provided by ${us}. By creating an account or using Ambodo you agree to these Terms and the <a href="/privacy">Privacy Policy</a>.</p>

<h2>1. Who can use Ambodo</h2>
<p>You must be 18 or older. One person per account. Give accurate information, keep your password private, and tell us if you think someone else has accessed your account.</p>

<h2>2. Your family space and your content</h2>
<p>You and your co-parent share a family space. You own what you add. You give us a limited licence to store, process and show it to the members of your family only so we can run Ambodo for you. Don’t add anything you don’t have the right to share.</p>

<h2>3. Use it respectfully</h2>
<p>No harassment, threats, hate, or illegal content; no impersonation; no attempts to reach accounts or data that aren’t yours; no interfering with the service. You can report a message by pressing and holding it. We review reports and may remove content or suspend accounts that break these rules.</p>

<h2>4. Records, not advice</h2>
<p>Ambodo helps you keep organised, tamper-evident records. It is not legal, financial or medical advice, and we can’t promise any court or agency will accept a record. ToneGuard suggestions are only suggestions — you decide what to send. Expenses are a shared ledger; no money moves through Ambodo.</p>

<h2>5. Ambodo Family subscription</h2>
<ul>
<li>Ambodo Family is an optional auto-renewing subscription, billed monthly or yearly, that covers every parent in the family.</li>
<li>The price is shown in the app before you buy and may vary by country. Payment is charged to your Apple Account or Google Play account when you confirm.</li>
<li>It renews automatically unless cancelled at least 24 hours before the end of the current period; renewal is charged within the 24 hours before the period ends.</li>
<li>Manage or cancel in your App Store or Google Play account settings. Deleting the app does not cancel the subscription.</li>
<li>Refunds are handled by Apple or Google under their policies. After cancelling, Family features stay on until the paid period ends.</li>
<li>Fee waivers are granted at our discretion and may be reviewed.</li>
</ul>

<h2>6. Availability and changes</h2>
<p>We work hard to keep Ambodo running but can’t promise it will always be available or error-free. We may change or retire features. If we ever shut Ambodo down we will give at least 30 days’ notice so you can export your records.</p>

<h2>7. Ending your use</h2>
<p>You can delete your account at any time (see <a href="/delete-account">Delete account</a>). We may suspend or close accounts that seriously or repeatedly break these Terms.</p>

<h2>8. Disclaimers and liability</h2>
<p>To the extent the law allows, Ambodo is provided “as is”, we are not liable for indirect or consequential losses, and our total liability is limited to what you paid us in the 12 months before the claim. Nothing here limits liability that the law does not allow to be limited.</p>

<h2>9. If you got Ambodo from the App Store</h2>
<p>These Terms are between you and ${us}, not Apple. Apple has no obligation to provide maintenance or support for Ambodo. To the maximum extent the law allows, Apple has no warranty obligation for Ambodo; if it fails to conform to an applicable warranty you may notify Apple for a refund of any purchase price. Apple is not responsible for claims relating to Ambodo, including product liability, legal or regulatory compliance and consumer protection claims, or for investigating or defending intellectual-property claims. You confirm you are not located in a country subject to a U.S. Government embargo and are not on any U.S. Government list of prohibited or restricted parties. Apple and its subsidiaries are third-party beneficiaries of these Terms and may enforce them. Purchases through Google Play are also subject to Google Play’s terms.</p>

<h2>10. Changes to these Terms</h2>
<p>We may update these Terms. We will change the date below and tell you in the app about significant changes. Continuing to use Ambodo means you accept the updated Terms.</p>

<h2>11. Governing law</h2>
<p>These Terms are governed by the laws of the place where ${us} is established, except where the law where you live gives you rights that can’t be waived.</p>
${contact}`);

  const support = shell('Support', `
<h1>We’re here.</h1>
<p class="muted">Real people answer. Email ${email} — we reply within 1–2 business days, faster on Ambodo Family.</p>
<div class="card"><b>Is someone in danger?</b> Ambodo can’t send help. Call your local emergency number.</div>
<h2>Invite your co-parent</h2><p>Set up your family, then share the invite code shown in the app. Your co-parent creates an account and enters the code.</p>
<h2>How Ambodo Family works</h2><p>One subscription covers both parents, whoever pays. Expenses, settle-ups, calendar sync and unlimited ToneGuard rewrites unlock for both of you.</p>
<h2>Cancel or change your plan</h2><p>iPhone: Settings → your name → Subscriptions → Ambodo. Android: Google Play → profile → Payments &amp; subscriptions → Subscriptions → Ambodo.</p>
<h2>Restore a purchase</h2><p>Family → Ambodo Family → Restore purchases.</p>
<h2>Can’t afford it?</h2><p>Family → Ambodo Family → Need a fee waiver? Tell us briefly; families with court fee waivers, hardship or safety concerns qualify.</p>
<h2>Report a message</h2><p>Press and hold the message in Talk → Report. We review reports within 24 hours.</p>
<h2>Court-ready records</h2><p>Family → Court-ready records → Export court-ready PDF. The seal check shows whether any message was altered.</p>
<h2>Delete your account</h2><p>Family → Delete account, or see <a href="/delete-account">Delete account</a>.</p>`);

  const deletion = shell('Delete your account', `
<h1>Delete your Ambodo account</h1>
<p class="muted">Ambodo, by ${us}. You can delete your account and the data tied to it at any time.</p>
<h2>In the app (fastest)</h2>
<p>Open Ambodo → <b>Family</b> tab → <b>Delete account</b> → <b>Delete forever</b>. It happens immediately.</p>
<h2>Can’t open the app?</h2>
<p>Email ${email} from the address you signed up with, subject “Delete my Ambodo account”. We confirm it’s you, then delete the account within 30 days — usually within 2 business days.</p>
<h2>What gets deleted</h2>
<ul><li>Your login, name, email address and sign-in sessions — immediately.</li>
<li>Your free-plan usage counters.</li>
<li>If you are the last parent in the family: the whole family space — kids’ details, schedule, messages, events, swaps, expenses and check-ins.</li></ul>
<h2>What stays</h2>
<ul><li>While your co-parent still uses Ambodo, the messages, events, expenses and check-ins you shared stay in their family record, because they are part of their record too.</li>
<li>Residual copies in encrypted backups are overwritten after a limited time.</li>
<li>Subscriptions are billed by Apple or Google — cancel them in your store account. Their purchase records follow their own policies.</li></ul>`);

  return { privacy, terms, support, 'delete-account': deletion };
}

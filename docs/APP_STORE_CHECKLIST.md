# HummingRead App Store release checklist

Current release decisions and evidence boundaries: [IOS_LAUNCH_2026-10-24.md](IOS_LAUNCH_2026-10-24.md). Older Xcode/simulator claims are historical and do not validate the October source.

## Source and materials prepared

- [x] Free/open-source model and public MIT source link.
- [x] EN/RU/ES metadata, field validation including keyword UTF-8 byte limit, plain-text export and screenshot headlines.
- [x] Public no-login support contact approved by owner: vladimir_doronin@icloud.com.
- [x] iOS privacy manifest, offline legal/support pages and local-only packaging checks.
- [x] Shared Xcode archive scheme and current Capacitor package/pin preparation.
- [x] Marketing site source with responsive layout, RSVP example, source/license links, FAQs and optional future donation URL.
- [x] Verify final tested source SHA and all October web/source checks in release report.
- [x] Verify public marketing deployment, HTTPS, three languages, support and code links in release report.

## First: free own-device trial

- [x] Fresh Xcode Release build and Analyze from the tested server export cccc259; device and Simulator, Xcode 26.6. See [native report](IOS_NATIVE_2026-10-24.md).
- [x] Install and launch on the owner's iPhone using existing Personal Team; profile expires 2026-10-31. Reinstall path in the native report.
- [ ] Actual iPhone and iPad Simulator QA; physical iPhone reading, persistence and backup recovery.
- [ ] Owner's 3–5 day trial and blocking fixes before paying membership.

## Then: paid account and App Store gates

- [ ] Apple Developer enrollment and membership paid by owner after the trial.
- [ ] Seller/legal identity, bundle identifier availability, Apple team/signing.
- [ ] Signed archive validated and uploaded; TestFlight checks.
- [ ] Final localized screenshots from the submitted build.
- [ ] Privacy, age rating, content rights, export, territories and trader/account declarations.
- [ ] App Review submission and approval; working App Store URL.

## Domain — in parallel with the trial, before promotion

- [ ] Verify existing registrar purchases/accounts; agree final name and renewal cost if new registration is needed.
- [ ] Owner approves any purchase; DNS, HTTPS renewal and EN/RU/ES domain routes verified.
- [ ] Update canonical/hreflang/sitemap/social/support/privacy/store metadata and marketing redirects.
- [ ] Preserve the web reader storage origin until a verified library migration/export is available.

## Voluntary support — in parallel with the trial, before promotion

- [ ] Select a provider with verified receiving AND payout availability for the owner, fees/currencies and one-time support.
- [ ] Owner completes identity/account/payout setup and required agreements; prepare EN/RU/ES profile and public URL.
- [ ] Configure website.donationUrl; test all languages/mobile destination and rebuild/deploy website.
- [ ] Provider sandbox test, or separately authorized minimal real receipt/payout verification; record fees and withdrawal conditions.
- [x] Do not block reading features or display a nonfunctional payment button.
- [x] No external payment link or unimplemented StoreKit feature in native iOS.

The source/web release gate must keep App Store readiness BLOCKED until the native/account steps are actually proven.

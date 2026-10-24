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

## Native/account release gates

- [ ] Apple Developer enrollment and membership paid by owner.
- [ ] Seller/legal identity, bundle identifier availability, Apple team/signing.
- [ ] Fresh Xcode Release build and Analyze from the tested source.
- [ ] Actual iPhone and iPad Simulator QA; physical-device QA.
- [ ] Signed archive validated and uploaded; TestFlight checks.
- [ ] Final localized screenshots from the submitted build.
- [ ] Privacy, age rating, content rights, export, territories and trader/account declarations.
- [ ] App Review submission and approval; working App Store URL.

## Voluntary support

- [ ] Owner creates a donation account and supplies its public URL.
- [ ] Configure website.donationUrl, test the provider destination and rebuild/deploy website.
- [x] Do not block reading features or display a nonfunctional payment button.
- [x] No external payment link or unimplemented StoreKit feature in native iOS.

The source/web release gate must keep App Store readiness BLOCKED until the native/account steps are actually proven.

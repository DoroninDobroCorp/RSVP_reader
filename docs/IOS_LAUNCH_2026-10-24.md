# HummingRead iOS launch — 2026-10-24

## Owner decisions and execution

Work only by SSH on serverforvovka, canonical checkout /srv/hummingread, existing review branch mission/android-r5-recovery-20260814. No local application checkout, local Xcode run or local source edits are part of this request.

HummingRead should be free and open source, with voluntary support instead of a paid download, subscription or locked reading features. The public repository already uses the MIT license. Public support email approved by owner: vladimir_doronin@icloud.com. No donation account exists yet; no real payment link or in-app purchase is claimed. The website exposes source and MIT rights, working demo, supported files, privacy, FAQs and feedback. A future HTTPS donation URL is configured once in product.config.json → website.donationUrl and rebuilt. It is independent of the native app; no external payment control is bundled into iOS.

No HummingRead-specific registration was found in the connected Gmail registrar search or this server's TLS certificate inventory. This is a bounded search, not proof that no domain exists elsewhere. A temporary free hostname is acceptable to the owner. Existing app origin and reading storage are preserved at https://145.239.82.124.sslip.io/rsvp/. New marketing hostname: https://hummingread.145.239.82.124.sslip.io/. Its activation and certificate must be verified in the final report.

## Prepared release materials

- release/app-store/en-US.json, ru.json, es-ES.json: names, subtitles, descriptions, keywords, promo text and six screenshot headlines.
- npm run store:prepare: exports individual plain-text App Store Connect/fastlane-compatible fields to artifacts/app-store-connect/. Enforces name/subtitle 30 characters, promo 170, description 4000 and keywords 100 UTF-8 bytes.
- docs/APP_STORE_COPY.md: reviewer workflow, privacy/account/age/content-rights inputs and official Apple references.
- npm run ios:verify-source: static checks for local-only iOS assets, public support, privacy declarations, icon, version, identifiers, SwiftPM pins and archive scheme. Does not claim to compile Swift.
- npm run ios:release-check: executes builds, package/metadata/security/unit/web/browser/offline checks. It exits 2 after successful source/web checks because native/account gates remain blocked; it never reports App Store release readiness from Linux.
- scripts/ios-xcode-check.sh: reproducible unsigned Simulator build/Analyze command for a future approved macOS build host. Explicitly exits BLOCKED on Linux.
- docs/PROMOTION_PLAN.md: free/open-source positioning, launch text and conservative support economics.

## Account and native gates still required

1. Owner enrolls in Apple Developer Program, confirms seller/legal identity, completes verification and membership payment. Do not enter credentials, purchase on their behalf or invent successful enrollment.
2. Confirm final bundle identifier availability in the owner team. Existing team.ibet.paceflow remains unchanged to preserve app data/signing identity until the owner has an account and explicitly chooses a new identifier.
3. On a macOS Xcode build host: resolve dependencies from locked source; Release build and Analyze; run actual iPhone and iPad Simulator QA. Use Xcode 26 or later and an SDK meeting Apple's current upload requirements, rechecked at submission.
4. Configure signing/team and archive; Validate and upload to App Store Connect.
5. On a physical iPhone/iPad and TestFlight: cold start, import all advertised formats through Files picker, pause/resume/rewind, exact progress after process termination, large files, rotated layouts, backgrounding, Keep Awake release, backup export/share/re-import, destructive-action Cancel/Confirm, text scaling and VoiceOver.
6. Capture actual final-build screenshots in EN/RU/ES and required iPhone/iPad sizes; no website illustration or Linux capture may substitute.
7. Enter privacy answers, age questionnaire, copyright, content rights, review contact, export compliance, territories and EU trader status as applicable. Agree to required account terms personally.
8. Submit to App Review and handle feedback. Only Apple approval and visible store availability establish publication.

## Evidence rules

Source/package checks, mocked Capacitor browser tests, Linux WebKit, iOS Simulator, physical iPhone, TestFlight and App Review are distinct evidence levels. Old 2026-08 checklist ticks are historical only. The October source is not proven to compile or run on iOS until a new Xcode/device run exists.

Record tested source SHA and raw logs. Missing native evidence stays BLOCKED. Preserve Android R2–R5 artifacts; this iOS task does not accept or replace historical Android system tests.

## Cost model

Apple lists Developer membership at USD 99/year or local currency where available. Voluntary support is uncertain; do not promise recovery of the fee. At an average net contribution of USD 3, approximately 33 contributions cover USD 99; at USD 5, 20 contributions. These are arithmetic examples after all provider/platform fees, taxes and refunds, not a forecast.

Native tipping, if later implemented, must use a reviewed Apple-compliant flow for the chosen storefronts. The current build has no native monetization or StoreKit purchases.

References verified 2026-10-24:
- https://developer.apple.com/programs/whats-included
- https://developer.apple.com/app-store/review/guidelines/
- https://developer.apple.com/help/app-store-connect/reference/app-information/platform-version-information/
- https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/
- https://developer.apple.com/news/upcoming-requirements/

# HummingRead App Store release checklist

## Engineering evidence

- [x] Native article importer hidden and unreachable; no article fetch in the iOS surface.
- [x] Legacy cloud sync retired without deleting local books.
- [x] Core reader, library, bookmarks, settings, and progress work offline.
- [x] App display name is HummingRead; version/build source is centralized.
- [x] SwiftPM `Package.resolved` is tracked; Keep Awake is pinned.
- [x] Privacy manifest is bundled and package-verified.
- [ ] Final unsigned Release build and Analyze pass on a machine with full Xcode.
- [ ] Final iPhone and 13-inch iPad simulator matrix is captured and visually inspected.
- [ ] Physical-device cold start, background/resume, rotation, file picker, and Keep Awake are tested.

## Owner/account gates

- [ ] Approve the provisional HummingRead brand after independent legal review.
- [ ] Provide final public domain, privacy URL, and no-login support email.
- [ ] Confirm seller/legal entity and Apple Developer Team ID.
- [ ] Approve/register the final bundle identifier. Do not change `team.ibet.paceflow` in source until this step.
- [ ] Configure signing certificates/profiles and `DEVELOPMENT_TEAM`.
- [ ] Select price, territories, tax, and banking agreements.
- [ ] Create App Store Connect record and confirm name availability there.
- [ ] Upload archive, run Validate, TestFlight, and invited-tester QA.
- [ ] Capture final localized screenshots from the submitted build.
- [ ] Confirm privacy answers, age rating, content-rights declaration, review contact, and export-compliance answers.
- [ ] Submit and respond to App Review. Do not claim publication before approval is visible.

## Copy/package review

- [x] English/Russian name, subtitle, keywords, description, promo text, review workflow, privacy draft, age/content-rights rationale, and screenshot plan exist in `APP_STORE_COPY.md`.
- [x] Claims distinguish native local-only behavior from the optional web article service and Chrome Quick Send.
- [x] No promise of guaranteed comprehension or reading-speed improvement.
- [ ] Owner substitutes the final support/contact/domain data and passes production-mode brand verification.
- [ ] Final icons are inspected at every required size; 1024×1024 App Store icon has no alpha.

# PaceFlow Reader — App Store Release Checklist

This checklist describes the native iOS shell at the current Capacitor 8 baseline. Run it again whenever a Capacitor plugin, native SDK, permission, analytics service, or data flow changes.

## Native baseline already in the repository

- [x] Capacitor `8.5.0` iOS runtime is connected through Swift Package Manager.
- [x] Deployment target is iOS 15.0 and the target supports iPhone and iPad.
- [x] Bundle identifier is currently `team.ibet.paceflow` in both Debug and Release configurations.
- [x] App name is `PaceFlow Reader`; version/build start at `1.0` / `1`.
- [x] Release does not enable Capacitor debug mode.
- [x] The native build bundles the web assets and does not require a remote server to start.
- [x] App icon catalog contains a universal 1024 x 1024 RGB icon with no alpha channel.
- [x] No camera, microphone, photo-library, location, tracking, or broad file-access permission is requested.
- [x] `ITSAppUsesNonExemptEncryption` is `false`. Reassess this before release if custom cryptography is added.
- [x] `PrivacyInfo.xcprivacy` is a member of the App target and declares no tracking or collected data.

## Privacy manifest inventory

The app currently includes these native plugins:

| Plugin | Required-reason API | Reason | Why it is used |
| --- | --- | --- | --- |
| `@capacitor/filesystem` | `NSPrivacyAccessedAPICategoryFileTimestamp` | `C617.1` | Read/write app-owned library files inside the app container. |
| `@capacitor/preferences` | `NSPrivacyAccessedAPICategoryUserDefaults` | `CA92.1` | Persist the app's own lightweight settings. |
| `@capacitor/app` | None currently declared by the plugin | — | Foreground/background lifecycle integration. |
| `@capacitor/haptics` | None currently declared by the plugin | — | User-triggered haptic feedback. |

Before every submission:

- [ ] Compare `ios/App/CapApp-SPM/Package.swift` with the plugin list above.
- [ ] Read the installed version's README/privacy manifest for each newly added plugin.
- [ ] Update `ios/App/App/PrivacyInfo.xcprivacy` if any required-reason API, collection, or tracking behavior changes.
- [ ] Generate an Xcode privacy report from the archive and reconcile it with App Store Connect answers.

## Local machine and Xcode setup

Verified on August 7, 2026: after a clean `npm ci` and `npm run cap:sync`, the committed project builds in Release for iOS Simulator with Xcode 26.3 / iOS 26 SDK and passes `xcodebuild analyze`. Signing, archive validation, and physical-device checks still require the final Apple team and bundle identifier.

- [ ] Install full Xcode 26 or a newer App Store Connect-supported version; Command Line Tools alone cannot build or validate the app.
- [ ] Select it with `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer` and accept the license.
- [ ] Install the matching iOS platform/simulator runtimes.
- [ ] Run `npm ci`, `npm run build`, and `npx cap sync ios` from the repository root.
- [ ] Open `ios/App/App.xcodeproj` in Xcode and let Swift Package Manager resolve packages.
- [ ] Confirm that `PrivacyInfo.xcprivacy` appears under the App target's **Build Phases > Copy Bundle Resources** after every Capacitor sync.

## Identity, signing, and versioning

- [ ] Confirm ownership of `team.ibet.paceflow`; change it before the first upload if this is not the final registered Bundle ID.
- [ ] Select the correct Apple Developer Team and keep **Automatically manage signing** enabled.
- [ ] Create the matching App Store Connect app record.
- [ ] Confirm the display name is available and matches the App Store product name.
- [ ] Set `MARKETING_VERSION` to the public version and increment `CURRENT_PROJECT_VERSION` for every upload.
- [ ] Build an unsigned Simulator configuration first, then archive Release for **Any iOS Device (arm64)**.
- [ ] Run Xcode **Validate App** before upload and resolve every warning, not only errors.

## App behavior to verify on physical devices

- [ ] Test at least one current iPhone, one compact iPhone layout, and one iPad.
- [ ] Import EPUB, FB2/FB2.ZIP, DOCX, TXT, and a large book through the system Files picker, including iCloud Drive and **On My iPhone**.
- [ ] Confirm no Files permission dialog or unrelated privacy prompt appears.
- [ ] Confirm the full library, settings, bookmarks, table of contents, and exact reading position survive force-quit and device restart.
- [ ] Confirm the app launches and the complete reading workflow works in airplane mode.
- [ ] Background the app during playback: reading must pause safely and persist position without a jump on resume.
- [ ] Test interruptions, rotation, split view on iPad, Dynamic Type, VoiceOver, Increase Contrast, and Reduce Motion.
- [ ] Test very long words and all supported languages on the smallest supported viewport.
- [ ] Confirm iOS volume buttons always retain their system volume behavior.
- [ ] Confirm the app makes no sync request in the native build.
- [ ] Exercise export and **Delete All Data**, then confirm no library files remain in the app container.

`UIFileSharingEnabled` and `LSSupportsOpeningDocumentsInPlace` are intentionally not enabled: the app stores private internal library files in its Data container and imports user-selected files through the system picker. Add document-sharing keys only together with a reviewed user-facing file-sharing design.

## Store assets and metadata

- [ ] Inspect the generated icon on a physical Home Screen and in Settings; optionally add iOS dark/tinted icon variants.
- [ ] Confirm the launch screen matches the final icon/background on light and dark devices.
- [ ] Capture final, localized screenshots for every required iPhone and iPad size.
- [ ] Prepare English primary metadata and Russian localization: name, subtitle, description, keywords, promotional text, and release notes.
- [ ] Set primary category, secondary category, age rating, content-rights answer, copyright, and availability.
- [ ] Provide working Support and Privacy Policy URLs.
- [ ] Complete export-compliance questions consistently with `ITSAppUsesNonExemptEncryption = false`.
- [ ] Provide App Review contact details and concise review notes explaining pasted review text, local file import, and offline operation.
- [ ] If the app is paid, activate the Paid Apps Agreement and complete banking and tax information before submission.

## App privacy answers

For the current native build, books and reading state are processed locally, native cloud sync is disabled, and no analytics or advertising SDK is installed. The intended App Store Connect answer is **Data Not Collected**, subject to final network inspection of the archived Release build.

- [ ] Publish a privacy policy that explicitly covers local book processing, exports, deletion, support contact, and future policy changes.
- [ ] Verify Release traffic on a physical device before selecting **Data Not Collected**.
- [ ] Re-answer App Privacy if crash reporting, analytics, accounts, cloud sync, ads, or support uploads are added.
- [ ] Keep `NSPrivacyTracking = false`; do not add ATT unless the product genuinely introduces cross-app tracking.

## TestFlight and submission

- [ ] Upload a Release archive to App Store Connect.
- [ ] Complete internal TestFlight testing, then a small external TestFlight round.
- [ ] Review organizer crash logs, hangs, launch time, memory use with large books, and battery use during RSVP playback.
- [ ] Attach clear review notes; no login or demo account is required while the product remains account-free.
- [ ] Submit only after the exact uploaded build passes the physical-device checklist above.

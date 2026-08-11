# HummingRead tester guide

This release has three surfaces with two different delivery states:

- the website is live and ready for external testers;
- the Chrome extension is ready as an unpacked tester ZIP;
- the iOS build is technically verified in Xcode and Simulator, but external iPhone/iPad testers need a signed TestFlight build. A source commit or unsigned simulator build cannot be installed on their devices.

## Website / PWA

Open <https://145.239.82.124.sslip.io/rsvp/> in a current Chrome, Safari, or Firefox browser.

Test the 45-second demo, paste text, import a DRM-free EPUB/FB2/DOCX/TXT/HTML/Markdown/RTF file, change WPM, pause and rewind, create a bookmark, reload the page, and verify that the same book and position return. Also try airplane/offline mode after the first successful load. Do not upload copyrighted or private material to a bug report.

## Chrome extension

Download `hummingread-tester.zip` from the Chrome card on the website, extract it, open `chrome://extensions`, enable **Developer mode**, choose **Load unpacked**, and select the extracted folder.

Test all four explicit entry points:

1. select text on an ordinary HTTPS page and choose **Read selected text**;
2. choose **Extract this page**;
3. paste text into the extension;
4. use **Quick Send** and confirm that the website opens the chosen payload.

Then test Space to play/pause, Arrow Left to rewind, WPM, the scrubber, reload persistence, light/dark mode, and a protected `chrome://` page. Standalone reading must not send the selected text over the network; Quick Send is the only explicit transfer path.

## iOS / iPadOS

Engineering verification already covers Xcode Release build and Analyze, iPhone and 13-inch iPad launch, portrait/landscape, the guided demo, background/resume, and the system document picker.

External testers should receive a TestFlight invitation only after the owner completes the remaining account steps:

1. approve/register the final bundle identifier;
2. select the Apple Developer Team and signing profile;
3. create the App Store Connect record;
4. Archive, Validate, and upload the build;
5. invite the beta group and complete Apple's beta review if required.

Until those steps are complete, saying that the iOS app is “ready for TestFlight testers” would be inaccurate. A developer can still run the current project locally in Xcode on a Simulator or a registered device.

When the TestFlight build exists, test cold start, import from Files, demo playback, pause/context/rewind, bookmarks and exact resume, background/foreground, rotation, Delete All, backup/restore, and Auto-Lock/Keep Awake during active reading.

## Reporting a problem

Use the Support link in the product or the repository's GitHub Issues. Include:

- surface: web, Chrome extension, iPhone, or iPad;
- device, OS, and browser/extension/app version;
- exact steps and expected versus actual behavior;
- file format and approximate size, without attaching a book unless you own the rights and it is necessary;
- whether the problem repeats after reload or force-quit.

# HummingRead Android Tester Guide (R3 Truthful Server Proof Release)

This HummingRead Android Tester Guide provides complete instructions for installing, testing, and verifying the HummingRead Android R3 Truthful Server Proof Release (and historical `artifacts/android-r2/checksums.sha256` R2 release) on physical Android devices or API 36 emulators.

---

## 1. Release Artifacts & Checksum Verification

Release artifacts are stored on the server under `artifacts/android-r3/`:

| Artifact | Location | Description |
| --- | --- | --- |
| **Debug Tester APK** | `artifacts/android-r3/HummingRead-R3-debug.apk` | Installable tester APK targeting API Level 36 |
| **Unsigned Review AAB** | `artifacts/android-r3/HummingRead-R3-review-UNSIGNED-NOT-FOR-UPLOAD.aab` | Unsigned Android App Bundle review candidate |
| **SHA-256 Checksums** | `artifacts/android-r3/checksums.sha256` | Checksum manifest for compiled binaries |
| **Evidence Summary** | `artifacts/android-r3/evidence-summary.json` | Machine-readable evidence summary with git SHA |
| **Validation State** | `artifacts/android-r3/validation-state.json` | 100% assertions passed validation state |

### Verifying SHA-256 Checksums

Before installing, verify artifact integrity:

```bash
cd artifacts/android-r3 && sha256sum -c checksums.sha256
```

Expected output:
```
HummingRead-R3-debug.apk: OK
HummingRead-R3-review-UNSIGNED-NOT-FOR-UPLOAD.aab: OK
```

---

## 2. Installation Instructions

### Installing via ADB (Emulator or Physical Device)

1. Connect your Android device or start an API 36 emulator (`test_avd_api36` or `test_tablet_api36`).
2. Verify device connection:
   ```bash
   adb devices
   ```
3. Install the debug APK:
   ```bash
   adb install -r artifacts/android-r3/HummingRead-R3-debug.apk
   ```

---

## 3. Step-by-Step QA Testing Workflow

### Test Case 1: Cold Launch & Performance
- Launch HummingRead from app launcher.
- Verify reader interface loads cleanly in under 3 seconds without errors or crashes.

### Test Case 2: Interactive Guided Demo (EN, RU, ES)
- Tap the **Demo** button in reader view.
- Confirm playback starts, displaying sample text at selected WPM.
- Test Play/Pause, 10-word Rewind, and Scrubber controls.
- Change UI language in Settings (English -> Русский -> Español) and re-test demo playback in Russian and Spanish.

### Test Case 3: Native Multi-Locale Legal Pages
- Open **Settings** modal.
- Select Russian or Spanish.
- Tap **Privacy Policy**, **Support**, or **Acknowledgements**.
- Verify localized legal wrapper page (`privacy.html`, `ru/privacy.html`, or `es/privacy.html`) opens cleanly in WebView offline.

### Test Case 4: Storage Access Framework (SAF) Document Import
- Tap **Import Document** or library import button.
- Select sample files across all 7 supported formats:
  - `.epub`
  - `.fb2` / `.fb2.zip`
  - `.docx`
  - `.txt`
  - `.html`
  - `.md`
  - `.rtf`
- Confirm file imports cleanly, displays total word count, and resumes position correctly.

### Test Case 5: Viewport Adaptability & Device Rotation
- Rotate device or emulator (`Ctrl + F11` or `adb shell settings put system user_rotation 1`).
- Verify interface scales seamlessly between Portrait and Landscape viewports on phone (`test_avd_api36`) and tablet (`test_tablet_api36`) without text clipping.

### Test Case 6: System Back Gesture Recoil
- Navigate into Settings or child legal view.
- Perform Android Back gesture (`adb shell input keyevent 4`).
- Confirm navigation stack returns to main reader. Performing Back gesture from main reader minimizes app cleanly.

### Test Case 7: App Minimization, Backgrounding & Process Kill Survival
- Start reading a book at word index 150.
- Minimize app (`HOME` key) and simulate process kill:
  ```bash
  adb shell am kill team.ibet.paceflow
  ```
- Relaunch app and confirm exact active book, reading position, and WPM settings are restored.

### Test Case 8: Data Isolation & Capacitor Share Export
- Open Settings and tap **Export Backup Data**.
- Confirm Capacitor Share sheet opens with app-private backup JSON payload.
- Verify temporary export file in `cache/backups/` is automatically purged post-share.

### Test Case 9: "Delete All Data" & Airplane Mode Offline Functional Gate
- In Settings, tap **Delete All Data** and confirm prompt.
- Enable **Airplane Mode** (`adb shell cmd connectivity airplane-mode enable`).
- Confirm app operates 100% offline with local books, reader controls, and localized legal pages.

---

## 4. Reporting Issues

When reporting an issue, include:
1. Device model and Android OS version (e.g. API 36 Emulator).
2. Logcat output (`adb logcat -d *:E`).
3. Screenshot or video recording.
4. Reproduction steps and file format tested.

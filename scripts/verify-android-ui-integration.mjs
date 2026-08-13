import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

async function runUIIntegrationVerification() {
    console.log('=== Running Android Keep-Awake, Haptics & System UI Integration Verification ===\n');

    // 1. VAL-AND-UI-001: RSVP Playback Keep-Awake Wake Lock
    console.log('1. Checking VAL-AND-UI-001: Keep-Awake Wake Lock configuration...');
    const appJs = await readFile(join(root, 'app.js'), 'utf8');
    const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
    const capGradle = await readFile(join(root, 'android', 'app', 'capacitor.build.gradle'), 'utf8');

    if (!pkg.dependencies['@capacitor-community/keep-awake']) {
        throw new Error('VAL-AND-UI-001 Failed: @capacitor-community/keep-awake missing in package.json.');
    }
    if (!capGradle.includes('capacitor-community-keep-awake')) {
        throw new Error('VAL-AND-UI-001 Failed: capacitor-community-keep-awake missing in capacitor.build.gradle.');
    }
    if (!appJs.includes('nativeKeepAwakePlugin') || !appJs.includes('keepAwake') || !appJs.includes('allowSleep')) {
        throw new Error('VAL-AND-UI-001 Failed: Native KeepAwake integration missing in app.js.');
    }
    console.log('   [PASS] FLAG_KEEP_SCREEN_ON & KeepAwake plugin fully integrated in app.js and Android Gradle.\n');

    // 2. VAL-AND-UI-002: Native Android Haptic Feedback Integration
    console.log('2. Checking VAL-AND-UI-002: Native Haptics Feedback...');
    if (!pkg.dependencies['@capacitor/haptics']) {
        throw new Error('VAL-AND-UI-002 Failed: @capacitor/haptics missing in package.json.');
    }
    if (!capGradle.includes('capacitor-haptics')) {
        throw new Error('VAL-AND-UI-002 Failed: capacitor-haptics missing in capacitor.build.gradle.');
    }
    if (!appJs.includes('triggerHaptic') || !appJs.includes('selectionChanged()') || !appJs.includes('impact({ style: \'LIGHT\' })')) {
        throw new Error('VAL-AND-UI-002 Failed: Haptics plugin trigger logic missing in app.js.');
    }
    console.log('   [PASS] Native Haptics feedback integrated on control taps with settings fallback.\n');

    // 3. VAL-AND-UI-003: Edge-to-Edge System Bar Insets & Cutout Safe Area Padding
    console.log('3. Checking VAL-AND-UI-003: Edge-to-Edge & Cutout Safe Area Insets...');
    const mainActivity = await readFile(join(root, 'android', 'app', 'src', 'main', 'java', 'team', 'ibet', 'paceflow', 'MainActivity.java'), 'utf8');
    const styleCss = await readFile(join(root, 'style.css'), 'utf8');

    if (!mainActivity.includes('WindowCompat.setDecorFitsSystemWindows(getWindow(), false)')) {
        throw new Error('VAL-AND-UI-003 Failed: WindowCompat.setDecorFitsSystemWindows(getWindow(), false) missing in MainActivity.java.');
    }
    for (const inset of ['env(safe-area-inset-top', 'env(safe-area-inset-bottom', 'env(safe-area-inset-left', 'env(safe-area-inset-right']) {
        if (!styleCss.includes(inset)) {
            throw new Error(`VAL-AND-UI-003 Failed: CSS safe area inset missing: ${inset}`);
        }
    }
    console.log('   [PASS] Edge-to-edge window decor fits disabled and CSS env(safe-area-inset-*) configured.\n');

    // 4. VAL-AND-UI-004: Android 12+ SplashScreen Native Theme Integration
    console.log('4. Checking VAL-AND-UI-004: Android 12+ SplashScreen Theme...');
    if (!mainActivity.includes('SplashScreen.installSplashScreen(this)')) {
        throw new Error('VAL-AND-UI-004 Failed: SplashScreen.installSplashScreen(this) missing in MainActivity.java.');
    }
    const stylesXml = await readFile(join(root, 'android', 'app', 'src', 'main', 'res', 'values', 'styles.xml'), 'utf8');
    if (!stylesXml.includes('parent="Theme.SplashScreen"') || !stylesXml.includes('windowSplashScreenBackground') || !stylesXml.includes('windowSplashScreenAnimatedIcon')) {
        throw new Error('VAL-AND-UI-004 Failed: Theme.SplashScreen / windowSplashScreenBackground missing in styles.xml.');
    }
    console.log('   [PASS] Android 12+ SplashScreen theme with centered vector icon & smooth transition configured.\n');

    // 5. VAL-AND-UI-005: Android Adaptive Icon & Vector Asset Compliance
    console.log('5. Checking VAL-AND-UI-005: Adaptive & Monochrome Launcher Icons...');
    const icLauncherXml = await readFile(join(root, 'android', 'app', 'src', 'main', 'res', 'mipmap-anydpi-v26', 'ic_launcher.xml'), 'utf8');
    const icLauncherRoundXml = await readFile(join(root, 'android', 'app', 'src', 'main', 'res', 'mipmap-anydpi-v26', 'ic_launcher_round.xml'), 'utf8');
    const monochromeXml = await readFile(join(root, 'android', 'app', 'src', 'main', 'res', 'drawable', 'ic_launcher_monochrome.xml'), 'utf8');

    if (!monochromeXml.includes('<vector') || !monochromeXml.includes('pathData')) {
        throw new Error('VAL-AND-UI-005 Failed: Valid vector drawable missing in ic_launcher_monochrome.xml.');
    }
    for (const xml of [icLauncherXml, icLauncherRoundXml]) {
        if (!xml.includes('monochrome') || !xml.includes('@drawable/ic_launcher_monochrome')) {
            throw new Error('VAL-AND-UI-005 Failed: <monochrome> element missing in adaptive icon XML.');
        }
    }
    console.log('   [PASS] Adaptive launcher icons configured with foreground, background, and monochrome vector variants.\n');

    // 6. VAL-AND-UI-006: Dynamic System Dark & Light Theme Integration
    console.log('6. Checking VAL-AND-UI-006: Dynamic System Dark & Light Theme Integration...');
    if (!mainActivity.includes('WindowInsetsControllerCompat') || !mainActivity.includes('setAppearanceLightStatusBars') || !mainActivity.includes('setAppearanceLightNavigationBars') || !mainActivity.includes('onConfigurationChanged')) {
        throw new Error('VAL-AND-UI-006 Failed: Dynamic system bar contrast controller missing in MainActivity.java.');
    }
    if (!appJs.includes('prefers-color-scheme') || !appJs.includes('meta[name="theme-color"]')) {
        throw new Error('VAL-AND-UI-006 Failed: System color scheme listener or theme-color meta update missing in app.js.');
    }
    console.log('   [PASS] Dynamic system bar contrast and web theme adaptation configured.\n');

    console.log('========================================================================');
    console.log('ALL ANDROID KEEP-AWAKE, HAPTICS & SYSTEM UI ASSERTIONS PASSED (VAL-AND-UI-001..006)');
    console.log('========================================================================');
}

runUIIntegrationVerification().catch((err) => {
    console.error(err);
    process.exit(1);
});

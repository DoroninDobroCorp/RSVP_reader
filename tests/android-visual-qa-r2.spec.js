const { test, expect } = require('@playwright/test');
const { existsSync, readFileSync, readdirSync } = require('node:fs');
const { join, dirname } = require('node:path');
const sharp = require('sharp');

const root = dirname(dirname(__filename));
const matrixDir = join(root, 'evidence', 'android', 'screenshots', 'matrix');
const workflowDir = join(root, 'evidence', 'android', 'screenshots', 'workflow');
const auditPath = join(root, 'evidence', 'android', 'accessibility-audit.json');
const docPath = join(root, 'docs', 'VISUAL_QA.md');

test.describe('Truthful Screenshot Matrix & Accessibility Gate Suite (R2)', () => {

    test('VAL-R2-SCREEN-001: Visual Screenshot Matrix Completeness Across Devices and Locales', async () => {
        expect(existsSync(matrixDir)).toBe(true);
        expect(existsSync(workflowDir)).toBe(true);

        const matrixFiles = readdirSync(matrixDir);
        const workflowFiles = readdirSync(workflowDir);

        // Required screenshot sets
        const requiredMatrixPrefixes = [
            'phone_390x844_en_',
            'phone_390x844_ru_',
            'phone_390x844_es_',
            'phone_320x568_en_',
            'phone_320x568_ru_',
            'phone_320x568_es_',
            'landscape_844x390_en_',
            'landscape_844x390_ru_',
            'landscape_844x390_es_',
            'tablet_800x1280_en_',
            'tablet_800x1280_ru_',
            'tablet_800x1280_es_',
            'tablet_landscape_wide.png',
            'font_scale_1.5_390x844.png'
        ];

        for (const prefix of requiredMatrixPrefixes) {
            const match = matrixFiles.some(f => f.startsWith(prefix) && f.endsWith('.png'));
            expect(match).toBe(true);
        }

        // Required workflow screenshots
        const requiredWorkflow = [
            'step_1_demo_loaded.png',
            'step_2_lang_en.png',
            'step_2_lang_ru.png',
            'step_2_lang_es.png',
            'step_3_rsvp_playing.png',
            'step_4_bookmark_saved.png',
            'step_5_search_results.png',
            'step_6_export_triggered.png'
        ];

        for (const wf of requiredWorkflow) {
            expect(workflowFiles).toContain(wf);
        }
    });

    test('VAL-R2-SCREEN-002: Sidecar Manifest JSON Metadata Pair Validation', async () => {
        const checkSidecars = (dir) => {
            const files = readdirSync(dir);
            const pngs = files.filter(f => f.endsWith('.png'));

            for (const png of pngs) {
                const sidecar1 = join(dir, `${png}.json`);
                const sidecar2 = join(dir, `${png.slice(0, -4)}.json`);
                const sidecarExists = existsSync(sidecar1) || existsSync(sidecar2);
                expect(sidecarExists).toBe(true);

                const manifestPath = existsSync(sidecar1) ? sidecar1 : sidecar2;
                const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

                expect(manifest.gitCommitSha || manifest.commitSha).toBeTruthy();
                expect(manifest.apkSha256).toBeTruthy();
                expect(manifest.avdName).toBeTruthy();
                expect(manifest.locale).toBeTruthy();
                expect(manifest.viewportDimensions).toBeDefined();
                expect(manifest.timestamp).toBeTruthy();
                expect(manifest.appState).toBeTruthy();
            }
        };

        checkSidecars(matrixDir);
        checkSidecars(workflowDir);
    });

    test('VAL-R2-SCREEN-003: Automated Black / Blank Screenshot Detection Filter', async () => {
        const checkEntropy = async (dir) => {
            const files = readdirSync(dir).filter(f => f.endsWith('.png'));

            for (const file of files) {
                const pngPath = join(dir, file);
                const { data, info } = await sharp(pngPath).raw().toBuffer({ resolveWithObject: true });
                const count = info.width * info.height;
                const channels = info.channels;
                let sum = 0;

                for (let i = 0; i < data.length; i += channels) {
                    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
                    sum += lum;
                }
                const mean = sum / count;

                let sqDiffSum = 0;
                for (let i = 0; i < data.length; i += channels) {
                    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
                    sqDiffSum += (lum - mean) * (lum - mean);
                }
                const stdDev = Math.sqrt(sqDiffSum / count);

                // Non-blank / non-black assertions
                expect(stdDev).toBeGreaterThan(2);
                expect(mean).toBeGreaterThan(5);
                expect(mean).toBeLessThan(252);
            }
        };

        await checkEntropy(matrixDir);
        await checkEntropy(workflowDir);
    });

    test('VAL-R2-SCREEN-004 & VAL-R2-SCREEN-005: 44x44 CSS px Touch Target & ARIA Label Accessibility Gate', async () => {
        expect(existsSync(auditPath)).toBe(true);
        const audit = JSON.parse(readFileSync(auditPath, 'utf8'));

        expect(audit.pass).toBe(true);
        expect(audit.totalControls).toBeGreaterThan(0);
        expect(audit.validControls).toBe(audit.totalControls);

        for (const control of audit.controls) {
            expect(control.touchTargetValid).toBe(true);
            expect(control.hasAria).toBe(true);
            expect(control.width).toBeGreaterThanOrEqual(44);
            expect(control.height).toBeGreaterThanOrEqual(44);
            expect(control.ariaLabel.trim().length).toBeGreaterThan(0);
        }
    });

    test('VAL-R2-SCREEN-006: Automated Visual QA Report Generation (docs/VISUAL_QA.md)', async () => {
        expect(existsSync(docPath)).toBe(true);
        const docContent = readFileSync(docPath, 'utf8');

        expect(docContent).toContain('HummingRead R2 Visual QA Evidence & Accessibility Audit');
        expect(docContent).toContain('Screenshot Matrix & Sidecar Manifests');
        expect(docContent).toContain('Accessibility Audit Scores');
        expect(docContent).toContain('100%');
        expect(docContent).toContain('PASSED');
        expect(docContent).toContain('test_avd_api36');
        expect(docContent).toContain('test_tablet_api36');
    });
});

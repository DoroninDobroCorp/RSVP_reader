import { cp, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const nativeRoot = join(root, 'dist-native');
const iosPublic = join(root, 'ios', 'App', 'App', 'public');

// capacitor.config.json intentionally points at the Android-filtered tree so
// `cap sync android` receives Android wording. A full `cap sync` also copies
// that tree into iOS; restore the already-built iOS-native tree afterwards.
await rm(iosPublic, { recursive: true, force: true });
await cp(nativeRoot, iosPublic, { recursive: true });
await rm(join(iosPublic, 'android'), { recursive: true, force: true });

console.log(`Restored iOS public assets from ${nativeRoot}`);

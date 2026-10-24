#!/usr/bin/env bash
set -euo pipefail
if [ "$(uname -s)" != Darwin ] || ! command -v xcodebuild >/dev/null; then
  echo "BLOCKED: Xcode on a macOS build host is required. This script does not run iOS builds on Linux." >&2
  exit 2
fi
cd "$(dirname "$0")/.."
mkdir -p artifacts/ios-xcode
xcodebuild -version | tee artifacts/ios-xcode/toolchain.log
npm ci
npm run cap:sync
npm run ios:verify-source
xcodebuild -project ios/App/App.xcodeproj -scheme App -resolvePackageDependencies 2>&1 | tee artifacts/ios-xcode/resolve.log
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Release -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' -derivedDataPath artifacts/ios-xcode/DerivedData CODE_SIGNING_ALLOWED=NO build analyze 2>&1 | tee artifacts/ios-xcode/build-analyze.log
echo "Unsigned Simulator build/Analyze finished. Device QA and a signed archive are separate release requirements."

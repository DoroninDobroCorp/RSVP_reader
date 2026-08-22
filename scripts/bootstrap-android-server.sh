#!/usr/bin/env bash
set -eo pipefail

echo "===================================================="
echo ">>> HummingRead Android R4 Server Toolchain Bootstrap"
echo "===================================================="

# Path & Host Guards
if [ "${FORCE_BOOTSTRAP:-0}" != "1" ]; then
    if [ "$(uname -s)" != "Linux" ]; then
        echo "[ERROR] Host OS is not Linux ($(uname -s)). Bootstrap is for Ubuntu Linux server." >&2
        exit 1
    fi
    REAL_PWD="$(pwd -P)"
    if [ "$REAL_PWD" != "/srv/hummingread" ] && [ "$REAL_PWD" != "/srv/RSVP_reader" ] && [ "$REAL_PWD" != "/srv/RSVP_reader-r2" ]; then
        echo "[ERROR] Worktree path is '$REAL_PWD', expected '/srv/hummingread' or '/srv/RSVP_reader'." >&2
        exit 1
    fi
    EXPECTED_BRANCH="${EXPECTED_BRANCH:-mission/android-r4-qa-truth-20260813}"
    CURRENT_BRANCH="$(git branch --show-current 2>/dev/null || echo "")"
    if [ "$CURRENT_BRANCH" != "$EXPECTED_BRANCH" ]; then
        echo "[ERROR] Git branch is '$CURRENT_BRANCH', expected '$EXPECTED_BRANCH'." >&2
        exit 1
    fi
fi

# 1. Install / Verify JDK 21
echo "=== Step 1: OpenJDK 21 Installation & Setup ==="
DEFAULT_JAVA_HOME="/usr/lib/jvm/java-21-openjdk-amd64"
if [ ! -d "$DEFAULT_JAVA_HOME" ] && [ -d "/usr/lib/jvm/java-21-openjdk-arm64" ]; then
    DEFAULT_JAVA_HOME="/usr/lib/jvm/java-21-openjdk-arm64"
fi

if [ ! -x "$DEFAULT_JAVA_HOME/bin/java" ]; then
    echo "Installing OpenJDK 21 via apt-get..."
    if command -v apt-get >/dev/null 2>&1; then
        sudo apt-get update -qq || true
        sudo apt-get install -y -qq openjdk-21-jdk openjdk-21-jre-headless unzip wget curl
    else
        echo "[ERROR] apt-get not found and OpenJDK 21 missing at $DEFAULT_JAVA_HOME." >&2
        exit 1
    fi
fi

export JAVA_HOME="$DEFAULT_JAVA_HOME"
export PATH="$JAVA_HOME/bin:$PATH"
echo "JAVA_HOME set to: $JAVA_HOME"
"$JAVA_HOME/bin/java" -version

# 2. Install / Verify Android SDK 36 at /opt/android-sdk
echo "=== Step 2: Android SDK 36 Installation & Setup ==="
TARGET_SDK_DIR="/opt/android-sdk"
if [ ! -d "$TARGET_SDK_DIR" ]; then
    echo "Creating directory $TARGET_SDK_DIR..."
    sudo mkdir -p "$TARGET_SDK_DIR"
    sudo chown -R "$USER:$USER" "$TARGET_SDK_DIR" 2>/dev/null || true
fi

export ANDROID_HOME="$TARGET_SDK_DIR"
export ANDROID_SDK_ROOT="$TARGET_SDK_DIR"

CMDLINE_TOOLS_BIN="$TARGET_SDK_DIR/cmdline-tools/latest/bin"
if [ ! -x "$CMDLINE_TOOLS_BIN/sdkmanager" ]; then
    echo "Installing official Android command-line tools into $TARGET_SDK_DIR..."
    TMP_ZIP="$(mktemp --suffix=.zip)"
    TMP_EXTRACT="$(mktemp -d)"
    
    CMDLINE_TOOLS_URL="https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip"
    curl -sSL "$CMDLINE_TOOLS_URL" -o "$TMP_ZIP" || wget -q "$CMDLINE_TOOLS_URL" -O "$TMP_ZIP"
    
    unzip -q "$TMP_ZIP" -d "$TMP_EXTRACT"
    mkdir -p "$TARGET_SDK_DIR/cmdline-tools/latest"
    cp -r "$TMP_EXTRACT/cmdline-tools/"* "$TARGET_SDK_DIR/cmdline-tools/latest/"
    
    rm -rf "$TMP_ZIP" "$TMP_EXTRACT"
fi

export PATH="$CMDLINE_TOOLS_BIN:$TARGET_SDK_DIR/platform-tools:$TARGET_SDK_DIR/emulator:$TARGET_SDK_DIR/build-tools/36.0.0:$PATH"

echo "Accepting Android SDK licenses..."
yes | "$CMDLINE_TOOLS_BIN/sdkmanager" --sdk_root="$TARGET_SDK_DIR" --licenses >/dev/null 2>&1 || true

echo "Installing required Android SDK packages..."
"$CMDLINE_TOOLS_BIN/sdkmanager" --sdk_root="$TARGET_SDK_DIR" \
    "platform-tools" \
    "platforms;android-36" \
    "build-tools;36.0.0" \
    "emulator" \
    "system-images;android-36;google_apis;x86_64"

yes | "$CMDLINE_TOOLS_BIN/sdkmanager" --sdk_root="$TARGET_SDK_DIR" --licenses >/dev/null 2>&1 || true

# 3. Environment Variable Persistence
echo "=== Step 3: Persisting Environment Variables ==="
PROFILE_SCRIPT="/etc/profile.d/android-sdk.sh"
ENV_CONTENTS="export JAVA_HOME=\"$JAVA_HOME\"
export ANDROID_HOME=\"$TARGET_SDK_DIR\"
export ANDROID_SDK_ROOT=\"$TARGET_SDK_DIR\"
export PATH=\"\$JAVA_HOME/bin:\$ANDROID_HOME/cmdline-tools/latest/bin:\$ANDROID_HOME/platform-tools:\$ANDROID_HOME/emulator:\$ANDROID_HOME/build-tools/36.0.0:\$PATH\""

if [ -w "/etc/profile.d" ] || sudo -n true 2>/dev/null; then
    echo "$ENV_CONTENTS" | sudo tee "$PROFILE_SCRIPT" >/dev/null
    sudo chmod 644 "$PROFILE_SCRIPT"
    echo "Persisted to $PROFILE_SCRIPT"
fi

BASHRC_FILE="$HOME/.bashrc"
if [ -f "$BASHRC_FILE" ]; then
    if ! grep -q "ANDROID_HOME=\"/opt/android-sdk\"" "$BASHRC_FILE" 2>/dev/null; then
        echo "" >> "$BASHRC_FILE"
        echo "# Android SDK & OpenJDK 21" >> "$BASHRC_FILE"
        echo "$ENV_CONTENTS" >> "$BASHRC_FILE"
        echo "Persisted to $BASHRC_FILE"
    fi
fi

PROFILE_FILE="$HOME/.profile"
if [ -f "$PROFILE_FILE" ]; then
    if ! grep -q "ANDROID_HOME=\"/opt/android-sdk\"" "$PROFILE_FILE" 2>/dev/null; then
        echo "" >> "$PROFILE_FILE"
        echo "# Android SDK & OpenJDK 21" >> "$PROFILE_FILE"
        echo "$ENV_CONTENTS" >> "$PROFILE_FILE"
        echo "Persisted to $PROFILE_FILE"
    fi
fi

# 4. KVM Acceleration Access
echo "=== Step 4: Configuring KVM Acceleration Access ==="
if [ -e /dev/kvm ]; then
    if sudo -n true 2>/dev/null; then
        sudo usermod -aG kvm "$USER" 2>/dev/null || true
        sudo chown root:kvm /dev/kvm 2>/dev/null || true
        sudo chmod 660 /dev/kvm 2>/dev/null || true
    fi
    echo "/dev/kvm present and permissions configured."
else
    echo "[WARNING] /dev/kvm not found on host."
fi

# 5. Create Deterministic Phone & Tablet API 36 AVDs
echo "=== Step 5: Creating Phone & Tablet API 36 AVDs ==="
AVDMANAGER_BIN="$CMDLINE_TOOLS_BIN/avdmanager"
if [ -x "$AVDMANAGER_BIN" ]; then
    echo "Creating Phone AVD 'test_avd_api36'..."
    echo "no" | "$AVDMANAGER_BIN" create avd -n test_avd_api36 -k "system-images;android-36;google_apis;x86_64" --device "pixel_6" --force || \
    echo "no" | "$AVDMANAGER_BIN" create avd -n test_avd_api36 -k "system-images;android-36;google_apis;x86_64" --force

    echo "Creating Tablet AVD 'test_tablet_api36'..."
    echo "no" | "$AVDMANAGER_BIN" create avd -n test_tablet_api36 -k "system-images;android-36;google_apis;x86_64" --device "pixel_tablet" --force || \
    echo "no" | "$AVDMANAGER_BIN" create avd -n test_tablet_api36 -k "system-images;android-36;google_apis;x86_64" --force
fi

# 6. Run Toolchain Doctor Diagnostic
echo "=== Step 6: Running Toolchain Doctor Diagnostic ==="
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
node "$SCRIPT_DIR/toolchain-doctor.mjs"

echo "=== Android Server Toolchain Bootstrap Complete ==="

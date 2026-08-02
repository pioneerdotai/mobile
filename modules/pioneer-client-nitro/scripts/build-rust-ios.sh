#!/usr/bin/env bash
set -euo pipefail

MODULE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUST_MODE="${PIONEER_CLIENT_RUST_MODE:-source}"
RUST_ROOT="${PIONEER_RUST_ROOT:-$(cd "$MODULE_ROOT/../../.." && pwd)/pioneer}"
OUT_DIR="$MODULE_ROOT/rust/ios"
FRAMEWORK_PATH="$OUT_DIR/PioneerClientFfi.xcframework"
HEADER_DIR="$OUT_DIR/headers"
IOS_DEPLOYMENT_TARGET="${PIONEER_IOS_DEPLOYMENT_TARGET:-${IPHONEOS_DEPLOYMENT_TARGET:-16.4}}"

if [[ ! "$IOS_DEPLOYMENT_TARGET" =~ ^[0-9]+\.[0-9]+(\.[0-9]+)?$ ]]; then
  echo "Invalid iOS deployment target: $IOS_DEPLOYMENT_TARGET" >&2
  exit 1
fi

# Cargo, rustc, cc-rs, ring, and aws-lc-sys must compile against the same
# minimum iOS version. Without this, cc-rs falls back to the installed SDK
# version while rustc uses its lower built-in target default.
export IPHONEOS_DEPLOYMENT_TARGET="$IOS_DEPLOYMENT_TARGET"
export CMAKE_OSX_DEPLOYMENT_TARGET="$IOS_DEPLOYMENT_TARGET"

if [[ -f "$HOME/.cargo/env" ]]; then
  # shellcheck disable=SC1091
  source "$HOME/.cargo/env"
fi

case "$RUST_MODE" in
  source)
    ;;
  prebuilt)
    "$MODULE_ROOT/scripts/check-rust-prebuilt.sh" ios
    exit 0
    ;;
  *)
    echo "Unknown PIONEER_CLIENT_RUST_MODE: $RUST_MODE" >&2
    echo "Expected one of: source, prebuilt" >&2
    exit 1
    ;;
esac

if ! command -v cargo >/dev/null 2>&1; then
  echo "cargo is required to build pioneer-client-ffi for iOS" >&2
  exit 1
fi

if ! command -v xcodebuild >/dev/null 2>&1; then
  echo "xcodebuild is required to create PioneerClientFfi.xcframework" >&2
  exit 1
fi

mkdir -p "$OUT_DIR" "$HEADER_DIR"
cp "$MODULE_ROOT/cpp/pioneer_client_ffi.h" "$HEADER_DIR/pioneer_client_ffi.h"

cd "$RUST_ROOT"

rustup target add aarch64-apple-ios aarch64-apple-ios-sim >/dev/null
cargo build -p pioneer-client-ffi --release --target aarch64-apple-ios
cargo build -p pioneer-client-ffi --release --target aarch64-apple-ios-sim

rm -rf "$FRAMEWORK_PATH"
xcodebuild -create-xcframework \
  -library "$RUST_ROOT/target/aarch64-apple-ios/release/libpioneer_client_ffi.a" \
  -headers "$HEADER_DIR" \
  -library "$RUST_ROOT/target/aarch64-apple-ios-sim/release/libpioneer_client_ffi.a" \
  -headers "$HEADER_DIR" \
  -output "$FRAMEWORK_PATH"

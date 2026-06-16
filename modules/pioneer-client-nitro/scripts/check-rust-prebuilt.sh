#!/usr/bin/env bash
set -euo pipefail

MODULE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PLATFORM="${1:-all}"
MISSING=0

require_file() {
  local path="$1"
  if [[ ! -f "$path" ]]; then
    echo "Missing prebuilt Rust artifact: $path" >&2
    MISSING=1
  fi
}

check_ios() {
  local framework="$MODULE_ROOT/rust/ios/PioneerClientFfi.xcframework"
  require_file "$framework/Info.plist"
  require_file "$framework/ios-arm64/libpioneer_client_ffi.a"
  require_file "$framework/ios-arm64/Headers/pioneer_client_ffi.h"
  require_file "$framework/ios-arm64-simulator/libpioneer_client_ffi.a"
  require_file "$framework/ios-arm64-simulator/Headers/pioneer_client_ffi.h"
}

check_android() {
  local abi
  for abi in armeabi-v7a arm64-v8a x86 x86_64; do
    require_file "$MODULE_ROOT/rust/android/$abi/libpioneer_client_ffi.so"
  done
}

case "$PLATFORM" in
  ios)
    check_ios
    ;;
  android)
    check_android
    ;;
  all)
    check_ios
    check_android
    ;;
  *)
    echo "Unknown prebuilt Rust platform: $PLATFORM" >&2
    echo "Expected one of: ios, android, all" >&2
    exit 1
    ;;
esac

if [[ "$MISSING" -ne 0 ]]; then
  echo "Build the missing artifacts locally before running an EAS prebuilt build." >&2
  echo "Run: bun run rust:build:prebuilt" >&2
  exit 1
fi

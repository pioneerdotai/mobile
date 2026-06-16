#!/usr/bin/env bash
set -euo pipefail

MODULE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUST_MODE="${PIONEER_CLIENT_RUST_MODE:-source}"
RUST_ROOT="${PIONEER_RUST_ROOT:-$(cd "$MODULE_ROOT/../../.." && pwd)/pioneer}"
OUT_DIR="$MODULE_ROOT/rust/android"

if [[ -f "$HOME/.cargo/env" ]]; then
  # shellcheck disable=SC1091
  source "$HOME/.cargo/env"
fi

case "$RUST_MODE" in
  source)
    ;;
  prebuilt)
    "$MODULE_ROOT/scripts/check-rust-prebuilt.sh" android
    exit 0
    ;;
  *)
    echo "Unknown PIONEER_CLIENT_RUST_MODE: $RUST_MODE" >&2
    echo "Expected one of: source, prebuilt" >&2
    exit 1
    ;;
esac

if ! command -v cargo >/dev/null 2>&1; then
  echo "cargo is required to build pioneer-client-ffi for Android" >&2
  exit 1
fi

if ! command -v cargo-ndk >/dev/null 2>&1; then
  echo "cargo-ndk is required to build pioneer-client-ffi for Android" >&2
  echo "Install it with: cargo install cargo-ndk" >&2
  exit 1
fi

mkdir -p "$OUT_DIR"

cd "$RUST_ROOT"
rustup target add \
  armv7-linux-androideabi \
  aarch64-linux-android \
  i686-linux-android \
  x86_64-linux-android >/dev/null

SONAME_LINK_ARG="-C link-arg=-Wl,-soname,libpioneer_client_ffi.so"
if [[ " ${RUSTFLAGS:-} " != *" ${SONAME_LINK_ARG} "* ]]; then
  export RUSTFLAGS="${RUSTFLAGS:-}${RUSTFLAGS:+ }${SONAME_LINK_ARG}"
fi

cargo ndk \
  -t armeabi-v7a \
  -t arm64-v8a \
  -t x86 \
  -t x86_64 \
  -o "$OUT_DIR" \
  build -p pioneer-client-ffi --release

READELF_BIN=""
if command -v llvm-readelf >/dev/null 2>&1; then
  READELF_BIN="$(command -v llvm-readelf)"
elif command -v readelf >/dev/null 2>&1; then
  READELF_BIN="$(command -v readelf)"
fi

for abi in armeabi-v7a arm64-v8a x86 x86_64; do
  LIBRARY="$OUT_DIR/$abi/libpioneer_client_ffi.so"
  if [[ ! -f "$LIBRARY" ]]; then
    echo "Missing Android Rust library: $LIBRARY" >&2
    exit 1
  fi

  if [[ -n "$READELF_BIN" ]] && ! "$READELF_BIN" -d "$LIBRARY" | grep -q "SONAME.*libpioneer_client_ffi.so"; then
    echo "Android Rust library has an invalid SONAME: $LIBRARY" >&2
    "$READELF_BIN" -d "$LIBRARY" | grep "SONAME" >&2 || true
    exit 1
  fi
done

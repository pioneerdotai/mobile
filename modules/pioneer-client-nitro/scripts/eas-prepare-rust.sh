#!/usr/bin/env bash
set -euo pipefail

MODULE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_ROOT="$(cd "$MODULE_ROOT/../.." && pwd)"
DEFAULT_RUST_ROOT="$(cd "$APP_ROOT/.." && pwd)/pioneer"

RUST_ROOT="${PIONEER_RUST_ROOT:-$DEFAULT_RUST_ROOT}"
RUST_REPO_URL="${PIONEER_RUST_REPO_URL:-https://github.com/pioneerdotai/pioneer.git}"
RUST_REF="${PIONEER_RUST_REF:-main}"

if [[ "${PIONEER_CLIENT_RUST_MODE:-source}" != "source" ]]; then
  echo "Skipping Rust source setup because PIONEER_CLIENT_RUST_MODE=${PIONEER_CLIENT_RUST_MODE}."
  exit 0
fi

if ! command -v cargo >/dev/null 2>&1 || ! command -v rustup >/dev/null 2>&1; then
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --profile minimal
fi

if [[ -f "$HOME/.cargo/env" ]]; then
  # Make rustup-installed tools available to this hook. Build scripts source it again.
  # shellcheck disable=SC1091
  source "$HOME/.cargo/env"
fi

rustup target list >/dev/null

if [[ "${EAS_BUILD_PLATFORM:-}" == "android" ]] && ! command -v cargo-ndk >/dev/null 2>&1; then
  cargo install cargo-ndk --locked
fi

if [[ -f "$RUST_ROOT/Cargo.toml" ]]; then
  echo "Using Pioneer Rust workspace at $RUST_ROOT."
  exit 0
fi

mkdir -p "$(dirname "$RUST_ROOT")"

if ! git clone --depth 1 --branch "$RUST_REF" "$RUST_REPO_URL" "$RUST_ROOT"; then
  rm -rf "$RUST_ROOT"
  git clone --filter=blob:none "$RUST_REPO_URL" "$RUST_ROOT"
  git -C "$RUST_ROOT" fetch --depth 1 origin "$RUST_REF"
  git -C "$RUST_ROOT" checkout --detach FETCH_HEAD
fi

echo "Prepared Pioneer Rust workspace at $RUST_ROOT."

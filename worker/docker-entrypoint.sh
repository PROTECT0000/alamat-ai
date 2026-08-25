#!/bin/sh
set -eu

data_dir="${ALAMATAI_DATA_DIR:-/data}"
database="alamatai-gazetteer"
config="wrangler.selfhost.jsonc"
seed_file=".generated/gazetteer-seed.sql"

migrate_database() {
  mkdir -p "$data_dir"
  ./node_modules/.bin/wrangler d1 migrations apply "$database" \
    --config "$config" \
    --local \
    --persist-to "$data_dir"
}

seed_database() {
  seed_log="$(mktemp)"
  echo "Importing pinned AlamatAI gazetteer into local D1..."
  if ./node_modules/.bin/wrangler d1 execute "$database" \
    --config "$config" \
    --local \
    --persist-to "$data_dir" \
    --file "$seed_file" \
    --yes >"$seed_log" 2>&1; then
    rm -f "$seed_log"
    echo "Gazetteer seed imported successfully."
  else
    cat "$seed_log" >&2
    rm -f "$seed_log"
    return 1
  fi
}

seed_marker() {
  seed_hash="$(sha256sum "$seed_file" | cut -d ' ' -f 1)"
  printf '%s/.alamatai-seed-%s' "$data_dir" "$seed_hash"
}

initialize_database() {
  migrate_database
  marker="$(seed_marker)"
  case "${ALAMATAI_SEED_DATABASE:-auto}" in
    auto)
      if [ ! -f "$marker" ]; then
        seed_database
        touch "$marker"
      fi
      ;;
    always)
      seed_database
      touch "$marker"
      ;;
    never)
      ;;
    *)
      echo "ALAMATAI_SEED_DATABASE must be auto, always, or never" >&2
      exit 64
      ;;
  esac
}

case "${1:-serve}" in
  serve)
    initialize_database
    exec ./node_modules/.bin/wrangler dev \
      --config "$config" \
      --local \
      --ip 0.0.0.0 \
      --port 8787 \
      --persist-to "$data_dir" \
      --show-interactive-dev-session=false
    ;;
  migrate)
    migrate_database
    ;;
  seed)
    migrate_database
    seed_database
    touch "$(seed_marker)"
    ;;
  *)
    exec "$@"
    ;;
esac

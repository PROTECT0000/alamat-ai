# Data provenance

The vendored machine-readable source is `cahyadsn/wilayah` at commit
`ff30136068a4d585fc606a037116678314db4ab2`, licensed under MIT. Its role is
`machine_readable_primary`; it is a community-maintained mirror and is never
called authoritative.

The snapshot header refers to Kepmendagri No. 300.2.2-2138 Tahun 2025. The
Cloudflare D1 seed generator verifies 38 provinces, 514 cities/regencies, 7,285 districts, and
83,762 villages/urban villages, with zero duplicate codes and zero missing
parents before producing the SQL imported by Wrangler.

Postal-code data is optional enrichment. It is not bundled in this MVP, and its
absence never blocks parsing or gazetteer construction.

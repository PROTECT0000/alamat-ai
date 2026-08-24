# Data provenance

The vendored machine-readable source is `cahyadsn/wilayah` at commit
`ff30136068a4d585fc606a037116678314db4ab2`, licensed under MIT. Its role is
`machine_readable_primary`; it is a community-maintained mirror and is never
called authoritative.

The snapshot header refers to Kepmendagri No. 300.2.2-2138 Tahun 2025. The
Cloudflare D1 seed generator verifies 38 provinces, 514 cities/regencies, 7,285 districts, and
83,762 villages/urban villages, with zero duplicate codes and zero missing
parents before producing the SQL imported by Wrangler.

Postal-code enrichment comes from `sooluh/kodepos` at commit
`dd6d45b5b203a34dbf9064232a4f19cedbd450f7`, licensed under Apache-2.0. The
seed generator downloads the pinned JSON, verifies its SHA-256 and 83,761-row
shape, and imports every locality. Its 10,671 distinct postal codes are not
treated as unique identifiers. Where hierarchy names match the primary
gazetteer unambiguously, the importer also attaches the corresponding village
region code; unmatched enrichment rows remain usable by their normalized
locality names.

Postal data is an enrichment source rather than administrative authority. The
parser uses it to fill only values shared by every matching row. Ambiguous
postal codes or place names remain unresolved and produce clarification instead
of an arbitrary guess.

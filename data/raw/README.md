# Pinned data snapshot

- Source: `https://github.com/cahyadsn/wilayah`
- Commit: `ff30136068a4d585fc606a037116678314db4ab2`
- `wilayah.sql` SHA-256: `c4c3396d9380d4edee072af1d9dff83573b574d7cd00a6562cf82e200e954031`
- Role: `machine_readable_primary` (community-maintained, not authoritative)
- License: MIT, vendored as `LICENSE.cahyadsn`
- Source file: `db/wilayah.sql`

The source file identifies its regulation snapshot as Kepmendagri No.
300.2.2-2138 Tahun 2025. It contains 38 provinces, 514 cities/regencies,
7,285 districts, and 83,762 villages/urban villages.

Postal enrichment is downloaded during seed generation from
`sooluh/kodepos/data/kodepos.json`, pinned at commit
`dd6d45b5b203a34dbf9064232a4f19cedbd450f7` with SHA-256
`7f3f5b29b66aa8a77cd208904301e4660d884b91353cc6ef39b64c6c2faa1525`.
The Apache-2.0 dataset contains 83,761 locality rows and 10,671 distinct postal
codes. Postal codes are intentionally non-unique; each locality remains a
separate database row.

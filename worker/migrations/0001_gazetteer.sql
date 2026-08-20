PRAGMA foreign_keys = ON;

CREATE TABLE regions (
    code TEXT PRIMARY KEY,
    level TEXT NOT NULL CHECK (level IN ('province', 'city', 'district', 'village')),
    kind TEXT NOT NULL,
    parent_code TEXT REFERENCES regions(code),
    name TEXT NOT NULL,
    normalized_name TEXT NOT NULL
);

CREATE INDEX idx_regions_level_name ON regions(level, normalized_name);
CREATE INDEX idx_regions_parent ON regions(parent_code);

CREATE TABLE region_aliases (
    region_code TEXT NOT NULL REFERENCES regions(code),
    normalized_alias TEXT NOT NULL,
    alias_type TEXT NOT NULL,
    PRIMARY KEY (region_code, normalized_alias)
);

CREATE INDEX idx_region_aliases_name ON region_aliases(normalized_alias);

CREATE TABLE postal_codes (
    region_code TEXT NOT NULL REFERENCES regions(code),
    postal_code TEXT NOT NULL,
    source_role TEXT NOT NULL DEFAULT 'enrichment',
    PRIMARY KEY (region_code, postal_code)
);

CREATE INDEX idx_postal_codes_code ON postal_codes(postal_code);

CREATE TABLE source_metadata (
    id INTEGER PRIMARY KEY,
    source_name TEXT NOT NULL,
    source_url TEXT NOT NULL,
    commit_hash TEXT NOT NULL,
    commit_date TEXT,
    license TEXT NOT NULL,
    regulation_version TEXT,
    source_role TEXT NOT NULL CHECK (source_role IN ('official_benchmark', 'machine_readable_primary', 'cross_check', 'enrichment')),
    record_count INTEGER NOT NULL DEFAULT 0,
    build_timestamp TEXT NOT NULL,
    notes TEXT
);

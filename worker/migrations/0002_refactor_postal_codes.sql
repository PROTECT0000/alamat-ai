DROP INDEX IF EXISTS idx_postal_codes_code;
DROP TABLE postal_codes;

CREATE TABLE postal_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL CHECK (length(code) = 5 AND code NOT GLOB '*[^0-9]*'),
    village TEXT NOT NULL,
    normalized_village TEXT NOT NULL,
    district TEXT NOT NULL,
    normalized_district TEXT NOT NULL,
    regency TEXT NOT NULL,
    normalized_regency TEXT NOT NULL,
    province TEXT NOT NULL,
    normalized_province TEXT NOT NULL,
    latitude REAL NOT NULL CHECK (latitude BETWEEN -11 AND 6),
    longitude REAL NOT NULL CHECK (longitude BETWEEN 95 AND 141),
    elevation INTEGER NOT NULL,
    timezone TEXT NOT NULL CHECK (timezone IN ('WIB', 'WITA', 'WIT')),
    village_region_code TEXT REFERENCES regions(code),
    source_role TEXT NOT NULL DEFAULT 'enrichment'
);

CREATE INDEX idx_postal_codes_code ON postal_codes(code);
CREATE INDEX idx_postal_codes_village ON postal_codes(normalized_village, normalized_district, normalized_regency, normalized_province);
CREATE INDEX idx_postal_codes_district ON postal_codes(normalized_district, normalized_regency, normalized_province);
CREATE INDEX idx_postal_codes_regency ON postal_codes(normalized_regency, normalized_province);
CREATE INDEX idx_postal_codes_region ON postal_codes(village_region_code);

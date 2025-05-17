UPDATE stores
SET geometry = ST_SetSRID(
        ST_MakePoint(
                split_part(location, ',', 2)::DOUBLE PRECISION, -- longitude
                split_part(location, ',', 1)::DOUBLE PRECISION  -- latitude
        ),
        4326
                   )
WHERE location IS NOT NULL;

# Habitation CSV import

Required columns:

```csv
code,name,state,district,taluk,latitude,longitude,population,households
```

Optional risk-input columns:

```csv
vulnerability_score,infrastructure_resilience_score,drainage_score,elevation_m,slope_deg,river_distance_km,rainfall_trend_percent,land_use_change_percent,population_growth_rate_percent
```

Scores are 0–100. Percent/rate fields are numeric percentages. Invalid rows are rejected with line-level errors.

# Standardised Plug Types

This document describes the canonical plug type identifiers used throughout VoltSpot and how raw values from external data sources are mapped onto them.

Only AC charging connectors that are relevant to e-bikes are included as dedicated types. Car-only DC fast-charge connectors (CCS, CHAdeMO, Tesla/NACS, GB/T) are normalised to `Other` and are not exposed as filter options.

## Canonical Plug Types

| Canonical Key | Cyclist-Friendly Name                  | Icon | Typical Use Case                                      |
|---------------|----------------------------------------|------|-------------------------------------------------------|
| `Type 2`      | Type 2 (Mennekes)                      | 🔌   | AC EV charging — Europe (common on dedicated e-bikes) |
| `Type 1`      | Type 1 (J1772)                         | 🔌   | AC EV charging — North America & Japan                |
| `Schuko`      | Schuko / CEE 7/4 (European Outlet)     | 🔌   | Standard household outlet — Germany, Netherlands, etc.|
| `UK`          | UK 3-Pin (BS 1363)                     | 🔌   | Standard household outlet — United Kingdom            |
| `US`          | US Outlet (NEMA)                       | 🔌   | Standard household outlet — USA & Canada              |
| `Swiss`       | Swiss Outlet (SEV 1011)                | 🔌   | Standard household outlet — Switzerland               |
| `French`      | French / Belgian Outlet (CEE 7/5)      | 🔌   | Standard household outlet — France, Belgium, Poland   |
| `CEE Blue`    | CEE Blue (Camping / Outdoor)           | 🔌   | 16 A blue CEE plug — campsites, outdoor venues        |
| `Other`       | Other                                  | 🔌   | Any connector that does not match the above           |

## Normalisation

All raw plug-type strings — whether coming from the OpenChargeMap API, OpenStreetMap socket tags, or user-submitted data — are normalised to one of the canonical keys above via the `normalizePlugType()` function exported from `lib/plugTypes.ts`.

Car-only types are checked first inside `normalizePlugType` to prevent false positives: for example `"CCS (Type 2)"` must not be treated as `Type 2`.

### OpenStreetMap Socket Tags

OSM stations carry `socket:*` tags. The suffix (the part after `socket:`) is mapped as follows:

| OSM Tag Suffix                              | Canonical Key |
|---------------------------------------------|---------------|
| `schuko`                                    | `Schuko`      |
| `type2` / `type2_cable`                     | `Type 2`      |
| `type3c`                                    | `Type 2`      |
| `type1` / `type1_cable`                     | `Type 1`      |
| `bs1363`                                    | `UK`          |
| `nema_5_15` / `nema_5_20` / `nema_14_30` / `nema_14_50` / `nema_6_20` | `US` |
| `sev1011`                                   | `Swiss`       |
| `typee` / `cee_7_5`                         | `French`      |
| `cee_blue` / `cee_16a_blue` / `cee_16a_ceeform` | `CEE Blue` |
| `ccs` / `ccs_combo1` / `ccs_combo2`         | `Other`       |
| `chademo`                                   | `Other`       |
| `tesla_supercharger` / `tesla_roadster` / `nacs` | `Other`  |
| `gbt_ac` / `gbt_dc`                         | `Other`       |
| *(anything else)*                           | `Other`       |

### OpenChargeMap Connection Types

OCM connection type titles (e.g. `"Type 2 (Socket Only)"`, `"Schuko"`) are matched using keyword patterns:

| Keywords matched (case-insensitive)                                       | Canonical Key |
|---------------------------------------------------------------------------|---------------|
| `ccs`, `combo`, `chademo`, `cha-demo`, `tesla`, `nacs`, `supercharger`, `gb/t`, `gb_t`, `gbt` | `Other` (car-only — checked first) |
| `type 2`, `type2`, `mennekes`, `iec 62196-2`, `iec62196`                  | `Type 2`      |
| `type 1`, `type1`, `j1772`, `sae j1772`                                   | `Type 1`      |
| `schuko`, `standard outlet`, `cee 7/4`                                    | `Schuko`      |
| `bs 1363`, `bs1363`, `uk 3-pin`, `uk plug`, exact `type g`                | `UK`          |
| `nema`, `us standard`, `american plug`, exact `type a` / `type b`         | `US`          |
| `sev 1011`, `sev1011`, `type j / sev`, `swiss outlet`                     | `Swiss`       |
| `french outlet`, `belgian outlet`, `cee 7/5`, exact `type e`              | `French`      |
| `cee blue`, `cee 16a`, `ceeform`, `camping plug`                          | `CEE Blue`    |
| *(no keyword match)*                                                      | `Other`       |

Duplicate canonical types arising from multiple connectors of the same kind are de-duplicated before being stored.

## Adding New Plug Types

1. Add the new key to the `PlugType` union in `lib/plugTypes.ts`.
2. Add an entry to `ALL_PLUG_TYPES`, `PLUG_FRIENDLY_NAMES`, `PLUG_ICONS`, and `PLUG_COLORS`.
3. Add the relevant OSM socket suffix(es) to `OSM_SOCKET_MAP`.
4. Add keyword patterns to `normalizePlugType()` if needed for OCM / user-input matching.
5. Update this document.


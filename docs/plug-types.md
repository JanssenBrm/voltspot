# Standardised Plug Types

This document describes the canonical plug type identifiers used throughout VoltSpot and how raw values from external data sources are mapped onto them.

## Canonical Plug Types

| Canonical Key | Cyclist-Friendly Name        | Icon | Typical Use Case                                    |
|---------------|------------------------------|------|-----------------------------------------------------|
| `Type 1`      | Type 1 (J1772)               | 🔌   | AC charging — North America & Japan                 |
| `Type 2`      | Type 2 (Mennekes)            | 🔌   | AC charging — Europe (most common EV/e-bike socket) |
| `Schuko`      | Schuko (Standard Outlet)     | 🔌   | Standard household outlet — bring your own charger  |
| `CCS`         | CCS (Fast Charge)            | ⚡   | DC fast charging — CCS Combo 1 & 2                 |
| `CHAdeMO`     | CHAdeMO (Fast Charge)        | ⚡   | DC fast charging — older standard                   |
| `GBT`         | GB/T (China)                 | 🔌   | China national standard (AC & DC)                   |
| `Tesla`       | Tesla / NACS                 | ⚡   | Tesla Supercharger / North American Charging Standard|
| `Other`       | Other                        | 🔌   | Any connector that does not match the above         |

## Normalisation

All raw plug-type strings — whether coming from the OpenChargeMap API, OpenStreetMap socket tags, or user-submitted data — are normalised to one of the canonical keys above via the `normalizePlugType()` function exported from `lib/plugTypes.ts`.

### OpenStreetMap Socket Tags

OSM stations carry `socket:*` tags. The suffix (the part after `socket:`) is mapped as follows:

| OSM Tag Suffix            | Canonical Key |
|---------------------------|---------------|
| `schuko`                  | `Schuko`      |
| `type2` / `type2_cable`   | `Type 2`      |
| `type1` / `type1_cable`   | `Type 1`      |
| `type3c`                  | `Type 2`      |
| `type3a`                  | `Other`       |
| `ccs` / `ccs_combo1` / `ccs_combo2` | `CCS` |
| `chademo`                 | `CHAdeMO`     |
| `tesla_supercharger` / `tesla_roadster` | `Tesla` |
| `nacs`                    | `Tesla`       |
| `gbt_ac` / `gbt_dc`       | `GBT`         |
| *(anything else)*         | `Other`       |

### OpenChargeMap Connection Types

OCM connection type titles (e.g. `"Type 2 (Socket Only)"`, `"CCS (Type 2)"`) are matched using keyword patterns:

| Keywords matched (case-insensitive)                     | Canonical Key |
|---------------------------------------------------------|---------------|
| `schuko`, `standard outlet`, `household`                | `Schuko`      |
| `type 2`, `type2`, `mennekes`, `iec 62196-2`, `iec62196`| `Type 2`      |
| `type 1`, `type1`, `j1772`, `sae j1772`                 | `Type 1`      |
| `ccs`, `combo`                                          | `CCS`         |
| `chademo`, `cha-demo`                                   | `CHAdeMO`     |
| `gb/t`, `gbt`, `gb_t`                                   | `GBT`         |
| `tesla`, `nacs`, `supercharger`                         | `Tesla`       |
| *(no keyword match)*                                    | `Other`       |

Duplicate canonical types arising from multiple connectors of the same kind are de-duplicated before being stored.

## Adding New Plug Types

1. Add the new key to the `PlugType` union in `lib/plugTypes.ts`.
2. Add an entry to `ALL_PLUG_TYPES`, `PLUG_FRIENDLY_NAMES`, `PLUG_ICONS`, and `PLUG_COLORS`.
3. Add the relevant OSM socket suffix(es) to `OSM_SOCKET_MAP`.
4. Add keyword patterns to `normalizePlugType()` if needed for OCM / user-input matching.
5. Update this document.

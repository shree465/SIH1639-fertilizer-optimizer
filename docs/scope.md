# Scope — SIH1639 Fertilizer Optimizer

**Status:** finalized (Phase 0, Task 0.5) on 2026-08-16.
**Decided by:** project owner, in response to an explicit scoping question. Not inferred.

This document is the single source of truth for what the demo covers. It is closed —
do not reopen or redesign the scope unless the project owner explicitly asks.

---

## Locked decisions

| Item | Decision |
| --- | --- |
| **Selected crop** | Rice / Paddy (kharif season) |
| **Selected state** | Maharashtra |
| **Authoritative source body** | Maharashtra State Agricultural Universities — MPKV Rahuri and PDKV Akola; plus ICAR AICRP-STCR (via ICAR-IISS Bhopal) for the soil-test-based rule † |
| **Demo farmer / persona** | Smallholder with a Soil Health Card in hand |
| **Plot size** | 1 acre |
| **Land unit** | Acre |

† **Source-authority correction, not a scope change (2026-08-16).** The crop, state, persona,
plot size and land unit above are untouched. Only this row was amended, to record that the
soil-test-based rule adopted in Task 0.4 (R2) comes from ICAR's AICRP on Soil Test Crop Response,
which was not yet identified when this table was first written. See `docs/sources.md` §S3.

---

## Applicability note — for the project owner to review (no decision taken)

The adopted STCR soil-test rule is published for transplanted paddy at the Rahuri (Maharashtra)
centre and names the districts it was calibrated for: **Nasik, Pune, Nandurbar, Gadchiroli,
Kolhapur** (soil: Typic Ustorthents; situation: irrigated; variety: Indrayani).

The locked scope says "Maharashtra" without naming a district, which is broader than the rule's
stated validity. This is flagged, not resolved — **no district has been selected and the scope has
not been narrowed.** If the demo should present the soil-test rule as authoritative, the owner may
want to pin the demo farmer to one of those districts. That is an explicit decision for the owner
to make, not one taken here.

---

## Persona detail

A smallholder rice farmer in Maharashtra who **already holds a Soil Health Card** and currently
over-applies urea. The Soil Health Card is the entry point: the farmer supplies a card ID, the
app reads the soil test values from it, and the recommendation is computed against those values
rather than against a blanket dose.

Endpoints this persona exercises as the primary flow:

- `/soil-lookup/{cardId}` — read the farmer's soil test values
- `/recommend` — produce the corrected nutrient plan
- `/feedback` — capture whether the farmer accepted the recommendation

`/weather`, `/schemes/match` and `/lcc/reading` remain in the API surface but are secondary for
this persona.

---

## Units

Published SAU nutrient tables are stated **per hectare**. The farmer-facing UI speaks in **acres**,
because that is the unit Indian smallholders actually use.

- Canonical storage and computation: kg/ha
- Display and input: acre
- Conversion factor: 1 hectare = 2.4710538 acres

The conversion happens in the recommendation engine. `backend/data/icar_tables.json` stores
per-hectare values exactly as published and performs no conversion.

---

## What this scope excludes

Anything not on the list above is out of scope for the demo: other crops, other states, other
seasons, and other land units. Adding one is a scope change and needs an explicit decision from
the project owner.

---

## Related

- Nutrient data: `backend/data/icar_tables.json`
- Source citations and outstanding research: `docs/sources.md`

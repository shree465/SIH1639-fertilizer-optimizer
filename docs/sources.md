# Sources — nutrient recommendation data

Every numeric value in `backend/data/icar_tables.json` is traceable to an entry below.
Nothing in that file was inferred from memory, averaged, or invented.

**Rules for this file**

1. Only State Agricultural University (SAU) or ICAR publications count as authoritative.
   Blogs, agri-input marketplaces, aggregator sites and search-result snippets do not.
2. Record the exact publication name, the exact URL, the access date, and a verbatim quote
   of the sentence or table the number came from.
3. If a document does not contain something we need, say so explicitly rather than
   substituting a value from elsewhere.
4. Source URLs, once verified, are preserved exactly. Do not shorten or "clean up" URLs.
5. Never mix recommendation regimes. A dose, a split schedule and a soil-test rule may only
   be combined when a single source presents them together for a single regime.

---

## Quick answer for a reviewer

| Question | Answer |
| --- | --- |
| **Authority for the base recommendation** | **S1** MPKV Rahuri — RDF **NPK 100:50:50 kg/ha**, corroborated by **S2** PDKV Akola |
| **Authority for the nitrogen split schedule** | **S1** MPKV Rahuri — but **only** for the 120:60:60 drip-fertigated direct-seeded regime. **No source found for transplanted paddy.** |
| **Authority for the soil-test rule** | **S3** ICAR AICRP-STCR (ICAR-IISS Bhopal) — targeted-yield equations for **transplanted paddy, Rahuri (Maharashtra)** |
| **Unresolved** | **R1** transplanted N split · **R2a** basis of `SP` in the STCR equation (investigated, confirmed unresolvable — engine blocked by `GUARD-R2A-P2O5`) · **R3** kharif/transplanted confirmation of the 100:50:50 RDF |
| **Transformations performed** | Exactly two, both documented below in §Derivations. No scaling of any published dose. |

---

## S1 — MPKV Rahuri, Paddy recommendations (last 10 years)

| Field | Value |
| --- | --- |
| Publisher | Mahatma Phule Krishi Vidyapeeth (MPKV), Rahuri, Maharashtra |
| Document | *Paddy — Recommendation released in last 10 years* |
| URL | https://mpkv.ac.in/Uploads/Research/1.%20Paddy_20200110043402.pdf |
| PDF metadata | Title "Microsoft Word - Recommendation last 10 years"; created 2020-01-10 |
| Extent | 4 pages; 20 numbered recommendations, 2009-10 through 2019-20 |
| Accessed | 2026-08-16 |
| Text layer | Native (not OCR) |
| Verification | PDF downloaded and re-extracted locally in layout-preserving mode; **all 4 pages read in full**. Quotes below are verbatim. |

### Complete inventory of fertilizer-bearing recommendations in S1

This inventory is exhaustive — it is the evidence for the R1 finding, so it lists every
recommendation in the document that carries a nutrient dose.

| Rec. | Regime | Dose (kg/ha) | Split schedule? | In `icar_tables.json`? |
| --- | --- | --- | --- | --- |
| 2019-20 #1 | Summer paddy, transplanted, sub-montane zone, var. Phule Samruddhi | 125 : 62.5 : 62.5 | No | No — summer season, out of scope |
| 2017-18 #6 | RDF, quoted in a sheath-blight/stem-rot IDM module | **100 : 50 : 50** | No | Yes — `rice-mh-mpkv-rdf` |
| 2016-17 #10 | Lowland, Western Ghat Zone, GRD + silicon | 56 : 30 : 50 + 10 t FYM | No | Yes — as corroboration |
| 2015-16 #12 | Lowland, Western Ghat Zone, briquettes only | 56 : 30 : 30 | No | Yes — `...briquette-563030` |
| 2015-16 #13 | Lowland, Western Ghat Zone, GRD + borax | 56 : 30 : 50 + 10 t FYM | No | Yes — `...western-ghat-grd` |
| **2015-16 #14** | **Drip fertigation, direct-seeded on BBF, medium deep soils, W. Maharashtra** | **120 : 60 : 60** | **Yes — 12 weekly splits** | Yes — `rice-mh-mpkv-dsr-drip-bbf` |
| 2013-14 #17 | Drilled paddy, sub-montane zone, 75% of RDF | 75 : 37.5 : 37.5 | No | Yes — as corroboration |

The remaining 13 recommendations concern varieties, weed control, disease management,
nursery and transplanting dates, and economics. None carries a nutrient dose.

### Verbatim quotes from S1

- **RDF for paddy — NPK 100:50:50 kg/ha** (2017-18, rec. no. 6)
  > "Recommended dose of fertilizers i.e. RDF (NPK: 100:50:50 kg/ha) with or without use of briquettes."

  Note the source does **not** qualify this as kharif and does **not** qualify it as
  transplanted. It is recorded exactly as published. See **R3**.

- **Internal corroboration of that RDF** (2013-14, rec. no. 17)
  > "The drilling of paddy at 30 cm spacing followed by application of 75 per cent recommended dose (75: 37.5: 37.5 NPK kg per hectare = 130.5 kg Urea, 82.5 kg DAP and 62.25 kg MOP per hectare)"

- **Drip-fertigated direct-seeded paddy — 120:60:60 with a 12-weekly-split schedule**
  (2015-16, rec. no. 14)
  > "Drip irrigation with 100 % ETc water at alternate day with fertigation of recommended dose
  > (120 : 60: 60 kg N,P2O5 and K2O ha-1) in the form of water soluble fertilizers in 12 weekly
  > splits as per following schedule is recommended for higher productivity, net returns, efficient
  > water and nutrient use for direct seeded paddy on BBF in medium deep soils of Western Maharashtra."

  Table *"Fertilizer Schedule: Per cent nutrients to be applied in 12 weekly splits"*:

  | Days after sowing | N % | N kg/ha | P % | P kg/ha | K % | K kg/ha |
  | --- | --- | --- | --- | --- | --- | --- |
  | 01-21 (3 weeks) | 40 | 48 | 40 | 24 | 35 | 21 |
  | 22-42 (3 weeks) | 30 | 36 | 30 | 18 | 25 | 15 |
  | 43-63 (3 weeks) | 15 | 18 | 20 | 12 | 25 | 15 |
  | 64-91 (3 weeks) | 15 | 18 | 10 | 06 | 15 | 09 |
  | **Total** | 100 | 120 | 100 | 60 | 100 | 60 |

  > ⚠️ **This schedule belongs to the 120:60:60 drip-fertigated direct-seeded regime and to
  > nothing else.** It is not applied to the 100:50:50 blanket RDF anywhere in this project.
  > Rescaling it would cross four boundaries at once: establishment method (direct-seeded vs
  > transplanted), irrigation system (drip vs flood/lowland), fertilizer form (water-soluble vs
  > straight/briquette) and application count (12 vs unknown).

  Note: the source labels the last row "(3 weeks)" although 64-91 days spans four weeks. The
  label is reproduced unaltered in `icar_tables.json` rather than silently corrected.

- **Lowland paddy, Western Ghat Zone — general recommended dose** (2015-16, rec. no. 13)
  > "The application of borax @ 5 kg ha-1 at the time of transplanting with general recommended dose
  > of nutrients (10 t FYM ha-1, 56 kg N and 30 kg P2O5 through Urea-DAP briquettes (170 kg) and
  > 50 kg K2O ha-1) is recommended in boron deficient soils of Western Ghat Zone of Maharashtra for
  > higher yield and returns of lowland paddy."

  Restated in 2016-17, rec. no. 10:
  > "GRD (10 tonnes FYM ha-1, 56 kg N & 30 kg P2O5 through Urea-DAP briquettes & 50 kg k2O ha-1)"

- **Lowland paddy, Western Ghat Zone — briquette-only package** (2015-16, rec. no. 12)
  > "The application of Urea-DAP and MOP briquettes, (56:30:30 N:P2O5:K2O kg ha-1 ; 220 kg briquettes ha-1)
  > after transplanting is recommended for higher yield and returns of lowland paddy in Western Ghat
  > Zone of Maharashtra."

  Recorded as a **separate** entry from the GRD above. The two look similar (56:30:x) but are
  different packages — 56:30:30 briquettes-only versus 56:30:50 plus 10 t FYM.

**Not present anywhere in S1:** any low/medium/high soil-test adjustment rule, and any nitrogen
split schedule for transplanted paddy.

---

## S2 — PDKV Akola, Research Accomplishments and Recommendations 2021

| Field | Value |
| --- | --- |
| Publisher | Dr. Panjabrao Deshmukh Krishi Vidyapeeth (PDKV), Akola — Directorate of Research |
| Document | *Research Accomplishments and Recommendations - 2021* (released during 2020-2021) |
| URL | https://www.pdkv.ac.in/Circulars/Recom-2021English.pdf |
| Extent | 7 pages |
| Accessed | 2026-08-16 |
| Text layer | Native (not OCR) |
| Verification | PDF downloaded and text extracted locally; quote below is verbatim |

Section 3.a *Natural Resource Management / Agronomy*, item 3:

> "Sowing of rice variety Avishkar is recommended under upland irrigated condition of western
> Vidarbha with the fertilizer dose of 100:50:50 kg NPK ha-1 (RDF) along with FeSO4 @ 25 kg ha-1
> and MnSO4 @ 5 kg ha-1 at the time of sowing for obtaining iron and manganese enriched higher
> rice grain yield, grain protein, carbohydrate content and economic returns."

This independently corroborates the 100:50:50 kg/ha figure from a **second** Maharashtra SAU,
under an explicitly stated condition.

**Not present in S2:** any soil-test rule or STCR equation for rice. The document publishes STCR
equations for safflower (attributed to JNKVV, Jabalpur) and sunflower (attributed to MPKV,
Rahuri) only.

---

## S3 — ICAR AICRP-STCR, Four Decades of STCR Research (authority for the soil-test rule)

| Field | Value |
| --- | --- |
| Publisher | All India Coordinated Research Project on Soil Test Crop Response (AICRP on STCR), ICAR; hosted by ICAR-Indian Institute of Soil Science (ICAR-IISS), Bhopal |
| Document | *Four Decades of STCR Research — Crop Wise Recommendations* (internal heading: *Crop-Wise Soil Test Based Recommendations (AICRP on STCR)*) |
| URL | https://iiss.res.in/old/downloads/stcr%20Crop%20wise%20Recommendations.pdf |
| Extent | 280 pages |
| Document date | Not printed in the document; PDF created 2014-10-04 |
| Accessed | 2026-08-16 |
| Text layer | **OCR** — PDF producer is "ABBYY PDF Transformer+" |
| Verification | PDF downloaded and extracted locally in layout-preserving mode. See §Derivations D2 for the consistency check performed against OCR error. |

### The adopted block — "Rahuri, (Maharashtra), Transplanted paddy" (printed page 114)

Recorded verbatim:

```
Crop              : Transplanted paddy          Variety : Indrayani
Soil              : Typic Ustorthents           Situation : Irrigated
Districts         : Nasik, Pune, Nandurbar, Gadchiroli, Kolhapur

Basic Data
  Nutrient    NR (kg q-1)   CS (%)   CF (%)
      N          2.09       13.72    40.15
    P2O5         1.03       65.18    10.92
     K2O         2.67       13.04    97.7

Targeted Yield Equations
FN      = 5.20 T – 0.34 SN
FP2O5   = 9.40 T – 13.66 SP
FK2O    = 2.73 T – 0.16 SK
```

Published ready reckoner, *"Fertilizer prescription for targeted yields of transplanted paddy for
varying soil test values"*:

| Soil test N / P / K (kg ha⁻¹) | 40 q/ha: N | P₂O₅ | K₂O | 45 q/ha: N | P₂O₅ | K₂O |
| --- | --- | --- | --- | --- | --- | --- |
| 100 / 10 / 200 | 174 | 239 | 77 | 200 | 286 | 91 |
| 150 / 15 / 250 | 157 | 171 | 69 | 183 | 218 | 83 |
| 200 / 20 / 300 | 140 | 103 | 61 | 166 | 150 | 75 |
| 250 / 25 / 350 | 123 | 35 | 53 | 149 | 82 | 67 |
| 300 / 30 / 400 | 106 | 25* | 45 | 132 | 25* | 59 |

> "* Minimum dose of P2O5"

### Why this is used instead of a low/medium/high multiplier

The project needed a rule that turns a farmer's Soil Health Card values into a dose. A generic
`low = 1.25 / medium = 1.0 / high = 0.75` multiplier was **not** used, because no authoritative
source publishes one for rice in Maharashtra and inventing one was out of the question. The STCR
equations are strictly better: they are crop-specific, state-specific, soil-test-driven and
published by ICAR.

> ⚠️ **The STCR equations replace the blanket RDF; they do not scale it.** Substituting soil test
> values yields a complete prescription in its own right. At SN = 200 and T = 40 q/ha the equation
> prescribes 140 kg N/ha — this is not "100 kg N/ha adjusted", it is a different method giving a
> different answer. `icar_tables.json` records this relationship explicitly and does not multiply
> the two together.

### Known defects in S3 — recorded because they affect how much this document can be trusted

1. **Stale running headers.** A page headed "Rahuri, (Maharashtra), Rice" contains *sugarcane*
   (Adsali, var. Co 7219) data. Section headers in this compendium are therefore not reliable on
   their own. Only the self-describing body of each block was trusted — the adopted block names
   its own crop, variety, soil, situation and districts internally.
2. **Index page ranges** do not always align with the printed page numbers of the blocks.
3. **The adjacent "Rahuri, (Maharashtra), Upland paddy" block was NOT adopted.** It is out of demo
   scope (Rabi, upland, var. R-24, districts Kolhapur/Sangli/Satara) *and* its ready reckoner
   disagrees with its own equations by ±1 kg in several cells — unlike the transplanted-paddy
   block, which agrees exactly. Recorded here for transparency; deliberately excluded from
   `icar_tables.json` rather than published with an unexplained discrepancy.
4. **Soil test extractants are not named in the adopted block.** Elsewhere the compendium uses
   Alkaline KMnO₄-N, Olsen's-P and NH₄OAc-K. Because the adopted block does not say so itself,
   this is recorded as *not stated* rather than asserted as fact.

---

## Derivations — every transformation performed

Only two transformations were performed on published values. Neither rescales a dose.

### D1 — Arithmetic consistency check on the MPKV RDF

- **Input (published):** "75 per cent recommended dose (75: 37.5: 37.5 NPK kg per hectare)"
- **Operation:** 75 ÷ 0.75 = 100, 37.5 ÷ 0.75 = 50, 37.5 ÷ 0.75 = 50
- **Result:** implies a full RDF of 100:50:50, matching the separately quoted RDF.
- **Status:** a consistency check on two published statements. It creates no new recommendation
  and no new number enters `icar_tables.json` because of it. Marked `value_class: "derived"`.

### D2 — OCR-integrity check on the STCR equations

- **Concern:** S3 is OCR output, so digits could in principle be misrecognised.
- **Operation:** all 30 cells of the published ready reckoner were recomputed from the three
  equations and compared with the printed values.
- **Result:** all 30 agree. The 28 numeric cells match the printed integer exactly. The 2 cells
  printed as "25\*" are precisely those where the P₂O₅ equation yields a value at or below the
  published 25 kg minimum (−33.8 and +13.2).
- **Why this is meaningful:** the equation coefficients and the table cells are printed in
  separate places on the page. Exact agreement across all 30 cells is strong evidence that both
  were read correctly.
- **Method:** **performed by hand, not by an executed script.** A verification script was written
  but not run.
- **Rounding note for the engine:** reproducing the published cell at T = 40, SP = 25 (the
  equation gives exactly 34.5, the table prints 35) requires **round-half-up**. Python's built-in
  `round()` uses banker's rounding and would give 34.
- **What this check does NOT do:** it cannot resolve the `SP` unit ambiguity (R2a below), because
  the ready reckoner is self-consistent under either reading.

---

## Unresolved items — manual action required

These are `null` in `backend/data/icar_tables.json` with `_status: "pending_manual_research"`.
**They must not be filled in from memory or from a non-authoritative site.**

### R1 — Nitrogen split schedule for transplanted kharif paddy · **PENDING**

- **What was ruled out:** the whole of S1 (see the exhaustive inventory above) — it holds exactly
  one split schedule and it belongs to the drip-fertigated direct-seeded regime. S2 has none.
  S3 prescribes rates only and explicitly defers timing: *"will be applied through suitable
  method and time of application i.e. stage of crop"*.
- **Why it was not filled:** rescaling the 120:60:60 fertigation percentages onto the 100:50:50
  transplanted regime is unsupported — different establishment method, irrigation system,
  fertilizer form and application count.
- **Most likely source:** MPKV Rahuri, *Krishi Darshani 2023* —
  https://mpkv.ac.in/Uploads/Publication/Krishi%20Darshani%20%202023_20230607043125.pdf
  (≈58 MB, 491 pages, Marathi).
- **Why it was not extracted:** the PDF is typeset in a legacy non-Unicode Marathi font. Machine
  text extraction returns mojibake, so attributing numbers to the correct rows is not reliable.
- **What to capture:** the percentage or kg of N applied at each stage (basal / at transplanting,
  tillering, panicle initiation), plus page number and a verbatim quote.
- **How the prototype must behave meanwhile:** the engine must **not** emit a split schedule for
  the transplanted regime. It should return total seasonal N with an explicit flag that timing
  guidance is unavailable, rather than inventing stages.

### R2 — Soil-test adjustment rule for rice in Maharashtra · **RESOLVED**

Resolved by **S3**, the AICRP-STCR targeted-yield equations for transplanted paddy at the Rahuri
(Maharashtra) centre. Recorded in `icar_tables.json` as entry `rice-mh-stcr-transplanted-rahuri`.
No low/medium/high multiplier was invented. One residual ambiguity remains — R2a.

### R2a — Basis of the `SP` term in the STCR equation · **PENDING (investigated, confirmed unresolvable)**

**This is not an un-looked-up item.** It was investigated in depth on 2026-08-16 and found to be
genuinely undeterminable from the available sources. The investigation is recorded here so it is
not repeated.

**The ambiguity.** Is `SP` expressed as kg P/ha or kg P₂O₅/ha? The adopted block's table heading
says only "Soil test values (kg ha⁻¹)" and its soil-test column is headed simply "P". The two
readings differ by ≈2.29× in the prescribed P₂O₅ dose — blocking for any real soil-test input.

#### What was checked, and what was found

| # | Step | Finding |
| --- | --- | --- |
| 1 | Inspected the source block and adjacent pages (printed p. 114) | No extractant named, no P basis stated |
| 2 | Searched all 280 pages for units legends | **The document uses both conventions** — see below |
| 3 | Tested whether SP magnitude could discriminate | **It cannot** — see below |
| 4 | Checked all 11 Rahuri blocks for the centre's own convention | All omit the legend structurally |
| 5 | Attempted official AICRP-STCR portal `aicrp.icar.gov.in/stcr/` | DNS did not resolve; not consulted |
| 6 | Consulted an MPKV Rahuri STCR paper on the same soil type | Narrows but does not answer |

**Finding 2 — the compendium uses both conventions, explicitly.**

Six blocks carry a "Soil Test Values :" legend, and every one says P₂O₅:

> "Olsen's P expressed in kg P2O5/ha"
> — Bihar (Young Alluvium Calcareous Soil), Wheat, RAU Pusa, printed page 76; same wording in the
> Jharkhand red loam/laterite paddy block (with Bray's P1)

But other blocks in the same document express `SP` elementally:

> "FP2O5 = Critical value for SP = 13 kg P ha-1"

So there is **no document-wide convention** to fall back on. This is the key finding: the
ambiguity is real and structural, not an isolated omission.

**Finding 3 — magnitude cannot discriminate, so the tempting inference is invalid.**

It is tempting to argue "SP of 10-30 kg/ha looks like elemental Olsen-P, therefore it is
elemental". That argument was tested and **fails**. The Bihar wheat block *explicitly declares the
P₂O₅ basis* and states:

> "Soil phosphorus range : 4- 40 kg P2O5/ha"

with a ready-reckoner `SP` column running 4 to 22. The Rahuri paddy `SP` column runs 10 to 30.
**The ranges overlap.** A declared-P₂O₅ block and the Rahuri block occupy the same numeric
territory, so magnitude is not evidence either way.

**Finding 4 — the Rahuri centre omits the legend structurally.**

All eleven Rahuri (Maharashtra) blocks — transplanted paddy, upland paddy, wheat, pearl millet,
sorghum, cotton, sugarcane, groundnut, soybean, sunflower, pigeonpea, chickpea, onion and others —
use a compact template (Crop/Variety, Soil/Situation, Districts, Basic Data, Equations, reckoner)
that omits both the "Soil Test Values" legend and the "Soil phosphorus range" line. There is no
sibling Rahuri block to borrow a declared convention from.

**Finding 6 — related but not determinative.**

MPKV Rahuri's own Soil Test Crop Response Correlation Project (Department of Soil Science and
Agricultural Chemistry, MPKV Rahuri) publishes STCR studies on Typic Ustorthent soils — the same
soil type as the adopted paddy block — reporting soil test P as *Olsen's P* in kg ha⁻¹:

> "Olsen-P from 16.17 to 22.63 kg ha-1"
> — *Soil test crop response correlation studies for targeting yield of tomato*, Soil Test Crop
> Response Correlation Project, Dept. of Soil Science and Agricultural Chemistry, MPKV Rahuri,
> Ahmednagar. https://journal.iahs.org.in/index.php/ijh/article/download/1440/730

This establishes the **extractant** (Olsen's P) but still not the **reporting basis**. It narrows
the question without answering it.

#### Conclusion

`SP` basis remains **unresolved**. Recording either reading would be a guess, and Finding 3 shows
the one available numerical argument is invalid. Left `null` with
`_status: "pending_manual_research"`.

#### Enforcement — the engine is blocked, not merely warned

`backend/data/icar_tables.json` now carries a machine-readable guard, `engine_guards` →
**`GUARD-R2A-P2O5`** (severity `blocking`):

- **Forbidden:** computing P₂O₅ by substituting a real Soil Health Card P value into
  `FP2O5 = 9.40 T − 13.66 SP`; interpolating P₂O₅ from an arbitrary `SP`; applying a 2.29 factor
  to make the numbers look right.
- **Permitted:** reproducing the published ready-reckoner rows verbatim; computing **FN** and
  **FK₂O**, whose `SN` and `SK` terms *are* unambiguously kg/ha per the source's own column heading.
- **Required behaviour:** return P₂O₅ as unavailable with a machine-readable reason code
  referencing R2a. Do not silently omit it, and do not substitute the blanket RDF's 50 kg P₂O₅/ha
  without labelling the substitution.
- **Clears when:** R2a reaches status `RESOLVED` with a cited authoritative statement.

#### Fastest route to resolution

Contact the AICRP-STCR centre at the Department of Soil Science and Agricultural Chemistry, MPKV
Rahuri, and ask directly whether `SP` in their published targeted-yield equations is Olsen's P as
measured (kg P/ha) or converted to kg P₂O₅/ha. Alternatively retry `aicrp.icar.gov.in/stcr/` for
canonical AICRP notation once the host resolves.

### R3 — Kharif/transplanted confirmation of the 100:50:50 RDF · **PENDING**

- **The gap:** MPKV states 100:50:50 as the general paddy RDF without qualifying season or
  establishment method. The demo scope is specifically kharif transplanted paddy.
- **What to capture:** a kharif-and-transplanted-specific figure from an official Maharashtra
  Package of Practices, with source and URL.
- **Note:** the STCR entry (S3) *is* explicitly transplanted, so it does not share this gap.

---

## Sources consulted that did NOT yield a usable rule

Recorded so the search is not silently repeated.

| Source | Why not used |
| --- | --- |
| MPKV *Krishi Darshani 2023* (58 MB, 491 pp.) | Legacy non-Unicode Marathi font; extraction yields mojibake. Still the best candidate for R1. |
| PDKV Akola 2021 STCR equations | Published for safflower and sunflower only, not rice. |
| S3 "Rahuri, Upland paddy" block | Out of scope (Rabi, upland) and ready reckoner disagrees with its own equations by ±1. |
| Web search snippets asserting "50% basal, 25% tillering, 25% panicle initiation" | Traced only to journal articles and aggregator sites, not to a Maharashtra Package of Practices. Not authoritative for this project. |
| Rice STCR equations for other states (e.g. var. Rajeshwari) | Wrong state; STCR equations are calibrated per soil and centre and are not transferable. |

---

## Phase 3 Sourced Citations & Technology Path

### S4 — Fertilizer Maximum Retail Prices (MRP)
- **Urea MRP (₹242 per 45 kg bag):** Statutorily fixed by the Department of Fertilizers, Government of India.
  - Source: Department of Fertilizers Urea Pricing Policy (https://www.fert.nic.in/urea-pricing-policy-section)
  - Access Date: 2026-08-16
- **DAP MRP (₹1,350 per 50 kg bag):** Maintain stabilised price through government subsidy.
  - Source: Department of Fertilizers Subsidy Notifications (https://www.fert.nic.in/)
  - Access Date: 2026-08-16
- **MOP MRP (₹1,700 per 50 kg bag - NBS Mid-range Assumption):** Potash is decontrolled and subsidised under the Nutrient Based Subsidy (NBS) scheme. Actual prices vary (₹900 - ₹2,200). We assume ₹1,700 as a representative value.
  - Source: NBS scheme notifications (https://www.fert.nic.in/)

### S5 — Leaf Colour Chart (LCC)
- **Bands and nitrogen rules:** The critical value is 4 for transplanted paddy. Band < 4 recommends nitrogen top-dressing.
  - Source: IRRI (International Rice Research Institute) Leaf Color Chart Guidelines (http://www.irri.org/resources/publications/leaf-color-chart)
  - Access Date: 2026-08-16

### S6 — Government Subsidy Schemes
- **PM-KISAN eligibility:** Direct income support of ₹6,000/year for landholding farmer families.
  - Source: PM-KISAN Portal, Department of Agriculture & Farmers Welfare (https://pmkisan.gov.in/)
- **Soil Health Card scheme:** Free soil testing every 2 years.
  - Source: SHC Portal, Department of Agriculture and Farmers Welfare (https://soilhealth.dac.gov.in/)
- **PMFBY eligibility:** Crop insurance at 2% premium for Kharif crops.
  - Source: PMFBY Portal, Department of Agriculture & Farmers Welfare (https://pmfby.gov.in/)

### S7 — Voice Interface Technology Path
- **Speech-to-Text & Text-to-Speech:** Native browser Web Speech API is used as a demonstration-only prototype. It does not provide universal browser coverage or local dialect support.
- **Production Path:** For production applications in Indian rural areas, integration with **Bhashini** (https://bhashini.gov.in/) — the National Language Translation Mission's AI translation system — is the recommended architecture. Bhashini provides robust Speech-to-Text and Text-to-Speech in 22 scheduled Indian languages, including regional accents.

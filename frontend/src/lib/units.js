/**
 * Land unit handling.
 *
 * The backend accepts only `acre` and `hectare` (see LandUnit in the OpenAPI
 * schema). Bigha is offered in the UI because farmers use it, and is converted
 * to acre before the request is sent. The conversion is surfaced in the UI so
 * the farmer can see exactly what was submitted — it is never silent.
 *
 * NOTE ON BIGHA: bigha has no single national definition; it varies by region
 * (roughly 0.25 to 1.0 acre). The value below is the "pucca bigha" of
 * 3025 sq yd. It is NOT a Maharashtra unit — Maharashtra uses acre, hectare
 * and guntha — so this factor is flagged as needing confirmation before any
 * real deployment. See the Phase 2 report.
 */

export const BIGHA_TO_ACRE = 0.625
export const BIGHA_IS_UNCONFIRMED = true

export const LAND_UNITS = [
  { value: 'acre', label: 'Acre', backendUnit: 'acre', toBackend: (v) => v },
  { value: 'hectare', label: 'Hectare', backendUnit: 'hectare', toBackend: (v) => v },
  {
    value: 'bigha',
    label: 'Bigha',
    backendUnit: 'acre',
    toBackend: (v) => v * BIGHA_TO_ACRE,
    note: `Converted to acre at ${BIGHA_TO_ACRE} acre per bigha before sending. Bigha varies by region — confirm for your district.`,
  },
]

export function getUnit(value) {
  return LAND_UNITS.find((u) => u.value === value) ?? LAND_UNITS[0]
}

/**
 * Turn a land size + UI unit into the `plot` object the backend expects.
 * @returns {{area: number, unit: 'acre'|'hectare'}}
 */
export function toBackendPlot(landSize, landUnit) {
  const unit = getUnit(landUnit)
  const area = unit.toBackend(Number(landSize))
  return { area: Number(area.toFixed(6)), unit: unit.backendUnit }
}

/** Human-readable description of what will actually be submitted. */
export function describeSubmittedPlot(landSize, landUnit) {
  const plot = toBackendPlot(landSize, landUnit)
  const unit = getUnit(landUnit)
  if (unit.backendUnit === unit.value) {
    return `${plot.area} ${plot.unit}`
  }
  return `${landSize} ${unit.label.toLowerCase()} → submitted as ${plot.area} ${plot.unit}`
}

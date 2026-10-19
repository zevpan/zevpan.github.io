# Finance Control Hub · Case Study 06

Interactive finance reconciliation proof of concept for the Zev Pan portfolio, using generated demonstration records.

- Case study: index.html
- Demo: demo/index.html
- Rule engine: demo/engine.js
- Browser workflow/state: demo/app.js
- Fixed-seed generator: ../../scripts/generate-finance-data.mjs
- Browser source bundle: demo/data/source-data.json
- Test-only expected outcomes: ../../test/fixtures/finance-ground-truth.json
- Automated checks: ../../test/finance-control-hub.test.mjs

## Demo source schemas

All identifiers, vendors, currencies, amounts and shipment relationships are invented. The file schemas are proposed for this simulation; they are not official CargoWise report formats.

| Source | Illustrative fields |
|---|---|
| Vendor invoice lines | vendor, invoice number/date/line ID, Job/MAWB/HAWB, PO, description, vendor charge code, currency, unit price, quantity, tax, line amount, invoice total, source status |
| HAWB report | HAWB, Job ID, MAWB, origin, destination, pieces, gross weight, status |
| MAWB report | MAWB, carrier, origin, destination, linked house-shipment count, status |
| Accrue Cost | Job ID, HAWB/MAWB, PO, accrual reference, vendor, charge code, currency, accrued amount, tax treatment, status |

The generated batch contains 4,000 vendor invoice lines, 4,095 HAWB rows, 512 MAWB rows, 4,055 accrual rows and 40 explicit vendor-code mappings.

## Reconciliation rules

1. Normalize reference punctuation/case and resolve Job ID, HAWB and MAWB values to intersecting shipment records.
2. Require an explicit vendor and vendor-code mapping. No description-based charge mapping is written automatically.
3. Compare same-vendor, same-shipment, same-charge-family, same-currency accruals; conflicting PO references block an automatic match.
4. Accept a unique exact amount; accept a unique difference within ±0.05 as rounding tolerance.
5. Detect same-invoice duplicate lines and identical CargoWise-style accrual fingerprints.
6. Route missing PO, large variance, currency/tax mismatch, multiple candidates, invalid references, missing data and unmapped charges to Finance.
7. Identify one-to-many and many-to-one totals with bounded subset matching. Grouped records remain unapproved until a reviewer approves the complete group.
8. Reserve auto-matched and grouped accrual references so a source accrual cannot be allocated to another automatic match.
9. Exclude source records marked exported. After the local CSV download, the same demo records are excluded from a second export.

The ±0.05 tolerance is a configurable demo default, not an accounting policy recommendation. No exchange-rate conversion is inferred.

## Command registry

The local router supports reconciliation, missing-PO search, largest discrepancy sorting, exception explanation, vendor grouping, duplicate review, safe-match review, export review and priority review. Unsupported instructions do not alter state. No live model call is made.

A simulated AI assist may suggest a possible charge family from an unrecognized description. It is labeled as a suggestion, is not applied, and cannot make a financial match.

## Human control and export

- Normalization, mapping lookup, arithmetic, candidate indexing and duplicate checks are deterministic.
- Ambiguous, grouped, missing-PO, large-variance, currency and conflicting-reference decisions require review.
- The browser stores review decisions in localStorage; they do not update CargoWise or a finance database.
- Export release requires an explicit checkbox attestation and downloads a local CSV.
- The CSV columns are an illustrative CargoWise-style import mapping. No official EDI workbook/template was provided or validated; the output is not represented as production-compatible.

## Ground-truth validation

The generator creates the source records and a separate test answer key. engine.js never imports or fetches the answer key. The demo downloads only demo/data/source-data.json.

From the repository root, run the generator with node scripts/generate-finance-data.mjs and the tests with node --test test/finance-control-hub.test.mjs.

The labels intentionally include exact matches, normalized identifiers, mapped charges, rounding, both grouped directions, missing POs, over/under variances, duplicate invoice lines, duplicate accruals, invalid references, conflicting shipment identifiers, ambiguity, currency/tax mismatches, missing charge/vendor mappings, missing invoice fields and prior exports.

Generated-case accuracy is not production accuracy. The generator and answer key share the designed scenario definitions, so blind review against representative Finance-approved records is still required.

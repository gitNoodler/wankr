# Wankr Documentation — Corrections Manifest
**Date:** February 22, 2026

## Fixes Applied

### 1. File Format (All PDFs)
All files converted from ZIP-archive format to **real PDF** (`%PDF-` header).
Previously 9 of 10 PDFs were ZIP archives containing JPEG page renders — they displayed correctly in Claude's viewer but failed in any standard PDF tool (pypdf, Adobe API, pdfplumber).

### 2. Filename Typos (4 files renamed)
| Old Name | New Name | Fix |
|----------|----------|-----|
| `wankr_v1_gaurdrailing_personaInfluences_generalized.pdf` | `wankr_v1_guardrailing_personaInfluences_generalized.pdf` | gaurdrailing → guardrailing |
| `wankr_v1_gaurdrailing_focusIntegrityRules.pdf` | `wankr_v1_guardrailing_focusIntegrityRules.pdf` | gaurdrailing → guardrailing |
| `wankr_v1_gaurdrailing_noncryptoConversations_boundGuidlines.pdf` | `wankr_v1_guardrailing_noncryptoConversations_boundGuidelines.pdf` | gaurdrailing → guardrailing + boundGuidlines → boundGuidelines |
| `wankr_v1_gaurdrailing_standardhardsoftBounds_vulnerabilities.pdf` | `wankr_v1_guardrailing_standardhardsoftBounds_vulnerabilities.pdf` | gaurdrailing → guardrailing |

### 3. Grammar (Grading Pipeline, Page 13)
Page 13 rebuilt from scratch with corrected text:
- `each others critiques` → `each other's critiques`
- `Groks self-leniency` → `Grok's self-leniency`

### 4. No Changes Needed
- `wankr_v2_analyticalGrading_socialForensics.pdf` — already clean real PDF
- `wankr_cost_estimation_100budget_addendum.pdf` — new, already clean
- `wankr_v1_Persona_Intro_-_10of10score.txt` — plain text, intentional persona voice
- `wankr_public_docs.pdf` — content clean, format fixed only
- `wankr_cost_estimation.pdf` — content clean, format fixed only
- `wankr_v1_responseTest_personaBuilding_socialAwareness.pdf` — content clean, format fixed only

## Complete File Set (11 files)
```
wankr_v1_Persona_Intro_-_10of10score.txt          2KB   text
wankr_v1_guardrailing_personaInfluences_generalized.pdf   86KB   1 pg
wankr_v1_guardrailing_focusIntegrityRules.pdf            214KB   2 pg
wankr_v1_guardrailing_noncryptoConversations_boundGuidelines.pdf  336KB  3 pg
wankr_v1_guardrailing_standardhardsoftBounds_vulnerabilities.pdf  253KB  2 pg
wankr_v1_responseTest_personaBuilding_socialAwareness.pdf  648KB  9 pg
wankr_v2_gradingPipeline_annotationRotation.pdf          1099KB 14 pg  ← page 13 grammar fixed
wankr_v2_analyticalGrading_socialForensics.pdf             34KB 16 pg
wankr_cost_estimation.pdf                                 866KB 10 pg
wankr_cost_estimation_100budget_addendum.pdf              522KB  7 pg  ← NEW (sections 11-15)
wankr_public_docs.pdf                                     779KB  8 pg
```

## Action Required
Replace the files in your Claude Project Knowledge with these corrected versions.
The old filenames with "gaurdrailing" should be removed and replaced with the "guardrailing" versions.

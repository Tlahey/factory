---
closed: true
---

# Bug: Sawmill doesn't show power consumption in HUD

**Status:** Done — was already implemented, added regression test coverage

## Description

The Sawmill's power consumption (and related stats) isn't shown in the HUD. It should match the display already used for the Extractor.

## Requirements

- Show the Sawmill's power consumption in its HUD panel, consistent with the Extractor's panel.

## Notes

The `sawmill` building folder already exists in `apps/game/src/game/buildings/`. Consider reusing `ResourceProducerPanel` or the widget the Extractor panel already uses, per the buildings GEMINI.md guidance on composing HUD panels.

Carried over from the (now removed) `wood-resource.md` implementation checklist — the Wood resource and Sawmill building are otherwise fully implemented (tree tiles, depletion visuals, saw animation, i18n, registration), but two items were never checked off:

- Verify in-game that the Sawmill actually produces wood while powered and placed on a tree tile.
- Full `npm run lint` / `npm run build` pass after the Sawmill work.

**Verification (2026-08-02):** `SawmillPanel` already renders through the
same shared `ResourceProducerPanel` as `ExtractorPanel`
(`apps/game/src/components/ui/panels/ResourceProducerPanel.tsx`), which
unconditionally displays `building.powerConfig?.rate` — `Sawmill`
implements `powerConfig`/`IPowered` identically to `Extractor`, so the
HUD consumption display was already correct and building-agnostic. Wood
production while powered on a tree tile was already covered by
`Sawmill.test.ts`'s "should mine wood into buffer" test. Added
`ResourceProducerPanel.test.tsx` (no prior render-level test existed for
this panel) asserting the power number renders from `powerConfig.rate`
regardless of which building supplies it.

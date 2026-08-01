/**
 * DETERMINISTIC RANDOMNESS
 *
 * Item visuals are scrambled per item id so two ores on the same belt don't
 * look like clones — but the scramble has to be *stable*: `updateItemVisuals`
 * runs every frame, and a `Math.random()` in there would make every chunk
 * jitter. The same seed must always give the same pose.
 *
 * The sine hash below was copy-pasted into three model files; it lives here
 * now so they all draw from the same sequence.
 */

/** Hashes a number into [0, 1). */
export function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

/**
 * A stream of successive draws from one seed.
 *
 * Replaces the `seededRandom(s++)` idiom, which silently returns correlated
 * values when two call sites start from neighbouring seeds.
 */
export function createSeedStream(seed: number): () => number {
  let cursor = seed * 1234.5678;
  return () => seededRandom(cursor++);
}

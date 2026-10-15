import { MapId, MapMetadata } from '../../types/game';
import { MapBuildResult } from './MapHelpers';
import { buildFloatingIslands, FLOATING_ISLANDS_METADATA } from './FloatingIslandsMap';
import { buildFallGuysRun, FALL_GUYS_RUN_METADATA } from './FallGuysRunMap';

// Re-export core map interfaces & helpers for backwards compatibility
export * from './MapHelpers';
export * from './FloatingIslandsMap';
export * from './FallGuysRunMap';

/**
 * Active Map Registry
 * ─────────────────────────────────────────────────────
 * To add a new map:
 *   1. Create src/game/maps/[MapName]Map.ts  (follows FloatingIslandsMap pattern)
 *   2. Import and add its builder to MAP_REGISTRY
 *   3. Import and add its metadata to MAP_METADATA
 * ─────────────────────────────────────────────────────
 */
export const MAP_REGISTRY: Record<string, () => MapBuildResult> = {
  'floating-islands': buildFloatingIslands,
  'fall-guys-run':    buildFallGuysRun,
};

/**
 * Active Maps Metadata Dictionary (drives lobby map picker & landing menu)
 */
export const MAP_METADATA: Record<string, MapMetadata> = {
  'floating-islands': FLOATING_ISLANDS_METADATA,
  'fall-guys-run':    FALL_GUYS_RUN_METADATA,
};

export class MapBuilder {
  /**
   * Builds the level geometry and physics data for a given MapId.
   * Falls back to Floating Islands if the ID is unrecognised.
   */
  public static buildMap(mapId: MapId | string): MapBuildResult {
    const builder = MAP_REGISTRY[mapId];
    if (builder) return builder();
    return buildFloatingIslands();
  }
}

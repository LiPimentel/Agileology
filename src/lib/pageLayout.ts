/**
 * Splits a page's sections into "full width" ones and runs of grid sections.
 * A section's zone ("full" | "main" | "left" | "right") comes from its first block; anything unknown is
 * "full" (the default, and what every page published before side rails existed has). Consecutive
 * main/left/right sections form ONE three-column grid; "full" sections break the run. Pure (no
 * server imports) so scripts/check-side-rails.ts can test it.
 */
export type GridZone = "main" | "left" | "right";
export type LayoutItem<S> =
  | { kind: "full"; section: S; index: number }
  | { kind: "grid"; sections: Array<{ section: S; index: number; zone: GridZone }> };

export function zoneOf(value: unknown): "full" | GridZone {
  return value === "main" || value === "left" || value === "right" ? value : "full";
}

export function buildLayoutItems<S>(sections: S[], zoneFor: (s: S) => unknown): Array<LayoutItem<S>> {
  const items: Array<LayoutItem<S>> = [];
  sections.forEach((section, index) => {
    const zone = zoneOf(zoneFor(section));
    if (zone === "full") {
      items.push({ kind: "full", section, index });
      return;
    }
    const last = items[items.length - 1];
    if (last?.kind === "grid") last.sections.push({ section, index, zone });
    else items.push({ kind: "grid", sections: [{ section, index, zone }] });
  });
  return items;
}

/**
 * Global palette switch. The whole game is authored in grayscale "ink", but
 * every material picks its colour through Palette.pick(ink, color) so a single
 * mode flip turns the world into a full-colour cartoon. The post-process shader
 * has a matching `colorMode` path that cel-shades colour instead of crushing it
 * to black-and-white.
 */
export type ColorMode = "ink" | "color";

export const Palette = {
  mode: "ink" as ColorMode,
  /** Return the ink (grayscale) value, or the colour value in color mode. */
  pick(ink: number, color: number): number {
    return this.mode === "color" ? color : ink;
  },
  get isColor() {
    return this.mode === "color";
  },
};

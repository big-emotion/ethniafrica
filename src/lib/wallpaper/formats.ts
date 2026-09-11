/**
 * The sizes a ladder rung is rendered at.
 *
 * Six rather than one because a wallpaper and a feed post are not the same
 * object, and a single image cropped by whoever receives it loses the line
 * break the sentence was written for.
 *
 * `portrait` is 4:5 and it is not decoration: Meta's publishing composer
 * refuses a 9:16 file, so a feed post that only exists at story ratio cannot
 * be published there at all. `story` stays for the surfaces that do take it.
 */
export interface WallpaperFormat {
  id: string;
  width: number;
  height: number;
}

// @req REQ-132
export const WALLPAPER_FORMATS: WallpaperFormat[] = [
  { id: "desktop", width: 2560, height: 1440 },
  { id: "phone", width: 1290, height: 2796 },
  { id: "square", width: 1080, height: 1080 },
  { id: "portrait", width: 1080, height: 1350 },
  { id: "story", width: 1080, height: 1920 },
  { id: "share", width: 1200, height: 630 },
];

// @req REQ-132
export const findFormat = (id: string): WallpaperFormat | undefined =>
  WALLPAPER_FORMATS.find((format) => format.id === id);

/**
 * The type scale a given canvas gets, derived from its shorter side rather
 * than hard-coded per format: the same composition then holds at 1080 and at
 * 2560 without a second set of numbers to keep in step.
 */
// @req REQ-132
export const typeScaleFor = (format: WallpaperFormat) => {
  const base = Math.min(format.width, format.height);
  return {
    padding: Math.round(base * 0.075),
    magnitude: Math.round(base * 0.135),
    subject: Math.round(base * 0.05),
    anchor: Math.round(base * 0.027),
    footer: Math.round(base * 0.019),
  };
};

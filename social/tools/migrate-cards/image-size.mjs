/**
 * Real pixel dimensions, read from the file's own header.
 *
 * §6 of the spec turns on `naturalWidth/naturalHeight`, and says so twice: a
 * 900 px scan blown up ×3.6 becomes a texture and takes the card's argument with
 * it. A dimension copied from JSON is a dimension that was true the day somebody
 * typed it, and false the day somebody recropped the asset.
 *
 * Pure header parsing rather than a dependency, because the corpus is JPEG and
 * PNG and nothing else, and adding an image library to read four integers would
 * be the larger change.
 */
import fs from "node:fs";

/** PNG stores width and height as big-endian 32-bit ints in the IHDR chunk. */
function png(buf) {
  const SIGNATURE = "89504e470d0a1a0a";
  if (buf.subarray(0, 8).toString("hex") !== SIGNATURE) return null;
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

/**
 * JPEG carries them in a start-of-frame marker, which sits after a variable run
 * of other segments — so the segment chain has to be walked rather than indexed.
 *
 * The progressive and arithmetic-coded frame markers count too. Reading only
 * `FFC0` misses every progressive JPEG, and progressive is what most archives
 * serve.
 */
function jpeg(buf) {
  if (buf.readUInt16BE(0) !== 0xffd8) return null;

  let offset = 2;
  while (offset < buf.length - 9) {
    if (buf[offset] !== 0xff) {
      offset += 1; // resynchronise on padding between segments
      continue;
    }
    const marker = buf[offset + 1];

    // Start-of-frame: C0–CF, minus the four that are not frames.
    const isFrame =
      marker >= 0xc0 &&
      marker <= 0xcf &&
      ![0xc4, 0xc8, 0xcc, 0xd8].includes(marker);
    if (isFrame) {
      return {
        h: buf.readUInt16BE(offset + 5),
        w: buf.readUInt16BE(offset + 7),
      };
    }
    if (marker === 0xd9 || marker === 0xda) break; // end of image, or scan data
    offset += 2 + buf.readUInt16BE(offset + 2);
  }
  return null;
}

/**
 * @returns {{w:number,h:number}} the decoded dimensions
 * @throws when the file is missing or is not a format the corpus uses — never a
 *         guess, because the guess would silently disable the resolution rule.
 */
export function imageSize(file) {
  if (!fs.existsSync(file)) throw new Error(`introuvable : ${file}`);
  const buf = fs.readFileSync(file);
  const size = png(buf) ?? jpeg(buf);
  if (!size || !size.w || !size.h) {
    throw new Error(
      `dimensions illisibles : ${file} — le repli sur résolution en dépend, ` +
        `donc la carte ne passe pas sans elles`
    );
  }
  return size;
}

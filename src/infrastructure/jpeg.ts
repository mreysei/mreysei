/** Every JPEG starts with these three bytes. */
const JPEG_START = [0xff, 0xd8, 0xff] as const;

/**
 * The bytes as a `data:` address of a JPEG picture, written inside an image of the profile.
 * Anything else is refused: whatever is there would be published as a picture of the owner.
 */
export function jpegDataUrl(bytes: Uint8Array, maxBytes: number, what: string): string {
  if (bytes.byteLength > maxBytes) throw new Error(`${what} is larger than a profile can need.`);
  if (!JPEG_START.every((byte, index) => bytes[index] === byte)) {
    throw new Error(`${what} is not a JPEG picture.`);
  }
  return `data:image/jpeg;base64,${Buffer.from(bytes).toString('base64')}`;
}

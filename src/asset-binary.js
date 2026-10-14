import { gunzipSync } from 'fflate';

// Showcase transport packing: preserve the original decoded asset bytes.
export async function readAssetBinary(response) {
  if (!response.ok) throw new Error(`Asset request failed: ${response.url} (${response.status})`);
  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  if (bytes[0] !== 0x1f || bytes[1] !== 0x8b) return buffer;
  const raw = gunzipSync(bytes);
  return raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength);
}

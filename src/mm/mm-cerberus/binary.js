import { readAssetBinary } from '../../asset-binary.js';
import { gunzipSync } from "fflate";

// Packed assets retain their original decoded layout and legacy raw support.
export function decodeBinary(bytes) {
  if (bytes[0] === 77 && bytes[1] === 70 && bytes[2] === 66 && bytes[3] === 52) {
    const stride = new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength).getUint32(4,true);
    const planes = gunzipSync(bytes.subarray(8));
    if (stride < 1 || stride > 16 || planes.length % (stride*4)) throw new Error('Invalid MFB4 float-plane layout');
    const count = planes.length/(stride*4), raw = new Uint8Array(planes.length);
    for (let field=0;field<stride;field++) for (let byte=0;byte<4;byte++) {
      const start=(field*4+byte)*count;
      for (let i=0;i<count;i++) raw[(i*stride+field)*4+byte]=planes[start+i];
    }
    return raw.buffer;
  }
  if (bytes[0] === 77 && bytes[1] === 77 && bytes[2] === 68 && bytes[3] === 51) {
    const planes = gunzipSync(bytes.subarray(4));
    if (planes.length % 2) throw new Error('Invalid MMD3 byte-plane length');
    const n = planes.length / 2, words = new Uint16Array(n);
    for (let i = 0; i < n; i++) {
      words[i] = (planes[i] | (planes[i+n] << 8)) + (i >= 3 ? words[i-3] : 0);
    }
    return words.buffer;
  }
  if (bytes[0] === 0x1f && bytes[1] === 0x8b) return gunzipSync(bytes).buffer;
  return bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength
    ? bytes.buffer : bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

export async function loadBinary(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Asset request failed: ${url} (${response.status})`);
  const bytes = new Uint8Array(await readAssetBinary(response));
  return decodeBinary(bytes);
}

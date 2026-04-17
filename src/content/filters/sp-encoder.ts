export function encodeVarint(value: number): Uint8Array {
  if (value < 0 || !Number.isInteger(value)) {
    throw new RangeError('encodeVarint: expected non-negative integer');
  }
  const bytes: number[] = [];
  let n = value;
  while (n > 0x7f) {
    bytes.push((n & 0x7f) | 0x80);
    n >>>= 7;
  }
  bytes.push(n & 0x7f);
  return Uint8Array.from(bytes);
}

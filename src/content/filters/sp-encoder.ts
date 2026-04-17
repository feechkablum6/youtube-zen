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

const WIRE_VARINT = 0;
const WIRE_LENGTH_DELIMITED = 2;

function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

export function encodeVarintField(
  fieldNumber: number,
  value: number
): Uint8Array {
  const tag = (fieldNumber << 3) | WIRE_VARINT;
  return concat([encodeVarint(tag), encodeVarint(value)]);
}

export function encodeLengthDelimitedField(
  fieldNumber: number,
  payload: Uint8Array
): Uint8Array {
  const tag = (fieldNumber << 3) | WIRE_LENGTH_DELIMITED;
  return concat([encodeVarint(tag), encodeVarint(payload.length), payload]);
}

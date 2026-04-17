import type {
  DurationOpt,
  SearchFilters,
  SortOpt,
  TypeOpt,
  UploadDateOpt,
} from '../../shared/types';

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

const SORT_CODES: Record<SortOpt, number | null> = {
  relevance: null,
  date: 2,
  views: 3,
  rating: 1,
};

const UPLOAD_CODES: Record<UploadDateOpt, number | null> = {
  any: null,
  hour: 1,
  today: 2,
  week: 3,
  month: 4,
  year: 5,
};

const TYPE_CODES: Record<TypeOpt, number | null> = {
  any: null,
  video: 1,
  channel: 2,
  playlist: 3,
  movie: 4,
};

const DURATION_CODES: Record<DurationOpt, number | null> = {
  any: null,
  short: 1,
  long: 2,
  medium: 3,
};

function base64Encode(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

export function encodeSp(filters: SearchFilters): string | null {
  const parts: Uint8Array[] = [];

  const sort = SORT_CODES[filters.sort];
  if (sort !== null) parts.push(encodeVarintField(1, sort));

  const nestedParts: Uint8Array[] = [];
  const upload = UPLOAD_CODES[filters.uploadDate];
  if (upload !== null) nestedParts.push(encodeVarintField(1, upload));
  const type = TYPE_CODES[filters.type];
  if (type !== null) nestedParts.push(encodeVarintField(2, type));
  const duration = DURATION_CODES[filters.duration];
  if (duration !== null) nestedParts.push(encodeVarintField(3, duration));

  if (nestedParts.length > 0) {
    parts.push(encodeLengthDelimitedField(2, concat(nestedParts)));
  }

  if (parts.length === 0) return null;

  const b64 = base64Encode(concat(parts));
  return encodeURIComponent(b64);
}

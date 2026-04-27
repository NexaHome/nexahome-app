import { ObjectId } from 'mongodb';

export function toObjectId(value: string | ObjectId) {
  return value instanceof ObjectId ? value : new ObjectId(value);
}

export function toObjectIds(values: (string | ObjectId)[]) {
  return values.map((value) => toObjectId(value));
}

export function toIdString(value: unknown) {
  if (!value) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'object' && value !== null && 'toString' in value) {
    return String(value);
  }

  return '';
}

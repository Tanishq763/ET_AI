export const ENTITY_TYPES = [
  'EQUIPMENT',
  'INSTRUMENT',
  'CHEMICAL',
  'PERSON',
  'REGULATION',
  'PARAMETER',
  'DATE',
  'LOCATION',
  'PROCEDURE',
  'ORGANIZATION'
] as const;

export type SharedEntityType = typeof ENTITY_TYPES[number];

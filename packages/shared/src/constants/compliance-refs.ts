export const REGULATORY_BODIES = [
  'OISD',
  'PESO',
  'MoEF',
  'BIS',
  'FactoryAct',
  'ISO',
  'Other'
] as const;

export interface RegulatoryReference {
  code: string;
  title: string;
  body: string;
  description: string;
}

export const PRESET_REGULATIONS: RegulatoryReference[] = [
  {
    code: 'OISD-118',
    title: 'Layouts for Oil and Gas Installations',
    body: 'OISD',
    description: 'Governs safe layout distances, spacing between equipment and safety boundaries in oil refineries.'
  },
  {
    code: 'FactoryAct-1948-S7',
    title: 'General Duties of the Occupier',
    body: 'FactoryAct',
    description: 'Requires occupiers to maintain plants that are safe and without risk of injury to workers health.'
  },
  {
    code: 'PESO-2016',
    title: 'Petroleum Rules and Static Pressure Vessel Code',
    body: 'PESO',
    description: 'Covers licensing, certification, storage, and operation of pressurized storage vessels and explosive environments.'
  }
];

export const DOC_TYPES = [
  'PID',
  'SOP',
  'WorkOrder',
  'InspectionReport',
  'OEMManual',
  'IncidentReport',
  'RegulatorySubmission',
  'EmailArchive',
  'ProjectFile',
  'Other'
] as const;

export type SharedDocType = typeof DOC_TYPES[number];

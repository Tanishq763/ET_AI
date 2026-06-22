export type DocType =
  | 'PID'
  | 'SOP'
  | 'WorkOrder'
  | 'InspectionReport'
  | 'OEMManual'
  | 'IncidentReport'
  | 'RegulatorySubmission'
  | 'EmailArchive'
  | 'ProjectFile'
  | 'Other';

export type IngestionStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface DocumentMeta {
  _id?: string;
  title: string;
  originalName: string;
  docType: DocType;
  plant: string; // Plant ObjectId
  uploadedBy?: string; // User ObjectId
  uploadedAt?: Date;
  gridfsId: string; // GridFS file id
  mimeType?: string;
  fileSizeBytes?: number;
  pageCount?: number;
  ingestionStatus: IngestionStatus;
  ingestionStartedAt?: Date;
  ingestionCompletedAt?: Date;
  ingestionError?: string;
  language?: string;
  extractedDate?: Date;
  revisionNumber?: string;
  equipmentTagsFound?: string[];
  regulatoryReferences?: string[];
  kgNodeId?: string;
  kgSyncedAt?: Date;
  version?: number;
  previousVersionId?: string;
  complianceScope?: string[];
  nextReviewDate?: Date;
  tags?: string[];
  summary?: string;
}

export type ChunkType = 'text' | 'table' | 'figure_caption' | 'heading';
export type EntityType =
  | 'EQUIPMENT'
  | 'INSTRUMENT'
  | 'CHEMICAL'
  | 'PERSON'
  | 'REGULATION'
  | 'PARAMETER'
  | 'DATE'
  | 'LOCATION'
  | 'PROCEDURE'
  | 'ORGANIZATION';

export interface ExtractedEntity {
  text: string;
  type: EntityType;
  confidence: number;
  normalizedId?: string;
  normalizedText?: string;
  context?: string;
}

export interface Chunk {
  _id?: string;
  documentId: string;
  plant: string;
  content: string;
  contentHash?: string;
  pageNumbers: number[];
  chunkIndex: number;
  tokenCount?: number;
  qdrantPointId?: string;
  embeddingModel?: string;
  entities: ExtractedEntity[];
  chunkType: ChunkType;
  createdAt?: Date;
}

export type EquipmentClass =
  | 'Pump'
  | 'Compressor'
  | 'Vessel'
  | 'HeatExchanger'
  | 'Valve'
  | 'Instrument'
  | 'Motor'
  | 'Piping'
  | 'Tank'
  | 'Other';

export type OperationalStatus = 'Running' | 'Standby' | 'UnderMaintenance' | 'Decommissioned';
export type Criticality = 'Critical' | 'High' | 'Medium' | 'Low';

export interface Equipment {
  _id?: string;
  tag: string;
  plant: string;
  equipmentClass: EquipmentClass;
  description?: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  installedDate?: Date;
  location?: string;
  pidReference?: string;
  operationalStatus: OperationalStatus;
  criticality: Criticality;
  linkedDocuments?: string[];
  kgNodeId?: string;
  lastMaintenanceDate?: Date;
  nextMaintenanceDue?: Date;
  mtbf?: number;
  specifications?: Record<string, string>;
  createdAt?: Date;
  updatedAt?: Date;
}

export type WOType = 'Corrective' | 'Preventive' | 'Predictive' | 'Emergency' | 'Inspection';
export type WOPriority = 'Emergency' | 'High' | 'Medium' | 'Low';
export type WOStatus = 'Open' | 'InProgress' | 'OnHold' | 'Completed' | 'Cancelled';

export interface WOPart {
  partNumber: string;
  description: string;
  quantity: number;
  unitCost: number;
}

export interface WorkOrder {
  _id?: string;
  woNumber: string;
  plant: string;
  equipment?: string;
  equipmentTag?: string;
  woType: WOType;
  priority: WOPriority;
  title: string;
  problemDescription?: string;
  workPerformed?: string;
  failureCode?: string;
  failureMechanism?: string;
  rootCause?: string;
  failureMode?: string;
  partsUsed?: WOPart[];
  labourHours?: number;
  totalCost?: number;
  reportedAt?: Date;
  scheduledStart?: Date;
  actualStart?: Date;
  completedAt?: Date;
  downtimeHours?: number;
  reportedBy?: string;
  assignedTo?: string[];
  supervisedBy?: string;
  aiRcaSuggestion?: string;
  aiRcaConfidence?: number;
  similarWOIds?: string[];
  linkedDocuments?: string[];
  kgNodeId?: string;
  status: WOStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

export type IncidentType =
  | 'Accident'
  | 'NearMiss'
  | 'DangerousOccurrence'
  | 'EnvironmentalRelease'
  | 'QualityNonConformance'
  | 'FireExplosion';

export type IncidentSeverity =
  | 'Fatality'
  | 'LTI'
  | 'MedicalTreatment'
  | 'FirstAid'
  | 'NearMiss'
  | 'PropertyDamage';

export interface CorrectiveAction {
  action: string;
  owner: string;
  dueDate: Date;
  status: 'Open' | 'InProgress' | 'Closed';
}

export interface Incident {
  _id?: string;
  incidentNumber: string;
  plant: string;
  incidentType: IncidentType;
  severity: IncidentSeverity;
  title: string;
  description?: string;
  location?: string;
  equipmentInvolved?: string[];
  occurredAt?: Date;
  reportedAt?: Date;
  reportedBy?: string;
  immediateActions?: string;
  rootCauseAnalysis?: string;
  contributingFactors?: string[];
  lessonsLearned?: string;
  correctiveActions?: CorrectiveAction[];
  aiPatternTags?: string[];
  aiSimilarIncidentIds?: string[];
  aiRiskScore?: number;
  linkedDocuments?: string[];
  kgNodeId?: string;
  status: 'UnderInvestigation' | 'CorrectiveActionPending' | 'Closed';
  createdAt?: Date;
}

export type RegulatoryBody = 'OISD' | 'PESO' | 'MoEF' | 'BIS' | 'FactoryAct' | 'ISO' | 'Other';
export type ComplianceStatus = 'Compliant' | 'PartiallyCompliant' | 'NonCompliant' | 'NotAssessed';

export interface ComplianceMapping {
  _id?: string;
  plant: string;
  regulationCode: string;
  clauseNumber: string;
  clauseTitle: string;
  clauseText: string;
  regulatoryBody: RegulatoryBody;
  complianceStatus: ComplianceStatus;
  gapDescription?: string;
  severity?: Criticality;
  evidenceDocumentIds?: string[];
  evidenceChunkIds?: string[];
  evidenceSummary?: string;
  correctiveAction?: string;
  responsiblePerson?: string;
  targetDate?: Date;
  lastAssessedAt?: Date;
  assessedBy?: 'AI' | 'Human' | 'AI+Human';
  aiConfidence?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface LessonsLearned {
  _id?: string;
  plant: string;
  title: string;
  description: string;
  equipmentTags?: string[];
  failureModes?: string[];
  recommendations?: string[];
  createdAt?: Date;
}

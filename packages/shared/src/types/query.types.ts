import { DocType } from './document.types';

export interface QueryFilters {
  docTypes?: DocType[];
  equipmentTags?: string[];
  dateRange?: {
    start?: string;
    end?: string;
  };
}

export interface QueryRequest {
  query: string;
  plantId: string;
  filters?: QueryFilters;
}

export interface CitationSource {
  documentId: string;
  title: string;
  pageNumbers: number[];
  confidence: number;
  textPreview?: string;
}

export interface QueryResponse {
  _id?: string;
  query: string;
  answer: string;
  sources: CitationSource[];
  confidence: 'High' | 'Medium' | 'Low';
  suggestedQueries?: string[];
  plantId: string;
  userId?: string;
  createdAt?: string;
}

export interface SSETokenEvent {
  token: string;
}

export interface SSEFinalEvent {
  answer: string;
  sources: CitationSource[];
  confidence: 'High' | 'Medium' | 'Low';
  suggestedQueries?: string[];
}

import { create } from 'zustand';

interface DocumentState {
  recentUploads: Array<any>;
  addRecentUpload: (doc: any) => void;
  updateUploadStatus: (docId: string, status: string, error?: string) => void;
}

export const useDocumentStore = create<DocumentState>((set) => ({
  recentUploads: [],
  addRecentUpload: (doc) => set((state) => ({
    recentUploads: [doc, ...state.recentUploads].slice(0, 10)
  })),
  updateUploadStatus: (docId, status, error) => set((state) => ({
    recentUploads: state.recentUploads.map((doc) =>
      doc.id === docId ? { ...doc, status, error } : doc
    )
  }))
}));

import React, { useEffect, useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { documentsApi } from '../api/documents.api';
import { useDocumentStore } from '../store/document.store';
import { useAuthStore } from '../store/auth.store';
import {
  Upload,
  FileText,
  Trash2,
  RefreshCw,
  Download,
  Search,
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';
import toast from 'react-hot-toast';

export const DocumentLibrary: React.FC = () => {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus] = useState('');
  const [page, setPage] = useState(1);
  const [totalDocs, setTotalDocs] = useState(0);

  // Upload fields
  const [title, setTitle] = useState('');
  const [docType, setDocType] = useState('SOP');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const recentUploads = useDocumentStore((state) => state.recentUploads);
  const addRecentUpload = useDocumentStore((state) => state.addRecentUpload);
  const user = useAuthStore((state) => state.user);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await documentsApi.list({
        search,
        docType: filterType,
        status: filterStatus,
        page,
        limit: 10
      });
      if (res.success) {
        setDocuments(res.data);
        setTotalDocs(res.pagination.total);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [search, filterType, filterStatus, page]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Handle file drop
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setSelectedFile(file);
      // Auto-populate title if empty
      setTitle(file.name.replace(/\.[^/.]+$/, ""));
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: {
      'application/pdf': ['.pdf'],
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg']
    }
  });

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !title || !docType) {
      toast.error('Please select a file and enter details');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('title', title);
    formData.append('docType', docType);

    try {
      const res = await documentsApi.upload(formData);
      if (res.success && res.data) {
        // Add to Zustand tracking
        addRecentUpload({
          id: res.data.documentId,
          title,
          docType,
          status: res.data.status || 'queued',
          timestamp: new Date()
        });
        
        // Reset states
        setSelectedFile(null);
        setTitle('');
        setDocType('SOP');
        
        // Refresh local table
        fetchDocuments();
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleReingest = async (id: string) => {
    try {
      const res = await documentsApi.reingest(id);
      if (res.success) {
        toast.success('Re-ingestion job queued');
        fetchDocuments();
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to trigger re-ingestion');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document? All associated chunks and Graph relations will be deleted.')) {
      return;
    }
    try {
      const res = await documentsApi.delete(id);
      if (res.success) {
        toast.success('Document deleted');
        fetchDocuments();
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete document');
    }
  };

  const docTypes = ['PID', 'SOP', 'WorkOrder', 'InspectionReport', 'OEMManual', 'IncidentReport'];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
      case 'success':
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
            <CheckCircle size={10} /> Ingested
          </span>
        );
      case 'processing':
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
            <Loader2 size={10} className="animate-spin" /> Processing
          </span>
        );
      case 'queued':
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded-full uppercase tracking-wider">
            <Clock size={10} /> Queued
          </span>
        );
      case 'failed':
      default:
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
            <AlertCircle size={10} /> Failed
          </span>
        );
    }
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const dm = 2;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const canModify = user && ['SuperAdmin', 'PlantAdmin', 'Engineer'].includes(user.role);
  const canDelete = user && ['SuperAdmin', 'PlantAdmin'].includes(user.role);

  return (
    <div className="p-6 space-y-6">
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* --- Ingestion Tracker (Zustand updates) --- */}
      {recentUploads.some((u) => u.status === 'processing' || u.status === 'queued') && (
        <div className="p-4 rounded-xl border border-sky-500/20 bg-sky-500/5 flex flex-col gap-2.5">
          <div className="flex items-center gap-2">
            <Loader2 size={16} className="text-sky-400 animate-spin" />
            <h4 className="text-xs font-bold text-sky-400 uppercase tracking-widest">Active Ingestion Pipelines</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {recentUploads
              .filter((u) => u.status === 'processing' || u.status === 'queued')
              .map((upload) => (
                <div key={upload.id} className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg flex justify-between items-center">
                  <div className="overflow-hidden pr-2">
                    <p className="text-xs font-semibold text-slate-200 truncate">{upload.title}</p>
                    <span className="text-[9px] text-slate-500 block uppercase tracking-wider">{upload.docType}</span>
                  </div>
                  {getStatusBadge(upload.status)}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* --- Grid Layout: Uploader and Main Search --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Component A: Document Uploader Form */}
        <div className="lg:col-span-1 space-y-6">
          <div className="p-6 rounded-2xl glass-panel space-y-5">
            <div>
              <h3 className="text-sm font-semibold text-slate-200">Ingest Document</h3>
              <p className="text-xs text-slate-500">Add operating procedures, P&IDs or OEM manuals</p>
            </div>

            {canModify ? (
              <form onSubmit={handleUploadSubmit} className="space-y-4">
                {/* Dropzone */}
                <div 
                  {...getRootProps()} 
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                    isDragActive 
                      ? 'border-sky-500 bg-sky-500/5' 
                      : selectedFile 
                      ? 'border-slate-600 bg-slate-800/30' 
                      : 'border-slate-800 hover:border-slate-700 hover:bg-slate-800/20'
                  }`}
                >
                  <input {...getInputProps()} />
                  {selectedFile ? (
                    <div className="space-y-2">
                      <FileText size={28} className="mx-auto text-sky-400" />
                      <div>
                        <p className="text-xs font-semibold text-slate-200 truncate max-w-full px-2">
                          {selectedFile.name}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {formatSize(selectedFile.size)}
                        </p>
                      </div>
                      <button 
                        type="button" 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFile(null);
                          setTitle('');
                        }}
                        className="text-[10px] text-red-400 hover:underline mt-1"
                      >
                        Remove file
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload size={28} className="mx-auto text-slate-500" />
                      <p className="text-xs text-slate-300">Drag & drop files or click to browse</p>
                      <p className="text-[9px] text-slate-500">Supports PDF, PNG, JPG (Max 50MB)</p>
                    </div>
                  )}
                </div>

                {/* Title */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Document Title</label>
                  <input 
                    type="text" 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Compressor startup checklist"
                    className="w-full glass-input text-xs"
                    required
                  />
                </div>

                {/* Doc Type Selection */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Document Type</label>
                  <select 
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                    className="w-full glass-input text-xs bg-slate-900"
                  >
                    {docTypes.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <button 
                  type="submit" 
                  disabled={uploading || !selectedFile}
                  className="w-full py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-sky-500/10 disabled:opacity-40 disabled:pointer-events-none"
                >
                  {uploading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Uploading to Platform...
                    </>
                  ) : (
                    <>
                      <Upload size={14} />
                      Start Ingestion Job
                    </>
                  )}
                </button>
              </form>
            ) : (
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/20 text-center py-8">
                <AlertCircle size={24} className="mx-auto text-slate-500 mb-2" />
                <p className="text-xs text-slate-400">Ingestion restricted</p>
                <p className="text-[10px] text-slate-600 mt-1">Engineer authorization is required to upload files.</p>
              </div>
            )}
          </div>
        </div>

        {/* Component B: Document Library Table List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 rounded-2xl glass-panel space-y-5 flex flex-col h-full">
            
            {/* Toolbar Filters */}
            <div className="flex flex-wrap gap-3 items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-200">Index Repository</h3>
                <p className="text-xs text-slate-500">Search and filter active plant document corpus</p>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-60">
                  <Search size={14} className="absolute left-3 top-3 text-slate-500" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Search titles..."
                    className="w-full glass-input text-xs pl-9 py-2 bg-slate-950/50"
                  />
                </div>
                <select 
                  value={filterType}
                  onChange={(e) => {
                    setFilterType(e.target.value);
                    setPage(1);
                  }}
                  className="glass-input text-xs py-2 bg-slate-950/50"
                >
                  <option value="">All Types</option>
                  {docTypes.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Table wrapper */}
            <div className="flex-1 overflow-x-auto min-h-[300px]">
              {loading ? (
                <div className="flex flex-col justify-center items-center h-48 gap-2 text-slate-500 text-xs">
                  <Loader2 size={24} className="animate-spin text-sky-400" />
                  Fetching database index...
                </div>
              ) : documents.length === 0 ? (
                <div className="flex flex-col justify-center items-center h-48 gap-1.5 text-slate-500 text-xs">
                  <FileText size={24} />
                  No documents found matching filters
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                      <th className="pb-3 pl-2">Title</th>
                      <th className="pb-3">Type</th>
                      <th className="pb-3">Size</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3">Uploaded</th>
                      <th className="pb-3 pr-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {documents.map((doc) => (
                      <tr key={doc._id} className="hover:bg-slate-900/10 text-xs text-slate-300">
                        <td className="py-3 pl-2 font-medium text-slate-200 max-w-[180px] truncate" title={doc.title}>
                          {doc.title}
                        </td>
                        <td className="py-3">
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400 border border-slate-700/50">
                            {doc.docType}
                          </span>
                        </td>
                        <td className="py-3 text-slate-500">
                          {formatSize(doc.fileSizeBytes)}
                        </td>
                        <td className="py-3">
                          {getStatusBadge(doc.ingestionStatus)}
                        </td>
                        <td className="py-3 text-slate-500">
                          {new Date(doc.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 pr-2 text-right">
                          <div className="flex justify-end gap-1.5">
                            <a
                              href={documentsApi.getDownloadUrl(doc._id)}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded bg-slate-800/45 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/20"
                              title="Download PDF"
                            >
                              <Download size={12} />
                            </a>
                            
                            {canModify && (
                              <button
                                onClick={() => handleReingest(doc._id)}
                                className="p-1.5 rounded bg-slate-800/45 hover:bg-slate-800 text-slate-400 hover:text-sky-400 border border-slate-700/20"
                                title="Re-ingest"
                              >
                                <RefreshCw size={12} />
                              </button>
                            )}

                            {canDelete && (
                              <button
                                onClick={() => handleDelete(doc._id)}
                                className="p-1.5 rounded bg-slate-800/45 hover:bg-slate-800 text-slate-400 hover:text-red-400 border border-slate-700/20"
                                title="Delete"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination Controls */}
            {totalDocs > 10 && (
              <div className="flex justify-between items-center pt-4 border-t border-slate-800/40 text-xs text-slate-500">
                <span>Showing {documents.length} of {totalDocs} files</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 hover:bg-slate-700 hover:text-white disabled:opacity-40 disabled:pointer-events-none transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page * 10 >= totalDocs}
                    className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 hover:bg-slate-700 hover:text-white disabled:opacity-40 disabled:pointer-events-none transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
};
export default DocumentLibrary;

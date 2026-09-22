import React, { useState } from 'react';
import { X, UploadCloud, File, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import api from '../services/api';

export default function DocumentUploadModal({ activeWellId, onClose, onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [docType, setDocType] = useState('WCR');
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('document', file);
    formData.append('well_id', activeWellId);
    formData.append('doc_type', docType);

    try {
      const res = await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setResult(res.data);
      if (onUploadSuccess) onUploadSuccess();
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.response?.data?.details || err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #374151', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UploadCloud size={20} color="#0ea5e9" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>
              Upload Historical Drilling Document
            </h3>
          </div>
          <button onClick={onClose} className="btn btn-secondary" style={{ padding: '4px 8px', borderRadius: '50%' }}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleUpload} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '0.8rem', color: '#9ca3af', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
              Document Category
            </label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="select-input"
            >
              <option value="WCR">Well Completion Report (WCR)</option>
              <option value="DDR">Daily Drilling Report (DDR)</option>
              <option value="mud_log">Mud Logging / Pore Pressure Record</option>
              <option value="casing_report">Casing & Cementing Log</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', color: '#9ca3af', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
              Select Document (PDF, TXT, Scanned Report Image)
            </label>
            <input
              type="file"
              accept=".pdf,.txt,.png,.jpg,.jpeg"
              onChange={handleFileChange}
              style={{ width: '100%', padding: '10px', background: '#0a0e17', border: '1px dashed #4b5563', borderRadius: '8px', color: '#f3f4f6', cursor: 'pointer' }}
            />
          </div>

          {error && (
            <div style={{ padding: '10px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '8px', color: '#fca5a5', fontSize: '0.8rem' }}>
              {error}
            </div>
          )}

          {result && (
            <div style={{ background: '#0a0e17', border: '1px solid #10b981', borderRadius: '8px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#34d399', fontWeight: 700, fontSize: '0.9rem' }}>
                <CheckCircle size={18} /> Ingestion & Extraction Complete
              </div>
              <div style={{ fontSize: '0.78rem', color: '#d1d5db' }}>
                Extracted: <strong>{result.events_extracted} risk events</strong>, <strong>{result.formations_extracted} formation intervals</strong>.
              </div>
              {result.needs_review_count > 0 && (
                <div style={{ fontSize: '0.75rem', color: '#fef08a', background: 'rgba(234, 179, 8, 0.2)', padding: '6px 10px', borderRadius: '6px', border: '1px solid #eab308', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertTriangle size={14} color="#eab308" />
                  <span>{result.needs_review_count} event(s) marked <strong>Needs Review</strong> due to low confidence or OCR degradation.</span>
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={uploading || !file} className="btn btn-primary">
              {uploading ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
              <span>{uploading ? 'Processing OCR...' : 'Run Extraction'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

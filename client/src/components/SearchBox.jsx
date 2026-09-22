import React, { useState } from 'react';
import { Search, Sparkles, BookOpen, Quote, ChevronRight, Loader2 } from 'lucide-react';
import api from '../services/api';

export default function SearchBox({ activeWellId, radiusMeters, onInspectEvidence }) {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const suggestionChips = [
    'What mud loss and stuck pipe risks were encountered in Hugin sandstone near 2950m?',
    'What torque spikes and chert stringers occurred in Shetland Group?',
    'Stuck pipe and reactive shale in Hordaland Group'
  ];

  const handleSearch = async (queryText) => {
    const textToSearch = queryText || question;
    if (!textToSearch.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/search', {
        question: textToSearch,
        well_id: activeWellId,
        radius_m: radiusMeters
      });
      setResult(res.data);
    } catch (err) {
      console.error('Search error:', err);
      const msg = err.response?.data?.details || err.response?.data?.error || err.response?.data?.message || err.message || 'Search failed. Please try again.';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={18} color="#06b6d4" />
          <h2 style={{ fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#f3f4f6' }}>
            Historical Offset Knowledge Retrieval (RAG)
          </h2>
        </div>
        <span className="badge badge-normal" style={{ fontSize: '0.65rem' }}>
          Grounded Citations Only
        </span>
      </div>

      {/* Input Bar */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <input
            type="text"
            className="input-text"
            placeholder="Ask natural language questions across offset wells (e.g. mud losses in Hugin sand)..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{ paddingLeft: '34px', fontSize: '0.85rem' }}
          />
          <Search size={16} color="#6b7280" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
        </div>
        <button
          onClick={() => handleSearch()}
          disabled={loading}
          className="btn btn-primary"
          style={{ minWidth: '95px' }}
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
          <span>{loading ? 'Searching...' : 'Search'}</span>
        </button>
      </div>

      {/* Suggestion Chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        <span style={{ fontSize: '0.72rem', color: '#6b7280', alignSelf: 'center' }}>Suggested:</span>
        {suggestionChips.map((chip, idx) => (
          <button
            key={idx}
            onClick={() => {
              setQuestion(chip);
              handleSearch(chip);
            }}
            className="btn btn-secondary"
            style={{ fontSize: '0.72rem', padding: '3px 8px', borderRadius: '12px' }}
          >
            {chip.length > 55 ? chip.substring(0, 52) + '...' : chip}
          </button>
        ))}
      </div>

      {/* Error state */}
      {error && (
        <div style={{ padding: '8px 12px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '8px', color: '#fca5a5', fontSize: '0.8rem' }}>
          {error}
        </div>
      )}

      {/* Search Result Box */}
      {result && (
        <div style={{ background: '#0a0e17', border: '1px solid #1f2937', borderRadius: '10px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {result.cached_fallback_used && (
            <div style={{ fontSize: '0.72rem', color: '#fbbf24', background: 'rgba(245, 158, 11, 0.1)', padding: '4px 8px', borderRadius: '4px', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
              ⚡ Offline cached demo verification loaded (Zero hallucination fallback guarantee)
            </div>
          )}

          {/* Grounded Summary */}
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <BookOpen size={14} /> Grounded Synthesis
            </div>
            <p style={{ fontSize: '0.85rem', color: '#e5e7eb', lineHeight: 1.6 }}>
              {result.summary}
            </p>
          </div>

          {/* Citations List */}
          {result.citations && result.citations.length > 0 && (
            <div style={{ borderTop: '1px solid #1f2937', paddingTop: '10px' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', marginBottom: '6px' }}>
                Claim-Level Source Citations ({result.citations.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {result.citations.map((cite, i) => (
                  <div
                    key={i}
                    style={{ background: '#111827', border: '1px solid #273549', borderRadius: '6px', padding: '8px 10px', fontSize: '0.75rem' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#38bdf8', fontWeight: 600, marginBottom: '2px' }}>
                      <span>Well {cite.source_well} @ {cite.depth ? `${cite.depth}m` : 'MD'} ({cite.formation || 'Target'})</span>
                    </div>
                    <div style={{ color: '#d1d5db', marginBottom: '4px' }}>
                      {cite.claim}
                    </div>
                    <div style={{ color: '#9ca3af', fontStyle: 'italic', fontSize: '0.7rem', borderLeft: '2px solid #0ea5e9', paddingLeft: '6px' }}>
                      "{cite.source_excerpt}"
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

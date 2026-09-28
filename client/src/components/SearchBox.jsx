import React, { useState } from 'react';
import { Search, Sparkles, BookOpen, Quote, ChevronRight, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../services/api';

export default function SearchBox({ activeWellId, radiusMeters, onInspectEvidence }) {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showCitations, setShowCitations] = useState(false);

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
          <Sparkles size={18} color="var(--accent-brand)" />
          <h2 style={{ fontSize: '0.9rem', fontWeight: 700,  color: 'var(--text-primary)' }}>
            Historical offset knowledge retrieval (RAG)
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
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
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

      {/* Suggestion Chips (Side Info under button) */}
      <div>
        <button
          type="button"
          onClick={() => setShowSuggestions(!showSuggestions)}
          className="btn btn-secondary"
          style={{ padding: '3px 8px', fontSize: '0.68rem', justifyContent: 'space-between', width: 'fit-content' }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Quote size={11} color="var(--accent-brand)" /> Suggested queries
          </span>
          {showSuggestions ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
        </button>

        {showSuggestions && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
            {suggestionChips.map((chip, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setQuestion(chip);
                  handleSearch(chip);
                }}
                className="btn btn-secondary"
                style={{ fontSize: '0.7rem', padding: '3px 8px', borderRadius: '12px' }}
              >
                {chip.length > 55 ? chip.substring(0, 52) + '...' : chip}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div style={{ padding: '8px 12px', background: 'color-mix(in srgb, var(--status-caution) 15%, transparent)', border: '1px solid color-mix(in srgb, var(--status-caution) 40%, transparent)', borderRadius: '8px', color: 'var(--status-caution)', fontSize: '0.8rem' }}>
          {error}
        </div>
      )}

      {/* Search Result Box (Summary Front & Center) */}
      {result && (
        <div style={{ background: 'var(--bg-page)', border: 'none', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.4)', borderRadius: '10px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {result.cached_fallback_used && (
            <div style={{ fontSize: '0.72rem', color: 'var(--status-caution)', background: 'color-mix(in srgb, var(--status-caution) 10%, transparent)', padding: '4px 8px', borderRadius: '4px', border: '1px solid color-mix(in srgb, var(--status-caution) 30%, transparent)' }}>
              ⚡ Offline cached demo verification loaded (Zero hallucination fallback guarantee)
            </div>
          )}

          {/* Grounded Summary (Front & Center) */}
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-brand)',  marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <BookOpen size={14} /> Grounded synthesis
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: 1.6 }}>
              {result.summary}
            </p>
          </div>

          {/* Citations List (Side Info under button) */}
          {result.citations && result.citations.length > 0 && (
            <div style={{ borderTop: '1px solid var(--bg-panel)', paddingTop: '8px' }}>
              <button
                type="button"
                onClick={() => setShowCitations(!showCitations)}
                className="btn btn-secondary"
                style={{ padding: '3px 8px', fontSize: '0.7rem', justifyContent: 'space-between', width: '100%', background: 'var(--bg-panel)' }}
              >
                <span>Claim-Level Source Citations ({result.citations.length})</span>
                {showCitations ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>

              {showCitations && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                  {result.citations.map((cite, i) => (
                    <div
                      key={i}
                      style={{ background: 'var(--bg-panel)', border: 'none', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.4)', borderRadius: '6px', padding: '8px 10px', fontSize: '0.75rem' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--accent-brand)', fontWeight: 600, marginBottom: '2px' }}>
                        <span>Well {cite.source_well} @ {cite.depth ? `${cite.depth}m` : 'MD'} ({cite.formation || 'Target'})</span>
                      </div>
                      <div style={{ color: 'var(--text-primary)', marginBottom: '4px' }}>
                        {cite.claim}
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.7rem', borderLeft: '2px solid var(--accent-brand)', paddingLeft: '6px' }}>
                        "{cite.source_excerpt}"
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

    </div>
  );
}

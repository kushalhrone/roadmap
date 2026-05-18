'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Feature, FeaturesResponse } from '@/types/api';
import { getBoard, toggleVote, createFeature } from '@/lib/api';
import { IconPlanned, IconInDevelopment, IconReleased, IconCaretUp, IconInfo, IconChevronDown, IconFileExcel, IconBookOpenReader } from '@/components/StatusIcons';

function tagClass(tag: string): string {
  const m: Record<string, string> = {
    'HR': 'hr',
    'Expense': 'expense',
    'Customer': 'customer',
    'Internal': 'internal',
    'CXO': 'cxo',
    'Paid feature': 'paid-feature',
    'Recommendation': 'recommendation',
  };
  return m[tag] || 'customer';
}

export default function HomePage() {
  const [features, setFeatures] = useState<FeaturesResponse>({ planned: [], indev: [], released: [], triage: [] });
  const [votedIds, setVotedIds] = useState<Set<string | number>>(new Set());

  useEffect(() => {
    getBoard()
      .then(board => {
        console.log('[board loaded]', { planned: board.planned.length, indev: board.indev.length, released: board.released.length, triage: board.triage?.length ?? 0 });
        setFeatures(board);
        const voted = new Set<string | number>();
        [...board.planned, ...board.indev, ...board.released].forEach(f => {
          if (f.hasVoted) voted.add(f.id);
        });
        setVotedIds(voted);
      })
      .catch(err => console.error('[getBoard]', err instanceof Error ? err.message : err));
  }, []);
  const [upvoteHintShown, setUpvoteHintShown] = useState(false);
  const [upvoteHintPos, setUpvoteHintPos] = useState<{ left: number; top: number } | null>(null);
  const [activeTab, setActiveTab] = useState<'roadmap' | 'requested'>(() => {
    try { return (localStorage.getItem('activeTab') as 'roadmap' | 'requested') || 'roadmap'; } catch { return 'roadmap'; }
  });
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);
  const [showPhilosophy, setShowPhilosophy] = useState(false);
  const [philosophyStep, setPhilosophyStep] = useState(1);
  const [showRequest, setShowRequest] = useState(false);
  const [rqStep, setRqStep] = useState(0);
  const [rqPref, setRqPref] = useState<'paid' | 'feedback' | ''>('');
  const [formModule, setFormModule] = useState('Core');
  const [formReqFor, setFormReqFor] = useState('CXO');
  const [descValue, setDescValue] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('High');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showBanner, setShowBanner] = useState(false);

  const handleUpvote = useCallback((e: React.MouseEvent, id: string | number) => {
    e.stopPropagation();
    const wasVoted = votedIds.has(id);
    const bump = (f: Feature) => f.id === id ? { ...f, votes: wasVoted ? f.votes - 1 : f.votes + 1 } : f;
    // Optimistic update
    setFeatures(prev => ({
      ...prev,
      planned: prev.planned.map(bump),
      indev: prev.indev.map(bump),
      released: prev.released.map(bump),
    }));
    setVotedIds(prev => {
      const next = new Set(prev);
      if (wasVoted) {
        next.delete(id);
      } else {
        next.add(id);
        if (!upvoteHintShown) {
          const rect = (e.target as HTMLElement).getBoundingClientRect();
          setUpvoteHintPos({ left: rect.left - 30, top: rect.top + 30 });
          setUpvoteHintShown(true);
        }
      }
      return next;
    });
    // Sync with API (reconcile on response)
    toggleVote(id, wasVoted).then(res => {
      const reconcile = (f: Feature) => f.id === id ? { ...f, votes: res.votes } : f;
      setFeatures(prev => ({
        ...prev,
        planned: prev.planned.map(reconcile),
        indev: prev.indev.map(reconcile),
        released: prev.released.map(reconcile),
      }));
    });
  }, [votedIds, upvoteHintShown]);

  const openDetail = useCallback((f: Feature) => {
    setSelectedFeature(f);
  }, []);

  const openPhilosophyModal = useCallback(() => {
    setPhilosophyStep(1);
    setShowPhilosophy(true);
  }, []);

  const startPaidJourney = useCallback(() => {
    setShowPhilosophy(false);
    setRqStep(0);
    setRqPref('');
    setFormModule('Core');
    setFormReqFor('CXO');
    setDescValue('');
    setSelectedPriority('High');
    setSubmitError(null);
    setShowRequest(true);
  }, []);

  const closeRequest = useCallback(() => {
    setShowRequest(false);
    if (rqStep === 5) {
      setShowBanner(true);
      setActiveTab('requested');
    }
  }, [rqStep]);

  const handleSubmitRequest = useCallback(async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const priority = selectedPriority.replace('🔥 ', '');
      console.log('[submit] calling createFeature with:', { module: formModule, reqFor: formReqFor, description: descValue, priority, reqType: rqPref === 'paid' ? 'Customer' : 'Internal' });
      const result = await createFeature({
        module: formModule,
        reqFor: formReqFor,
        description: descValue,
        priority,
        reqType: rqPref === 'paid' ? 'Customer' : 'Internal',
      });
      console.log('[submit] createFeature result:', result);
      const newFeature: Feature = {
        id: result.id,
        title: descValue.trim().slice(0, 120) || 'Feature Request',
        status: 'triage',
        tags: [],
        votes: 0,
        module: formModule,
        reqFor: formReqFor,
        priority: priority as Feature['priority'],
        reqType: (rqPref === 'paid' ? 'Customer' : 'Internal') as Feature['reqType'],
        createdAt: new Date().toISOString().slice(0, 10),
        targetRelease: '',
      };
      setFeatures(prev => ({ ...prev, triage: [newFeature, ...(prev.triage ?? [])] }));
      setRqStep(5);
    } catch (err) {
      console.error('[submit] ERROR:', err);
      setSubmitError(err instanceof Error ? err.message : 'Submission failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedPriority, formModule, formReqFor, descValue, rqPref]);

  // Keyboard handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedFeature(null);
        setShowPhilosophy(false);
        setShowRequest(false);
        setUpvoteHintPos(null);
      }
      if (e.key === 'Enter' && showRequest && rqStep >= 1 && rqStep < 4) {
        setRqStep(s => s + 1);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [showRequest, rqStep]);

  const progressWidth = [0, 20, 40, 60, 80, 100][rqStep] ?? 100;

  return (
    <>
      {/* ===== TOPBAR ===== */}
      <header className="topbar">
        <div className="topbar-brand">HRONE TECHNOLOGIES PRIVATE LIMIT...</div>
        <div className="topbar-search">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="rgba(255,255,255,0.5)" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input type="text" placeholder="Search for actions, pages, requests, reports, people..." />
        </div>
        <div className="topbar-right">
          <div className="topbar-icon"><svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="2" width="9" height="9" rx="1"/><rect x="13" y="2" width="9" height="9" rx="1"/><rect x="2" y="13" width="9" height="9" rx="1"/><rect x="13" y="13" width="9" height="9" rx="1"/></svg></div>
          <div className="topbar-icon"><svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-1.96C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.4 19.54C5.12 20 12 20 12 20s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="currentColor" stroke="none"/></svg></div>
          <div className="topbar-icon"><svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M22 4s-2.36 1.96-4 3c-1.64 1.04-3.5 1-5 1s-3.36.04-5-1C6.36 5.96 2 4 2 4v2s2.32 1.88 4 3c1.68 1.12 3.46 1 5 1s3.32.12 5-1c1.68-1.12 4-3 4-3V4z"/><path d="M7 12v4M17 12v4M12 12v4M4 18h16"/></svg></div>
          <div className="topbar-icon"><svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg><span className="badge">13</span></div>
          <div className="topbar-icon"><svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="currentColor" stroke="none"/></svg></div>
        </div>
      </header>


      {/* ===== MAIN APP SHELL ===== */}
      <div className="app-shell">
        <div className="main-content">
          {/* Page Header */}
          <div className="page-header">
            <div>
              <div className="page-title">Product Roadmap</div>
              <div className="page-subtitle">
                Here, you can view what all exciting features are on product roadmap, already in pipeline or recently released.
                <span className="info-icon" onClick={openPhilosophyModal} title="Product Enhancement Info"><IconInfo size={16} color="#454545" /></span>
              </div>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
              <div className="excel-btn" title="Download Excel">
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="0.5" y="0.5" width="39" height="39" rx="3.5" fill="#F6F6F6"/>
                  <rect x="0.5" y="0.5" width="39" height="39" rx="3.5" stroke="#D1D1D1"/>
                  <path d="M20 11.25C20.663 11.25 21.2989 11.5134 21.7678 11.9822C22.2366 12.4511 22.5 13.087 22.5 13.75C22.5 14.413 22.2366 15.0489 21.7678 15.5178C21.2989 15.9866 20.663 16.25 20 16.25C19.337 16.25 18.7011 15.9866 18.2322 15.5178C17.7634 15.0489 17.5 14.413 17.5 13.75C17.5 13.087 17.7634 12.4511 18.2322 11.9822C18.7011 11.5134 19.337 11.25 20 11.25ZM20 17.5C20.9946 17.5 21.9484 17.1049 22.6517 16.4017C23.3549 15.6984 23.75 14.7446 23.75 13.75C23.75 12.7554 23.3549 11.8016 22.6517 11.0983C21.9484 10.3951 20.9946 10 20 10C19.0054 10 18.0516 10.3951 17.3483 11.0983C16.6451 11.8016 16.25 12.7554 16.25 13.75C16.25 14.7446 16.6451 15.6984 17.3483 16.4017C18.0516 17.1049 19.0054 17.5 20 17.5ZM20 19.375C20 19.375 17.7812 17.7109 11.25 17.5195C10.5625 17.4961 10 18.0586 10 18.75V26.875C10 27.5664 10.5625 28.1211 11.25 28.1523C15.7383 28.3359 18.5508 29.4688 19.4062 29.8633C19.5938 29.9492 19.793 30 19.9961 30C20.1992 30 20.4023 29.9492 20.5859 29.8633C21.4414 29.4688 24.2539 28.3359 28.7422 28.1523C29.4336 28.125 29.9922 27.5664 29.9922 26.875V18.75C29.9922 18.0586 29.4297 17.4961 28.7422 17.5195C22.2188 17.7109 20 19.375 20 19.375ZM19.2617 20.3828L19.375 20.4688V28.4883C18.0469 27.9492 15.2969 27.0664 11.3008 26.9023C11.2812 26.9023 11.2656 26.8945 11.2539 26.8828C11.25 26.8789 11.25 26.8789 11.25 26.875V18.7695C14.3945 18.8633 16.4531 19.3125 17.6914 19.7109C18.3125 19.9102 18.7344 20.0977 18.9805 20.2266C19.1055 20.2891 19.1875 20.3398 19.2305 20.3672C19.2461 20.3789 19.2578 20.3867 19.2656 20.3906L19.2617 20.3828ZM20.625 20.4688L20.7383 20.3828C20.7422 20.3789 20.7539 20.3711 20.7734 20.3594C20.8164 20.332 20.8984 20.2852 21.0234 20.2188C21.2695 20.0898 21.6875 19.9023 22.3125 19.7031C23.5547 19.3047 25.6133 18.8594 28.7539 18.7617V26.875V26.8789L28.75 26.8828C28.7383 26.8945 28.7227 26.9023 28.7031 26.9023C24.7031 27.0664 21.9531 27.9492 20.625 28.4883V20.4688Z" fill="black"/>
                </svg>
              </div>
              <button className="btn-primary" onClick={startPaidJourney}>
                Product Enhancement Request
              </button>
            </div>
          </div>

          {/* Stats bar */}
          <div className="stats-bar">
            <div className="stat-item">
              <div className="stat-label"><span className="stat-dot planned"></span>{features.planned.length} Planned</div>
              <div className="stat-desc">These features are in research stage and will be prioritised next.</div>
            </div>
            <div className="stat-item">
              <div className="stat-label"><span className="stat-dot indev"></span>{features.indev.length} In Development</div>
              <div className="stat-desc">These features are in pipeline and expected in upcoming releases.</div>
            </div>
            <div className="stat-item">
              <div className="stat-label"><span className="stat-dot released"></span>{features.released.length} Released</div>
              <div className="stat-desc">These features have been released in last one year.</div>
            </div>
          </div>

          {/* Tabs */}
          <div className="tabs">
            <button
              className={`tab-btn${activeTab === 'roadmap' ? ' active' : ''}`}
              onClick={() => setActiveTab('roadmap')}
            >Product roadmap</button>
            <button
              className={`tab-btn${activeTab === 'requested' ? ' active' : ''}`}
              onClick={() => setActiveTab('requested')}
            >Accenture requested features</button>
          </div>

          {/* Filter bar — product roadmap */}
          <div className={`filter-bar${activeTab !== 'roadmap' ? ' hidden' : ''}`}>
            <span className="filter-label">Filter by:</span>
            <div className="filter-select">
              <select><option>Choose module</option><option>Core</option><option>HR</option><option>Expense</option><option>Payroll</option><option>Recruitment</option></select>
              <IconChevronDown size={16} color="#454545" />
            </div>
            <div className="filter-select">
              <select><option>Source type</option><option>Customer</option><option>Internal</option></select>
              <IconChevronDown size={16} color="#454545" />
            </div>
            <div className="filter-select">
              <select><option>Choose time period</option><option>Q1 2024</option><option>Q2 2024</option><option>Q3 2024</option><option>Q4 2024</option></select>
              <IconChevronDown size={16} color="#454545" />
            </div>
          </div>

          {/* Filter bar — requested features */}
          <div className={`filter-bar${activeTab !== 'requested' ? ' hidden' : ''}`}>
            <span className="filter-label">Filter by:</span>
            <div className="filter-select">
              <select><option>Choose module</option><option>Core</option><option>HR</option></select>
              <IconChevronDown size={16} color="#454545" />
            </div>
            <div className="filter-select">
              <select><option>NFR type</option><option>Customer</option></select>
              <IconChevronDown size={16} color="#454545" />
            </div>
            <div className="filter-select">
              <select><option>Choose time period</option></select>
              <IconChevronDown size={16} color="#454545" />
            </div>
          </div>

          {/* Info banner */}
          {showBanner && (
            <div className="info-banner">
              <span>You can upvote any feature you find interesting.</span>
              <span className="info-banner-close" onClick={() => setShowBanner(false)}>&#10005;</span>
            </div>
          )}

          {/* Kanban board */}
          <div className={`kanban-board${activeTab !== 'roadmap' ? ' hidden' : ''}`}>
            {/* Planned column */}
            <div className="kanban-col">
              <div className="kanban-col-header">
                <IconPlanned size={16} /> Planned
              </div>
              <div className="kanban-cards">
                {features.planned.map(f => (
                  <div
                    key={f.id}
                    className="feature-card planned"
                    onClick={() => openDetail(f)}
                  >
                    <div className="feature-card-text">{f.title}</div>
                    <div className="feature-tags">
                      {f.tags.map(t => <span key={t} className={`tag ${tagClass(t)}`}>{t}</span>)}
                    </div>
                    <div className="feature-card-footer">
                      <button
                        className={`upvote-btn${votedIds.has(f.id) ? ' voted' : ''}`}
                        onClick={e => handleUpvote(e, f.id)}
                      >
                        <IconCaretUp size={12} voted={votedIds.has(f.id)} /> <span>{f.votes}</span>
                      </button>
                      <span className="release-date">Expected Release Date : {f.targetRelease}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* In Development column */}
            <div className="kanban-col">
              <div className="kanban-col-header">
                <IconInDevelopment size={16} /> In Development
              </div>
              <div className="kanban-cards">
                {features.indev.map(f => (
                  <div
                    key={f.id}
                    className="feature-card indev"
                    onClick={() => openDetail(f)}
                  >
                    <div className="feature-card-text">{f.title}</div>
                    <div className="feature-tags">
                      {f.tags.map(t => <span key={t} className={`tag ${tagClass(t)}`}>{t}</span>)}
                      {f.hot && <span style={{fontSize:'14px'}}>&#128293;</span>}
                    </div>
                    <div className="feature-card-footer">
                      <button
                        className={`upvote-btn${votedIds.has(f.id) ? ' voted' : ''}`}
                        onClick={e => handleUpvote(e, f.id)}
                      >
                        <IconCaretUp size={12} voted={votedIds.has(f.id)} /> <span>{f.votes}</span>
                      </button>
                      <span className="release-date">Expected Release Date : {f.targetRelease}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Released column */}
            <div className="kanban-col">
              <div className="kanban-col-header">
                <IconReleased size={16} /> Released
              </div>
              <div className="kanban-cards">
                {features.released.map(f => (
                  <div
                    key={f.id}
                    className="feature-card released"
                    onClick={() => openDetail(f)}
                  >
                    <div className="feature-card-text">{f.title}</div>
                    <div className="feature-tags">
                      {f.tags.map(t => <span key={t} className={`tag ${tagClass(t)}`}>{t}</span>)}
                    </div>
                    <div className="feature-card-footer">
                      <button
                        className={`upvote-btn${votedIds.has(f.id) ? ' voted' : ''}`}
                        onClick={e => handleUpvote(e, f.id)}
                      >
                        <IconCaretUp size={12} voted={votedIds.has(f.id)} /> <span>{f.votes}</span>
                      </button>
                      <span className="release-date">{f.releasedOn ? 'Released On : ' + f.releasedOn : 'Expected Release Date : ' + f.targetRelease}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Requested tab – triage records */}
          <div className={activeTab !== 'requested' ? ' hidden' : ''}>
            {features.triage.length === 0 ? (
              <div className="blank-state">
                <svg className="blank-state-illustration" viewBox="0 0 120 120" fill="none">
                  <circle cx="60" cy="60" r="56" fill="#f5f3ff" stroke="#ddd6fe" strokeWidth="2"/>
                  <ellipse cx="60" cy="90" rx="28" ry="8" fill="#ede9fe"/>
                  <circle cx="60" cy="54" r="18" fill="#a78bfa" opacity=".7"/>
                  <circle cx="60" cy="54" r="10" fill="#7c3aed"/>
                  <path d="M52 80 Q60 70 68 80" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
                </svg>
                <div className="blank-state-title">NO REQUESTS FOUND</div>
                <div className="blank-state-desc">Submit a feature request to see it here.</div>
                <button className="btn-primary" onClick={startPaidJourney}>Request Now!</button>
              </div>
            ) : (
              <div className="triage-list">
                {features.triage.map(f => (
                  <div key={f.id} className="triage-card">
                    <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:'12px',marginBottom:'8px'}}>
                      <div className="triage-card-title">{f.title}</div>
                      <span className="triage-badge">Requested</span>
                    </div>
                    <div className="triage-card-meta">
                      {f.module && <span className="triage-meta-item">
                        <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                        {f.module}
                      </span>}
                      {f.reqFor && <span className="triage-meta-item">
                        <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                        {f.reqFor}
                      </span>}
                      {f.priority && <span className="triage-meta-item">
                        <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/></svg>
                        {f.priority}
                      </span>}
                      {f.createdAt && <span className="triage-meta-item">
                        <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                        {f.createdAt}
                      </span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===== MODAL: FEATURE DETAIL PANEL ===== */}
      {selectedFeature && (
        <div
          className="modal-overlay"
          onClick={e => { if (e.target === e.currentTarget) setSelectedFeature(null); }}
        >
          <div className="detail-panel">
            <div className="detail-panel-header">
              <div className="detail-panel-title">FEATURE DETAILS</div>
              <button className="close-btn" onClick={() => setSelectedFeature(null)}>&#10005;</button>
            </div>
            <div className="detail-divider"></div>

            <div className="detail-row">
              <div className="detail-field">
                <label>Priority</label>
                <div className={`val${selectedFeature.priority === 'High' ? ' green' : ''}`}>{selectedFeature.priority}</div>
              </div>
              <div className="detail-field">
                <label>Request type</label>
                <div className="val blue">{selectedFeature.reqType}</div>
              </div>
            </div>
            <div className="detail-field-divider"></div>
            <div className="detail-row">
              <div className="detail-field">
                <label>Created on</label>
                <div className="val">{selectedFeature.createdAt}</div>
              </div>
              <div className="detail-field">
                <label>Expected release date</label>
                <div className="val">{selectedFeature.targetRelease}</div>
              </div>
            </div>
            <div className="detail-field-divider"></div>
            <div className="detail-row">
              <div className="detail-field">
                <label>Module</label>
                <div className="val">{selectedFeature.module}</div>
              </div>
              <div className="detail-field">
                <label>Feature requested for</label>
                <div className="val">{selectedFeature.reqFor}</div>
              </div>
            </div>
            <div className="detail-field-divider"></div>
            <div className="detail-question">What specific functionality and benefits does your feature request aim to provide?</div>
            <div className="detail-answer">Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry&apos;s standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book.</div>
          </div>
        </div>
      )}

      {/* ===== MODAL: PRODUCT PHILOSOPHY ===== */}
      {showPhilosophy && (
        <div className="modal-overlay center">
          <div className="philosophy-modal">
            <div className="philosophy-modal-header">
              <div className="philosophy-modal-title">Product Enhancement</div>
              <button className="close-btn" onClick={() => setShowPhilosophy(false)}>&#10005;</button>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'4px'}}>
              <div className="hrone-logo-mark">HR</div>
              <div className="hrone-logo-text">HRone</div>
            </div>
            <div className="philosophy-divider"></div>

            {/* Step 1 */}
            {philosophyStep === 1 && (
              <div>
                <div className="philosophy-section-title">Product philosophy</div>
                <div className="philosophy-section-subtitle">We work for greater good!</div>
                <div className="philosophy-body">
                  We work hard to increase user engagement and process adoption in our product. Each month, we get about 500 product enhancement requests from over 1200 customers. This doesn&apos;t imply our product is lacking; rather, it shows we have an active community of 10,000 HR leaders contributing to its improvement. However, we can only address a limited number of issues, focusing on those that benefit the most customers and make the most impact.
                </div>
                <div className="philosophy-footer">
                  <button className="btn-skip" onClick={() => setShowPhilosophy(false)}>Skip</button>
                  <button className="btn-primary" onClick={() => setPhilosophyStep(2)}>Next</button>
                </div>
              </div>
            )}

            {/* Step 2 */}
            {philosophyStep === 2 && (
              <div>
                <div className="philosophy-section-title">How can I influence product roadmap?</div>
                <div className="philosophy-section-subtitle">We got you covered!</div>
                <div className="philosophy-body">
                  You can check our product&apos;s exciting features, upcoming updates, and recent releases directly in HROne. Just log in, go to Setup &gt; General &gt; Product Roadmap.<br/><br/>
                  Here, you can also submit a Product Enhancement Request (PER). Please provide a detailed explanation of your current challenges, how you&apos;re managing them, and your ideal solution.<br/><br/>
                  Our Product Owners and Senior Leadership thoroughly review each PER, prioritizing them with innovation in mind. If your PER is accepted, you&apos;ll be notified via email. If not, our team will try to offer an alternative solution or explain the decision. Due to the high volume of feedback, we might not respond to all requests, but you can track your PER&apos;s status on the Product Roadmap screen.
                </div>
                <div className="philosophy-footer">
                  <button className="btn-skip" onClick={() => setShowPhilosophy(false)}>Skip</button>
                  <button className="btn-outline" onClick={() => setPhilosophyStep(1)}>Previos</button>
                  <button className="btn-primary" onClick={() => setPhilosophyStep(3)}>Next</button>
                </div>
              </div>
            )}

            {/* Step 3 */}
            {philosophyStep === 3 && (
              <div>
                <div className="philosophy-section-title">What makes a great feature request?</div>
                <div className="philosophy-section-subtitle">Quality over quantity!</div>
                <div className="philosophy-body">
                  A great feature request clearly describes the problem, not just the solution. Include:<br/><br/>
                  <strong>1. Context:</strong> What&apos;s the business problem you&apos;re trying to solve?<br/>
                  <strong>2. Current state:</strong> How are you currently managing this challenge?<br/>
                  <strong>3. Desired outcome:</strong> What would success look like for your team?<br/>
                  <strong>4. Impact:</strong> How many people or processes does this affect?<br/><br/>
                  Remember, the more clearly you articulate the problem, the better we can design an effective solution.
                </div>
                <div className="philosophy-footer">
                  <button className="btn-skip" onClick={() => setShowPhilosophy(false)}>Skip</button>
                  <button className="btn-outline" onClick={() => setPhilosophyStep(2)}>Previos</button>
                  <button className="btn-primary" onClick={() => setPhilosophyStep(4)}>Next</button>
                </div>
              </div>
            )}

            {/* Step 4 */}
            {philosophyStep === 4 && (
              <div>
                <div className="philosophy-section-title">Ready to submit your request?</div>
                <div className="philosophy-section-subtitle">Let&apos;s get started!</div>
                <div className="philosophy-body">
                  You&apos;re about to submit a Product Enhancement Request. Our team will review it carefully and get back to you. Before proceeding, make sure you have:<br/><br/>
                  &#10003; A clear description of the problem you&apos;re facing<br/>
                  &#10003; The specific module or feature area affected<br/>
                  &#10003; The user group who will benefit most<br/>
                  &#10003; The priority level of this enhancement<br/><br/>
                  Ready? Let&apos;s fill in the details!
                </div>
                <div className="philosophy-footer">
                  <button className="btn-skip" onClick={() => setShowPhilosophy(false)}>Skip</button>
                  <button className="btn-outline" onClick={() => setPhilosophyStep(3)}>Previos</button>
                  <button className="btn-primary" onClick={startPaidJourney}>Start Request</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== FEATURE REQUEST PANEL ===== */}
      {showRequest && (
        <div className="request-overlay" onClick={e => { if (e.target === e.currentTarget) closeRequest(); }}>
          <div className="request-panel">
          {/* Header */}
          <div className="rq-header">
            <span className="rq-header-title">Feature Request</span>
            <div className="rq-header-divider"></div>
            <div className="rq-header-user">
              <div className="rq-header-avatar">RA</div>
              <div>
                <div className="rq-header-name">Rajnikant A Rao (#Tech0001)</div>
                <div className="rq-header-sub">HROne Technologies Private Limited. Profit Centre</div>
              </div>
            </div>
            <button className="close-btn" onClick={closeRequest} style={{marginLeft:'auto',flexShrink:0}}>&#10005;</button>
          </div>

          {/* Body */}
          <div className="request-body">

            {/* Step 0: Choose preference */}
            {rqStep === 0 && (
              <div className="request-form" style={{maxWidth:'820px'}}>
                <div className="request-step-title">Choose your preference</div>
                <div className="pref-cards">
                  {/* Paid */}
                  <div className="pref-card">
                    <svg className="pref-card-illus" viewBox="0 0 80 80" fill="none">
                      <circle cx="40" cy="40" r="38" fill="#e8f3ec"/>
                      <path d="M24 52l8-18 8 12 6-8 10 14H24z" fill="#2d6a4f" opacity=".7"/>
                      <circle cx="50" cy="26" r="8" fill="#02563d" opacity=".8"/>
                      <path d="M30 38l6 8 12-14" stroke="#02563d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                    </svg>
                    <div className="pref-card-head">
                      <span className="pref-card-title">Product enhancement request</span>
                      <span className="pref-badge">Paid</span>
                    </div>
                    <div className="pref-card-sub">Submit your requirements (Paid)</div>
                    <div className="pref-card-desc">
                      Get your must-have features faster with HROne&apos;s Paid Customisation Request.<br/><br/>
                      Submit your paid feature request, if it aligns with our roadmap, we will pick your feature request upon receiving full payment. Customize HROne to seamlessly fit your business needs.
                    </div>
                    <button className="btn-primary pref-choose" onClick={() => { setRqPref('paid'); setRqStep(1); }}>
                      Fast-Track My Feature
                    </button>
                  </div>

                  {/* Free feedback */}
                  <div className="pref-card">
                    <svg className="pref-card-illus" viewBox="0 0 80 80" fill="none">
                      <circle cx="40" cy="40" r="38" fill="#f0f4ff"/>
                      <rect x="20" y="22" width="40" height="28" rx="4" fill="#818cf8" opacity=".3"/>
                      <rect x="26" y="30" width="28" height="3" rx="1.5" fill="#4f46e5" opacity=".6"/>
                      <rect x="26" y="37" width="20" height="3" rx="1.5" fill="#4f46e5" opacity=".4"/>
                      <path d="M32 54l8-6 8 6v-4H32v4z" fill="#818cf8" opacity=".5"/>
                    </svg>
                    <div className="pref-card-head">
                      <span className="pref-card-title">Product feedback</span>
                    </div>
                    <div className="pref-card-sub">Share any suggestions</div>
                    <div className="pref-card-desc">
                      Share your ideas for free to enhance your HROne experience. Contribute your innovative thoughts to shape HROne&apos;s evolution.<br/><br/>
                      Though immediate implementation isn&apos;t assured, your input matters and could influence future updates. Be heard and help us customize HROne for you!
                    </div>
                    <button className="btn-outline pref-choose" onClick={() => { setRqPref('feedback'); setRqStep(1); }}>
                      Give Feedback
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Step 1: Module */}
            {rqStep === 1 && (
              <div className="request-form">
                <div className="request-step-title">Module</div>
                <div className="request-step-subtitle">Choose the relevant module for your feature request, ensuring focused enhancements and improvements within HROne.</div>
                <label className="form-label">Module</label>
                <select
                  className="form-select-styled"
                  value={formModule}
                  onChange={e => setFormModule(e.target.value)}
                >
                  {['Core','HR','Payroll','Expense','Recruitment','Performance','Asset','Helpdesk'].map(m => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
                <div className="form-nav">
                  <button className="btn-back" onClick={() => setRqStep(0)}>
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
                  </button>
                  <button className="btn-continue" onClick={() => setRqStep(2)}>Continue</button>
                  <span className="btn-enter-hint">or press <strong>ENTER</strong> &#8629;</span>
                </div>
                <div className="most-voted-section">
                  <div className="mvs-title">Most voted features</div>
                  <div className="mvs-subtitle">Features that have received the highest number of upvotes from our users.</div>
                  {features.planned.slice(0,2).map(f => (
                    <div key={f.id} className="mvs-card">
                      <div style={{fontSize:'13px',marginBottom:'8px'}}>{f.title}</div>
                      <div className="feature-tags">{f.tags.map(t => <span key={t} className={`tag ${tagClass(t)}`}>{t}</span>)}</div>
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:'8px'}}>
                        <span className="upvote-btn"><IconCaretUp size={12} voted={false} /> {f.votes}</span>
                        <span className="release-date">{f.targetRelease ? 'Expected : ' + f.targetRelease : ''}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Feature requested for */}
            {rqStep === 2 && (
              <div className="request-form">
                <div className="request-step-title">Feature requested for</div>
                <div className="request-step-subtitle">Identify the specific user group or department that will benefit from this feature, highlighting its intended impact within your organization.</div>
                <label className="form-label">Requested For*</label>
                <select
                  className="form-select-styled"
                  value={formReqFor}
                  onChange={e => setFormReqFor(e.target.value)}
                >
                  {['CXO','HR','Employees','Managers','Finance','Payroll Team'].map(r => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
                <div className="form-nav">
                  <button className="btn-back" onClick={() => setRqStep(1)}>
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
                  </button>
                  <button className="btn-continue" onClick={() => setRqStep(3)}>Continue</button>
                  <span className="btn-enter-hint">or press <strong>ENTER</strong> &#8629;</span>
                </div>
              </div>
            )}

            {/* Step 3: Describe feature */}
            {rqStep === 3 && (
              <div className="request-form">
                <div className="request-step-title">What specific functionality and benefits does your feature request aim to provide?</div>
                <div className="request-step-subtitle">Describe your feature request in detail, outlining the functionality and benefits it would bring to your HROne experience.</div>
                <label className="form-label">
                  <span>Describe</span>
                  <span style={{fontSize:'11px',color:'#aaa'}}>{descValue.length}/5000</span>
                </label>
                <textarea
                  className="form-textarea"
                  rows={5}
                  maxLength={5000}
                  placeholder="Placeholder text"
                  value={descValue}
                  onChange={e => setDescValue(e.target.value)}
                />
                <div className="form-textarea-divider"></div>
                <div className="form-nav">
                  <button className="btn-back" onClick={() => setRqStep(2)}>
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
                  </button>
                  <button className="btn-continue" onClick={() => setRqStep(4)}>Continue</button>
                  <span className="btn-enter-hint">or press <strong>ENTER</strong> &#8629;</span>
                </div>
              </div>
            )}

            {/* Step 4: Feature priority */}
            {rqStep === 4 && (
              <div className="request-form">
                <div className="request-step-title">Feature priority</div>
                <div className="request-step-subtitle">Assess the urgency of your feature request, helping us prioritize development in line with your most pressing HROne needs.</div>
                <div className="priority-options">
                  {['Low','Medium','High','🔥 Super Needed'].map(p => (
                    <div
                      key={p}
                      className={`priority-option${selectedPriority === p ? ' selected' : ''}`}
                      onClick={() => setSelectedPriority(p)}
                    >{p}</div>
                  ))}
                </div>
                {submitError && <div className="rq-error">{submitError}</div>}
                <div className="form-nav" style={{marginTop:'24px'}}>
                  <button className="btn-back" onClick={() => setRqStep(3)}>
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
                  </button>
                  <button className="btn-continue" onClick={handleSubmitRequest} disabled={isSubmitting}>
                    {isSubmitting ? 'Submitting…' : 'Submit Request'}
                  </button>
                  <span className="btn-enter-hint">or press <strong>ENTER</strong> &#8629;</span>
                </div>
              </div>
            )}

            {/* Step 5: Thank You */}
            {rqStep === 5 && (
              <div className="request-form">
                <div className="thankyou-body">
                  <svg className="thankyou-illus" viewBox="0 0 120 120" fill="none">
                    <circle cx="60" cy="60" r="56" fill="#f0fdf4" stroke="#bbf7d0" strokeWidth="2"/>
                    <ellipse cx="60" cy="90" rx="30" ry="8" fill="#dcfce7" opacity=".7"/>
                    <path d="M38 72 Q48 58 60 65 Q72 72 82 56" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" fill="none"/>
                    <circle cx="38" cy="72" r="4" fill="#16a34a"/>
                    <circle cx="82" cy="56" r="4" fill="#16a34a"/>
                    <path d="M44 42l4 4 8-8" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="60" cy="32" r="12" fill="#dcfce7" stroke="#86efac" strokeWidth="1.5"/>
                    <path d="M55 32l3 3 7-7" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <div className="thankyou-title">Thank you!</div>
                  <div className="thankyou-text">
                    We&apos;ve received your submission request. Thank you for sharing your requirement with HROne. Your trust and support mean a lot to us.<br/><br/>
                    Please note that the timeline for implementing your request will vary based on the feature and its complexity. We&apos;ll reach out to you shortly with more details.
                  </div>
                  <div className="did-you-know">
                    <div className="dyk-icon">&#128161;</div>
                    <div className="dyk-content">
                      <div className="dyk-title">Did you know?</div>
                      Every quarter, HROne receives around <strong>1000 New Feature Requests (NFRs)</strong>, diligently working to <strong>deliver 120</strong> of these enhancements to our customers, ensuring they have the best HRMS experience.<br/>HROne stands out with a robust delivery rate, ensuring our clients stay ahead with cutting-edge features and seamless functionality.
                    </div>
                  </div>
                  <button className="btn-primary" onClick={closeRequest} style={{margin:'0 auto',display:'block'}}>Done</button>
                </div>
              </div>
            )}
          </div>

          {/* Progress bar */}
          {rqStep > 0 && (
            <div className="request-progress" style={{width: progressWidth + '%'}}></div>
          )}
          </div>{/* end .request-panel */}
        </div>
      )}

      {/* ===== UPVOTE HINT TOOLTIP ===== */}
      {upvoteHintPos && (
        <div style={{position:'fixed',zIndex:600,left:upvoteHintPos.left,top:upvoteHintPos.top}}>
          <div className="upvote-tooltip">
            <p>Find features that you like and show your support by upvoting them!</p>
            <p>Hint: Simply press this <span className="upvote-btn" style={{display:'inline-flex',padding:'2px 8px',fontSize:'11px'}}><IconCaretUp size={12} voted={false} /> 5</span> button</p>
            <div className="tooltip-actions">
              <button className="btn-outline" onClick={() => setUpvoteHintPos(null)}>Cancel</button>
              <button className="btn-primary" onClick={() => setUpvoteHintPos(null)}>Got It!</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

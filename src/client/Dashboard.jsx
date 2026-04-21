import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from './api';
import Editor from './Editor';
import ShareModal from './ShareModal';

// Simple SVG icons
const Icons = {
  Plus: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>,
  File: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  Upload: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  Share: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>,
  Trash: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  LogOut: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  Users: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
};

export default function Dashboard({ user, onLogout }) {
  const [docs, setDocs] = useState({ owned: [], shared: [] });
  const [activeDocId, setActiveDocId] = useState(null);
  const [activeDoc, setActiveDoc] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef(null);

  const loadDocs = useCallback(async () => {
    try {
      const data = await api.listDocs();
      setDocs(data);
    } catch (err) {
      console.error('Failed to load docs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDocs();
  }, [loadDocs]);

  const loadDoc = useCallback(async (id) => {
    try {
      const doc = await api.getDoc(id);
      setActiveDoc(doc);
      setActiveDocId(id);
    } catch (err) {
      console.error('Failed to load doc:', err);
    }
  }, []);

  useEffect(() => {
    if (activeDocId) {
      loadDoc(activeDocId);
    }
  }, [activeDocId, loadDoc]);

  const handleCreateDoc = async () => {
    try {
      const doc = await api.createDoc({ title: 'Untitled Document' });
      await loadDocs();
      setActiveDocId(doc.id);
    } catch (err) {
      console.error('Failed to create doc:', err);
    }
  };

  const handleImportFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      const doc = await api.importFile(file);
      await loadDocs();
      setActiveDocId(doc.id);
    } catch (err) {
      alert(err.message);
    }
    
    e.target.value = '';
  };

  const handleDeleteDoc = async () => {
    if (!activeDoc || !activeDoc.is_owner) return;
    if (!confirm('Delete this document? This cannot be undone.')) return;
    
    try {
      await api.deleteDoc(activeDocId);
      setActiveDocId(null);
      setActiveDoc(null);
      await loadDocs();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDocUpdate = useCallback(() => {
    loadDocs();
  }, [loadDocs]);

  const handleRemoteUpdate = useCallback(() => {
    if (activeDocId) loadDoc(activeDocId);
  }, [loadDoc, activeDocId]);

  const handleShareUpdate = useCallback((shares) => {
    setActiveDoc(prev => prev ? { ...prev, shares } : prev);
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'Z');
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff/60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff/3600000)}h ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">Doc<span>Edit</span></div>
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">{user.username[0]}</div>
            <span>{user.username}</span>
          </div>
        </div>

        <div className="sidebar-actions">
          <button className="btn btn-primary" onClick={handleCreateDoc}>
            <Icons.Plus /> New Document
          </button>
          <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()}>
            <Icons.Upload /> Import File
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,.docx"
            onChange={handleImportFile}
            style={{ display: 'none' }}
          />
        </div>

        <div className="doc-list">
          {docs.owned.length > 0 && (
            <div className="doc-list-section">
              <div className="doc-list-title">My Documents</div>
              {docs.owned.map(doc => (
                <div
                  key={doc.id}
                  className={`doc-item ${activeDocId === doc.id ? 'active' : ''}`}
                  onClick={() => setActiveDocId(doc.id)}
                >
                  <Icons.File />
                  <div className="doc-item-info">
                    <div className="doc-item-title">{doc.title || 'Untitled'}</div>
                    <div className="doc-item-meta">
                      {doc.last_edited_by_name ? `${doc.last_edited_by_name} · ` : ''}{formatDate(doc.updated_at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {docs.shared.length > 0 && (
            <div className="doc-list-section">
              <div className="doc-list-title">Shared With Me</div>
              {docs.shared.map(doc => (
                <div
                  key={doc.id}
                  className={`doc-item ${activeDocId === doc.id ? 'active' : ''}`}
                  onClick={() => setActiveDocId(doc.id)}
                >
                  <Icons.File />
                  <div className="doc-item-info">
                    <div className="doc-item-title">{doc.title || 'Untitled'}</div>
                    <div className="doc-item-meta">
                      {doc.last_edited_by_name
                        ? `${doc.last_edited_by_name} · ${formatDate(doc.updated_at)}`
                        : `by ${doc.owner_name}`}
                    </div>
                  </div>
                  <span className="shared-badge">shared</span>
                </div>
              ))}
            </div>
          )}
          {!loading && docs.owned.length === 0 && docs.shared.length === 0 && (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '14px' }}>
              No documents yet. Create one to get started!
            </div>
          )}
        </div>

        <div className="sidebar-footer">
          <button className="btn btn-ghost" onClick={onLogout} style={{ width: '100%', justifyContent: 'flex-start' }}>
            <Icons.LogOut /> Sign Out
          </button>
        </div>
      </div>

      {/* Main Area */}
      <div className="main-content">
        {activeDoc ? (
          <>
            <div className="editor-header">
              <input
                className="doc-title-input"
                value={activeDoc.title}
                onChange={(e) => {
                  setActiveDoc(prev => ({ ...prev, title: e.target.value }));
                }}
                onBlur={async () => {
                  await api.updateDoc(activeDocId, { title: activeDoc.title });
                  handleDocUpdate();
                }}
                placeholder="Untitled Document"
                readOnly={activeDoc.access_type === 'view'}
              />
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                {activeDoc.last_edited_by_name && (
                  <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginRight: '8px', whiteSpace: 'nowrap' }}>
                    Edited by {activeDoc.last_edited_by_name} · {formatDate(activeDoc.updated_at)}
                  </span>
                )}
                {activeDoc.is_owner && (
                  <>
                    <button 
                      className="btn btn-ghost btn-sm tooltip" 
                      data-tooltip="Share"
                      onClick={() => setShowShareModal(true)}
                    >
                      <Icons.Share /> Share
                    </button>
                    <button 
                      className="btn btn-ghost btn-sm tooltip" 
                      data-tooltip="Delete"
                      onClick={handleDeleteDoc}
                      style={{ color: 'var(--danger)' }}
                    >
                      <Icons.Trash />
                    </button>
                  </>
                )}
                {!activeDoc.is_owner && (
                  <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Icons.Users /> Shared by {activeDoc.owner_name}
                  </span>
                )}
              </div>
            </div>
            <Editor
              doc={activeDoc}
              docId={activeDocId}
              onUpdate={handleDocUpdate}
              onRemoteUpdate={handleRemoteUpdate}
              readOnly={activeDoc.access_type === 'view'}
            />
          </>
        ) : (
          <div className="empty-state">
            <Icons.File />
            <h2>Welcome to WorkTable</h2>
            <p>Select a document from the sidebar or create a new one to get started.</p>
            <button className="btn btn-primary" onClick={handleCreateDoc}>
              <Icons.Plus /> Create Document
            </button>
          </div>
        )}
      </div>

      {/* Share Modal */}
      {showShareModal && activeDoc && (
        <ShareModal
          doc={activeDoc}
          onClose={() => setShowShareModal(false)}
          onShareUpdate={handleShareUpdate}
        />
      )}
    </div>
  );
}

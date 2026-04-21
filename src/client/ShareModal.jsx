import React, { useState, useEffect } from 'react';
import { api } from './api';

export default function ShareModal({ doc, onClose, onShareUpdate }) {
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState('edit');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    api.getUsers().then(data => setUsers(data.users)).catch(() => {});
  }, []);

  const handleShare = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setError('');
    setLoading(true);

    try {
      const data = await api.shareDoc(doc.id, email.trim(), permission);
      onShareUpdate(data.shares);
      setEmail('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveShare = async (shareId) => {
    try {
      const data = await api.removeShare(doc.id, shareId);
      onShareUpdate(data.shares);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h3>Share "{doc.title}"</h3>

        <form onSubmit={handleShare} style={{ display: 'flex', gap: '8px' }}>
          <input
            className="form-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter email address..."
            style={{ flex: 1 }}
            list="user-suggestions"
          />
          <datalist id="user-suggestions">
            {users.map(u => (
              <option key={u.id} value={u.email}>{u.username}</option>
            ))}
          </datalist>
          <select 
            className="toolbar-select" 
            value={permission} 
            onChange={(e) => setPermission(e.target.value)}
            style={{ minWidth: '80px' }}
          >
            <option value="edit">Can Edit</option>
            <option value="view">Can View</option>
          </select>
          <button className="btn btn-primary btn-sm" type="submit" disabled={loading}>
            {loading ? '...' : 'Share'}
          </button>
        </form>

        {error && <p className="error-msg">{error}</p>}

        {doc.shares && doc.shares.length > 0 && (
          <div className="share-list">
            <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '8px', marginTop: '16px' }}>
              People with access
            </div>
            {doc.shares.map(share => (
              <div key={share.id} className="share-item">
                <div className="share-user-info">
                  <div className="sidebar-user-avatar" style={{ width: 24, height: 24, fontSize: 11 }}>
                    {share.username[0]}
                  </div>
                  <div>
                    <div style={{ fontSize: '14px' }}>{share.username}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{share.email}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="share-permission">{share.permission}</span>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => handleRemoveShare(share.id)}
                    style={{ color: 'var(--danger)', padding: '4px' }}
                    title="Remove access"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="modal-actions">
          <button className="btn btn-secondary btn-sm" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}

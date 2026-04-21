const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      ...(options.body && !(options.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
    body: options.body && !(options.body instanceof FormData) 
      ? JSON.stringify(options.body) 
      : options.body,
  });
  
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  
  return res.json();
}

export const api = {
  // Auth
  login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  getMe: () => request('/auth/me'),
  getUsers: () => request('/auth/users'),

  // Documents
  listDocs: () => request('/documents'),
  getDoc: (id) => request(`/documents/${id}`),
  createDoc: (data) => request('/documents', { method: 'POST', body: data }),
  updateDoc: (id, data) => request(`/documents/${id}`, { method: 'PUT', body: data }),
  deleteDoc: (id) => request(`/documents/${id}`, { method: 'DELETE' }),

  // Sharing
  shareDoc: (id, userEmail, permission = 'edit') => 
    request(`/documents/${id}/share`, { method: 'POST', body: { userEmail, permission } }),
  removeShare: (docId, shareId) => 
    request(`/documents/${docId}/share/${shareId}`, { method: 'DELETE' }),

  // File upload
  importFile: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return request('/files/import', { method: 'POST', body: fd });
  },
  attachFile: (docId, file) => {
    const fd = new FormData();
    fd.append('file', file);
    return request(`/files/attach/${docId}`, { method: 'POST', body: fd });
  },
};

import React, { useEffect, useState } from 'react';
import { api } from './api.js';
import KycQueue from './apps/KycQueue.jsx';
import Refunds from './apps/Refunds.jsx';
import Flags from './apps/Flags.jsx';
import AuditLog from './apps/AuditLog.jsx';
import Policy from './apps/Policy.jsx';

const NAV = [
  { id: 'kyc', label: 'KYC Review', icon: '◫' },
  { id: 'refunds', label: 'Refunds', icon: '↩' },
  { id: 'flags', label: 'Feature Flags', icon: '⚑' },
  { id: 'audit', label: 'Audit Log', icon: '≡' },
  { id: 'policy', label: 'Policy', icon: '◇' },
];

const TITLES = {
  kyc: ['KYC Review Queue', 'Review identity-verification cases and record decisions.'],
  refunds: ['Refunds Dashboard', 'Approve and process customer refund requests.'],
  flags: ['Feature Flags', 'Manage environment-specific releases and rollout percentages.'],
  audit: ['Audit Log', 'Immutable record of sensitive actions and denied access.'],
  policy: ['Policy & Assumptions', 'The live, version-controlled controls this server enforces.'],
};

export default function App() {
  const [active, setActive] = useState('kyc');
  const [userId, setUserId] = useState('u_ana');
  const [users, setUsers] = useState([]);
  const [me, setMe] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    Promise.all([api(userId, '/users'), api(userId, '/me')])
      .then(([u, m]) => {
        setUsers(u.users);
        setMe(m);
      })
      .catch((err) => notify(err.message, 'error'));
  }, [userId]);

  function notify(message, kind = 'success') {
    setToast({ message, kind });
    window.setTimeout(() => setToast(null), 3500);
  }

  const title = TITLES[active];
  const permissions = me?.permissions ?? [];
  const viewProps = { userId, permissions, notify };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">O</div>
          <div>
            <strong>OpsTool</strong>
            <span>Internal operations</span>
          </div>
        </div>

        <div className="nav-label">WORKSPACES</div>
        <nav>
          {NAV.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${active === item.id ? 'active' : ''}`}
              onClick={() => setActive(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
              {item.id === 'policy' && <span className="nav-badge">CODE</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="demo-tag">
            <span className="status-dot" />
            LOCAL DEMO
          </div>
          <p>Mock auth &amp; fixture data.<br />Not for production use.</p>
        </div>
      </aside>

      <main>
        <header className="topbar">
          <div>
            <h1>{title[0]}</h1>
            <p>{title[1]}</p>
          </div>
          <div className="identity">
            <div className="avatar">{me?.user?.name?.[0] ?? '?'}</div>
            <div className="identity-copy">
              <span>Signed in as</span>
              <select value={userId} onChange={(e) => setUserId(e.target.value)}>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} · {user.role}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </header>

        <section className="content">
          {active === 'kyc' && <KycQueue {...viewProps} />}
          {active === 'refunds' && <Refunds {...viewProps} />}
          {active === 'flags' && <Flags {...viewProps} />}
          {active === 'audit' && <AuditLog {...viewProps} />}
          {active === 'policy' && <Policy {...viewProps} />}
        </section>
      </main>

      {toast && <div className={`toast ${toast.kind}`}>{toast.message}</div>}
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { AccessDenied, Loading } from './KycQueue.jsx';

export default function AuditLog({ userId, permissions, notify }) {
  const [entries, setEntries] = useState(null);
  const canRead = permissions.includes('audit.read');

  useEffect(() => {
    if (!canRead) return;
    api(userId, '/audit')
      .then((data) => setEntries(data.entries))
      .catch((err) => notify(err.message, 'error'));
  }, [userId, canRead]);

  if (!canRead) return <AccessDenied domain="the audit log" />;
  if (!entries) return <Loading />;

  return (
    <div className="panel">
      <div className="panel-heading">
        <div>
          <h2>Recent security events</h2>
          <p>Structured, actor-attributed, append-only records. Latest 200.</p>
        </div>
        <span className="count-pill">{entries.length} events</span>
      </div>
      {entries.length === 0 ? (
        <div className="empty-inline">No audited events yet. Perform a mutation or denied action.</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Outcome</th>
                <th>Entity</th>
                <th>Structured detail</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td><small>{new Date(entry.at).toLocaleString()}</small></td>
                  <td><strong>{entry.actorName ?? entry.actorId}</strong><small>{entry.actorRole}</small></td>
                  <td><code>{entry.action}</code></td>
                  <td><span className={`outcome ${entry.outcome}`}>{entry.outcome}</span></td>
                  <td>{entry.entity ? <><span>{entry.entity}</span><small>{entry.entityId}</small></> : '—'}</td>
                  <td><code className="json">{entry.detail ? JSON.stringify(entry.detail) : '—'}</code></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

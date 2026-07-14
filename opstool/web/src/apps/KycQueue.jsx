import React, { useEffect, useState } from 'react';
import { api } from '../api.js';

const ACTIONS = {
  pending: [
    ['Start review', 'in_review', 'primary'],
    ['Escalate', 'escalated', 'warning'],
  ],
  in_review: [
    ['Approve', 'approved', 'success'],
    ['Reject', 'rejected', 'danger'],
    ['Escalate', 'escalated', 'warning'],
  ],
  escalated: [
    ['Approve', 'approved', 'success'],
    ['Reject', 'rejected', 'danger'],
    ['Return to review', 'in_review', 'secondary'],
  ],
};

export default function KycQueue({ userId, permissions, notify }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const canRead = permissions.includes('kyc.read');
  const canDecide = permissions.includes('kyc.decide');

  function load() {
    if (!canRead) {
      setLoading(false);
      return;
    }
    setLoading(true);
    api(userId, '/kyc')
      .then(setData)
      .catch((err) => notify(err.message, 'error'))
      .finally(() => setLoading(false));
  }

  useEffect(load, [userId, canRead]);

  async function act(item, nextStatus) {
    let note = '';
    if (['rejected', 'escalated'].includes(nextStatus)) {
      note = window.prompt(`Reason required to mark this case ${nextStatus}:`) ?? '';
      if (!note.trim()) return;
    }
    try {
      await api(userId, `/kyc/${item.id}/decision`, {
        method: 'POST',
        body: JSON.stringify({ status: nextStatus, note, version: item.version }),
      });
      notify(`Case moved to ${nextStatus.replace('_', ' ')}`);
      load();
    } catch (err) {
      notify(err.message, 'error');
    }
  }

  if (!canRead) return <AccessDenied domain="KYC cases" />;
  if (loading || !data) return <Loading />;

  return (
    <>
      <div className="stat-grid">
        <Stat label="Open cases" value={data.stats.open} tone="blue" />
        <Stat label="Escalated" value={data.stats.escalated} tone="amber" />
        <Stat label={`High risk (≥${data.highRiskCutoff})`} value={data.stats.highRisk} tone="red" />
      </div>

      <div className="panel">
        <div className="panel-heading">
          <div>
            <h2>Identity verification cases</h2>
            <p>Open cases are sorted by urgency, then risk score.</p>
          </div>
          <span className="count-pill">{data.cases.length} cases</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Country</th>
                <th>Document</th>
                <th>Risk</th>
                <th>Status</th>
                <th>Latest note</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.cases.map((item) => {
                const latest = item.notes[item.notes.length - 1];
                return (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.customerName}</strong>
                      <small>{item.customerEmail}</small>
                    </td>
                    <td>{item.country}</td>
                    <td className="humanize">{item.documentType}</td>
                    <td><Risk value={item.riskScore} /></td>
                    <td><Status value={item.status} /></td>
                    <td className="note-cell">
                      {latest ? (
                        <>
                          <span>“{latest.note}”</span>
                          <small>— {latest.author}</small>
                        </>
                      ) : <span className="muted">No notes</span>}
                    </td>
                    <td>
                      <div className="action-row">
                        {(ACTIONS[item.status] ?? []).map(([label, next, tone]) => (
                          <button
                            key={next}
                            className={`button small ${tone}`}
                            disabled={!canDecide}
                            title={!canDecide ? 'Requires kyc.decide' : ''}
                            onClick={() => act(item, next)}
                          >
                            {label}
                          </button>
                        ))}
                        {!ACTIONS[item.status] && <span className="muted">Finished</span>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function Stat({ label, value, tone }) {
  return <div className={`stat ${tone}`}><span>{label}</span><strong>{value}</strong></div>;
}

function Risk({ value }) {
  const tone = value >= 70 ? 'high' : value >= 40 ? 'medium' : 'low';
  return <span className={`risk ${tone}`}><b>{value}</b><i style={{ width: `${value}%` }} /></span>;
}

export function Status({ value }) {
  return <span className={`status ${value}`}>{value.replace('_', ' ')}</span>;
}

export function AccessDenied({ domain }) {
  return (
    <div className="empty-state denied">
      <div className="empty-icon">×</div>
      <h2>Access denied</h2>
      <p>Your role does not have permission to view {domain}.</p>
      <code>Server response: 403 PERMISSION_DENIED</code>
    </div>
  );
}

export function Loading() {
  return <div className="loading"><span /><span /><span /></div>;
}

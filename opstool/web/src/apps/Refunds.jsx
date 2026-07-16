import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { AccessDenied, Loading, Status } from './KycQueue.jsx';

const money = (cents, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);

export default function Refunds({ userId, permissions, notify }) {
  const [data, setData] = useState(null);
  const canRead = permissions.includes('refunds.read');
  const canApprove = permissions.includes('refunds.approve');
  const canProcess = permissions.includes('refunds.process');

  function load() {
    if (!canRead) return;
    api(userId, '/refunds')
      .then(setData)
      .catch((err) => notify(err.message, 'error'));
  }
  useEffect(load, [userId, canRead]);

  async function approve(item, decision) {
    try {
      await api(userId, `/refunds/${item.id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ decision, version: item.version }),
      });
      notify(`Refund ${decision}`);
      load();
    } catch (err) {
      notify(`${err.code ? `${err.code}: ` : ''}${err.message}`, 'error');
    }
  }

  async function process(item) {
    try {
      await api(userId, `/refunds/${item.id}/process`, {
        method: 'POST',
        body: JSON.stringify({ version: item.version }),
      });
      notify('Refund marked processed');
      load();
    } catch (err) {
      notify(err.message, 'error');
    }
  }

  if (!canRead) return <AccessDenied domain="refund requests" />;
  if (!data) return <Loading />;

  return (
    <>
      <div className="stat-grid four">
        <Stat label="Open requests" value={data.stats.openCount} />
        <Stat label="Open amount" value={money(data.stats.openAmountCents)} />
        <Stat label="Approved amount" value={money(data.stats.approvedAmountCents)} />
        <Stat label="Processed" value={data.stats.processedCount} />
      </div>

      <div className="callout">
        <strong>Maker-checker enforced</strong>
        Requesters cannot approve their own refunds. Amounts over {money(data.admin_threshold_cents)} require a different admin.
      </div>

      <div className="panel">
        <div className="panel-heading">
          <div><h2>Refund requests</h2><p>Approval and execution are separate permissions.</p></div>
          <span className="count-pill">{data.refunds.length} requests</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Transaction</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Reason</th>
                <th>Requested by</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.refunds.map((item) => {
                const large = item.amountCents > data.admin_threshold_cents;
                return (
                  <tr key={item.id}>
                    <td><code>{item.transactionRef}</code></td>
                    <td><strong>{item.customerName}</strong></td>
                    <td>
                      <strong>{money(item.amountCents, item.currency)}</strong>
                      {large && <small className="threshold">ADMIN REQUIRED</small>}
                    </td>
                    <td>{item.reason}</td>
                    <td>{item.requestedByName}</td>
                    <td><Status value={item.status} /></td>
                    <td>
                      <div className="action-row">
                        {item.status === 'requested' && (
                          <>
                            <button className="button small success" disabled={!canApprove} onClick={() => approve(item, 'approved')}>Approve</button>
                            <button className="button small danger" disabled={!canApprove} onClick={() => approve(item, 'rejected')}>Reject</button>
                          </>
                        )}
                        {item.status === 'approved' && (
                          <button className="button small primary" disabled={!canProcess} onClick={() => process(item)}>Mark processed</button>
                        )}
                        {['processed', 'rejected'].includes(item.status) && <span className="muted">Finished</span>}
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

function Stat({ label, value }) {
  return <div className="stat neutral"><span>{label}</span><strong>{value}</strong></div>;
}

import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Loading } from './KycQueue.jsx';

const ALL_ACTIONS = [
  'kyc.read', 'kyc.decide',
  'refunds.read', 'refunds.approve', 'refunds.process',
  'flags.read', 'flags.write',
  'audit.read', 'policy.read',
];

export default function Policy({ userId, notify }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    api(userId, '/policy')
      .then(setData)
      .catch((err) => notify(err.message, 'error'));
  }, [userId]);

  if (!data) return <Loading />;

  return (
    <>
      <div className="policy-banner">
        <span>!</span>
        <div><strong>These are assumptions, not confirmed requirements.</strong><p>{data.banner}</p></div>
      </div>

      <div className="policy-grid">
        <section className="panel compact">
          <div className="panel-heading"><div><h2>Operational thresholds</h2><p>Functional values read by enforcement code.</p></div><span className="code-pill">policy/index.js</span></div>
          <div className="threshold-grid">
            <div>
              <span>Refund admin approval</span>
              <strong>${(data.thresholds.refundAdminApprovalCents / 100).toFixed(2)}</strong>
              <small>Amounts above require admin</small>
            </div>
            <div>
              <span>KYC high-risk cutoff</span>
              <strong>{data.thresholds.kycHighRiskCutoff}</strong>
              <small>Scores at or above are high risk</small>
            </div>
          </div>
        </section>

        <section className="panel compact">
          <div className="panel-heading"><div><h2>Change model</h2><p>No runtime policy backdoor.</p></div></div>
          <div className="change-model">
            <div className="flow-node">Edit config</div><b>→</b>
            <div className="flow-node">Reviewed PR</div><b>→</b>
            <div className="flow-node">Restart app</div>
          </div>
          <p className="fine-print">Mode: <code>{data.editMode}</code>. The page is read-only; every value shown is the same value the server enforces.</p>
        </section>
      </div>

      <section className="panel">
        <div className="panel-heading"><div><h2>Action permission matrix</h2><p>Least-privilege permissions derived from role/group membership.</p></div></div>
        <div className="table-wrap">
          <table className="matrix">
            <thead><tr><th>Action</th>{Object.keys(data.permissions).map((role) => <th key={role}>{role}</th>)}</tr></thead>
            <tbody>
              {ALL_ACTIONS.map((action) => (
                <tr key={action}>
                  <td><code>{action}</code></td>
                  {Object.entries(data.permissions).map(([role, actions]) => (
                    <td key={role}>{actions.includes(action) ? <span className="yes">✓</span> : <span className="no">—</span>}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="policy-grid">
        {Object.entries(data.stateMachines).map(([name, machine]) => (
          <section className="panel compact" key={name}>
            <div className="panel-heading"><div><h2>{name.toUpperCase()} state machine</h2><p>Allowed transitions, enforced server-side.</p></div></div>
            <div className="state-list">
              {Object.entries(machine).map(([from, to]) => (
                <div key={from}><code>{from}</code><span>→</span><p>{to.length ? to.map((v) => <code key={v}>{v}</code>) : <em>terminal</em>}</p></div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <section className="panel assumptions">
        <div className="panel-heading"><div><h2>Client-validation checklist</h2><p>Reasonable demo defaults that must be confirmed before production.</p></div></div>
        <ol>{data.assumptions.map((item) => <li key={item}>{item}</li>)}</ol>
      </section>
    </>
  );
}

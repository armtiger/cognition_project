import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Loading } from './KycQueue.jsx';

const ENVS = [
  ['dev', 'Development'],
  ['staging', 'Staging'],
  ['prod', 'Production'],
];

export default function Flags({ userId, permissions, notify }) {
  const [data, setData] = useState(null);
  const canWrite = permissions.includes('flags.write');

  function load() {
    api(userId, '/flags')
      .then(setData)
      .catch((err) => notify(err.message, 'error'));
  }
  useEffect(load, [userId]);

  async function update(item, field, value) {
    if (field.includes('prod') && field.startsWith('enabled') && value === true) {
      if (!window.confirm(`Enable ${item.key} in production?`)) return;
    }
    try {
      await api(userId, `/flags/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ version: item.version, [field]: value }),
      });
      notify(`${item.key} updated`);
      load();
    } catch (err) {
      notify(err.message, 'error');
    }
  }

  if (!data) return <Loading />;

  return (
    <>
      <div className="callout violet">
        <strong>Prototype administration layer</strong>
        In production, the approved feature provider remains the system of record and delivery plane.
      </div>
      <div className="panel flags-panel">
        <div className="panel-heading">
          <div><h2>Release controls</h2><p>Enable flags and set rollout percentage independently per environment.</p></div>
          <span className={`permission-pill ${canWrite ? 'granted' : ''}`}>{canWrite ? 'WRITE ACCESS' : 'READ ONLY'}</span>
        </div>
        <div className="flag-list">
          {data.flags.map((item) => (
            <div className="flag-row" key={item.id}>
              <div className="flag-meta">
                <code>{item.key}</code>
                <p>{item.description}</p>
                <small>Updated {new Date(item.updatedAt).toLocaleString()}</small>
              </div>
              <div className="environments">
                {ENVS.map(([key, label]) => (
                  <div className={`env-card ${key}`} key={key}>
                    <div className="env-heading">
                      <span>{label}</span>
                      <label className="switch">
                        <input
                          type="checkbox"
                          checked={item[`enabled_${key}`]}
                          disabled={!canWrite}
                          onChange={(e) => update(item, `enabled_${key}`, e.target.checked)}
                        />
                        <i />
                      </label>
                    </div>
                    <label className={`rollout ${item[`enabled_${key}`] ? '' : 'disabled'}`}>
                      Rollout
                      <span title={item[`enabled_${key}`] ? undefined : 'Enable this environment to set a rollout'}>
                        <RolloutInput
                          value={item[`rollout_pct_${key}`]}
                          disabled={!canWrite || !item[`enabled_${key}`]}
                          onCommit={(value) => update(item, `rollout_pct_${key}`, value)}
                        />
                        %
                      </span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function RolloutInput({ value, disabled, onCommit }) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => setDraft(String(value)), [value]);

  function commit() {
    const numeric = Number(draft);
    if (Number.isInteger(numeric) && numeric !== value) onCommit(numeric);
    else setDraft(String(value));
  }

  return (
    <input
      type="number"
      min="0"
      max="100"
      value={draft}
      disabled={disabled}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
      }}
    />
  );
}

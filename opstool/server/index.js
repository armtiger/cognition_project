// Fail closed: omitted/misspelled flag must never silently enable spoofable
// header auth and SQLite. This process is strictly a local demo.
if (process.env.ALLOW_INSECURE_DEMO_AUTH !== 'true') {
  console.error(
    'FATAL: Refusing to start. This prototype uses spoofable header auth and SQLite.\n' +
    'For a local demo only, set ALLOW_INSECURE_DEMO_AUTH=true.'
  );
  process.exit(1);
}

// Initialize the schema before importing modules that prepare SQL statements.
// Dynamic imports also ensure the fail-closed check happens before the demo
// database is opened.
const { init } = await import('./infrastructure/sqlite/db.js');
init();
const { createApp } = await import('./app.js');
const port = Number(process.env.PORT ?? 4000);
const host = process.env.HOST ?? '127.0.0.1';
const app = createApp();

app.listen(port, host, () => {
  console.log(`OpsTool API listening on http://${host}:${port} (INSECURE LOCAL DEMO)`);
});

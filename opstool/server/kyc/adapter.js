// Domain adapter: today it reads SQLite fixtures. In production it would call
// the approved KYC domain-service API. Domain logic never talks to the DB
// directly -- only through this adapter.
import { db } from '../infrastructure/sqlite/db.js';

const listStmt = db.prepare(`
  SELECT c.*, d.name AS decided_by_name
  FROM kyc_cases c
  LEFT JOIN users d ON d.id = c.decided_by
`);
const getStmt = db.prepare('SELECT * FROM kyc_cases WHERE id = ?');
const notesStmt = db.prepare(`
  SELECT n.id, n.note, n.created_at, n.author_id, u.name AS author_name
  FROM kyc_notes n LEFT JOIN users u ON u.id = n.author_id
  WHERE n.case_id = ? ORDER BY n.id ASC
`);
const updateStatusStmt = db.prepare(`
  UPDATE kyc_cases
  SET status = @status, decided_at = @decided_at, decided_by = @decided_by,
      version = version + 1
  WHERE id = @id AND version = @version
`);
const insertNoteStmt = db.prepare(`
  INSERT INTO kyc_notes (case_id, author_id, note, created_at)
  VALUES (?,?,?,?)
`);

export const kycAdapter = {
  list: () => listStmt.all(),
  get: (id) => getStmt.get(id),
  notes: (caseId) => notesStmt.all(caseId),
  updateStatus: (args) => updateStatusStmt.run(args),
  insertNote: (caseId, authorId, note, at) => insertNoteStmt.run(caseId, authorId, note, at),
};

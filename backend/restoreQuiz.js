/**
 * Quiz Restore Script
 * Run with: node restoreQuiz.js
 * Reads quiz-backup.json and recreates ALL questions and answers.
 * WARNING: deletes the current quiz first.
 */
require('dotenv').config();
const jwt = require('jsonwebtoken');
const fs = require('fs');

const BASE = 'http://localhost:3000/api';
const TOKEN = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1h' });
const AUTH = { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' };

async function api(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: AUTH,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${await res.text()}`);
  return res.json();
}

async function restore() {
  if (!fs.existsSync('quiz-backup.json')) {
    console.error('❌  quiz-backup.json not found. Run backupQuiz.js first.');
    process.exit(1);
  }

  const backup = JSON.parse(fs.readFileSync('quiz-backup.json', 'utf8'));
  console.log(`📦  Found ${backup.length} question(s) in backup.`);

  // Delete current quiz (answers first to avoid FK conflicts)
  console.log('⏳  Deleting current quiz...');
  const existing = await api('GET', '/admin/quiz');
  for (const q of existing) {
    for (const a of (q.answers || [])) {
      await api('DELETE', `/admin/quiz/answers/${a.id}`);
    }
  }
  for (const q of existing) {
    await api('DELETE', `/admin/quiz/questions/${q.id}`);
    process.stdout.write('.');
  }
  if (existing.length) console.log(`\n✓  Deleted ${existing.length} question(s).`);

  // Recreate questions (collect old→new ID map)
  console.log('\n📝  Recreating questions...');
  const idMap = {}; // old ID → new ID
  for (const q of backup) {
    const created = await api('POST', '/admin/quiz/questions', { text: q.text });
    idMap[q.id] = created.id;
    process.stdout.write('.');
  }
  console.log(`\n✓  Created ${backup.length} question(s).`);

  // Set start question
  const startQ = backup.find(q => q.is_start);
  if (startQ) {
    await api('PUT', `/admin/quiz/questions/${idMap[startQ.id]}`, { is_start: true });
    console.log('✓  Start question restored.');
  }

  // Recreate answers
  console.log('\n🔗  Recreating answers...');
  let answerCount = 0;
  for (const q of backup) {
    for (const a of (q.answers || [])) {
      const payload = {
        text: a.text,
        description: a.description || null,
        next_question_id: a.next_question_id ? idMap[a.next_question_id] : null,
        result_kit_id: a.result_kit_id || null,
        result_contact: a.result_contact || false,
        group_action: a.group_action || null,
      };
      await api('POST', `/admin/quiz/questions/${idMap[q.id]}/answers`, payload);
      answerCount++;
      process.stdout.write('.');
    }
  }
  console.log(`\n✓  Created ${answerCount} answer(s).`);
  console.log('\n✅  Quiz restored successfully from quiz-backup.json');
}

restore().catch(err => {
  console.error('\n❌  Restore failed:', err.message);
  process.exit(1);
});

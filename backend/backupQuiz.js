/**
 * Quiz Backup Script
 * Run with: node backupQuiz.js
 * Saves the current quiz structure to quiz-backup.json
 */
require('dotenv').config();
const jwt = require('jsonwebtoken');
const fs = require('fs');

const BASE = 'http://localhost:3000/api';
const TOKEN = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1h' });
const AUTH = { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' };

async function api(method, path) {
  const res = await fetch(`${BASE}${path}`, { method, headers: AUTH });
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${await res.text()}`);
  return res.json();
}

async function backup() {
  console.log('⏳  Fetching current quiz data...');
  const questions = await api('GET', '/admin/quiz');
  const file = 'quiz-backup.json';
  fs.writeFileSync(file, JSON.stringify(questions, null, 2));
  console.log(`✅  Backed up ${questions.length} question(s) to ${file}`);
}

backup().catch(err => {
  console.error('❌  Backup failed:', err.message);
  process.exit(1);
});

/**
 * Emergency Preparedness Quiz Seed Script
 * Run with: node seedQuiz.js
 * Deletes all existing questions/answers and rebuilds from scratch.
 */
require('dotenv').config();
const jwt = require('jsonwebtoken');

const BASE = 'http://localhost:3000/api';
const TOKEN = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1h' });
const AUTH = { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' };

async function api(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: AUTH,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${method} ${path} -> ${res.status}: ${text}`);
  }
  return res.json();
}

async function seed() {
  // ── Wipe existing quiz ───────────────────────────────────────────────────
  console.log('Loading existing questions...');
  const existing = await api('GET', '/admin/quiz');

  // Delete all answers first to clear FK references between questions
  for (const q of existing) {
    for (const a of (q.answers || [])) {
      await api('DELETE', '/admin/quiz/answers/' + a.id);
    }
  }
  for (const q of existing) {
    await api('DELETE', '/admin/quiz/questions/' + q.id);
    process.stdout.write('.');
  }
  if (existing.length) console.log('\nDeleted ' + existing.length + ' existing question(s).');

  // ── Create questions (no answers yet) ───────────────────────────────────
  console.log('\nCreating questions...');
  const Q1 = await api('POST', '/admin/quiz/questions', { text: 'What is your primary preparedness goal?' });
  const Q2 = await api('POST', '/admin/quiz/questions', { text: 'Who are you building this evacuation kit for?' });
  const Q3 = await api('POST', '/admin/quiz/questions', { text: 'How long do you need to be self-sufficient at home?' });
  const Q4 = await api('POST', '/admin/quiz/questions', { text: 'What type of vehicle are you equipping?' });
  const Q5 = await api('POST', '/admin/quiz/questions', { text: 'Does anyone in your group have special requirements?' });
  const Q6 = await api('POST', '/admin/quiz/questions', { text: 'What are the ages of the children in your household?' });
  const Q7 = await api('POST', '/admin/quiz/questions', { text: 'Does your household have any of the following?' });
  console.log('Created 7 questions.');

  // Set Q1 as start
  await api('PUT', '/admin/quiz/questions/' + Q1.id, { is_start: true });
  console.log('Q1 set as START.');

  // ── Helper shorthand ─────────────────────────────────────────────────────
  const A = (qid, body) => api('POST', '/admin/quiz/questions/' + qid + '/answers', body);

  console.log('\nCreating answers...');

  // Q1: Primary goal
  await A(Q1.id, {
    text: 'Build a bug-out / evacuation kit',
    description: 'A portable kit designed to sustain you if you need to leave your home quickly — whether due to wildfire, flood, civil emergency, or any rapid-displacement scenario.',
    next_question_id: Q2.id,
  });
  await A(Q1.id, {
    text: 'Prepare my home for emergencies (shelter in place)',
    description: 'A home-based supply cache designed to keep your household comfortable and safe without leaving — covering power outages, water disruptions, and extended grid-down scenarios.',
    next_question_id: Q3.id,
  });
  await A(Q1.id, {
    text: 'Build a vehicle emergency kit',
    description: 'A compact kit stored in your car or truck for roadside emergencies, unexpected overnight situations, or getting home when normal routes are disrupted.',
    next_question_id: Q4.id,
  });
  await A(Q1.id, {
    text: "I'm not sure — help me figure out what I need",
    description: "Not a problem. Reach out and we'll walk you through what makes sense for your situation.",
    result_contact: true,
  });
  console.log('  Q1 answers done');

  // Q2: Evacuation — group size
  await A(Q2.id, {
    text: 'Just me (solo adult)',
    next_question_id: Q5.id,
    group_action: { adults: 1 },
  });
  await A(Q2.id, {
    text: 'Me and one other adult',
    next_question_id: Q5.id,
    group_action: { adults: 2 },
  });
  await A(Q2.id, {
    text: 'A family — adults and children',
    next_question_id: Q6.id,
    group_action: { adults: 2 },
  });
  await A(Q2.id, {
    text: 'A large group or team (5+ people)',
    description: "Groups this size usually require a custom solution. We'll help you plan it out.",
    result_contact: true,
  });
  console.log('  Q2 answers done');

  // Q3: Shelter in place — duration
  await A(Q3.id, {
    text: '72 hours — the standard FEMA recommendation',
    description: 'Enough supplies to be fully independent for three days while infrastructure is restored.',
    next_question_id: Q7.id,
  });
  await A(Q3.id, {
    text: 'Up to one week',
    description: 'A more robust cache for slower-moving scenarios like extended power outages or severe weather recovery.',
    next_question_id: Q7.id,
  });
  await A(Q3.id, {
    text: 'Two weeks or longer',
    description: "Long-term preparedness requires a custom plan. We'll help you build it.",
    result_contact: true,
  });
  await A(Q3.id, {
    text: "I'm not sure — just give me a solid recommendation",
    next_question_id: Q7.id,
  });
  console.log('  Q3 answers done');

  // Q4: Vehicle type
  await A(Q4.id, {
    text: 'Personal car, SUV, or light truck',
    description: 'A compact, well-organized kit sized for a standard passenger vehicle.',
    result_kit_id: null,
  });
  await A(Q4.id, {
    text: 'Work truck, van, or heavy-duty vehicle',
    description: 'A more comprehensive kit suited to larger vehicles or professionals spending extended time on the road.',
    result_kit_id: null,
  });
  await A(Q4.id, {
    text: 'Multiple vehicles to equip',
    description: "We can put together a bundle or fleet package. Let's talk.",
    result_contact: true,
  });
  console.log('  Q4 answers done');

  // Q5: Special requirements — evacuation adults
  await A(Q5.id, {
    text: 'No special requirements — standard healthy adults',
    result_kit_id: null,
  });
  await A(Q5.id, {
    text: 'We have pets to include in the plan',
    description: "Dogs, cats, and small animals can be included. We'll make sure food, water, and carrying supplies are covered.",
    result_kit_id: null,
  });
  await A(Q5.id, {
    text: 'Someone in our group has medical needs or power-dependent devices',
    description: 'Oxygen concentrators, CPAP machines, insulin refrigeration, and similar needs require a custom plan.',
    result_contact: true,
  });
  console.log('  Q5 answers done');

  // Q6: Children ages — evacuation family path
  await A(Q6.id, {
    text: 'All children are school-age (5 years and older)',
    next_question_id: Q5.id,
    group_action: { children: 1 },
  });
  await A(Q6.id, {
    text: 'We have infants or toddlers (under 5 years old)',
    description: 'Infants and young toddlers need formula, diapers, medications, and specialized gear. This warrants a custom kit.',
    result_contact: true,
  });
  await A(Q6.id, {
    text: 'A mix — some children under 5 and some older',
    description: "Mixed-age families with young children need tailored solutions. We'll build the right kit with you.",
    result_contact: true,
  });
  console.log('  Q6 answers done');

  // Q7: Household special needs — shelter path
  await A(Q7.id, {
    text: 'Nothing out of the ordinary — a standard household',
    result_kit_id: null,
    group_action: { adults: 1 },
  });
  await A(Q7.id, {
    text: 'We have children at home',
    result_kit_id: null,
    group_action: { adults: 2, children: 1 },
  });
  await A(Q7.id, {
    text: 'We have elderly or mobility-limited members',
    description: 'Mobility aids, fall prevention, and accessibility needs require a custom approach.',
    result_contact: true,
  });
  await A(Q7.id, {
    text: 'Someone requires medical equipment or power-dependent devices',
    description: 'Power outages are especially serious with medical equipment. Let us build a plan that addresses this.',
    result_contact: true,
  });
  console.log('  Q7 answers done');

  console.log('\nQuiz seeded successfully!\n');
  console.log('Terminal answers with no kit assigned yet (assign via Admin -> Quiz):');
  console.log('  Q4-A: Personal car/SUV kit');
  console.log('  Q4-B: Work truck / heavy vehicle kit');
  console.log('  Q5-A: Bug-out kit (solo / small group, no pets)');
  console.log('  Q5-B: Bug-out kit (with pets)');
  console.log('  Q7-A: Home shelter kit (standard household)');
  console.log('  Q7-B: Home shelter kit (family with children)');
}

seed().catch(err => {
  console.error('\nSeed failed:', err.message);
  process.exit(1);
});

const test = require('node:test');
const assert = require('node:assert/strict');

const { buildHybridKitRecommendation } = require('../routes/qa');

test('buildHybridKitRecommendation prefers a home emergency kit for outage-family answers', async () => {
  const kits = [
    {
      id: 'home-1',
      name: 'Home Emergency Kit',
      description: 'Prepared for home outages, storms, and family safety during power disruptions.',
      tag: 'home readiness',
      category: 'Emergency',
      primary_use: 'home readiness',
      audience: 'family',
      scenario: 'power outage',
      tags: ['home', 'family', 'storm', 'safety']
    },
    {
      id: 'travel-1',
      name: 'Travel Safety Kit',
      description: 'Portable kit for trips and on-the-go safety.',
      tag: 'travel',
      category: 'Travel',
      primary_use: 'travel',
      audience: 'solo',
      scenario: 'road trip',
      tags: ['travel', 'mobile']
    }
  ];

  const answers = {
    q_goal: 'Home emergency readiness',
    q_household: 'Family of 4',
    q_priority: 'Power outage'
  };

  const manualWeights = {
    q_goal: { 'Home emergency readiness': 30 },
    q_household: { 'Family of 4': 20 },
    q_priority: { 'Power outage': 25 }
  };

  const result = await buildHybridKitRecommendation({ kits, answers, manualWeights });

  assert.equal(result.recommendedKitId, 'home-1');
  assert.ok(result.totalScore >= 50, `Expected a strong score, got ${result.totalScore}`);
  assert.ok(result.reasons.length > 0, 'Expected explanation reasons');
});

const test = require('node:test');
const assert = require('node:assert/strict');

const { createRecommendationConfigStore } = require('../routes/recommendationConfig');

function createMemorySupabase() {
  let savedWeights = null;

  return {
    from(table) {
      assert.equal(table, 'recommendation_config');
      return {
        select() {
          return {
            eq(_column, _value) {
              return {
                async maybeSingle() {
                  return savedWeights ? { data: { weights: savedWeights }, error: null } : { data: null, error: null };
                },
              };
            },
          };
        },
        upsert(row) {
          savedWeights = row.weights;
          return {
            select() {
              return {
                async single() {
                  return { data: { weights: savedWeights }, error: null };
                },
              };
            },
          };
        },
      };
    },
  };
}

test('recommendation weights default to the configured values before being saved', async () => {
  const config = createRecommendationConfigStore(createMemorySupabase());
  const initial = await config.getRecommendationWeights();
  assert.ok(initial && typeof initial === 'object');
  assert.ok(Object.keys(initial).length > 0);
});

test('manual recommendation weights can be read and updated in durable storage', async () => {
  const config = createRecommendationConfigStore(createMemorySupabase());
  const initial = await config.getRecommendationWeights();
  const next = {
    ...initial,
    emergency: {
      ...(initial.emergency || {}),
      'urban preparedness': 18,
    },
  };

  const updated = await config.setRecommendationWeights(next);
  assert.equal(updated.emergency['urban preparedness'], 18);

  const restored = await config.getRecommendationWeights();
  assert.equal(restored.emergency['urban preparedness'], 18);
});

const DEFAULT_RECOMMENDATION_WEIGHTS = {
  Q1: {
    'Urban emergency preparedness': 18,
    'Home defense security': 14,
    'Family evacuation readiness': 16,
    'Disaster supplies and recovery': 13,
    'Community resilience and planning': 12,
  },
  Q2: {
    '1 adult': 10,
    '2 adults': 12,
    'Family with children': 18,
    'Group / multiple adults': 16,
    'Individual or solo': 8,
  },
  Q3: {
    'Short-term disruption': 12,
    'Extended outage': 18,
    'Civil unrest': 16,
    'Severe weather': 14,
    'Long-term self-reliance': 20,
  },
};

function sanitizeWeights(value) {
  const safeSource = value && typeof value === 'object' && !Array.isArray(value)
    ? value
    : DEFAULT_RECOMMENDATION_WEIGHTS;

  const merged = {};
  for (const [questionKey, optionMap] of Object.entries({ ...DEFAULT_RECOMMENDATION_WEIGHTS, ...safeSource })) {
    if (!optionMap || typeof optionMap !== 'object' || Array.isArray(optionMap)) {
      merged[questionKey] = {};
      continue;
    }

    merged[questionKey] = {};
    for (const [optionLabel, numericValue] of Object.entries(optionMap)) {
      const weight = Number(numericValue);
      merged[questionKey][optionLabel] = Number.isFinite(weight) ? weight : 0;
    }
  }

  return merged;
}

function createRecommendationConfigStore(supabase) {
  return {
    async getRecommendationWeights() {
      const { data, error } = await supabase
        .from('recommendation_config')
        .select('weights')
        .eq('id', 'default')
        .maybeSingle();

      if (error) {
        throw new Error('Failed to load recommendation weights from Supabase', { cause: error });
      }

      return sanitizeWeights(data?.weights || DEFAULT_RECOMMENDATION_WEIGHTS);
    },

    async setRecommendationWeights(nextWeights) {
      const sanitized = sanitizeWeights(nextWeights);
      const { data, error } = await supabase
        .from('recommendation_config')
        .upsert(
          { id: 'default', weights: sanitized, updated_at: new Date().toISOString() },
          { onConflict: 'id' }
        )
        .select('weights')
        .single();

      if (error) {
        throw new Error('Failed to save recommendation weights to Supabase', { cause: error });
      }

      return sanitizeWeights(data.weights);
    },
  };
}

module.exports = {
  DEFAULT_RECOMMENDATION_WEIGHTS,
  createRecommendationConfigStore,
  sanitizeWeights,
};

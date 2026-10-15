const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { DEFAULT_RECOMMENDATION_WEIGHTS, createRecommendationConfigStore } = require('./recommendationConfig');
const { getRecommendationWeights } = createRecommendationConfigStore(supabase);

function normalizeText(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function compactArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return [value];
}

function getProductSignals(product) {
  const rawSignals = [
    product?.primary_use,
    product?.category,
    product?.audience,
    product?.scenario,
    product?.tag,
    product?.tags,
    product?.attributes,
    product?.keywords,
    product?.description,
    product?.name,
  ];

  const signals = [];
  for (const raw of rawSignals) {
    if (!raw) continue;
    if (Array.isArray(raw)) {
      signals.push(...raw.map(item => String(item).trim()));
    } else if (typeof raw === 'object') {
      Object.values(raw).forEach(item => {
        signals.push(...compactArray(item).map(String));
      });
    } else {
      signals.push(String(raw).trim());
    }
  }

  return signals
    .map(normalizeText)
    .filter(Boolean)
    .filter((item, index, self) => self.indexOf(item) === index);
}

function buildManualReasons(product, answers, manualWeights) {
  const reasons = [];
  const scoreBreakdown = {};

  for (const [questionKey, answerValue] of Object.entries(answers || {})) {
    const questionWeights = manualWeights?.[questionKey] || {};
    const normalizedSelected = normalizeText(answerValue);
    if (!normalizedSelected || !Object.keys(questionWeights).length) continue;

    const matchingWeightEntries = Object.entries(questionWeights).filter(([option]) => {
      const normalizedOption = normalizeText(option);
      return normalizedOption === normalizedSelected || normalizedSelected.includes(normalizedOption) || normalizedOption.includes(normalizedSelected);
    });

    if (!matchingWeightEntries.length) continue;

    for (const [option, weight] of matchingWeightEntries) {
      const numericWeight = Number(weight) || 0;
      const productSignals = getProductSignals(product);
      const matches = productSignals.some(signal => signal.includes(normalizeText(option)) || normalizeText(option).includes(signal));
      if (!matches) continue;

      scoreBreakdown[questionKey] = (scoreBreakdown[questionKey] || 0) + numericWeight;
      reasons.push(`${questionKey}: ${option} matches ${product.name || 'this product'} (${numericWeight} pts)`);
    }
  }

  return { reasons, scoreBreakdown };
}

function computeAiScore(product, answers) {
  const productText = normalizeText([
    product?.name,
    product?.description,
    product?.category,
    product?.primary_use,
    product?.audience,
    product?.scenario,
    product?.tag,
    Array.isArray(product?.tags) ? product.tags.join(' ') : '',
    Array.isArray(product?.keywords) ? product.keywords.join(' ') : '',
  ].join(' '));

  if (!productText) return { aiScore: 0, aiReasons: [] };

  let total = 0;
  const aiReasons = [];

  for (const value of Object.values(answers || {})) {
    const answerText = normalizeText(value);
    if (!answerText) continue;

    if (productText.includes(answerText)) {
      total += 15;
      aiReasons.push(`strong match on "${value}"`);
      continue;
    }

    const tokens = answerText.split(/\s+/).filter(token => token.length > 2);
    let matchedTokens = 0;
    for (const token of tokens) {
      if (productText.includes(token)) {
        matchedTokens += 1;
      }
    }

    if (matchedTokens > 0) {
      total += matchedTokens * 3;
      aiReasons.push(`related terms match: ${matchedTokens} keyword${matchedTokens > 1 ? 's' : ''}`);
    }
  }

  return {
    aiScore: Math.min(total, 60),
    aiReasons: [...new Set(aiReasons)],
  };
}

function buildHybridRecommendation({ products = [], answers = {}, manualWeights, aiEnabled = true, maxResults = 5 }) {
  const effectiveWeights = manualWeights && Object.keys(manualWeights).length
    ? manualWeights
    : DEFAULT_RECOMMENDATION_WEIGHTS;

  if (!Array.isArray(products) || !products.length) {
    return {
      recommendedProducts: [],
      mode: 'hybrid',
      summary: 'No products provided.',
      totalProducts: 0,
    };
  }

  const scored = products.map((product) => {
    const manual = buildManualReasons(product, answers, effectiveWeights);
    const ai = aiEnabled ? computeAiScore(product, answers) : { aiScore: 0, aiReasons: [] };

    const totalScore = (manual.reasons.length ? Object.values(manual.scoreBreakdown).reduce((sum, value) => sum + value, 0) : 0) + ai.aiScore;

    return {
      ...product,
      manualScore: Object.values(manual.scoreBreakdown).reduce((sum, value) => sum + value, 0),
      aiScore: ai.aiScore,
      totalScore,
      reasons: [...manual.reasons, ...ai.aiReasons],
      breakdown: {
        manual: manual.scoreBreakdown,
        ai: ai.aiReasons,
      },
    };
  });

  const recommendedProducts = scored
    .sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0))
    .slice(0, maxResults)
    .map((product) => ({
      id: product.id,
      name: product.name,
      category: product.category,
      totalScore: product.totalScore,
      manualScore: product.manualScore,
      aiScore: product.aiScore,
      reasons: product.reasons.slice(0, 5),
    }));

  return {
    recommendedProducts,
    mode: 'hybrid',
    summary: recommendedProducts.length
      ? `Best match is ${recommendedProducts[0].name} with a score of ${recommendedProducts[0].totalScore}.`
      : 'No match found.',
    totalProducts: products.length,
  };
}

router.post('/recommendation/hybrid', async (req, res) => {
  try {
    const { products = [], answers = {}, manualWeights, aiEnabled = true, maxResults = 5 } = req.body || {};
    const weights = manualWeights || await getRecommendationWeights();
    const result = buildHybridRecommendation({ products, answers, manualWeights: weights, aiEnabled, maxResults });
    res.json(result);
  } catch (error) {
    console.error('Hybrid recommendation error:', error);
    res.status(500).json({ error: 'Failed to generate hybrid recommendation.' });
  }
});

module.exports = router;
module.exports.buildHybridRecommendation = buildHybridRecommendation;

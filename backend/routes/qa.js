// Q&A routes - handles quiz questions, answers, and kit recommendations
const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

// -------------------------------------------------------
// ENDPOINT 1: Get All Quiz Questions
// GET /api/qa/questions
// -------------------------------------------------------
router.get('/qa/questions', async (req, res) => {
  try {
    const { data: questions, error } = await supabase
      .from('qa_questions')
      .select('*')
      .order('position', { ascending: true });

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch questions' });
    }

    res.status(200).json(questions);

  } catch (error) {
    console.error('Get questions error:', error);
    res.status(500).json({ error: 'Server error fetching questions' });
  }
});

// -------------------------------------------------------
// ENDPOINT 2: Get Answers for a Specific Question
// GET /api/qa/questions/:id/answers
// -------------------------------------------------------
router.get('/qa/questions/:id/answers', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: answers, error } = await supabase
      .from('qa_answers')
      .select('id, text, result_kit_id')
      .eq('question_id', id);

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch answers' });
    }

    res.status(200).json(answers);

  } catch (error) {
    console.error('Get answers error:', error);
    res.status(500).json({ error: 'Server error fetching answers' });
  }
});

// -------------------------------------------------------
// ENDPOINT 3: Submit Quiz Answers and Get Kit Recommendation
// POST /api/qa/submit
// -------------------------------------------------------
router.post('/qa/submit', async (req, res) => {
  try {
    const { answers } = req.body;

    // answers is an object like: { "question_id_1": "answer_id_1", ... }
    if (!answers || !Object.keys(answers).length) {
      return res.status(400).json({ error: 'Answers are required' });
    }

    // Look through submitted answers to find one that directly maps to a kit
    // The last terminal answer (result_kit_id is not null) wins
    let recommendedKitId = null;

    for (const answerId of Object.values(answers)) {
      const { data: answer, error } = await supabase
        .from('qa_answers')
        .select('result_kit_id')
        .eq('id', answerId)
        .single();

      if (error) {
        return res.status(400).json({ error: `Invalid answer ID: ${answerId}` });
      }

      // If this answer points to a kit, use it
      if (answer.result_kit_id) {
        recommendedKitId = answer.result_kit_id;
      }
    }

    if (!recommendedKitId) {
      return res.status(400).json({ error: 'Could not determine a kit recommendation from these answers' });
    }

    // Fetch the recommended kit
    const { data: kit, error: kitError } = await supabase
      .from('kits')
      .select('*')
      .eq('id', recommendedKitId)
      .single();

    if (kitError || !kit) {
      return res.status(404).json({ error: 'Recommended kit not found' });
    }

    // Fetch all items in the kit
    const { data: kitItems, error: itemsError } = await supabase
      .from('kit_items')
      .select('quantity, products(id, name, price_cents, weight_grams)')
      .eq('kit_id', recommendedKitId);

    if (itemsError) {
      return res.status(500).json({ error: 'Failed to fetch kit items' });
    }

    const items = kitItems.map(item => ({
      product_id: item.products.id,
      name: item.products.name,
      quantity: item.quantity,
      price_cents: item.products.price_cents
    }));

    const total_price_cents = items.reduce(
      (sum, item) => sum + item.price_cents * item.quantity, 0
    );

    console.log(`Quiz submitted - recommending kit: ${kit.name}`);

    res.status(200).json({
      recommended_kit: {
        id: kit.id,
        name: kit.name,
        description: kit.description,
        items,
        total_price_cents
      },
      can_customize: true
    });

  } catch (error) {
    console.error('Submit quiz error:', error);
    res.status(500).json({ error: 'Server error processing quiz' });
  }
});

module.exports = router;

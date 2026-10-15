// Q&A routes - handles quiz questions, answers, and kit recommendations
const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const requireAdmin = require('../middleware/requireAdmin');
const { buildHybridRecommendation } = require('./hybridRecommendation');
const { createRecommendationConfigStore } = require('./recommendationConfig');
const { getRecommendationWeights } = createRecommendationConfigStore(supabase);

// Count persons in groupComposition matching a pack's gender/age.
function countMatchingPersons(groupComposition, packGender, packAge) {
  return groupComposition.filter(p => {
    const ageMatch = packAge === 'child' ? p.kind === 'child' : p.kind === 'adult';
    const genderMatch = !packGender || (p.gender || '').toLowerCase() === packGender.toLowerCase();
    return ageMatch && genderMatch;
  }).length;
}

function normalizeMatchText(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildQuizQuery(questions = [], answers = []) {
  const questionText = (questions || [])
    .map(q => q?.text || q?.question || '')
    .filter(Boolean)
    .join(' ');

  const answerText = (answers || [])
    .map(a => a?.text || a?.answer || '')
    .filter(Boolean)
    .join(' ');

  return normalizeMatchText([questionText, answerText].join(' '));
}

function rankMatches(rows, query) {
  const needle = normalizeMatchText(query);
  if (!needle) return [];

  return rows
    .map((row) => {
      const haystack = normalizeMatchText([
        row?.name,
        row?.title,
        row?.label,
        row?.description,
        row?.tag,
        row?.collection_name,
        row?.text,
        row?.summary,
        row?.keyword,
      ].join(' '));

      if (!haystack) return { ...row, _relevanceScore: 0 };

      let score = 0;
      if (haystack.includes(needle)) score += 40;

      const tokens = needle.split(/\s+/).filter(Boolean).filter(token => token.length > 1);
      for (const token of tokens) {
        if (haystack.includes(token)) score += 12;
        if (haystack.split(/\s+/).some(word => word.startsWith(token))) score += 8;
      }

      return { ...row, _relevanceScore: score };
    })
    .filter((row) => row._relevanceScore > 0)
    .sort((a, b) => {
      if (b._relevanceScore !== a._relevanceScore) return b._relevanceScore - a._relevanceScore;
      const aLabel = String(a?.name || a?.title || a?.label || '');
      const bLabel = String(b?.name || b?.title || b?.label || '');
      return aLabel.localeCompare(bLabel);
    })
    .map(({ _relevanceScore, ...rest }) => rest);
}

function buildHybridKitRecommendation({ kits = [], answers = {}, manualWeights = {}, aiEnabled = true, maxResults = 1 } = {}) {
  if (!Array.isArray(kits) || !kits.length) {
    return {
      recommendedKitId: null,
      recommendedProducts: [],
      totalScore: 0,
      reasons: [],
      summary: 'No kits provided.',
      mode: 'hybrid',
    };
  }

  const products = kits.map((kit) => ({
    id: kit.id,
    name: kit.name,
    description: kit.description || '',
    category: kit.category || '',
    primary_use: kit.primary_use || kit.tag || '',
    audience: kit.audience || '',
    scenario: kit.scenario || '',
    tag: kit.tag || '',
    tags: Array.isArray(kit.tags) ? kit.tags : (kit.tag ? [kit.tag] : []),
    keywords: Array.isArray(kit.keywords) ? kit.keywords : [],
  }));

  const result = buildHybridRecommendation({
    products,
    answers,
    manualWeights,
    aiEnabled,
    maxResults,
  });

  const top = result.recommendedProducts[0] || null;

  return {
    recommendedKitId: top?.id || null,
    recommendedProducts: result.recommendedProducts,
    totalScore: top?.totalScore || 0,
    reasons: top?.reasons || [],
    summary: result.summary,
    mode: result.mode,
  };
}

// Recursively resolves all items in a kit into a flat list, respecting person-slot
// filtering based on groupComposition. Inserts subkit_header items as section labels.
async function flattenKitItems(kitId, groupComposition = [], depth = 0) {
  if (depth > 3) return [];

  const { data: rows, error } = await supabase
    .from('kit_items')
    .select('quantity, product_id, sub_kit_id, selected_variants, is_person_slot, products(id, name, price_cents)')
    .eq('kit_id', kitId);

  if (error || !rows) return [];

  const items = [];
  for (const row of rows) {
    if (row.product_id && row.products) {
      items.push({
        type: 'product',
        product_id: row.products.id,
        name: row.products.name,
        quantity: row.quantity,
        price_cents: row.products.price_cents,
        selected_variants: row.selected_variants || null,
      });
    } else if (row.sub_kit_id) {
      const { data: subKit } = await supabase
        .from('kits')
        .select('name, person_pack_gender, person_pack_age')
        .eq('id', row.sub_kit_id)
        .single();

      // For person-slot sub-kits, count matching persons; skip if none match
      let copies = row.quantity;
      if ((row.is_person_slot || (subKit && (subKit.person_pack_gender || subKit.person_pack_age))) && subKit) {
        copies = countMatchingPersons(groupComposition, subKit.person_pack_gender, subKit.person_pack_age) * row.quantity;
      }
      if (copies <= 0) continue;

      const subItems = await flattenKitItems(row.sub_kit_id, groupComposition, depth + 1);
      if (subItems.length > 0) {
        items.push({ type: 'subkit_header', sub_kit_id: row.sub_kit_id, name: subKit?.name || 'Sub-kit' });
        for (const si of subItems) {
          items.push({ ...si, quantity: si.quantity * copies });
        }
      }
    }
  }
  return items;
}

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
// ENDPOINT 2: Get Start Question (for branching quiz)
// GET /api/qa/start
// Returns the question marked is_start=true with its answers
// -------------------------------------------------------
router.get('/qa/start', async (req, res) => {
  try {
    const { data: question, error: qError } = await supabase
      .from('qa_questions')
      .select('*')
      .eq('is_start', true)
      .single();

    if (qError || !question) {
      return res.status(404).json({ error: 'No start question configured. Set a start question in the admin quiz editor.' });
    }

    const { data: answers, error: aError } = await supabase
      .from('qa_answers')
      .select('id, text, description, result_kit_id, next_question_id, result_contact')
      .eq('question_id', question.id);

    if (aError) {
      return res.status(500).json({ error: 'Failed to fetch answers' });
    }

    res.status(200).json({ ...question, answers: answers || [] });

  } catch (error) {
    console.error('Get start question error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// -------------------------------------------------------
// ENDPOINT 3: Get a Single Question with its Answers
// GET /api/qa/questions/:id
// Used by the frontend to fetch the next question in the tree
// -------------------------------------------------------
router.get('/qa/questions/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: question, error: qError } = await supabase
      .from('qa_questions')
      .select('*')
      .eq('id', id)
      .single();

    if (qError || !question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    const { data: answers, error: aError } = await supabase
      .from('qa_answers')
      .select('id, text, description, result_kit_id, next_question_id, result_contact')
      .eq('question_id', id);

    if (aError) {
      return res.status(500).json({ error: 'Failed to fetch answers' });
    }

    res.status(200).json({ ...question, answers: answers || [] });

  } catch (error) {
    console.error('Get question error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// -------------------------------------------------------
// ENDPOINT 4: Get Answers for a Specific Question
// GET /api/qa/questions/:id/answers
// -------------------------------------------------------
router.get('/qa/questions/:id/answers', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: answers, error } = await supabase
      .from('qa_answers')
      .select('id, text, description, result_kit_id, next_question_id')
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
// ENDPOINT 5: Submit Quiz Answers and Get Kit Recommendation
// POST /api/qa/submit
// Body: { answers: { questionId: answerId, ... } }
// -------------------------------------------------------
router.post('/qa/submit', async (req, res) => {
  try {
    const { answers } = req.body;

    if (!answers || !Object.keys(answers).length) {
      return res.status(400).json({ error: 'Answers are required' });
    }

    let recommendedKitId = null;
    const answeredQuestionText = [];
    const answeredOptionText = [];
    const groupData = { adults: null, children: null, adult_gender: null };

    // Fetch all answers including group_action, find terminal kit
    for (const answerId of Object.values(answers)) {
      const { data: answer, error } = await supabase
        .from('qa_answers')
        .select('result_kit_id, group_action, text, question_id')
        .eq('id', answerId)
        .single();

      if (error) {
        return res.status(400).json({ error: `Invalid answer ID: ${answerId}` });
      }

      if (answer.text) answeredOptionText.push(answer.text);

      if (answer.question_id) {
        const { data: questionData, error: questionError } = await supabase
          .from('qa_questions')
          .select('text')
          .eq('id', answer.question_id)
          .single();

        if (!questionError && questionData?.text) answeredQuestionText.push(questionData.text);
      }

      // Merge group_action fields (last non-null value wins per field)
      if (answer.group_action) {
        if (answer.group_action.adults != null) groupData.adults = answer.group_action.adults;
        if (answer.group_action.children != null) groupData.children = answer.group_action.children;
        if (answer.group_action.adult_gender != null) groupData.adult_gender = answer.group_action.adult_gender;
      }

      if (answer.result_kit_id) {
        recommendedKitId = answer.result_kit_id;
        break;
      }
    }

    if (!recommendedKitId) {
      const { data: kits, error: kitsError } = await supabase
        .from('kits')
        .select('id, name, description, tag, category, primary_use, audience, scenario, tags, keywords');

      if (kitsError || !kits || !kits.length) {
        return res.status(400).json({ error: 'Could not determine a kit recommendation from these answers' });
      }

      const hybridAnswers = {};
      for (const [questionId, answerId] of Object.entries(answers)) {
        const { data: answer, error: answerError } = await supabase
          .from('qa_answers')
          .select('text, question_id')
          .eq('id', answerId)
          .single();

        if (answerError || !answer) continue;

        const { data: question, error: questionError } = await supabase
          .from('qa_questions')
          .select('text, code')
          .eq('id', answer.question_id)
          .single();

        if (!questionError && question) {
          const questionKey = question.code || `question_${questionId}`;
          hybridAnswers[questionKey] = answer.text;
        }

        hybridAnswers[`question_${questionId}`] = answer.text;
      }

      const hybridResult = buildHybridKitRecommendation({
        kits,
        answers: hybridAnswers,
        manualWeights: await getRecommendationWeights(),
        aiEnabled: true,
        maxResults: 1,
      });

      if (!hybridResult.recommendedKitId) {
        const queryString = buildQuizQuery(answeredQuestionText, answeredOptionText);
        const rankedKits = rankMatches(kits, queryString);

        if (!rankedKits.length) {
          return res.status(400).json({ error: 'Could not determine a kit recommendation from these answers' });
        }

        recommendedKitId = rankedKits[0].id;
      } else {
        recommendedKitId = hybridResult.recommendedKitId;
      }
    }

    // Build group_composition array
    const group_composition = [];
    const adultCount = groupData.adults || 1;
    for (let i = 0; i < adultCount; i++) {
      const gender = groupData.adult_gender || (adultCount === 2 ? (i === 0 ? 'male' : 'female') : 'male');
      group_composition.push({ kind: 'adult', gender });
    }
    const childCount = groupData.children || 0;
    for (let i = 0; i < childCount; i++) {
      group_composition.push({ kind: 'child', gender: null });
    }

    const { data: kit, error: kitError } = await supabase
      .from('kits')
      .select('*')
      .eq('id', recommendedKitId)
      .single();

    if (kitError || !kit) {
      return res.status(404).json({ error: 'Recommended kit not found' });
    }

    const items = await flattenKitItems(recommendedKitId, group_composition);

    if (!items.filter(i => i.type !== 'subkit_header').length) {
      return res.status(500).json({ error: 'Failed to fetch kit items' });
    }

    const total_price_cents = items
      .filter(i => i.type !== 'subkit_header')
      .reduce((sum, item) => sum + item.price_cents * item.quantity, 0);

    console.log(`Quiz submitted - recommending kit: ${kit.name}, group: ${JSON.stringify(group_composition)}`);

    res.status(200).json({
      recommended_kit: {
        id: kit.id,
        name: kit.name,
        description: kit.description,
        items,
        total_price_cents
      },
      can_customize: true,
      group_composition,
    });

  } catch (error) {
    console.error('Submit quiz error:', error);
    res.status(500).json({ error: 'Server error processing quiz' });
  }
});

// =====================================================
// ADMIN QUIZ MANAGEMENT ROUTES (require admin token)
// =====================================================

// -------------------------------------------------------
// ADMIN: Get full quiz with all questions and their answers
// GET /api/admin/quiz
// -------------------------------------------------------
router.get('/admin/quiz', requireAdmin, async (req, res) => {
  try {
    const { data: questions, error: qError } = await supabase
      .from('qa_questions')
      .select('*')
      .order('position', { ascending: true });

    if (qError) return res.status(500).json({ error: 'Failed to fetch questions' });

    // Fetch all answers in one query (include next_question_id + description)
    const { data: answers, error: aError } = await supabase
      .from('qa_answers')
      .select('id, text, description, result_kit_id, next_question_id, question_id, group_action, result_contact');

    if (aError) return res.status(500).json({ error: 'Failed to fetch answers' });

    // Attach answers to their questions
    const result = questions.map(q => ({
      ...q,
      answers: answers.filter(a => a.question_id === q.id)
    }));

    res.json(result);

  } catch (error) {
    console.error('Admin get quiz error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// -------------------------------------------------------
// ADMIN: Create a question
// POST /api/admin/quiz/questions
// Body: { text, position, is_start }
// -------------------------------------------------------
router.post('/admin/quiz/questions', requireAdmin, async (req, res) => {
  try {
    const { text, position, is_start, path_id, code } = req.body;
    if (!text) return res.status(400).json({ error: 'Question text is required' });

    // If marking as start, clear any existing start question first
    if (is_start) {
      await supabase.from('qa_questions').update({ is_start: false }).eq('is_start', true);
    }

    const { data, error } = await supabase
      .from('qa_questions')
      .insert([{ text, position: position || 1, is_start: is_start || false, path_id: path_id || null, code: code || null }])
      .select();

    if (error) return res.status(500).json({ error: 'Failed to create question' });
    res.status(201).json(data[0]);

  } catch (error) {
    console.error('Admin create question error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// -------------------------------------------------------
// ADMIN: Update a question
// PUT /api/admin/quiz/questions/:id
// Body: { text, position, is_start }
// -------------------------------------------------------
router.put('/admin/quiz/questions/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { text, position, is_start, path_id, code } = req.body;

    // If marking as start, clear any existing start question first
    if (is_start) {
      await supabase.from('qa_questions').update({ is_start: false }).neq('id', id);
    }

    const updateData = {};
    if (text !== undefined) updateData.text = text;
    if (position !== undefined) updateData.position = position;
    if (is_start !== undefined) updateData.is_start = is_start;
    if (path_id !== undefined) updateData.path_id = path_id || null;
    if (code !== undefined) updateData.code = code || null;

    const { data, error } = await supabase
      .from('qa_questions')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error || !data.length) return res.status(404).json({ error: 'Question not found' });
    res.json(data[0]);

  } catch (error) {
    console.error('Admin update question error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// -------------------------------------------------------
// ADMIN: Delete a question (cascades to its answers via DB)
// DELETE /api/admin/quiz/questions/:id
// -------------------------------------------------------
router.delete('/admin/quiz/questions/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Delete answers first to avoid FK constraint issues
    await supabase.from('qa_answers').delete().eq('question_id', id);

    const { error } = await supabase
      .from('qa_questions')
      .delete()
      .eq('id', id);

    if (error) return res.status(500).json({ error: 'Failed to delete question' });
    res.json({ message: 'Question deleted' });

  } catch (error) {
    console.error('Admin delete question error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// -------------------------------------------------------
// ADMIN: Create an answer for a question
// POST /api/admin/quiz/questions/:id/answers
// Body: { text, result_kit_id, next_question_id }
// -------------------------------------------------------
router.post('/admin/quiz/questions/:id/answers', requireAdmin, async (req, res) => {
  try {
    const { id: question_id } = req.params;
    const { text, result_kit_id, next_question_id, description, group_action, result_contact } = req.body;

    if (!text) return res.status(400).json({ error: 'Answer text is required' });

    const { data, error } = await supabase
      .from('qa_answers')
      .insert([{
        text,
        question_id,
        description: description || null,
        result_kit_id: result_kit_id || null,
        next_question_id: next_question_id || null,
        group_action: group_action || null,
        result_contact: result_contact || false,
      }])
      .select();

    if (error) return res.status(500).json({ error: 'Failed to create answer' });
    res.status(201).json(data[0]);

  } catch (error) {
    console.error('Admin create answer error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// -------------------------------------------------------
// ADMIN: Update an answer
// PUT /api/admin/quiz/answers/:id
// Body: { text, result_kit_id, next_question_id }
// -------------------------------------------------------
router.put('/admin/quiz/answers/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { text, result_kit_id, next_question_id, description, group_action, result_contact } = req.body;

    const { data, error } = await supabase
      .from('qa_answers')
      .update({
        text,
        description: description || null,
        result_kit_id: result_kit_id || null,
        next_question_id: next_question_id || null,
        group_action: group_action || null,
        result_contact: result_contact || false,
      })
      .eq('id', id)
      .select();

    if (error || !data.length) return res.status(404).json({ error: 'Answer not found' });
    res.json(data[0]);

  } catch (error) {
    console.error('Admin update answer error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// -------------------------------------------------------
// ADMIN: Delete an answer
// DELETE /api/admin/quiz/answers/:id
// -------------------------------------------------------
router.delete('/admin/quiz/answers/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('qa_answers')
      .delete()
      .eq('id', id);

    if (error) return res.status(500).json({ error: 'Failed to delete answer' });
    res.json({ message: 'Answer deleted' });

  } catch (error) {
    console.error('Admin delete answer error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// =====================================================
// ADMIN QUIZ PATH ROUTES
// =====================================================

// GET /api/admin/quiz/paths
router.get('/admin/quiz/paths', requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('quiz_paths')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) return res.status(500).json({ error: 'Failed to fetch paths' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/admin/quiz/paths
router.post('/admin/quiz/paths', requireAdmin, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Path name is required' });
    const { data, error } = await supabase
      .from('quiz_paths')
      .insert([{ name: name.trim() }])
      .select();
    if (error) return res.status(500).json({ error: 'Failed to create path' });
    res.status(201).json(data[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/admin/quiz/paths/:id
router.put('/admin/quiz/paths/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Path name is required' });
    const { data, error } = await supabase
      .from('quiz_paths')
      .update({ name: name.trim() })
      .eq('id', id)
      .select();
    if (error || !data.length) return res.status(404).json({ error: 'Path not found' });
    res.json(data[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/admin/quiz/paths/:id
router.delete('/admin/quiz/paths/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    // Unassign questions from this path before deleting
    await supabase.from('qa_questions').update({ path_id: null }).eq('path_id', id);
    const { error } = await supabase.from('quiz_paths').delete().eq('id', id);
    if (error) return res.status(500).json({ error: 'Failed to delete path' });
    res.json({ message: 'Path deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
module.exports.rankMatches = rankMatches;
module.exports.buildQuizQuery = buildQuizQuery;
module.exports.buildHybridKitRecommendation = buildHybridKitRecommendation;

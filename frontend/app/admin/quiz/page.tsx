// @ts-nocheck
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getAdminToken, getKits,
  adminGetQuiz,
  adminCreateQuestion, adminUpdateQuestion, adminDeleteQuestion,
  adminCreateAnswer, adminUpdateAnswer, adminDeleteAnswer,
  adminGetPaths, adminCreatePath, adminUpdatePath, adminDeletePath,
} from '../../../lib/api';

export default function AdminQuizPage({ embedded = false }) {
  const router = useRouter();
  const [questions, setQuestions] = useState<any[]>([]);
  const [kits, setKits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Expanded question IDs
  const [expanded, setExpanded] = useState({});

  // Drag-to-reorder state (visual only — not persisted)
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  // Answer drag-to-reorder state
  const [answerDraggingId, setAnswerDraggingId] = useState<string | null>(null);
  const [answerDraggingQId, setAnswerDraggingQId] = useState<string | null>(null);
  const [answerDragOverId, setAnswerDragOverId] = useState<string | null>(null);

  // Path state
  const [paths, setPaths] = useState<any[]>([]);
  const [activePath, setActivePath] = useState<string | null>(null);
  const [hiddenPaths, setHiddenPaths] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('hiddenQuizPaths') || '[]'); } catch { return []; }
  });
  const [creatingPath, setCreatingPath] = useState(false);
  const [newPathName, setNewPathName] = useState('');
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // Question editing state
  const [editingQuestion, setEditingQuestion] = useState(null); // null=none, 'new', or id
  const [questionForm, setQuestionForm] = useState({ text: '', code: '', path_id: null });
  const [questionSaving, setQuestionSaving] = useState(false);
  const [questionError, setQuestionError] = useState('');

  // Answer editing state
  const [editingAnswer, setEditingAnswer] = useState(null); // { questionId, answerId }
  // answerMode: 'next' = routes to another question, 'terminal' = ends quiz with kit
  const [answerForm, setAnswerForm] = useState({ text: '', description: '', answerMode: 'next', next_question_id: '', result_kit_id: '', ga_adults: '', ga_children: '', ga_gender: '', result_contact: false });
  const [answerSaving, setAnswerSaving] = useState(false);
  const [answerError, setAnswerError] = useState('');

  useEffect(() => {
    if (!getAdminToken()) {
      if (!embedded) router.push('/admin');
      return;
    }
    loadData();
  }, [router, embedded]);

  async function loadData() {
    try {
      const [quizData, kitsData] = await Promise.all([adminGetQuiz(), getKits()]);
      // Restore saved visual order from localStorage
      try {
        const savedOrder = JSON.parse(localStorage.getItem('quizQuestionOrder') || 'null');
        if (savedOrder) {
          quizData.sort((a, b) => {
            const ai = savedOrder.indexOf(a.id);
            const bi = savedOrder.indexOf(b.id);
            if (ai === -1 && bi === -1) return 0;
            if (ai === -1) return 1;
            if (bi === -1) return -1;
            return ai - bi;
          });
        }
      } catch {}
      // Restore saved answer order per question
      try {
        const savedAnswerOrder = JSON.parse(localStorage.getItem('quizAnswerOrder') || '{}');
        quizData.forEach(q => {
          const order = savedAnswerOrder[q.id];
          if (order && q.answers) {
            q.answers.sort((a, b) => {
              const ai = order.indexOf(a.id), bi = order.indexOf(b.id);
              if (ai === -1 && bi === -1) return 0;
              if (ai === -1) return 1;
              if (bi === -1) return -1;
              return ai - bi;
            });
          }
        });
      } catch {}
      setQuestions(quizData);
      setKits(kitsData);
    } catch {
      setError('Failed to load quiz data.');
    } finally {
      setLoading(false);
    }
    // Load paths separately — fails gracefully if the quiz_paths table doesn't exist yet
    try {
      const pathsData = await adminGetPaths();
      setPaths(pathsData);
    } catch {
      // Table not created yet — paths feature will be hidden until migration is run
    }
  }

  function toggleExpand(id) {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  }

  // ---- Drag to reorder ----

  function handleDragStart(e, id) {
    setDraggingId(id);
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragOver(e, id) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (id !== draggingId) setDragOverId(id);
  }

  function handleDrop(e, targetId) {
    e.preventDefault();
    if (!draggingId || draggingId === targetId) { setDraggingId(null); setDragOverId(null); return; }
    setQuestions(prev => {
      const result = [...prev];
      const fromIdx = result.findIndex(q => q.id === draggingId);
      const toIdx = result.findIndex(q => q.id === targetId);
      const [moved] = result.splice(fromIdx, 1);
      result.splice(toIdx, 0, moved);
      localStorage.setItem('quizQuestionOrder', JSON.stringify(result.map(q => q.id)));
      return result;
    });
    setDraggingId(null);
    setDragOverId(null);
  }

  function handleDragEnd() {
    setDraggingId(null);
    setDragOverId(null);
  }

  // ---- Answer drag to reorder ----

  function handleAnswerDragStart(e, qId, answerId) {
    setAnswerDraggingId(answerId);
    setAnswerDraggingQId(qId);
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleAnswerDragOver(e, qId, answerId) {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    if (qId === answerDraggingQId && answerId !== answerDraggingId) setAnswerDragOverId(answerId);
  }

  function handleAnswerDrop(e, qId, targetAnswerId) {
    e.preventDefault();
    e.stopPropagation();
    if (!answerDraggingId || answerDraggingId === targetAnswerId || qId !== answerDraggingQId) {
      setAnswerDraggingId(null); setAnswerDragOverId(null); setAnswerDraggingQId(null);
      return;
    }
    setQuestions(prev => prev.map(q => {
      if (q.id !== qId) return q;
      const answers = [...q.answers];
      const fromIdx = answers.findIndex(a => a.id === answerDraggingId);
      const toIdx = answers.findIndex(a => a.id === targetAnswerId);
      const [moved] = answers.splice(fromIdx, 1);
      answers.splice(toIdx, 0, moved);
      try {
        const stored = JSON.parse(localStorage.getItem('quizAnswerOrder') || '{}');
        stored[qId] = answers.map(a => a.id);
        localStorage.setItem('quizAnswerOrder', JSON.stringify(stored));
      } catch {}
      return { ...q, answers };
    }));
    setAnswerDraggingId(null); setAnswerDragOverId(null); setAnswerDraggingQId(null);
  }

  function handleAnswerDragEnd() {
    setAnswerDraggingId(null); setAnswerDragOverId(null); setAnswerDraggingQId(null);
  }

  // ---- Question actions ----

  function generateCode() {
    const existing = new Set(questions.map(q => q.code).filter(Boolean));
    let i = 1;
    while (existing.has(`Q${i}`)) i++;
    return `Q${i}`;
  }

  function startNewQuestion() {
    setQuestionForm({ text: '', code: generateCode(), path_id: activePath || null });
    setEditingQuestion('new');
    setQuestionError('');
  }

  function startEditQuestion(q) {
    setQuestionForm({ text: q.text, code: q.code || '', path_id: q.path_id || null });
    setEditingQuestion(q.id);
    setQuestionError('');
  }

  function cancelQuestion() {
    setEditingQuestion(null);
    setQuestionForm({ text: '', code: '', path_id: null });
    setQuestionError('');
  }

  async function saveQuestion(e) {
    e.preventDefault();
    if (!questionForm.text.trim()) { setQuestionError('Question text is required.'); return; }
    setQuestionSaving(true);
    setQuestionError('');
    try {
      const payload = { text: questionForm.text.trim(), code: questionForm.code.trim() || null, path_id: questionForm.path_id || null };
      if (editingQuestion === 'new') {
        const created = await adminCreateQuestion(payload);
        setQuestions(prev => [...prev, { ...created, answers: [] }]);
      } else {
        const updated = await adminUpdateQuestion(editingQuestion, payload);
        setQuestions(prev => prev.map(q => q.id === editingQuestion ? { ...q, ...updated } : q));
      }
      cancelQuestion();
    } catch (err) {
      setQuestionError(err.message || 'Failed to save question.');
    } finally {
      setQuestionSaving(false);
    }
  }

  async function setStartQuestion(questionId) {
    try {
      const updated = await adminUpdateQuestion(questionId, { is_start: true });
      // Clear is_start on all others locally, set it on this one
      setQuestions(prev => prev.map(q =>
        q.id === questionId
          ? { ...q, is_start: true }
          : { ...q, is_start: false }
      ));
    } catch (err) {
      setError(err.message || 'Failed to set start question.');
    }
  }

  async function deleteQuestion(q) {
    if (!confirm(`Delete question "${q.text}"? All its answers will also be deleted.`)) return;
    try {
      await adminDeleteQuestion(q.id);
      setQuestions(prev => prev.filter(x => x.id !== q.id));
    } catch (err) {
      setError(err.message || 'Failed to delete question.');
    }
  }

  // ---- Answer form helpers ----

  function buildAnswerFormFromAnswer(answer) {
    const ga = answer.group_action || {};
    const base = {
      text: answer.text,
      description: answer.description || '',
      ga_adults: ga.adults != null ? String(ga.adults) : '',
      ga_children: ga.children != null ? String(ga.children) : '',
      ga_gender: ga.adult_gender || '',
      result_contact: false,
    };
    if (answer.result_contact) {
      return { ...base, answerMode: 'contact', next_question_id: '', result_kit_id: '', result_contact: true };
    } else if (answer.next_question_id) {
      return { ...base, answerMode: 'next', next_question_id: answer.next_question_id, result_kit_id: '' };
    } else {
      return { ...base, answerMode: 'terminal', next_question_id: '', result_kit_id: answer.result_kit_id || '' };
    }
  }

  function startNewAnswer(questionId) {
    setAnswerForm({ text: '', description: '', answerMode: 'next', next_question_id: '', result_kit_id: '', ga_adults: '', ga_children: '', ga_gender: '', result_contact: false });
    setEditingAnswer({ questionId, answerId: 'new' });
    setAnswerError('');
    setExpanded(prev => ({ ...prev, [questionId]: true }));
  }

  function startEditAnswer(questionId, answer) {
    setAnswerForm(buildAnswerFormFromAnswer(answer));
    setEditingAnswer({ questionId, answerId: answer.id });
    setAnswerError('');
  }

  function cancelAnswer() {
    setEditingAnswer(null);
    setAnswerForm({ text: '', description: '', answerMode: 'next', next_question_id: '', result_kit_id: '', ga_adults: '', ga_children: '', ga_gender: '', result_contact: false });
    setAnswerError('');
  }

  async function saveAnswer(e) {
    e.preventDefault();
    if (!answerForm.text.trim()) { setAnswerError('Answer text is required.'); return; }
    if (answerForm.answerMode === 'next' && !answerForm.next_question_id) {
      setAnswerError('Select a next question, or switch to "End Quiz" mode.'); return;
    }
    if (answerForm.answerMode === 'terminal' && !answerForm.result_kit_id) {
      setAnswerError('Select a kit to recommend when the quiz ends here.'); return;
    }
    // 'contact' mode needs no extra validation
    setAnswerSaving(true);
    setAnswerError('');
    try {
      const ga = {};
      if (answerForm.ga_adults !== '') ga.adults = parseInt(answerForm.ga_adults) || 0;
      if (answerForm.ga_children !== '') ga.children = parseInt(answerForm.ga_children) || 0;
      if (answerForm.ga_gender) ga.adult_gender = answerForm.ga_gender;

      const payload = {
        text: answerForm.text.trim(),
        description: answerForm.description.trim() || null,
        next_question_id: answerForm.answerMode === 'next' ? answerForm.next_question_id : null,
        result_kit_id: answerForm.answerMode === 'terminal' ? answerForm.result_kit_id : null,
        result_contact: answerForm.answerMode === 'contact',
        group_action: Object.keys(ga).length > 0 ? ga : null,
      };
      const { questionId, answerId } = editingAnswer;

      if (answerId === 'new') {
        const created = await adminCreateAnswer(questionId, payload);
        setQuestions(prev => prev.map(q =>
          q.id === questionId ? { ...q, answers: [...(q.answers || []), created] } : q
        ));
      } else {
        const updated = await adminUpdateAnswer(answerId, payload);
        setQuestions(prev => prev.map(q =>
          q.id === questionId
            ? { ...q, answers: q.answers.map(a => a.id === answerId ? updated : a) }
            : q
        ));
      }
      cancelAnswer();
    } catch (err) {
      setAnswerError(err.message || 'Failed to save answer.');
    } finally {
      setAnswerSaving(false);
    }
  }

  async function deleteAnswer(questionId, answer) {
    if (!confirm(`Delete answer "${answer.text}"?`)) return;
    try {
      await adminDeleteAnswer(answer.id);
      setQuestions(prev => prev.map(q =>
        q.id === questionId ? { ...q, answers: q.answers.filter(a => a.id !== answer.id) } : q
      ));
    } catch (err) {
      setError(err.message || 'Failed to delete answer.');
    }
  }

  // ---- Path actions ----

  async function handleCreatePath(e) {
    e.preventDefault();
    if (!newPathName.trim()) return;
    try {
      const created = await adminCreatePath({ name: newPathName.trim() });
      setPaths(prev => [...prev, created]);
      setNewPathName('');
      setCreatingPath(false);
    } catch (err) {
      setError(err.message || 'Failed to create path.');
    }
  }

  async function handleRenameSubmit(e) {
    e.preventDefault();
    if (!renameValue.trim() || !renamingPath) return;
    try {
      const updated = await adminUpdatePath(renamingPath, { name: renameValue.trim() });
      setPaths(prev => prev.map(p => p.id === renamingPath ? updated : p));
      setRenamingPath(null);
      setRenameValue('');
    } catch (err) {
      setError(err.message || 'Failed to rename path.');
    }
  }

  async function handleDeletePath(pathId) {
    if (!confirm('Delete this path? Questions in this path will be unassigned but not deleted.')) return;
    try {
      await adminDeletePath(pathId);
      setPaths(prev => prev.filter(p => p.id !== pathId));
      setQuestions(prev => prev.map(q => q.path_id === pathId ? { ...q, path_id: null } : q));
      if (activePath === pathId) setActivePath(null);
    } catch (err) {
      setError(err.message || 'Failed to delete path.');
    }
  }

  function toggleHidePath(pathId: string) {
    setHiddenPaths(prev => {
      const next = prev.includes(pathId) ? prev.filter(id => id !== pathId) : [...prev, pathId];
      localStorage.setItem('hiddenQuizPaths', JSON.stringify(next));
      return next;
    });
  }

  if (loading) {
    return (
      <div className={embedded ? 'w-full rounded border border-stone-800 bg-stone-900/80 p-6' : 'min-h-screen bg-stone-950 text-white flex items-center justify-center'}>
        <p className="label-tactical text-stone-500 tracking-widest">Loading quiz data...</p>
      </div>
    );
  }

  const editorContent = (
    <div className={embedded ? 'w-full' : 'max-w-3xl mx-auto px-6 py-12'}>
      <div className="flex items-end justify-between mb-4">
        <div>
          <p className="label-tactical text-orange-500 mb-2 tracking-[0.2em]">// Assessment Config</p>
          <h1 className="text-3xl font-extrabold uppercase tracking-wide">Edit Questionnaire</h1>
        </div>
        <button
          onClick={startNewQuestion}
          className="bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold uppercase tracking-widest px-6 py-3 rounded transition-colors"
        >
          + Add Question
        </button>
      </div>

      <div className="bg-stone-900/60 border border-stone-800 rounded p-4 mb-6 text-sm text-stone-400 leading-relaxed">
        <p className="label-tactical text-orange-500/70 mb-2">// How branching works</p>
        <p>Each answer can route to a <span className="text-stone-200">Next Question</span> (branching) or <span className="text-stone-200">End the quiz</span> with a kit recommendation (terminal). Mark one question as the <span className="text-orange-400">Start</span> — that's where the quiz begins.</p>
      </div>

      <div className="flex items-center gap-2 flex-wrap mb-6 pb-5 border-b border-stone-800">
        <span className="label-tactical text-stone-600 mr-1" style={{ fontSize: '0.6rem' }}>PATHS</span>
        <button
          onClick={() => setActivePath(null)}
          className={`px-3 py-1.5 rounded text-xs font-bold uppercase tracking-widest border transition-all ${activePath === null ? 'border-orange-500 bg-orange-500/10 text-orange-400' : 'border-stone-700 text-stone-500 hover:border-stone-500 hover:text-white'}`}
        >
          All
        </button>
        {paths.map(path => (
          <div key={path.id} className="flex items-center gap-1">
            {renamingPath === path.id ? (
              <form onSubmit={handleRenameSubmit} className="flex items-center gap-1">
                <input
                  autoFocus
                  value={renameValue}
                  onChange={e => setRenameValue(e.target.value)}
                  className="bg-stone-800 border border-orange-500/50 rounded px-2 py-1 text-white text-xs focus:outline-none w-28"
                />
                <button type="submit" className="label-tactical text-orange-400 hover:text-orange-300 text-xs px-1">✓</button>
                <button type="button" onClick={() => setRenamingPath(null)} className="label-tactical text-stone-600 hover:text-white text-xs px-1">✕</button>
              </form>
            ) : (
              <>
                <button
                  onClick={() => setActivePath(path.id)}
                  className={`px-3 py-1.5 rounded text-xs font-bold uppercase tracking-widest border transition-all ${
                    hiddenPaths.includes(path.id) ? 'opacity-40 border-stone-800 text-stone-600' :
                    activePath === path.id ? 'border-orange-500 bg-orange-500/10 text-orange-400' : 'border-stone-700 text-stone-500 hover:border-stone-500 hover:text-white'
                  }`}
                >
                  {path.name}
                </button>
                <button
                  onClick={() => toggleHidePath(path.id)}
                  className="label-tactical text-stone-700 hover:text-stone-400 transition-colors text-xs"
                  title={hiddenPaths.includes(path.id) ? 'Show path' : 'Hide path from All view'}
                >
                  {hiddenPaths.includes(path.id) ? '🙈' : '👁'}
                </button>
                <button
                  onClick={() => { setRenamingPath(path.id); setRenameValue(path.name); }}
                  className="label-tactical text-stone-700 hover:text-stone-400 transition-colors text-xs"
                  title="Rename path"
                >
                  ✏
                </button>
                <button
                  onClick={() => handleDeletePath(path.id)}
                  className="label-tactical text-stone-700 hover:text-red-400 transition-colors text-xs"
                  title="Delete path"
                >
                  ✕
                </button>
              </>
            )}
          </div>
        ))}

        {creatingPath ? (
          <form onSubmit={handleCreatePath} className="flex items-center gap-1">
            <input
              autoFocus
              value={newPathName}
              onChange={e => setNewPathName(e.target.value)}
              placeholder="Path name..."
              className="bg-stone-800 border border-orange-500/50 rounded px-2 py-1 text-white text-xs focus:outline-none placeholder-stone-600 w-32"
            />
            <button type="submit" className="label-tactical text-orange-400 hover:text-orange-300 text-xs px-2 py-1 border border-orange-500/40 rounded">Create</button>
            <button type="button" onClick={() => { setCreatingPath(false); setNewPathName(''); }} className="label-tactical text-stone-600 hover:text-white text-xs">✕</button>
          </form>
        ) : (
          <button
            onClick={() => setCreatingPath(true)}
            className="label-tactical text-stone-600 hover:text-orange-400 transition-colors border border-stone-800 hover:border-orange-500/40 px-3 py-1.5 rounded text-xs"
          >
            + New Path
          </button>
        )}
      </div>

      {error && <p className="text-red-400 text-sm mb-6">{error}</p>}

      {editingQuestion && (
        <div className="bg-stone-900/80 border border-orange-500/30 rounded p-6 mb-6">
          <p className="label-tactical text-orange-500 mb-4 tracking-[0.15em]">
            {editingQuestion === 'new' ? '// New Question' : '// Edit Question'}
          </p>
          <form onSubmit={saveQuestion}>
            <div className="mb-4">
              <label className="label-tactical text-stone-500 mb-1 block">Question Text *</label>
              <input
                type="text"
                value={questionForm.text}
                onChange={e => setQuestionForm(f => ({ ...f, text: e.target.value }))}
                required autoFocus
                className="w-full bg-stone-800 border border-stone-700 rounded px-4 py-3 text-white placeholder-stone-600 focus:outline-none focus:border-orange-500"
                placeholder="e.g. What is your primary preparedness concern?"
              />
            </div>
            <div className="mb-4">
              <label className="label-tactical text-stone-500 mb-1 block">Code <span className="text-stone-600 normal-case font-normal">(short reference label — shown in routing dropdowns)</span></label>
              <input
                type="text"
                value={questionForm.code}
                onChange={e => setQuestionForm(f => ({ ...f, code: e.target.value.toUpperCase().replace(/\s+/g, '-') }))}
                className="w-full bg-stone-800 border border-stone-700 rounded px-4 py-3 text-white placeholder-stone-600 focus:outline-none focus:border-orange-500"
                style={{ fontFamily: "'Courier New', Courier, monospace" }}
                placeholder="e.g. Q1, INTRO, BUG-OUT-1"
              />
            </div>
            {paths.length > 0 && (
              <div className="mb-4">
                <label className="label-tactical text-stone-500 mb-1 block">Path <span className="text-stone-600 normal-case font-normal">(optional — for organizing questions)</span></label>
                <select
                  value={questionForm.path_id || ''}
                  onChange={e => setQuestionForm(f => ({ ...f, path_id: e.target.value || null }))}
                  className="w-full bg-stone-800 border border-stone-700 rounded px-4 py-3 text-white focus:outline-none focus:border-orange-500 text-sm"
                >
                  <option value="">— No path —</option>
                  {paths.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            )}
            {questionError && <p className="text-red-400 text-sm mb-4">{questionError}</p>}
            <div className="flex gap-3">
              <button type="submit" disabled={questionSaving}
                className="bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-white text-xs font-bold uppercase tracking-widest px-6 py-3 rounded transition-colors">
                {questionSaving ? 'Saving...' : editingQuestion === 'new' ? 'Create Question' : 'Save Changes'}
              </button>
              <button type="button" onClick={cancelQuestion}
                className="border border-stone-700 hover:border-stone-500 text-stone-400 hover:text-white text-xs uppercase tracking-widest font-semibold px-6 py-3 rounded transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {(activePath === null ? questions.filter(q => !hiddenPaths.includes(q.path_id)) : questions.filter(q => q.path_id === activePath)).map((q) => (
          <div
            key={q.id}
            draggable={!editingQuestion}
            onDragStart={e => handleDragStart(e, q.id)}
            onDragOver={e => handleDragOver(e, q.id)}
            onDrop={e => handleDrop(e, q.id)}
            onDragEnd={handleDragEnd}
            className={`bg-stone-900/80 border rounded overflow-hidden transition-all ${q.is_start ? 'border-orange-500/40' : 'border-stone-800'} ${draggingId === q.id ? 'opacity-30' : ''} ${dragOverId === q.id && draggingId !== q.id ? 'ring-1 ring-orange-500/40 border-orange-500/30' : ''}`}
          >
            <div className={`flex items-start justify-between p-4 gap-4 ${expanded[q.id] ? 'sticky top-0 z-10 bg-stone-900 border-b border-stone-800/60' : ''}`}>
              <div className="flex items-start gap-3 min-w-0 flex-1 flex-wrap">
                {!editingQuestion && (
                  <span className="text-stone-700 hover:text-stone-500 cursor-grab active:cursor-grabbing select-none shrink-0 text-base leading-none mt-0.5" title="Drag to reorder">⠿</span>
                )}
                {q.code && (
                  <span className="font-bold text-xs text-orange-400 border border-orange-500/30 bg-orange-500/10 px-2 py-0.5 rounded shrink-0" style={{ fontFamily: "'Courier New', Courier, monospace" }}>{q.code}</span>
                )}
                {q.is_start && (
                  <span className="label-tactical text-orange-500 border border-orange-500/40 bg-orange-500/10 px-2 py-0.5 rounded shrink-0 text-xs">START</span>
                )}
                {q.path_id && paths.find(p => p.id === q.path_id) && (
                  <span className="label-tactical text-teal-400/80 border border-teal-500/20 bg-teal-500/10 px-2 py-0.5 rounded shrink-0 text-xs">{paths.find(p => p.id === q.path_id).name}</span>
                )}
                <button
                  onClick={() => toggleExpand(q.id)}
                  className="text-left font-semibold uppercase tracking-wide text-sm hover:text-orange-400 transition-colors break-words min-w-0"
                >
                  {q.text}
                </button>
                <span className="label-tactical text-stone-600 shrink-0">{q.answers?.length || 0} answers</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => toggleExpand(q.id)}
                  className="label-tactical text-stone-500 hover:text-white transition-colors tracking-widest"
                >
                  {expanded[q.id] ? '▲' : '▼'}
                </button>
                {!q.is_start && (
                  <button
                    onClick={() => setStartQuestion(q.id)}
                    className="label-tactical text-stone-600 hover:text-orange-400 transition-colors tracking-widest border border-stone-800 hover:border-orange-500/40 px-3 py-1 rounded text-xs"
                    title="Set as the first question in the quiz"
                  >
                    Set Start
                  </button>
                )}
                <button
                  onClick={() => startEditQuestion(q)}
                  className="label-tactical text-stone-500 hover:text-white transition-colors tracking-widest border border-stone-700 hover:border-stone-500 px-3 py-1 rounded"
                >
                  Edit
                </button>
                <button
                  onClick={() => deleteQuestion(q)}
                  className="label-tactical text-stone-600 hover:text-red-400 transition-colors tracking-widest border border-stone-800 hover:border-red-500/50 px-3 py-1 rounded"
                >
                  Delete
                </button>
              </div>
            </div>

            {expanded[q.id] && (
              <div className="border-t border-stone-800 px-4 pb-4 pt-3">
                <div className="flex flex-col gap-2 mb-3">
                  {(q.answers || []).map(answer => {
                    const isEditingThis = editingAnswer?.answerId === answer.id;
                    const linkedKit = kits.find(k => k.id === answer.result_kit_id);
                    const linkedQuestion = questions.find(q2 => q2.id === answer.next_question_id);
                    return (
                      <div
                        key={answer.id}
                        draggable={!isEditingThis && !editingAnswer}
                        onDragStart={e => handleAnswerDragStart(e, q.id, answer.id)}
                        onDragOver={e => handleAnswerDragOver(e, q.id, answer.id)}
                        onDrop={e => handleAnswerDrop(e, q.id, answer.id)}
                        onDragEnd={handleAnswerDragEnd}
                        className={`transition-all ${answerDraggingId === answer.id ? 'opacity-30' : ''} ${answerDragOverId === answer.id && answerDraggingId !== answer.id ? 'ring-1 ring-orange-500/40 rounded' : ''}`}
                      >
                        {isEditingThis ? (
                          <div className="bg-stone-800 border border-orange-500/30 rounded p-4">
                            <p className="label-tactical text-orange-500 mb-3 tracking-widest">// Edit Answer</p>
                            <form onSubmit={saveAnswer}>
                              <div className="mb-3">
                                <label className="label-tactical text-stone-500 mb-1 block">Answer Text *</label>
                                <input
                                  type="text"
                                  value={answerForm.text}
                                  onChange={e => setAnswerForm(f => ({ ...f, text: e.target.value }))}
                                  required
                                  className="w-full bg-stone-900 border border-stone-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500"
                                  placeholder="e.g. Urban emergency preparedness"
                                />
                              </div>
                              <div className="mb-3">
                                <label className="label-tactical text-stone-500 mb-1 block">Description <span className="text-stone-600 normal-case font-normal">(optional — shown when user clicks this answer)</span></label>
                                <textarea
                                  value={answerForm.description}
                                  onChange={e => setAnswerForm(f => ({ ...f, description: e.target.value }))}
                                  rows={2}
                                  className="w-full bg-stone-900 border border-stone-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500 resize-none placeholder-stone-600"
                                  placeholder="e.g. Preparing for earthquakes, power outages, and urban emergencies close to home."
                                />
                              </div>
                              <div className="mb-3">
                                <label className="label-tactical text-stone-500 mb-2 block">This answer leads to...</label>
                                <div className="flex gap-2">
                                  <button type="button" onClick={() => setAnswerForm(f => ({ ...f, answerMode: 'next' }))}
                                    className={`px-4 py-2 rounded text-xs font-semibold uppercase tracking-widest border transition-all ${answerForm.answerMode === 'next' ? 'border-orange-500 bg-orange-500/10 text-orange-400' : 'border-stone-700 text-stone-500 hover:border-stone-500'}`}>
                                    Next Question →
                                  </button>
                                  <button type="button" onClick={() => setAnswerForm(f => ({ ...f, answerMode: 'terminal' }))}
                                    className={`px-4 py-2 rounded text-xs font-semibold uppercase tracking-widest border transition-all ${answerForm.answerMode === 'terminal' ? 'border-orange-500 bg-orange-500/10 text-orange-400' : 'border-stone-700 text-stone-500 hover:border-stone-500'}`}>
                                    End Quiz (kit result)
                                  </button>
                                  <button type="button" onClick={() => setAnswerForm(f => ({ ...f, answerMode: 'contact' }))}
                                    className={`px-4 py-2 rounded text-xs font-semibold uppercase tracking-widest border transition-all ${answerForm.answerMode === 'contact' ? 'border-orange-500 bg-orange-500/10 text-orange-400' : 'border-stone-700 text-stone-500 hover:border-stone-500'}`}>
                                    Contact Us
                                  </button>
                                </div>
                              </div>
                              {answerForm.answerMode === 'next' ? (
                                <div className="mb-3">
                                  <label className="label-tactical text-stone-500 mb-1 block">Route to Question *</label>
                                  {questions.filter(q2 => q2.id !== q.id).length === 0 ? (
                                    <p className="text-stone-600 text-sm">No other questions exist yet. Create more questions first.</p>
                                  ) : (
                                    <select value={answerForm.next_question_id} onChange={e => setAnswerForm(f => ({ ...f, next_question_id: e.target.value }))}
                                      className="w-full bg-stone-900 border border-stone-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500">
                                      <option value="">— Select next question —</option>
                                      {questions.filter(q2 => q2.id !== q.id).map(q2 => (
                                        <option key={q2.id} value={q2.id}>{q2.code ? `[${q2.code}] ` : ''}{q2.is_start ? '★ ' : ''}{q2.text}</option>
                                      ))}
                                    </select>
                                  )}
                                </div>
                              ) : answerForm.answerMode === 'terminal' ? (
                                <div className="mb-3">
                                  <label className="label-tactical text-stone-500 mb-1 block">Recommend Kit *</label>
                                  {kits.length === 0 ? (
                                    <p className="text-stone-600 text-sm">No kits found. Create kits first.</p>
                                  ) : (
                                    <select value={answerForm.result_kit_id} onChange={e => setAnswerForm(f => ({ ...f, result_kit_id: e.target.value }))}
                                      className="w-full bg-stone-900 border border-stone-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500">
                                      <option value="">— Select kit —</option>
                                      {kits.map(k => (<option key={k.id} value={k.id}>{k.tag ? `[${k.tag}] ` : ''}{k.name}</option>))}
                                    </select>
                                  )}
                                </div>
                              ) : (
                                <div className="mb-3 bg-stone-900/60 border border-stone-800 rounded px-3 py-2.5">
                                  <p className="text-stone-400 text-sm">The quiz will end here. The user will be directed to the <span className="text-orange-400">Contact Us</span> page to get personalized help.</p>
                                </div>
                              )}
                              <div className="mt-3 border-t border-stone-800/60 pt-3">
                                <p className="label-tactical text-stone-600 mb-2" style={{ fontSize: '0.6rem' }}>GROUP DATA <span className="text-stone-700 normal-case font-normal">— contributes to sizing screen</span></p>
                                <div className="grid grid-cols-3 gap-2">
                                  <div>
                                    <label className="label-tactical text-stone-600 mb-1 block" style={{ fontSize: '0.6rem' }}>ADULTS</label>
                                    <input type="number" min="0" value={answerForm.ga_adults} onChange={e => setAnswerForm(f => ({ ...f, ga_adults: e.target.value }))} placeholder="—" className="w-full bg-stone-900 border border-stone-700 rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:border-orange-500" />
                                  </div>
                                  <div>
                                    <label className="label-tactical text-stone-600 mb-1 block" style={{ fontSize: '0.6rem' }}>CHILDREN</label>
                                    <input type="number" min="0" value={answerForm.ga_children} onChange={e => setAnswerForm(f => ({ ...f, ga_children: e.target.value }))} placeholder="—" className="w-full bg-stone-900 border border-stone-700 rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:border-orange-500" />
                                  </div>
                                  <div>
                                    <label className="label-tactical text-stone-600 mb-1 block" style={{ fontSize: '0.6rem' }}>ADULT GENDER</label>
                                    <select value={answerForm.ga_gender} onChange={e => setAnswerForm(f => ({ ...f, ga_gender: e.target.value }))} className="w-full bg-stone-900 border border-stone-700 rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:border-orange-500">
                                      <option value="">— None —</option>
                                      <option value="Male">Male</option>
                                      <option value="Female">Female</option>
                                    </select>
                                  </div>
                                </div>
                              </div>
                              {answerError && <p className="text-red-400 text-xs mb-3 mt-2">{answerError}</p>}
                              <div className="flex gap-2 mt-3">
                                <button type="submit" disabled={answerSaving}
                                  className="bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-white text-xs font-bold uppercase tracking-widest px-4 py-2 rounded transition-colors">
                                  {answerSaving ? 'Saving...' : 'Save Changes'}
                                </button>
                                <button type="button" onClick={cancelAnswer}
                                  className="border border-stone-700 text-stone-400 hover:text-white text-xs uppercase tracking-widest px-4 py-2 rounded transition-colors">
                                  Cancel
                                </button>
                              </div>
                            </form>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between px-3 py-2 rounded border border-stone-800 hover:border-stone-700 gap-3">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              {!editingAnswer && (
                                <span className="text-stone-700 hover:text-stone-500 cursor-grab active:cursor-grabbing select-none shrink-0 text-sm leading-none" title="Drag to reorder">⠿</span>
                              )}
                              <span className="text-stone-300 text-sm break-words">{answer.text}</span>
                              {linkedQuestion && (
                                <span className="label-tactical text-blue-400/70 shrink-0">→ {linkedQuestion.code ? `[${linkedQuestion.code}] ` : ''}{linkedQuestion.text}</span>
                              )}
                              {linkedKit && (
                                <span className="label-tactical text-orange-500 shrink-0">→ Kit: {linkedKit.tag ? `[${linkedKit.tag}] ` : ''}{linkedKit.name}</span>
                              )}
                              {answer.result_contact && (
                                <span className="label-tactical text-teal-400/80 shrink-0">→ Contact Us</span>
                              )}
                              {!linkedQuestion && !linkedKit && !answer.result_contact && (
                                <span className="label-tactical text-red-400/60 shrink-0">⚠ No route set</span>
                              )}
                              {answer.group_action && Object.keys(answer.group_action).length > 0 && (
                                <span className="label-tactical text-blue-400/60 shrink-0">👥 group data</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button onClick={() => startEditAnswer(q.id, answer)}
                                className="label-tactical text-stone-600 hover:text-white transition-colors tracking-widest">
                                Edit
                              </button>
                              <button onClick={() => deleteAnswer(q.id, answer)}
                                className="label-tactical text-stone-600 hover:text-red-400 transition-colors tracking-widest">
                                Delete
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {editingAnswer?.questionId === q.id && editingAnswer?.answerId === 'new' && (
                    <div className="bg-stone-800 border border-orange-500/30 rounded p-4">
                      <p className="label-tactical text-orange-500 mb-3 tracking-widest">// New Answer</p>
                      <form onSubmit={saveAnswer}>
                        <div className="mb-3">
                          <label className="label-tactical text-stone-500 mb-1 block">Answer Text *</label>
                          <input
                            type="text"
                            value={answerForm.text}
                            onChange={e => setAnswerForm(f => ({ ...f, text: e.target.value }))}
                            required
                            className="w-full bg-stone-900 border border-stone-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500"
                            placeholder="e.g. Urban emergency preparedness"
                          />
                        </div>
                        <div className="mb-3">
                          <label className="label-tactical text-stone-500 mb-1 block">Description <span className="text-stone-600 normal-case font-normal">(optional — shown when user clicks this answer)</span></label>
                          <textarea
                            value={answerForm.description}
                            onChange={e => setAnswerForm(f => ({ ...f, description: e.target.value }))}
                            rows={2}
                            className="w-full bg-stone-900 border border-stone-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500 resize-none placeholder-stone-600"
                            placeholder="e.g. Preparing for earthquakes, power outages, and urban emergencies close to home."
                          />
                        </div>
                        <div className="mb-3">
                          <label className="label-tactical text-stone-500 mb-2 block">This answer leads to...</label>
                          <div className="flex gap-2">
                            <button type="button" onClick={() => setAnswerForm(f => ({ ...f, answerMode: 'next' }))}
                              className={`px-4 py-2 rounded text-xs font-semibold uppercase tracking-widest border transition-all ${answerForm.answerMode === 'next' ? 'border-orange-500 bg-orange-500/10 text-orange-400' : 'border-stone-700 text-stone-500 hover:border-stone-500'}`}>
                              Next Question →
                            </button>
                            <button type="button" onClick={() => setAnswerForm(f => ({ ...f, answerMode: 'terminal' }))}
                              className={`px-4 py-2 rounded text-xs font-semibold uppercase tracking-widest border transition-all ${answerForm.answerMode === 'terminal' ? 'border-orange-500 bg-orange-500/10 text-orange-400' : 'border-stone-700 text-stone-500 hover:border-stone-500'}`}>
                              End Quiz (kit result)
                            </button>
                            <button type="button" onClick={() => setAnswerForm(f => ({ ...f, answerMode: 'contact' }))}
                              className={`px-4 py-2 rounded text-xs font-semibold uppercase tracking-widest border transition-all ${answerForm.answerMode === 'contact' ? 'border-orange-500 bg-orange-500/10 text-orange-400' : 'border-stone-700 text-stone-500 hover:border-stone-500'}`}>
                              Contact Us
                            </button>
                          </div>
                        </div>
                        {answerForm.answerMode === 'next' ? (
                          <div className="mb-3">
                            <label className="label-tactical text-stone-500 mb-1 block">Route to Question *</label>
                            {questions.filter(q2 => q2.id !== q.id).length === 0 ? (
                              <p className="text-stone-600 text-sm">No other questions exist yet. Create more questions first.</p>
                            ) : (
                              <select value={answerForm.next_question_id} onChange={e => setAnswerForm(f => ({ ...f, next_question_id: e.target.value }))}
                                className="w-full bg-stone-900 border border-stone-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500">
                                <option value="">— Select next question —</option>
                                {questions.filter(q2 => q2.id !== q.id).map(q2 => (
                                  <option key={q2.id} value={q2.id}>{q2.is_start ? '[START] ' : ''}{q2.text}</option>
                                ))}
                              </select>
                            )}
                          </div>
                        ) : answerForm.answerMode === 'terminal' ? (
                          <div className="mb-3">
                            <label className="label-tactical text-stone-500 mb-1 block">Recommend Kit *</label>
                            {kits.length === 0 ? (
                              <p className="text-stone-600 text-sm">No kits found. Create kits first.</p>
                            ) : (
                              <select value={answerForm.result_kit_id} onChange={e => setAnswerForm(f => ({ ...f, result_kit_id: e.target.value }))}
                                className="w-full bg-stone-900 border border-stone-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500">
                                <option value="">— Select kit —</option>
                                {kits.map(k => (<option key={k.id} value={k.id}>{k.tag ? `[${k.tag}] ` : ''}{k.name}</option>))}
                              </select>
                            )}
                          </div>
                        ) : (
                          <div className="mb-3 bg-stone-900/60 border border-stone-800 rounded px-3 py-2.5">
                            <p className="text-stone-400 text-sm">The quiz will end here. The user will be directed to the <span className="text-orange-400">Contact Us</span> page to get personalized help.</p>
                          </div>
                        )}
                        <div className="mt-3 border-t border-stone-800/60 pt-3">
                          <p className="label-tactical text-stone-600 mb-2" style={{ fontSize: '0.6rem' }}>GROUP DATA <span className="text-stone-700 normal-case font-normal">— contributes to sizing screen</span></p>
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="label-tactical text-stone-600 mb-1 block" style={{ fontSize: '0.6rem' }}>ADULTS</label>
                              <input type="number" min="0" value={answerForm.ga_adults} onChange={e => setAnswerForm(f => ({ ...f, ga_adults: e.target.value }))} placeholder="—" className="w-full bg-stone-900 border border-stone-700 rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:border-orange-500" />
                            </div>
                            <div>
                              <label className="label-tactical text-stone-600 mb-1 block" style={{ fontSize: '0.6rem' }}>CHILDREN</label>
                              <input type="number" min="0" value={answerForm.ga_children} onChange={e => setAnswerForm(f => ({ ...f, ga_children: e.target.value }))} placeholder="—" className="w-full bg-stone-900 border border-stone-700 rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:border-orange-500" />
                            </div>
                            <div>
                              <label className="label-tactical text-stone-600 mb-1 block" style={{ fontSize: '0.6rem' }}>ADULT GENDER</label>
                              <select value={answerForm.ga_gender} onChange={e => setAnswerForm(f => ({ ...f, ga_gender: e.target.value }))} className="w-full bg-stone-900 border border-stone-700 rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:border-orange-500">
                                <option value="">— None —</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                              </select>
                            </div>
                          </div>
                        </div>
                        {answerError && <p className="text-red-400 text-xs mb-3 mt-2">{answerError}</p>}
                        <div className="flex gap-2">
                          <button type="submit" disabled={answerSaving}
                            className="bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-white text-xs font-bold uppercase tracking-widest px-4 py-2 rounded transition-colors">
                            {answerSaving ? 'Saving...' : 'Add Answer'}
                          </button>
                          <button type="button" onClick={cancelAnswer}
                            className="border border-stone-700 text-stone-400 hover:text-white text-xs uppercase tracking-widest px-4 py-2 rounded transition-colors">
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {(q.answers?.length === 0 && editingAnswer?.questionId !== q.id) && (
                    <p className="label-tactical text-stone-600 py-2">No answers yet. Add one below.</p>
                  )}
                </div>

                {editingAnswer?.questionId !== q.id && (
                  <button
                    onClick={() => startNewAnswer(q.id)}
                    className="label-tactical text-orange-500 hover:text-orange-400 transition-colors tracking-widest border border-orange-500/30 hover:border-orange-500/60 px-4 py-2 rounded"
                  >
                    + Add Answer
                  </button>
                )}
              </div>
            )}
          </div>
        ))}

        {(activePath === null ? questions.filter(q => !hiddenPaths.includes(q.path_id)) : questions.filter(q => q.path_id === activePath)).length === 0 && !editingQuestion && (
          <div className="text-center py-16">
            <p className="label-tactical text-stone-500">
              {activePath ? 'No questions in this path yet. Add a question and assign it to this path.' : 'No questions yet. Add one above.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );

  if (!embedded) {
    return (
      <main className="min-h-screen bg-stone-950 text-white">
        <nav className="flex items-center justify-between px-8 py-4 border-b border-stone-800">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-sm font-extrabold uppercase tracking-[0.18em] hover:text-orange-500 transition-colors">BaselineKits</Link>
            <span className="label-tactical text-stone-600">/ Quiz Editor</span>
          </div>
          <Link href="/admin" className="label-tactical text-stone-500 hover:text-white transition-colors tracking-widest">← Dashboard</Link>
        </nav>

        {editorContent}
      </main>
    );
  }

  return editorContent;
}

// @ts-nocheck
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getStartQuestion, getQuestion, submitQuiz } from '../../lib/api';
import Navbar from '../components/Navbar';

export default function QuizPage() {
  const router = useRouter();

  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [history, setHistory] = useState([]);
  const [answers, setAnswers] = useState({});

  // Flash + visual feedback state
  const [flashingId, setFlashingId] = useState(null);
  const [expandedDescriptionId, setExpandedDescriptionId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [advancing, setAdvancing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getStartQuestion()
      .then(q => { setCurrentQuestion(q); setLoading(false); })
      .catch(err => { setError(err.message || 'Failed to load quiz. Please try again.'); setLoading(false); });
  }, []);

  // Navigate to the next question or submit if terminal
  async function advance(answer: any, newAnswers: any) {
    if (answer.result_contact) {
      // Build Q&A summary from all previous steps + this final answer
      const lines: string[] = [];
      for (const step of history) {
        const qText = step.question?.text || '';
        const aText = step.question?.answers?.find((a: any) => a.id === step.answerId)?.text || '';
        if (qText && aText) lines.push(`Q: ${qText}\nA: ${aText}`);
      }
      if (currentQuestion?.text && answer.text) {
        lines.push(`Q: ${currentQuestion.text}\nA: ${answer.text}`);
      }
      if (lines.length > 0) {
        localStorage.setItem('quizContactSummary', lines.join('\n\n'));
      }
      router.push('/contact?from=quiz');
      return;
    }
    if (answer.next_question_id) {
      setAdvancing(true);
      try {
        const nextQuestion = await getQuestion(answer.next_question_id);
        setHistory(prev => [...prev, { question: currentQuestion, answerId: answer.id }]);
        setCurrentQuestion(nextQuestion);
        setFlashingId(null);
      } catch (err: any) {
        setError(err.message || 'Failed to load next question.');
      } finally {
        setAdvancing(false);
      }
    } else if (answer.result_kit_id) {
      setSubmitting(true);
      try {
        const result = await submitQuiz(newAnswers);
        localStorage.setItem('quizResult', JSON.stringify(result));
        router.push('/results');
      } catch (err: any) {
        setError(err.message || 'Failed to get recommendation. Try again.');
        setSubmitting(false);
      }
    } else {
      setError('This answer has no next question or kit assigned. Please contact support.');
    }
  }

  // Called when user clicks an answer button
  function handleClick(answer: any) {
    if (advancing || submitting) return;

    setError('');

    // Flash animation
    setFlashingId(answer.id);
    setTimeout(() => setFlashingId(null), 400);

    const newAnswers = { ...answers, [currentQuestion.id]: answer.id };
    setAnswers(newAnswers);
    advance(answer, newAnswers);
  }

  function goBack() {
    if (history.length === 0) { router.push('/'); return; }
    const prev = history[history.length - 1];
    setHistory(h => h.slice(0, -1));
    setCurrentQuestion(prev.question);
    setAnswers(prev2 => {
      const updated = { ...prev2 };
      delete updated[currentQuestion.id];
      return updated;
    });
    setError('');
  }

  const stepNumber = history.length + 1;
  const backLabel = history.length === 0 ? '← Home' : '← Back';

  if (loading) {
    return (
      <main className="min-h-screen bg-stone-950 text-white flex items-center justify-center">
        <p className="label-tactical text-stone-500 tracking-widest">Initializing assessment...</p>
      </main>
    );
  }

  if (error && !currentQuestion) {
    return (
      <main className="min-h-screen bg-stone-950 text-white flex items-center justify-center flex-col gap-4">
        <p className="text-red-400 text-center max-w-md">{error}</p>
        <button
          onClick={() => {
            setError('');
            setLoading(true);
            getStartQuestion()
              .then(q => { setCurrentQuestion(q); setLoading(false); })
              .catch(err => { setError(err.message); setLoading(false); });
          }}
          className="label-tactical text-orange-500 hover:text-orange-400 tracking-widest border border-orange-500/30 hover:border-orange-500/60 px-4 py-2 rounded transition-colors"
        >
          Try Again
        </button>
      </main>
    );
  }

  return (
    <>
    <Navbar />
    <main className="min-h-screen bg-stone-950 text-white flex flex-col items-center justify-center px-6 py-16">

      {/* Header label */}
      <div className="w-full max-w-xl mb-6">
        <p className="label-tactical text-orange-500 tracking-[0.2em]">// Kit Assessment</p>
      </div>

      {/* Step indicator */}
      <div className="w-full max-w-xl mb-6">
        <div className="flex justify-between label-tactical text-stone-500 mb-2">
          <span>Step {stepNumber}</span>
          {submitting && <span className="text-orange-400">Calculating your kit...</span>}
          {advancing && <span className="text-stone-600">Loading...</span>}
        </div>
        <div className="flex items-center gap-1.5">
          {Array.from({ length: stepNumber }).map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-all ${i < stepNumber - 1 ? 'bg-orange-500' : 'bg-orange-500/40'}`}
            />
          ))}
        </div>
      </div>

      {/* Question card */}
      <div className="w-full max-w-xl bg-stone-900/80 rounded p-8 border border-stone-800">
        <h2 className="text-2xl font-bold uppercase tracking-wide mb-6">{currentQuestion?.text}</h2>

        <div className="flex flex-col gap-3">
          {(currentQuestion?.answers || []).map(answer => {
            const isSelected = answers[currentQuestion.id] === answer.id;
            const isFlashing = flashingId === answer.id;

            return (
              <div key={answer.id} className="group">
                <div className={`flex items-stretch rounded border transition-all ${
                  isFlashing ? 'answer-flash' : ''
                } ${
                  isSelected
                    ? 'border-orange-500 bg-orange-500/10 text-white'
                    : 'border-stone-700 hover:border-stone-500 text-stone-300 hover:text-white'
                }`}>
                  <button
                    onClick={() => handleClick(answer)}
                    disabled={advancing || submitting}
                    className="flex-1 text-left px-5 py-4 disabled:opacity-40"
                  >
                    {answer.text}
                  </button>
                  {answer.description && (
                    <button
                      type="button"
                      onClick={() => setExpandedDescriptionId(current => current === answer.id ? null : answer.id)}
                      aria-expanded={expandedDescriptionId === answer.id}
                      aria-controls={`answer-description-${answer.id}`}
                      className="md:hidden shrink-0 border-l border-stone-700 px-4 text-[10px] uppercase tracking-[0.2em] text-stone-400"
                    >
                      {expandedDescriptionId === answer.id ? 'Hide' : 'Info'}
                    </button>
                  )}
                </div>
                {answer.description && (
                  <p
                    id={`answer-description-${answer.id}`}
                    className={`mt-2 overflow-hidden text-xs leading-relaxed text-stone-300 transition-all duration-200 md:block md:max-h-0 md:group-hover:max-h-96 md:group-focus-within:max-h-96 ${
                      expandedDescriptionId === answer.id ? 'block max-h-96' : 'hidden'
                    }`}
                  >
                    {answer.description}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {error && <p className="text-red-400 mt-4 text-sm">{error}</p>}

        {/* Back navigation */}
        <div className="flex justify-start mt-8">
          <button
            onClick={goBack}
            disabled={advancing || submitting}
            className="label-tactical text-stone-500 hover:text-white disabled:opacity-30 transition-colors tracking-widest px-3 py-2"
          >
            {backLabel}
          </button>
        </div>
      </div>

    </main>
    </>
  );
}

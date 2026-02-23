'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getQuestions, getAnswers, submitQuiz } from '../../lib/api';

export default function QuizPage() {
  const router = useRouter();
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({}); // { questionId: answerId }
  const [answerOptions, setAnswerOptions] = useState({}); // { questionId: [answers] }
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Load all questions on mount
  useEffect(() => {
    getQuestions()
      .then(async (qs) => {
        setQuestions(qs);
        // Pre-load answers for all questions
        const allAnswers = {};
        for (const q of qs) {
          const ans = await getAnswers(q.id);
          allAnswers[q.id] = ans;
        }
        setAnswerOptions(allAnswers);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load quiz. Please try again.');
        setLoading(false);
      });
  }, []);

  const currentQuestion = questions[currentStep];
  const currentAnswers = currentQuestion ? (answerOptions[currentQuestion.id] || []) : [];
  const selectedAnswer = currentQuestion ? answers[currentQuestion.id] : null;

  function selectAnswer(answerId) {
    setAnswers(prev => ({ ...prev, [currentQuestion.id]: answerId }));
  }

  function goBack() {
    setCurrentStep(prev => prev - 1);
  }

  async function goNext() {
    if (currentStep < questions.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      // Final step — submit
      setSubmitting(true);
      setError('');
      try {
        const result = await submitQuiz(answers);
        // Store result and navigate to results page
        localStorage.setItem('quizResult', JSON.stringify(result));
        router.push('/results');
      } catch (err) {
        setError(err.message || 'Failed to get recommendation. Try again.');
        setSubmitting(false);
      }
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-stone-950 text-white flex items-center justify-center">
        <p className="text-stone-400">Loading quiz...</p>
      </main>
    );
  }

  if (error && questions.length === 0) {
    return (
      <main className="min-h-screen bg-stone-950 text-white flex items-center justify-center">
        <p className="text-red-400">{error}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-stone-950 text-white flex flex-col items-center justify-center px-6">

      {/* Progress bar */}
      <div className="w-full max-w-xl mb-8">
        <div className="flex justify-between text-stone-500 text-sm mb-2">
          <span>Question {currentStep + 1} of {questions.length}</span>
          <span>{Math.round(((currentStep + 1) / questions.length) * 100)}%</span>
        </div>
        <div className="w-full bg-stone-800 rounded-full h-2">
          <div
            className="bg-orange-500 h-2 rounded-full transition-all"
            style={{ width: `${((currentStep + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question card */}
      <div className="w-full max-w-xl bg-stone-900 rounded-xl p-8 border border-stone-800">
        <h2 className="text-2xl font-bold mb-6">{currentQuestion?.text}</h2>

        <div className="flex flex-col gap-3">
          {currentAnswers.map(answer => (
            <button
              key={answer.id}
              onClick={() => selectAnswer(answer.id)}
              className={`text-left px-5 py-4 rounded-lg border transition-all ${
                selectedAnswer === answer.id
                  ? 'border-orange-500 bg-orange-500/10 text-white'
                  : 'border-stone-700 hover:border-stone-500 text-stone-300'
              }`}
            >
              {answer.text}
            </button>
          ))}
        </div>

        {error && <p className="text-red-400 mt-4 text-sm">{error}</p>}

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <button
            onClick={goBack}
            disabled={currentStep === 0}
            className="text-stone-400 hover:text-white disabled:opacity-30 transition-colors"
          >
            ← Back
          </button>
          <button
            onClick={goNext}
            disabled={!selectedAnswer || submitting}
            className="bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-white font-semibold px-6 py-2 rounded-lg transition-colors"
          >
            {submitting ? 'Getting recommendation...' : currentStep === questions.length - 1 ? 'Get My Kit →' : 'Next →'}
          </button>
        </div>
      </div>

    </main>
  );
}

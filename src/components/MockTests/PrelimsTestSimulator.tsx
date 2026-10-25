import React, { useState, useEffect, useRef } from 'react';
import { 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  Bookmark, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  HelpCircle, 
  FileText, 
  Award,
  Globe2,
  TrendingUp,
  Share2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { MockTest, Question, LanguageMode, UserResponse } from '../../types';
import { api } from '../../services/api';

interface PrelimsTestSimulatorProps {
  test: MockTest;
  initialLang: LanguageMode;
  onExit: () => void;
  onTestCompleted?: (score: number) => void;
}

export const PrelimsTestSimulator: React.FC<PrelimsTestSimulatorProps> = ({
  test,
  initialLang,
  onExit,
  onTestCompleted
}) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [examLang, setExamLang] = useState<LanguageMode>(initialLang);
  const [secondsRemaining, setSecondsRemaining] = useState(test.durationMinutes * 60);
  const [isTestSubmitted, setIsTestSubmitted] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [reviewFilter, setReviewFilter] = useState<'all' | 'correct' | 'incorrect' | 'unattempted'>('all');
  const [isSavingAttempt, setIsSavingAttempt] = useState(false);
  const [attemptSaveError, setAttemptSaveError] = useState<string | null>(null);
  const hasSubmittedRef = useRef(false);
  const responsesRef = useRef<Record<number, UserResponse>>({});
  const secondsRemainingRef = useRef(test.durationMinutes * 60);

  // Initialize response state for each question
  const [responses, setResponses] = useState<Record<number, UserResponse>>(() => {
    const init: Record<number, UserResponse> = {};
    test.questions.forEach((q, idx) => {
      init[idx] = {
        selectedOption: null,
        status: idx === 0 ? 'not-answered' : 'unvisited'
      };
    });
    return init;
  });

  responsesRef.current = responses;
  secondsRemainingRef.current = secondsRemaining;

  // Countdown timer
  useEffect(() => {
    if (isTestSubmitted) return;

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleSubmitTest();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isTestSubmitted]);

  const currentQ = test.questions[currentQuestionIndex];
  const currentResp = responses[currentQuestionIndex] || { selectedOption: null, status: 'unvisited' };

  const formatTime = (secs: number) => {
    const hours = Math.floor(secs / 3600);
    const minutes = Math.floor((secs % 3600) / 60);
    const seconds = secs % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleSelectOption = (optionIdx: number) => {
    if (isTestSubmitted) return;
    setResponses((prev) => ({
      ...prev,
      [currentQuestionIndex]: {
        ...prev[currentQuestionIndex],
        selectedOption: optionIdx,
        status: 'answered'
      }
    }));
  };

  const handleClearResponse = () => {
    if (isTestSubmitted) return;
    setResponses((prev) => ({
      ...prev,
      [currentQuestionIndex]: {
        selectedOption: null,
        status: 'not-answered'
      }
    }));
  };

  const handleMarkForReviewAndNext = () => {
    if (isTestSubmitted) return;
    const hasAnswer = currentResp.selectedOption !== null;
    setResponses((prev) => ({
      ...prev,
      [currentQuestionIndex]: {
        ...prev[currentQuestionIndex],
        status: hasAnswer ? 'answered-and-marked' : 'marked-for-review'
      }
    }));

    if (currentQuestionIndex < test.questions.length - 1) {
      goToQuestion(currentQuestionIndex + 1);
    }
  };

  const handleSaveAndNext = () => {
    if (isTestSubmitted) return;
    if (currentQuestionIndex < test.questions.length - 1) {
      goToQuestion(currentQuestionIndex + 1);
    }
  };

  const goToQuestion = (targetIdx: number) => {
    setResponses((prev) => {
      const targetCurr = prev[targetIdx];
      if (targetCurr.status === 'unvisited') {
        return {
          ...prev,
          [targetIdx]: {
            ...targetCurr,
            status: 'not-answered'
          }
        };
      }
      return prev;
    });
    setCurrentQuestionIndex(targetIdx);
  };

  const handleSubmitTest = () => {
    if (hasSubmittedRef.current) return;
    hasSubmittedRef.current = true;
    setShowSubmitModal(false);
    setIsTestSubmitted(true);

    // Calculate score
    let correct = 0;
    let incorrect = 0;
    test.questions.forEach((q, idx) => {
      const resp = responsesRef.current[idx];
      if (resp?.selectedOption !== null && resp?.selectedOption !== undefined) {
        if (resp.selectedOption === q.correctOptionIndex) {
          correct++;
        } else {
          incorrect++;
        }
      }
    });

    const unanswered = test.questions.length - correct - incorrect;
    const marksPerQuestion = test.questions.length > 0 ? test.totalMarks / test.questions.length : 0;
    const netMarks = Number((correct * marksPerQuestion - incorrect * test.negativeMarksPerWrong).toFixed(2));

    setIsSavingAttempt(true);
    setAttemptSaveError(null);
    api.submitTestAttempt({
      testId: test.id,
      score: netMarks,
      correct,
      incorrect,
      unanswered,
      totalQuestions: test.questions.length,
      durationSeconds: Math.max(0, test.durationMinutes * 60 - secondsRemainingRef.current),
      answers: test.questions.map((question, questionIndex) => ({
        questionId: question.id,
        selectedOption: responsesRef.current[questionIndex]?.selectedOption ?? null
      }))
    }).then((result) => {
      if (!result.success) throw new Error('The attempt could not be saved.');
      onTestCompleted?.(netMarks);
    }).catch((error: unknown) => {
      setAttemptSaveError(error instanceof Error ? error.message : 'The attempt could not be saved.');
    }).finally(() => {
      setIsSavingAttempt(false);
    });

    if (netMarks > 8) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  };

  // Stats calculation
  let answeredCount = 0;
  let markedCount = 0;
  let markedAndAnsweredCount = 0;
  let notAnsweredCount = 0;
  let unvisitedCount = 0;
  let totalCorrect = 0;
  let totalIncorrect = 0;
  let totalAttempted = 0;

  test.questions.forEach((q, idx) => {
    const r = responses[idx];
    if (r.status === 'answered') answeredCount++;
    if (r.status === 'marked-for-review') markedCount++;
    if (r.status === 'answered-and-marked') markedAndAnsweredCount++;
    if (r.status === 'not-answered') notAnsweredCount++;
    if (r.status === 'unvisited') unvisitedCount++;

    if (r.selectedOption !== null) {
      totalAttempted++;
      if (r.selectedOption === q.correctOptionIndex) {
        totalCorrect++;
      } else {
        totalIncorrect++;
      }
    }
  });

  const marksPerCorrect = test.questions.length > 0 ? test.totalMarks / test.questions.length : 0;
  const rawPositive = totalCorrect * marksPerCorrect;
  const rawNegative = totalIncorrect * test.negativeMarksPerWrong;
  const netScore = Number((rawPositive - rawNegative).toFixed(2));
  const maxScore = test.questions.length * marksPerCorrect;
  const accuracyPct = totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 bg-slate-100 flex flex-col overflow-hidden">
      {/* UPSC CBT HEADER BAR */}
      <header className="bg-slate-900 border-b border-slate-800 text-white px-4 py-2.5 flex items-center justify-between shrink-0 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 font-cinzel font-bold flex items-center justify-center text-sm shadow-xs">
            U
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-slate-100">
                {examLang === 'hi' ? test.hindiTitle : test.title}
              </span>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded border border-amber-500/30">
                UPSC CBT Simulator
              </span>
            </div>
            <div className="text-[11px] text-slate-400">
              Marking: <span className="text-emerald-400 font-semibold">+{marksPerCorrect.toFixed(2)}</span> | Negative: <span className="text-red-400 font-semibold">-{test.negativeMarksPerWrong}</span>
            </div>
          </div>
        </div>

        {/* Center / Right Controls */}
        <div className="flex items-center gap-4">
          {/* Bilingual Toggle */}
          <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700 text-xs">
            <button
              onClick={() => setExamLang('en')}
              className={`px-2.5 py-1 rounded font-semibold transition cursor-pointer ${
                examLang === 'en' ? 'bg-amber-400 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              English
            </button>
            <button
              onClick={() => setExamLang('hi')}
              className={`px-2.5 py-1 rounded font-semibold transition cursor-pointer ${
                examLang === 'hi' ? 'bg-amber-400 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              हिंदी
            </button>
          </div>

          {/* Real-time Clock */}
          {!isTestSubmitted && (
            <div className="flex items-center gap-2 bg-slate-800/90 text-amber-300 font-mono font-bold px-3 py-1.5 rounded-lg border border-slate-700 text-sm shadow-inner">
              <Clock className="w-4 h-4 text-amber-400 animate-spin" style={{ animationDuration: '6s' }} />
              <span>{formatTime(secondsRemaining)}</span>
            </div>
          )}

          {/* Exit / Submit */}
          {!isTestSubmitted ? (
            <button
              onClick={() => setShowSubmitModal(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-1.5 rounded-lg text-xs transition shadow-md cursor-pointer"
            >
              Submit Test
            </button>
          ) : (
            <button
              onClick={onExit}
              className="bg-slate-700 hover:bg-slate-600 text-white font-semibold px-4 py-1.5 rounded-lg text-xs transition cursor-pointer"
            >
              Back to Test Hub
            </button>
          )}
        </div>
      </header>

      {/* MAIN TEST INTERFACE OR SCORECARD */}
      {!isTestSubmitted ? (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          {/* LEFT: QUESTION WORKSPACE (Cols 8 or 9) */}
          <div className="lg:col-span-8 xl:col-span-9 flex flex-col bg-white border-r border-slate-200 overflow-hidden">
            {/* Question Info Bar */}
            <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-700">
              <div className="flex items-center gap-3">
                <span className="text-amber-800 bg-amber-100 font-bold px-2 py-0.5 rounded">
                  Question {currentQuestionIndex + 1} of {test.questions.length}
                </span>
                <span className="text-slate-500">|</span>
                <span className="text-slate-600">Subject: <strong className="text-slate-900">{currentQ.subject}</strong> ({currentQ.gsPaper})</span>
                <span className="text-slate-500">|</span>
                <span className="text-slate-600">Difficulty: <strong className="text-slate-800">{currentQ.difficulty}</strong></span>
              </div>

              <div className="text-[11px] text-slate-500">
                Source: {currentQ.sourceReference}
              </div>
            </div>

            {/* Question Text & Options Scroll Area */}
            <div className="flex-1 p-6 md:p-8 overflow-y-auto space-y-6">
              {/* Question Statement */}
              <div className="font-serif-academic text-slate-900 text-base md:text-lg leading-relaxed whitespace-pre-line select-none">
                {examLang === 'hi' ? currentQ.questionHi : currentQ.questionEn}
              </div>

              {/* Multiple Choice Options */}
              <div className="space-y-3 pt-2">
                {(examLang === 'hi' ? currentQ.optionsHi : currentQ.optionsEn).map((optionText, optIdx) => {
                  const isSelected = currentResp.selectedOption === optIdx;
                  const optionLabel = ['(a)', '(b)', '(c)', '(d)'][optIdx];

                  return (
                    <div
                      key={optIdx}
                      onClick={() => handleSelectOption(optIdx)}
                      className={`flex items-start gap-3 p-4 rounded-xl border-2 transition cursor-pointer ${
                        isSelected
                          ? 'bg-amber-50/80 border-amber-600 shadow-xs'
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${
                        isSelected ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-700 border border-slate-300'
                      }`}>
                        {optionLabel}
                      </div>
                      <div className="font-sans text-slate-800 text-sm md:text-base leading-normal">
                        {optionText}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Actions Bar */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleClearResponse}
                  disabled={currentResp.selectedOption === null}
                  className="px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold disabled:opacity-40 transition cursor-pointer"
                >
                  Clear Response
                </button>
                <button
                  onClick={handleMarkForReviewAndNext}
                  className="px-3.5 py-2 rounded-lg border border-orange-300 bg-orange-50 hover:bg-orange-100 text-orange-800 text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  <span>Mark for Review & Next</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => currentQuestionIndex > 0 && goToQuestion(currentQuestionIndex - 1)}
                  disabled={currentQuestionIndex === 0}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold disabled:opacity-40 transition cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>
                <button
                  onClick={handleSaveAndNext}
                  className="flex items-center gap-1 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  <span>Save & Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT: QUESTION PALETTE (Cols 4 or 3) */}
          <div className="lg:col-span-4 xl:col-span-3 bg-slate-50 flex flex-col h-full border-t lg:border-t-0 overflow-y-auto">
            {/* Status Legend */}
            <div className="p-4 border-b border-slate-200 space-y-3 bg-white">
              <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                Question Palette Legend
              </h4>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded bg-emerald-600 text-white font-bold flex items-center justify-center text-[10px]">
                    {answeredCount}
                  </span>
                  <span className="text-slate-600">Answered</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded bg-red-600 text-white font-bold flex items-center justify-center text-[10px]">
                    {notAnsweredCount}
                  </span>
                  <span className="text-slate-600">Not Answered</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded bg-orange-500 text-white font-bold flex items-center justify-center text-[10px]">
                    {markedCount}
                  </span>
                  <span className="text-slate-600">Marked for Review</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded bg-purple-600 text-white font-bold flex items-center justify-center text-[10px]">
                    {markedAndAnsweredCount}
                  </span>
                  <span className="text-slate-600">Ans & Marked</span>
                </div>
                <div className="flex items-center gap-2 col-span-2">
                  <span className="w-6 h-6 rounded bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[10px] border border-slate-300">
                    {unvisitedCount}
                  </span>
                  <span className="text-slate-600">Not Visited</span>
                </div>
              </div>
            </div>

            {/* Question Buttons Matrix */}
            <div className="p-4 flex-1">
              <div className="text-xs font-bold text-slate-700 mb-3">Choose a Question:</div>
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2.5">
                {test.questions.map((_, idx) => {
                  const resp = responses[idx];
                  const isCurrent = idx === currentQuestionIndex;

                  let colorClass = 'bg-slate-200 text-slate-700 border-slate-300';
                  if (resp.status === 'answered') {
                    colorClass = 'bg-emerald-600 text-white border-emerald-700 shadow-xs';
                  } else if (resp.status === 'not-answered') {
                    colorClass = 'bg-red-600 text-white border-red-700';
                  } else if (resp.status === 'marked-for-review') {
                    colorClass = 'bg-orange-500 text-white border-orange-600';
                  } else if (resp.status === 'answered-and-marked') {
                    colorClass = 'bg-purple-600 text-white border-purple-700';
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => goToQuestion(idx)}
                      className={`h-10 rounded-lg text-xs font-bold border flex items-center justify-center transition cursor-pointer ${colorClass} ${
                        isCurrent ? 'ring-3 ring-amber-500 scale-105' : 'hover:opacity-90'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Test Summary Box in Sidebar */}
            <div className="p-4 bg-slate-100 border-t border-slate-200 text-xs space-y-2">
              <div className="flex justify-between font-medium text-slate-600">
                <span>Total Questions:</span>
                <span className="font-bold text-slate-900">{test.questions.length}</span>
              </div>
              <div className="flex justify-between font-medium text-slate-600">
                <span>Attempted:</span>
                <span className="font-bold text-emerald-700">{totalAttempted}</span>
              </div>
              <div className="flex justify-between font-medium text-slate-600">
                <span>Remaining:</span>
                <span className="font-bold text-slate-800">{test.questions.length - totalAttempted}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* POST-TEST DIAGNOSTIC SCORECARD & SOLUTION KEY */
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-50">
          <div className="max-w-5xl mx-auto space-y-8 pb-16">
            {/* Scorecard Hero Banner */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>

              <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-6 border-b border-slate-100">
                <div className="space-y-2 text-center md:text-left">
                  <div className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded-full text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Test Completed & Evaluated</span>
                  </div>
                  <h2 className="text-2xl font-bold font-cinzel text-slate-900">
                    {test.title}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Exam medium: {examLang === 'hi' ? 'हिंदी' : 'English'}
                  </p>
                  {isSavingAttempt && (
                    <p role="status" className="text-xs text-amber-700">Saving your result…</p>
                  )}
                  {attemptSaveError && (
                    <p role="alert" className="text-xs text-red-700">
                      Your result is shown, but it could not be saved: {attemptSaveError}
                    </p>
                  )}
                </div>

                {/* Score Pill */}
                <div className="bg-linear-to-br from-slate-900 to-amber-950 text-white p-6 rounded-2xl text-center min-w-[200px] shadow-md border border-amber-500/30">
                  <div className="text-xs text-amber-300 font-semibold uppercase tracking-wider">
                    Your Net Score
                  </div>
                  <div className="text-4xl font-extrabold text-amber-400 mt-1 font-mono">
                    {netScore} <span className="text-base text-slate-400 font-normal">/ {maxScore}</span>
                  </div>
                  <div className="text-[11px] text-slate-300 mt-1">
                    UPSC CSE Cut-off: ~88/200
                  </div>
                </div>
              </div>

              {/* Analytical Breakdown Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
                  <div className="text-xs text-slate-500">Attempted</div>
                  <div className="text-xl font-bold text-slate-800 mt-1">
                    {totalAttempted} / {test.questions.length}
                  </div>
                </div>
                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 text-center">
                  <div className="text-xs text-emerald-700">Correct (+{rawPositive.toFixed(1)})</div>
                  <div className="text-xl font-bold text-emerald-800 mt-1">
                    {totalCorrect}
                  </div>
                </div>
                <div className="bg-red-50 p-4 rounded-xl border border-red-200 text-center">
                  <div className="text-xs text-red-700">Incorrect (-{rawNegative.toFixed(2)})</div>
                  <div className="text-xl font-bold text-red-800 mt-1">
                    {totalIncorrect}
                  </div>
                </div>
                <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 text-center">
                  <div className="text-xs text-amber-800">Accuracy Rate</div>
                  <div className="text-xl font-bold text-amber-900 mt-1">
                    {accuracyPct}%
                  </div>
                </div>
              </div>

              {/* Performance Verdict Pill */}
              <div className="mt-6 p-4 rounded-xl bg-slate-900 text-white text-xs flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Award className="w-5 h-5 text-amber-400 shrink-0" />
                  <div>
                    <span className="font-bold text-amber-300">
                      {accuracyPct >= 70 ? 'Excellent Command!' : accuracyPct >= 50 ? 'Borderline Range' : 'Needs Systematic Revision'}
                    </span>
                    <p className="text-slate-300 text-[11px]">
                      Review the explanations and use your result to guide your next revision.
                    </p>
                  </div>
                </div>
                <button
                  onClick={onExit}
                  className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold px-4 py-2 rounded-lg text-xs whitespace-nowrap transition cursor-pointer"
                >
                  Return to Dashboard
                </button>
              </div>
            </div>

            {/* DETAILED QUESTION-BY-QUESTION SOLUTIONS */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 font-cinzel">
                    Question-wise Detailed Explanations & Rationales
                  </h3>
                  <p className="text-xs text-slate-500">
                    Learn elimination tricks, factual cross-verification, and official UPSC references.
                  </p>
                </div>

                {/* Filter Solutions */}
                <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 text-xs">
                  {(['all', 'correct', 'incorrect', 'unattempted'] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setReviewFilter(filter)}
                      className={`px-3 py-1 rounded-lg capitalize font-semibold transition cursor-pointer ${
                        reviewFilter === filter
                          ? 'bg-amber-600 text-white'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>

              {/* Solution Cards */}
              {test.questions.map((q, idx) => {
                const resp = responses[idx];
                const isCorrect = resp.selectedOption === q.correctOptionIndex;
                const isUnattempted = resp.selectedOption === null;

                if (reviewFilter === 'correct' && !isCorrect) return null;
                if (reviewFilter === 'incorrect' && (isCorrect || isUnattempted)) return null;
                if (reviewFilter === 'unattempted' && !isUnattempted) return null;

                return (
                  <div
                    key={q.id}
                    className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md">
                          Q {idx + 1}
                        </span>
                        <span className="font-semibold text-slate-600">[{q.subject} • {q.gsPaper}]</span>
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-500">{q.sourceReference}</span>
                      </div>

                      <div>
                        {isUnattempted ? (
                          <span className="bg-slate-100 text-slate-600 font-bold px-2.5 py-1 rounded text-[11px]">
                            Unattempted (0.00)
                          </span>
                        ) : isCorrect ? (
                          <span className="bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded text-[11px] flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Correct (+2.00)
                          </span>
                        ) : (
                          <span className="bg-red-100 text-red-800 font-bold px-2.5 py-1 rounded text-[11px] flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5 text-red-600" /> Incorrect (-{test.negativeMarksPerWrong})
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Question text */}
                    <div className="font-serif-academic text-slate-900 text-sm md:text-base leading-relaxed whitespace-pre-line">
                      {examLang === 'hi' ? q.questionHi : q.questionEn}
                    </div>

                    {/* Options Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {(examLang === 'hi' ? q.optionsHi : q.optionsEn).map((opt, optIdx) => {
                        const isCorrectOption = optIdx === q.correctOptionIndex;
                        const isChosenOption = resp.selectedOption === optIdx;

                        let styleClass = 'bg-slate-50 border-slate-200 text-slate-700';
                        if (isCorrectOption) {
                          styleClass = 'bg-emerald-50 border-emerald-500 text-emerald-900 font-semibold ring-1 ring-emerald-500';
                        } else if (isChosenOption && !isCorrectOption) {
                          styleClass = 'bg-red-50 border-red-400 text-red-900 line-through';
                        }

                        return (
                          <div
                            key={optIdx}
                            className={`p-3 rounded-xl border flex items-start gap-2 ${styleClass}`}
                          >
                            <span className="font-bold">
                              {['(a)', '(b)', '(c)', '(d)'][optIdx]}
                            </span>
                            <span>{opt}</span>
                            {isCorrectOption && <span className="ml-auto text-emerald-600 font-bold">✓ Correct</span>}
                            {isChosenOption && !isCorrectOption && <span className="ml-auto text-red-600 font-bold">✗ Your choice</span>}
                          </div>
                        );
                      })}
                    </div>

                    {/* Comprehensive Explanation */}
                    <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2 text-xs">
                      <div className="font-bold text-amber-900 flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-amber-700" />
                        <span>Official Detailed Explanation & Core Reference:</span>
                      </div>
                      <p className="font-serif-academic text-slate-800 leading-relaxed whitespace-pre-line text-xs md:text-sm">
                        {examLang === 'hi' ? q.explanationHi : q.explanationEn}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM SUBMISSION MODAL */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <h3 className="font-bold text-lg text-slate-900 font-cinzel">
              Submit Prelims Examination?
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to conclude the test? Once submitted, your answers will be finalized and evaluated against negative marking.
            </p>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-600">Total Questions:</span>
                <span className="font-bold">{test.questions.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Answered:</span>
                <span className="font-bold text-emerald-600">{answeredCount + markedAndAnsweredCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Marked for Review:</span>
                <span className="font-bold text-orange-600">{markedCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Unanswered / Not Visited:</span>
                <span className="font-bold text-red-600">{notAnsweredCount + unvisitedCount}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setShowSubmitModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-100 transition cursor-pointer"
              >
                Resume Test
              </button>
              <button
                onClick={handleSubmitTest}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition cursor-pointer shadow-md"
              >
                Yes, Submit Test
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

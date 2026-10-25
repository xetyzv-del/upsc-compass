import React, { useEffect, useState } from 'react';
import { 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Award, 
  ArrowRight, 
  ChevronRight, 
  ChevronLeft,
  Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { LanguageMode } from '../../types';
import { Question } from '../../types';
import { api } from '../../services/api';

interface DailyDrillModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: LanguageMode;
  onDrillComplete: () => void;
}

export const DailyDrillModal: React.FC<DailyDrillModalProps> = ({
  isOpen,
  onClose,
  lang,
  onDrillComplete
}) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [isCompleted, setIsCompleted] = useState(false);
  const [drillQuestions, setDrillQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setCurrentIdx(0);
    setSelectedAnswers({});
    setIsCompleted(false);
    setLoadError(null);
    setIsLoading(true);
    api.getQuestions()
      .then(questions => setDrillQuestions(questions.slice(0, 5)))
      .catch((error: unknown) => {
        setLoadError(error instanceof Error ? error.message : 'Could not load the daily questions.');
      })
      .finally(() => setIsLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const currentQ = drillQuestions[currentIdx];

  const handleSelect = (optIdx: number) => {
    if (isCompleted) return;
    setSelectedAnswers(prev => ({ ...prev, [currentIdx]: optIdx }));
  };

  const handleFinish = () => {
    setIsCompleted(true);
    onDrillComplete();
    confetti({
      particleCount: 90,
      spread: 60,
      origin: { y: 0.6 }
    });
  };

  let correctCount = 0;
  drillQuestions.forEach((q, idx) => {
    if (selectedAnswers[idx] === q.correctOptionIndex) {
      correctCount++;
    }
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 font-bold flex items-center justify-center text-sm">
              🎯
            </span>
            <div>
              <h3 className="font-bold text-sm text-slate-100 font-cinzel">
                {lang === 'hi' ? 'दैनिक अभ्यास क्विज (दैनिक 5 प्रश्न)' : 'Daily Prelims Drill (High-Yield 5 MCQs)'}
              </h3>
              <div className="text-[11px] text-amber-300">
                Sharpen active recall & maintain your daily streak
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex-1 p-8 flex items-center justify-center text-sm text-slate-500" role="status">
            Loading today&apos;s questions…
          </div>
        ) : loadError ? (
          <div className="flex-1 p-8 flex items-center justify-center text-sm text-red-700" role="alert">
            Could not load today&apos;s questions: {loadError}
          </div>
        ) : drillQuestions.length === 0 ? (
          <div className="flex-1 p-8 flex items-center justify-center text-sm text-slate-500">
            No questions are available. Please check back later.
          </div>
        ) : !isCompleted ? (
          <div className="flex-1 p-6 overflow-y-auto space-y-6">
            <div className="flex items-center justify-between text-xs font-semibold pb-3 border-b border-slate-100 text-slate-600">
              <span className="text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded font-bold">
                Question {currentIdx + 1} of {drillQuestions.length}
              </span>
              <span>{currentQ.subject} • {currentQ.gsPaper}</span>
              <span className="text-slate-400">{currentQ.difficulty}</span>
            </div>

            {/* Question Text */}
            <div className="font-serif-academic text-slate-900 text-base leading-relaxed whitespace-pre-line">
              {lang === 'hi' ? currentQ.questionHi : currentQ.questionEn}
            </div>

            {/* Options */}
            <div className="space-y-2.5 pt-2">
              {(lang === 'hi' ? currentQ.optionsHi : currentQ.optionsEn).map((opt, optIdx) => {
                const isChosen = selectedAnswers[currentIdx] === optIdx;
                return (
                  <div
                    key={optIdx}
                    onClick={() => handleSelect(optIdx)}
                    className={`p-3.5 rounded-xl border-2 transition cursor-pointer flex items-center gap-3 text-xs sm:text-sm ${
                      isChosen
                        ? 'bg-amber-50 border-amber-600 text-slate-900 font-semibold'
                        : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                      isChosen ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {['(a)', '(b)', '(c)', '(d)'][optIdx]}
                    </span>
                    <span>{opt}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* RESULT */
          <div className="flex-1 p-6 sm:p-8 overflow-y-auto text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto text-2xl">
              🏆
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-bold font-cinzel text-slate-900">
                Daily Drill Completed!
              </h3>
              <p className="text-xs text-slate-500">
                Your study streak has advanced! Keep up the daily discipline.
              </p>
            </div>

            <div className="p-5 bg-slate-900 text-white rounded-2xl max-w-sm mx-auto shadow-md">
              <div className="text-xs text-slate-300 uppercase">Score</div>
              <div className="text-3xl font-extrabold text-amber-400 font-mono mt-1">
                {correctCount} / {drillQuestions.length} Correct
              </div>
              <div className="text-xs text-emerald-400 mt-1 font-semibold">
                Accuracy: {Math.round((correctCount / drillQuestions.length) * 100)}%
              </div>
            </div>

            <div className="text-xs text-slate-600 max-w-md mx-auto">
              A focused daily set helps strengthen recall and elimination skills for the UPSC CSE Prelims.
            </div>
          </div>
        )}

        {/* Footer Nav */}
        <div className="p-4 px-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          {isLoading || loadError || drillQuestions.length === 0 ? (
            <button
              onClick={onClose}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition cursor-pointer"
            >
              Close
            </button>
          ) : !isCompleted ? (
            <>
              <button
                onClick={() => currentIdx > 0 && setCurrentIdx(currentIdx - 1)}
                disabled={currentIdx === 0}
                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 font-semibold disabled:opacity-40 cursor-pointer flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Previous
              </button>

              {currentIdx < drillQuestions.length - 1 ? (
                <button
                  onClick={() => setCurrentIdx(currentIdx + 1)}
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold cursor-pointer flex items-center gap-1 shadow-xs"
                >
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  onClick={handleFinish}
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer shadow-md"
                >
                  Complete Drill & Update Streak
                </button>
              )}
            </>
          ) : (
            <button
              onClick={onClose}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition cursor-pointer"
            >
              Close & Return
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

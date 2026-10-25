import React, { useState, useEffect } from 'react';
import { 
  PenLine, 
  Clock, 
  CheckCircle2, 
  Award, 
  FileCheck, 
  Sparkles, 
  ChevronRight, 
  Info, 
  Lightbulb,
  ArrowRight,
  Eye,
  RotateCcw
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { MainsQuestion, LanguageMode } from '../../types';

interface MainsTestWorkspaceProps {
  question: MainsQuestion;
  lang: LanguageMode;
  onBack: () => void;
}

export const MainsTestWorkspace: React.FC<MainsTestWorkspaceProps> = ({
  question,
  lang,
  onBack
}) => {
  const [aspirantAnswer, setAspirantAnswer] = useState('');
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(true);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [selfScore, setSelfScore] = useState<{
    intro: number;
    body: number;
    conclusion: number;
    presentation: number;
  }>({
    intro: 0,
    body: 0,
    conclusion: 0,
    presentation: 0
  });

  // Calculate words
  const wordCount = aspirantAnswer.trim() === '' ? 0 : aspirantAnswer.trim().split(/\s+/).length;

  useEffect(() => {
    let interval: any;
    if (isTimerRunning && !isSubmitted) {
      interval = setInterval(() => {
        setTimerSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, isSubmitted]);

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSubmitAnswer = () => {
    if (wordCount < 20) {
      alert('Please write at least 20 words before submitting your response for evaluation.');
      return;
    }
    setIsSubmitted(true);
    setIsTimerRunning(false);
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.6 }
    });
  };

  const totalCalculatedScore = selfScore.intro + selfScore.body + selfScore.conclusion + selfScore.presentation;
  const hasReferenceAnswer = Boolean(question.topperAnswer.answerHtml.trim());
  const wordStatusColor = 
    wordCount > question.wordLimit * 1.15 
      ? 'text-red-600' 
      : wordCount >= question.wordLimit * 0.8 
        ? 'text-emerald-600' 
        : 'text-amber-600';

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <button
            onClick={onBack}
            className="text-xs text-amber-700 hover:text-amber-800 font-bold mb-1 flex items-center gap-1 cursor-pointer"
          >
            ← Back to Mains Question Bank
          </button>
          <div className="flex items-center gap-2">
            <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-0.5 rounded border border-amber-300">
              {question.gsPaper} • {question.subject}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              Word Limit: {question.wordLimit} Words • Marks: {question.marks} Marks
            </span>
          </div>
        </div>

        {/* Live Timer & Word Counter Pill */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-900 text-white px-3 py-1.5 rounded-xl font-mono text-xs">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Time Elapsed: {formatTimer(timerSeconds)}</span>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-300 px-3 py-1.5 rounded-xl text-xs font-bold">
            <PenLine className="w-3.5 h-3.5 text-slate-600" />
            <span>Words:</span>
            <span className={wordStatusColor}>
              {wordCount} / {question.wordLimit}
            </span>
          </div>
        </div>
      </div>

      {/* QUESTION PROMPT CARD */}
      <div className="bg-linear-to-r from-amber-50/80 via-orange-50/50 to-white p-6 rounded-3xl border-2 border-amber-200/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-600" />
            UPSC CSE Mains Question Directive
          </span>
          <span className="text-xs font-semibold text-slate-600">{question.yearReference}</span>
        </div>

        <h2 className="text-lg md:text-xl font-bold font-serif-academic text-slate-900 leading-relaxed">
          {lang === 'hi' ? question.questionHi : question.questionEn}
        </h2>

        <div className="text-xs text-slate-600 font-sans flex items-center gap-2">
          <span className="font-semibold text-slate-700">Syllabus Mapping:</span>
          <span>{question.syllabusTheme}</span>
        </div>
      </div>

      {/* ANSWER WRITING WORKSPACE & EVALUATION */}
      {!isSubmitted ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Answer Canvas (Left 8 cols) */}
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3 text-xs text-slate-500">
                <span>Write your response directly below or structure using standard UPSC headings.</span>
                <span className="font-semibold text-amber-700">Recommended Time: ~{Math.round(question.marks * 0.7)} mins</span>
              </div>

              <textarea
                value={aspirantAnswer}
                onChange={(e) => setAspirantAnswer(e.target.value)}
                placeholder="Start with a concise definition or context (30-40 words)...

Subheading 1: Core Arguments / Legal & Policy Dimensions
- Point 1 (cite constitutional Article or Committee)
- Point 2 (mention data/case study)

Subheading 2: Challenges & Bottlenecks

Way Forward & Conclusion (25-30 words)..."
                className="w-full h-96 p-4 text-sm md:text-base font-serif-academic text-slate-800 leading-relaxed bg-slate-50/50 border border-slate-200 rounded-xl resize-y focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />

              <div className="flex items-center justify-between pt-3">
                <div className="text-xs text-slate-500">
                  {wordCount > question.wordLimit ? (
                    <span className="text-red-600 font-semibold">⚠️ Exceeding recommended word limit</span>
                  ) : (
                    <span>💡 Aim for ~{question.wordLimit} words. Keep sentences crisp and bulleted.</span>
                  )}
                </div>

                <button
                  onClick={handleSubmitAnswer}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-2.5 rounded-xl text-xs transition shadow-md cursor-pointer flex items-center gap-2"
                >
                  <FileCheck className="w-4 h-4" />
                  <span>Submit for Evaluation</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Mentorship & Structure Tips (Right 4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5 font-cinzel">
                <Lightbulb className="w-4 h-4 text-amber-600" />
                Examiner's Structuring Rubric
              </h3>
              <div className="space-y-2.5 text-xs text-slate-600">
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="font-bold text-slate-800 mb-0.5">1. Introduction (15%):</div>
                  <p>Define the key term or quote the recent judgment/policy.</p>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="font-bold text-slate-800 mb-0.5">2. Multi-dimensional Body (70%):</div>
                  <p>Political, Economic, Social, Ethical, and International angles.</p>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="font-bold text-slate-800 mb-0.5">3. Balanced Conclusion (15%):</div>
                  <p>Positive, futuristic resolution citing Law Commission or NITI Aayog.</p>
                </div>
              </div>
            </div>

            {question.topperAnswer.valueAddition.length > 0 && (
            <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200 text-xs text-amber-900 space-y-2">
              <div className="font-bold flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-700" />
                <span>Reference notes</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-amber-800 text-[11px] leading-relaxed">
                {question.topperAnswer.valueAddition.map((tip, i) => (
                  <li key={i}>{tip}</li>
                ))}
              </ul>
            </div>
            )}
          </div>
        </div>
      ) : (
        /* SUBMITTED ANSWER REVIEW */
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-md space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <div className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded-full text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Draft submitted</span>
                </div>
                <h3 className="text-xl font-bold font-cinzel text-slate-900 mt-2">
                  Submitted answer review
                </h3>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsSubmitted(false)}
                  className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Edit My Answer</span>
                </button>
              </div>
            </div>

            {/* Side-by-side comparison */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Aspirant's Answer */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 text-xs">
                  <span className="font-bold text-slate-800">Your Submitted Draft</span>
                  <span className="text-slate-500 font-mono">{wordCount} Words • {formatTimer(timerSeconds)}</span>
                </div>
                <div className="font-serif-academic text-slate-800 text-sm whitespace-pre-line leading-relaxed max-h-96 overflow-y-auto">
                  {aspirantAnswer}
                </div>
              </div>

              <div className="bg-amber-50/50 p-5 rounded-2xl border-2 border-amber-300 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-amber-200 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-amber-900">
                    <Award className="w-4 h-4 text-amber-700" />
                    <span>
                      {question.topperAnswer.topperName
                        ? `Reference answer by ${question.topperAnswer.topperName}`
                        : 'Published reference answer'}
                    </span>
                  </div>
                    {hasReferenceAnswer && (
                      <span className="bg-amber-200 text-amber-900 font-bold px-2 py-0.5 rounded text-[10px]">
                        Reference
                      </span>
                    )}
                  </div>

                  {hasReferenceAnswer ? (
                    <div
                      className="font-serif-academic text-slate-800 text-xs md:text-sm leading-relaxed max-h-96 overflow-y-auto space-y-2"
                      dangerouslySetInnerHTML={{ __html: question.topperAnswer.answerHtml }}
                    />
                  ) : (
                    <p className="text-xs text-amber-900">
                      No reference answer has been published for this question.
                    </p>
                  )}

                  <div className="border-t border-amber-200 pt-2 text-xs text-amber-900">
                    Your self-assessment: {totalCalculatedScore} / {question.marks}
                  </div>

                  {question.topperAnswer.flowchartTip && (
                    <div className="pt-2 border-t border-amber-200 text-xs text-amber-900">
                      <strong>Diagram / Flowchart Idea:</strong> {question.topperAnswer.flowchartTip}
                    </div>
                  )}
              </div>
            </div>

            {/* Self / Mentorship Rubric Scoring */}
            <div className="bg-slate-900 text-white p-6 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-amber-400 font-cinzel">
                    Your self-assessment
                  </h4>
                  <p className="text-xs text-slate-300">
                    This score is your own estimate; it is not an official evaluation.
                  </p>
                </div>
                <div className="bg-amber-500/20 text-amber-300 border border-amber-400/40 px-4 py-2 rounded-xl text-center">
                  <div className="text-[10px] text-slate-300 uppercase">Total Score</div>
                  <div className="text-xl font-bold font-mono text-amber-400">
                    {totalCalculatedScore} / {question.marks}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
                <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
                  <div className="font-bold text-slate-200">Introduction (Max {question.rubric.introMarks})</div>
                  <input
                    type="range"
                    min="0"
                    max={question.rubric.introMarks}
                    step="0.5"
                    value={selfScore.intro}
                    onChange={(e) => setSelfScore({ ...selfScore, intro: Number(e.target.value) })}
                    className="w-full mt-2 accent-amber-400"
                  />
                  <div className="text-amber-300 font-bold mt-1">{selfScore.intro} Marks</div>
                </div>

                <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
                  <div className="font-bold text-slate-200">Body & Substantiation (Max {question.rubric.bodyMarks})</div>
                  <input
                    type="range"
                    min="0"
                    max={question.rubric.bodyMarks}
                    step="0.5"
                    value={selfScore.body}
                    onChange={(e) => setSelfScore({ ...selfScore, body: Number(e.target.value) })}
                    className="w-full mt-2 accent-amber-400"
                  />
                  <div className="text-amber-300 font-bold mt-1">{selfScore.body} Marks</div>
                </div>

                <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
                  <div className="font-bold text-slate-200">Conclusion (Max {question.rubric.conclusionMarks})</div>
                  <input
                    type="range"
                    min="0"
                    max={question.rubric.conclusionMarks}
                    step="0.5"
                    value={selfScore.conclusion}
                    onChange={(e) => setSelfScore({ ...selfScore, conclusion: Number(e.target.value) })}
                    className="w-full mt-2 accent-amber-400"
                  />
                  <div className="text-amber-300 font-bold mt-1">{selfScore.conclusion} Marks</div>
                </div>

                <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
                  <div className="font-bold text-slate-200">Presentation & Diagram (Max {question.rubric.presentationMarks})</div>
                  <input
                    type="range"
                    min="0"
                    max={question.rubric.presentationMarks}
                    step="0.5"
                    value={selfScore.presentation}
                    onChange={(e) => setSelfScore({ ...selfScore, presentation: Number(e.target.value) })}
                    className="w-full mt-2 accent-amber-400"
                  />
                  <div className="text-amber-300 font-bold mt-1">{selfScore.presentation} Marks</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

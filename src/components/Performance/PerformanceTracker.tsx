import React, { useState } from 'react';
import { 
  AlertTriangle,
  BarChart3,
  Flame,
  Plus
} from 'lucide-react';
import { LanguageMode, SyllabusModule } from '../../types';
import { api } from '../../services/api';

interface PerformanceTrackerProps {
  lang: LanguageMode;
  refreshTrigger?: number;
}

interface PerformanceProfile {
  avgPrelimsScore: number | null;
  totalTestsAttempted: number;
  totalQuestionsAnswered: number;
  correctAnswers: number;
  totalTestTimeSeconds: number;
  streakDays: number;
  subjectMastery: {
    subject: string;
    accuracy: number;
    totalQuestions: number;
    status: string;
  }[];
}

export const PerformanceTracker: React.FC<PerformanceTrackerProps> = ({
  lang,
  refreshTrigger
}) => {
  const [syllabusModules, setSyllabusModules] = useState<SyllabusModule[]>([]);
  const [profile, setProfile] = useState<PerformanceProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeGsTab, setActiveGsTab] = useState<string>('gs1');

  // Interactive Cut-Off Simulator State
  const [simAttempts, setSimAttempts] = useState(82);
  const [simAccuracy, setSimAccuracy] = useState(72);

  React.useEffect(() => {
    setLoading(true);
    Promise.all([api.getSyllabusModules(), api.getAspirantProfile()])
      .then(([mods, prof]) => {
        setSyllabusModules(mods);
        setProfile(prof);
        if (mods.length > 0 && !activeGsTab) {
          setActiveGsTab(mods[0].id);
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [refreshTrigger]);

  const toggleTopicCompletion = (moduleId: string, topicId: string) => {
    const mod = syllabusModules.find(m => m.id === moduleId);
    const topic = mod?.topics.find(t => t.id === topicId);
    const newStatus = !topic?.completed;

    setSyllabusModules(prev =>
      prev.map(m => {
        if (m.id !== moduleId) return m;
        return {
          ...m,
          topics: m.topics.map(top =>
            top.id === topicId ? { ...top, completed: newStatus } : top
          )
        };
      })
    );

    api.updateTopicCompletion(moduleId, topicId, newStatus).catch(console.error);
  };

  const incrementRevision = (moduleId: string, topicId: string) => {
    setSyllabusModules(prev =>
      prev.map(m => {
        if (m.id !== moduleId) return m;
        return {
          ...m,
          topics: m.topics.map(top =>
            top.id === topicId ? { ...top, revisionCount: top.revisionCount + 1 } : top
          )
        };
      })
    );

    api.incrementTopicRevision(moduleId, topicId).catch(console.error);
  };

  // Calculate overall syllabus stats
  let totalTopics = 0;
  let completedTopics = 0;
  syllabusModules.forEach(mod => {
    mod.topics?.forEach(t => {
      totalTopics++;
      if (t.completed) completedTopics++;
    });
  });
  const syllabusCompletionPct = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  // Simulator calculations
  const correctCount = Math.round(simAttempts * (simAccuracy / 100));
  const incorrectCount = simAttempts - correctCount;
  const simulatedScore = Number((correctCount * 2.0 - incorrectCount * 0.66).toFixed(2));
  const prelims2024Cutoff = 87.98;
  const isCutoffCleared = simulatedScore >= prelims2024Cutoff;

  const currentModule = syllabusModules.find(m => m.id === activeGsTab) || syllabusModules[0] || null;
  const averageScore = profile?.avgPrelimsScore;
  const subjectMastery = profile?.subjectMastery || [];
  const weakestSubject = [...subjectMastery].sort((a, b) => a.accuracy - b.accuracy)[0];

  return (
    <div className="space-y-8 pb-12">
      {/* Top Banner */}
      <div className="relative rounded-3xl bg-linear-to-r from-slate-900 via-slate-800 to-amber-950 p-6 md:p-8 text-white overflow-hidden shadow-xl border border-slate-700">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 bg-amber-500/20 text-amber-300 px-3 py-1 rounded-full text-xs font-bold border border-amber-500/30">
            <BarChart3 className="w-4 h-4" />
            <span>Your practice analytics</span>
          </div>

          <h1 className="text-2xl md:text-3xl font-extrabold font-cinzel tracking-wide text-white">
            {lang === 'hi' ? 'व्यक्तिगत प्रगति एवं कमजोर विषय निदान' : 'Personalized Performance Tracking & Weakness Diagnosis'}
          </h1>

          <p className="text-sm md:text-base text-slate-300 leading-relaxed">
            {lang === 'hi'
              ? 'विषयवार सटीकता विश्लेषण (राजव्यवस्था, अर्थव्यवस्था, पर्यावरण), संघ लोक सेवा आयोग कट-ऑफ सिमुलेटर, तथा बहु-स्तरीय पाठ्यक्रम पुनरावृत्ति ट्रैकर।'
              : 'Subject-wise accuracy breakdown, real-time UPSC cut-off risk simulator, and interactive multi-tier syllabus coverage & revision tracker.'}
          </p>
        </div>
      </div>

      {/* TOP KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="text-xs text-slate-500 font-medium">Syllabus Progress</div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-slate-900">{syllabusCompletionPct}%</span>
            <span className="text-xs text-slate-500">{completedTopics}/{totalTopics} Topics</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div 
              className="bg-amber-600 h-full rounded-full transition-all duration-500" 
              style={{ width: `${syllabusCompletionPct}%` }}
            />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="text-xs text-slate-500 font-medium">Average Mock Score</div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-slate-900">{averageScore ?? '—'}</span>
            {averageScore !== null && averageScore !== undefined && <span className="text-xs text-slate-500">{profile?.totalTestsAttempted} tests</span>}
          </div>
          <div className="text-[11px] text-slate-500">{profile?.totalTestsAttempted ? 'Based on your completed tests' : 'Complete a test to see your score'}</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="text-xs text-slate-500 font-medium">Questions Answered</div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-amber-700">{profile?.totalQuestionsAnswered ?? 0}</span>
            <span className="text-xs text-slate-500">{profile?.correctAnswers ?? 0} correct</span>
          </div>
          <div className="text-[11px] text-slate-500">Across your completed tests</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="text-xs text-slate-500 font-medium">Practice Streak</div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-orange-600 flex items-center gap-1.5">
              <Flame className="w-6 h-6 fill-orange-500" />
              {profile?.streakDays ?? 0} Days
            </span>
            <span className="text-xs text-slate-500">{Math.round((profile?.totalTestTimeSeconds ?? 0) / 60)} min total</span>
          </div>
          <div className="text-[11px] text-slate-500">Based on completed test dates</div>
        </div>
      </div>

      {/* SUBJECT MASTERY & WEAKNESS MATRIX */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-slate-900 font-cinzel">
              Subject-wise Accuracy & Weakness Diagnostics
            </h3>
            <p className="text-xs text-slate-500">
              Based on your submitted test answers ({profile?.totalQuestionsAnswered ?? 0} total).
            </p>
          </div>

          {subjectMastery.length > 0 && <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1 text-emerald-700 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Strong (75%+)
            </span>
            <span className="flex items-center gap-1 text-amber-700 font-bold">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span> Moderate (65-74%)
            </span>
            <span className="flex items-center gap-1 text-red-700 font-bold">
              <span className="w-2 h-2 rounded-full bg-red-500"></span> Needs Revision (&lt;65%)
            </span>
          </div>}
        </div>

        {subjectMastery.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
            Subject accuracy will appear after you complete a test with questions assigned to subjects.
          </div>
        ) : <div className="space-y-4">
          {subjectMastery.map((sub, idx) => {
            let barColor = 'bg-emerald-600';
            let badgeBg = 'bg-emerald-100 text-emerald-800';

            if (sub.accuracy < 65) {
              barColor = 'bg-red-500';
              badgeBg = 'bg-red-100 text-red-800';
            } else if (sub.accuracy < 75) {
              barColor = 'bg-amber-500';
              badgeBg = 'bg-amber-100 text-amber-800';
            }

            return (
              <div key={idx} className="space-y-1.5 p-3 rounded-xl bg-slate-50/70 border border-slate-200">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 font-bold text-slate-800">
                    <span>{sub.subject}</span>
                    <span className={`text-[10px] px-2 py-0.2 rounded-full font-bold ${badgeBg}`}>
                      {sub.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-slate-600">
                    <span>{sub.totalQuestions} Questions Done</span>
                    <span className="font-bold text-slate-900 font-mono text-sm">{sub.accuracy}% Accuracy</span>
                  </div>
                </div>

                <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                    style={{ width: `${sub.accuracy}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>}

        {/* Actionable Diagnosis Recommendation Alert */}
        {weakestSubject && <div className="p-4 bg-amber-50/80 border border-amber-300 rounded-2xl flex items-start gap-3 text-xs text-amber-950">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold text-amber-900">
              High-Yield Tactical Recommendation:
            </span>
            <p className="text-amber-900 leading-relaxed">
              Your lowest recorded accuracy is in <strong>{weakestSubject.subject}</strong> at <strong>{weakestSubject.accuracy}%</strong>. Review these answers and revise the topic before your next test.
            </p>
          </div>
        </div>}
      </div>

      {/* UPSC CUT-OFF RISK CALCULATOR & SIMULATOR */}
      <div className="bg-slate-900 text-white p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-amber-400 font-cinzel">
              UPSC Prelims Score & Negative Marking Simulator
            </h3>
            <p className="text-xs text-slate-300">
              Experiment with different attempt counts and accuracy assumptions to calculate your net buffer against historical UPSC cut-offs.
            </p>
          </div>

          {/* Result Tag */}
          <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700 text-center min-w-[220px]">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Simulated Net Score</div>
            <div className={`text-3xl font-extrabold font-mono mt-0.5 ${isCutoffCleared ? 'text-emerald-400' : 'text-red-400'}`}>
              {simulatedScore} <span className="text-xs text-slate-400 font-normal">/ 200</span>
            </div>
            <div className="text-[11px] mt-1 font-semibold">
              {isCutoffCleared ? (
                <span className="text-emerald-400">✓ Safe (+{(simulatedScore - prelims2024Cutoff).toFixed(1)} pts above 2024 cut-off)</span>
              ) : (
                <span className="text-red-400">✗ Below 2024 Cut-off (87.98)</span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs">
          {/* Slider 1: Attempts */}
          <div className="space-y-3 bg-slate-800/60 p-4 rounded-2xl border border-slate-700">
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-200">Total Questions Attempted:</span>
              <span className="font-mono text-base font-bold text-amber-400">{simAttempts} / 100</span>
            </div>
            <input
              type="range"
              min="50"
              max="100"
              value={simAttempts}
              onChange={(e) => setSimAttempts(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>Conservative (50)</span>
              <span>Recommended (80-88)</span>
              <span>Aggressive (100)</span>
            </div>
          </div>

          {/* Slider 2: Accuracy */}
          <div className="space-y-3 bg-slate-800/60 p-4 rounded-2xl border border-slate-700">
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-200">Expected Accuracy Rate:</span>
              <span className="font-mono text-base font-bold text-amber-400">{simAccuracy}%</span>
            </div>
            <input
              type="range"
              min="50"
              max="95"
              value={simAccuracy}
              onChange={(e) => setSimAccuracy(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>Risky (50%)</span>
              <span>Good (70-75%)</span>
              <span>Elite (85%+)</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 text-center text-xs pt-2">
          <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-700">
            <div className="text-slate-400">Correct Answers</div>
            <div className="text-base font-bold text-emerald-400 mt-1">{correctCount} (+{(correctCount * 2).toFixed(1)})</div>
          </div>
          <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-700">
            <div className="text-slate-400">Wrong Answers</div>
            <div className="text-base font-bold text-red-400 mt-1">{incorrectCount} (-{(incorrectCount * 0.66).toFixed(2)})</div>
          </div>
          <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-700">
            <div className="text-slate-400">Unattempted</div>
            <div className="text-base font-bold text-slate-300 mt-1">{100 - simAttempts} (0.00)</div>
          </div>
        </div>
      </div>

      {/* INTERACTIVE SYLLABUS TRACKER */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-slate-900 font-cinzel">
              Official UPSC Syllabus Coverage & Multi-Revision Tracker
            </h3>
            <p className="text-xs text-slate-500">
              Check off completed topics and record your revision cycles (Aim for at least 3 revisions before Prelims).
            </p>
          </div>

          {/* GS Paper selector */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            {syllabusModules.map((mod) => (
              <button
                key={mod.id}
                onClick={() => setActiveGsTab(mod.id)}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  activeGsTab === mod.id
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {mod.gsPaper}
              </button>
            ))}
          </div>
        </div>

        {/* Current Module Topics List or Empty State */}
        {!currentModule ? (
          <div className="bg-slate-50 rounded-2xl border border-dashed border-slate-300 p-8 text-center space-y-2">
            <div className="text-xl">📑</div>
            <div className="font-bold text-slate-800 text-sm">No syllabus topics available</div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Syllabus topics will appear here when they are available.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="font-bold text-sm text-slate-800 pb-2">
              {currentModule.title}
            </div>

            {currentModule.topics?.map((topic) => (
              <div
                key={topic.id}
                className={`p-4 rounded-xl border transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                  topic.completed
                    ? 'bg-emerald-50/40 border-emerald-200'
                    : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={topic.completed}
                    onChange={() => toggleTopicCompletion(currentModule.id, topic.id)}
                    className="w-5 h-5 rounded accent-emerald-600 cursor-pointer"
                  />
                  <div>
                    <span className={`text-sm font-semibold ${topic.completed ? 'line-through text-slate-500' : 'text-slate-800'}`}>
                      {topic.name}
                    </span>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                      <span className={`font-bold ${topic.priority === 'High' ? 'text-red-600' : 'text-slate-500'}`}>
                        Priority: {topic.priority}
                      </span>
                      <span>•</span>
                      <span>Revisions: <strong className="text-amber-800">{topic.revisionCount} cycles</strong></span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => incrementRevision(currentModule.id, topic.id)}
                    className="flex items-center gap-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold px-2.5 py-1 rounded-lg transition cursor-pointer"
                    title="Increment revision count"
                  >
                    <Plus className="w-3.5 h-3.5 text-amber-600" />
                    <span>Log Revision</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

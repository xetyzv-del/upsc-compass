import React from 'react';
import { 
  Play, 
  Flame, 
  Clock, 
  BookOpen, 
  FileCheck2, 
  TrendingUp, 
  PenLine, 
  Award, 
  ArrowRight, 
} from 'lucide-react';
import { NavTab, LanguageMode, LiveClass, LibraryItem, MainsQuestion, Question, ForumPost } from '../../types';
import { api } from '../../services/api';
import type { AspirantProfile } from '../../services/api';

interface DashboardOverviewProps {
  setActiveTab: (tab: NavTab) => void;
  lang: LanguageMode;
  streakCount: number;
  onOpenQuickDrill: () => void;
  refreshTrigger?: number;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  setActiveTab,
  lang,
  streakCount,
  onOpenQuickDrill,
  refreshTrigger
}) => {
  const [liveClasses, setLiveClasses] = React.useState<LiveClass[]>([]);
  const [libraryItems, setLibraryItems] = React.useState<LibraryItem[]>([]);
  const [mainsQuestions, setMainsQuestions] = React.useState<MainsQuestion[]>([]);
  const [forumPosts, setForumPosts] = React.useState<ForumPost[]>([]);
  const [dailyQuestions, setDailyQuestions] = React.useState<Question[]>([]);
  const [dailyFocusSlide, setDailyFocusSlide] = React.useState(0);
  const [selectedDailyAnswer, setSelectedDailyAnswer] = React.useState<number | null>(null);
  const [dailyAnswerSubmitted, setDailyAnswerSubmitted] = React.useState(false);
  const [profile, setProfile] = React.useState<AspirantProfile | null>(null);

  React.useEffect(() => {
    Promise.all([
      api.getLiveClasses(),
      api.getLibraryItems(),
      api.getMainsQuestions(),
      api.getQuestions(),
      api.getAspirantProfile(),
      api.getForumPosts()
    ])
      .then(([classes, lib, mains, questions, prof, posts]) => {
        setLiveClasses(classes);
        setLibraryItems(lib);
        setMainsQuestions(mains);
        setDailyQuestions(questions);
        setProfile(prof);
        setForumPosts(posts);
      })
      .catch(console.error);
  }, [refreshTrigger]);

  const liveClass = liveClasses.find(c => c.status === 'live') || liveClasses.find(c => c.status === 'upcoming') || null;
  const todayEditorial = libraryItems.find(item => item.type === 'Daily Editorial') || null;
  const dailyMainsQ = mainsQuestions[0] || null;
  const dailyQuestion = dailyQuestions[0] || null;
  const subjectMastery = profile?.subjectMastery.filter(subject => subject.totalQuestions > 0) || [];
  const strongestSubject = [...subjectMastery].sort((first, second) => second.accuracy - first.accuracy)[0];
  const weakestSubject = [...subjectMastery].sort((first, second) => first.accuracy - second.accuracy)[0];

  const learnerName = typeof profile?.name === 'string' ? profile.name : 'Learner';

  return (
    <div className="space-y-8 pb-12">
      {/* Learner greeting */}
      <div className="relative rounded-3xl bg-linear-to-r from-slate-900 via-slate-800 to-amber-950 p-6 md:p-8 text-white overflow-hidden shadow-xl border border-slate-700">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col items-start gap-5">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="bg-amber-400 text-slate-950 font-cinzel font-bold text-xs px-2.5 py-0.5 rounded shadow-xs">
                सत्यमेव जयते
              </span>
              <span className="text-xs text-amber-300">
                {lang === 'hi' ? `नमस्ते, ${learnerName}` : `Good to see you, ${learnerName}`}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-wide text-white">
              {lang === 'hi' 
                ? 'आपकी सिविल सेवा तैयारी, एक ही जगह' 
                : 'Your UPSC preparation, in one place'}
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {lang === 'hi'
                ? 'कक्षाओं, अभ्यास प्रश्नों और अध्ययन सामग्री के साथ अपनी तैयारी को व्यवस्थित रखें।'
                : 'Keep your learning on track with classes, practice questions and study resources.'}
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-300">
              <span className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1 rounded-lg border border-slate-700">
                <Flame className="w-3.5 h-3.5 text-orange-400" />
                Streak: <strong className="text-orange-400">{streakCount} Days Active</strong>
              </span>
            </div>
            <button
              onClick={onOpenQuickDrill}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-md transition hover:bg-amber-400"
            >
              <span>🎯</span>
              <span>{lang === 'hi' ? 'दैनिक क्विज शुरू करें' : 'Start Today\'s Drill'}</span>
            </button>
          </div>
        </div>
      </div>

      <section className="overflow-hidden rounded-3xl border border-amber-200 bg-white shadow-sm" aria-label="Daily study focus">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Daily study focus</p>
            <h2 className="text-lg font-bold text-slate-900">A fresh start for today</h2>
          </div>
          <div className="flex items-center gap-2">
            {['Editorial', 'Mains question', 'One MCQ'].map((label, index) => (
              <button key={label} onClick={() => { setDailyFocusSlide(index); setSelectedDailyAnswer(null); setDailyAnswerSubmitted(false); }}
                aria-pressed={dailyFocusSlide === index}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${dailyFocusSlide === index ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="min-h-44 p-5 md:p-7">
          {dailyFocusSlide === 0 && (
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
              <div className="max-w-3xl space-y-2">
                <span className="text-xs font-bold text-amber-700">{todayEditorial?.source || 'Daily editorial'}</span>
                <h3 className="text-xl font-bold text-slate-900">{todayEditorial?.title || 'Today’s editorial will appear here'}</h3>
                <p className="text-sm leading-relaxed text-slate-600">{todayEditorial?.summary || 'Check back when a daily editorial is published.'}</p>
                {todayEditorial?.attachmentUrls?.filter(url => /\.(jpe?g|png|webp)$/i.test(url)).map(url =>
                  <img key={url} src={url} alt="Editorial attachment" className="mt-3 max-h-48 rounded-xl object-contain" />
                )}
                {todayEditorial?.pdfUrl && <a className="text-sm font-semibold text-amber-700 underline" href={todayEditorial.pdfUrl} target="_blank" rel="noreferrer">Open attached PDF</a>}
              </div>
              <button onClick={() => setActiveTab('library')} className="shrink-0 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-amber-500">Open editorial</button>
            </div>
          )}
          {dailyFocusSlide === 1 && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-amber-700">
                <span>{dailyMainsQ?.gsPaper || 'Mains practice'}</span>
                {dailyMainsQ && <span>{dailyMainsQ.marks} marks · {dailyMainsQ.wordLimit} words</span>}
              </div>
              <h3 className="max-w-4xl text-lg font-semibold leading-relaxed text-slate-900">
                {dailyMainsQ ? (lang === 'hi' ? dailyMainsQ.questionHi : dailyMainsQ.questionEn) : 'Today’s Mains question will appear here.'}
              </h3>
              {dailyMainsQ?.attachmentUrls?.map(url => /\.(jpe?g|png|webp)$/i.test(url)
                ? <img key={url} src={url} alt="Mains resource attachment" className="max-h-48 rounded-xl object-contain" />
                : <a key={url} href={url} target="_blank" rel="noreferrer" className="mr-3 text-sm font-semibold text-amber-700 underline">Open attached resource</a>
              )}
              <button onClick={() => setActiveTab('performance')} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Practice answer writing</button>
            </div>
          )}
          {dailyFocusSlide === 2 && (
            dailyQuestion ? (
              <div className="mx-auto max-w-4xl space-y-4">
                <div className="text-xs font-bold text-amber-700">{dailyQuestion.subject} · {dailyQuestion.gsPaper}</div>
                <h3 className="text-base font-semibold leading-relaxed text-slate-900">{lang === 'hi' ? dailyQuestion.questionHi : dailyQuestion.questionEn}</h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {(lang === 'hi' ? dailyQuestion.optionsHi : dailyQuestion.optionsEn).map((option, index) => (
                    <button key={`${dailyQuestion.id}-${index}`} disabled={dailyAnswerSubmitted} onClick={() => setSelectedDailyAnswer(index)}
                      className={`rounded-xl border p-3 text-left text-sm ${dailyAnswerSubmitted && index === dailyQuestion.correctOptionIndex ? 'border-emerald-500 bg-emerald-50' : selectedDailyAnswer === index ? 'border-amber-500 bg-amber-50' : 'border-slate-200 hover:border-amber-300'}`}>
                      {option}
                    </button>
                  ))}
                </div>
                {!dailyAnswerSubmitted ? (
                  <button disabled={selectedDailyAnswer === null} onClick={() => setDailyAnswerSubmitted(true)} className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Check answer</button>
                ) : (
                  <p className="text-sm font-semibold text-slate-700">{selectedDailyAnswer === dailyQuestion.correctOptionIndex ? 'Correct.' : 'Not quite.'} {lang === 'hi' ? dailyQuestion.explanationHi : dailyQuestion.explanationEn}</p>
                )}
              </div>
            ) : <p className="text-sm text-slate-500">No practice question is available yet.</p>
          )}
        </div>
      </section>

      {/* TODAY'S LIVE STREAM TICKET BANNER */}
      {liveClass && (
        <div className={`bg-linear-to-r ${liveClass.status === 'live' ? 'from-red-950 border-red-500/40' : 'from-amber-950 border-amber-500/40'} via-slate-900 to-slate-900 border rounded-3xl p-6 shadow-md text-white flex flex-col md:flex-row items-center justify-between gap-6`}>
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <span className={`flex items-center gap-1.5 ${liveClass.status === 'live' ? 'bg-red-600 animate-pulse' : 'bg-amber-500 text-slate-950'} text-white text-[11px] font-extrabold px-3 py-0.5 rounded-full uppercase tracking-wider shadow-xs`}>
                <span className="w-2 h-2 rounded-full bg-white"></span>
                {liveClass.status === 'live' ? 'Live class' : 'Upcoming class'}
              </span>
              <span className="text-xs text-amber-300 font-mono">
                {liveClass.batch}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold font-sans">
              {lang === 'hi' ? liveClass.hindiTitle : liveClass.title}
            </h2>
            <div className="flex items-center gap-4 text-xs text-slate-300">
              <span>Faculty: <strong className="text-amber-400">{liveClass.facultyName}</strong></span>
              <span>•</span>
              <span>{liveClass.startTime}</span>
            </div>
          </div>

          <button
            onClick={() => setActiveTab('live')}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-3 rounded-xl text-xs shadow-lg transition cursor-pointer whitespace-nowrap"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>{lang === 'hi' ? 'लाइव क्लास रूम खोलें' : 'Enter Live Classroom'}</span>
          </button>
        </div>
      )}

      {/* 3-PILLAR ACTION TILES (Mock Tests, Digital Library, Performance) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Mock Test Card */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 flex flex-col justify-between shadow-xs hover:shadow-md transition space-y-4">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
              <FileCheck2 className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Prelims CBT & Mains</span>
              <h3 className="font-bold text-slate-900 text-base mt-0.5">
                UPSC Practice Tests
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Take published practice tests and write Mains responses with a self-assessment rubric.
            </p>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1">
              <div className="flex justify-between">
                <span>Latest test score:</span>
                <span className="font-bold text-slate-900">
                  {profile?.latestAttempt
                    ? `${profile.latestAttempt.score} / ${profile.latestAttempt.totalMarks}`
                    : 'No test attempts yet'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Tests attempted:</span>
                <span className="font-bold text-slate-900">{profile?.totalTestsAttempted ?? 0}</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setActiveTab('mock-tests')}
            className="w-full bg-slate-900 hover:bg-amber-600 text-white font-bold py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
          >
            <span>Open Mock Test Center</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Digital Library Card */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 flex flex-col justify-between shadow-xs hover:shadow-md transition space-y-4">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Curated Gyan Kosh</span>
              <h3 className="font-bold text-slate-900 text-base mt-0.5">
                Daily Editorial & Monthly Dossiers
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              The Hindu & Indian Express editorial breakdowns with Prelims pointers, Mains questions, and Laxmikanth revision notes.
            </p>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1">
              <div className="text-[10px] font-bold text-slate-500 uppercase">Today's Hot Editorial:</div>
              <div className="font-semibold text-slate-900 truncate">
                {todayEditorial ? todayEditorial.title : 'No editorial published yet'}
              </div>
            </div>
          </div>

          <button
            onClick={() => setActiveTab('library')}
            className="w-full bg-slate-900 hover:bg-emerald-600 text-white font-bold py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
          >
            <span>Browse Digital Library</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Performance & Syllabus Card */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 flex flex-col justify-between shadow-xs hover:shadow-md transition space-y-4">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-800 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-orange-700" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-orange-700 uppercase tracking-wider">Analytics & Diagnosis</span>
              <h3 className="font-bold text-slate-900 text-base mt-0.5">
                Syllabus & Weakness Tracker
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Track multi-cycle revision counts across GS 1-4, test accuracy diagnostic heatmap, and cut-off safety simulator.
            </p>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1">
              <div className="flex justify-between">
                <span>Strongest Subject:</span>
                <span className="font-bold text-emerald-700">
                  {strongestSubject ? `${strongestSubject.subject} (${strongestSubject.accuracy}%)` : 'No test data yet'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Priority Revision:</span>
                <span className="font-bold text-red-600">
                  {weakestSubject ? `${weakestSubject.subject} (${weakestSubject.accuracy}%)` : 'No test data yet'}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setActiveTab('performance')}
            className="w-full bg-slate-900 hover:bg-orange-600 text-white font-bold py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
          >
            <span>View Performance Dashboard</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* DAILY MAINS ANSWER & FORUM TRENDING SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Daily Mains Question of the Day (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          {dailyMainsQ ? (
            <>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-0.5 rounded border border-amber-300">
                    Daily Mains Answer of the Day
                  </span>
                  <span className="text-xs text-slate-500">{dailyMainsQ.gsPaper}</span>
                </div>
                <span className="text-xs font-bold text-slate-700">{dailyMainsQ.marks} Marks • {dailyMainsQ.wordLimit} Words</span>
              </div>

              <h3 className="font-serif-academic text-base sm:text-lg font-bold text-slate-900 leading-relaxed">
                {lang === 'hi' ? dailyMainsQ.questionHi : dailyMainsQ.questionEn}
              </h3>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
                <div className="font-bold text-slate-800 flex items-center gap-1">
                  <Award className="w-4 h-4 text-amber-600" />
                  <span>
                    {dailyMainsQ.topperAnswer?.answerHtml?.trim()
                      ? `Reference answer${dailyMainsQ.topperAnswer.topperName ? ` by ${dailyMainsQ.topperAnswer.topperName}` : ''} available`
                      : 'No reference answer has been added'}
                  </span>
                </div>
                <p className="text-slate-600">
                  Write your draft and compare it with the published reference answer when one is available.
                </p>
              </div>

              <button
                onClick={() => setActiveTab('mock-tests')}
                className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <PenLine className="w-4 h-4" />
                <span>Write Answer in Mains Workspace</span>
              </button>
            </>
          ) : (
            <div className="p-8 text-center space-y-2">
              <div className="text-xl">✍️</div>
              <div className="font-bold text-sm text-slate-800">No Mains question published yet</div>
              <p className="text-xs text-slate-500">A new practice question will appear here when it is ready.</p>
            </div>
          )}
        </div>

        {/* Manthan Forum Trending Feed (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="font-bold text-sm text-slate-900 font-cinzel">
                Manthan Peer Discussions
              </span>
              <button
                onClick={() => setActiveTab('forum')}
                className="text-xs text-amber-700 font-bold hover:underline"
              >
                View All →
              </button>
            </div>

            {forumPosts.length ? (
              <div className="space-y-3 text-xs">
                {forumPosts.slice(0, 2).map(post => (
                  <button
                    key={post.id}
                    onClick={() => setActiveTab('forum')}
                    className="w-full space-y-1 rounded-xl border border-slate-200 bg-slate-50 p-3 text-left transition hover:bg-amber-50/50"
                  >
                    <div className="text-[10px] font-bold text-amber-800">{post.category}</div>
                    <div className="line-clamp-1 font-semibold text-slate-800">{post.title}</div>
                    <div className="text-[11px] text-slate-500">
                      {post.upvotes} upvotes · {post.repliesCount} replies
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="rounded-xl bg-slate-50 p-4 text-center text-xs text-slate-500">
                No discussions have been posted yet.
              </p>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 text-xs text-slate-500 text-center">
            Discussions posted by your learning community appear here.
          </div>
        </div>
      </div>
    </div>
  );
};

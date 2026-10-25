import React, { useState, useEffect } from 'react';
import { 
  Video, 
  Play, 
  Calendar, 
  Clock, 
  Search, 
  Download, 
  CheckCircle2, 
  GraduationCap, 
  Sparkles,
  BookMarked
} from 'lucide-react';
import { LiveClass, LanguageMode } from '../../types';
import { api } from '../../services/api';
import { ClassPlayerModal } from './ClassPlayerModal';

interface LiveClassHubProps {
  lang: LanguageMode;
  refreshTrigger?: number;
}

export const LiveClassHub: React.FC<LiveClassHubProps> = ({ lang, refreshTrigger }) => {
  const [classes, setClasses] = useState<LiveClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGsPaper, setSelectedGsPaper] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activePlayerClass, setActivePlayerClass] = useState<LiveClass | null>(null);

  useEffect(() => {
    setLoading(true);
    api.getLiveClasses()
      .then(data => setClasses(data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [refreshTrigger]);

  const filteredClasses = classes.filter((cls) => {
    const matchesGs = selectedGsPaper === 'All' || cls.gsPaper === selectedGsPaper;
    const matchesStatus = selectedStatus === 'all' || cls.status === selectedStatus;
    const matchesSearch = 
      cls.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cls.facultyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cls.subject.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesGs && matchesStatus && matchesSearch;
  });

  const liveNowClass = classes.find(c => c.status === 'live');

  return (
    <div className="space-y-8 pb-12">
      {/* Live Classes Header Banner */}
      <div className="relative rounded-3xl bg-linear-to-r from-slate-900 via-slate-800 to-amber-950 p-6 md:p-8 text-white overflow-hidden shadow-xl border border-slate-700">
        <div className="absolute -right-12 -bottom-12 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 bg-amber-500/20 text-amber-300 px-3 py-1 rounded-full text-xs font-bold border border-amber-500/30">
            <GraduationCap className="w-4 h-4" />
            <span>Sankalp Live Classroom • Samarth Foundation 2026</span>
          </div>

          <h1 className="text-2xl md:text-3xl font-extrabold font-cinzel tracking-wide text-white">
            {lang === 'hi' ? 'लाइव कक्षाएं एवं दैनिक व्याख्यान' : 'Live Interactive Lectures & Faculty Masterclasses'}
          </h1>

          <p className="text-sm md:text-base text-slate-300 leading-relaxed">
            {lang === 'hi'
              ? 'वरिष्ठ पूर्व-प्रशासनिक अधिकारियों और विषय विशेषज्ञों के साथ दोतरफा संवाद, त्वरित शंका समाधान और वास्तविक समय में व्याख्यान नोट्स डाउनलोड की सुविधा।'
              : 'Direct two-way classroom interaction with retired bureaucrats, UPSC toppers, and subject faculties. Featuring synchronized lecture slides and peer doubt upvoting.'}
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <div className="flex items-center gap-2 text-xs text-amber-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Full Syllabus Coverage (Prelims + Mains)</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-amber-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Daily Class Notes & Model Answer Handouts</span>
            </div>
          </div>
        </div>
      </div>

      {/* FEATURED LIVE CLASS BANNER (IF STREAMING) */}
      {liveNowClass && (
        <div className="bg-red-50/60 border-2 border-red-500/40 rounded-3xl p-6 shadow-lg relative overflow-hidden">
          <div className="flex flex-col lg:flex-row items-center gap-6 justify-between">
            <div className="space-y-3 flex-1">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 bg-red-600 text-white text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-wider animate-pulse shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-white"></span>
                  STREAMING LIVE NOW
                </span>
                <span className="text-xs font-bold text-slate-700 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                  {liveNowClass.batch}
                </span>
              </div>

              <h2 className="text-xl md:text-2xl font-bold text-slate-900 font-sans">
                {lang === 'hi' ? liveNowClass.hindiTitle : liveNowClass.title}
              </h2>

              <p className="text-sm text-slate-600 line-clamp-2">
                {liveNowClass.description}
              </p>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-700">
                <span className="font-semibold text-slate-900">
                  Faculty: <span className="text-amber-800">{liveNowClass.facultyName}</span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  {liveNowClass.startTime}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
              <button
                onClick={() => setActivePlayerClass(liveNowClass)}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-3.5 rounded-xl shadow-lg transition cursor-pointer hover:scale-105 active:scale-95"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>{lang === 'hi' ? 'लाइव क्लास से जुड़ें' : 'Join Live Stream'}</span>
              </button>
              <button
                onClick={() => alert(`Downloading handout: ${liveNowClass.lectureNotesPdf}`)}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white hover:bg-slate-100 text-slate-800 font-semibold px-4 py-3.5 rounded-xl border border-slate-300 transition cursor-pointer text-xs"
              >
                <Download className="w-4 h-4 text-amber-700" />
                <span>Handout PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FILTER & SEARCH BAR */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Search */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search lectures, topics, faculty..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            {['all', 'live', 'upcoming', 'completed'].map((status) => (
              <button
                key={status}
                onClick={() => setSelectedStatus(status)}
                className={`px-3 py-1.5 rounded-lg capitalize transition cursor-pointer ${
                  selectedStatus === status
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {status === 'all' ? 'All Classes' : status}
              </button>
            ))}
          </div>
        </div>

        {/* GS Paper Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-slate-500 font-medium whitespace-nowrap">Filter by GS:</span>
          {['All', 'GS-1', 'GS-2', 'GS-3', 'GS-4', 'CSAT', 'Optional'].map((paper) => (
            <button
              key={paper}
              onClick={() => setSelectedGsPaper(paper)}
              className={`px-3 py-1 rounded-full font-semibold transition whitespace-nowrap cursor-pointer ${
                selectedGsPaper === paper
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {paper}
            </button>
          ))}
        </div>
      </div>

      {/* LECTURES GRID OR EMPTY STATE */}
      {classes.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-12 text-center space-y-4">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-2xl text-slate-400">
            📡
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-800 font-cinzel">
              {lang === 'hi' ? 'अभी कोई कक्षा प्रकाशित नहीं हुई है' : 'No classes published yet'}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {lang === 'hi' ? 'नई कक्षा का शेड्यूल और लिंक यहाँ दिखाई देगा।' : 'New class schedules and joining links will appear here.'}
            </p>
          </div>
        </div>
      ) : filteredClasses.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-xs text-slate-500">
          No live classes match your selected filter criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClasses.map((cls) => (
            <div
              key={cls.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition overflow-hidden flex flex-col group"
            >
              {/* Thumbnail Header */}
              <div className="relative h-44 overflow-hidden bg-slate-900">
                {cls.coverImage ? (
                  <img
                    src={cls.coverImage}
                    alt={cls.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500 opacity-90"
                  />
                ) : (
                  <div className="h-full w-full bg-linear-to-br from-slate-800 to-slate-950" aria-hidden="true" />
                )}
                <div className="absolute inset-0 bg-linear-to-t from-slate-950 via-slate-950/40 to-transparent"></div>

                {/* Status Tag */}
                <div className="absolute top-3 left-3">
                  {cls.status === 'live' && (
                    <span className="flex items-center gap-1.5 bg-red-600 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider animate-pulse shadow-md">
                      <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                      Live Now
                    </span>
                  )}
                  {cls.status === 'upcoming' && (
                    <span className="flex items-center gap-1 bg-amber-500 text-slate-950 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase shadow-md">
                      <Calendar className="w-3 h-3" />
                      Upcoming
                    </span>
                  )}
                  {cls.status === 'completed' && (
                    <span className="flex items-center gap-1 bg-slate-700/80 text-white text-[10px] font-medium px-2.5 py-0.5 rounded-full backdrop-blur-xs">
                      Recorded Archive
                    </span>
                  )}
                </div>

                {/* GS Paper Badge */}
                <div className="absolute top-3 right-3 bg-slate-900/80 border border-slate-700 text-amber-300 text-[11px] font-bold px-2.5 py-0.5 rounded-lg backdrop-blur-xs">
                  {cls.gsPaper}
                </div>

                {/* Timing */}
                <div className="absolute bottom-3 left-3 text-white text-xs flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span className="font-semibold">{cls.startTime}</span>
                  <span className="text-slate-400">({cls.duration})</span>
                </div>
              </div>

              {/* Content Body */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">
                    {cls.subject} • {cls.batch}
                  </div>
                  <h3 className="font-bold text-slate-900 text-base leading-snug group-hover:text-amber-800 transition line-clamp-2">
                    {lang === 'hi' ? cls.hindiTitle : cls.title}
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-2">
                    {cls.description}
                  </p>
                </div>

                {/* Faculty Info & Action */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-800">{cls.facultyName}</div>
                    <div className="text-[10px] text-slate-500 line-clamp-1">{cls.facultyTitle}</div>
                  </div>

                  <button
                    onClick={() => setActivePlayerClass(cls)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      cls.status === 'live'
                        ? 'bg-red-600 hover:bg-red-700 text-white shadow-xs'
                        : 'bg-slate-900 hover:bg-slate-800 text-white'
                    }`}
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{cls.status === 'live' ? 'Join Stream' : 'Watch Lecture'}</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ACTIVE PLAYER MODAL */}
      {activePlayerClass && (
        <ClassPlayerModal
          liveClass={activePlayerClass}
          onClose={() => setActivePlayerClass(null)}
          lang={lang}
        />
      )}
    </div>
  );
};

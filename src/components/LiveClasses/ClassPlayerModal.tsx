import React, { useState } from 'react';
import { 
  X, 
  Send, 
  ThumbsUp, 
  FileDown, 
  MessageSquare, 
  HelpCircle, 
  Radio, 
  Bookmark, 
  PenTool,
  CheckCircle,
  Share2
} from 'lucide-react';
import { LiveClass, LanguageMode } from '../../types';

interface ClassPlayerModalProps {
  liveClass: LiveClass;
  onClose: () => void;
  lang: LanguageMode;
}

function getYouTubeEmbedUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (!['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be', 'youtube-nocookie.com'].includes(url.hostname.toLowerCase())) return null;
    const id = url.hostname === 'youtu.be'
      ? url.pathname.slice(1)
      : url.searchParams.get('v') || url.pathname.match(/^\/(?:embed|live|shorts)\/([^/?]+)/)?.[1];
    return id && /^[\w-]{11}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0` : null;
  } catch {
    return null;
  }
}

export const ClassPlayerModal: React.FC<ClassPlayerModalProps> = ({
  liveClass,
  onClose,
  lang
}) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'doubts' | 'notes'>('chat');
  const [messages, setMessages] = useState(liveClass.chatMessages);
  const [inputMessage, setInputMessage] = useState('');
  const [isDoubtMode, setIsDoubtMode] = useState(false);
  const [userNotes, setUserNotes] = useState(
    '# GS Paper 2 - West Asia & India Stakes\n- Key straits: Bab-el-Mandeb, Strait of Hormuz\n- IMEC corridor involves rail-maritime transit\n- Quote Raisina dialogue maritime statement for mains.'
  );
  const [notesSaved, setNotesSaved] = useState(false);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const newMsg = {
      id: Date.now().toString(),
      sender: 'Aarav Singhania (You)',
      avatar: 'AS',
      text: inputMessage,
      time: 'Just now',
      isDoubt: isDoubtMode,
      upvotes: 0
    };

    setMessages(prev => [...prev, newMsg]);
    setInputMessage('');
  };

  const handleUpvoteDoubt = (id: string) => {
    setMessages(prev =>
      prev.map(m => m.id === id ? { ...m, upvotes: (m.upvotes || 0) + 1 } : m)
    );
  };

  const doubtsList = messages.filter(m => m.isDoubt);

  const handleSaveNotes = () => {
    setNotesSaved(true);
    setTimeout(() => setNotesSaved(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-2 sm:p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-7xl h-[94vh] rounded-2xl flex flex-col overflow-hidden shadow-2xl">
        {/* Modal Top Bar */}
        <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <span className={`flex items-center gap-1.5 ${liveClass.status === 'live' ? 'bg-red-600 animate-pulse' : 'bg-slate-700'} text-white text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wider`}>
              <Radio className="w-3.5 h-3.5" />
              {liveClass.status === 'live' ? 'Live Lecture' : liveClass.status === 'completed' ? 'Class recording' : 'Upcoming class'}
            </span>
            <div className="border-l border-slate-800 pl-3">
              <h2 className="text-sm font-bold truncate max-w-xl text-slate-100">
                {lang === 'hi' ? liveClass.hindiTitle : liveClass.title}
              </h2>
              <p className="text-xs text-amber-400">
                Faculty: {liveClass.facultyName} • {liveClass.batch}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Main Area: Video Player (Left) + Interactive Sideboard (Right) */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden bg-slate-950">
          {/* Video Player Canvas */}
          <div className="lg:col-span-8 flex flex-col bg-black relative border-b lg:border-b-0 lg:border-r border-slate-800">
            <div className="flex flex-1 items-center justify-center bg-slate-950 p-5 text-center text-white">
              {liveClass.streamUrl && liveClass.streamProvider === 'youtube' && getYouTubeEmbedUrl(liveClass.streamUrl) ? (
                <iframe
                  src={getYouTubeEmbedUrl(liveClass.streamUrl) || undefined}
                  title={liveClass.title}
                  className="h-full min-h-64 w-full rounded-xl"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                />
              ) : liveClass.streamUrl && /^https:\/\//i.test(liveClass.streamUrl) ? (
                <div className="max-w-md space-y-4">
                  <Radio className="mx-auto h-10 w-10 text-amber-400" />
                  <h3 className="text-lg font-bold">{liveClass.streamProvider === 'zoom' ? 'Join on Zoom' : liveClass.streamProvider === 'google-meet' ? 'Join on Google Meet' : 'Open class stream'}</h3>
                  <p className="text-sm text-slate-300">This class opens on its streaming platform in a new tab. Sign in to that platform if prompted.</p>
                  <a href={liveClass.streamUrl} target="_blank" rel="noopener noreferrer" className="inline-flex rounded-xl bg-amber-500 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-amber-400">Join class</a>
                </div>
              ) : (
                <div className="max-w-md space-y-2">
                  <Radio className="mx-auto h-10 w-10 text-slate-500" />
                  <h3 className="text-lg font-bold">Class link not available</h3>
                  <p className="text-sm text-slate-400">The class organizer has not added a stream or meeting link yet.</p>
                </div>
              )}
            </div>

            {/* Video Controls Footer */}
            <div className="bg-slate-950 px-4 py-3 border-t border-slate-800 flex items-center justify-between text-white text-xs">
              <div className="flex items-center gap-4">
                <div className={`flex items-center gap-1.5 font-bold ${liveClass.status === 'live' ? 'text-red-500' : 'text-amber-400'}`}>
                  <span className={`w-2.5 h-2.5 rounded-full ${liveClass.status === 'live' ? 'bg-red-500 animate-pulse' : 'bg-amber-400'}`}></span>
                  <span>{liveClass.status === 'live' ? 'LIVE' : liveClass.status === 'completed' ? 'RECORDED' : 'SCHEDULED'}</span>
                </div>
                <div className="text-slate-400">{liveClass.duration}</div>
              </div>

              <div className="flex items-center gap-3">
                {liveClass.lectureNotesPdf && (
                <a href={liveClass.lectureNotesPdf} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700 transition">
                  <FileDown className="w-3.5 h-3.5 text-amber-400" />
                  <span>Download Handout PDF</span>
                </a>
                )}
              </div>
            </div>
          </div>

          {/* Interactive Sidebar: Chat, Doubts & Personal Notes (Right) */}
          <div className="lg:col-span-4 flex flex-col bg-slate-900 border-slate-800 h-full overflow-hidden">
            {/* Sidebar Tabs */}
            <div className="grid grid-cols-3 bg-slate-950 border-b border-slate-800 text-xs">
              <button
                onClick={() => setActiveTab('chat')}
                className={`py-3 font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  activeTab === 'chat'
                    ? 'text-amber-400 border-b-2 border-amber-400 bg-slate-900/80'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Live Chat</span>
              </button>
              <button
                onClick={() => setActiveTab('doubts')}
                className={`py-3 font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  activeTab === 'doubts'
                    ? 'text-amber-400 border-b-2 border-amber-400 bg-slate-900/80'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Doubt Box ({doubtsList.length})</span>
              </button>
              <button
                onClick={() => setActiveTab('notes')}
                className={`py-3 font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  activeTab === 'notes'
                    ? 'text-amber-400 border-b-2 border-amber-400 bg-slate-900/80'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <PenTool className="w-3.5 h-3.5" />
                <span>My Notes</span>
              </button>
            </div>

            {/* TAB CONTENT */}
            {activeTab === 'chat' && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 p-3 overflow-y-auto space-y-3">
                  <div className="p-2 bg-slate-800/80 rounded-lg text-slate-300 text-xs border border-slate-700/60 flex items-center gap-2">
                    <span className="text-amber-400">📌</span>
                    <span>Moderator: Keep discussion strictly aligned with UPSC GS-2 Syllabus. Faculty answers doubts at 11:15 AM.</span>
                  </div>

                  {messages.map((m) => (
                    <div 
                      key={m.id} 
                      className={`p-2.5 rounded-xl text-xs space-y-1 ${
                        m.isFaculty 
                          ? 'bg-amber-950/60 border border-amber-500/50 text-amber-100' 
                          : m.isDoubt 
                            ? 'bg-slate-800 border-l-4 border-amber-400 text-slate-200' 
                            : 'bg-slate-800/60 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold flex items-center gap-1">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                            m.isFaculty ? 'bg-amber-500 text-slate-950' : 'bg-slate-700 text-amber-300'
                          }`}>
                            {m.avatar}
                          </span>
                          <span className={m.isFaculty ? 'text-amber-400' : 'text-slate-200'}>
                            {m.sender}
                          </span>
                        </span>
                        <span className="text-[10px] text-slate-500">{m.time}</span>
                      </div>
                      <p className="leading-relaxed pl-6">{m.text}</p>
                    </div>
                  ))}
                </div>

                {/* Input Area */}
                <form onSubmit={handleSendMessage} className="p-3 bg-slate-950 border-t border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <label className="flex items-center gap-1.5 cursor-pointer hover:text-amber-400">
                      <input 
                        type="checkbox" 
                        checked={isDoubtMode} 
                        onChange={(e) => setIsDoubtMode(e.target.checked)}
                        className="rounded accent-amber-500"
                      />
                      <span>Mark as faculty question / doubt</span>
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      placeholder={isDoubtMode ? "Type your doubt for Dr. Verma..." : "Ask in live chat..."}
                      className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
                    />
                    <button
                      type="submit"
                      className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-2 rounded-lg text-xs transition flex items-center justify-center cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </form>
              </div>
            )}

            {activeTab === 'doubts' && (
              <div className="flex-1 flex flex-col p-3 overflow-y-auto space-y-3">
                <div className="text-xs text-slate-400 pb-2 border-b border-slate-800 flex items-center justify-between">
                  <span>Questions submitted to faculty</span>
                  <span className="text-amber-400 font-semibold">{doubtsList.length} Active Doubts</span>
                </div>

                {doubtsList.map((d) => (
                  <div key={d.id} className="p-3 bg-slate-800 rounded-xl border border-slate-700 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-amber-300">{d.sender}</span>
                      <button
                        onClick={() => handleUpvoteDoubt(d.id)}
                        className="flex items-center gap-1 bg-slate-700 hover:bg-slate-600 text-slate-200 px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer transition"
                      >
                        <ThumbsUp className="w-3 h-3 text-amber-400" />
                        <span>{d.upvotes || 0}</span>
                      </button>
                    </div>
                    <p className="text-slate-200 leading-relaxed">{d.text}</p>
                    <div className="text-[10px] text-slate-500 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      <span>Faculty queue position: #1</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'notes' && (
              <div className="flex-1 flex flex-col p-3 overflow-hidden">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2">
                  <span className="text-xs text-slate-400 font-semibold">Live Lecture Scratchpad</span>
                  <button
                    onClick={handleSaveNotes}
                    className="flex items-center gap-1 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold px-2.5 py-1 rounded transition cursor-pointer"
                  >
                    {notesSaved ? (
                      <>
                        <CheckCircle className="w-3 h-3" />
                        <span>Saved to Vault!</span>
                      </>
                    ) : (
                      <>
                        <Bookmark className="w-3 h-3" />
                        <span>Save Notes</span>
                      </>
                    )}
                  </button>
                </div>

                <textarea
                  value={userNotes}
                  onChange={(e) => setUserNotes(e.target.value)}
                  className="flex-1 w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 font-mono leading-relaxed resize-none focus:outline-none focus:border-amber-500"
                  placeholder="Take timestamped notes here..."
                />
                <div className="text-[10px] text-slate-500 mt-2">
                  Notes are automatically linked to this lecture and saved in your Digital Library under Personal Vault.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

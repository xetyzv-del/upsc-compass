import React, { useState } from 'react';
import { 
  BookOpen, 
  Search, 
  Download, 
  Bookmark, 
  FileText, 
  Calendar, 
  Clock, 
  Share2, 
  Tag, 
  CheckCircle2, 
  X, 
  Sparkles,
  ExternalLink,
  BookMarked
} from 'lucide-react';
import { LibraryItem, LanguageMode } from '../../types';
import { api } from '../../services/api';

interface DigitalLibraryHubProps {
  lang: LanguageMode;
  refreshTrigger?: number;
}

export const DigitalLibraryHub: React.FC<DigitalLibraryHubProps> = ({ lang, refreshTrigger }) => {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>('All');
  const [selectedPaper, setSelectedPaper] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [readingItem, setReadingItem] = useState<LibraryItem | null>(null);

  React.useEffect(() => {
    setLoading(true);
    api.getLibraryItems()
      .then(data => setItems(data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [refreshTrigger]);

  const toggleBookmark = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, isBookmarked: !item.isBookmarked } : item
      )
    );
  };

  const filteredItems = items.filter(item => {
    const matchesType = selectedType === 'All' || item.type === selectedType;
    const matchesPaper = selectedPaper === 'All' || item.gsPaper === selectedPaper;
    const matchesSearch = 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesType && matchesPaper && matchesSearch;
  });

  return (
    <div className="space-y-8 pb-12">
      {/* Header Banner */}
      <div className="relative rounded-3xl bg-linear-to-r from-slate-900 via-slate-800 to-amber-950 p-6 md:p-8 text-white overflow-hidden shadow-xl border border-slate-700">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 bg-amber-500/20 text-amber-300 px-3 py-1 rounded-full text-xs font-bold border border-amber-500/30">
            <BookOpen className="w-4 h-4" />
            <span>Sankalp Digital Gyan Kosh • Civil Services Repository</span>
          </div>

          <h1 className="text-2xl md:text-3xl font-extrabold font-cinzel tracking-wide text-white">
            {lang === 'hi' ? 'डिजिटल लाइब्रेरी एवं समसामयिकी संग्रह' : 'Digital Library & Current Affairs Dossiers'}
          </h1>

          <p className="text-sm md:text-base text-slate-300 leading-relaxed">
            {lang === 'hi'
              ? 'द हिंदू और इंडियन एक्सप्रेस का दैनिक संपादकीय विश्लेषण (प्रारंभिक एवं मुख्य परीक्षा दृष्टिकोण के साथ), दृष्टि एवं विजन शैली की मासिक पत्रिकाएं, एनसीईआरटी एवं मानक संदर्भ पुस्तकों (लक्ष्मीकांत, स्पेक्ट्रम) के संक्षिप्त नोट्स।'
              : 'Daily The Hindu & Indian Express editorial analysis, monthly current affairs dossiers, NCERT summaries, standard book key notes (Laxmikanth, Spectrum, Economy), and PIB bulletins.'}
          </p>
        </div>
      </div>

      {/* FILTER & SEARCH */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Search */}
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search dossiers, editorials, topics, Laxmikanth..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* GS Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
            <span className="text-slate-500 font-medium">GS Paper:</span>
            {['All', 'GS-1', 'GS-2', 'GS-3', 'GS-4'].map((paper) => (
              <button
                key={paper}
                onClick={() => setSelectedPaper(paper)}
                className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
                  selectedPaper === paper
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {paper}
              </button>
            ))}
          </div>
        </div>

        {/* Content Type Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-slate-500 font-medium whitespace-nowrap">Format:</span>
          {['All', 'Daily Editorial', 'Monthly Magazine', 'Static Note', 'Standard Book Note', 'PIB Digest'].map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-3 py-1 rounded-full font-semibold transition whitespace-nowrap cursor-pointer ${
                selectedType === type
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* ITEMS LIST OR EMPTY STATE */}
      {items.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-12 text-center space-y-4">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-2xl text-slate-400">
            📚
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-800 font-cinzel">
              {lang === 'hi' ? 'अध्ययन सामग्री जल्द उपलब्ध होगी' : 'Your study library is ready'}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {lang === 'hi' ? 'नई संपादकीय सामग्री, नोट्स और पत्रिकाएँ प्रकाशित होने पर यहाँ दिखाई देंगी।' : 'New editorials, notes and magazines will appear here when published.'}
            </p>
          </div>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-xs text-slate-500">
          No library dossiers match your selected filter criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              onClick={() => setReadingItem(item)}
              className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between shadow-xs hover:shadow-md transition cursor-pointer group space-y-4"
            >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="bg-amber-100 text-amber-800 text-[11px] font-bold px-2.5 py-0.5 rounded-md border border-amber-300">
                    {item.type}
                  </span>
                  <span className="text-slate-500 text-xs font-semibold">
                    {item.source}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded text-[11px]">
                    {item.gsPaper}
                  </span>
                  <button
                    onClick={(e) => toggleBookmark(item.id, e)}
                    className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-amber-600 transition"
                  >
                    <Bookmark className={`w-4 h-4 ${item.isBookmarked ? 'fill-amber-500 text-amber-500' : ''}`} />
                  </button>
                </div>
              </div>

              <h3 className="font-bold text-slate-900 text-base group-hover:text-amber-800 transition leading-snug font-sans">
                {item.title}
              </h3>

              <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                {item.summary}
              </p>

              {item.attachmentUrls?.filter(url => /\.(jpe?g|png|webp)$/i.test(url)).map(url => (
                <img key={url} src={url} alt={`${item.title} attachment`} className="max-h-48 w-full rounded-xl object-contain" />
              ))}
              {(item.pdfUrl || item.attachmentUrls?.find(url => url.toLowerCase().endsWith('.pdf'))) && (
                <a href={item.pdfUrl || item.attachmentUrls?.find(url => url.toLowerCase().endsWith('.pdf'))}
                  target="_blank" rel="noreferrer" onClick={event => event.stopPropagation()}
                  className="inline-flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800 hover:bg-amber-100">
                  <Download className="h-4 w-4" /> Open PDF
                </a>
              )}

              {/* Prelims Fast Fact Highlight */}
              {item.prelimsPointers[0] && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1">
                  <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-600" />
                    <span>Prelims Pointer:</span>
                  </div>
                  <p className="line-clamp-2 text-slate-700 text-[11px]">
                    {item.prelimsPointers[0]}
                  </p>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {item.date}
                </span>
                <span>•</span>
                {item.readingTimeMinutes > 0 ? (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {item.readingTimeMinutes} min read
                  </span>
                ) : item.pdfUrl ? <span>PDF resource</span> : null}
              </div>

              <span className="text-amber-700 font-bold flex items-center gap-1 group-hover:translate-x-1 transition">
                Read Dossier →
              </span>
            </div>
          </div>
        ))}
      </div>
      )}

      {/* FULL READER MODAL */}
      {readingItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-5 px-6 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <span className="bg-amber-400 text-slate-950 font-bold text-xs px-2.5 py-0.5 rounded">
                  {readingItem.type}
                </span>
                <span className="text-xs text-slate-300">
                  {readingItem.source} • {readingItem.date}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {(readingItem.pdfUrl || readingItem.attachmentUrls?.find(url => url.toLowerCase().endsWith('.pdf'))) && (
                <a
                  href={readingItem.pdfUrl || readingItem.attachmentUrls?.find(url => url.toLowerCase().endsWith('.pdf'))}
                  target="_blank" rel="noreferrer"
                  className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                >
                  <Download className="w-3.5 h-3.5 text-amber-400" />
                  <span>Download PDF</span>
                </a>
                )}
                <button
                  onClick={() => setReadingItem(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body Scroll */}
            <div className="flex-1 p-6 sm:p-8 overflow-y-auto space-y-6">
              <div className="space-y-2">
                <div className="text-xs font-bold text-amber-700 uppercase tracking-wider">
                  {readingItem.gsPaper} • {readingItem.subject}
                </div>
                <h2 className="text-xl sm:text-2xl font-bold font-serif-academic text-slate-900 leading-snug">
                  {readingItem.title}
                </h2>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  {readingItem.readingTimeMinutes > 0 ? <span>Estimated Reading Time: {readingItem.readingTimeMinutes} Minutes</span> : <span>Study resource</span>}
                  <span>•</span>
                  <span>Syllabus Aligned</span>
                </div>
              </div>

              {(readingItem.type !== 'Static Note' && readingItem.type !== 'Monthly Magazine') && (
              <>
              {/* High-yield Prelims Pointers Box */}
              <div className="bg-amber-50/80 border-2 border-amber-300 rounded-2xl p-5 space-y-3">
                <div className="font-bold text-amber-950 text-sm flex items-center gap-2 font-cinzel">
                  <Sparkles className="w-4 h-4 text-amber-700" />
                  <span>High-Yield Prelims Pointers (Quick Revision)</span>
                </div>
                <ul className="space-y-2 text-xs text-amber-900">
                  {readingItem.prelimsPointers.map((ptr, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="font-bold text-amber-700">✓</span>
                      <span>{ptr}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Mains Analytical Angle Box */}
              <div className="bg-slate-900 text-white rounded-2xl p-5 space-y-2">
                <div className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-amber-400" />
                  <span>Mains Examination Perspective & Probable Question</span>
                </div>
                <p className="font-serif-academic text-slate-200 text-sm leading-relaxed">
                  “{readingItem.mainsAngle}”
                </p>
              </div>

              {/* Full Article Text */}
              <div className="space-y-4 pt-2">
                <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider text-slate-700">
                  Detailed Editorial / Analytical Breakdown
                </h3>
                <div className="font-serif-academic text-slate-800 text-base leading-relaxed whitespace-pre-line space-y-4">
                  {readingItem.fullContent}
                </div>
              </div>
              </>
              )}

              {readingItem.attachmentUrls?.map(url => /\.(jpe?g|png|webp)$/i.test(url)
                ? <img key={url} src={url} alt={`${readingItem.title} attachment`} className="max-h-96 rounded-xl object-contain" />
                : <a key={url} href={url} target="_blank" rel="noreferrer" className="inline-block text-sm font-bold text-amber-700 underline">Open attached resource</a>
              )}

              {/* Tags */}
              <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">Tagged Topics:</span>
                {readingItem.tags.map((t, idx) => (
                  <span key={idx} className="bg-slate-100 text-slate-700 text-xs px-2.5 py-1 rounded-full font-medium">
                    #{t}
                  </span>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 p-4 px-6 border-t border-slate-200 flex items-center justify-between text-xs">
              <span className="text-slate-500">
                Saved in your Sankalp study vault. Highlighted text persists across sessions.
              </span>
              <button
                onClick={() => setReadingItem(null)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-semibold px-4 py-2 rounded-xl transition cursor-pointer"
              >
                Close Article
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

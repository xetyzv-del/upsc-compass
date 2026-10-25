import React, { useState } from 'react';
import { 
  MessageSquare, 
  ThumbsUp, 
  MessageCircle, 
  Tag, 
  Search, 
  PlusCircle, 
  CheckCircle2, 
  Award, 
  Send, 
  X, 
  Filter,
  Sparkles,
  HelpCircle
} from 'lucide-react';
import { ForumPost, LanguageMode } from '../../types';
import { api } from '../../services/api';

interface DiscussionForumHubProps {
  lang: LanguageMode;
  refreshTrigger?: number;
}

export const DiscussionForumHub: React.FC<DiscussionForumHubProps> = ({ lang, refreshTrigger }) => {
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [replyInput, setReplyInput] = useState('');

  // New post modal form state
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<ForumPost['category']>('GS-2');
  const [newContent, setNewContent] = useState('');
  const [newTags, setNewTags] = useState('Polity, Strategy');

  React.useEffect(() => {
    setLoading(true);
    api.getForumPosts()
      .then(data => {
        setPosts(data);
        if (data.length > 0 && !expandedPostId) {
          setExpandedPostId(data[0].id);
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [refreshTrigger]);

  const handleUpvote = (postId: string) => {
    setPosts(prev =>
      prev.map(p => {
        if (p.id === postId) {
          const hasUpvoted = p.hasUpvoted;
          return {
            ...p,
            upvotes: hasUpvoted ? p.upvotes - 1 : p.upvotes + 1,
            hasUpvoted: !hasUpvoted
          };
        }
        return p;
      })
    );
    api.upvoteForumPost(postId).catch(console.error);
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    try {
      const created = await api.createForumPost({
        title: newTitle,
        category: newCategory,
        content: newContent,
        tags: newTags.split(',').map(t => t.trim()).filter(Boolean),
        author: {
          name: 'Aarav Singhania',
          role: 'Aspirant',
          avatarBg: 'bg-amber-600'
        }
      });
      setPosts([created, ...posts]);
      setNewTitle('');
      setNewContent('');
      setShowCreateModal(false);
      setExpandedPostId(created.id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddReply = async (postId: string) => {
    if (!replyInput.trim()) return;

    const repObj = {
      author: {
        name: 'Aarav Singhania',
        role: 'Aspirant (You)',
        avatarBg: 'bg-amber-600'
      },
      content: replyInput
    };

    try {
      const newReply = await api.addForumReply(postId, repObj);
      setPosts(prev =>
        prev.map(p => {
          if (p.id === postId) {
            return {
              ...p,
              repliesCount: p.repliesCount + 1,
              replies: [...(p.replies || []), newReply]
            };
          }
          return p;
        })
      );
      setReplyInput('');
    } catch (err) {
      console.error(err);
    }
  };

  const filteredPosts = posts.filter(p => {
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    const matchesSearch = 
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-8 pb-12">
      {/* Top Banner */}
      <div className="relative rounded-3xl bg-linear-to-r from-slate-900 via-slate-800 to-amber-950 p-6 md:p-8 text-white overflow-hidden shadow-xl border border-slate-700">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 bg-amber-500/20 text-amber-300 px-3 py-1 rounded-full text-xs font-bold border border-amber-500/30">
            <MessageSquare className="w-4 h-4" />
            <span>Manthan Aspirant Community & Peer Review Network</span>
          </div>

          <h1 className="text-2xl md:text-3xl font-extrabold font-cinzel tracking-wide text-white">
            {lang === 'hi' ? 'मंथन: सिविल सेवा अभ्यर्थी संवाद मंच' : 'Integrated Discussion Forums & Peer Network'}
          </h1>

          <p className="text-sm md:text-base text-slate-300 leading-relaxed">
            {lang === 'hi'
              ? 'सामान्य अध्ययन के प्रश्नपत्रों, प्रारंभिक परीक्षा रणनीतियों, दैनिक उत्तर लेखन की सहकर्मी समीक्षा (Peer Review), और यूपीएससी टॉपर्स व शिक्षकों द्वारा प्रमाणित समाधान।'
              : 'Collaborative debate and peer reviews across GS-1 through GS-4, Mains answer evaluations, Prelims elimination strategies, and faculty-endorsed solutions.'}
          </p>

          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-xs transition cursor-pointer shadow-md mt-2"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{lang === 'hi' ? 'नया प्रश्न या चर्चा शुरू करें' : 'Start New Discussion / Ask Question'}</span>
          </button>
        </div>
      </div>

      {/* SEARCH & CATEGORY FILTER */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Search */}
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search discussions, topics, keywords..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium">Sort:</span>
            <span className="bg-slate-100 text-slate-800 font-semibold px-3 py-1.5 rounded-lg border border-slate-200">
              🔥 Trending & Faculty Endorsed
            </span>
          </div>
        </div>

        {/* Categories */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-slate-500 font-medium whitespace-nowrap">Topic Filter:</span>
          {['All', 'GS-1', 'GS-2', 'GS-3', 'GS-4', 'Prelims Strategy', 'Mains Evaluation', 'Optional'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-full font-semibold transition whitespace-nowrap cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* DISCUSSIONS LIST OR EMPTY STATE */}
      {posts.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-12 text-center space-y-4">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-2xl text-slate-400">
            💬
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-800 font-cinzel">
              {lang === 'hi' ? 'अभी कोई चर्चा नहीं है' : 'No discussions yet'}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Start a discussion to ask a question or share an idea with other learners.
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-xl text-xs transition cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Post First Doubt</span>
          </button>
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-xs text-slate-500">
          No discussions match your filter criteria.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPosts.map((post) => {
          const isExpanded = expandedPostId === post.id;

          return (
            <div
              key={post.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden transition"
            >
              {/* Post Header & Main Card */}
              <div className="p-5 sm:p-6 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  {/* Left: Author & Category */}
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full ${post.author.avatarBg} text-white font-bold flex items-center justify-center text-xs shadow-xs`}>
                      {post.author.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-xs sm:text-sm">{post.author.name}</span>
                        <span className="text-[10px] bg-slate-100 text-slate-600 font-medium px-2 py-0.2 rounded-full border border-slate-200">
                          {post.author.role}
                        </span>
                        {post.isFacultyEndorsed && (
                          <span className="flex items-center gap-1 bg-amber-100 text-amber-900 text-[10px] font-bold px-2 py-0.2 rounded-full border border-amber-300">
                            <Award className="w-3 h-3 text-amber-700" />
                            Faculty Endorsed
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Posted in <strong className="text-amber-800">{post.category}</strong> • {post.timestamp}
                      </div>
                    </div>
                  </div>

                  {/* Upvote Pill */}
                  <button
                    onClick={() => handleUpvote(post.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                      post.hasUpvoted
                        ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    <ThumbsUp className={`w-3.5 h-3.5 ${post.hasUpvoted ? 'fill-slate-950' : ''}`} />
                    <span>{post.upvotes}</span>
                  </button>
                </div>

                {/* Post Title & Content */}
                <div className="space-y-2">
                  <h3 className="font-bold text-slate-900 text-base leading-snug">
                    {post.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-sans">
                    {post.content}
                  </p>
                </div>

                {/* Tags & Action Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {post.tags.map((t, idx) => (
                      <span key={idx} className="bg-slate-100 text-slate-600 text-[11px] px-2.5 py-0.5 rounded-md font-medium">
                        #{t}
                      </span>
                    ))}
                  </div>

                  <button
                    onClick={() => setExpandedPostId(isExpanded ? null : post.id)}
                    className="flex items-center gap-1.5 text-amber-700 font-bold hover:text-amber-800 cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>{post.repliesCount} {lang === 'hi' ? 'उत्तर / सुझाव' : 'Replies'}</span>
                  </button>
                </div>
              </div>

              {/* EXPANDED REPLIES & REPLY FORM */}
              {isExpanded && (
                <div className="bg-slate-50 p-5 sm:p-6 border-t border-slate-200 space-y-4">
                  <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Discussion & Verified Responses ({post.replies?.length || 0}):
                  </div>

                  {/* Replies List */}
                  <div className="space-y-3">
                    {post.replies && post.replies.length > 0 ? (
                      post.replies.map((reply) => (
                        <div
                          key={reply.id}
                          className={`p-4 rounded-xl border space-y-2 text-xs ${
                            reply.isVerified
                              ? 'bg-amber-50/70 border-amber-300 shadow-xs'
                              : 'bg-white border-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={`w-6 h-6 rounded-full ${reply.author.avatarBg} text-white font-bold flex items-center justify-center text-[10px]`}>
                                {reply.author.name.slice(0, 2).toUpperCase()}
                              </span>
                              <span className="font-bold text-slate-900">{reply.author.name}</span>
                              <span className="text-[10px] text-slate-500 font-medium">({reply.author.role})</span>
                              {reply.isVerified && (
                                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.2 rounded flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  Verified Solution
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400">{reply.timestamp}</span>
                          </div>

                          <p className="text-slate-800 leading-relaxed font-sans pl-8">
                            {reply.content}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-slate-400 italic p-3 text-center bg-white rounded-xl border border-dashed border-slate-200">
                        No replies yet. Be the first to share your perspective!
                      </div>
                    )}
                  </div>

                  {/* Add Reply Input */}
                  <div className="pt-2 flex gap-2">
                    <input
                      type="text"
                      value={replyInput}
                      onChange={(e) => setReplyInput(e.target.value)}
                      placeholder="Add your insight, book reference, or solution..."
                      className="flex-1 bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500"
                    />
                    <button
                      onClick={() => handleAddReply(post.id)}
                      className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Reply</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      )}

      {/* CREATE NEW POST MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900 font-cinzel">
                Start a New Discussion Thread
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePost} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Discussion Title / Question:</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. How to structure GS-3 questions on Green Hydrogen?"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Category:</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
                  >
                    <option value="GS-1">GS Paper 1</option>
                    <option value="GS-2">GS Paper 2</option>
                    <option value="GS-3">GS Paper 3</option>
                    <option value="GS-4">GS Paper 4</option>
                    <option value="Prelims Strategy">Prelims Strategy</option>
                    <option value="Mains Evaluation">Mains Evaluation</option>
                    <option value="Optional">Optional</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Tags (comma separated):</label>
                  <input
                    type="text"
                    value={newTags}
                    onChange={(e) => setNewTags(e.target.value)}
                    placeholder="Polity, Supreme Court"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Detailed Description / Context:</label>
                <textarea
                  required
                  rows={4}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Elaborate on your doubt, provide book references, or share the draft answer you want peer feedback on..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition shadow-md cursor-pointer"
                >
                  Post to Community
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

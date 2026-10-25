export type LanguageMode = 'en' | 'hi';

export type NavTab = 'dashboard' | 'live' | 'mock-tests' | 'library' | 'performance' | 'forum' | 'admin';

export interface Question {
  id: number;
  subject: 'Polity' | 'Economy' | 'History' | 'Geography' | 'Environment' | 'Science & Tech' | 'Current Affairs' | 'CSAT';
  gsPaper: 'GS-1' | 'GS-2' | 'GS-3' | 'CSAT';
  questionEn: string;
  questionHi: string;
  optionsEn: string[];
  optionsHi: string[];
  correctOptionIndex: number;
  explanationEn: string;
  explanationHi: string;
  sourceReference: string;
  difficulty: 'Easy' | 'Moderate' | 'Hard' | 'Standard UPSC';
}

export interface UserResponse {
  selectedOption: number | null;
  status: 'unvisited' | 'not-answered' | 'answered' | 'marked-for-review' | 'answered-and-marked';
}

export interface MockTest {
  id: string;
  title: string;
  hindiTitle: string;
  type: 'Prelims Full Length' | 'Prelims Sectional' | 'CSAT' | 'Mains Test Series';
  totalQuestions: number;
  durationMinutes: number;
  totalMarks: number;
  negativeMarksPerWrong: number;
  category: 'GS-1' | 'GS-2' | 'GS-3' | 'GS-4' | 'CSAT' | 'Full Mock';
  difficulty: 'Standard UPSC' | 'Challenging' | 'Foundation';
  questions: Question[];
  publishStatus?: 'draft' | 'published';
  participantsCount: number;
  attemptsCount: number;
}

export interface MainsQuestion {
  id: string;
  title: string;
  gsPaper: 'GS-1' | 'GS-2' | 'GS-3' | 'GS-4' | 'Essay';
  subject: string;
  marks: 10 | 15 | 20 | 250;
  wordLimit: 150 | 250 | 1200;
  yearReference?: string;
  questionEn: string;
  questionHi: string;
  syllabusTheme: string;
  topperAnswer: {
    topperName: string;
    airRank: string;
    answerHtml: string;
    flowchartTip: string;
    valueAddition: string[];
  };
  rubric: {
    introMarks: number;
    bodyMarks: number;
    conclusionMarks: number;
    presentationMarks: number;
  };
  attachmentUrls?: string[];
}

export interface LiveClass {
  id: string;
  title: string;
  hindiTitle: string;
  facultyName: string;
  facultyTitle: string;
  subject: string;
  gsPaper: 'GS-1' | 'GS-2' | 'GS-3' | 'GS-4' | 'CSAT' | 'Optional';
  batch: string;
  status: 'live' | 'upcoming' | 'completed';
  startTime: string;
  duration: string;
  attendeesCount: number;
  coverImage: string;
  lectureNotesPdf: string;
  streamProvider?: 'youtube' | 'zoom' | 'google-meet' | 'other';
  streamUrl?: string;
  description: string;
  tags: string[];
  chatMessages: {
    id: string;
    sender: string;
    avatar: string;
    text: string;
    time: string;
    isFaculty?: boolean;
    isDoubt?: boolean;
    upvotes?: number;
  }[];
}

export interface LibraryItem {
  id: string;
  title: string;
  type: 'Daily Editorial' | 'Monthly Magazine' | 'NCERT Summary' | 'Standard Book Note' | 'PIB Digest' | 'Static Note';
  source: 'The Hindu' | 'Indian Express' | 'Yojana' | 'PIB' | 'Drishti Special' | 'Vision Dossier' | 'Sankalp IAS';
  date: string;
  readingTimeMinutes: number;
  gsPaper: 'GS-1' | 'GS-2' | 'GS-3' | 'GS-4';
  subject: string;
  summary: string;
  prelimsPointers: string[];
  mainsAngle: string;
  fullContent: string;
  pdfUrl?: string;
  attachmentUrls?: string[];
  isBookmarked?: boolean;
  tags: string[];
}

export interface ForumPost {
  id: string;
  title: string;
  author: {
    name: string;
    role: 'Aspirant' | 'Faculty' | 'Topper (AIR 42)' | 'Senior Mentor';
    avatarBg: string;
  };
  category: 'GS-1' | 'GS-2' | 'GS-3' | 'GS-4' | 'Prelims Strategy' | 'Mains Evaluation' | 'Optional';
  content: string;
  upvotes: number;
  hasUpvoted?: boolean;
  repliesCount: number;
  timestamp: string;
  isFacultyEndorsed?: boolean;
  tags: string[];
  replies?: {
    id: string;
    author: {
      name: string;
      role: string;
      avatarBg: string;
    };
    content: string;
    timestamp: string;
    upvotes: number;
    isVerified?: boolean;
  }[];
}

export interface SyllabusModule {
  id: string;
  gsPaper: 'GS-1' | 'GS-2' | 'GS-3' | 'GS-4' | 'CSAT';
  title: string;
  topics: {
    id: string;
    name: string;
    completed: boolean;
    revisionCount: number;
    priority: 'High' | 'Medium' | 'Low';
  }[];
}

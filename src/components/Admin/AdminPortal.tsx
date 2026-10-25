import React, { useState, useEffect, useRef } from 'react';
import { 
  FileSpreadsheet, 
  Upload, 
  Download, 
  Plus, 
  Trash2, 
  Pencil,
  CheckCircle2, 
  AlertCircle, 
  BookOpen, 
  Video, 
  FileText, 
  HelpCircle, 
  Search, 
  Sparkles, 
  Filter, 
  Check, 
  Copy, 
  Eye,
  Calendar,
  Layers,
  ArrowRight,
  ShieldCheck,
  Tag
} from 'lucide-react';
import { Question, LiveClass, LibraryItem, MainsQuestion, LanguageMode } from '../../types';
import { api } from '../../services/api';

interface AdminPortalProps {
  lang: LanguageMode;
  onDataChanged: () => void;
  onOpenTests: () => void;
}

type AdminTab = 'csv-importer' | 'classes' | 'editorials' | 'mains' | 'static-library' | 'database';

type QuestionFormValues = {
  subject: Question['subject'];
  gsPaper: Question['gsPaper'];
  difficulty: Question['difficulty'];
  sourceReference: string;
  questionEn: string;
  questionHi: string;
  optionAEn: string;
  optionBEn: string;
  optionCEn: string;
  optionDEn: string;
  optionAHi: string;
  optionBHi: string;
  optionCHi: string;
  optionDHi: string;
  correctOptionIndex: number;
  explanationEn: string;
  explanationHi: string;
};

const emptyQuestionForm: QuestionFormValues = {
  subject: 'Polity',
  gsPaper: 'GS-2',
  difficulty: 'Standard UPSC',
  sourceReference: 'Laxmikanth & Constitution of India',
  questionEn: '',
  questionHi: '',
  optionAEn: '',
  optionBEn: '',
  optionCEn: '',
  optionDEn: '',
  optionAHi: '',
  optionBHi: '',
  optionCHi: '',
  optionDHi: '',
  correctOptionIndex: 0,
  explanationEn: '',
  explanationHi: ''
};

export const AdminPortal: React.FC<AdminPortalProps> = ({ lang, onDataChanged, onOpenTests }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('csv-importer');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [databaseStatus, setDatabaseStatus] = useState<Awaited<ReturnType<typeof api.getDatabaseStatus>> | null>(null);
  const [databaseConnectionString, setDatabaseConnectionString] = useState('');
  const [connectingDatabase, setConnectingDatabase] = useState(false);

  // Data states
  const [questions, setQuestions] = useState<Question[]>([]);
  const [liveClasses, setLiveClasses] = useState<LiveClass[]>([]);
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([]);
  const [mainsQuestions, setMainsQuestions] = useState<MainsQuestion[]>([]);

  // CSV Importer state
  const [csvRawText, setCsvRawText] = useState<string>('');
  const [parsedCsvQuestions, setParsedCsvQuestions] = useState<Partial<Question>[]>([]);
  const [csvParseError, setCsvParseError] = useState<string | null>(null);
  const [questionSearch, setQuestionSearch] = useState<string>('');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('All');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manual Question Creator Modal / Accordion
  const [showAddQuestionModal, setShowAddQuestionModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [newQuestionForm, setNewQuestionForm] = useState<QuestionFormValues>({ ...emptyQuestionForm });

  // Class Creator Form State
  const [showAddClassModal, setShowAddClassModal] = useState(false);
  const [newClassForm, setNewClassForm] = useState({
    title: '',
    hindiTitle: '',
    facultyName: '',
    facultyTitle: '',
    subject: 'Polity & Governance',
    gsPaper: 'GS-2' as LiveClass['gsPaper'],
    batch: '',
    status: 'upcoming' as LiveClass['status'],
    startTime: '',
    duration: '',
    attendeesCount: 0,
    description: '',
    lectureNotesPdf: '',
    streamProvider: 'youtube' as NonNullable<LiveClass['streamProvider']>,
    streamUrl: ''
  });

  // Editorial Creator Form State
  const [showAddEditorialModal, setShowAddEditorialModal] = useState(false);
  const [newEditorialForm, setNewEditorialForm] = useState({
    title: '',
    type: 'Daily Editorial' as LibraryItem['type'],
    source: 'The Hindu' as LibraryItem['source'],
    date: new Date().toISOString().split('T')[0],
    readingTimeMinutes: 7,
    gsPaper: 'GS-2' as LibraryItem['gsPaper'],
    subject: 'International Relations',
    summary: '',
    prelimsPointers: '',
    mainsAngle: '',
    fullContent: '',
    attachmentUrls: [] as string[]
  });

  // Mains Question Form State
  const [showAddMainsModal, setShowAddMainsModal] = useState(false);
  const [newMainsForm, setNewMainsForm] = useState({
    title: '',
    gsPaper: 'GS-2' as MainsQuestion['gsPaper'],
    subject: 'Indian Polity & Constitution',
    marks: 10 as MainsQuestion['marks'],
    wordLimit: 150 as MainsQuestion['wordLimit'],
    yearReference: '',
    questionEn: '',
    questionHi: '',
    syllabusTheme: '',
    topperAnswerText: '',
    topperName: '',
    flowchartTip: '',
    introMarks: 2,
    bodyMarks: 5,
    conclusionMarks: 2,
    presentationMarks: 1,
    attachmentUrls: [] as string[]
  });
  const [staticLibraryForm, setStaticLibraryForm] = useState({
    title: '',
    type: 'Static Note' as 'Static Note' | 'Monthly Magazine',
    summary: '',
    attachmentUrls: [] as string[]
  });

  const uploadSelectedFiles = async (
    event: React.ChangeEvent<HTMLInputElement>,
    onUploaded: (urls: string[]) => void
  ) => {
    const files = event.target.files;
    if (!files?.length) return;
    try {
      setLoading(true);
      const result = await api.uploadFiles(files);
      onUploaded(result.files.map(file => file.url));
      showNotification(`${result.files.length} file(s) uploaded.`);
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'Upload failed.', true);
    } finally {
      setLoading(false);
      event.target.value = '';
    }
  };

  // Load data
  const loadAllData = async () => {
    try {
      setLoading(true);
      const [qList, cList, lList, mList] = await Promise.all([
        api.getQuestions(),
        api.getLiveClasses(),
        api.getLibraryItems(),
        api.getMainsQuestions()
      ]);
      setQuestions(qList);
      setLiveClasses(cList);
      setLibraryItems(lList);
      setMainsQuestions(mList);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
    api.getDatabaseStatus().then(setDatabaseStatus).catch(error => {
      showNotification(error instanceof Error ? error.message : 'Could not load database status.', true);
    });
  }, []);

  const handleConnectDatabase = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!databaseConnectionString.trim()) {
      showNotification('Enter your PostgreSQL connection string.', true);
      return;
    }
    if (databaseStatus?.connected && !confirm('Connect to this database? Existing content in the selected database will be used. If it has no app content yet, the current content will be copied into it.')) return;
    try {
      setConnectingDatabase(true);
      const status = await api.connectDatabase(databaseConnectionString);
      setDatabaseStatus(status);
      setDatabaseConnectionString('');
      showNotification(`Connected to PostgreSQL database "${status.database}". Changes will now be saved.`);
      await loadAllData();
      onDataChanged();
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'Could not connect to the database.', true);
      api.getDatabaseStatus().then(setDatabaseStatus).catch(() => undefined);
    } finally {
      setConnectingDatabase(false);
    }
  };

  const showNotification = (msg: string, isError = false) => {
    if (isError) {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(null), 5000);
    } else {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(null), 4000);
    }
  };

  // CSV Parsing function
  const parseCSV = (csvContent: string) => {
    try {
      setCsvParseError(null);
      const lines = csvContent
        .split(/\r?\n/)
        .map(l => l.trim())
        .filter(l => l.length > 0);

      if (lines.length < 2) {
        setCsvParseError('CSV must contain a header row and at least one question row.');
        setParsedCsvQuestions([]);
        return;
      }

      // Simple CSV row parser handling quotes
      const parseRow = (text: string): string[] => {
        const result: string[] = [];
        let curr = '';
        let inQuotes = false;
        for (let i = 0; i < text.length; i++) {
          const char = text[i];
          if (char === '"' || char === "'") {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            result.push(curr.trim().replace(/^["']|["']$/g, ''));
            curr = '';
          } else {
            curr += char;
          }
        }
        result.push(curr.trim().replace(/^["']|["']$/g, ''));
        return result;
      };

      const headers = parseRow(lines[0]).map(h => h.toLowerCase().replace(/[\s_-]/g, ''));

      // Validate required columns
      const qEnIdx = headers.findIndex(h => h.includes('question') && !h.includes('hi'));
      const optAIdx = headers.findIndex(h => h.includes('optiona') && !h.includes('hi'));
      const optBIdx = headers.findIndex(h => h.includes('optionb') && !h.includes('hi'));
      const optCIdx = headers.findIndex(h => h.includes('optionc') && !h.includes('hi'));
      const optDIdx = headers.findIndex(h => h.includes('optiond') && !h.includes('hi'));

      if (qEnIdx === -1 || optAIdx === -1 || optBIdx === -1) {
        setCsvParseError('Required headers missing. Please include: subject, question_en, option_a_en, option_b_en, option_c_en, option_d_en, correct_option, explanation_en');
        setParsedCsvQuestions([]);
        return;
      }

      const parsed: Partial<Question>[] = [];

      for (let i = 1; i < lines.length; i++) {
        const cols = parseRow(lines[i]);
        if (cols.length < 3) continue;

        const getCol = (names: string[]): string => {
          for (const name of names) {
            const idx = headers.findIndex(h => h === name.toLowerCase().replace(/[\s_-]/g, ''));
            if (idx !== -1 && cols[idx] !== undefined) return cols[idx];
          }
          return '';
        };

        const subjectVal = (getCol(['subject', 'topic']) || 'Polity') as Question['subject'];
        const gsPaperVal = (getCol(['gspaper', 'gs_paper', 'paper']) || 'GS-2') as Question['gsPaper'];
        const difficultyVal = (getCol(['difficulty', 'level']) || 'Standard UPSC') as Question['difficulty'];
        const questionEnVal = getCol(['question_en', 'question', 'questionen']);
        const questionHiVal = getCol(['question_hi', 'questionhi']) || questionEnVal;

        const optA = getCol(['option_a_en', 'optionaen', 'option_a', 'optiona']) || 'Option A';
        const optB = getCol(['option_b_en', 'optionben', 'option_b', 'optionb']) || 'Option B';
        const optC = getCol(['option_c_en', 'optioncen', 'option_c', 'optionc']) || 'Option C';
        const optD = getCol(['option_d_en', 'optionden', 'option_d', 'optiond']) || 'Option D';

        const optAHi = getCol(['option_a_hi', 'optionahi']) || optA;
        const optBHi = getCol(['option_b_hi', 'optionbhi']) || optB;
        const optCHi = getCol(['option_c_hi', 'optionchi']) || optC;
        const optDHi = getCol(['option_d_hi', 'optiondhi']) || optD;

        // Parse correct option (0, 1, 2, 3 or A, B, C, D)
        const correctRaw = getCol(['correct_option', 'correctoption', 'answer', 'ans']).toUpperCase();
        let correctIdx = 0;
        if (correctRaw === 'B' || correctRaw === '1') correctIdx = 1;
        else if (correctRaw === 'C' || correctRaw === '2') correctIdx = 2;
        else if (correctRaw === 'D' || correctRaw === '3') correctIdx = 3;

        const explanationEnVal = getCol(['explanation_en', 'explanation', 'explanationen']) || 'Analysis by Sankalp IAS faculty.';
        const explanationHiVal = getCol(['explanation_hi', 'explanationhi']) || explanationEnVal;
        const refVal = getCol(['source_reference', 'source', 'reference']) || 'UPSC Standard Literature';

        if (questionEnVal.trim()) {
          parsed.push({
            subject: subjectVal,
            gsPaper: gsPaperVal,
            difficulty: difficultyVal,
            questionEn: questionEnVal,
            questionHi: questionHiVal,
            optionsEn: [optA, optB, optC, optD],
            optionsHi: [optAHi, optBHi, optCHi, optDHi],
            correctOptionIndex: correctIdx,
            explanationEn: explanationEnVal,
            explanationHi: explanationHiVal,
            sourceReference: refVal
          });
        }
      }

      setParsedCsvQuestions(parsed);
    } catch (err: any) {
      setCsvParseError(`Parsing Error: ${err.message}`);
      setParsedCsvQuestions([]);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCsvRawText(content);
      parseCSV(content);
    };
    reader.readAsText(file);
  };

  const handleCommitCsvImport = async () => {
    if (parsedCsvQuestions.length === 0) return;
    try {
      setLoading(true);
      const res = await api.importQuestionsBulk(parsedCsvQuestions);
      showNotification(`Successfully imported ${res.importedCount} questions into UPSC Question Bank!`);
      setParsedCsvQuestions([]);
      setCsvRawText('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      await loadAllData();
      onDataChanged();
    } catch (e: any) {
      showNotification(e.message || 'Failed to import questions', true);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadSampleCsv = () => {
    const sampleCsv = `subject,gs_paper,difficulty,question_en,question_hi,option_a_en,option_b_en,option_c_en,option_d_en,option_a_hi,option_b_hi,option_c_hi,option_d_hi,correct_option,explanation_en,explanation_hi,source_reference
Polity,GS-2,Standard UPSC,"Under the Indian Constitution, which Constitutional Amendment Act substituted 'Armed Rebellion' for 'Internal Disturbance' in Article 352?","भारतीय संविधान के तहत, किस संविधान संशोधन अधिनियम ने अनुच्छेद 352 में 'आंतरिक अशांति' के स्थान पर 'सशस्त्र विद्रोह' शब्द प्रतिस्थापित किया?","42nd Amendment Act 1976","44th Amendment Act 1978","52nd Amendment Act 1985","86th Amendment Act 2002","42वां संशोधन अधिनियम 1976","44वां संशोधन अधिनियम 1978","52वां संशोधन अधिनियम 1985","86वां संशोधन अधिनियम 2002",B,"The 44th Constitutional Amendment Act 1978 substituted 'armed rebellion' for 'internal disturbance' to prevent arbitrary emergency proclamations.","44वें संविधान संशोधन अधिनियम 1978 द्वारा 'आंतरिक अशांति' को 'सशस्त्र विद्रोह' से बदला गया।","Indian Polity by M. Laxmikanth, Chapter on Emergency Provisions"
Economy,GS-3,Moderate,"Which organization releases the World Economic Outlook report twice a year?","वर्ष में दो बार वर्ल्ड इकोनॉमिक आउटलुक रिपोर्ट कौन-सा संगठन जारी करता है?","World Bank","International Monetary Fund (IMF)","World Trade Organization (WTO)","World Economic Forum (WEF)","विश्व बैंक","अंतर्राष्ट्रीय मुद्रा कोष (IMF)","विश्व व्यापार संगठन (WTO)","विश्व आर्थिक मंच (WEF)",B,"The World Economic Outlook (WEO) is a survey by IMF staff published usually twice a year.","वर्ल्ड इकोनॉमिक आउटलुक अंतर्राष्ट्रीय मुद्रा कोष (IMF) द्वारा वर्ष में दो बार प्रकाशित किया जाता है।","IMF Official Publications"
Environment,GS-3,Hard,"Consider the following statements regarding the Ramsar Convention:\n1. It was adopted in 1971 in the Iranian city of Ramsar.\n2. India is a contracting party to the convention.\n3. The Montreux Record is maintained under this convention.\n\nWhich of the statements given above are correct?","रामसर सम्मेलन के संदर्भ में निम्नलिखित कथनों पर विचार कीजिए:\n1. इसे 1971 में ईरानी शहर रामसर में अपनाया गया था।\n2. भारत इस सम्मेलन का एक पक्षकार देश है।\n3. मॉन्ट्रो रिकॉर्ड इस सम्मेलन के तहत बनाए रखा जाता है।\n\nउपर्युक्त कथनों में से कौन-से सही हैं?","1 and 2 only","2 and 3 only","1 and 3 only","1, 2 and 3","केवल 1 और 2","केवल 2 और 3","केवल 1 और 3","1, 2 और 3",D,"All three statements are correct regarding the Ramsar Convention on Wetlands of International Importance.","तीनों कथन सत्य हैं।","Shankar IAS Environment"`;

    const blob = new Blob([sampleCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'upsc_prelims_questions_sample.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Add Single Question Handler
  const handleAddSingleQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestionForm.questionEn || !newQuestionForm.optionAEn || !newQuestionForm.optionBEn || !newQuestionForm.optionCEn || !newQuestionForm.optionDEn) {
      showNotification('Please fill the question text and all four options.', true);
      return;
    }

    try {
      setLoading(true);
      const question = {
        subject: newQuestionForm.subject,
        gsPaper: newQuestionForm.gsPaper,
        difficulty: newQuestionForm.difficulty,
        sourceReference: newQuestionForm.sourceReference,
        questionEn: newQuestionForm.questionEn,
        questionHi: newQuestionForm.questionHi || newQuestionForm.questionEn,
        optionsEn: [
          newQuestionForm.optionAEn,
          newQuestionForm.optionBEn,
          newQuestionForm.optionCEn,
          newQuestionForm.optionDEn
        ],
        optionsHi: [
          newQuestionForm.optionAHi || newQuestionForm.optionAEn,
          newQuestionForm.optionBHi || newQuestionForm.optionBEn,
          newQuestionForm.optionCHi || newQuestionForm.optionCEn,
          newQuestionForm.optionDHi || newQuestionForm.optionDEn
        ],
        correctOptionIndex: Number(newQuestionForm.correctOptionIndex),
        explanationEn: newQuestionForm.explanationEn || 'Explanation provided by academic team.',
        explanationHi: newQuestionForm.explanationHi || 'व्याख्या उपलब्ध है।'
      };
      if (editingQuestion) {
        await api.updateQuestion(editingQuestion.id, question);
        showNotification(`Question #${editingQuestion.id} updated.`);
      } else {
        await api.createQuestion(question);
        showNotification('Question created and added to Prelims Question Bank!');
      }

      setShowAddQuestionModal(false);
      setEditingQuestion(null);
      setNewQuestionForm({ ...emptyQuestionForm });
      await loadAllData();
      onDataChanged();
    } catch (e: any) {
      showNotification(e.message || 'Failed to add question', true);
    } finally {
      setLoading(false);
    }
  };

  const openQuestionEditor = (question: Question) => {
    setEditingQuestion(question);
    setNewQuestionForm({
      subject: question.subject,
      gsPaper: question.gsPaper,
      difficulty: question.difficulty,
      sourceReference: question.sourceReference,
      questionEn: question.questionEn,
      questionHi: question.questionHi,
      optionAEn: question.optionsEn[0] || '',
      optionBEn: question.optionsEn[1] || '',
      optionCEn: question.optionsEn[2] || '',
      optionDEn: question.optionsEn[3] || '',
      optionAHi: question.optionsHi[0] || '',
      optionBHi: question.optionsHi[1] || '',
      optionCHi: question.optionsHi[2] || '',
      optionDHi: question.optionsHi[3] || '',
      correctOptionIndex: question.correctOptionIndex,
      explanationEn: question.explanationEn,
      explanationHi: question.explanationHi
    });
    setShowAddQuestionModal(true);
  };

  const handleDeleteQuestion = async (id: number) => {
    if (!confirm(`Delete Question #${id} from the bank?`)) return;
    try {
      await api.deleteQuestion(id);
      showNotification(`Question #${id} removed.`);
      await loadAllData();
      onDataChanged();
    } catch (e: any) {
      showNotification(e.message || 'Failed to delete question', true);
    }
  };

  // Add Live Class Handler
  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassForm.title || !newClassForm.facultyName) {
      showNotification('Please enter title and faculty name', true);
      return;
    }

    try {
      setLoading(true);
      await api.createLiveClass({
        ...newClassForm,
        coverImage: '',
        tags: ['UPSC', newClassForm.subject, newClassForm.batch]
      });
      showNotification('Live class scheduled successfully!');
      setShowAddClassModal(false);
      setNewClassForm({
        title: '',
        hindiTitle: '',
        facultyName: '',
        facultyTitle: '',
        subject: 'Polity & Governance',
        gsPaper: 'GS-2',
        batch: '',
        status: 'upcoming',
        startTime: '',
        duration: '',
        attendeesCount: 0,
        description: '',
        lectureNotesPdf: '',
        streamProvider: 'youtube',
        streamUrl: ''
      });
      await loadAllData();
      onDataChanged();
    } catch (e: any) {
      showNotification(e.message, true);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClass = async (id: string) => {
    if (!confirm('Are you sure you want to remove this class?')) return;
    try {
      await api.deleteLiveClass(id);
      showNotification('Class deleted.');
      await loadAllData();
      onDataChanged();
    } catch (e: any) {
      showNotification(e.message, true);
    }
  };

  // Add Editorial / Resource Handler
  const handleAddEditorial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEditorialForm.title || !newEditorialForm.summary) {
      showNotification('Please enter title and summary', true);
      return;
    }

    try {
      setLoading(true);
      const pointers = newEditorialForm.prelimsPointers
        .split('\n')
        .map(p => p.trim())
        .filter(p => p.length > 0);

      await api.createLibraryItem({
        ...newEditorialForm,
        prelimsPointers: pointers.length > 0 ? pointers : ['Key constitutional and factual elements for Prelims.'],
        pdfUrl: newEditorialForm.attachmentUrls.find(url => url.endsWith('.pdf')),
        tags: ['UPSC', newEditorialForm.source, newEditorialForm.subject]
      });

      showNotification('Resource published to Digital Library!');
      setShowAddEditorialModal(false);
      setNewEditorialForm({
        title: '',
        type: 'Daily Editorial',
        source: 'The Hindu',
        date: new Date().toISOString().split('T')[0],
        readingTimeMinutes: 7,
        gsPaper: 'GS-2',
        subject: 'International Relations',
        summary: '',
        prelimsPointers: '',
        mainsAngle: '',
        fullContent: '',
        attachmentUrls: []
      });
      await loadAllData();
      onDataChanged();
    } catch (e: any) {
      showNotification(e.message, true);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEditorial = async (id: string) => {
    if (!confirm('Are you sure you want to remove this library item?')) return;
    try {
      await api.deleteLibraryItem(id);
      showNotification('Resource deleted.');
      await loadAllData();
      onDataChanged();
    } catch (e: any) {
      showNotification(e.message, true);
    }
  };

  // Add Mains Question Handler
  const handleAddMainsQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMainsForm.questionEn) {
      showNotification('Please write question prompt', true);
      return;
    }

    try {
      setLoading(true);
      await api.createMainsQuestion({
        title: newMainsForm.title || 'Mains Question',
        gsPaper: newMainsForm.gsPaper,
        subject: newMainsForm.subject,
        marks: Number(newMainsForm.marks) as any,
        wordLimit: Number(newMainsForm.wordLimit) as any,
        yearReference: newMainsForm.yearReference,
        questionEn: newMainsForm.questionEn,
        questionHi: newMainsForm.questionHi || newMainsForm.questionEn,
        syllabusTheme: newMainsForm.syllabusTheme,
        topperAnswer: {
          topperName: newMainsForm.topperName.trim(),
          airRank: '',
          answerHtml: newMainsForm.topperAnswerText.trim()
            ? `<p>${newMainsForm.topperAnswerText.trim().split(/\r?\n/).map(line => line.replace(/[&<>"']/g, character => ({
              '&': '&amp;',
              '<': '&lt;',
              '>': '&gt;',
              '"': '&quot;',
              "'": '&#39;'
            })[character] || character)).join('</p><p>')}</p>`
            : '',
          flowchartTip: newMainsForm.flowchartTip.trim(),
          valueAddition: []
        },
        rubric: {
          introMarks: Number(newMainsForm.introMarks),
          bodyMarks: Number(newMainsForm.bodyMarks),
          conclusionMarks: Number(newMainsForm.conclusionMarks),
          presentationMarks: Number(newMainsForm.presentationMarks)
        },
        attachmentUrls: newMainsForm.attachmentUrls
      });

      showNotification('Mains Question added to evaluation repository!');
      setShowAddMainsModal(false);
      setNewMainsForm({
        title: '',
        gsPaper: 'GS-2',
        subject: 'Indian Polity & Constitution',
        marks: 10,
        wordLimit: 150,
        yearReference: '',
        questionEn: '',
        questionHi: '',
        syllabusTheme: '',
        topperAnswerText: '',
        topperName: '',
        flowchartTip: '',
        introMarks: 2,
        bodyMarks: 5,
        conclusionMarks: 2,
        presentationMarks: 1,
        attachmentUrls: []
      });
      await loadAllData();
      onDataChanged();
    } catch (e: any) {
      showNotification(e.message, true);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStaticLibraryItem = async (event: React.FormEvent) => {
    event.preventDefault();
    const pdfUrl = staticLibraryForm.attachmentUrls.find(url => url.toLowerCase().endsWith('.pdf'));
    if (!staticLibraryForm.title.trim() || !pdfUrl) {
      showNotification('Add a title and upload a PDF before publishing.', true);
      return;
    }
    try {
      setLoading(true);
      await api.createLibraryItem({
        title: staticLibraryForm.title.trim(),
        type: staticLibraryForm.type,
        source: 'Sankalp IAS',
        date: new Date().toISOString().slice(0, 10),
        readingTimeMinutes: 0,
        gsPaper: 'GS-1',
        subject: staticLibraryForm.type === 'Monthly Magazine' ? 'Monthly Magazine' : 'Study Notes',
        summary: staticLibraryForm.summary.trim() || 'PDF study resource',
        prelimsPointers: [],
        mainsAngle: '',
        fullContent: staticLibraryForm.summary.trim(),
        pdfUrl,
        attachmentUrls: staticLibraryForm.attachmentUrls,
        tags: ['UPSC', staticLibraryForm.type]
      });
      setStaticLibraryForm({ title: '', type: 'Static Note', summary: '', attachmentUrls: [] });
      showNotification('PDF added to the study library.');
      await loadAllData();
      onDataChanged();
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'Could not add this PDF.', true);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMainsQuestion = async (id: string) => {
    if (!confirm('Delete this mains prompt?')) return;
    try {
      await api.deleteMainsQuestion(id);
      showNotification('Mains question removed.');
      await loadAllData();
      onDataChanged();
    } catch (e: any) {
      showNotification(e.message, true);
    }
  };

  // Filtered questions
  const filteredQuestions = questions.filter(q => {
    const matchesSubject = selectedSubjectFilter === 'All' || q.subject === selectedSubjectFilter;
    const matchesSearch = questionSearch === '' || 
      q.questionEn.toLowerCase().includes(questionSearch.toLowerCase()) ||
      q.questionHi.toLowerCase().includes(questionSearch.toLowerCase()) ||
      q.sourceReference.toLowerCase().includes(questionSearch.toLowerCase());
    return matchesSubject && matchesSearch;
  });

  return (
    <div className="space-y-6 pb-16">
      {/* Top Banner / Notification */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-4 py-3 rounded-2xl flex items-center justify-between text-xs font-semibold shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-700 hover:text-emerald-900">×</button>
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-50 border border-red-300 text-red-900 px-4 py-3 rounded-2xl flex items-center justify-between text-xs font-semibold shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-red-700 hover:text-red-900">×</button>
        </div>
      )}

      {/* Admin Header */}
      <div className="bg-linear-to-r from-slate-900 via-slate-800 to-amber-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-bold font-mono tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              <span>LEARNING CONTENT</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-cinzel tracking-tight text-white">
              Content studio
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm max-w-2xl font-serif-academic leading-relaxed">
              Create practice questions, schedule classes and publish useful reading material for learners.
            </p>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-black/40 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 text-center text-xs">
            <div className="p-2">
              <div className="text-amber-400 font-bold text-lg">{questions.length}</div>
              <div className="text-slate-400 text-[10px] uppercase font-semibold">Questions</div>
            </div>
            <div className="p-2 border-l border-white/10">
              <div className="text-amber-400 font-bold text-lg">{liveClasses.length}</div>
              <div className="text-slate-400 text-[10px] uppercase font-semibold">Live Classes</div>
            </div>
            <div className="p-2 border-l border-white/10">
              <div className="text-amber-400 font-bold text-lg">{libraryItems.length}</div>
              <div className="text-slate-400 text-[10px] uppercase font-semibold">Reading</div>
            </div>
            <div className="p-2 border-l border-white/10">
              <div className="text-amber-400 font-bold text-lg">{mainsQuestions.length}</div>
              <div className="text-slate-400 text-[10px] uppercase font-semibold">Mains Bank</div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mt-8 pt-4 border-t border-white/10 overflow-x-auto no-scrollbar text-xs font-bold">
          <button
            onClick={() => setActiveTab('csv-importer')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition cursor-pointer whitespace-nowrap ${
              activeTab === 'csv-importer'
                ? 'bg-amber-500 text-slate-950 font-extrabold shadow-md'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Question bank</span>
          </button>

          <button
            onClick={() => setActiveTab('classes')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition cursor-pointer whitespace-nowrap ${
              activeTab === 'classes'
                ? 'bg-amber-500 text-slate-950 font-extrabold shadow-md'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <Video className="w-4 h-4" />
            <span>Classes ({liveClasses.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('editorials')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition cursor-pointer whitespace-nowrap ${
              activeTab === 'editorials'
                ? 'bg-amber-500 text-slate-950 font-extrabold shadow-md'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Reading material ({libraryItems.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('static-library')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition cursor-pointer whitespace-nowrap ${
              activeTab === 'static-library'
                ? 'bg-amber-500 text-slate-950 font-extrabold shadow-md'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>PDF library</span>
          </button>

          <button
            onClick={() => setActiveTab('mains')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition cursor-pointer whitespace-nowrap ${
              activeTab === 'mains'
                ? 'bg-amber-500 text-slate-950 font-extrabold shadow-md'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Mains practice ({mainsQuestions.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('database')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition cursor-pointer whitespace-nowrap ${
              activeTab === 'database'
                ? 'bg-amber-500 text-slate-950 font-extrabold shadow-md'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Database</span>
          </button>

        </div>
      </div>

      {activeTab === 'database' && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <form onSubmit={handleConnectDatabase} className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
            <div className="flex items-start gap-3">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${databaseStatus?.connected ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Connect your PostgreSQL database</h2>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  Add a PostgreSQL URI from your database provider. Once connected, resource changes are saved to this database and loaded again when the app restarts.
                </p>
              </div>
            </div>

            <div className={`rounded-2xl border p-4 ${databaseStatus?.connected ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
              <p className={`text-sm font-bold ${databaseStatus?.connected ? 'text-emerald-800' : 'text-amber-900'}`}>
                {databaseStatus?.connected ? 'Database connected' : 'Database not connected'}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                {databaseStatus?.connected
                  ? `Content is being stored in ${databaseStatus.database || 'PostgreSQL'}.`
                  : 'Connect a database before creating or changing learning resources.'}
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="database-connection-string" className="text-xs font-bold text-slate-700">PostgreSQL connection string</label>
              <input
                id="database-connection-string"
                type="password"
                autoComplete="new-password"
                maxLength={2048}
                value={databaseConnectionString}
                onChange={event => setDatabaseConnectionString(event.target.value)}
                placeholder="postgresql://user:password@host:5432/database"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-900 focus:border-amber-500 focus:outline-none"
                required
              />
              <p className="text-[11px] leading-relaxed text-slate-500">
                The connection string is sent only to this server, never returned to the browser, and stored encrypted. Set a stable `SESSION_SECRET` (32+ characters) in the server environment so it can decrypt the saved connection after restart.
              </p>
              <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-900">
                If your provider reports an untrusted TLS certificate (including Supabase), download its database root certificate from the provider dashboard. Add `DATABASE_SSL_CA_FILE` with the certificate's full local path to `.env`, then restart the app and reconnect. Alternatively, add `sslrootcert` with that path to the connection URI. TLS verification stays enabled.
              </p>
            </div>

            <button type="submit" disabled={connectingDatabase || !databaseConnectionString.trim()} className="rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50">
              {connectingDatabase ? 'Connecting…' : 'Connect and save'}
            </button>
          </form>

          <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
            <h3 className="text-base font-bold text-slate-900">What happens when you connect</h3>
            <ul className="space-y-3 text-xs leading-relaxed text-slate-600">
              <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" /><span>The app verifies the connection before switching over. Your old database remains untouched.</span></li>
              <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" /><span>If this database already has saved app content, that content is loaded. A new database receives the current content as its initial data.</span></li>
              <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" /><span>Questions, classes, Mains prompts, library resources, tests, forum content, and learner progress are saved to PostgreSQL.</span></li>
            </ul>
            <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-500">
              Keep the server's `SESSION_SECRET` and encrypted `data/database-config.json` file on persistent storage and back them up. Do not paste a database URL into public chat or share it with learners.
            </p>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: PRELIMS QUESTIONS & CSV IMPORTER */}
      {/* ========================================================================= */}
      {activeTab === 'csv-importer' && (
        <div className="space-y-6">
          {/* Top Actions Card */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* CSV File Upload Section */}
            <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                    <FileSpreadsheet className="w-4 h-4 text-amber-700" />
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-900 text-sm">
                      Upload practice questions
                    </h2>
                    <p className="text-[11px] text-slate-500">
                      Add multiple bilingual questions from a spreadsheet.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleDownloadSampleCsv}
                  className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer"
                  title="Download CSV format template"
                >
                  <Download className="w-3.5 h-3.5 text-amber-600" />
                  <span>Download Sample CSV Template</span>
                </button>
              </div>

              {/* Upload Drop Zone */}
              <div className="border-2 border-dashed border-amber-300 bg-amber-50/40 rounded-2xl p-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-white text-amber-600 mx-auto flex items-center justify-center shadow-xs">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <label className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-4 py-2 rounded-xl text-xs cursor-pointer inline-flex items-center gap-2 transition shadow-sm">
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Select .CSV File from Device</span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,text/csv"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  <p className="text-[11px] text-slate-500 mt-2">
                    Supports comma-separated values (.csv) with standard column headers.
                  </p>
                </div>
              </div>

              {/* Or Direct Paste Area */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-600 font-semibold">
                  <span>Or Paste Raw CSV Text:</span>
                  {csvRawText && (
                    <button
                      onClick={() => {
                        setCsvRawText('');
                        setParsedCsvQuestions([]);
                        setCsvParseError(null);
                      }}
                      className="text-red-600 hover:underline text-[11px]"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <textarea
                  rows={4}
                  value={csvRawText}
                  onChange={(e) => {
                    setCsvRawText(e.target.value);
                    parseCSV(e.target.value);
                  }}
                  placeholder="subject,gs_paper,difficulty,question_en,question_hi,option_a_en,option_b_en,option_c_en,option_d_en,correct_option,explanation_en..."
                  className="w-full font-mono text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-amber-500 focus:outline-none"
                />
              </div>

              {/* Parsing Feedback */}
              {csvParseError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{csvParseError}</span>
                </div>
              )}

              {/* Parsed Preview Table */}
              {parsedCsvQuestions.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-emerald-700 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{parsedCsvQuestions.length} Questions successfully parsed & ready for import!</span>
                    </span>
                    <button
                      onClick={handleCommitCsvImport}
                      disabled={loading}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl text-xs transition cursor-pointer flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Commit {parsedCsvQuestions.length} Questions to DB</span>
                    </button>
                  </div>

                  <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 text-xs">
                    {parsedCsvQuestions.slice(0, 5).map((q, idx) => (
                      <div key={idx} className="p-3 bg-slate-50/50 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800">#{idx + 1}</span>
                          <span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded text-[10px] font-bold">
                            {q.subject}
                          </span>
                          <span className="bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded text-[10px]">
                            {q.gsPaper}
                          </span>
                          <span className="text-emerald-700 font-semibold text-[10px] ml-auto">
                            Correct: Option {['A', 'B', 'C', 'D'][q.correctOptionIndex || 0]}
                          </span>
                        </div>
                        <p className="text-slate-800 font-medium line-clamp-2">
                          {q.questionEn}
                        </p>
                      </div>
                    ))}
                    {parsedCsvQuestions.length > 5 && (
                      <div className="p-2 text-center text-[11px] text-slate-500 bg-slate-100">
                        + {parsedCsvQuestions.length - 5} more questions in this batch
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Action Side Panel */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center font-bold">
                    <Plus className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Manual Question Creator</h3>
                    <p className="text-[11px] text-slate-500">Draft individual high-yield UPSC question</p>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  Add or edit bilingual question text, all four options, the correct answer, source, subject, paper, difficulty, and explanation.
                </p>

                <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 space-y-1.5">
                  <div className="font-bold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>UPSC Negative Marking Standard:</span>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-normal">
                    Prelims GS-1 marks +2 for correct, -0.66 for incorrect. CSAT marks +2.5 for correct, -0.83 for incorrect.
                  </p>
                </div>
              </div>

              <button
                onClick={() => { setEditingQuestion(null); setNewQuestionForm({ ...emptyQuestionForm }); setShowAddQuestionModal(true); }}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-2xl text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-sm"
              >
                <Plus className="w-4 h-4 text-amber-400" />
                <span>Add Single Question Manually</span>
              </button>
              <button
                onClick={onOpenTests}
                className="w-full rounded-2xl border border-amber-300 bg-amber-50 py-3 text-xs font-bold text-amber-900 transition hover:bg-amber-100"
              >
                Create or publish a practice test
              </button>
            </div>
          </div>

          {/* Question Bank Explorer & Manager */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Question bank ({questions.length} questions)
                </h3>
                <p className="text-xs text-slate-500">
                  Questions stay in the shared bank until you add them to a test.
                </p>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={questionSearch}
                    onChange={(e) => setQuestionSearch(e.target.value)}
                    placeholder="Search questions or sources..."
                    className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none w-56"
                  />
                </div>

                <select
                  value={selectedSubjectFilter}
                  onChange={(e) => setSelectedSubjectFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-700 text-xs px-3 py-1.5 rounded-xl font-medium focus:outline-none"
                >
                  <option value="All">All Subjects</option>
                  <option value="Polity">Polity</option>
                  <option value="Economy">Economy</option>
                  <option value="History">History</option>
                  <option value="Geography">Geography</option>
                  <option value="Environment">Environment</option>
                  <option value="Science & Tech">Science & Tech</option>
                  <option value="Current Affairs">Current Affairs</option>
                </select>
              </div>
            </div>

            {/* Questions List */}
            {filteredQuestions.length === 0 ? (
              <div className="text-center py-12 text-slate-400 space-y-2">
                <FileSpreadsheet className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-xs">No questions found matching your filter.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredQuestions.map((q) => (
                  <div
                    key={q.id}
                    className="p-4 rounded-2xl border border-slate-200 bg-slate-50/40 hover:bg-white hover:border-amber-300 transition space-y-3"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-slate-500">#{q.id}</span>
                          <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            {q.subject}
                          </span>
                          <span className="bg-slate-200 text-slate-700 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                            {q.gsPaper}
                          </span>
                          <span className="text-[10px] text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                            {q.difficulty}
                          </span>
                          <span className="text-[10px] text-slate-400 italic">
                            Ref: {q.sourceReference}
                          </span>
                        </div>
                        <h4 className="text-xs sm:text-sm font-semibold text-slate-900 leading-snug pt-1">
                          {q.questionEn}
                        </h4>
                        {q.questionHi && q.questionHi !== q.questionEn && (
                          <p className="text-xs text-slate-600 font-serif-academic leading-relaxed">
                            {q.questionHi}
                          </p>
                        )}
                      </div>

                      <div className="flex shrink-0 gap-1">
                        <button
                          onClick={() => openQuestionEditor(q)}
                          className="rounded-xl p-2 text-slate-400 transition hover:bg-amber-50 hover:text-amber-700"
                          title="Edit question"
                          aria-label={`Edit question ${q.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteQuestion(q.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer"
                          title="Delete question"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Options preview */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                      {q.optionsEn.map((opt, oIdx) => {
                        const isCorrect = oIdx === q.correctOptionIndex;
                        return (
                          <div
                            key={oIdx}
                            className={`p-2 rounded-xl text-[11px] font-medium flex items-center gap-2 ${
                              isCorrect
                                ? 'bg-emerald-50 text-emerald-900 border border-emerald-300 font-bold'
                                : 'bg-white border border-slate-200 text-slate-600'
                            }`}
                          >
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                              isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {['A', 'B', 'C', 'D'][oIdx]}
                            </span>
                            <span className="truncate">{opt}</span>
                            {isCorrect && (
                              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 ml-auto" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: LIVE CLASSES MANAGEMENT */}
      {/* ========================================================================= */}
      {activeTab === 'classes' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-bold text-slate-900 text-lg">Classroom Lecture Management</h2>
              <p className="text-xs text-slate-500">Schedule live lectures, assign faculty, and upload lecture PDF handouts.</p>
            </div>
            <button
              onClick={() => setShowAddClassModal(true)}
              className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-4 py-2.5 rounded-2xl text-xs transition cursor-pointer flex items-center gap-2 shadow-sm self-start"
            >
              <Plus className="w-4 h-4" />
              <span>Schedule New Live Class</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {liveClasses.map((cls) => (
              <div
                key={cls.id}
                className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs hover:border-amber-300 transition flex flex-col justify-between"
              >
                <div>
                  <div className="relative h-36 bg-slate-900 overflow-hidden">
                    <img 
                      src={cls.coverImage} 
                      alt={cls.title} 
                      className="w-full h-full object-cover opacity-80"
                    />
                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                        cls.status === 'live' 
                          ? 'bg-red-600 text-white animate-pulse' 
                          : cls.status === 'upcoming' 
                            ? 'bg-amber-500 text-slate-950' 
                            : 'bg-slate-700 text-slate-200'
                      }`}>
                        {cls.status === 'live' ? '● LIVE NOW' : cls.status}
                      </span>
                      <span className="bg-black/60 backdrop-blur-md text-white text-[10px] px-2 py-0.5 rounded-full font-mono">
                        {cls.duration}
                      </span>
                    </div>

                    <button
                      onClick={() => handleDeleteClass(cls.id)}
                      className="absolute top-3 right-3 p-1.5 bg-black/60 hover:bg-red-600 text-white rounded-full transition"
                      title="Delete class"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="p-5 space-y-3">
                    <div className="flex items-center gap-2 text-[10px] font-bold">
                      <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md">
                        {cls.gsPaper}
                      </span>
                      <span className="text-slate-500 font-medium">{cls.subject}</span>
                    </div>

                    <h3 className="font-bold text-sm text-slate-900 leading-snug line-clamp-2">
                      {cls.title}
                    </h3>

                    <div className="text-xs text-slate-600">
                      <strong>Faculty:</strong> {cls.facultyName} ({cls.facultyTitle})
                    </div>

                    <div className="text-[11px] text-slate-500">
                      <strong>Time:</strong> {cls.startTime}
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Batch: {cls.batch}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: DAILY EDITORIALS & LIBRARY */}
      {/* ========================================================================= */}
      {activeTab === 'editorials' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-bold text-slate-900 text-lg">Daily Editorial & Dossier Desk</h2>
              <p className="text-xs text-slate-500">Publish The Hindu / Indian Express editorials and monthly magazines.</p>
            </div>
            <button
              onClick={() => setShowAddEditorialModal(true)}
              className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-4 py-2.5 rounded-2xl text-xs transition cursor-pointer flex items-center gap-2 shadow-sm self-start"
            >
              <Plus className="w-4 h-4" />
              <span>Publish Daily Editorial / Resource</span>
            </button>
          </div>

          <div className="space-y-4">
            {libraryItems.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs hover:border-amber-300 transition space-y-3"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {item.type}
                      </span>
                      <span className="bg-slate-100 text-slate-700 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                        {item.source}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {item.date} • {item.readingTimeMinutes} min read
                      </span>
                    </div>

                    <h3 className="font-bold text-sm text-slate-900">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-600 line-clamp-2">
                      {item.summary}
                    </p>
                  </div>

                  <button
                    onClick={() => handleDeleteEditorial(item.id)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer shrink-0"
                    title="Delete resource"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Prelims pointers sample */}
                {item.prelimsPointers && item.prelimsPointers.length > 0 && (
                  <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/50 text-xs text-amber-950 space-y-1">
                    <div className="font-bold text-[11px] text-amber-800">Prelims High-Yield Pointers:</div>
                    <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-slate-700">
                      {item.prelimsPointers.slice(0, 2).map((p, pIdx) => (
                        <li key={pIdx}>{p}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'static-library' && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <form onSubmit={handleAddStaticLibraryItem} className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Static notes & magazines</h2>
              <p className="mt-1 text-xs text-slate-500">Upload a PDF for learners to keep in their library.</p>
            </div>
            <input
              value={staticLibraryForm.title}
              onChange={event => setStaticLibraryForm({ ...staticLibraryForm, title: event.target.value })}
              placeholder="Title"
              required
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm"
            />
            <select
              value={staticLibraryForm.type}
              onChange={event => setStaticLibraryForm({ ...staticLibraryForm, type: event.target.value as typeof staticLibraryForm.type })}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm"
            >
              <option value="Static Note">Static note</option>
              <option value="Monthly Magazine">Monthly magazine</option>
            </select>
            <textarea
              value={staticLibraryForm.summary}
              onChange={event => setStaticLibraryForm({ ...staticLibraryForm, summary: event.target.value })}
              placeholder="Short description (optional)"
              rows={3}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm"
            />
            <input
              type="file"
              accept="application/pdf,.pdf"
              onChange={event => uploadSelectedFiles(event, urls => setStaticLibraryForm(current => ({ ...current, attachmentUrls: urls })))}
              className="w-full rounded-xl border border-slate-200 p-3 text-xs"
            />
            {staticLibraryForm.attachmentUrls.map(url => <a key={url} href={url} target="_blank" rel="noreferrer" className="block text-xs text-amber-700 underline">Preview uploaded PDF</a>)}
            <button disabled={loading || staticLibraryForm.attachmentUrls.length === 0} className="rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">Add to library</button>
          </form>
          <div className="space-y-3">
            {libraryItems.filter(item => item.type === 'Static Note' || item.type === 'Monthly Magazine').map(item => (
              <div key={item.id} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4">
                <div>
                  <span className="text-[10px] font-bold uppercase text-amber-700">{item.type}</span>
                  <h3 className="font-bold text-slate-900">{item.title}</h3>
                  <p className="text-xs text-slate-500">{item.summary}</p>
                  {item.pdfUrl && <a href={item.pdfUrl} target="_blank" rel="noreferrer" className="text-xs text-amber-700 underline">Open PDF</a>}
                </div>
                <button onClick={() => handleDeleteEditorial(item.id)} aria-label={`Delete ${item.title}`} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: MAINS QUESTION BANK */}
      {/* ========================================================================= */}
      {activeTab === 'mains' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-bold text-slate-900 text-lg">Mains Daily Answer Writing (DAW)</h2>
              <p className="text-xs text-slate-500">Configure 10-markers and 15-markers with topper model answers and rubrics.</p>
            </div>
            <button
              onClick={() => setShowAddMainsModal(true)}
              className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-4 py-2.5 rounded-2xl text-xs transition cursor-pointer flex items-center gap-2 shadow-sm self-start"
            >
              <Plus className="w-4 h-4" />
              <span>Add Mains Question Prompt</span>
            </button>
          </div>

          <div className="space-y-4">
            {mainsQuestions.map((mq) => (
              <div
                key={mq.id}
                className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs hover:border-amber-300 transition space-y-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-md">
                        {mq.gsPaper}
                      </span>
                      <span className="bg-slate-100 text-slate-700 text-[10px] font-semibold px-2 py-0.5 rounded-md">
                        {mq.marks} Marks • {mq.wordLimit} Words
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {mq.yearReference}
                      </span>
                    </div>

                    <h3 className="font-bold text-sm text-slate-900 leading-snug">
                      {mq.questionEn}
                    </h3>
                    {mq.questionHi && (
                      <p className="text-xs text-slate-600 font-serif-academic">
                        {mq.questionHi}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => handleDeleteMainsQuestion(mq.id)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer shrink-0"
                    title="Delete mains question"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Rubric and reference answer preview */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2 border-t border-slate-100">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                    <div className="font-bold text-slate-700 text-[11px]">Evaluation Rubric Distribution:</div>
                    <div className="flex items-center justify-between text-[11px] text-slate-600">
                      <span>Intro: {mq.rubric.introMarks}m</span>
                      <span>Body: {mq.rubric.bodyMarks}m</span>
                      <span>Conclusion: {mq.rubric.conclusionMarks}m</span>
                      <span>Presentation: {mq.rubric.presentationMarks}m</span>
                    </div>
                  </div>

                  <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-200 text-emerald-950 space-y-1">
                    <div className="font-bold text-[11px] text-emerald-800">Reference answer:</div>
                    <div className="text-[11px] text-emerald-900 line-clamp-1">
                      {mq.topperAnswer?.answerHtml?.trim()
                        ? (mq.topperAnswer.topperName || 'Added')
                        : 'Not added'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: MANUAL PRELIMS QUESTION CREATOR */}
      {/* ========================================================================= */}
      {showAddQuestionModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">
                {editingQuestion ? `Edit question #${editingQuestion.id}` : 'Add a Prelims question'}
              </h3>
              <button
                onClick={() => { setShowAddQuestionModal(false); setEditingQuestion(null); }}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleAddSingleQuestion} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Subject:</label>
                  <select
                    value={newQuestionForm.subject}
                    onChange={(e) => setNewQuestionForm({ ...newQuestionForm, subject: e.target.value as any })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="Polity">Polity</option>
                    <option value="Economy">Economy</option>
                    <option value="History">History</option>
                    <option value="Geography">Geography</option>
                    <option value="Environment">Environment</option>
                    <option value="Science & Tech">Science & Tech</option>
                    <option value="Current Affairs">Current Affairs</option>
                    <option value="CSAT">CSAT</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">GS Paper:</label>
                  <select
                    value={newQuestionForm.gsPaper}
                    onChange={(e) => setNewQuestionForm({ ...newQuestionForm, gsPaper: e.target.value as any })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="GS-1">GS-1</option>
                    <option value="GS-2">GS-2</option>
                    <option value="GS-3">GS-3</option>
                    <option value="CSAT">CSAT</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Difficulty:</label>
                  <select
                    value={newQuestionForm.difficulty}
                    onChange={(e) => setNewQuestionForm({ ...newQuestionForm, difficulty: e.target.value as any })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="Standard UPSC">Standard UPSC</option>
                    <option value="Moderate">Moderate</option>
                    <option value="Hard">Hard</option>
                    <option value="Easy">Easy</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Source Reference:</label>
                <input
                  type="text"
                  value={newQuestionForm.sourceReference}
                  onChange={(e) => setNewQuestionForm({ ...newQuestionForm, sourceReference: e.target.value })}
                  placeholder="e.g. Laxmikanth, NCERT Class XI, Economic Survey"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Question Statement (English):</label>
                <textarea
                  rows={3}
                  value={newQuestionForm.questionEn}
                  onChange={(e) => setNewQuestionForm({ ...newQuestionForm, questionEn: e.target.value })}
                  placeholder="Consider the following statements..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Question Statement (Hindi - Optional):</label>
                <textarea
                  rows={2}
                  value={newQuestionForm.questionHi}
                  onChange={(e) => setNewQuestionForm({ ...newQuestionForm, questionHi: e.target.value })}
                  placeholder="निम्नलिखित कथनों पर विचार कीजिए..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              {/* 4 Options */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="font-bold text-slate-800">Four Options & Correct Answer Selection:</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-600">Option A:</label>
                    <input
                      type="text"
                      value={newQuestionForm.optionAEn}
                      onChange={(e) => setNewQuestionForm({ ...newQuestionForm, optionAEn: e.target.value })}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-600">Option B:</label>
                    <input
                      type="text"
                      value={newQuestionForm.optionBEn}
                      onChange={(e) => setNewQuestionForm({ ...newQuestionForm, optionBEn: e.target.value })}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-600">Option C:</label>
                    <input
                      type="text"
                      value={newQuestionForm.optionCEn}
                      onChange={(e) => setNewQuestionForm({ ...newQuestionForm, optionCEn: e.target.value })}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-600">Option D:</label>
                    <input
                      type="text"
                      value={newQuestionForm.optionDEn}
                      onChange={(e) => setNewQuestionForm({ ...newQuestionForm, optionDEn: e.target.value })}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1 pt-2">
                  <label className="font-bold text-slate-700">Correct Option:</label>
                  <select
                    value={newQuestionForm.correctOptionIndex}
                    onChange={(e) => setNewQuestionForm({ ...newQuestionForm, correctOptionIndex: Number(e.target.value) })}
                    className="w-full p-2 bg-amber-50 border border-amber-300 text-amber-900 font-bold rounded-xl"
                  >
                    <option value={0}>Option A is Correct</option>
                    <option value={1}>Option B is Correct</option>
                    <option value={2}>Option C is Correct</option>
                    <option value={3}>Option D is Correct</option>
                  </select>
                </div>
              </div>

              {/* Explanations */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Detailed Academic Explanation (English):</label>
                <textarea
                  rows={3}
                  value={newQuestionForm.explanationEn}
                  onChange={(e) => setNewQuestionForm({ ...newQuestionForm, explanationEn: e.target.value })}
                  placeholder="Statement 1 is correct because..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setShowAddQuestionModal(false); setEditingQuestion(null); }}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-5 py-2 rounded-xl transition cursor-pointer shadow-sm"
                >
                  {editingQuestion ? 'Save question changes' : 'Add question'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: SCHEDULE LIVE CLASS */}
      {/* ========================================================================= */}
      {showAddClassModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">
                Schedule New Live / Upcoming Class
              </h3>
              <button onClick={() => setShowAddClassModal(false)} className="text-slate-400 text-lg font-bold">×</button>
            </div>

            <form onSubmit={handleAddClass} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Class Title (English):</label>
                <input
                  type="text"
                  value={newClassForm.title}
                  onChange={(e) => setNewClassForm({ ...newClassForm, title: e.target.value })}
                  placeholder="e.g. GS-2: Federalism & Inter-State Council Dynamics"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Faculty Name:</label>
                  <input
                    type="text"
                    value={newClassForm.facultyName}
                    onChange={(e) => setNewClassForm({ ...newClassForm, facultyName: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Faculty Title:</label>
                  <input
                    type="text"
                    value={newClassForm.facultyTitle}
                    onChange={(e) => setNewClassForm({ ...newClassForm, facultyTitle: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">GS Paper:</label>
                  <select
                    value={newClassForm.gsPaper}
                    onChange={(e) => setNewClassForm({ ...newClassForm, gsPaper: e.target.value as any })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="GS-1">GS-1</option>
                    <option value="GS-2">GS-2</option>
                    <option value="GS-3">GS-3</option>
                    <option value="GS-4">GS-4</option>
                    <option value="CSAT">CSAT</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Status:</label>
                  <select
                    value={newClassForm.status}
                    onChange={(e) => setNewClassForm({ ...newClassForm, status: e.target.value as any })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="upcoming">Upcoming</option>
                    <option value="live">Live Now</option>
                    <option value="completed">Completed / Archive</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Duration:</label>
                  <input
                    type="text"
                    value={newClassForm.duration}
                    onChange={(e) => setNewClassForm({ ...newClassForm, duration: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Start Time / Schedule:</label>
                  <input
                    type="text"
                    value={newClassForm.startTime}
                    onChange={(e) => setNewClassForm({ ...newClassForm, startTime: e.target.value })}
                    placeholder="e.g. Tomorrow at 10:00 AM"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Batch Name:</label>
                  <input
                    type="text"
                    value={newClassForm.batch}
                    onChange={(e) => setNewClassForm({ ...newClassForm, batch: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Class platform:</label>
                  <select
                    value={newClassForm.streamProvider}
                    onChange={event => setNewClassForm({ ...newClassForm, streamProvider: event.target.value as NonNullable<LiveClass['streamProvider']> })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5"
                  >
                    <option value="youtube">YouTube Live / recording</option>
                    <option value="zoom">Zoom meeting</option>
                    <option value="google-meet">Google Meet</option>
                    <option value="other">Other HTTPS class link</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Stream or meeting URL:</label>
                  <input
                    type="url"
                    value={newClassForm.streamUrl}
                    onChange={event => setNewClassForm({ ...newClassForm, streamUrl: event.target.value })}
                    placeholder="https://..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Lecture PDF handout:</label>
                <input
                  type="url"
                  value={newClassForm.lectureNotesPdf}
                  onChange={(e) => setNewClassForm({ ...newClassForm, lectureNotesPdf: e.target.value })}
                  placeholder="https://example.com/handout.pdf"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={event => uploadSelectedFiles(event, urls => setNewClassForm(current => ({ ...current, lectureNotesPdf: urls[0] || current.lectureNotesPdf })))}
                  className="w-full rounded-xl border border-slate-200 p-2 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddClassModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-5 py-2 rounded-xl transition cursor-pointer shadow-sm"
                >
                  Schedule Class
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: PUBLISH EDITORIAL / RESOURCE */}
      {/* ========================================================================= */}
      {showAddEditorialModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">
                Publish Daily Editorial / Resource
              </h3>
              <button onClick={() => setShowAddEditorialModal(false)} className="text-slate-400 text-lg font-bold">×</button>
            </div>

            <form onSubmit={handleAddEditorial} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Editorial Headline / Title:</label>
                <input
                  type="text"
                  value={newEditorialForm.title}
                  onChange={(e) => setNewEditorialForm({ ...newEditorialForm, title: e.target.value })}
                  placeholder="e.g. Cooperative Federalism in the era of Fiscal Centralization"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Source:</label>
                  <select
                    value={newEditorialForm.source}
                    onChange={(e) => setNewEditorialForm({ ...newEditorialForm, source: e.target.value as any })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="The Hindu">The Hindu</option>
                    <option value="Indian Express">Indian Express</option>
                    <option value="PIB">PIB</option>
                    <option value="Yojana">Yojana</option>
                    <option value="Drishti Special">Drishti Special</option>
                    <option value="Vision Dossier">Vision Dossier</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">GS Paper:</label>
                  <select
                    value={newEditorialForm.gsPaper}
                    onChange={(e) => setNewEditorialForm({ ...newEditorialForm, gsPaper: e.target.value as any })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="GS-1">GS-1</option>
                    <option value="GS-2">GS-2</option>
                    <option value="GS-3">GS-3</option>
                    <option value="GS-4">GS-4</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Reading Time (mins):</label>
                  <input
                    type="number"
                    value={newEditorialForm.readingTimeMinutes}
                    onChange={(e) => setNewEditorialForm({ ...newEditorialForm, readingTimeMinutes: Number(e.target.value) })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Executive Summary:</label>
                <textarea
                  rows={3}
                  value={newEditorialForm.summary}
                  onChange={(e) => setNewEditorialForm({ ...newEditorialForm, summary: e.target.value })}
                  placeholder="Core thematic takeaway of the editorial..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Prelims Pointers (One per line):</label>
                <textarea
                  rows={3}
                  value={newEditorialForm.prelimsPointers}
                  onChange={(e) => setNewEditorialForm({ ...newEditorialForm, prelimsPointers: e.target.value })}
                  placeholder="Article 279A (GST Council)&#10;15th Finance Commission horizontal devolution formula&#10;Cess and Surcharges constitutional provisions"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Mains Analytical Angle:</label>
                <textarea
                  rows={2}
                  value={newEditorialForm.mainsAngle}
                  onChange={(e) => setNewEditorialForm({ ...newEditorialForm, mainsAngle: e.target.value })}
                  placeholder="Critical examination angle for Mains answer writing..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Attach a PDF or image:</label>
                <input
                  type="file"
                  multiple
                  accept="application/pdf,image/jpeg,image/png,image/webp,.pdf,.jpg,.jpeg,.png,.webp"
                  onChange={event => uploadSelectedFiles(event, urls => setNewEditorialForm(current => ({ ...current, attachmentUrls: [...current.attachmentUrls, ...urls] })))}
                  className="w-full rounded-xl border border-slate-200 p-2 text-xs"
                />
                {newEditorialForm.attachmentUrls.map(url => <a key={url} href={url} target="_blank" rel="noreferrer" className="block text-xs text-amber-700 underline">{url.split('/').pop()}</a>)}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddEditorialModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-5 py-2 rounded-xl transition cursor-pointer shadow-sm"
                >
                  Publish Resource
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD MAINS QUESTION */}
      {/* ========================================================================= */}
      {showAddMainsModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">
                Add Mains Daily Practice Prompt
              </h3>
              <button onClick={() => setShowAddMainsModal(false)} className="text-slate-400 text-lg font-bold">×</button>
            </div>

            <form onSubmit={handleAddMainsQuestion} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">GS Paper:</label>
                  <select
                    value={newMainsForm.gsPaper}
                    onChange={(e) => setNewMainsForm({ ...newMainsForm, gsPaper: e.target.value as any })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="GS-1">GS-1</option>
                    <option value="GS-2">GS-2</option>
                    <option value="GS-3">GS-3</option>
                    <option value="GS-4">GS-4</option>
                    <option value="Essay">Essay</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Marks:</label>
                  <select
                    value={newMainsForm.marks}
                    onChange={(e) => setNewMainsForm({ ...newMainsForm, marks: Number(e.target.value) as any })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value={10}>10 Marks</option>
                    <option value={15}>15 Marks</option>
                    <option value={20}>20 Marks</option>
                    <option value={250}>250 Marks (Essay)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Word Limit:</label>
                  <select
                    value={newMainsForm.wordLimit}
                    onChange={(e) => setNewMainsForm({ ...newMainsForm, wordLimit: Number(e.target.value) as any })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value={150}>150 Words</option>
                    <option value={250}>250 Words</option>
                    <option value={1200}>1000-1200 Words (Essay)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Mains Question Prompt (English):</label>
                <textarea
                  rows={3}
                  value={newMainsForm.questionEn}
                  onChange={(e) => setNewMainsForm({ ...newMainsForm, questionEn: e.target.value })}
                  placeholder="e.g. 'Cooperative federalism requires not just financial devolution, but robust consultative mechanisms.' Discuss in the light of recent Centre-State fiscal tensions."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Hindi Question (Optional):</label>
                <textarea
                  rows={2}
                  value={newMainsForm.questionHi}
                  onChange={(e) => setNewMainsForm({ ...newMainsForm, questionHi: e.target.value })}
                  placeholder="हिंदी में प्रश्न..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Attach a PDF or image:</label>
                <input
                  type="file"
                  multiple
                  accept="application/pdf,image/jpeg,image/png,image/webp,.pdf,.jpg,.jpeg,.png,.webp"
                  onChange={event => uploadSelectedFiles(event, urls => setNewMainsForm(current => ({ ...current, attachmentUrls: [...current.attachmentUrls, ...urls] })))}
                  className="w-full rounded-xl border border-slate-200 p-2 text-xs"
                />
                {newMainsForm.attachmentUrls.map(url => <a key={url} href={url} target="_blank" rel="noreferrer" className="block text-xs text-amber-700 underline">{url.split('/').pop()}</a>)}
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Flowchart & Diagram Tip:</label>
                <input
                  type="text"
                  value={newMainsForm.flowchartTip}
                  onChange={(e) => setNewMainsForm({ ...newMainsForm, flowchartTip: e.target.value })}
                  placeholder="e.g. Draw a 3-pillar matrix comparing Finance Commission vs NITI Aayog roles"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddMainsModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-5 py-2 rounded-xl transition cursor-pointer shadow-sm"
                >
                  Save Mains Question
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

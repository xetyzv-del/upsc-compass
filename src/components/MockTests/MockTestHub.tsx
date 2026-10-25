import React, { useState } from 'react';
import { 
  FileCheck2, 
  PenLine, 
  Clock, 
  Users, 
  Award, 
  Play, 
  Sparkles, 
  CheckCircle, 
  AlertCircle,
  HelpCircle,
  Filter,
  BarChart2,
  Plus,
  Pencil,
  Upload,
  Trash2,
  X,
  FileSpreadsheet,
  CheckCircle2
} from 'lucide-react';
import { MockTest, MainsQuestion, LanguageMode, Question } from '../../types';
import { api } from '../../services/api';
import { PrelimsTestSimulator } from './PrelimsTestSimulator';
import { MainsTestWorkspace } from './MainsTestWorkspace';

interface MockTestHubProps {
  lang: LanguageMode;
  isAdmin?: boolean;
  onTestCompleted?: (score: number) => void;
  refreshTrigger?: number;
}

type TestFormValues = Pick<MockTest, 'title' | 'hindiTitle' | 'type' | 'durationMinutes' | 'totalMarks' | 'negativeMarksPerWrong' | 'category' | 'difficulty'> & {
  publishStatus: NonNullable<MockTest['publishStatus']>;
};

function parseQuestionCsv(csv: string): Partial<Question>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = '';
  let quoted = false;
  for (let index = 0; index < csv.length; index += 1) {
    const character = csv[index];
    if (character === '"' && quoted && csv[index + 1] === '"') {
      value += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === ',' && !quoted) {
      row.push(value.trim());
      value = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && csv[index + 1] === '\n') index += 1;
      row.push(value.trim());
      if (row.some(cell => cell.length > 0)) rows.push(row);
      row = [];
      value = '';
    } else {
      value += character;
    }
  }
  if (quoted) throw new Error('The CSV contains an unclosed quote.');
  row.push(value.trim());
  if (row.some(cell => cell.length > 0)) rows.push(row);
  if (rows.length < 2) throw new Error('Include a header row and at least one question.');
  if (rows.length > 501) throw new Error('A CSV can contain at most 500 questions at a time.');

  const normalize = (header: string) => header.toLowerCase().replace(/[\s_-]/g, '');
  const headers = rows[0].map(normalize);
  const aliases: Record<string, string[]> = {
    questionEn: ['questionen', 'question'],
    questionHi: ['questionhi'],
    optionA: ['optionaen', 'optiona'],
    optionB: ['optionben', 'optionb'],
    optionC: ['optioncen', 'optionc'],
    optionD: ['optionden', 'optiond'],
    optionAHi: ['optionahi'],
    optionBHi: ['optionbhi'],
    optionCHi: ['optionchi'],
    optionDHi: ['optiondhi'],
    correct: ['correctoption', 'correct', 'answer', 'ans'],
    subject: ['subject'],
    gsPaper: ['gspaper'],
    difficulty: ['difficulty'],
    explanationEn: ['explanationen', 'explanation'],
    explanationHi: ['explanationhi'],
    sourceReference: ['sourcereference', 'source', 'reference']
  };
  const indexes = Object.fromEntries(Object.entries(aliases).map(([key, options]) => [
    key,
    headers.findIndex(header => options.includes(header))
  ]));
  const requiredHeaders = ['questionEn', 'optionA', 'optionB', 'optionC', 'optionD', 'correct'];
  const missing = requiredHeaders.filter(key => indexes[key] === -1);
  if (missing.length) throw new Error('Required columns: question_en, option_a_en, option_b_en, option_c_en, option_d_en, correct_option.');
  const get = (cells: string[], key: string) => indexes[key] >= 0 ? cells[indexes[key]] || '' : '';

  return rows.slice(1).map((cells, index) => {
    const questionEn = get(cells, 'questionEn');
    const optionsEn = ['optionA', 'optionB', 'optionC', 'optionD'].map(key => get(cells, key));
    const answer = get(cells, 'correct').trim().toUpperCase();
    const correctOptionIndex = /^[A-D]$/.test(answer) ? answer.charCodeAt(0) - 65 : Number(answer);
    if (!questionEn || optionsEn.some(option => !option.trim()) || !Number.isInteger(correctOptionIndex) || correctOptionIndex < 0 || correctOptionIndex > 3) {
      throw new Error(`Row ${index + 2} needs a question, four options and a correct option (A-D or 0-3).`);
    }
    return {
      subject: get(cells, 'subject') as Question['subject'] || 'Polity',
      gsPaper: get(cells, 'gsPaper') as Question['gsPaper'] || 'GS-2',
      difficulty: get(cells, 'difficulty') as Question['difficulty'] || 'Standard UPSC',
      questionEn,
      questionHi: get(cells, 'questionHi') || questionEn,
      optionsEn,
      optionsHi: ['optionAHi', 'optionBHi', 'optionCHi', 'optionDHi'].map((key, optionIndex) => get(cells, key) || optionsEn[optionIndex]),
      correctOptionIndex,
      explanationEn: get(cells, 'explanationEn'),
      explanationHi: get(cells, 'explanationHi') || get(cells, 'explanationEn'),
      sourceReference: get(cells, 'sourceReference') || 'Imported by administrator'
    };
  });
}

const emptyTestForm: TestFormValues = {
  title: '',
  hindiTitle: '',
  type: 'Prelims Sectional',
  durationMinutes: 60,
  totalMarks: 100,
  negativeMarksPerWrong: 0.66,
  category: 'GS-1',
  difficulty: 'Standard UPSC',
  publishStatus: 'draft'
};

export const MockTestHub: React.FC<MockTestHubProps> = ({ lang, isAdmin = false, onTestCompleted, refreshTrigger }) => {
  const [activeTab, setActiveTab] = useState<'prelims' | 'mains'>('prelims');
  const [mockTests, setMockTests] = useState<MockTest[]>([]);
  const [mainsQuestions, setMainsQuestions] = useState<MainsQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePrelimsTest, setActivePrelimsTest] = useState<MockTest | null>(null);
  const [activeMainsQuestion, setActiveMainsQuestion] = useState<MainsQuestion | null>(null);
  const [prelimsFilter, setPrelimsFilter] = useState<'All' | 'Prelims Full Length' | 'Prelims Sectional' | 'CSAT'>('All');
  const [showTestEditor, setShowTestEditor] = useState(false);
  const [editingTest, setEditingTest] = useState<MockTest | null>(null);
  const [testForm, setTestForm] = useState<TestFormValues>(emptyTestForm);
  const [savingTest, setSavingTest] = useState(false);
  const [testActionError, setTestActionError] = useState<string | null>(null);
  const [testActionSuccess, setTestActionSuccess] = useState<string | null>(null);
  const [csvTargetTest, setCsvTargetTest] = useState<MockTest | null>(null);
  const [csvQuestions, setCsvQuestions] = useState<Partial<Question>[]>([]);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [importingCsv, setImportingCsv] = useState(false);
  const [removingQuestionId, setRemovingQuestionId] = useState<number | null>(null);
  const csvInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setLoading(true);
    const loadCatalog = () => Promise.all([api.getMockTests(), api.getMainsQuestions()])
      .then(([tests, mains]) => {
        setMockTests(tests);
        setMainsQuestions(mains);
      })
      .catch(err => console.error(err));
    loadCatalog()
      .finally(() => setLoading(false));
    const refreshInterval = window.setInterval(loadCatalog, 30_000);
    return () => window.clearInterval(refreshInterval);
  }, [refreshTrigger]);

  const filteredPrelimsTests = mockTests.filter(t => 
    prelimsFilter === 'All' || t.type === prelimsFilter
  );

  const openCreateTest = () => {
    setEditingTest(null);
    setTestForm(emptyTestForm);
    setTestActionError(null);
    setShowTestEditor(true);
  };

  const openEditTest = (test: MockTest) => {
    setEditingTest(test);
    setTestForm({
      title: test.title,
      hindiTitle: test.hindiTitle,
      type: test.type,
      durationMinutes: test.durationMinutes,
      totalMarks: test.totalMarks,
      negativeMarksPerWrong: test.negativeMarksPerWrong,
      category: test.category,
      difficulty: test.difficulty,
      publishStatus: test.publishStatus ?? 'published'
    });
    setTestActionError(null);
    setShowTestEditor(true);
  };

  const saveTest = async (event: React.FormEvent) => {
    event.preventDefault();
    setSavingTest(true);
    setTestActionError(null);
    try {
      if (editingTest) await api.updateMockTest(editingTest.id, testForm);
      else await api.createMockTest({ ...testForm, questions: [] });
      const updatedTests = await api.getMockTests();
      setMockTests(updatedTests);
      setTestActionSuccess(editingTest ? 'Test details updated.' : 'Test created as a draft. Import its questions, then publish it to learners.');
      setShowTestEditor(false);
    } catch (error) {
      setTestActionError(error instanceof Error ? error.message : 'Could not save the test.');
    } finally {
      setSavingTest(false);
    }
  };

  const chooseCsv = (test: MockTest, file?: File) => {
    if (csvInputRef.current) csvInputRef.current.value = '';
    setCsvTargetTest(test);
    setCsvQuestions([]);
    setCsvError(null);
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setCsvError('Choose a .csv file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        setCsvQuestions(parseQuestionCsv(String(reader.result || '')));
      } catch (error) {
        setCsvError(error instanceof Error ? error.message : 'Could not read this CSV.');
      }
    };
    reader.onerror = () => setCsvError('Could not read this file.');
    reader.readAsText(file);
  };

  const importCsvQuestions = async () => {
    if (!csvTargetTest || csvQuestions.length === 0) return;
    setImportingCsv(true);
    setCsvError(null);
    try {
      const result = await api.importQuestionsToMockTest(csvTargetTest.id, csvQuestions);
      const updatedTests = await api.getMockTests();
      setMockTests(updatedTests);
      setCsvTargetTest(null);
      setCsvQuestions([]);
      if (csvInputRef.current) csvInputRef.current.value = '';
      setTestActionSuccess(`${result.importedCount} questions added to "${csvTargetTest.title}".`);
    } catch (error) {
      setCsvError(error instanceof Error ? error.message : 'Could not import questions.');
    } finally {
      setImportingCsv(false);
    }
  };

  const removeQuestionFromTest = async (question: Question) => {
    if (!csvTargetTest || !window.confirm(`Remove question #${question.id} from "${csvTargetTest.title}"? It will remain in the shared question bank.`)) return;
    setRemovingQuestionId(question.id);
    setCsvError(null);
    try {
      await api.deleteQuestionFromMockTest(csvTargetTest.id, question.id);
      const updatedTests = await api.getMockTests();
      setMockTests(updatedTests);
      setCsvTargetTest(updatedTests.find(test => test.id === csvTargetTest.id) || null);
      setTestActionSuccess(`Question #${question.id} removed from "${csvTargetTest.title}".`);
    } catch (error) {
      setCsvError(error instanceof Error ? error.message : 'Could not remove this question from the test.');
    } finally {
      setRemovingQuestionId(null);
    }
  };

  const deleteTest = async (test: MockTest) => {
    if (!window.confirm(`Delete "${test.title}" and its test record? This cannot be undone.`)) return;
    try {
      await api.deleteMockTest(test.id);
      setMockTests(current => current.filter(item => item.id !== test.id));
      setTestActionSuccess(`"${test.title}" was deleted.`);
    } catch (error) {
      setTestActionError(error instanceof Error ? error.message : 'Could not delete the test.');
    }
  };

  const toggleTestPublication = async (test: MockTest) => {
    const publishStatus = (test.publishStatus ?? 'published') === 'published' ? 'draft' : 'published';
    try {
      await api.updateMockTest(test.id, { publishStatus });
      setMockTests(await api.getMockTests());
      setTestActionSuccess(publishStatus === 'published'
        ? `"${test.title}" is now published and visible to learners.`
        : `"${test.title}" is now a draft and hidden from learners.`);
    } catch (error) {
      setTestActionError(error instanceof Error ? error.message : 'Could not update test availability.');
    }
  };

  const downloadCsvTemplate = () => {
    const headers = 'subject,gs_paper,difficulty,question_en,question_hi,option_a_en,option_b_en,option_c_en,option_d_en,option_a_hi,option_b_hi,option_c_hi,option_d_hi,correct_option,explanation_en,explanation_hi,source_reference';
    const sample = 'Polity,GS-2,Standard UPSC,"Sample question?","नमूना प्रश्न?","Option A","Option B","Option C","Option D","विकल्प A","विकल्प B","विकल्प C","विकल्प D",B,"Answer explanation","उत्तर की व्याख्या","Source reference"';
    const url = URL.createObjectURL(new Blob([`${headers}\n${sample}\n`], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'upsc-test-questions-template.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  if (activePrelimsTest) {
    return (
      <PrelimsTestSimulator
        test={activePrelimsTest}
        initialLang={lang}
        onExit={() => setActivePrelimsTest(null)}
        onTestCompleted={onTestCompleted}
      />
    );
  }

  if (activeMainsQuestion) {
    return (
      <MainsTestWorkspace
        question={activeMainsQuestion}
        lang={lang}
        onBack={() => setActiveMainsQuestion(null)}
      />
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Test Center Header */}
      <div className="relative rounded-3xl bg-linear-to-r from-slate-900 via-slate-800 to-amber-950 p-6 md:p-8 text-white overflow-hidden shadow-xl border border-slate-700">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 bg-amber-500/20 text-amber-300 px-3 py-1 rounded-full text-xs font-bold border border-amber-500/30">
            <Award className="w-4 h-4" />
            <span>UPSC practice and answer writing</span>
          </div>

          <h1 className="text-2xl md:text-3xl font-extrabold font-cinzel tracking-wide text-white">
            {lang === 'hi' ? 'अखिल भारतीय परीक्षा केंद्र (प्रारंभिक एवं मुख्य)' : 'All India UPSC Examination Hub (Prelims & Mains)'}
          </h1>

          <p className="text-sm md:text-base text-slate-300 leading-relaxed">
            {lang === 'hi'
              ? 'प्रकाशित अभ्यास प्रश्नों के साथ समयबद्ध टेस्ट दें और मुख्य परीक्षा के उत्तर लिखें। प्रश्नों में उपलब्ध भाषाओं और टेस्ट की अंकन व्यवस्था का उपयोग किया जाता है।'
              : 'Take timed tests using published practice questions and write Mains responses. Language options and scoring follow the content configured for each test.'}
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <div className="flex items-center gap-2 text-xs text-amber-200">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span>Timed test interface</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-amber-200">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span>Results based on submitted answers</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-amber-200">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span>Practice questions and evaluation tools</span>
            </div>
          </div>
        </div>
      </div>

      {/* TABS: PRELIMS VS MAINS */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2 bg-white p-1 rounded-2xl border border-slate-200 shadow-xs">
          <button
            onClick={() => setActiveTab('prelims')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition cursor-pointer ${
              activeTab === 'prelims'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <FileCheck2 className="w-4 h-4" />
            <span>{lang === 'hi' ? 'प्रारंभिक परीक्षा टेस्ट सीरीज' : 'Prelims CBT Test Series'}</span>
          </button>
          <button
            onClick={() => setActiveTab('mains')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition cursor-pointer ${
              activeTab === 'mains'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <PenLine className="w-4 h-4" />
            <span>{lang === 'hi' ? 'मुख्य परीक्षा उत्तर लेखन' : 'Mains Daily Answer Writing'}</span>
          </button>
        </div>

        {activeTab === 'prelims' && (
          <div className="flex flex-wrap items-center justify-end gap-2 text-xs">
            {(['All', 'Prelims Full Length', 'Prelims Sectional', 'CSAT'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setPrelimsFilter(filter)}
                className={`px-3 py-1 rounded-full font-semibold transition cursor-pointer ${
                  prelimsFilter === filter
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {filter === 'All' ? 'All Mocks' : filter.replace('Prelims ', '')}
              </button>
            ))}
            {isAdmin && (
              <button onClick={openCreateTest} className="ml-2 inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-3.5 py-2 font-bold text-white transition hover:bg-amber-500">
                <Plus className="h-4 w-4" /> Create test
              </button>
            )}
          </div>
        )}
      </div>

      {testActionSuccess && (
        <div role="status" className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <span>{testActionSuccess}</span>
          <button onClick={() => setTestActionSuccess(null)} aria-label="Dismiss message"><X className="h-4 w-4" /></button>
        </div>
      )}
      {testActionError && (
        <div role="alert" className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <span>{testActionError}</span>
          <button onClick={() => setTestActionError(null)} aria-label="Dismiss error"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* PRELIMS MOCK TESTS CATALOGUE */}
      {activeTab === 'prelims' && (
        mockTests.length === 0 ? (
          <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-12 text-center space-y-4">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-2xl text-slate-400">
              📝
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-800 font-cinzel">
                {lang === 'hi' ? 'अभी कोई प्रारंभिक परीक्षा टेस्ट उपलब्ध नहीं है' : 'No practice tests available yet'}
              </h3>
              <p className="mx-auto max-w-md text-xs text-slate-500">
                {isAdmin ? 'Create a test and import its questions from a CSV file.' : 'New practice tests will appear here when they are published.'}
              </p>
              {isAdmin && <button onClick={openCreateTest} className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-bold text-white hover:bg-amber-500">Create your first test</button>}
            </div>
          </div>
        ) : filteredPrelimsTests.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            No tests match this filter.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPrelimsTests.map((test) => (
              <div
                key={test.id}
                className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between shadow-xs hover:shadow-md transition space-y-6 group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="bg-amber-50 text-amber-800 text-[11px] font-bold px-2.5 py-0.5 rounded-md border border-amber-200">
                      {test.type}
                    </span>
                    {isAdmin && (
                      <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${
                        (test.publishStatus ?? 'published') === 'published'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {(test.publishStatus ?? 'published') === 'published' ? 'Published' : 'Draft'}
                      </span>
                    )}
                    <span className="text-slate-500 text-xs font-semibold flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {test.durationMinutes} Mins
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-lg leading-snug group-hover:text-amber-800 transition font-sans">
                    {lang === 'hi' ? test.hindiTitle : test.title}
                  </h3>

                  <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 text-center text-xs">
                    <div>
                      <div className="text-[10px] text-slate-500">Questions</div>
                      <div className="font-bold text-slate-800">{test.totalQuestions} MCQs</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500">Max Marks</div>
                      <div className="font-bold text-slate-800">{test.totalMarks}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500">Students attempted</div>
                      <div className="font-bold text-slate-800">{test.participantsCount}</div>
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {test.attemptsCount} total {test.attemptsCount === 1 ? 'attempt' : 'attempts'}
                    {' · '}Negative marking: {test.negativeMarksPerWrong}
                  </div>

                </div>

                <button
                  onClick={() => setActivePrelimsTest(test)}
                  disabled={test.questions.length === 0}
                  title={test.questions.length === 0 ? 'This test has no questions yet.' : undefined}
                  className="w-full bg-slate-900 hover:bg-amber-600 text-white font-bold py-3 rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-xs cursor-pointer group-hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-slate-900"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>
                    {test.questions.length === 0
                      ? (lang === 'hi' ? 'प्रश्न उपलब्ध नहीं हैं' : 'Questions unavailable')
                      : (lang === 'hi' ? 'टेस्ट प्रारंभ करें (CBT मोड)' : 'Start Full UPSC CBT Simulator')}
                  </span>
                </button>
                {isAdmin && (
                  <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                    <button
                      onClick={() => toggleTestPublication(test)}
                      disabled={(test.publishStatus ?? 'published') === 'draft' && test.questions.length === 0}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {(test.publishStatus ?? 'published') === 'published' ? 'Unpublish' : 'Publish to learners'}
                    </button>
                    <button onClick={() => openEditTest(test)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-amber-300 hover:text-amber-800">
                      <Pencil className="h-3.5 w-3.5" /> Edit test
                    </button>
                    <button onClick={() => chooseCsv(test)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-amber-300 hover:text-amber-800">
                      <Upload className="h-3.5 w-3.5" /> Manage questions / CSV
                    </button>
                    <button onClick={() => deleteTest(test)} aria-label={`Delete ${test.title}`} className="ml-auto rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {/* MAINS DAILY ANSWER WRITING CATALOGUE */}
      {activeTab === 'mains' && (
        mainsQuestions.length === 0 ? (
          <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-12 text-center space-y-4">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-2xl text-slate-400">
              ✍️
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-800 font-cinzel">
                {lang === 'hi' ? 'अभी कोई मुख्य परीक्षा प्रश्न प्रकाशित नहीं है' : 'No Mains questions published yet'}
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Published Mains practice questions will appear here.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-700 shrink-0" />
                <span>
                  <strong>Daily Mains Drill:</strong> Practice an answer, use the self-assessment rubric, and compare with a reference answer when one is published.
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {mainsQuestions.map((q) => (
                <div
                  key={q.id}
                  className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between shadow-xs hover:shadow-md transition space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="bg-slate-900 text-amber-300 text-xs font-bold px-2.5 py-0.5 rounded-md">
                        {q.gsPaper} • {q.marks} Marks
                      </span>
                      <span className="text-slate-500 text-xs font-semibold">
                        Word Limit: {q.wordLimit} Words
                      </span>
                    </div>

                    <div className="text-xs font-semibold text-amber-700">{q.subject}</div>

                    <h3 className="font-bold text-slate-900 text-base font-serif-academic leading-relaxed">
                      {lang === 'hi' ? q.questionHi : q.questionEn}
                    </h3>

                    <p className="text-xs text-slate-500">
                      Syllabus: {q.syllabusTheme}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div className="text-xs text-slate-600">
                      Model: <strong className="text-slate-900">{q.topperAnswer.topperName}</strong>
                    </div>

                    <button
                      onClick={() => setActiveMainsQuestion(q)}
                      className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-4 py-2 rounded-xl text-xs transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                    >
                      <PenLine className="w-3.5 h-3.5" />
                      <span>Practice & Compare</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      )}

      {showTestEditor && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <form onSubmit={saveTest} className="max-h-[92vh] w-full max-w-2xl space-y-5 overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{editingTest ? 'Edit practice test' : 'Create a practice test'}</h2>
                <p className="mt-1 text-xs text-slate-500">Set the test details, then import questions from CSV.</p>
              </div>
              <button type="button" onClick={() => setShowTestEditor(false)} aria-label="Close" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-5 w-5" /></button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1 text-xs font-semibold text-slate-700 sm:col-span-2">
                Test title
                <input required maxLength={200} value={testForm.title} onChange={event => setTestForm({ ...testForm, title: event.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-normal" placeholder="e.g. Sectional Test 05: Indian Economy" />
              </label>
              <label className="space-y-1 text-xs font-semibold text-slate-700 sm:col-span-2">
                Hindi title (optional)
                <input maxLength={200} value={testForm.hindiTitle} onChange={event => setTestForm({ ...testForm, hindiTitle: event.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-normal" placeholder="हिंदी में टेस्ट का नाम" />
              </label>
              <label className="space-y-1 text-xs font-semibold text-slate-700">
                Test type
                <select value={testForm.type} onChange={event => setTestForm({ ...testForm, type: event.target.value as TestFormValues['type'] })} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-normal">
                  <option value="Prelims Full Length">Full length</option>
                  <option value="Prelims Sectional">Sectional</option>
                  <option value="CSAT">CSAT</option>
                </select>
              </label>
              <label className="space-y-1 text-xs font-semibold text-slate-700">
                Subject / paper
                <select value={testForm.category} onChange={event => setTestForm({ ...testForm, category: event.target.value as TestFormValues['category'] })} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-normal">
                  <option value="GS-1">GS-1</option><option value="GS-2">GS-2</option><option value="GS-3">GS-3</option><option value="GS-4">GS-4</option><option value="CSAT">CSAT</option><option value="Full Mock">Full Mock</option>
                </select>
              </label>
              <label className="space-y-1 text-xs font-semibold text-slate-700">
                Duration (minutes)
                <input required type="number" min={1} max={600} value={testForm.durationMinutes} onChange={event => setTestForm({ ...testForm, durationMinutes: Number(event.target.value) })} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-normal" />
              </label>
              <label className="space-y-1 text-xs font-semibold text-slate-700">
                Total marks
                <input required type="number" min={1} max={1000} step="0.5" value={testForm.totalMarks} onChange={event => setTestForm({ ...testForm, totalMarks: Number(event.target.value) })} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-normal" />
              </label>
              <label className="space-y-1 text-xs font-semibold text-slate-700">
                Negative marks per wrong answer
                <input required type="number" min={0} max={10} step="0.01" value={testForm.negativeMarksPerWrong} onChange={event => setTestForm({ ...testForm, negativeMarksPerWrong: Number(event.target.value) })} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-normal" />
              </label>
              <label className="space-y-1 text-xs font-semibold text-slate-700">
                Difficulty
                <select value={testForm.difficulty} onChange={event => setTestForm({ ...testForm, difficulty: event.target.value as TestFormValues['difficulty'] })} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-normal">
                  <option value="Foundation">Foundation</option><option value="Standard UPSC">Standard UPSC</option><option value="Challenging">Challenging</option>
                </select>
              </label>
              <label className="space-y-1 text-xs font-semibold text-slate-700">
                Availability
                {editingTest ? (
                  <select value={testForm.publishStatus} onChange={event => setTestForm({ ...testForm, publishStatus: event.target.value as TestFormValues['publishStatus'] })} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-normal">
                    <option value="draft">Draft — hidden from learners</option>
                    <option value="published">Published — visible to learners</option>
                  </select>
                ) : (
                  <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-normal text-slate-600">New tests start as drafts. Add questions, then publish from the test card.</p>
                )}
                <span className="block font-normal text-slate-500">Question count is calculated from questions added to this test.</span>
              </label>
            </div>
            {testActionError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-xs text-red-700">{testActionError}</p>}
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button type="button" onClick={() => setShowTestEditor(false)} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
              <button disabled={savingTest} className="rounded-xl bg-amber-600 px-5 py-2 text-sm font-bold text-white hover:bg-amber-500 disabled:opacity-50">{savingTest ? 'Saving…' : editingTest ? 'Save changes' : 'Create test'}</button>
            </div>
          </form>
        </div>
      )}

      {csvTargetTest && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="max-h-[92vh] w-full max-w-2xl space-y-5 overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Import questions from CSV</h2>
                <p className="mt-1 text-xs text-slate-500">Questions will be added to <strong>{csvTargetTest.title}</strong> and the shared question bank.</p>
              </div>
              <button onClick={() => { setCsvTargetTest(null); setCsvQuestions([]); setCsvError(null); }} aria-label="Close" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-5 w-5" /></button>
            </div>
            <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50/50 p-5">
              <label className="flex cursor-pointer items-center gap-3">
                <FileSpreadsheet className="h-8 w-8 text-amber-700" />
                <span>
                  <span className="block text-sm font-bold text-slate-900">Choose a CSV file</span>
                  <span className="block text-xs text-slate-500">UTF-8 CSV with a header row; each question needs four options and a correct answer.</span>
                </span>
                <input ref={csvInputRef} type="file" accept=".csv,text/csv" className="sr-only" onChange={event => chooseCsv(csvTargetTest, event.target.files?.[0])} />
              </label>
              <button type="button" onClick={downloadCsvTemplate} className="mt-4 text-xs font-bold text-amber-800 underline">Download CSV template</button>
            </div>
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800">Questions in this test</h3>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{csvTargetTest.questions.length} total</span>
              </div>
              {csvTargetTest.questions.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-xs text-slate-500">No questions added yet. Import a CSV to build this test.</p>
              ) : (
                <div className="max-h-44 space-y-2 overflow-y-auto rounded-xl border border-slate-200 p-3">
                  {csvTargetTest.questions.map((question, index) => (
                    <div key={`${question.id}-${index}`} className="flex items-start gap-3 border-b border-slate-100 pb-2 last:border-0">
                      <p className="flex-1 text-xs text-slate-700"><strong>{index + 1}.</strong> {question.questionEn}</p>
                      <button
                        type="button"
                        onClick={() => removeQuestionFromTest(question)}
                        disabled={removingQuestionId === question.id}
                        aria-label={`Remove question ${index + 1} from test`}
                        className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
            {csvError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">{csvError}</p>}
            {csvQuestions.length > 0 && (
              <div className="space-y-3">
                <p className="flex items-center gap-2 text-sm font-bold text-emerald-700"><CheckCircle2 className="h-4 w-4" />{csvQuestions.length} valid question(s) ready to import</p>
                <div className="max-h-52 space-y-2 overflow-y-auto rounded-xl border border-slate-200 p-3">
                  {csvQuestions.slice(0, 5).map((question, index) => (
                    <div key={index} className="border-b border-slate-100 pb-2 text-xs last:border-0">
                      <p className="font-semibold text-slate-800">{index + 1}. {question.questionEn}</p>
                      <p className="mt-1 text-slate-500">{question.optionsEn?.length} options · answer {String.fromCharCode(65 + (question.correctOptionIndex || 0))}</p>
                    </div>
                  ))}
                  {csvQuestions.length > 5 && <p className="text-xs text-slate-500">and {csvQuestions.length - 5} more…</p>}
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button onClick={() => { setCsvTargetTest(null); setCsvQuestions([]); setCsvError(null); }} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
              <button onClick={importCsvQuestions} disabled={importingCsv || csvQuestions.length === 0} className="rounded-xl bg-amber-600 px-5 py-2 text-sm font-bold text-white hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50">{importingCsv ? 'Importing…' : `Import ${csvQuestions.length || ''} questions`}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

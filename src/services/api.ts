import { 
  MockTest, 
  MainsQuestion, 
  LiveClass, 
  LibraryItem, 
  ForumPost, 
  SyllabusModule,
  Question 
} from '../types';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'learner' | 'admin';
}

export interface DatabaseStatus {
  connected: boolean;
  database: string | null;
  persistence: 'postgresql';
  configured: boolean;
  savedEncrypted: boolean;
}

export interface AspirantProfile {
  name: string;
  email: string;
  totalTestsAttempted: number;
  avgPrelimsScore: number | null;
  totalQuestionsAnswered: number;
  correctAnswers: number;
  totalTestTimeSeconds: number;
  streakDays: number;
  latestAttempt: {
    score: number;
    totalMarks: number;
    testTitle: string;
    completedAt: string;
  } | null;
  subjectMastery: {
    subject: string;
    accuracy: number;
    totalQuestions: number;
    status: string;
  }[];
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, options);
  } catch {
    throw new Error('Cannot reach Sankalp. Check that the app server is running, then try again.');
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error('The sign-in service is unavailable. Restart the app with `npm run dev`, then refresh this page.');
  }

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 401 && !url.startsWith('/api/auth/') && typeof window !== 'undefined') {
      window.dispatchEvent(new Event('sankalp:unauthorized'));
    }
    const errorMessage =
      payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string'
        ? payload.error
        : `Request failed (${response.status})`;
    throw new Error(errorMessage);
  }

  return payload as T;
}

export const api = {
  async getSession(): Promise<AuthUser | null> {
    let response: Response;
    try {
      response = await fetch('/api/auth/me');
    } catch {
      throw new Error('Cannot reach Sankalp. Check that the app server is running, then try again.');
    }
    if (response.status === 401) return null;
    if (!(response.headers.get('content-type') || '').includes('application/json')) {
      throw new Error('The sign-in service is unavailable. Restart the app with `npm run dev`, then refresh this page.');
    }
    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error('Could not verify your sign-in. Please try again.');
    }
    if (!payload || typeof payload !== 'object' || !('user' in payload)) {
      throw new Error('The sign-in response was invalid.');
    }
    return (payload as { user: AuthUser }).user;
  },

  async login(email: string, password: string): Promise<AuthUser> {
    const result = await request<{ user: AuthUser }>('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    return result.user;
  },

  async register(name: string, email: string, password: string): Promise<AuthUser> {
    const result = await request<{ user: AuthUser }>('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    return result.user;
  },

  async logout(): Promise<void> {
    await request<{ success: boolean }>('/api/auth/logout', { method: 'POST' });
  },

  async getDatabaseStatus(): Promise<DatabaseStatus> {
    return request('/api/admin/database');
  },

  async connectDatabase(connectionString: string): Promise<DatabaseStatus> {
    return request('/api/admin/database/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ connectionString })
    });
  },



  // Questions & Bulk CSV
  async getQuestions(): Promise<Question[]> {
    return request('/api/questions');
  },

  async createQuestion(question: Partial<Question>): Promise<Question> {
    return request('/api/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(question)
    });
  },

  async updateQuestion(id: number, question: Partial<Question>): Promise<Question> {
    return request(`/api/questions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(question)
    });
  },

  async importQuestionsBulk(questions: Partial<Question>[]): Promise<{ success: boolean; importedCount: number; totalQuestions: number }> {
    return request('/api/questions/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questions })
    });
  },

  async deleteQuestion(id: number): Promise<{ success: boolean }> {
    return request(`/api/questions/${id}`, { method: 'DELETE' });
  },

  // Live classes
  async getLiveClasses(): Promise<LiveClass[]> {
    return request('/api/live-classes');
  },

  async createLiveClass(cls: Partial<LiveClass>): Promise<LiveClass> {
    return request('/api/live-classes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cls)
    });
  },

  async updateLiveClass(id: string, updates: Partial<LiveClass>): Promise<LiveClass> {
    return request(`/api/live-classes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
  },

  async deleteLiveClass(id: string): Promise<{ success: boolean }> {
    return request(`/api/live-classes/${id}`, { method: 'DELETE' });
  },

  // Mock tests
  async getMockTests(): Promise<MockTest[]> {
    return request('/api/mock-tests');
  },

  async createMockTest(test: Partial<MockTest>): Promise<MockTest> {
    return request('/api/mock-tests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(test)
    });
  },

  async updateMockTest(id: string, updates: Partial<MockTest>): Promise<MockTest> {
    return request(`/api/mock-tests/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
  },

  async importQuestionsToMockTest(id: string, questions: Partial<Question>[]): Promise<{ success: boolean; importedCount: number; totalQuestions: number }> {
    return request(`/api/mock-tests/${id}/questions/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questions })
    });
  },

  async deleteQuestionFromMockTest(testId: string, questionId: number): Promise<{ success: boolean; totalQuestions: number }> {
    return request(`/api/mock-tests/${testId}/questions/${questionId}`, { method: 'DELETE' });
  },

  async deleteMockTest(id: string): Promise<{ success: boolean }> {
    return request(`/api/mock-tests/${id}`, { method: 'DELETE' });
  },

  // Mains questions
  async getMainsQuestions(): Promise<MainsQuestion[]> {
    return request('/api/mains-questions');
  },

  async createMainsQuestion(q: Partial<MainsQuestion>): Promise<MainsQuestion> {
    return request('/api/mains-questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(q)
    });
  },

  async deleteMainsQuestion(id: string): Promise<{ success: boolean }> {
    return request(`/api/mains-questions/${id}`, { method: 'DELETE' });
  },

  // Digital Library & Daily Editorials
  async getLibraryItems(): Promise<LibraryItem[]> {
    return request('/api/library');
  },

  async createLibraryItem(item: Partial<LibraryItem>): Promise<LibraryItem> {
    return request('/api/library', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item)
    });
  },

  async deleteLibraryItem(id: string): Promise<{ success: boolean }> {
    return request(`/api/library/${id}`, { method: 'DELETE' });
  },

  async uploadFiles(files: FileList | File[]): Promise<{ files: { url: string; name: string; type: string }[] }> {
    const form = new FormData();
    Array.from(files).forEach(file => form.append('files', file));
    return request('/api/uploads', { method: 'POST', body: form });
  },

  // Forum posts
  async getForumPosts(): Promise<ForumPost[]> {
    return request('/api/forum');
  },

  async createForumPost(post: Omit<ForumPost, 'id' | 'timestamp' | 'upvotes' | 'repliesCount' | 'replies'>): Promise<ForumPost> {
    return request('/api/forum', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(post)
    });
  },

  async upvoteForumPost(id: string): Promise<{ success: boolean; upvotes: number; hasUpvoted: boolean }> {
    return request(`/api/forum/${id}/upvote`, { method: 'POST' });
  },

  async addForumReply(postId: string, reply: { author: { name: string; role: string; avatarBg: string }; content: string }): Promise<NonNullable<ForumPost['replies']>[number]> {
    return request(`/api/forum/${postId}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reply)
    });
  },

  // Syllabus modules
  async getSyllabusModules(): Promise<SyllabusModule[]> {
    return request('/api/syllabus');
  },

  async updateTopicCompletion(moduleId: string, topicId: string, completed: boolean): Promise<SyllabusModule['topics'][number]> {
    return request(`/api/syllabus/${moduleId}/topics/${topicId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed })
    });
  },

  async incrementTopicRevision(moduleId: string, topicId: string): Promise<SyllabusModule['topics'][number]> {
    return request(`/api/syllabus/${moduleId}/topics/${topicId}/revision`, {
      method: 'POST'
    });
  },

  // Aspirant Profile
  async getAspirantProfile(): Promise<AspirantProfile> {
    return request('/api/profile');
  },

  // Submit test attempt
  async submitTestAttempt(data: {
    testId: string;
    score: number;
    correct: number;
    incorrect: number;
    unanswered: number;
    totalQuestions: number;
    durationSeconds: number;
    answers: { questionId: number; selectedOption: number | null }[];
  }): Promise<{ success: boolean; attempt: { id: number; completedAt: string } }> {
    return request('/api/submit-attempt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  }
};

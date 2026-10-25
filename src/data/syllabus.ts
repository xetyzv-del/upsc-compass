import type { SyllabusModule } from '../types';

export const UPSC_SYLLABUS_MODULES: SyllabusModule[] = [
  {
    id: 'gs1',
    gsPaper: 'GS-1',
    title: 'GS Paper I: Indian Heritage, Culture, History & Geography',
    topics: [
      { id: 't1', name: 'Art & Culture: Architecture, Sculpture & Temples (Nagara/Dravida)', completed: false, revisionCount: 0, priority: 'High' },
      { id: 't2', name: 'Modern Indian History: 1857 Revolt to Indian Independence 1947', completed: false, revisionCount: 0, priority: 'High' },
      { id: 't3', name: 'Post-Independence Consolidation & Reorganization', completed: false, revisionCount: 0, priority: 'Medium' },
      { id: 't4', name: 'Physical Geography: Geomorphology, Oceanography, Climatology', completed: false, revisionCount: 0, priority: 'High' },
      { id: 't5', name: 'Indian Society: Diversity, Globalization, Secularism & Caste', completed: false, revisionCount: 0, priority: 'Medium' }
    ]
  },
  {
    id: 'gs2',
    gsPaper: 'GS-2',
    title: 'GS Paper II: Governance, Constitution, Polity & International Relations',
    topics: [
      { id: 't6', name: 'Constitutional Framework: Preamble, Fundamental Rights & DPSP', completed: false, revisionCount: 0, priority: 'High' },
      { id: 't7', name: 'Parliament & State Legislatures: Functioning & Parliamentary Committees', completed: false, revisionCount: 0, priority: 'High' },
      { id: 't8', name: 'Judiciary: Judicial Review, Collegium System & Judicial Activism', completed: false, revisionCount: 0, priority: 'High' },
      { id: 't9', name: 'Statutory & Quasi-Judicial Bodies (CBI, CVC, CAG, ECI, NHRC)', completed: false, revisionCount: 0, priority: 'Medium' },
      { id: 't10', name: 'International Relations: India & Neighbourhood, Quad, BRICS, IMEC', completed: false, revisionCount: 0, priority: 'High' }
    ]
  },
  {
    id: 'gs3',
    gsPaper: 'GS-3',
    title: 'GS Paper III: Technology, Economic Development, Biodiversity & Security',
    topics: [
      { id: 't11', name: 'Indian Economy: Macroeconomics, Inflation, Banking & Fiscal Policy', completed: false, revisionCount: 0, priority: 'High' },
      { id: 't12', name: 'Agriculture: MSP, Food Processing, Subsidies & Supply Chains', completed: false, revisionCount: 0, priority: 'High' },
      { id: 't13', name: 'Environment & Climate Change: Paris Agreement, Ramsar Sites, COP30', completed: false, revisionCount: 0, priority: 'High' },
      { id: 't14', name: 'Science & Tech: AI, Space Exploration (Gaganyaan, Aditya-L1), Biotech', completed: false, revisionCount: 0, priority: 'Medium' },
      { id: 't15', name: 'Internal Security: Border Management, Cyber Threat & Left-Wing Extremism', completed: false, revisionCount: 0, priority: 'High' }
    ]
  },
  {
    id: 'gs4',
    gsPaper: 'GS-4',
    title: 'GS Paper IV: Ethics, Integrity and Aptitude',
    topics: [
      { id: 't16', name: 'Ethics in Public Administration: Nolan Committee Principles', completed: false, revisionCount: 0, priority: 'High' },
      { id: 't17', name: 'Attitude, Emotional Intelligence & Foundational Values for Civil Services', completed: false, revisionCount: 0, priority: 'High' },
      { id: 't18', name: 'Moral Thinkers & Philosophers: Western & Indian Thinkers', completed: false, revisionCount: 0, priority: 'Medium' },
      { id: 't19', name: 'Case Studies: Resolution Matrices & Dilemmas in Bureaucracy', completed: false, revisionCount: 0, priority: 'High' }
    ]
  }
];

export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

export interface TestcaseDTO {
  id?: string;
  input: string;
  output: string;
  isSample: boolean;
  explanation?: string | null;
  order?: number;
}

export interface ProblemDTO {
  id: string;
  slug: string;
  title: string;
  difficulty: Difficulty;
  timeLimit: number;
  memoryLimit: number;
  description: string;
  inputFormat?: string | null;
  outputFormat?: string | null;
  constraints?: string | null;
  tags?: string | null;
  createdAt: string;
  testcases?: TestcaseDTO[];
  _count?: {
    testcases: number;
    submissions: number;
  };
}

export type Verdict =
  | 'AC'  // Accepted
  | 'WA'  // Wrong Answer
  | 'TLE' // Time Limit Exceeded
  | 'MLE' // Memory Limit Exceeded
  | 'CE'  // Compile Error
  | 'RTE' // Runtime Error
  | 'In Queue'
  | 'Processing';

export interface SingleTestResult {
  testIndex: number;
  isSample: boolean;
  verdict: Verdict;
  time?: number; // seconds
  memory?: number; // KB
  stdout?: string;
  expectedOutput?: string;
  error?: string;
  input?: string; // Input data for this test case
  explanation?: string;
}

export interface SubmissionDTO {
  id: string;
  problemId: string;
  username?: string | null;
  problem?: {
    id: string;
    slug: string;
    title: string;
  };
  languageId: number;
  language: string;
  code: string;
  status: string;
  verdict: Verdict;
  passedTests: number;
  totalTests: number;
  time?: number | null;
  memory?: number | null;
  compileOutput?: string | null;
  stderr?: string | null;
  testResults?: SingleTestResult[] | null;
  createdAt: string;
}

export interface LanguageConfig {
  id: number;
  name: string;
  monacoLang: string;
  fileExtension: string;
  defaultCode: string;
  pistonLang: string;
  pistonFile: string;
}

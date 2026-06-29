const API_URL = import.meta.env.VITE_API_URL || "/api/v1";

export type QuestionSummary = {
  id: string;
  number: number;
  title: string;
  slug: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
};

export type QuestionsResponse = {
  data: QuestionSummary[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type Testcase = {
  id: string;
  input: string;
  expectedOutput: string;
};

export type Codestub = {
  userSnippet: string;
  language: string;
};

export type QuestionDetail = QuestionSummary & {
  description: string;
  category: string[];
  timeLimit: number;
  memoryLimit: number;
  noOfSubmissions: number;
  noOfPeopleSolved: number;
  createdAt: string;
  updatedAt: string;
  testcases: Testcase[];
  codestubs: Codestub[];
};

async function request<T>(path: string, options: RequestInit = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      typeof data.error === "string" ? data.error : "Something went wrong.";
    throw new Error(message);
  }

  return data as T;
}

export type CustomRunResponse = {
  message: string;
  runId: string;
  status: string;
};

export type SubmissionResponse = {
  message: string;
  submissionId: string;
  status: string;
};

export type SubmissionDetail = {
  id: string;
  code: string;
  language: string;
  timeTaken: number | null;
  memoryUsed: number | null;
  testcasesPassed: number | null;
  totalTestcases: number | null;
  createdAt: string;
  errorLog: string | null;
  result: string;
};

export const questionsApi = {
  list(page: number, limit = 10) {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });

    return request<QuestionsResponse>(`/questions?${params.toString()}`);
  },
  detail(questionSlugOrId: string) {
    return request<QuestionDetail>(
      `/questions/${encodeURIComponent(questionSlugOrId)}`,
    );
  },
  run(questionId: string, payload: {
    code: string;
    language: string;
    customInput?: string;
  }) {
    return request<CustomRunResponse>(
      `/questions/${encodeURIComponent(questionId)}/run`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
  },
  submit(questionId: string, payload: { code: string; language: string }) {
    return request<SubmissionResponse>(
      `/questions/${encodeURIComponent(questionId)}/submissions`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
  },
  fetchSubmissionById(submissionId: string) {
    return request<SubmissionDetail>(`/submissions/${encodeURIComponent(submissionId)}`);
  },
};

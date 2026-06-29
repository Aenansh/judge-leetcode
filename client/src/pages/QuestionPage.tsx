import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { questionsApi } from "../api/questions";
import type { QuestionDetail } from "../api/questions";
import CodeEditor from "../components/CodeEditor";

// Pastel-themed difficulty colors
const difficultyStyles = {
  EASY: "bg-emerald-400/10 text-emerald-300 border border-emerald-400/20",
  MEDIUM: "bg-amber-400/10 text-amber-300 border border-amber-400/20",
  HARD: "bg-rose-400/10 text-rose-300 border border-rose-400/20",
};

export default function QuestionPage() {
  const { questionSlug } = useParams();
  const [question, setQuestion] = useState<QuestionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;
    const loadQuestion = async () => {
      if (!questionSlug) {
        setError("Question slug is missing.");
        setIsLoading(false);
        return;
      }
      try {
        const response = await questionsApi.detail(questionSlug);
        if (isActive) setQuestion(response);
      } catch (loadError) {
        if (isActive) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load question.",
          );
        }
      } finally {
        if (isActive) setIsLoading(false);
      }
    };
    loadQuestion();
    return () => {
      isActive = false;
    };
  }, [questionSlug]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#121212] text-zinc-400">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#282828] border-t-emerald-400" />
          <p className="text-lg">Preparing workspace...</p>
        </div>
      </div>
    );
  }

  if (error || !question) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#121212] p-6">
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-8 text-rose-400 text-center max-w-md shadow-2xl">
          <p className="font-semibold text-xl mb-3">Unable to Load</p>
          <p className="text-rose-300/80 mb-6">
            {error || "Question not found."}
          </p>
          <Link
            to="/problems"
            className="rounded-md bg-rose-500/20 px-4 py-2 text-sm font-medium hover:bg-rose-500/30 transition-colors"
          >
            Return to Problems
          </Link>
        </div>
      </div>
    );
  }

  // Calculate Acceptance Rate
  const acceptanceRate =
    question.noOfSubmissions > 0
      ? ((question.noOfPeopleSolved / question.noOfSubmissions) * 100).toFixed(
          1,
        )
      : "0.0";

  return (
    <div className="flex h-screen w-full bg-[#121212] text-zinc-300 overflow-hidden font-sans selection:bg-emerald-500/30 p-2 gap-2">
      {/* ================= LEFT PANE: QUESTION DATA ================= */}
      <div className="flex w-1/2 flex-col bg-[#1e1e1e] rounded-lg border border-white/5 shadow-xl overflow-hidden">
        {/* Top Navigation */}
        <div className="flex items-center justify-between bg-[#282828] px-6 py-3 border-b border-white/5">
          <Link
            to="/problems"
            className="flex items-center gap-2 text-sm font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <span className="text-lg">←</span> Back to Problems
          </Link>
        </div>

        {/* Scrollable Problem Content */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="flex items-center gap-4 mb-6">
            <h1 className="text-3xl font-bold text-zinc-100">
              {question.number}. {question.title}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3 mb-8">
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${difficultyStyles[question.difficulty]}`}
            >
              {question.difficulty}
            </span>
            {question.category.map((cat) => (
              <span
                key={cat}
                className="rounded-full bg-white/5 border border-white/5 px-3 py-1 text-xs font-medium text-zinc-300"
              >
                {cat.replaceAll("_", " ")}
              </span>
            ))}
          </div>

          {/* Minimalist Stats */}
          <div className="flex gap-8 mb-10 pb-6 border-b border-white/5 text-sm">
            <div>
              <p className="text-zinc-500 mb-1">Acceptance</p>
              <p className="font-semibold text-zinc-200">{acceptanceRate}%</p>
            </div>
            <div>
              <p className="text-zinc-500 mb-1">Submissions</p>
              <p className="font-semibold text-zinc-200">
                {question.noOfSubmissions.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Description */}
          <div className="prose prose-invert max-w-none text-zinc-300 mb-12 whitespace-pre-wrap leading-relaxed text-[15px]">
            {question.description}
          </div>

          {/* Pastel-Themed Examples */}
          <div className="space-y-6 mb-8">
            <h2 className="text-lg font-semibold text-zinc-100">Examples</h2>
            {question.testcases.length === 0 ? (
              <p className="text-sm text-zinc-500">
                No visible test cases provided.
              </p>
            ) : (
              question.testcases.map((testcase, index) => (
                <div
                  key={testcase.id}
                  className="rounded-lg bg-[#282828]/50 border border-white/5 overflow-hidden"
                >
                  <div className="px-5 py-3 text-xs font-semibold text-zinc-400 bg-white/5 border-b border-white/5">
                    Example {index + 1}
                  </div>
                  <div className="p-5 space-y-4 font-mono text-sm leading-relaxed">
                    <div>
                      <span className="text-zinc-500 select-none block mb-1 font-sans text-xs uppercase tracking-wider">
                        Input
                      </span>
                      <span className="text-zinc-200">{testcase.input}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 select-none block mb-1 font-sans text-xs uppercase tracking-wider">
                        Output
                      </span>
                      <span className="text-emerald-300 bg-emerald-400/10 px-2 py-1 rounded inline-block border border-emerald-400/10">
                        {testcase.expectedOutput}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ================= RIGHT PANE: EDITOR ================= */}
      <div className="flex w-1/2 flex-col min-w-0">
        <CodeEditor question={question} />
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { questionsApi } from "../api/questions";
import type { QuestionSummary, QuestionsResponse } from "../api/questions";

const PAGE_SIZE = 10;

const difficultyStyles = {
  EASY: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  MEDIUM: "bg-amber-50 text-amber-700 ring-amber-200",
  HARD: "bg-red-50 text-red-700 ring-red-200",
};

function ProblemsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const pageParam = Number(searchParams.get("page") || "1");
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
  const [questions, setQuestions] = useState<QuestionSummary[]>([]);
  const [meta, setMeta] = useState<Omit<QuestionsResponse, "data">>({
    total: 0,
    page,
    limit: PAGE_SIZE,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    const loadQuestions = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await questionsApi.list(page, PAGE_SIZE);

        if (!isActive) {
          return;
        }
        setQuestions(response.data);
        setMeta({
          total: response.total,
          page: response.page,
          limit: response.limit,
          totalPages: response.totalPages || 1,
        });
      } catch (loadError) {
        if (!isActive) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load problems.",
        );
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    loadQuestions();

    return () => {
      isActive = false;
    };
  }, [page]);

  const goToPage = (nextPage: number) => {
    setSearchParams({ page: String(nextPage) });
  };

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-700 bg-[#2a2a2a] p-6 shadow-sm shadow-slate-950/20 text-slate-100">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-emerald-400">
              Problem set
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-100">
              Practice problems
            </h1>
          </div>
          <p className="text-sm text-slate-400">
            {meta.total} total problems
          </p>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-700 bg-[#2a2a2a] shadow-sm shadow-slate-950/20 text-slate-100">
        <div className="grid grid-cols-[80px_1fr_120px] gap-4 border-b border-slate-700 bg-slate-800 px-5 py-3 text-sm font-semibold text-slate-300">
          <span>#</span>
          <span>Title</span>
          <span>Difficulty</span>
        </div>

        {isLoading ? (
          <div className="px-5 py-10 text-center text-slate-500">
            Loading problems...
          </div>
        ) : error ? (
          <div className="px-5 py-10 text-center text-red-600">{error}</div>
        ) : questions.length === 0 ? (
          <div className="px-5 py-10 text-center text-slate-500">
            No problems found.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {questions.map((question) => (
              <Link
                key={question.id}
                to={`/questions/${question.slug}`}
                className="grid grid-cols-[80px_1fr_120px] gap-4 px-5 py-4 transition hover:bg-slate-700/70"
              >
                <span className="text-sm text-slate-400">
                  {question.number}
                </span>
                <span className="font-medium text-slate-100">
                  {question.title}
                </span>
                <span>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${difficultyStyles[question.difficulty]}`}
                  >
                    {question.difficulty}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            Page {meta.page} of {meta.totalPages || 1}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1 || isLoading}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => goToPage(page + 1)}
              disabled={page >= meta.totalPages || isLoading}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default ProblemsPage;

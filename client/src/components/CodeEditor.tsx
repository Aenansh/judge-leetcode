import { useState, useEffect } from "react";
import Editor from "@monaco-editor/react";
import { questionsApi } from "../api/questions";
import type { QuestionDetail, SubmissionDetail } from "../api/questions";
import { useWorkspaceStore } from "../store/workspaceStore";

type CodeEditorProps = {
  question: QuestionDetail;
};

export default function CodeEditor({ question }: CodeEditorProps) {
  // Editor State
  const [language, setLanguage] = useState<string>("");
  const [code, setCode] = useState<string>("");

  const setCachedCode = useWorkspaceStore((state) => state.setCode);
  const getCachedCode = useWorkspaceStore((state) => state.getCode);

  // Console State
  const [customInput, setCustomInput] = useState<string>("");
  const [results, setResults] = useState<any>(null);
  const [submission, setSubmission] = useState<SubmissionDetail | null>(null);

  // UI State
  const [processType, setProcessType] = useState<"run" | "submit" | null>(null);
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"input" | "output">("input");
  const [activeTestcaseIndex, setActiveTestcaseIndex] = useState(0);

  // Initialize language and code stub
  useEffect(() => {
    if (question.codestubs.length > 0) {
      const defaultLang = language || question.codestubs[0].language;
      const defaultStub =
        question.codestubs.find((s) => s.language === defaultLang)
          ?.userSnippet || "";

      const resolvedCode = getCachedCode(question.id, defaultLang, defaultStub);

      setLanguage(defaultLang);
      setCode(resolvedCode);
    }
  }, [question, language]);

  const handleEditorChange = (value: string | undefined) => {
    const updatedCode = value || "";
    setCode(updatedCode);
    // Silent mirror to localStorage via Zustand on every keystroke
    setCachedCode(question.id, language, updatedCode);
  };

  // ==========================================
  // BULLETPROOF RUN POLLING
  // ==========================================
  const pollRunResult = async (runId: string) => {
    let pollCount = 0;
    const interval = setInterval(async () => {
      pollCount++;
      if (pollCount > 70) {
        // Timeout after 30 seconds
        setProcessType(null);
        clearInterval(interval);
        return;
      }

      try {
        const res = await fetch(`/api/v1/run/${runId}`).then(async (r) => {
          if (!r.ok) throw new Error("Not ready");
          return r.json();
        });

        console.log("Run API Response:", res); // Debug log

        // Deep extraction to handle { data: {...} } or { run: {...} } wrappers
        const data = res?.data || res?.run || res;

        // Wait until 'status' actually exists and is finalized
        if (data && data.status) {
          if (data.status !== "RUNNING" && data.status !== "PENDING") {
            setResults(data);
            setProcessType(null);
            clearInterval(interval);
          }
        }
      } catch (err) {
        // DO NOT clear interval here! Just wait for the next tick.
        console.warn("Waiting for run results...");
      }
    }, 1000);
  };

  const handleRun = async () => {
    setProcessType("run");
    setResults(null);
    setSubmission(null);
    setIsConsoleOpen(true);
    setActiveTab("output");
    setActiveTestcaseIndex(0);

    try {
      const { runId } = await questionsApi.run(question.id, {
        code,
        language,
        customInput,
      });
      pollRunResult(runId);
    } catch (err) {
      setProcessType(null);
    }
  };

  // ==========================================
  // BULLETPROOF SUBMISSION POLLING
  // ==========================================
  const handleSubmit = async () => {
    setProcessType("submit");
    setResults(null);
    setSubmission(null);
    setIsConsoleOpen(true);
    setActiveTab("output");

    try {
      const { submissionId } = await questionsApi.submit(question.id, {
        code,
        language,
      });

      let pollCount = 0;
      const interval = setInterval(async () => {
        pollCount++;
        if (pollCount > 80) {
          // Timeout after 45 seconds for heavy submissions
          setProcessType(null);
          clearInterval(interval);
          return;
        }

        try {
          const res = await questionsApi.fetchSubmissionById(submissionId);
          console.log("Submission API Response:", res); // Debug log

          // Deep extraction to handle { data: {...} } or { submission: {...} } wrappers
          const data = (res as any)?.submission || (res as any)?.data || res;

          // Wait until 'result' actually exists and is finalized
          if (data && data.result) {
            if (data.result !== "RUNNING" && data.result !== "PENDING") {
              setSubmission(data);
              setProcessType(null);
              clearInterval(interval);
            }
          }
        } catch (err) {
          // DO NOT clear interval here! The DB record might just not be created yet by the worker.
          console.warn("Waiting for submission to be graded...");
        }
      }, 1000);
    } catch (err) {
      setProcessType(null);
    }
  };

  const formatResultStatus = (status: string | undefined) => {
    if (!status) return "Unknown Error";
    if (status === "SUCCESS") return "Accepted";
    return status.replaceAll("_", " ");
  };

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] rounded-lg overflow-hidden border border-white/5 shadow-xl">
      {/* ================= EDITOR TOP BAR ================= */}
      <div className="flex h-12 items-center justify-between bg-[#282828] px-4 border-b border-white/5">
        <select
          value={language}
          onChange={(e) => {
            const stub = question.codestubs.find(
              (s) => s.language === e.target.value,
            );
            setLanguage(e.target.value);
            setCode(stub?.userSnippet || "");
          }}
          className="rounded-md border border-white/10 bg-[#333] px-3 py-1.5 text-sm text-zinc-200 outline-none hover:border-white/20 focus:border-emerald-500/50 transition-all cursor-pointer"
        >
          {question.codestubs.map((s) => (
            <option key={s.language} value={s.language}>
              {s.language}
            </option>
          ))}
        </select>

        <div className="flex gap-3">
          <button
            disabled={processType !== null}
            onClick={handleRun}
            className="flex items-center gap-2 rounded-md bg-[#333] hover:bg-[#444] px-4 py-1.5 text-sm font-medium text-zinc-300 transition-colors disabled:opacity-50"
          >
            {processType === "run" ? (
              <span className="w-4 h-4 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin"></span>
            ) : (
              "▶"
            )}
            Run
          </button>
          <button
            disabled={processType !== null}
            onClick={handleSubmit}
            className="flex items-center gap-2 rounded-md bg-emerald-600/80 hover:bg-emerald-500 px-4 py-1.5 text-sm font-medium text-emerald-50 transition-colors disabled:opacity-50"
          >
            {processType === "submit" && (
              <span className="w-4 h-4 border-2 border-emerald-100 border-t-transparent rounded-full animate-spin"></span>
            )}
            Submit
          </button>
        </div>
      </div>

      {/* ================= MONACO EDITOR ================= */}
      <div className="flex-1 min-h-0 relative">
        <Editor
          height="100%"
          language={language.toLowerCase()}
          theme="vs-dark"
          value={code}
          onChange={handleEditorChange}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            scrollBeyondLastLine: false,
            padding: { top: 24, bottom: 24 },
            smoothScrolling: true,
            lineHeight: 1.6,
          }}
        />
      </div>

      {/* ================= BOTTOM CONSOLE ================= */}
      <div
        className={`flex flex-col border-t border-white/5 bg-[#282828] transition-all duration-300 ease-in-out ${isConsoleOpen ? "h-80" : "h-12"}`}
      >
        {/* Console Navigation */}
        <div className="flex h-12 items-center px-4 border-b border-white/5 shrink-0">
          <button
            onClick={() => setIsConsoleOpen(!isConsoleOpen)}
            className="flex items-center gap-2 text-sm font-medium text-zinc-400 hover:text-zinc-100 transition-colors"
          >
            <span>Console</span>
            <span
              className={`text-xs transition-transform duration-300 ${isConsoleOpen ? "rotate-180" : ""}`}
            >
              ▲
            </span>
          </button>

          {isConsoleOpen && (
            <div className="flex items-center gap-2 border-l border-white/10 ml-4 pl-4 h-full py-2">
              <button
                onClick={() => setActiveTab("input")}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${activeTab === "input" ? "bg-white/10 text-zinc-100 font-medium" : "text-zinc-400 hover:text-zinc-200"}`}
              >
                Testcases
              </button>
              <button
                onClick={() => setActiveTab("output")}
                className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors ${activeTab === "output" ? "bg-white/10 text-zinc-100 font-medium" : "text-zinc-400 hover:text-zinc-200"}`}
              >
                Execution Result
                {(results || submission) && (
                  <span
                    className={`w-2 h-2 rounded-full ${results?.status === "SUCCESS" || submission?.result === "SUCCESS" ? "bg-emerald-500" : "bg-rose-500"}`}
                  ></span>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Console Body */}
        {isConsoleOpen && (
          <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#1e1e1e]">
            {/* --- TAB: CUSTOM INPUT --- */}
            {activeTab === "input" && (
              <div className="p-5 h-full flex flex-col max-w-3xl">
                <label className="text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wider">
                  Custom Input
                </label>
                <textarea
                  placeholder="Enter custom testcase input here...\nMultiple testcases can be separated by newlines depending on your backend logic."
                  className="flex-1 w-full resize-none rounded-md border border-white/10 bg-[#282828] p-4 text-sm font-mono text-zinc-200 outline-none focus:border-emerald-500/50 transition-colors"
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                />
              </div>
            )}

            {/* --- TAB: EXECUTION OUTPUT --- */}
            {activeTab === "output" && (
              <div className="p-5 h-full">
                {!results && !submission && processType === null && (
                  <div className="flex h-full items-center justify-center text-sm text-zinc-500">
                    Run or submit your code to see results here.
                  </div>
                )}

                {processType !== null && (
                  <div className="flex h-full items-center justify-center gap-3 text-sm text-emerald-400 font-medium">
                    <span className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></span>
                    {processType === "run"
                      ? "Executing Testcases..."
                      : "Judging Submission..."}
                  </div>
                )}

                {/* 1. RUN RESULTS */}
                {results && processType === null && (
                  <div className="space-y-4 max-w-4xl">
                    <h3
                      className={`text-xl font-bold ${results.status === "SUCCESS" ? "text-emerald-400" : "text-rose-400"}`}
                    >
                      {results.status === "SUCCESS"
                        ? "Accepted"
                        : "Wrong Answer / Error"}
                    </h3>

                    {/* Testcase Pills */}
                    {results.results && Array.isArray(results.results) && (
                      <div className="flex gap-2 mb-4">
                        {results.results.map((tc: any, idx: number) => (
                          <button
                            key={idx}
                            onClick={() => setActiveTestcaseIndex(idx)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                              activeTestcaseIndex === idx
                                ? "bg-white/10 text-zinc-100"
                                : "bg-transparent text-zinc-400 hover:bg-white/5"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${tc.passed ? "bg-emerald-500" : "bg-rose-500"}`}
                            ></span>
                            Case {idx + 1}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Active Testcase Details */}
                    {results.results && results.results[activeTestcaseIndex] ? (
                      <div className="space-y-4 font-mono text-sm">
                        <div className="space-y-1">
                          <p className="text-zinc-500 text-xs font-sans font-semibold uppercase tracking-wider">
                            Input
                          </p>
                          <div className="bg-[#282828] border border-white/5 rounded-md p-3 text-zinc-200">
                            {results.results[activeTestcaseIndex].input ||
                              "N/A"}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-zinc-500 text-xs font-sans font-semibold uppercase tracking-wider">
                            Output
                          </p>
                          <div
                            className={`bg-[#282828] border border-white/5 rounded-md p-3 ${results.results[activeTestcaseIndex].passed ? "text-zinc-200" : "text-rose-400"}`}
                          >
                            {results.results[activeTestcaseIndex]
                              .actualOutput || "N/A"}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-zinc-500 text-xs font-sans font-semibold uppercase tracking-wider">
                            Expected
                          </p>
                          <div className="bg-[#282828] border border-white/5 rounded-md p-3 text-emerald-400">
                            {results.results[activeTestcaseIndex]
                              .expectedOutput || "N/A"}
                          </div>
                        </div>
                        {results.results[activeTestcaseIndex].error && (
                          <div className="space-y-1 mt-4">
                            <p className="text-rose-400 text-xs font-sans font-semibold uppercase tracking-wider">
                              Error / StdErr
                            </p>
                            <div className="bg-rose-500/10 border border-rose-500/20 rounded-md p-3 text-rose-300">
                              {results.results[activeTestcaseIndex].error}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Fallback if the backend returns raw data */
                      <pre className="rounded-md bg-[#282828] p-4 font-mono text-sm text-zinc-300 overflow-x-auto border border-white/5">
                        {JSON.stringify(results, null, 2)}
                      </pre>
                    )}
                  </div>
                )}

                {/* 2. SUBMISSION RESULTS */}
                {submission && processType === null && (
                  <div className="space-y-6 max-w-4xl">
                    <div className="flex items-center gap-4">
                      <h3
                        className={`text-2xl font-bold ${submission.result === "SUCCESS" ? "text-emerald-400" : "text-rose-400"}`}
                      >
                        {formatResultStatus(submission.result)}
                      </h3>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="rounded-md border border-white/5 bg-[#282828] p-4">
                        <p className="text-xs text-zinc-400 mb-1 font-medium">
                          Testcases Passed
                        </p>
                        <p className="text-xl font-bold text-zinc-100">
                          {submission.testcasesPassed ?? 0}{" "}
                          <span className="text-zinc-500 text-sm font-normal">
                            / {submission.totalTestcases ?? 0}
                          </span>
                        </p>
                      </div>

                      <div className="rounded-md border border-white/5 bg-[#282828] p-4">
                        <p className="text-xs text-zinc-400 mb-1 font-medium">
                          Time Taken
                        </p>
                        <p className="text-xl font-bold text-zinc-100">
                          {submission.timeTaken
                            ? `${submission.timeTaken} ms`
                            : "N/A"}
                        </p>
                      </div>

                      <div className="rounded-md border border-white/5 bg-[#282828] p-4">
                        <p className="text-xs text-zinc-400 mb-1 font-medium">
                          Memory Used
                        </p>
                        <p className="text-xl font-bold text-zinc-100">
                          {submission.memoryUsed
                            ? `${submission.memoryUsed} MB`
                            : "N/A"}
                        </p>
                      </div>

                      <div className="rounded-md border border-white/5 bg-[#282828] p-4">
                        <p className="text-xs text-zinc-400 mb-1 font-medium">
                          Language
                        </p>
                        <p className="text-xl font-bold text-zinc-100 capitalize">
                          {submission.language?.toLowerCase() || "N/A"}
                        </p>
                      </div>
                    </div>

                    {submission.errorLog && (
                      <div className="mt-6">
                        <p className="text-xs text-rose-400 font-semibold mb-2 uppercase tracking-wider flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                          Error Details
                        </p>
                        <pre className="rounded-md bg-rose-500/10 border border-rose-500/20 p-4 font-mono text-sm text-rose-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                          {submission.errorLog}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

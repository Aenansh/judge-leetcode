import { useEffect } from "react";
import type { ReactNode } from "react";
import {
  BrowserRouter,
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import ProblemsPage from "./pages/ProblemsPage";
import QuestionPage from "./pages/QuestionPage";
import RegisterPage from "./pages/RegisterPage";
import { useAuthStore } from "./store/authStore";

function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-[#2e2e2e] px-4 py-8 text-slate-950">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center justify-center">
        <section className="grid w-full overflow-hidden rounded-lg border border-slate-700 bg-[#2a2a2a] shadow-xl shadow-slate-950/40 md:grid-cols-[0.9fr_1.1fr]">
          <div className="hidden bg-slate-950 p-10 text-white md:flex md:flex-col md:justify-between">
            <div>
              <Link to="/" className="text-lg font-semibold tracking-wide">
                Judge LeetCode
              </Link>
              <h1 className="mt-16 text-4xl font-semibold leading-tight text-slate-100">
                Practice problems, submit code, and keep your progress tied to
                your account.
              </h1>
            </div>
          </div>
          <div className="p-6 sm:p-10">
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}

function DashboardPage() {
  const { user, logout, status } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <main className="min-h-screen bg-[#2e2e2e] px-4 py-6 text-slate-100">
      <section className="mx-auto max-w-5xl">
        <nav className="flex items-center justify-between rounded-lg border border-slate-700 bg-[#2e2e2e] px-5 py-4 shadow-sm shadow-slate-950/20">
          <Link to="/" className="text-lg font-semibold text-white">
            Judge LeetCode
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to="/problems"
              className="rounded-md px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Problems
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              disabled={status === "loading"}
              className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Logout
            </button>
          </div>
        </nav>

        <div className="mt-8 rounded-lg border border-slate-700 bg-[#2a2a2a] p-6 shadow-sm shadow-slate-950/20">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-emerald-400">
            Signed in
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-100">
            Welcome, {user?.firstName || user?.name || "coder"}.
          </h1>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-700 bg-[#272727] p-4">
              <p className="text-sm text-slate-400">Display name</p>
              <p className="mt-1 font-medium text-slate-100">{user?.name}</p>
            </div>
            <div className="rounded-lg border border-slate-700 bg-[#272727] p-4">
              <p className="text-sm text-slate-400">Email</p>
              <p className="mt-1 break-all font-medium text-slate-100">{user?.email}</p>
            </div>
          </div>
          <Link
            to="/questions"
            className="mt-6 inline-flex rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            Browse questions
          </Link>
        </div>
      </section>
    </main>
  );
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, status } = useAuthStore();
  const location = useLocation();

  if (status === "loading" || status === "idle") {
    return (
      <div className="grid min-h-screen place-items-center bg-[#2e2e2e] text-slate-200">
        Loading session...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}

function PublicRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";

  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  return children;
}

function AppRoutes() {
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <Routes>
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/login"
        element={
          <PublicRoute>
            <AuthShell>
              <LoginPage />
            </AuthShell>
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <AuthShell>
              <RegisterPage />
            </AuthShell>
          </PublicRoute>
        }
      />
      <Route
        path="/questions"
        element={
          <ProtectedRoute>
            <AppLayout>
              <ProblemsPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/questions/:questionSlug"
        element={
          <ProtectedRoute>
            <AppLayout>
              <QuestionPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function AppLayout({ children }: { children: ReactNode }) {
  const { logout, status } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <main className="min-h-screen bg-[#2e2e2e] px-4 py-6 text-slate-950">
      <section className="mx-auto max-w-6xl">
        <nav className="flex items-center justify-between rounded-lg border border-slate-700 bg-[#2e2e2e] px-5 py-4 shadow-sm shadow-slate-950/20">
          <Link to="/" className="text-lg font-semibold text-white">
            Judge LeetCode
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to="/problems"
              className="rounded-md px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Problems
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              disabled={status === "loading"}
              className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Logout
            </button>
          </div>
        </nav>
        <div className="mt-8">{children}</div>
      </section>
    </main>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;

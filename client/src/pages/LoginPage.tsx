import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, status, error, clearError } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const from = location.state?.from?.pathname || "/";
  const isLoading = status === "loading";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      await login({ email, password });
      navigate(from, { replace: true });
    } catch {
      return;
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <div className="md:hidden">
        <Link to="/" className="text-lg font-semibold">
          Judge LeetCode
        </Link>
      </div>

      <div className="mt-8 md:mt-0">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-emerald-700">
          Welcome back
        </p>
        <h2 className="mt-3 text-3xl font-semibold text-slate-950">
          Login to your account
        </h2>
      </div>

      <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Email</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => {
              clearError();
              setEmail(event.target.value);
            }}
            className="mt-2 w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
            placeholder="you@example.com"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">Password</span>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(event) => {
              clearError();
              setPassword(event.target.value);
            }}
            className="mt-2 w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
            placeholder="Enter your password"
          />
        </label>

        {error ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-md bg-slate-950 px-4 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? "Logging in..." : "Login"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        New here?{" "}
        <Link
          to="/register"
          className="font-semibold text-emerald-700 hover:text-emerald-800"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}

export default LoginPage;

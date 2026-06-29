import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

function RegisterPage() {
  const navigate = useNavigate();
  const { register, status, error, clearError } = useAuthStore();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const isLoading = status === "loading";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      await register({
        firstName,
        lastName,
        name,
        email,
        password,
      });
      navigate("/", { replace: true });
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
          Start practicing
        </p>
        <h2 className="mt-3 text-3xl font-semibold text-slate-950">
          Register your account
        </h2>
      </div>

      <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">
              First name
            </span>
            <input
              type="text"
              required
              autoComplete="given-name"
              value={firstName}
              onChange={(event) => {
                clearError();
                setFirstName(event.target.value);
              }}
              className="mt-2 w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
              placeholder="Ada"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">
              Last name
            </span>
            <input
              type="text"
              required
              autoComplete="family-name"
              value={lastName}
              onChange={(event) => {
                clearError();
                setLastName(event.target.value);
              }}
              className="mt-2 w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
              placeholder="Lovelace"
            />
          </label>
        </div>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">
            Display name
          </span>
          <input
            type="text"
            required
            autoComplete="nickname"
            value={name}
            onChange={(event) => {
              clearError();
              setName(event.target.value);
            }}
            className="mt-2 w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
            placeholder="ada_codes"
          />
        </label>

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
            minLength={6}
            autoComplete="new-password"
            value={password}
            onChange={(event) => {
              clearError();
              setPassword(event.target.value);
            }}
            className="mt-2 w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
            placeholder="At least 6 characters"
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
          {isLoading ? "Creating account..." : "Register"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        Already registered?{" "}
        <Link
          to="/login"
          className="font-semibold text-emerald-700 hover:text-emerald-800"
        >
          Login
        </Link>
      </p>
    </div>
  );
}

export default RegisterPage;

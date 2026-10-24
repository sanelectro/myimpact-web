import { useState, type FormEvent } from "react";
import {
  acceptInvitation,
  registerAccount,
  signIn,
  type AuthSession,
} from "../../auth/auth";
import "./Login.css";

const demoUsers = [
  { name: "MyImpact Admin", role: "Platform Administrator", email: "myimpact-admin@example.com" },
  { name: "Aditi Rao", level: "JL1", role: "Trainee Software Engineer", email: "user-tse@example.com" },
  { name: "Omar Farouk", level: "JL2", role: "Junior Software Engineer", email: "user-jse@example.com" },
  { name: "Priya Sharma", level: "JL3", role: "Software Engineer", email: "user-se@example.com" },
  { name: "Mei Chen", level: "JL4", role: "Senior Software Engineer", email: "user-sse@example.com" },
  { name: "Nina Patel", level: "JL4", role: "Engineering Manager", email: "user-em@example.com" },
  { name: "Alex Johnson", level: "JL5", role: "Lead Software Engineer", email: "user-lse@example.com" },
  { name: "Rafael Costa", level: "JL5", role: "Lead Software Architect", email: "user-lsa@example.com" },
  { name: "Jordan Lee", level: "JL5", role: "Senior Engineering Manager", email: "user-sem@example.com" },
  { name: "Samira Khan", level: "JL6", role: "Engineering Director", email: "user-ed@example.com" },
];

interface LoginPageProps {
  onLogin: (session: AuthSession) => void;
  notice?: string | null;
}

export default function LoginPage({ onLogin, notice }: LoginPageProps) {
  const invitationToken = new URLSearchParams(
    window.location.hash.replace(/^#/, ""),
  ).get("invite");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      const session = invitationToken
        ? await acceptInvitation(invitationToken, password)
        : isRegistering
          ? await registerAccount(name, email, company, password)
          : await signIn(email, password);
      if (invitationToken) {
        window.history.replaceState(null, "", window.location.pathname);
      }
      onLogin(session);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not sign in. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <div className="login-layout">
        <aside className="demo-users" aria-labelledby="demo-users-title">
          <div className="demo-users-heading">
            <span className="demo-users-eyebrow">MYIMPACT WORKSPACE</span>
            <h2 id="demo-users-title">Demo users</h2>
          </div>
          <div className="demo-user-list">
            {demoUsers.map((demoUser) => (
              <button
                className="demo-user"
                type="button"
                key={demoUser.email}
                aria-pressed={email === demoUser.email}
                onClick={() => {
                  setEmail(demoUser.email);
                  setCompany("");
                  setPassword("");
                  setIsRegistering(false);
                  setError("");
                }}
              >
                <span className="demo-user-name">{demoUser.name}</span>
                <span className="demo-user-role">
                  {"level" in demoUser ? `${demoUser.level} - ` : ""}
                  {demoUser.role}
                </span>
                <span className="demo-user-email">{demoUser.email}</span>
              </button>
            ))}
          </div>
        </aside>

        <section className="login-panel" aria-labelledby="login-title">
        <div className="login-brand">
          <div className="login-brand-mark" aria-hidden="true">M</div>
          <span>MyImpact</span>
        </div>
        <div className="login-heading">
          <div className="eyebrow">CAREER IMPACT WORKSPACE</div>
          <h1 id="login-title">{invitationToken ? "Accept invitation" : "Sign in"}</h1>
          <p>
            {invitationToken
              ? "Set a password to activate your MyImpact account."
              : isRegistering
                ? "Create your MyImpact account."
                : "Sign in to your MyImpact account."}
          </p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {notice && <p className="login-error" role="status">{notice}</p>}
          {!invitationToken && isRegistering && (
            <>
              <label htmlFor="name">Name</label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                maxLength={200}
              />
              <label htmlFor="company">Organization</label>
              <input
                id="company"
                name="company"
                type="text"
                autoComplete="organization"
                value={company}
                onChange={(event) => setCompany(event.target.value)}
                required
                maxLength={200}
              />
            </>
          )}

          {!invitationToken && (
            <>
              <label htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </>
          )}

          <label htmlFor="password">
            {invitationToken ? "Create password" : "Password"}
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete={isRegistering || invitationToken ? "new-password" : "current-password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={isRegistering || invitationToken ? 12 : 1}
            maxLength={128}
          />

          {error && <p className="login-error" role="alert">{error}</p>}
          <button className="login-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? "Please wait…"
              : invitationToken
                ? "Activate account"
                : isRegistering
                  ? "Create account"
                  : "Sign in"}
          </button>
        </form>

        {!invitationToken && <p className="login-notice">
          {isRegistering ? "Already have an account? " : "New to MyImpact? "}
          <button
            className="login-mode-toggle"
            type="button"
            onClick={() => {
              setIsRegistering((registering) => !registering);
              setError("");
            }}
          >
            {isRegistering ? "Sign in" : "Create an account"}
          </button>
        </p>}
        </section>
      </div>
    </main>
  );
}
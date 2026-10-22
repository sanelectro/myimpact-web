import { useState, type FormEvent } from "react";
import { authenticateMockUser, type MockSession } from "../../auth/mockAuth";
import "./Login.css";

interface LoginPageProps {
  onLogin: (session: MockSession) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const session = authenticateMockUser(username, password);
    if (!session) {
      setError("Username or password is incorrect.");
      return;
    }

    setError("");
    onLogin(session);
  }

  return (
    <main className="login-page">
      <section className="login-panel" aria-labelledby="login-title">
        <div className="login-brand">
          <div className="login-brand-mark" aria-hidden="true">M</div>
          <span>MyImpact</span>
        </div>
        <div className="login-heading">
          <div className="eyebrow">CAREER IMPACT WORKSPACE</div>
          <h1 id="login-title">Sign in</h1>
          <p>Use a demo account to continue.</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label htmlFor="username">Username</label>
          <input
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            required
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />

          {error && <p className="login-error" role="alert">{error}</p>}
          <button className="login-submit" type="submit">Sign in</button>
        </form>

        <p className="login-notice">Mock login for local testing only.</p>
      </section>
    </main>
  );
}
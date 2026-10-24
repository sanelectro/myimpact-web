export interface AuthSession {
  userId: string;
  username: string;
  displayName: string;
  role: string;
  isPlatformAdmin: boolean;
  careerLevel: number;
  accessToken: string;
}

export interface CareerStage {
  level: number;
  label: string;
  title: string;
  description: string;
}

interface AuthPayload {
  access_token: string;
  expires_in: number;
  user: {
    id: string;
    name: string;
    email: string;
    role: string | null;
    is_platform_admin?: boolean;
  };
}

const AUTH_BASE_URL =
  import.meta.env.VITE_AUTH_API_BASE_URL?.replace(/\/$/, "") ??
  `${window.location.protocol}//${window.location.hostname}:8001`;

const roleCareerLevels: Record<string, number> = {
  "trainee software engineer": 1,
  intern: 1,
  "junior software engineer": 2,
  "software engineer": 3,
  "senior software engineer": 4,
  "engineering manager": 4,
  "lead software engineer": 5,
  "lead software architect": 5,
  "senior engineering manager": 5,
  "engineering director": 6,
  "technical director": 6,
};

let currentSession: AuthSession | null = null;
let refreshInFlight: Promise<AuthSession | null> | null = null;

function toSession(payload: AuthPayload): AuthSession {
  const role = payload.user.role ?? "MyImpact member";
  const level = role.match(/(?:jl-?|level\s*)(\d+)/i);
  const careerLevel = level
    ? Number(level[1])
    : roleCareerLevels[role.trim().toLowerCase()] ?? 5;
  return {
    userId: payload.user.id,
    username: payload.user.email,
    displayName: payload.user.name,
    role,
    isPlatformAdmin: payload.user.is_platform_admin === true,
    careerLevel,
    accessToken: payload.access_token,
  };
}

async function responseError(response: Response): Promise<Error> {
  let message = `Authentication request failed: ${response.status}`;
  try {
    const body = (await response.json()) as { detail?: string };
    message = body.detail ?? message;
  } catch {
    // Retain the status-based error when the response has no JSON body.
  }
  return new Error(message);
}

async function requestAuth(
  path: string,
  body?: Record<string, string>,
): Promise<AuthSession> {
  const response = await fetch(`${AUTH_BASE_URL}${path}`, {
    method: "POST",
    credentials: "include",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) throw await responseError(response);
  const payload = (await response.json()) as AuthPayload;
  currentSession = toSession(payload);
  return currentSession;
}

export function getAuthSession(): AuthSession | null {
  return currentSession;
}

export function getAccessToken(): string {
  if (!currentSession) throw new Error("Sign in before making API requests.");
  return currentSession.accessToken;
}

export function getCurrentUserId(): string {
  if (!currentSession) throw new Error("Sign in before making API requests.");
  return currentSession.userId;
}

export function signIn(email: string, password: string): Promise<AuthSession> {
  return requestAuth("/auth/login", { email, password });
}

export function registerAccount(
  name: string,
  email: string,
  company: string,
  password: string,
): Promise<AuthSession> {
  return requestAuth("/auth/register", { name, email, company, password });
}

export function acceptInvitation(
  token: string,
  password: string,
): Promise<AuthSession> {
  return requestAuth("/auth/accept-invitation", { token, password });
}

export function refreshSession(): Promise<AuthSession | null> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const response = await fetch(`${AUTH_BASE_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    if (response.status === 401) {
      currentSession = null;
      return null;
    }
    if (!response.ok) throw await responseError(response);
    const payload = (await response.json()) as AuthPayload;
    currentSession = toSession(payload);
    return currentSession;
  })().finally(() => {
    refreshInFlight = null;
  });

  return refreshInFlight;
}

export async function restoreSession(): Promise<AuthSession | null> {
  return refreshSession();
}

export async function signOut(): Promise<void> {
  try {
    const response = await fetch(`${AUTH_BASE_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
    if (!response.ok) throw await responseError(response);
  } finally {
    currentSession = null;
  }
}

export function getCareerStages(
  currentLevel: number,
): [CareerStage, CareerStage, CareerStage] {
  const stageDetails: Record<number, Omit<CareerStage, "level" | "label">> = {
    3: {
      title: "Develop & contribute",
      description: "Build reliable delivery foundations and grow technical capability.",
    },
    4: {
      title: "Build & deliver",
      description: "Grow technical depth and deliver reliably.",
    },
    5: {
      title: "Lead & influence",
      description:
        "Lead technical direction, mentor others and create impact beyond individual delivery.",
    },
    6: {
      title: "Lead at scale",
      description:
        "Shape architecture, strategy and outcomes across a broader organisation.",
    },
  };
  return [currentLevel - 1, currentLevel, currentLevel + 1].map((level) => ({
    level,
    label: `JL${level}`,
    ...(stageDetails[level] ?? {
      title: "Grow & contribute",
      description: "Build the skills and evidence for your next career step.",
    }),
  })) as [CareerStage, CareerStage, CareerStage];
}

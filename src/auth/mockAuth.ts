export interface MockSession {
  userId: string;
  username: string;
  displayName: string;
  role: string;
  careerLevel: number;
}

export interface CareerStage {
  level: number;
  label: string;
  title: string;
  description: string;
}

const careerStages: Record<number, Omit<CareerStage, "level" | "label">> = {
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
    description: "Lead technical direction, mentor others and create impact beyond individual delivery.",
  },
  6: {
    title: "Lead at scale",
    description: "Shape architecture, strategy and outcomes across a broader organisation.",
  },
};

export function getCareerStages(currentLevel: number): [CareerStage, CareerStage, CareerStage] {
  return [currentLevel - 1, currentLevel, currentLevel + 1].map((level) => ({
    level,
    label: `JL${level}`,
    ...(careerStages[level] ?? {
      title: "Grow & contribute",
      description: "Build the skills and evidence for your next career step.",
    }),
  })) as [CareerStage, CareerStage, CareerStage];
}

interface MockAccount {
  username: string;
  password: string;
  session: MockSession;
}

const SESSION_KEY = "myimpact.mock-session";

const accounts: MockAccount[] = [
  {
    username: "alex",
    password: "alex123",
    session: {
      userId: "user-1",
      username: "alex",
      displayName: "Alex Johnson",
      role: "Lead Software Engineer",
      careerLevel: 5,
    },
  },
  {
    username: "priya",
    password: "priya123",
    session: {
      userId: "user-2",
      username: "priya",
      displayName: "Priya Sharma",
      role: "Software Engineer",
      careerLevel: 4,
    },
  },
  {
    username: "empty",
    password: "empty123",
    session: {
      userId: "user-empty",
      username: "empty",
      displayName: "Empty State User",
      role: "Software Engineer",
      careerLevel: 4,
    },
  },
  {
    username: "user-3",
    password: "jl4-demo",
    session: {
      userId: "user-3",
      username: "user-3",
      displayName: "Test User 3",
      role: "JL-4",
      careerLevel: 4,
    },
  },
];

export function authenticateMockUser(
  username: string,
  password: string,
): MockSession | null {
  const normalizedUsername = username.trim().toLowerCase();
  const account = accounts.find(
    (candidate) =>
      candidate.username === normalizedUsername && candidate.password === password,
  );

  if (!account) return null;

  localStorage.setItem(SESSION_KEY, JSON.stringify(account.session));
  return account.session;
}

export function getMockSession(): MockSession | null {
  const storedSession = localStorage.getItem(SESSION_KEY);
  if (!storedSession) return null;

  try {
    const parsed = JSON.parse(storedSession) as Partial<MockSession>;
    const account = accounts.find((candidate) => candidate.session.userId === parsed.userId);
    if (account) return account.session;
  } catch {
    // Clear malformed or obsolete local test sessions.
  }

  localStorage.removeItem(SESSION_KEY);
  return null;
}

export function clearMockSession() {
  localStorage.removeItem(SESSION_KEY);
}

export function getCurrentUserId(): string {
  const session = getMockSession();
  if (!session) throw new Error("Sign in before making API requests.");
  return session.userId;
}
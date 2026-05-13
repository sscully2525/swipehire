/**
 * Password policy.
 *
 * Rules for NEW or CHANGED passwords (existing hashes untouched):
 *   - min 10 chars
 *   - at least 3 of: lower, upper, digit, symbol
 *   - rejects the embedded top-100 common-passwords blocklist
 *   - rejects matches against the user's email local-part (when supplied)
 *
 * `zxcvbn` is used to compute a strength score (0–4). We accept score >= 2
 * which roughly corresponds to "would take >= a few hours of online attack".
 * If `zxcvbn` is unavailable (transitive install issue), the rule-based
 * checks still apply.
 */
import zxcvbn from 'zxcvbn';

// Top common passwords (subset of the SecLists / Have-I-Been-Pwned top lists).
// Keep this list small but representative; zxcvbn covers the long tail.
const COMMON_PASSWORDS: ReadonlySet<string> = new Set([
  '123456', '123456789', 'qwerty', 'password', '1234567', '12345678',
  '12345', 'iloveyou', '111111', '123123', 'abc123', 'qwerty123',
  '1q2w3e4r', 'admin', 'letmein', 'welcome', 'monkey', '1234567890',
  '0', 'a1b2c3d4', '123qwe', 'qwertyuiop', '123', 'dragon',
  '654321', 'sunshine', 'master', '666666', 'princess', '888888',
  'shadow', '777777', 'qazwsx', 'michael', 'football', 'baseball',
  'superman', 'batman', 'trustno1', 'jordan', 'harley', 'ranger',
  'jennifer', 'hunter', 'fuckyou', '2000', 'test', 'pass',
  'killer', 'george', 'asdfgh', 'thomas', 'soccer', 'liverpool',
  'ginger', 'andrew', 'andrea', 'joshua', 'amanda', 'tigger',
  'charlie', 'donald', 'freedom', 'whatever', 'qwerty1', 'pepper',
  'starwars', 'klaster', 'cookie', 'jordan23', 'qwerty12', 'computer',
  'michelle', 'love', 'maggie', 'biteme', 'mickey', 'fuckme',
  'silver', 'orange', 'merlin', 'rosebud', 'butter', 'banana',
  'hello', 'access', 'flower', 'matrix', 'asdf', 'nicole',
  'hannah', 'andrew1', 'samsung', 'qwer1234', 'asdfasdf', 'q1w2e3r4',
  'qwerty!', 'admin123', 'password1', 'password123', 'passw0rd', 'p@ssword',
  'password!', '@dmin123', 'changeme', 'temppass',
]);

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
  /** zxcvbn score, 0 (weakest) to 4 (strongest). */
  score?: number;
  /** Best-effort feedback for the UI. */
  feedback?: string[];
}

const hasLower = (s: string) => /[a-z]/.test(s);
const hasUpper = (s: string) => /[A-Z]/.test(s);
const hasDigit = (s: string) => /[0-9]/.test(s);
const hasSymbol = (s: string) => /[^A-Za-z0-9]/.test(s);

export const validatePassword = (
  password: string,
  context: { email?: string; firstName?: string; lastName?: string } = {},
): PasswordValidationResult => {
  const errors: string[] = [];

  if (!password || typeof password !== 'string') {
    return { valid: false, errors: ['Password is required'] };
  }

  if (password.length < 10) {
    errors.push('Password must be at least 10 characters');
  }
  if (password.length > 256) {
    errors.push('Password is too long (256 character maximum)');
  }

  const classCount =
    Number(hasLower(password)) +
    Number(hasUpper(password)) +
    Number(hasDigit(password)) +
    Number(hasSymbol(password));
  if (classCount < 3) {
    errors.push('Password must contain at least 3 of: lowercase, uppercase, digit, symbol');
  }

  const lowered = password.toLowerCase();
  if (COMMON_PASSWORDS.has(lowered)) {
    errors.push('That password is on the list of most-common breached passwords');
  }

  // Block obvious user-context matches
  const ctxParts: string[] = [];
  if (context.email) {
    ctxParts.push(context.email.split('@')[0].toLowerCase());
  }
  if (context.firstName) ctxParts.push(context.firstName.toLowerCase());
  if (context.lastName) ctxParts.push(context.lastName.toLowerCase());
  for (const part of ctxParts) {
    if (part.length >= 3 && lowered.includes(part)) {
      errors.push("Password is too similar to your name or email");
      break;
    }
  }

  // zxcvbn — accept score >= 2.
  let score: number | undefined;
  let feedback: string[] = [];
  try {
    const z = zxcvbn(password, ctxParts.length ? ctxParts : undefined);
    score = z.score;
    if (z.feedback?.warning) feedback.push(z.feedback.warning);
    if (z.feedback?.suggestions) feedback = feedback.concat(z.feedback.suggestions);
    if (score < 2) {
      errors.push('Password is too weak (try a longer or less common password)');
    }
  } catch {
    // zxcvbn not available — rule-based checks still applied above.
  }

  return {
    valid: errors.length === 0,
    errors,
    score,
    feedback,
  };
};

/** Throwing variant for use inside route handlers. */
export const assertStrongPassword = (
  password: string,
  context?: { email?: string; firstName?: string; lastName?: string },
): void => {
  const result = validatePassword(password, context);
  if (!result.valid) {
    const err: Error & { status?: number; details?: string[] } = new Error(
      result.errors[0] || 'Password does not meet requirements',
    );
    err.status = 400;
    err.details = result.errors;
    throw err;
  }
};

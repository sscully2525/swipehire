// Centralized runtime config for the mobile app.
//
// Resolution order:
//   1. EXPO_PUBLIC_API_URL (Expo build-time env, recommended)
//   2. process.env.API_URL (RN dotenv-style override, if configured)
//   3. Fallback to localhost for dev
//
// To override at build time:
//   EXPO_PUBLIC_API_URL=https://api.example.com expo start

const envApiUrl =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ((typeof process !== 'undefined' && (process as any).env) || {}).EXPO_PUBLIC_API_URL ||
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ((typeof process !== 'undefined' && (process as any).env) || {}).API_URL;

export const API_URL: string = envApiUrl || 'http://localhost:3001/api';

export const SOCKET_URL: string = API_URL.replace(/\/api\/?$/, '');

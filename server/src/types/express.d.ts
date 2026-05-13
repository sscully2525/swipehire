// Augment Express's Request type with our custom fields.
declare module 'express-serve-static-core' {
  interface Request {
    userId?: string;
    userRole?: string;
  }
}

export {};

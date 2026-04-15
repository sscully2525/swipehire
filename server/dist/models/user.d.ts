export interface User {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    title?: string;
    bio?: string;
    skills?: string[];
    linkedin_url?: string;
    github_url?: string;
    portfolio_url?: string;
    resume_url?: string;
    avatar_url?: string;
    video_intro_url?: string;
    location?: string;
    years_experience?: number;
    preferred_salary_min?: number;
    preferred_salary_max?: number;
    remote_preference?: string;
    daily_swipes: number;
    subscription_tier: string;
    email_verified: boolean;
    linkedin_verified: boolean;
    identity_verified: boolean;
    onboarding_completed: boolean;
    last_active_at?: Date;
}
export declare const createUser: (email: string, password: string, firstName: string, lastName: string, role?: string) => Promise<User>;
export declare const findUserByEmail: (email: string) => Promise<any>;
export declare const findUserById: (id: string) => Promise<User | null>;
export declare const updateUser: (id: string, updates: Partial<User>) => Promise<User>;
export declare const updateLastActive: (userId: string) => Promise<void>;
export declare const verifyPassword: (password: string, hash: string) => Promise<boolean>;
export declare const generateTokens: (userId: string) => {
    accessToken: string;
    refreshToken: string;
};
export declare const verifyAccessToken: (token: string) => any;
export declare const verifyRefreshToken: (token: string) => any;
export declare const storeRefreshToken: (userId: string, token: string) => Promise<void>;
export declare const invalidateRefreshToken: (userId: string) => Promise<void>;
export declare const getSwipeLimit: (tier: string) => number;
//# sourceMappingURL=user.d.ts.map
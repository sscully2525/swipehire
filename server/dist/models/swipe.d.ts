export interface Swipe {
    id: string;
    user_id: string;
    job_id: string;
    direction: 'left' | 'right';
    ai_match_score?: number;
    created_at: Date;
}
export interface Match {
    id: string;
    user_id: string;
    job_id: string;
    startup_id: string;
    status: 'pending' | 'contacted' | 'interview_scheduled' | 'hired' | 'rejected';
    user_interest_level?: number;
    company_interest_level?: number;
    scheduled_call_at?: Date;
    call_link?: string;
    notes?: string;
    created_at: Date;
}
export declare const createSwipe: (userId: string, jobId: string, direction: "left" | "right", aiMatchScore?: number) => Promise<Swipe>;
export declare const checkForMatch: (userId: string, jobId: string) => Promise<boolean>;
export declare const createMatch: (userId: string, jobId: string) => Promise<Match>;
export declare const getUserMatches: (userId: string) => Promise<any[]>;
export declare const getMatchById: (matchId: string) => Promise<any>;
export declare const updateMatchStatus: (matchId: string, status: string, updates?: any) => Promise<void>;
export declare const getRemainingSwipes: (userId: string, dailyLimit: number) => Promise<number>;
export declare const getSwipeStats: (userId: string) => Promise<any>;
//# sourceMappingURL=swipe.d.ts.map
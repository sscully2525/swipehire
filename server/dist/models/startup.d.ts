export interface Startup {
    id: string;
    name: string;
    slug: string;
    logo_url?: string;
    cover_image_url?: string;
    description: string;
    mission?: string;
    stage: string;
    location?: string;
    remote_policy: string;
    size?: string;
    website?: string;
    linkedin_url?: string;
    founded_year?: number;
    funding_amount?: string;
    verified: boolean;
    featured: boolean;
}
export interface Job {
    id: string;
    startup_id: string;
    title: string;
    description: string;
    requirements?: string[];
    responsibilities?: string[];
    salary_min?: number;
    salary_max?: number;
    salary_currency: string;
    equity_min?: number;
    equity_max?: number;
    equity_vesting?: string;
    location?: string;
    remote_allowed: boolean;
    visa_sponsorship: boolean;
    employment_type: string;
    tech_stack?: string[];
    experience_level?: string;
    status: string;
    featured: boolean;
    views_count: number;
    applications_count: number;
    startup?: Startup;
}
export declare const createStartup: (startup: Partial<Startup>, createdBy: string) => Promise<Startup>;
export declare const createJob: (job: Partial<Job>) => Promise<Job>;
export declare const getJobsForSwiping: (userId: string, filters?: any) => Promise<Job[]>;
export declare const getJobById: (id: string) => Promise<Job | null>;
export declare const incrementJobViews: (jobId: string) => Promise<void>;
export declare const seedStartupsAndJobs: () => Promise<void>;
//# sourceMappingURL=startup.d.ts.map
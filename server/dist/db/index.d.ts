import { Pool } from 'pg';
declare const pool: Pool;
export declare const query: (text: string, params?: any[]) => Promise<import("pg").QueryResult<any>>;
export declare const getClient: () => Promise<import("pg").PoolClient>;
export declare const initDB: () => Promise<void>;
export default pool;
//# sourceMappingURL=index.d.ts.map
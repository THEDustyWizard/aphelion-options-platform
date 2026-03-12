import { DataSource } from 'typeorm';
export declare class DatabaseConfig {
    private static logger;
    private static dataSource;
    static getDataSource(): DataSource;
    static testConnection(): Promise<boolean>;
    static runMigrations(): Promise<void>;
    static dropDatabase(): Promise<void>;
    static closeConnection(): Promise<void>;
    static getRepository<T>(entity: new () => T): import("typeorm").Repository<import("typeorm").ObjectLiteral>;
}
//# sourceMappingURL=database.d.ts.map
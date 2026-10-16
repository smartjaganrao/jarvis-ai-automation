import Database from 'better-sqlite3';
import { SCHEMA_SQL } from './schema';
import fs from 'fs';
import path from 'path';
import { app } from 'electron';

export class LocalDatabaseManager {
  private static instance: LocalDatabaseManager;
  private db: Database.Database | null = null;
  private isInitialized = false;
  private dbPath: string;

  private constructor() {
    const userDataPath = app?.getPath?.('userData') || path.join(process.cwd(), '.jarvis-data');
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }
    this.dbPath = path.join(userDataPath, 'jarvis.db');
  }

  public static getInstance(): LocalDatabaseManager {
    if (!LocalDatabaseManager.instance) {
      LocalDatabaseManager.instance = new LocalDatabaseManager();
    }
    return LocalDatabaseManager.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    this.db = new Database(this.dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.db.exec(SCHEMA_SQL);

    this.isInitialized = true;
    console.info(`[LocalDatabaseManager] Initialized SQLite at ${this.dbPath}`);
  }

  public getSchemaSQL(): string {
    return SCHEMA_SQL;
  }

  public async insertRecord(tableName: string, id: string, record: Record<string, unknown>): Promise<void> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    const columns = Object.keys(record);
    const placeholders = columns.map(() => '?').join(', ');
    const values = columns.map(col => record[col]);

    const stmt = this.db.prepare(`INSERT OR REPLACE INTO ${tableName} (id, ${columns.join(', ')}, created_at) VALUES (?, ${placeholders}, datetime('now'))`);
    stmt.run(id, ...values);
  }

  public async getRecords(tableName: string): Promise<unknown[]> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`SELECT * FROM ${tableName}`);
    const rows = stmt.all() as Record<string, unknown>[];
    return rows.map((row: Record<string, unknown>) => ({ ...row }));
  }
}

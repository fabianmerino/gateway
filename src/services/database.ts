import Database from 'better-sqlite3';
import { logError, logInfo, logWarn } from '../utils/logger/index.js';

export interface StoredMessage {
  id?: number;
  topic: string;
  payload: string;
  timestamp: number;
}

const COMPONENT = 'DatabaseService';

class DatabaseService {
  private db: Database.Database | undefined;

  async init() {
    try {
      this.db = new Database('./messages.db');
      this.db.pragma('journal_mode = WAL');

      this.db.exec(`
        CREATE TABLE IF NOT EXISTS messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          topic TEXT NOT NULL,
          payload TEXT NOT NULL,
          timestamp INTEGER NOT NULL
        )
      `);

      logInfo(COMPONENT, 'Database initialized');
    } catch (error) {
      logError(COMPONENT, 'Error initializing database:', error);
    }
  }

  async storeMessage(message: StoredMessage) {
    try {
      if (!this.db) throw new Error('Database not initialized');
      const stmt = this.db.prepare(
        'INSERT INTO messages (topic, payload, timestamp) VALUES (?, ?, ?)'
      );
      stmt.run(message.topic, message.payload, message.timestamp);
    } catch (error) {
      logError(COMPONENT, 'Error storing message:', error);
    }
  }

  async getStoredMessages(): Promise<StoredMessage[]> {
    try {
      if (!this.db) throw new Error('Database not initialized');
      const stmt = this.db.prepare(
        'SELECT * FROM messages ORDER BY timestamp ASC'
      );
      return stmt.all() as StoredMessage[];
    } catch (error) {
      logError(COMPONENT, 'Error retrieving stored messages:', error);
      return [];
    }
  }

  async deleteMessages(ids: number[]) {
    try {
      if (!this.db) throw new Error('Database not initialized');
      if (ids.length === 0) {
        logWarn(COMPONENT, 'No IDs provided for deletion.');
        return;
      }
      const placeholders = ids.map(() => '?').join(',');
      const stmt = this.db.prepare(
        `DELETE FROM messages WHERE id IN (${placeholders})`
      );
      stmt.run(...ids);
    } catch (error) {
      logError(COMPONENT, 'Error deleting messages:', error);
    }
  }
}

export const databaseService = new DatabaseService();

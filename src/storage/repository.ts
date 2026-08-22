import fs from 'node:fs';
import path from 'node:path';
import { corruptBackupPath, legacyDataFile, resolveDataFile } from './paths.js';
import { emptyPersistedData, normalizePersistedData } from './serialization.js';
import type { PersistedData } from '../types/index.js';

export interface LoadResult {
  data: PersistedData;
  /** True when no data file existed and a fresh collection should be seeded. */
  isNew: boolean;
  /** Set when the file could not be parsed and was preserved elsewhere. */
  corruptBackup?: string;
  /** Set when data was carried over from the pre-1.3 package-local location. */
  migratedFrom?: string;
}

export interface RepositoryOptions {
  dataFile?: string;
  /** Pass null to opt out of migrating from the legacy location. */
  legacyFile?: string | null;
  onWarning?: (message: string) => void;
}

/** Reads and writes the persisted data file. */
export class FlashcardRepository {
  readonly dataFile: string;
  private readonly legacyFile: string | null;
  private readonly onWarning: (message: string) => void;
  /** Set when unreadable data could not be preserved; blocks all writes. */
  private readOnly = false;

  constructor(options: RepositoryOptions = {}) {
    this.dataFile = options.dataFile ?? resolveDataFile();
    this.legacyFile = options.legacyFile === undefined ? legacyDataFile() : options.legacyFile;
    this.onWarning = options.onWarning ?? (message => console.warn(message));
  }

  load(): LoadResult {
    const source = this.resolveSourceFile();
    if (!source) {
      return { data: emptyPersistedData(), isNew: true };
    }

    const migratedFrom = source.path !== this.dataFile ? source.path : undefined;

    let parsed: unknown;
    try {
      parsed = JSON.parse(fs.readFileSync(source.path, 'utf-8'));
    } catch (error) {
      // Never overwrite a file we failed to read: earlier versions replaced it
      // with sample cards, destroying the whole collection on a single bad
      // parse. Move it aside so it can be recovered by hand.
      const backup = this.preserveCorruptFile(source.path, error);
      return { data: emptyPersistedData(), isNew: true, corruptBackup: backup };
    }

    const data = normalizePersistedData(parsed);
    if (migratedFrom) {
      // Copy the migrated data into the new home straight away, so the legacy
      // file is only ever read once.
      this.save(data);
    }

    return { data, isNew: false, migratedFrom };
  }

  /** True when saving is disabled to avoid clobbering unrecoverable data. */
  get isReadOnly(): boolean {
    return this.readOnly;
  }

  /** Write atomically, so an interrupted run cannot truncate the data file. */
  save(data: PersistedData): void {
    if (this.readOnly) {
      return;
    }

    const directory = path.dirname(this.dataFile);
    fs.mkdirSync(directory, { recursive: true });

    const temporary = path.join(directory, `.${path.basename(this.dataFile)}.${process.pid}.tmp`);
    try {
      fs.writeFileSync(temporary, JSON.stringify(data, null, 2), 'utf-8');
      fs.renameSync(temporary, this.dataFile);
    } catch (error) {
      fs.rmSync(temporary, { force: true });
      throw error;
    }
  }

  private resolveSourceFile(): { path: string } | null {
    if (fs.existsSync(this.dataFile)) {
      return { path: this.dataFile };
    }
    if (this.legacyFile && fs.existsSync(this.legacyFile)) {
      return { path: this.legacyFile };
    }
    return null;
  }

  private preserveCorruptFile(source: string, error: unknown): string | undefined {
    const backup = corruptBackupPath(this.dataFile);
    const reason = error instanceof Error ? error.message : String(error);

    try {
      fs.mkdirSync(path.dirname(backup), { recursive: true });
      fs.copyFileSync(source, backup);
      this.onWarning(
        `Could not read ${source} (${reason}). ` +
          `A copy was kept at ${backup}; starting with an empty collection.`
      );
      return backup;
    } catch {
      // The unreadable file may still hold recoverable data, and we could not
      // copy it aside. Refuse to write rather than overwrite it on the next
      // save.
      this.readOnly = true;
      this.onWarning(
        `Could not read ${source} (${reason}) and could not back it up. ` +
          `Saving is disabled for this run so the file is left intact; ` +
          `move it aside manually to start fresh.`
      );
      return undefined;
    }
  }
}

import fs from 'node:fs';
import path from 'node:path';
import { corruptBackupPath, legacyDataFile, resolveDataFile } from './paths.js';
import { emptyPersistedData, normalizePersistedData } from './serialization.js';
import type { PersistedData } from '../types/index.js';

/** Distinguishes temp files when several repositories share a process. */
let temporaryFileCounter = 0;

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

export interface Repository {
  readonly dataFile: string;
  load: () => LoadResult;
  /** Write atomically. A no-op while the repository is read-only. */
  save: (data: PersistedData) => void;
  /** True when saving is disabled to avoid clobbering unrecoverable data. */
  isReadOnly: () => boolean;
}

/** Timestamped sibling path used to preserve a file we cannot parse. */
function preserveCorruptFile(
  source: string,
  dataFile: string,
  error: unknown,
  onWarning: (message: string) => void
): { backup?: string; lockWrites: boolean } {
  const backup = corruptBackupPath(dataFile);
  const reason = error instanceof Error ? error.message : String(error);

  try {
    fs.mkdirSync(path.dirname(backup), { recursive: true });
    fs.copyFileSync(source, backup);
    onWarning(
      `Could not read ${source} (${reason}). ` +
        `A copy was kept at ${backup}; starting with an empty collection.`
    );
    return { backup, lockWrites: false };
  } catch {
    // The unreadable file may still hold recoverable data, and we could not
    // copy it aside. Refuse to write rather than overwrite it on the next save.
    onWarning(
      `Could not read ${source} (${reason}) and could not back it up. ` +
        `Saving is disabled for this run so the file is left intact; ` +
        `move it aside manually to start fresh.`
    );
    return { lockWrites: true };
  }
}

/**
 * Reads and writes the persisted data file.
 *
 * A closure factory rather than a class: the mutable read-only latch stays
 * private without needing `this`, and callers receive a plain object that is
 * trivial to substitute in tests.
 */
export function createRepository(options: RepositoryOptions = {}): Repository {
  const dataFile = options.dataFile ?? resolveDataFile();
  const legacyFile = options.legacyFile === undefined ? legacyDataFile() : options.legacyFile;
  const onWarning = options.onWarning ?? ((message: string) => console.warn(message));

  /** Set when unreadable data could not be preserved; blocks all writes. */
  let readOnly = false;

  const resolveSourceFile = (): string | null => {
    if (fs.existsSync(dataFile)) {
      return dataFile;
    }
    if (legacyFile && fs.existsSync(legacyFile)) {
      return legacyFile;
    }
    return null;
  };

  const save = (data: PersistedData): void => {
    if (readOnly) {
      return;
    }

    const directory = path.dirname(dataFile);
    fs.mkdirSync(directory, { recursive: true });

    temporaryFileCounter++;
    const temporary = path.join(
      directory,
      `.${path.basename(dataFile)}.${process.pid}.${temporaryFileCounter}.tmp`
    );
    try {
      fs.writeFileSync(temporary, JSON.stringify(data, null, 2), 'utf-8');
      fs.renameSync(temporary, dataFile);
    } catch (error) {
      fs.rmSync(temporary, { force: true });
      throw error;
    }
  };

  const load = (): LoadResult => {
    const source = resolveSourceFile();
    if (!source) {
      return { data: emptyPersistedData(), isNew: true };
    }

    const migratedFrom = source !== dataFile ? source : undefined;

    let parsed: unknown;
    try {
      parsed = JSON.parse(fs.readFileSync(source, 'utf-8'));
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        // `null`, `[]` and `42` all parse successfully but are not a data file.
        // Normalizing them would yield an empty collection with isNew=false, so
        // the next save would overwrite whatever the user actually had.
        const found = Array.isArray(parsed) ? 'an array' : `a ${typeof parsed}`;
        throw new Error(`expected a JSON object, found ${found}`);
      }
    } catch (error) {
      // Never overwrite a file we failed to read: earlier versions replaced it
      // with sample cards, destroying the whole collection on a single bad
      // parse. Move it aside so it can be recovered by hand.
      const { backup, lockWrites } = preserveCorruptFile(source, dataFile, error, onWarning);
      if (lockWrites) {
        readOnly = true;
      }
      return {
        data: emptyPersistedData(),
        isNew: true,
        ...(backup ? { corruptBackup: backup } : {})
      };
    }

    const data = normalizePersistedData(parsed);
    if (migratedFrom) {
      // Copy the migrated data into the new home straight away, so the legacy
      // file is only ever read once. A failure here must not stop the
      // application starting: the data was read successfully, the legacy file
      // is untouched, and the migration simply retries next run.
      try {
        save(data);
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        onWarning(
          `Loaded data from ${migratedFrom} but could not write it to ${dataFile} (${reason}). ` +
            `The migration will be retried on the next run.`
        );
      }
    }

    return { data, isNew: false, ...(migratedFrom ? { migratedFrom } : {}) };
  };

  return {
    dataFile,
    load,
    save,
    isReadOnly: () => readOnly
  };
}

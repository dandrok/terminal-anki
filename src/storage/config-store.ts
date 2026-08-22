import fs from 'node:fs';
import path from 'node:path';
import { corruptBackupPath, resolveConfigFile } from './paths.js';
import { DEFAULT_CONFIG, normalizeConfig, type AppConfig } from '../config/schema.js';

export interface ConfigStoreOptions {
  configFile?: string;
  onWarning?: (message: string) => void;
}

export interface ConfigStore {
  readonly configFile: string;
  load: () => AppConfig;
  save: (config: AppConfig) => void;
}

/**
 * Reads and writes `config.json`.
 *
 * Deliberately more forgiving than the card repository. That one refuses to
 * write over a file it could not read, because the only copy of someone's deck
 * may be in there. Settings are reconstructible in fifteen seconds, so an
 * unreadable file is moved aside and replaced with defaults instead of locking
 * the application into a read-only run.
 *
 * Neither `load` nor `save` throws: failing to persist a colour scheme must
 * never stop the application, and the caller has nothing useful to do about it.
 */
function noop(): void {
  // Settings failures are non-fatal and have no caller-visible consequence.
}

export function createConfigStore(options: ConfigStoreOptions = {}): ConfigStore {
  const configFile = options.configFile ?? resolveConfigFile();
  // Silent by default: a warning printed into a running Ink render corrupts
  // the frame, and the caller has nothing useful to do about a settings file.
  const handler = options.onWarning ?? noop;

  /**
   * Report a problem, and never let the reporting become the problem.
   *
   * This is only ever called from a failure path, so a handler that throws
   * would replace a recoverable settings error with an unrecoverable one.
   */
  const onWarning = (message: string): void => {
    try {
      handler(message);
    } catch {
      // Nothing sensible is left to do: the caller asked to be told and could
      // not cope with being told.
    }
  };

  /** Best-effort cleanup; the caller is already handling a failure. */
  const discard = (file: string): void => {
    try {
      fs.rmSync(file, { force: true });
    } catch {
      // A leftover temp file is a much smaller problem than a crash.
    }
  };

  const load = (): AppConfig => {
    try {
      if (!fs.existsSync(configFile)) {
        return { ...DEFAULT_CONFIG };
      }
      return normalizeConfig(JSON.parse(fs.readFileSync(configFile, 'utf-8')));
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      const backup = corruptBackupPath(configFile);
      let kept = false;
      try {
        fs.renameSync(configFile, backup);
        kept = true;
      } catch {
        // The file stays where it is; defaults still load.
      }
      onWarning(
        kept
          ? `Could not read ${configFile} (${reason}); kept a copy at ${backup}.`
          : `Could not read ${configFile} (${reason}); using default settings.`
      );
      return { ...DEFAULT_CONFIG };
    }
  };

  const save = (config: AppConfig): void => {
    const directory = path.dirname(configFile);
    const temporary = path.join(directory, `.${path.basename(configFile)}.${process.pid}.tmp`);
    try {
      fs.mkdirSync(directory, { recursive: true });
      // Written to a sibling and renamed, so an interrupted write leaves the
      // previous settings intact rather than a half-written file.
      fs.writeFileSync(temporary, JSON.stringify(config, null, 2), 'utf-8');
      fs.renameSync(temporary, configFile);
    } catch (error) {
      discard(temporary);
      onWarning(
        `Could not save settings to ${configFile} (${error instanceof Error ? error.message : String(error)}).`
      );
    }
  };

  return { configFile, load, save };
}

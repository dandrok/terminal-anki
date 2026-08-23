import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { contentName, createMediaStore, isImageName } from '../../src/storage/media-store.js';

let workspace: string;
const store = () => createMediaStore({ directory: path.join(workspace, 'media') });

const PNG = Buffer.from('89504e470d0a1a0a', 'hex');
const OTHER = Buffer.from('89504e470d0a1a0affff', 'hex');

beforeEach(() => {
  workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'anki-media-'));
});

afterEach(() => {
  fs.rmSync(workspace, { recursive: true, force: true });
});

describe('isImageName', () => {
  it.each(['a.png', 'a.JPG', 'a.jpeg', 'a.gif', 'a.webp', 'a.avif'])('accepts %j', name => {
    expect(isImageName(name)).toBe(true);
  });

  it.each(['a.mp3', 'a.ogg', 'a.mp4', 'a.txt', 'a', ''])('rejects %j', name => {
    // Storing audio would fill the data directory with files nothing can show.
    expect(isImageName(name)).toBe(false);
  });
});

describe('contentName', () => {
  it('names a file by its contents, keeping the extension', () => {
    expect(contentName('heart.png', PNG)).toMatch(/^[0-9a-f]{16}\.png$/);
  });

  it('gives the same name to the same bytes', () => {
    expect(contentName('a.png', PNG)).toBe(contentName('b.png', PNG));
  });

  it('gives different names to different bytes', () => {
    // Two decks each shipping a "heart.png" must not overwrite one another.
    expect(contentName('heart.png', PNG)).not.toBe(contentName('heart.png', OTHER));
  });

  it('lower-cases the extension', () => {
    expect(contentName('A.PNG', PNG).endsWith('.png')).toBe(true);
  });
});

describe('createMediaStore', () => {
  it('stores a file and reports the name it used', () => {
    const media = store();
    const name = media.put('heart.png', PNG);
    expect(name).toBeDefined();
    expect(media.has(name!)).toBe(true);
    expect(fs.readFileSync(media.resolve(name!)!).equals(PNG)).toBe(true);
  });

  it('creates the directory it needs', () => {
    const media = store();
    media.put('a.png', PNG);
    expect(fs.existsSync(media.directory)).toBe(true);
  });

  it('stores the same picture once however many decks ship it', () => {
    const media = store();
    const first = media.put('heart.png', PNG);
    const second = media.put('corazon.png', PNG);
    expect(second).toBe(first);
    expect(fs.readdirSync(media.directory)).toHaveLength(1);
  });

  it('keeps two different pictures that share a name', () => {
    const media = store();
    const first = media.put('heart.png', PNG);
    const second = media.put('heart.png', OTHER);
    expect(second).not.toBe(first);
    expect(fs.readdirSync(media.directory)).toHaveLength(2);
  });

  it.each([
    ['song.mp3', 'audio'],
    ['clip.mp4', 'video'],
    ['notes.txt', 'text']
  ])('refuses to store %s', (name, _kind) => {
    expect(store().put(name, PNG)).toBeUndefined();
  });

  it('refuses to store an empty file', () => {
    expect(store().put('a.png', Buffer.alloc(0))).toBeUndefined();
  });

  it('leaves no temporary file behind', () => {
    const media = store();
    media.put('a.png', PNG);
    expect(fs.readdirSync(media.directory).filter(name => name.includes('.tmp'))).toEqual([]);
  });

  it('drops the picture rather than throwing when it cannot write', () => {
    // A card that loses its image is still a usable card.
    const directory = path.join(workspace, 'blocked');
    fs.writeFileSync(directory, 'not a directory');
    expect(() => createMediaStore({ directory }).put('a.png', PNG)).not.toThrow();
    expect(createMediaStore({ directory }).put('a.png', PNG)).toBeUndefined();
  });

  it.each(['../escape.png', '/etc/passwd', 'a/b.png', '..', ''])('refuses to resolve %j', name => {
    // The name comes out of card text, which came from somebody else's deck.
    expect(store().resolve(name)).toBeUndefined();
    expect(store().has(name)).toBe(false);
  });

  it('reports a name that is simply not there', () => {
    expect(store().resolve('deadbeef.png')).toBeUndefined();
  });
});

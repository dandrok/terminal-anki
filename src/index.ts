#!/usr/bin/env node

import { runApplication } from './app/app';

// Handle command line arguments
const args = process.argv.slice(2);

async function main() {
  if (args.includes('--study') || args.includes('-s')) {
    // Direct study mode - This will be handled within runApplication if needed,
    // or we can add a specific handler for it. For now, interactive mode.
    await runApplication();
  } else if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Terminal Anki v1.2.0 - Enhanced Flashcard Learning System

Usage:
  anki                    Start interactive mode
  anki --study          Start directly in study mode
  anki --help           Show this help message

New Features v1.2.0:
  ◎ Custom study sessions (by tags, difficulty, limits)
  ◈ Tag system for flashcards
  ◈ Learning streaks tracking
  ◑ Achievement system
  ◰ Enhanced analytics dashboard
  ◴ Study session history

Core Features:
  ◎ Spaced repetition learning (SM-2 algorithm)
  ◉ Flashcard management with tags
  ◰ Learning statistics & analytics
  ◉ Card search and filtering
  ◈ Local data storage with full history
    `);
  } else {
    // Interactive mode
    await runApplication();
  }
}

// Run the application
main().catch(console.error);

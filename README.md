# 🧠 Terminal Anki

> A modern, intelligent terminal-based flashcard application with spaced repetition learning

<div align="center">

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=node.js&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

**Learn efficiently with the proven SM-2 spaced repetition algorithm - the same algorithm used by Anki!**

🎉 **Version 1.2.0 is here!** Major update with custom study sessions, achievements, learning streaks, and comprehensive analytics!

</div>

---

## ✨ Features

### 🎯 **Smart Learning Algorithm**
- **SM-2 Spaced Repetition** - Scientifically proven to optimize memory retention
- **Adaptive Scheduling** - Cards appear less frequently as you master them
- **Performance Tracking** - Algorithm learns from your answers

### 🎮 **Professional Session Control**
- **Flexible Session Lengths** - Quick (10), Standard (25), Intensive (50), or Custom
- **Intuitive Arrow Navigation** - Easy selection with arrow keys and Enter
- **Smart Back Navigation** - Go back to previous menus at any step
- **Graceful Exit Options** - Quit anytime without killing the terminal
- **Skip Functionality** - Skip difficult cards and return later
- **Session Summaries** - Track progress and see what's remaining
- **Progress Saving** - Automatic saving at every step

### 🎯 **Custom Study Sessions** (v1.2.0!)
- **Tag-Based Filtering** - Study specific topics or categories
- **Difficulty-Based Filtering** - Focus on new, learning, young, or mature cards
- **Flexible Limits** - Set custom card counts per session
- **Random Order Option** - Shuffle cards for varied practice
- **Mixed Filtering** - Combine tags and difficulty filters

### 📚 **Enhanced Card Management**
- **Tag System** - Organize cards with multiple tags per card
- **Add/Edit/Delete** cards with intuitive CLI interface
- **Quick List View** - See all cards at a glance with tags and status
- **Interactive Card Browser** - Browse cards one by one with full content
- **Search** through your flashcard collection
- **Tag Management** - Edit card tags with ease
- **Local JSON Storage** ready for backend integration

### 🔥 **Learning Streaks & Gamification** (v1.2.0!)
- **Daily Streak Tracking** - Track consecutive study days
- **Achievement System** - Unlock achievements for various milestones
- **Progress Visualization** - See your learning journey over time
- **Motivation Features** - Stay engaged with goals and rewards
- **8 Different Achievements** - Cards, sessions, streaks, and mastery milestones

### 📊 **Enhanced Analytics Dashboard** (v1.2.0!)
- **Study Session History** - Complete record of all study sessions
- **Weekly Progress Tracking** - See your learning patterns over weeks
- **Tag Distribution Analysis** - Understand which topics you study most
- **Performance Metrics** - Track accuracy, study time, and session data
- **Learning Statistics** - Comprehensive view of your progress
- **Session Analytics** - Detailed breakdown of study habits

### 🎨 **Modern Terminal Experience**
- **Anki-Style UX** - Familiar difficulty rating system (0-4)
- **Consistent @clack/prompts Interface** - Beautiful, modern design throughout
- **Colorful Interface** - Clean, modern terminal design
- **Keyboard-First** - Optimized for terminal power users
- **Progress Bars** - Visual representation of achievement progress

### 🚀 **Developer-Friendly**
- **TypeScript** with strict type safety
- **Modular Architecture** - Easy to extend and maintain
- **Backend-Ready** - Prepared for Node.js API integration
- **Well-Documented** - Comprehensive code documentation

---

## 📋 Table of Contents

- [🚀 Quick Start](#-quick-start)
  - [Installation](#installation)
  - [🎮 Using the CLI](#-using-the-cli)
  - [CLI Options](#cli-options)
- [📖 How It Works](#-how-it-works)
  - [🧠 The Science Behind It](#-the-science-behind-it)
  - [🎯 Session Control System](#-session-control-system)
  - [📈 Smart Scheduling](#-smart-scheduling)
- [🎮 User Interface](#-user-interface)
  - [Main Menu Options](#main-menu-options)
  - [Study Session Flow](#study-session-flow)
  - [Card List Flow](#card-list-flow)
- [💾 Data Management](#-data-management)
- [🛠️ Development](#-development)
- [🎨 Technologies Used](#-technologies-used)
- [🔮 Future Roadmap](#-future-roadmap)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)

## 🚀 Quick Start

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd terminal-anki

# Install dependencies
npm install

# Build the application
npm run build

# Make executable and install globally
chmod +x dist/index.js
npm link
```

## 🎮 Using the CLI

### Global Commands (After npm link)

```bash
# Start interactive mode
anki

# Jump directly into studying due cards
anki --study

# Show help message
anki --help
```

### Local Development Commands

```bash
# Start interactive mode (local)
npm start

# Run with TypeScript in development
npm run dev

# Build for production
npm run build

# Watch for changes during development
npm run watch
```

### CLI Options

| Command | Description |
|---------|-------------|
| `anki` | Start interactive mode with main menu |
| `anki --study` | Jump directly into studying due cards |
| `anki --help` | Show help message and available options |

### First Run

After installation, the application automatically creates 5 sample flashcards to get you started!

**The `anki` command is now available from any directory in your terminal!** 🚀

### Quick Study Mode

```bash
# Jump directly into studying due cards
anki --study

# Or use local development
npm start -- --study
```

---

## 📖 How It Works

### 🧠 The Science Behind It

Terminal Anki uses the **SM-2 (SuperMemo 2) algorithm**, the gold standard for spaced repetition learning:

```
📊 Learning Progression:
New Card → 1 Day → 6 Days → 15 Days → 37 Days → 91 Days...
```

### 🎯 Session Control System

**Flexible Study Sessions:**
```
📚 15 cards due today

Study options:
🎯 Study all due cards (15)
📊 Study limited session
❌ Cancel
```

**Choose Session Length:**
```
◐ Quick session (10 cards)
◈ Standard session (25 cards)
◆ Intensive session (50 cards)
◉ Custom number
◀ Back to study options
```

**In-Session Controls:**
```
📝 Card 3/10
Question: Python

Choose your action:
❯ 📖 Show Answer
  ⏭️ Skip Card
  ❌ Quit Session
```

**Step 1: Choose Action**
```
Choose your action:
❯ 📖 Show Answer
  ⏭️ Skip Card
  ❌ Quit Session
```

**Step 2: Rate Difficulty (After Seeing Answer)**
```
How well did you know this?
❯ ❌ Again (0) - Show card soon
  🤔 Hard (1)
  ✅ Good (3)
  🎉 Easy (4)
  ❌ Quit Session
```

**Difficulty Rating Effects:**
| Rating | Description | Effect on Schedule |
|--------|-------------|-------------------|
| **0** | Again | Reset to 10 minutes |
| **1** | Hard | Slightly increase interval |
| **3** | Good | Normal interval increase |
| **4** | Easy | Large interval increase |

### 📈 Smart Scheduling

- **Easy cards** (high ratings) appear less frequently
- **Difficult cards** (low ratings) appear more often
- **Algorithm adapts** to your personal learning pace

---

## 🎮 User Interface

### Main Menu Options

```bash
🧠 TERMINAL ANKI - Flashcard Learning System
📚 Total cards: 5 | ⏰ Due today: 3 | 🔥 Streak: 2 days

? What would you like to do?
❯ Study due cards         # Start learning session
  🎯 Custom study session  # Filtered study by tags/difficulty
  Add new card            # Create new flashcard
  List all cards          # View all flashcards
  Search cards            # Find specific cards
  Delete card             # Remove flashcards
  🏆 Achievements         # View unlocked achievements
  📊 Analytics & History  # Detailed progress dashboard
  Statistics              # Quick stats overview
  Exit                   # Quit application
```

### Study Session Flow

1. **Choose session length** → Quick (10), Standard (25), Intensive (50), or Custom
2. **Question appears** → Read the front of the card
3. **Choose action** → Use arrow keys: Show Answer, Skip Card, or Quit Session
4. **Rate difficulty** → Use arrow keys: Again (0), Hard (1), Good (3), or Easy (4)
5. **Session summary** → See progress and remaining cards

### Card List Flow

**Choose viewing mode:**
```
📋 6 cards available

How would you like to view your cards?
❯ □ Quick List View
  ◉ Browse Cards One by One
  ◀ Back to Main Menu
```

**Quick List View:**
- Shows all cards with status (due/upcoming)
- Truncated text for overview
- Simple "🔙 Back to main menu" button

**Interactive Browser:**
- Full card content without truncation
- Navigate previous/next through cards
- Show/hide answers for each card
- Return to main menu anytime

### Statistics Dashboard

```bash
📊 Learning Statistics
----------------------------------------
📚 Total cards: 25
⏰ Due today: 8
🔄 Total reviews: 142
📈 Average easiness: 2.67

📊 Card Distribution:
  New (1 day): 3 cards
  Learning (2-7 days): 7 cards
  Young (1-4 weeks): 10 cards
  Mature (1+ month): 5 cards
```

---

## 💾 Data Management

### Enhanced Local Storage (v1.2.0!)

Your data is stored in `flashcards.json` with comprehensive tracking:

```json
{
  "cards": [
    {
      "id": "1",
      "front": "TypeScript",
      "back": "A typed superset of JavaScript",
      "tags": ["programming", "typescript"],
      "easiness": 2.5,
      "interval": 6,
      "repetitions": 2,
      "nextReview": "2025-10-31T15:44:47.610Z",
      "lastReview": "2025-10-25T15:44:47.610Z",
      "createdAt": "2025-10-25T15:44:47.610Z"
    }
  ],
  "sessionHistory": [
    {
      "id": "1698224547123",
      "startTime": "2025-10-25T15:55:47.123Z",
      "endTime": "2025-10-25T16:25:47.456Z",
      "cardsStudied": 15,
      "correctAnswers": 12,
      "incorrectAnswers": 3,
      "averageDifficulty": 1.8,
      "sessionType": "due",
      "quitEarly": false
    }
  ],
  "learningStreak": {
    "currentStreak": 3,
    "longestStreak": 7,
    "lastStudyDate": "2025-10-25T00:00:00.000Z",
    "studyDates": ["2025-10-23", "2025-10-24", "2025-10-25"]
  },
  "achievements": [
    {
      "id": "first_session",
      "name": "Study Beginner",
      "description": "Complete your first study session",
      "icon": "📚",
      "category": "sessions",
      "progress": {
        "current": 1,
        "required": 1,
        "description": "sessions completed"
      },
      "unlockedAt": "2025-10-25T15:55:47.123Z"
    }
  ]
}
```

### Ready for Backend Integration

The codebase is structured to easily connect to a Node.js backend:

```typescript
// Future API integration example
async function syncWithBackend(cards: Flashcard[]) {
  const response = await fetch('/api/cards/sync', {
    method: 'POST',
    body: JSON.stringify(cards)
  });
  return response.json();
}
```

---

## 🛠️ Development

### Project Structure

```
terminal-anki/
├── src/                    # TypeScript source code
│   ├── index.ts           # Main CLI application
│   ├── types.ts           # Type definitions
│   ├── flashcard.ts       # Card management & SM-2 algorithm
│   └── ui.ts              # User interface layer
├── .claude/               # Claude documentation
│   └── CLAUDE.md         # Detailed project docs
├── dist/                  # Compiled JavaScript
├── flashcards.json       # Local data storage
├── package.json          # Dependencies & scripts
├── tsconfig.json         # TypeScript configuration
└── README.md             # This file
```

### Development Commands

```bash
# Development mode with TypeScript
npm run dev

# Build for production
npm run build

# Watch for changes during development
npm run watch

# Clean build artifacts
npm run clean

# Code Quality & Linting
npm run lint          # Run ESLint
npm run lint:fix       # Auto-fix linting issues
npm run format         # Format code with Prettier
npm run format:check   # Check code formatting
npm run type-check     # TypeScript type checking
npm run check          # Run all checks (lint + type-check + format)
```

### Code Quality & Git Hooks

This project uses automated code quality checks with **pre-commit** and **pre-push** git hooks:

```bash
# Pre-commit hook (runs automatically before each commit)
- ESLint linting with auto-fix
- TypeScript type checking
- Prettier code formatting verification

# Pre-push hook (runs automatically before each push)
- Full project build verification
- Ensures no compilation errors
```

**Manual Testing:**
```bash
# Test what pre-commit checks
npm run check

# Test what pre-push checks
npm run build
```

### CLI Options

```bash
anki              # Interactive mode
anki --study      # Direct study mode
anki --help       # Show help message
```

---

## 🎨 Technologies Used

### Core Dependencies
- **TypeScript** - Type-safe development with strict mode
- **@clack/prompts** - Modern, beautiful CLI prompts for navigation
- **prompts** - Interactive quiz interface with better control
- **chalk** - Terminal colors and styling
- **ora** - Loading spinners and animations

### Development Tools
- **ESLint** - Code linting with TypeScript support
- **Prettier** - Code formatting and style consistency
- **simple-git-hooks** - Modern git hooks for pre-commit/pre-push automation
- **typescript-eslint** - TypeScript-specific ESLint rules

### Algorithm
- **SM-2 Spaced Repetition** - Proven learning algorithm since 1985
- **Easiness Factor** - Personalized difficulty adjustment
- **Interval Calculation** - Optimal review timing

---

## 🔮 Future Roadmap

### Version 1.2 ✅ **COMPLETED**
- [x] Tag system for organizing flashcards by topics
- [x] Custom study sessions (by tags, difficulty, limits)
- [x] Learning streaks and achievements
- [x] Study session history and analytics
- [x] Enhanced analytics dashboard
- [x] Progress tracking and gamification

### Version 1.3 (Short Term)
- [ ] Card import/export (CSV, JSON)
- [ ] Bulk operations on cards
- [ ] Card decks and categories
- [ ] Review time statistics
- [ ] Study reminders and notifications

### Version 1.4 (Medium Term)
- [ ] Web interface for browser access
- [ ] Basic REST API backend
- [ ] Multi-device synchronization
- [ ] Media-rich cards (images, audio)
- [ ] Advanced search and filtering

### Version 2.0 (Long Term)
- [ ] Mobile companion app
- [ ] Cloud-based backup and sync
- [ ] Collaborative learning features
- [ ] Advanced analytics dashboard
- [ ] AI-powered card suggestions

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **SuperMemo** - For the SM-2 spaced repetition algorithm
- **Anki** - For inspiration and algorithm refinement
- **Vercel** - For the amazing @clack/prompts library
- **Node.js Community** - For the fantastic CLI ecosystem

---

<div align="center">

**Happy Learning! 🎓**

*Built with ❤️ and TypeScript*

</div>

# 🧠 Terminal Anki

> A modern, intelligent terminal-based flashcard application with spaced repetition learning

<div align="center">

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=node.js&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

**Learn efficiently with the proven SM-2 spaced repetition algorithm - the same algorithm used by Anki!**

</div>

---

## ✨ Features

### 🎯 **Smart Learning Algorithm**
- **SM-2 Spaced Repetition** - Scientifically proven to optimize memory retention
- **Adaptive Scheduling** - Cards appear less frequently as you master them
- **Performance Tracking** - Algorithm learns from your answers

### 🎮 **Professional Session Control** (NEW!)
- **Flexible Session Lengths** - Quick (10), Standard (25), Intensive (50), or Custom
- **Intuitive Arrow Navigation** - Easy selection with arrow keys and Enter
- **Smart Back Navigation** - Go back to previous menus at any step
- **Graceful Exit Options** - Quit anytime without killing the terminal
- **Skip Functionality** - Skip difficult cards and return later
- **Session Summaries** - Track progress and see what's remaining
- **Progress Saving** - Automatic saving at every step

### 📚 **Complete Card Management**
- **Add/Edit/Delete** cards with intuitive CLI interface
- **Quick List View** - See all cards at a glance with status
- **Interactive Card Browser** - Browse cards one by one with full content
- **Search** through your flashcard collection
- **Statistics** to track learning progress
- **Local JSON Storage** ready for backend integration

### 🎨 **Modern Terminal Experience**
- **Anki-Style UX** - Familiar difficulty rating system (0-4)
- **Consistent @clack/prompts Interface** - Beautiful, modern design throughout
- **Colorful Interface** - Clean, modern terminal design
- **Keyboard-First** - Optimized for terminal power users

### 🚀 **Developer-Friendly**
- **TypeScript** with strict type safety
- **Modular Architecture** - Easy to extend and maintain
- **Backend-Ready** - Prepared for Node.js API integration
- **Well-Documented** - Comprehensive code documentation

---

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

# Make it globally available (optional)
npm link
```

### First Run

```bash
# Start the interactive application
npm start

# Or run directly with anki command
anki
```

The application automatically creates 5 sample flashcards to get you started!

### Quick Study Mode

```bash
# Jump directly into studying due cards
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
📚 Total cards: 5 | ⏰ Due today: 3

? What would you like to do?
❯ Study due cards    # Start learning session
  Add new card        # Create new flashcard
  List all cards      # View all flashcards
  Search cards        # Find specific cards
  Delete card         # Remove flashcards
  Statistics          # View learning progress
  Exit                # Quit application
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

### Local Storage

Your flashcards are stored in `flashcards.json`:

```json
[
  {
    "id": "1",
    "front": "TypeScript",
    "back": "A typed superset of JavaScript",
    "easiness": 2.5,
    "interval": 6,
    "repetitions": 2,
    "nextReview": "2025-10-31T15:44:47.610Z",
    "lastReview": "2025-10-25T15:44:47.610Z",
    "createdAt": "2025-10-25T15:44:47.610Z"
  }
]
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

### Algorithm
- **SM-2 Spaced Repetition** - Proven learning algorithm since 1985
- **Easiness Factor** - Personalized difficulty adjustment
- **Interval Calculation** - Optimal review timing

---

## 🔮 Future Roadmap

### Version 1.2 (Short Term)
- [ ] Card import/export (CSV, JSON)
- [ ] Bulk operations on cards
- [ ] Custom study sessions (by topic, difficulty)
- [ ] Learning streaks and achievements
- [ ] Study session history and analytics

### Version 1.3 (Medium Term)
- [ ] Web interface for browser access
- [ ] Basic REST API backend
- [ ] Multi-device synchronization
- [ ] Card decks and categories
- [ ] Review time statistics

### Version 2.0 (Long Term)
- [ ] Mobile companion app
- [ ] Media-rich cards (images, audio)
- [ ] Advanced analytics dashboard
- [ ] Collaborative learning features
- [ ] Cloud-based backup and sync

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

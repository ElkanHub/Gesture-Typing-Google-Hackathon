# 🏆 Hackathon Judges Code

**Welcome!** This project is a **Universal Gesture Typing Agent** that brings physical keyboard swiping to the desktop web.

It consists of two parts in this monorepo:
1.  **The Brain (Next.js)**: Runs the 6-Layer Prediction Engine and AI logic (`/app`).
2.  **The Hands (Chrome Extension)**: A lightweight content script that captures input and displays the UI (`/extension`).

To see the project in action, you need to run **both**.

---

## 🚀 Quick Start (Installation & Run)

### 1. Start the Brain (Main App)
First, get the AI engine running locally (API endpoints).

```bash
# In the root directory
npm install
npm run dev
```
> The app will start at `http://localhost:3000`. Keep this terminal running!

### 2. Build the Extension
In a **new terminal**, build the Chrome Extension.

```bash
cd extension
npm install
npm run build
```
> This creates a `dist/` folder inside the `extension` directory.

### 3. Load into Chrome
1.  Open Chrome and go to `chrome://extensions`.
2.  Enable **Developer mode** (top right toggle).
3.  Click **Load unpacked**.
4.  Select the `extension/dist` folder (make sure to select `dist`, not just `extension`).

---

## 🎮 How to Test

1.  **Open any website** (e.g., Google, Twitter, or a Notepad tab).
2.  **Refresh the page** (important so the content script loads).
3.  **Click into a text input**.
4.  **Perform a Gesture**: On your physical keyboard, press valid keys in sequence (e.g., Q-U-I-C-K) without lifting/pausing too long, or just type normally.
5.  **See the Magic**:
    *   A **Glassmorphism Suggestion Bar** will appear near your cursor.
    *   It shows **6 candidates** (Strict Match + AI Backfill).
    *   **Tab** or click to select a word.

**Enjoy the future of typing!** ⌨️✨

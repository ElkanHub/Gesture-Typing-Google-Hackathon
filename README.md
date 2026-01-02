# Headless Gesture Typing Engine (Prototype) GEMINI 3 Hackathon Project

> **Swipe on your physical keyboard. Let AI handle the rest.**

![Status](https://img.shields.io/badge/status-Prototype-orange.svg)
![AI](https://img.shields.io/badge/AI-Gemini%203%20Pro-purple.svg)

## 📖 Overview

The **Headless Gesture Typing Engine** is a web-based prototype that brings the convenience of "swipe typing" (typically found on smartphones) to physical desktop keyboards. 

Instead of typing every letter, users can slide their fingers across the keys. The engine interprets the noisy key stream using a multi-layered approach involving geometric analysis, local pattern matching, and **Google Gemini 3.0** for context-aware prediction.

## Public Preview Link.

 **https://gesture-typing-google-hackathon.vercel.app/**

## ✨ Key Features

-   **Physical Gesture Support**: Swipe across your mechanical or laptop keyboard. The system maps key positions to a virtual coordinate space.
    -   **Smart Layout Detection**: Automatically detects QWERTY, AZERTY, QWERTZ, etc., and remaps gestures instantly.
-   **6-Layer Decoding Engine**:
    -   Anti-ghosting & Calibration
    -   Hybrid Input (Tap vs. Swipe)
    -   Geometric Trajectory Analysis
    -   Dictionary Filtering
    -   **Pattern Training Store** (Personalized 3-shot learning)
    -   **AI Inference** (Gemini 3 Pro for context)
-   **Generative Art Studio**:
    -   Draw shapes with your keyboard in the `/draw` mode.
    -   **Gemini 3 Pro (Reasoning)** analyzes your intent.
    -   **Imagen 4.0 Fast (Nano Banana)** generates photorealistic masterpieces.
    -   **Iterative Refinement**: Move shapes to adjust the layout of the generated image while keeping the consistent style.
-   **Premium UI/UX**:
    -   Glassmorphic headers and floating panels.
    -   Visual gesture trails and live "Thinking" feedback.
    -   Dark mode support.

## 🤖 Agentic Architecture

This project moves beyond simple API calls by implementing a **Self-Correcting Agentic Loop**:
1.  **Plan**: Gemini analyzes the sketch and "thinks" of a creative direction.
2.  **Execute**: Imagen generates the artwork.
3.  **Verify**: Gemini *views* the result to check if it matches the user's sketch.
4.  **Correct**: If the result is flawed, the Agent *automatically* iterates to fix it—all on the server side.
5.  **Contextualize**: The Agent generates relevant code (for UI) or captions (for Art) to accompany the image.

**Benefit**: This ensures higher fidelity to user intent and "first-try" success by simulating a human review process.

## 🛠️ Tech Stack

-   **Framework**: Next.js 14 (App Router)
-   **Language**: TypeScript
-   **Styling**: Tailwind CSS
-   **AI Models**:
    -   Text: `gemini-3-flash-preview`
    -   Reasoning: `gemini-3-pro-preview`
    -   Vision: `gemini-3-pro-preview`
    -   Image: `imagen-4.0-fast-generate-001` (Nano Banana)
-   **Storage**: LocalStorage (Patterns)

## 🚀 Getting Started

### Prerequisites
-   Node.js 18+
-   A Google AI Studio API Key (`GEMINI_API_KEY`)

### Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/yourusername/physical-gesture.git
    cd physical-gesture
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Set up Environment Variables**:
    Create a `.env` file in the root:
    ```env
    GEMINI_API_KEY=your_api_key_here
    ```

4.  **Run the Development Server**:
    ```bash
    npm run dev
    ```

5.  **Open the App**:
    Visit `http://localhost:3000` in your browser.

## 🎮 Quick Start Guide

Follow these steps to master the gesture engine:

### 1. Calibrate Your Keyboard (Essential)
*   **Look for the Prompt**: When you load the app, a floating badge will ask you to press a specific key (e.g., *"Press Q"*).
*   **One Press is Enough**: Locate that key on your physical keyboard and press it **once**.
*   **Instant Alignment**: The system instantly detects if you are on QWERTY, AZERTY, or DVORAK and aligns the gesture engine to your physical keys. You don't need to configure anything else!

### 2. Master "Headless" Gesture Typing
*   **Focus**: Click into the main text box (or any input field).
*   **Tap**: Type normally for single letters.
*   **Swipe**: Glide your finger across the keys to form words. Imagine you are drawing the shape of the word on your keyboard.
*   **Watch the Signals**:
    *   🟢 **Green (Local)**: Instant matches from the local dictionary.
    *   🟠 **Amber (AI)**: Smart predictions from Gemini based on your sentence context.

### 3. Create AI Art (`/draw`)
*   **Sketch**: Use your keyboard to "draw" shapes (circles, lines) on the canvas. The engine interprets your gestures as geometric forms.
*   **Activate Agent**: Click the button to start the **Agentic Loop**.
    *   **Plan**: The Agent analyzes your sketch's intent.
    *   **Generate**: Imagen creates a high-fidelity image.
    *   **Contextualize**: The Agent generates valid HTML code (for UI) or captions (for Art) below the image.
*   **Refine**: Click "Refine" to have the Agent critique and improve the artwork automatically.
*   **History**: Use the `<` and `>` arrows to browse previous versions.

### 4. Personalize (`/train`)
*   Go to **Pattern Training Lab** to teach the engine your unique swipe style for specific words, bypassing the AI for faster local recognition.

## 📄 Documentation

For a deep dive into the architecture, algorithms, and 6-layer engine, see [APPDOC.md](./APPDOC.md).

---


## 🧩 Chrome Extension (Agentic Layer)

The project includes a companion Chrome Extension that extends the gesture capabilities to the entire browser.

### Features
*   **Context-Aware Modes**: Automatically switches behaviors based on your focus.
    *   **⌨️ Typing Mode**: Focus on an input field to enable gesture typing anywhere on the web.
    *   **🟢 Agent Mode**: Blur the input to enable "Agent Gestures" (e.g., swipe the home row to summarize the current page).
*   **Side Panel Interface**: Displays the Agent's thought process and summaries in a non-intrusive side panel.
*   **Universal Compatibility**: Works with standard HTML inputs, Textareas, and rich text editors (Gmail, Docs).

For a complete technical breakdown of the extension's architecture, see [APPDOC3.md](./APPDOC3.md).

---

# 🏆 Hackathon Judges Code

**Welcome!** This project is a **Prototype Gesture Typing Agent** that brings physical keyboard swiping to the desktop web.

It consists of two parts in this monorepo:
1.  **The Brain (Next.js)**: Runs the 6-Layer Prediction Engine and AI logic (`/app`).
2.  **The Hands (Chrome Extension)**: A lightweight content script that captures input and displays the UI (`/extension`).

To see the project in action, you need to run **both**.

---

## 🚀 Quick Start (Installation & Run)

### 1. Start the Brain (Main App)
First, get the AI engine running locally (API endpoints).

Since this is a MonoRepo, you need to install dependencies for the entire repo.

Clone the repo to your local machine.

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
3.  **Click into a text input**. You will see the dot at the bottom right coener turn green which means the extension is active and in typing mode.
4.  **Perform a Gesture**: On your physical keyboard, press valid keys in sequence (e.g., T-H-E) without lifting/pausing too long, or just type normally.GLide from letter to letter like it is done on mobile.

5.  **See the Magic**:
    *   A **Glassmorphism Suggestion Bar** will appear near your cursor.
    *   It shows **6 candidates** (Strict Match + AI Backfill).
    *   **Tab** or click to select a word.

6.  **The AI Agent**:
    To see the AI Agent in action, click out side the textbox or any empty area on the browser, you will see the green dot on the bottom right corner turn gray.

    Now, glide your fingers in a straight line across the keyboard:
    *   From Left to Right: This will open the sidepanel and will trigger the Agent to summarize the current page.
    *   From Right to Left: This will open the sidepanel and will trigger the Agent to readout what is on the screen using gemini.


**Enjoy the future of typing!** ⌨️✨

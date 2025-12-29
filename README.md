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

## 🎮 Usage Guide

### 1. Calibration (Smart)
*   On the home page, the system will ask you to press specific keys (e.g., `Q`).
*   **Simply press the corresponding key on your physical keyboard.**
*   The system detects if you use QWERTY, AZERTY, etc., and instantly adapts.
*   Once calibrated, the virtual coordinate space is mapped to your distinct layout.

### 2. Gesture Typing
*   Focus on the main text area.
*   **Tap** keys normally for single letters.
*   **Swipe** (glide your finger) across keys to type words.
*   The AI will predict the most likely word based on your sentence.

### 3. Training Mode (`/train`)
*   Navigate to **Pattern Training Lab**.
*   Type a target word (e.g., "algorithm").
*   Perform the gesture 3 times to teach the engine your specific style.
*   This creates a personalized shortcut that bypasses AI for speed.

### 4. Draw Mode (`/draw`)
*   Switch to **Draw via Keyboard** mode.
*   Gesturing on the keyboard creates shapes on the canvas.
*   Click **Generate Masterpiece** to have Gemini & Imagen interpret your sketch.

## 📄 Documentation

For a deep dive into the architecture, algorithms, and 6-layer engine, see [APPDOC.md](./APPDOC.md).

---


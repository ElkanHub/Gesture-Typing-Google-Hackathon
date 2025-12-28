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
    -   **Imagen 4.0 Fast** generates photorealistic masterpieces.
-   **Premium UI/UX**:
    -   Glassmorphic headers and floating panels.
    -   Visual gesture trails and live "Thinking" feedback.
    -   Dark mode support.

## 🛠️ Tech Stack

-   **Framework**: Next.js 14 (App Router)
-   **Language**: TypeScript
-   **Styling**: Tailwind CSS
-   **AI Models**:
    -   Text: `gemini-3-flash-preview`
    -   Reasoning: `gemini-3-pro-preview`
    -   Vision: `gemini-3-pro-image-preview`
    -   Image: `imagen-3.0-generate-001` (Imagen 4 Fast)
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

### 1. Calibration (Important!)
*   On the home page, type the "Validation Keys" shown on the floating keyboard (e.g., `Q`, `P`, `Z`, `M`).
*   This calibrates the engine to your specific physical keyboard layout.

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


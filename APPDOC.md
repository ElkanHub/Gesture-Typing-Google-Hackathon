# APPDOC: Physical Gesture Typing Engine

## 1. Overview
This application is a **web-based prototype for "Headless" Gesture Typing on Physical Keyboards**. Unlike traditional touchscreen keyboards, this system allows users to "swipe" on a physical keyboard (using a capacitive touch layer or simply rapid key-over-swiping). The engine interprets the noisy stream of keystrokes to deduce the intended word, combining geometric analysis, local pattern recognition, and Large Language Model (LLM) inference.

## 2. Core Architecture

The application is built on **Next.js** (App Router) with **Tailwind CSS**. The core logic resides in a centralized React Context (`GestureContext`), which manages the entire lifecycle of a keystroke -> word transformation.

### Tech Stack
-   **Framework**: Next.js 14+
-   **Styling**: Tailwind CSS (with Glassmorphism & Modern UI Polish)
-   **State**: React Context API
-   **AI (Reasoning)**: Google Gemini 3 Pro Preview (`gemini-3-pro-preview` with Thinking Mode)
-   **AI (Vision)**: Google Gemini 3 Pro Vision (`gemini-3-pro-preview`)
-   **AI (Generation)**: Google Imagen 4.0 Fast (`imagen-4.0-fast-generate-001`)
-   **Persistence**: LocalStorage (for patterns)

---

## 3. The "6-Layer" Decoding Engine

The input processing pipeline is divided into distinct layers, moving from raw signals to semantic understanding.

### Layer 1: Input Capture & Calibration
*   **Component**: `components/ui/keyboard.tsx` & `GestureContext`
*   **Functionality**:
    *   **Calibration**: Maps physical keys to X/Y screen coordinates. This creates a "Virtual Map" of the physical layout.
    *   **Focus-Aware Routing**: The system automatically detects the active element.
        *   **Typing Mode**: Activates when any `textarea` or `input` is focused.
        *   **Drawing Mode**: Activates when the `InteractiveCanvas` is focused.
        *   **Training Mode**: Activates exclusively on the `/train` page.
    *   **Anti-Ghosting**: Intercepts native key events for mapped keys to prevent "double typing".
    *   **Visuals**: Renders a premium, glassmorphic suggestion bar and keyboard visualization.

### Layer 2: Hybrid Input Logic (Literal vs. Gesture)
*   **File**: `components/gesture-context.tsx`
*   **Logic**:
    *   **Literal Typing**: Taps or short sequences (< 4 points) are treated as literal keystrokes.
    *   **Swipe Detection**: Longer sequences are routed to the gesture decoding pipeline.

### Layer 3: Local "Refining" Layer (Geometric Analysis)
*   **Function**: `analyzeTrajectory` in `gesture-context.tsx`
*   **Purpose**: To make sense of the noisy "middle" of a gesture.
*   **Algorithms**:
    *   **Dwell Detection**: Identifies keys where the user paused.
    *   **Inflection Detection**: Calculates angles between key vectors to find sharp turns.

### Layer 4: Local Candidate Filtering (The Dictionary)
*   **Files**: `lib/dictionary.ts`, `lib/candidate-filter.ts`
*   **Description**: Constrains the search space using "physics".
*   **Logic**:
    *   **Visual Filter**: Scans a 1000-word lexicon for words that match the Start Key, End Key, and intermediate Anchor Points.

### Layer 5: Pattern Recognition (Strategic Layer)
*   **File**: `lib/pattern-store.ts`, `app/train/page.tsx`
*   **Purpose**: Speed, personalization, and API reduction.
*   **Training Interface (`/train`)**:
    *   **Mode**: A dedicated "Pattern Training Lab" with a terminal-inspired UI.
    *   **Process**: User inputs a target word -> Records 3 raw swipe attempts -> System saves the mapping.
    *   **Visualization**: Displays the live, raw key stream (e.g., `hhhheeeelllloooo`) in real-time.
    *   **Inference**: Before AI processing, the system checks `PatternStore` for 1:1 matches.

### Layer 6: AI Inference (The Semantic Brain)
*   **File**: `app/api/predict/route.ts`
*   **Model**: Gemini 1.5 Flash
*   **Purpose**: Final disambiguation using context.
*   **Logic**: Chooses the best word from the candidate list that fits the previous sentence context.

---

## 4. Agentic Creative Flow (The "Art Director" Loop)
*   **Files**: `app/draw/page.tsx`, `app/api/generate/route.ts`
*   **Concept**: Instead of a simple "prompt -> image" linear path, the system employs an autonomous **Agentic Loop** modeled after a human design process.

### The 4-Stage Cycle
1.  **PLAN (Gemini 3 Pro)**: The agent analyzes the user's sketch and intent. It acts as an "Art Director", devising a strategy (lighting, composition, style) before any image is generated.
2.  **EXECUTE (Imagen 4 Fast)**: The system generates a draft based on the plan using `imagen-4.0-fast-generate-001`.
3.  **VERIFY (Gemini 3 Pro Vision)**: The agent *looks* at the generated image and compares it to the original sketch. It critiques the result (e.g., "Did I miss the user's circle? Is the lighting correct?").
4.  **CORRECT (Self-Healing)**: If the verification score is low (< 8/10), the agent automatically re-prompts the generator with specific corrective instructions (e.g., "Fix the alignment of the red ball").

### Benefits
*   **Higher Accuracy**: The system "proofreads" its own work.
*   **Ghost-in-the-Machine**: Users see the agent's internal monologue ("Thinking...", "Critiquing...", "Refining..."), creating a transparent and engaging experience.
*   **Multimodal Refinement**: The "Refine" feature feeds the *previous output* back into the Planning stage, allowing for iterative artistic direction.

---

## 5. UI/UX Design System
The application now features a unified, premium design language:
*   **Glassmorphism**: Headers and floating panels use `backdrop-blur` and translucent backgrounds.
*   **Global Styles**: Smooth scrolling, custom selection colors, and a subtle dot-pattern background.
*   **Typography**: Optimized hierarchy using the `Geist` font family.
*   **Consistency**: Shared header components and layout structures across Home, Train, and Draw pages.

---

## 6. Key Files & Responsibilities

| File | specific Responsibility |
| :--- | :--- |
| `components/gesture-context.tsx` | **The Core Brain**. Handles input routing, state, and layer orchestration. |
| `app/api/predict/route.ts` | **The Text Brain**. Word prediction via Gemini 1.5 Flash. |
| `app/api/generate/route.ts` | **The Vision Brain**. Pipeline for Sketch -> Gemini 3 Reasoning -> Imagen 4. |
| `components/ui/keyboard.tsx` | **The Interface**. Renders keys, gesture trail, and suggestions. |
| `lib/pattern-store.ts` | **Memory**. LocalStorage wrapper for learned patterns. |
| `app/train/page.tsx` | **Training Lab**. Explicit 3-shot learning UI with raw stream visualization. |
| `app/draw/page.tsx` | **Creative Studio**. Interactive canvas and AI art generation interface. |

# APPDOC: Physical Gesture Typing Engine
.
.
## 1. Overview
This application is a **web-based prototype for "Headless" Gesture Typing on Physical Keyboards**. Unlike traditional touchscreen keyboards, this system allows users to "swipe" on a physical keyboard (using a capacitive touch layer or simply rapid key-over-swiping). The engine interprets the noisy stream of keystrokes to deduce the intended word, combining geometric analysis, local pattern recognition, and Large Language Model (LLM) inference.

## 2. Core Architecture

The application is built on **Next.js** (App Router) with **Tailwind CSS**. The core logic resides in a centralized React Context (`GestureContext`), which manages the entire lifecycle of a keystroke -> word transformation.

### Tech Stack
-   **Framework**: Next.js 14+
-   **Styling**: Tailwind CSS
-   **State**: React Context API
-   **AI**: Google Gemini API (`gemini-2.0-flash-exp`)
-   **Persistence**: LocalStorage (for patterns)

---

## 3. The "6-Layer" Decoding Engine

The input processing pipeline is divided into distinct layers, moving from raw signals to semantic understanding.

### Layer 1: Input Capture & Calibration
*   **Component**: `components/ui/keyboard.tsx` & `GestureContext`
*   **Functionality**:
    *   **Calibration**: Maps physical keys to X/Y screen coordinates. This creates a "Virtual Map" of the physical layout.
    *   **Focus-Aware Routing (New)**: The system automatically detects the active element.
        *   **Typing Mode**: Activates when any `textarea` or `input` is focused.
        *   **Drawing Mode**: Activates when the `InteractiveCanvas` is focused.
        *   **Training Mode**: Activates exclusively on the `/train` page.
    *   **Anti-Ghosting**: Intercepts native key events for mapped keys to prevent "double typing" (raw characters + gesture result).
    *   **Visuals**: Relies on `Keyboard.tsx` for the floating, always-on Suggestion Bar.

### Layer 2: Hybrid Input Logic (Literal vs. Gesture)
*   **File**: `components/gesture-context.tsx`
*   **Logic**:
    *   **Literal Typing**: Taps or short sequences (< 4 points) are treated as literal keystrokes. The engine programmatically inserts these chars into the *active DOM element* using `setRangeText` for seamless compatibility.
    *   **Swipe Detection**: Longer sequences are routed to the gesture decoding pipeline.

### Layer 3: Local "Refining" Layer (Geometric Analysis)
*   **Function**: `analyzeTrajectory` in `gesture-context.tsx`
*   **Purpose**: To make sense of the noisy "middle" of a gesture.
*   **Logic**:
    *   **Dwell Detection**: Identifies keys where the user paused significantly longer (e.g., >1.3x average duration). These are flagged as **Anchors**.
    *   **Inflection Detection**: Calculates the angle between key vectors. Sharp turns (>45°) are flagged as **Inflection Anchors**.
    *   **Output**: A list of `anchors` (Start -> [Turn/Pause] -> End).

### Layer 4: Local Candidate Filtering (The Dictionary)
*   **Files**: `lib/dictionary.ts`, `lib/candidate-filter.ts`
*   **Purpose**: To constrain the search space using "physics".
*   **Logic**:
    *   **Lexicon**: A local dictionary of ~1000 common English words.
    *   **Visual Filter**: Scans the dictionary for words that:
        1.  Strictly start with the **Start Key**.
        2.  Strictly end with the **End Key**.
        3.  Contain the **Middle Anchors** in the correct relative order.
    *   **Output**: A list of "Physically Valid Candidates" (e.g., `['their', 'there']`).

### Layer 5: Pattern Recognition (The Muscle Memory Store)
*   **File**: `lib/pattern-store.ts`, `app/train/page.tsx`
*   **Purpose**: Speed, personalization, and API reduction (Strategic Layer).
*   **Logic**:
    *   **Explicit Training Interface (`/train`)**: A dedicated mode where users can manually associate raw key streams with a target word.
        *   **Process**: User enters word -> Swipes it 3 times (Raw stream visualized) -> Saves.
        *   **Outcome**: Maps specific noisy sequences directly to the word.
    *   **L1 Cache Lookup**: Before any dictionary or AI processing, the engine checks `PatternStore`.
    *   **Priority Match**: If a pattern match is found, it is inserted immediately without API cost.

### Layer 6: AI Inference (The Semantic Brain)
*   **File**: `app/api/predict/route.ts`
*   **Model**: Gemini 1.5 Flash (Production Tier)
*   **Purpose**: Final disambiguation using context.
*   **Prompt Logic**:
    *   **Inputs**: Noisy Trajectory, Anchors, Candidate List, Previous Sentence Context.
    *   **Hard Constraints**: The prompt explicitly forbids predicting words that do not match the Start/End keys.
    *   **Task**: "Choose the best word from the Candidate List that fits the sentence 'I went to ___'."

## 6. Generative AI Pipeline (Sketch-to-Realism)
*   **Files**: `app/draw/page.tsx`, `app/api/generate/route.ts`
*   **Flow**:
    1.  **Input**: User draws simple shapes on `InteractiveCanvas` using the gesture keyboard + optional text description.
    2.  **Vision Analysis**: `Gemini 2.0 Flash` (Vision) analyzes the canvas screenshot and generates a detailed, photorealistic prompt. 
        *   **New Feature**: Users can click "Thoughts" to read this internal interpretation.
    3.  **Image Synthesis**: `Imagen 4.0` receives the prompt and generates a high-fidelity JPEG.
    4.  **Display**: Result replaces the canvas background or appears alongside.

---

## 7. Key Files & Responsibilities

| File | specific Responsibility |
| :--- | :--- |
| `components/gesture-context.tsx` | **The Core Brain**. Handles input routing (focus-aware), state, local analysis, and layer orchestration. |
| `app/api/predict/route.ts` | **The Text Brain**. OpenAI/Gemini interface for word prediction. |
| `app/api/generate/route.ts` | **The Vision Brain**. Pipeline for Sketch -> Gemini Vision -> Imagen 4.0. Returns image + thought. |
| `components/ui/keyboard.tsx` | **The Interface**. Renders keys, gesture trail, and the **Integrated Suggestion Bar**. |
| `lib/pattern-store.ts` | **Memory**. LocalStorage wrapper for efficiency. |
| `app/train/page.tsx` | **Training Lab**. Explicit 3-shot learning UI. |

## 8. Data Flow Example

User swipes "hello" (h -> e -> l -> l -> o).

1.  **Input**: Key stream captured: `h, h, e, e, l, l, l, o`.
2.  **Focus Check**: Is user in a text field? Yes -> Mode = TYPING.
3.  **Refining**: Start: `h`, End: `o`, Middle Anchor: `l`.
4.  **L1 Cache**: Check `PatternStore`. (Hit? Return instantly. Miss? Continue).
5.  **Filtering**: Dictionary -> `['hello', 'hollow', 'halo']`.
6.  **AI Inference**: Send candidates + Context.
7.  **Prediction**: AI returns "hello".
8.  **Output**: "hello" inserted into `<textarea>` via `insertTextIntoActiveElement`.

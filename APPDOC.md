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
    *   **Trajectory Building**: Listens to global `keydown` events. As the user slides across keys, we capture a stream of "Points" (`{x, y, time, key}`).
    *   **Segmentation**: A timer (400ms) detects pauses to differentiate between separate gestures.

### Layer 2: Hybrid Input Logic (Literal vs. Gesture)
*   **File**: `components/gesture-context.tsx`
*   **Logic**:
    *   **Literal Typing**: If a trajectory is very short (< 4 points) or specific keys (Spacebar) are pressed, the engine treats it as a standard keypress. This allows mixing "peck typing" (for short words like "I", "a") with gesture typing.
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
*   **File**: `lib/pattern-store.ts`
*   **Purpose**: Speed and personalization.
*   **Logic**:
    *   **Storage**: Maps a simplified key sequence (e.g., "thherre" -> "there") to a committed word.
    *   **Lookup**: Before calling the API, we check if this exact gesture shape has been seen before. If yes, we use the cached result instantly.
    *   **Learning**:
        *   **Implicit**: If the user confirms a prediction by typing the next word, we learn the mapping.
        *   **Explicit**: If the user selects a correction from the prediction bar, we overwrite the mapping.

### Layer 6: AI Inference (The Semantic Brain)
*   **File**: `app/api/predict/route.ts`
*   **Model**: Gemini 2.0 Flash Experimental
*   **Purpose**: Final disambiguation using context.
*   **Prompt Logic**:
    *   **Inputs**: Noisy Trajectory, Anchors, Candidate List, Previous Sentence Context.
    *   **Hard Constraints**: The prompt explicitly forbids predicting words that do not match the Start/End keys.
    *   **Task**: "Choose the best word from the Candidate List that fits the sentence 'I went to ___'."

---

## 4. Key Files & Responsibilities

| File | specific Responsibility |
| :--- | :--- |
| `components/gesture-context.tsx` | **The Core Brain**. Handles input, state, coordinates, local analysis, and orchestration of all layers. |
| `app/api/predict/route.ts` | **The AI Interface**. Constructs the prompt with strict constraints and context for Gemini. |
| `lib/dictionary.ts` | **Vocabulary**. Contains the common word list. |
| `lib/candidate-filter.ts` | **Physics Engine**. Filters dictionary words based on geometric constraints (Start/End/Anchors). |
| `lib/pattern-store.ts` | **Memory**. LocalStorage wrapper for saving/retrieving user gesture patterns. |
| `components/ui/keyboard.tsx` | **Visuals**. Renders the keyboard, handles calibration UI, and draws the gesture trail (SVG). |

## 5. Data Flow Example

User swipes "hello" (h -> e -> l -> l -> o).

1.  **Input**: Key stream captured: `h, h, e, e, l, l, l, o`.
2.  **Refining**:
    *   Start: `h`
    *   End: `o`
    *   Dwell/Turn: Detected pause on `l`.
    *   Anchors: `['h', 'l', 'o']`
3.  **Pattern Check**: Is "h..l..o" in `LocalStorage`? No.
4.  **Filtering**: Check Dictionary for words starting with `h`, ending with `o`, containing `l`.
    *   Matches: `['hello', 'hollow', 'halo']`.
5.  **AI Inference**: Send candidates + Context ("I said _").
    *   Gemini sees candidates. Checks context. "I said _" -> "hello" is most likely.
6.  **Prediction**: Returns "hello" as top result.
7.  **Commitment**: User presses Space. "hello" is confirmed.
8.  **Learning**: System learns "h-e-l-l-o" shape = "hello". Next time, it skips the API.

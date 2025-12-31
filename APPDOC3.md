# Physical Gesture Extension - Technical Documentation

## 1. Overview
The Physical Gesture Extension is a Chrome extension that enables system-wide gesture typing and agentic interactions on any webpage. It acts as a bridge between the user's physical keyboard actions and the backend Gemini AI services.

## 2. Architecture
The extension follows the Manifest V3 architecture with three main components:

### 2.1 Content Script (`content.ts`)
- **Role**: Injection layer. It runs in the context of web pages.
- **Responsibilities**:
    - **Input Capture**: Listens to global `keydown` events.
    - **Focus Detection**: Monitors `focusin` and `focusout` events to switch execution modes.
    - **Visualization**: Renders the green "trail" points on the screen to give visual feedback for physical key presses.
    - **Bridge**: Instantiates the `GestureProcessor` and relays high-level state changes (like Mode) to the runtime.

### 2.2 Background Service Worker (`background.ts`)
- **Role**: Central message hub and API coordinator.
- **Responsibilities**:
    - **API Relay**: Receives gesture data from the content script and proxies it to the local Next.js server (`localhost:3000/api/*`). This avoids CORS issues that might occur from content scripts.
    - **Agent Orchestration**: Handles long-running agent tasks (Summarize, Read) and broadcasts status updates.
    - **Side Panel Management**: Controls the behavior of the side panel.

### 2.3 Side Panel (`App.tsx`)
- **Role**: User Interface.
- **Responsibilities**:
    - **Status Display**: Shows the current mode (🟢 Agent vs ⌨️ Typing).
    - **Agent Stream**: Displays real-time thoughts and responses from the Gemini Agent (e.g., summaries).
    - **State Reflection**: Reacts to `MODE_CHANGED` and `AGENT_STATUS` messages.

## 3. Core Systems

### 3.1 Gesture Processor (`gesture-logic.ts`)
The heart of the extension. It buffers key events and determines when a gesture has occurred.
- **Trajectory Analysis**: Uses `geometry.ts` (shared lib) to calculate path shape, corners, and dwell points.
- **Mode Logic**:
    - **Typing Mode**: When `agentEnabled = false`. Triggers `PREDICT_GESTURE` to fetch words from Gemini.
    - **Agent Mode**: When `agentEnabled = true`. Checks for specific linear sequences (e.g., specific row sweeps) to trigger global actions.
- **Text Injection**: Uses `setRangeText` and dispatches `input` events to safely insert predicted text into modern web apps (React/Angular compatible).

### 3.2 Context-Aware Mode Switching
The system intelligently switches behaviors to prevent conflict.
- **Trigger**: `focusin` / `focusout` on `input`, `textarea`, or `contentEditable`.
- **Typing Mode (⌨️)**:
    - **Active**: When input is focused.
    - **Behavior**: Swiping tries to predict words. Agent gestures are ignored to prevent accidental triggering while typing.
- **Agent Mode (🟢)**:
    - **Active**: When no input is focused (browsing).
    - **Behavior**: Swiping specific patterns triggers Agent Actions (Summarize Page, Read Aloud). Typing prediction is disabled.

## 4. Gemini 3 Integration
The extension relies on the host Next.js application for intelligence.

### 4.1 Prediction API (`/api/predict`)
- **Model**: `gemini-3-flash-preview`
- **Config**: Uses `thinkingConfig` (Low) to assist in deciphering sloppy gestures.
- **Flow**: Content Script -> Background -> Next.js API -> Gemini -> Background -> Content Script (Text Insert).

### 4.2 Agent API (`/api/agent/*`)
- **Model**: `gemini-3-pro-preview`
- **Capabilities**: Summarization, Reading.
- **Flow**: Content Script captures page text -> Background -> Next.js API -> Gemini -> Background -> Side Panel (Display).

## 5. Development & Build
- **Tech**: Vite + React + CRXJS.
- **Shared Code**: Leverages `lib/shared` from the main project for consistent geometry logic.
- **Hot Reload**: Supports HMR for rapid development.

MASTER PROMPT
Project: Gesture Typing for Physical Keyboards (Web Prototype) Using Next js and Tailwind CSS

You are building a web-based experimental input system that recreates mobile gesture (swipe) typing for physical, tactile keyboards, inspired by Google Keyboard (Gboard), but adapted to the realities of discrete key activation.

The system must infer user intent from chaotic spatial keystroke streams produced when a user physically drags their finger across a real keyboard. The goal is not accurate letter entry, but accurate word intent reconstruction, exactly as mobile swipe typing works.

1. CORE CONCEPT

When a user slides a finger across a physical keyboard, many unintended keys will be triggered.
For example:

Intended word: “the” → captured stream: tghre

Intended word: “fish” → captured stream: fguiufdsasdfgh

These noisy keystroke streams represent spatial trajectories, not literal typing.
The system must treat them as gesture paths and infer the most likely intended word.

2. UI REQUIREMENTS
Layout (Top → Bottom)

Typing Area

Displays committed text

Cursor visible

No traditional autocomplete

Prediction Bar

Appears directly beneath the typing area

Displays a ranked list of likely intended words

First candidate is auto-selected

Visual Keyboard

Full rendered keyboard layout

Only the following keys are active:

Number row

QWERTY typing rows (Q–P, A–L, Z–M)

Function keys, modifiers, spacebar, and command keys are disabled and ignored

3. INITIAL VALIDATION PHASE

On first launch, the user must complete a mandatory key-validation step.

Each supported key is highlighted sequentially

The user must press each key once

On press:

The key provides visual feedback

The system records the key’s screen coordinates

The keyboard becomes usable only after all required keys are validated.
This establishes a precise spatial map of the keyboard.

4. INPUT CAPTURE (PHYSICAL GESTURE)
Behavior

The user physically drags their finger across the keyboard

Keys fire rapidly and repeatedly as the finger passes over them

The system must capture:

Key identity

Timestamp

Screen coordinates

Visual Feedback

Each activated key lights up briefly

A synthetic swipe path is drawn in real time:

Connecting the centers of activated keys

Persisting until the swipe ends

This visual path represents the inferred gesture trajectory.

5. SWIPE SEGMENTATION

A swipe (one word gesture) ends when:

Key events pause beyond a threshold

The finger lifts

Or spatial continuity breaks abruptly

At swipe end, the system must freeze the path and process the gesture as a single word.

6. LOCAL INTENT EXTRACTION (PRE-AI)

Before calling Gemini, the system must perform local processing:

Noise Reduction

Remove excessive repeated keys

Collapse dense clusters of adjacent keys

Preserve overall spatial trajectory

Anchor Extraction

Identify:

First activated key

Last activated key

Dominant path direction

High-density regions

Candidate Filtering

Generate candidate words that:

Begin near the first key

End near the last key

Have keyboard paths overlapping the gesture trajectory

This step must reduce the dictionary to a small candidate set (≈ 10–20 words).

7. GEMINI INFERENCE LAYER

Gemini must be used only for intent resolution, not raw spell correction.

Input to Gemini

Reduced keystroke sequence

First and last key

Spatial path summary

Timing characteristics

Sentence context (previous text)

Candidate word list

Gemini’s Task

Infer the most likely intended word

Rank candidates by plausibility

Return an ordered list of word predictions

8. WORD COMMITMENT

The top-ranked word is automatically inserted into the typing area

The prediction bar remains visible

The user may:

Use arrow keys to navigate alternatives

Click a suggestion directly

This mirrors mobile gesture typing behavior.

9. SPATIAL SHAPE AWARENESS (SECOND FEATURE)

Because all input is spatially tracked, the system must also analyze gesture geometry.

Recognized Shapes

Line

Circle

Triangle

Square / rectangle

Drawing Mode

When enabled, gesture input does not insert text

The system outputs:

Recognized shape

Visualized path

Optional structured representation (e.g., JSON or SVG)

This demonstrates that the keyboard is being treated as a spatial input surface, not just a typing device.

10. DESIGN PRINCIPLES

Real-time feedback is critical

Latency must be minimal

The system must feel predictive, not corrective

Accessibility and inclusivity are core goals

The application should clearly demonstrate that gesture typing is possible on physical keyboards by reconstructing intent from noisy spatial input, just as Google Keyboard does on mobile devices.
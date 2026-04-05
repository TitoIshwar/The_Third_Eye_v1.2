# Architectural Implementation Plan: Continuous Live Vision

> [!NOTE]
> This plan details the architecture for an "Always-On" Continuous Vision feature for "The_Third_Eye". It is designed to run hands-free, processing the live world continuously while strictly managing battery life, API costs, and audio overlap.

## 1. Recommended Tech Stack & Evaluation

To achieve a seamless, real-time continuous vision feed without burning through the phone's battery or breaking the bank on API calls, we must carefully select our tools.

### A. The Camera Pipeline: `react-native-vision-camera`
*   **Evaluation:** `expo-camera` is excellent for standard photos and barcodes, but calling `takePictureAsync` continuously in a loop is extremely slow, locks the UI thread, and often makes physical shutter sounds on Android. 
*   **Recommendation:** We MUST migrate from `expo-camera` to **`react-native-vision-camera`**. It runs on the Native UI thread and supports "Frame Processors" (via Reanimated worklets). This allows us to silently access pixel buffers at 30fps natively, downsample them, and pass them to JS without blocking the app.

### B. The AI Strategy: Time-Gated Cloud VLM (Gemini 1.5 Flash)
*   **Evaluation:** Sending a live 30fps video stream to a cloud API is cost-prohibitive, introduces massive latency, and hits rate limits in seconds. Running a massive Natural Language model locally on-device will drain the battery and run at <1 fps on most phones.
*   **Recommendation:** 
    1.  **Native Downsampling:** Use Vision Camera's Frame Processor to throttle the feed down to **1 frame every 4 seconds**.
    2.  **Contextual Throttling:** Only send a frame to the Cloud API if the Text-to-Speech (TTS) engine is currently *silent*. If the app is actively speaking a 5-second description, it makes no sense to generate new descriptions that will immediately become stale.
    3.  **Cloud API:** Use **Gemini 1.5 Flash** (or OpenAI GPT-4o-mini). They are incredibly fast (sub-second response) and generate the natural, human-readable sentences required.

### C. Text-to-Speech Flow: `expo-speech` with Active Queue Management
*   **Evaluation:** If the API returns descriptions faster than they can be spoken, the app will either talk over itself, or read a backlog of descriptions for things the user isn't even looking at anymore.
*   **Recommendation:** Use **`expo-speech`** paired with a Custom Queue Manager.
    *   Unlike native queues that stack forever, our queue will be "Lossy".
    *   If a new description arrives while the old one is playing, we can choose to either interrupt the old one (if it's a critical safety warning) or drop the new one. The standard behavior should be: **Drop stale frames**. We only describe what the user is looking at *right now*.

---

## 2. The Data Flow Lifecycle

Here is the exact step-by-step lifecycle of a frame in continuous mode:

1.  **Frame Extraction (Native):** `<Camera>` from `react-native-vision-camera` runs at 30fps. The `useFrameProcessor` worklet runs natively.
2.  **Gatekeeper Check (JS):** A JS `setInterval` or throttle checks two conditions: Has it been `X` seconds since the last check? AND is `isSpeaking === false`? If both are true, we grab the current frame.
3.  **Image Compression:** The frame is heavily compressed (scaled down, JPEG 0.5 quality) into a Base64 string directly in memory.
4.  **Inference (Cloud API):** The Base64 string is POSTed to the Gemini API with the prompt: *"In one natural sentence, describe what is happening in this scene as if you are observing it right now."*
5.  **State Management (React):** The API response is received. `isSpeaking` state is set to `true`.
6.  **Audio Playback:** `Speech.speak(text)` outputs the sentence. An `onDone` callback flips `isSpeaking` back to `false`, immediately unblocking the Camera Gatekeeper to capture the next frame.

---

## 3. The Step-by-Step Implementation Strategy

### Phase 1: Camera Migration & Worklet Setup
> [!WARNING]
> This requires removing `expo-camera` and installing `react-native-vision-camera` alongside `react-native-worklets-core`. A new prebuild will be required.

*   Swap `<CameraView>` out for `<Camera>` from Vision Camera.
*   Set up the `useFrameProcessor` to legally access frames.
*   Implement a "Snapshot" function that safely converts a Frame into a Base64 JPEG string using `react-native-vision-camera` capture APIs.

### Phase 2: The Throttling Engine (Gatekeeper)
*   Build a custom hook `useVisionLoop` that manages the interval.
*   Integrate `expo-speech` and hook into its `onStart` and `onDone` event listeners to track the `isSpeaking` state.
*   Link the Gatekeeper to the Camera Snapshot function so it only fires when the device is idle or ready for new information.

### Phase 3: AI Integration & Testing
*   Write the REST API fetch logic for Gemini 1.5 Flash (or GPT-4o).
*   Test the continuous loop: Point the camera at a dog, hear the description, pan to a window, and wait for the TTS to seamlessly describe the window next.
*   Fine-tune the interval delay (e.g., 3 seconds vs 5 seconds) based on real-world comfort for a visually impaired user.

---

## Open Questions

> [!IMPORTANT]
> Please provide your feedback on the following before we execute Phase 1:
> 1. Based on this plan, are we approved to completely replace `expo-camera` with `react-native-vision-camera`? (This is a major architectural shift but fully necessary for hands-free video processing).
> 2. For the Cloud API, do you agree with using Gemini 1.5 Flash? If so, I will need you to define the API key environment variable.

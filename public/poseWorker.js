// Runs MediaPipe's PoseLandmarker (the `@mediapipe/tasks-vision` package)
// inside a Web Worker so pose detection never blocks the main thread.
//
// IMPORTANT: this project previously used the legacy `@mediapipe/pose`
// package here. That package internally references `document`, which does
// not exist inside a Worker's global scope, so it threw
// "ReferenceError: document is not defined" and never actually initialized
// — the whole tracking feature was silently dead. `@mediapipe/tasks-vision`
// is Google's supported replacement and is explicitly designed to run in a
// Worker (no DOM access required).
import {
  FilesetResolver,
  PoseLandmarker,
} from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/vision_bundle.mjs';

const WASM_BASE_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/wasm';
const MODEL_ASSET_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task';

let poseLandmarker = null;
let lastTimestamp = 0;

self.onmessage = async (event) => {
  const { type, imageFrame } = event.data;

  if (type === 'INIT') {
    try {
      const vision = await FilesetResolver.forVisionTasks(WASM_BASE_URL);

      // Attempt initialization with GPU delegate first
      try {
        poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: MODEL_ASSET_URL,
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numPoses: 1,
        });
      } catch (gpuError) {
        console.warn('GPU delegate initialization failed. Falling back to CPU delegate:', gpuError);
        poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: MODEL_ASSET_URL,
            delegate: 'CPU',
          },
          runningMode: 'VIDEO',
          numPoses: 1,
        });
      }

      lastTimestamp = 0;
      self.postMessage({ type: 'READY' });
    } catch (error) {
      self.postMessage({
        type: 'INIT_ERROR',
        error: error?.message || 'Failed to initialize pose detection.',
      });
    }
    return;
  }

  if (type === 'PROCESS_FRAME') {
    if (!poseLandmarker || !imageFrame) {
      imageFrame?.close?.();
      self.postMessage({ type: 'POSE_RESULTS', landmarks: null });
      return;
    }

    try {
      // MediaPipe VIDEO mode requires strictly monotonically increasing timestamps
      const now = performance.now();
      const currentTimestamp = now > lastTimestamp ? now : lastTimestamp + 1;
      lastTimestamp = currentTimestamp;

      const result = poseLandmarker.detectForVideo(imageFrame, currentTimestamp);
      const landmarks = result?.landmarks?.[0] ?? null;
      self.postMessage({ type: 'POSE_RESULTS', landmarks });
    } catch (error) {
      self.postMessage({
        type: 'PROCESS_ERROR',
        error: error?.message || 'Pose detection failed on this frame.',
      });
    } finally {
      imageFrame?.close?.();
    }
  }
};

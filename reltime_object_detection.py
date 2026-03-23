"""
Real-Time Object & Human Detection using YOLOv8
================================================
Install dependencies:
    pip install ultralytics opencv-python cvzone numpy

Run:
    python realtime_detection.py                  # webcam (default)
    python realtime_detection.py --source video.mp4   # video file
    python realtime_detection.py --source 0 --humans-only  # people only
"""

import argparse
import time
import cv2
import cvzone
import numpy as np
from ultralytics import YOLO
from collections import defaultdict

# ─── CONFIG ──────────────────────────────────────────────────────────────────

YOLO_MODEL     = "yolov8n.pt"   # n=nano(fast) | s=small | m=medium | l=large | x=xlarge
CONFIDENCE     = 0.45           # minimum confidence threshold
IOU_THRESHOLD  = 0.45           # NMS IoU threshold
FRAME_SKIP     = 1              # process every Nth frame (1 = every frame)

# COCO class names
CLASS_NAMES = [
    "person","bicycle","car","motorcycle","airplane","bus","train","truck","boat",
    "traffic light","fire hydrant","stop sign","parking meter","bench","bird","cat",
    "dog","horse","sheep","cow","elephant","bear","zebra","giraffe","backpack",
    "umbrella","handbag","tie","suitcase","frisbee","skis","snowboard","sports ball",
    "kite","baseball bat","baseball glove","skateboard","surfboard","tennis racket",
    "bottle","wine glass","cup","fork","knife","spoon","bowl","banana","apple",
    "sandwich","orange","broccoli","carrot","hot dog","pizza","donut","cake","chair",
    "couch","potted plant","bed","dining table","toilet","tv","laptop","mouse",
    "remote","keyboard","cell phone","microwave","oven","toaster","sink",
    "refrigerator","book","clock","vase","scissors","teddy bear","hair drier",
    "toothbrush",
]

# Color palette per class (BGR)
np.random.seed(42)
COLORS = np.random.randint(0, 255, size=(len(CLASS_NAMES), 3), dtype=np.uint8)
PERSON_COLOR = (0, 255, 120)   # bright green for humans


# ─── DRAWING HELPERS ─────────────────────────────────────────────────────────

def draw_box(frame, x1, y1, x2, y2, label, confidence, is_person=False):
    """Draw a stylised bounding box with label."""
    color = PERSON_COLOR if is_person else tuple(int(c) for c in COLORS[CLASS_NAMES.index(label) % len(COLORS)])

    # filled label background
    text  = f"{label}  {confidence:.0%}"
    (tw, th), _ = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, 0.55, 1)

    # corner-only box style
    thickness = 2
    corner_len = max(15, int((x2 - x1) * 0.12))

    # top-left
    cv2.line(frame, (x1, y1), (x1 + corner_len, y1), color, thickness + 1)
    cv2.line(frame, (x1, y1), (x1, y1 + corner_len), color, thickness + 1)
    # top-right
    cv2.line(frame, (x2, y1), (x2 - corner_len, y1), color, thickness + 1)
    cv2.line(frame, (x2, y1), (x2, y1 + corner_len), color, thickness + 1)
    # bottom-left
    cv2.line(frame, (x1, y2), (x1 + corner_len, y2), color, thickness + 1)
    cv2.line(frame, (x1, y2), (x1, y2 - corner_len), color, thickness + 1)
    # bottom-right
    cv2.line(frame, (x2, y2), (x2 - corner_len, y2), color, thickness + 1)
    cv2.line(frame, (x2, y2), (x2, y2 - corner_len), color, thickness + 1)

    # thin full rect
    cv2.rectangle(frame, (x1, y1), (x2, y2), color, 1)

    # label pill
    cv2.rectangle(frame, (x1, y1 - th - 10), (x1 + tw + 10, y1), color, -1)
    cv2.putText(frame, text, (x1 + 5, y1 - 5),
                cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 0, 0), 1, cv2.LINE_AA)


def draw_hud(frame, fps, total_objects, person_count, frame_w, frame_h):
    """Draw semi-transparent HUD overlay."""
    overlay = frame.copy()

    # top bar
    cv2.rectangle(overlay, (0, 0), (frame_w, 50), (15, 15, 15), -1)
    cv2.addWeighted(overlay, 0.7, frame, 0.3, 0, frame)

    # FPS
    fps_color = (0, 255, 100) if fps >= 20 else (0, 165, 255) if fps >= 10 else (0, 0, 255)
    cv2.putText(frame, f"FPS: {fps:.1f}", (10, 33),
                cv2.FONT_HERSHEY_SIMPLEX, 0.8, fps_color, 2, cv2.LINE_AA)

    # object count
    cv2.putText(frame, f"Objects: {total_objects}", (frame_w // 2 - 60, 33),
                cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2, cv2.LINE_AA)

    # person count  
    p_color = (0, 255, 120) if person_count > 0 else (150, 150, 150)
    cv2.putText(frame, f"Persons: {person_count}", (frame_w - 180, 33),
                cv2.FONT_HERSHEY_SIMPLEX, 0.8, p_color, 2, cv2.LINE_AA)

    # bottom status bar
    cv2.rectangle(frame, (0, frame_h - 30), (frame_w, frame_h), (15, 15, 15), -1)
    cv2.putText(frame, "Q = quit   S = screenshot   H = humans only toggle",
                (10, frame_h - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.45,
                (180, 180, 180), 1, cv2.LINE_AA)


# ─── MAIN DETECTOR ───────────────────────────────────────────────────────────

class RealTimeDetector:
    def __init__(self, source=0, humans_only=False, save_output=False):
        self.source       = source
        self.humans_only  = humans_only
        self.save_output  = save_output

        print(f"⏳  Loading YOLOv8 model: {YOLO_MODEL} …")
        self.model = YOLO(YOLO_MODEL)
        print("✅  Model ready.\n")

        self.cap        = None
        self.writer     = None
        self.frame_num  = 0
        self.fps        = 0
        self.prev_time  = time.time()

    # ── setup ────────────────────────────────────────────────────────────────

    def _open_source(self):
        src = int(self.source) if str(self.source).isdigit() else self.source
        self.cap = cv2.VideoCapture(src)
        if not self.cap.isOpened():
            raise RuntimeError(f"Cannot open source: {self.source}")
        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH,  1280)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
        self.frame_w = int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        self.frame_h = int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        print(f"📷  Source opened  {self.frame_w}×{self.frame_h}")

    def _init_writer(self):
        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        self.writer = cv2.VideoWriter(
            "output_detection.mp4", fourcc, 20,
            (self.frame_w, self.frame_h)
        )

    # ── per-frame logic ──────────────────────────────────────────────────────

    def _compute_fps(self):
        now           = time.time()
        self.fps      = 1.0 / (now - self.prev_time + 1e-6)
        self.prev_time = now

    def _process_frame(self, frame):
        results = self.model(
            frame,
            conf=CONFIDENCE,
            iou=IOU_THRESHOLD,
            verbose=False,
            classes=[0] if self.humans_only else None,  # 0 = person
        )[0]

        person_count  = 0
        total_objects = 0
        class_counts  = defaultdict(int)

        for box in results.boxes:
            cls_id = int(box.cls[0])
            label  = CLASS_NAMES[cls_id] if cls_id < len(CLASS_NAMES) else str(cls_id)
            conf   = float(box.conf[0])
            x1, y1, x2, y2 = map(int, box.xyxy[0])

            is_person = (label == "person")
            if is_person:
                person_count += 1

            total_objects += 1
            class_counts[label] += 1
            draw_box(frame, x1, y1, x2, y2, label, conf, is_person)

        draw_hud(frame, self.fps, total_objects, person_count,
                 self.frame_w, self.frame_h)

        return frame, total_objects, person_count

    # ── run loop ─────────────────────────────────────────────────────────────

    def run(self):
        self._open_source()
        if self.save_output:
            self._init_writer()

        print("🚀  Detection running — press Q to quit, S for screenshot, H to toggle humans-only\n")

        try:
            while True:
                ret, frame = self.cap.read()
                if not ret:
                    print("⚠️   End of stream or camera disconnected.")
                    break

                self.frame_num += 1
                self._compute_fps()

                # skip frames if configured
                if self.frame_num % FRAME_SKIP != 0:
                    cv2.imshow("YOLO Real-Time Detection", frame)
                    continue

                processed, obj_count, person_count = self._process_frame(frame)

                cv2.imshow("YOLO Real-Time Detection", processed)

                if self.save_output and self.writer:
                    self.writer.write(processed)

                # ── keyboard controls ────────────────────────────────────────
                key = cv2.waitKey(1) & 0xFF

                if key == ord("q"):
                    print("\n👋  Quit.")
                    break

                elif key == ord("s"):
                    fname = f"screenshot_{int(time.time())}.jpg"
                    cv2.imwrite(fname, processed)
                    print(f"📸  Screenshot saved: {fname}")

                elif key == ord("h"):
                    self.humans_only = not self.humans_only
                    mode = "HUMANS ONLY" if self.humans_only else "ALL OBJECTS"
                    print(f"🔄  Mode switched → {mode}")

        finally:
            self.cap.release()
            if self.writer:
                self.writer.release()
                print("💾  Output video saved: output_detection.mp4")
            cv2.destroyAllWindows()


# ─── CLI ─────────────────────────────────────────────────────────────────────

def parse_args():
    parser = argparse.ArgumentParser(description="Real-time YOLO object & human detection")
    parser.add_argument("--source",      default="0",
                        help="Webcam index (0,1,…) or path to video file")
    parser.add_argument("--humans-only", action="store_true",
                        help="Detect only people")
    parser.add_argument("--save",        action="store_true",
                        help="Save output to output_detection.mp4")
    parser.add_argument("--model",       default=YOLO_MODEL,
                        help="YOLOv8 model variant (yolov8n/s/m/l/x.pt)")
    parser.add_argument("--conf",        type=float, default=CONFIDENCE,
                        help="Confidence threshold (0–1)")
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    YOLO_MODEL = args.model
    CONFIDENCE = args.conf

    detector = RealTimeDetector(
        source      = args.source,
        humans_only = args.humans_only,
        save_output = args.save,
    )
    detector.run()
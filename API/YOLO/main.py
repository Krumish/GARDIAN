from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse
from ultralytics import YOLO
import shutil, os, base64, cv2, uuid

app = FastAPI()

# Load YOLO model once
model = YOLO("v5.pt")

# Helper functions


def box_area(box):
    x1, y1, x2, y2 = box
    return max(0, x2 - x1) * max(0, y2 - y1)

def overlap_area(box1, box2):
    x1, y1, x2, y2 = box1
    a1, b1, a2, b2 = box2

    ix1 = max(x1, a1)
    iy1 = max(y1, b1)
    ix2 = min(x2, a2)
    iy2 = min(y2, b2)

    if ix1 < ix2 and iy1 < iy2:
        return (ix2 - ix1) * (iy2 - iy1)
    return 0


SEVERITY_WEIGHTS = {
    "rocks": 1.0,
    "silt": 0.9,
    "trash": 0.7,
    "leaves": 0.4,
    "cracks": 0.6,
}

# Detection endpoint

@app.post("/detect/")
async def detect(file: UploadFile = File(...)):
    try:
        # Save temp image
        temp_name = f"temp_{uuid.uuid4().hex}.jpg"
        with open(temp_name, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Run YOLO
        results = model(temp_name)

        drainage_boxes = []
        obstruction_boxes = []

        detected_drainage = []
        detected_obstructions = []
        boxes = []

        # Annotated image
        annotated_image = results[0].plot()

        # Extract detections
        for r in results:
            for box in r.boxes:
                cls = r.names[int(box.cls)].lower()
                conf = float(box.conf)
                xyxy = box.xyxy[0].tolist()

                obj = {
                    "class": cls,
                    "confidence": round(conf, 3),
                    "box": xyxy
                }

                boxes.append(obj)

                if cls == "drainages":
                    detected_drainage.append(obj)
                    drainage_boxes.append(xyxy)

                elif cls in SEVERITY_WEIGHTS:
                    detected_obstructions.append(obj)
                    obstruction_boxes.append(obj)

        # Coverage-based analysis

        max_blockage_ratio = 0
        drainage_blockage_details = []

        for dr_box in drainage_boxes:
            dr_area = box_area(dr_box)
            blocked_area = 0

            for obs in obstruction_boxes:
                overlap = overlap_area(obs["box"], dr_box)
                weight = SEVERITY_WEIGHTS.get(obs["class"], 0.5)
                blocked_area += overlap * weight

            ratio = blocked_area / dr_area if dr_area > 0 else 0
            drainage_blockage_details.append(round(ratio, 3))
            max_blockage_ratio = max(max_blockage_ratio, ratio)


        # Status classification


        if len(drainage_boxes) == 0:
            status = "No Drainage Detected"
        elif max_blockage_ratio >= 0.6:
            status = "Clogged"
        elif max_blockage_ratio >= 0.25:
            status = "Partially Blocked"
        else:
            status = "Clear"

        # Convert annotated image
        _, buffer = cv2.imencode(".jpg", annotated_image)
        encoded_image = base64.b64encode(buffer).decode("utf-8")

        # Cleanup
        if os.path.exists(temp_name):
            os.remove(temp_name)


        # API Response


        return JSONResponse({
            "status": status,

            # Summary metrics
            "drainage_count": len(drainage_boxes),
            "obstruction_count": len(detected_obstructions),
            "max_blockage_ratio": round(max_blockage_ratio, 3),
            "blockage_percent": round(max_blockage_ratio * 100, 1),

            # Detailed objects
            "drainage": detected_drainage,
            "obstructions": detected_obstructions,

            # Raw boxes
            "boxes": boxes,

            # Annotated preview
            "annotated_image": encoded_image,
        })

    except Exception as e:
        return JSONResponse(
            {"error": str(e)},
            status_code=500
        )

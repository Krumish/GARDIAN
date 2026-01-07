from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse
from ultralytics import YOLO
import shutil, os, base64, cv2, uuid

app = FastAPI()

# ✅ Load YOLO model once
model = YOLO("v4.pt")


@app.post("/detect/")
async def detect(file: UploadFile = File(...)):
    try:
        # Temporary filename
        temp_name = f"temp_{uuid.uuid4().hex}.jpg"
        with open(temp_name, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # 🔎 Run YOLO
        results = model(temp_name)

        drainage_boxes = []
        obstruction_boxes = []

        # 🆕 Detailed lists
        detected_drainage = []
        detected_obstructions = []

        boxes = []

        # 🖍 Draw bounding boxes
        annotated_image = results[0].plot()

        # 🔍 Extract detections
        for r in results:
            for box in r.boxes:
                cls = r.names[int(box.cls)].lower()
                conf = float(box.conf)
                xyxy = box.xyxy[0].tolist()  # [x1, y1, x2, y2]

                obj = {
                    "class": cls,
                    "confidence": round(conf, 3),
                    "box": xyxy
                }

                boxes.append(obj)

                # Drainages
                if cls == "drainages":
                    detected_drainage.append(obj)
                    drainage_boxes.append(xyxy)

                # Obstructions
                elif cls in ["trash", "leaves", "rocks", "silt", "cracks", "manhole"]:
                    detected_obstructions.append(obj)
                    obstruction_boxes.append(xyxy)

        # ✅ Count valid obstructions (overlapping drainage)
        valid_obstructions = 0
        for obs in obstruction_boxes:
            if any(overlaps(obs, dr) for dr in drainage_boxes):
                valid_obstructions += 1

        drainage_count = len(detected_drainage)
        obstruction_count = valid_obstructions

        # 🚦 Determine status
        if drainage_count == 0:
            status = "No Drainage Detected"
        elif obstruction_count > 2:
            status = "Clogged"
        elif obstruction_count > 0:
            status = "Partially Blocked"
        else:
            status = "Clear"

        # 🖼 Convert annotated image
        _, buffer = cv2.imencode(".jpg", annotated_image)
        encoded_image = base64.b64encode(buffer).decode("utf-8")

        # Cleanup
        if os.path.exists(temp_name):
            os.remove(temp_name)

        return JSONResponse({
            "status": status,

            # ➜ Summary
            "drainage_count": drainage_count,
            "obstruction_count": obstruction_count,

            # ➜ Detailed objects
            "drainage": detected_drainage,
            "obstructions": detected_obstructions,

            # ➜ Raw boxes list (everything)
            "boxes": boxes,

            # ➜ Annotated preview
            "annotated_image": encoded_image,
        })

    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


# 🧠 Overlap helper
def overlaps(box1, box2):
    x1, y1, x2, y2 = box1
    a1, b1, a2, b2 = box2

    inter_x1 = max(x1, a1)
    inter_y1 = max(y1, b1)
    inter_x2 = min(x2, a2)
    inter_y2 = min(y2, b2)

    if inter_x1 < inter_x2 and inter_y1 < inter_y2:
        intersection_area = (inter_x2 - inter_x1) * (inter_y2 - inter_y1)
        box1_area = (x2 - x1) * (y2 - y1)
        return intersection_area / box1_area > 0.1

    return False

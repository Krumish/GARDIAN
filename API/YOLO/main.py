from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse
from ultralytics import YOLO
import shutil, os, base64, cv2, uuid

app = FastAPI()

# ✅ Load YOLO model once (avoid reloading every request)
model = YOLO("v3.pt")

@app.post("/detect/")
async def detect(file: UploadFile = File(...)):
    try:
        # Generate a unique temporary filename
        temp_name = f"temp_{uuid.uuid4().hex}.jpg"
        with open(temp_name, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # 🔹 Run YOLO detection
        results = model(temp_name)

        drainage_count = 0
        obstruction_count = 0
        boxes = []

        # 🔹 Draw bounding boxes on image
        annotated_image = results[0].plot()  # numpy array

        for r in results:
            for box in r.boxes:
                cls = r.names[int(box.cls)]
                conf = float(box.conf)
                xyxy = box.xyxy[0].tolist()

                # Count drainages and obstructions
                if cls.lower() == "drainages":
                    drainage_count += 1
                if cls.lower() in ["trash", "leaves", "rocks", "silt", "cracks", "manhole"]:
                    obstruction_count += 1

                boxes.append({
                    "class": cls,
                    "confidence": conf,
                    "box": xyxy
                })

        # 🔹 Determine status
        if obstruction_count > 0 and drainage_count > 0:
            status = "Clogged"
        elif obstruction_count > 0:
            status = "Partially Blocked"
        else:
            status = "Clear"

        # 🔹 Convert annotated image to base64
        _, buffer = cv2.imencode(".jpg", annotated_image)
        encoded_image = base64.b64encode(buffer).decode("utf-8")

        # 🔹 Clean up temp file
        if os.path.exists(temp_name):
            os.remove(temp_name)

        return JSONResponse({
            "drainage_count": drainage_count,
            "obstruction_count": obstruction_count,
            "status": status,
            "boxes": boxes,
            "annotated_image": encoded_image
        })

    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

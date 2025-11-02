from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse
from ultralytics import YOLO
import shutil, os, base64, cv2

app = FastAPI()

# Load your custom drainage model
model = YOLO("v3.pt") 
@app.post("/detect/")
async def detect(file: UploadFile = File(...)):
    # Save temporary file
    file_path = f"temp_{file.filename}"
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Run YOLO detection
    results = model(file_path)

    drainage_count = 0
    obstruction_count = 0
    boxes = []

    # Annotated image (with bounding boxes)
    annotated_image = results[0].plot()  # numpy array with drawings

    for r in results:
        for box in r.boxes:
            cls = r.names[int(box.cls)]
            conf = float(box.conf)
            xyxy = box.xyxy[0].tolist()

            # Count Drainages
            if cls.lower() == "drainages":
                drainage_count += 1

            # Count obstructions
            if cls.lower() in ["trash", "leaves", "rocks", "silt", "cracks", "manhole"]:
                obstruction_count += 1

            boxes.append({
                "class": cls,
                "confidence": conf,
                "box": xyxy
            })

    # Decide status
    status = "Clear"
    if obstruction_count > 0 and drainage_count > 0:
        status = "Clogged"
    elif obstruction_count > 0:
        status = "Partially Blocked"

    # Convert annotated image to base64
    _, buffer = cv2.imencode(".jpg", annotated_image)
    encoded_image = base64.b64encode(buffer).decode("utf-8")

    # Remove temp file
    os.remove(file_path)

    return JSONResponse({
        "drainage_count": drainage_count,
        "obstruction_count": obstruction_count,
        "status": status,
        "boxes": boxes,
        "annotated_image": encoded_image  # 🔹 Flutter will decode this
    })

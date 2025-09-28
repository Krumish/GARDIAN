from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse
from ultralytics import YOLO
import shutil, os, base64, cv2

app = FastAPI()
model = YOLO("yolov8n.pt")  # replace with your custom trained weights if you have them

@app.post("/detect/")
async def detect(file: UploadFile = File(...)):
    # Save temporary file
    file_path = f"temp_{file.filename}"
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Run YOLO detection
    results = model(file_path)

    persons = 0
    benches = 0
    boxes = []

    # Annotated image (with bounding boxes)
    annotated_image = results[0].plot()  # numpy array with drawings

    for r in results:
        for box in r.boxes:
            cls = r.names[int(box.cls)]
            conf = float(box.conf)
            xyxy = box.xyxy[0].tolist()

            if cls == "person":
                persons += 1
            if cls == "bench":
                benches += 1

            boxes.append({
                "class": cls,
                "confidence": conf,
                "box": xyxy
            })

    # Decide status
    status = "Empty"
    if persons > 0 and benches > 0:
        status = "Full" if persons >= benches else "Partially Full"

    # Convert annotated image to base64
    _, buffer = cv2.imencode(".jpg", annotated_image)
    encoded_image = base64.b64encode(buffer).decode("utf-8")

    # Remove temp file
    os.remove(file_path)

    return JSONResponse({
        "person_count": persons,
        "bench_count": benches,
        "status": status,
        "boxes": boxes,
        "annotated_image": encoded_image  # 🔹 Flutter will decode this
    })

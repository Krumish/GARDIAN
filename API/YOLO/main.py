from fastapi import FastAPI, UploadFile, File
from ultralytics import YOLO
from fastapi.responses import JSONResponse
import shutil, os

app = FastAPI()
model = YOLO("yolov8n.pt")   # later replace with "best.pt" after training

@app.post("/detect/")
async def detect(file: UploadFile = File(...)):
    file_path = f"temp_{file.filename}"
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    results = model(file_path)
    os.remove(file_path)

    persons = 0
    benches = 0
    boxes = []

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

    status = "Empty"
    if persons > 0 and benches > 0:
        status = "Full" if persons >= benches else "Partially Full"

    return JSONResponse({
        "person_count": persons,
        "bench_count": benches,
        "status": status,
        "boxes": boxes
    })

from fastapi import FastAPI, UploadFile, File, Form
from fastapi.responses import JSONResponse
from ultralytics import YOLO
import shutil
import os
import base64
import cv2
import uuid

app = FastAPI()

models = {}

@app.on_event("startup")
def load_models():
    global models
    print("Loading YOLO models...")
    models["Drainage"] = YOLO("drainage_v10.pt")  
    models["Pothole"] = YOLO("pothole_v2.pt")
    models["Manhole"] = YOLO("manhole_v2.pt")
    models["Road Markings"] = YOLO("marking_v2.pt")    
    models["Road Blockage"] = YOLO("road_block_v3.pt")
    models["Waste Management"] = YOLO("trash_v3.pt")
    print(f"Models loaded: {list(models.keys())}")

def box_area(box):
    x1, y1, x2, y2 = box
    return max(0, x2 - x1) * max(0, y2 - y1)

def overlap_area(box1, box2):
    x1, y1, x2, y2 = box1
    a1, b1, a2, b2 = box2
    ix1, iy1 = max(x1, a1), max(y1, b1)
    ix2, iy2 = min(x2, a2), min(y2, b2)
    if ix1 < ix2 and iy1 < iy2:
        return (ix2 - ix1) * (iy2 - iy1)
    return 0

# SEVERITY WEIGHTS JUSTIFICATION (Hydrological Principles)
SEVERITY_WEIGHTS = {
    "rock": 1.0, "silt": 0.9, "trash": 0.7, "leaf": 0.4, 
}

EXPECTED_CLASSES = {
    "Drainage": ["drainage", "rock", "silt", "trash", "leaf"],
    "Pothole": ["pothole", "potholes"], 
    "Manhole": ["manhole", "manholes", "broken_manhole", "intact_manhole"],
    "Road Markings": ["crosswalk", "faded_crosswalk", "intact_crosswalk"],
    "Road Blockage": ["vehicle", "bike", "bus", "car", "e-bike", "e-jeepney", "e-tricycle", "jeepney", "motorcycle", "semi-truck", "trycle", "truck"],
    "Waste Management": ["trash", "garbage"]
}

@app.post("/detect/")
async def detect(file: UploadFile = File(...), issue_type: str = Form(...), conf: float = Form(0.25)):
    if issue_type not in models:
        return JSONResponse({"error": f"Invalid issue_type: {issue_type}"}, status_code=400)

    model = models[issue_type]
    temp_name = f"temp_{uuid.uuid4().hex}.jpg"

    try:
        with open(temp_name, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        results = model(temp_name, conf=conf, iou=0.45)
        
        annotated_image = results[0].plot(conf=False, labels=True, boxes=True)
        
        all_boxes = []
        valid_classes = EXPECTED_CLASSES.get(issue_type, [])

        for r in results:
            for box in r.boxes:
                class_name = r.names[int(box.cls)].lower()
       
                if not valid_classes or class_name in valid_classes:
                    all_boxes.append({
                        "class": class_name,
                        "confidence": round(float(box.conf), 3),
                        "box": box.xyxy[0].tolist()
                    })

        response_data = {
            "issue_type": issue_type,
            "detection_count": len(all_boxes),
            "boxes": all_boxes,
        }

        if issue_type == "Drainage":
            drainage_boxes = [b["box"] for b in all_boxes if b["class"] == "drainage"]
        
            all_potential_obs = [b for b in all_boxes if b["class"] in SEVERITY_WEIGHTS]
       
            actual_obstructions = []
            if drainage_boxes:
                for obs in all_potential_obs:
                    if any(overlap_area(obs["box"], dr_box) > 0 for dr_box in drainage_boxes):
                        actual_obstructions.append(obs)
            
            max_blockage_ratio = 0
            for dr_box in drainage_boxes:
                dr_area = box_area(dr_box)
             
                blocked_area = sum(overlap_area(obs["box"], dr_box) * SEVERITY_WEIGHTS.get(obs["class"], 0.5) for obs in actual_obstructions)
                
                raw_ratio = blocked_area / dr_area if dr_area > 0 else 0
                ratio = min(1.0, raw_ratio) 
                max_blockage_ratio = max(max_blockage_ratio, ratio)

            # Apply statuses
            if not drainage_boxes: status = "No Drainage Detected"
            elif max_blockage_ratio >= 0.50: status = "Clogged"
            elif max_blockage_ratio >= 0.10: status = "Partially Blocked"
            else: status = "Clear"

            response_data.update({
                "status": status,
                "blockage_percent": round(max_blockage_ratio * 100, 1),
                "max_blockage_ratio": round(max_blockage_ratio, 3),
                "drainage": [b for b in all_boxes if b["class"] == "drainage"],
                "obstructions": actual_obstructions, 
                "drainage_count": len(drainage_boxes),
                "obstruction_count": len(actual_obstructions)
            })
        else:
            response_data.update({
                "status": "Detected" if all_boxes else "Clear",
                "blockage_percent": None 
            })

        _, buffer = cv2.imencode(".jpg", annotated_image)
        response_data["annotated_image"] = base64.b64encode(buffer).decode("utf-8")

        return JSONResponse(response_data)

    finally:
        if os.path.exists(temp_name): os.remove(temp_name)
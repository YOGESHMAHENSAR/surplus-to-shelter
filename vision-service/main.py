"""
OpenCV food-weight estimator (reference-object method).

The donor places a bank card (85.6 x 53.98 mm) or an A4 sheet next to the food.
1. Find the reference object  -> pixels-per-cm scale
2. Segment the food (GrabCut) -> food area in cm^2
3. weight = area x assumed depth x fill factor x food density
"""
import base64
import cv2
import numpy as np
from fastapi import FastAPI, File, Form, UploadFile

app = FastAPI(title="Surplus-to-Shelter vision service")

# real-world sizes in cm (long side, short side)
REFERENCES = {"card": (8.56, 5.398), "a4": (29.7, 21.0)}
# food type -> (density g/cm3, typical depth cm). Rough averages: donors can edit the result.
FOOD = {
    "cooked": (0.90, 3.0), "produce": (0.60, 5.0), "bakery": (0.30, 4.0), "dairy": (1.00, 3.0),
    "meat": (1.00, 3.0), "packaged": (0.50, 4.0), "beverages": (1.00, 8.0), "other": (0.70, 4.0),
}
FILL = 0.8          # food rarely fills its full bounding depth
MAX_SIDE = 640      # work on a downscaled copy for speed (scale is computed on the same copy)


def find_reference(img, dims):
    h, w = img.shape[:2]
    long_cm, short_cm = max(dims), min(dims)
    target = long_cm / short_cm
    gray = cv2.GaussianBlur(cv2.cvtColor(img, cv2.COLOR_BGR2GRAY), (5, 5), 0)
    edges = cv2.dilate(cv2.Canny(gray, 40, 120), np.ones((3, 3), np.uint8))
    cnts, _ = cv2.findContours(edges, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    best = None
    for c in cnts:
        area = cv2.contourArea(c)
        if area < 0.004 * w * h or area > 0.30 * w * h:
            continue
        rect = cv2.minAreaRect(c)
        rw, rh = rect[1]
        if min(rw, rh) < 8:
            continue
        err = abs(max(rw, rh) / min(rw, rh) - target) / target
        fill = area / (rw * rh)
        if err < 0.10 and fill > 0.80 and (best is None or err < best["err"]):
            best = {"err": err, "rect": rect, "ppc": (max(rw, rh) / long_cm + min(rw, rh) / short_cm) / 2}
    return best


def segment_food(img, ref_poly):
    h, w = img.shape[:2]
    mask = np.zeros((h, w), np.uint8)
    rect = (int(w * .05), int(h * .05), int(w * .90), int(h * .90))
    bgd, fgd = np.zeros((1, 65), np.float64), np.zeros((1, 65), np.float64)
    cv2.grabCut(img, mask, rect, bgd, fgd, 4, cv2.GC_INIT_WITH_RECT)
    cv2.fillPoly(mask, [ref_poly], cv2.GC_BGD)                       # the reference card is never food
    cv2.grabCut(img, mask, None, bgd, fgd, 2, cv2.GC_INIT_WITH_MASK)
    fg = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
    cv2.fillPoly(fg, [ref_poly], 0)
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    fg = cv2.morphologyEx(cv2.morphologyEx(fg, cv2.MORPH_OPEN, k), cv2.MORPH_CLOSE, k)
    cnts, _ = cv2.findContours(fg, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not cnts:
        return [], 0.0
    biggest = max(cv2.contourArea(c) for c in cnts)
    keep = [c for c in cnts if cv2.contourArea(c) >= 0.2 * biggest]  # plate + side dishes, not specks
    return keep, sum(cv2.contourArea(c) for c in keep)


def estimate(data: bytes, food_type: str = "other", ref: str = "card"):
    img = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)
    if img is None:
        return {"reference_found": False, "message": "Could not read the image"}
    s = MAX_SIDE / max(img.shape[:2])
    if s < 1:
        img = cv2.resize(img, None, fx=s, fy=s, interpolation=cv2.INTER_AREA)
    dims = REFERENCES.get(ref, REFERENCES["card"])

    found = find_reference(img, dims)
    if not found:
        return {"reference_found": False, "message": f"No {ref} found. Place a {ref} flat next to the food and retake the photo."}
    box = cv2.boxPoints(found["rect"]).astype(np.int32)
    contours, area_px = segment_food(img, box)
    frac = area_px / (img.shape[0] * img.shape[1])
    if not contours or frac < 0.01 or frac > 0.85:
        return {"reference_found": True, "message": "Could not separate the food from the background. Use a plain surface and good light."}

    area_cm2 = area_px / (found["ppc"] ** 2)
    density, depth = FOOD.get(food_type, FOOD["other"])
    weight_kg = round(area_cm2 * depth * FILL * density / 1000, 2)
    confidence = round(max(0.3, 0.75 - found["err"] * 3), 2)

    out = img.copy()
    cv2.polylines(out, [box], True, (0, 200, 0), 3)
    cv2.drawContours(out, contours, -1, (0, 140, 255), 3)
    cv2.putText(out, f"{area_cm2:.0f} cm2 ~ {weight_kg} kg", (10, 28), cv2.FONT_HERSHEY_SIMPLEX, .8, (255, 255, 255), 4)
    cv2.putText(out, f"{area_cm2:.0f} cm2 ~ {weight_kg} kg", (10, 28), cv2.FONT_HERSHEY_SIMPLEX, .8, (20, 20, 20), 2)
    ok, buf = cv2.imencode(".jpg", out, [cv2.IMWRITE_JPEG_QUALITY, 70])
    return {
        "reference_found": True, "reference": ref, "px_per_cm": round(found["ppc"], 2),
        "area_cm2": round(area_cm2, 1), "food_type": food_type, "weight_kg": weight_kg,
        "confidence": confidence, "annotated": "data:image/jpeg;base64," + base64.b64encode(buf).decode(),
    }


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/estimate-weight")
async def estimate_weight(file: UploadFile = File(...), food_type: str = Form("other"), reference: str = Form("card")):
    return estimate(await file.read(), food_type, reference)

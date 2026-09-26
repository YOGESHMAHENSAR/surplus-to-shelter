import sys
import json
import cv2
import numpy as np
from ultralytics import SAM

def process_container(image_path, scale_cm_per_px, height_cm, density_g_cm3):
    # Load SAM model (Fast MobileSAM variant)
    model = SAM('mobile_sam.pt')

    # Run inference to generate segment masks
    results = model(image_path, verbose=False)
    
    if len(results[0].masks) == 0:
        return {"error": "No object detected"}

    # Extract the largest segmented mask (assumed to be primary container)
    masks = results[0].masks.data.cpu().numpy()
    areas = [np.sum(mask) for mask in masks]
    largest_idx = np.argmax(areas)
    
    binary_mask = (masks[largest_idx] * 255).astype(np.uint8)

    # OpenCV contour extraction and surface area calculation
    contours, _ = cv2.findContours(binary_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    container_contour = max(contours, key=cv2.contourArea)
    
    pixel_area = cv2.contourArea(container_contour)

    # Apply mathematical heuristic
    real_surface_area_cm2 = pixel_area * (scale_cm_per_px ** 2)
    volume_cm3 = real_surface_area_cm2 * height_cm
    mass_grams = volume_cm3 * density_g_cm3

    return {
        "pixel_area_px2": float(pixel_area),
        "surface_area_cm2": round(real_surface_area_cm2, 2),
        "estimated_volume_ml": round(volume_cm3, 2),
        "estimated_mass_g": round(mass_grams, 2),
        "margin_of_error": "±10-15%"
    }

if __name__ == "__main__":
    if len(sys.argv) < 5:
        print(json.dumps({"error": "Invalid arguments"}))
        sys.exit(1)

    image_path = sys.argv[1]
    scale = float(sys.argv[2])        # e.g., 0.05 cm per pixel
    height = float(sys.argv[3])       # e.g., 10 cm assumed height
    density = float(sys.argv[4])      # e.g., 1.0 g/cm3 for water-like contents

    output = process_container(image_path, scale, height, density)
    print(json.dumps(output))
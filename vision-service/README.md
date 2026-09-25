# Vision service (OpenCV weight estimation)
```bash
cd vision-service
python -m venv .venv && source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --port 8000
```
Photo rule for donors: lay a bank card (or A4 sheet) flat on the same surface, next to the food, on a plain background, camera roughly overhead.
Estimate = food area (cm²) x assumed depth x 0.8 x density per food type. It is an estimate, so the donor can always edit the weight.

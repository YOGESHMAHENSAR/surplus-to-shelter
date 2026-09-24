# Surplus-to-Shelter: Real-Time Food Rescue Routing (AmiHacks, Problem 1)

MERN implementation of the five-stage workflow: **Donor Intake → Matching Engine → Dispatch & Routing → Delivery & Verification → Impact Reporting.**

## Run it
Requires Node 18+ and MongoDB (local or Atlas).
```bash
npm run install:all
cp server/.env.example server/.env      # edit MONGO_URI / keys
npm run seed                            # demo data (Jaipur), password: password123
npm run dev                             # API :5000, web :5173
```
Demo logins: `donor@demo.com`, `shelter@demo.com`, `driver@demo.com`, `admin@demo.com` (also donor2, shelter2, shelter3, driver2).

## Demo script (open 3 browser windows: donor, driver, shelter)
1. Driver: **Go available** (allow location, or click *Update location*).
2. Donor: **Post surplus food** → photo (AI) or manual → submit. Watch the match result.
3. Driver gets a live alert → **Accept pickup** → arrive → confirm pickup → arrive at shelter → **signature/photo** → delivered.
4. Everyone's dashboard updates live. Open **Impact** for meals, CO₂e, hotspots, tax receipt, ESG CSV.

## Workflow → code map
| Stage | Diagram step | Where |
|---|---|---|
| 1 Intake | AI/CV vs manual classification, photo, pickup & expiry | `client/src/pages/PostDonation.jsx`, `server/src/services/classifier.js`, `routes/donations.js` |
| 2 Matching | geo-match, capacity, need/preference filter, food safety + expiry risk score, reserve slot, reject/re-evaluate | `server/src/services/matching.js` |
| 3 Dispatch | notify drivers (push + SMS), accept?, re-dispatch, vehicle capacity, multi-stop route | `services/dispatch.js`, `services/notify.js`, `utils/geo.js`, `routes/driver.js` |
| 4 Delivery | arrive → confirm pickup → status tracking → arrive → handover → signature/photo → delivered | `routes/driver.js` (`FLOW`), `DriverDashboard.jsx` |
| 5 Impact | meals, kg diverted, CO₂e, dashboard, donor tax doc, ESG, hotspot map | `routes/impact.js`, `Impact.jsx` |

## Optional integrations
- `ANTHROPIC_API_KEY`: real photo classification. Without it the photo is saved and the donor enters details manually.
- `TWILIO_*`: real SMS. Without it, SMS is printed in the server console.

## Notes / assumptions
- Impact factors: 0.5 kg per meal, 2.5 kg CO₂e per kg food, $4.25/kg fair-market value (configurable via `FMV_USD_PER_KG`). These are approximations; check them before using them in official reports.
- Route optimisation is a nearest-neighbour heuristic that keeps each pickup before its drop-off, using straight-line distance. Swap in Google/OSRM directions for road distances.
- Reserved shelter capacity is released on expiry or when no driver accepts. Shelters set their own "current stock" to reflect consumed food.
- Hotspots are shown as a ranked grid table. Add Leaflet if you want a map.

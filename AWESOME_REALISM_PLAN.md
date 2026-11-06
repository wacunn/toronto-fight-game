# Toronto 3D World: Master Plan for Next-Level Realism, Transit, Flight & Easter Eggs

> **Coordinate Convention**: All coordinates $(x, z)$ in this plan use the unified game projection defined in `tools/fetch_toronto.py` (`LAT0 = 43.6440, LON0 = -79.3835`, where $+X$ is East and $+Z$ is South into Lake Ontario / Toronto Islands). Every feature is designed to integrate cleanly into `city.js`, `islands.js`, `traffic.js`, and `game.js` while maintaining 60 FPS via `THREE.InstancedMesh` and chunked Level-of-Detail (LoD).

---

## Pillar 1: Solving the "Look at Google Maps Block-by-Block" Problem (`tools/inspect_block.py`)

To inspect real Toronto blocks visually and architecturally without needing a commercial Google Street View API key, we combine four open geospatial + street-imagery sources into a single automated CLI tool (`tools/inspect_block.py`):

1. **Exact Block Coordinate Inversion**:
   - Any game coordinate $(x, z)$ maps deterministically to $(\text{lat}, \text{lon})$:
     $$\text{lat} = 43.6440 - \frac{z}{111132.0}, \qquad \text{lon} = -79.3835 + \frac{x}{80576.6}$$
2. **Multi-Source Block Harvesting**:
   - **City of Toronto Open Data — 3D Massing & Heritage Register (`ckan0.cf.opendata.inter.prod-toronto.ca`)**: Pulls official LiDAR roof heights, eaves heights, step-back tiers, construction year, and Heritage Register architectural descriptions for every address on the block.
   - **Wikimedia Commons Geosearch API + Wikidata**: Queries `action=query&list=geosearch&gscoord={lat}|{lon}&gsradius=120&gsnamespace=6` to download real geotagged street-level photographs of the block into `scratch/block_photos/` so the agent can view the actual `.jpg`/`.png` photos directly via `read_file`.
   - **OpenStreetMap `building:part` + Storefront POI Audit**: Matches every `TORONTO_MAP.buildings[idx]` on the block with its `addr:housenumber`, `building:levels`, `building:material`, `building:colour`, and ground-floor `TORONTO_MAP.pois`.
3. **Output — The Visual Block Dossier**:
   - Generates a top-down annotated block map (`#b_idx`, dimensions in meters, street frontage vectors) paired with downloaded street-level photographs so we can systematically upgrade **Queen St W**, **Yonge St**, **University Ave**, **Spadina Ave**, and **The Esplanade** block-by-block.

---

## Pillar 2: Rideable TTC Streetcars (504 King, 510 Spadina, 509 Harbourfront, 501 Queen)

Upgrade the existing Bombardier Flexity Outlook streetcars in `traffic.js` and `city.js` into an interactive, rideable transit system:

- **Routes & Stops**:
  - **504 King**: Spadina (`-790, -200`) ↔ John/TIFF (`-502, -289`) ↔ Simcoe/Roy Thomson (`-208, -377`) ↔ Bay (`315, -533`) ↔ Yonge (`492, -586`) ↔ Church (`695, -647`).
  - **510 Spadina**: Queen W (`-950, -560`) ↔ King W (`-790, -200`) ↔ Front W (`-715, 45`) ↔ Bremner (`-650, 255`) ↔ Queens Quay (`-575, 495`).
  - **509 Harbourfront**: Union Loop (`265, -90`) ↔ Ferry Terminal (`700, 290`) ↔ York (`190, 445`) ↔ Rees/HT0 (`-140, 495`) ↔ Spadina (`-575, 495`) ↔ Bathurst Quay (`-1020, 640`).
  - **501 Queen**: Spadina (`-950, -560`) ↔ John/MuchMusic (`-595, -620`) ↔ Osgoode (`-310, -705`) ↔ Yonge/Eaton Centre (`410, -915`).
- **Boarding & Interior Experience**:
  - Approaching a TTC shelter or slowing streetcar triggers the two-bell TTC gong (`DING-DING`), flashing amber door lights, and `[E] BOARD TTC STREETCAR`.
  - Inside (`state.onStreetcar = true`), the player gets a panoramic window / aisle view (`y = 1.95m`) with 360° free-look, automated TTC next-stop chimes + LED banners, and `[E]` to pull the yellow stop-request cord and disembark at the next intersection.

---

## Pillar 3: Underground TTC Line 1 Subway System (`y = -14.0m`)

Wire the existing surface TTC / PATH glass pavilions into a full underground subway layer at `y = -14.0m`:

- **5 Iconic Line 1 U-Loop Stations**:
  1. **Union Station (`(264, -145)`)**: Cream/blue Vitrolite glass tiles, artwork panels, and direct connection to Union Station concourse.
  2. **St. Andrew Station (`(-125, -402)`)**: Curved slate-blue and dove-grey enamel steel panels under King & University.
  3. **Osgoode Station (`(-310, -705)`)**: Marigold-yellow and jet-black ceramic tiles under Queen & University.
  4. **King Station (`(492, -586)`)**: Cream tiles with crimson TTC name bands and cast-iron columns under King & Yonge.
  5. **Queen Station (`(410, -915)`)**: Cool blue tiles with burnt-orange bands under Queen & Yonge.
- **Rideable 6-Car TTC "Toronto Rocket" (TR) Trains**:
  - Descend any TTC stairwell (`[E]`) with Presto gate chime, board the open-gangway stainless-steel train (`D5–B♭4–G4` door chime), and either ride in real time through the illuminated concrete U-loop tunnels OR select any destination station from the platform route map UI.

---

## Pillar 4: Flyable Billy Bishop Porter Dash 8-400 (Q400) + Greater Toronto LoD Mega-Ring

Let the player board a Porter Airlines De Havilland Dash 8-400 at Billy Bishop Airport (`CYTZ`) and fly a scenic loop over the entire city:

- **Flight Modes (`game.js` + `islands.js`)**:
  - **Mode A — 45s Scenic City Loop**: Taxi down Runway 08 (`(-1450, 1030) → (-920, 1030)`), twin 6-blade turboprops roar to life, climb out over the Eastern Gap (`y = 380m`), bank north up the Don Valley past the Distillery District, cruise west along the Bloor corridor overlooking Midtown & the Downtown Core, bank south over High Park / Humber Bay / Ontario Place, and touch down on Runway 08 with reverse-prop roar.
  - **Mode B — Interactive Free-Pilot Mode (`[P]`)**: Manual pitch/altitude (`[W/S]`), banked turns (`[A/D]`), camera cycle (`[V]` between Window Seat Looking at Wing & Prop, Cockpit Flight Deck, and Chase Cam), and `[E]` to auto-land at `CYTZ`.
- **Greater Toronto LoD Outer Ring (`6 km × 6 km`, 4 Batched Instanced Draw Calls)**:
  - **North (`z: -950..-3850`)**: Nathan Phillips Square (Toronto City Hall curved twin towers + flying-saucer council chamber + `TORONTO` sign), Eaton Centre & Yonge–Dundas Square, Queen's Park Legislature & U of T, Royal Ontario Museum (*Crystal*), Bloor–Yonge / Yorkville skyline, and **Casa Loma** on the Davenport escarpment.
  - **West (`x: -1100..-4500`)**: Exhibition Place (Princes' Gates, BMO Field), **Ontario Place Cinesphere** geodesic dome & white pods, High Park & Grenadier Pond, and Humber Bay Arch Bridge + condo skyline.
  - **East (`x: +1050..+4200`)**: Distillery District Victorian brick kilns & chimney, Port Lands / Villiers Island (*ookwemin minising*) with the red-and-white **Cherry Street Bridges**, Don Valley Parkway & Bloor Viaduct, and Tommy Thompson Park (Leslie Street Spit) lighthouse.

---

## Pillar 5: High-Quality Toronto Easter Eggs & Micro-Experiences

1. **Speakers Corner Booth at 299 Queen St W (`(-572, -608)`)**: Drop a loonie (`[E]`) into the classic Citytv/MuchMusic booth for a 4:3 CRT camcorder overlay and broadcast your message on the building's giant LED ticker.
2. **Nocturnal Toronto Raccoons ("Trash Pandas")**: Masked, ring-tailed raccoons rummaging in Green Bins in downtown laneways and Ward's Island—occasionally scurrying off with a slice of Pizza Pizza.
3. **CN Tower EdgeWalk (`356m`)**: Step outside onto the open-air metal grate ledge atop the CN Tower main pod roof tethered to the overhead orange safety rail.
4. **Roundhouse Park Live Locomotive Turntable & 5:00 PM Steam Whistle (`(-145, 295)`)**: Rotate CPR #5930 on the turntable pit bridge and blow the echoing 3-chord brass Steam Whistle with a rising white steam plume.
5. **Rogers Centre Retractable Roof & Home Run Fireworks (`(-485, 235)`)**: Motor open the giant white dome panels over `8s` to reveal the baseball diamond, Jumbotron, and a Blue Jays home-run horn + fireworks burst.
6. **1815 Ghost of Gibraltar Point Lighthouse (`(-480, 1520)`)**: Climb the 1808 hexagonal limestone tower to the Fresnel lens gallery and meet the friendly apparition of first keeper John Paul Radelmüller.
7. **Berczy Park 27-Dog Fountain & St. Lawrence Market Peameal Bacon Sandwich**: Trigger the parabolic water arcs at Berczy Park (`(650, -455)`) or grab a Carousel Bakery Peameal Bacon on a Kaiser at St. Lawrence Market (`(845, -455)`) for full HP + sprint boost.


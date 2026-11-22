/**
 * TORONTO ISLANDS ARCHIPELAGO MINI-WORLD
 * ============================================================================
 * An authentic 3D simulation of the Toronto Islands archipelago:
 *
 * 1. REAL WATERWAYS UNDER EVERY BRIDGE:
 *    - Distinct, physically separated island landmasses.
 *    - Long Pond & Allan A. Lamport Regatta Course (38m wide open water).
 *    - Blockhouse Bay separating Olympic Island and Gibraltar Point.
 *    - South Lagoon winding behind Centre Island beach dunes.
 *    - Algonquin Canal separating Algonquin and Ward's Island.
 *    - Hanlan's Canal separating Gibraltar Point and Hanlan's Point.
 *    - Algonquin Channel West separating Centreville from Algonquin Island.
 *    - Open blue water flows freely under every bridge with stone/timber abutments!
 *
 * 2. ANCIENT URBAN FOREST & NATURE TRAILS (6,000+ INSTANCED TREES & FLORA):
 *    - Massive heritage Eastern Cottonwoods (Populus deltoides) with towering canopies
 *    - Cascading Weeping Willows (Salix babylonica) draping branches into lagoon waters
 *    - Sugar Maples and Red Oaks in dense interior woodland groves
 *    - Coastal White Pines and Eastern Redcedars along beach dunes
 *    - Understory shrubs, wetland reeds, cattails, and floating water lily pads
 *    - Winding crushed-gravel and packed-earth nature trails weaving beneath shady canopy tunnels
 *    - 1.5km wooden Boardwalk from Centre Island Beach to Ward's Island Beach
 *
 * 3. AUTHENTIC ISLAND LANDMARKS & LIFE (ACCURATE REAL-WORLD POSITIONS):
 *    - William Meany Hedge Maze: located on the EAST side of Avenue of the Island (x=105, z=Z(175)),
 *      nestled between Avenue formal gardens and Centreville Carousel / Franklin Children's Garden.
 *      Features rich earth-toned dirt walking paths and the historic 1888 Toronto Island School Bell at the center!
 *    - Centreville Vintage Amusement Park: giant rotating 26m Ferris wheel, vintage carousel, Pizza Pizza food court.
 *    - 1808 Gibraltar Point Limestone Lighthouse with sweeping revolving beacon beam.
 *    - Billy Bishop Airport (CYTZ): Runway 08/26, terminal, control tower, rotating radar & Dash-8 aircraft.
 *    - Algonquin & Ward's Island pedestrian-only summer cottage communities & Ward's Cafe patio.
 *    - Hanlan's Point ferry terminal, Ned Hanlan memorial sculling statue, and historic baseball diamonds.
 *    - Animated wildlife: swimming swans on the lagoons, moored canoes on Long Pond, cruising harbour ferry.
 *    - Distant 3D Toronto Skyline across the harbour (553m CN Tower, Rogers Centre, Financial District towers).
 *
 * Coordinate Space:
 * Centered around (x = 0, z = 5000), allowing the entire 2.9km archipelago to be
 * explored without interfering with downtown mainland city grids or AI combat training.
 * ============================================================================
 */

(function () {
  'use strict';

  function buildTorontoIslands(scene) {
    const islandsGroup = new THREE.Group();
    islandsGroup.name = 'torontoIslandsArchipelago';

    const Z_BASE = 1200;
    const Z = o => Z_BASE + o;
    const LITE_ISL = !!(typeof window !== 'undefined' && window.FOD_HW && window.FOD_HW.lite);
    const GROUND_Y = 0.55; // walking height on the islands
    const WATER_Y = -0.65; // matches city.js Toronto Inner Harbour water level
    let renderedOsmTowers = 0;
    const flowerBeds = [];
    let flightPlane = null;

    // ------------------------------------------------------------------------
    // Deterministic noise for procedural terrain and vegetation
    // ------------------------------------------------------------------------
    function hash2(i, j) {
      const h = Math.sin(i * 127.1 + j * 311.7) * 43758.5453;
      return h - Math.floor(h);
    }
    function vnoise(x, z) {
      const i = Math.floor(x), j = Math.floor(z);
      const fx = x - i, fz = z - j;
      const u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
      const a = hash2(i, j), b = hash2(i + 1, j), c = hash2(i, j + 1), d = hash2(i + 1, j + 1);
      return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
    }
    function fbm(x, z) {
      return vnoise(x, z) * 0.55 + vnoise(x * 2.03 + 17, z * 2.03 + 9) * 0.3 + vnoise(x * 4.1 + 31, z * 4.1 + 5) * 0.15;
    }
    const n1 = t => vnoise(t, 0.37) * 2 - 1;
    let seed = 20261101;
    function rnd() {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    }
    const smooth = (a, b, t) => {
      const k = Math.max(0, Math.min(1, (t - a) / (b - a)));
      return k * k * (3 - 2 * k);
    };

    // ------------------------------------------------------------------------
    // Geography: Island Shorelines & Continuous Land Field
    // ------------------------------------------------------------------------
    function interp(ctrl, x) {
      if (x <= ctrl[0][0]) return ctrl[0][1];
      for (let i = 1; i < ctrl.length; i++) {
        if (x <= ctrl[i][0]) {
          const a = ctrl[i - 1], b = ctrl[i];
          let t = (x - a[0]) / (b[0] - a[0]);
          t = t * t * (3 - 2 * t);
          return a[1] + (b[1] - a[1]) * t;
        }
      }
      return ctrl[ctrl.length - 1][1];
    }

    // Harbour-side (north) and lake-side (south) shorelines of the main chain
    const NORTH = [
      [-905, Z(-160)], [-760, Z(-135)], [-720, Z(-105)], [-640, Z(-70)], [-520, Z(-15)], [-400, Z(0)],
      [-250, Z(30)], [-100, Z(10)], [0, Z(-5)], [150, Z(0)], [300, Z(-15)], [450, Z(-30)], [600, Z(-35)],
      [800, Z(-45)], [1000, Z(-25)], [1135, Z(-25)], [1250, Z(0)], [1330, Z(80)]
    ];
    const SOUTH = [
      [-905, Z(330)], [-800, Z(400)], [-650, Z(460)], [-480, Z(490)], [-300, Z(500)], [0, Z(500)],
      [200, Z(495)], [400, Z(480)], [600, Z(450)], [800, Z(400)], [1000, Z(330)], [1150, Z(260)], [1250, Z(180)], [1330, Z(100)]
    ];
    const zN = x => interp(NORTH, x) + n1(x / 70) * 8;
    const zS = x => interp(SOUTH, x) + n1(x / 85 + 11) * 7;
    const EAST_TIP = 1335;

    // Lagoons, channels and ponds (water carved out of the land under bridges)
    const CHANNELS = [
      // North Lagoon Channel: flows between the North Arrival Island and Centreville/park mainland under North Arrival Bridge (x=28, z=Z(118..158))
      { name: 'North Lagoon Channel', w: 26, pts: [[-120, Z(138)], [-40, Z(138)], [28, Z(138)], [100, Z(138)], [170, Z(145)]] },
      // Manitou Lagoon / Long Pond: spans under Manitou Bridge (0, Z(230..280))
      { name: 'Long Pond', w: 38, pts: [[-290, Z(255)], [-150, Z(255)], [0, Z(255)], [80, Z(255)], [180, Z(255)], [330, Z(260)]] },
      // Blockhouse Bay: runs between Olympic Island and Gibraltar Point, passing under Olympic-Gibraltar bridge (x=-340, z=Z(318))
      { name: 'Blockhouse Bay', w: 36, pts: [[-340, Z(220)], [-340, Z(280)], [-340, Z(318)], [-350, Z(380)], [-420, Z(430)]] },
      // South Lagoon: winds behind Centre Island dunes flanking the formal gardens to the west and east
      // Routed to strictly avoid cutting through the William Meany Hedge Maze (x: -105..-25) or the Formal Gardens (x: -45..45)
      { name: 'South Lagoon West', w: 26, pts: [[-260, Z(370)], [-200, Z(360)], [-150, Z(355)], [-125, Z(330)], [-125, Z(300)]] },
      { name: 'South Lagoon East', w: 26, pts: [[75, Z(300)], [100, Z(330)], [160, Z(360)], [240, Z(370)]] },
      // Algonquin Canal: runs between Algonquin & Ward's Island, passing under Ward-Algonquin bridge (x=750, z=Z(60))
      { name: 'Algonquin Canal', w: 28, pts: [[750, Z(-60)], [750, Z(0)], [750, Z(60)], [750, Z(100)], [750, Z(180)]] },
      // Hanlan Canal: runs between Hanlan's Point and Gibraltar Point, passing under Gibraltar-Hanlan bridge (x=-590, z=Z(182))
      { name: 'Hanlan Canal', w: 28, pts: [[-560, Z(210)], [-590, Z(182)], [-620, Z(150)], [-680, Z(90)]] },
      // Algonquin Channel West: separating Centreville from Algonquin Island, passing under Algonquin Bridge (x=360, z=Z(80))
      { name: 'Algonquin Channel West', w: 28, pts: [[360, Z(-50)], [360, Z(10)], [360, Z(80)], [360, Z(150)], [360, Z(220)]] }
    ];

    const PONDS = [
      { name: 'Trout Pond', x: -690, z: Z(300), r: 38 },
      { name: 'Lighthouse Pond', x: -400, z: Z(195), r: 26 },
      { name: 'Centreville Swan Pond', x: 210, z: Z(290), r: 24 },
      { name: 'Algonquin Pond', x: 580, z: Z(140), r: 20 },
      { name: 'Ward\'s Pond', x: 960, z: Z(160), r: 26 }
    ];

    function distSeg(px, pz, ax, az, bx, bz) {
      const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1;
      let t = ((px - ax) * dx + (pz - az) * dz) / L2;
      t = t < 0 ? 0 : (t > 1 ? 1 : t);
      const qx = ax + dx * t - px, qz = az + dz * t - pz;
      return Math.sqrt(qx * qx + qz * qz);
    }

    function distLine(px, pz, pts) {
      let d = Infinity;
      for (let i = 1; i < pts.length; i++) {
        d = Math.min(d, distSeg(px, pz, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]));
      }
      return d;
    }

    // Distance to nearest lagoon / pond edge (positive outside the water)
    function inlandWaterDist(x, z) {
      let d = Infinity;
      for (const c of CHANNELS) {
        d = Math.min(d, distLine(x, z, c.pts) - (c.w / 2) * (1 + n1(x / 40 + z / 53) * 0.10));
      }
      for (const p of PONDS) {
        d = Math.min(d, Math.hypot(x - p.x, z - p.z) - p.r * (1 + n1(Math.atan2(z - p.z, x - p.x) * 2 + p.r) * 0.12));
      }
      return d;
    }

    // Land field: metres to nearest shore, positive on land, negative in water
    function landField(x, z) {
      let L = -Infinity;
      if (x >= -905) {
        L = Math.min(z - zN(x), zS(x) - z, EAST_TIP + n1(z / 60) * 10 - x, x + 905 + n1(z / 45) * 4);
      }
      // Billy Bishop airport: filled land mass joined to Hanlan's Point
      const air = Math.min(x + 1575, z - Z(-310), Z(-35) - z, -860 - x);
      L = Math.max(L, air);
      if (L > -12) {
        L = Math.min(L, inlandWaterDist(x, z));
      }
      return L;
    }

    function isAirport(x, z) {
      return x < -880 && z < Z(-35);
    }

    function terrainH(x, z, preL, preZS) {
      const L = (preL !== undefined) ? preL : landField(x, z);
      if (L <= 0) return WATER_Y + Math.max(-1.85, L * 0.30);
      let h = WATER_Y + Math.min(GROUND_Y - WATER_Y, L * 0.38);
      if (x > -905 && !isAirport(x, z)) {
        const s = ((preZS !== undefined) ? preZS : zS(x)) - z; // dunes behind the lake beaches
        if (s > 0 && s < 75) {
          const dune = Math.max(0, fbm(x / 26, z / 26) - 0.42) * 2.8;
          h += dune * Math.min(1, s / 14) * Math.min(1, (75 - s) / 25);
        }
      }
      return h;
    }

    function isSand(x, z, L) {
      if (isAirport(x, z)) return false;
      if (L < 2.6) return true; // shoreline band
      if (x > -905 && zS(x) - z < 48 + n1(x / 33) * 12) return true; // south beaches
      if (x < -868 && x > -905) return true; // Hanlan's west beach
      if (x > 1185 && L < 40) return true; // Ward's east beach
      return false;
    }

    // ------------------------------------------------------------------------
    // Paths (Park roads, trails, boardwalk) & Clearings
    // ------------------------------------------------------------------------
    const PATHS = [
      // North Island Ferry Promenade: starts at Ferry Terminal (0, Z(-5)), curves gently east, then south towards the first bridge
      { name: 'North Island Promenade', w: 10, kind: 'paved', pts: [[0, Z(-5)], [0, Z(15)], [14, Z(35)], [24, Z(60)], [28, Z(90)], [28, Z(120)]] },
      // Avenue of the Islands south: continues south across Manitou Bridge towards Grand Fountain (Z(310)), Formal Gardens (Z(345-415)), and South Beach (Z(455))
      { name: 'Avenue of the Islands', w: 10, kind: 'gravel', pts: [[28, Z(158)], [12, Z(195)], [0, Z(230)], [0, Z(280)], [0, Z(465)]] },
      // Wooded Path to Centreville: shaded winding trail branching east into the dense forest to discover Centreville
      { name: 'Wooded Path to Centreville', w: 6, kind: 'gravel', pts: [[28, Z(158)], [55, Z(175)], [90, Z(190)], [125, Z(200)], [150, Z(200)]] },
      // Centreville Village Midway: paved promenade through turn-of-the-century Victorian village square
      { name: 'Centreville Village Midway', w: 8, kind: 'paved', pts: [[150, Z(200)], [175, Z(200)], [205, Z(195)], [235, Z(190)]] },
      // Far Enough Farm Lane: rustic trail leading east to the historic farm
      { name: 'Far Enough Farm Lane', w: 5, kind: 'gravel', pts: [[235, Z(190)], [265, Z(185)], [295, Z(180)], [330, Z(175)]] },
      { name: 'Maze Promenade Link', w: 6, kind: 'gravel', pts: [[0, Z(385)], [-30, Z(385)]] },
      { name: 'West Garden Promenade', w: 4, kind: 'gravel', pts: [[-10, Z(330)], [-36, Z(330)], [-36, Z(425)], [-10, Z(425)]] },
      { name: 'East Garden Promenade', w: 4, kind: 'gravel', pts: [[10, Z(330)], [36, Z(330)], [36, Z(425)], [10, Z(425)]] },
      { name: 'Cibola Avenue', w: 6, kind: 'paved', pts: [[28, Z(60)], [80, Z(70)], [150, Z(60)], [338, Z(66)], [392, Z(94)], [520, Z(100)], [620, Z(70)], [729, Z(46)], [776, Z(74)], [880, Z(100)], [1100, Z(100)], [1150, Z(70)], [1150, Z(-12)]] },
      { name: 'Manitou Road', w: 5, kind: 'paved', pts: [[0, Z(280)], [-60, Z(265)], [-170, Z(255)], [-260, Z(248)], [-335, Z(240)], [-420, Z(250)], [-520, Z(210)], [-568, Z(197)], [-612, Z(160)], [-690, Z(85)], [-720, Z(-95)]] },
      { name: 'Hanlan\'s Point Road', w: 6, kind: 'paved', pts: [[-720, Z(-95)], [-800, Z(-60)], [-960, Z(-130)]] },
      { name: 'Olympic Island Trail', w: 5, kind: 'gravel', pts: [[0, Z(280)], [-22, Z(290)], [-68, Z(310)], [-160, Z(320)], [-268, Z(322)], [-312, Z(322)], [-400, Z(330)], [-480, Z(308)]] },
      { name: 'Lighthouse Trail', w: 4, kind: 'gravel', pts: [[-420, Z(250)], [-470, Z(300)]] },
      { name: 'Lakeshore Avenue', w: 6, kind: 'paved', pts: [[-620, Z(440)], [-300, Z(455)], [-60, Z(452)], [0, Z(450)], [300, Z(440)]] },
      { name: 'The Boardwalk', w: 5, kind: 'boardwalk', pts: [[300, Z(440)], [600, Z(412)], [800, Z(362)], [1000, Z(292)], [1150, Z(222)], [1245, Z(130)]] },
      { name: 'Ward\'s Lane', w: 3.5, kind: 'gravel', pts: [[885, Z(0)], [965, Z(4)], [1045, Z(-4)], [1140, Z(-12)]] },
      { name: 'Ward\'s Forest Trail', w: 3.2, kind: 'gravel', pts: [[905, Z(0)], [918, Z(45)], [950, Z(92)], [982, Z(142)], [1038, Z(175)], [1108, Z(152)], [1145, Z(100)]] },
      { name: 'Withrow Woodland Walk', w: 3.5, kind: 'gravel', pts: [[985, Z(-2)], [1050, Z(20)], [1050, Z(70)], [1092, Z(122)], [1150, Z(222)]] },
      { name: 'Dryad Forest Path', w: 3.0, kind: 'gravel', pts: [[880, Z(100)], [950, Z(92)], [1050, Z(70)], [1118, Z(38)], [1150, Z(70)]] },
      { name: 'Algonquin Lane', w: 3.5, kind: 'gravel', pts: [[415, Z(62)], [510, Z(58)], [615, Z(64)]] },
      { name: 'Algonquin Woods Trail', w: 3.0, kind: 'gravel', pts: [[425, Z(62)], [480, Z(36)], [555, Z(38)], [630, Z(58)], [660, Z(102)], [585, Z(130)], [495, Z(122)], [425, Z(92)]] },
      { name: 'Airport Ferry Walkway', w: 7.0, kind: 'paved', pts: [[-1060, Z(-345)], [-1060, Z(-245)], [-960, Z(-130)]] }
    ];
    const BOARDWALK = PATHS.find(p => p.kind === 'boardwalk');

    // Individual woodland cottage coordinates along Algonquin & Ward's Island forest paths
    const COTTAGES = [
      // Algonquin Island cottages nestled along Algonquin Lane & Algonquin Woods Trail (10 unique cottages)
      { x: 442, z: Z(40), rot: 0.12, name: '2 Algonquin Walk' },
      { x: 478, z: Z(18), rot: -0.12, name: '8 Shawnee Trail' },
      { x: 518, z: Z(20), rot: 0.08, name: '14 Algonquin Lane' },
      { x: 556, z: Z(18), rot: 0.15, name: '19 Nottawa Path' },
      { x: 598, z: Z(26), rot: -0.14, name: '24 Algonquin Walk' },
      { x: 642, z: Z(36), rot: -0.35, name: '31 Seneca Point' },
      { x: 456, z: Z(126), rot: 2.95, name: '5 Lagoon View' },
      { x: 502, z: Z(142), rot: -2.85, name: '11 Cibola Woods' },
      { x: 536, z: Z(148), rot: 3.05, name: '17 Willow Glade' },
      { x: 632, z: Z(142), rot: 2.75, name: '27 Bridle Path' },
      // Ward's Island cottages tucked along Ward's Lane, Withrow Walk & Ward's Forest Trail (16 unique cottages)
      { x: 896, z: Z(16), rot: 3.08, name: '3 Channel Ave' },
      { x: 936, z: Z(22), rot: -3.05, name: '9 Ward\'s Lane' },
      { x: 970, z: Z(24), rot: 3.10, name: '15 First Street' },
      { x: 1016, z: Z(20), rot: -3.08, name: '21 Second Street' },
      { x: 1054, z: Z(4), rot: 3.12, name: '27 Third Street' },
      { x: 1094, z: Z(14), rot: -2.95, name: '33 Fourth Street' },
      { x: 884, z: Z(56), rot: 1.42, name: '6 Dryad Woods' },
      { x: 942, z: Z(54), rot: 0.12, name: '12 Maple Grove' },
      { x: 982, z: Z(56), rot: -0.15, name: '18 Withrow Mews' },
      { x: 1020, z: Z(52), rot: 0.08, name: '24 Fern Hollow' },
      { x: 1084, z: Z(74), rot: -2.82, name: '30 Birch Lane' },
      { x: 918, z: Z(122), rot: 1.25, name: '14 Woodland Trail' },
      { x: 1016, z: Z(122), rot: -1.45, name: '20 Cottonwood Glade' },
      { x: 1024, z: Z(198), rot: 0.45, name: '26 Lakeside Pine' },
      { x: 1076, z: Z(182), rot: -0.55, name: '32 Boardwalk Bend' },
      { x: 1138, z: Z(142), rot: -1.15, name: '38 East Beach Path' }
    ];

    // Lawns, gardens, and clearings where trees are kept clear
    const CLEARINGS = [
      { r: [-35, 95, Z(-25), Z(120)] }, // North Island: Ferry Terminal, Pizza Pizza, Subway, Washrooms/Lockers & BBQ Restaurant patio
      { r: [-45, 45, Z(115), Z(165)] }, // North Arrival Bridge deck & approaches
      { r: [-35, 35, Z(225), Z(285)] }, // Manitou Bridge deck & approaches
      { r: [-55, 55, Z(285), Z(440)] }, // Avenue of the Islands south: Grand Fountain, Formal Gardens & Reflecting Pools
      { c: [-160, Z(330), 70] }, // Olympic Island Great Lawn (skyline panorama)
      { r: [130, 255, Z(150), Z(250)] }, // Centreville Turn-of-the-Century Victorian Village
      { r: [260, 350, Z(135), Z(230)] }, // Far Enough Farm (Big Red Barn, Silo, Paddocks)
      { r: [-115, -20, Z(345), Z(430)] }, // William Meany Hedge Maze (South part, WEST of Avenue)
      { r: [-65, 65, Z(435), Z(480)] }, // South Beach Pavilion, Restaurant & Bike Rental
      { c: [-780, Z(0), 85] }, // Hanlan's ball fields
      { c: [-480, Z(320), 42] }, // Gibraltar lighthouse sanctuary
      // Individual cozy garden clearings around each cottage so forest trees grow right between and around them!
      ...COTTAGES.map(ct => ({ c: [ct.x, ct.z, 7.8] })),
      { c: [1050, Z(70), 22] }, // Ward's Cafe patio
      { c: [0, Z(-5), 42] }, { c: [-720, Z(-110), 38] }, { c: [1140, Z(-20), 28] }, // Ferry docks
      { c: [100, Z(330), 40] }, // Picnic meadow by Long Pond
      { c: [560, Z(300), 45] }, // Ward's south meadow
      { c: [-560, Z(80), 45] }, // Hanlan's picnic grounds
      { c: [-330, Z(150), 38] } // Gibraltar glade
    ];

    function inClearing(x, z, pad) {
      const p = pad || 0;
      for (const c of CLEARINGS) {
        if (c.r) {
          if (x > c.r[0] - p && x < c.r[1] + p && z > c.r[2] - p && z < c.r[3] + p) return true;
        } else if (Math.hypot(x - c.c[0], z - c.c[1]) < c.c[2] + p) {
          return true;
        }
      }
      return false;
    }

    function nearPath(x, z, pad) {
      for (const p of PATHS) {
        if (distLine(x, z, p.pts) < p.w / 2 + (pad || 0)) return p;
      }
      return null;
    }

    // Forest density in [0, 1]: rich natural woods with glades, plus lush cottage forest canopy on Algonquin & Ward's
    function forestDensity(x, z, L) {
      if (L < 3.5 || isAirport(x, z) || isSand(x, z, L)) return 0;
      if (inClearing(x, z)) return 0;
      const f = fbm(x / 150 + 3.1, z / 150 + 7.7);
      const base = smooth(0.36, 0.58, f);
      if (x > 400 && z < Z(215)) return Math.max(base, 0.62); // lush woodland canopy around Algonquin & Ward's cottages
      return base;
    }

    // ------------------------------------------------------------------------
    // Materials & Shared Geometry / Batching Helpers
    // ------------------------------------------------------------------------
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x7a5230, roughness: 0.8 });
    const darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x4a2c14, roughness: 0.85 });
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0xd6d3d1, roughness: 0.75 });
    const concreteMat = new THREE.MeshStandardMaterial({ color: 0xa8a29e, roughness: 0.85 });
    const asphaltMat = new THREE.MeshStandardMaterial({ color: 0x2b2b2e, roughness: 0.9 });
    const whiteMarkMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc, fog: false });
    const yellowMarkMat = new THREE.MeshBasicMaterial({ color: 0xfacc15, fog: false });
    const hedgeMat = new THREE.MeshStandardMaterial({ color: 0x165b2d, roughness: 0.9 });
    const dirtMat = new THREE.MeshStandardMaterial({ color: 0x6e4727, roughness: 0.95 }); // Rich packed dirt for maze
    const bellBrassMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.28, metalness: 0.85 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.3, metalness: 0.8 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x7fb8d4, roughness: 0.1, metalness: 0.6, opacity: 0.65, transparent: true });
    const lampGlowMat = new THREE.MeshBasicMaterial({ color: 0xffd58a, fog: false });
    const warmWinGlowMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xfef08a, emissiveIntensity: 0.95, roughness: 0.25 });
    const termGlowMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, emissive: 0xfef3c7, emissiveIntensity: 0.9, roughness: 0.3 });
    const clkMat = new THREE.MeshStandardMaterial({ color: 0xfef9c3, emissive: 0xfde047, emissiveIntensity: 0.8, roughness: 0.35, side: THREE.DoubleSide });
    const cabinWinMat = new THREE.MeshStandardMaterial({ color: 0xbae6fd, emissive: 0x7dd3fc, emissiveIntensity: 0.6, roughness: 0.15 });
    const beaconBeamMat = new THREE.MeshBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false, fog: false });

    const _m4 = new THREE.Matrix4();
    const _q = new THREE.Quaternion();
    const _e = new THREE.Euler();
    const _v = new THREE.Vector3();
    const _sc = new THREE.Vector3();
    const _col = new THREE.Color();
    const _up = new THREE.Vector3(0, 1, 0);

    const unitBoxGeo = new THREE.BoxGeometry(1, 1, 1);
    const unitCylGeo = new THREE.CylinderGeometry(1, 1, 1, 8);
    const unitSphereGeo = new THREE.SphereGeometry(1, 8, 6);

    function addInstMesh(parent, geo, mat, entries, opts) {
      if (!entries || !entries.length) return null;
      const im = new THREE.InstancedMesh(geo, mat, entries.length);
      let hasCol = false;
      for (let i = 0; i < entries.length; i++) {
        const it = entries[i];
        _e.set(it.rx || 0, it.ry || 0, it.rz || 0, it.order || 'XYZ');
        _q.setFromEuler(_e);
        _v.set(it.x || 0, it.y || 0, it.z || 0);
        _sc.set(it.sx !== undefined ? it.sx : 1, it.sy !== undefined ? it.sy : 1, it.sz !== undefined ? it.sz : 1);
        _m4.compose(_v, _q, _sc);
        im.setMatrixAt(i, _m4);
        if (it.col !== undefined) {
          hasCol = true;
          im.setColorAt(i, _col.setHex(it.col));
        }
      }
      if (im.instanceMatrix) im.instanceMatrix.needsUpdate = true;
      if (hasCol && im.instanceColor) im.instanceColor.needsUpdate = true;
      if (opts) {
        if (opts.castShadow) im.castShadow = true;
        if (opts.receiveShadow) im.receiveShadow = true;
      }
      parent.add(im);
      return im;
    }

    // Merge static untextured meshes in a group by shared material (safely no-ops in mock environments)
    function mergeGroupByMaterial(grp, opts) {
      try {
        if (!grp || typeof grp.updateMatrixWorld !== 'function') return;
        grp.updateMatrixWorld(true);
        if (!grp.matrixWorld || !grp.matrixWorld.elements) return;
        const buckets = new Map();
        const mergedNodes = [];
        function walkMerge(node, isRoot) {
          if (!node || (!isRoot && node.userData && node.userData.noMerge)) return;
          if (node.isMesh && !node.isInstancedMesh && node.geometry && node.material && !Array.isArray(node.material) && !node.material.map) {
            const baseGeo = node.geometry.index
              ? (node.geometry._nonIdx || (node.geometry._nonIdx = node.geometry.toNonIndexed()))
              : node.geometry;
            const pos = baseGeo.getAttribute('position');
            if (pos && pos.count > 0) {
              let list = buckets.get(node.material);
              if (!list) { list = []; buckets.set(node.material, list); }
              list.push({ geo: baseGeo, mw: node.matrixWorld });
              mergedNodes.push(node);
            }
          }
          if (node.children) {
            for (let i = 0; i < node.children.length; i++) walkMerge(node.children[i], false);
          }
        }
        walkMerge(grp, true);
        if (!buckets.size) return;
        const invParent = new THREE.Matrix4();
        const hasInv = typeof invParent.copy === 'function' && typeof invParent.invert === 'function';
        if (hasInv) invParent.copy(grp.matrixWorld).invert();
        const relMat = new THREE.Matrix4();
        const normMat = new THREE.Matrix3();
        buckets.forEach((entries, mat) => {
          let totalVerts = 0;
          let allHaveUv = true;
          for (let i = 0; i < entries.length; i++) {
            const g = entries[i].geo;
            const pos = g.getAttribute('position');
            const uv = g.getAttribute('uv');
            totalVerts += pos.count;
            if (!uv || uv.array.length !== pos.count * 2) allHaveUv = false;
          }
          if (totalVerts === 0) return;
          const mergedPos = new Float32Array(totalVerts * 3);
          const mergedNor = new Float32Array(totalVerts * 3);
          const mergedUv = allHaveUv ? new Float32Array(totalVerts * 2) : null;
          let offset = 0;
          let uvOff = 0;
          for (let i = 0; i < entries.length; i++) {
            const g = entries[i].geo;
            if (hasInv) relMat.multiplyMatrices(invParent, entries[i].mw);
            else relMat.copy(entries[i].mw);
            const me = relMat.elements;
            const m0 = me[0], m1 = me[1], m2 = me[2],
                  m4 = me[4], m5 = me[5], m6 = me[6],
                  m8 = me[8], m9 = me[9], m10 = me[10],
                  m12 = me[12], m13 = me[13], m14 = me[14];
            normMat.getNormalMatrix(relMat);
            const ne = normMat.elements;
            const n0 = ne[0], n1 = ne[1], n2 = ne[2],
                  n3 = ne[3], n4 = ne[4], n5 = ne[5],
                  n6 = ne[6], n7 = ne[7], n8 = ne[8];
            const pos = g.getAttribute('position');
            const pa = pos.array;
            const nor = g.getAttribute('normal');
            const na = (nor && nor.array.length === pa.length) ? nor.array : null;
            const pLen = pos.count * 3;
            for (let k = 0; k < pLen; k += 3) {
              const x = pa[k], y = pa[k + 1], z = pa[k + 2];
              const dst = offset + k;
              mergedPos[dst]     = m0 * x + m4 * y + m8 * z + m12;
              mergedPos[dst + 1] = m1 * x + m5 * y + m9 * z + m13;
              mergedPos[dst + 2] = m2 * x + m6 * y + m10 * z + m14;
              if (na) {
                const nx = na[k], ny = na[k + 1], nz = na[k + 2];
                let rx = n0 * nx + n3 * ny + n6 * nz;
                let ry = n1 * nx + n4 * ny + n7 * nz;
                let rz = n2 * nx + n5 * ny + n8 * nz;
                const invL = 1 / (Math.hypot(rx, ry, rz) || 1);
                mergedNor[dst]     = rx * invL;
                mergedNor[dst + 1] = ry * invL;
                mergedNor[dst + 2] = rz * invL;
              } else {
                mergedNor[dst + 1] = 1;
              }
            }
            if (mergedUv) {
              const uv = g.getAttribute('uv');
              if (uv) mergedUv.set(uv.array, uvOff);
            }
            offset += pLen;
            uvOff += pos.count * 2;
          }
          const mergedGeo = new THREE.BufferGeometry();
          mergedGeo.setAttribute('position', new THREE.BufferAttribute(mergedPos, 3));
          mergedGeo.setAttribute('normal', new THREE.BufferAttribute(mergedNor, 3));
          if (mergedUv) mergedGeo.setAttribute('uv', new THREE.BufferAttribute(mergedUv, 2));
          const mergedMesh = new THREE.Mesh(mergedGeo, mat);
          if (opts && opts.castShadow && !LITE_ISL) mergedMesh.castShadow = true;
          if (opts && opts.receiveShadow && !LITE_ISL) mergedMesh.receiveShadow = true;
          grp.add(mergedMesh);
        });
        for (let i = 0; i < mergedNodes.length; i++) {
          const n = mergedNodes[i];
          if (n.parent) n.parent.remove(n);
        }
      } catch (e) { /* safe fallback in headless mock environments */ }
    }

    // Counter-clockwise-from-above mesh builder with vertex colors
    function Mesher() {
      this.pos = [];
      this.nor = [];
      this.col = [];
      this.idx = [];
    }
    Mesher.prototype.v = function (x, y, z, c) {
      this.pos.push(x, y, z);
      this.nor.push(0, 1, 0);
      this.col.push(c[0], c[1], c[2]);
      return this.pos.length / 3 - 1;
    };
    Mesher.prototype.quadUp = function (a, b, c, d) {
      const P = this.pos;
      const ny = (P[b * 3 + 2] - P[a * 3 + 2]) * (P[c * 3] - P[a * 3]) - (P[b * 3] - P[a * 3]) * (P[c * 3 + 2] - P[a * 3 + 2]);
      if (ny >= 0) this.idx.push(a, b, c, a, c, d);
      else this.idx.push(a, c, b, a, d, c);
    };
    Mesher.prototype.build = function (computeNormals) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
      g.setIndex(this.idx);
      if (computeNormals) g.computeVertexNormals();
      return g;
    };

    const hex = h => [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255];
    const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    const C = {
      lawn: hex(0x4f9a3a),
      lawnDry: hex(0x7aa04a),
      forest: hex(0x2f4a22),
      litter: hex(0x4d3d24),
      sand: hex(0xe2cf9c),
      sandDark: hex(0xc9b27a),
      mud: hex(0x6d5a3c),
      deep: hex(0x1b3a40),
      concrete: hex(0x8f908c),
      gravel: hex(0xc9bea5),
      paved: hex(0x4a4a4f),
      board: hex(0x8a6a45)
    };

    function surfaceColor(x, z, L) {
      if (isAirport(x, z)) return mix(C.concrete, hex(0x7d7e7a), vnoise(x / 9, z / 9));
      if (L < 0) return mix(C.sandDark, C.deep, Math.min(1, -L / 9));
      if (isSand(x, z, L)) return L < 1.2 ? mix(C.mud, C.sandDark, L / 1.2) : mix(C.sand, C.sandDark, vnoise(x / 6, z / 6) * 0.6);
      const f = forestDensity(x, z, L);
      const grass = mix(C.lawn, C.lawnDry, vnoise(x / 20, z / 20) * 0.7);
      const floor = mix(C.forest, C.litter, vnoise(x / 7 + 3, z / 7) * 0.8);
      return mix(grass, floor, Math.min(1, f * 1.2));
    }

    // ------------------------------------------------------------------------
    // Water surface plane (only added standalone; when city.js is active, city's
    // seamless harbour & lake mesh covers both mainland and islands uniformly)
    // ------------------------------------------------------------------------
    const hasCityLake = (typeof window !== 'undefined' && typeof window.buildTorontoCity === 'function');
    const waterMat = hasCityLake ? null : new THREE.MeshStandardMaterial({
      color: 0x0e3a5c,
      roughness: 0.16,
      metalness: 0.72,
      envMapIntensity: 1.15,
      opacity: 0.92,
      transparent: true,
      depthWrite: false
    });
    if (waterMat) {
      const water = new THREE.Mesh(new THREE.PlaneGeometry(3000, 950, 1, 1), waterMat);
      water.rotation.x = -Math.PI / 2;
      water.position.set(-120, WATER_Y + 0.01, Z(120));
      water.renderOrder = 1;
      islandsGroup.add(water);
    }

    // ------------------------------------------------------------------------
    // Terrain (land + shallows) 5m grid (8m on Lite/Chromebook hardware)
    // ------------------------------------------------------------------------
    const GX0 = -1600, GX1 = 1360, GZ0 = Z(-340), GZ1 = Z(560), STEP = LITE_ISL ? 8 : 5;
    const NX = Math.round((GX1 - GX0) / STEP) + 1, NZ = Math.round((GZ1 - GZ0) / STEP) + 1;
    const Lgrid = new Float32Array(NX * NZ);
    const Hgrid = new Float32Array(NX * NZ);
    {
      const m = new Mesher();
      const vid = new Int32Array(NX * NZ);
      vid.fill(-1);
      const zNCol = new Float32Array(NX);
      const zSCol = new Float32Array(NX);
      for (let i = 0; i < NX; i++) {
        const x = GX0 + i * STEP;
        zNCol[i] = zN(x);
        zSCol[i] = zS(x);
      }
      const airZ0 = Z(-310), airZ1 = Z(-35);
      for (let j = 0; j < NZ; j++) {
        const z = GZ0 + j * STEP;
        const nEast = EAST_TIP + n1(z / 60) * 10;
        const nWest = 905 + n1(z / 45) * 4;
        const airZ = Math.min(z - airZ0, airZ1 - z);
        const rowOff = j * NX;
        for (let i = 0; i < NX; i++) {
          const x = GX0 + i * STEP;
          let L = -Infinity;
          if (x >= -905) {
            L = Math.min(z - zNCol[i], zSCol[i] - z, nEast - x, x + nWest);
          }
          const air = Math.min(x + 1575, airZ, -860 - x);
          if (air > L) L = air;
          if (L > -12) {
            const wd = inlandWaterDist(x, z);
            if (wd < L) L = wd;
          }
          const k = rowOff + i;
          Lgrid[k] = L;
          Hgrid[k] = terrainH(x, z, L, zSCol[i]);
        }
      }
      const ensureVert = (idx, i, j) => {
        let id = vid[idx];
        if (id < 0) {
          const gx = GX0 + i * STEP, gz = GZ0 + j * STEP;
          id = m.v(gx, Hgrid[idx], gz, surfaceColor(gx, gz, Lgrid[idx]));
          vid[idx] = id;
        }
        return id;
      };
      for (let j = 0; j < NZ - 1; j++) {
        const rowOff = j * NX;
        for (let i = 0; i < NX - 1; i++) {
          const k = rowOff + i;
          if (Math.max(Lgrid[k], Lgrid[k + 1], Lgrid[k + NX], Lgrid[k + NX + 1]) < -7) continue; // open water
          m.quadUp(
            ensureVert(k, i, j),
            ensureVert(k + 1, i + 1, j),
            ensureVert(k + NX + 1, i + 1, j + 1),
            ensureVert(k + NX, i, j + 1)
          );
        }
      }
      const terrain = new THREE.Mesh(m.build(true), new THREE.MeshLambertMaterial({ vertexColors: true }));
      terrain.receiveShadow = !LITE_ISL;
      islandsGroup.add(terrain);
    }

    function sampleL(x, z) {
      const i = Math.round((x - GX0) / STEP), j = Math.round((z - GZ0) / STEP);
      if (i < 0 || j < 0 || i >= NX || j >= NZ) return -99;
      return Lgrid[j * NX + i];
    }

    function fastLandField(x, z) {
      const fx = (x - GX0) / STEP, fz = (z - GZ0) / STEP;
      const i = Math.floor(fx), j = Math.floor(fz);
      if (i < 0 || j < 0 || i >= NX - 1 || j >= NZ - 1) return landField(x, z);
      const k = j * NX + i;
      const l00 = Lgrid[k], l10 = Lgrid[k + 1], l01 = Lgrid[k + NX], l11 = Lgrid[k + NX + 1];
      const minL = Math.min(l00, l10, l01, l11);
      const maxL = Math.max(l00, l10, l01, l11);
      if (minL > 2.5) {
        const tx = fx - i, tz = fz - j;
        return (l00 * (1 - tx) + l10 * tx) * (1 - tz) + (l01 * (1 - tx) + l11 * tx) * tz;
      }
      if (maxL < -1.0) return maxL;
      return landField(x, z);
    }

    function fastTerrainH(x, z) {
      const fx = (x - GX0) / STEP, fz = (z - GZ0) / STEP;
      const i = Math.floor(fx), j = Math.floor(fz);
      if (i < 0 || j < 0 || i >= NX - 1 || j >= NZ - 1) return terrainH(x, z);
      const k = j * NX + i;
      const l00 = Lgrid[k], l10 = Lgrid[k + 1], l01 = Lgrid[k + NX], l11 = Lgrid[k + NX + 1];
      if (Math.min(l00, l10, l01, l11) < 2.0) return terrainH(x, z);
      const tx = fx - i, tz = fz - j;
      const h00 = Hgrid[k], h10 = Hgrid[k + 1], h01 = Hgrid[k + NX], h11 = Hgrid[k + NX + 1];
      return (h00 * (1 - tx) + h10 * tx) * (1 - tz) + (h01 * (1 - tx) + h11 * tx) * tz;
    }

    // ------------------------------------------------------------------------
    // Paths and Boardwalk
    // ------------------------------------------------------------------------
    {
      const m = new Mesher();
      PATHS.forEach(p => {
        const col = p.kind === 'gravel' ? C.gravel : (p.kind === 'boardwalk' ? C.board : C.paved);
        const lift = p.kind === 'boardwalk' ? 0.32 : 0.05;
        for (let s = 1; s < p.pts.length; s++) {
          const a = p.pts[s - 1], b = p.pts[s], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
          const nx = -(b[1] - a[1]) / L * p.w / 2, nz = (b[0] - a[0]) / L * p.w / 2;
          const n = Math.max(1, Math.ceil(L / 3));
          for (let k = 0; k < n; k++) {
            const t0 = k / n, t1 = (k + 1) / n;
            const x0 = a[0] + (b[0] - a[0]) * t0, z0 = a[1] + (b[1] - a[1]) * t0;
            const x1 = a[0] + (b[0] - a[0]) * t1, z1 = a[1] + (b[1] - a[1]) * t1;
            if (landField(x0, z0) < 1.5 || landField(x1, z1) < 1.5) continue; // bridges carry over water
            const y0 = terrainH(x0, z0) + lift, y1 = terrainH(x1, z1) + lift;
            const shade = mix(col, [0, 0, 0], vnoise(x0 / 4, z0 / 4) * 0.12);
            const q = [
              m.v(x0 + nx, y0, z0 + nz, shade),
              m.v(x1 + nx, y1, z1 + nz, shade),
              m.v(x1 - nx, y1, z1 - nz, shade),
              m.v(x0 - nx, y0, z0 - nz, shade)
            ];
            m.quadUp(q[0], q[1], q[2], q[3]);
          }
        }
      });
      const pathMesh = new THREE.Mesh(m.build(), new THREE.MeshLambertMaterial({ vertexColors: true }));
      pathMesh.receiveShadow = true;
      islandsGroup.add(pathMesh);
    }

    // ------------------------------------------------------------------------
    // Obstacles Spatial Grid (buildings, walls)
    // ------------------------------------------------------------------------
    const OB_CELL = 10;
    const obGrid = new Map();
    function obAdd(o) {
      const r = o.c ? o.c[2] : Math.max(o.r[1] - o.r[0], o.r[3] - o.r[2]);
      const cx = o.c ? o.c[0] : (o.r[0] + o.r[1]) / 2, cz = o.c ? o.c[1] : (o.r[2] + o.r[3]) / 2;
      for (let i = Math.floor((cx - r) / OB_CELL); i <= Math.floor((cx + r) / OB_CELL); i++) {
        for (let j = Math.floor((cz - r) / OB_CELL); j <= Math.floor((cz + r) / OB_CELL); j++) {
          const k = i + ',' + j;
          if (!obGrid.has(k)) obGrid.set(k, []);
          obGrid.get(k).push(o);
        }
      }
    }
    const rectOb = (x0, x1, z0, z1) => obAdd({ r: [Math.min(x0, x1), Math.max(x0, x1), Math.min(z0, z1), Math.max(z0, z1)] });
    const circOb = (x, z, r) => obAdd({ c: [x, z, r] });

    function blocked(x, z, rad) {
      const i0 = Math.floor((x - rad) / OB_CELL), i1 = Math.floor((x + rad) / OB_CELL);
      const j0 = Math.floor((z - rad) / OB_CELL), j1 = Math.floor((z + rad) / OB_CELL);
      for (let i = i0; i <= i1; i++) {
        for (let j = j0; j <= j1; j++) {
          const list = obGrid.get(i + ',' + j);
          if (!list) continue;
          for (let k = 0; k < list.length; k++) {
            const o = list[k];
            if (o.c) {
              if (Math.hypot(x - o.c[0], z - o.c[1]) < o.c[2] + rad) return true;
            } else if (x > o.r[0] - rad && x < o.r[1] + rad && z > o.r[2] - rad && z < o.r[3] + rad) {
              return true;
            }
          }
        }
      }
      return false;
    }

    // ------------------------------------------------------------------------
    // Signs helper
    // ------------------------------------------------------------------------
    function makeSign(lines, w, h, opts) {
      const o = opts || {};
      const can = document.createElement('canvas');
      can.width = 512;
      can.height = Math.round(512 * (h / w));
      const g = can.getContext('2d');
      g.fillStyle = o.bg || '#0f172a';
      g.fillRect(0, 0, can.width, can.height);
      g.strokeStyle = o.borderColor || '#38bdf8';
      g.lineWidth = 10;
      g.strokeRect(5, 5, can.width - 10, can.height - 10);
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      lines.forEach((txt, idx) => {
        const py = (can.height / (lines.length + 1)) * (idx + 1);
        g.font = idx === 0 ? 'bold ' + (o.titleSize || 46) + 'px sans-serif' : 'bold ' + (o.subSize || 28) + 'px sans-serif';
        g.fillStyle = idx === 0 ? (o.fg || '#ffffff') : (o.subFg || '#cbd5e1');
        g.fillText(txt, can.width / 2, py);
      });
      return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(can), side: THREE.DoubleSide }));
    }

    // ------------------------------------------------------------------------
    // Bridges over lagoons (Arched Timber Footbridges with Railings & Stone Abutments)
    // ------------------------------------------------------------------------
    const bridges = [
      { name: 'North Arrival Bridge', x0: 28, z0: Z(118), x1: 28, z1: Z(158), w: 8.0, archH: 2.2, yBase: 0.55 },
      { name: 'Manitou Bridge', x0: 0, z0: Z(230), x1: 0, z1: Z(280), w: 9.0, archH: 2.4, yBase: 0.55 },
      { name: 'Olympic-Gibraltar Bridge', x0: -370, z0: Z(318), x1: -310, z1: Z(318), w: 7.0, archH: 2.3, yBase: 0.55 },
      { name: 'Algonquin Bridge', x0: 330, z0: Z(65), x1: 395, z1: Z(95), w: 7.2, archH: 2.5, yBase: 0.55 },
      { name: 'Ward-Algonquin Footbridge', x0: 720, z0: Z(45), x1: 780, z1: Z(75), w: 6.5, archH: 2.4, yBase: 0.55 },
      { name: 'Gibraltar-Hanlan Bridge', x0: -566, z0: Z(200), x1: -614, z1: Z(164), w: 6.5, archH: 2.3, yBase: 0.55 }
    ];

    {
      const brPlanks = [], brPosts = [], brRails = [], brAbuts = [];
      bridges.forEach(b => {
        b.len = Math.hypot(b.x1 - b.x0, b.z1 - b.z0);
        b.fx = (b.x1 - b.x0) / b.len;
        b.fz = (b.z1 - b.z0) / b.len;
        const segs = 16, rotY = Math.atan2(b.fx, b.fz);
        const segD = b.len / segs;
        for (let i = 0; i < segs; i++) {
          const t = (i + 0.5) / segs, y = b.yBase + Math.sin(t * Math.PI) * b.archH;
          const px = b.x0 + (b.x1 - b.x0) * t, pz = b.z0 + (b.z1 - b.z0) * t;
          const slope = Math.cos(t * Math.PI) * Math.PI * b.archH / b.len;
          const pitch = -Math.atan(slope);
          brPlanks.push({ x: px, y, z: pz, rx: pitch, ry: rotY, order: 'YXZ', sx: b.w, sy: 0.35, sz: segD + 0.25 });
          [-1, 1].forEach(sd => {
            const ox = Math.cos(rotY) * sd * (b.w / 2 - 0.15), oz = -Math.sin(rotY) * sd * (b.w / 2 - 0.15);
            brPosts.push({ x: px + ox, y: y + 0.7, z: pz + oz, sx: 0.22, sy: 1.1, sz: 0.22 });
            brRails.push({ x: px + ox, y: y + 1.22, z: pz + oz, rx: pitch, ry: rotY, order: 'YXZ', sx: 0.14, sy: 0.14, sz: segD + 0.3 });
          });
        }
        [[b.x0, b.z0], [b.x1, b.z1]].forEach(([ax, az]) => {
          brAbuts.push({ x: ax, y: 0.2, z: az, ry: rotY, sx: b.w + 1.2, sy: 1.1, sz: 3.0 });
        });
      });
      addInstMesh(islandsGroup, unitBoxGeo, woodMat, brPlanks, { receiveShadow: true });
      addInstMesh(islandsGroup, unitBoxGeo, darkWoodMat, brPosts);
      addInstMesh(islandsGroup, unitBoxGeo, darkWoodMat, brRails);
      addInstMesh(islandsGroup, unitBoxGeo, stoneMat, brAbuts);
    }

    function getIslandBridgeAt(x, z, pad) {
      for (const b of bridges) {
        const dx = x - b.x0, dz = z - b.z0;
        const s = dx * b.fx + dz * b.fz, l = -dx * b.fz + dz * b.fx;
        if (s >= -1.5 - (pad || 0) && s <= b.len + 1.5 + (pad || 0) && Math.abs(l) <= b.w / 2 - 0.45) {
          return b;
        }
      }
      return null;
    }

    // ------------------------------------------------------------------------
    // Piers and Docks + Centre Island Pier Railings, Benches, Lamps & Lifebuoys
    // ------------------------------------------------------------------------
    const PIERS = [
      { name: 'Centre Island Pier', r: [-6, 6, Z(470), Z(590)], y: 0.55 },
      { name: 'Centre Island Ferry Dock', r: [-16, 16, Z(-40), Z(12)], y: 0.55 },
      { name: 'Hanlan\'s Point Ferry Dock', r: [-734, -706, Z(-150), Z(-85)], y: 0.55 },
      { name: 'Ward\'s Island Ferry Dock', r: [1126, 1154, Z(-60), Z(-5)], y: 0.55 },
      { name: 'Billy Bishop Airport Ferry Dock', r: [-1075, -1045, Z(-352), Z(-302)], y: 0.55 }
    ];

    {
      const pierDecks = [], pierPilings = [];
      PIERS.forEach(p => {
        const w = p.r[1] - p.r[0], d = p.r[3] - p.r[2];
        pierDecks.push({ x: (p.r[0] + p.r[1]) / 2, y: p.y - 0.2, z: (p.r[2] + p.r[3]) / 2, sx: w, sy: 0.4, sz: d });
        for (let pz = p.r[2] + 2; pz < p.r[3]; pz += 6) {
          [p.r[0] + 0.6, p.r[1] - 0.6].forEach(px => {
            pierPilings.push({ x: px, y: -0.9, z: pz, sx: 0.25, sy: 3.0, sz: 0.25 });
          });
        }
      });
      addInstMesh(islandsGroup, unitBoxGeo, woodMat, pierDecks, { receiveShadow: true });
      addInstMesh(islandsGroup, unitCylGeo, darkWoodMat, pierPilings);

      // Centre Island Pier: timber railings (x=+-5.8 directly under perched seagulls!), benches, Victorian lamps & lifebuoys
      const cp = PIERS[0];
      const railLen = cp.r[3] - cp.r[2] - 2;
      const railMidZ = (cp.r[2] + cp.r[3]) / 2 + 0.4;
      const pRailWood = [], pRailDark = [], pPierStone = [], pLampPosts = [], pLampGlobes = [], pBuoys = [];
      [-5.8, 5.8].forEach(rx => {
        pRailDark.push({ x: rx, y: 1.46, z: railMidZ, sx: 0.18, sy: 0.12, sz: railLen });
        pRailDark.push({ x: rx, y: 1.0, z: railMidZ, sx: 0.12, sy: 0.08, sz: railLen });
        for (let rz = cp.r[2] + 2; rz <= cp.r[3] - 1; rz += 4) {
          pRailDark.push({ x: rx, y: 1.0, z: rz, sx: 0.18, sy: 1.05, sz: 0.18 });
        }
      });
      // South pier head cross railing, concrete wave-break bumper & mooring cleats
      pRailDark.push({ x: 0, y: 1.46, z: cp.r[3] - 0.5, sx: 11.75, sy: 0.12, sz: 0.18 });
      pRailDark.push({ x: 0, y: 1.0, z: cp.r[3] - 0.5, sx: 11.75, sy: 0.08, sz: 0.12 });
      for (let rx = -5.8; rx <= 5.81; rx += 2.9) {
        pRailDark.push({ x: rx, y: 1.0, z: cp.r[3] - 0.5, sx: 0.18, sy: 1.05, sz: 0.18 });
      }
      pPierStone.push({ x: 0, y: 0.45, z: cp.r[3] + 0.35, sx: 12.6, sy: 0.65, sz: 0.9 });
      [-4.2, 4.2].forEach(cx => pPierStone.push({ x: cx, y: 0.65, z: cp.r[3] - 1.2, sx: 0.45, sy: 0.28, sz: 0.28 }));
      rectOb(-6.1, -5.65, cp.r[2] + 2, cp.r[3]);
      rectOb(5.65, 6.1, cp.r[2] + 2, cp.r[3]);

      // Pier benches facing Lake Ontario (center x=-3.8..3.8 remains wide open!)
      [Z(500), Z(550)].forEach(bz => {
        [-4.6, 4.6].forEach(bx => {
          pRailWood.push({ x: bx, y: 0.98, z: bz, sx: 0.58, sy: 0.1, sz: 2.2 });
          pRailWood.push({ x: bx + (bx > 0 ? 0.25 : -0.25), y: 1.28, z: bz, sx: 0.08, sy: 0.45, sz: 2.2 });
          pRailDark.push({ x: bx, y: 0.75, z: bz - 0.9, sx: 0.5, sy: 0.4, sz: 0.12 });
          pRailDark.push({ x: bx, y: 0.75, z: bz + 0.9, sx: 0.5, sy: 0.4, sz: 0.12 });
          circOb(bx, bz, 0.75);
        });
      });

      // 6 Victorian black pier lamps + 4 red-and-white lifebuoy ring boxes
      [Z(485), Z(530), Z(575)].forEach(lz => {
        [-5.45, 5.45].forEach(lx => {
          pLampPosts.push({ x: lx, y: 2.4, z: lz, sx: 0.1, sy: 3.7, sz: 0.1 });
          pLampGlobes.push({ x: lx, y: 4.35, z: lz, sx: 0.28, sy: 0.34, sz: 0.28 });
        });
      });
      [Z(515), Z(565)].forEach(bz => {
        [-5.65, 5.65].forEach(bx => {
          pPierStone.push({ x: bx, y: 1.32, z: bz, sx: 0.14, sy: 0.75, sz: 0.75 });
          pBuoys.push({ x: bx + (bx > 0 ? -0.1 : 0.1), y: 1.32, z: bz, ry: Math.PI / 2, sx: 1, sy: 1, sz: 1 });
        });
      });

      addInstMesh(islandsGroup, unitBoxGeo, woodMat, pRailWood);
      addInstMesh(islandsGroup, unitBoxGeo, darkWoodMat, pRailDark);
      addInstMesh(islandsGroup, unitBoxGeo, stoneMat, pPierStone);
      addInstMesh(islandsGroup, unitCylGeo, new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5, metalness: 0.5 }), pLampPosts);
      addInstMesh(islandsGroup, unitSphereGeo, lampGlowMat, pLampGlobes);
      addInstMesh(islandsGroup, new THREE.TorusGeometry(0.28, 0.08, 8, 14), new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.4 }), pBuoys);
    }

    function pierAt(x, z) {
      for (const p of PIERS) {
        if (x >= p.r[0] && x <= p.r[1] && z >= p.r[2] && z <= p.r[3]) return p;
      }
      return null;
    }

    // ------------------------------------------------------------------------
    // FOREST: 6,000+ Instanced Trees by Species & Shrubs
    // ------------------------------------------------------------------------
    const TRAIN_TRACK = [
      [160, Z(165)],
      [205, Z(165)],
      [245, Z(150)],
      [290, Z(145)],
      [320, Z(170)],
      [305, Z(205)],
      [250, Z(235)],
      [190, Z(240)],
      [140, Z(220)],
      [140, Z(185)]
    ];

    function nearBridge(x, z, pad) {
      const p = (pad !== undefined) ? pad : 6.0;
      for (const b of bridges) {
        const dx = x - b.x0, dz = z - b.z0;
        const s = dx * b.fx + dz * b.fz, l = -dx * b.fz + dz * b.fx;
        if (s >= -p && s <= b.len + p && Math.abs(l) <= b.w / 2 + p) return true;
      }
      return false;
    }

    function nearTrainTrack(x, z, pad) {
      const p = (pad !== undefined) ? pad : 4.0;
      return distLine(x, z, TRAIN_TRACK) < p;
    }

    const TRUNK_CELL = 8;
    const trunkGrid = new Map();
    const trees = { round: [], willow: [], pine: [] };
    const shrubs = [];

    {
      const SP = LITE_ISL ? 9.0 : 6.5;
      for (let x = GX0 + 40; x < GX1; x += SP) {
        for (let z = GZ0; z < GZ1; z += SP) {
          const tx = x + (rnd() - 0.5) * SP * 0.9, tz = z + (rnd() - 0.5) * SP * 0.9;
          const L = sampleL(tx, tz);
          if (L < 2.5 || isAirport(tx, tz)) continue;
          if (nearBridge(tx, tz, 7.5)) continue;
          if (nearTrainTrack(tx, tz, 4.0)) continue;
          if (nearPath(tx, tz, 3.8) || inClearing(tx, tz, 2.0)) continue;
          const wd = (L > 11) ? L : inlandWaterDist(tx, tz);
          let kind = null;
          if (wd > 1.5 && wd < 10 && rnd() < 0.52) {
            kind = 'willow'; // weeping willows line the water banks
          } else if (isSand(tx, tz, L)) {
            if (tx < -280 && L > 12 && zS(tx) - tz > 22 && rnd() < 0.24) {
              kind = 'pine'; // coastal pines on dunes
            }
          } else {
            const f = forestDensity(tx, tz, L);
            if (rnd() < f * 0.95) {
              kind = (tx < -350 && rnd() < 0.35) ? 'pine' : 'round';
            } else if (f < 0.1 && rnd() < 0.025) {
              kind = 'round'; // lone shade trees
            }
            if (f > 0.3 && rnd() < 0.45) {
              const sx = tx + (rnd() - 0.5) * 4, sz = tz + (rnd() - 0.5) * 4;
              if (!nearBridge(sx, sz, 5.0) && !nearTrainTrack(sx, sz, 3.0) && !nearPath(sx, sz, 2.0) && !inClearing(sx, sz, 1.0)) {
                shrubs.push([sx, sz, 0.6 + rnd() * 1.0]);
              }
            }
          }
          if (!kind) continue;
          const y = terrainH(tx, tz, L);
          const s = kind === 'pine' ? 0.8 + rnd() * 0.6 : 0.75 + rnd() * 0.7;
          trees[kind].push({ kind, x: tx, z: tz, y, s, r: rnd() });
          const k = Math.floor(tx / TRUNK_CELL) + ',' + Math.floor(tz / TRUNK_CELL);
          if (!trunkGrid.has(k)) trunkGrid.set(k, []);
          trunkGrid.get(k).push([tx, tz, 0.35 + s * 0.25]);
        }
      }
    }

    function trunkBlocked(x, z, rad) {
      const i = Math.floor(x / TRUNK_CELL), j = Math.floor(z / TRUNK_CELL);
      for (let a = i - 1; a <= i + 1; a++) {
        for (let b = j - 1; b <= j + 1; b++) {
          const list = trunkGrid.get(a + ',' + b);
          if (!list) continue;
          for (const t of list) {
            if (Math.hypot(x - t[0], z - t[1]) < t[2] + rad) return true;
          }
        }
      }
      return false;
    }

    {
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color();
      const all = trees.round.concat(trees.willow, trees.pine);

      // Trunks
      const trunkGeo = new THREE.CylinderGeometry(0.22, 0.38, 1, 6);
      trunkGeo.translate(0, 0.5, 0);
      const trunkMesh = new THREE.InstancedMesh(trunkGeo, new THREE.MeshLambertMaterial({ color: 0xffffff }), all.length);
      all.forEach((t, i) => {
        const h = (t.kind === 'pine' ? 3.0 : 4.2) * t.s;
        m4.compose(v.set(t.x, t.y - 0.1, t.z), q.setFromEuler(e.set(0, 0, 0)), sc.set(t.s * 1.1, h, t.s * 1.1));
        trunkMesh.setMatrixAt(i, m4);
        trunkMesh.setColorAt(i, col.setHex(0x4a3726).multiplyScalar(0.8 + t.r * 0.4));
      });
      islandsGroup.add(trunkMesh);

      // Broadleaf crowns (Cottonwood, Silver Maple, Oak): two overlapping blobs per tree (detail=0 for 4x fewer triangles)
      const roundGeo = new THREE.DodecahedronGeometry(1, 0);
      const roundMesh = new THREE.InstancedMesh(roundGeo, new THREE.MeshLambertMaterial({ color: 0xffffff }), trees.round.length * 2);
      const greens = [0x2f6b2a, 0x3d7d2f, 0x497f34, 0x2b5e2c, 0x5b8a3a, 0x376e35];
      const autumn = [0xc9852b, 0xb8572a, 0xd9a23a, 0x9c6b2a];
      trees.round.forEach((t, i) => {
        const base = t.r < 0.16 ? autumn[Math.floor(t.r * 100) % autumn.length] : greens[Math.floor(t.r * 997) % greens.length];
        const R = 3.0 * t.s, top = t.y + 4.2 * t.s + R * 0.6;
        e.set(0, t.r * 6.28, 0);
        q.setFromEuler(e);
        m4.compose(v.set(t.x, top, t.z), q, sc.set(R * 1.05, R * 0.85, R));
        roundMesh.setMatrixAt(i * 2, m4);
        roundMesh.setColorAt(i * 2, col.setHex(base));
        m4.compose(v.set(t.x + (t.r - 0.5) * R * 0.9, top + R * 0.45, t.z + (0.5 - t.r) * R * 0.7), q, sc.set(R * 0.72, R * 0.65, R * 0.72));
        roundMesh.setMatrixAt(i * 2 + 1, m4);
        roundMesh.setColorAt(i * 2 + 1, col.setHex(base).multiplyScalar(1.12));
      });
      islandsGroup.add(roundMesh);

      // Weeping Willows: rounded crown + drooping curtain along lagoon banks
      const wCrown = new THREE.InstancedMesh(roundGeo, new THREE.MeshLambertMaterial({ color: 0xffffff }), trees.willow.length);
      const wCurtainGeo = new THREE.CylinderGeometry(1.6, 2.2, 1, 9, 1, true);
      wCurtainGeo.translate(0, -0.5, 0);
      const wCurtain = new THREE.InstancedMesh(wCurtainGeo, new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide }), trees.willow.length);
      trees.willow.forEach((t, i) => {
        const R = 3.2 * t.s, top = t.y + 3.8 * t.s + R * 0.5;
        e.set(0, t.r * 6.28, 0);
        q.setFromEuler(e);
        m4.compose(v.set(t.x, top, t.z), q, sc.set(R * 1.15, R * 0.7, R * 1.15));
        wCrown.setMatrixAt(i, m4);
        wCrown.setColorAt(i, col.setHex(0x5ca83e));
        m4.compose(v.set(t.x, top - R * 0.2, t.z), q, sc.set(R * 1.1, R * 1.25, R * 1.1));
        wCurtain.setMatrixAt(i, m4);
        wCurtain.setColorAt(i, col.setHex(0x6ca33e));
      });
      islandsGroup.add(wCrown, wCurtain);

      // Coastal White Pines: layered conical tiers
      const pineGeo = new THREE.ConeGeometry(1, 1, 7);
      pineGeo.translate(0, 0.5, 0);
      const pineMesh = new THREE.InstancedMesh(pineGeo, new THREE.MeshLambertMaterial({ color: 0xffffff }), trees.pine.length * 3);
      const pGreens = [0x1f4a30, 0x245436, 0x184028];
      trees.pine.forEach((t, i) => {
        const cBase = pGreens[Math.floor(t.r * 97) % pGreens.length];
        for (let k = 0; k < 3; k++) {
          const R = (3.0 - k * 0.65) * t.s, H = (3.4 - k * 0.5) * t.s;
          const y = t.y + (2.2 + k * 1.8) * t.s;
          e.set(0, t.r * 6.28 + k * 0.7, 0);
          q.setFromEuler(e);
          m4.compose(v.set(t.x, y, t.z), q, sc.set(R, H, R));
          pineMesh.setMatrixAt(i * 3 + k, m4);
          pineMesh.setColorAt(i * 3 + k, col.setHex(cBase).multiplyScalar(1 + k * 0.12));
        }
      });
      islandsGroup.add(pineMesh);

      // Understory shrubs
      const shrubMesh = new THREE.InstancedMesh(roundGeo, new THREE.MeshLambertMaterial({ color: 0xffffff }), shrubs.length);
      const sGreens = [0x3c6e2e, 0x4d7c34, 0x5a8a3a];
      shrubs.forEach(([x, z, s], i) => {
        const y = terrainH(x, z);
        m4.compose(v.set(x, y + s * 0.5, z), q.setFromEuler(e.set(0, 0, 0)), sc.set(s * 1.2, s * 0.7, s * 1.2));
        shrubMesh.setMatrixAt(i, m4);
        shrubMesh.setColorAt(i, col.setHex(sGreens[i % 3]));
      });
      islandsGroup.add(shrubMesh);
    }

    // ------------------------------------------------------------------------
    // WETLANDS: Reeds and Cattails Along Lagoons, Lily Pads with Blooms
    // ------------------------------------------------------------------------
    {
      const reeds = [], pads = [];
      const shoreWalk = (pts, half) => {
        for (let i = 1; i < pts.length; i++) {
          const a = pts[i - 1], b = pts[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
          const nx = -(b[1] - a[1]) / L, nz = (b[0] - a[0]) / L;
          for (let s = 0; s < L; s += 1.6) {
            [-1, 1].forEach(sd => {
              if (rnd() < 0.45) return;
              const off = half + (rnd() - 0.55) * 3.2;
              const x = a[0] + (b[0] - a[0]) * s / L + nx * sd * off, z = a[1] + (b[1] - a[1]) * s / L + nz * sd * off;
              const L2 = landField(x, z);
              if (L2 > -2.2 && L2 < 1.4 && !getIslandBridgeAt(x, z, 4) && !nearPath(x, z, 1)) {
                reeds.push([x, z]);
              }
            });
            if (rnd() < 0.18) {
              const x = a[0] + (b[0] - a[0]) * s / L + nx * (rnd() - 0.5) * half * 1.4;
              const z = a[1] + (b[1] - a[1]) * s / L + nz * (rnd() - 0.5) * half * 1.4;
              if (landField(x, z) < -2 && !getIslandBridgeAt(x, z, 5)) {
                pads.push([x, z, rnd()]);
              }
            }
          }
        }
      };

      CHANNELS.forEach(c => shoreWalk(c.pts, c.w / 2));
      PONDS.forEach(p => {
        for (let a = 0; a < Math.PI * 2; a += 0.09) {
          const off = p.r + (rnd() - 0.6) * 3;
          const x = p.x + Math.cos(a) * off, z = p.z + Math.sin(a) * off;
          const L2 = landField(x, z);
          if (rnd() < 0.7 && L2 > -2.2 && L2 < 1.4) reeds.push([x, z]);
        }
        for (let k = 0; k < p.r * 1.6; k++) {
          const a = rnd() * 6.283, d = rnd() * p.r * 0.85;
          pads.push([p.x + Math.cos(a) * d, p.z + Math.sin(a) * d, rnd()]);
        }
      });

      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color(), e = new THREE.Euler();
      const reedGeo = new THREE.ConeGeometry(0.45, 1, 5, 1, true);
      reedGeo.translate(0, 0.5, 0);
      const reedMesh = new THREE.InstancedMesh(reedGeo, new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide }), reeds.length);
      const cattails = [];
      reeds.forEach(([x, z], i) => {
        const h = 1.2 + rnd() * 1.0;
        e.set((rnd() - 0.5) * 0.25, rnd() * 6.28, (rnd() - 0.5) * 0.25);
        q.setFromEuler(e);
        m4.compose(v.set(x, Math.max(-0.4, terrainH(x, z) - 0.1), z), q, sc.set(0.7 + rnd() * 0.6, h, 0.7 + rnd() * 0.6));
        reedMesh.setMatrixAt(i, m4);
        reedMesh.setColorAt(i, col.setHex(rnd() < 0.7 ? 0x6b8a3a : 0x9a9a52));
        if (rnd() < 0.35) cattails.push([x + (rnd() - 0.5) * 0.4, z + (rnd() - 0.5) * 0.4, Math.max(-0.4, terrainH(x, z)) + h * 0.95]);
      });
      islandsGroup.add(reedMesh);

      const catMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.07, 0.07, 0.35, 5), new THREE.MeshLambertMaterial({ color: 0x5a3a1e }), cattails.length);
      cattails.forEach(([x, z, y], i) => {
        m4.makeTranslation(x, y, z);
        catMesh.setMatrixAt(i, m4);
      });
      islandsGroup.add(catMesh);

      const padGeo = new THREE.CircleGeometry(0.75, 9, 0.35, Math.PI * 2 - 0.35);
      padGeo.rotateX(-Math.PI / 2);
      const padMesh = new THREE.InstancedMesh(padGeo, new THREE.MeshLambertMaterial({ color: 0xffffff }), pads.length);
      const blooms = [];
      pads.forEach(([x, z, r], i) => {
        e.set(0, r * 6.28, 0);
        q.setFromEuler(e);
        m4.compose(v.set(x, WATER_Y + 0.03, z), q, sc.set(0.7 + r, 1, 0.7 + r));
        padMesh.setMatrixAt(i, m4);
        padMesh.setColorAt(i, col.setHex(r < 0.5 ? 0x3e7a2e : 0x4f8a34));
        if (r > 0.86) blooms.push([x, z]);
      });
      islandsGroup.add(padMesh);

      const bloomMesh = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.22, 0), new THREE.MeshBasicMaterial({ color: 0xf5c6d8, fog: false }), blooms.length);
      blooms.forEach(([x, z], i) => {
        m4.makeTranslation(x, WATER_Y + 0.15, z);
        bloomMesh.setMatrixAt(i, m4);
      });
      islandsGroup.add(bloomMesh);
    }

    // ------------------------------------------------------------------------
    // Park Lamps, Benches & Cedar Picnic Tables
    // ------------------------------------------------------------------------
    {
      const lamps = [];
      PATHS.forEach(p => {
        if (p.w < 5) return;
        let carry = 10, side = 1;
        for (let s = 1; s < p.pts.length; s++) {
          const a = p.pts[s - 1], b = p.pts[s], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
          const nx = -(b[1] - a[1]) / L, nz = (b[0] - a[0]) / L;
          let t = carry;
          while (t < L) {
            const x = a[0] + (b[0] - a[0]) * t / L + nx * side * (p.w / 2 + 1.2);
            const z = a[1] + (b[1] - a[1]) * t / L + nz * side * (p.w / 2 + 1.2);
            if (landField(x, z) > 2 && !getIslandBridgeAt(x, z, 2) && !nearPath(x, z, 0.8)) lamps.push([x, z]);
            side = -side;
            t += 34;
          }
          carry = t - L;
        }
      });

      const m4 = new THREE.Matrix4();
      const post = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.07, 0.1, 4, 6), new THREE.MeshLambertMaterial({ color: 0x1f2a24 }), lamps.length);
      const head = new THREE.InstancedMesh(new THREE.SphereGeometry(0.28, 8, 6), lampGlowMat, lamps.length);
      lamps.forEach(([x, z], i) => {
        const y = terrainH(x, z);
        m4.makeTranslation(x, y + 2, z);
        post.setMatrixAt(i, m4);
        m4.makeTranslation(x, y + 4.1, z);
        head.setMatrixAt(i, m4);
        circOb(x, z, 0.25);
      });
      islandsGroup.add(post, head);

      // Picnic tables in glades & meadows
      const tables = [];
      for (let k = 0; k < 900 && tables.length < 70; k++) {
        const c = CLEARINGS[Math.floor(rnd() * CLEARINGS.length)];
        if (!c.c || c.c[2] < 30) continue;
        const a = rnd() * 6.283, d = 5.0 + rnd() * Math.max(1, c.c[2] * 0.85 - 5.0);
        const x = c.c[0] + Math.cos(a) * d, z = c.c[1] + Math.sin(a) * d;
        if (nearBridge(x, z, 6.0) || nearTrainTrack(x, z, 5.0) || landField(x, z) < 4 || nearPath(x, z, 3) || isSand(x, z, 9)) continue;
        if (tables.some(t => Math.hypot(t[0] - x, t[1] - z) < 9)) continue;
        tables.push([x, z, rnd() * 3.14]);
      }
      const top = new THREE.InstancedMesh(new THREE.BoxGeometry(1.8, 0.08, 0.8), woodMat, tables.length);
      const bench = new THREE.InstancedMesh(new THREE.BoxGeometry(1.8, 0.06, 0.3), woodMat, tables.length * 2);
      const legs = new THREE.InstancedMesh(new THREE.BoxGeometry(0.1, 0.75, 1.9), darkWoodMat, tables.length * 2);
      const q = new THREE.Quaternion(), v = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1), up = new THREE.Vector3(0, 1, 0), off = new THREE.Vector3();
      tables.forEach(([x, z, rot], i) => {
        const y = terrainH(x, z);
        q.setFromAxisAngle(up, rot);
        m4.compose(v.set(x, y + 0.78, z), q, one);
        top.setMatrixAt(i, m4);
        [-1, 1].forEach((sd, k) => {
          const bx = -Math.sin(rot) * sd * 0.65, bz = Math.cos(rot) * sd * 0.65;
          m4.compose(v.set(x + bx, y + 0.45, z + bz), q, one);
          bench.setMatrixAt(i * 2 + k, m4);
          const lx = Math.cos(rot) * sd * 0.75, lz = Math.sin(rot) * sd * 0.75;
          m4.compose(v.set(x + lx, y + 0.38, z + lz), q, one);
          legs.setMatrixAt(i * 2 + k, m4);
        });
        circOb(x, z, 1.0);
      });
      islandsGroup.add(top, bench, legs);
    }

    // ------------------------------------------------------------------------
    // Landmark: Centre Island Ferry Terminal
    // ------------------------------------------------------------------------
    {
      const termGrp = new THREE.Group();
      const canopy = new THREE.Mesh(new THREE.BoxGeometry(26, 0.8, 16), darkWoodMat);
      canopy.position.set(0, 4.8, Z(6));
      termGrp.add(canopy);
      const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 9.5, 3.2, 4, 1), new THREE.MeshStandardMaterial({ color: 0x2f5a3a, roughness: 0.7 }));
      roof.scale.set(1.45, 1, 0.9);
      roof.rotation.y = Math.PI / 4;
      roof.position.set(0, 6.8, Z(6));
      termGrp.add(roof);
      [-11, 11].forEach(cx => [Z(0), Z(12)].forEach(cz => {
        const p = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 4.8, 8), darkWoodMat);
        p.position.set(cx, 2.4, cz);
        termGrp.add(p);
        circOb(cx, cz, 0.4);
      }));
      const sNorth = makeSign(['CENTRE ISLAND FERRY TERMINAL', 'TORONTO ISLAND PARK'], 18, 2.4, { bg: '#064e3b', fg: '#fef08a', borderColor: '#10b981' });
      sNorth.position.set(0, 5.9, Z(14.2));
      termGrp.add(sNorth);
      const sSouth = makeSign(['TORONTO ISLAND FERRIES', 'TO JACK LAYTON FERRY TERMINAL'], 16, 2.0, { bg: '#1e3a8a', fg: '#bae6fd', borderColor: '#0284c7' });
      sSouth.position.set(0, 5.9, Z(-2.2));
      sSouth.rotation.y = Math.PI;
      termGrp.add(sSouth);
      islandsGroup.add(termGrp);
    }

    // ------------------------------------------------------------------------
    // Landmark: North Island Arrival Concessions & Amenities
    // Walking south from Centre Island Ferry Dock along the path curving east then south:
    // 1. Pizza Pizza food kiosk & outdoor umbrella patio at (12, Z(48))
    // 2. Subway fresh sub sandwich kiosk at (12, Z(66))
    // 3. Park Washroom & Public Lockers Building with drinking fountain at (12, Z(88))
    // 4. Toronto Island BBQ & Beer Co.: large waterfront restaurant & smoker deck to the east at (65, Z(65))
    //    situated north of the First Bridge (North Arrival Bridge at z=Z(118..158))!
    // ------------------------------------------------------------------------
    {
      const conGrp = new THREE.Group();

      // --- 1. PIZZA PIZZA KIOSK at (7, Z(48)) ---
      const ppBuilding = new THREE.Mesh(
        new THREE.BoxGeometry(8.5, 3.8, 6.0),
        new THREE.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.6 })
      );
      ppBuilding.position.set(7, 1.9, Z(48));
      conGrp.add(ppBuilding);
      rectOb(2.5, 11.5, Z(45), Z(51)); // solid interior

      // Service counter & canopy awning
      const ppAwning = new THREE.Mesh(
        new THREE.BoxGeometry(9.0, 0.4, 2.2),
        new THREE.MeshStandardMaterial({ color: 0xea580c, roughness: 0.4 })
      );
      ppAwning.position.set(7, 3.4, Z(44.8));
      conGrp.add(ppAwning);

      const ppSign = makeSign(
        ['PIZZA PIZZA', 'FRESH SLICES & DRINKS • CENTRE ISLAND CONCESSIONS'],
        8.2, 1.8,
        { bg: '#ea580c', fg: '#ffffff', borderColor: '#facc15' }
      );
      ppSign.position.set(7, 4.4, Z(44.8));
      conGrp.add(ppSign);

      // Outdoor dining patio tables with orange umbrellas (clear of curving path)
      [[11.8, Z(43)], [12.8, Z(52)]].forEach(([tx, oz], ti) => {
        const tbl = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.8, 12), woodMat);
        tbl.position.set(tx, GROUND_Y + 0.4, oz);
        conGrp.add(tbl);
        circOb(tx, oz, 1.1);
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.4, 6), metalMat);
        pole.position.set(tx, GROUND_Y + 1.2, oz);
        conGrp.add(pole);
        const umb = new THREE.Mesh(new THREE.ConeGeometry(1.5, 0.6, 10), new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.5 }));
        umb.position.set(tx, GROUND_Y + 2.3, oz);
        conGrp.add(umb);
      });

      // --- 2. SUBWAY KIOSK at (10, Z(66)) ---
      const subBuilding = new THREE.Mesh(
        new THREE.BoxGeometry(8.5, 3.8, 6.0),
        new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.6 })
      );
      subBuilding.position.set(10, 1.9, Z(66));
      conGrp.add(subBuilding);
      rectOb(5.5, 14.5, Z(63), Z(69)); // solid interior

      const subAwning = new THREE.Mesh(
        new THREE.BoxGeometry(9.0, 0.4, 2.2),
        new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4 })
      );
      subAwning.position.set(10, 3.4, Z(62.8));
      conGrp.add(subAwning);

      const subSign = makeSign(
        ['SUBWAY', 'FRESH SUBS & SALADS • EAT FRESH'],
        8.2, 1.8,
        { bg: '#15803d', fg: '#facc15', borderColor: '#ffffff' }
      );
      subSign.position.set(10, 4.4, Z(62.8));
      conGrp.add(subSign);

      // Outdoor dining patio tables with yellow & green umbrellas (clear of curving path)
      [[16.5, Z(62)], [17.2, Z(70)]].forEach(([tx, oz], ti) => {
        const tbl = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.8, 12), woodMat);
        tbl.position.set(tx, GROUND_Y + 0.4, oz);
        conGrp.add(tbl);
        circOb(tx, oz, 1.1);
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.4, 6), metalMat);
        pole.position.set(tx, GROUND_Y + 1.2, oz);
        conGrp.add(pole);
        const umb = new THREE.Mesh(new THREE.ConeGeometry(1.5, 0.6, 10), new THREE.MeshStandardMaterial({ color: ti === 0 ? 0xfacc15 : 0x16a34a, roughness: 0.5 }));
        umb.position.set(tx, GROUND_Y + 2.3, oz);
        conGrp.add(umb);
      });

      // --- 3. PARK WASHROOM & PUBLIC LOCKERS BUILDING at (12, Z(88)) ---
      const washBuilding = new THREE.Mesh(
        new THREE.BoxGeometry(11.0, 4.2, 8.0),
        new THREE.MeshStandardMaterial({ color: 0x854d0e, roughness: 0.7 })
      );
      washBuilding.position.set(12, 2.1, Z(88));
      conGrp.add(washBuilding);
      rectOb(6.2, 17.8, Z(83.8), Z(92.2)); // solid interior

      // Cedar board-and-batten hip roof
      const washRoof = new THREE.Mesh(
        new THREE.ConeGeometry(8.5, 2.4, 4),
        new THREE.MeshStandardMaterial({ color: 0x1e3a29, roughness: 0.7 })
      );
      washRoof.rotation.y = Math.PI / 4;
      washRoof.position.set(12, 5.2, Z(88));
      conGrp.add(washRoof);

      // Blue public locker banks mounted along exterior east wall facing the path
      const lockerBank = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 2.2, 5.0),
        new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.4, metalness: 0.5 })
      );
      lockerBank.position.set(17.8, 1.5, Z(88));
      conGrp.add(lockerBank);

      // Locker canopy
      const lockerCanopy = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.2, 5.6), darkWoodMat);
      lockerCanopy.position.set(18.2, 2.7, Z(88));
      conGrp.add(lockerCanopy);

      const lockerSign = makeSign(
        ['PUBLIC LOCKERS', 'SECURE DAY STORAGE • COIN / DIGITAL'],
        4.8, 0.9,
        { bg: '#0369a1', fg: '#ffffff', borderColor: '#38bdf8', titleSize: 34, subSize: 20 }
      );
      lockerSign.position.set(18.1, 3.1, Z(88));
      lockerSign.rotation.y = Math.PI / 2;
      conGrp.add(lockerSign);

      const washSign = makeSign(
        ['PUBLIC RESTROOMS', 'TORONTO ISLAND PARK • MEN & WOMEN'],
        7.5, 1.4,
        { bg: '#1e3a8a', fg: '#f8fafc', borderColor: '#60a5fa' }
      );
      washSign.position.set(12, 3.6, Z(83.8));
      conGrp.add(washSign);

      // Stainless steel drinking water fountain
      const fountainPed = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 1.0, 8), metalMat);
      fountainPed.position.set(19.5, 0.5, Z(84));
      conGrp.add(fountainPed);
      const fountainBasin = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.2, 0.2, 8), metalMat);
      fountainBasin.position.set(19.5, 1.0, Z(84));
      conGrp.add(fountainBasin);

      // --- 4. TORONTO ISLAND BBQ & BEER CO. RESTAURANT at (65, Z(65)) ---
      // Situated to the east, north of the first bridge, overlooking the water & skyline
      const bbqBuilding = new THREE.Mesh(
        new THREE.BoxGeometry(16.0, 6.2, 12.0),
        new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.8 })
      );
      bbqBuilding.position.set(65, 3.1, Z(65));
      conGrp.add(bbqBuilding);
      rectOb(56.5, 73.5, Z(58.5), Z(71.5)); // building interior blocks collision

      const bbqRoof = new THREE.Mesh(
        new THREE.ConeGeometry(12.0, 3.5, 4),
        new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.6 })
      );
      bbqRoof.rotation.y = Math.PI / 4;
      bbqRoof.position.set(65, 7.6, Z(65));
      conGrp.add(bbqRoof);

      // Grand Restaurant Sign facing arrival path
      const bbqSign = makeSign(
        ['TORONTO ISLAND BBQ & BEER CO.', 'SLOW-SMOKED BBQ • LOCAL CRAFT BEER • SKYLINE PATIO'],
        13.5, 2.4,
        { bg: '#451a03', fg: '#fef08a', borderColor: '#d97706' }
      );
      bbqSign.position.set(56.8, 5.2, Z(65));
      bbqSign.rotation.y = -Math.PI / 2;
      conGrp.add(bbqSign);

      // Sprawling raised outdoor dining deck patio overlooking water
      const patioDeck = new THREE.Mesh(
        new THREE.BoxGeometry(22.0, 0.35, 24.0),
        new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.7 })
      );
      patioDeck.position.set(65, GROUND_Y + 0.18, Z(80));
      conGrp.add(patioDeck);

      // Full perimeter wooden railing around BBQ patio (leaving NW entry gap clear from path)
      const patioRail = new THREE.Mesh(new THREE.BoxGeometry(22.0, 0.14, 0.18), darkWoodMat);
      patioRail.position.set(65, GROUND_Y + 1.05, Z(92));
      conGrp.add(patioRail);
      const patioRailE = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 24.0), darkWoodMat);
      patioRailE.position.set(75.9, GROUND_Y + 1.05, Z(80));
      conGrp.add(patioRailE);
      const patioRailW = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 15.0), darkWoodMat);
      patioRailW.position.set(54.1, GROUND_Y + 1.05, Z(84.5));
      conGrp.add(patioRailW);
      const patioRailN = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.14, 0.18), darkWoodMat);
      patioRailN.position.set(74.0, GROUND_Y + 1.05, Z(68.0));
      conGrp.add(patioRailN);
      const patioBalusters = [];
      for (let bx = 54.5; bx <= 75.5; bx += 0.9) patioBalusters.push({ x: bx, y: GROUND_Y + 0.65, z: Z(92), sx: 0.08, sy: 0.72, sz: 0.08 });
      for (let bz = Z(68.5); bz <= Z(91.5); bz += 0.9) patioBalusters.push({ x: 75.9, y: GROUND_Y + 0.65, z: bz, sx: 0.08, sy: 0.72, sz: 0.08 });
      for (let bz = Z(77.5); bz <= Z(91.5); bz += 0.9) patioBalusters.push({ x: 54.1, y: GROUND_Y + 0.65, z: bz, sx: 0.08, sy: 0.72, sz: 0.08 });
      addInstMesh(conGrp, unitBoxGeo, darkWoodMat, patioBalusters);

      // Outdoor bar counter on patio
      const barCounter = new THREE.Mesh(new THREE.BoxGeometry(6.0, 1.1, 1.4), darkWoodMat);
      barCounter.position.set(65, GROUND_Y + 0.7, Z(75));
      conGrp.add(barCounter);
      rectOb(61.8, 68.2, Z(74.1), Z(75.9));

      // Smoker BBQ pit with chimney
      const smoker = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.8, 1.6), new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.4, metalness: 0.8 }));
      smoker.position.set(54, GROUND_Y + 0.9, Z(74));
      conGrp.add(smoker);
      const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 3.2, 8), metalMat);
      stack.position.set(54, GROUND_Y + 2.8, Z(74));
      conGrp.add(stack);
      circOb(54, Z(74), 1.2);

      // 6 Outdoor picnic tables with patio umbrellas on the BBQ deck
      [-6, 6].forEach(ox => {
        [Z(81), Z(86), Z(90)].forEach(oz => {
          const tbl = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.8, 12), woodMat);
          tbl.position.set(65 + ox, GROUND_Y + 0.6, oz);
          conGrp.add(tbl);
          circOb(65 + ox, oz, 1.2);

          const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.4, 6), metalMat);
          pole.position.set(65 + ox, GROUND_Y + 1.4, oz);
          conGrp.add(pole);

          const umb = new THREE.Mesh(new THREE.ConeGeometry(1.6, 0.65, 10), new THREE.MeshStandardMaterial({ color: ox < 0 ? 0xdc2626 : 0x16a34a, roughness: 0.5 }));
          umb.position.set(65 + ox, GROUND_Y + 2.5, oz);
          conGrp.add(umb);
        });
      });

      // Overhead pergola rafters with festive string lights
      const pergolaRafters = [], stringBulbs = [];
      [-9, 9].forEach(px => {
        [Z(73), Z(91)].forEach(pz => {
          const post = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3.2, 0.3), darkWoodMat);
          post.position.set(65 + px, GROUND_Y + 1.6, pz);
          conGrp.add(post);
        });
        pergolaRafters.push({ x: 65 + px, y: GROUND_Y + 3.2, z: Z(82), sx: 0.24, sy: 0.24, sz: 18.6 });
      });
      for (let pz = Z(73); pz <= Z(91); pz += 3.0) {
        pergolaRafters.push({ x: 65, y: GROUND_Y + 3.35, z: pz, sx: 18.8, sy: 0.18, sz: 0.18 });
        for (let bx = -7.5; bx <= 7.5; bx += 3.0) {
          stringBulbs.push({ x: 65 + bx, y: GROUND_Y + 3.18, z: pz, sx: 0.11, sy: 0.11, sz: 0.11 });
        }
      }
      addInstMesh(conGrp, unitBoxGeo, darkWoodMat, pergolaRafters);
      addInstMesh(conGrp, unitSphereGeo, lampGlowMat, stringBulbs);

      mergeGroupByMaterial(conGrp);
      islandsGroup.add(conGrp);
    }

    // ------------------------------------------------------------------------
    // Landmark: Avenue of the Islands - Grand Fountain, Formal Gardens & Flanking Reflecting Pools
    // Walking south from Centre Dock, cross Manitou Bridge (z ~ Z(255)) to reach the Grand Fountain at Z(310),
    // followed by the Grand Formal Gardens and twin sunken Reflecting Pools (Z(345) - Z(415)) east & west of the path!
    // ------------------------------------------------------------------------
    let fountainSpray = null;
    const poolJets = [];
    {
      const avg = new THREE.Group();
      const flowerCols = [0xef4444, 0xfacc15, 0xa855f7, 0xf472b6, 0xffffff, 0xfb923c, 0x3b82f6];
      const blooms = [];
      const stoneBedEntries = [];
      const gardenBenchEntries = [];
      const poolPadEntries = [];
      const poolBloomEntries = [];

      // 1. North Island Promenade & Avenue of the Islands Flowerbeds (aligned parallel to curving paths)
      function placeAlignedBedsAlongPath(pts, pathW, spacing, startPad, endPad, seedBase) {
        let dist = 0;
        let nextBed = startPad;
        let bedIdx = seedBase || 0;
        let totalLen = 0;
        for (let i = 0; i < pts.length - 1; i++) {
          totalLen += Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
        }
        for (let i = 0; i < pts.length - 1; i++) {
          const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
          const dx = bx - ax, dz = bz - az;
          const segLen = Math.hypot(dx, dz);
          if (segLen < 0.5) continue;
          const tx = dx / segLen, tz = dz / segLen;
          const nx = -tz, nz = tx;
          const ang = Math.atan2(tx, tz);
          while (nextBed <= dist + segLen && nextBed <= totalLen - endPad) {
            const s = nextBed - dist;
            const px = ax + tx * s, pz = az + tz * s;
            const off = pathW / 2 + 3.2;
            [-1, 1].forEach((side, si) => {
              const fx = px + nx * off * side;
              const fz = pz + nz * off * side;
              // Ensure entire 8m x 2.8m planter box is clear of all paths, bridges, water & concessions
              if (
                nearPath(fx, fz, 1.9) ||
                nearPath(fx + tx * 4.0, fz + tz * 4.0, 1.9) ||
                nearPath(fx - tx * 4.0, fz - tz * 4.0, 1.9) ||
                nearBridge(fx, fz, 7.0) ||
                landField(fx, fz) < 3.5 ||
                Math.hypot(fx - 12, fz - Z(48)) < 11.5 ||
                Math.hypot(fx - 12, fz - Z(66)) < 11.5 ||
                Math.hypot(fx - 12, fz - Z(88)) < 12.5 ||
                Math.hypot(fx - 65, fz - Z(65)) < 16.0 ||
                Math.hypot(fx, fz - Z(310)) < 19.0
              ) {
                return;
              }
              stoneBedEntries.push({ x: fx, y: GROUND_Y + 0.1, z: fz, ry: ang, sx: 2.8, sy: 0.45, sz: 8.0 });
              flowerBeds.push({ x: fx, z: fz, rot: ang, tx, tz, w: 2.8, d: 8.0 });
              circOb(fx - tx * 2.4, fz - tz * 2.4, 1.45);
              circOb(fx, fz, 1.45);
              circOb(fx + tx * 2.4, fz + tz * 2.4, 1.45);
              const col = flowerCols[(bedIdx + si) % flowerCols.length];
              for (let fl = -3.3; fl <= 3.3; fl += 0.82) {
                for (let w = -0.85; w <= 0.85; w += 0.56) {
                  blooms.push([fx + nx * w + tx * fl, fz + nz * w + tz * fl, col]);
                }
              }
            });
            bedIdx++;
            nextBed += spacing;
          }
          dist += segLen;
        }
      }
      // North Island Promenade (Dock to North Arrival Bridge) & Avenue of the Islands (North Bridge to Manitou Bridge)
      placeAlignedBedsAlongPath(PATHS[0].pts, PATHS[0].w, 24, 22, 12, 0);
      placeAlignedBedsAlongPath([[28, Z(158)], [12, Z(195)], [0, Z(230)]], 10, 24, 12, 8, 5);
      // South Avenue of the Islands flanking the Reflecting Pools (Z(345) to Z(420))
      placeAlignedBedsAlongPath([[0, Z(345)], [0, Z(420)]], 10, 22, 8, 8, 9);

      // 2. Grand Fountain Plaza (Immediately south of Manitou Bridge, at x = 0, z = Z(310) = 5310)
      const fz = Z(310);

      // Circular flagstone plaza paving
      const plazaPaving = new THREE.Mesh(new THREE.CircleGeometry(14.5, 32), stoneMat);
      plazaPaving.rotation.x = -Math.PI / 2;
      plazaPaving.position.set(0, GROUND_Y + 0.02, fz);
      avg.add(plazaPaving);

      // Outer fountain pool coping wall (radius 10.2m, height 1.15m)
      const pool = new THREE.Mesh(new THREE.CylinderGeometry(10.2, 10.8, 1.2, 32), stoneMat);
      pool.position.set(0, GROUND_Y + 0.45, fz);
      avg.add(pool);

      const waterSurf = new THREE.Mesh(new THREE.CircleGeometry(9.6, 32), new THREE.MeshStandardMaterial({
        color: 0x38bdf8, roughness: 0.1, metalness: 0.35, transparent: true, opacity: 0.9
      }));
      waterSurf.rotation.x = -Math.PI / 2;
      waterSurf.position.set(0, GROUND_Y + 0.95, fz);
      avg.add(waterSurf);

      // Multi-tiered classical carved stone tiers
      const tier1 = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 5.2, 1.4, 20), stoneMat);
      tier1.position.set(0, GROUND_Y + 1.45, fz);
      avg.add(tier1);
      const tier1Water = new THREE.Mesh(new THREE.CircleGeometry(4.3, 20), new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.1 }));
      tier1Water.rotation.x = -Math.PI / 2;
      tier1Water.position.set(0, GROUND_Y + 2.16, fz);
      avg.add(tier1Water);

      const tier2 = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.5, 1.5, 16), stoneMat);
      tier2.position.set(0, GROUND_Y + 2.85, fz);
      avg.add(tier2);

      // Central soaring geyser spray (animated scale in update)
      fountainSpray = new THREE.Mesh(
        new THREE.ConeGeometry(0.9, 7.5, 14, 1, true),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.82, fog: false })
      );
      fountainSpray.position.set(0, GROUND_Y + 6.8, fz);
      fountainSpray.userData.noMerge = true;
      avg.add(fountainSpray);

      // 8 perimeter arched water streams spouting inward (shared material)
      const streamMat = new THREE.MeshBasicMaterial({ color: 0xbae6fd, transparent: true, opacity: 0.75, fog: false });
      for (let j = 0; j < 8; j++) {
        const ang = (j / 8) * Math.PI * 2;
        const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.16, 4.2, 6), streamMat);
        const sx = Math.cos(ang) * 6.5, sz = Math.sin(ang) * 6.5;
        stream.position.set(sx, GROUND_Y + 2.2, fz + sz);
        stream.rotation.x = -Math.sin(ang) * 0.45;
        stream.rotation.z = Math.cos(ang) * 0.45;
        avg.add(stream);
      }

      // Plaza ornamental stone urns and curved resting benches around the fountain
      for (let k = 0; k < 4; k++) {
        const ba = (k / 4) * Math.PI * 2 + Math.PI / 4;
        const bx = Math.cos(ba) * 12.8, bz = Math.sin(ba) * 12.8;
        gardenBenchEntries.push({ x: bx, y: GROUND_Y + 0.45, z: fz + bz, ry: -ba + Math.PI / 2, sx: 2.4, sy: 0.45, sz: 0.8 });

        const urn = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.35, 0.9, 10), stoneMat);
        const ux = Math.cos(ba + 0.35) * 13.2, uz = Math.sin(ba + 0.35) * 13.2;
        urn.position.set(ux, GROUND_Y + 0.45, fz + uz);
        avg.add(urn);
        for (let u = 0; u < 5; u++) blooms.push([ux + (rnd() - 0.5) * 0.5, fz + uz + (rnd() - 0.5) * 0.5, 0xef4444]);
      }
      circOb(0, fz, 10.6);

      // 3. Grand Formal Gardens & Sunken Reflecting Pools (Water areas in the ground, z = Z(345) to Z(415))
      // Symmetrically placed to the WEST (x = -26) and EAST (x = +26) of Avenue of the Island!
      const poolWaterMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.12, metalness: 0.5, transparent: true, opacity: 0.88 });
      const poolFloorMat = new THREE.MeshStandardMaterial({ color: 0x0c4a6e, roughness: 0.8 });
      const poolSprayMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75, fog: false });
      const poolPadMat = new THREE.MeshLambertMaterial({ color: 0x15803d });
      const poolBloomMat = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false });

      [-26, 26].forEach((poolX, pIdx) => {
        const pZ0 = Z(345), pZ1 = Z(415), pLen = pZ1 - pZ0, pW = 14;
        const pMidZ = (pZ0 + pZ1) / 2;

        // Cut limestone coping rim enclosing the pool
        const copingT = 0.8;
        [-pLen / 2, pLen / 2].forEach(oz => {
          stoneBedEntries.push({ x: poolX, y: GROUND_Y + 0.16, z: pMidZ + oz, sx: pW + copingT * 2, sy: 0.35, sz: copingT });
        });
        [-pW / 2, pW / 2].forEach(ox => {
          stoneBedEntries.push({ x: poolX + ox, y: GROUND_Y + 0.16, z: pMidZ, sx: copingT, sy: 0.35, sz: pLen });
        });

        // Sunken reflecting pool water surface
        const poolWater = new THREE.Mesh(new THREE.PlaneGeometry(pW - 0.2, pLen - 0.2), poolWaterMat);
        poolWater.rotation.x = -Math.PI / 2;
        poolWater.position.set(poolX, GROUND_Y + 0.06, pMidZ);
        avg.add(poolWater);

        // Submerged pool floor (dark aquamarine stone tiling)
        const poolFloor = new THREE.Mesh(new THREE.PlaneGeometry(pW, pLen), poolFloorMat);
        poolFloor.rotation.x = -Math.PI / 2;
        poolFloor.position.set(poolX, GROUND_Y - 0.8, pMidZ);
        avg.add(poolFloor);

        // 3 stone bubbler fountain pedestals spaced along each pool's centerline
        [-24, 0, 24].forEach((oz) => {
          const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.8, 0.6, 12), stoneMat);
          ped.position.set(poolX, GROUND_Y - 0.1, pMidZ + oz);
          avg.add(ped);

          const spray = new THREE.Mesh(new THREE.ConeGeometry(0.35, 2.4, 8, 1, true), poolSprayMat);
          spray.position.set(poolX, GROUND_Y + 1.2, pMidZ + oz);
          spray.userData.noMerge = true;
          avg.add(spray);
          poolJets.push(spray);
        });

        // Floating lily pads & water lilies in the reflecting pools (instanced!)
        for (let l = 0; l < 18; l++) {
          const lox = (rnd() - 0.5) * (pW - 2.8);
          const loz = (rnd() - 0.5) * (pLen - 6.0);
          poolPadEntries.push({ x: poolX + lox, y: GROUND_Y + 0.08, z: pMidZ + loz, rx: -Math.PI / 2, sx: 1, sy: 1, sz: 1 });
          if (l % 2 === 0) {
            poolBloomEntries.push({
              x: poolX + lox, y: GROUND_Y + 0.22, z: pMidZ + loz,
              col: (l % 4 === 0) ? 0xf472b6 : 0xffffff, sx: 1, sy: 1, sz: 1
            });
          }
        }

        // Flanking Formal Parterre Gardens & Flowerbeds on outer side of the East Garden Promenade (x = +36, w = 4);
        // on the West side (pIdx === 0), the William Meany Hedge Maze occupies x = -101..-40 immediately west of the promenade
        if (pIdx === 1) {
          const gardenOuterX = poolX + 16.0;
          for (let gz = pZ0 + 5; gz <= pZ1 - 5; gz += 16) {
            if (nearPath(gardenOuterX, gz, 2.2)) continue;
            stoneBedEntries.push({ x: gardenOuterX, y: GROUND_Y + 0.1, z: gz, sx: 4.0, sy: 0.35, sz: 11.0 });
            flowerBeds.push({ x: gardenOuterX, z: gz, rot: 0, tx: 0, tz: 1, w: 4.0, d: 11.0 });
            rectOb(gardenOuterX - 2.0, gardenOuterX + 2.0, gz - 5.5, gz + 5.5);

            const col = flowerCols[Math.floor(rnd() * flowerCols.length)];
            for (let fl = -4.5; fl <= 4.5; fl += 0.8) {
              for (let w = -1.4; w <= 1.4; w += 0.7) blooms.push([gardenOuterX + w, gz + fl, col]);
            }

            // Ornamental boxwood hedge borders
            const hBorder = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.65, 12), hedgeMat);
            hBorder.position.set(gardenOuterX + 2.35, GROUND_Y + 0.32, gz);
            avg.add(hBorder);
          }
        }

        // Benches along the garden promenades (parallel to the north-south paths and clear of the x = +/-36 walkways)
        for (let bz = pZ0 + 12; bz <= pZ1 - 12; bz += 22) {
          gardenBenchEntries.push({ x: poolX + (pIdx === 0 ? 9.5 : -9.5), y: GROUND_Y + 0.45, z: bz, sx: 0.7, sy: 0.45, sz: 2.0 });
          gardenBenchEntries.push({ x: poolX + (pIdx === 0 ? -12.8 : 12.8), y: GROUND_Y + 0.45, z: bz, sx: 0.7, sy: 0.45, sz: 2.0 });
        }

        // Deep water obstacle inside pool prevents walking into water
        rectOb(poolX - pW / 2 - 0.4, poolX + pW / 2 + 0.4, pZ0 - 0.4, pZ1 + 0.4);
      });

      addInstMesh(avg, unitBoxGeo, stoneMat, stoneBedEntries);
      addInstMesh(avg, unitBoxGeo, darkWoodMat, gardenBenchEntries);
      addInstMesh(avg, new THREE.CircleGeometry(0.55, 10), poolPadMat, poolPadEntries);
      addInstMesh(avg, new THREE.DodecahedronGeometry(0.18, 0), poolBloomMat, poolBloomEntries);

      // 4. Instanced flower blooms for all Avenue & Parterre garden beds
      const m4 = new THREE.Matrix4(), col = new THREE.Color();
      const flGeo = new THREE.DodecahedronGeometry(0.18, 0);
      const flMesh = new THREE.InstancedMesh(flGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false }), blooms.length);
      blooms.forEach(([x, z, c], i) => {
        m4.makeTranslation(x, GROUND_Y + 0.35, z);
        flMesh.setMatrixAt(i, m4);
        flMesh.setColorAt(i, col.setHex(c));
      });
      avg.add(flMesh);

      // 5. The Boardwalk Props: Cedar Benches, Toronto Park Bins & Beach Access Steps
      const bwBenchSeat = [], bwBenchLegs = [], bwBinsBlue = [], bwBinsGrey = [], bwStairs = [];
      let bwDist = 35;
      for (let si = 1; si < BOARDWALK.pts.length; si++) {
        const a = BOARDWALK.pts[si - 1], b = BOARDWALK.pts[si];
        const segL = Math.hypot(b[0] - a[0], b[1] - a[1]);
        const tx = (b[0] - a[0]) / segL, tz = (b[1] - a[1]) / segL;
        const nx = -tz, nz = tx, yaw = Math.atan2(tx, tz);
        while (bwDist < segL - 25) {
          const px = a[0] + tx * bwDist, pz = a[1] + tz * bwDist;
          // North (landward) side bench & waste/recycling pair outside the 5m boardwalk deck
          const bx = px - nx * 3.8, bz = pz - nz * 3.8;
          if (landField(bx, bz) > 2.5 && !nearPath(bx, bz, 0.8)) {
            const by = terrainH(bx, bz);
            bwBenchSeat.push({ x: bx, y: by + 0.48, z: bz, ry: yaw, sx: 0.65, sy: 0.12, sz: 2.2 });
            bwBenchLegs.push({ x: bx, y: by + 0.22, z: bz, ry: yaw, sx: 0.55, sy: 0.42, sz: 1.9 });
            const rx = bx + tx * 2.2, rz = bz + tz * 2.2;
            const ry2 = terrainH(rx, rz);
            bwBinsBlue.push({ x: rx, y: ry2 + 0.45, z: rz, ry: yaw, sx: 0.48, sy: 0.9, sz: 0.48 });
            bwBinsGrey.push({ x: rx + tx * 0.65, y: ry2 + 0.45, z: rz + tz * 0.65, ry: yaw, sx: 0.48, sy: 0.9, sz: 0.48 });
          }
          // Beach access wooden steps every ~200m on south (lakeward) side
          if (bwDist % 180 < 95) {
            const sx2 = px + nx * 3.1, sz2 = pz + nz * 3.1;
            if (landField(sx2, sz2) > 1.8) {
              const sy2 = terrainH(sx2, sz2);
              bwStairs.push({ x: sx2, y: sy2 + 0.14, z: sz2, ry: yaw, sx: 1.6, sy: 0.2, sz: 2.8 });
            }
          }
          bwDist += 95;
        }
        bwDist -= segL;
      }
      addInstMesh(avg, unitBoxGeo, woodMat, bwBenchSeat);
      addInstMesh(avg, unitBoxGeo, darkWoodMat, bwBenchLegs);
      addInstMesh(avg, unitBoxGeo, woodMat, bwStairs);
      addInstMesh(avg, unitBoxGeo, new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.6 }), bwBinsBlue);
      addInstMesh(avg, unitBoxGeo, new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.7 }), bwBinsGrey);

      mergeGroupByMaterial(avg);
      islandsGroup.add(avg);
    }

    // ------------------------------------------------------------------------
    // Landmark: William Meany Hedge Maze (South part, WEST of Avenue of the Island)
    // Situated at x = -65, z = Z(385) with Dirt-colored ground and the 1888 antique school bell!
    // ------------------------------------------------------------------------
    {
      const hmg = new THREE.Group();
      const hx = -65, hz = Z(385);

      // Earth-toned packed dirt ground so green cedar hedges stand out sharply (x = -102..-39, clear of West Garden Promenade at x = -36)
      const mazeGround = new THREE.Mesh(new THREE.BoxGeometry(63, 0.08, 76), dirtMat);
      mazeGround.position.set(hx - 5.5, 0.57, hz);
      mazeGround.receiveShadow = true;
      mazeGround.userData.noMerge = true;
      hmg.add(mazeGround);

      // Entrance Gate Arch & Commemorative Plaque Sign facing east towards West Garden Promenade & Avenue
      const mSign = makeSign(
        ['WILLIAM MEANY HEDGE MAZE', 'HISTORIC 1888 SCHOOL BELL • DONATED 2015'],
        18, 2.4,
        { bg: '#14532d', fg: '#bbf7d0', borderColor: '#22c55e' }
      );
      mSign.position.set(hx + 26, 3.8, hz);
      mSign.rotation.y = -Math.PI / 2;
      hmg.add(mSign);

      function addMazeWall(wx, wz, ww, wd) {
        const wall = new THREE.Mesh(new THREE.BoxGeometry(ww, 2.2, wd), hedgeMat);
        wall.position.set(hx + wx, 1.6, hz + wz);
        hmg.add(wall);
        rectOb(hx + wx - ww / 2, hx + wx + ww / 2, hz + wz - wd / 2, hz + wz + wd / 2);
      }

      // Outer perimeter hedge walls with entrance opening at x = -40 (wx = +25) facing EAST towards West Garden Promenade
      addMazeWall(25, -20, 1.4, 32);
      addMazeWall(25, 20, 1.4, 32);
      addMazeWall(-36, 0, 1.4, 72);
      addMazeWall(-5.5, -36, 61, 1.4);
      addMazeWall(-5.5, 36, 61, 1.4);

      // Concentric inner hedge rings & labyrinth turns
      addMazeWall(-18, -24, 20, 1.2);
      addMazeWall(11, -24, 16, 1.2);
      addMazeWall(-26, 0, 1.2, 46);
      addMazeWall(18, 0, 1.2, 46);
      addMazeWall(-4, 24, 44, 1.2);

      addMazeWall(-12, -12, 14, 1.2);
      addMazeWall(8, -12, 12, 1.2);
      addMazeWall(-16, 6, 1.2, 28);
      addMazeWall(13, 6, 1.2, 28);
      addMazeWall(-1.5, 14, 29, 1.2);

      // Centerpiece: Historic 1888 Toronto Island School Bell Arbor & Bell
      const bellArbor = new THREE.Group();
      [-2.4, 2.4].forEach(px => {
        [-2.4, 2.4].forEach(pz => {
          const post = new THREE.Mesh(new THREE.BoxGeometry(0.35, 3.4, 0.35), darkWoodMat);
          post.position.set(hx + px, 1.7, hz + pz);
          bellArbor.add(post);
        });
      });
      const arborBeamX1 = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.3, 0.35), darkWoodMat);
      arborBeamX1.position.set(hx, 3.4, hz - 2.4);
      bellArbor.add(arborBeamX1);
      const arborBeamX2 = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.3, 0.35), darkWoodMat);
      arborBeamX2.position.set(hx, 3.4, hz + 2.4);
      bellArbor.add(arborBeamX2);
      const arborBeamZ1 = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.3, 5.4), darkWoodMat);
      arborBeamZ1.position.set(hx - 2.4, 3.4, hz);
      bellArbor.add(arborBeamZ1);
      const arborBeamZ2 = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.3, 5.4), darkWoodMat);
      arborBeamZ2.position.set(hx + 2.4, 3.4, hz);
      bellArbor.add(arborBeamZ2);

      // Peaked cedar shake cupola roof
      const cupolaRoof = new THREE.Mesh(new THREE.ConeGeometry(4.2, 1.8, 4), darkWoodMat);
      cupolaRoof.position.set(hx, 4.4, hz);
      cupolaRoof.rotation.y = Math.PI / 4;
      bellArbor.add(cupolaRoof);

      // Historic 1888 Antique Brass Toronto Island School Bell
      const bellSupport = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.9, 8), metalMat);
      bellSupport.position.set(hx, 3.0, hz);
      bellArbor.add(bellSupport);

      const bellYoke = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.15, 0.25), darkWoodMat);
      bellYoke.position.set(hx, 2.7, hz);
      bellArbor.add(bellYoke);

      const bellBody = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.65, 0.75, 16, 1, true), bellBrassMat);
      bellBody.position.set(hx, 2.3, hz);
      bellArbor.add(bellBody);

      const bellDome = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), bellBrassMat);
      bellDome.position.set(hx, 2.65, hz);
      bellArbor.add(bellDome);

      const clapper = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), metalMat);
      clapper.position.set(hx, 1.95, hz);
      bellArbor.add(clapper);

      const clapperRope = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.1, 6), woodMat);
      clapperRope.position.set(hx + 0.1, 1.45, hz);
      bellArbor.add(clapperRope);

      // Historic bronze plaque
      const bPlaque = makeSign(
        ['HISTORIC 1888 TORONTO ISLAND SCHOOL BELL', 'RING THE BELL TO CELEBRATE CONQUERING THE MAZE!'],
        4.0, 1.2,
        { bg: '#78350f', fg: '#fef08a', borderColor: '#d97706', titleSize: 32, subSize: 20 }
      );
      bPlaque.position.set(hx, 1.2, hz + 2.5);
      bellArbor.add(bPlaque);

      [-2.4, 2.4].forEach(px => {
        [-2.4, 2.4].forEach(pz => {
          circOb(hx + px, hz + pz, 0.35);
        });
      });
      hmg.add(bellArbor);
      mergeGroupByMaterial(hmg);
      islandsGroup.add(hmg);
    }

    // ------------------------------------------------------------------------
    // Landmark: Centreville Turn-of-the-Century Victorian Village
    // Discovered down the wooded path east of the First Bridge (at x=140..245, z=Z(155..245)):
    // - Victorian Town Hall with 18m Clock & Bell Tower, portico stairs, and bell
    // - Centreville General Store with wooden porch veranda, rocking chairs, apple barrels
    // - Old-Fashioned Sweet Shoppe & Ice Cream Parlour with striped candy awnings
    // - Carousel Cafe & Bakery with buttercup clapboard, flower boxes & cafe seating
    // - Antique 1907 Dentzel Carousel in 16-sided Victorian rotunda with rotating painted horses
    // - Giant 26m Ferris Wheel in YZ plane with 12 upright counter-rotating passenger carts
    // ------------------------------------------------------------------------
    let ferrisWheelMesh = null, carouselTop = null;
    const ferrisCarts = [];
    const carouselHorses = [];
    {
      const cvg = new THREE.Group();

      // Centreville Midway Welcome Timber Archway spanning the path at (146, Z(200))
      [-4.6, 4.6].forEach(az => {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 4.6, 8), darkWoodMat);
        post.position.set(146, 2.3, Z(200) + az);
        cvg.add(post);
        circOb(146, Z(200) + az, 0.35);
      });
      const cvArchBeam = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 10.2), darkWoodMat);
      cvArchBeam.position.set(146, 4.6, Z(200));
      cvg.add(cvArchBeam);
      const cvArchSign = makeSign(
        ['CENTREVILLE AMUSEMENT PARK', 'EST. 1967 • VICTORIAN VILLAGE & RIDES'],
        9.4, 1.5,
        { bg: '#7f1d1d', fg: '#fef08a', borderColor: '#facc15' }
      );
      cvArchSign.position.set(146, 5.5, Z(200));
      cvArchSign.rotation.y = -Math.PI / 2;
      cvg.add(cvArchSign);

      // 1. VICTORIAN TOWN HALL (EST. 1900) at (180, Z(185))
      const thHall = new THREE.Mesh(
        new THREE.BoxGeometry(16.0, 7.5, 12.0),
        new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.6 }) // cream clapboard
      );
      thHall.position.set(180, 3.75, Z(185));
      cvg.add(thHall);
      rectOb(171.5, 188.5, Z(178.5), Z(191.5)); // interior blocks

      // Front portico entrance steps & columns
      const thPortico = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.32, 2.2), woodMat);
      thPortico.position.set(180, GROUND_Y + 0.16, Z(177.9));
      cvg.add(thPortico);
      const thPorticoRoof = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.28, 2.4), new THREE.MeshStandardMaterial({ color: 0x831843, roughness: 0.5 }));
      thPorticoRoof.position.set(180, 4.1, Z(177.8));
      cvg.add(thPorticoRoof);
      [-2.2, 2.2].forEach(px => {
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 3.4, 8), stoneMat);
        col.position.set(180 + px, 2.35, Z(177.2));
        cvg.add(col);
      });

      // Burgundy mansard trim roof
      const thRoof = new THREE.Mesh(
        new THREE.ConeGeometry(12.0, 3.2, 4),
        new THREE.MeshStandardMaterial({ color: 0x831843, roughness: 0.5 })
      );
      thRoof.rotation.y = Math.PI / 4;
      thRoof.position.set(180, 8.8, Z(185));
      cvg.add(thRoof);

      // Central Four-Sided Victorian Clock Tower & Belfry (18m tall)
      const towerBase = new THREE.Mesh(
        new THREE.BoxGeometry(4.2, 7.0, 4.2),
        new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.6 })
      );
      towerBase.position.set(180, 11.0, Z(185));
      cvg.add(towerBase);

      // 4 Illuminated Clock Faces with Dark Bezels & Clock Hands
      const clkGeo = new THREE.CircleGeometry(1.15, 16);
      const clkRimGeo = new THREE.TorusGeometry(1.18, 0.08, 6, 16);
      const clkHandMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 });
      [[0, -2.12, 0], [0, 2.12, Math.PI], [-2.12, 0, Math.PI / 2], [2.12, 0, -Math.PI / 2]].forEach(([ox, oz, ry]) => {
        const cFace = new THREE.Mesh(clkGeo, clkMat);
        cFace.position.set(180 + ox, 11.5, Z(185) + oz);
        cFace.rotation.y = ry;
        cvg.add(cFace);
        const cRim = new THREE.Mesh(clkRimGeo, clkHandMat);
        cRim.position.set(180 + ox * 1.01, 11.5, Z(185) + oz * 1.01);
        cRim.rotation.y = ry;
        cvg.add(cRim);
        const hHand = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.58, 0.04), clkHandMat);
        hHand.position.set(180 + ox * 1.02 + Math.sin(ry) * 0.02, 11.7, Z(185) + oz * 1.02 + Math.cos(ry) * 0.02);
        hHand.rotation.y = ry;
        cvg.add(hHand);
        const mHand = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.06, 0.04), clkHandMat);
        mHand.position.set(180 + ox * 1.025, 11.5, Z(185) + oz * 1.025);
        mHand.rotation.y = ry;
        mHand.rotation.z = 0.45;
        cvg.add(mHand);
      });

      // Copper Spire on top of clock tower
      const spire = new THREE.Mesh(
        new THREE.ConeGeometry(2.4, 5.5, 4),
        new THREE.MeshStandardMaterial({ color: 0x0d9488, roughness: 0.4, metalness: 0.5 })
      );
      spire.rotation.y = Math.PI / 4;
      spire.position.set(180, 17.2, Z(185));
      cvg.add(spire);

      const thSign = makeSign(
        ['CENTREVILLE TOWN HALL', 'ESTABLISHED 1900 • HISTORIC VILLAGE SQUARE'],
        9.5, 1.8,
        { bg: '#831843', fg: '#fef08a', borderColor: '#f472b6' }
      );
      thSign.position.set(180, 5.4, Z(178.6));
      cvg.add(thSign);

      // 2. CENTREVILLE GENERAL STORE at (150, Z(215))
      const gsBuilding = new THREE.Mesh(
        new THREE.BoxGeometry(12.0, 4.8, 9.0),
        new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.7 })
      );
      gsBuilding.position.set(150, 2.4, Z(215));
      cvg.add(gsBuilding);
      rectOb(143.5, 156.5, Z(210), Z(220));

      const gsRoof = new THREE.Mesh(new THREE.ConeGeometry(8.5, 2.5, 4), darkWoodMat);
      gsRoof.rotation.y = Math.PI / 4;
      gsRoof.position.set(150, 5.8, Z(215));
      cvg.add(gsRoof);

      const gsPorch = new THREE.Mesh(new THREE.BoxGeometry(12.4, 0.3, 3.2), woodMat);
      gsPorch.position.set(150, GROUND_Y + 0.15, Z(208.5));
      cvg.add(gsPorch);
      [-3.4, 3.4].forEach(wx => {
        const gWin = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.9, 0.14), warmWinGlowMat);
        gWin.position.set(150 + wx, 2.2, Z(210.48));
        cvg.add(gWin);
      });

      [-3.5, 3.5].forEach(ox => {
        const chair = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.9, 0.8), darkWoodMat);
        chair.position.set(150 + ox, GROUND_Y + 0.6, Z(208.5));
        cvg.add(chair);
      });

      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.9, 10), woodMat);
      barrel.position.set(145, GROUND_Y + 0.6, Z(208.5));
      cvg.add(barrel);

      const gsSign = makeSign(
        ['CENTREVILLE GENERAL STORE', 'OLD-FASHIONED CANDY • SUNDRIES & SOUVENIRS'],
        9.0, 1.6,
        { bg: '#14532d', fg: '#fef08a', borderColor: '#86efac' }
      );
      gsSign.position.set(150, 4.2, Z(207.2));
      cvg.add(gsSign);

      // 3. OLD-FASHIONED SWEET SHOPPE & ICE CREAM PARLOUR at (210, Z(215))
      const ssBuilding = new THREE.Mesh(
        new THREE.BoxGeometry(12.0, 4.8, 9.0),
        new THREE.MeshStandardMaterial({ color: 0xfdf2f8, roughness: 0.4 })
      );
      ssBuilding.position.set(210, 2.4, Z(215));
      cvg.add(ssBuilding);
      rectOb(203.5, 216.5, Z(210), Z(220));

      const ssRoof = new THREE.Mesh(
        new THREE.ConeGeometry(8.8, 2.8, 4),
        new THREE.MeshStandardMaterial({ color: 0x9d174d, roughness: 0.55 })
      );
      ssRoof.rotation.y = Math.PI / 4;
      ssRoof.position.set(210, 6.1, Z(215));
      cvg.add(ssRoof);

      const ssPorch = new THREE.Mesh(new THREE.BoxGeometry(12.4, 0.3, 2.6), woodMat);
      ssPorch.position.set(210, GROUND_Y + 0.15, Z(209.2));
      cvg.add(ssPorch);

      [-3.6, 3.6].forEach(wx => {
        const win = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.1, 0.15), warmWinGlowMat);
        win.position.set(210 + wx, 2.3, Z(210.48));
        cvg.add(win);
      });
      const ssDoor = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.4, 0.18), new THREE.MeshStandardMaterial({ color: 0x831843, roughness: 0.5 }));
      ssDoor.position.set(210, 1.5, Z(210.48));
      cvg.add(ssDoor);

      // Candy-striped pink and white awning ribs
      const ssAwning = new THREE.Mesh(
        new THREE.BoxGeometry(12.4, 0.36, 2.4),
        new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.3 })
      );
      ssAwning.position.set(210, 3.6, Z(209));
      cvg.add(ssAwning);
      const ssWhiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35 });
      for (let sx = -5.2; sx <= 5.2; sx += 2.08) {
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.39, 2.42), ssWhiteMat);
        stripe.position.set(210 + sx, 3.6, Z(209));
        cvg.add(stripe);
      }

      const ssSign = makeSign(
        ['OLD FASHIONED SWEET SHOPPE', 'HAND-SCOOPED ICE CREAM • WAFFLE CONES & FUDGE'],
        9.8, 1.6,
        { bg: '#9d174d', fg: '#fdf2f8', borderColor: '#f472b6' }
      );
      ssSign.position.set(210, 4.5, Z(209));
      cvg.add(ssSign);

      // 4. CAROUSEL CAFE & BAKERY at (150, Z(180))
      const ccBuilding = new THREE.Mesh(
        new THREE.BoxGeometry(11.0, 4.5, 8.0),
        new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.6 })
      );
      ccBuilding.position.set(150, 2.25, Z(180));
      cvg.add(ccBuilding);
      rectOb(144, 156, Z(175.5), Z(184.5));

      const ccRoof = new THREE.Mesh(
        new THREE.ConeGeometry(8.0, 2.6, 4),
        new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.65 })
      );
      ccRoof.rotation.y = Math.PI / 4;
      ccRoof.position.set(150, 5.7, Z(180));
      cvg.add(ccRoof);

      const ccAwning = new THREE.Mesh(
        new THREE.BoxGeometry(11.4, 0.36, 2.2),
        new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.4 })
      );
      ccAwning.position.set(150, 3.35, Z(175.0));
      cvg.add(ccAwning);

      [-3.2, 3.2].forEach(wx => {
        const win = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.9, 0.15), warmWinGlowMat);
        win.position.set(150 + wx, 2.1, Z(175.98));
        cvg.add(win);
      });

      const ccSign = makeSign(
        ['CAROUSEL CAFE & BAKERY', 'FRESH PASTRIES • GOURMET COFFEE • PATIO'],
        8.8, 1.5,
        { bg: '#854d0e', fg: '#fef9c3', borderColor: '#fde047' }
      );
      ccSign.position.set(150, 4.1, Z(175.8));
      cvg.add(ccSign);

      // 5. GIANT 26M FERRIS WHEEL at (225, Z(225)) with upright counter-rotating passenger carts & boarding deck
      const fwDeck = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.4, 9.0), woodMat);
      fwDeck.position.set(225, GROUND_Y + 0.2, Z(225));
      cvg.add(fwDeck);
      const fwBooth = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.6, 2.2), new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.5 }));
      fwBooth.position.set(219.5, GROUND_Y + 1.3, Z(220));
      cvg.add(fwBooth);
      const fwBoothRoof = new THREE.Mesh(new THREE.ConeGeometry(1.9, 1.0, 4), ssWhiteMat);
      fwBoothRoof.rotation.y = Math.PI / 4;
      fwBoothRoof.position.set(219.5, GROUND_Y + 3.0, Z(220));
      cvg.add(fwBoothRoof);

      const fwGrp = new THREE.Group();
      fwGrp.position.set(225, 14.5, Z(225));

      const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 6.2, 10), metalMat);
      axle.rotation.z = Math.PI / 2;
      fwGrp.add(axle);

      [-2.6, 2.6].forEach(lx => {
        const leg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.48, 15.5, 8), metalMat);
        leg1.position.set(lx, -7.0, -5.0);
        leg1.rotation.x = -0.35;
        fwGrp.add(leg1);
        const leg2 = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.48, 15.5, 8), metalMat);
        leg2.position.set(lx, -7.0, 5.0);
        leg2.rotation.x = 0.35;
        fwGrp.add(leg2);
      });

      const wheelWheel = new THREE.Group();
      wheelWheel.userData.noMerge = true;
      const rOuter = 11.5, rInner = 9.0;
      const rim1 = new THREE.Mesh(new THREE.TorusGeometry(rOuter, 0.22, 8, 36), metalMat);
      rim1.rotation.y = Math.PI / 2;
      rim1.position.x = -1.3;
      wheelWheel.add(rim1);
      const rim2 = new THREE.Mesh(new THREE.TorusGeometry(rOuter, 0.22, 8, 36), metalMat);
      rim2.rotation.y = Math.PI / 2;
      rim2.position.x = 1.3;
      wheelWheel.add(rim2);

      const irim1 = new THREE.Mesh(new THREE.TorusGeometry(rInner, 0.16, 8, 32), metalMat);
      irim1.rotation.y = Math.PI / 2;
      irim1.position.x = -1.3;
      wheelWheel.add(irim1);
      const irim2 = new THREE.Mesh(new THREE.TorusGeometry(rInner, 0.16, 8, 32), metalMat);
      irim2.rotation.y = Math.PI / 2;
      irim2.position.x = 1.3;
      wheelWheel.add(irim2);

      const nSpokes = 12;
      const cartCols = [0xef4444, 0x3b82f6, 0xfacc15, 0x10b981, 0xa855f7, 0xf97316];
      const cartMats = cartCols.map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.4 }));
      const spokeGeo = new THREE.CylinderGeometry(0.1, 0.1, rOuter * 2, 6);
      const crossGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.6, 6);
      const cartTubGeo = new THREE.BoxGeometry(1.9, 0.85, 1.5);
      const cartRoofGeo = new THREE.BoxGeometry(2.05, 0.14, 1.65);
      const cartRodGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.3, 6);
      for (let i = 0; i < nSpokes; i++) {
        const ang = (i / nSpokes) * Math.PI * 2;
        const sp1 = new THREE.Mesh(spokeGeo, metalMat);
        sp1.rotation.x = ang;
        sp1.position.x = -1.3;
        wheelWheel.add(sp1);
        const sp2 = new THREE.Mesh(spokeGeo, metalMat);
        sp2.rotation.x = ang;
        sp2.position.x = 1.3;
        wheelWheel.add(sp2);

        const cross = new THREE.Mesh(crossGeo, metalMat);
        cross.rotation.z = Math.PI / 2;
        cross.position.set(0, Math.sin(ang) * rOuter, Math.cos(ang) * rOuter);
        wheelWheel.add(cross);

        // Upright suspended passenger gondola (counter-rotated in update!)
        const cartPivot = new THREE.Group();
        cartPivot.position.set(0, Math.sin(ang) * rOuter, Math.cos(ang) * rOuter);
        const tub = new THREE.Mesh(cartTubGeo, cartMats[i % cartMats.length]);
        tub.position.y = -0.85;
        cartPivot.add(tub);
        const cRoof = new THREE.Mesh(cartRoofGeo, ssWhiteMat);
        cRoof.position.y = 0.2;
        cartPivot.add(cRoof);
        [-0.85, 0.85].forEach(rx => {
          const rod = new THREE.Mesh(cartRodGeo, metalMat);
          rod.position.set(rx, -0.35, 0);
          cartPivot.add(rod);
        });
        wheelWheel.add(cartPivot);
        ferrisCarts.push(cartPivot);
      }
      fwGrp.add(wheelWheel);
      ferrisWheelMesh = wheelWheel;
      cvg.add(fwGrp);
      circOb(225, Z(225), 5.5);

      // 6. ANTIQUE 1907 DENTZEL CAROUSEL at (180, Z(225))
      const carBase = new THREE.Mesh(new THREE.CylinderGeometry(8.5, 9.0, 0.8, 20), woodMat);
      carBase.position.set(180, GROUND_Y + 0.4, Z(225));
      cvg.add(carBase);

      const carCenter = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 5.0, 12), metalMat);
      carCenter.position.set(180, GROUND_Y + 2.8, Z(225));
      cvg.add(carCenter);

      carouselTop = new THREE.Group();
      carouselTop.userData.noMerge = true;
      carouselTop.position.set(180, GROUND_Y + 4.8, Z(225));
      const canopy = new THREE.Mesh(
        new THREE.ConeGeometry(9.5, 3.2, 20),
        new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.5 })
      );
      carouselTop.add(canopy);
      const canopyFrieze = new THREE.Mesh(
        new THREE.CylinderGeometry(9.5, 9.5, 0.72, 20),
        new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.4 })
      );
      canopyFrieze.position.y = -1.25;
      carouselTop.add(canopyFrieze);
      const carBulbs = [];
      for (let bi = 0; bi < 16; bi++) {
        const ba = (bi / 16) * Math.PI * 2;
        carBulbs.push({ x: Math.cos(ba) * 9.6, y: -1.25, z: Math.sin(ba) * 9.6, sx: 0.14, sy: 0.14, sz: 0.14 });
      }
      addInstMesh(carouselTop, unitSphereGeo, lampGlowMat, carBulbs);

      const horseCols = [0xf8fafc, 0x78350f, 0xd97706];
      const horseMats = horseCols.map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.45 }));
      const saddleMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.5 });
      const poleGeo = new THREE.CylinderGeometry(0.08, 0.08, 4.2, 6);
      const hBodyGeo = new THREE.BoxGeometry(0.46, 0.48, 1.15);
      const hNeckGeo = new THREE.BoxGeometry(0.24, 0.52, 0.28);
      const hHeadGeo = new THREE.BoxGeometry(0.22, 0.22, 0.44);
      const hLegGeo = new THREE.CylinderGeometry(0.05, 0.04, 0.48, 6);
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2;
        const px = Math.cos(ang) * 6.5, pz = Math.sin(ang) * 6.5;
        const pole = new THREE.Mesh(poleGeo, metalMat);
        pole.position.set(px, -2.1, pz);
        carouselTop.add(pole);

        const hMat = horseMats[i % horseMats.length];
        const horse = new THREE.Group();
        const baseY = -2.2 + (i % 2) * 0.25;
        horse.position.set(px, baseY, pz);
        horse.rotation.y = -ang; // tangent facing direction of rotation
        const hBody = new THREE.Mesh(hBodyGeo, hMat);
        horse.add(hBody);
        const hSaddle = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.45), saddleMat);
        hSaddle.position.y = 0.22;
        horse.add(hSaddle);
        const hNeck = new THREE.Mesh(hNeckGeo, hMat);
        hNeck.position.set(0, 0.38, 0.48);
        hNeck.rotation.x = 0.35;
        horse.add(hNeck);
        const hHead = new THREE.Mesh(hHeadGeo, hMat);
        hHead.position.set(0, 0.62, 0.68);
        hHead.rotation.x = 0.25;
        horse.add(hHead);
        [-0.14, 0.14].forEach(lx => [-0.42, 0.42].forEach(lz => {
          const leg = new THREE.Mesh(hLegGeo, hMat);
          leg.position.set(lx, -0.38, lz);
          leg.rotation.x = lz > 0 ? -0.3 : 0.3;
          horse.add(leg);
        }));
        carouselTop.add(horse);
        carouselHorses.push({ mesh: horse, baseY, phase: i * 1.1 });
      }
      cvg.add(carouselTop);
      circOb(180, Z(225), 9.2);

      mergeGroupByMaterial(cvg);
      islandsGroup.add(cvg);
    }

    // ------------------------------------------------------------------------
    // Landmark: The Centreville Miniature Train (Beasley Bear Express)
    // Runs on miniature narrow-gauge tracks looping around Centreville, through the woods,
    // and past Far Enough Farm!
    // ------------------------------------------------------------------------
    let miniTrain = null;
    const miniTrainCars = [];
    const miniTrainPuffs = [];
    const _trainOut = { x: 0, z: 0, yaw: 0 };

    function evalTrainTrack(tNorm, out) {
      const res = out || _trainOut;
      const n = TRAIN_TRACK.length;
      const f = ((tNorm % 1) + 1) % 1 * n;
      const idx = Math.floor(f);
      const frac = f - idx;
      const p0 = TRAIN_TRACK[(idx - 1 + n) % n];
      const p1 = TRAIN_TRACK[idx % n];
      const p2 = TRAIN_TRACK[(idx + 1) % n];
      const p3 = TRAIN_TRACK[(idx + 2) % n];
      const t = frac, t2 = t * t, t3 = t2 * t;
      const cat = (a, b, c, d) => 0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      const x = cat(p0[0], p1[0], p2[0], p3[0]);
      const z = cat(p0[1], p1[1], p2[1], p3[1]);
      const dtFrac = 0.01;
      const tN = t + dtFrac, tN2 = tN * tN, tN3 = tN2 * tN;
      const catN = (a, b, c, d) => 0.5 * ((2 * b) + (-a + c) * tN + (2 * a - 5 * b + 4 * c - d) * tN2 + (-a + 3 * b - 3 * c + d) * tN3);
      const nx = catN(p0[0], p1[0], p2[0], p3[0]);
      const nz = catN(p0[1], p1[1], p2[1], p3[1]);
      res.x = x;
      res.z = z;
      res.yaw = Math.atan2(nx - x, nz - z);
      return res;
    }

    {
      const trGrp = new THREE.Group();

      // 1. CENTREVILLE RAILWAY STATION PLATFORM at (160, Z(165))
      const plat = new THREE.Mesh(new THREE.BoxGeometry(14.0, 0.4, 4.5), woodMat);
      plat.position.set(160, GROUND_Y + 0.2, Z(161));
      trGrp.add(plat);
      rectOb(152.5, 167.5, Z(158.5), Z(163.5));

      const depotRoof = new THREE.Mesh(new THREE.BoxGeometry(14.4, 0.3, 4.8), darkWoodMat);
      depotRoof.position.set(160, 3.6, Z(161));
      trGrp.add(depotRoof);

      [-6, 0, 6].forEach(px => {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.25, 3.2, 0.25), darkWoodMat);
        post.position.set(160 + px, 1.8, Z(161));
        trGrp.add(post);
      });

      const stSign = makeSign(
        ['CENTREVILLE RAILWAY STATION', 'BEASLEY BEAR EXPRESS • MINIATURE TRAIN TOUR'],
        11.5, 1.8,
        { bg: '#1e3a8a', fg: '#fef08a', borderColor: '#3b82f6' }
      );
      stSign.position.set(160, 4.2, Z(163.4));
      trGrp.add(stSign);

      const bell = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.35, 8), new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.8, roughness: 0.2 }));
      bell.position.set(155, 2.8, Z(163));
      trGrp.add(bell);

      // 2. RAILWAY TRACKS (wooden crossties + dual steel rails)
      const numTies = 140;
      const tieGeo = new THREE.BoxGeometry(1.6, 0.12, 0.25);
      const tieMesh = new THREE.InstancedMesh(tieGeo, darkWoodMat, numTies);
      for (let i = 0; i < numTies; i++) {
        const tr = evalTrainTrack(i / numTies);
        _q.setFromAxisAngle(_up, tr.yaw);
        _m4.compose(_v.set(tr.x, GROUND_Y + 0.06, tr.z), _q, _sc.set(1, 1, 1));
        tieMesh.setMatrixAt(i, _m4);
      }
      trGrp.add(tieMesh);

      [-0.55, 0.55].forEach(side => {
        const railCurve = [];
        for (let i = 0; i <= numTies; i++) {
          const tr = evalTrainTrack(i / numTies);
          const ox = Math.cos(tr.yaw) * side, oz = -Math.sin(tr.yaw) * side;
          railCurve.push(new THREE.Vector3(tr.x + ox, GROUND_Y + 0.14, tr.z + oz));
        }
        const rPath = new THREE.CatmullRomCurve3(railCurve, true);
        const railGeo = new THREE.TubeGeometry(rPath, 90, 0.04, 6, true);
        const railMesh = new THREE.Mesh(railGeo, metalMat);
        trGrp.add(railMesh);
      });

      // 3. ANIMATED MINIATURE STEAM TRAIN (locomotive + tender + 3 articulated coaches on steel wheels)
      const tBlackMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.3, metalness: 0.7 });
      const tRedMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.4 });
      const tWheelGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.08, 10);
      const tCoachWheelGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.07, 10);

      miniTrain = new THREE.Group();
      miniTrain.userData.noMerge = true;

      const boiler = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 2.2, 12), tBlackMat);
      boiler.rotation.x = Math.PI / 2;
      boiler.position.set(0, 0.85, 0.35);
      miniTrain.add(boiler);

      const steamDome = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), bellBrassMat);
      steamDome.position.set(0, 1.42, 0.35);
      miniTrain.add(steamDome);

      const cab = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.4, 1.1), tRedMat);
      cab.position.set(0, 1.15, -0.85);
      miniTrain.add(cab);
      const cabRoof = new THREE.Mesh(new THREE.BoxGeometry(1.44, 0.12, 1.3), darkWoodMat);
      cabRoof.position.set(0, 1.88, -0.88);
      miniTrain.add(cabRoof);

      const cow = new THREE.Mesh(new THREE.ConeGeometry(0.65, 0.7, 4), new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.5 }));
      cow.rotation.x = -Math.PI / 2;
      cow.rotation.y = Math.PI / 4;
      cow.position.set(0, 0.42, 1.6);
      miniTrain.add(cow);

      // Driving wheels & side rods
      [-0.56, 0.56].forEach(wx => {
        [-0.35, 0.35, 1.05].forEach(wz => {
          const wh = new THREE.Mesh(tWheelGeo, metalMat);
          wh.rotation.z = Math.PI / 2;
          wh.position.set(wx, 0.24, wz);
          miniTrain.add(wh);
        });
        const rod = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.07, 1.5), tRedMat);
        rod.position.set(wx + (wx > 0 ? 0.05 : -0.05), 0.24, 0.35);
        miniTrain.add(rod);
      });

      const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.1, 0.6, 8), metalMat);
      stack.position.set(0, 1.55, 1.1);
      miniTrain.add(stack);

      const puffMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc, transparent: true, opacity: 0.72, fog: false });
      for (let pi = 0; pi < 4; pi++) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(0.22 + pi * 0.05, 8, 6), puffMat);
        puff.position.set(0, 1.9 + pi * 0.35, 1.0 - pi * 0.28);
        miniTrain.add(puff);
        miniTrainPuffs.push({ mesh: puff, phase: pi * 1.5 });
      }

      const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.25, 8), new THREE.MeshBasicMaterial({ color: 0xfef08a, fog: false }));
      lamp.rotation.x = Math.PI / 2;
      lamp.position.set(0, 1.18, 1.45);
      miniTrain.add(lamp);

      const tender = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 1.3), tBlackMat);
      tender.position.set(0, 0.65, -2.15);
      miniTrain.add(tender);
      [-0.55, 0.55].forEach(wx => [-1.8, -2.5].forEach(wz => {
        const twh = new THREE.Mesh(tCoachWheelGeo, metalMat);
        twh.rotation.z = Math.PI / 2;
        twh.position.set(wx, 0.18, wz);
        miniTrain.add(twh);
      }));
      mergeGroupByMaterial(miniTrain);
      trGrp.add(miniTrain);

      // 3 Independent Curve-Tracking Open-Air Passenger Coaches on wheels
      for (let ci = 0; ci < 3; ci++) {
        const coach = new THREE.Group();
        coach.userData.noMerge = true;
        const body = new THREE.Mesh(
          new THREE.BoxGeometry(1.3, 0.62, 1.8),
          new THREE.MeshStandardMaterial({ color: ci % 2 === 0 ? 0x15803d : 0xca8a04, roughness: 0.5 })
        );
        body.position.y = 0.58;
        coach.add(body);
        const cRoof = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.1, 1.9), darkWoodMat);
        cRoof.position.y = 1.42;
        coach.add(cRoof);
        [-0.6, 0.6].forEach(px => [-0.75, 0.75].forEach(pz => {
          const p = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.84, 6), metalMat);
          p.position.set(px, 0.98, pz);
          coach.add(p);
        }));
        [-0.55, 0.55].forEach(wx => [-0.6, 0.6].forEach(wz => {
          const cw = new THREE.Mesh(tCoachWheelGeo, metalMat);
          cw.rotation.z = Math.PI / 2;
          cw.position.set(wx, 0.18, wz);
          coach.add(cw);
        }));
        mergeGroupByMaterial(coach);
        trGrp.add(coach);
        miniTrainCars.push({ mesh: coach, offset: (ci + 1) * 0.0115 });
      }

      mergeGroupByMaterial(trGrp);
      islandsGroup.add(trGrp);
    }

    // ------------------------------------------------------------------------
    // Landmark: Far Enough Farm (Est. 1959)
    // ------------------------------------------------------------------------
    {
      const farmGrp = new THREE.Group();

      // 1. CEDAR ENTRANCE ARCHWAY at (255, Z(185))
      [-3.2, 3.2].forEach(ox => {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 4.8, 8), darkWoodMat);
        post.position.set(255, 2.4, Z(185) + ox);
        farmGrp.add(post);
        circOb(255, Z(185) + ox, 0.4);
      });
      const archBeam = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 7.2), darkWoodMat);
      archBeam.position.set(255, 4.8, Z(185));
      farmGrp.add(archBeam);

      const farmSign = makeSign(
        ['FAR ENOUGH FARM', 'ESTABLISHED 1959 • FREE HISTORIC PETTING FARM'],
        11.5, 1.8,
        { bg: '#7f1d1d', fg: '#fef3c7', borderColor: '#f59e0b' }
      );
      farmSign.position.set(255, 5.8, Z(185));
      farmSign.rotation.y = -Math.PI / 2;
      farmGrp.add(farmSign);

      // 2. THE BIG RED BARN at (295, Z(185)) with extruded gambrel roof & cross-buck doors
      const barnBody = new THREE.Mesh(
        new THREE.BoxGeometry(20.0, 6.5, 13.0),
        new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.7 })
      );
      barnBody.position.set(295, 3.25, Z(185));
      farmGrp.add(barnBody);
      rectOb(284, 306, Z(177.5), Z(192.5));

      const gambrelShape = new THREE.Shape();
      gambrelShape.moveTo(-7.1, 0);
      gambrelShape.lineTo(7.1, 0);
      gambrelShape.lineTo(4.6, 3.2);
      gambrelShape.lineTo(0, 5.1);
      gambrelShape.lineTo(-4.6, 3.2);
      gambrelShape.closePath();
      const gambrelGeo = new THREE.ExtrudeGeometry(gambrelShape, { depth: 20.6, bevelEnabled: false });
      gambrelGeo.translate(0, 0, -10.3);
      gambrelGeo.rotateY(Math.PI / 2);
      const gambrelRoof = new THREE.Mesh(gambrelGeo, new THREE.MeshStandardMaterial({ color: 0x7f1d1d, roughness: 0.6 }));
      gambrelRoof.position.set(295, 6.4, Z(185));
      farmGrp.add(gambrelRoof);

      const whiteBarnMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.6 });
      const cupola = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.6, 2.0), whiteBarnMat);
      cupola.position.set(295, 12.1, Z(185));
      farmGrp.add(cupola);
      const cupolaCap = new THREE.Mesh(new THREE.ConeGeometry(1.65, 1.1, 4), new THREE.MeshStandardMaterial({ color: 0x7f1d1d, roughness: 0.6 }));
      cupolaCap.rotation.y = Math.PI / 4;
      cupolaCap.position.set(295, 13.4, Z(185));
      farmGrp.add(cupolaCap);

      const vanePole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.5, 6), metalMat);
      vanePole.position.set(295, 14.3, Z(185));
      farmGrp.add(vanePole);
      const rooster = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.1), new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.8 }));
      rooster.position.set(295, 14.9, Z(185));
      farmGrp.add(rooster);

      // White double barn doors with X cross-buck trim
      [-1.5, 1.5].forEach(dz => {
        const door = new THREE.Mesh(new THREE.BoxGeometry(0.2, 4.2, 2.5), whiteBarnMat);
        door.position.set(284.9, 2.1, Z(185) + dz);
        farmGrp.add(door);
        [-0.7, 0.7].forEach(ang => {
          const xb = new THREE.Mesh(new THREE.BoxGeometry(0.26, 4.4, 0.16), new THREE.MeshStandardMaterial({ color: 0x991b1b }));
          xb.position.set(284.88, 2.1, Z(185) + dz);
          xb.rotation.x = ang;
          farmGrp.add(xb);
        });
      });

      [-1.2, 0, 1.2].forEach((oz, bi) => {
        const bale = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.7, 0.9), new THREE.MeshStandardMaterial({ color: 0xfde047, roughness: 0.9 }));
        bale.position.set(283.5, GROUND_Y + 0.35 + (bi === 1 ? 0.7 : 0), Z(180) + oz);
        farmGrp.add(bale);
        circOb(283.5, Z(180) + oz, 0.6);
      });

      // 3. FARM SILO at (312, Z(175)) with steel tension hoops
      const silo = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 2.8, 13.0, 16), new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.6 }));
      silo.position.set(312, 6.5, Z(175));
      farmGrp.add(silo);
      for (let sy = 2.5; sy <= 11.5; sy += 2.2) {
        const hoop = new THREE.Mesh(new THREE.TorusGeometry(2.84, 0.05, 6, 16), metalMat);
        hoop.rotation.x = Math.PI / 2;
        hoop.position.set(312, sy, Z(175));
        farmGrp.add(hoop);
      }
      circOb(312, Z(175), 3.0);

      const siloDome = new THREE.Mesh(new THREE.SphereGeometry(2.82, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), metalMat);
      siloDome.position.set(312, 13.0, Z(175));
      farmGrp.add(siloDome);

      // 4. VINTAGE RED FARMALL TRACTOR at (282, Z(192))
      const trGrpTractor = new THREE.Group();
      trGrpTractor.position.set(282, GROUND_Y, Z(192));
      trGrpTractor.rotation.y = 0.4;
      const hood = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.9, 2.4), new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.4 }));
      hood.position.set(0, 0.9, 0.4);
      trGrpTractor.add(hood);
      const wheelMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.9 });
      [-0.8, 0.8].forEach(wx => {
        const rWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.35, 14), wheelMat);
        rWheel.rotation.z = Math.PI / 2;
        rWheel.position.set(wx, 0.9, -0.6);
        trGrpTractor.add(rWheel);
      });
      [-0.5, 0.5].forEach(wx => {
        const fWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.22, 10), wheelMat);
        fWheel.rotation.z = Math.PI / 2;
        fWheel.position.set(wx, 0.45, 1.4);
        trGrpTractor.add(fWheel);
      });
      const exPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.2, 6), metalMat);
      exPipe.position.set(0.4, 1.7, 0.9);
      trGrpTractor.add(exPipe);
      farmGrp.add(trGrpTractor);
      circOb(282, Z(192), 1.5);

      // 5. POST-AND-RAIL FENCES (instanced!)
      const padFences = [
        [268, 288, Z(154), Z(176)],
        [312, 336, Z(188), Z(214)],
        [312, 336, Z(148), Z(174)],
        [268, 288, Z(196), Z(216)]
      ];
      const fPosts = [], fRails = [];
      padFences.forEach(([x0, x1, z0, z1]) => {
        [[x0, z0], [x1, z0], [x0, z1], [x1, z1]].forEach(([px, pz]) => {
          fPosts.push({ x: px, y: GROUND_Y + 0.7, z: pz, sx: 0.13, sy: 1.4, sz: 0.13 });
        });
        const lenX = x1 - x0, lenZ = z1 - z0;
        [0.4, 0.9].forEach(ry => {
          fRails.push({ x: (x0 + x1) / 2, y: GROUND_Y + ry, z: z0, sx: lenX, sy: 0.1, sz: 0.08 });
          fRails.push({ x: (x0 + x1) / 2, y: GROUND_Y + ry, z: z1, sx: lenX, sy: 0.1, sz: 0.08 });
          fRails.push({ x: x0, y: GROUND_Y + ry, z: (z0 + z1) / 2, sx: 0.08, sy: 0.1, sz: lenZ });
          fRails.push({ x: x1, y: GROUND_Y + ry, z: (z0 + z1) / 2, sx: 0.08, sy: 0.1, sz: lenZ });
        });
      });
      addInstMesh(farmGrp, unitCylGeo, darkWoodMat, fPosts);
      addInstMesh(farmGrp, unitBoxGeo, woodMat, fRails);

      // 6. ANIMALS IN THE PADDOCKS (with proper legs, ears, snouts & tails)
      const sheepMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.9 });
      const sheepFaceMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.8 });
      [[273, Z(160), 0.5], [280, Z(163), -0.8], [276, Z(170), 1.2], [283, Z(168), 2.1]].forEach(([sx, sz, srot]) => {
        const shp = new THREE.Group();
        shp.position.set(sx, GROUND_Y, sz);
        shp.rotation.y = srot;
        const body = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 8), sheepMat);
        body.scale.set(1.4, 1.0, 1.0);
        body.position.y = 0.65;
        shp.add(body);
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.4), sheepFaceMat);
        head.position.set(0.85, 0.85, 0);
        shp.add(head);
        [-0.4, 0.4].forEach(lx => [-0.25, 0.25].forEach(lz => {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.45, 6), sheepFaceMat);
          leg.position.set(lx, 0.22, lz);
          shp.add(leg);
        }));
        farmGrp.add(shp);
        circOb(sx, sz, 0.7);
      });

      const horseCols = [0x78350f, 0x1c1917];
      [[320, Z(196), 0.3, horseCols[0]], [328, Z(206), -1.1, horseCols[1]]].forEach(([hx, hz, hrot, col]) => {
        const hrs = new THREE.Group();
        hrs.position.set(hx, GROUND_Y, hz);
        hrs.rotation.y = hrot;
        const hMat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.6 });
        const body = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.85, 0.76), hMat);
        body.position.y = 1.32;
        hrs.add(body);
        const neck = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.85, 0.34), hMat);
        neck.position.set(0.85, 1.78, 0);
        neck.rotation.z = -0.45;
        hrs.add(neck);
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.34, 0.3), hMat);
        head.position.set(1.22, 2.08, 0);
        head.rotation.z = -0.25;
        hrs.add(head);
        const tail = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.75, 0.14), sheepFaceMat);
        tail.position.set(-0.96, 1.15, 0);
        tail.rotation.z = 0.25;
        hrs.add(tail);
        [-0.62, 0.62].forEach(lx => [-0.24, 0.24].forEach(lz => {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.9, 6), hMat);
          leg.position.set(lx, 0.45, lz);
          hrs.add(leg);
        }));
        farmGrp.add(hrs);
        circOb(hx, hz, 1.1);
      });

      const cowMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.7 });
      const cowSpotMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.7 });
      const pigMat = new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.6 });
      [[320, Z(156), 0.6], [328, Z(165), -0.7]].forEach(([cx, cz, crot]) => {
        const cw = new THREE.Group();
        cw.position.set(cx, GROUND_Y, cz);
        cw.rotation.y = crot;
        const body = new THREE.Mesh(new THREE.BoxGeometry(1.95, 1.05, 0.88), cowMat);
        body.position.y = 1.25;
        cw.add(body);
        const spot = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.88, 0.91), cowSpotMat);
        spot.position.set(0.2, 1.25, 0);
        cw.add(spot);
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.52, 0.46), cowMat);
        head.position.set(1.25, 1.56, 0);
        cw.add(head);
        const muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.26, 0.4), pigMat);
        muzzle.position.set(1.52, 1.46, 0);
        cw.add(muzzle);
        [-0.2, 0.2].forEach(hz2 => {
          const horn = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.22, 6), stoneMat);
          horn.position.set(1.18, 1.9, hz2);
          cw.add(horn);
        });
        [-0.7, 0.7].forEach(lx => [-0.3, 0.3].forEach(lz => {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.75, 6), cowSpotMat);
          leg.position.set(lx, 0.38, lz);
          cw.add(leg);
        }));
        farmGrp.add(cw);
        circOb(cx, cz, 1.2);
      });

      const spool = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.8, 10), woodMat);
      spool.position.set(278, GROUND_Y + 0.4, Z(206));
      farmGrp.add(spool);
      circOb(278, Z(206), 1.2);

      // Goat standing on spool (with 4 legs, horns & tail)
      const goatMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.7 });
      const gt = new THREE.Group();
      gt.position.set(278, GROUND_Y + 0.8, Z(206));
      const gBody = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 0.42), goatMat);
      gBody.position.y = 0.62;
      gt.add(gBody);
      const gHead = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.32, 0.28), goatMat);
      gHead.position.set(0.5, 0.94, 0);
      gt.add(gHead);
      [-0.1, 0.1].forEach(hz2 => {
        const gHorn = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.24, 6), darkWoodMat);
        gHorn.position.set(0.45, 1.18, hz2);
        gHorn.rotation.z = 0.2;
        gt.add(gHorn);
      });
      [-0.32, 0.32].forEach(lx => [-0.14, 0.14].forEach(lz => {
        const gLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.42, 6), goatMat);
        gLeg.position.set(lx, 0.21, lz);
        gt.add(gLeg);
      }));
      farmGrp.add(gt);

      // Pink Pigs near shelter (with 4 legs, snout & ears)
      [[273, Z(211)], [283, Z(210)]].forEach(([px, pz], pi) => {
        const pg = new THREE.Group();
        pg.position.set(px, GROUND_Y, pz);
        pg.rotation.y = pi ? -0.9 : 0.7;
        const pBody = new THREE.Mesh(new THREE.SphereGeometry(0.46, 8, 8), pigMat);
        pBody.scale.set(1.3, 0.85, 0.88);
        pBody.position.y = 0.48;
        pg.add(pBody);
        const snout = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.22, 8), pigMat);
        snout.rotation.z = -Math.PI / 2;
        snout.position.set(0.62, 0.46, 0);
        pg.add(snout);
        [-0.32, 0.32].forEach(lx => [-0.2, 0.2].forEach(lz => {
          const pLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.28, 6), pigMat);
          pLeg.position.set(lx, 0.14, lz);
          pg.add(pLeg);
        }));
        farmGrp.add(pg);
        circOb(px, pz, 0.6);
      });

      mergeGroupByMaterial(farmGrp);
      islandsGroup.add(farmGrp);
    }

    // ------------------------------------------------------------------------
    // Landmark: Gibraltar Point 1808 Lighthouse & Keeper Radelmüller's Ghost
    // ------------------------------------------------------------------------
    let lighthouseBeacon = null;
    let radelmuellerGhost = null;
    {
      const lhg = new THREE.Group();
      const lx = -480, lz = Z(320);
      // Authentic 1808 Queenston limestone octagonal tower (8 sides)
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 4.2, 24, 8), stoneMat);
      tower.position.set(lx, 12.5, lz);
      tower.rotation.y = Math.PI / 8;
      lhg.add(tower);
      circOb(lx, lz, 4.4); // Solid limestone tower blocks collision!

      // Corbelled stone cornice collar below gallery
      const cornice = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 2.45, 0.9, 8), stoneMat);
      cornice.position.set(lx, 24.1, lz);
      cornice.rotation.y = Math.PI / 8;
      lhg.add(cornice);

      // 3 staggered slit staircase windows up the limestone shaft
      [7.5, 13.5, 19.5].forEach((wy, wi) => {
        const ang = wi * 0.75;
        const rAtY = 4.2 - (wy / 24) * 1.8 - 0.15;
        const slit = new THREE.Mesh(new THREE.BoxGeometry(0.42, 1.25, 0.25), warmWinGlowMat);
        slit.position.set(lx + Math.sin(ang) * rAtY, wy, lz - Math.cos(ang) * rAtY);
        slit.rotation.y = -ang;
        lhg.add(slit);
      });

      // Heavy arched wooden door at the north base
      const doorMesh = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.6, 0.3), darkWoodMat);
      doorMesh.position.set(lx, 1.4, lz - 4.15);
      lhg.add(doorMesh);
      const doorHinges = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.12, 0.35), metalMat);
      doorHinges.position.set(lx, 0.8, lz - 4.15);
      lhg.add(doorHinges);
      const doorHinges2 = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.12, 0.35), metalMat);
      doorHinges2.position.set(lx, 2.0, lz - 4.15);
      lhg.add(doorHinges2);
      const doorHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.3, 8), bellBrassMat);
      doorHandle.position.set(lx + 0.55, 1.3, lz - 4.25);
      lhg.add(doorHandle);

      // Open-air catwalk gallery ring (walkable at y = 25.2m) + vertical balusters
      const catwalkFloor = new THREE.Mesh(new THREE.RingGeometry(2.3, 3.8, 24), darkWoodMat);
      catwalkFloor.rotation.x = -Math.PI / 2;
      catwalkFloor.position.set(lx, 25.2, lz);
      lhg.add(catwalkFloor);
      const catwalkRail = new THREE.Mesh(new THREE.TorusGeometry(3.75, 0.08, 6, 24), metalMat);
      catwalkRail.rotation.x = Math.PI / 2;
      catwalkRail.position.set(lx, 26.1, lz);
      lhg.add(catwalkRail);
      const lhBalusters = [];
      for (let bi = 0; bi < 16; bi++) {
        const ba = (bi / 16) * Math.PI * 2;
        lhBalusters.push({ x: lx + Math.cos(ba) * 3.74, y: 25.65, z: lz + Math.sin(ba) * 3.74, sx: 0.05, sy: 0.9, sz: 0.05 });
      }
      addInstMesh(lhg, unitCylGeo, metalMat, lhBalusters);

      // Keeper John Paul Radelmüller Ghost (1808-1815)
      radelmuellerGhost = new THREE.Group();
      radelmuellerGhost.userData.noMerge = true;
      radelmuellerGhost.position.set(lx - 0.6, 25.4, lz - 2.8);
      const ghostMat = new THREE.MeshStandardMaterial({
        color: 0xbae6fd, emissive: 0x38bdf8, emissiveIntensity: 0.65,
        transparent: true, opacity: 0.65, roughness: 0.2
      });
      const gCoat = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.42, 1.15, 8), ghostMat);
      gCoat.position.y = 0.58;
      radelmuellerGhost.add(gCoat);
      const gHead = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 10), ghostMat);
      gHead.position.y = 1.3;
      radelmuellerGhost.add(gHead);
      const gHat = new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.2, 3), ghostMat);
      gHat.rotation.y = Math.PI / 3;
      gHat.position.y = 1.48;
      radelmuellerGhost.add(gHat);
      const gLantern = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.25, 8), new THREE.MeshBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 0.85 }));
      gLantern.position.set(0.35, 0.7, 0.15);
      radelmuellerGhost.add(gLantern);
      lhg.add(radelmuellerGhost);

      const gallery = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 0.8, 12), darkWoodMat);
      gallery.position.set(lx, 24.8, lz);
      lhg.add(gallery);

      const lantern = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 2.6, 12), glassMat);
      lantern.position.set(lx, 26.2, lz);
      lhg.add(lantern);

      // Dark iron lantern-room mullions
      const mullionMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5, metalness: 0.6 });
      const lhMullions = [];
      for (let mi = 0; mi < 12; mi++) {
        const ma = (mi / 12) * Math.PI * 2;
        lhMullions.push({ x: lx + Math.cos(ma) * 2.24, y: 26.2, z: lz + Math.sin(ma) * 2.24, sx: 0.07, sy: 2.6, sz: 0.07 });
      }
      addInstMesh(lhg, unitBoxGeo, mullionMat, lhMullions);

      const cap = new THREE.Mesh(new THREE.ConeGeometry(2.8, 2.4, 12), new THREE.MeshStandardMaterial({ color: 0x2f6b55, roughness: 0.4, metalness: 0.6 }));
      cap.position.set(lx, 28.4, lz);
      lhg.add(cap);

      lighthouseBeacon = new THREE.Group();
      lighthouseBeacon.userData.noMerge = true;
      const fresnelCore = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 1.35, 8), new THREE.MeshBasicMaterial({ color: 0xfef08a, fog: false }));
      lighthouseBeacon.add(fresnelCore);
      const beam = new THREE.Mesh(
        new THREE.ConeGeometry(12, 180, 16, 1, true),
        beaconBeamMat
      );
      beam.rotation.x = Math.PI / 2;
      beam.position.z = 90;
      lighthouseBeacon.add(beam);
      lighthouseBeacon.position.set(lx, 26.2, lz);
      lhg.add(lighthouseBeacon);

      // Nearby Historic 1808 Keeper's Cottage (safely east of tower & door at x=-464, z=Z(316))
      const kc = new THREE.Group();
      kc.position.set(lx + 16, GROUND_Y, lz - 4);
      kc.rotation.y = 0.22;
      const kcWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.72 });
      const kcRoofMat = new THREE.MeshStandardMaterial({ color: 0x7f1d1d, roughness: 0.65 });
      const kcBody = new THREE.Mesh(new THREE.BoxGeometry(7.2, 3.0, 5.4), kcWhiteMat);
      kcBody.position.y = 1.5;
      kc.add(kcBody);
      const kcGable = new THREE.Mesh(new THREE.ConeGeometry(5.1, 2.2, 4), kcRoofMat);
      kcGable.rotation.y = Math.PI / 4;
      kcGable.position.y = 4.0;
      kc.add(kcGable);
      const kcChimney = new THREE.Mesh(new THREE.BoxGeometry(0.65, 2.2, 0.65), new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.85 }));
      kcChimney.position.set(-2.0, 4.2, 0.5);
      kc.add(kcChimney);
      [-1.8, 1.8].forEach(wx => {
        const kw = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.1, 0.12), warmWinGlowMat);
        kw.position.set(wx, 1.6, -2.72);
        kc.add(kw);
      });
      const kd = new THREE.Mesh(new THREE.BoxGeometry(1.0, 2.0, 0.14), darkWoodMat);
      kd.position.set(0, 1.0, -2.72);
      kc.add(kd);
      lhg.add(kc);
      rectOb(lx + 12.2, lx + 19.8, lz - 7.0, lz - 1.0);

      const lhSign = makeSign(
        ['GIBRALTAR POINT LIGHTHOUSE', 'BUILT 1808 • TORONTO\'S OLDEST LANDMARK'],
        14, 2.0,
        { bg: '#1c1917', fg: '#fde047', borderColor: '#d97706' }
      );
      lhSign.position.set(lx, 2.0, lz - 9);
      lhSign.rotation.y = Math.PI;
      lhg.add(lhSign);

      mergeGroupByMaterial(lhg);
      islandsGroup.add(lhg);
    }

    // ------------------------------------------------------------------------
    // Landmark: Billy Bishop Toronto City Airport (CYTZ)
    // - Porter Airlines De Havilland Dash 8-400 (Q400) Turboprops on Runway & Gates
    // - Curved-Roof Modern Passenger Terminal, Pedestrian Tunnel Pavilion & ATC Tower
    // - Runway 08/26 Numbers, Touchdown Zone Bars, PAPI Lights & Perimeter Fencing
    // ------------------------------------------------------------------------
    let radarDish = null;
    let windsockCone = null;
    const q400Propellers = [];
    {
      const apg = new THREE.Group();
      const whiteMarks = [], yellowMarks = [];
      const rwyLightSockets = [], rwyLightBulbs = [];

      // Runway 08/26: 520m asphalt strip + Parallel Taxiway Alpha & Tarmac Apron
      const runway = new THREE.Mesh(new THREE.BoxGeometry(520, 0.1, 44), asphaltMat);
      runway.position.set(-1260, GROUND_Y + 0.05, Z(-170));
      apg.add(runway);

      const taxiway = new THREE.Mesh(new THREE.BoxGeometry(440, 0.09, 20), asphaltMat);
      taxiway.position.set(-1220, GROUND_Y + 0.04, Z(-206));
      apg.add(taxiway);
      const apron = new THREE.Mesh(new THREE.BoxGeometry(155, 0.09, 52), concreteMat);
      apron.position.set(-1060, GROUND_Y + 0.04, Z(-215));
      apg.add(apron);

      // Yellow taxiway centerline, link lines & Gate 1/2 apron lead-in markings
      yellowMarks.push({ x: -1220, y: GROUND_Y + 0.09, z: Z(-206), sx: 430, sy: 0.11, sz: 0.45 });
      [-1440, -1260, -1100, -1020].forEach(tx => {
        const link = new THREE.Mesh(new THREE.BoxGeometry(14, 0.09, 26), asphaltMat);
        link.position.set(tx, GROUND_Y + 0.045, Z(-188));
        apg.add(link);
        yellowMarks.push({ x: tx, y: GROUND_Y + 0.095, z: Z(-188), sx: 0.45, sy: 0.11, sz: 26 });
      });
      [-1094, -1026].forEach(gx => {
        yellowMarks.push({ x: gx, y: GROUND_Y + 0.095, z: Z(-214), sx: 0.45, sy: 0.11, sz: 24 });
        yellowMarks.push({ x: gx, y: GROUND_Y + 0.095, z: Z(-222), sx: 3.6, sy: 0.11, sz: 0.45 });
      });

      // White center dashes, threshold bars, aiming points & touchdown zone bars
      for (let rx = -1490; rx <= -1030; rx += 36) {
        whiteMarks.push({ x: rx, y: GROUND_Y + 0.11, z: Z(-170), sx: 20, sy: 0.12, sz: 1.2 });
      }
      [-1508, -1012].forEach(tx => {
        for (let s = -16; s <= 16; s += 4) {
          whiteMarks.push({ x: tx, y: GROUND_Y + 0.11, z: Z(-170) + s, sx: 16, sy: 0.12, sz: 1.8 });
        }
      });
      // Aiming points & touchdown zone markings
      [-1420, -1100].forEach(ax2 => {
        [-10, 10].forEach(az2 => whiteMarks.push({ x: ax2, y: GROUND_Y + 0.11, z: Z(-170) + az2, sx: 26, sy: 0.12, sz: 3.5 }));
      });
      [-1455, -1438, -1082, -1065].forEach(tx => {
        [-8, -5.5, 5.5, 8].forEach(tz2 => whiteMarks.push({ x: tx, y: GROUND_Y + 0.11, z: Z(-170) + tz2, sx: 10, sy: 0.12, sz: 1.1 }));
      });

      // Crisp "08" and "26" painted runway numbers
      function makeRunwayNumber(label, rx, rotY) {
        const can = document.createElement('canvas');
        can.width = 128; can.height = 128;
        const g = can.getContext('2d');
        if (g) {
          g.fillStyle = '#2b2b2e';
          g.fillRect(0, 0, 128, 128);
          g.fillStyle = '#f8fafc';
          g.font = 'bold 84px sans-serif';
          g.textAlign = 'center';
          g.textBaseline = 'middle';
          g.fillText(label, 64, 66);
        }
        const m = new THREE.Mesh(
          new THREE.PlaneGeometry(11, 11),
          new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(can) })
        );
        m.rotation.x = -Math.PI / 2;
        m.rotation.z = rotY;
        m.position.set(rx, GROUND_Y + 0.12, Z(-170));
        apg.add(m);
      }
      makeRunwayNumber('08', -1488, -Math.PI / 2);
      makeRunwayNumber('26', -1032, Math.PI / 2);

      // Low red-and-white seawall blast barriers at runway tips (well clear of takeoff & walk paths)
      const redBlastMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.6 });
      const redBlasts = [];
      [-1532, -988].forEach(bx => {
        for (let bz = -20; bz <= 20; bz += 8) {
          redBlasts.push({ x: bx, y: GROUND_Y + 0.35, z: Z(-170) + bz, sx: 0.6, sy: 0.7, sz: 4.0 });
          whiteMarks.push({ x: bx, y: GROUND_Y + 0.35, z: Z(-170) + bz + 4.0, sx: 0.6, sy: 0.7, sz: 4.0 });
        }
      });
      addInstMesh(apg, unitBoxGeo, whiteMarkMat, whiteMarks);
      addInstMesh(apg, unitBoxGeo, yellowMarkMat, yellowMarks);
      addInstMesh(apg, unitBoxGeo, redBlastMat, redBlasts);

      // Runway edge lights, blue taxiway lights & 4-light PAPI approach boxes (instanced!)
      const rwyLightMat = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false });
      const lightHousingMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 });
      for (let rx = -1510; rx <= -1010; rx += 32) {
        [-22.5, 22.5].forEach(rz => {
          rwyLightSockets.push({ x: rx, y: GROUND_Y + 0.2, z: Z(-170) + rz, sx: 0.12, sy: 0.28, sz: 0.12 });
          rwyLightBulbs.push({ x: rx, y: GROUND_Y + 0.38, z: Z(-170) + rz, sx: 0.22, sy: 0.22, sz: 0.22, col: 0xfef08a });
        });
      }
      for (let rx = -1430; rx <= -1010; rx += 34) {
        [-10.5, 10.5].forEach(tz2 => {
          rwyLightSockets.push({ x: rx, y: GROUND_Y + 0.18, z: Z(-206) + tz2, sx: 0.1, sy: 0.24, sz: 0.1 });
          rwyLightBulbs.push({ x: rx, y: GROUND_Y + 0.32, z: Z(-206) + tz2, sx: 0.18, sy: 0.18, sz: 0.18, col: 0x38bdf8 });
        });
      }
      [-1468, -1052].forEach(px => {
        for (let pi = 0; pi < 4; pi++) {
          const pz = Z(-170) + 27.5 + pi * 2.2;
          rwyLightSockets.push({ x: px, y: GROUND_Y + 0.32, z: pz, sx: 0.7, sy: 0.48, sz: 0.9 });
          rwyLightBulbs.push({ x: px, y: GROUND_Y + 0.42, z: pz, sx: 0.25, sy: 0.25, sz: 0.25, col: pi < 2 ? 0xef4444 : 0xffffff });
        }
      });
      addInstMesh(apg, unitBoxGeo, lightHousingMat, rwyLightSockets);
      addInstMesh(apg, unitSphereGeo, rwyLightMat, rwyLightBulbs);

      // Windsock near Runway 08/26 midpoint
      const wsPole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 5.5, 8), metalMat);
      wsPole.position.set(-1180, GROUND_Y + 2.75, Z(-140));
      apg.add(wsPole);
      windsockCone = new THREE.Group();
      windsockCone.userData.noMerge = true;
      const wsMatO = new THREE.MeshBasicMaterial({ color: 0xf97316, fog: false });
      const wsMatW = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false });
      for (let wi = 0; wi < 5; wi++) {
        const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.42 - wi * 0.05, 0.47 - wi * 0.05, 0.45, 10, 1, true), wi % 2 === 0 ? wsMatO : wsMatW);
        seg.rotation.z = Math.PI / 2;
        seg.position.x = 0.35 + wi * 0.44;
        windsockCone.add(seg);
      }
      windsockCone.position.set(-1180, GROUND_Y + 5.3, Z(-140));
      apg.add(windsockCone);

      // Upgraded Billy Bishop Passenger Terminal (Nieuport / Porter Architecture)
      const ax = -1060, az = Z(-252);
      const termSilverMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.28, metalness: 0.72 });
      const termNavyMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4, metalness: 0.4 });
      const termCedarMat = new THREE.MeshStandardMaterial({ color: 0x9a5b32, roughness: 0.65 });

      const termBase = new THREE.Mesh(new THREE.BoxGeometry(88, 0.6, 38), stoneMat);
      termBase.position.set(ax, GROUND_Y + 0.3, az);
      apg.add(termBase);

      const termCore = new THREE.Mesh(new THREE.BoxGeometry(82, 8.2, 32), new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 }));
      termCore.position.set(ax, GROUND_Y + 4.4, az);
      apg.add(termCore);

      const loungeGlow = new THREE.Mesh(new THREE.BoxGeometry(78, 5.8, 28), termGlowMat);
      loungeGlow.position.set(ax, GROUND_Y + 3.8, az);
      apg.add(loungeGlow);

      const mullions = [];
      [16.2, -16.2].forEach(gz => {
        const glassWall = new THREE.Mesh(new THREE.BoxGeometry(82.4, 7.6, 0.45), glassMat);
        glassWall.position.set(ax, GROUND_Y + 4.4, az + gz);
        apg.add(glassWall);
        for (let mx = -40; mx <= 40; mx += 8) {
          mullions.push({ x: ax + mx, y: GROUND_Y + 4.4, z: az + gz, sx: 0.32, sy: 8.2, sz: 0.7 });
        }
      });
      addInstMesh(apg, unitBoxGeo, termNavyMat, mullions);

      [-26, 0, 26].forEach((vx, vi) => {
        const vault = new THREE.Mesh(
          new THREE.CylinderGeometry(14.5, 14.5, 42, 20, 1, false, -Math.PI * 0.34, Math.PI * 0.68),
          termSilverMat
        );
        vault.rotation.x = Math.PI / 2;
        vault.scale.set(1.0, 1.0, 0.36);
        vault.position.set(ax + vx, GROUND_Y + 4.2 + (vi === 1 ? 1.1 : 0.3), az);
        apg.add(vault);

        const cedarSoffit = new THREE.Mesh(new THREE.BoxGeometry(27, 0.35, 40), termCedarMat);
        cedarSoffit.position.set(ax + vx, GROUND_Y + 8.5 + (vi === 1 ? 0.8 : 0), az);
        apg.add(cedarSoffit);
      });

      [-34, 34].forEach((gx, gi) => {
        const gateLounge = new THREE.Mesh(new THREE.BoxGeometry(12, 4.6, 16), glassMat);
        gateLounge.position.set(ax + gx, GROUND_Y + 2.6, az + 23);
        apg.add(gateLounge);
        const gateRoof = new THREE.Mesh(new THREE.BoxGeometry(13.2, 0.45, 17.2), termSilverMat);
        gateRoof.position.set(ax + gx, GROUND_Y + 5.0, az + 23);
        apg.add(gateRoof);
        const gateSign = makeSign([`GATE ${gi + 1} • PORTER`, gi === 0 ? 'OTTAWA • MONTREAL • HALIFAX' : 'NEW YORK • BOSTON • CHICAGO'], 8.5, 1.3, { bg: '#0f172a', fg: '#38bdf8', borderColor: '#facc15' });
        gateSign.position.set(ax + gx, GROUND_Y + 5.9, az + 31.2);
        apg.add(gateSign);
      });

      const apSignSouth = makeSign(
        ['BILLY BISHOP TORONTO CITY AIRPORT (CYTZ)', 'PORTER AIRLINES HUB • ISLAND PASSENGER TERMINAL'],
        28, 2.8,
        { bg: '#0f172a', fg: '#f8fafc', borderColor: '#38bdf8', subFg: '#7dd3fc' }
      );
      apSignSouth.position.set(ax, GROUND_Y + 11.4, az + 19.8);
      apg.add(apSignSouth);

      const apSignNorth = makeSign(
        ['BILLY BISHOP TORONTO CITY AIRPORT', 'WELCOME TO TORONTO ISLANDS • WESTERN GAP TERMINAL'],
        26, 2.6,
        { bg: '#0f172a', fg: '#38bdf8', borderColor: '#facc15' }
      );
      apSignNorth.position.set(ax, GROUND_Y + 11.2, az - 19.8);
      apSignNorth.rotation.y = Math.PI;
      apg.add(apSignNorth);

      rectOb(ax - 41, ax + 41, az - 16, az + 16);

      // Billy Bishop Pedestrian Tunnel Island Elevator Pavilion (west of ferry walkway at (-1082, Z(-295)))
      const tunAtrium = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 4.8, 5.4, 16), glassMat);
      tunAtrium.position.set(ax - 22, GROUND_Y + 2.7, Z(-295));
      apg.add(tunAtrium);
      const tunRoof = new THREE.Mesh(new THREE.CylinderGeometry(5.1, 5.1, 0.5, 16), termSilverMat);
      tunRoof.position.set(ax - 22, GROUND_Y + 5.6, Z(-295));
      apg.add(tunRoof);
      const tunSign = makeSign(['PEDESTRIAN TUNNEL', 'UNDERGROUND MOVING WALKWAY TO MAINLAND'], 8.8, 1.3, { bg: '#0f172a', fg: '#38bdf8', borderColor: '#facc15' });
      tunSign.position.set(ax - 22, GROUND_Y + 6.5, Z(-290));
      apg.add(tunSign);
      circOb(ax - 22, Z(-295), 4.8);

      // Covered Glass & Steel Ferry Connector Walkway from Terminal north to Western Gap Ferry Slip
      const walkCanopy = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.35, 52), termSilverMat);
      walkCanopy.position.set(ax, GROUND_Y + 4.4, Z(-295));
      apg.add(walkCanopy);
      const walkwayCols = [];
      for (let wz = Z(-318); wz <= Z(-272); wz += 11) {
        [-4.4, 4.4].forEach(wx => {
          walkwayCols.push({ x: ax + wx, y: GROUND_Y + 2.2, z: wz, sx: 0.16, sy: 4.4, sz: 0.16 });
        });
      }
      addInstMesh(apg, unitCylGeo, termNavyMat, walkwayCols);

      // Western Gap Ferry Slip Fender Dolphins (outer slip pilings at x=+-14.2)
      const dolphinCols = [];
      for (let dz = Z(-350); dz <= Z(-306); dz += 14) {
        [-14.2, 14.2].forEach(dx => dolphinCols.push({ x: ax + dx, y: 0.3, z: dz, sx: 0.42, sy: 2.8, sz: 0.42 }));
      }
      addInstMesh(apg, unitCylGeo, darkWoodMat, dolphinCols);

      // Billy Bishop Airport Western Gap Ferry Slip Portal & Signage at (ax, Z(-324))
      const slipArchL = new THREE.Mesh(new THREE.BoxGeometry(0.6, 5.2, 0.6), termNavyMat);
      slipArchL.position.set(ax - 7.5, GROUND_Y + 2.6, Z(-324));
      apg.add(slipArchL);
      const slipArchR = new THREE.Mesh(new THREE.BoxGeometry(0.6, 5.2, 0.6), termNavyMat);
      slipArchR.position.set(ax + 7.5, GROUND_Y + 2.6, Z(-324));
      apg.add(slipArchR);
      const slipBeam = new THREE.Mesh(new THREE.BoxGeometry(16.4, 0.7, 0.9), termSilverMat);
      slipBeam.position.set(ax, GROUND_Y + 5.3, Z(-324));
      apg.add(slipBeam);

      const ferrySlipSignS = makeSign(
        ['BILLY BISHOP AIRPORT FERRY', 'TO MAINLAND BATHURST QUAY — PRESS [E] TO BOARD'],
        15.5, 2.2,
        { bg: '#0f172a', fg: '#38bdf8', borderColor: '#facc15', subFg: '#fef08a' }
      );
      ferrySlipSignS.position.set(ax, GROUND_Y + 6.5, Z(-323.4));
      apg.add(ferrySlipSignS);

      const ferrySlipSignN = makeSign(
        ['BILLY BISHOP AIRPORT ISLAND SLIP', 'WESTERN GAP FERRY • WELCOME TO CYTZ'],
        15.5, 2.2,
        { bg: '#0f172a', fg: '#f8fafc', borderColor: '#38bdf8' }
      );
      ferrySlipSignN.position.set(ax, GROUND_Y + 6.5, Z(-324.6));
      ferrySlipSignN.rotation.y = Math.PI;
      apg.add(ferrySlipSignN);

      // Upgraded Air Traffic Control Tower at (ax + 54, az)
      const tx = ax + 54, tz = az;
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 3.6, 28, 16), concreteMat);
      shaft.position.set(tx, GROUND_Y + 14.0, tz);
      apg.add(shaft);
      const catwalk = new THREE.Mesh(new THREE.CylinderGeometry(5.2, 4.8, 0.8, 16), termNavyMat);
      catwalk.position.set(tx, GROUND_Y + 27.6, tz);
      apg.add(catwalk);
      const cab = new THREE.Mesh(new THREE.CylinderGeometry(4.8, 3.9, 4.6, 12), glassMat);
      cab.position.set(tx, GROUND_Y + 30.2, tz);
      apg.add(cab);
      const cabRoof = new THREE.Mesh(new THREE.CylinderGeometry(5.1, 5.1, 0.6, 12), termSilverMat);
      cabRoof.position.set(tx, GROUND_Y + 32.8, tz);
      apg.add(cabRoof);
      circOb(tx, tz, 3.6);

      radarDish = new THREE.Group();
      radarDish.userData.noMerge = true;
      radarDish.add(new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.3, 0.45), metalMat));
      radarDish.position.set(tx, GROUND_Y + 34.4, tz);
      apg.add(radarDish);

      // Billy Bishop Airport Transport Canada Airside Security Perimeter Fence (instanced!)
      const fenceMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.4, metalness: 0.6 });
      const fencePostMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.5, metalness: 0.7 });
      const fenceWireMat = new THREE.MeshBasicMaterial({ color: 0x64748b, wireframe: true });
      const fenceH = 2.4;
      const fPanelEntries = [], fRailEntries = [], fPostEntries = [];

      function buildFenceSegment(x0, z0, x1, z1) {
        const len = Math.hypot(x1 - x0, z1 - z0);
        const ang = Math.atan2(x1 - x0, z1 - z0);
        const midX = (x0 + x1) / 2, midZ = (z0 + z1) / 2;
        fPanelEntries.push({ x: midX, y: GROUND_Y + fenceH / 2, z: midZ, ry: ang, sx: 0.08, sy: fenceH, sz: len });
        fRailEntries.push({ x: midX, y: GROUND_Y + fenceH, z: midZ, ry: ang, sx: 0.12, sy: 0.08, sz: len });
        const nPosts = Math.max(2, Math.floor(len / 6.0));
        for (let pi = 0; pi <= nPosts; pi++) {
          const t = pi / nPosts;
          fPostEntries.push({
            x: x0 + (x1 - x0) * t, y: GROUND_Y + (fenceH + 0.3) / 2, z: z0 + (z1 - z0) * t,
            sx: 0.07, sy: fenceH + 0.3, sz: 0.07
          });
        }
      }

      buildFenceSegment(ax - 42, 955, -1540, 955);
      buildFenceSegment(ax + 42, 955, -930, 955);
      buildFenceSegment(-930, 955, -930, 1085);
      addInstMesh(apg, unitBoxGeo, fenceWireMat, fPanelEntries);
      addInstMesh(apg, unitBoxGeo, fenceMat, fRailEntries);
      addInstMesh(apg, unitCylGeo, fencePostMat, fPostEntries);

      [-1085, -1005, -930].forEach((sx, si) => {
        const rSign = makeSign(
          ['RESTRICTED AIRSIDE AREA • KEEP OUT', 'NO CITIZEN ACCESS • ACTIVE RUNWAYS', 'TRANSPORT CANADA SECURITY • CYTZ'],
          9.5, 1.35,
          { bg: '#b91c1c', fg: '#ffffff', borderColor: '#fef08a', subFg: '#fef08a' }
        );
        rSign.position.set(sx, GROUND_Y + 1.8, 954.5);
        if (si === 2) {
          rSign.rotation.y = -Math.PI / 2;
          rSign.position.set(-929.5, GROUND_Y + 1.8, 1010);
        }
        apg.add(rSign);
      });

      // Porter Airlines Tail Emblem Texture (shared across all 4 Q400s)
      function makePorterTailTexture() {
        const can = document.createElement('canvas');
        can.width = 256;
        can.height = 256;
        const g = can.getContext('2d');
        if (g) {
          g.fillStyle = '#0f2557';
          g.fillRect(0, 0, 256, 256);
          g.fillStyle = '#f8fafc';
          g.beginPath();
          g.arc(128, 128, 86, 0, Math.PI * 2);
          g.fill();
          g.strokeStyle = '#94a3b8';
          g.lineWidth = 5;
          g.stroke();
          g.fillStyle = '#0f2557';
          g.beginPath();
          g.arc(92, 78, 22, 0, Math.PI * 2);
          g.arc(164, 78, 22, 0, Math.PI * 2);
          g.fill();
          g.beginPath();
          g.arc(128, 126, 52, 0, Math.PI * 2);
          g.fill();
          g.fillStyle = '#f8fafc';
          g.beginPath();
          g.ellipse(104, 118, 20, 12, -0.15, 0, Math.PI * 2);
          g.ellipse(152, 118, 20, 12, 0.15, 0, Math.PI * 2);
          g.fill();
          g.fillStyle = '#091533';
          g.beginPath();
          g.ellipse(104, 118, 13, 8, -0.15, 0, Math.PI * 2);
          g.ellipse(152, 118, 13, 8, 0.15, 0, Math.PI * 2);
          g.fill();
          g.fillStyle = '#ffffff';
          g.beginPath();
          g.arc(106, 117, 3.5, 0, Math.PI * 2);
          g.arc(150, 117, 3.5, 0, Math.PI * 2);
          g.fill();
          g.fillStyle = '#f8fafc';
          g.beginPath();
          g.ellipse(128, 146, 22, 15, 0, 0, Math.PI * 2);
          g.fill();
          g.fillStyle = '#0f2557';
          g.beginPath();
          g.arc(128, 142, 6, 0, Math.PI * 2);
          g.fill();
          g.font = 'bold 28px Georgia, serif';
          g.fillStyle = '#0f2557';
          g.textAlign = 'center';
          g.fillText('porter', 128, 194);
        }
        return new THREE.CanvasTexture(can);
      }

      const porterTailTex = makePorterTailTexture();
      const badgeMat = new THREE.MeshBasicMaterial({ map: porterTailTex, side: THREE.DoubleSide });
      const porterBrandSample = makeSign(['porter', 'DE HAVILLAND Q400 • C-GLQP'], 7.2, 0.95, { bg: '#f8fafc', fg: '#0f2557', borderColor: '#f8fafc', subFg: '#64748b', titleSize: 56, subSize: 22 });
      const porterBrandMat = porterBrandSample.material;
      const porterBrandGeo = porterBrandSample.geometry;

      const porterWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.22, metalness: 0.18, side: THREE.DoubleSide });
      const porterNavyMat = new THREE.MeshStandardMaterial({ color: 0x0f2557, roughness: 0.32, metalness: 0.28, side: THREE.DoubleSide });
      const porterGoldMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.35, metalness: 0.65 });
      const radomeMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.35, side: THREE.DoubleSide });
      const cockpitGlassMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8, roughness: 0.08, metalness: 0.25,
        transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide
      });
      const cabinWinGlassMat = new THREE.MeshBasicMaterial({
        color: 0xbae6fd, transparent: true, opacity: 0.14, depthWrite: false, side: THREE.DoubleSide, fog: false
      });
      const tireMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.88 });
      const propBladeMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3, metalness: 0.5 });
      const seatNavyCloth = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.85, side: THREE.DoubleSide });
      const seatGreyTrim = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.6, metalness: 0.2, side: THREE.DoubleSide });
      const cabinCarpetMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9, side: THREE.DoubleSide });
      const cockpitPanelMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.55, metalness: 0.35, side: THREE.DoubleSide });
      const pfdScreenMat = new THREE.MeshBasicMaterial({ color: 0x0284c7, toneMapped: false });
      const ndScreenMat = new THREE.MeshBasicMaterial({ color: 0x0369a1, toneMapped: false });
      const eicasScreenMat = new THREE.MeshBasicMaterial({ color: 0x10b981, toneMapped: false });

      // Swept tapered high-wing & T-tail shared geometries for Q400
      const q400WingGeo = (() => {
        const sh = new THREE.Shape();
        sh.moveTo(0, -1.7);
        sh.lineTo(13.8, -0.5);
        sh.lineTo(13.8, 1.15);
        sh.lineTo(0, 1.65);
        sh.closePath();
        const g = new THREE.ExtrudeGeometry(sh, { depth: 0.24, bevelEnabled: false });
        g.rotateX(Math.PI / 2);
        return g;
      })();
      const q400VFinGeo = (() => {
        const sh = new THREE.Shape();
        sh.moveTo(-1.4, 0);
        sh.lineTo(2.4, 0);
        sh.lineTo(3.9, 6.2);
        sh.lineTo(1.2, 6.2);
        sh.closePath();
        const g = new THREE.ExtrudeGeometry(sh, { depth: 0.3, bevelEnabled: false });
        g.translate(0, 0, -0.15);
        g.rotateY(-Math.PI / 2);
        return g;
      })();
      const q400HTailGeo = (() => {
        const sh = new THREE.Shape();
        sh.moveTo(0, -1.2);
        sh.lineTo(4.4, -0.3);
        sh.lineTo(4.4, 0.95);
        sh.lineTo(0, 1.15);
        sh.closePath();
        const g = new THREE.ExtrudeGeometry(sh, { depth: 0.18, bevelEnabled: false });
        g.rotateX(Math.PI / 2);
        return g;
      })();

      // Detailed Porter Airlines De Havilland Canada Dash 8-400 (Q400) Builder (batched & instanced!)
      function buildPorterDash8Q400(px, pz, rotY, opts) {
        const o = opts || {};
        const isHero = !!o.isHero;
        const pl = new THREE.Group();
        pl.userData.noMerge = true;
        const airframe = new THREE.Group();
        const fuseLen = 25.0, fuseR = 1.62;

        // 1. Stretched Q400 Pressurized Fuselage (local -Z forward nose, +Z tail)
        const lowerBelly = new THREE.Mesh(
          new THREE.CylinderGeometry(fuseR, fuseR, fuseLen, 24, 1, true, Math.PI * 0.42, Math.PI * 1.16),
          porterWhiteMat
        );
        lowerBelly.rotation.x = Math.PI / 2;
        airframe.add(lowerBelly);

        const upperCrown = new THREE.Mesh(
          new THREE.CylinderGeometry(fuseR, fuseR, fuseLen, 24, 1, true, -Math.PI * 0.36, Math.PI * 0.72),
          porterWhiteMat
        );
        upperCrown.rotation.x = Math.PI / 2;
        airframe.add(upperCrown);

        // Flush curved Porter navy belly & gold pin-stripe cheatline hugging cylinder contour (zero protruding corners!)
        const bellyArc = new THREE.Mesh(
          new THREE.CylinderGeometry(fuseR + 0.015, fuseR + 0.015, fuseLen * 0.98, 20, 1, true, Math.PI * 0.65, Math.PI * 0.70),
          porterNavyMat
        );
        bellyArc.rotation.x = Math.PI / 2;
        airframe.add(bellyArc);
        [-fuseR + 0.02, fuseR - 0.02].forEach(gx => {
          const cheat = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, fuseLen * 0.96), porterGoldMat);
          cheat.position.set(gx, -0.18, 0);
          airframe.add(cheat);
        });

        // Window Belt Pillars & Cabin Windows (instanced!)
        const winPillars = [], winPanes = [];
        for (let wi = -11.8; wi <= 11.8; wi += 0.95) {
          [-fuseR + 0.03, fuseR - 0.03].forEach(wx => {
            winPillars.push({ x: wx, y: 0.38, z: wi - 0.47, sx: 0.08, sy: 0.62, sz: 0.36 });
            winPanes.push({ x: wx, y: 0.38, z: wi, sx: 0.03, sy: 0.48, sz: 0.56 });
          });
        }
        addInstMesh(pl, unitBoxGeo, porterWhiteMat, winPillars);
        addInstMesh(pl, unitBoxGeo, isHero ? cabinWinGlassMat : cabinWinMat, winPanes);

        // Aerodynamic Sloped Lower Nose & Weather Radar Radome (-Z forward, tucked strictly below cockpit glareshield)
        const lowerNose = new THREE.Mesh(new THREE.CylinderGeometry(0.58, fuseR * 0.88, 3.6, 20, 1, false), porterWhiteMat);
        lowerNose.rotation.x = -Math.PI / 2 - 0.12;
        lowerNose.scale.set(0.95, 1.0, 0.34);
        lowerNose.position.set(0, -0.56, -fuseLen / 2 - 1.55);
        airframe.add(lowerNose);

        const radome = new THREE.Mesh(new THREE.SphereGeometry(0.62, 16, 12), radomeMat);
        radome.scale.set(0.92, 0.42, 1.45);
        radome.position.set(0, -0.52, -fuseLen / 2 - 3.65);
        airframe.add(radome);

        // Flight Deck Cockpit Canopy Roof, Pillars & Transparent Wraparound Windshields
        const cockpitRoof = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.14, 2.45), porterWhiteMat);
        cockpitRoof.position.set(0, 1.08, -13.35);
        cockpitRoof.rotation.x = 0.10;
        airframe.add(cockpitRoof);

        const cockpitCrown = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.16, 1.95), porterWhiteMat);
        cockpitCrown.position.set(0, 1.20, -13.10);
        airframe.add(cockpitCrown);

        [-0.48, 0.48].forEach(wx => {
          const fPane = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.84, 0.04), cockpitGlassMat);
          fPane.position.set(wx, 0.62, -14.12);
          fPane.rotation.x = 0.36;
          fPane.rotation.y = wx < 0 ? 0.14 : -0.14;
          airframe.add(fPane);
        });

        [-1.08, 1.08].forEach(sx => {
          const sPane = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.78, 1.65), cockpitGlassMat);
          sPane.position.set(sx, 0.60, -13.30);
          sPane.rotation.z = sx < 0 ? -0.12 : 0.12;
          airframe.add(sPane);
          const sWall = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.75, 2.15), porterWhiteMat);
          sWall.position.set(sx * 1.04, -0.15, -13.35);
          airframe.add(sWall);
        });

        const centerPost = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.86, 0.06), radomeMat);
        centerPost.position.set(0, 0.62, -14.18);
        centerPost.rotation.x = 0.36;
        airframe.add(centerPost);

        [-0.96, 0.96].forEach(pxOff => {
          const aPillar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.86, 0.06), radomeMat);
          aPillar.position.set(pxOff, 0.62, -14.02);
          aPillar.rotation.x = 0.36;
          airframe.add(aPillar);
          const bPillar = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.84, 0.08), radomeMat);
          bPillar.position.set(pxOff * 1.12, 0.62, -12.55);
          airframe.add(bPillar);
        });

        // Tapered Rear Tail Cone (+Z aft)
        const tailCone = new THREE.Mesh(new THREE.CylinderGeometry(0.45, fuseR, 5.4, 20), porterNavyMat);
        tailCone.rotation.x = Math.PI / 2;
        tailCone.position.set(0, 0.22, fuseLen / 2 + 2.7);
        airframe.add(tailCone);

        // --- Full Interior Cabin & Flight Deck ONLY on interactive Hero Q400 (#1) ---
        if (isHero) {
          const overheadPanel = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.05, 0.95), radomeMat);
          overheadPanel.position.set(0, 1.00, -13.25);
          overheadPanel.rotation.x = 0.10;
          airframe.add(overheadPanel);

          const cabinFloor = new THREE.Mesh(new THREE.BoxGeometry(2.65, 0.08, 25.2), cabinCarpetMat);
          cabinFloor.position.set(0, -0.52, -1.6);
          airframe.add(cabinFloor);

          const cabinCeiling = new THREE.Mesh(new THREE.BoxGeometry(2.20, 0.06, 24.0), porterWhiteMat);
          cabinCeiling.position.set(0, 1.24, -1.0);
          airframe.add(cabinCeiling);

          // 2x2 Cabin Seats instanced into 3 InstancedMeshes (instead of 228 separate meshes!)
          const seatBacks = [], seatHeads = [], seatCushions = [];
          for (let rz = -10.4; rz <= 6.8; rz += 0.95) {
            [-1.08, -0.58, 0.58, 1.08].forEach(sx => {
              seatBacks.push({ x: sx, y: 0.04, z: rz - 0.18, rx: -0.06, sx: 0.44, sy: 0.64, sz: 0.09 });
              seatHeads.push({ x: sx, y: 0.40, z: rz - 0.19, sx: 0.32, sy: 0.15, sz: 0.10 });
              seatCushions.push({ x: sx, y: -0.26, z: rz, sx: 0.44, sy: 0.10, sz: 0.42 });
            });
          }
          addInstMesh(pl, unitBoxGeo, seatNavyCloth, seatBacks);
          addInstMesh(pl, unitBoxGeo, porterWhiteMat, seatHeads);
          addInstMesh(pl, unitBoxGeo, seatNavyCloth, seatCushions);

          const trayTable = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.22, 0.02), seatGreyTrim);
          trayTable.position.set(-1.08, 0.08, -3.88);
          airframe.add(trayTable);
          const seat6Armrest = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.06, 0.38), seatGreyTrim);
          seat6Armrest.position.set(-0.82, -0.10, -2.80);
          airframe.add(seat6Armrest);
          const psu = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.05, 0.25), porterWhiteMat);
          psu.position.set(-1.08, 1.19, -2.80);
          airframe.add(psu);

          [-0.48, 0.48].forEach(pilotX => {
            const seatBack = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.68, 0.10), seatNavyCloth);
            seatBack.position.set(pilotX, 0.08, -12.86);
            airframe.add(seatBack);
            const seatHead = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.18, 0.10), seatNavyCloth);
            seatHead.position.set(pilotX, 0.48, -12.86);
            airframe.add(seatHead);
            const seatBase = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.12, 0.44), seatNavyCloth);
            seatBase.position.set(pilotX, -0.28, -13.08);
            airframe.add(seatBase);
          });

          const glareshield = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.07, 0.42), cockpitPanelMat);
          glareshield.position.set(0, 0.19, -13.86);
          airframe.add(glareshield);
          const mainPanel = new THREE.Mesh(new THREE.BoxGeometry(1.84, 0.42, 0.08), cockpitPanelMat);
          mainPanel.position.set(0, -0.02, -13.94);
          mainPanel.rotation.x = -0.18;
          airframe.add(mainPanel);

          [-0.64, -0.34, 0, 0.34, 0.64].forEach((sx, idx) => {
            const scrMat = (idx === 2) ? eicasScreenMat : (idx % 2 === 1 ? ndScreenMat : pfdScreenMat);
            const screen = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.22, 0.02), scrMat);
            screen.position.set(sx, 0.02, -13.89);
            screen.rotation.x = -0.18;
            airframe.add(screen);
            if (idx === 0 || idx === 4) {
              const hBar = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.02, 0.025), porterGoldMat);
              hBar.position.set(sx, 0.02, -13.88);
              hBar.rotation.x = -0.18;
              airframe.add(hBar);
            }
          });

          const pedestal = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.42, 0.82), cockpitPanelMat);
          pedestal.position.set(0, -0.28, -13.42);
          airframe.add(pedestal);
          [-0.07, 0.07].forEach(lx => {
            const lever = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.16, 0.03), radomeMat);
            lever.position.set(lx, 0.0, -13.48);
            lever.rotation.x = -0.32;
            airframe.add(lever);
            const knob = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.04), porterWhiteMat);
            knob.position.set(lx, 0.08, -13.51);
            airframe.add(knob);
          });

          [-0.48, 0.48].forEach(yx => {
            const col = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.42, 8), seatGreyTrim);
            col.position.set(yx, -0.24, -13.55);
            col.rotation.x = -0.22;
            airframe.add(col);
            const yokeBar = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.04, 0.04), radomeMat);
            yokeBar.position.set(yx, -0.02, -13.50);
            airframe.add(yokeBar);
            [-0.12, 0.12].forEach(hx => {
              const horn = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.13, 0.04), radomeMat);
              horn.position.set(yx + hx, 0.04, -13.50);
              airframe.add(horn);
            });
          });
        }

        const porterBrandL = new THREE.Mesh(porterBrandGeo, porterBrandMat);
        porterBrandL.rotation.y = -Math.PI / 2;
        porterBrandL.position.set(-fuseR - 0.04, 0.85, -3.5);
        pl.add(porterBrandL);
        const porterBrandR = new THREE.Mesh(porterBrandGeo, porterBrandMat);
        porterBrandR.rotation.y = Math.PI / 2;
        porterBrandR.position.set(fuseR + 0.04, 0.85, -3.5);
        pl.add(porterBrandR);

        // 2. High-Mounted Swept Tapered High Wing & Wingbox Fairing
        const wingBox = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.62, 5.4), porterWhiteMat);
        wingBox.position.set(0, fuseR - 0.08, -0.5);
        airframe.add(wingBox);

        [-1, 1].forEach(side => {
          const wing = new THREE.Mesh(q400WingGeo, porterWhiteMat);
          wing.position.set(side * 0.4, fuseR + 0.14, -0.5);
          if (side < 0) wing.scale.x = -1;
          wing.rotation.z = side * 0.03; // subtle positive wing dihedral
          airframe.add(wing);

          // Flap-track fairings under wing
          [-3.2, -8.5].forEach(fx => {
            const ft = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.22, 1.5), porterWhiteMat);
            ft.position.set(side * Math.abs(fx), fuseR + 0.02, 0.55);
            airframe.add(ft);
          });

          const tip = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.26, 1.75), porterNavyMat);
          tip.position.set(side * 14.3, fuseR + 0.56, 0.35);
          airframe.add(tip);
          const strobe = new THREE.Mesh(
            new THREE.SphereGeometry(0.18, 8, 8),
            new THREE.MeshBasicMaterial({ color: side < 0 ? 0xef4444 : 0x22c55e, fog: false })
          );
          strobe.position.set(side * 14.95, fuseR + 0.60, 0.35);
          airframe.add(strobe);
        });

        // 3. Twin PW150A Turboprop Engine Nacelles & Animated 6-Blade Dowty Propellers
        [-5.2, 5.2].forEach(ex => {
          const nacelle = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.58, 6.4, 16), porterNavyMat);
          nacelle.rotation.x = Math.PI / 2;
          nacelle.position.set(ex, fuseR - 0.45, -1.6);
          airframe.add(nacelle);

          const intake = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.68, 0.8, 16), metalMat);
          intake.rotation.x = Math.PI / 2;
          intake.position.set(ex, fuseR - 0.45, -4.9);
          airframe.add(intake);

          const propHub = new THREE.Group();
          propHub.userData.noMerge = true;
          propHub.position.set(ex, fuseR - 0.45, -5.45);
          const spinner = new THREE.Mesh(new THREE.ConeGeometry(0.46, 1.15, 14), metalMat);
          spinner.rotation.x = -Math.PI / 2;
          spinner.position.z = -0.35;
          propHub.add(spinner);

          for (let bi = 0; bi < 6; bi++) {
            const ang = (bi / 6) * Math.PI * 2;
            const bladeGrp = new THREE.Group();
            bladeGrp.rotation.z = ang;
            const blade = new THREE.Mesh(new THREE.BoxGeometry(0.24, 2.05, 0.05), propBladeMat);
            blade.position.y = 1.1;
            blade.rotation.y = 0.35;
            bladeGrp.add(blade);
            const tipStripe = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.22, 0.06), yellowMarkMat);
            tipStripe.position.y = 2.0;
            tipStripe.rotation.y = 0.35;
            bladeGrp.add(tipStripe);
            propHub.add(bladeGrp);
          }

          if (o.spinSpeed && o.spinSpeed > 4) {
            const disc = new THREE.Mesh(
              new THREE.CircleGeometry(2.1, 20),
              new THREE.MeshBasicMaterial({ color: 0xcbd5e1, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false })
            );
            propHub.add(disc);
          }

          mergeGroupByMaterial(propHub);
          pl.add(propHub);
          q400Propellers.push({ hub: propHub, speed: o.spinSpeed !== undefined ? o.spinSpeed : 6.0 });

          const gearStrut = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 2.55, 8), metalMat);
          gearStrut.position.set(ex, -0.15, -0.8);
          airframe.add(gearStrut);
          [-0.28, 0.28].forEach(wo => {
            const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.24, 14), tireMat);
            wheel.rotation.z = Math.PI / 2;
            wheel.position.set(ex + wo, -1.42, -0.8);
            airframe.add(wheel);
          });
        });

        // 4. Nose Landing Gear + Taxi/Takeoff LED Headlight
        const noseStrut = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.85, 8), metalMat);
        noseStrut.position.set(0, -0.95, -fuseLen / 2 - 0.8);
        airframe.add(noseStrut);
        [-0.20, 0.20].forEach(wo => {
          const nWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.18, 12), tireMat);
          nWheel.rotation.z = Math.PI / 2;
          nWheel.position.set(wo, -1.54, -fuseLen / 2 - 0.8);
          airframe.add(nWheel);
        });
        if (o.headlight) {
          const beamLight = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false }));
          beamLight.position.set(0, -0.7, -fuseLen / 2 - 0.95);
          airframe.add(beamLight);
        }

        // 5. Swept Tapered T-Tail Vertical Stabilizer, Dorsal Fillet & Swept Horizontal Tailplane
        const vFin = new THREE.Mesh(q400VFinGeo, porterNavyMat);
        vFin.position.set(0, 0.9, fuseLen / 2 + 1.1);
        airframe.add(vFin);
        const dorsalFillet = new THREE.Mesh(new THREE.BoxGeometry(0.32, 1.1, 3.2), porterNavyMat);
        dorsalFillet.position.set(0, 1.5, fuseLen / 2 - 0.8);
        dorsalFillet.rotation.x = 0.35;
        airframe.add(dorsalFillet);

        [-0.19, 0.19].forEach((bx, bi) => {
          const badge = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 3.0), badgeMat);
          badge.position.set(bx, 4.3, fuseLen / 2 + 3.0);
          badge.rotation.y = bi === 0 ? -Math.PI / 2 : Math.PI / 2;
          pl.add(badge);
        });

        const bullet = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 3.8, 12), porterNavyMat);
        bullet.rotation.x = Math.PI / 2;
        bullet.position.set(0, 7.05, fuseLen / 2 + 3.5);
        airframe.add(bullet);

        [-1, 1].forEach(side => {
          const hHalf = new THREE.Mesh(q400HTailGeo, porterWhiteMat);
          hHalf.position.set(0, 7.08, fuseLen / 2 + 3.6);
          if (side < 0) hHalf.scale.x = -1;
          airframe.add(hHalf);
        });

        const tailBeacon = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), new THREE.MeshBasicMaterial({ color: 0xef4444, fog: false }));
        tailBeacon.position.set(0, 7.35, fuseLen / 2 + 3.6);
        airframe.add(tailBeacon);

        // Merge entire static airframe by material in local coordinates BEFORE world transform!
        mergeGroupByMaterial(airframe);
        pl.add(airframe);

        pl.position.set(px, GROUND_Y + 1.90, pz);
        pl.rotation.y = rotY;
        apg.add(pl);
        if (!o.noOb) circOb(px, pz, 9.5);
        return pl;
      }

      // 1. Active Runway 08 Takeoff Aircraft (hero Q400 with full interior cabin & cockpit!)
      flightPlane = buildPorterDash8Q400(-1360, Z(-170), -Math.PI / 2, { spinSpeed: 24.0, headlight: true, noOb: true, isHero: true });
      // 2. Runway 26 Holding / Taxiing Q400 at East Taxiway
      buildPorterDash8Q400(-1160, Z(-206), Math.PI / 2, { spinSpeed: 14.0, headlight: true });
      // 3 & 4. Two Gate-Parked Porter Q400 Turboprops at Terminal Gates 1 & 2 (idling props ready for departure)
      buildPorterDash8Q400(ax - 34, az + 50, 0.12, { spinSpeed: 6.5, headlight: false });
      buildPorterDash8Q400(ax + 34, az + 50, -0.12, { spinSpeed: 4.2, headlight: false });

      mergeGroupByMaterial(apg);
      islandsGroup.add(apg);
    }

    // ------------------------------------------------------------------------
    // Landmark: Algonquin and Ward's Island Cute Unique Cottages in the Woods,
    // Ward's Island Cafe & Ward's Island Ferry Dock Pavilion
    // ------------------------------------------------------------------------
    {
      const cottGrp = new THREE.Group();
      const algonquinCottGrp = new THREE.Group();
      const wardsCottGrp = new THREE.Group();
      const wardsPropsGrp = new THREE.Group();
      cottGrp.add(algonquinCottGrp);
      cottGrp.add(wardsCottGrp);
      cottGrp.add(wardsPropsGrp);

      // 12 Curated Heritage Island Cottage Palettes (Siding, Roof Shingles, Shutters/Door)
      const COTTAGE_STYLES = [
        { siding: 0x93c5fd, roof: 0x334155, trim: 0xf8fafc, door: 0xb91c1c, shutter: 0x1e3a8a }, // Robin's Egg Blue & Slate
        { siding: 0xa7f3d0, roof: 0x3f2e21, trim: 0xffffff, door: 0x92400e, shutter: 0x065f46 }, // Sage Mint & Cedar Shake
        { siding: 0xfef08a, roof: 0x1e3a2f, trim: 0xffffff, door: 0x1d4ed8, shutter: 0x14532d }, // Buttercup Yellow & Forest Green
        { siding: 0xfbcfe8, roof: 0x475569, trim: 0xf8fafc, door: 0x831843, shutter: 0x334155 }, // Rose Cottage & Charcoal
        { siding: 0xddd6fe, roof: 0x312e81, trim: 0xffffff, door: 0x6d28d9, shutter: 0x1e1b4b }, // Lavender Mist & Indigo
        { siding: 0xfed7aa, roof: 0x7c2d12, trim: 0xfffbeb, door: 0x15803d, shutter: 0x431407 }, // Warm Apricot & Terracotta
        { siding: 0xf8fafc, roof: 0x1e3a8a, trim: 0xe2e8f0, door: 0xdc2626, shutter: 0x1e40af }, // Crisp Coastal White & Navy
        { siding: 0xfca5a5, roof: 0x27272a, trim: 0xffffff, door: 0x1e293b, shutter: 0x7f1d1d }, // Heritage Barn Coral & Zinc
        { siding: 0xbae6fd, roof: 0x451a03, trim: 0xffffff, door: 0xd97706, shutter: 0x0c4a6e }, // Harbour Sky & Warm Brown
        { siding: 0xd9f99d, roof: 0x365314, trim: 0xf8fafc, door: 0xb45309, shutter: 0x1a2e05 }, // Meadow Fern & Moss Shingle
        { siding: 0xfde68a, roof: 0x7f1d1d, trim: 0xffffff, door: 0x047857, shutter: 0x78350f }, // Sunflower Cream & Burgundy
        { siding: 0xc7d2fe, roof: 0x374151, trim: 0xf8fafc, door: 0xbe123c, shutter: 0x312e81 }  // Periwinkle & Pewter
      ];
      const COTTAGE_STYLE_MATS = COTTAGE_STYLES.map(st => ({
        sidingMat: new THREE.MeshStandardMaterial({ color: st.siding, roughness: 0.62 }),
        roofMat: new THREE.MeshStandardMaterial({ color: st.roof, roughness: 0.76 }),
        trimMat: new THREE.MeshStandardMaterial({ color: st.trim, roughness: 0.48 }),
        doorMat: new THREE.MeshStandardMaterial({ color: st.door, roughness: 0.52 }),
        shutterMat: new THREE.MeshStandardMaterial({ color: st.shutter, roughness: 0.58 })
      }));

      // Uses top-level day/night warmWinGlowMat
      const chimneyBrickMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.85 });
      const flowerColors = [0xef4444, 0xec4899, 0xfacc15, 0xa855f7, 0x3b82f6, 0xf97316, 0x14b8a6];
      const flowerMats = flowerColors.map(col => new THREE.MeshBasicMaterial({ color: col }));
      const canoeColors = [0xdc2626, 0x047857, 0xfacc15, 0x1d4ed8];
      const canoeMats = canoeColors.map(col => new THREE.MeshStandardMaterial({ color: col, roughness: 0.35 }));
      const gardenSoilMat = new THREE.MeshStandardMaterial({ color: 0x3f2e21, roughness: 0.95 });
      const flagstoneMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.85 });
      const foliageGreenMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.8 });
      const lushLeafMat = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.78 });

      // True triangular prism builder for flush gable walls (no rectangular steps!)
      function makeGablePrismGeo(spanW, riseH, depthZ) {
        const shape = new THREE.Shape();
        shape.moveTo(-spanW / 2, 0);
        shape.lineTo(spanW / 2, 0);
        shape.lineTo(0, riseH);
        shape.closePath();
        const geo = new THREE.ExtrudeGeometry(shape, { depth: depthZ, bevelEnabled: false });
        geo.translate(0, 0, -depthZ / 2);
        return geo;
      }

      // Authentic Muskoka / Adirondack Chair helper
      const _chairSeatGeo = new THREE.BoxGeometry(0.62, 0.06, 0.58);
      const _chairBackGeo = new THREE.BoxGeometry(0.58, 0.72, 0.06);
      const _chairArmGeo = new THREE.BoxGeometry(0.12, 0.05, 0.68);
      const _chairFLegGeo = new THREE.BoxGeometry(0.07, 0.48, 0.07);
      const _chairBLegGeo = new THREE.BoxGeometry(0.07, 0.44, 0.07);
      function buildMuskokaChair(mat) {
        const ch = new THREE.Group();
        const seat = new THREE.Mesh(_chairSeatGeo, mat);
        seat.position.set(0, 0.34, 0);
        seat.rotation.x = -0.15;
        ch.add(seat);
        const back = new THREE.Mesh(_chairBackGeo, mat);
        back.position.set(0, 0.64, -0.24);
        back.rotation.x = -0.28;
        ch.add(back);
        [-0.28, 0.28].forEach(ax => {
          const arm = new THREE.Mesh(_chairArmGeo, mat);
          arm.position.set(ax, 0.50, -0.02);
          ch.add(arm);
          const fLeg = new THREE.Mesh(_chairFLegGeo, mat);
          fLeg.position.set(ax, 0.24, 0.22);
          ch.add(fLeg);
          const bLeg = new THREE.Mesh(_chairBLegGeo, mat);
          bLeg.position.set(ax, 0.20, -0.24);
          bLeg.rotation.x = 0.20;
          ch.add(bLeg);
        });
        return ch;
      }

      const _cottVerandaColGeo = new THREE.CylinderGeometry(0.09, 0.11, 2.42, 8);
      const _cottVerandaBaseGeo = new THREE.BoxGeometry(0.24, 0.32, 0.24);
      const _cottBalusterGeo = new THREE.BoxGeometry(0.05, 0.46, 0.05);
      const _cottSconceGeo = new THREE.SphereGeometry(0.13, 8, 8);
      const _cottWinFrameGeo = new THREE.BoxGeometry(1.28, 1.38, 0.12);
      const _cottWinGlassGeo = new THREE.BoxGeometry(1.06, 1.16, 0.14);
      const _cottMuntinVGeo = new THREE.BoxGeometry(0.05, 1.18, 0.16);
      const _cottMuntinHGeo = new THREE.BoxGeometry(1.08, 0.05, 0.16);
      const _cottShutterGeo = new THREE.BoxGeometry(0.26, 1.34, 0.08);
      const _cottWinBoxGeo = new THREE.BoxGeometry(1.32, 0.24, 0.28);
      const _cottWinLeafGeo = new THREE.SphereGeometry(0.15, 6, 6);
      const _cottWinBloomGeo = new THREE.SphereGeometry(0.13, 6, 6);
      const _cottStepStoneGeo = new THREE.CylinderGeometry(0.34, 0.36, 0.07, 7);
      const _cottArborVineGeo = new THREE.SphereGeometry(0.28, 7, 7);
      const _cottPicketGeo = new THREE.BoxGeometry(0.09, 0.84, 0.04);
      const _cottPostGeo = new THREE.BoxGeometry(0.16, 0.96, 0.16);
      const _cottSideRailGeo = new THREE.BoxGeometry(0.06, 0.72, 2.4);
      const _cottBushGeo = new THREE.SphereGeometry(0.36, 7, 7);
      const _cottClusterGeo = new THREE.SphereGeometry(0.24, 6, 6);
      const _cottStalkGeo = new THREE.CylinderGeometry(0.03, 0.04, 1.15, 6);
      const _cottTopBloomGeo = new THREE.SphereGeometry(0.16, 6, 6);
      const _cottCanoeGeo = new THREE.CylinderGeometry(0.26, 0.26, 3.8, 10);

      function addUniqueCottage(cDef, idx) {
        const stMats = COTTAGE_STYLE_MATS[idx % COTTAGE_STYLE_MATS.length];
        const archType = idx % 4; // 4 Authentic Toronto Island Heritage Architectural Styles!
        const c = new THREE.Group();

        // Unique proportions per cottage
        const w = 7.4 + (idx % 4) * 0.55;
        const d = 6.4 + ((idx * 3) % 3) * 0.45;
        const h = (archType === 1 ? 3.85 : 3.25) + (idx % 3) * 0.22;
        const roofH = (archType === 3 ? 2.95 : 2.35) + (idx % 2) * 0.35;

        const sidingMat = stMats.sidingMat;
        const roofMat = stMats.roofMat;
        const trimMat = stMats.trimMat;
        const doorMat = stMats.doorMat;
        const shutterMat = stMats.shutterMat;

        // 1. Fieldstone Foundation Plinth & Main Heritage Clapboard Body
        const found = new THREE.Mesh(new THREE.BoxGeometry(w + 0.36, 0.42, d + 0.36), stoneMat);
        found.position.y = 0.21;
        c.add(found);

        const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), sidingMat);
        body.position.y = 0.42 + h / 2;
        c.add(body);

        // Horizontal Clapboard Belt Courses, Water Table Trim & Crisp Corner Pilasters
        const waterTable = new THREE.Mesh(new THREE.BoxGeometry(w + 0.16, 0.12, d + 0.16), trimMat);
        waterTable.position.y = 0.46;
        c.add(waterTable);

        const friezeBoard = new THREE.Mesh(new THREE.BoxGeometry(w + 0.18, 0.16, d + 0.18), trimMat);
        friezeBoard.position.y = 0.42 + h - 0.08;
        c.add(friezeBoard);

        [-w / 2, w / 2].forEach(tx => {
          [-d / 2, d / 2].forEach(tz => {
            const corner = new THREE.Mesh(new THREE.BoxGeometry(0.20, h + 0.06, 0.20), trimMat);
            corner.position.set(tx, 0.42 + h / 2, tz);
            c.add(corner);
          });
        });

        // 2. Flush Extruded Triangular Gable Walls & Steep Pitched Roof with Decorative Bargeboards
        const gablePrism = new THREE.Mesh(makeGablePrismGeo(w, roofH, d), sidingMat);
        gablePrism.position.set(0, 0.42 + h, 0);
        c.add(gablePrism);

        const overhang = 0.58;
        const slopeLen = Math.hypot(w / 2 + overhang, roofH);
        const slopeAng = Math.atan2(roofH, w / 2 + overhang);
        [-1, 1].forEach(sd => {
          const rPane = new THREE.Mesh(new THREE.BoxGeometry(slopeLen, 0.18, d + 0.95), roofMat);
          rPane.position.set(sd * ((w / 2 + overhang) / 2), 0.42 + h + roofH / 2, 0);
          rPane.rotation.z = -sd * slopeAng;
          c.add(rPane);

          // Decorative Victorian Gingerbread Bargeboard Trim on front & back eaves
          [-d / 2 - 0.42, d / 2 + 0.42].forEach(bz => {
            const barge = new THREE.Mesh(new THREE.BoxGeometry(slopeLen, 0.14, 0.08), trimMat);
            barge.position.set(sd * ((w / 2 + overhang) / 2), 0.42 + h + roofH / 2 - 0.06, bz);
            barge.rotation.z = -sd * slopeAng;
            c.add(barge);
          });
        });

        const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.24, d + 1.02), trimMat);
        ridge.position.set(0, 0.42 + h + roofH, 0);
        c.add(ridge);

        // Victorian Finial Spire & Gable Rose/Diamond Attic Window on Front Gable
        const finial = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.09, 0.75, 8), trimMat);
        finial.position.set(0, 0.42 + h + roofH + 0.32, d / 2 + 0.38);
        c.add(finial);

        const atticWinFrame = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.92, 0.12), trimMat);
        atticWinFrame.position.set(0, 0.42 + h + roofH * 0.42, d / 2 + 0.02);
        if (idx % 2 === 1) atticWinFrame.rotation.z = Math.PI / 4; // diamond gable window on odd cottages
        c.add(atticWinFrame);
        const atticWinGlass = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.72, 0.15), warmWinGlowMat);
        atticWinGlass.position.set(0, 0.42 + h + roofH * 0.42, d / 2 + 0.03);
        if (idx % 2 === 1) atticWinGlass.rotation.z = Math.PI / 4;
        c.add(atticWinGlass);

        // 3. Architectural Wings & Asymmetric Massing (L-Wings, Cross-Gables, Screened Sunrooms & Bay Windows)
        const sideSign = (idx % 2 === 0) ? 1 : -1;
        if (archType === 0 || archType === 2) {
          // L-Shaped Side Cottage Wing with its own pitched gable roof & garden window
          const wingW = 2.6, wingH = h * 0.86, wingD = d * 0.64, wingRoofH = roofH * 0.72;
          const wingBody = new THREE.Mesh(new THREE.BoxGeometry(wingW, wingH, wingD), sidingMat);
          wingBody.position.set(sideSign * (w / 2 + wingW / 2 - 0.1), 0.42 + wingH / 2, -0.35);
          c.add(wingBody);
          const wingFound = new THREE.Mesh(new THREE.BoxGeometry(wingW + 0.25, 0.42, wingD + 0.25), stoneMat);
          wingFound.position.set(sideSign * (w / 2 + wingW / 2 - 0.1), 0.21, -0.35);
          c.add(wingFound);
          const wingRoof = new THREE.Mesh(new THREE.ConeGeometry(Math.hypot(wingW, wingD) * 0.62, wingRoofH, 4), roofMat);
          wingRoof.rotation.y = Math.PI / 4;
          wingRoof.position.set(sideSign * (w / 2 + wingW / 2 - 0.1), 0.42 + wingH + wingRoofH / 2 - 0.05, -0.35);
          c.add(wingRoof);
          const wingWin = new THREE.Mesh(new THREE.BoxGeometry(1.05, 1.15, 0.14), warmWinGlowMat);
          wingWin.position.set(sideSign * (w / 2 + wingW * 0.48), 0.42 + wingH * 0.52, -0.35 + wingD / 2 + 0.02);
          c.add(wingWin);
        } else {
          // Glazed Muskoka Sunroom / Conservatory Wing on the side
          const sunW = 2.2, sunH = h * 0.78, sunD = d * 0.68;
          const sunRoom = new THREE.Mesh(new THREE.BoxGeometry(sunW, sunH, sunD), trimMat);
          sunRoom.position.set(sideSign * (w / 2 + sunW / 2 - 0.1), 0.42 + sunH / 2, 0.15);
          c.add(sunRoom);
          const sunGlass = new THREE.Mesh(new THREE.BoxGeometry(sunW + 0.06, sunH * 0.62, sunD * 0.86), warmWinGlowMat);
          sunGlass.position.set(sideSign * (w / 2 + sunW / 2 - 0.08), 0.42 + sunH * 0.54, 0.15);
          c.add(sunGlass);
          const sunRoof = new THREE.Mesh(new THREE.BoxGeometry(sunW + 0.35, 0.16, sunD + 0.35), roofMat);
          sunRoof.position.set(sideSign * (w / 2 + sunW / 2), 0.42 + sunH + 0.12, 0.15);
          sunRoof.rotation.z = -sideSign * 0.18;
          c.add(sunRoof);
        }

        // Upper Roof Dormer Windows on Both Slopes
        [-1, 1].forEach(dSide => {
          if ((idx + (dSide > 0 ? 1 : 0)) % 2 === 0) {
            const dormX = dSide * (w * 0.24);
            const dormY = 0.42 + h + roofH * 0.44;
            const dorm = new THREE.Mesh(new THREE.BoxGeometry(1.35, 1.15, 1.65), sidingMat);
            dorm.position.set(dormX, dormY, 0.15);
            c.add(dorm);
            const dormRoof = new THREE.Mesh(new THREE.ConeGeometry(1.25, 0.75, 4), roofMat);
            dormRoof.rotation.y = Math.PI / 4;
            dormRoof.position.set(dormX, dormY + 0.85, 0.15);
            c.add(dormRoof);
            const dormWin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.68, 0.76), warmWinGlowMat);
            dormWin.position.set(dormX + dSide * 0.66, dormY, 0.15);
            c.add(dormWin);
          }
        });

        // 4. Tall Red-Brick or Fieldstone Chimney with Terracotta Chimney Pots
        const chSide = (idx % 2 === 0) ? -1 : 1;
        const chim = new THREE.Mesh(new THREE.BoxGeometry(0.82, h + roofH + 1.1, 0.82), idx % 3 === 0 ? stoneMat : chimneyBrickMat);
        chim.position.set(chSide * (w * 0.34), 0.42 + (h + roofH + 1.1) / 2, -d * 0.22);
        c.add(chim);
        const chimCap = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.18, 1.02), stoneMat);
        chimCap.position.set(chSide * (w * 0.34), 0.42 + h + roofH + 1.15, -d * 0.22);
        c.add(chimCap);
        const chimPot = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.20, 0.42, 8), chimneyBrickMat);
        chimPot.position.set(chSide * (w * 0.34), 0.42 + h + roofH + 1.40, -d * 0.22);
        c.add(chimPot);

        // 5. Deep Covered Island Veranda Porch with Real Spindles, Turned Posts & Muskoka Chairs (+Z is front)
        const porchD = 2.35, porchW = w + 0.15;
        const porchDeck = new THREE.Mesh(new THREE.BoxGeometry(porchW, 0.38, porchD), woodMat);
        porchDeck.position.set(0, 0.21, d / 2 + porchD / 2);
        c.add(porchDeck);

        // Two-tier wooden front steps leading to flagstone garden path
        const step1 = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.24, 0.42), woodMat);
        step1.position.set(0, 0.14, d / 2 + porchD + 0.20);
        c.add(step1);
        const step2 = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.12, 0.42), woodMat);
        step2.position.set(0, 0.06, d / 2 + porchD + 0.56);
        c.add(step2);

        // Sloped Veranda Roof Canopy & Decorative Gingerbread Frieze
        const porchRoof = new THREE.Mesh(new THREE.BoxGeometry(porchW + 0.45, 0.16, porchD + 0.42), roofMat);
        porchRoof.position.set(0, 2.82, d / 2 + porchD / 2 + 0.05);
        porchRoof.rotation.x = 0.15;
        c.add(porchRoof);

        const porchTrim = new THREE.Mesh(new THREE.BoxGeometry(porchW + 0.38, 0.14, 0.10), trimMat);
        porchTrim.position.set(0, 2.58, d / 2 + porchD - 0.04);
        c.add(porchTrim);

        // Turned Veranda Columns with Decorative Brackets
        [-porchW / 2 + 0.22, -1.05, 1.05, porchW / 2 - 0.22].forEach(px => {
          const pPost = new THREE.Mesh(_cottVerandaColGeo, trimMat);
          pPost.position.set(px, 1.48, d / 2 + porchD - 0.14);
          c.add(pPost);
          const pBase = new THREE.Mesh(_cottVerandaBaseGeo, trimMat);
          pBase.position.set(px, 0.52, d / 2 + porchD - 0.14);
          c.add(pBase);
        });

        // Open Baluster Porch Railings (Top Rail, Bottom Rail & Vertical Spindles)
        [-1, 1].forEach(rs => {
          const rLen = porchW / 2 - 1.25;
          const rCenterX = rs * (1.05 + rLen / 2);
          const rZ = d / 2 + porchD - 0.14;
          const topRail = new THREE.Mesh(new THREE.BoxGeometry(rLen, 0.08, 0.10), trimMat);
          topRail.position.set(rCenterX, 0.96, rZ);
          c.add(topRail);
          const botRail = new THREE.Mesh(new THREE.BoxGeometry(rLen, 0.07, 0.09), trimMat);
          botRail.position.set(rCenterX, 0.48, rZ);
          c.add(botRail);
          for (let bx = -rLen / 2 + 0.18; bx <= rLen / 2 - 0.14; bx += 0.24) {
            const bal = new THREE.Mesh(_cottBalusterGeo, trimMat);
            bal.position.set(rCenterX + bx, 0.72, rZ);
            c.add(bal);
          }
        });

        // Pair of Painted Muskoka Chairs on the Front Veranda
        const chairL = buildMuskokaChair(doorMat);
        chairL.position.set(-porchW * 0.31, 0.40, d / 2 + porchD * 0.45);
        chairL.rotation.y = 0.28;
        c.add(chairL);
        const chairR = buildMuskokaChair(shutterMat);
        chairR.position.set(porchW * 0.31, 0.40, d / 2 + porchD * 0.45);
        chairR.rotation.y = -0.28;
        c.add(chairR);

        // 6. Panelled Heritage Door with Transom Window, Warm Lanterns, Multi-Pane Windows & Flower Boxes
        const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(1.24, 2.38, 0.12), trimMat);
        doorFrame.position.set(0, 1.56, d / 2 + 0.02);
        c.add(doorFrame);
        const door = new THREE.Mesh(new THREE.BoxGeometry(1.00, 2.10, 0.15), doorMat);
        door.position.set(0, 1.44, d / 2 + 0.03);
        c.add(door);
        const doorTransom = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.24, 0.16), warmWinGlowMat);
        doorTransom.position.set(0, 2.58, d / 2 + 0.03);
        c.add(doorTransom);

        [-0.78, 0.78].forEach(lx => {
          const sconce = new THREE.Mesh(_cottSconceGeo, lampGlowMat);
          sconce.position.set(lx, 2.15, d / 2 + 0.18);
          c.add(sconce);
        });

        // Front & Side Multi-Pane Windows with Muntins, Louvered Shutters & Lush Cedar Window Boxes
        [-w * 0.31, w * 0.31].forEach((wx, wi) => {
          const wFrame = new THREE.Mesh(_cottWinFrameGeo, trimMat);
          wFrame.position.set(wx, 1.80, d / 2 + 0.02);
          c.add(wFrame);
          const wGlass = new THREE.Mesh(_cottWinGlassGeo, warmWinGlowMat);
          wGlass.position.set(wx, 1.80, d / 2 + 0.03);
          c.add(wGlass);
          // Window muntin crossbars
          const mVert = new THREE.Mesh(_cottMuntinVGeo, trimMat);
          mVert.position.set(wx, 1.80, d / 2 + 0.04);
          c.add(mVert);
          const mHoriz = new THREE.Mesh(_cottMuntinHGeo, trimMat);
          mHoriz.position.set(wx, 1.80, d / 2 + 0.04);
          c.add(mHoriz);

          // Louvered painted shutters
          [-0.76, 0.76].forEach(sx => {
            const shut = new THREE.Mesh(_cottShutterGeo, shutterMat);
            shut.position.set(wx + sx, 1.80, d / 2 + 0.05);
            c.add(shut);
          });

          // Under-window cedar flower box overflowing with foliage & blooms
          const fBox = new THREE.Mesh(_cottWinBoxGeo, darkWoodMat);
          fBox.position.set(wx, 1.02, d / 2 + 0.16);
          c.add(fBox);
          const fStep = LITE_ISL ? 0.48 : 0.24;
          for (let fi = -0.48; fi <= 0.48; fi += fStep) {
            const leaf = new THREE.Mesh(_cottWinLeafGeo, foliageGreenMat);
            leaf.position.set(wx + fi, 1.16, d / 2 + 0.18);
            c.add(leaf);
            const bloom = new THREE.Mesh(
              _cottWinBloomGeo,
              flowerMats[(idx + wi + Math.round((fi + 1) * 4)) % flowerMats.length]
            );
            bloom.position.set(wx + fi, 1.24, d / 2 + 0.20);
            c.add(bloom);
          }
        });

        // 7. LUSH ENGLISH COTTAGE GARDEN, FLAGSTONE WALKWAY, PICKET FENCE, ROSE ARBOR & CANOE!
        const fenceZ = d / 2 + porchD + 2.65;
        const gateHalfW = 0.92;

        // Flagstone Stepping-Stone Garden Path from Arbor Gate to Porch Steps
        for (let sz = d / 2 + porchD + 0.95; sz <= fenceZ + 0.35; sz += 0.52) {
          const stone = new THREE.Mesh(_cottStepStoneGeo, flagstoneMat);
          stone.position.set(Math.sin(sz * 3.1 + idx) * 0.08, 0.04, sz);
          c.add(stone);
        }

        // Arched Timber Garden Arbor & Rose Trellis over the Front Gate
        [-gateHalfW, gateHalfW].forEach(gx => {
          const aPost = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.25, 0.14), trimMat);
          aPost.position.set(gx, 1.12, fenceZ);
          c.add(aPost);
        });
        const arborBeam = new THREE.Mesh(new THREE.BoxGeometry(gateHalfW * 2 + 0.55, 0.14, 0.45), trimMat);
        arborBeam.position.set(0, 2.26, fenceZ);
        c.add(arborBeam);
        const arborCrown = new THREE.Mesh(new THREE.BoxGeometry(gateHalfW * 2 + 0.25, 0.18, 0.32), trimMat);
        arborCrown.position.set(0, 2.40, fenceZ);
        c.add(arborCrown);

        // Climbing Roses & Green Vines on the Garden Arbor
        [-gateHalfW - 0.05, -0.45, 0, 0.45, gateHalfW + 0.05].forEach((vx, vi) => {
          const vine = new THREE.Mesh(_cottArborVineGeo, lushLeafMat);
          vine.position.set(vx, vi === 0 || vi === 4 ? 1.85 : 2.38, fenceZ);
          c.add(vine);
          const rose = new THREE.Mesh(
            _cottWinLeafGeo,
            flowerMats[(idx + vi) % flowerMats.length]
          );
          rose.position.set(vx + 0.06, (vi === 0 || vi === 4 ? 1.92 : 2.48), fenceZ + 0.14);
          c.add(rose);
        });

        // Authentic White Picket Fence (Individual Pointed Pickets + Rails on Front & Side Returns)
        [-1, 1].forEach(fs => {
          const fStart = gateHalfW + 0.08;
          const fEnd = w / 2 + 0.85;
          const fSpan = fEnd - fStart;
          const fMidX = fs * (fStart + fSpan / 2);

          // Horizontal fence rails
          [0.24, 0.68].forEach(ry => {
            const fRail = new THREE.Mesh(new THREE.BoxGeometry(fSpan, 0.06, 0.06), trimMat);
            fRail.position.set(fMidX, ry, fenceZ);
            c.add(fRail);
          });
          // Individual vertical pickets
          const pStep = LITE_ISL ? 0.36 : 0.24;
          for (let px = fStart; px <= fEnd; px += pStep) {
            const picket = new THREE.Mesh(_cottPicketGeo, trimMat);
            picket.position.set(fs * px, 0.42, fenceZ);
            c.add(picket);
          }
          // Corner fence post & side garden return rail
          const cPost = new THREE.Mesh(_cottPostGeo, trimMat);
          cPost.position.set(fs * fEnd, 0.48, fenceZ);
          c.add(cPost);
          const sideRail = new THREE.Mesh(_cottSideRailGeo, trimMat);
          sideRail.position.set(fs * fEnd, 0.40, fenceZ - 1.2);
          c.add(sideRail);
        });

        // Lush Multi-Layered Perennial Flower Beds (Hydrangeas, Hollyhock Spires, Sunflowers & Hostas)
        [-1, 1].forEach((gs, gi) => {
          const bedW = w * 0.34;
          const bedX = gs * (gateHalfW + 0.35 + bedW / 2);
          const bedZ = d / 2 + porchD + 1.35;

          // Raised stone-edged garden bed soil mound
          const bedFrame = new THREE.Mesh(new THREE.BoxGeometry(bedW + 0.16, 0.22, 1.45), stoneMat);
          bedFrame.position.set(bedX, 0.11, bedZ);
          c.add(bedFrame);
          const bedSoil = new THREE.Mesh(new THREE.BoxGeometry(bedW, 0.25, 1.28), gardenSoilMat);
          bedSoil.position.set(bedX, 0.13, bedZ);
          c.add(bedSoil);

          // Blooming Hydrangea / Peony Shrubs & Tall Hollyhock / Sunflower Stalks
          const bStep = LITE_ISL ? 0.85 : 0.58;
          for (let bx = -bedW * 0.36; bx <= bedW * 0.36; bx += bStep) {
            const bush = new THREE.Mesh(_cottBushGeo, foliageGreenMat);
            bush.scale.set(1.1, 0.85, 1.1);
            bush.position.set(bedX + bx, 0.38, bedZ - 0.12);
            c.add(bush);

            const bCluster = new THREE.Mesh(
              _cottClusterGeo,
              flowerMats[(idx * 2 + gi + Math.round((bx + 2) * 3)) % flowerMats.length]
            );
            bCluster.position.set(bedX + bx, 0.58, bedZ - 0.08);
            c.add(bCluster);

            // Tall Hollyhock / Delphinium flower spike behind the shrubs
            const stalk = new THREE.Mesh(_cottStalkGeo, lushLeafMat);
            stalk.position.set(bedX + bx * 0.85, 0.72, bedZ - 0.42);
            c.add(stalk);
            const topBloom = new THREE.Mesh(
              _cottTopBloomGeo,
              flowerMats[(idx + gi + 2) % flowerMats.length]
            );
            topBloom.position.set(bedX + bx * 0.85, 1.28, bedZ - 0.42);
            c.add(topBloom);
          }
        });

        // Authentic Toronto Island Yard Props: Painted Cedar-Strip Canoe/Kayak on Rack or Stone Birdbath!
        const canoeMat = canoeMats[idx % canoeMats.length];
        const canoeSide = -sideSign;
        const canoeHull = new THREE.Mesh(_cottCanoeGeo, canoeMat);
        canoeHull.rotation.x = Math.PI / 2;
        canoeHull.scale.set(1.25, 0.75, 1.0);
        canoeHull.position.set(canoeSide * (w / 2 + 0.95), 0.52, 0.4);
        c.add(canoeHull);
        [-1.1, 1.1].forEach(rz => {
          const rack = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.42, 0.10), woodMat);
          rack.position.set(canoeSide * (w / 2 + 0.95), 0.21, 0.4 + rz);
          c.add(rack);
        });

        const cy = Math.max(GROUND_Y, terrainH(cDef.x, cDef.z));
        c.position.set(cDef.x, cy, cDef.z);
        c.rotation.y = cDef.rot;
        (cDef.x < 750 ? algonquinCottGrp : wardsCottGrp).add(c);
        circOb(cDef.x, cDef.z, Math.max(w, d) * 0.52);
      }

      COTTAGES.forEach((cDef, idx) => addUniqueCottage(cDef, idx));

      // Split into Algonquin & Ward's batches so frustum culling & draw calls stay lean
      mergeGroupByMaterial(algonquinCottGrp, { castShadow: true, receiveShadow: true });
      mergeGroupByMaterial(wardsCottGrp, { castShadow: true, receiveShadow: true });

      // Ward's Island Cafe & Garden Patio at (1050, Z(70))
      const cafe = new THREE.Mesh(new THREE.BoxGeometry(18, 4.2, 12), new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.6 }));
      cafe.position.set(1050, 2.65, Z(70));
      wardsPropsGrp.add(cafe);
      const cafeRoof = new THREE.Mesh(new THREE.ConeGeometry(13.5, 2.8, 4), new THREE.MeshStandardMaterial({ color: 0x065f46, roughness: 0.7 }));
      cafeRoof.rotation.y = Math.PI / 4;
      cafeRoof.position.set(1050, 6.1, Z(70));
      wardsPropsGrp.add(cafeRoof);
      const cafeOvenChim = new THREE.Mesh(new THREE.BoxGeometry(1.4, 5.4, 1.4), chimneyBrickMat);
      cafeOvenChim.position.set(1057, 4.6, Z(72));
      wardsPropsGrp.add(cafeOvenChim);
      const cafeVeranda = new THREE.Mesh(new THREE.BoxGeometry(18.8, 0.35, 3.6), woodMat);
      cafeVeranda.position.set(1050, GROUND_Y + 0.18, Z(62.4));
      wardsPropsGrp.add(cafeVeranda);
      [-6.0, -2.0, 2.0, 6.0].forEach(wx => {
        const cWin = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.8, 0.16), warmWinGlowMat);
        cWin.position.set(1050 + wx, 2.6, Z(63.98));
        wardsPropsGrp.add(cWin);
      });
      // Garden Patio outdoor tables & colourful umbrellas (flanks open, center Withrow Walk clear!)
      const patioUmbMats = [
        new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.6 }),
        new THREE.MeshStandardMaterial({ color: 0x059669, roughness: 0.6 }),
        new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.6 }),
        new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.6 })
      ];
      [[1042.5, Z(58.5), 0], [1046.0, Z(59.2), 1], [1054.0, Z(59.2), 2], [1057.5, Z(58.5), 3]].forEach(([tx, tz, ui]) => {
        const tbl = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.08, 10), woodMat);
        tbl.position.set(tx, GROUND_Y + 0.78, tz);
        wardsPropsGrp.add(tbl);
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 2.5, 6), metalMat);
        pole.position.set(tx, GROUND_Y + 1.25, tz);
        wardsPropsGrp.add(pole);
        const umb = new THREE.Mesh(new THREE.ConeGeometry(1.45, 0.55, 8), patioUmbMats[ui]);
        umb.position.set(tx, GROUND_Y + 2.45, tz);
        wardsPropsGrp.add(umb);
        [-0.75, 0.75].forEach(cx => {
          const ch = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.45), woodMat);
          ch.position.set(tx + cx, GROUND_Y + 0.25, tz);
          wardsPropsGrp.add(ch);
        });
        circOb(tx, tz, 0.75);
      });
      [-3.4, 3.4].forEach(px => {
        const planter = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.55, 0.8), woodMat);
        planter.position.set(1050 + px, GROUND_Y + 0.28, Z(60.6));
        wardsPropsGrp.add(planter);
        const shrub = new THREE.Mesh(new THREE.SphereGeometry(0.55, 6, 5), foliageGreenMat);
        shrub.position.set(1050 + px, GROUND_Y + 0.7, Z(60.6));
        wardsPropsGrp.add(shrub);
      });
      // Bike rack & 3 parked bicycles east of Ward's Cafe
      const rackBar = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.08, 0.08), metalMat);
      rackBar.position.set(1061.5, GROUND_Y + 0.7, Z(64.5));
      wardsPropsGrp.add(rackBar);
      [-1.5, 1.5].forEach(rx => {
        const rPost = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.75, 6), metalMat);
        rPost.position.set(1061.5 + rx, GROUND_Y + 0.38, Z(64.5));
        wardsPropsGrp.add(rPost);
      });
      [-1.0, 0, 1.0].forEach((bx, bi) => {
        const frameMat = canoeMats[bi % canoeMats.length];
        [-0.45, 0.45].forEach(wz => {
          const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.06, 10), metalMat);
          wh.rotation.z = Math.PI / 2;
          wh.position.set(1061.5 + bx, GROUND_Y + 0.34, Z(64.5) + wz);
          wardsPropsGrp.add(wh);
        });
        const bkFrame = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.9), frameMat);
        bkFrame.position.set(1061.5 + bx, GROUND_Y + 0.65, Z(64.5));
        wardsPropsGrp.add(bkFrame);
      });
      const cafeSign = makeSign(
        ['WARD\'S ISLAND CAFE', 'GARDEN PATIO • ARTISAN BAKERY • WOOD-FIRED PIZZA'],
        14, 2.0,
        { bg: '#047857', fg: '#fef08a', borderColor: '#10b981' }
      );
      cafeSign.position.set(1050, 5.2, Z(63.8));
      cafeSign.rotation.y = Math.PI;
      wardsPropsGrp.add(cafeSign);
      rectOb(1041, 1059, Z(64), Z(76));

      // Ward's & Algonquin painted wooden pedestrian street signposts
      const stSignGreenMat = new THREE.MeshStandardMaterial({ color: 0x065f46, roughness: 0.5 });
      [
        [912, Z(20), 0.2], [976, Z(22), -0.3], [1044, Z(38), 0.8],
        [518, Z(26), 0.15], [1128, Z(30), 1.4]
      ].forEach(([sx, sz, srot]) => {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.7, 0.14), woodMat);
        post.position.set(sx, GROUND_Y + 1.35, sz);
        wardsPropsGrp.add(post);
        const blade = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.24, 0.08), stSignGreenMat);
        blade.position.set(sx, GROUND_Y + 2.45, sz);
        blade.rotation.y = srot;
        wardsPropsGrp.add(blade);
      });

      // Toronto Island Fire Station 335 at (858, Z(75)) facing Cibola Avenue
      const fhx = 858, fhz = Z(75);
      const fhBrickMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.8 });
      const fhDoorMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.4 });
      const fhBody = new THREE.Mesh(new THREE.BoxGeometry(11, 4.6, 8.2), fhBrickMat);
      fhBody.position.set(fhx, GROUND_Y + 2.3, fhz);
      wardsPropsGrp.add(fhBody);
      const fhParapet = new THREE.Mesh(new THREE.BoxGeometry(11.4, 0.45, 8.6), stoneMat);
      fhParapet.position.set(fhx, GROUND_Y + 4.75, fhz);
      wardsPropsGrp.add(fhParapet);
      [-2.6, 2.6].forEach(dx => {
        const bayDoor = new THREE.Mesh(new THREE.BoxGeometry(3.4, 3.4, 0.18), fhDoorMat);
        bayDoor.position.set(fhx + dx, GROUND_Y + 1.75, fhz + 4.12);
        wardsPropsGrp.add(bayDoor);
        const bayWin = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.6, 0.22), warmWinGlowMat);
        bayWin.position.set(fhx + dx, GROUND_Y + 2.6, fhz + 4.13);
        wardsPropsGrp.add(bayWin);
      });
      const hoseTower = new THREE.Mesh(new THREE.BoxGeometry(2.8, 8.8, 2.8), fhBrickMat);
      hoseTower.position.set(fhx - 3.6, GROUND_Y + 4.4, fhz - 2.2);
      wardsPropsGrp.add(hoseTower);
      const hoseCap = new THREE.Mesh(new THREE.ConeGeometry(2.4, 1.4, 4), stoneMat);
      hoseCap.rotation.y = Math.PI / 4;
      hoseCap.position.set(fhx - 3.6, GROUND_Y + 9.5, fhz - 2.2);
      wardsPropsGrp.add(hoseCap);
      const fireSign = makeSign(
        ['TORONTO FIRE STATION 335', 'WARD\'S ISLAND EMERGENCY RESPONSE'],
        10.5, 1.4,
        { bg: '#7f1d1d', fg: '#fef2f2', borderColor: '#f59e0b' }
      );
      fireSign.position.set(fhx, GROUND_Y + 4.15, fhz + 4.25);
      wardsPropsGrp.add(fireSign);
      rectOb(fhx - 5.6, fhx + 5.6, fhz - 4.2, fhz + 4.2);

      // Ward's Island Ferry Dock Terminal Pavilion & Sign at (1140, Z(-18))
      const wx = 1140, wz = Z(-18);
      const wCanopy = new THREE.Mesh(new THREE.BoxGeometry(18, 0.55, 11), darkWoodMat);
      wCanopy.position.set(wx, 4.2, wz);
      wardsPropsGrp.add(wCanopy);
      const wRoof = new THREE.Mesh(new THREE.ConeGeometry(11.5, 2.4, 4), new THREE.MeshStandardMaterial({ color: 0x1e3a2f, roughness: 0.7 }));
      wRoof.rotation.y = Math.PI / 4;
      wRoof.scale.set(1.25, 1, 0.8);
      wRoof.position.set(wx, 5.6, wz);
      wardsPropsGrp.add(wRoof);
      [-7.5, 7.5].forEach(px => [-4.2, 4.2].forEach(pz => {
        const p = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.25, 4.2, 8), darkWoodMat);
        p.position.set(wx + px, 2.1, wz + pz);
        wardsPropsGrp.add(p);
        circOb(wx + px, wz + pz, 0.35);
      }));
      [-5.5, 5.5].forEach(bx => {
        const wBench = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.45, 0.65), woodMat);
        wBench.position.set(wx + bx, GROUND_Y + 0.32, wz + 2.8);
        wardsPropsGrp.add(wBench);
      });
      [[1144, Z(15)], [1144, Z(32)]].forEach(([bx, bz]) => {
        const gapBench = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.48, 2.4), woodMat);
        gapBench.position.set(bx, GROUND_Y + 0.3, bz);
        wardsPropsGrp.add(gapBench);
      });
      const wSignS = makeSign(
        ['WARD\'S ISLAND FERRY DOCK', 'CLICK DESTINATION • MAINLAND / CENTRE / HANLAN\'S [E]'],
        16, 2.2,
        { bg: '#064e3b', fg: '#fef08a', borderColor: '#10b981' }
      );
      wSignS.position.set(wx, 5.0, wz + 5.7);
      wardsPropsGrp.add(wSignS);
      const wSignN = makeSign(
        ['WARD\'S ISLAND TERMINAL', 'EAST ISLAND VILLAGE & COTTAGES'],
        15, 2.0,
        { bg: '#1e3a8a', fg: '#bae6fd', borderColor: '#0284c7' }
      );
      wSignN.position.set(wx, 5.0, wz - 5.7);
      wSignN.rotation.y = Math.PI;
      wardsPropsGrp.add(wSignN);

      mergeGroupByMaterial(wardsPropsGrp, { castShadow: true });
      islandsGroup.add(cottGrp);
    }

    // ------------------------------------------------------------------------
    // Landmark: Hanlan's Point Terminal, Ned Hanlan Statue, Ball Diamonds & Dunes
    // ------------------------------------------------------------------------
    {
      const hpg = new THREE.Group();
      const hx = -720, hz = Z(-120);
      const hpSign = makeSign(
        ['HANLAN\'S POINT FERRY DOCK', 'TO JACK LAYTON FERRY TERMINAL'],
        16, 2.2,
        { bg: '#1e3a8a', fg: '#bae6fd', borderColor: '#0284c7' }
      );
      hpSign.position.set(hx, 4.2, hz + 32);
      hpg.add(hpSign);

      [-7, 7].forEach(o => {
        const p = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 4.2, 6), darkWoodMat);
        p.position.set(hx + o, 2.1, hz + 32);
        hpg.add(p);
        circOb(hx + o, hz + 32, 0.3);
      });

      // Hanlan's Point Ferry Dock Timber Waiting Shelter & Benches (safely south of disembark at z=1090)
      const hpShelterRoof = new THREE.Mesh(new THREE.BoxGeometry(19, 0.45, 7.6), darkWoodMat);
      hpShelterRoof.position.set(hx, 4.05, hz + 36.2);
      hpg.add(hpShelterRoof);
      const hpGable = new THREE.Mesh(new THREE.ConeGeometry(10.8, 2.1, 4), new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.65 }));
      hpGable.rotation.y = Math.PI / 4;
      hpGable.scale.set(1.3, 1, 0.6);
      hpGable.position.set(hx, 5.25, hz + 36.2);
      hpg.add(hpGable);
      [-8.5, 8.5].forEach(px => {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 4.0, 6), darkWoodMat);
        post.position.set(hx + px, 2.0, hz + 39.6);
        hpg.add(post);
        circOb(hx + px, hz + 39.6, 0.32);
      });
      [[-5.0, 36.2], [5.0, 36.2], [-10.5, 22], [10.5, 22]].forEach(([bx, bz]) => {
        const bSeat = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.42, 0.65), woodMat);
        bSeat.position.set(hx + bx, GROUND_Y + 0.32, hz + bz);
        hpg.add(bSeat);
      });

      // Articulated Ned Hanlan Bronze Sculling Monument on Stepped Granite Pedestal
      const plinth = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.4, 3.4), stoneMat);
      plinth.position.set(hx + 35, 1.2, hz + 35);
      hpg.add(plinth);
      const plinthBase = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.5, 4.2), stoneMat);
      plinthBase.position.set(hx + 35, 0.45, hz + 35);
      hpg.add(plinthBase);
      const plinthCap = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.28, 3.6), stoneMat);
      plinthCap.position.set(hx + 35, 2.02, hz + 35);
      hpg.add(plinthCap);
      const plaqueMat = new THREE.MeshStandardMaterial({ color: 0xb45309, metalness: 0.8, roughness: 0.35 });
      const plaque = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.65, 0.1), plaqueMat);
      plaque.position.set(hx + 35, 1.25, hz + 33.28);
      hpg.add(plaque);

      const bronzeMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, metalness: 0.78, roughness: 0.32 });
      const hanlanGrp = new THREE.Group();
      hanlanGrp.position.set(hx + 35, 2.16, hz + 35);
      hanlanGrp.rotation.y = Math.PI;
      [-0.22, 0.22].forEach(lx => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.12, 1.25, 8), bronzeMat);
        leg.position.set(lx, 0.62, 0);
        hanlanGrp.add(leg);
      });
      const hTorso = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.24, 1.05, 8), bronzeMat);
      hTorso.position.set(0, 1.72, 0);
      hanlanGrp.add(hTorso);
      const hHead = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), bronzeMat);
      hHead.position.set(0, 2.42, 0);
      hanlanGrp.add(hHead);
      const hCap = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.25, 0.1, 8), bronzeMat);
      hCap.position.set(0, 2.58, 0.03);
      hanlanGrp.add(hCap);
      [-1, 1].forEach(side => {
        const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.75, 6), bronzeMat);
        arm.position.set(side * 0.34, 1.92, 0.18);
        arm.rotation.z = side * 0.35;
        arm.rotation.x = -0.45;
        hanlanGrp.add(arm);
        const oarShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 3.6, 6), bronzeMat);
        oarShaft.position.set(side * 0.22, 1.65, 0.26);
        oarShaft.rotation.z = side * 0.32;
        hanlanGrp.add(oarShaft);
        const oarBlade = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.78, 0.05), bronzeMat);
        oarBlade.position.set(side * (0.22 - Math.sin(0.32) * 1.6), 1.65 + Math.cos(0.32) * 1.6, 0.26);
        oarBlade.rotation.z = side * 0.32;
        hanlanGrp.add(oarBlade);
      });
      hpg.add(hanlanGrp);
      circOb(hx + 35, hz + 35, 2.3);

      // Two Toronto-authentic Baseball Diamonds with turf outfield, chalk foul lines, bases, mound, dugouts & bleachers
      const dirt = new THREE.MeshLambertMaterial({ color: 0xa0704a });
      const outfieldGrassMat = new THREE.MeshLambertMaterial({ color: 0x2e7d32 });
      const chalkMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
      const baseMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
      const dugoutMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 });
      const fenceWireMat = new THREE.MeshStandardMaterial({ color: 0x9ca3af, metalness: 0.6, roughness: 0.4, transparent: true, opacity: 0.6 });
      [[-800, Z(-25), 0.6], [-760, Z(40), 2.4]].forEach(([dx, dz, rot]) => {
        const dg = new THREE.Group();
        dg.position.set(dx, GROUND_Y, dz);
        dg.rotation.y = rot;

        const turf = new THREE.Mesh(new THREE.CircleGeometry(46, 20, -Math.PI / 4, Math.PI / 2), outfieldGrassMat);
        turf.rotation.x = -Math.PI / 2;
        turf.position.y = 0.015;
        dg.add(turf);

        const inf = new THREE.Mesh(new THREE.CircleGeometry(20, 24, -Math.PI / 4, Math.PI / 2), dirt);
        inf.rotation.x = -Math.PI / 2;
        inf.position.y = 0.03;
        dg.add(inf);

        [-Math.PI / 4, Math.PI / 4].forEach(fa => {
          const line = new THREE.Mesh(new THREE.BoxGeometry(44, 0.03, 0.22), chalkMat);
          line.rotation.y = fa;
          line.position.set(Math.cos(fa) * 22, 0.04, -Math.sin(fa) * 22);
          dg.add(line);
        });

        [[0.8, 0], [11.2, 11.2], [22.0, 0], [11.2, -11.2]].forEach(([bx, bz]) => {
          const bag = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.08, 0.75), baseMat);
          bag.rotation.y = Math.PI / 4;
          bag.position.set(bx, 0.06, bz);
          dg.add(bag);
        });
        const mound = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 2.2, 0.35, 12), dirt);
        mound.position.set(10.5, 0.18, 0);
        dg.add(mound);
        const rubber = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.06, 0.85), baseMat);
        rubber.position.set(10.5, 0.36, 0);
        dg.add(rubber);

        const back = new THREE.Mesh(new THREE.BoxGeometry(0.18, 3.6, 10), fenceWireMat);
        back.position.set(-3.2, 1.8, 0);
        dg.add(back);
        [-13.5, 13.5].forEach(sd => {
          const dug = new THREE.Mesh(new THREE.BoxGeometry(7.2, 2.2, 2.4), dugoutMat);
          dug.position.set(7.0, 1.1, sd);
          dg.add(dug);
          for (let ti = 0; ti < 3; ti++) {
            const plank = new THREE.Mesh(new THREE.BoxGeometry(7.0, 0.16, 0.45), woodMat);
            plank.position.set(16.5, 0.35 + ti * 0.4, sd + (sd > 0 ? 1 : -1) * (1.5 + ti * 0.6));
            dg.add(plank);
          }
        });
        hpg.add(dg);
      });

      // Hanlan's Point Coastal Sand Dunes Fencing, Dune Grass & Beach Sign
      const duneGrassMat = new THREE.MeshLambertMaterial({ color: 0x84a955 });
      const dunePostItems = [];
      const duneTuftItems = [];
      for (let i = 0; i < 24; i++) {
        const gx = -900 + (i * 17) % 240;
        const gz = Z(115 + (i % 5) * 14);
        const gy = terrainH(gx, gz);
        dunePostItems.push({ x: gx, y: gy + 0.55, z: gz, sx: 0.1, sy: 1.1, sz: 0.1 });
        for (let k = 0; k < 3; k++) {
          duneTuftItems.push({
            x: gx + (k - 1) * 1.4,
            y: gy + 0.42,
            z: gz + ((i + k) % 2 === 0 ? 0.9 : -0.9),
            ry: k * 0.9,
            sx: 0.25,
            sy: 0.85,
            sz: 0.25
          });
        }
      }
      addInstMesh(hpg, unitBoxGeo, darkWoodMat, dunePostItems);
      addInstMesh(hpg, unitBoxGeo, duneGrassMat, duneTuftItems);

      const hanlanBeachSign = makeSign(
        ['HANLAN\'S POINT BEACH', 'COASTAL DUNES • WESTERN SHORE BOARDWALK'],
        10, 1.5,
        { bg: '#0f172a', fg: '#fde68a', borderColor: '#f59e0b' }
      );
      hanlanBeachSign.position.set(-865, terrainH(-865, Z(128)) + 2.4, Z(128));
      hanlanBeachSign.rotation.y = Math.PI / 2;
      hpg.add(hanlanBeachSign);

      mergeGroupByMaterial(hpg, { castShadow: true });
      islandsGroup.add(hpg);
    }

    // ------------------------------------------------------------------------
    // Beach Details: Lifeguard Stands (ladder, backrest, buoy) & Pier Details
    // ------------------------------------------------------------------------
    {
      const bg = new THREE.Group();
      const lgWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 });
      const lgRedMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.45 });
      const lgFlagMat = new THREE.MeshBasicMaterial({ color: 0xdc2626, fog: false });
      [[-200, Z(470)], [200, Z(465)], [700, Z(395)], [1180, Z(175)], [-880, Z(150)]].forEach(([x, z]) => {
        const y = terrainH(x, z);
        const seat = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.2, 1.2), lgWhiteMat);
        seat.position.set(x, y + 2.6, z);
        bg.add(seat);
        const backrest = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.85, 0.14), lgWhiteMat);
        backrest.position.set(x, y + 3.05, z - 0.54);
        backrest.rotation.x = -0.15;
        bg.add(backrest);
        const footRest = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.12, 0.6), lgWhiteMat);
        footRest.position.set(x, y + 1.85, z + 0.65);
        bg.add(footRest);
        [-0.6, 0.6].forEach(o => {
          [-0.5, 0.5].forEach(p => {
            const l = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.6, 0.12), lgWhiteMat);
            l.position.set(x + o, y + 1.3, z + p);
            bg.add(l);
          });
        });
        [-0.4, 0.4].forEach(lx => {
          const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.8, 0.08), lgWhiteMat);
          rail.position.set(x + lx, y + 1.35, z - 0.85);
          rail.rotation.x = 0.24;
          bg.add(rail);
        });
        for (let r = 0; r < 5; r++) {
          const rung = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.07, 0.07), lgWhiteMat);
          rung.position.set(x, y + 0.45 + r * 0.48, z - 1.05 + r * 0.11);
          bg.add(rung);
        }
        const buoy = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.72, 0.24), lgRedMat);
        buoy.position.set(x - 0.78, y + 2.25, z + 0.1);
        bg.add(buoy);
        const flagPole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.4, 6), lgWhiteMat);
        flagPole.position.set(x + 0.65, y + 3.35, z - 0.48);
        bg.add(flagPole);
        const flag = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.6, 0.9), lgFlagMat);
        flag.position.set(x + 0.7, y + 3.7, z);
        bg.add(flag);
        circOb(x, z, 1.0);
      });
      mergeGroupByMaterial(bg, { castShadow: true });
      islandsGroup.add(bg);
    }

    // ------------------------------------------------------------------------
    // Landmark: South Beach & Pier Pavilion Complex (Cafe/Grill, Bike Rental, Lockers)
    // Located at the head of the 120m pier along the South Beach Boardwalk (z ~ Z(455))
    // ------------------------------------------------------------------------
    {
      const sbg = new THREE.Group();

      // 1. South Beach Cafe & Grill with Outdoor Beachfront Patio (x = 34, z = Z(455))
      const cafeDeck = new THREE.Mesh(new THREE.BoxGeometry(28, 0.3, 20), woodMat);
      cafeDeck.position.set(34, 0.65, Z(455));
      sbg.add(cafeDeck);

      const cafeBldg = new THREE.Mesh(new THREE.BoxGeometry(22, 4.8, 11), darkWoodMat);
      cafeBldg.position.set(34, 2.9, Z(448));
      sbg.add(cafeBldg);

      const cafeRoof = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 13.5, 2.4, 4, 1), new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.8 }));
      cafeRoof.scale.set(1.1, 1, 0.7);
      cafeRoof.rotation.y = Math.PI / 4;
      cafeRoof.position.set(34, 5.8, Z(448));
      sbg.add(cafeRoof);

      const cafeSign = makeSign(
        ['SOUTH BEACH CAFE & GRILL', 'BEACHFRONT PATIO • BURGERS • ICE CREAM • REFRESHMENTS'],
        20, 2.2,
        { bg: '#854d0e', fg: '#fef08a', borderColor: '#eab308' }
      );
      cafeSign.position.set(34, 5.0, Z(453.7));
      sbg.add(cafeSign);

      // Outdoor Dining Pergola with picnic tables & umbrellas
      [-8, 0, 8].forEach(px => {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3.2, 0.3), darkWoodMat);
        post.position.set(34 + px, 2.1, Z(461));
        sbg.add(post);
      });
      const pergolaBeam = new THREE.Mesh(new THREE.BoxGeometry(19, 0.25, 0.3), darkWoodMat);
      pergolaBeam.position.set(34, 3.7, Z(461));
      sbg.add(pergolaBeam);

      // Patio Tables with Umbrellas
      const tableGeo = new THREE.CylinderGeometry(1.2, 1.2, 0.1, 12);
      const umbrellaGeo = new THREE.ConeGeometry(2.0, 0.9, 12);
      const uColors = [0x3b82f6, 0xfacc15, 0xef4444, 0x10b981];
      [[-7, Z(457)], [0, Z(457)], [7, Z(457)], [-7, Z(462)], [0, Z(462)], [7, Z(462)]].forEach(([tx, tz], i) => {
        const tbl = new THREE.Mesh(tableGeo, woodMat);
        tbl.position.set(34 + tx, 1.35, tz);
        sbg.add(tbl);
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.8, 6), metalMat);
        pole.position.set(34 + tx, 2.0, tz);
        sbg.add(pole);
        const umb = new THREE.Mesh(umbrellaGeo, new THREE.MeshStandardMaterial({ color: uColors[i % uColors.length], roughness: 0.6 }));
        umb.position.set(34 + tx, 3.2, tz);
        sbg.add(umb);
      });
      rectOb(23, 45, Z(442), Z(454));

      // 2. Toronto Island Bicycle Rental Building (x = -34, z = Z(455))
      const bikeDeck = new THREE.Mesh(new THREE.BoxGeometry(26, 0.3, 18), woodMat);
      bikeDeck.position.set(-34, 0.65, Z(455));
      sbg.add(bikeDeck);

      const bikeBldg = new THREE.Mesh(new THREE.BoxGeometry(20, 4.4, 10), new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.6 }));
      bikeBldg.position.set(-34, 2.7, Z(448));
      sbg.add(bikeBldg);

      const bikeRoof = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 12.5, 2.2, 4, 1), new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 }));
      bikeRoof.scale.set(1.1, 1, 0.7);
      bikeRoof.rotation.y = Math.PI / 4;
      bikeRoof.position.set(-34, 5.4, Z(448));
      sbg.add(bikeRoof);

      const bikeSign = makeSign(
        ['TORONTO ISLAND BICYCLE RENTAL', 'QUADRICYCLES (SURREYS) • TANDEM BIKES • CRUISERS'],
        20, 2.2,
        { bg: '#991b1b', fg: '#fef9c3', borderColor: '#f87171' }
      );
      bikeSign.position.set(-34, 4.8, Z(453.2));
      sbg.add(bikeSign);

      // Staged Quadricycle (4-wheel Surrey) Carts & Tandem Bicycles
      function makeSurrey(col, sx, sz) {
        const sg = new THREE.Group();
        const frame = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.3, 2.8), new THREE.MeshStandardMaterial({ color: col, roughness: 0.4 }));
        frame.position.y = 0.5;
        sg.add(frame);
        [-0.8, 0.8].forEach(wx => {
          [-1.1, 1.1].forEach(wz => {
            const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.12, 12), metalMat);
            wh.rotation.z = Math.PI / 2;
            wh.position.set(wx, 0.35, wz);
            sg.add(wh);
          });
        });
        const canopy = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.15, 2.9), new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.6 }));
        canopy.position.y = 1.85;
        sg.add(canopy);
        [-0.75, 0.75].forEach(cx => {
          [-1.3, 1.3].forEach(cz => {
            const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.35, 6), metalMat);
            post.position.set(cx, 1.2, cz);
            sg.add(post);
          });
        });
        sg.position.set(sx, 0.65, sz);
        return sg;
      }
      sbg.add(makeSurrey(0xef4444, -40, Z(459)));
      sbg.add(makeSurrey(0x2563eb, -34, Z(459)));
      sbg.add(makeSurrey(0x16a34a, -28, Z(459)));
      rectOb(-44, -24, Z(443), Z(453));

      // 3. Beach Lockers & Changing Pavilion (x = -10, z = Z(452))
      const lockerBldg = new THREE.Mesh(new THREE.BoxGeometry(12, 4.2, 9), new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.8 }));
      lockerBldg.position.set(-10, 2.6, Z(450));
      sbg.add(lockerBldg);

      const lockerSign = makeSign(
        ['BEACH LOCKERS & CHANGING ROOMS', 'PUBLIC WASHROOMS • RINSE SHOWERS'],
        13, 1.7,
        { bg: '#1e3a8a', fg: '#bae6fd', borderColor: '#38bdf8' }
      );
      lockerSign.position.set(-10, 4.5, Z(454.7));
      sbg.add(lockerSign);

      // Outdoor Fresh-Water Rinse Showers on concrete pad
      const showerPad = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.1, 3.5), new THREE.MeshStandardMaterial({ color: 0x94a3b8 }));
      showerPad.position.set(-10, 0.6, Z(457.5));
      sbg.add(showerPad);
      [-0.8, 0.8].forEach(sx => {
        const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.6, 8), metalMat);
        pipe.position.set(-10 + sx, 1.8, Z(457.5));
        sbg.add(pipe);
        const head = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.05, 0.1, 8), metalMat);
        head.position.set(-10 + sx, 3.0, Z(457.5));
        sbg.add(head);
      });
      rectOb(-16, -4, Z(445), Z(455));

      // 4. Lifeguard Watchtower at pier entrance (x = 0, z = Z(466))
      const lgTower = new THREE.Group();
      [-1.4, 1.4].forEach(tx => {
        [-1.4, 1.4].forEach(tz => {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 5.6, 6), woodMat);
          leg.position.set(tx, 2.8, tz);
          lgTower.add(leg);
        });
      });
      const lgDeck = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.3, 3.6), woodMat);
      lgDeck.position.y = 5.4;
      lgTower.add(lgDeck);
      const lgRoof = new THREE.Mesh(new THREE.ConeGeometry(2.8, 1.2, 4), new THREE.MeshStandardMaterial({ color: 0xdc2626 }));
      lgRoof.rotation.y = Math.PI / 4;
      lgRoof.position.y = 7.4;
      lgTower.add(lgRoof);
      const lgFlag = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.7, 1.2), new THREE.MeshBasicMaterial({ color: 0xdc2626, fog: false }));
      lgFlag.position.set(0, 8.4, 0.6);
      lgTower.add(lgFlag);
      lgTower.position.set(0, 0.55, Z(466));
      sbg.add(lgTower);
      circOb(0, Z(466), 1.6);

      islandsGroup.add(sbg);
    }

    // ------------------------------------------------------------------------
    // Wildlife (Instanced): Flocks of Canada Geese & Seagulls along the pier
    // ------------------------------------------------------------------------
    const grazingGeese = [];
    let gooseNeckInst = null, gooseHeadInst = null, gooseChinInst = null, gooseBillInst = null;
    function updateGooseInstances(timeSec) {
      if (!gooseNeckInst || grazingGeese.length === 0) return;
      for (let i = 0; i < grazingGeese.length; i++) {
        const g = grazingGeese[i];
        const peck = Math.sin(timeSec * g.speed + g.phase) * 0.42;
        const tilt = -0.28 + peck;
        const S = 1.25;
        const ux = -Math.sin(tilt), uy = Math.cos(tilt);
        const nx = (0.22 + ux * 0.24) * S, ny = (0.45 + uy * 0.24) * S;
        const hx = (0.22 + ux * 0.50) * S, hy = (0.45 + uy * 0.50) * S;
        const cosY = Math.cos(g.rotY), sinY = Math.sin(g.rotY);

        _e.set(0, g.rotY, tilt, 'YXZ');
        _q.setFromEuler(_e);
        _v.set(g.gx + nx * cosY, g.gy + ny, g.gz - nx * sinY);
        _sc.set(S, S, S);
        _m4.compose(_v, _q, _sc);
        gooseNeckInst.setMatrixAt(i, _m4);

        _e.set(0, g.rotY, 0, 'YXZ');
        _q.setFromEuler(_e);
        _v.set(g.gx + hx * cosY, g.gy + hy, g.gz - hx * sinY);
        _m4.compose(_v, _q, _sc);
        gooseHeadInst.setMatrixAt(i, _m4);

        _v.set(g.gx + (hx + 0.01) * cosY, g.gy + hy - 0.02 * S, g.gz - (hx + 0.01) * sinY);
        _m4.compose(_v, _q, _sc);
        gooseChinInst.setMatrixAt(i, _m4);

        _e.set(0, g.rotY, -Math.PI / 2, 'YXZ');
        _q.setFromEuler(_e);
        _v.set(g.gx + (hx + 0.13 * S) * cosY, g.gy + hy - 0.01 * S, g.gz - (hx + 0.13 * S) * sinY);
        _m4.compose(_v, _q, _sc);
        gooseBillInst.setMatrixAt(i, _m4);
      }
      gooseNeckInst.instanceMatrix.needsUpdate = true;
      gooseHeadInst.instanceMatrix.needsUpdate = true;
      gooseChinInst.instanceMatrix.needsUpdate = true;
      gooseBillInst.instanceMatrix.needsUpdate = true;
    }

    {
      const wg = new THREE.Group();
      const gooseBodyMat = new THREE.MeshStandardMaterial({ color: 0x4a433b, roughness: 0.8 });
      const gooseBlackMat = new THREE.MeshStandardMaterial({ color: 0x171717, roughness: 0.7 });
      const gooseWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc });

      const gooseFlocks = [
        { cx: 16, cz: Z(25), count: 6, r: 8 },
        { cx: 32, cz: Z(105), count: 5, r: 8 },
        { cx: 0, cz: Z(315), count: 6, r: 10 },
        { cx: 260, cz: Z(150), count: 6, r: 12 },
        { cx: -160, cz: Z(325), count: 8, r: 18 },
        { cx: 110, cz: Z(230), count: 6, r: 12 },
        { cx: 580, cz: Z(290), count: 6, r: 14 },
        { cx: -25, cz: Z(430), count: 5, r: 10 }
      ];

      const gooseBodyItems = [];
      gooseFlocks.forEach(flock => {
        for (let i = 0; i < flock.count; i++) {
          const a = rnd() * Math.PI * 2, d = rnd() * flock.r;
          const gx = flock.cx + Math.cos(a) * d, gz = flock.cz + Math.sin(a) * d;
          if (landField(gx, gz) > 2) {
            const gy = terrainH(gx, gz);
            const rotY = rnd() * Math.PI * 2;
            const S = 1.25;
            gooseBodyItems.push({ x: gx, y: gy + 0.35 * S, z: gz, ry: rotY, sx: 1.4 * S, sy: 0.75 * S, sz: 0.85 * S });
            grazingGeese.push({ gx, gy, gz, rotY, phase: rnd() * 6.28, speed: 1.5 + rnd() });
          }
        }
      });

      const gooseCount = grazingGeese.length;
      if (gooseCount > 0) {
        addInstMesh(wg, new THREE.SphereGeometry(0.32, 10, 8), gooseBodyMat, gooseBodyItems);
        gooseNeckInst = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.06, 0.08, 0.5, 8), gooseBlackMat, gooseCount);
        gooseHeadInst = new THREE.InstancedMesh(new THREE.SphereGeometry(0.09, 8, 6), gooseBlackMat, gooseCount);
        gooseChinInst = new THREE.InstancedMesh(new THREE.BoxGeometry(0.08, 0.08, 0.16), gooseWhiteMat, gooseCount);
        gooseBillInst = new THREE.InstancedMesh(new THREE.ConeGeometry(0.04, 0.16, 6), gooseBlackMat, gooseCount);
        wg.add(gooseNeckInst);
        wg.add(gooseHeadInst);
        wg.add(gooseChinInst);
        wg.add(gooseBillInst);
        updateGooseInstances(0);
      }

      // Seagulls perched along the Centre Island Pier railings (x = ±5.8, y = 1.5)
      const gullWhite = new THREE.MeshBasicMaterial({ color: 0xf1f5f9 });
      const gullGrey = new THREE.MeshBasicMaterial({ color: 0x94a3b8 });
      const gullBeak = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
      const gullBodyItems = [], gullWingItems = [], gullBeakItems = [];
      for (let pz = Z(475); pz <= Z(580); pz += 12) {
        [-5.8, 5.8].forEach(px => {
          if (rnd() < 0.6) {
            const ry = px > 0 ? -1.2 : 1.2;
            const c = Math.cos(ry), s = Math.sin(ry);
            gullBodyItems.push({ x: px, y: 1.5, z: pz, ry, sx: 1.4, sy: 0.7, sz: 0.8 });
            gullWingItems.push({ x: px - 0.05 * c, y: 1.58, z: pz + 0.05 * s, ry, sx: 0.25, sy: 0.08, sz: 0.35 });
            gullBeakItems.push({ x: px + 0.28 * c, y: 1.55, z: pz - 0.28 * s, ry, rz: -Math.PI / 2, sx: 1, sy: 1, sz: 1 });
          }
        });
      }
      addInstMesh(wg, new THREE.SphereGeometry(0.18, 8, 6), gullWhite, gullBodyItems);
      addInstMesh(wg, unitBoxGeo, gullGrey, gullWingItems);
      addInstMesh(wg, new THREE.ConeGeometry(0.04, 0.16, 5), gullBeak, gullBeakItems);
      islandsGroup.add(wg);
    }

    // ------------------------------------------------------------------------
    // Wildlife and Boats: Instanced Swans, Moored Canoes, IYC Sailboats, Breakwaters & Ferries
    // ------------------------------------------------------------------------
    const _laneOut = { x: 0, z: 0, tx: 1, tz: 0 };
    function lanePoint(ch, dist, out) {
      const r = out || _laneOut;
      let acc = 0;
      for (let i = 1; i < ch.pts.length; i++) {
        const a = ch.pts[i - 1], b = ch.pts[i], seg = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (acc + seg >= dist || i === ch.pts.length - 1) {
          const t = Math.max(0, Math.min(1, (dist - acc) / (seg || 1)));
          r.x = a[0] + (b[0] - a[0]) * t;
          r.z = a[1] + (b[1] - a[1]) * t;
          r.tx = (b[0] - a[0]) / (seg || 1);
          r.tz = (b[1] - a[1]) / (seg || 1);
          return r;
        }
        acc += seg;
      }
      r.x = ch.pts[0][0]; r.z = ch.pts[0][1]; r.tx = 1; r.tz = 0;
      return r;
    }

    const swimmers = [];
    let swanBodyInst = null, swanNeckInst = null, swanHeadInst = null, swanBeakInst = null, swanWingInst = null;
    function updateSwanInstances(timeSec) {
      if (!swanBodyInst || swimmers.length === 0) return;
      for (let i = 0; i < swimmers.length; i++) {
        const sw = swimmers[i];
        const lp = lanePoint(sw.ch, sw.s, _laneOut);
        const sx = lp.x - lp.tz * sw.lane;
        const sz = lp.z + lp.tx * sw.lane;
        const sy = WATER_Y + Math.sin(timeSec * 1.3 + sw.bob) * 0.04;
        const dx = lp.tx * sw.dir, dz = lp.tz * sw.dir;
        const yaw = Math.atan2(-dz, dx);
        const c = Math.cos(yaw), s = Math.sin(yaw);

        _e.set(0, yaw, 0, 'YXZ');
        _q.setFromEuler(_e);
        _v.set(sx, sy, sz);
        _sc.set(1.4, 0.75, 0.85);
        _m4.compose(_v, _q, _sc);
        swanBodyInst.setMatrixAt(i, _m4);

        _v.set(sx - 0.08 * c, sy + 0.14, sz + 0.08 * s);
        _sc.set(0.55, 0.35, 0.45);
        _m4.compose(_v, _q, _sc);
        swanWingInst.setMatrixAt(i, _m4);

        _e.set(0, yaw, -0.35, 'YXZ');
        _q.setFromEuler(_e);
        _v.set(sx + 0.4 * c, sy + 0.35, sz - 0.4 * s);
        _sc.set(1, 1, 1);
        _m4.compose(_v, _q, _sc);
        swanNeckInst.setMatrixAt(i, _m4);

        _e.set(0, yaw, 0, 'YXZ');
        _q.setFromEuler(_e);
        _v.set(sx + 0.52 * c, sy + 0.68, sz - 0.52 * s);
        _m4.compose(_v, _q, _sc);
        swanHeadInst.setMatrixAt(i, _m4);

        _e.set(0, yaw, -Math.PI / 2, 'YXZ');
        _q.setFromEuler(_e);
        _v.set(sx + 0.66 * c, sy + 0.65, sz - 0.66 * s);
        _m4.compose(_v, _q, _sc);
        swanBeakInst.setMatrixAt(i, _m4);
      }
      swanBodyInst.instanceMatrix.needsUpdate = true;
      swanWingInst.instanceMatrix.needsUpdate = true;
      swanNeckInst.instanceMatrix.needsUpdate = true;
      swanHeadInst.instanceMatrix.needsUpdate = true;
      swanBeakInst.instanceMatrix.needsUpdate = true;
    }

    {
      const boatGrp = new THREE.Group();
      const white = new THREE.MeshLambertMaterial({ color: 0xffffff });
      const beak = new THREE.MeshLambertMaterial({ color: 0xea580c });

      const activeChannels = [CHANNELS[0], CHANNELS[1], CHANNELS[3]];
      activeChannels.forEach((ch, ci) => {
        let total = 0;
        for (let i = 1; i < ch.pts.length; i++) total += Math.hypot(ch.pts[i][0] - ch.pts[i - 1][0], ch.pts[i][1] - ch.pts[i - 1][1]);
        for (let k = 0; k < 3; k++) {
          swimmers.push({
            ch,
            L: total,
            s: (total / 3) * k + ci * 12,
            speed: 1.2 + rnd() * 0.7,
            dir: k % 2 === 0 ? 1 : -1,
            lane: (rnd() - 0.5) * (ch.w * 0.4),
            bob: rnd() * 6.28
          });
        }
      });

      const swanCount = swimmers.length;
      if (swanCount > 0) {
        swanBodyInst = new THREE.InstancedMesh(new THREE.SphereGeometry(0.45, 10, 7), white, swanCount);
        swanWingInst = new THREE.InstancedMesh(new THREE.SphereGeometry(0.55, 8, 6), white, swanCount);
        swanNeckInst = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.08, 0.12, 0.65, 7), white, swanCount);
        swanHeadInst = new THREE.InstancedMesh(new THREE.SphereGeometry(0.12, 8, 6), white, swanCount);
        swanBeakInst = new THREE.InstancedMesh(new THREE.ConeGeometry(0.06, 0.22, 6), beak, swanCount);
        boatGrp.add(swanBodyInst);
        boatGrp.add(swanWingInst);
        boatGrp.add(swanNeckInst);
        boatGrp.add(swanHeadInst);
        boatGrp.add(swanBeakInst);
        updateSwanInstances(0);
      }

      // Moored canoes
      [[-60, Z(255), 0.4, 0x15803d], [140, Z(265), -0.3, 0xb91c1c], [260, Z(385), 0.7, 0x1d4ed8]].forEach(([x, z, r, c]) => {
        const cn = new THREE.Group();
        const hull = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.55, 0.8), new THREE.MeshStandardMaterial({ color: c, roughness: 0.6 }));
        hull.position.y = 0.2;
        cn.add(hull);
        const seat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.7), darkWoodMat);
        seat.position.set(-0.6, 0.35, 0);
        cn.add(seat);
        cn.position.set(x, WATER_Y, z);
        cn.rotation.y = r;
        boatGrp.add(cn);
        circOb(x, z, 1.8);
      });

      // Island Yacht Club Moored Sailboats in sheltered bays
      const sailHullMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35 });
      const sailTrimMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.4 });
      const mastAlumMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.75, roughness: 0.3 });
      [[205, Z(215), 0.4], [248, Z(238), -0.3], [-310, Z(245), 0.8], [565, Z(185), -0.5], [785, Z(145), 0.2]].forEach(([sx, sz, srot]) => {
        if (landField(sx, sz) > -0.5) return;
        const sb = new THREE.Group();
        sb.position.set(sx, WATER_Y, sz);
        sb.rotation.y = srot;
        const sbHull = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.1, 8.2), sailHullMat);
        sbHull.position.y = 0.45;
        sb.add(sbHull);
        const sbStripe = new THREE.Mesh(new THREE.BoxGeometry(2.68, 0.24, 8.3), sailTrimMat);
        sbStripe.position.y = 0.78;
        sb.add(sbStripe);
        const sbCabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.65, 3.2), sailHullMat);
        sbCabin.position.set(0, 1.25, 0.4);
        sb.add(sbCabin);
        const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 9.5, 6), mastAlumMat);
        mast.position.set(0, 5.7, 0.6);
        sb.add(mast);
        const boom = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.2, 4.2), mastAlumMat);
        boom.position.set(0, 2.35, -1.4);
        sb.add(boom);
        boatGrp.add(sb);
        circOb(sx, sz, 4.2);
      });

      // Offshore Granite Armourstone Beach Breakwaters protecting Toronto Island south shore
      const bwRockGeo = new THREE.DodecahedronGeometry(1.4, 0);
      const bwRockMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.9 });
      const bwItems = [];
      [[-680, Z(315)], [-120, Z(498)], [140, Z(492)], [420, Z(458)]].forEach(([bx, bz]) => {
        for (let bi = -3; bi <= 3; bi++) {
          bwItems.push({
            x: bx + bi * 2.2,
            y: WATER_Y + 0.35 + (bi % 2) * 0.25,
            z: bz + Math.sin(bi) * 0.8,
            ry: bi * 0.8,
            sx: 1.2 + Math.abs(bi % 2) * 0.35,
            sy: 0.85,
            sz: 1.1
          });
        }
      });
      addInstMesh(boatGrp, bwRockGeo, bwRockMat, bwItems);

      mergeGroupByMaterial(boatGrp, { castShadow: true });
      islandsGroup.add(boatGrp);
    }

    // Animated Toronto Harbour Ferry & Marilyn Bell I (only in standalone island viewer; main game uses city.js vessels)
    let ferry = null;
    let marilynBell = null;
    if (!(typeof window !== 'undefined' && window.buildTorontoCity)) {
      ferry = new THREE.Group();
      const fNavyMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.4 });
      const fWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35 });
      const fRedMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.45 });
      const hull = new THREE.Mesh(new THREE.BoxGeometry(10.4, 3.0, 34), fNavyMat);
      hull.position.y = 1.2;
      ferry.add(hull);
      [-17, 17].forEach(bz => {
        const bow = new THREE.Mesh(new THREE.ConeGeometry(5.2, 4.5, 4), fNavyMat);
        bow.rotation.y = Math.PI / 4;
        bow.rotation.x = bz > 0 ? Math.PI / 2 : -Math.PI / 2;
        bow.scale.set(1.2, 1, 0.55);
        bow.position.set(0, 1.3, bz + (bz > 0 ? 1.8 : -1.8));
        ferry.add(bow);
      });
      const deckStrip = new THREE.Mesh(new THREE.BoxGeometry(10.8, 0.3, 35), fWhiteMat);
      deckStrip.position.y = 2.7;
      ferry.add(deckStrip);
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(8.4, 2.8, 22), fWhiteMat);
      cabin.position.set(0, 4.1, 0);
      ferry.add(cabin);
      const cabinWinBand = new THREE.Mesh(new THREE.BoxGeometry(8.52, 1.0, 19.5), warmWinGlowMat);
      cabinWinBand.position.set(0, 4.3, 0);
      ferry.add(cabinWinBand);
      const upperDeck = new THREE.Mesh(new THREE.BoxGeometry(8.8, 0.25, 22.8), woodMat);
      upperDeck.position.set(0, 5.6, 0);
      ferry.add(upperDeck);
      [-7.5, 7.5].forEach(wz => {
        const bridge = new THREE.Mesh(new THREE.BoxGeometry(6.8, 2.0, 4.8), glassMat);
        bridge.position.set(0, 6.7, wz);
        ferry.add(bridge);
      });
      const funnel = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.95, 3.6, 12), fRedMat);
      funnel.position.set(0, 7.2, 0);
      ferry.add(funnel);
      ferry.position.set(0, WATER_Y, Z(-65));
      islandsGroup.add(ferry);

      // Marilyn Bell I Western Gap Cable Ferry (only when city.js absent)
      marilynBell = new THREE.Group();
      const mbHull = new THREE.Mesh(new THREE.BoxGeometry(14, 2.4, 34), fNavyMat);
      mbHull.position.y = 1.0;
      marilynBell.add(mbHull);
      const mbStripe = new THREE.Mesh(new THREE.BoxGeometry(14.3, 0.35, 34.2), fRedMat);
      mbStripe.position.y = 1.8;
      marilynBell.add(mbStripe);
      const mbCabin = new THREE.Mesh(new THREE.BoxGeometry(4.2, 4.0, 12), fWhiteMat);
      mbCabin.position.set(-4.2, 4.2, 0);
      marilynBell.add(mbCabin);
      const mbBridge = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.8, 4.4), glassMat);
      mbBridge.position.set(-4.2, 7.0, 0);
      marilynBell.add(mbBridge);
      marilynBell.position.set(-1060, WATER_Y, Z(-330));
      islandsGroup.add(marilynBell);
    }

    // ------------------------------------------------------------------------
    // Distant 3D Toronto Skyline across Toronto Harbour (Illuminated Night Skyline)
    // Towering skyscrapers with glowing office window grids, illuminated crowns,
    // Rogers Centre blue ring, and the illuminated CN Tower with LED shaft tracks,
    // observation deck window band, and flashing aviation beacons!
    // ------------------------------------------------------------------------
    let cnBeacon = null, towerBeacons = [];
    {
      const skyGrp = new THREE.Group();
      const skyZ = Z(-1600);

      // Procedural 256x512 glowing window texture for skyscraper facades
      const winCan = document.createElement('canvas');
      winCan.width = 256;
      winCan.height = 512;
      const wg = winCan.getContext('2d');
      if (wg) {
        wg.fillStyle = '#090d16'; // dark facade background
        wg.fillRect(0, 0, 256, 512);
        const winCols = ['#fef08a', '#fde047', '#fed7aa', '#bae6fd', '#e0f2fe', '#ffffff'];
        for (let wy = 8; wy < 504; wy += 14) {
          for (let wx = 6; wx < 250; wx += 10) {
            if (Math.random() < 0.65) {
              wg.fillStyle = winCols[Math.floor(Math.random() * winCols.length)];
              wg.fillRect(wx, wy, 6, 8);
            }
          }
        }
      }
      const winTex = new THREE.CanvasTexture(winCan);
      winTex.wrapS = THREE.RepeatWrapping;
      winTex.wrapT = THREE.RepeatWrapping;
      const litTowerMat = new THREE.MeshBasicMaterial({ map: winTex, fog: false });

      // CN Tower (553m) - Full Architectural Detail & Lighting
      const cn = new THREE.Group();
      // Hexagonal tripod base (0-90m)
      const base = new THREE.Mesh(new THREE.ConeGeometry(22, 180, 3), concreteMat);
      base.position.y = 90;
      cn.add(base);

      // Main concrete shaft (90-340m)
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(4.4, 6.2, 250, 12), concreteMat);
      shaft.position.y = 215;
      cn.add(shaft);

      // Dual continuous vertical LED light strips on shaft (Cyan and Magenta)
      const ledStrip1 = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 248, 0.3),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8, fog: false }) // brilliant cyan LED
      );
      ledStrip1.position.set(0, 215, 4.6);
      cn.add(ledStrip1);

      const ledStrip2 = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 248, 0.3),
        new THREE.MeshBasicMaterial({ color: 0xec4899, fog: false }) // brilliant magenta LED
      );
      ledStrip2.position.set(0, 215, -4.6);
      cn.add(ledStrip2);

      // 7-story Main Observation Deck Pod (342-360m)
      const pod = new THREE.Mesh(new THREE.CylinderGeometry(19, 14, 18, 16), concreteMat);
      pod.position.y = 351;
      cn.add(pod);

      // 360-degree glowing observation window band
      const podWindows = new THREE.Mesh(
        new THREE.CylinderGeometry(19.2, 19.2, 5.0, 16),
        new THREE.MeshBasicMaterial({ color: 0xfef08a, fog: false })
      );
      podWindows.position.y = 351;
      cn.add(podWindows);

      // SkyPod (upper observation pod at 447m)
      const skyPod = new THREE.Mesh(new THREE.CylinderGeometry(8.5, 7.0, 10, 12), concreteMat);
      skyPod.position.y = 432;
      cn.add(skyPod);
      const skyPodBand = new THREE.Mesh(
        new THREE.CylinderGeometry(8.6, 8.6, 3.2, 12),
        new THREE.MeshBasicMaterial({ color: 0xfef9c3, fog: false })
      );
      skyPodBand.position.y = 432;
      cn.add(skyPodBand);

      // Transmission Spire / Antenna Mast (447-553m)
      const spire = new THREE.Mesh(new THREE.ConeGeometry(1.8, 118, 8), metalMat);
      spire.position.y = 496;
      cn.add(spire);

      // Flashing summit aviation obstruction beacon at 553m
      cnBeacon = new THREE.Mesh(
        new THREE.SphereGeometry(2.4, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xef4444, fog: false })
      );
      cnBeacon.position.y = 553;
      cn.add(cnBeacon);

      // ------------------------------------------------------------------------
      // Distant Toronto Skyline (Rendered directly from OpenStreetMap TORONTO_MAP)
      // Extracts real-world buildings, exact footprints, heights & landmarks across the harbour:
      // ------------------------------------------------------------------------
      const mapData = (typeof window !== 'undefined' && window.TORONTO_MAP) ? window.TORONTO_MAP : null;
      renderedOsmTowers = 0;

      if (mapData && mapData.buildings && mapData.buildings.length > 0) {
        const towers = [];
        mapData.buildings.forEach(b => {
          if (!b.p || b.p.length < 6) return;
          const h = b.h || 0;
          const name = b.n || '';
          if (h < 22 && name !== 'Rogers Centre') return;

          let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
          let sumX = 0, sumZ = 0, cnt = b.p.length / 2;
          for (let i = 0; i < b.p.length; i += 2) {
            const px = b.p[i], pz = b.p[i + 1];
            if (px < minX) minX = px; if (px > maxX) maxX = px;
            if (pz < minZ) minZ = pz; if (pz > maxZ) maxZ = pz;
            sumX += px; sumZ += pz;
          }
          const cx = sumX / cnt, cz = sumZ / cnt;
          const w = Math.max(16, (maxX - minX) * 0.95);
          const d = Math.max(16, (maxZ - minZ) * 0.95);
          towers.push({ cx, cz, w, d, h, name, m: b.m, c: b.c, rc: b.rc });
        });

        // Sort by height ascending for clean rendering order
        towers.sort((a, b) => a.h - b.h);

        towers.forEach(t => {
          // Skip CN Tower and Rogers Centre from generic box pass (built with custom detailed architecture below)
          if (t.name === 'CN Tower' || Math.hypot(t.cx - (-286.5), t.cz - 159.4) < 35) return;
          if (t.name === 'Rogers Centre' || Math.hypot(t.cx - (-459.9), t.cz - 246.6) < 55) return;

          const posX = t.cx;
          // Scale North-South depth from Queens Quay up to Queen St
          const posZ = skyZ + (t.cz + 200) * 0.42;
          const posY = t.h / 2;

          let towerMat = litTowerMat;
          if (/First Canadian Place/i.test(t.name)) {
            towerMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 });
          } else if (/Scotia Plaza/i.test(t.name)) {
            towerMat = new THREE.MeshStandardMaterial({ color: 0x450a0a, roughness: 0.4 });
          } else if (/Toronto Dominion|TD /i.test(t.name)) {
            towerMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.6 });
          } else if (/Royal Bank Plaza/i.test(t.name)) {
            towerMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.2, metalness: 0.8 });
          } else if (t.c) {
            towerMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(t.c), roughness: 0.5 });
          }

          const towerMesh = new THREE.Mesh(new THREE.BoxGeometry(t.w, t.h, t.d), towerMat);
          towerMesh.position.set(posX, posY, posZ);
          skyGrp.add(towerMesh);
          renderedOsmTowers++;

          // Architectural crowns & summit features for landmark and tall towers
          if (/Scotia Plaza/i.test(t.name)) {
            const scotiaCrown = new THREE.Mesh(new THREE.ConeGeometry(t.w * 0.52, 24, 4), new THREE.MeshBasicMaterial({ color: 0xdc2626, fog: false }));
            scotiaCrown.rotation.y = Math.PI / 4;
            scotiaCrown.position.set(posX, t.h + 12, posZ);
            skyGrp.add(scotiaCrown);
          } else if (/First Canadian Place/i.test(t.name)) {
            const fcpCrown = new THREE.Mesh(new THREE.BoxGeometry(t.w * 0.85, 14, t.d * 0.85), new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false }));
            fcpCrown.position.set(posX, t.h + 7, posZ);
            skyGrp.add(fcpCrown);
            const beacon = new THREE.Mesh(new THREE.SphereGeometry(1.8, 6, 6), new THREE.MeshBasicMaterial({ color: 0xef4444, fog: false }));
            beacon.position.set(posX, t.h + 16, posZ);
            skyGrp.add(beacon);
            towerBeacons.push(beacon);
          } else if (/TD Canada Trust|Toronto Dominion/i.test(t.name)) {
            const tdCrown = new THREE.Mesh(new THREE.BoxGeometry(t.w + 0.5, 6, t.d + 0.5), new THREE.MeshBasicMaterial({ color: 0x16a34a, fog: false }));
            tdCrown.position.set(posX, t.h + 3, posZ);
            skyGrp.add(tdCrown);
          } else if (/Royal Bank Plaza/i.test(t.name)) {
            const rbcCrown = new THREE.Mesh(new THREE.BoxGeometry(t.w + 0.5, 6, t.d + 0.5), new THREE.MeshBasicMaterial({ color: 0xf59e0b, fog: false }));
            rbcCrown.position.set(posX, t.h + 3, posZ);
            skyGrp.add(rbcCrown);
          } else if (/Brookfield|Bay Wellington/i.test(t.name)) {
            const bwpCrown = new THREE.Mesh(new THREE.ConeGeometry(t.w * 0.45, 18, 4), new THREE.MeshBasicMaterial({ color: 0x38bdf8, fog: false }));
            bwpCrown.rotation.y = Math.PI / 4;
            bwpCrown.position.set(posX, t.h + 9, posZ);
            skyGrp.add(bwpCrown);
          } else if (t.h > 120) {
            // Illuminated skyline crown on tall towers
            const crownColors = [0x38bdf8, 0xfacc15, 0x10b981, 0xa855f7, 0xf43f5e];
            const col = crownColors[Math.abs(Math.floor(posX * 13)) % crownColors.length];
            const cr = new THREE.Mesh(new THREE.BoxGeometry(t.w * 0.9, 4.5, t.d * 0.9), new THREE.MeshBasicMaterial({ color: col, fog: false }));
            cr.position.set(posX, t.h + 2.2, posZ);
            skyGrp.add(cr);
            if (t.h > 145) {
              const bcn = new THREE.Mesh(new THREE.SphereGeometry(1.2, 6, 6), new THREE.MeshBasicMaterial({ color: 0xef4444, fog: false }));
              bcn.position.set(posX, t.h + 5.5, posZ);
              skyGrp.add(bcn);
              towerBeacons.push(bcn);
            }
          }
        });
      }

      // CN Tower (553m) at its exact real-world coordinate [-286.5, skyZ + (159.4 + 200) * 0.42]
      cn.position.set(-286.5, 0, skyZ + (159.4 + 200) * 0.42);
      skyGrp.add(cn);

      // Rogers Centre Dome at its exact real-world coordinate [-459.9, skyZ + (246.6 + 200) * 0.42]
      const dome = new THREE.Mesh(new THREE.SphereGeometry(46, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.48), concreteMat);
      const domeRing = new THREE.Mesh(
        new THREE.TorusGeometry(46.2, 1.2, 8, 32),
        new THREE.MeshBasicMaterial({ color: 0x1d4ed8, fog: false }) // bright blue stadium glow
      );
      domeRing.rotation.x = Math.PI / 2;
      const rcZ = skyZ + (246.6 + 200) * 0.42;
      dome.position.set(-459.9, 22, rcZ);
      skyGrp.add(dome);
      domeRing.position.set(-459.9, 24, rcZ);
      skyGrp.add(domeRing);

      // Only add standalone distant skyline if the real city.js is not already present on the same grid
      if (!(typeof window !== 'undefined' && window.buildTorontoCity)) {
        islandsGroup.add(skyGrp);
      }
    }

    scene.add(islandsGroup);

    // ------------------------------------------------------------------------
    // Collision and Walkability API
    // ------------------------------------------------------------------------
    function isInsideIslands(x, z) {
      return z >= Z(-360) && z <= Z(650) && x >= -1650 && x <= 1500;
    }

    function isAirportRunway(x, z) {
      // Billy Bishop Toronto City Airport (CYTZ) Active Airfield & Security Zone
      // Runway 08/26 (x: -1540..-980, z: 1008..1052), Taxiway Alpha (z: 984..1004), Apron & Aircraft Staging
      // Players can freely walk here; citizens / ambient NPCs are kept strictly off active runways
      if (x >= -1575 && x <= -920 && z >= 958 && z <= 1090) return true;
      if (x < -1110 && x >= -1575 && z >= 890 && z <= 1090) return true;
      return false;
    }

    function canMoveTo(x, z, radius, y) {
      const r = radius || 0.4;
      if (y !== undefined && y > 18.0) {
        const dLh = Math.hypot(x - (-480), z - Z(320));
        if (dLh <= 4.0) return dLh >= 2.2 && dLh <= 3.85;
      }
      if (getIslandBridgeAt(x, z)) return true;
      if (pierAt(x, z)) return !blocked(x, z, r);
      if (blocked(x, z, r)) return false;
      if (trunkBlocked(x, z, r)) return false;
      return fastLandField(x, z) > 0.9; // Shoreline and open water block walking
    }

    function floorAt(x, z, y) {
      if (Math.hypot(x - (-480), z - Z(320)) <= 4.0 && y !== undefined && y > 18.0) return 25.2;
      const b = getIslandBridgeAt(x, z);
      if (b) {
        const t = Math.max(0, Math.min(1, ((x - b.x0) * b.fx + (z - b.z0) * b.fz) / b.len));
        return b.yBase + Math.sin(t * Math.PI) * b.archH + 0.15;
      }
      const p = pierAt(x, z);
      if (p) return p.y;
      const h = Math.max(0, fastTerrainH(x, z));
      if (z > Z(380) && distLine(x, z, BOARDWALK.pts) < BOARDWALK.w / 2) return h + 0.32;
      return h;
    }

    function getNeighborhood(x, z) {
      if (isAirport(x, z)) return 'BILLY BISHOP AIRPORT (CYTZ)';
      const b = getIslandBridgeAt(x, z, 2);
      if (b) return b.name.toUpperCase();
      if (pierAt(x, z)) return pierAt(x, z).name.toUpperCase();
      for (const p of PONDS) {
        if (Math.hypot(x - p.x, z - p.z) < p.r + 12) return p.name.toUpperCase();
      }
      for (const c of CHANNELS) {
        if (distLine(x, z, c.pts) < c.w / 2 + 10) return c.name.toUpperCase();
      }
      // Specific landmarks
      if (x >= 260 && x <= 345 && z >= Z(140) && z <= Z(225)) return 'FAR ENOUGH FARM • PETTING FARM';
      if (x >= 135 && x <= 245 && z >= Z(155) && z <= Z(245)) return 'CENTREVILLE TURN-OF-THE-CENTURY VILLAGE';
      if (Math.hypot(x - 160, z - Z(165)) < 16) return 'CENTREVILLE RAILWAY STATION';
      if (x >= 25 && x <= 135 && z >= Z(155) && z <= Z(210)) return 'WOODED PATH TO CENTREVILLE';
      if (x >= 50 && x <= 80 && z >= Z(50) && z <= Z(95)) return 'TORONTO ISLAND BBQ & BEER CO. PATIO';
      if (Math.hypot(x - 12, z - Z(48)) < 12) return 'PIZZA PIZZA • ISLAND CONCESSIONS';
      if (Math.hypot(x - 12, z - Z(66)) < 12) return 'SUBWAY • FRESH SUBS';
      if (Math.hypot(x - 12, z - Z(88)) < 14) return 'PARK WASHROOMS & PUBLIC LOCKERS';
      if (x >= -25 && x <= 45 && z >= Z(-15) && z <= Z(115)) return 'CENTRE ISLAND ARRIVAL PLAZA';
      if (Math.hypot(x, z - Z(310)) < 26) return 'AVENUE OF THE ISLANDS • GRAND FOUNTAIN';
      if (Math.abs(x) < 45 && z >= Z(330) && z <= Z(425)) return 'GRAND FORMAL GARDENS & REFLECTING POOLS';
      if (x >= -105 && x <= -25 && z >= Z(350) && z <= Z(425)) return 'WILLIAM MEANY HEDGE MAZE';
      if (Math.hypot(x - 34, z - Z(455)) < 22) return 'SOUTH BEACH CAFE & PATIO';
      if (Math.hypot(x + 34, z - Z(455)) < 22) return 'TORONTO ISLAND BICYCLE RENTAL';
      if (Math.hypot(x + 10, z - Z(452)) < 15) return 'BEACH LOCKERS & PAVILION';
      if (Math.hypot(x + 480, z - Z(320)) < 45) return 'GIBRALTAR POINT • 1808 LIGHTHOUSE';
      if (Math.hypot(x + 160, z - Z(330)) < 70) return 'OLYMPIC ISLAND';
      if (Math.hypot(x + 780, z - Z(0)) < 85) return 'HANLAN\'S POINT • BALL DIAMONDS';
      const L = fastLandField(x, z);
      if (x > -905 && zS(x) - z < 60) {
        if (x < -560) return 'HANLAN\'S BEACH';
        if (x < -280) return 'GIBRALTAR POINT BEACH';
        if (x < 300) return 'CENTRE ISLAND BEACH & PIER';
        return 'WARD\'S ISLAND BEACH & BOARDWALK';
      }
      if (x > 380 && x < 740 && z < Z(195)) return 'ALGONQUIN ISLAND • COTTAGES';
      if (x > 760) return 'WARD\'S ISLAND • SUMMER VILLAGE';
      if (x < -560) return 'HANLAN\'S POINT';
      if (forestDensity(x, z, L) > 0.5) return 'ISLAND WOODS • FOREST TRAIL';
      if (Math.abs(x) < 45 && z < Z(245)) return 'AVENUE OF THE ISLANDS';
      if (x < -280) return 'GIBRALTAR POINT WOODS';
      return 'CENTRE ISLAND PARK';
    }

    // ------------------------------------------------------------------------
    // Animation Loop (Distance-Gated & Zero-Allocation)
    // ------------------------------------------------------------------------
    let tTime = 0, ferryT = 0, miniTrainT = 0;
    function update(dt, playerPos) {
      tTime += dt;
      const hasPlayer = !!playerPos;
      const aboveGround = !hasPlayer || playerPos.y >= -4.0;

      // Flashing CN Tower & skyscraper obstruction beacons when above ground
      if (aboveGround && cnBeacon) {
        const flash = (Math.sin(tTime * 3.5) > 0.3) ? 1.0 : 0.12;
        cnBeacon.visible = flash > 0.5;
        for (let i = 0; i < towerBeacons.length; i++) towerBeacons[i].visible = flash > 0.5;
      }

      // Keep all Porter Q400 propellers spinning smoothly whenever above ground
      // (including in-flight over downtown north of z=450 and from waterfront viewpoints!)
      if (aboveGround) {
        for (let i = 0; i < q400Propellers.length; i++) {
          const p = q400Propellers[i];
          if (p.hub && p.speed) p.hub.rotation.z += dt * p.speed;
        }
      }

      // Skip remaining off-island kinetic updates when player is underground or far north downtown
      if (hasPlayer && (playerPos.y < -4.0 || playerPos.z < 450)) return;

      const flyingHigh = hasPlayer && playerPos.y > 20;
      const nearCentreville = !hasPlayer || flyingHigh || Math.hypot(playerPos.x - 160, playerPos.z - Z(200)) < 750;
      const nearGardens = !hasPlayer || flyingHigh || Math.hypot(playerPos.x, playerPos.z - Z(360)) < 650;
      const nearLighthouse = !hasPlayer || flyingHigh || Math.hypot(playerPos.x + 480, playerPos.z - Z(320)) < 700;
      const nearAirport = !hasPlayer || flyingHigh || Math.hypot(playerPos.x + 1200, playerPos.z - Z(-160)) < 1100;
      const nearWild = !hasPlayer || flyingHigh || Math.hypot(playerPos.x, playerPos.z - Z(250)) < 1400;

      if (nearCentreville) {
        if (ferrisWheelMesh) {
          ferrisWheelMesh.rotation.x += dt * 0.22;
          const uprightRot = -ferrisWheelMesh.rotation.x;
          for (let i = 0; i < ferrisCarts.length; i++) {
            ferrisCarts[i].rotation.x = uprightRot;
          }
        }
        if (carouselTop) carouselTop.rotation.y += dt * 0.6;
        for (let i = 0; i < carouselHorses.length; i++) {
          const ch = carouselHorses[i];
          ch.mesh.position.y = ch.baseY + Math.sin(tTime * 3.2 + ch.phase) * 0.28;
        }
        if (miniTrain) {
          miniTrainT = (miniTrainT + dt * 0.016) % 1.0;
          const tr = evalTrainTrack(miniTrainT, _trainOut);
          miniTrain.position.set(tr.x, GROUND_Y + 0.12, tr.z);
          miniTrain.rotation.y = tr.yaw;
          for (let i = 0; i < miniTrainPuffs.length; i++) {
            const p = miniTrainPuffs[i];
            const cycle = (tTime * 1.4 + p.phase) % 1.0;
            p.mesh.position.y = 1.85 + cycle * 1.1;
            p.mesh.position.z = 1.0 - cycle * 1.05;
            p.mesh.scale.setScalar(0.55 + cycle * 1.05);
          }
          for (let i = 0; i < miniTrainCars.length; i++) {
            const c = miniTrainCars[i];
            const cr = evalTrainTrack(miniTrainT - c.offset, _trainOut);
            c.mesh.position.set(cr.x, GROUND_Y + 0.12, cr.z);
            c.mesh.rotation.y = cr.yaw;
          }
        }
      }

      if (nearGardens) {
        if (fountainSpray) fountainSpray.scale.y = 0.95 + Math.sin(tTime * 4.5) * 0.12;
        for (let ji = 0; ji < poolJets.length; ji++) {
          poolJets[ji].scale.y = 0.85 + Math.sin(tTime * 5.0 + ji * 1.4) * 0.3;
        }
      }

      if (nearLighthouse) {
        if (lighthouseBeacon) lighthouseBeacon.rotation.y += dt * 1.8;
        if (radelmuellerGhost) {
          radelmuellerGhost.position.y = 25.4 + Math.sin(tTime * 2.2) * 0.12;
          radelmuellerGhost.rotation.y = Math.sin(tTime * 0.9) * 0.18;
        }
      }

      if (nearAirport) {
        if (radarDish) radarDish.rotation.y += dt * 3.2;
        if (windsockCone) windsockCone.rotation.y = Math.sin(tTime * 1.8) * 0.25;
      }

      if (nearWild) {
        updateGooseInstances(tTime);
        for (let i = 0; i < swimmers.length; i++) {
          const sw = swimmers[i];
          sw.s += sw.dir * sw.speed * dt;
          if (sw.s < 3) { sw.s = 3; sw.dir = 1; }
          if (sw.s > sw.L - 3) { sw.s = sw.L - 3; sw.dir = -1; }
        }
        updateSwanInstances(tTime);
      }

      // Standalone Harbour Ferry & Marilyn Bell I (only built when city.js absent)
      if (ferry || marilynBell) {
        ferryT = (ferryT + dt) % 70;
        if (ferry) {
          const k = ferryT < 12 ? 0 : ferryT < 35 ? (ferryT - 12) / 23 : ferryT < 47 ? 1 : 1 - (ferryT - 47) / 23;
          const e = k * k * (3 - 2 * k);
          ferry.position.set(e * 320, WATER_Y, Z(-65) - e * 480);
        }
        if (marilynBell) {
          const mbS = 0.5 - 0.5 * Math.cos((tTime * 0.16) % (Math.PI * 2));
          marilynBell.position.set(-1060, WATER_Y, Z(-312) - mbS * 68);
        }
      }
    }

    // ------------------------------------------------------------------------
    // Minimap: Pre-rendered Terrain Canvas & Player-Centred Window
    // ------------------------------------------------------------------------
    const MM = document.createElement('canvas');
    MM.width = NX;
    MM.height = NZ;
    {
      const g = MM.getContext('2d');
      if (g && g.createImageData) {
        const img = g.createImageData(NX, NZ);
        for (let j = 0; j < NZ; j++) {
          for (let i = 0; i < NX; i++) {
            const L = Lgrid[j * NX + i], x = GX0 + i * STEP, z = GZ0 + j * STEP, o = (j * NX + i) * 4;
            let c;
            if (L <= 0) c = L > -3 ? [40, 120, 150] : [20, 82, 120];
            else if (isAirport(x, z)) c = [110, 112, 118];
            else if (isSand(x, z, L)) c = [222, 204, 150];
            else {
              const f = forestDensity(x, z, L);
              c = f > 0.35 ? [30, 84, 40] : [74, 150, 64];
            }
            img.data[o] = c[0];
            img.data[o + 1] = c[1];
            img.data[o + 2] = c[2];
            img.data[o + 3] = 255;
          }
        }
        g.putImageData(img, 0, 0);
        const toPx = (x, z) => [(x - GX0) / STEP, (z - GZ0) / STEP];
        g.lineCap = 'round';
        PATHS.forEach(p => {
          g.strokeStyle = p.kind === 'boardwalk' ? '#b08a5a' : (p.kind === 'gravel' ? '#e5dcc6' : '#cbd5e1');
          g.lineWidth = Math.max(1, p.w / STEP);
          g.beginPath();
          p.pts.forEach((q, i) => {
            const [a, b] = toPx(q[0], q[1]);
            i ? g.lineTo(a, b) : g.moveTo(a, b);
          });
          g.stroke();
        });
        g.strokeStyle = '#8b5a2b';
        g.lineWidth = 2;
        bridges.forEach(b => {
          const a = toPx(b.x0, b.z0), c = toPx(b.x1, b.z1);
          g.beginPath();
          g.moveTo(a[0], a[1]);
          g.lineTo(c[0], c[1]);
          g.stroke();
        });
      }
    }

    function drawMinimap(ctx, size, playerPos, playerYaw, dots) {
      if (!ctx) return;
      const VIEW = 700; // metres across
      const sx = (playerPos.x - VIEW / 2 - GX0) / STEP, sz = (playerPos.z - VIEW / 2 - GZ0) / STEP;
      ctx.fillStyle = '#145276';
      ctx.fillRect(0, 0, size, size);

      if (ctx.drawImage) {
        try {
          ctx.imageSmoothingEnabled = true;
          ctx.drawImage(MM, sx, sz, VIEW / STEP, VIEW / STEP, 0, 0, size, size);
        } catch (e) { }
      }

      const toM = (x, z) => [(x - playerPos.x) / VIEW * size + size / 2, (z - playerPos.z) / VIEW * size + size / 2];
      ctx.font = 'bold 9px sans-serif';
      ctx.fillStyle = '#f8fafc';
      [
        ['FERRY', 0, Z(-5)],
        ['BBQ', 65, Z(65)],
        ['VILLAGE', 180, Z(185)],
        ['TRAIN', 160, Z(165)],
        ['FARM', 295, Z(185)],
        ['FOUNTAIN', 0, Z(310)],
        ['GARDENS', 0, Z(380)],
        ['MAZE', -65, Z(385)],
        ['CAFE', 34, Z(455)],
        ['BIKES', -34, Z(455)],
        ['AIRPORT', -1260, Z(-200)],
        ['LIGHTHOUSE', -480, Z(320)],
        ['WARD\'S', 1000, Z(30)],
        ['ALGONQUIN', 520, Z(60)],
        ['HANLAN\'S', -760, Z(-40)],
        ['OLYMPIC', -160, Z(330)]
      ].forEach(([t, x, z]) => {
        const [a, b] = toM(x, z);
        if (a > -40 && a < size + 40 && b > 0 && b < size) {
          ctx.fillText(t, a - ctx.measureText(t).width / 2, b);
        }
      });

      (dots || []).forEach(d => {
        const [a, b] = toM(d.x, d.z);
        if (d.isPlayer) {
          const dx = a - size / 2, dy = b - size / 2;
          const distPx = Math.hypot(dx, dy);
          const radLim = size / 2 - 12;
          const off = distPx > radLim;
          const px = off ? (size / 2 + (dx / distPx) * radLim) : a;
          const py = off ? (size / 2 + (dy / distPx) * radLim) : b;
          const col = d.c || '#38bdf8';
          const ang = off ? (Math.atan2(dy, dx) + Math.PI / 2) : (-(d.yaw || 0));

          ctx.save();
          ctx.translate(px, py);
          ctx.rotate(ang);
          ctx.fillStyle = col;
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(0, -10);
          ctx.lineTo(-5.5, -2);
          ctx.lineTo(5.5, -2);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.restore();

          ctx.save();
          ctx.translate(px, py);
          ctx.beginPath();
          ctx.arc(0, 0, 6.2, 0, Math.PI * 2);
          ctx.fillStyle = col;
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.8;
          ctx.stroke();
          ctx.fillStyle = '#0f172a';
          ctx.font = 'bold 8px Arial';
          ctx.textAlign = 'center';
          ctx.fillText((d.initial || 'P'), 0, 3);
          ctx.restore();
          return;
        }
        if (a < 0 || b < 0 || a > size || b > size) return;
        ctx.fillStyle = d.c || '#ef4444';
        ctx.beginPath();
        ctx.arc(a, b, d.r || 2.5, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.save();
      ctx.translate(size / 2, size / 2);
      ctx.rotate(-playerYaw);
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(0, -7);
      ctx.lineTo(5, 6);
      ctx.lineTo(0, 3);
      ctx.lineTo(-5, 6);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.strokeRect(1, 1, size - 2, size - 2);
    }

    function setTimeOfDay(isDay) {
      if (waterMat && waterMat.color) {
        if (typeof waterMat.color.setHex === 'function') waterMat.color.setHex(isDay ? 0x165e85 : 0x0e3a5c);
        waterMat.roughness = isDay ? 0.22 : 0.16;
        waterMat.metalness = isDay ? 0.45 : 0.72;
        waterMat.envMapIntensity = isDay ? 0.85 : 1.15;
      }
      if (lampGlowMat && lampGlowMat.color && typeof lampGlowMat.color.setHex === 'function') {
        lampGlowMat.color.setHex(isDay ? 0xdbeafe : 0xffd58a);
      }
      if (warmWinGlowMat) {
        if (warmWinGlowMat.color && typeof warmWinGlowMat.color.setHex === 'function') warmWinGlowMat.color.setHex(isDay ? 0x64748b : 0xfef08a);
        if (warmWinGlowMat.emissive && typeof warmWinGlowMat.emissive.setHex === 'function') warmWinGlowMat.emissive.setHex(isDay ? 0x334155 : 0xfef08a);
        warmWinGlowMat.emissiveIntensity = isDay ? 0.08 : 0.95;
      }
      if (termGlowMat) {
        if (termGlowMat.color && typeof termGlowMat.color.setHex === 'function') termGlowMat.color.setHex(isDay ? 0x94a3b8 : 0xfef3c7);
        if (termGlowMat.emissive && typeof termGlowMat.emissive.setHex === 'function') termGlowMat.emissive.setHex(isDay ? 0x475569 : 0xfef3c7);
        termGlowMat.emissiveIntensity = isDay ? 0.12 : 0.9;
      }
      if (clkMat) {
        if (clkMat.color && typeof clkMat.color.setHex === 'function') clkMat.color.setHex(isDay ? 0xf8fafc : 0xfef9c3);
        clkMat.emissiveIntensity = isDay ? 0.12 : 0.8;
      }
      if (cabinWinMat) {
        if (cabinWinMat.color && typeof cabinWinMat.color.setHex === 'function') cabinWinMat.color.setHex(isDay ? 0x38bdf8 : 0xbae6fd);
        cabinWinMat.emissiveIntensity = isDay ? 0.08 : 0.6;
      }
      if (beaconBeamMat) {
        beaconBeamMat.opacity = isDay ? 0.04 : 0.22;
      }
    }

    return {
      group: islandsGroup,
      Z_BASE,
      isInsideIslands,
      isAirportRunway,
      canMoveTo,
      floorAt,
      getNeighborhood,
      nearPath,
      flowerBeds,
      flightPlane,
      setTimeOfDay,
      lighthouse: {
        x: -480,
        z: Z(320),
        doorX: -480,
        doorZ: Z(320) - 4.15,
        galleryY: 25.2,
        ghost: radelmuellerGhost
      },
      drawMinimap,
      update,
      landmarks: {
        centreDock: [0, Z(0)],
        pizzaPizza: [12, Z(48)],
        subway: [12, Z(66)],
        islandLockers: [12, Z(88)],
        islandBBQ: [65, Z(65)],
        northBridge: [28, Z(138)],
        woodedPath: [75, Z(185)],
        centreville: [180, Z(185)],
        centrevilleTrain: [160, Z(165)],
        farEnoughFarm: [295, Z(185)],
        grandFountain: [0, Z(310)],
        avenueGardens: [0, Z(380)],
        westReflectingPool: [-26, Z(380)],
        eastReflectingPool: [26, Z(380)],
        hedgeMaze: [-65, Z(385)], // William Meany Hedge Maze (South Centre Island, West of Avenue)
        centreBeach: [0, Z(455)],
        beachCafe: [34, Z(455)],
        bikeRental: [-34, Z(455)],
        beachLockers: [-10, Z(452)],
        centrePier: [0, Z(530)],
        olympicIsland: [-160, Z(330)],
        gibraltarLighthouse: [-480, Z(320)],
        hanlansDock: [-720, Z(-110)],
        hanlansBeach: [-886, Z(100)],
        airportRunway: [-1260, Z(-170)],
        airportTerminal: [-1060, Z(-252)],
        airportDock: [-1060, Z(-330)],
        algonquinIsland: [540, Z(130)],
        wardsDock: [1140, Z(-20)],
        wardsBeach: [1210, Z(120)],
        wardsCafe: [1050, Z(85)],
        formalGarden: [0, Z(380)],
        longPond: [100, Z(255)]
      },
      stats: {
        trees: trees.round.length + trees.willow.length + trees.pine.length,
        willows: trees.willow.length,
        pines: trees.pine.length,
        shrubs: shrubs.length,
        cottageWoodsTrees: trees.round.filter(t => t.x > 400).length + trees.willow.filter(t => t.x > 400).length + trees.pine.filter(t => t.x > 400).length,
        uniqueCottages: COTTAGES.length,
        q400Aircraft: 4,
        renderedOsmTowers: renderedOsmTowers
      }
    };
  }

  window.buildTorontoIslands = buildTorontoIslands;
})();

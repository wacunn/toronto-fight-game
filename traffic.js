// ============================================================================
// TORONTO TRAFFIC — procedural cars driving the real OSM street network.
// Cars keep right (Canada), follow each other, brake for people (not always in
// time!), honk, and hurt anyone they hit at speed. Rendered with instancing:
// a handful of draw calls for the whole fleet.
// ============================================================================
(function () {
  'use strict';

  function hash(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
  const rnd = Math.random;

  // ---------- geometry helpers ----------
  function roundedBoxGeo(w, h, d, r, seg = 2) {
    r = Math.min(r, w / 2, h / 2, d / 2);
    const g = new THREE.BoxGeometry(w, h, d, seg * 2, seg * 2, seg * 2);
    const p = g.attributes.position, n = g.attributes.normal;
    const ix = w / 2 - r, iy = h / 2 - r, iz = d / 2 - r;
    const v = new THREE.Vector3(), c = new THREE.Vector3(), off = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      c.set(THREE.MathUtils.clamp(v.x, -ix, ix), THREE.MathUtils.clamp(v.y, -iy, iy), THREE.MathUtils.clamp(v.z, -iz, iz));
      off.subVectors(v, c);
      if (off.lengthSq() < 1e-12) off.fromBufferAttribute(n, i);
      off.normalize();
      p.setXYZ(i, c.x + off.x * r, c.y + off.y * r, c.z + off.z * r);
      n.setXYZ(i, off.x, off.y, off.z);
    }
    return g;
  }

  // Side profile (x = length, forward is +x; y = height) extruded across the width,
  // with a bevel so every edge is softly rounded like stamped sheet metal.
  function profileGeo(points, width, bevel) {
    const sh = new THREE.Shape();
    points.forEach(([x, y], i) => (i ? sh.lineTo(x, y) : sh.moveTo(x, y)));
    sh.closePath();
    const g = new THREE.ExtrudeGeometry(sh, {
      depth: Math.max(0.01, width - bevel * 2), bevelEnabled: bevel > 0,
      bevelThickness: bevel, bevelSize: bevel * 0.8, bevelSegments: 3, curveSegments: 6
    });
    g.translate(0, 0, -(width - bevel * 2) / 2);
    g.computeVertexNormals();
    return g;
  }

  // Merge parts (each {geo, color}) into one non-indexed geometry with vertex colours
  function merge(parts) {
    const pos = [], nrm = [], col = [];
    parts.forEach(({ geo, color }) => {
      const g = geo.index ? geo.toNonIndexed() : geo;
      const p = g.attributes.position.array, n = g.attributes.normal.array;
      for (let i = 0; i < p.length; i += 3) {
        pos.push(p[i], p[i + 1], p[i + 2]);
        nrm.push(n[i], n[i + 1], n[i + 2]);
        col.push(color[0], color[1], color[2]);
      }
    });
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
    out.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    return out;
  }

  const C = hex => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };
  const TIRE = C(0x111113), RIM = C(0x9aa0a8), TRIM = C(0x16171a), GRILLE = C(0x0b0c0e), PLATE = C(0xe8e8e0), CHROME = C(0xc8ccd2);

  // ---------- car designs ----------
  // Each design returns parts grouped by material: paint / glass / trim / head / tail / sign
  function buildDesign(kind) {
    const P = { paint: [], glass: [], trim: [], head: [], tail: [], sign: [] };
    const add = (group, geo, color = [1, 1, 1], x = 0, y = 0, z = 0, ry = 0) => {
      if (ry) geo.rotateY(ry);
      geo.translate(x, y, z);
      P[group].push({ geo, color });
    };
    let L, W, wheelR, wheelX, rideH;

    // Lower body profile + greenhouse (glass) profile + roof, per body style
    if (kind === 'sedan' || kind === 'taxi') {
      L = 4.75; W = 1.84; wheelR = 0.34; wheelX = 1.42; rideH = 0.3;
      add('paint', profileGeo([[-2.37, 0.32], [2.37, 0.32], [2.4, 0.62], [2.3, 0.78], [1.1, 0.92], [-1.45, 0.94], [-2.3, 0.88], [-2.4, 0.66]], W, 0.08));
      add('glass', profileGeo([[1.05, 0.9], [0.25, 1.38], [-0.95, 1.4], [-1.55, 0.92]], W * 0.86, 0.05));
      add('paint', roundedBoxGeo(1.25, 0.06, W * 0.8, 0.03), [1, 1, 1], -0.35, 1.41, 0);
    } else if (kind === 'hatch') {
      L = 4.1; W = 1.78; wheelR = 0.32; wheelX = 1.28; rideH = 0.3;
      add('paint', profileGeo([[-2.0, 0.32], [2.05, 0.32], [2.08, 0.62], [1.95, 0.78], [0.95, 0.92], [-1.9, 0.98], [-2.05, 0.7]], W, 0.08));
      add('glass', profileGeo([[0.9, 0.9], [0.15, 1.42], [-1.55, 1.44], [-1.9, 0.96]], W * 0.86, 0.05));
      add('paint', roundedBoxGeo(1.75, 0.06, W * 0.8, 0.03), [1, 1, 1], -0.68, 1.45, 0);
    } else if (kind === 'suv') {
      L = 4.85; W = 1.96; wheelR = 0.4; wheelX = 1.5; rideH = 0.42;
      add('paint', profileGeo([[-2.42, 0.42], [2.42, 0.42], [2.45, 0.8], [2.3, 1.02], [1.25, 1.12], [-2.35, 1.14], [-2.45, 0.85]], W, 0.1));
      add('glass', profileGeo([[1.2, 1.1], [0.45, 1.68], [-2.15, 1.7], [-2.3, 1.12]], W * 0.88, 0.06));
      add('paint', roundedBoxGeo(2.5, 0.07, W * 0.84, 0.035), [1, 1, 1], -0.85, 1.71, 0);
      [-1, 1].forEach(s => add('trim', roundedBoxGeo(2.2, 0.04, 0.05, 0.02), CHROME, -0.85, 1.77, s * W * 0.36)); // roof rails
    } else if (kind === 'van') {
      L = 5.1; W = 2.0; wheelR = 0.36; wheelX = 1.65; rideH = 0.36;
      add('paint', profileGeo([[-2.55, 0.36], [2.55, 0.36], [2.58, 0.75], [2.35, 1.0], [1.65, 1.15], [1.4, 1.95], [-2.5, 2.0], [-2.58, 0.7]], W, 0.1));
      add('glass', profileGeo([[1.62, 1.12], [1.38, 1.85], [0.4, 1.86], [0.4, 1.14]], W * 1.005, 0.0)); // windshield + front side windows
      add('glass', roundedBoxGeo(1.6, 0.42, W * 1.005, 0.04), [1, 1, 1], -0.75, 1.55, 0);
    } else { // pickup
      L = 5.4; W = 2.0; wheelR = 0.42; wheelX = 1.75; rideH = 0.45;
      add('paint', profileGeo([[-2.7, 0.45], [2.7, 0.45], [2.72, 0.9], [2.55, 1.15], [1.45, 1.22], [-2.7, 1.2], [-2.75, 0.85]], W, 0.1));
      add('glass', profileGeo([[1.4, 1.2], [0.75, 1.8], [-0.5, 1.82], [-0.65, 1.2]], W * 0.9, 0.06));
      add('paint', roundedBoxGeo(1.2, 0.07, W * 0.84, 0.035), [1, 1, 1], 0.1, 1.83, 0);
      add('trim', roundedBoxGeo(1.9, 0.08, W * 0.88, 0.02), TRIM, -1.7, 1.18, 0); // open bed floor shadow
      add('paint', roundedBoxGeo(0.08, 0.32, W * 0.9, 0.03), [1, 1, 1], -0.75, 1.35, 0);  // cab back wall above bed
    }

    // Wheels: tyre + rim + hub, slightly proud of the body
    [-1, 1].forEach(sx => [-1, 1].forEach(sz => {
      const x = sx * wheelX, z = sz * (W / 2 - 0.12);
      const tyre = new THREE.CylinderGeometry(wheelR, wheelR, 0.24, 20); tyre.rotateX(Math.PI / 2);
      add('trim', tyre, TIRE, x, wheelR, z);
      const rim = new THREE.CylinderGeometry(wheelR * 0.62, wheelR * 0.62, 0.25, 14); rim.rotateX(Math.PI / 2);
      add('trim', rim, RIM, x, wheelR, z);
      const hub = new THREE.CylinderGeometry(wheelR * 0.2, wheelR * 0.2, 0.26, 8); hub.rotateX(Math.PI / 2);
      add('trim', hub, TRIM, x, wheelR, z);
      // dark wheel-arch liner so tyres sit "inside" the body
      add('trim', roundedBoxGeo(wheelR * 2.3, 0.18, 0.06, 0.03), GRILLE, x, wheelR * 2 + 0.02, sz * (W / 2 - 0.02));
    }));

    // Bumpers, grille, side skirts, mirrors, plates, door handles
    const bumpY = rideH + 0.18;
    add('trim', roundedBoxGeo(0.14, 0.22, W * 0.98, 0.06), TRIM, L / 2 - 0.02, bumpY, 0);
    add('trim', roundedBoxGeo(0.14, 0.22, W * 0.98, 0.06), TRIM, -L / 2 + 0.02, bumpY, 0);
    add('trim', roundedBoxGeo(0.05, 0.16, W * 0.42, 0.03), GRILLE, L / 2 + 0.04, bumpY + 0.26, 0);
    add('trim', roundedBoxGeo(0.02, 0.11, 0.42, 0.01), PLATE, -L / 2 - 0.05, bumpY + 0.02, 0);
    [-1, 1].forEach(s => {
      add('trim', roundedBoxGeo(L * 0.62, 0.08, 0.04, 0.02), TRIM, 0, rideH + 0.06, s * (W / 2 + 0.005));
      add('paint', roundedBoxGeo(0.16, 0.11, 0.2, 0.04), [1, 1, 1], kind === 'van' ? 1.45 : 0.9, (kind === 'suv' || kind === 'pickup') ? 1.18 : kind === 'van' ? 1.2 : 0.98, s * (W / 2 + 0.08));
      add('trim', roundedBoxGeo(0.14, 0.025, 0.02, 0.008), CHROME, 0.1, rideH + 0.5, s * (W / 2 + 0.01));
      add('trim', roundedBoxGeo(0.14, 0.025, 0.02, 0.008), CHROME, -0.9, rideH + 0.5, s * (W / 2 + 0.01));
      // headlights (wide, slightly wrapped) and taillights
      add('head', roundedBoxGeo(0.06, 0.12, 0.42, 0.04), C(0xfff6e6), L / 2 + 0.01, bumpY + 0.3, s * (W / 2 - 0.3));
      add('tail', roundedBoxGeo(0.06, 0.13, 0.38, 0.04), C(0xff1a1a), -L / 2 - 0.01, bumpY + 0.3, s * (W / 2 - 0.28));
    });
    add('tail', roundedBoxGeo(0.04, 0.04, W * 0.4, 0.015), C(0xff1a1a), -L / 2 - 0.01, bumpY + 0.42, 0); // centre light bar

    if (kind === 'taxi') {
      add('sign', roundedBoxGeo(0.5, 0.2, 0.22, 0.05), C(0xffd34d), -0.35, 1.55, 0);
      // Beck Taxi signature teal roof panel and side body stripes (#0d9488)
      add('trim', roundedBoxGeo(1.28, 0.06, W * 0.82, 0.02), C(0x0d9488), -0.35, 1.43, 0);
      [-1, 1].forEach(s => {
        add('trim', roundedBoxGeo(L * 0.65, 0.08, 0.02, 0.01), C(0x0d9488), 0, rideH + 0.38, s * (W / 2 + 0.006));
      });
    }
    return { P, L, W, H: kind === 'van' ? 2.0 : (kind === 'suv' || kind === 'pickup') ? 1.8 : 1.45, kind };
  }

  // Realistic paint distribution: lots of white/black/grey, a few colours
  const PAINTS = [
    [0xcfd0cd, 18], [0x0e0f11, 16], [0x9ca1a7, 13], [0x55595f, 12], [0x1b2c4a, 7], [0x8c111a, 6],
    [0xb5141d, 4], [0x2a4637, 3], [0xc8c1b2, 4], [0x1d4e8f, 4], [0x4a3a2c, 3], [0xd9a118, 1], [0x5f7f96, 3], [0x3b1f4a, 1]
  ];
  const PAINT_TOTAL = PAINTS.reduce((a, p) => a + p[1], 0);
  function pickPaint() {
    let r = rnd() * PAINT_TOTAL;
    for (const [c, w] of PAINTS) { if ((r -= w) <= 0) return new THREE.Color(c); }
    return new THREE.Color(PAINTS[0][0]);
  }
  const KINDS = [['sedan', 32], ['hatch', 18], ['suv', 24], ['pickup', 8], ['van', 8], ['taxi', 10]];

  function glowTexture(stretch) {
    // stretch: a headlight beam (bright at the car end, fading forward, soft sides)
    const W = 64, H = 128, c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d'), img = g.createImageData(W, H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const u = (x + 0.5) / W * 2 - 1, v = (y + 0.5) / H;     // v=0 at the car end
      let a;
      if (stretch) {
        const spread = 0.35 + v * 0.65;                         // beam widens with distance
        a = Math.exp(-Math.pow(u / spread, 2) * 3) * Math.pow(1 - v, 1.6) * Math.min(1, v * 8);
      } else {
        const r = Math.hypot(u, v * 2 - 1);
        a = Math.max(0, 1 - r) ** 2;
      }
      const i = (y * W + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
      img.data[i + 3] = Math.round(255 * Math.min(1, a));
    }
    g.putImageData(img, 0, 0);
    return new THREE.CanvasTexture(c);
  }
  function blobTexture() {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(32, 32, 4, 32, 32, 32);
    grad.addColorStop(0, 'rgba(0,0,0,0.75)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  }

  // ======================================================================
  function createTraffic(scene, city, audio, opts) {
    opts = opts || {};
    const roads = (city && city.trafficRoads) || [];
    if (!roads.length) return null;
    const COUNT = opts.count || 30;

    // ---------- lanes / network ----------
    roads.forEach(r => {
      r.cum = [0];
      for (let i = 1; i < r.pts.length; i++) r.cum.push(r.cum[i - 1] + Math.hypot(r.pts[i][0] - r.pts[i - 1][0], r.pts[i][1] - r.pts[i - 1][1]));
      r.len = r.cum[r.cum.length - 1];
      r.limit = r.major ? 13 + rnd() * 2 : 8 + rnd() * 1.5; // ~50 km/h arterials, ~30 km/h side streets
    });
    const usable = roads.filter(r => r.len > 12);
    const NODE = 3;
    const nodes = new Map();
    const nkey = (x, z) => Math.round(x / NODE) + ',' + Math.round(z / NODE);
    usable.forEach(r => {
      [[r.pts[0], true], [r.pts[r.pts.length - 1], false]].forEach(([p, atStart]) => {
        const k = nkey(p[0], p[1]);
        if (!nodes.has(k)) nodes.set(k, []);
        nodes.get(k).push({ r, atStart, x: p[0], z: p[1] });
      });
    });
    function connectionsAt(x, z, from) {
      const out = [], cx = Math.round(x / NODE), cz = Math.round(z / NODE);
      for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
        const list = nodes.get((cx + dx) + ',' + (cz + dz));
        if (list) list.forEach(e => { if (e.r !== from && Math.hypot(e.x - x, e.z - z) < 3.5) out.push(e); });
      }
      return out;
    }

    // Sample a road at arc length `d` measured from its first point
    const tmp = { x: 0, z: 0, tx: 1, tz: 0 };
    function sample(r, d) {
      d = Math.max(0, Math.min(r.len, d));
      let i = 1;
      while (i < r.cum.length - 1 && r.cum[i] < d) i++;
      const a = r.pts[i - 1], b = r.pts[i];
      const segLen = r.cum[i] - r.cum[i - 1] || 1;
      const f = (d - r.cum[i - 1]) / segLen;
      tmp.x = a[0] + (b[0] - a[0]) * f; tmp.z = a[1] + (b[1] - a[1]) * f;
      tmp.tx = (b[0] - a[0]) / segLen; tmp.tz = (b[1] - a[1]) / segLen;
      return tmp;
    }

    // ======================================================================
    // TORONTO TRAFFIC SIGNALS & CONTINENTAL CROSSWALKS
    // ======================================================================
    const roadApproachMap = new Map();
    const signalIntersections = [];
    const crosswalkList = [];
    const signals = [];

    // Assign IDs to usable roads and collect approach endpoints
    const endpoints = [];
    usable.forEach((r, ri) => {
      r.id = ri;
      const pts = r.pts;
      if (pts.length < 2) return;
      const dx0 = pts[1][0] - pts[0][0], dz0 = pts[1][1] - pts[0][1];
      const l0 = Math.hypot(dx0, dz0) || 1;
      endpoints.push({ r, atStart: true, x: pts[0][0], z: pts[0][1], fx: -dx0 / l0, fz: -dz0 / l0, w: r.w || 10, name: r.n || 'Street' });
      const dx1 = pts[pts.length - 1][0] - pts[pts.length - 2][0], dz1 = pts[pts.length - 1][1] - pts[pts.length - 2][1];
      const l1 = Math.hypot(dx1, dz1) || 1;
      endpoints.push({ r, atStart: false, x: pts[pts.length - 1][0], z: pts[pts.length - 1][1], fx: dx1 / l1, fz: dz1 / l1, w: r.w || 10, name: r.n || 'Street' });
    });

    // Cluster endpoints within 14m into intersection nodes
    endpoints.forEach(ep => {
      let matched = null;
      for (let i = 0; i < signalIntersections.length; i++) {
        const inter = signalIntersections[i];
        if (Math.hypot(inter.x - ep.x, inter.z - ep.z) < 14) { matched = inter; break; }
      }
      if (matched) {
        matched.approaches.push(ep);
        matched.x = matched.approaches.reduce((s, a) => s + a.x, 0) / matched.approaches.length;
        matched.z = matched.approaches.reduce((s, a) => s + a.z, 0) / matched.approaches.length;
      } else {
        signalIntersections.push({ x: ep.x, z: ep.z, approaches: [ep] });
      }
    });

    // Crosswalk buffer geometry (single draw call for all continental markings across the city!)
    const cwPos = [], cwNrm = [];
    function addCwQuad(ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz) {
      cwPos.push(ax, ay, az, bx, by, bz, cx, cy, cz);
      cwPos.push(ax, ay, az, cx, cy, cz, dx, dy, dz);
      for (let k = 0; k < 6; k++) cwNrm.push(0, 1, 0);
    }
    function addOrientedBar(cx, cz, y, w, L, fx, fz) {
      const rx = -fz, rz = fx;
      const hw = w / 2, hl = L / 2;
      const p0x = cx - rx * hw - fx * hl, p0z = cz - rz * hw - fz * hl;
      const p1x = cx + rx * hw - fx * hl, p1z = cz + rz * hw - fz * hl;
      const p2x = cx + rx * hw + fx * hl, p2z = cz + rz * hw + fz * hl;
      const p3x = cx - rx * hw + fx * hl, p3z = cz - rz * hw + fz * hl;
      addCwQuad(p0x, y, p0z, p1x, y, p1z, p2x, y, p2z, p3x, y, p3z);
    }

    const CYCLE = 42.0;

    signalIntersections.forEach((inter, interIdx) => {
      // Only signalize true intersections (3+ approaches or perpendicular East-West & North-South streets meeting)
      const hasEW = inter.approaches.some(a => Math.abs(a.fx) > Math.abs(a.fz));
      const hasNS = inter.approaches.some(a => Math.abs(a.fx) <= Math.abs(a.fz));
      if (inter.approaches.length < 3 && !(hasEW && hasNS)) return;

      const offset = (Math.abs(inter.x * 0.08 + inter.z * 0.12) % CYCLE);
      inter.offset = offset;
      inter.approaches.forEach(a => {
        // Phase 0 = East-West, Phase 1 = North-South
        const isEastWest = Math.abs(a.fx) > Math.abs(a.fz);
        const phase = isEastWest ? 0 : 1;
        let crossHalfW = 5.5;
        inter.approaches.forEach(b => {
          if (b !== a && (Math.abs(b.fx) > Math.abs(b.fz)) !== isEastWest) {
            crossHalfW = Math.max(crossHalfW, (b.w || 10) / 2);
          }
        });
        const cwDist = Math.max(4.5, crossHalfW + 1.8);
        const stopDist = cwDist + 2.6;

        const sig = {
          id: signals.length,
          interIdx,
          phase,
          offset,
          isEastWest,
          x: a.x, z: a.z,
          fx: a.fx, fz: a.fz,
          approach: a,
          cwDist,
          stopDist,
          state: 'red',
          ped: 'dontwalk',
          streetName: a.name
        };
        signals.push(sig);
        a.signal = sig;
        a.stopDist = stopDist;
        roadApproachMap.set(a.r.id + ':' + a.atStart, a);

        // Draw Solid Stop Bar across approaching roadway outside the cross-street
        const y = (a.r.y || 0.05) + 0.02;
        const rx = -a.fz, rz = a.fx;
        const stopCx = a.x - a.fx * stopDist, stopCz = a.z - a.fz * stopDist;
        addOrientedBar(stopCx, stopCz, y, a.w * 0.9, 0.55, a.fx, a.fz);

        // Draw Continental Zebra Crosswalk Stripes
        const cwCx = a.x - a.fx * cwDist, cwCz = a.z - a.fz * cwDist;
        const halfRoad = a.w / 2;
        for (let s = -halfRoad + 0.6; s <= halfRoad - 0.6; s += 0.85) {
          addOrientedBar(cwCx + rx * s, cwCz + rz * s, y, 0.48, 3.2, a.fx, a.fz);
        }

        crosswalkList.push({
          x: cwCx, z: cwCz,
          streetName: a.name,
          signal: sig,
          approach: a,
          isEastWest
        });
      });
    });

    if (cwPos.length) {
      const cwGeo = new THREE.BufferGeometry();
      cwGeo.setAttribute('position', new THREE.Float32BufferAttribute(cwPos, 3));
      cwGeo.setAttribute('normal', new THREE.Float32BufferAttribute(cwNrm, 3));
      const cwMesh = new THREE.Mesh(cwGeo, new THREE.MeshBasicMaterial({
        color: 0xf5f5f5, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4
      }));
      scene.add(cwMesh);
    }

    // Toronto-Style Cantilever Mast-Arm Signal Poles with Yellow-Bordered Backplates
    const poleParts = [];
    const colGeo = new THREE.CylinderGeometry(0.14, 0.17, 6.4, 8); colGeo.translate(0, 3.2, 0);
    poleParts.push({ geo: colGeo, color: [0.1, 0.11, 0.13] });
    const armGeo = new THREE.CylinderGeometry(0.09, 0.12, 5.6, 8); armGeo.rotateZ(Math.PI / 2); armGeo.translate(2.8, 5.8, 0);
    poleParts.push({ geo: armGeo, color: [0.1, 0.11, 0.13] });
    const bpGeo = new THREE.BoxGeometry(0.85, 2.15, 0.14); bpGeo.translate(5.4, 5.8, 0);
    poleParts.push({ geo: bpGeo, color: [0.06, 0.07, 0.08] });
    const ybGeo = new THREE.BoxGeometry(0.92, 2.22, 0.02); ybGeo.translate(5.4, 5.8, -0.07);
    poleParts.push({ geo: ybGeo, color: [1.0, 0.78, 0.0] }); // Ontario retroreflective yellow
    [-0.6, 0.0, 0.6].forEach(yo => {
      const hood = new THREE.CylinderGeometry(0.24, 0.24, 0.28, 8, 1, true, 0, Math.PI);
      hood.rotateX(-Math.PI / 2); hood.translate(5.4, 5.8 + yo + 0.08, -0.16);
      poleParts.push({ geo: hood, color: [0.06, 0.07, 0.08] });
    });
    const pedBox = new THREE.BoxGeometry(0.42, 0.42, 0.16); pedBox.translate(0, 2.7, 0);
    poleParts.push({ geo: pedBox, color: [0.08, 0.09, 0.1] });

    const mergedPolesGeo = merge(poleParts);
    const polesMesh = new THREE.InstancedMesh(
      mergedPolesGeo,
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.35 }),
      Math.max(1, signals.length)
    );
    polesMesh.castShadow = true;

    // Instanced Lenses (Sphere with un-tonemapped bloom color)
    const lensGeo = new THREE.SphereGeometry(0.18, 10, 8);
    const redLensMesh = new THREE.InstancedMesh(lensGeo, new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }), Math.max(1, signals.length));
    const yellowLensMesh = new THREE.InstancedMesh(lensGeo, new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }), Math.max(1, signals.length));
    const greenLensMesh = new THREE.InstancedMesh(lensGeo, new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }), Math.max(1, signals.length));

    const pedGeo = new THREE.PlaneGeometry(0.36, 0.36);
    const pedLensMesh = new THREE.InstancedMesh(pedGeo, new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false, side: THREE.DoubleSide }), Math.max(1, signals.length));

    const pMat4 = new THREE.Matrix4(), pQuat = new THREE.Quaternion(), pPos = new THREE.Vector3(), pScale = new THREE.Vector3(1, 1, 1), zeroScale = new THREE.Vector3(0, 0, 0);
    const upVec = new THREE.Vector3(0, 1, 0);

    signals.forEach((sig, i) => {
      const rx = -sig.fz, rz = sig.fx;
      const baseBack = (sig.stopDist || 7.5) - 1.2;
      const baseSide = (sig.approach ? (sig.approach.w / 2 + 1.8) : 7.5);
      let poleX = sig.x - sig.fx * baseBack + rx * baseSide;
      let poleZ = sig.z - sig.fz * baseBack + rz * baseSide;
      let validPole = true;

      if (city && city.isOnRoad) {
        const isBad = (x, z) => city.isOnRoad(x, z, 0.9) || (city.canMoveTo && !city.canMoveTo(x, z, 0.35));
        if (isBad(poleX, poleZ)) {
          validPole = false;
          for (let bOff = 0; bOff <= 14 && !validPole; bOff += 1.6) {
            for (let sOff = 0; sOff <= 7.2 && !validPole; sOff += 1.2) {
              const cx = sig.x - sig.fx * (baseBack + bOff) + rx * (baseSide + sOff);
              const cz = sig.z - sig.fz * (baseBack + bOff) + rz * (baseSide + sOff);
              if (!isBad(cx, cz)) {
                poleX = cx;
                poleZ = cz;
                validPole = true;
              }
            }
          }
        }
      }

      const heading = Math.atan2(sig.fx, sig.fz);
      pQuat.setFromAxisAngle(upVec, heading);
      const useScale = validPole ? pScale : zeroScale;

      pMat4.compose(pPos.set(poleX, 0, poleZ), pQuat, useScale);
      polesMesh.setMatrixAt(i, pMat4);

      const hx = poleX - rx * 5.4, hz = poleZ - rz * 5.4;
      pMat4.compose(pPos.set(hx, 6.4, hz), pQuat, useScale); redLensMesh.setMatrixAt(i, pMat4);
      pMat4.compose(pPos.set(hx, 5.8, hz), pQuat, useScale); yellowLensMesh.setMatrixAt(i, pMat4);
      pMat4.compose(pPos.set(hx, 5.2, hz), pQuat, useScale); greenLensMesh.setMatrixAt(i, pMat4);

      pMat4.compose(pPos.set(poleX, 2.7, poleZ - 0.1), pQuat, useScale);
      pedLensMesh.setMatrixAt(i, pMat4);
    });

    polesMesh.instanceMatrix.needsUpdate = true;
    redLensMesh.instanceMatrix.needsUpdate = true;
    yellowLensMesh.instanceMatrix.needsUpdate = true;
    greenLensMesh.instanceMatrix.needsUpdate = true;
    pedLensMesh.instanceMatrix.needsUpdate = true;

    scene.add(polesMesh);
    scene.add(redLensMesh);
    scene.add(yellowLensMesh);
    scene.add(greenLensMesh);
    scene.add(pedLensMesh);

    const COL_RED_ON = new THREE.Color(2.8, 0.18, 0.18);
    const COL_RED_OFF = new THREE.Color(0.18, 0.02, 0.02);
    const COL_YEL_ON = new THREE.Color(2.4, 1.6, 0.1);
    const COL_YEL_OFF = new THREE.Color(0.16, 0.1, 0.01);
    const COL_GRN_ON = new THREE.Color(0.1, 2.8, 1.2);
    const COL_GRN_OFF = new THREE.Color(0.01, 0.15, 0.05);

    const COL_WALK = new THREE.Color(2.0, 2.2, 2.6);
    const COL_DONTWALK = new THREE.Color(2.5, 0.85, 0.05);
    const COL_PED_OFF = new THREE.Color(0.04, 0.04, 0.04);

    let signalTimer = 0;
    let pedAudioTimer = 0;


    // ---------- instanced rendering ----------
    const designs = {};
    const meshes = {};
    const paintMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0.3, roughness: 0.4, clearcoat: 1.0, clearcoatRoughness: 0.1, envMapIntensity: 0.7 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x07090c, metalness: 0.5, roughness: 0.08, envMapIntensity: 0.55 });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, metalness: 0.35, roughness: 0.5, envMapIntensity: 0.8 });
    const headMat = new THREE.MeshBasicMaterial({ color: 0xffffff, vertexColors: true, toneMapped: false });
    const tailMat = new THREE.MeshBasicMaterial({ color: 0xffffff, vertexColors: true, toneMapped: false });
    const signMat = new THREE.MeshBasicMaterial({ color: 0xffffff, vertexColors: true, toneMapped: false });

    const perKind = {};
    const cars = [];
    for (let i = 0; i < COUNT; i++) {
      let r = rnd() * 100, kind = 'sedan';
      for (const [k, w] of KINDS) { if ((r -= w) <= 0) { kind = k; break; } }
      perKind[kind] = (perKind[kind] || 0) + 1;
      cars.push({ id: i, kind });
    }
    Object.keys(perKind).forEach(kind => {
      const d = designs[kind] = buildDesign(kind);
      const n = perKind[kind];
      const m = meshes[kind] = {};
      const make = (group, mat) => {
        if (!d.P[group].length) return null;
        const geo = merge(d.P[group]);
        const im = new THREE.InstancedMesh(geo, mat, n);
        im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        im.castShadow = group === 'paint' || group === 'glass';
        im.receiveShadow = group === 'paint';
        im.frustumCulled = false;
        scene.add(im);
        return im;
      };
      m.paint = make('paint', paintMat);
      m.glass = make('glass', glassMat);
      m.trim = make('trim', trimMat);
      m.head = make('head', headMat);
      m.tail = make('tail', tailMat);
      m.sign = make('sign', signMat);
    });
    const slotCounter = {};
    cars.forEach(c => {
      c.slot = slotCounter[c.kind] = (slotCounter[c.kind] === undefined ? 0 : slotCounter[c.kind] + 1);
      c.design = designs[c.kind];
      c.paint = c.kind === 'taxi' ? new THREE.Color(0xf97316) : pickPaint();
      meshes[c.kind].paint.setColorAt(c.slot, c.paint);
      if (meshes[c.kind].tail) meshes[c.kind].tail.setColorAt(c.slot, new THREE.Color(0.55, 0.55, 0.55));
      c.lenScale = 0.97 + rnd() * 0.06;
    });
    Object.values(meshes).forEach(m => {
      if (m.paint.instanceColor) m.paint.instanceColor.needsUpdate = true;
      if (m.tail && m.tail.instanceColor) m.tail.instanceColor.needsUpdate = true;
    });

    // Headlight beams on the road, red tail glow, and a soft contact shadow
    const beamGeo = new THREE.PlaneGeometry(1, 1); beamGeo.rotateX(-Math.PI / 2);
    const beams = new THREE.InstancedMesh(beamGeo, new THREE.MeshBasicMaterial({
      map: glowTexture(true), color: 0xfff1d6, transparent: true, opacity: 0.35, depthWrite: false,
      blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -6
    }), COUNT);
    const tailGlow = new THREE.InstancedMesh(beamGeo, new THREE.MeshBasicMaterial({
      map: glowTexture(false), color: 0xff2020, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -6
    }), COUNT);
    const blobs = new THREE.InstancedMesh(beamGeo, new THREE.MeshBasicMaterial({
      map: blobTexture(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -5, polygonOffsetUnits: -5
    }), COUNT);
    [beams, tailGlow, blobs].forEach(im => { im.frustumCulled = false; im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(im); });
    for (let i = 0; i < COUNT; i++) tailGlow.setColorAt(i, new THREE.Color(0.5, 0.5, 0.5));

    // ---------- placement ----------
    function placeCar(c, near, minD, maxD) {
      for (let tries = 0; tries < 60; tries++) {
        const r = usable[Math.floor(rnd() * usable.length)];
        const d = rnd() * r.len;
        const p = sample(r, d);
        const dist = near ? Math.hypot(p.x - near.x, p.z - near.z) : 100;
        if (near && (dist < minD || dist > maxD)) continue;
        c.road = r; c.dir = rnd() < 0.5 ? 1 : -1;
        c.s = c.dir > 0 ? d : r.len - d;
        computeLogical(c);
        if (cars.some(o => o !== c && o.road && Math.hypot(o.lx - c.lx, o.lz - c.lz) < 9)) continue;
        if (streetcars.some(o => o.mode !== 'hidden' && Math.hypot(o.vx - c.lx, o.vz - c.lz) < SC.L / 2 + 6)) continue;
        c.lane = 0;
        c.speed = r.limit * (0.6 + rnd() * 0.3);
        c.vx = c.lx; c.vz = c.lz; c.vh = c.lh;
        c.stuck = 0; c.ghost = 0; c.honkCd = 0; c.whooshCd = 0; c.hitCd = 0; c.braking = false;
        return true;
      }
      return false;
    }
    function laneOffset(c) {
      const w = c.road.w;
      if (c.laneSel === undefined) {
        c.laneSel = rnd() < 0.5 ? 0 : 1;
        // don't pick the inside (track) lane right where a streetcar already is
        if (c.laneSel === 0 && streetcars.some(o => o.mode !== 'hidden' && Math.hypot(o.vx - (c.vx || 0), o.vz - (c.vz || 0)) < SC.L / 2 + 20)) c.laneSel = 1;
      }
      if (w >= 11 && c.road.n && c.road.n.indexOf('Queens Quay') === 0) return w * 0.375; // centre is a streetcar right-of-way
      return w >= 11 ? (c.laneSel ? w * 0.375 : w * 0.125) : w * 0.25;
    }
    function computeLogical(c) {
      const r = c.road;
      const d = c.dir > 0 ? c.s : r.len - c.s;
      const p = sample(r, d);
      const fx = p.tx * c.dir, fz = p.tz * c.dir;
      const off = laneOffset(c);
      // keep right: right of travel direction is (-fz, fx)
      c.lx = p.x - fz * off; c.lz = p.z + fx * off;
      c.fx = fx; c.fz = fz;
      c.lh = Math.atan2(fx, fz);
    }
    function advanceRoad(c) {
      const r = c.road;
      const end = c.dir > 0 ? r.pts[r.pts.length - 1] : r.pts[0];
      const conns = connectionsAt(end[0], end[1], r);
      if (!conns.length) { c.dir *= -1; c.s = 0; return; } // dead end: U-turn
      // prefer going roughly straight, sometimes turn
      const scored = conns.map(e => {
        const startD = e.atStart ? 0 : e.r.len;
        const p = sample(e.r, e.atStart ? Math.min(4, e.r.len) : Math.max(0, e.r.len - 4));
        const q = sample(e.r, startD);
        const dx = p.x - q.x, dz = p.z - q.z, l = Math.hypot(dx, dz) || 1;
        const straight = (dx / l) * c.fx + (dz / l) * c.fz; // 1 = straight on
        return { e, wgt: Math.max(0.05, 0.35 + straight) * (0.5 + rnd()) };
      }).sort((a, b) => b.wgt - a.wgt);
      const pick = scored[0].e;
      c.road = pick.r; c.dir = pick.atStart ? 1 : -1; c.s = 0;
      c.laneSel = undefined;
    }

    const SC = { L: 28.0, W: 2.54, H: 3.84 };   // TTC Flexity Outlook
    const TRACK = city.streetcarTrackOffset || 1.5;
    const streetcars = [];
    const anchor = city.start ? { x: city.start.x, z: city.start.z } : null;
    cars.forEach(c => placeCar(c, anchor, 25, 260) || placeCar(c, null));

    const stopPoleSpots = [];

    // ======================================================================
    // TTC STREETCARS: 504 King and 509/510 Harbourfront, on fixed routes
    // ======================================================================

    const STOP_DWELL = 7.0;
    const scRoutes = [];
    const scTmpA = { x: 0, z: 0 }, scTmpB = { x: 0, z: 0 };

    (city.streetcarRoutes || []).forEach(src => {
      if (!src.pts || src.pts.length < 2 || typeof city.makeStreetcar !== 'function') return;
      const rt = { id: src.id, pts: src.pts, limit: src.limit || 11, portal: src.portal, stops: [], cum: [0], sigLat: src.sigLat || 8 };
      for (let i = 1; i < rt.pts.length; i++) rt.cum.push(rt.cum[i - 1] + Math.hypot(rt.pts[i][0] - rt.pts[i - 1][0], rt.pts[i][1] - rt.pts[i - 1][1]));
      rt.len = rt.cum[rt.cum.length - 1];
      // Turnaround points: the car centre stops here. At a tunnel portal the whole 18 m car
      // must be inside the 24 m portal before it vanishes.
      rt.endLo = 0.5;
      rt.endHi = rt.portal ? rt.len - (rt.portal.len / 2) : rt.len - 0.5;

      // Stops roughly every 240 m, kept 30 m clear of signalised intersections
      const clearOfSignals = d => {
        const p = sample(rt, d);
        return !signals.some(sg => Math.hypot(sg.x - p.x, sg.z - p.z) < 30);
      };
      if (src.stops) {
        // explicit stops; dir 1/-1 = that direction only (Spadina's near-side platforms), 0 = both
        rt.stops = src.stops.map(st => ({ d: st.d, dir: st.dir || 0 }));
        rt.platformsUntil = src.spadinaEnd || 0;            // those have platforms, not curb poles
      } else {
        for (let d = 140; d < rt.len - 80; d += 240) {
          const pick = [0, 35, -35, 70, -70].map(o => d + o).find(dd => dd > 60 && dd < rt.len - 60 && clearOfSignals(dd));
          if (pick !== undefined) rt.stops.push({ d: pick, dir: 0 });
        }
      }
      scRoutes.push(rt);

      const n = src.cars || 2;
      for (let i = 0; i < n; i++) {
        const sign = src.signs[i % src.signs.length];
        const sc = {
          isStreetcar: true, id: 10000 + streetcars.length, route: rt,
          dir: i % 2 === 0 ? 1 : -1,
          d: 40 + (rt.len - 80) * ((i + 0.5) / n),
          speed: 0, mode: 'run', timer: 0, servedD: -1e9,
          vx: 0, vz: 0, fx: 1, fz: 0, vh: 0,
          design: SC, lenScale: 1, hitCd: 0, gongCd: 0, stuck: 0, ghost: 0, braking: false,
          sign: sign, hasPlayer: false, boardGrace: 0,
          group: city.makeStreetcar(sign)
        };
        placeStreetcar(sc);
        streetcars.push(sc);
      }

      // TTC stop poles on the right-hand curb for each direction (instanced, 3 draw calls total)
      rt.stops.forEach(st => {
        const d = st.d;
        if (st.dir || d < (rt.platformsUntil || 0)) return;
        const p = sample(rt, d), tx = p.tx, tz = p.tz, cx = p.x, cz = p.z;
        [1, -1].forEach(dir => {
          const rx = -tz * dir, rz = tx * dir;            // right of travel
          stopPoleSpots.push({ x: cx + rx * 6.4, z: cz + rz * 6.4, yaw: Math.atan2(tx * dir, tz * dir) });
        });
      });
    });

    function placeStreetcar(sc) {
      const rt = sc.route, half = SC.L * 0.42;
      const clampD = d => Math.max(0, Math.min(rt.len, d));
      // Whole-car pose: used for collisions, look-ahead and the minimap
      let p = sample(rt, clampD(sc.d + sc.dir * half)); scTmpA.x = p.x; scTmpA.z = p.z;
      p = sample(rt, clampD(sc.d - sc.dir * half)); scTmpB.x = p.x; scTmpB.z = p.z;
      let fx = scTmpA.x - scTmpB.x, fz = scTmpA.z - scTmpB.z;
      const fl = Math.hypot(fx, fz);
      if (fl < 0.5) { p = sample(rt, clampD(sc.d)); fx = p.tx * sc.dir; fz = p.tz * sc.dir; }
      else { fx /= fl; fz /= fl; }
      sc.fx = fx; sc.fz = fz;
      sc.vx = (scTmpA.x + scTmpB.x) / 2 - fz * TRACK;
      sc.vz = (scTmpA.z + scTmpB.z) / 2 + fx * TRACK;
      sc.vh = Math.atan2(fx, fz);

      const secs = sc.group.userData.sections;
      if (!secs) { sc.group.position.set(sc.vx, 0.05, sc.vz); sc.group.rotation.y = sc.vh; return; }
      // Articulated: each section sits on its own stretch of track, so the car bends through curves
      secs.forEach(s => {
        const c = sc.d + sc.dir * s.offset, h = s.len / 2;
        let q = sample(rt, clampD(c + sc.dir * h)); const ax = q.x, az = q.z;
        q = sample(rt, clampD(c - sc.dir * h)); const bx = q.x, bz = q.z;
        let sx = ax - bx, sz = az - bz;
        const sl = Math.hypot(sx, sz);
        if (sl < 0.2) { sx = fx; sz = fz; } else { sx /= sl; sz /= sl; }
        s.group.position.set((ax + bx) / 2 - sz * TRACK, 0.05, (az + bz) / 2 + sx * TRACK);
        s.group.rotation.y = Math.atan2(sx, sz);
      });
    }

    function streetcarGong(dist) {
      if (!audio || !audio.ctx || audio.isMuted) return;
      const ctx = audio.ctx, t0 = ctx.currentTime, vol = 0.25 / (1 + dist / 15);
      [0, 0.22].forEach(off => {
        const t = t0 + off;
        [1318, 1975].forEach((f, k) => {
          const o = ctx.createOscillator(), g = ctx.createGain();
          o.type = 'triangle'; o.frequency.value = f;
          g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol * (k ? 0.4 : 1), t + 0.005);
          g.gain.exponentialRampToValueAtTime(0.0005, t + 0.6);
          o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + 0.65);
        });
      });
    }

    function updateStreetcars(dt, ctx, people, P) {
      streetcars.forEach(sc => {
        const rt = sc.route;
        sc.hitCd -= dt; sc.gongCd -= dt; sc.ghost -= dt;
        sc.boardGrace = Math.max(0, (sc.boardGrace || 0) - dt);

        if (sc.hasPlayer && sc.mode === 'dwell') {
          sc.timer = Math.min(sc.timer, 0.8);
        }

        if (sc.mode === 'hidden') {
          sc.timer -= dt;
          if (sc.timer > 0) return;
          // don't pop out on top of another car on the same track
          const blocked = streetcars.some(o => o !== sc && o.route === rt && o.mode !== 'hidden' && o.dir === sc.dir && Math.abs(o.d - sc.d) < SC.L + 12);
          if (blocked) { sc.timer = 1; return; }
          sc.mode = 'run'; sc.group.visible = true; sc.speed = 2;
        }

        if (sc.mode === 'dwell') {
          sc.timer -= dt;
          sc.speed = 0; sc.braking = true;
          if (sc.timer <= 0) { sc.mode = 'run'; if (sc.gongCd <= 0) { streetcarGong(Math.hypot(sc.vx - P.x, sc.vz - P.z)); sc.gongCd = 4; } }
        }

        let gap = Infinity, personAhead = false, waitingForTraffic = false;
        if (sc.mode === 'run') {
          // measured from the car's centre, so add half a car: you see 14-45 m past the nose
          const look = SC.L / 2 + Math.max(14, Math.min(45, 8 + sc.speed * 2.6));
          const rem = sc.dir > 0 ? rt.endHi - sc.d : sc.d - rt.endLo;
          gap = rem + 3.2;                                        // roll right to the end of the line

          // next stop
          let stopRem = Infinity;
          rt.stops.forEach(st => {
            if (st.dir && st.dir !== sc.dir) return;
            const sd = st.d;
            if (Math.abs(sd - sc.servedD) < 1) return;
            const r = (sd - sc.d) * sc.dir;
            if (r > -0.3 && r < stopRem) stopRem = r;
          });
          if (stopRem < Infinity) gap = Math.min(gap, Math.max(0, stopRem) + 3.0);
          if (stopRem < 0.5 && sc.speed < 0.6) {
            sc.mode = 'dwell'; sc.timer = STOP_DWELL; sc.servedD = sc.d + stopRem * sc.dir; sc.speed = 0;
          }

          // traffic lights (same ones the cars use)
          signals.forEach(sg => {
            if (sg.fx * sc.fx + sg.fz * sc.fz < 0.8) return;
            const r = rel(sc, sg.x, sg.z);
            if (r.f < SC.L / 2 || r.f > 70 || Math.abs(r.l) > rt.sigLat) return;
            const dStop = r.f - 5.2 - SC.L / 2;
            if (sg.state === 'red' || (sg.state === 'yellow' && dStop > 10)) {
              if (dStop + 2.5 < gap) { gap = dStop + 2.5; waitingForTraffic = true; }
            }
          });

          if (sc.ghost <= 0) {
            cars.forEach(o => {
              if (!o.road) return;
              const r = rel(sc, o.vx, o.vz);
              if (r.f <= SC.L / 2 || r.f > look + SC.L / 2 || Math.abs(r.l) > 1.9) return; // only cars clear ahead of our nose
              if (sc.fx * o.fx + sc.fz * o.fz < -0.5) return;     // oncoming
              gap = Math.min(gap, r.f - (SC.L + o.design.L * o.lenScale) / 2);
            });
            streetcars.forEach(o => {
              if (o === sc || o.mode === 'hidden') return;
              const r = rel(sc, o.vx, o.vz);
              if (r.f <= 0 || r.f > look + SC.L || Math.abs(r.l) > 1.9) return;
              if (sc.fx * o.fx + sc.fz * o.fz < -0.5) return;
              gap = Math.min(gap, r.f - SC.L - 2);
            });
          }
          people.forEach(p => {
            const r = rel(sc, p.x, p.z);
            if (r.f > 0 && r.f < look && Math.abs(r.l) < SC.W / 2 + 0.7) {
              const g = r.f - SC.L / 2 - 0.4;
              if (g < gap) { gap = g; personAhead = !!p.isPlayer; }
            }
          });
          if (personAhead && gap < 14 && sc.gongCd <= 0) { streetcarGong(Math.hypot(sc.vx - P.x, sc.vz - P.z)); sc.gongCd = 2.5; }

          // speed: streetcars pull away gently and brake smoothly
          const target = Math.min(rt.limit, Math.max(0, (gap - 3) * 0.8));
          const decel = gap < 6 ? 9 : 4;
          sc.speed += Math.max(-decel * dt, Math.min(1.4 * dt, target - sc.speed));
          sc.speed = Math.max(0, sc.speed);
          sc.braking = target < sc.speed - 0.3;

          if (sc.speed < 0.3 && gap < 6 && !personAhead && !waitingForTraffic) { sc.stuck += dt; if (sc.stuck > 8) { sc.ghost = 3; sc.stuck = 0; } }
          else sc.stuck = 0;

          sc.d += sc.dir * sc.speed * dt;
          // end of the line: off the map or into the Union Station tunnel; come back the other way
          if ((sc.dir > 0 && sc.d >= rt.endHi) || (sc.dir < 0 && sc.d <= rt.endLo)) {
            sc.d = Math.max(rt.endLo, Math.min(rt.endHi, sc.d));
            sc.dir *= -1;
            sc.servedD = -1e9; sc.speed = 0;
            if (sc.hasPlayer) {
              sc.mode = 'run';
              sc.group.visible = true;
            } else {
              sc.mode = 'hidden'; sc.timer = rt.portal && sc.dir < 0 ? 14 : 9;
              sc.group.visible = false;
            }
          }
        }

        placeStreetcar(sc);
        if (sc.mode === 'hidden') return;

        // collisions with people: same rules as cars, but a streetcar is not going to stop for you
        const hx = SC.L / 2 + 0.15, hz = SC.W / 2 + 0.15;
        people.forEach(p => {
          if (p.isPlayer && (sc.hasPlayer || sc.boardGrace > 0)) return;
          if (p.y !== undefined && (p.y < -1.5 || p.y > 15.0)) return;
          if (p.isPlayer && (ctx.state && (ctx.state.onSubway || ctx.state.isUnderground))) return;
          const r = rel(sc, p.x, p.z);
          const R = p.isPlayer ? 0.45 : 0.5;
          if (Math.abs(r.f) > hx + R || Math.abs(r.l) > hz + R) return;
          if (p.isPlayer && city.isInsidePeaceZone(p.x, p.z)) return;
          if (sc.speed > 3 && sc.hitCd <= 0) {
            const side = r.l >= 0 ? 1 : -1;
            const kx = sc.fx * sc.speed * 1.1 + -sc.fz * side * 4, kz = sc.fz * sc.speed * 1.1 + sc.fx * side * 4;
            const dmg = Math.round(12 + sc.speed * 3);
            if (p.isPlayer) ctx.onHitPlayer(dmg, kx, kz, sc);
            else ctx.onHitEnemy(p.enemy, dmg * 2, kx * 1.3, kz * 1.3, sc);
            crunch(); streetcarGong(0);
            sc.hitCd = 0.8; sc.gongCd = 3; sc.speed *= 0.5;
          } else {
            const pf = hx + R - Math.abs(r.f), pl = hz + R - Math.abs(r.l);
            if (pl < pf) { const s = (r.l >= 0 ? 1 : -1) * pl; ctx.pushOut(p, -sc.fz * s, sc.fx * s); }
            else { const s = (r.f >= 0 ? 1 : -1) * pf; ctx.pushOut(p, sc.fx * s, sc.fz * s); }
          }
        });
      });
    }

    // Build the stop poles now that every route has its stops
    if (stopPoleSpots.length) {
      const poleMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.06, 0.06, 3.0, 8),
        new THREE.MeshStandardMaterial({ color: 0x9ca3af, metalness: 0.6, roughness: 0.4 }), stopPoleSpots.length);
      const signMeshI = new THREE.InstancedMesh(new THREE.BoxGeometry(0.05, 0.6, 0.45),
        new THREE.MeshStandardMaterial({ color: 0xda251d, roughness: 0.5 }), stopPoleSpots.length);
      const bandMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.06, 0.16, 0.46),
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 }), stopPoleSpots.length);
      const mm = new THREE.Matrix4(), qq = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1), pp = new THREE.Vector3(), upv = new THREE.Vector3(0, 1, 0);
      stopPoleSpots.forEach((sp, i) => {
        qq.setFromAxisAngle(upv, sp.yaw);
        mm.compose(pp.set(sp.x, 1.5, sp.z), qq, one); poleMesh.setMatrixAt(i, mm);
        mm.compose(pp.set(sp.x, 2.7, sp.z), qq, one); signMeshI.setMatrixAt(i, mm);
        mm.compose(pp.set(sp.x, 2.55, sp.z), qq, one); bandMesh.setMatrixAt(i, mm);
      });
      [poleMesh, signMeshI, bandMesh].forEach(m => { m.instanceMatrix.needsUpdate = true; scene.add(m); });
    }

    // ---------- audio ----------
    let engine = null;
    function ensureEngine() {
      if (engine || !audio || !audio.ctx) return;
      const ctx = audio.ctx;
      const osc = ctx.createOscillator(), osc2 = ctx.createOscillator(), filt = ctx.createBiquadFilter(), gain = ctx.createGain();
      osc.type = 'sawtooth'; osc2.type = 'square'; osc2.detune.value = 9;
      filt.type = 'lowpass'; filt.frequency.value = 260;
      gain.gain.value = 0;
      osc.connect(filt); osc2.connect(filt); filt.connect(gain); gain.connect(ctx.destination);
      osc.start(); osc2.start();
      engine = { osc, osc2, gain, filt };
    }
    function honk(dist) {
      if (!audio || !audio.ctx || audio.isMuted) return;
      const ctx = audio.ctx, t = ctx.currentTime, vol = 0.22 / (1 + dist / 12);
      [415, 523].forEach(f => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'square'; o.frequency.value = f;
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.02);
        g.gain.setValueAtTime(vol, t + 0.32); g.gain.linearRampToValueAtTime(0, t + 0.38);
        o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + 0.4);
      });
    }
    function whoosh(dist, speed) {
      if (!audio || !audio.ctx || audio.isMuted) return;
      const ctx = audio.ctx, t = ctx.currentTime, len = 0.7;
      const buf = ctx.createBuffer(1, ctx.sampleRate * len, ctx.sampleRate), data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) { const k = i / data.length; data[i] = (rnd() * 2 - 1) * Math.sin(Math.PI * k) * (1 - k * 0.5); }
      const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      src.buffer = buf; f.type = 'bandpass'; f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(300, t + len);
      g.gain.value = Math.min(0.3, speed / 50) / (1 + dist / 4);
      src.connect(f); f.connect(g); g.connect(ctx.destination); src.start(t);
    }
    function crunch() {
      if (!audio || !audio.ctx || audio.isMuted) return;
      if (audio.playImpact) audio.playImpact('heavy');
    }

    // ---------- per-frame ----------
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), pv = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    const brakeCol = new THREE.Color(1, 1, 1), normCol = new THREE.Color(0.5, 0.5, 0.5);

    // local coords of a point relative to a car (forward / lateral)
    function rel(c, x, z) {
      const dx = x - c.vx, dz = z - c.vz;
      return { f: dx * c.fx + dz * c.fz, l: dx * -c.fz + dz * c.fx };
    }

    function writeCar(c) {
      const L = c.design.L * c.lenScale;
      q.setFromAxisAngle(up, c.vh - Math.PI / 2); // designs face +x
      const y = c.road.y || 0.05;
      m4.compose(pv.set(c.vx, y, c.vz), q, sc.set(c.lenScale, 1, 1));
      const m = meshes[c.kind];
      ['paint', 'glass', 'trim', 'head', 'tail', 'sign'].forEach(g => { if (m[g]) m[g].setMatrixAt(c.slot, m4); });
      if (m.tail) m.tail.setColorAt(c.slot, c.braking ? brakeCol : normCol);

      const fx = Math.sin(c.vh), fz = Math.cos(c.vh);
      q.setFromAxisAngle(up, c.vh);
      m4.compose(pv.set(c.vx + fx * (L / 2 + 6.5), 0.11, c.vz + fz * (L / 2 + 6.5)), q, sc.set(4.6, 1, 12));
      beams.setMatrixAt(c.id, m4);
      m4.compose(pv.set(c.vx - fx * (L / 2 + 1.0), 0.11, c.vz - fz * (L / 2 + 1.0)), q, sc.set(c.design.W * 1.6, 1, c.braking ? 3.6 : 2.4));
      tailGlow.setMatrixAt(c.id, m4);
      tailGlow.setColorAt(c.id, c.braking ? brakeCol : normCol);
      m4.compose(pv.set(c.vx, 0.1, c.vz), q, sc.set(c.design.W * 1.35, 1, L * 1.15));
      blobs.setMatrixAt(c.id, m4);
    }

    function update(dt, ctx) {
      dt = Math.min(dt, 0.05);
      const P = ctx.player.pos;

      // Update Toronto Traffic Signals
      signalTimer += dt;
      for (let i = 0; i < signals.length; i++) {
        const sig = signals[i];
        const t = (signalTimer + sig.offset) % CYCLE;
        let st = 'red', ped = 'dontwalk';
        if (sig.phase === 0) {
          if (t < 16.5) { st = 'green'; ped = t > 12.5 ? (Math.floor(t * 3) % 2 === 0 ? 'dontwalk' : 'off') : 'walk'; }
          else if (t < 20.0) { st = 'yellow'; ped = 'dontwalk'; }
          else { st = 'red'; ped = 'dontwalk'; }
        } else {
          if (t < 21.0) { st = 'red'; ped = 'dontwalk'; }
          else if (t < 37.5) { st = 'green'; ped = t > 33.5 ? (Math.floor(t * 3) % 2 === 0 ? 'dontwalk' : 'off') : 'walk'; }
          else if (t < 41.0) { st = 'yellow'; ped = 'dontwalk'; }
          else { st = 'red'; ped = 'dontwalk'; }
        }
        sig.state = st;
        sig.ped = ped;
        redLensMesh.setColorAt(i, st === 'red' ? COL_RED_ON : COL_RED_OFF);
        yellowLensMesh.setColorAt(i, st === 'yellow' ? COL_YEL_ON : COL_YEL_OFF);
        greenLensMesh.setColorAt(i, st === 'green' ? COL_GRN_ON : COL_GRN_OFF);
        pedLensMesh.setColorAt(i, ped === 'walk' ? COL_WALK : (ped === 'dontwalk' ? COL_DONTWALK : COL_PED_OFF));
      }
      if (signals.length) {
        redLensMesh.instanceColor.needsUpdate = true;
        yellowLensMesh.instanceColor.needsUpdate = true;
        greenLensMesh.instanceColor.needsUpdate = true;
        pedLensMesh.instanceColor.needsUpdate = true;
      }
      const people = [];
      const isPlayerUnderground = (ctx.state && (ctx.state.onSubway || ctx.state.isUnderground)) || (P.y < -2.0);
      const isPlayerSky = P.y > 25.0;
      if (!isPlayerUnderground && !isPlayerSky) {
        people.push({ x: P.x, z: P.z, isPlayer: true, y: P.y });
      }
      ctx.enemies.forEach(e => {
        if (!e.isDead && e.rig) {
          const ep = e.rig.root.position;
          // Ignore enemies and citizens that are underground in the subway (y < -2.0) or high up in CN Tower
          if (ep.y < -2.0 || ep.y > 25.0 || e.isSubwayCitizen || e.isDeckEnemy) return;
          if (ep.z < 650 && Math.abs(ep.x - P.x) < 170 && Math.abs(ep.z - P.z) < 170) {
            people.push({ x: ep.x, z: ep.z, enemy: e, y: ep.y });
          }
        }
      });
      let nearest = Infinity, nearestSpeed = 0;

      cars.forEach(c => {
        // traffic bubble: recycle cars that drift far from the player
        if (Math.hypot(c.vx - P.x, c.vz - P.z) > 280) placeCar(c, P, 90, 220);
        c.honkCd -= dt; c.whooshCd -= dt; c.hitCd -= dt; c.ghost -= dt;

        // ---- look ahead: cars + people in our path ----
        const L = c.design.L * c.lenScale;
        const look = Math.max(9, Math.min(28, 5 + c.speed * 1.7));
        let gap = Infinity, personAhead = false;
        if (c.ghost <= 0) {
          cars.forEach(o => {
            if (o === c) return;
            const r = rel(c, o.vx, o.vz);
            if (r.f <= 0 || r.f > look || Math.abs(r.l) > 1.7) return;
            const dot = c.fx * o.fx + c.fz * o.fz;
            if (dot < -0.5) return;                               // oncoming lane
            if (dot < 0.5) {                                      // crossing traffic: lower id has right of way
              const back = rel(o, c.vx, c.vz);
              if (back.f > 0 && back.f < look && Math.abs(back.l) < 1.7 && o.id > c.id) return;
            }
            gap = Math.min(gap, r.f - (L + o.design.L * o.lenScale) / 2);
          });
        }
        let streetcarAhead = false;
        streetcars.forEach(o => {
          if (o.mode === 'hidden') return;
          const inside = rel(o, c.vx, c.vz);
          if (Math.abs(inside.f) < SC.L / 2 + 1 && Math.abs(inside.l) < SC.W / 2 + 0.8) return;
          for (let k = -0.5; k <= 0.51; k += 0.1) {            // every ~2.8 m along the car
            const r = rel(c, o.vx + o.fx * SC.L * k, o.vz + o.fz * SC.L * k);
            if (r.f <= 0 || r.f > look || Math.abs(r.l) > 1.9) continue;
            const g = r.f - L / 2 - 1.0;
            if (g < gap) { gap = g; streetcarAhead = true; }
          }
        });
        people.forEach(p => {
          const r = rel(c, p.x, p.z);
          if (r.f > 0 && r.f < look && Math.abs(r.l) < c.design.W / 2 + 0.7) {
            const g = r.f - L / 2 - 0.4;
            if (g < gap) { gap = g; personAhead = !!p.isPlayer; }
          }
        });

        // ---- Look ahead for traffic lights & stop bars ----
        const rem = c.dir > 0 ? (c.road.len - c.s) : c.s;
        let isWaitingAtRed = false;
        if (rem < 36 && rem > 0.6) {
          const atStart = c.dir < 0;
          const app = roadApproachMap.get(c.road.id + ':' + atStart);
          if (app && app.signal) {
            const sig = app.signal.state;
            if (sig === 'red' || (sig === 'yellow' && rem > 12)) {
              const dStop = Math.max(0, rem - app.stopDist);
              if (dStop < gap) {
                gap = dStop;
                if (rem < 15) isWaitingAtRed = true;
              }
              if (dStop <= 0.8) {
                c.speed = 0;
                c.braking = true;
              }
            }
          }
        }

        // ---- speed control (simple intelligent-driver model) ----
        const limit = c.road.limit;
        let target = limit;
        if (gap < Infinity) target = Math.min(limit, Math.max(0, (gap - 2.5) * 1.1));
        const accel = target > c.speed ? 3.2 : -9.0; // brake much harder than we accelerate
        c.speed += Math.max(-9.0 * dt, Math.min(3.2 * dt, target - c.speed)) * (accel < 0 ? 1 : 1);
        c.speed = Math.max(0, c.speed);
        c.braking = target < c.speed - 0.5 || (c.speed < 0.5 && gap < 6);
        if (personAhead && gap < 10 && c.speed > 2 && c.honkCd <= 0) { honk(Math.hypot(c.vx - P.x, c.vz - P.z)); c.honkCd = 2.5; }

        // gridlock breaker: if stuck behind cars for a while, ghost through
        if (c.speed < 0.3 && gap < 6 && !personAhead && !isWaitingAtRed && !streetcarAhead) { c.stuck += dt; if (c.stuck > 6) { c.ghost = 2.5; c.stuck = 0; } } else c.stuck = 0;

        // ---- move along the network ----
        c.s += c.speed * dt;
        let guard = 0;
        while (c.s >= c.road.len && guard++ < 4) { const over = c.s - c.road.len; advanceRoad(c); c.s += over; }
        computeLogical(c);
        // visual smoothing (hides lane hops at junctions)
        const k = 1 - Math.exp(-dt * 8);
        c.vx += (c.lx - c.vx) * k; c.vz += (c.lz - c.vz) * k;
        let dh = c.lh - c.vh; dh = Math.atan2(Math.sin(dh), Math.cos(dh));
        c.vh += dh * (1 - Math.exp(-dt * 6));

        // ---- collisions with people ----
        const hx = L / 2 + 0.15, hz = c.design.W / 2 + 0.15;
        people.forEach(p => {
          if (p.y !== undefined && (p.y < -1.5 || p.y > 15.0)) return;
          if (p.isPlayer && (ctx.state && (ctx.state.onSubway || ctx.state.isUnderground))) return;
          const r = rel(c, p.x, p.z);
          const R = p.isPlayer ? 0.45 : 0.5;
          if (Math.abs(r.f) > hx + R || Math.abs(r.l) > hz + R) return;
          if (p.isPlayer && p.y - 1.7 > c.design.H - 0.1) return;          // jumped over it!
          if (p.isPlayer && city.isInsidePeaceZone(p.x, p.z)) return;
          const fast = c.speed > 3;
          if (fast && c.hitCd <= 0) {
            const side = r.l >= 0 ? 1 : -1;
            const kx = c.fx * c.speed * 0.95 + -c.fz * side * 3, kz = c.fz * c.speed * 0.95 + c.fx * side * 3;
            const dmg = Math.round(8 + c.speed * 2.4);
            if (p.isPlayer) ctx.onHitPlayer(dmg, kx, kz, c);
            else ctx.onHitEnemy(p.enemy, dmg * 2, kx * 1.3, kz * 1.3, c);
            crunch();
            c.hitCd = 0.6;
            c.speed *= 0.35;                 // the impact slows the car hard...
            c.honkCd = 0; honk(0);           // ...and the driver leans on the horn
            c.honkCd = 3;
          } else if (!fast) {
            // slow contact: car is solid, push the person out the shortest way
            const pf = hx + R - Math.abs(r.f), pl = hz + R - Math.abs(r.l);
            if (pl < pf) { const s = (r.l >= 0 ? 1 : -1) * pl; ctx.pushOut(p, -c.fz * s, c.fx * s); }
            else { const s = (r.f >= 0 ? 1 : -1) * pf; ctx.pushOut(p, c.fx * s, c.fz * s); }
          }
        });

        // pass-by whoosh
        const dP = Math.hypot(c.vx - P.x, c.vz - P.z);
        if (dP < 6 && c.speed > 8 && c.whooshCd <= 0) { whoosh(dP, c.speed); c.whooshCd = 1.5; }
        if (dP < nearest) { nearest = dP; nearestSpeed = c.speed; }

        writeCar(c);
      });

      updateStreetcars(dt, ctx, people, P);

      Object.values(meshes).forEach(m => {
        ['paint', 'glass', 'trim', 'head', 'tail', 'sign'].forEach(g => { if (m[g]) m[g].instanceMatrix.needsUpdate = true; });
        if (m.tail && m.tail.instanceColor) m.tail.instanceColor.needsUpdate = true;
      });
      [beams, tailGlow, blobs].forEach(im => { im.instanceMatrix.needsUpdate = true; });
      tailGlow.instanceColor.needsUpdate = true;

      // Accessible Pedestrian Signal (APS) Audio chirp
      pedAudioTimer += dt;
      if (pedAudioTimer >= 1.15) {
        pedAudioTimer = 0;
        let nearDist = 32, nearSig = null;
        signals.forEach(s => {
          const d = Math.hypot(s.x - P.x, s.z - P.z);
          if (d < nearDist) { nearDist = d; nearSig = s; }
        });
        if (nearSig && nearSig.ped === 'walk') {
          audio.playWalkSignal(nearDist, nearSig.isEastWest);
        }
      }

      // engine rumble from the nearest car
      ensureEngine();
      if (engine) {
        const t = audio.ctx.currentTime;
        const vol = audio.isMuted ? 0 : Math.min(0.08, 0.6 / (1 + nearest * nearest * 0.05)) * (0.4 + nearestSpeed / 14);
        engine.gain.gain.setTargetAtTime(vol, t, 0.15);
        engine.osc.frequency.setTargetAtTime(38 + nearestSpeed * 4.2, t, 0.2);
        engine.osc2.frequency.setTargetAtTime(38 + nearestSpeed * 4.2, t, 0.2);
      }
    }

    cars.forEach(c => { if (c.road) writeCar(c); });
    Object.values(meshes).forEach(m => ['paint', 'glass', 'trim', 'head', 'tail', 'sign'].forEach(g => { if (m[g]) m[g].instanceMatrix.needsUpdate = true; }));
    [beams, tailGlow, blobs].forEach(im => { im.instanceMatrix.needsUpdate = true; });

    function silence() { if (engine) engine.gain.gain.setTargetAtTime(0, audio.ctx.currentTime, 0.1); }

    function isSafeCrossing(px, pz) {
      for (let i = 0; i < crosswalkList.length; i++) {
        const cw = crosswalkList[i];
        const dx = px - cw.x, dz = pz - cw.z;
        if (dx * dx + dz * dz < 20) {
          const isRed = cw.signal.state === 'red';
          const isWalk = cw.signal.ped === 'walk';
          return { inCrosswalk: true, isSafe: isRed || isWalk, street: cw.streetName, signal: cw.signal.state };
        }
      }
      return { inCrosswalk: false, isSafe: false, street: '', signal: '' };
    }

    function streetcarDots() {
      return streetcars.filter(sc => sc.mode !== 'hidden').map(sc => ({ x: sc.vx, z: sc.vz }));
    }

    return { cars, streetcars, streetcarDots, update, silence, ringGong: () => streetcarGong(0), getIntersections: () => signalIntersections, isSafeCrossing };
  }

  window.createTraffic = createTraffic;
})();

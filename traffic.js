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
  function roundedBoxGeo(w, h, d, r, seg = 1) {
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
      bevelThickness: bevel, bevelSize: bevel * 0.8, bevelSegments: 2, curveSegments: 4
    });
    g.translate(0, 0, -(width - bevel * 2) / 2);
    g.computeVertexNormals();
    return g;
  }

  // Oriented +Z quad with explicit UVs (works identically in WebGL and headless mock)
  function uvQuad(w, h, u0, v0, u1, v1) {
    const hw = w * 0.5, hh = h * 0.5;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([
      -hw, -hh, 0,  hw, -hh, 0,  hw, hh, 0,
      -hw, -hh, 0,  hw, hh, 0,  -hw, hh, 0
    ], 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute([
      0, 0, 1,  0, 0, 1,  0, 0, 1,
      0, 0, 1,  0, 0, 1,  0, 0, 1
    ], 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute([
      u0, v0,  u1, v0,  u1, v1,
      u0, v0,  u1, v1,  u0, v1
    ], 2));
    return g;
  }

  // Merge parts (each {geo, color}) into one non-indexed geometry with vertex colours (and optional UVs)
  function merge(parts, withUV = false) {
    const pos = [], nrm = [], col = [], uv = withUV ? [] : null;
    parts.forEach(({ geo, color }) => {
      const g = geo.index ? geo.toNonIndexed() : geo;
      const p = g.attributes.position.array, n = g.attributes.normal.array;
      const u = withUV && g.attributes.uv ? g.attributes.uv.array : null;
      const vCount = p.length / 3;
      for (let i = 0; i < p.length; i += 3) {
        pos.push(p[i], p[i + 1], p[i + 2]);
        nrm.push(n[i], n[i + 1], n[i + 2]);
        col.push(color[0], color[1], color[2]);
      }
      if (withUV) {
        if (u && u.length >= vCount * 2) {
          for (let j = 0; j < vCount * 2; j++) uv.push(u[j]);
        } else {
          // Default UV pointing into white corner swatch (0.95, 0.08) so untextured solids tint purely by vertex color
          for (let j = 0; j < vCount; j++) uv.push(0.95, 0.08);
        }
      }
    });
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
    out.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    if (withUV) out.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    return out;
  }

  const C = hex => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };
  const TIRE = C(0x111113), RIM = C(0x9aa0a8), TRIM = C(0x16171a), GRILLE = C(0x0b0c0e), PLATE = C(0xe8e8e0), CHROME = C(0xc8ccd2);

  // Shared 512x512 Toronto Vehicle Graphics Atlas (Ontario plates, Beck Taxi, TPS Police, TTC Bus)
  const ATLAS_UV = {
    plate:   [0.01, 0.76, 0.49, 0.99],   // top-left: Ontario plate
    beckTop: [0.51, 0.76, 0.99, 0.99],   // top-right: BECK TAXI topper
    beckDoor:[0.01, 0.51, 0.49, 0.74],   // mid-upper-left: BECK 416-751-5555 door
    tpsDoor: [0.51, 0.51, 0.99, 0.74],   // mid-upper-right: POLICE TORONTO door
    ttcLed:  [0.01, 0.32, 0.99, 0.49],   // wide amber LED bus destination header
    ttcCrest:[0.01, 0.02, 0.49, 0.30],   // bottom-left: TTC winged emblem
    tpsRear: [0.51, 0.16, 0.99, 0.30]    // bottom-right upper: 911 POLICE rear badge
  };

  function createVehicleAtlas() {
    const W = 512, H = 512, c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    if (g) {
      g.fillStyle = '#ffffff';
      g.fillRect(0, 0, W, H);

      // 1. Ontario Licence Plate (0, 0, 256, 128)
      g.fillStyle = '#f8fafc';
      g.fillRect(4, 4, 248, 120);
      g.strokeStyle = '#1e3a8a';
      g.lineWidth = 6;
      g.strokeRect(8, 8, 240, 112);
      g.fillStyle = '#1d4ed8';
      g.font = 'bold 20px sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('ONTARIO', 128, 28);
      g.fillStyle = '#0f2557';
      g.font = 'bold 46px monospace';
      g.fillText('CVMT 408', 128, 68);
      g.fillStyle = '#2563eb';
      g.font = 'bold 14px sans-serif';
      g.fillText('YOURS TO DISCOVER', 128, 104);

      // 2. Beck Taxi Roof Topper (256, 0, 256, 128)
      g.fillStyle = '#fde047';
      g.fillRect(256, 0, 256, 128);
      g.fillStyle = '#0d9488';
      g.fillRect(262, 6, 244, 18);
      g.fillRect(262, 104, 244, 18);
      g.fillStyle = '#0f172a';
      g.font = 'bold 54px sans-serif';
      g.fillText('BECK', 384, 58);
      g.fillStyle = '#ea580c';
      g.font = 'bold 22px sans-serif';
      g.fillText('TAXI', 384, 92);

      // 3. Beck Taxi Door Graphic (0, 128, 256, 128)
      g.fillStyle = '#f97316';
      g.fillRect(0, 128, 256, 128);
      g.fillStyle = '#0d9488';
      g.fillRect(0, 206, 256, 50);
      g.fillStyle = '#ffffff';
      g.font = 'bold 44px sans-serif';
      g.fillText('BECK', 128, 168);
      g.fillStyle = '#fef08a';
      g.font = 'bold 24px sans-serif';
      g.fillText('416-751-5555', 128, 232);

      // 4. Toronto Police Service Door Graphic (256, 128, 256, 128)
      g.fillStyle = '#f8fafc';
      g.fillRect(256, 128, 256, 128);
      g.fillStyle = '#27272a';
      g.fillRect(256, 128, 256, 14);
      g.fillRect(256, 240, 256, 16);
      g.fillStyle = '#dc2626';
      g.fillRect(256, 224, 256, 7);
      g.fillStyle = '#1d4ed8';
      g.fillRect(256, 231, 256, 9);
      // TPS Shield Crest on left
      g.fillStyle = '#1e3a8a';
      g.beginPath();
      g.moveTo(276, 154); g.lineTo(312, 154); g.lineTo(312, 186); g.lineTo(294, 206); g.lineTo(276, 186);
      g.closePath(); g.fill();
      g.fillStyle = '#facc15';
      g.fillRect(286, 166, 16, 20);
      g.fillStyle = '#0f172a';
      g.font = 'bold 40px sans-serif';
      g.fillText('POLICE', 406, 178);
      g.fillStyle = '#1e3a8a';
      g.font = 'bold 16px sans-serif';
      g.fillText('TORONTO SERVICE', 404, 208);

      // 5. TTC Bus Amber LED Destination Sign (0, 256, 512, 96)
      g.fillStyle = '#07080b';
      g.fillRect(0, 256, 512, 96);
      g.strokeStyle = '#334155';
      g.lineWidth = 4;
      g.strokeRect(4, 260, 504, 88);
      g.fillStyle = '#da251d';
      g.fillRect(16, 272, 92, 64);
      g.fillStyle = '#ffffff';
      g.font = 'bold 42px sans-serif';
      g.fillText('6', 62, 306);
      g.fillStyle = '#ffb000';
      g.font = 'bold 38px sans-serif';
      g.fillText('BAY  •  QUEENS QUAY', 310, 304);

      // 6. TTC Red & White Winged Emblem (0, 352, 256, 160)
      g.fillStyle = '#da251d';
      g.fillRect(0, 352, 256, 160);
      g.fillStyle = '#ffffff';
      g.fillRect(10, 412, 236, 12);
      g.fillRect(22, 434, 212, 8);
      g.beginPath();
      g.arc(128, 426, 46, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = '#da251d';
      g.lineWidth = 6;
      g.stroke();
      g.fillStyle = '#da251d';
      g.font = 'bold 38px sans-serif';
      g.fillText('TTC', 128, 428);
      g.fillStyle = '#ffffff';
      g.font = 'bold 16px sans-serif';
      g.fillText('TORONTO TRANSIT', 128, 488);

      // 7. TPS Rear 911 Badge (256, 352, 256, 80) — bottom-right corner remains solid white!
      g.fillStyle = '#1e293b';
      g.fillRect(256, 352, 256, 80);
      g.fillStyle = '#f8fafc';
      g.font = 'bold 32px sans-serif';
      g.fillText('POLICE  911', 384, 394);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.anisotropy = 4;
    return tex;
  }

  // ---------- car designs ----------
  // Each design returns parts grouped by material: paint / glass / trim / head / tail / decal / sign
  function buildDesign(kind) {
    const P = { paint: [], glass: [], trim: [], head: [], tail: [], decal: [], sign: [] };
    const add = (group, geo, color = [1, 1, 1], x = 0, y = 0, z = 0, ry = 0, rx = 0, rz = 0) => {
      if (rx) geo.rotateX(rx);
      if (rz) geo.rotateZ(rz);
      if (ry) geo.rotateY(ry);
      geo.translate(x, y, z);
      P[group].push({ geo, color });
    };
    const addQuad = (group, w, h, uvRect, color, x, y, z, ry = 0, rx = 0) => {
      const g = uvQuad(w, h, uvRect[0], uvRect[1], uvRect[2], uvRect[3]);
      add(group, g, color, x, y, z, ry, rx, 0);
    };
    let L, W, wheelR, wheelX, rideH, frontY = 0.78, roofH = 1.45;
    let isBus = false, isPolice = false;

    // Lower body profile + greenhouse (glass) profile + roof + A/B/C pillars per body style
    if (kind === 'sedan' || kind === 'taxi') {
      L = 4.75; W = 1.84; wheelR = 0.34; wheelX = 1.42; rideH = 0.3; roofH = 1.45;
      add('paint', profileGeo([[-2.37, 0.32], [2.37, 0.32], [2.4, 0.62], [2.3, 0.78], [1.1, 0.92], [-1.45, 0.94], [-2.3, 0.88], [-2.4, 0.66]], W, 0.08));
      add('glass', profileGeo([[1.05, 0.9], [0.25, 1.38], [-0.95, 1.4], [-1.55, 0.92]], W * 0.86, 0.05));
      add('paint', roundedBoxGeo(1.25, 0.06, W * 0.8, 0.03, 1), [1, 1, 1], -0.35, 1.41, 0);
      // A / B / C roof pillars + window sill trim to break up solid-black glass helmet
      [-1, 1].forEach(s => {
        const pz = s * (W * 0.42);
        add('paint', roundedBoxGeo(0.08, 0.76, 0.08, 0.02, 1), [1, 1, 1], 0.65, 1.15, pz, 0, 0, 0.98);   // A-pillar
        add('trim', roundedBoxGeo(0.11, 0.50, 0.06, 0.015, 1), TRIM, -0.18, 1.15, pz);                    // B-pillar
        add('paint', roundedBoxGeo(0.14, 0.66, 0.08, 0.02, 1), [1, 1, 1], -1.24, 1.16, pz, 0, 0, -0.82); // C-pillar
      });
    } else if (kind === 'hatch') {
      L = 4.1; W = 1.78; wheelR = 0.32; wheelX = 1.28; rideH = 0.3; roofH = 1.48;
      add('paint', profileGeo([[-2.0, 0.32], [2.05, 0.32], [2.08, 0.62], [1.95, 0.78], [0.95, 0.92], [-1.9, 0.98], [-2.05, 0.7]], W, 0.08));
      add('glass', profileGeo([[0.9, 0.9], [0.15, 1.42], [-1.55, 1.44], [-1.9, 0.96]], W * 0.86, 0.05));
      add('paint', roundedBoxGeo(1.75, 0.06, W * 0.8, 0.03, 1), [1, 1, 1], -0.68, 1.45, 0);
      [-1, 1].forEach(s => {
        const pz = s * (W * 0.42);
        add('paint', roundedBoxGeo(0.08, 0.74, 0.08, 0.02, 1), [1, 1, 1], 0.52, 1.17, pz, 0, 0, 0.92);
        add('trim', roundedBoxGeo(0.11, 0.52, 0.06, 0.015, 1), TRIM, -0.36, 1.17, pz);
        add('paint', roundedBoxGeo(0.14, 0.58, 0.08, 0.02, 1), [1, 1, 1], -1.72, 1.20, pz, 0, 0, -0.58);
      });
    } else if (kind === 'suv' || kind === 'police') {
      isPolice = (kind === 'police');
      L = isPolice ? 4.95 : 4.85; W = isPolice ? 1.92 : 1.96; wheelR = 0.4; wheelX = 1.5; rideH = 0.42; roofH = 1.80;
      add('paint', profileGeo([[-2.42, 0.42], [2.42, 0.42], [2.45, 0.8], [2.3, 1.02], [1.25, 1.12], [-2.35, 1.14], [-2.45, 0.85]], W, 0.1));
      add('glass', profileGeo([[1.2, 1.1], [0.45, 1.68], [-2.15, 1.7], [-2.3, 1.12]], W * 0.88, 0.06));
      add('paint', roundedBoxGeo(2.5, 0.07, W * 0.84, 0.035, 1), [1, 1, 1], -0.85, 1.71, 0);
      [-1, 1].forEach(s => {
        const pz = s * (W * 0.43);
        add('trim', roundedBoxGeo(2.2, 0.04, 0.05, 0.02, 1), CHROME, -0.85, 1.77, s * W * 0.36); // roof rails
        add('paint', roundedBoxGeo(0.08, 0.78, 0.08, 0.02, 1), [1, 1, 1], 0.82, 1.40, pz, 0, 0, 0.88);   // A-pillar
        add('trim', roundedBoxGeo(0.12, 0.58, 0.06, 0.015, 1), TRIM, -0.15, 1.40, pz);                    // B-pillar
        add('trim', roundedBoxGeo(0.11, 0.58, 0.06, 0.015, 1), TRIM, -1.18, 1.40, pz);                    // C-pillar
        add('paint', roundedBoxGeo(0.14, 0.60, 0.08, 0.02, 1), [1, 1, 1], -2.22, 1.41, pz, 0, 0, -0.22); // D-pillar
      });
    } else if (kind === 'van') {
      L = 5.1; W = 2.0; wheelR = 0.36; wheelX = 1.65; rideH = 0.36; roofH = 2.02;
      add('paint', profileGeo([[-2.55, 0.36], [2.55, 0.36], [2.58, 0.75], [2.35, 1.0], [1.65, 1.15], [1.4, 1.95], [-2.5, 2.0], [-2.58, 0.7]], W, 0.1));
      add('glass', profileGeo([[1.62, 1.12], [1.38, 1.85], [0.42, 1.86], [0.42, 1.14]], W * 0.99, 0.02));
      add('glass', roundedBoxGeo(1.75, 0.46, W * 0.99, 0.03, 1), [1, 1, 1], -0.75, 1.54, 0);
      [-1, 1].forEach(s => {
        const pz = s * (W * 0.495);
        add('trim', roundedBoxGeo(0.10, 0.72, 0.04, 0.01, 1), TRIM, 0.40, 1.50, pz);
        add('trim', roundedBoxGeo(0.10, 0.52, 0.04, 0.01, 1), TRIM, -0.75, 1.54, pz);
      });
    } else if (kind === 'ttc_bus') {
      isBus = true;
      L = 10.6; W = 2.42; wheelR = 0.48; wheelX = 3.15; rideH = 0.32; roofH = 3.12;
      const hw = W * 0.5, hl = L * 0.5;
      // Sleek TTC Nova Bus LFS / Orion VII body: white upper fuselage + iconic TTC red lower skirt & upper trim
      add('paint', profileGeo([[-hl, 0.92], [hl, 0.92], [hl - 0.1, 2.95], [-hl + 0.06, 2.95]], W, 0.08));
      add('trim', roundedBoxGeo(L + 0.04, 0.62, W + 0.02, 0.05, 1), C(0xda251d), 0, 0.65, 0);          // TTC red lower skirt
      add('trim', roundedBoxGeo(L - 0.14, 0.24, W + 0.01, 0.03, 1), C(0xda251d), 0, 2.86, 0);          // TTC red roofline stripe
      add('trim', roundedBoxGeo(0.24, 0.44, W * 0.96, 0.03, 1), C(0xda251d), hl + 0.02, 0.72, 0);      // Red front fascia
      // Continuous black transit window band + panoramic windshield + rear cap
      add('glass', roundedBoxGeo(L - 0.28, 1.18, W + 0.025, 0.04, 1), [1, 1, 1], 0.06, 2.02, 0);
      add('glass', roundedBoxGeo(0.12, 1.65, W * 0.92, 0.03, 1), [1, 1, 1], hl - 0.02, 1.90, 0);
      // Black vertical window mullions & curb-side (+Z) dual transit doors
      for (let mx = -3.8; mx <= 3.8; mx += 1.52) {
        [-1, 1].forEach(s => {
          add('trim', roundedBoxGeo(0.08, 1.22, 0.04, 0.01, 1), TRIM, mx, 2.02, s * (hw + 0.012));
        });
      }
      [hl - 1.35, -0.45].forEach(dx => {
        add('trim', roundedBoxGeo(1.08, 2.15, 0.05, 0.02, 1), C(0x1f2937), dx, 1.45, hw + 0.02);
        add('glass', roundedBoxGeo(0.90, 1.52, 0.06, 0.01, 1), [1, 1, 1], dx, 1.68, hw + 0.025);
        add('trim', roundedBoxGeo(0.04, 2.15, 0.07, 0.01, 1), TRIM, dx, 1.45, hw + 0.03);
      });
      // Stepped Roof HVAC & Hybrid Pod
      add('paint', roundedBoxGeo(4.2, 0.34, W * 0.72, 0.08, 1), [1, 1, 1], -0.6, 3.08, 0);
      add('trim', roundedBoxGeo(2.8, 0.24, W * 0.62, 0.06, 1), C(0xd1d5db), 2.8, 3.04, 0);
      // Iconic Toronto front bus bike rack (folded steel rack on bumper)
      add('trim', roundedBoxGeo(0.18, 0.06, 1.65, 0.02, 1), TRIM, hl + 0.16, 0.56, 0);
      [-0.74, 0.74].forEach(rz => add('trim', roundedBoxGeo(0.18, 0.42, 0.05, 0.02, 1), TRIM, hl + 0.16, 0.75, rz));
      // Amber LED route sign box + crisp textured LED header + TTC winged crests + plates
      add('trim', roundedBoxGeo(0.14, 0.38, 1.92, 0.02, 1), GRILLE, hl + 0.01, 2.84, 0);
      addQuad('sign', 1.82, 0.30, ATLAS_UV.ttcLed, [1.45, 1.45, 1.45], hl + 0.09, 2.84, 0, Math.PI / 2);
      addQuad('decal', 0.90, 0.52, ATLAS_UV.ttcCrest, [1, 1, 1], hl + 0.15, 0.92, 0, Math.PI / 2);
      [-1, 1].forEach(s => {
        addQuad('decal', 1.15, 0.65, ATLAS_UV.ttcCrest, [1, 1, 1], -1.9, 0.74, s * (hw + 0.022), s > 0 ? 0 : Math.PI);
      });
    } else { // pickup
      L = 5.4; W = 2.0; wheelR = 0.42; wheelX = 1.75; rideH = 0.45; roofH = 1.85;
      add('paint', profileGeo([[-2.7, 0.45], [2.7, 0.45], [2.72, 0.9], [2.55, 1.15], [1.45, 1.22], [-2.7, 1.2], [-2.75, 0.85]], W, 0.1));
      add('glass', profileGeo([[1.4, 1.2], [0.75, 1.8], [-0.5, 1.82], [-0.65, 1.2]], W * 0.9, 0.06));
      add('paint', roundedBoxGeo(1.2, 0.07, W * 0.84, 0.035, 1), [1, 1, 1], 0.1, 1.83, 0);
      add('trim', roundedBoxGeo(1.9, 0.08, W * 0.88, 0.02, 1), TRIM, -1.7, 1.18, 0); // open bed floor shadow
      add('paint', roundedBoxGeo(0.08, 0.32, W * 0.9, 0.03, 1), [1, 1, 1], -0.75, 1.35, 0);  // cab back wall above bed
      [-1, 1].forEach(s => {
        const pz = s * (W * 0.44);
        add('paint', roundedBoxGeo(0.09, 0.78, 0.08, 0.02, 1), [1, 1, 1], 1.05, 1.50, pz, 0, 0, 0.82);
        add('paint', roundedBoxGeo(0.12, 0.60, 0.08, 0.02, 1), [1, 1, 1], -0.58, 1.51, pz, 0, 0, -0.22);
      });
    }

    // Wheels: tyre + rim + hub + arch trim (lean segment counts for faster shadow/vertex throughput)
    [-1, 1].forEach(sx => [-1, 1].forEach(sz => {
      const x = sx * wheelX, z = sz * (W / 2 - (isBus ? 0.16 : 0.12));
      const tyreW = isBus ? 0.30 : 0.24;
      const tyre = new THREE.CylinderGeometry(wheelR, wheelR, tyreW, 12); tyre.rotateX(Math.PI / 2);
      add('trim', tyre, TIRE, x, wheelR, z);
      const rim = new THREE.CylinderGeometry(wheelR * 0.62, wheelR * 0.62, tyreW + 0.01, 10); rim.rotateX(Math.PI / 2);
      add('trim', rim, RIM, x, wheelR, z);
      const hub = new THREE.CylinderGeometry(wheelR * 0.2, wheelR * 0.2, tyreW + 0.02, 8); hub.rotateX(Math.PI / 2);
      add('trim', hub, TRIM, x, wheelR, z);
      add('trim', roundedBoxGeo(wheelR * 2.25, 0.16, 0.06, 0.02, 1), GRILLE, x, wheelR * 2 + 0.02, sz * (W / 2 - 0.02));
    }));

    // Bumpers, grille, side skirts, mirrors, Ontario front/rear plates, door handles, multi-element lights
    const bumpY = rideH + 0.18;
    add('trim', roundedBoxGeo(0.14, 0.22, W * 0.98, 0.04, 1), TRIM, L / 2 - 0.02, bumpY, 0);
    add('trim', roundedBoxGeo(0.14, 0.22, W * 0.98, 0.04, 1), TRIM, -L / 2 + 0.02, bumpY, 0);
    if (!isBus) {
      add('trim', roundedBoxGeo(0.06, 0.18, W * 0.44, 0.02, 1), GRILLE, L / 2 + 0.04, bumpY + 0.24, 0);
      add('trim', roundedBoxGeo(0.04, 0.03, W * 0.46, 0.01, 1), CHROME, L / 2 + 0.055, bumpY + 0.33, 0);
    }
    // Front & Rear Ontario Licence Plates (required front & back in Ontario!)
    const plateZ = isBus ? -0.55 : 0;
    add('trim', roundedBoxGeo(0.03, 0.17, 0.36, 0.01, 1), PLATE, L / 2 + 0.05, bumpY + 0.01, plateZ);
    addQuad('decal', 0.34, 0.16, ATLAS_UV.plate, [1, 1, 1], L / 2 + 0.068, bumpY + 0.01, plateZ, Math.PI / 2);
    add('trim', roundedBoxGeo(0.03, 0.17, 0.36, 0.01, 1), PLATE, -L / 2 - 0.05, bumpY + 0.02, plateZ);
    addQuad('decal', 0.34, 0.16, ATLAS_UV.plate, [1, 1, 1], -L / 2 - 0.068, bumpY + 0.02, plateZ, -Math.PI / 2);

    const lightY = isBus ? bumpY + 0.28 : bumpY + 0.30;
    const rearY = isBus ? bumpY + 0.45 : bumpY + 0.30;
    [-1, 1].forEach(s => {
      if (!isBus) {
        add('trim', roundedBoxGeo(L * 0.62, 0.08, 0.04, 0.015, 1), TRIM, 0, rideH + 0.06, s * (W / 2 + 0.005));
        add('trim', roundedBoxGeo(0.14, 0.025, 0.02, 0.005, 1), CHROME, 0.1, rideH + 0.5, s * (W / 2 + 0.01));
        add('trim', roundedBoxGeo(0.14, 0.025, 0.02, 0.005, 1), CHROME, -0.9, rideH + 0.5, s * (W / 2 + 0.01));
      }
      // Side mirrors on stalks
      const mirX = isBus ? L / 2 + 0.16 : (kind === 'van' ? 1.45 : 0.88);
      const mirY = isBus ? 1.85 : ((kind === 'suv' || kind === 'pickup' || isPolice) ? 1.18 : kind === 'van' ? 1.2 : 0.98);
      add('trim', roundedBoxGeo(0.05, 0.04, 0.12, 0.01, 1), TRIM, mirX - 0.04, mirY, s * (W / 2 + 0.04));
      add('paint', roundedBoxGeo(0.15, isBus ? 0.24 : 0.11, 0.16, 0.03, 1), [1, 1, 1], mirX, mirY, s * (W / 2 + 0.11));

      // Multi-element headlights (white LED + outer amber signal indicator)
      add('head', roundedBoxGeo(0.06, 0.11, 0.30, 0.02, 1), C(0xfff6e6), L / 2 + 0.01, lightY, s * (W / 2 - 0.34));
      add('head', roundedBoxGeo(0.06, 0.09, 0.11, 0.02, 1), C(0xffaa22), L / 2 + 0.01, lightY, s * (W / 2 - 0.13));
      // Multi-element taillights (red brake + amber indicator)
      add('tail', roundedBoxGeo(0.06, 0.13, 0.32, 0.02, 1), C(0xff1a1a), -L / 2 - 0.01, rearY, s * (W / 2 - 0.30));
      add('tail', roundedBoxGeo(0.05, 0.07, 0.10, 0.01, 1), C(0xff9911), -L / 2 - 0.01, rearY - 0.05, s * (W / 2 - 0.12));
    });
    add('tail', roundedBoxGeo(0.04, 0.04, W * 0.36, 0.01, 1), C(0xff1a1a), -L / 2 - 0.01, isBus ? 2.75 : bumpY + 0.44, 0); // CHMSL

    if (kind === 'taxi') {
      // Beck Taxi signature teal roof panel, hood/trunk accent stripes, side swoop & door decals
      add('trim', roundedBoxGeo(1.28, 0.06, W * 0.82, 0.02, 1), C(0x0d9488), -0.35, 1.43, 0);
      add('trim', roundedBoxGeo(1.05, 0.04, W * 0.62, 0.01, 1), C(0x0d9488), 1.68, 0.85, 0);  // teal hood stripe
      add('trim', roundedBoxGeo(0.75, 0.04, W * 0.72, 0.01, 1), C(0x0d9488), -1.92, 0.92, 0); // teal trunk stripe
      [-1, 1].forEach(s => {
        add('trim', roundedBoxGeo(L * 0.70, 0.10, 0.02, 0.01, 1), C(0x0d9488), 0, rideH + 0.34, s * (W / 2 + 0.008));
        addQuad('decal', 1.12, 0.42, ATLAS_UV.beckDoor, [1, 1, 1], 0.10, rideH + 0.34, s * (W / 2 + 0.022), s > 0 ? 0 : Math.PI);
      });
      // Angled wedge backlit "BECK TAXI" roof topper
      add('sign', profileGeo([[-0.18, 0], [0.18, 0], [0.10, 0.24], [-0.10, 0.24]], 0.56, 0.02), C(0xffd34d), -0.32, 1.45, 0, Math.PI / 2);
      addQuad('sign', 0.48, 0.20, ATLAS_UV.beckTop, [1.3, 1.3, 1.3], -0.17, 1.57, 0, Math.PI / 2);
      addQuad('sign', 0.48, 0.20, ATLAS_UV.beckTop, [1.3, 1.3, 1.3], -0.47, 1.57, 0, -Math.PI / 2);
    }

    if (isPolice) {
      // Toronto Police Service (TPS) charcoal SUV w/ white front doors & roof, bullbar, lightbar & door decals
      add('trim', roundedBoxGeo(2.44, 0.07, W * 0.86, 0.03, 1), C(0xf8fafc), -0.84, 1.72, 0);          // White police roof
      add('trim', roundedBoxGeo(0.24, 0.44, 1.12, 0.04, 1), TRIM, L / 2 + 0.10, bumpY + 0.18, 0);       // Push-bumper bullbar
      [-0.45, 0.45].forEach(bz => add('trim', roundedBoxGeo(0.18, 0.54, 0.07, 0.02, 1), TRIM, L / 2 + 0.12, bumpY + 0.22, bz));
      [-1, 1].forEach(s => {
        // White front doors + TPS POLICE emblem/text
        add('trim', roundedBoxGeo(1.12, 0.64, 0.03, 0.01, 1), C(0xf8fafc), 0.22, rideH + 0.36, s * (W / 2 + 0.008));
        addQuad('decal', 1.06, 0.54, ATLAS_UV.tpsDoor, [1, 1, 1], 0.22, rideH + 0.36, s * (W / 2 + 0.028), s > 0 ? 0 : Math.PI);
        // A-pillar police spotlights
        add('trim', roundedBoxGeo(0.12, 0.12, 0.10, 0.03, 1), TRIM, 0.96, 1.24, s * (W * 0.47));
      });
      addQuad('decal', 0.86, 0.24, ATLAS_UV.tpsRear, [1, 1, 1], -L / 2 - 0.03, 0.92, 0, -Math.PI / 2);
      // Red/White/Blue LED Lightbar on roof
      add('trim', roundedBoxGeo(0.28, 0.06, 1.26, 0.02, 1), TRIM, -0.05, 1.78, 0);
      add('sign', roundedBoxGeo(0.24, 0.09, 0.46, 0.02, 1), C(0xff2020), -0.05, 1.84, 0.38);  // Red half (right/curb)
      add('sign', roundedBoxGeo(0.24, 0.09, 0.32, 0.02, 1), C(0xffffff), -0.05, 1.84, 0);     // Center white strobe
      add('sign', roundedBoxGeo(0.24, 0.09, 0.46, 0.02, 1), C(0x1d7bff), -0.05, 1.84, -0.38); // Blue half (left)
    }

    return { P, L, W, H: roofH, kind };
  }

  // Realistic paint distribution: everyday Toronto cars + Beck Taxis + TTC Buses + TPS Police
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
  const KINDS = [['sedan', 28], ['hatch', 16], ['suv', 22], ['pickup', 7], ['van', 7], ['taxi', 9], ['ttc_bus', 6], ['police', 5]];

  function glowTexture(stretch) {
    // stretch: a headlight beam (bright at the car end, fading forward, soft sides)
    const W = 128, H = 128, c = document.createElement('canvas');
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
    c.width = c.height = 128;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(64, 64, 10, 64, 64, 64);
    grad.addColorStop(0, 'rgba(0,0,0,0.82)');
    grad.addColorStop(0.55, 'rgba(0,0,0,0.45)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
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
      // Divided Spadina Ave (w=13) has separate southbound/northbound carriageways flanking the center streetcar ROW
      r.oneWay = !!(r.n && r.n.indexOf('Spadina Avenue') === 0 && r.w === 13);
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

    function formatTorontoStreetName(name) {
      if (!name) return '';
      return String(name).toUpperCase()
        .replace(/\bSTREET\b/g, 'ST')
        .replace(/\bAVENUE\b/g, 'AVE')
        .replace(/\bBOULEVARD\b/g, 'BLVD')
        .replace(/\bROAD\b/g, 'RD')
        .replace(/\bDRIVE\b/g, 'DR')
        .replace(/\bSQUARE\b/g, 'SQ')
        .replace(/\bWEST\b/g, 'W')
        .replace(/\bEAST\b/g, 'E')
        .replace(/\bNORTH\b/g, 'N')
        .replace(/\bSOUTH\b/g, 'S')
        .trim();
    }

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
        let crossName = '';
        let crossNameW = -1;
        inter.approaches.forEach(b => {
          if (b !== a && (Math.abs(b.fx) > Math.abs(b.fz)) !== isEastWest) {
            crossHalfW = Math.max(crossHalfW, (b.w || 10) / 2);
            if (b.name && b.name !== 'Street' && (b.w || 10) > crossNameW) {
              crossName = b.name;
              crossNameW = b.w || 10;
            }
          }
        });
        if (!crossName && a.name && a.name !== 'Street') crossName = a.name;
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
          streetName: a.name,
          bladeName: formatTorontoStreetName(crossName),
          _lastState: '',
          _lastPed: ''
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

    // Pedestrian signal icon textures (Walk person + Don't-Walk raised hand)
    function makePedIconTex(kind) {
      const c = document.createElement('canvas');
      c.width = 128; c.height = 128;
      const g = c.getContext('2d');
      if (g) {
        g.fillStyle = '#07080b';
        g.fillRect(0, 0, 128, 128);
        g.fillStyle = '#ffffff';
        g.strokeStyle = '#ffffff';
        g.lineCap = 'round';
        g.lineJoin = 'round';
        if (kind === 'walk') {
          g.beginPath(); g.arc(64, 24, 12, 0, Math.PI * 2); g.fill();
          g.lineWidth = 12;
          g.beginPath(); g.moveTo(64, 38); g.lineTo(60, 74); g.stroke();
          g.lineWidth = 9;
          g.beginPath(); g.moveTo(62, 46); g.lineTo(36, 66); g.moveTo(62, 46); g.lineTo(90, 62); g.stroke();
          g.lineWidth = 11;
          g.beginPath(); g.moveTo(60, 74); g.lineTo(38, 114); g.moveTo(60, 74); g.lineTo(86, 114); g.stroke();
        } else {
          // Raised Don't Walk hand silhouette
          g.fillRect(42, 54, 42, 46);
          [44, 54, 64, 74].forEach((fx, fi) => {
            const top = fi === 1 || fi === 2 ? 18 : (fi === 0 ? 28 : 24);
            g.fillRect(fx, top, 8, 38 - top + 20);
          });
          g.lineWidth = 9;
          g.beginPath(); g.moveTo(42, 84); g.lineTo(26, 62); g.stroke();
        }
      }
      return new THREE.CanvasTexture(c);
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
    const pedBox = new THREE.BoxGeometry(0.50, 0.30, 0.18); pedBox.translate(0, 2.7, 0);
    poleParts.push({ geo: pedBox, color: [0.08, 0.09, 0.1] });

    const mergedPolesGeo = merge(poleParts);
    const polesMesh = new THREE.InstancedMesh(
      mergedPolesGeo,
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.35 }),
      Math.max(1, signals.length)
    );
    polesMesh.castShadow = false; // thin poles cause sub-pixel shadow shimmer

    // Instanced Lenses (Sphere with un-tonemapped bloom color)
    const lensGeo = new THREE.SphereGeometry(0.17, 8, 6);
    const redLensMesh = new THREE.InstancedMesh(lensGeo, new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }), Math.max(1, signals.length));
    const yellowLensMesh = new THREE.InstancedMesh(lensGeo, new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }), Math.max(1, signals.length));
    const greenLensMesh = new THREE.InstancedMesh(lensGeo, new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }), Math.max(1, signals.length));

    const pedQuadGeo = uvQuad(0.21, 0.23, 0.02, 0.02, 0.98, 0.98);
    const pedWalkMesh = new THREE.InstancedMesh(pedQuadGeo, new THREE.MeshBasicMaterial({ map: makePedIconTex('walk'), toneMapped: false, side: THREE.DoubleSide }), Math.max(1, signals.length));
    const pedHandMesh = new THREE.InstancedMesh(pedQuadGeo, new THREE.MeshBasicMaterial({ map: makePedIconTex('hand'), toneMapped: false, side: THREE.DoubleSide }), Math.max(1, signals.length));

    const pMat4 = new THREE.Matrix4(), pQuat = new THREE.Quaternion(), pedQuat = new THREE.Quaternion(), pPos = new THREE.Vector3(), pScale = new THREE.Vector3(1, 1, 1), zeroScale = new THREE.Vector3(0, 0, 0);
    const upVec = new THREE.Vector3(0, 1, 0);
    const validSignalPlacements = [];

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
      pedQuat.setFromAxisAngle(upVec, heading + Math.PI);
      const useScale = validPole ? pScale : zeroScale;

      pMat4.compose(pPos.set(poleX, 0, poleZ), pQuat, useScale);
      polesMesh.setMatrixAt(i, pMat4);

      // Push lenses proud of backplate (-sig.fx * 0.14, -sig.fz * 0.14) inside signal hoods
      const hx = poleX - rx * 5.4 - sig.fx * 0.14, hz = poleZ - rz * 5.4 - sig.fz * 0.14;
      pMat4.compose(pPos.set(hx, 6.4, hz), pQuat, useScale); redLensMesh.setMatrixAt(i, pMat4);
      pMat4.compose(pPos.set(hx, 5.8, hz), pQuat, useScale); yellowLensMesh.setMatrixAt(i, pMat4);
      pMat4.compose(pPos.set(hx, 5.2, hz), pQuat, useScale); greenLensMesh.setMatrixAt(i, pMat4);

      // Side-by-side pedestrian Walk / Don't-Walk icons flush on front face of pedBox (local -Z)
      const pedFx = poleX - sig.fx * 0.10, pedFz = poleZ - sig.fz * 0.10;
      pMat4.compose(pPos.set(pedFx + rx * 0.11, 2.7, pedFz + rz * 0.11), pedQuat, useScale);
      pedWalkMesh.setMatrixAt(i, pMat4);
      pMat4.compose(pPos.set(pedFx - rx * 0.11, 2.7, pedFz - rz * 0.11), pedQuat, useScale);
      pedHandMesh.setMatrixAt(i, pMat4);

      if (validPole && sig.bladeName && sig.bladeName !== 'STREET') {
        validSignalPlacements.push({ poleX, poleZ, rx, rz, fx: sig.fx, fz: sig.fz, name: sig.bladeName });
      }
    });

    polesMesh.instanceMatrix.needsUpdate = true;
    redLensMesh.instanceMatrix.needsUpdate = true;
    yellowLensMesh.instanceMatrix.needsUpdate = true;
    greenLensMesh.instanceMatrix.needsUpdate = true;
    pedWalkMesh.instanceMatrix.needsUpdate = true;
    pedHandMesh.instanceMatrix.needsUpdate = true;

    scene.add(polesMesh);
    scene.add(redLensMesh);
    scene.add(yellowLensMesh);
    scene.add(greenLensMesh);
    scene.add(pedWalkMesh);
    scene.add(pedHandMesh);

    // Dynamic Toronto Blue-and-White Mast-Arm Street-Name Blades (1 single merged draw call!)
    if (validSignalPlacements.length) {
      const uniqueNames = [];
      const nameToIdx = new Map();
      for (let i = 0; i < validSignalPlacements.length; i++) {
        const nm = validSignalPlacements[i].name;
        if (!nameToIdx.has(nm)) {
          nameToIdx.set(nm, uniqueNames.length);
          uniqueNames.push(nm);
        }
      }
      const cols = 4, cellW = 256, cellH = 64;
      const rows = Math.max(1, Math.ceil(uniqueNames.length / cols));
      const bCan = document.createElement('canvas');
      bCan.width = cols * cellW;
      bCan.height = rows * cellH;
      const bg = bCan.getContext('2d');
      if (bg) {
        bg.fillStyle = '#002f6c';
        bg.fillRect(0, 0, bCan.width, bCan.height);
        bg.textAlign = 'center';
        bg.textBaseline = 'middle';
        for (let i = 0; i < uniqueNames.length; i++) {
          const cx = (i % cols) * cellW, cy = Math.floor(i / cols) * cellH;
          bg.fillStyle = '#002f6c';
          bg.fillRect(cx + 2, cy + 2, cellW - 4, cellH - 4);
          bg.strokeStyle = '#f8fafc';
          bg.lineWidth = 3;
          bg.strokeRect(cx + 6, cy + 6, cellW - 12, cellH - 12);
          const nm = uniqueNames[i];
          const fSz = nm.length > 18 ? 16 : (nm.length > 13 ? 20 : 24);
          bg.font = 'bold ' + fSz + 'px sans-serif';
          bg.fillStyle = '#ffffff';
          bg.fillText(nm, cx + cellW * 0.5, cy + cellH * 0.5 + 1);
        }
      }
      const bladeTex = new THREE.CanvasTexture(bCan);
      bladeTex.anisotropy = 4;
      const bPos = [], bNrm = [], bUv = [];
      const bw = 2.25 * 0.5, bh = 0.44 * 0.5;
      for (let i = 0; i < validSignalPlacements.length; i++) {
        const pl = validSignalPlacements[i];
        const idx = nameToIdx.get(pl.name);
        const col = idx % cols, row = Math.floor(idx / cols);
        const u0 = (col * cellW + 3) / bCan.width, u1 = ((col + 1) * cellW - 3) / bCan.width;
        const v1 = 1 - (row * cellH + 3) / bCan.height, v0 = 1 - ((row + 1) * cellH - 3) / bCan.height;
        const bx = pl.poleX - pl.rx * 2.75, by = 5.42, bz = pl.poleZ - pl.rz * 2.75;
        // Front face (-sig.f) and back face (+sig.f) along arm vector (-rx, -rz)
        [[-pl.fx, -pl.fz, -pl.rx, -pl.rz], [pl.fx, pl.fz, pl.rx, pl.rz]].forEach(([nx, nz, tx, tz]) => {
          const cx = bx + nx * 0.03, cz = bz + nz * 0.03;
          const x0 = cx - tx * bw, z0 = cz - tz * bw;
          const x1 = cx + tx * bw, z1 = cz + tz * bw;
          const y0 = by - bh, y1 = by + bh;
          bPos.push(x0, y0, z0, x1, y0, z1, x1, y1, z1, x0, y0, z0, x1, y1, z1, x0, y1, z0);
          for (let k = 0; k < 6; k++) bNrm.push(nx, 0, nz);
          bUv.push(u0, v0, u1, v0, u1, v1, u0, v0, u1, v1, u0, v1);
        });
      }
      const bladeGeo = new THREE.BufferGeometry();
      bladeGeo.setAttribute('position', new THREE.Float32BufferAttribute(bPos, 3));
      bladeGeo.setAttribute('normal', new THREE.Float32BufferAttribute(bNrm, 3));
      bladeGeo.setAttribute('uv', new THREE.Float32BufferAttribute(bUv, 2));
      const bladeMesh = new THREE.Mesh(bladeGeo, new THREE.MeshBasicMaterial({ map: bladeTex }));
      scene.add(bladeMesh);
    }

    const COL_RED_ON = new THREE.Color(2.8, 0.18, 0.18);
    const COL_RED_OFF = new THREE.Color(0.18, 0.02, 0.02);
    const COL_YEL_ON = new THREE.Color(2.4, 1.6, 0.1);
    const COL_YEL_OFF = new THREE.Color(0.16, 0.1, 0.01);
    const COL_GRN_ON = new THREE.Color(0.1, 2.8, 1.2);
    const COL_GRN_OFF = new THREE.Color(0.01, 0.15, 0.05);

    const COL_WALK = new THREE.Color(2.0, 2.2, 2.6);
    const COL_DONTWALK = new THREE.Color(2.5, 0.85, 0.05);
    const COL_PED_OFF = new THREE.Color(0.06, 0.06, 0.06);

    let signalTimer = 0;
    let pedAudioTimer = 0;


    // ---------- instanced rendering ----------
    const vehicleAtlasTex = createVehicleAtlas();
    const designs = {};
    const meshes = {};
    const paintMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0.3, roughness: 0.4, clearcoat: 1.0, clearcoatRoughness: 0.1, envMapIntensity: 0.7 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x07090c, metalness: 0.5, roughness: 0.08, envMapIntensity: 0.55 });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, metalness: 0.35, roughness: 0.5, envMapIntensity: 0.8 });
    const headMat = new THREE.MeshBasicMaterial({ color: 0xffffff, vertexColors: true, toneMapped: false });
    const tailMat = new THREE.MeshBasicMaterial({ color: 0xffffff, vertexColors: true, toneMapped: false });
    const decalMat = new THREE.MeshStandardMaterial({ map: vehicleAtlasTex, color: 0xffffff, roughness: 0.45, metalness: 0.12 });
    const signMat = new THREE.MeshBasicMaterial({ map: vehicleAtlasTex, color: 0xffffff, vertexColors: true, toneMapped: false });

    const perKind = {};
    const cars = [];
    for (let i = 0; i < COUNT; i++) {
      let kind = 'sedan';
      if (i === 0) {
        kind = 'sedan';
      } else if (COUNT >= 20 && (i === 2 || i === 14)) {
        kind = 'ttc_bus';
      } else if (COUNT >= 20 && (i === 5 || i === 19)) {
        kind = 'police';
      } else if (COUNT >= 20 && (i === 8 || i === 24)) {
        kind = 'taxi';
      } else {
        let r = rnd() * 100;
        for (const [k, w] of KINDS) { if ((r -= w) <= 0) { kind = k; break; } }
      }
      perKind[kind] = (perKind[kind] || 0) + 1;
      cars.push({ id: i, kind, _lastBraking: null });
    }
    Object.keys(perKind).forEach(kind => {
      const d = designs[kind] = buildDesign(kind);
      const n = perKind[kind];
      const m = meshes[kind] = {};
      const make = (group, mat, withUV = false) => {
        if (!d.P[group].length) return null;
        const geo = merge(d.P[group], withUV);
        const im = new THREE.InstancedMesh(geo, mat, n);
        im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        im.castShadow = group === 'paint'; // single clean body shadow pass per car
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
      m.decal = make('decal', decalMat, true);
      m.sign = make('sign', signMat, true);
    });
    const slotCounter = {};
    cars.forEach(c => {
      c.slot = slotCounter[c.kind] = (slotCounter[c.kind] === undefined ? 0 : slotCounter[c.kind] + 1);
      c.design = designs[c.kind];
      if (c.kind === 'taxi') c.paint = new THREE.Color(0xf97316);
      else if (c.kind === 'ttc_bus') c.paint = new THREE.Color(0xf4f5f7);
      else if (c.kind === 'police') c.paint = new THREE.Color(0x27272a);
      else c.paint = pickPaint();
      meshes[c.kind].paint.setColorAt(c.slot, c.paint);
      if (meshes[c.kind].tail) meshes[c.kind].tail.setColorAt(c.slot, new THREE.Color(0.55, 0.55, 0.55));
      if (c.kind === 'ttc_bus') c.lenScale = 1.0;
      else c.lenScale = 0.97 + rnd() * 0.06;
    });
    Object.values(meshes).forEach(m => {
      if (m.paint.instanceColor) m.paint.instanceColor.needsUpdate = true;
      if (m.tail && m.tail.instanceColor) m.tail.instanceColor.needsUpdate = true;
    });

    // Headlight beams on the road, red tail glow, and a soft contact shadow
    const beamGeo = new THREE.PlaneGeometry(1, 1); beamGeo.rotateX(-Math.PI / 2);
    const roadGlowTex = glowTexture(true);
    const tailGlowTex = glowTexture(false);
    const beams = new THREE.InstancedMesh(beamGeo, new THREE.MeshBasicMaterial({
      map: roadGlowTex, color: 0xfff1d6, transparent: true, opacity: 0.35, depthWrite: false,
      blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -6
    }), COUNT);
    const tailGlow = new THREE.InstancedMesh(beamGeo, new THREE.MeshBasicMaterial({
      map: tailGlowTex, color: 0xff2020, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -6
    }), COUNT);
    const blobs = new THREE.InstancedMesh(beamGeo, new THREE.MeshBasicMaterial({
      map: blobTexture(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -5, polygonOffsetUnits: -5
    }), COUNT);
    [beams, tailGlow, blobs].forEach(im => { im.frustumCulled = false; im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(im); });
    beams.visible = true;
    for (let i = 0; i < COUNT; i++) tailGlow.setColorAt(i, new THREE.Color(0.5, 0.5, 0.5));
    const majorUsable = usable.filter(r => r.major && r.len > 22);

    // ---------- placement ----------
    function placeCar(c, near, minD, maxD) {
      const busPool = (c.kind === 'ttc_bus' && majorUsable.length) ? majorUsable : usable;
      for (let tries = 0; tries < 60; tries++) {
        const pool = (c.kind === 'ttc_bus' && tries < 45) ? busPool : usable;
        const r = pool[Math.floor(rnd() * pool.length)];
        const d = rnd() * r.len;
        const p = sample(r, d);
        const dist = near ? Math.hypot(p.x - near.x, p.z - near.z) : 100;
        if (near && (dist < minD || dist > maxD)) continue;
        c.road = r; c.dir = r.oneWay ? 1 : (rnd() < 0.5 ? 1 : -1);
        c.s = c.dir > 0 ? d : r.len - d;
        computeLogical(c);
        if (cars.some(o => o !== c && o.road && Math.hypot(o.lx - c.lx, o.lz - c.lz) < 9)) continue;
        if (streetcars.some(o => o.mode !== 'hidden' && Math.hypot(o.vx - c.lx, o.vz - c.lz) < SC.L / 2 + 18)) continue;
        c.lane = 0;
        c.speed = r.limit * (0.6 + rnd() * 0.3);
        c.vx = c.lx; c.vz = c.lz; c.vh = c.lh;
        c.stuck = 0; c.scWait = 0; c.holdAtJunction = false; c.ghost = 0; c.honkCd = 0; c.whooshCd = 0; c.hitCd = 0; c.braking = false;
        return true;
      }
      return false;
    }
    function laneOffset(c) {
      const w = c.road.w;
      if (c.laneSel === undefined) {
        c.laneSel = rnd() < 0.5 ? 0 : 1;
        // don't pick the inside (track) lane right where a streetcar already is
        if (c.laneSel === 0 && streetcars.some(o => o.mode !== 'hidden' && Math.hypot(o.vx - (c.vx || 0), o.vz - (c.vz || 0)) < SC.L / 2 + 30)) c.laneSel = 1;
      }
      if (w >= 11 && c.road.n && (c.road.n.indexOf('Queens Quay') === 0 || c.road.n.indexOf('Spadina Avenue') === 0 || c.road.n.indexOf('Fleet Street') === 0 || c.road.n.indexOf('King Street') === 0 || c.road.n.indexOf("Princes' Boulevard") === 0 || c.road.n.indexOf('Strachan Avenue') === 0)) return Math.min(w * 0.405, w * 0.5 - (c.design.W * 0.52)); // centre is a streetcar right-of-way
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
    function streetcarNearPoint(px, pz, pad) {
      for (let i = 0; i < streetcars.length; i++) {
        const o = streetcars[i];
        if (o.mode === 'hidden') continue;
        if (Math.hypot(o.vx - px, o.vz - pz) > SC.L * 0.65 + pad) continue;
        const oSecs = o.group && o.group.userData && o.group.userData.sections;
        if (oSecs && oSecs.length) {
          for (let si = 0; si < oSecs.length; si++) {
            const s = oSecs[si], sp = s.group.position;
            const sfx = s.fx !== undefined ? s.fx : Math.sin(s.group.rotation.y);
            const sfz = s.fz !== undefined ? s.fz : Math.cos(s.group.rotation.y);
            const dx = px - sp.x, dz = pz - sp.z;
            const f = dx * sfx + dz * sfz, l = -dx * sfz + dz * sfx;
            const d = Math.hypot(Math.max(0, Math.abs(f) - s.len * 0.5), Math.max(0, Math.abs(l) - SC.W * 0.5));
            if (d <= pad) return true;
          }
        } else {
          const dx = px - o.vx, dz = pz - o.vz;
          const rf = dx * o.fx + dz * o.fz, rl = dx * -o.fz + dz * o.fx;
          const d = Math.hypot(Math.max(0, Math.abs(rf) - SC.L * 0.5), Math.max(0, Math.abs(rl) - SC.W * 0.5));
          if (d <= pad) return true;
        }
      }
      return false;
    }
    function advanceRoad(c, anchorPos) {
      const r = c.road;
      const end = c.dir > 0 ? r.pts[r.pts.length - 1] : r.pts[0];
      const conns = connectionsAt(end[0], end[1], r).filter(e => !(e.r.oneWay && !e.atStart));
      if (!conns.length) {
        if (r.oneWay) {
          if (!placeCar(c, anchorPos || null, 90, 220) && !placeCar(c, null)) c.s = 0;
          c.laneSel = undefined;
          return true;
        }
        c.dir *= -1; c.s = 0; return false; // dead end: U-turn
      }
      // prefer going roughly straight (and major corridors for TTC buses)
      const isBus = c.kind === 'ttc_bus';
      const scored = conns.map(e => {
        const startD = e.atStart ? 0 : e.r.len;
        const p = sample(e.r, e.atStart ? Math.min(4, e.r.len) : Math.max(0, e.r.len - 4));
        const px = p.x, pz = p.z;
        const q = sample(e.r, startD);
        const dx = px - q.x, dz = pz - q.z, l = Math.hypot(dx, dz) || 1;
        const straight = (dx / l) * c.fx + (dz / l) * c.fz; // 1 = straight on
        const busMult = (isBus && e.r.major) ? 3.5 : 1.0;
        return { e, wgt: Math.max(0.05, 0.35 + straight) * busMult * (0.5 + rnd()) };
      }).sort((a, b) => b.wgt - a.wgt);
      // Wait before entering intersection if a streetcar is occupying the entry lane
      const pickItem = scored.find(item => {
        const e = item.e;
        const dirN = e.atStart ? 1 : -1;
        const offs = e.r.w >= 11 ? [0, e.r.w * 0.125, e.r.w * 0.375, e.r.w * 0.405] : [0, e.r.w * 0.25];
        for (const stepD of [0, 4, 8]) {
          const sd = e.atStart ? Math.min(e.r.len, stepD) : Math.max(0, e.r.len - stepD);
          const sp = sample(e.r, sd);
          const fxN = sp.tx * dirN, fzN = sp.tz * dirN;
          for (const offN of offs) {
            if (streetcarNearPoint(sp.x - fzN * offN, sp.z + fxN * offN, 5.4)) return false;
          }
        }
        return true;
      });
      if (!pickItem) return 'hold';
      const pick = pickItem.e;
      c.road = pick.r; c.dir = pick.atStart ? 1 : -1; c.s = 0;
      c.laneSel = undefined;
      return false;
    }

    const SC = { L: 28.0, W: 2.54, H: 3.84 };   // TTC Flexity Outlook
    const TRACK = city.streetcarTrackOffset || 1.5;
    const streetcars = [];
    for (let ci = 0; ci < cars.length; ci++) {
      const c = cars[ci];
      if (!placeCar(c, city.start ? { x: city.start.x, z: city.start.z } : null, 25, 260)) placeCar(c, null);
    }

    const stopPoleSpots = [];

    // ======================================================================
    // TTC STREETCARS: 504 King and 509/510 Harbourfront, on fixed routes
    // ======================================================================

    const STOP_DWELL = 4.5;
    const scRoutes = [];
    const scTmpA = { x: 0, z: 0 }, scTmpB = { x: 0, z: 0 };
    const _relA = { f: 0, l: 0 }, _relB = { f: 0, l: 0 }, _relC = { f: 0, l: 0 };
    const TRACK_PT_POOL = [];
    for (let i = 0; i < 52; i++) TRACK_PT_POOL.push({ x: 0, z: 0, fx: 0, fz: 0, ds: 0 });
    const _gapRes = { gap: Infinity, personAhead: false, waitingForTraffic: false, blockedByVehicle: false, blockerCar: null, trackPtCount: 0 };

    function relInto(c, x, z, out) {
      const dx = x - c.vx, dz = z - c.vz;
      out.f = dx * c.fx + dz * c.fz;
      out.l = dx * -c.fz + dz * c.fx;
    }

    function setStreetcarDirection(sc, newDir) {
      sc.dir = newDir >= 0 ? 1 : -1;
      const rt = sc.route;
      const nextSign = rt && rt.signs ? (sc.dir > 0 ? rt.signs[0] : (rt.signs[1] || rt.signs[0])) : sc.sign;
      sc.sign = nextSign;
      if (sc.group && sc.group.userData && typeof sc.group.userData.setSign === 'function') {
        sc.group.userData.setSign(nextSign);
      }
      return sc.dir;
    }

    (city.streetcarRoutes || []).forEach(src => {
      if (!src.pts || src.pts.length < 2 || typeof city.makeStreetcar !== 'function') return;
      const rt = {
        id: src.id,
        name: src.name || src.id,
        signs: src.signs || [src.id],
        pts: src.pts,
        limit: src.limit || 11,
        portal: src.portal,
        stops: [],
        namedStops: [],
        cum: [0],
        sigLat: src.sigLat || 8
      };
      for (let i = 1; i < rt.pts.length; i++) rt.cum.push(rt.cum[i - 1] + Math.hypot(rt.pts[i][0] - rt.pts[i - 1][0], rt.pts[i][1] - rt.pts[i - 1][1]));
      rt.len = rt.cum[rt.cum.length - 1];
      // Turnaround points: keep visible streetcars smoothly reversing at termini & portals
      rt.endLo = 14.0;
      rt.endHi = rt.portal ? Math.max(20.0, rt.len - 18.0) : Math.max(20.0, rt.len - 14.0);

      // Stops roughly every 240 m, kept 30 m clear of signalised intersections
      const clearOfSignals = d => {
        const p = sample(rt, d);
        return !signals.some(sg => Math.hypot(sg.x - p.x, sg.z - p.z) < 30);
      };
      if (src.stops) {
        // explicit stops; dir 1/-1 = that direction only (Spadina's near-side platforms), 0 = both
        rt.stops = src.stops.map(st => ({ d: st.d, dir: st.dir || 0 }));
        rt.platformsUntil = src.spadinaEnd || 0;
      } else {
        for (let d = 140; d < rt.len - 80; d += 240) {
          const pick = [0, 35, -35, 70, -70].map(o => d + o).find(dd => dd > 60 && dd < rt.len - 60 && clearOfSignals(dd));
          if (pick !== undefined) rt.stops.push({ d: pick, dir: 0 });
        }
      }
      if (src.namedStops && src.namedStops.length) {
        rt.namedStops = src.namedStops.map(ns => {
          const d = Math.max(0, Math.min(rt.len, ns.d));
          const p = sample(rt, d);
          return {
            id: ns.id,
            name: ns.name,
            sub: ns.sub || rt.name,
            routeId: rt.id,
            routeName: rt.name,
            d,
            x: p.x,
            z: p.z,
            tx: p.tx,
            tz: p.tz,
            isUnionLoop: !!ns.isUnionLoop,
            isCNE: !!ns.isCNE
          };
        });
      }
      // Pre-index only traffic signals adjacent to this streetcar corridor (~20 vs ~1000 citywide!)
      rt.routeSignals = [];
      const sigMaxR2 = (rt.sigLat + 16) * (rt.sigLat + 16);
      for (let gi = 0; gi < signals.length; gi++) {
        const sg = signals[gi];
        let minD2 = Infinity;
        for (let pi = 1; pi < rt.pts.length; pi++) {
          const ax = rt.pts[pi - 1][0], az = rt.pts[pi - 1][1];
          const bx = rt.pts[pi][0], bz = rt.pts[pi][1];
          const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1;
          let t = ((sg.x - ax) * dx + (sg.z - az) * dz) / l2;
          if (t < 0) t = 0; else if (t > 1) t = 1;
          const qx = ax + dx * t - sg.x, qz = az + dz * t - sg.z;
          const d2 = qx * qx + qz * qz;
          if (d2 < minD2) minD2 = d2;
        }
        if (minD2 <= sigMaxR2) rt.routeSignals.push(sg);
      }
      scRoutes.push(rt);

      const n = src.cars || 4;
      const routePhase = (scRoutes.length - 1) * 0.13;
      for (let i = 0; i < n; i++) {
        const initDir = i % 2 === 0 ? 1 : -1;
        const sign = initDir > 0 ? rt.signs[0] : (rt.signs[1] || rt.signs[0]);
        const span = Math.max(40, rt.endHi - rt.endLo - 20);
        let initD = rt.endLo + 10 + span * (((i + 0.45 + routePhase) % n) / n);
        const sc = {
          isStreetcar: true, id: 10000 + streetcars.length, _scIdx: streetcars.length, route: rt,
          dir: initDir,
          d: initD,
          speed: 0, mode: 'run', timer: 0, servedD: -1e9,
          expressTargetD: null,
          vx: 0, vz: 0, fx: 1, fz: 0, vh: 0,
          design: SC, lenScale: 1, hitCd: 0, gongCd: 0, stuck: 0, braking: false, _lastBraking: null,
          sign: sign, hasPlayer: false, boardGrace: 0,
          group: city.makeStreetcar(sign)
        };
        placeStreetcar(sc);
        // Ensure staggered cross-route startup clearance (e.g. 509 & 510 sharing Queens Quay)
        for (let t = 0; t < 8; t++) {
          const hit = streetcars.some(o => o.dir === sc.dir && Math.hypot(o.vx - sc.vx, o.vz - sc.vz) < SC.L + 14);
          if (!hit) break;
          sc.d = Math.max(rt.endLo + 8, Math.min(rt.endHi - 8, sc.d - (SC.L + 16)));
          placeStreetcar(sc);
        }
        streetcars.push(sc);
      }

      // TTC stop poles on the right-hand curb for each direction
      const poleList = rt.namedStops.length ? rt.namedStops.filter(ns => !ns.isUnionLoop) : rt.stops;
      poleList.forEach(st => {
        const d = st.d;
        if (st.dir || d < (rt.platformsUntil || 0)) return;
        const p = sample(rt, d), tx = p.tx, tz = p.tz, cx = p.x, cz = p.z;
        [1, -1].forEach(dir => {
          const rx = -tz * dir, rz = tx * dir;            // right of travel
          stopPoleSpots.push({ x: cx + rx * 6.4, z: cz + rz * 6.4, yaw: Math.atan2(tx * dir, tz * dir) });
        });
      });
    });

    // Instanced TTC Flexity Streetcar Night Headlight Pools, Road Tail Glow & Rear Brake-Light Flares
    const scCount = Math.max(1, streetcars.length);
    const scBeams = new THREE.InstancedMesh(beamGeo, beams.material, scCount);
    const scTailGlow = new THREE.InstancedMesh(beamGeo, tailGlow.material, scCount);
    const scFlareGeo = new THREE.PlaneGeometry(0.66, 0.56);
    const scBrakeFlares = new THREE.InstancedMesh(scFlareGeo, new THREE.MeshBasicMaterial({
      map: tailGlowTex, color: 0xff2222, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide
    }), scCount * 2);
    [scBeams, scTailGlow, scBrakeFlares].forEach(im => {
      im.frustumCulled = false;
      im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      scene.add(im);
    });
    for (let i = 0; i < scCount; i++) {
      scTailGlow.setColorAt(i, new THREE.Color(0.4, 0.4, 0.4));
      scBrakeFlares.setColorAt(i * 2, new THREE.Color(0.45, 0.04, 0.04));
      scBrakeFlares.setColorAt(i * 2 + 1, new THREE.Color(0.45, 0.04, 0.04));
    }

    function trackLateralOffset(rt, dd, dir) {
      const sgn = dir >= 0 ? 1 : -1;
      if (!rt || !rt.portal) return TRACK * sgn;
      const taperStart = rt.len - 46, taperEnd = rt.len - 30;
      if (dd <= taperStart) return TRACK * sgn;
      if (dd >= taperEnd) return 0;
      return TRACK * ((taperEnd - dd) / (taperEnd - taperStart)) * sgn;
    }

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
      const midOff = Math.abs(trackLateralOffset(rt, clampD(sc.d), sc.dir));
      sc.vx = (scTmpA.x + scTmpB.x) / 2 - fz * midOff;
      sc.vz = (scTmpA.z + scTmpB.z) / 2 + fx * midOff;
      sc.vh = Math.atan2(fx, fz);

      const secs = sc.group.userData.sections;
      if (!secs) { sc.group.position.set(sc.vx, 0.05, sc.vz); sc.group.rotation.y = sc.vh; return; }
      // Articulated: each section sits on its own stretch of track, and caches s.fx/s.fz to avoid trig in hot loops
      for (let si = 0; si < secs.length; si++) {
        const s = secs[si];
        const c = sc.d + sc.dir * s.offset, h = s.len * 0.5;
        let q = sample(rt, clampD(c + sc.dir * h)); const ax = q.x, az = q.z;
        q = sample(rt, clampD(c - sc.dir * h)); const bx = q.x, bz = q.z;
        let sx = ax - bx, sz = az - bz;
        const sl = Math.hypot(sx, sz);
        if (sl < 0.2) { sx = fx; sz = fz; } else { sx /= sl; sz /= sl; }
        const secOff = Math.abs(trackLateralOffset(rt, clampD(c), sc.dir));
        s.fx = sx; s.fz = sz;
        s.group.position.set((ax + bx) * 0.5 - sz * secOff, 0.05, (az + bz) * 0.5 + sx * secOff);
        s.group.rotation.y = Math.atan2(sx, sz);
      }
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

    function clearStreetcarZone(sc) {
      if (!sc || !sc.route) return;
      placeStreetcar(sc);
      // Push any ambient streetcar on the same track/junction cleanly out of overlap range
      for (let oi = 0; oi < streetcars.length; oi++) {
        const o = streetcars[oi];
        if (o === sc || o.hasPlayer || o.mode === 'hidden') continue;
        relInto(sc, o.vx, o.vz, _relA);
        const dot = sc.fx * o.fx + sc.fz * o.fz;
        const sameTrack = dot > 0.35 || Math.abs(_relA.l) < SC.W + 1.5;
        if (sameTrack && Math.hypot(o.vx - sc.vx, o.vz - sc.vz) < SC.L + 22) {
          const origD = o.d;
          const stepSign = (_relA.f >= 0 ? 1 : -1) * sc.dir;
          let bestD = origD;
          for (const mult of [1, -1, 2, -2, 3, -3, 4, -4]) {
            const cand = origD + stepSign * mult * (SC.L + 28);
            if (cand < o.route.endLo + 6 || cand > o.route.endHi - 6) continue;
            o.d = cand;
            placeStreetcar(o);
            const farFromSc = Math.hypot(o.vx - sc.vx, o.vz - sc.vz) >= SC.L + 12;
            const farFromOthers = streetcars.every(q => q === o || q === sc || q.mode === 'hidden' || Math.hypot(o.vx - q.vx, o.vz - q.vz) >= SC.L + 8);
            if (farFromSc && farFromOthers) { bestD = cand; break; }
          }
          o.d = bestD;
          o.speed = 0;
          placeStreetcar(o);
        }
      }
      // Relocate any road car directly overlapping the dispatched streetcar footprint
      for (let ci = 0; ci < cars.length; ci++) {
        const c = cars[ci];
        if (!c.road) continue;
        relInto(sc, c.vx, c.vz, _relA);
        if (Math.abs(_relA.f) < SC.L / 2 + c.design.L * c.lenScale + 4 && Math.abs(_relA.l) < SC.W / 2 + c.design.W + 2) {
          placeCar(c, { x: sc.vx, z: sc.vz }, 80, 220);
        }
      }
    }

    function streetcarTurnDist(sc) {
      const rt = sc && sc.route;
      if (!rt || !rt.cum || !rt.pts || rt.pts.length < 3) return Infinity;
      const d = sc.d, cum = rt.cum, pts = rt.pts;
      let seg = 0;
      while (seg < cum.length - 2 && cum[seg + 1] < d) seg++;
      if (sc.dir >= 0) {
        for (let i = seg; i < pts.length - 2; i++) {
          const ax = pts[i + 1][0] - pts[i][0], az = pts[i + 1][1] - pts[i][1];
          const bx = pts[i + 2][0] - pts[i + 1][0], bz = pts[i + 2][1] - pts[i + 1][1];
          const al = Math.hypot(ax, az) || 1, bl = Math.hypot(bx, bz) || 1;
          if ((ax * bx + az * bz) / (al * bl) < 0.85) return Math.max(0, cum[i + 1] - d);
        }
      } else {
        for (let i = seg; i >= 1; i--) {
          const ax = pts[i][0] - pts[i + 1][0], az = pts[i][1] - pts[i + 1][1];
          const bx = pts[i - 1][0] - pts[i][0], bz = pts[i - 1][1] - pts[i][1];
          const al = Math.hypot(ax, az) || 1, bl = Math.hypot(bx, bz) || 1;
          if ((ax * bx + az * bz) / (al * bl) < 0.85) return Math.max(0, d - cum[i]);
        }
      }
      return Infinity;
    }

    function sampleStreetcarPointInto(rt, d, dir, outPt) {
      const dd = Math.max(0, Math.min(rt.len, d));
      const cum = rt.cum, pts = rt.pts;
      let seg = 0;
      while (seg < cum.length - 2 && cum[seg + 1] < dd) seg++;
      const sLen = Math.max(1e-6, cum[seg + 1] - cum[seg]);
      const t = (dd - cum[seg]) / sLen;
      const p0 = pts[seg], p1 = pts[seg + 1];
      const tx = (p1[0] - p0[0]) / sLen, tz = (p1[1] - p0[1]) / sLen;
      const off = trackLateralOffset(rt, dd, dir);
      outPt.x = p0[0] + (p1[0] - p0[0]) * t + (-tz) * off;
      outPt.z = p0[1] + (p1[1] - p0[1]) * t + tx * off;
      outPt.fx = tx * dir;
      outPt.fz = tz * dir;
    }

    function computeStreetcarGap(sc, look, checkStopsAndSignals, people, peopleLen, P, rt) {
      let gap = Infinity, personAhead = false, waitingForTraffic = false, blockedByVehicle = false, blockerCar = null;
      const turnDist = streetcarTurnDist(sc);
      sc.turnDist = turnDist;
      const maxAhead = Math.max(SC.L * 0.5 + 14, look);
      let trackPtCount = 0;
      for (let ds = SC.L * 0.5 + 0.2; ds <= maxAhead && trackPtCount < TRACK_PT_POOL.length; ds += 2.0) {
        const sd = sc.d + sc.dir * ds;
        if (sd < -2 || sd > rt.len + 2) break;
        const pt = TRACK_PT_POOL[trackPtCount++];
        sampleStreetcarPointInto(rt, sd, sc.dir, pt);
        pt.ds = ds;
      }

      if (checkStopsAndSignals) {
        const rem = sc.dir > 0 ? rt.endHi - sc.d : sc.d - rt.endLo;
        gap = rem + 3.2;

        let stopRem = Infinity;
        const stops = rt.stops;
        for (let si = 0; si < stops.length; si++) {
          const st = stops[si];
          if (st.dir && st.dir !== sc.dir) continue;
          const sd = st.d;
          if (sd < rt.endLo + 8 || sd > rt.endHi - 8) continue;
          if (Math.abs(sd - sc.servedD) < 1) continue;
          const r = (sd - sc.d) * sc.dir;
          if (r > -0.3 && r < stopRem) stopRem = r;
        }
        if (stopRem < Infinity) gap = Math.min(gap, Math.max(0, stopRem) + 3.0);
        if (stopRem < 0.5 && sc.speed < 0.6) {
          sc.mode = 'dwell'; sc.timer = STOP_DWELL; sc.servedD = sc.d + stopRem * sc.dir; sc.speed = 0;
        }

        const rSigs = rt.routeSignals || signals;
        for (let gi = 0; gi < rSigs.length; gi++) {
          const sg = rSigs[gi];
          if (sg.fx * sc.fx + sg.fz * sc.fz < 0.8) continue;
          relInto(sc, sg.x, sg.z, _relA);
          if (_relA.f < SC.L / 2 || _relA.f > 70 || Math.abs(_relA.l) > rt.sigLat) continue;
          const dStop = _relA.f - 5.2 - SC.L / 2;
          if (sg.state === 'red' || (sg.state === 'yellow' && dStop > 10)) {
            if (dStop + 2.5 < gap) { gap = dStop + 2.5; waitingForTraffic = true; }
          }
        }
      }

      // Coarse bounding radius + curved track corridor OBB distance for road cars
      const maxCarDist = maxAhead + 10;
      const maxCarDist2 = maxCarDist * maxCarDist;
      const hitCarR2 = 1.35 * 1.35;
      for (let ci = 0; ci < cars.length; ci++) {
        const o = cars[ci];
        if (!o.road) continue;
        const cdx = o.vx - sc.vx, cdz = o.vz - sc.vz;
        if (cdx * cdx + cdz * cdz > maxCarDist2) continue;
        const cLen = o.design.L * o.lenScale;
        const halfLen = cLen * 0.5, halfW = o.design.W * 0.5;
        for (let m = 0; m < trackPtCount; m++) {
          const pt = TRACK_PT_POOL[m];
          relInto(o, pt.x, pt.z, _relA);
          const dx = Math.max(0, Math.abs(_relA.f) - halfLen);
          const dz = Math.max(0, Math.abs(_relA.l) - halfW);
          if (dx * dx + dz * dz <= hitCarR2) {
            const g = Math.max(0, pt.ds - SC.L * 0.5 - 2.3);
            if (g < gap) { gap = g; blockedByVehicle = true; blockerCar = o; }
            break;
          }
        }
      }

      // Check other active streetcars with coarse distance cull + cached section directions
      const maxScDist = maxAhead + SC.L * 0.85 + 8;
      const maxScDist2 = maxScDist * maxScDist;
      const hitScR2 = 1.25 * 1.25;
      for (let oi = 0; oi < streetcars.length; oi++) {
        const o = streetcars[oi];
        if (o === sc || o.mode === 'hidden') continue;
        const odx = o.vx - sc.vx, odz = o.vz - sc.vz;
        if (odx * odx + odz * odz > maxScDist2) continue;

        const dot = sc.fx * o.fx + sc.fz * o.fz;
        relInto(o, sc.vx, sc.vz, _relA); // back
        relInto(sc, o.vx, o.vz, _relB); // fwd
        const remSc = rt.len - sc.d;
        const remO = o.route.len - o.d;
        const scInPortal = !!(rt.portal && remSc < 52);
        const oInPortal = !!(o.route.portal && remO < 52);
        const inPortalThroat = scInPortal || oInPortal;
        // Single-track terminal portal token: train leaving dead-end stub (dir<0, smaller rem) always clears before inbound enters
        if (rt.portal && o.route.portal && oInPortal && sc.dir > 0 && remO < remSc) {
          const gBlock = Math.max(0, (remSc > 52)
            ? (remSc - 52 - SC.L * 0.5 - 1.5)
            : (remSc - remO - SC.L - 2.0));
          if (gBlock < gap) { gap = gBlock; blockedByVehicle = true; blockerCar = null; }
          continue;
        }
        if (inPortalThroat && sc.dir < 0 && o.dir > 0 && remSc < remO) continue;
        const sharedHarbour = (rt.id === '509' || rt.id === '510') && (o.route.id === '509' || o.route.id === '510');
        const leftCrossWye = ((rt.id === '509' && sc.dir < 0 && o.route.id === '510' && o.dir > 0) || (rt.id === '510' && sc.dir > 0 && o.route.id === '509' && o.dir < 0))
          && sc.vx < -730 && o.vx < -730 && sc.vz > 350 && sc.vz < 430 && o.vz > 350 && o.vz < 430;
        const onOppositeTwinRail = !leftCrossWye && sc.dir !== o.dir && (rt === o.route || (sharedHarbour && sc.vz > 370 && o.vz > 370));
        // Outside single-track portals and the 509/510 Wye left-turn crossing, opposing trams run on separate parallel rails
        if (!inPortalThroat && !leftCrossWye && (onOppositeTwinRail || (dot < -0.55 && Math.abs(_relA.l) >= SC.W * 0.65))) continue;
        // Close same-direction leader guard (catches overlaps within the first half-car length before trackPts[0])
        if (dot >= 0.45 && _relB.f > 0 && _relB.f < SC.L + 1.5 && Math.abs(_relB.l) < SC.W * 0.85) {
          const closeG = Math.max(0, _relB.f - SC.L - 2.0);
          if (closeG < gap) { gap = closeG; blockedByVehicle = true; blockerCar = null; }
          continue;
        }
        const oSecs = (o.group && o.group.userData && o.group.userData.sections) || null;
        for (let m = 0; m < trackPtCount; m++) {
          const pt = TRACK_PT_POOL[m];
          let hitO = false;
          if (oSecs) {
            for (let si = 0; si < oSecs.length; si++) {
              const s = oSecs[si], sp = s.group.position;
              const sfx = s.fx !== undefined ? s.fx : Math.sin(s.group.rotation.y);
              const sfz = s.fz !== undefined ? s.fz : Math.cos(s.group.rotation.y);
              const sx = pt.x - sp.x, sz = pt.z - sp.z;
              const sf = sx * sfx + sz * sfz, sl = -sx * sfz + sz * sfx;
              const dx = Math.max(0, Math.abs(sf) - s.len * 0.5);
              const dz = Math.max(0, Math.abs(sl) - SC.W * 0.5);
              if (dx * dx + dz * dz <= hitScR2) { hitO = true; break; }
            }
          } else {
            relInto(o, pt.x, pt.z, _relC);
            const dx = Math.max(0, Math.abs(_relC.f) - SC.L * 0.48);
            const dz = Math.max(0, Math.abs(_relC.l) - SC.W * 0.5);
            hitO = (dx * dx + dz * dz <= hitScR2);
          }
          if (hitO) {
            const isSameDirAhead = dot >= 0.45 && _relB.f > 0;
            const leftTurnYieldWye = leftCrossWye && rt.id === '509' && sc.dir < 0;
            const oAlreadyAheadOrPast = dot > -0.35 && _relB.f > 0 && _relA.f <= 2.0;
            const priorityYield = (!sc.hasPlayer && o.hasPlayer) || (!!sc.hasPlayer === !!o.hasPlayer && sc.id > o.id);
            const crossYield = Math.abs(_relA.f - _relB.f) <= 0.5 ? priorityYield : (_relA.f < _relB.f);
            const iMustYield = isSameDirAhead || leftTurnYieldWye || oAlreadyAheadOrPast || crossYield;
            if (!iMustYield) continue;
            const g = Math.max(0, pt.ds - SC.L * 0.5 - 2.2);
            if (g < gap) { gap = g; blockedByVehicle = true; blockerCar = null; }
            break;
          }
        }
      }

      for (let pi = 0; pi < peopleLen; pi++) {
        const p = people[pi];
        if (!p.isPlayer) continue; // idle street NPCs must not stall transit routes; contact physics handle them
        if (sc.hasPlayer || sc.boardGrace > 0) continue;
        relInto(sc, p.x, p.z, _relA);
        if (_relA.f > 0 && _relA.f < look && Math.abs(_relA.l) < SC.W / 2 + 0.7) {
          const g = Math.max(0, _relA.f - SC.L / 2 - 0.4);
          if (g < gap) { gap = g; personAhead = true; blockerCar = null; }
        }
      }

      if ((personAhead || (blockedByVehicle && sc.hasPlayer)) && gap < 14 && sc.gongCd <= 0) {
        streetcarGong(Math.hypot(sc.vx - P.x, sc.vz - P.z));
        sc.gongCd = 2.5;
      }
      _gapRes.gap = gap;
      _gapRes.personAhead = personAhead;
      _gapRes.waitingForTraffic = waitingForTraffic;
      _gapRes.blockedByVehicle = blockedByVehicle;
      _gapRes.blockerCar = blockerCar;
      _gapRes.trackPtCount = trackPtCount;
      return _gapRes;
    }

    function clearGridlockedBlocker(sc, gapRes, dt, P) {
      const bc = gapRes.blockerCar;
      if (bc && bc.speed < 1.8 && sc.speed < 1.0) {
        sc.carStallTimer = (sc.carStallTimer || 0) + dt;
        if (sc.carStallTimer > 8.0) {
          // Relocate stationary gridlocked road cars blocking this rail corridor (same as scWait)
          for (let ci = 0; ci < cars.length; ci++) {
            const o = cars[ci];
            if (!o.road || o.speed >= 1.8) continue;
            let near = (o === bc);
            if (!near) {
              for (let m = 0; m < gapRes.trackPtCount; m++) {
                const pt = TRACK_PT_POOL[m];
                if (Math.hypot(o.vx - pt.x, o.vz - pt.z) < 4.5) { near = true; break; }
              }
            }
            if (near && (!placeCar(o, P, 90, 220))) placeCar(o, null);
          }
          sc.carStallTimer = 0;
        }
      } else {
        sc.carStallTimer = 0;
      }
    }

    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), scVec = new THREE.Vector3(), pv = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    const brakeCol = new THREE.Color(1, 1, 1), normCol = new THREE.Color(0.5, 0.5, 0.5);
    const scBrakeColOn = new THREE.Color(1.0, 1.0, 1.0);
    const scBrakeColOff = new THREE.Color(0.35, 0.35, 0.35);
    const scFlareColOn = new THREE.Color(2.4, 0.16, 0.14);
    const scFlareColOff = new THREE.Color(0.45, 0.03, 0.03);
    const scZeroScale = new THREE.Vector3(0, 0, 0);
    scBeams.visible = true;

    function writeStreetcarLights(sc, idx, updateBeams) {
      const visible = sc.mode !== 'hidden' && (!sc.group || sc.group.visible !== false);
      if (!visible) {
        m4.compose(pv.set(0, -50, 0), q, scZeroScale);
        if (updateBeams) scBeams.setMatrixAt(idx, m4);
        scTailGlow.setMatrixAt(idx, m4);
        scBrakeFlares.setMatrixAt(idx * 2, m4);
        scBrakeFlares.setMatrixAt(idx * 2 + 1, m4);
        return false;
      }
      const secs = sc.group && sc.group.userData && sc.group.userData.sections;
      const frontSec = secs && secs.length ? secs[0] : null;
      const rearSec = secs && secs.length ? secs[secs.length - 1] : null;
      if (updateBeams) {
        const ffx = frontSec ? frontSec.fx : sc.fx;
        const ffz = frontSec ? frontSec.fz : sc.fz;
        const fpx = frontSec ? frontSec.group.position.x : sc.vx;
        const fpz = frontSec ? frontSec.group.position.z : sc.vz;
        const fHalf = frontSec ? (frontSec.len - 0.24) * 0.5 : SC.L * 0.5;
        q.setFromAxisAngle(up, Math.atan2(ffx, ffz));
        m4.compose(pv.set(fpx + ffx * (fHalf + 7.2), 0.12, fpz + ffz * (fHalf + 7.2)), q, scVec.set(5.2, 1, 14.0));
        scBeams.setMatrixAt(idx, m4);
      }
      const rfx = rearSec ? rearSec.fx : sc.fx;
      const rfz = rearSec ? rearSec.fz : sc.fz;
      const rpx = rearSec ? rearSec.group.position.x : sc.vx;
      const rpz = rearSec ? rearSec.group.position.z : sc.vz;
      const rHalf = rearSec ? (rearSec.len - 0.24) * 0.5 : SC.L * 0.5;
      q.setFromAxisAngle(up, Math.atan2(rfx, rfz));
      m4.compose(pv.set(rpx - rfx * (rHalf + 1.2), 0.12, rpz - rfz * (rHalf + 1.2)), q, scVec.set(3.4, 1, sc.braking ? 4.4 : 2.5));
      scTailGlow.setMatrixAt(idx, m4);

      // Twin rear brake-light flares flush behind Section E tail lamps
      const latX = -rfz, latZ = rfx;
      const bx = rpx - rfx * (rHalf + 0.08), bz = rpz - rfz * (rHalf + 0.08);
      const fs = sc.braking ? 1.45 : 0.7;
      scVec.set(fs, fs, 1);
      m4.compose(pv.set(bx + latX * 0.90, 0.88, bz + latZ * 0.90), q, scVec);
      scBrakeFlares.setMatrixAt(idx * 2, m4);
      m4.compose(pv.set(bx - latX * 0.90, 0.88, bz - latZ * 0.90), q, scVec);
      scBrakeFlares.setMatrixAt(idx * 2 + 1, m4);

      if (sc.braking !== sc._lastBraking) {
        sc._lastBraking = sc.braking;
        scTailGlow.setColorAt(idx, sc.braking ? scBrakeColOn : scBrakeColOff);
        const fCol = sc.braking ? scFlareColOn : scFlareColOff;
        scBrakeFlares.setColorAt(idx * 2, fCol);
        scBrakeFlares.setColorAt(idx * 2 + 1, fCol);
        return true;
      }
      return false;
    }

    function updateStreetcars(dt, ctx, people, peopleLen, P, isUndergroundOrIsland) {
      let scColorDirty = false;
      const updateBeams = scBeams.visible;
      for (let si = 0; si < streetcars.length; si++) {
        const sc = streetcars[si];
        const rt = sc.route;
        sc.hitCd -= dt; sc.gongCd -= dt;
        sc.boardGrace = Math.max(0, (sc.boardGrace || 0) - dt);

        if (sc.hasPlayer && sc.mode === 'dwell') {
          sc.timer = Math.min(sc.timer, 0.8);
        }

        if (sc.mode === 'hidden') {
          sc.timer -= dt;
          if (sc.timer > 0) {
            if (writeStreetcarLights(sc, si, updateBeams)) scColorDirty = true;
            continue;
          }
          let blocked = false;
          for (let oi = 0; oi < streetcars.length; oi++) {
            const o = streetcars[oi];
            if (o !== sc && o.route === rt && o.mode !== 'hidden' && o.dir === sc.dir && Math.abs(o.d - sc.d) < SC.L + 12) {
              blocked = true; break;
            }
          }
          if (blocked) { sc.timer = 1; continue; }
          sc.mode = 'run'; sc.group.visible = true; sc.speed = 2;
        }

        if (sc.mode === 'dwell') {
          sc.timer -= dt;
          sc.speed = 0; sc.braking = true;
          if (sc.timer <= 0) {
            sc.mode = 'run';
            if (!isUndergroundOrIsland && sc.gongCd <= 0) {
              streetcarGong(Math.hypot(sc.vx - P.x, sc.vz - P.z));
              sc.gongCd = 4;
            }
          }
        }

        if (sc.hasPlayer && sc.expressTargetD !== null && sc.expressTargetD !== undefined) {
          // Guided passenger ride to clicked stop: travels briskly while strictly respecting cars & streetcars
          sc.mode = 'run';
          sc.timer = 0;
          const diff = sc.expressTargetD - sc.d;
          if (Math.abs(diff) <= 0.65) {
            sc.d = sc.expressTargetD;
            sc.speed = 0;
            sc.braking = false;
            sc.expressTargetD = null;
            sc.mode = 'dwell';
            sc.timer = 3.0;
            sc.servedD = sc.d;
          } else {
            const wantDir = diff >= 0 ? 1 : -1;
            if (sc.dir !== wantDir) {
              setStreetcarDirection(sc, wantDir);
              placeStreetcar(sc);
            }
            const look = SC.L / 2 + Math.max(24, 14 + sc.speed * 1.6);
            const gapRes = computeStreetcarGap(sc, look, false, people, peopleLen, P, rt);
            const gap = gapRes.gap;
            clearGridlockedBlocker(sc, gapRes, dt, P);
            const cruiseCap = Math.min(24.0, Math.max(6.0, Math.abs(diff) * 0.75));
            const gapCap = gap < Infinity ? (gap <= 2.5 ? 0 : Math.max(0, (gap - 2.5) * 0.9)) : cruiseCap;
            const target = Math.min(cruiseCap, gapCap);
            const accelStep = target > sc.speed ? 18.0 * dt : 42.0 * dt;
            sc.speed += Math.max(-accelStep, Math.min(accelStep, target - sc.speed));
            sc.speed = gap <= 1.8 ? 0 : Math.max(0, sc.speed);
            sc.braking = target < sc.speed - 0.5;
            const step = Math.min(Math.abs(diff), sc.speed * dt);
            sc.d += wantDir * step;
          }
        } else if (sc.mode === 'run') {
          if (isUndergroundOrIsland && !sc.hasPlayer) {
            // Fast 1D cruise & terminus reversal when player is underground or far out on the Islands
            let aheadGap = Infinity;
            for (let oi = 0; oi < streetcars.length; oi++) {
              const o = streetcars[oi];
              if (o !== sc && o.route === rt && o.mode !== 'hidden' && o.dir === sc.dir) {
                const sep = (o.d - sc.d) * sc.dir - SC.L;
                if (sep > 0 && sep < aheadGap) aheadGap = sep;
              }
            }
            const tgt = aheadGap < 10 ? 0 : rt.limit * 0.85;
            sc.speed += Math.max(-12 * dt, Math.min(2.2 * dt, tgt - sc.speed));
            sc.speed = Math.max(0, sc.speed);
            sc.braking = tgt < sc.speed - 0.3;
          } else {
            const look = SC.L / 2 + Math.max(14, Math.min(45, 8 + sc.speed * 2.6));
            const gapRes = computeStreetcarGap(sc, look, true, people, peopleLen, P, rt);
            const gap = gapRes.gap;
            clearGridlockedBlocker(sc, gapRes, dt, P);

            // speed: streetcars pull away gently and brake decisively before vehicles without ever ghosting
            const decel = gap < 8 ? 28 : 8;
            const kin = gap < Infinity ? Math.sqrt(Math.max(0, 2 * 18 * Math.max(0, gap - 1.8))) : rt.limit;
            const target = Math.min(rt.limit, kin, Math.max(0, (gap - 2.8) * 0.9));
            sc.speed += Math.max(-decel * dt, Math.min(1.8 * dt, target - sc.speed));
            sc.speed = gap <= 1.6 ? 0 : Math.max(0, sc.speed);
            sc.braking = target < sc.speed - 0.3;
          }

          sc.d += sc.dir * sc.speed * dt;
          // End of the line (loop terminus or Union portal): reverse direction smoothly without vanishing
          if ((sc.dir > 0 && sc.d >= rt.endHi) || (sc.dir < 0 && sc.d <= rt.endLo)) {
            sc.d = Math.max(rt.endLo, Math.min(rt.endHi, sc.d));
            setStreetcarDirection(sc, -sc.dir);
            sc.servedD = -1e9; sc.speed = 0;
            sc.group.visible = !sc.hasPlayer;
            sc.mode = sc.hasPlayer ? 'run' : 'dwell';
            sc.timer = sc.hasPlayer ? 0 : 2.5;
          }
        }

        placeStreetcar(sc);
        if (writeStreetcarLights(sc, si, updateBeams)) scColorDirty = true;
        if (sc.mode === 'hidden' || isUndergroundOrIsland) continue;

        // collisions with people: same rules as cars, but a streetcar is not going to stop for you
        const hx = SC.L / 2 + 0.15, hz = SC.W / 2 + 0.15;
        for (let pi = 0; pi < peopleLen; pi++) {
          const p = people[pi];
          if (p.isPlayer && (sc.hasPlayer || sc.boardGrace > 0)) continue;
          if (p.y !== undefined && (p.y < -1.5 || p.y > 15.0)) continue;
          if (p.isPlayer && (ctx.state && (ctx.state.onSubway || ctx.state.isUnderground))) continue;
          relInto(sc, p.x, p.z, _relA);
          const R = p.isPlayer ? 0.45 : 0.5;
          if (Math.abs(_relA.f) > hx + R || Math.abs(_relA.l) > hz + R) continue;
          if (p.isPlayer && city.isInsidePeaceZone(p.x, p.z)) continue;
          if (sc.speed > 3 && sc.hitCd <= 0) {
            const side = _relA.l >= 0 ? 1 : -1;
            const kx = sc.fx * sc.speed * 1.1 + -sc.fz * side * 4, kz = sc.fz * sc.speed * 1.1 + sc.fx * side * 4;
            const dmg = Math.round(12 + sc.speed * 3);
            if (p.isPlayer) ctx.onHitPlayer(dmg, kx, kz, sc);
            else ctx.onHitEnemy(p.enemy, dmg * 2, kx * 1.3, kz * 1.3, sc);
            crunch(); streetcarGong(0);
            sc.hitCd = 0.8; sc.gongCd = 3; sc.speed *= 0.5;
          } else {
            const pf = hx + R - Math.abs(_relA.f), pl = hz + R - Math.abs(_relA.l);
            if (pl < pf) { const s = (_relA.l >= 0 ? 1 : -1) * pl; ctx.pushOut(p, -sc.fz * s, sc.fx * s); }
            else { const s = (_relA.f >= 0 ? 1 : -1) * pf; ctx.pushOut(p, sc.fx * s, sc.fz * s); }
          }
        }
      }
      if (updateBeams) scBeams.instanceMatrix.needsUpdate = true;
      scTailGlow.instanceMatrix.needsUpdate = true;
      scBrakeFlares.instanceMatrix.needsUpdate = true;
      if (scColorDirty) {
        if (scTailGlow.instanceColor) scTailGlow.instanceColor.needsUpdate = true;
        if (scBrakeFlares.instanceColor) scBrakeFlares.instanceColor.needsUpdate = true;
      }
    }

    // Build crisp TTC-crested stop poles (2 instanced draw calls total)
    if (stopPoleSpots.length) {
      const stopCan = document.createElement('canvas');
      stopCan.width = 256; stopCan.height = 384;
      const sg = stopCan.getContext('2d');
      if (sg) {
        sg.fillStyle = '#f8fafc';
        sg.fillRect(0, 0, 256, 384);
        // Red TTC header
        sg.fillStyle = '#da251d';
        sg.fillRect(0, 0, 256, 118);
        sg.fillStyle = '#ffffff';
        sg.fillRect(8, 52, 240, 10);
        sg.beginPath(); sg.arc(128, 58, 44, 0, Math.PI * 2); sg.fill();
        sg.strokeStyle = '#da251d'; sg.lineWidth = 5; sg.stroke();
        sg.fillStyle = '#da251d'; sg.font = 'bold 34px sans-serif';
        sg.textAlign = 'center'; sg.textBaseline = 'middle';
        sg.fillText('TTC', 128, 60);
        // White middle tram sign
        sg.fillStyle = '#0f172a';
        sg.font = 'bold 24px sans-serif';
        sg.fillText('STREETCAR STOP', 128, 152);
        sg.fillStyle = '#1e293b';
        sg.fillRect(78, 174, 100, 74);
        sg.fillStyle = '#93c5fd';
        sg.fillRect(88, 188, 80, 32);
        sg.fillStyle = '#fbbf24';
        sg.fillRect(92, 230, 18, 10);
        sg.fillRect(146, 230, 18, 10);
        // Lower route badge bar
        sg.fillStyle = '#da251d';
        sg.fillRect(0, 272, 256, 112);
        sg.fillStyle = '#ffffff';
        sg.font = 'bold 34px sans-serif';
        sg.fillText('504 • 509 • 510', 128, 316);
        sg.font = 'bold 18px sans-serif';
        sg.fillStyle = '#fef08a';
        sg.fillText('REQUEST STOP', 128, 356);
      }
      const stopTex = new THREE.CanvasTexture(stopCan);
      stopTex.anisotropy = 4;

      const polePartsStop = [];
      const pCyl = new THREE.CylinderGeometry(0.055, 0.065, 3.1, 8); pCyl.translate(0, 1.55, 0);
      polePartsStop.push({ geo: pCyl, color: [0.55, 0.58, 0.62] });
      const schedBox = new THREE.BoxGeometry(0.07, 0.42, 0.24); schedBox.translate(0, 1.55, 0);
      polePartsStop.push({ geo: schedBox, color: [0.12, 0.14, 0.17] });
      const signRim = new THREE.BoxGeometry(0.05, 0.72, 0.48); signRim.translate(0, 2.75, 0);
      polePartsStop.push({ geo: signRim, color: [0.1, 0.1, 0.12] });

      const poleMesh = new THREE.InstancedMesh(merge(polePartsStop),
        new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.5, roughness: 0.45 }), stopPoleSpots.length);

      // Front + Back textured TTC Stop Sign faces aligned along lateral +/-X of the pole
      const sF = uvQuad(0.45, 0.68, 0.01, 0.01, 0.99, 0.99); sF.rotateY(Math.PI / 2); sF.translate(0.028, 2.75, 0);
      const sB = uvQuad(0.45, 0.68, 0.01, 0.01, 0.99, 0.99); sB.rotateY(-Math.PI / 2); sB.translate(-0.028, 2.75, 0);
      const signGeoStop = merge([{ geo: sF, color: [1, 1, 1] }, { geo: sB, color: [1, 1, 1] }], true);
      const signMeshI = new THREE.InstancedMesh(signGeoStop,
        new THREE.MeshStandardMaterial({ map: stopTex, roughness: 0.45 }), stopPoleSpots.length);

      const mm = new THREE.Matrix4(), qq = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1), pp = new THREE.Vector3(), upv = new THREE.Vector3(0, 1, 0);
      for (let i = 0; i < stopPoleSpots.length; i++) {
        const sp = stopPoleSpots[i];
        qq.setFromAxisAngle(upv, sp.yaw);
        mm.compose(pp.set(sp.x, 0, sp.z), qq, one);
        poleMesh.setMatrixAt(i, mm);
        signMeshI.setMatrixAt(i, mm);
      }
      poleMesh.instanceMatrix.needsUpdate = true;
      signMeshI.instanceMatrix.needsUpdate = true;
      scene.add(poleMesh);
      scene.add(signMeshI);
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
      const buf = ctx.createBuffer(1, ctx.sampleRate * len, ctx.sampleRate);
      if (!buf || typeof buf.getChannelData !== 'function') return;
      const data = buf.getChannelData(0);
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

    // ---------- per-frame (zero-allocation steady state) ----------
    const meshList = Object.values(meshes);
    const peoplePool = [];
    let peopleLen = 0;
    function pushPerson(x, z, y, isPlayer, enemy) {
      let slot = peoplePool[peopleLen];
      if (!slot) { slot = { x: 0, z: 0, y: 0, isPlayer: false, enemy: null }; peoplePool[peopleLen] = slot; }
      slot.x = x; slot.z = z; slot.y = y; slot.isPlayer = isPlayer; slot.enemy = enemy;
      peopleLen++;
    }

    const POLICE_FLASH_A = new THREE.Color(1.35, 0.75, 0.90);
    const POLICE_FLASH_B = new THREE.Color(0.90, 0.75, 1.35);
    let policeFlashTimer = 0;
    let policeFlashPhase = -1;
    let sigCheckAccum = 0.08;

    function writeCar(c, updateBeams) {
      const L = c.design.L * c.lenScale;
      q.setFromAxisAngle(up, c.vh - Math.PI / 2); // designs face +x
      const y = c.road.y || 0.05;
      m4.compose(pv.set(c.vx, y, c.vz), q, scVec.set(c.lenScale, 1, 1));
      const m = meshes[c.kind];
      if (m.paint) m.paint.setMatrixAt(c.slot, m4);
      if (m.glass) m.glass.setMatrixAt(c.slot, m4);
      if (m.trim) m.trim.setMatrixAt(c.slot, m4);
      if (m.head) m.head.setMatrixAt(c.slot, m4);
      if (m.tail) m.tail.setMatrixAt(c.slot, m4);
      if (m.decal) m.decal.setMatrixAt(c.slot, m4);
      if (m.sign) m.sign.setMatrixAt(c.slot, m4);

      const tailChanged = c.braking !== c._lastBraking;
      if (tailChanged) {
        c._lastBraking = c.braking;
        const tCol = c.braking ? brakeCol : normCol;
        if (m.tail) m.tail.setColorAt(c.slot, tCol);
        tailGlow.setColorAt(c.id, tCol);
      }

      const fx = Math.sin(c.vh), fz = Math.cos(c.vh);
      const glowY = y + 0.06;
      q.setFromAxisAngle(up, c.vh);
      if (updateBeams) {
        m4.compose(pv.set(c.vx + fx * (L / 2 + 6.5), glowY, c.vz + fz * (L / 2 + 6.5)), q, scVec.set(4.6, 1, 12));
        beams.setMatrixAt(c.id, m4);
      }
      m4.compose(pv.set(c.vx - fx * (L / 2 + 1.0), glowY, c.vz - fz * (L / 2 + 1.0)), q, scVec.set(c.design.W * 1.6, 1, c.braking ? 3.6 : 2.4));
      tailGlow.setMatrixAt(c.id, m4);
      m4.compose(pv.set(c.vx, glowY - 0.01, c.vz), q, scVec.set(c.design.W * 1.35, 1, L * 1.15));
      blobs.setMatrixAt(c.id, m4);
      return tailChanged;
    }

    function update(dt, ctx) {
      dt = Math.min(dt, 0.05);
      const P = ctx.player.pos;

      // Update Toronto Traffic Signals (12.5 Hz + dirty-checked GPU color buffer uploads)
      signalTimer += dt;
      const onIslands = P.z > 780;
      sigCheckAccum += dt;
      if (!onIslands && sigCheckAccum >= 0.08) {
        sigCheckAccum = 0;
        let sigColorDirty = false, pedColorDirty = false;
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
          if (st !== sig._lastState) {
            sig._lastState = st;
            redLensMesh.setColorAt(i, st === 'red' ? COL_RED_ON : COL_RED_OFF);
            yellowLensMesh.setColorAt(i, st === 'yellow' ? COL_YEL_ON : COL_YEL_OFF);
            greenLensMesh.setColorAt(i, st === 'green' ? COL_GRN_ON : COL_GRN_OFF);
            sigColorDirty = true;
          }
          if (ped !== sig._lastPed) {
            sig._lastPed = ped;
            pedWalkMesh.setColorAt(i, ped === 'walk' ? COL_WALK : COL_PED_OFF);
            pedHandMesh.setColorAt(i, ped === 'dontwalk' ? COL_DONTWALK : COL_PED_OFF);
            pedColorDirty = true;
          }
        }
        if (sigColorDirty && signals.length) {
          redLensMesh.instanceColor.needsUpdate = true;
          yellowLensMesh.instanceColor.needsUpdate = true;
          greenLensMesh.instanceColor.needsUpdate = true;
        }
        if (pedColorDirty && signals.length) {
          pedWalkMesh.instanceColor.needsUpdate = true;
          pedHandMesh.instanceColor.needsUpdate = true;
        }
      }

      // Pulse Toronto Police roof lightbars subtly at ~4.5 Hz when downtown
      const polMesh = meshes.police;
      if (!onIslands && polMesh && polMesh.sign) {
        policeFlashTimer += dt;
        const pPhase = Math.floor(policeFlashTimer * 4.5) & 1;
        if (pPhase !== policeFlashPhase) {
          policeFlashPhase = pPhase;
          const pCol = pPhase ? POLICE_FLASH_A : POLICE_FLASH_B;
          for (let k = 0; k < perKind.police; k++) polMesh.sign.setColorAt(k, pCol);
          if (polMesh.sign.instanceColor) polMesh.sign.instanceColor.needsUpdate = true;
        }
      }

      peopleLen = 0;
      const isPlayerUnderground = !!(ctx.state && (ctx.state.onSubway || ctx.state.isUnderground)) || (P.y < -2.0);
      const isPlayerOffStreet = isPlayerUnderground || !!(ctx.state && (ctx.state.onStreetcar || ctx.state.onTaxi));
      const isPlayerSky = P.y > 25.0;
      if (!onIslands && !isPlayerOffStreet && !isPlayerSky) {
        pushPerson(P.x, P.z, P.y, true, null);
      }
      const enemies = ctx.enemies;
      if (!onIslands) {
        for (let ei = 0; ei < enemies.length; ei++) {
          const e = enemies[ei];
          if (!e.isDead && e.rig) {
            const ep = e.rig.root.position;
            if (ep.y < -2.0 || ep.y > 25.0 || e.isSubwayCitizen || e.isDeckEnemy) continue;
            if (ep.z < 650 && Math.abs(ep.x - P.x) < 170 && Math.abs(ep.z - P.z) < 170) {
              pushPerson(ep.x, ep.z, ep.y, false, e);
            }
          }
        }
      }

      let nearest = Infinity, nearestSpeed = 0, anyTailDirty = false;
      const updateBeams = beams.visible;

      if (!onIslands) {
        for (let ci = 0; ci < cars.length; ci++) {
          const c = cars[ci];
          // traffic bubble: recycle cars that drift far from the player
          const cdx = c.vx - P.x, cdz = c.vz - P.z;
          if (cdx * cdx + cdz * cdz > 280 * 280) placeCar(c, P, 90, 220);
          c.honkCd -= dt; c.whooshCd -= dt; c.hitCd -= dt; c.ghost -= dt;

          // ---- look ahead: cars + streetcars + people in our path ----
          const L = c.design.L * c.lenScale;
          const look = Math.max(9, Math.min(28, 5 + c.speed * 1.7));
          const maxCarLook2 = (look + 12) * (look + 12);
          let gap = Infinity, personAhead = false, queueBlocking = false;
          if (c.ghost <= 0) {
            for (let oi = 0; oi < cars.length; oi++) {
              const o = cars[oi];
              if (o === c) continue;
              const odx = o.vx - c.vx, odz = o.vz - c.vz;
              if (odx * odx + odz * odz > maxCarLook2) continue;
              relInto(c, o.vx, o.vz, _relA);
              if (_relA.f <= 0 || _relA.f > look || Math.abs(_relA.l) > 1.7) continue;
              const dot = c.fx * o.fx + c.fz * o.fz;
              if (dot < -0.5) continue;                               // oncoming lane
              if (dot < 0.5) {                                      // crossing traffic: lower id has right of way
                relInto(o, c.vx, c.vz, _relB);
                if (_relB.f > 0 && _relB.f < look && Math.abs(_relB.l) < 1.7 && o.id > c.id) continue;
              }
              const g = _relA.f - (L + o.design.L * o.lenScale) * 0.5;
              if (g < gap) {
                gap = g;
                if (g < 6 && o.waitingForStreetcar && o.speed < 0.5) queueBlocking = true;
              }
            }
          }
          let streetcarAhead = false;
          const lookSc = Math.max(look, 52);
          const maxScLook2 = (lookSc + SC.L * 0.7) * (lookSc + SC.L * 0.7);
          for (let oi = 0; oi < streetcars.length; oi++) {
            const o = streetcars[oi];
            if (o.mode === 'hidden') continue;
            const sdx = o.vx - c.vx, sdz = o.vz - c.vz;
            if (sdx * sdx + sdz * sdz > maxScLook2) continue;
            const oDot = c.fx * o.fx + c.fz * o.fz;
            const latCarSc = (SC.W + c.design.W) * 0.5 + 0.55;
            relInto(c, o.vx, o.vz, _relA);
            if (Math.abs(oDot) > 0.96 && Math.abs(_relA.l) >= latCarSc + 4.0) continue;
            // Check actual articulated streetcar sections plus dynamic forward lead sweep on crossing/oncoming paths
            const leadDist = (o.speed > 1.2 && oDot < 0.5) ? Math.max(20, Math.min(52, o.speed * 2.4)) : 0;
            const leadSamples = leadDist > 0 ? Math.ceil(leadDist / 3.5) : 0;
            const oSecs = o.group && o.group.userData && o.group.userData.sections;
            if (oSecs && oSecs.length) {
              for (let si = 0; si < oSecs.length; si++) {
                const s = oSecs[si], sp = s.group.position;
                const sfx = s.fx !== undefined ? s.fx : Math.sin(s.group.rotation.y);
                const sfz = s.fz !== undefined ? s.fz : Math.cos(s.group.rotation.y);
                const sDot = c.fx * sfx + c.fz * sfz;
                for (let ki = -1; ki <= 1; ki++) {
                  const k = ki * 0.45;
                  relInto(c, sp.x + sfx * s.len * k, sp.z + sfz * s.len * k, _relA);
                  if (_relA.f > -L * 0.25 && _relA.f <= lookSc && Math.abs(_relA.l) <= latCarSc) {
                    if (sDot < -0.5 && Math.abs(_relA.l) > (SC.W + c.design.W) * 0.5 + 0.35) continue;
                    const g = Math.max(0, _relA.f - L * 0.5 - 2.3);
                    if (g < gap) { gap = g; streetcarAhead = true; }
                  }
                }
              }
            } else {
              for (let ki = -4; ki <= 4; ki++) {
                const k = ki * 0.125;
                relInto(c, o.vx + o.fx * SC.L * k, o.vz + o.fz * SC.L * k, _relA);
                if (_relA.f > -L * 0.25 && _relA.f <= lookSc && Math.abs(_relA.l) <= latCarSc) {
                  if (oDot < -0.5 && Math.abs(_relA.l) > (SC.W + c.design.W) * 0.5 + 0.35) continue;
                  const g = Math.max(0, _relA.f - L * 0.5 - 2.3);
                  if (g < gap) { gap = g; streetcarAhead = true; }
                }
              }
            }
            for (let ls = 1; ls <= leadSamples; ls++) {
              const dAhead = SC.L * 0.5 + ls * 3.5;
              if (o.turnDist !== undefined && dAhead > o.turnDist + 1.5) break;
              relInto(c, o.vx + o.fx * dAhead, o.vz + o.fz * dAhead, _relA);
              if (_relA.f > 0 && _relA.f <= lookSc && Math.abs(_relA.l) <= latCarSc + 0.15) {
                const g = Math.max(0, _relA.f - L * 0.5 - 2.3);
                if (g < gap) { gap = g; streetcarAhead = true; }
              }
            }
          }
          for (let pi = 0; pi < peopleLen; pi++) {
            const p = peoplePool[pi];
            if (c.ghost > 0 && !p.isPlayer) continue;
            relInto(c, p.x, p.z, _relA);
            if (_relA.f > 0 && _relA.f < look && Math.abs(_relA.l) < c.design.W * 0.5 + 0.7) {
              const g = _relA.f - L * 0.5 - 0.4;
              if (g < gap) { gap = g; personAhead = !!p.isPlayer; }
            }
          }

          // ---- Look ahead for traffic lights & stop bars ----
          const rem = c.road.len - c.s;
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
          if (gap < Infinity) target = Math.min(limit, Math.max(0, (gap - 2.8) * 1.1));
          if (c.holdAtJunction) target = 0;
          const maxDecel = streetcarAhead ? 24.0 : 9.0; // emergency brake harder for streetcars
          c.speed += Math.max(-maxDecel * dt, Math.min(3.2 * dt, target - c.speed));
          if (c.holdAtJunction) c.speed = 0;
          if (streetcarAhead) {
            c.speed = Math.min(c.speed, Math.sqrt(Math.max(0, 2 * 14 * Math.max(0, gap - 2.0))));
            if (gap <= 2.0) c.speed = 0;
          }
          c.speed = Math.max(0, c.speed);
          c.braking = target < c.speed - 0.5 || (c.speed < 0.5 && gap < 6) || !!c.holdAtJunction;
          if (personAhead && gap < 10 && c.speed > 2 && c.honkCd <= 0) { honk(Math.hypot(c.vx - P.x, c.vz - P.z)); c.honkCd = 2.5; }

          c.waitingForStreetcar = streetcarAhead || queueBlocking || !!c.holdAtJunction;
          let relocatedWait = false;
          if (c.speed < 0.9 && !personAhead && !isWaitingAtRed && ((gap < 6 && (streetcarAhead || queueBlocking)) || c.holdAtJunction)) {
            c.scWait = (c.scWait || 0) + dt;
            if (c.scWait > 10) {
              if (!placeCar(c, P, 90, 220)) placeCar(c, null);
              c.scWait = 0; c.holdAtJunction = false;
              relocatedWait = true;
            }
          } else {
            c.scWait = 0;
          }
          // gridlock breaker: if stuck behind cars for a while, ghost through (never stack into streetcar queues)
          if (c.speed < 0.9 && gap < 6 && !personAhead && !isWaitingAtRed && !c.waitingForStreetcar) { c.stuck += dt; if (c.stuck > 6) { c.ghost = 2.5; c.stuck = 0; } } else c.stuck = 0;

          if (!relocatedWait) {
            // ---- move along the network ----
            c.s += c.speed * dt;
            let guard = 0;
            let recheckHold = !!(c.holdAtJunction && !isWaitingAtRed);
            while ((c.s >= c.road.len || recheckHold) && guard++ < 4) {
              const over = recheckHold ? 0 : (c.s - c.road.len);
              recheckHold = false;
              const adv = advanceRoad(c, P);
              if (adv === 'hold') {
                c.s = Math.max(0, c.road.len - 0.15);
                c.speed = 0; c.braking = true;
                c.waitingForStreetcar = true;
                c.holdAtJunction = true;
                break;
              }
              c.holdAtJunction = false;
              if (!adv) c.s += over;
            }
            computeLogical(c);
            // visual smoothing (hides lane hops at junctions)
            const k = 1 - Math.exp(-dt * 8);
            c.vx += (c.lx - c.vx) * k; c.vz += (c.lz - c.vz) * k;
            let dh = c.lh - c.vh; dh = Math.atan2(Math.sin(dh), Math.cos(dh));
            c.vh += dh * (1 - Math.exp(-dt * 6));
          }

          // ---- collisions with people ----
          const hx = L * 0.5 + 0.15, hz = c.design.W * 0.5 + 0.15;
          for (let pi = 0; pi < peopleLen; pi++) {
            const p = peoplePool[pi];
            if (p.y !== undefined && (p.y < -1.5 || p.y > 15.0)) continue;
            if (p.isPlayer && isPlayerUnderground) continue;
            relInto(c, p.x, p.z, _relA);
            const R = p.isPlayer ? 0.45 : 0.5;
            if (Math.abs(_relA.f) > hx + R || Math.abs(_relA.l) > hz + R) continue;
            if (p.isPlayer && p.y - 1.7 > c.design.H - 0.1) continue;          // jumped over it!
            if (p.isPlayer && city.isInsidePeaceZone(p.x, p.z)) continue;
            const fast = c.speed > 3;
            if (fast && c.hitCd <= 0) {
              const side = _relA.l >= 0 ? 1 : -1;
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
              const pf = hx + R - Math.abs(_relA.f), pl = hz + R - Math.abs(_relA.l);
              if (pl < pf) { const s = (_relA.l >= 0 ? 1 : -1) * pl; ctx.pushOut(p, -c.fz * s, c.fx * s); }
              else { const s = (_relA.f >= 0 ? 1 : -1) * pf; ctx.pushOut(p, c.fx * s, c.fz * s); }
            }
          }

          // pass-by whoosh
          const dP = Math.hypot(c.vx - P.x, c.vz - P.z);
          if (dP < 6 && c.speed > 8 && c.whooshCd <= 0) { whoosh(dP, c.speed); c.whooshCd = 1.5; }
          if (dP < nearest) { nearest = dP; nearestSpeed = c.speed; }

          if (writeCar(c, updateBeams)) anyTailDirty = true;
        }
      }

      const skipHeavySc = isPlayerUnderground || onIslands;
      updateStreetcars(dt, ctx, peoplePool, peopleLen, P, skipHeavySc);

      if (!onIslands) {
        for (let mi = 0; mi < meshList.length; mi++) {
          const m = meshList[mi];
          if (m.paint) m.paint.instanceMatrix.needsUpdate = true;
          if (m.glass) m.glass.instanceMatrix.needsUpdate = true;
          if (m.trim) m.trim.instanceMatrix.needsUpdate = true;
          if (m.head) m.head.instanceMatrix.needsUpdate = true;
          if (m.tail) {
            m.tail.instanceMatrix.needsUpdate = true;
            if (anyTailDirty && m.tail.instanceColor) m.tail.instanceColor.needsUpdate = true;
          }
          if (m.decal) m.decal.instanceMatrix.needsUpdate = true;
          if (m.sign) m.sign.instanceMatrix.needsUpdate = true;
        }
        if (updateBeams) beams.instanceMatrix.needsUpdate = true;
        tailGlow.instanceMatrix.needsUpdate = true;
        blobs.instanceMatrix.needsUpdate = true;
        if (anyTailDirty && tailGlow.instanceColor) tailGlow.instanceColor.needsUpdate = true;

        // Accessible Pedestrian Signal (APS) Audio chirp
        pedAudioTimer += dt;
        if (pedAudioTimer >= 1.15) {
          pedAudioTimer = 0;
          let nearDist = 32, nearSig = null;
          for (let si = 0; si < signals.length; si++) {
            const s = signals[si];
            const d = Math.hypot(s.x - P.x, s.z - P.z);
            if (d < nearDist) { nearDist = d; nearSig = s; }
          }
          if (nearSig && nearSig.ped === 'walk') {
            audio.playWalkSignal(nearDist, nearSig.isEastWest);
          }
        }
      }

      // engine rumble from the nearest car
      ensureEngine();
      if (engine) {
        const t = audio.ctx.currentTime;
        const vol = (onIslands || audio.isMuted) ? 0 : Math.min(0.08, 0.6 / (1 + nearest * nearest * 0.05)) * (0.4 + nearestSpeed / 14);
        engine.gain.gain.setTargetAtTime(vol, t, 0.15);
        engine.osc.frequency.setTargetAtTime(38 + nearestSpeed * 4.2, t, 0.2);
        engine.osc2.frequency.setTargetAtTime(38 + nearestSpeed * 4.2, t, 0.2);
      }
    }

    for (let ci = 0; ci < cars.length; ci++) { if (cars[ci].road) writeCar(cars[ci], true); }
    for (let mi = 0; mi < meshList.length; mi++) {
      const m = meshList[mi];
      if (m.paint) m.paint.instanceMatrix.needsUpdate = true;
      if (m.glass) m.glass.instanceMatrix.needsUpdate = true;
      if (m.trim) m.trim.instanceMatrix.needsUpdate = true;
      if (m.head) m.head.instanceMatrix.needsUpdate = true;
      if (m.tail) m.tail.instanceMatrix.needsUpdate = true;
      if (m.decal) m.decal.instanceMatrix.needsUpdate = true;
      if (m.sign) m.sign.instanceMatrix.needsUpdate = true;
    }
    beams.instanceMatrix.needsUpdate = true;
    tailGlow.instanceMatrix.needsUpdate = true;
    blobs.instanceMatrix.needsUpdate = true;
    for (let si = 0; si < streetcars.length; si++) writeStreetcarLights(streetcars[si], si, true);
    scBeams.instanceMatrix.needsUpdate = true;
    scTailGlow.instanceMatrix.needsUpdate = true;
    scBrakeFlares.instanceMatrix.needsUpdate = true;

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

    function setTimeOfDay(isDay) {
      if (beams) beams.visible = !isDay;
      if (scBeams) scBeams.visible = !isDay;
      if (paintMat) paintMat.envMapIntensity = isDay ? 1.1 : 0.7;
      if (glassMat) glassMat.envMapIntensity = isDay ? 1.0 : 0.55;
      if (trimMat) trimMat.envMapIntensity = isDay ? 1.05 : 0.8;
    }

    return {
      cars,
      streetcars,
      scRoutes,
      streetcarDots,
      placeStreetcar,
      clearStreetcarZone,
      sampleRoute: sample,
      setStreetcarDirection,
      setTimeOfDay,
      update,
      silence,
      ringGong: () => streetcarGong(0),
      getIntersections: () => signalIntersections,
      isSafeCrossing
    };
  }

  window.createTraffic = createTraffic;
})();

// ============================================================================
// FISTS OF DOOM: TORONTO — MULTIPLAYER SQUAD & BRAWL CLIENT
// Handles real-time WebSockets, remote player avatar rendering, smooth interpolation,
// and synchronized PvP combat / co-op defense.
// ============================================================================
(function () {
  'use strict';

  // Internet Cloud Relay brokers (MQTT-over-WSS: works globally on GitHub Pages without any Render server)
  const CLOUD_BROKERS = [
    'wss://broker.emqx.io:8084/mqtt',
    'wss://broker.hivemq.com:8884/mqtt',
    'wss://test.mosquitto.org:8081/mqtt'
  ];
  const CLOUD_SERVER_URL = CLOUD_BROKERS[0];
  const LOCAL_DEFAULT_URL = 'ws://localhost:8080/ws';

  const PLAYER_COLORS = [
    0xef4444, // crimson
    0x00f0ff, // cyan
    0xf59e0b, // amber
    0x10b981, // emerald
    0xc026d3, // purple
    0xf43f5e, // rose
    0x38bdf8, // azure
    0xfacc15  // gold
  ];

  function isCloudServerUrl(url) {
    if (!url) return true;
    const u = String(url).trim().toLowerCase();
    return u === 'cloud' || u === 'auto' || u.endsWith('/mqtt') ||
           u.includes('emqx.io') || u.includes('hivemq.com') || u.includes('mosquitto.org');
  }

  // --- Minimal zero-dependency MQTT 3.1.1 over WebSockets codec ---
  const textEncoder = new TextEncoder();
  const textDecoder = new TextDecoder();

  function mqttEncodeStr(str) {
    const bytes = textEncoder.encode(str);
    const out = new Uint8Array(2 + bytes.length);
    out[0] = (bytes.length >> 8) & 0xff;
    out[1] = bytes.length & 0xff;
    out.set(bytes, 2);
    return out;
  }

  function mqttConcat(arrays) {
    let total = 0;
    for (let i = 0; i < arrays.length; i++) total += arrays[i].length;
    const out = new Uint8Array(total);
    let offset = 0;
    for (let i = 0; i < arrays.length; i++) {
      out.set(arrays[i], offset);
      offset += arrays[i].length;
    }
    return out;
  }

  function mqttEncodePacket(headerByte, bodyBytes) {
    let len = bodyBytes.length;
    const remBytes = [];
    do {
      let b = len % 128;
      len = Math.floor(len / 128);
      if (len > 0) b |= 0x80;
      remBytes.push(b);
    } while (len > 0);
    const out = new Uint8Array(1 + remBytes.length + bodyBytes.length);
    out[0] = headerByte;
    for (let i = 0; i < remBytes.length; i++) out[1 + i] = remBytes[i];
    out.set(bodyBytes, 1 + remBytes.length);
    return out;
  }

  function mqttBuildConnect(clientId, willTopic, willPayloadStr) {
    const varHeader = new Uint8Array([0x00, 0x04, 0x4d, 0x51, 0x54, 0x54, 0x04, 0x06, 0x00, 0x2d]);
    const body = mqttConcat([
      varHeader,
      mqttEncodeStr(clientId),
      mqttEncodeStr(willTopic),
      mqttEncodeStr(willPayloadStr)
    ]);
    return mqttEncodePacket(0x10, body);
  }

  function mqttBuildSubscribe(topic, packetId) {
    const pid = packetId || 1;
    const body = mqttConcat([
      new Uint8Array([(pid >> 8) & 0xff, pid & 0xff]),
      mqttEncodeStr(topic),
      new Uint8Array([0x00])
    ]);
    return mqttEncodePacket(0x82, body);
  }

  function mqttBuildPublish(topic, payloadStr) {
    const body = mqttConcat([
      mqttEncodeStr(topic),
      textEncoder.encode(payloadStr)
    ]);
    return mqttEncodePacket(0x30, body);
  }

  function normalizeServerUrl(raw) {
    let s = (raw || '').trim();
    // Redirect dead toronto-defender.onrender.com or empty URLs to live Cloud Relay
    if (!s || s.includes('toronto-defender.onrender.com')) return CLOUD_SERVER_URL;
    if (isCloudServerUrl(s)) return s;
    if (s.startsWith('https://')) s = 'wss://' + s.slice('https://'.length);
    else if (s.startsWith('http://')) s = 'ws://' + s.slice('http://'.length);
    else if (!s.startsWith('wss://') && !s.startsWith('ws://')) {
      const isLocal = s.startsWith('localhost') || s.startsWith('127.0.0.1') || s.startsWith('192.168.') || s.startsWith('10.');
      s = (isLocal ? 'ws://' : 'wss://') + s;
    }
    try {
      const u = new URL(s);
      if (!u.pathname || u.pathname === '/') u.pathname = '/ws';
      return u.toString();
    } catch (e) {
      return s;
    }
  }

  function getAutoServerUrl() {
    // 1. Check URL query parameters: e.g. ?server=wss://...
    const urlParams = new URLSearchParams(window.location.search);
    const queryServer = urlParams.get('server');
    if (queryServer) return normalizeServerUrl(queryServer);

    // 2. Check localStorage saved server (discard stale localhost / dead toronto-defender.onrender.com)
    let savedServer = localStorage.getItem('toronto_mp_server');
    if (savedServer && (
      savedServer.includes('toronto-defender.onrender.com') ||
      savedServer.includes('localhost') ||
      savedServer.includes('127.0.0.1') ||
      savedServer.includes(':8000') ||
      savedServer.includes(':8080') ||
      savedServer.includes(':8788')
    )) {
      savedServer = null;
      localStorage.removeItem('toronto_mp_server');
    }
    if (savedServer) return normalizeServerUrl(savedServer);

    // 3. If served directly by local server_multiplayer.py on port 8080, use local WebSocket
    if (window.location.port === '8080') {
      const hostname = window.location.hostname || 'localhost';
      return `ws://${hostname}:8080/ws`;
    }

    // 4. Default everywhere else (GitHub Pages wacunn.github.io, etc.): use live Cloud Relay
    return CLOUD_SERVER_URL;
  }

  function getAutoRoom() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('room') || localStorage.getItem('toronto_mp_room') || '6ix';
  }

  function getSavedPlayerName() {
    let name = localStorage.getItem('toronto_mp_name');
    if (!name) {
      const heroes = ['DEFENDER', 'SIX-HERO', 'BRAWLER', 'NORTH-KNIGHT', 'MAPLE-FIST', 'TORONTO-APEX'];
      name = heroes[Math.floor(Math.random() * heroes.length)] + '-' + Math.floor(10 + Math.random() * 89);
      localStorage.setItem('toronto_mp_name', name);
    }
    return name;
  }

  // --- 3D Hero Avatar Builder for Remote Players (Toronto Defender Exo-Fighter) ---
  function createRemoteHeroRig(name, colorHex) {
    const root = new THREE.Group();
    const color = colorHex || 0xef4444;
    const hexStr = '#' + (color.toString(16).padStart(6, '0'));
    const cObj = new THREE.Color(color);

    const skinMat = new THREE.MeshStandardMaterial({ color: 0xe2b180, roughness: 0.52, metalness: 0.05 });
    const armorDarkMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.42, metalness: 0.55 });
    const vestMat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.34, metalness: 0.42, emissive: color, emissiveIntensity: 0.28 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5, metalness: 0.25 });
    const wrapMat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.25, metalness: 0.55, emissive: color, emissiveIntensity: 0.55 });
    const bootMat = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.5, metalness: 0.4 });
    const visorMat = new THREE.MeshBasicMaterial({ color: color, toneMapped: false });
    const emblemMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
    const capeMat = new THREE.MeshStandardMaterial({ color: color, emissive: color, emissiveIntensity: 0.22, roughness: 0.6, side: THREE.DoubleSide });
    const capeTrimMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false, side: THREE.DoubleSide });
    const flashableMaterials = [vestMat, wrapMat, capeMat];

    // 1. Crisp Signature Ground Tactical Ring + Facing Arrow Chevron (high contrast day & night)
    const ringMat = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.78,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const groundRing = new THREE.Mesh(new THREE.RingGeometry(0.92, 1.32, 32), ringMat);
    groundRing.rotation.x = -Math.PI / 2;
    groundRing.position.set(0, 0.06, 0);
    root.add(groundRing);

    const dirChevron = new THREE.Mesh(
      new THREE.ConeGeometry(0.42, 0.72, 3),
      new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true, opacity: 0.92 })
    );
    dirChevron.rotation.x = Math.PI / 2;
    dirChevron.position.set(0, 0.08, 1.55);
    root.add(dirChevron);

    // 2. Signature-colored X-Ray Silhouette Sprite (visible behind light poles/trees/crowds)
    const glowCanvas = document.createElement('canvas');
    glowCanvas.width = 256;
    glowCanvas.height = 256;
    const gCtx = glowCanvas.getContext('2d');
    const grad = gCtx.createRadialGradient(128, 128, 12, 128, 128, 124);
    const rC = Math.round((cObj.r !== undefined ? cObj.r : 0.9) * 255);
    const gC = Math.round((cObj.g !== undefined ? cObj.g : 0.3) * 255);
    const bC = Math.round((cObj.b !== undefined ? cObj.b : 0.3) * 255);
    grad.addColorStop(0.0, `rgba(255, 255, 255, 0.75)`);
    grad.addColorStop(0.26, `rgba(${rC}, ${gC}, ${bC}, 0.58)`);
    grad.addColorStop(0.62, `rgba(${rC}, ${gC}, ${bC}, 0.22)`);
    grad.addColorStop(1.0, `rgba(${rC}, ${gC}, ${bC}, 0.0)`);
    gCtx.fillStyle = grad;
    gCtx.fillRect(0, 0, 256, 256);
    const glowTex = new THREE.CanvasTexture(glowCanvas);
    const xrayGlowMat = new THREE.SpriteMaterial({
      map: glowTex,
      color: 0xffffff,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      depthWrite: false
    });
    const xrayGlow = new THREE.Sprite(xrayGlowMat);
    xrayGlow.scale.set(3.2, 3.2, 1);
    xrayGlow.position.set(0, 1.35, 0);
    xrayGlow.renderOrder = 998;
    root.add(xrayGlow);

    // 3. Distance-Adaptive High-Altitude Sky Beacon (65m beam + spinning Sky Holo-Diamond)
    const pillarMat = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.14,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const beaconPillar = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.75, 62.0, 16, 1, true), pillarMat);
    beaconPillar.position.set(0, 32.5, 0);
    root.add(beaconPillar);

    const skyDiamondMat = new THREE.MeshBasicMaterial({ color: color, toneMapped: false, wireframe: false });
    const skyDiamond = new THREE.Mesh(new THREE.IcosahedronGeometry(0.95, 0), skyDiamondMat);
    skyDiamond.position.set(0, 18.0, 0);
    root.add(skyDiamond);

    const glowLight = new THREE.PointLight(color, 1.4, 14.0);
    glowLight.position.set(0, 2.1, 0);
    root.add(glowLight);

    // Pelvis & Utility Belt
    const pelvis = new THREE.Group();
    pelvis.position.set(0, 0.92, 0);
    root.add(pelvis);
    const hips = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.24, 0.32), pantsMat);
    hips.castShadow = true;
    pelvis.add(hips);
    const belt = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.08, 0.35), armorDarkMat);
    belt.position.set(0, 0.09, 0);
    pelvis.add(belt);
    const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.09, 0.04), visorMat);
    buckle.position.set(0, 0.09, 0.175);
    pelvis.add(buckle);

    // Armored Legs + Glowing Knee Pads
    const leftLeg = new THREE.Group();
    leftLeg.position.set(-0.17, 0.84, 0);
    root.add(leftLeg);
    const lThigh = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.42, 0.22), pantsMat);
    lThigh.position.set(0, -0.2, 0); lThigh.castShadow = true; leftLeg.add(lThigh);
    const lCalfPivot = new THREE.Group();
    lCalfPivot.position.set(0, -0.4, 0); leftLeg.add(lCalfPivot);
    const lCalf = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.4, 0.20), armorDarkMat);
    lCalf.position.set(0, -0.2, 0); lCalf.castShadow = true; lCalfPivot.add(lCalf);
    const lBoot = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.18, 0.28), bootMat);
    lBoot.position.set(0, -0.38, 0.04); lBoot.castShadow = true; lCalfPivot.add(lBoot);

    const rightLeg = new THREE.Group();
    rightLeg.position.set(0.17, 0.84, 0);
    root.add(rightLeg);
    const rThigh = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.42, 0.22), pantsMat);
    rThigh.position.set(0, -0.2, 0); rThigh.castShadow = true; rightLeg.add(rThigh);
    const rCalfPivot = new THREE.Group();
    rCalfPivot.position.set(0, -0.4, 0); rightLeg.add(rCalfPivot);
    const rCalf = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.4, 0.20), armorDarkMat);
    rCalf.position.set(0, -0.2, 0); rCalf.castShadow = true; rCalfPivot.add(rCalf);
    const rBoot = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.18, 0.28), bootMat);
    rBoot.position.set(0, -0.38, 0.04); rBoot.castShadow = true; rCalfPivot.add(rBoot);

    // Broad Hero Torso + Glowing Chest Core Emblem + Flowing Cape
    const torso = new THREE.Group();
    torso.position.set(0, 1.00, 0);
    root.add(torso);
    const chest = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.56, 0.34), armorDarkMat);
    chest.position.set(0, 0.28, 0); chest.castShadow = true; torso.add(chest);
    const chestPlate = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.38, 0.37), vestMat);
    chestPlate.position.set(0, 0.34, 0.01); torso.add(chestPlate);
    const chestCore = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.04), emblemMat);
    chestCore.rotation.z = Math.PI / 4;
    chestCore.position.set(0, 0.36, 0.195); torso.add(chestCore);

    // Flowing Hero Cape (rotates backwards dynamically during motion!)
    const capePivot = new THREE.Group();
    capePivot.position.set(0, 0.54, -0.17);
    torso.add(capePivot);
    const capeBody = new THREE.Mesh(new THREE.BoxGeometry(0.66, 1.15, 0.04), capeMat);
    capeBody.position.set(0, -0.58, -0.02);
    capeBody.castShadow = true;
    capePivot.add(capeBody);
    const capeStripe = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.12, 0.048), capeTrimMat);
    capeStripe.position.set(0, -0.58, -0.025);
    capePivot.add(capeStripe);

    // Aerodynamic Visor Helmet + Wing Fins
    const headPivot = new THREE.Group();
    headPivot.position.set(0, 0.66, 0);
    torso.add(headPivot);
    const helmet = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.34, 0.33), armorDarkMat);
    helmet.position.set(0, 0.18, 0); helmet.castShadow = true; headPivot.add(helmet);
    const crestStripe = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.37, 0.36), wrapMat);
    crestStripe.position.set(0, 0.20, -0.01); headPivot.add(crestStripe);
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.09, 0.05), visorMat);
    visor.position.set(0, 0.19, 0.16); headPivot.add(visor);
    const jawPlate = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.10, 0.04), skinMat);
    jawPlate.position.set(0, 0.08, 0.15); headPivot.add(jawPlate);
    [-1, 1].forEach(side => {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.16, 0.20), wrapMat);
      wing.position.set(side * 0.18, 0.26, -0.06);
      wing.rotation.x = 0.45;
      wing.rotation.z = side * -0.22;
      headPivot.add(wing);
    });

    // Armored Shoulder Pauldrons & Oversized Brawler Gauntlets
    const lArmPivot = new THREE.Group();
    lArmPivot.position.set(-0.39, 0.50, 0); torso.add(lArmPivot);
    const lPauldron = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.18, 0.26), vestMat);
    lPauldron.position.set(-0.02, -0.02, 0); lArmPivot.add(lPauldron);
    const lBicep = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.28, 0.17), armorDarkMat);
    lBicep.position.set(0, -0.16, 0); lArmPivot.add(lBicep);
    const lForearm = new THREE.Group();
    lForearm.position.set(0, -0.30, 0); lArmPivot.add(lForearm);
    const lLower = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.24, 0.18), armorDarkMat);
    lLower.position.set(0, -0.12, 0); lForearm.add(lLower);
    const lFist = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.23, 0.26), wrapMat);
    lFist.position.set(0, -0.28, 0.02); lForearm.add(lFist);

    const rArmPivot = new THREE.Group();
    rArmPivot.position.set(0.39, 0.50, 0); torso.add(rArmPivot);
    const rPauldron = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.18, 0.26), vestMat);
    rPauldron.position.set(0.02, -0.02, 0); rArmPivot.add(rPauldron);
    const rBicep = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.28, 0.17), armorDarkMat);
    rBicep.position.set(0, -0.16, 0); rArmPivot.add(rBicep);
    const rForearm = new THREE.Group();
    rForearm.position.set(0, -0.30, 0); rArmPivot.add(rForearm);
    const rLower = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.24, 0.18), armorDarkMat);
    rLower.position.set(0, -0.12, 0); rForearm.add(rLower);
    const rFist = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.23, 0.26), wrapMat);
    rFist.position.set(0, -0.28, 0.02); rForearm.add(rFist);

    // Canadian Hockey Stick for Berserk Mode
    const stickMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 1.05, 0.03),
      new THREE.MeshStandardMaterial({ color: 0xd90429, roughness: 0.4 })
    );
    stickMesh.position.set(0.08, -0.1, 0.16);
    stickMesh.rotation.set(-0.4, 0.2, -0.3);
    stickMesh.visible = false;
    rForearm.add(stickMesh);

    // 3D High-Contrast Billboard Nameplate & Health Bar
    const npCanvas = document.createElement('canvas');
    npCanvas.width = 256; npCanvas.height = 76;
    const npCtx = npCanvas.getContext('2d');
    const npTex = new THREE.CanvasTexture(npCanvas);
    npTex.minFilter = THREE.LinearFilter;
    const npMat = new THREE.SpriteMaterial({ map: npTex, depthTest: false, transparent: true });
    const nameplate = new THREE.Sprite(npMat);
    nameplate.scale.set(2.0, 0.60, 1);
    nameplate.position.set(0, 2.38, 0);
    root.add(nameplate);

    function updateNameplate(playerName, hp = 100, isBerserk = false, distMeters = null) {
      npCtx.clearRect(0, 0, 256, 76);
      npCtx.fillStyle = 'rgba(8, 12, 22, 0.94)';
      if (npCtx.roundRect) {
        npCtx.beginPath();
        npCtx.roundRect(6, 6, 244, 64, 10);
        npCtx.fill();
      } else {
        npCtx.fillRect(6, 6, 244, 64);
      }

      npCtx.strokeStyle = isBerserk ? '#ff1e42' : hexStr;
      npCtx.lineWidth = 4.5;
      npCtx.stroke();

      npCtx.font = 'bold 19px "Chakra Petch", Arial, sans-serif';
      npCtx.fillStyle = isBerserk ? '#ff4757' : '#ffffff';
      npCtx.textAlign = 'center';
      const distSuffix = (distMeters !== null && distMeters >= 5) ? ` (${distMeters}m)` : '';
      const label = (isBerserk ? '🍁 ' : '◆ ') + String(playerName || 'DEFENDER').toUpperCase() + distSuffix;
      npCtx.fillText(label, 128, 31);

      const barX = 18, barY = 42, barW = 220, barH = 14;
      npCtx.fillStyle = '#0a0a0c';
      npCtx.fillRect(barX, barY, barW, barH);
      const fillW = Math.max(0, Math.min(1, hp / 100)) * barW;
      npCtx.fillStyle = isBerserk ? '#ff1e27' : (hp > 30 ? hexStr : '#ef4444');
      npCtx.fillRect(barX, barY, fillW, barH);

      npTex.needsUpdate = true;
    }
    updateNameplate(name, 100, false, null);

    return {
      root,
      colorHexStr: hexStr,
      leftLeg, lCalfPivot,
      rightLeg, rCalfPivot,
      torso, headPivot,
      capePivot, skyDiamond,
      lArmPivot, lForearm,
      rArmPivot, rForearm,
      stickMesh,
      nameplate,
      xrayGlow, xrayGlowMat,
      groundRing, ringMat,
      beaconPillar, pillarMat,
      glowLight,
      updateNameplate,
      materials: flashableMaterials,
      originalColors: flashableMaterials.map(m => m.color.getHex())
    };
  }

  // --- Multiplayer Controller Class ---
  // Roles: the server names one HOST per room. The host's game runs the robots, snatchers
  // and civilians and streams them ("world"); guests render those and send hits back.
  // A player alone in a room (or offline) is effectively host of their own game.
  class MultiplayerClient {
    constructor() {
      this.ws = null;
      this.connected = false;
      this.connecting = false;
      this.localId = 'p_' + Math.random().toString(16).slice(2, 10);
      this.joinedAt = Date.now() + Math.random();
      this.hostId = null;
      this.role = 'solo';            // 'solo' | 'host' | 'guest'
      this.localName = getSavedPlayerName();
      const hash = Array.from(this.localId).reduce((acc, c) => acc + c.charCodeAt(0), 0);
      this.localColor = PLAYER_COLORS[hash % PLAYER_COLORS.length];
      this.room = getAutoRoom();
      this.serverUrl = getAutoServerUrl();
      this.cloudMode = isCloudServerUrl(this.serverUrl);
      this.rxBuffer = new Uint8Array(0);
      this.cloudInterval = null;
      this.pingTick = 0;
      this.scene = null;
      this.localPlayer = null;
      this.gameState = null;
      this.remotePlayers = new Map();
      this.sendTimer = 0;
      this.worldTimer = 0;
      this.reconnectTimer = null;
      this.reconnectAttempts = 0;
      this.friendlyFire = false;     // ROOM setting
      this.hasSyncedInitialSpawn = false;
      this.activeFlares = [];
      window.addEventListener('beforeunload', () => {
        if (this.connected && this.cloudMode) {
          this.sendRawCloud({ type: 'player_left', id: this.localId, name: this.localName });
        }
      });
    }

    init(scene, player, state) {
      this.scene = scene;
      this.localPlayer = player;
      this.gameState = state;
      this.initUI();
      this.updateHUDStatus('connecting');
      this.connect();
    }

    isGuest() { return this.role === 'guest'; }
    isHostWithPeers() { return this.role === 'host' && this.remotePlayers.size > 0; }

    roomTopic() {
      return `fod_toronto_v1/room/${this.room}`;
    }

    socketUrl(base) {
      try {
        const u = new URL(base);
        u.searchParams.set('room', this.room);
        u.searchParams.set('name', this.localName);
        return u.toString();
      } catch (e) {
        const sep = base.includes('?') ? '&' : '?';
        return `${base}${sep}room=${encodeURIComponent(this.room)}&name=${encodeURIComponent(this.localName)}`;
      }
    }

    clearCloudTimers() {
      if (this.cloudInterval) {
        clearInterval(this.cloudInterval);
        this.cloudInterval = null;
      }
    }

    disconnect() {
      if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
      this.clearCloudTimers();
      this.reconnectAttempts = 0;
      if (this.ws) {
        const old = this.ws;
        if (this.connected && this.cloudMode && old.readyState === WebSocket.OPEN) {
          try {
            this.sendRawCloud({ type: 'player_left', id: this.localId, name: this.localName });
            old.send(new Uint8Array([0xe0, 0x00]));
          } catch (e) {}
        }
        old.onopen = old.onmessage = old.onerror = old.onclose = null;
        try { old.close(); } catch (e) {}
        this.ws = null;
      }
      this.connected = false;
      this.connecting = false;
      this.removeAllRemotePlayers();
      this.setRole('solo');
      this.updateHUDStatus('offline');
      if (window.showAnnouncement) window.showAnnouncement('🌐 DISCONNECTED FROM ONLINE LOBBY', 2000);
    }

    connect(overrideUrl) {
      if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
      this.clearCloudTimers();
      if (this.ws) {
        // Detach the old socket completely so its late onclose can't clobber the new one
        const old = this.ws;
        old.onopen = old.onmessage = old.onerror = old.onclose = null;
        try { old.close(); } catch (e) {}
        this.ws = null;
        this.connected = false;
        this.removeAllRemotePlayers();
        this.setRole('solo');
      }
      if (overrideUrl) this.serverUrl = normalizeServerUrl(overrideUrl);
      this.cloudMode = isCloudServerUrl(this.serverUrl);
      this.connecting = true;
      this.updateHUDStatus('connecting');

      if (this.cloudMode) {
        this.connectCloud();
        return;
      }

      const url = this.socketUrl(this.serverUrl);
      console.log(`[Multiplayer] Connecting to ${url} ...`);
      let ws;
      try {
        ws = new WebSocket(url);
      } catch (err) {
        console.warn('[Multiplayer] Failed to create WebSocket:', err);
        this.onConnectionFailed(err && err.message);
        return;
      }
      this.ws = ws;
      ws.onopen = () => {
        if (this.ws !== ws) return;
        this.connected = true;
        this.connecting = false;
        this.reconnectAttempts = 0;
        this.updateHUDStatus('connected');
      };
      ws.onmessage = (event) => {
        if (this.ws !== ws) return;
        let msg;
        try { msg = JSON.parse(event.data); } catch (e) { return; }
        try { this.handleMessage(msg); } catch (e) { console.warn('[Multiplayer] handler error', msg && msg.type, e); }
      };
      ws.onerror = (err) => {
        if (this.ws === ws) {
          console.warn('[Multiplayer] WebSocket connection error:', err);
          this.onConnectionFailed('Connection refused or timed out');
        }
      };
      ws.onclose = (ev) => {
        if (this.ws !== ws) return;
        console.log(`[Multiplayer] socket closed (code ${ev && ev.code}); will retry`);
        this.ws = null;
        this.connected = false;
        this.connecting = false;
        this.removeAllRemotePlayers();
        this.setRole('solo');
        this.updateHUDStatus('offline');
        this.scheduleReconnect();
      };
    }

    connectCloud() {
      const brokerUrl = this.serverUrl.startsWith('wss://') || this.serverUrl.startsWith('ws://')
        ? this.serverUrl
        : CLOUD_BROKERS[this.reconnectAttempts % CLOUD_BROKERS.length];
      console.log(`[Multiplayer] Connecting to Cloud Relay ${brokerUrl} [room: ${this.room}] ...`);
      let ws;
      try {
        ws = new WebSocket(brokerUrl, 'mqtt');
        ws.binaryType = 'arraybuffer';
      } catch (err) {
        console.warn('[Multiplayer] Failed to create Cloud WebSocket:', err);
        this.onConnectionFailed(err && err.message);
        return;
      }
      this.ws = ws;
      this.rxBuffer = new Uint8Array(0);

      ws.onopen = () => {
        if (this.ws !== ws) return;
        const clientId = `fod_${this.localId}_${Math.floor(1000 + Math.random() * 8999)}`;
        const willPayload = JSON.stringify({
          type: 'player_left',
          id: this.localId,
          name: this.localName,
          senderId: this.localId
        });
        ws.send(mqttBuildConnect(clientId, this.roomTopic(), willPayload));
      };

      ws.onmessage = (event) => {
        if (this.ws !== ws || !(event.data instanceof ArrayBuffer)) return;
        const chunk = new Uint8Array(event.data);
        this.rxBuffer = mqttConcat([this.rxBuffer, chunk]);
        this.processMqttBuffer(ws);
      };

      ws.onerror = (err) => {
        if (this.ws === ws) {
          console.warn('[Multiplayer] Cloud WebSocket error:', err);
          this.onConnectionFailed('Cloud relay error');
        }
      };

      ws.onclose = (ev) => {
        if (this.ws !== ws) return;
        console.log(`[Multiplayer] Cloud socket closed (code ${ev && ev.code}); will retry`);
        this.clearCloudTimers();
        this.ws = null;
        this.connected = false;
        this.connecting = false;
        this.removeAllRemotePlayers();
        this.setRole('solo');
        this.updateHUDStatus('offline');
        this.scheduleReconnect();
      };
    }

    processMqttBuffer(ws) {
      while (this.rxBuffer.length >= 2) {
        const header = this.rxBuffer[0];
        const pktType = header >> 4;
        const flags = header & 0x0f;
        let multiplier = 1;
        let remLen = 0;
        let idx = 1;
        let completeLen = false;
        while (idx < this.rxBuffer.length && idx <= 4) {
          const b = this.rxBuffer[idx++];
          remLen += (b & 0x7f) * multiplier;
          multiplier *= 128;
          if ((b & 0x80) === 0) {
            completeLen = true;
            break;
          }
        }
        if (!completeLen || this.rxBuffer.length < idx + remLen) return;
        const body = this.rxBuffer.subarray(idx, idx + remLen);
        this.rxBuffer = this.rxBuffer.slice(idx + remLen);

        if (pktType === 2) {
          // CONNACK
          this.connected = true;
          this.connecting = false;
          this.reconnectAttempts = 0;
          ws.send(mqttBuildSubscribe(this.roomTopic(), 1));
          this.recomputeCloudHost();
          this.updateHUDStatus('connected');
          this.sendCloudHello(true);
          setTimeout(() => { if (this.connected && this.ws === ws) this.sendCloudHello(true); }, 350);
          setTimeout(() => { if (this.connected && this.ws === ws) this.sendCloudHello(false); }, 1000);
          this.clearCloudTimers();
          this.pingTick = 0;
          this.cloudInterval = setInterval(() => this.onCloudInterval(), 2000);
        } else if (pktType === 3) {
          // PUBLISH
          if (body.length < 2) continue;
          const topicLen = (body[0] << 8) | body[1];
          const qos = (flags >> 1) & 0x03;
          const payloadOffset = 2 + topicLen + (qos > 0 ? 2 : 0);
          if (body.length <= payloadOffset) continue;
          const jsonStr = textDecoder.decode(body.subarray(payloadOffset));
          let msg;
          try { msg = JSON.parse(jsonStr); } catch (e) { continue; }
          try { this.handleCloudMessage(msg); } catch (e) { console.warn('[Multiplayer] cloud handler error', e); }
        }
      }
    }

    myPlayerInfo() {
      const p = this.localPlayer;
      const gs = this.gameState;
      return {
        id: this.localId,
        name: this.localName,
        color: this.localColor,
        x: p ? Number(p.pos.x.toFixed(2)) : 0,
        y: p ? Number((p.pos.y - 1.7).toFixed(2)) : 0,
        z: p ? Number(p.pos.z.toFixed(2)) : 0,
        yaw: p ? Number(p.yaw.toFixed(3)) : 0,
        health: gs ? (gs.isDead ? 0 : Math.round(gs.health)) : 100,
        armor: gs ? Math.round(gs.armor) : 50,
        isBerserk: !!(gs && gs.isBerserk)
      };
    }

    sendCloudHello(isInitial) {
      const tod = (this.role !== 'guest' && window.getCityTimeOfDay) ? window.getCityTimeOfDay() : undefined;
      this.sendRawCloud({
        type: isInitial ? 'peer_hello' : 'peer_announce',
        player: this.myPlayerInfo(),
        joinedAt: this.joinedAt,
        pvp: this.friendlyFire,
        tod
      });
    }

    sendTimeOfDay(tod) {
      if (this.connected) this.send({ type: 'set_tod', tod, by: this.localName });
    }

    sendFlare() {
      const p = this.localPlayer;
      if (!p) return false;
      this.spawnFlareVisual(p.pos.x, Math.max(0, p.pos.y - 1.7), p.pos.z, this.localColor, this.localName);
      if (this.connected) {
        this.send({
          type: 'flare',
          x: Number(p.pos.x.toFixed(1)),
          y: Number(Math.max(0, p.pos.y - 1.7).toFixed(1)),
          z: Number(p.pos.z.toFixed(1)),
          color: this.localColor,
          senderName: this.localName
        });
      }
      return true;
    }

    spawnFlareVisual(x, y, z, colorHex, who) {
      if (!this.scene) return;
      const col = colorHex || 0x38bdf8;
      const grp = new THREE.Group();
      grp.position.set(x, y, z);

      const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.95, 110, 12, 1, true),
        new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false, fog: false })
      );
      beam.position.set(0, 55, 0);
      grp.add(beam);

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.6, 1.4, 28),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthWrite: false })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(0, 0.25, 0);
      grp.add(ring);

      const orb = new THREE.Mesh(
        new THREE.SphereGeometry(0.85, 12, 10),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95, fog: false })
      );
      orb.position.set(0, 2.5, 0);
      grp.add(orb);

      this.scene.add(grp);
      this.activeFlares.push({ grp, beam, ring, orb, age: 0, maxAge: 5.5 });
      if (who && who !== this.localName && window.showAnnouncement) {
        window.showAnnouncement(`🔥 ${String(who).toUpperCase()} FIRED A SQUAD FLARE!`, 2400);
      }
    }

    onCloudInterval() {
      if (!this.connected || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;
      this.sendCloudHello(false);
      this.pingTick++;
      if (this.pingTick % 8 === 0) {
        try { this.ws.send(new Uint8Array([0xc0, 0x00])); } catch (e) {}
      }
      // Evict stale peers that vanished without a clean disconnect
      const now = Date.now();
      let removedAny = false;
      this.remotePlayers.forEach((rp, id) => {
        if (rp.lastSeen && now - rp.lastSeen > 10000) {
          this.removeRemotePlayer(id);
          removedAny = true;
        }
      });
      if (removedAny) {
        this.recomputeCloudHost();
        this.updateHUDStatus('connected');
      }
    }

    recomputeCloudHost() {
      const roster = [{ id: this.localId, joinedAt: this.joinedAt }];
      this.remotePlayers.forEach((rp) => {
        roster.push({ id: rp.id, joinedAt: rp.joinedAt || Infinity });
      });
      roster.sort((a, b) => (a.joinedAt - b.joinedAt) || a.id.localeCompare(b.id));
      const newHostId = roster[0].id;
      const prevRole = this.role;
      this.hostId = newHostId;
      this.refreshRole();
      if (prevRole === 'guest' && this.role === 'host' && this.remotePlayers.size > 0 && window.showAnnouncement) {
        window.showAnnouncement('👑 YOU ARE NOW RUNNING THE CITY', 2200);
      } else if (prevRole !== 'guest' && this.role === 'guest' && window.showAnnouncement) {
        const host = this.remotePlayers.get(this.hostId);
        window.showAnnouncement(`🤝 JOINED ${host ? host.name.toUpperCase() : 'THE SQUAD'}'S TORONTO!`, 2500);
      }
    }

    handleCloudMessage(msg) {
      if (!msg || typeof msg !== 'object') return;
      const senderId = msg.senderId || msg.id;
      if (senderId === this.localId) return;

      if (senderId && this.remotePlayers.has(senderId)) {
        this.remotePlayers.get(senderId).lastSeen = Date.now();
      }

      if (msg.type === 'peer_hello' || msg.type === 'peer_announce') {
        const p = msg.player;
        if (!p || !p.id || p.id === this.localId) return;
        const isNew = !this.remotePlayers.has(p.id);
        if (isNew) {
          this.addRemotePlayer(p, msg.joinedAt);
          if (window.showAnnouncement) {
            window.showAnnouncement(`⭐ ${String(p.name).toUpperCase()} JOINED THE SQUAD! ⭐`, 2500);
          }
          this.sendCloudHello(false);
        } else {
          const rp = this.remotePlayers.get(p.id);
          rp.lastSeen = Date.now();
          if (msg.joinedAt) rp.joinedAt = msg.joinedAt;
          if (p.name && p.name !== rp.name) {
            rp.name = p.name;
            if (rp.rig) rp.rig.updateNameplate(rp.name, rp.health, rp.isBerserk);
          }
        }
        this.recomputeCloudHost();
        if (p.id === this.hostId) {
          if (msg.pvp !== undefined && isNew) this.applyMode(!!msg.pvp, null);
          if (msg.tod && window.setCityTimeOfDay && window.getCityTimeOfDay && msg.tod !== window.getCityTimeOfDay()) {
            window.setCityTimeOfDay(msg.tod, true);
          }
          this.maybeSyncInitialSpawn();
        }
        this.updateHUDStatus('connected');
        return;
      }

      if (msg.type === 'set_tod') {
        if ((msg.tod === 'day' || msg.tod === 'night') && window.setCityTimeOfDay) {
          window.setCityTimeOfDay(msg.tod, true, msg.by || msg.senderName);
        }
        return;
      }

      if (msg.type === 'flare') {
        this.spawnFlareVisual(msg.x || 0, msg.y || 0, msg.z || 0, msg.color, msg.senderName);
        return;
      }

      if (msg.type === 'state') {
        msg.id = senderId;
        if (!this.remotePlayers.has(msg.id) && msg.name) {
          this.addRemotePlayer({
            id: msg.id,
            name: msg.name,
            color: msg.color || 0x00f0ff,
            x: msg.x,
            y: msg.y,
            z: msg.z,
            yaw: msg.yaw,
            health: msg.health
          }, msg.joinedAt);
          this.recomputeCloudHost();
        }
        this.handleMessage(msg);
        this.maybeSyncInitialSpawn();
        return;
      }

      if (msg.type === 'set_mode') {
        this.applyMode(!!msg.pvp, msg.senderName || msg.by);
        return;
      }

      if (msg.type === 'join_info') {
        this.handleMessage({ type: 'player_updated', player: { id: senderId, name: msg.name } });
        return;
      }

      if (msg.type === 'attack' || msg.type === 'taunt') {
        msg.id = senderId;
        msg.name = msg.senderName;
        this.handleMessage(msg);
        return;
      }

      if (msg.type === 'hit') {
        if (this.friendlyFire && msg.targetId === this.localId) {
          msg.attackerId = senderId;
          msg.attackerName = msg.senderName;
          this.handleMessage(msg);
        }
        return;
      }

      if (msg.type === 'ko') {
        msg.victimId = senderId;
        msg.victimName = msg.senderName;
        this.handleMessage(msg);
        return;
      }

      if (msg.type === 'world') {
        if (senderId === this.hostId) this.handleMessage(msg);
        return;
      }

      if (msg.type === 'enemy_hit') {
        if (this.role === 'host') {
          msg.from = senderId;
          this.handleMessage(msg);
        }
        return;
      }

      if (msg.type === 'enemy_dmg' || msg.type === 'score_event') {
        if (msg.targetId === this.localId) this.handleMessage(msg);
        return;
      }

      if (msg.type === 'player_left') {
        msg.id = senderId;
        this.handleMessage(msg);
        this.recomputeCloudHost();
        this.updateHUDStatus('connected');
      }
    }

    scheduleReconnect() {
      if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
      this.reconnectAttempts++;
      const delay = Math.min(15000, 2000 + this.reconnectAttempts * 2000);
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null;
        if (!this.connected && !this.connecting) this.connect();
      }, delay);
    }

    onConnectionFailed(reason) {
      this.connected = false;
      this.connecting = false;
      this.updateHUDStatus('failed', reason);
      this.scheduleReconnect();
    }

    sendRawCloud(payloadObj) {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        payloadObj.senderId = this.localId;
        payloadObj.senderName = this.localName;
        const pkt = mqttBuildPublish(this.roomTopic(), JSON.stringify(payloadObj));
        this.ws.send(pkt);
      }
    }

    send(data) {
      if (!this.ws || !this.connected || this.ws.readyState !== WebSocket.OPEN) return;
      if (this.cloudMode) {
        if (data.type === 'state') {
          data.name = this.localName;
          data.color = this.localColor;
          data.joinedAt = this.joinedAt;
        } else if (data.type === 'set_mode') {
          this.applyMode(!!data.pvp, this.localName);
        } else if (data.type === 'ko') {
          if (window.showAnnouncement) {
            window.showAnnouncement(`⚡ ${data.killerName || 'PLAYER'} KO'D ${this.localName}! ⚡`, 3500);
          }
        }
        this.sendRawCloud(data);
        return;
      }
      this.ws.send(JSON.stringify(data));
    }

    // ---- role changes drive the NPC ownership hand-off in game.js ----
    setRole(role) {
      if (role === this.role) return;
      const prev = this.role;
      this.role = role;
      console.log(`[Multiplayer] role ${prev} -> ${role}`);
      if (role === 'guest') {
        if (window.netBecomeGuest) window.netBecomeGuest();
      } else if (prev === 'guest') {
        if (window.netBecomeHost) window.netBecomeHost();
      }
      this.updateHUDStatus(this.connected ? 'connected' : 'offline');
    }

    refreshRole() {
      if (!this.connected || !this.localId) { this.setRole('solo'); return; }
      this.setRole(this.hostId === this.localId ? 'host' : 'guest');
    }

    handleMessage(msg) {
      switch (msg.type) {
        case 'welcome': {
          this.localId = msg.id;
          this.hostId = msg.hostId;
          if (msg.color !== undefined) this.localColor = msg.color;
          this.applyMode(!!msg.pvp, null);
          (msg.players || []).forEach(p => { if (p.id !== this.localId) this.addRemotePlayer(p); });
          this.refreshRole();
          this.updateHUDStatus('connected');
          if (window.showAnnouncement && this.role === 'guest') {
            const host = this.remotePlayers.get(this.hostId);
            window.showAnnouncement(`🤝 JOINED ${host ? host.name.toUpperCase() : 'THE SQUAD'}'S TORONTO!`, 2500);
          }
          if (msg.tod && window.setCityTimeOfDay) window.setCityTimeOfDay(msg.tod, true);
          this.maybeSyncInitialSpawn();
          break;
        }
        case 'set_tod':
          if ((msg.tod === 'day' || msg.tod === 'night') && window.setCityTimeOfDay) {
            window.setCityTimeOfDay(msg.tod, true, msg.by);
          }
          break;
        case 'flare':
          this.spawnFlareVisual(msg.x || 0, msg.y || 0, msg.z || 0, msg.color, msg.senderName);
          break;
        case 'host':
          this.hostId = msg.hostId;
          this.refreshRole();
          if (this.role === 'host' && window.showAnnouncement) window.showAnnouncement('👑 YOU ARE NOW RUNNING THE CITY', 2200);
          break;
        case 'mode':
          this.applyMode(!!msg.pvp, msg.by);
          break;
        case 'player_joined': {
          const p = msg.player;
          if (p && p.id !== this.localId) {
            this.addRemotePlayer(p);
            if (window.showAnnouncement) window.showAnnouncement(`⭐ ${String(p.name).toUpperCase()} JOINED THE SQUAD! ⭐`, 2500);
          }
          this.updateHUDStatus('connected');
          break;
        }
        case 'player_updated': {
          const p = msg.player;
          const rp = p && this.remotePlayers.get(p.id);
          if (rp) {
            rp.name = p.name;
            if (rp.rig) rp.rig.updateNameplate(rp.name, rp.health, rp.isBerserk);
          }
          break;
        }
        case 'state': {
          const rp = this.remotePlayers.get(msg.id);
          if (!rp) break;
          if (msg.x !== undefined) rp.targetPos.set(msg.x, msg.y, msg.z);
          rp.targetYaw = msg.yaw || 0;
          rp.anim = msg.anim || 'idle';
          const hp = (msg.health !== undefined) ? msg.health : rp.health;
          const berserk = !!msg.isBerserk;
          if (rp.rig && (hp !== rp.health || berserk !== rp.isBerserk)) {
            rp.rig.updateNameplate(rp.name, hp, berserk);
            if (rp.rig.stickMesh) rp.rig.stickMesh.visible = berserk;
          }
          rp.health = hp;
          rp.isBerserk = berserk;
          rp.armor = (msg.armor !== undefined) ? msg.armor : rp.armor;
          break;
        }
        case 'attack': {
          const rp = this.remotePlayers.get(msg.id);
          if (rp) this.triggerRemoteAttackAnim(rp, msg.attackType || 'punch');
          break;
        }
        case 'hit':
          this.handleIncomingHit(msg);
          break;
        case 'ko':
          if (window.showAnnouncement) window.showAnnouncement(`⚡ ${msg.killerName || 'PLAYER'} KO'D ${msg.victimName || 'PLAYER'}! ⚡`, 3500);
          if (window.audio && window.audio.playImpact) window.audio.playImpact('heavy');
          break;
        case 'player_left':
          if (this.remotePlayers.has(msg.id)) {
            this.removeRemotePlayer(msg.id);
            if (window.showAnnouncement) window.showAnnouncement(`🚪 ${msg.name || 'PLAYER'} LEFT THE 6IX`, 2200);
          }
          this.updateHUDStatus('connected');
          break;

        // ---- NPC sync ----
        case 'world':      // host -> guests
          if (this.role === 'guest' && window.applyEnemySnapshot) window.applyEnemySnapshot(msg.e || []);
          break;
        case 'enemy_hit':  // guest -> host
          if (this.role === 'host' && window.applyNetEnemyHit) window.applyNetEnemyHit(msg);
          break;
        case 'enemy_dmg':  // host -> me: a robot punched me on the host's screen
          if (window.applyNetEnemyDamage) window.applyNetEnemyDamage(msg.damage || 0);
          break;
        case 'score_event':
          if (window.applyScoreEvent) window.applyScoreEvent(msg.ev || {});
          break;
      }
    }

    // ---- outgoing NPC sync helpers (called from game.js) ----
    sendEnemyHit(nid, dmg, knockback, attackType, glory) {
      this.send({ type: 'enemy_hit', nid, dmg, kb: knockback, atype: attackType, glory: !!glory });
    }
    sendEnemyDamage(targetId, damage) {
      this.send({ type: 'enemy_dmg', targetId, damage });
    }
    sendScoreEvent(targetId, ev) {
      this.send({ type: 'score_event', targetId, ev });
    }

    maybeSyncInitialSpawn() {
      if (this.hasSyncedInitialSpawn || this.role !== 'guest' || !window.syncSpawnNearHost) return;
      const host = this.remotePlayers.get(this.hostId) || this.remotePlayers.values().next().value;
      if (!host || (host.currentPos.x === 0 && host.currentPos.z === 0)) return;
      if (window.syncSpawnNearHost(host)) {
        this.hasSyncedInitialSpawn = true;
      }
    }

    squadSummary() {
      const out = [];
      this.remotePlayers.forEach((rp) => {
        out.push({
          id: rp.id,
          name: rp.name,
          initial: rp.initial || 'P',
          color: rp.color,
          colorHex: rp.colorHexStr || ('#' + ((rp.color || 0xef4444).toString(16).padStart(6, '0'))),
          x: rp.currentPos.x,
          y: rp.currentPos.y,
          z: rp.currentPos.z,
          yaw: rp.currentYaw,
          health: rp.health,
          isBerserk: rp.isBerserk,
          isHost: rp.id === this.hostId
        });
      });
      return out;
    }

    addRemotePlayer(info, joinedAt) {
      if (this.remotePlayers.has(info.id)) return;
      const has = (info.x || info.z);
      const spawnX = has ? info.x : (this.localPlayer ? this.localPlayer.pos.x + 3 : 0);
      const spawnY = has ? (info.y || 0) : 0;
      const spawnZ = has ? info.z : (this.localPlayer ? this.localPlayer.pos.z + 3 : 0);
      const col = info.color || 0xef4444;
      const cleanName = String(info.name || 'DEFENDER').trim() || 'DEFENDER';
      const rig = createRemoteHeroRig(cleanName, col);
      rig.root.position.set(spawnX, spawnY, spawnZ);
      if (this.scene) this.scene.add(rig.root);
      this.remotePlayers.set(info.id, {
        id: info.id,
        name: cleanName,
        initial: cleanName.charAt(0).toUpperCase(),
        color: col,
        colorHexStr: rig.colorHexStr,
        joinedAt: joinedAt || Date.now(),
        lastSeen: Date.now(),
        rig,
        currentPos: new THREE.Vector3(spawnX, spawnY, spawnZ),
        targetPos: new THREE.Vector3(spawnX, spawnY, spawnZ),
        eyePos: new THREE.Vector3(spawnX, spawnY + 1.7, spawnZ),
        currentYaw: info.yaw || 0,
        targetYaw: info.yaw || 0,
        anim: info.anim || 'idle',
        isBerserk: !!info.isBerserk,
        health: (info.health !== undefined) ? info.health : 100,
        armor: 50,
        walkPhase: Math.random() * Math.PI * 2,
        attackProgress: 0,
        isAttacking: false,
        attackType: 'punch'
      });
    }

    removeRemotePlayer(id) {
      const rp = this.remotePlayers.get(id);
      if (!rp) return;
      if (rp.rig && rp.rig.root && this.scene) this.scene.remove(rp.rig.root);
      this.remotePlayers.delete(id);
    }

    removeAllRemotePlayers() {
      this.remotePlayers.forEach((rp) => {
        if (rp.rig && rp.rig.root && this.scene) this.scene.remove(rp.rig.root);
      });
      this.remotePlayers.clear();
    }

    triggerRemoteAttackAnim(rp, atkType) {
      rp.isAttacking = true;
      rp.attackProgress = 0;
      rp.attackType = atkType;
      if (window.audio && window.audio.playPunch && this.localPlayer &&
          Math.hypot(rp.currentPos.x - this.localPlayer.pos.x, rp.currentPos.z - this.localPlayer.pos.z) < 30) {
        window.audio.playPunch(atkType === 'heavy' ? 1.5 : 1.0, rp.isBerserk);
      }
    }

    handleIncomingHit(msg) {
      if (!this.gameState || this.gameState.isDead) return;
      if (!this.friendlyFire) return;   // room is co-op: server shouldn't send these, but be safe
      const dmg = Math.max(0, Math.min(200, msg.damage || 20));
      const kbX = (msg.knockback && msg.knockback.x) || 0;
      const kbZ = (msg.knockback && msg.knockback.z) || 0;
      let remaining = dmg;
      if (this.gameState.armor > 0) {
        const absorb = Math.min(this.gameState.armor, dmg * 0.65);
        this.gameState.armor -= absorb;
        remaining -= absorb;
      }
      this.gameState.health = Math.max(0, this.gameState.health - remaining);
      if (window.triggerDamageFlash) window.triggerDamageFlash();
      if (window.triggerScreenShake) window.triggerScreenShake(16);
      if (window.setFaceExpression) window.setFaceExpression('hurt', 0.65);
      if (window.updateHUDHealth) window.updateHUDHealth();
      if (window.audio && window.audio.playImpact) window.audio.playImpact(msg.attackType || 'punch');
      if (this.localPlayer) {
        this.localPlayer.velocity.x += kbX;
        this.localPlayer.velocity.z += kbZ;
      }
      if (this.gameState.health <= 0) {
        this.gameState.health = 0;
        this.send({ type: 'ko', killerId: msg.attackerId, killerName: msg.attackerName });
        if (window.playerDeath) window.playerDeath();
      }
    }

    broadcastAttack(attackType) {
      if (!this.connected || !this.localPlayer) return;
      this.send({ type: 'attack', attackType });
    }

    // Horizontal (feet-to-feet) geometry: the local player position is at eye height,
    // remote rigs are at foot height, so 3D distance/direction was wrong up close.
    _meleeTargets(atk) {
      const out = [];
      const p = this.localPlayer.pos;
      const fx = -Math.sin(this.localPlayer.yaw), fz = -Math.cos(this.localPlayer.yaw);
      this.remotePlayers.forEach((rp, id) => {
        if (!rp.rig) return;
        const dx = rp.currentPos.x - p.x, dz = rp.currentPos.z - p.z;
        const dist = Math.hypot(dx, dz);
        if (dist > atk.range + 0.3) return;
        if (Math.abs(rp.currentPos.y + 1.7 - p.y) > 2.5) return;   // different floor
        const nx = dist > 0.05 ? dx / dist : fx, nz = dist > 0.05 ? dz / dist : fz;
        if (dist > 0.6 && nx * fx + nz * fz < 0.5) return;           // point blank always connects
        out.push({ rp, id, nx, nz });
      });
      return out;
    }

    checkMeleeHits(atk) {
      if (!this.connected || !this.localPlayer || this.remotePlayers.size === 0) return false;
      const targets = this._meleeTargets(atk);
      if (!targets.length) return false;
      if (!this.friendlyFire) {
        const t = targets[0];
        if (window.showAnnouncement) window.showAnnouncement(`🤜🤛 SQUAD FIST-BUMP WITH ${t.rp.name}!`, 1200);
        if (window.audio && window.audio.playPickup) window.audio.playPickup();
        if (window.spawnDebris) window.spawnDebris(t.rp.currentPos.x, 1.2, t.rp.currentPos.z, 0x38bdf8, 14, 6);
        return true;
      }
      const berserk = this.gameState && this.gameState.isBerserk;
      targets.forEach(({ rp, id, nx, nz }) => {
        const dmg = berserk ? atk.damage * 3 : atk.damage;
        const kb = berserk ? atk.knockback * 2.2 : atk.knockback;
        this.send({ type: 'hit', targetId: id, damage: dmg, knockback: { x: nx * kb, z: nz * kb }, attackType: atk.type });
        if (rp.rig && rp.rig.materials) {
          rp.rig.materials.forEach(m => m.color.setHex(0xff2222));
          setTimeout(() => {
            if (rp.rig && rp.rig.originalColors) rp.rig.materials.forEach((m, i) => m.color.setHex(rp.rig.originalColors[i]));
          }, 120);
        }
        if (window.spawnDebris) window.spawnDebris(rp.currentPos.x, 1.0, rp.currentPos.z, 0xffea00, 24, 8);
      });
      return true;
    }

    update(dt) {
      if (this.connected && this.localPlayer) {
        // 1. Local player state at ~20 Hz
        this.sendTimer += dt;
        if (this.sendTimer >= 0.05) {
          this.sendTimer = 0;
          const gs = this.gameState;
          this.send({
            type: 'state',
            x: Number(this.localPlayer.pos.x.toFixed(2)),
            y: Number((this.localPlayer.pos.y - 1.7).toFixed(2)),
            z: Number(this.localPlayer.pos.z.toFixed(2)),
            yaw: Number(this.localPlayer.yaw.toFixed(3)),
            anim: (gs && gs.isAttacking) ? gs.currentAnimType : 'idle',
            isBerserk: !!(gs && gs.isBerserk),
            health: gs ? (gs.isDead ? 0 : Math.round(gs.health)) : 100,
            armor: gs ? Math.round(gs.armor) : 50,
            score: gs ? gs.score : 0
          });
        }
        // 2. Host streams the NPC world at ~10 Hz
        if (this.isHostWithPeers() && window.buildEnemySnapshot) {
          this.worldTimer += dt;
          if (this.worldTimer >= 0.1) {
            this.worldTimer = 0;
            this.send({ type: 'world', e: window.buildEnemySnapshot() });
          }
        }
      }

      // 3. Interpolate & animate remote players
      const pulseTime = performance.now() * 0.004;
      this.remotePlayers.forEach((rp) => {
        if (!rp.rig) return;
        const before = rp.currentPos.distanceTo(rp.targetPos);
        if (before > 15) rp.currentPos.copy(rp.targetPos);           // teleport / respawn
        else {
          const blend = Math.min(1.0, dt * 14.0);
          rp.currentPos.set(
            rp.currentPos.x + (rp.targetPos.x - rp.currentPos.x) * blend,
            rp.currentPos.y + (rp.targetPos.y - rp.currentPos.y) * blend,
            rp.currentPos.z + (rp.targetPos.z - rp.currentPos.z) * blend
          );
        }
        rp.eyePos.set(rp.currentPos.x, rp.currentPos.y + 1.7, rp.currentPos.z);
        rp.rig.root.position.copy(rp.currentPos);
        rp.rig.root.visible = rp.health > 0;

        // Animate Hero Cape, Sky Holo-Diamond, Distance-Adaptive Sky Beam & Tactical Ring
        const pulse = 0.5 + 0.5 * Math.sin(pulseTime + rp.walkPhase);
        let distToMe = 0;
        if (this.localPlayer) {
          distToMe = Math.hypot(rp.currentPos.x - this.localPlayer.pos.x, rp.currentPos.z - this.localPlayer.pos.z);
        }
        if (rp.rig.xrayGlowMat) {
          const farHalo = Math.min(1.0, Math.max(0.25, (distToMe - 6) / 35));
          rp.rig.xrayGlowMat.opacity = farHalo * (0.45 + 0.25 * pulse);
          const haloSize = Math.min(12.0, Math.max(3.0, 2.8 + distToMe * 0.09)) * (0.95 + 0.08 * pulse);
          rp.rig.xrayGlow.scale.set(haloSize, haloSize, 1);
        }
        if (rp.rig.ringMat) {
          rp.rig.ringMat.opacity = 0.62 + 0.28 * pulse;
          const ringScale = 0.96 + 0.10 * pulse;
          rp.rig.groundRing.scale.set(ringScale, ringScale, 1);
        }
        if (rp.rig.pillarMat) {
          // Subtle up close so hero armor stays sharp; vivid high-altitude beam from afar!
          const farFactor = distToMe < 12 ? 0.08 : Math.min(1.0, 0.15 + (distToMe - 12) / 55);
          rp.rig.pillarMat.opacity = farFactor * (0.34 + 0.16 * pulse);
        }
        if (rp.rig.skyDiamond) {
          rp.rig.skyDiamond.rotation.y += dt * 2.2;
          rp.rig.skyDiamond.position.y = 18.0 + Math.sin(pulseTime + rp.walkPhase) * 0.9;
        }
        if (rp.rig.capePivot) {
          const stride = before > 0.05 ? 1.0 : 0.12;
          rp.rig.capePivot.rotation.x = 0.08 + stride * (0.38 + Math.sin(pulseTime * 1.8 + rp.walkPhase) * 0.16);
        }
        if (rp.rig.nameplate) {
          // Keep nameplate legible even from a distance
          const npScale = Math.min(4.6, Math.max(1.0, distToMe * 0.048));
          rp.rig.nameplate.scale.set(2.0 * npScale, 0.60 * npScale, 1);
        }
        const distRounded = Math.round(distToMe);
        if (rp.lastDistRounded !== distRounded) {
          rp.lastDistRounded = distRounded;
          rp.rig.updateNameplate(rp.name, rp.health, rp.isBerserk, distRounded);
        }
        let dYaw = rp.targetYaw - rp.currentYaw;
        dYaw = Math.atan2(Math.sin(dYaw), Math.cos(dYaw));
        rp.currentYaw += dYaw * Math.min(1.0, dt * 12.0);
        rp.rig.root.rotation.y = rp.currentYaw;
        if (before > 0.05) {
          rp.walkPhase += dt * 9.0;
          const s = Math.sin(rp.walkPhase) * 0.6;
          rp.rig.leftLeg.rotation.x = s;
          rp.rig.lCalfPivot.rotation.x = Math.max(0, -s * 0.6);
          rp.rig.rightLeg.rotation.x = -s;
          rp.rig.rCalfPivot.rotation.x = Math.max(0, s * 0.6);
        } else {
          rp.rig.leftLeg.rotation.x = rp.rig.lCalfPivot.rotation.x = 0;
          rp.rig.rightLeg.rotation.x = rp.rig.rCalfPivot.rotation.x = 0;
        }
        if (rp.isAttacking) {
          rp.attackProgress += dt * 4.2;
          const swing = Math.sin(Math.min(1.0, rp.attackProgress) * Math.PI);
          if (rp.attackType === 'kick') {
            rp.rig.rightLeg.rotation.set(-1.4 * swing, 0.2, 0);
          } else {
            rp.rig.rArmPivot.rotation.x = -1.2 - swing * 0.8;
            rp.rig.rForearm.rotation.x = -0.2 - swing * 0.9;
          }
          if (rp.attackProgress >= 1.0) {
            rp.isAttacking = false;
            rp.attackProgress = 0;
            rp.rig.rArmPivot.rotation.x = 0;
            rp.rig.rForearm.rotation.x = 0;
            rp.rig.rightLeg.rotation.set(0, 0, 0);
          }
        }
      });

      // 4. Step Squad Signal Flares (skyrocket ascents + expanding rings)
      for (let i = this.activeFlares.length - 1; i >= 0; i--) {
        const fl = this.activeFlares[i];
        fl.age += dt;
        const k = fl.age / fl.maxAge;
        if (k >= 1) {
          if (this.scene && fl.grp) this.scene.remove(fl.grp);
          this.activeFlares.splice(i, 1);
          continue;
        }
        const fade = Math.max(0, 1 - k);
        fl.orb.position.y = 2.5 + fl.age * 24.0;
        const rScale = 1 + fl.age * 7.5;
        fl.ring.scale.set(rScale, rScale, 1);
        if (fl.beam.material) fl.beam.material.opacity = 0.82 * fade;
        if (fl.ring.material) fl.ring.material.opacity = 0.90 * fade;
        if (fl.orb.material) fl.orb.material.opacity = 0.95 * fade;
      }
    }

    // ---------------------------------------------------------------- UI
    initUI() {
      const nameInput = document.getElementById('mp-name-input');
      const roomInput = document.getElementById('mp-room-input');
      const serverInput = document.getElementById('mp-server-input');
      if (nameInput) {
        nameInput.value = this.localName;
        nameInput.addEventListener('change', (e) => this.setPlayerName(e.target.value));
      }
      if (roomInput) roomInput.value = this.room;
      if (serverInput) serverInput.value = this.serverUrl;

      const connectBtn = document.getElementById('mp-connect-btn');
      if (connectBtn) {
        connectBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (this.connected) {
            this.disconnect();
            return;
          }
          if (nameInput && nameInput.value) this.setPlayerName(nameInput.value);
          if (roomInput) {
            this.room = (roomInput.value || '6ix').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '') || '6ix';
            roomInput.value = this.room;
            localStorage.setItem('toronto_mp_room', this.room);
          }
          if (serverInput && serverInput.value.trim()) {
            this.serverUrl = normalizeServerUrl(serverInput.value.trim());
            serverInput.value = this.serverUrl;
            localStorage.setItem('toronto_mp_server', this.serverUrl);
          }
          this.connect(this.serverUrl);
        });
      }
      const modeBtn = document.getElementById('mp-mode-btn');
      if (modeBtn) {
        modeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (this.connected) this.send({ type: 'set_mode', pvp: !this.friendlyFire });
          else this.applyMode(!this.friendlyFire, null);   // offline: local only, no effect
        });
      }
      const badge = document.getElementById('mp-status-badge');
      if (badge) {
        badge.style.cursor = 'pointer';
        badge.addEventListener('click', (e) => {
          e.stopPropagation();
          if (window.pauseGame) window.pauseGame();
        });
      }
    }

    applyMode(pvp, byName) {
      const changed = pvp !== this.friendlyFire;
      this.friendlyFire = pvp;
      const btn = document.getElementById('mp-mode-btn');
      if (btn) {
        btn.className = pvp ? 'mp-mode-toggle-btn pvp-active' : 'mp-mode-toggle-btn';
        btn.innerText = pvp ? '⚔️ ARENA BRAWL (PVP DUEL ON)' : '🤝 SQUAD CO-OP (NO FRIENDLY FIRE)';
      }
      if (changed && byName !== null && window.showAnnouncement) {
        const who = byName ? ` (${String(byName).toUpperCase()})` : '';
        window.showAnnouncement(pvp ? `⚔️ BRAWL DUEL ON — FRIENDLY FIRE!${who}` : `🤝 SQUAD CO-OP — NO FRIENDLY FIRE${who}`, 2500);
      }
    }

    setPlayerName(name) {
      if (!name) return;
      this.localName = name.trim().slice(0, 20);
      localStorage.setItem('toronto_mp_name', this.localName);
      if (this.connected) this.send({ type: 'join_info', name: this.localName });
    }

    updateHUDStatus(status, detail) {
      const badge = document.getElementById('mp-status-badge');
      const lobbyStatus = document.getElementById('mp-lobby-status');
      const connectBtn = document.getElementById('mp-connect-btn');

      if (status === 'connected') {
        const count = this.remotePlayers.size + 1;
        const roleTxt = this.role === 'guest' ? 'GUEST' : (count > 1 ? 'HOST' : 'SOLO');
        if (badge) {
          badge.className = 'tag tag-green';
          badge.innerText = `🌐 ${this.room.toUpperCase()} • ${count} • ${roleTxt}`;
          badge.title = `Relay: ${this.serverUrl} [room ${this.room}]`;
        }
        if (lobbyStatus) {
          lobbyStatus.innerText = `ONLINE IN ROOM [${this.room.toUpperCase()}] • ${count} SQUAD • YOU ARE ${roleTxt}`;
          lobbyStatus.style.color = '#34d399';
        }
        if (connectBtn) {
          connectBtn.innerText = 'DISCONNECT';
          connectBtn.disabled = false;
          connectBtn.style.background = '#10b981';
          connectBtn.style.color = '#ffffff';
        }
      } else if (status === 'connecting') {
        if (badge) {
          badge.className = 'tag tag-yellow';
          badge.innerText = '🌐 CONNECTING...';
          badge.title = `Connecting to ${this.serverUrl}`;
        }
        if (lobbyStatus) {
          lobbyStatus.innerText = `CONNECTING TO RELAY (${this.serverUrl})...`;
          lobbyStatus.style.color = '#fbbf24';
        }
        if (connectBtn) {
          connectBtn.innerText = '⏳ CONNECTING...';
          connectBtn.disabled = true;
          connectBtn.style.background = '#d97706';
          connectBtn.style.color = '#ffffff';
        }
      } else if (status === 'failed') {
        if (badge) {
          badge.className = 'tag tag-red';
          badge.innerText = '⚠️ CONNECTION FAILED';
          badge.title = `Failed connecting to ${this.serverUrl}`;
        }
        if (lobbyStatus) {
          lobbyStatus.innerText = detail ? `FAILED: ${detail} (${this.serverUrl})` : `CONNECTION FAILED (${this.serverUrl}). Is server_multiplayer.py running?`;
          lobbyStatus.style.color = '#ef4444';
        }
        if (connectBtn) {
          connectBtn.innerText = '⚠️ RETRY CONNECT';
          connectBtn.disabled = false;
          connectBtn.style.background = '#dc2626';
          connectBtn.style.color = '#ffffff';
        }
      } else {
        if (badge) {
          badge.className = 'tag tag-dim';
          badge.innerText = '🌐 SOLO / OFFLINE';
          badge.title = 'Offline. Click to open lobby.';
        }
        if (lobbyStatus) {
          lobbyStatus.innerText = 'OFFLINE / LOCAL SINGLE-PLAYER';
          lobbyStatus.style.color = '#94a3b8';
        }
        if (connectBtn) {
          connectBtn.innerText = 'CONNECT / RECONNECT';
          connectBtn.disabled = false;
          connectBtn.style.background = '';
          connectBtn.style.color = '';
        }
      }
    }
  }

  window.multiplayer = new MultiplayerClient();
  window.setMultiplayerName = function (name) {
    if (window.multiplayer) window.multiplayer.setPlayerName(name);
  };
})();

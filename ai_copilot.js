/**
 * Neural AI Copilot ("Watch AI") for Fists of Doom: Toronto.
 *
 * NEURAL mode runs the policy trained by rl/train.py (ego CNN + LSTM). It sees exactly what the
 * agent saw in training (rl/env.py observe(); spec in rl/OBS_SPEC.md):
 *   - a 16x16 egocentric occupancy patch (2 m cells) read from ai_grid.js, the same grid the env uses
 *   - health / armor / rage / berserk / cooldown / sanctuary flags
 *   - range + bearing to the mission crate and to the peace sanctuary (no absolute position!)
 *   - the 6 nearest people within 40 m (disguised snatchers look like civilians until exposed)
 * and acts like a player would: move (fwd/back/strafe/sprint), turn, punch / kick.
 *
 * EXPERT mode is a hand-written fallback (used automatically if no compatible model is loaded).
 * Toggle with V (handled in game.js) or the WATCH AI button; B / the pill switches mode.
 */
(function () {
  'use strict';

  // ------------------------------------------------------------------ shared grid (ai_grid.js)
  let GRID = null;
  function grid() {
    if (GRID || !window.AI_GRID) return GRID;
    const g = window.AI_GRID;
    const bin = atob(g.bits);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    GRID = { x0: g.x0, z0: g.z0, w: g.w, h: g.h, bytes, peace: g.peaceZone };
    return GRID;
  }
  function blocked(G, x, z) {
    const i = Math.floor(z - G.z0), j = Math.floor(x - G.x0);
    if (i < 0 || i >= G.h || j < 0 || j >= G.w) return true;
    const k = i * G.w + j;
    return (G.bytes[k >> 3] >> (k & 7)) & 1;
  }

  // ------------------------------------------------------------------ float16 tensors
  function f16ToF32(h) {
    const s = (h & 0x8000) ? -1 : 1, e = (h >> 10) & 0x1f, f = h & 0x3ff;
    if (e === 0) return s * Math.pow(2, -14) * (f / 1024);
    if (e === 31) return f ? NaN : s * Infinity;
    return s * Math.pow(2, e - 15) * (1 + f / 1024);
  }
  function decodeTensor(t) {
    const bin = atob(t.data);
    const n = bin.length >> 1;
    const out = new Float32Array(n);
    for (let i = 0; i < n; i++) out[i] = f16ToF32(bin.charCodeAt(2 * i) | (bin.charCodeAt(2 * i + 1) << 8));
    return { shape: t.shape, data: out };
  }

  // ------------------------------------------------------------------ network
  function conv3x3(inp, H, W, Cin, w, b, Cout, stride) {
    // NHWC input (single image), HWIO kernel, symmetric padding 1, ReLU
    const Ho = Math.floor((H + 2 - 3) / stride) + 1, Wo = Math.floor((W + 2 - 3) / stride) + 1;
    const out = new Float32Array(Ho * Wo * Cout);
    for (let oy = 0; oy < Ho; oy++) for (let ox = 0; ox < Wo; ox++) {
      const ob = (oy * Wo + ox) * Cout;
      for (let co = 0; co < Cout; co++) out[ob + co] = b[co];
      for (let ky = 0; ky < 3; ky++) {
        const iy = oy * stride + ky - 1;
        if (iy < 0 || iy >= H) continue;
        for (let kx = 0; kx < 3; kx++) {
          const ix = ox * stride + kx - 1;
          if (ix < 0 || ix >= W) continue;
          const ib = (iy * W + ix) * Cin, kb = (ky * 3 + kx) * Cin * Cout;
          for (let ci = 0; ci < Cin; ci++) {
            const v = inp[ib + ci];
            if (v === 0) continue;
            const kr = kb + ci * Cout;
            for (let co = 0; co < Cout; co++) out[ob + co] += v * w[kr + co];
          }
        }
      }
      for (let co = 0; co < Cout; co++) if (out[ob + co] < 0) out[ob + co] = 0;
    }
    return { out, H: Ho, W: Wo };
  }
  function dense(x, W, b, nin, nout, relu) {
    const y = new Float32Array(nout);
    for (let o = 0; o < nout; o++) y[o] = b[o];
    for (let i = 0; i < nin; i++) {
      const v = x[i];
      if (v === 0) continue;
      const r = i * nout;
      for (let o = 0; o < nout; o++) y[o] += v * W[r + o];
    }
    if (relu) for (let o = 0; o < nout; o++) if (y[o] < 0) y[o] = 0;
    return y;
  }
  const sig = x => 1 / (1 + Math.exp(-x));

  class Policy {
    constructor(doc) {
      this.spec = doc.spec;
      this.t = {}; this.shape = {};
      for (const k in doc.tensors) { const d = decodeTensor(doc.tensors[k]); this.t[k] = d.data; this.shape[k] = d.shape; }
      // layer sizes come from the tensors themselves, so any --hidden / --channels training run loads
      this.C = ['c1', 'c2', 'c3'].map(k => this.shape[k + '.w'][3]);
      this.enc = this.shape['pd.w'][1];
      this.fdOut = this.shape['fd.w'][1];
      this.Hd = this.shape['lstm.wh'][0];
      this.pi1 = this.shape['pi1.w'][1];
      this.nAct = this.shape['pi2.w'][1];
      this.reset();
    }
    reset() { this.h = new Float32Array(this.Hd); this.c = new Float32Array(this.Hd); }
    step(patch, vec) {
      const t = this.t, Hd = this.Hd;
      const C = this.C, P = this.spec.patch;
      let a = conv3x3(patch, P, P, 1, t['c1.w'], t['c1.b'], C[0], 1);
      a = conv3x3(a.out, a.H, a.W, C[0], t['c2.w'], t['c2.b'], C[1], 2);
      a = conv3x3(a.out, a.H, a.W, C[1], t['c3.w'], t['c3.b'], C[2], 2);
      const pe = dense(a.out, t['pd.w'], t['pd.b'], a.out.length, this.enc, true);
      const ve = dense(vec, t['vd.w'], t['vd.b'], vec.length, this.enc, true);
      const cat = new Float32Array(2 * this.enc); cat.set(pe, 0); cat.set(ve, this.enc);
      const x = dense(cat, t['fd.w'], t['fd.b'], 2 * this.enc, this.fdOut, true);
      const z = dense(x, t['lstm.wx'], t['lstm.b'], this.fdOut, 4 * Hd, false);
      const zh = dense(this.h, t['lstm.wh'], new Float32Array(4 * Hd), Hd, 4 * Hd, false);
      for (let i = 0; i < 4 * Hd; i++) z[i] += zh[i];
      for (let i = 0; i < Hd; i++) {
        this.c[i] = sig(z[Hd + i]) * this.c[i] + sig(z[i]) * Math.tanh(z[2 * Hd + i]);
        this.h[i] = sig(z[3 * Hd + i]) * Math.tanh(this.c[i]);
      }
      const p1 = dense(this.h, t['pi1.w'], t['pi1.b'], Hd, this.pi1, true);
      return dense(p1, t['pi2.w'], t['pi2.b'], this.pi1, this.nAct, false);
    }
  }

  // ------------------------------------------------------------------ observation (mirrors rl/env.py)
  const DIFF_IDX = { easy: 0, medium: 1, hard: 2, impossible: 3 };
  function fwdRight(yaw) { const s = Math.sin(yaw), c = Math.cos(yaw); return [[-s, -c], [c, -s]]; }
  function rangeBearing(px, pz, yaw, tx, tz) {
    const [f, r] = fwdRight(yaw);
    const dx = tx - px, dz = tz - pz;
    const a = dx * f[0] + dz * f[1], b = dx * r[0] + dz * r[1];
    const ang = Math.atan2(b, a);
    return [Math.sin(ang), Math.cos(ang), Math.hypot(a, b)];
  }

  const WHISKER_ANGLES = [-Math.PI / 2, -Math.PI / 4, -0.35, 0.0, 0.35, Math.PI / 4, Math.PI / 2, Math.PI];
  const WHISKER_RANGE = 8.0;

  function computeWhiskers(G, px, pz, yaw, traffic) {
    const [f, r] = fwdRight(yaw);
    const out = new Float32Array(8);
    const steps = [0.8, 1.6, 2.4, 3.2, 4.0, 4.8, 5.6, 6.4, 7.2, 8.0];
    const cars = (traffic && traffic.cars) || [];
    const streetcars = (traffic && traffic.streetcars) || [];

    for (let k = 0; k < 8; k++) {
      const a = WHISKER_ANGLES[k];
      const ca = Math.cos(a), sa = Math.sin(a);
      const dx = ca * f[0] + sa * r[0], dz = ca * f[1] + sa * r[1];
      let dMin = WHISKER_RANGE;

      // 1. Static barriers from city grid (building walls, lamp posts, fences, trench cuts)
      for (let s = 0; s < steps.length; s++) {
        const dist = steps[s];
        if (blocked(G, px + dx * dist, pz + dz * dist)) {
          dMin = dist;
          break;
        }
      }

      // 2. Dynamic cars
      for (let c = 0; c < cars.length; c++) {
        const car = cars[c];
        if (car.vx === undefined) continue;
        const cx = car.vx - px, cz = car.vz - pz;
        const proj = cx * dx + cz * dz;
        if (proj > 0.4 && proj < dMin) {
          const perp = Math.hypot(cx - proj * dx, cz - proj * dz);
          if (perp < 1.6) dMin = Math.min(dMin, Math.max(0.4, proj - 1.2));
        }
      }

      // 3. Dynamic streetcars / trains
      for (let sc = 0; sc < streetcars.length; sc++) {
        const train = streetcars[sc];
        if (train.mode === 'hidden' || train.vx === undefined) continue;
        const tx = train.vx - px, tz = train.vz - pz;
        const proj = tx * dx + tz * dz;
        if (proj > 0.5 && proj < dMin) {
          const perp = Math.hypot(tx - proj * dx, tz - proj * dz);
          if (perp < 2.2) dMin = Math.min(dMin, Math.max(0.5, proj - 2.0));
        }
      }

      out[k] = dMin / WHISKER_RANGE;
    }
    return out;
  }

  function buildObservation(ctx) {
    const { G, spec, px, pz, yaw, st, goal, peace, people, prevAct, isFighter, traffic } = ctx;
    const P = spec.patch, cell = spec.patch_cell, row0 = spec.patch_row0;
    const [f, r] = fwdRight(yaw);
    const patch = new Float32Array(P * P);
    for (let i = 0; i < P; i++) {
      const ahead = (row0 - i) * cell;
      for (let j = 0; j < P; j++) {
        const right = (j - (P - 1) / 2) * cell;
        patch[i * P + j] = blocked(G, px + ahead * f[0] + right * r[0], pz + ahead * f[1] + right * r[1]) ? 1 : 0;
      }
    }
    const v = [];
    const inPeace = (px - peace.x) ** 2 + (pz - peace.z) ** 2 <= peace.radius ** 2;
    // 0..7: Proprioception (8)
    v.push(st.health / 100, st.armor / 50, st.rage / 100, st.isBerserk ? 1 : 0, Math.max(0, st.berserkTimer || 0) / 16,
      Math.max(0, st.attackTimer || 0) / spec.kick_cooldown, inPeace ? 1 : 0, 1);

    const isV3 = spec.obs_version >= 3 || spec.vec_dim === 121;
    if (isV3) {
      // 8..9: Goal mode one-hot: [m_crate, m_fight] (2)
      v.push(isFighter ? 0 : 1, isFighter ? 1 : 0);
    }

    let [s, c, d] = rangeBearing(px, pz, yaw, goal.x, goal.z);
    v.push(s, c, Math.log1p(d) / 7.5, Math.min(d, 10) / 10);
    [s, c, d] = rangeBearing(px, pz, yaw, peace.x, peace.z);
    v.push(s, c, Math.log1p(d) / 7.5);
    const di = DIFF_IDX[st.difficulty || 'medium'] ?? 1;
    for (let k = 0; k < 4; k++) v.push(k === di ? 1 : 0);
    const dims = spec.act_dims;
    for (let a = 0; a < 3; a++) for (let k = 0; k < dims[a]; k++) v.push(prevAct[a] === k ? 1 : 0);

    if (isV3) {
      // 35..42: 8-beam whisker rangefinders (8)
      const wRays = computeWhiskers(G, px, pz, yaw, traffic);
      for (let k = 0; k < 8; k++) v.push(wRays[k]);
    }
    // nearest people within 40 m
    const R = spec.npc_range, cand = [];
    for (const p of people) {
      const dx = p.x - px, dz = p.z - pz, dist = Math.hypot(dx, dz);
      if (dist < R) cand.push({ p, dist, ahead: dx * f[0] + dz * f[1], right: dx * r[0] + dz * r[1] });
    }
    cand.sort((a, b) => a.dist - b.dist);
    const nFeats = (spec.npc_feats === 13 || spec.vec_dim === 111) ? 13 : 10;
    for (let k = 0; k < spec.k_obs; k++) {
      const q = cand[k];
      if (!q) { for (let m = 0; m < nFeats; m++) v.push(0); continue; }
      const p = q.p;
      const looksCiv = p.kind === 'civilian' || (p.kind === 'snatcher' && !p.unmasked);
      v.push(1, q.ahead / R, q.right / R, q.dist / R, looksCiv ? 1 : 0, p.kind === 'robot' ? 1 : 0,
        (p.kind === 'snatcher' && p.unmasked) ? 1 : 0, p.hp / p.maxHp, p.staggered ? 1 : 0, p.punching ? 1 : 0);
      if (nFeats === 13) {
        const cosN = q.ahead / Math.max(q.dist, 1e-4);
        const isFacing = cosN > 0.50;
        const jabRange = spec.jab_range || 3.5;
        const kickRange = spec.kick_range || 4.2;
        v.push(
          Math.min(q.dist, 6.0) / 6.0,
          isFacing && q.dist <= jabRange ? 1 : 0,
          isFacing && q.dist <= kickRange ? 1 : 0
        );
      }
    }
    return { patch, vec: Float32Array.from(v) };
  }

  function argmax(a, lo, hi) { let b = lo; for (let i = lo + 1; i < hi; i++) if (a[i] > a[b]) b = i; return b - lo; }
  function sampleSoftmax(a, lo, hi, temp) {
    let m = -Infinity; for (let i = lo; i < hi; i++) m = Math.max(m, a[i]);
    let z = 0; const p = []; for (let i = lo; i < hi; i++) { const e = Math.exp((a[i] - m) / temp); p.push(e); z += e; }
    let u = Math.random() * z; for (let i = 0; i < p.length; i++) { u -= p[i]; if (u <= 0) return i; }
    return p.length - 1;
  }

  const MOVE_NAMES = ['HOLD', 'FWD', 'BACK', 'LEFT', 'RIGHT', 'SPRINT'];
  const ATK_NAMES = ['', ' • PUNCH', ' • KICK'];

  // ------------------------------------------------------------------ copilot
  class AICopilot {
    constructor() {
      this.isActive = false;
      this.mode = 'neural';
      this.persona = 'runner';                // 'runner' (Crate Hunter) or 'fighter' (Street Brawler)
      this.policies = { runner: null, fighter: null };
      this.policy = null;
      this.modelInfo = '';
      this.decisionTimer = 0;
      this.decisionInterval = 0.1;            // 10 Hz, as in training
      this.moveDir = new THREE.Vector3();
      this.moveLocal = [0, 0];                // (ahead, right) unit move in the player's frame
      this.turnRate = 0;
      this.sprint = false;
      this.prevAct = [0, 2, 0];
      this.lastGoalKey = '';
      this.sampleTemp = 0.0;                  // 0 = greedy argmax; avoids drunken random turns
      this.aiIntentText = 'IDLE';
      this.stuckTimer = 0;
      this.lastPos = null;
      this.init();
    }

    init() {
      this.loadWeights();
      this.createHUD();
      this.startHotReloading();
    }

    acceptModel(doc, source, persona = 'runner') {
      if (!doc || doc.version !== 2 || !doc.spec || (doc.spec.obs_version < 1 || doc.spec.obs_version > 3)) {
        console.warn(`🤖 AI Copilot: ${persona} model is not a valid egocentric policy (supported obs_version 1, 2, 3; got ${doc?.spec?.obs_version}); using EXPERT mode.`);
        this.mode = 'expert';
        this.updateModePill();
        return;
      }
      const pol = new Policy(doc);
      this.policies[persona] = pol;
      if (this.persona === persona || !this.policy) {
        this.policy = pol;
        this.persona = persona;
      }
      const m = doc.meta || {};
      this.modelInfo = `step ${(m.step || 0).toLocaleString()} • ${persona.toUpperCase()} (v${doc.spec.obs_version})`;
      console.log(`🤖 AI Copilot: ${persona.toUpperCase()} neural policy loaded from ${source} (step ${(m.step || 0).toLocaleString()}, v${doc.spec.obs_version})`);
      this.updateModePill();
    }

    async loadWeights(silent = false) {
      // 1. Inlined weights from standalone bundle
      if (window.AI_MODEL_WEIGHTS_RUNNER) this.acceptModel(window.AI_MODEL_WEIGHTS_RUNNER, 'bundle runner', 'runner');
      if (window.AI_MODEL_WEIGHTS_FIGHTER) this.acceptModel(window.AI_MODEL_WEIGHTS_FIGHTER, 'bundle fighter', 'fighter');
      if (window.AI_MODEL_WEIGHTS && !this.policies.runner) this.acceptModel(window.AI_MODEL_WEIGHTS, 'bundle default', 'runner');

      // 2. Fetch external files if available (with cache buster if reloading)
      const qs = silent ? `?t=${Date.now()}` : '';
      try {
        const respRunner = await fetch(`ai_model_runner.json${qs}`);
        if (respRunner.ok) this.acceptModel(await respRunner.json(), 'ai_model_runner.json', 'runner');
        else {
          const respDef = await fetch(`ai_model.json${qs}`);
          if (respDef.ok) this.acceptModel(await respDef.json(), 'ai_model.json', 'runner');
        }
      } catch (e) { /* offline / file:// */ }

      try {
        const respFighter = await fetch(`ai_model_fighter.json${qs}`);
        if (respFighter.ok) this.acceptModel(await respFighter.json(), 'ai_model_fighter.json', 'fighter');
      } catch (e) { /* offline / file:// */ }

      if (!this.policy) {
        if (!silent) console.log('🤖 AI Copilot: no neural model; EXPERT mode only.');
        this.mode = 'expert';
      } else {
        this.mode = 'neural';
      }
      if (!silent && this.policies.fighter) {
        this.setPersona('fighter');
      }
      this.updateModePill();
    }

    startHotReloading() {
      if (this._pollTimer) clearInterval(this._pollTimer);
      this._lastTrainedStep = 0;
      this._pollTimer = setInterval(async () => {
        try {
          const resp = await fetch('train_status.json?t=' + Date.now());
          if (!resp.ok) return;
          const status = await resp.json();
          if (status && status.step && status.step > this._lastTrainedStep) {
            const isFirst = (this._lastTrainedStep === 0);
            this._lastTrainedStep = status.step;
            if (!isFirst) {
              console.log(`🧠 AI Copilot: newer weights available (step ${status.step.toLocaleString()}). Hot-reloading...`);
              await this.loadWeights(true);
              console.log(`🧠 AI UPDATED: STEP ${status.step.toLocaleString()}`);
            }
          }
        } catch (e) { /* local file/offline */ }
      }, 10000); // check every 10 seconds
    }

    cycleMode() {
      if (this.mode === 'expert' && this.policy && grid()) this.mode = 'neural';
      else this.mode = 'expert';
      this.lockedTarget = null;
      this.lastGoalKey = '';
      this.resetMemory();
      this.updateModePill();
    }

    cyclePersona() {
      const next = this.persona === 'runner' ? 'fighter' : 'runner';
      this.setPersona(next);
    }

    setPersona(persona) {
      if (this.policies[persona]) {
        this.persona = persona;
        this.policy = this.policies[persona];
        this.lockedTarget = null;
        this.lastGoalKey = '';
        this.resetMemory();
        this.updateModePill();
        console.log(`🤖 AI Copilot: switched persona to ${persona.toUpperCase()}`);
      } else {
        console.log(`🤖 AI Copilot: persona ${persona} not loaded yet.`);
      }
    }

    resetMemory() {
      if (this.policy) this.policy.reset();
      this.prevAct = [0, 2, 0];
      this.stuckTimer = 0;
      this.lastPos = null;
    }

    updateModePill() {
      const pill = document.getElementById('ai-mode-pill');
      const personaPill = document.getElementById('ai-persona-pill');
      if (pill) {
        if (this.mode === 'neural') {
          pill.innerHTML = `🧠 NEURAL RL <span style="opacity:0.7">[B]</span>`;
          pill.style.borderColor = '#10b981'; pill.style.color = '#6ee7b7';
        } else {
          pill.innerHTML = '⚡ TACTICAL EXPERT <span style="opacity:0.7">[B]</span>';
          pill.style.borderColor = '#f59e0b'; pill.style.color = '#fcd34d';
        }
      }
      if (personaPill) {
        if (this.persona === 'fighter') {
          personaPill.innerHTML = `🥊 BRAWLER MODE <span style="opacity:0.7">[N]</span>`;
          personaPill.style.borderColor = '#ef4444'; personaPill.style.color = '#fca5a5';
        } else {
          personaPill.innerHTML = `📦 CRATE HUNTER <span style="opacity:0.7">[N]</span>`;
          personaPill.style.borderColor = '#38bdf8'; personaPill.style.color = '#7dd3fc';
        }
      }
      if (this.personaBtnEl) {
        if (this.persona === 'fighter') {
          this.personaBtnEl.innerHTML = `AI: 🥊 BRAWLER <span class="ai-key-hint">[N]</span>`;
          this.personaBtnEl.style.borderColor = '#ef4444';
          this.personaBtnEl.style.color = '#fca5a5';
        } else {
          this.personaBtnEl.innerHTML = `AI: 📦 CRATE <span class="ai-key-hint">[N]</span>`;
          this.personaBtnEl.style.borderColor = '#38bdf8';
          this.personaBtnEl.style.color = '#7dd3fc';
        }
      }
    }

    createHUD() {
      let topBar = document.querySelector('.header-left');
      if (!topBar) topBar = document.getElementById('top-bar');
      if (!topBar) topBar = document.body;
      const btn = document.createElement('button');
      btn.id = 'ai-watch-btn'; btn.className = 'ai-toggle-btn';
      btn.innerHTML = '🤖 AI <span class="ai-key-hint">[V]</span>';
      btn.title = 'Toggle AI Copilot (V)';
      btn.onclick = () => this.toggle();
      topBar.appendChild(btn); this.btnEl = btn;

      const personaBtn = document.createElement('button');
      personaBtn.id = 'ai-persona-top-btn'; personaBtn.className = 'ai-toggle-btn';
      personaBtn.innerHTML = 'AI: 📦 CRATE <span class="ai-key-hint">[N]</span>';
      personaBtn.title = 'Switch AI Persona: Crate Hunter vs Brawler (N)';
      personaBtn.style.display = 'none';
      personaBtn.onclick = () => this.cyclePersona();
      topBar.appendChild(personaBtn); this.personaBtnEl = personaBtn;

      const muteBtn = document.createElement('button');
      muteBtn.id = 'audio-mute-btn'; muteBtn.className = 'ai-toggle-btn';
      const isMuted = (window.audio && window.audio.isMuted) || (new URLSearchParams(window.location.search).get('muted') === '1');
      muteBtn.innerHTML = isMuted ? '🔇 <span class="ai-key-hint">[M]</span>' : '🔊 <span class="ai-key-hint">[M]</span>';
      if (isMuted) muteBtn.classList.add('active');
      muteBtn.onclick = () => { if (window.audio && window.audio.toggleMute) window.audio.toggleMute(); };
      topBar.appendChild(muteBtn);

      const banner = document.createElement('div');
      banner.id = 'ai-pilot-hud'; banner.className = 'ai-pilot-banner hidden';
      banner.innerHTML = `
        <div class="ai-pilot-indicator">
          <span class="ai-pulse-dot"></span>
          <span class="ai-title">AI</span>
          <span id="ai-persona-pill" class="ai-mode-pill" style="cursor:pointer;background:rgba(0,0,0,0.5);border:1px solid #38bdf8;color:#7dd3fc;padding:3px 8px;border-radius:4px;margin-left:8px;font-size:11px;font-weight:700;text-transform:uppercase;"></span>
          <span id="ai-mode-pill" class="ai-mode-pill" style="cursor:pointer;background:rgba(0,0,0,0.5);border:1px solid #10b981;color:#6ee7b7;padding:3px 8px;border-radius:4px;margin-left:8px;font-size:11px;font-weight:700;text-transform:uppercase;"></span>
        </div>
        <div id="ai-intent-status" class="ai-intent-sub" style="display:none;"></div>`;
      document.body.appendChild(banner);
      this.bannerEl = banner;
      this.intentEl = document.getElementById('ai-intent-status');
      const pill = document.getElementById('ai-mode-pill');
      if (pill) pill.onclick = () => this.cycleMode();
      const pPill = document.getElementById('ai-persona-pill');
      if (pPill) pPill.onclick = () => this.cyclePersona();
      this.updateModePill();
    }

    toggle(forceState) {
      this.isActive = (forceState !== undefined) ? forceState : !this.isActive;
      if (this.isActive) {
        if (window.gameState && (!window.gameState.inGame || window.gameState.isPaused)) {
          if (window.audio && !window.audio.isMuted && window.audio.init) window.audio.init();
          if (window.gameState.isDead && window.resetGame) window.resetGame();
          if (window.resumeGame) window.resumeGame(false);
        }
        const overlay = document.getElementById('menu-overlay');
        if (overlay && !overlay.classList.contains('hidden')) overlay.classList.add('hidden');
        if (window.gameState) { window.gameState.inGame = true; window.gameState.isPaused = false; window.gameState.freeMouseMode = true; }
      }
      if (this.btnEl) {
        this.btnEl.classList.toggle('active', this.isActive);
        this.btnEl.innerHTML = this.isActive ? '🤖 AI ON <span class="ai-key-hint">[V]</span>' : '🤖 AI <span class="ai-key-hint">[V]</span>';
      }
      if (this.personaBtnEl) {
        this.personaBtnEl.style.display = this.isActive ? '' : 'none';
      }
      if (this.bannerEl) this.bannerEl.classList.toggle('hidden', !this.isActive);
      this.moveDir.set(0, 0, 0); this.moveLocal = [0, 0]; this.turnRate = 0; this.sprint = false;
      this.resetMemory();
    }

    // Called every frame from updatePlayer()
    update(dt, player, state, city, enemies, traffic, missionState) {
      if (!this.isActive || !player || state.isDead || state.isPaused) { this.sprint = false; return; }
      if (state.isDead !== this._wasDead) { this._wasDead = state.isDead; this.resetMemory(); }

      this.decisionTimer += dt;
      if (this.decisionTimer >= this.decisionInterval) {
        this.decisionTimer = 0;
        const useNeural = this.mode === 'neural' && this.policy && grid() && player.pos.y < 50;
        if (useNeural) this.neuralDecision(player, state, city, enemies, traffic, missionState);
        else this.expertDecision(player, state, city, enemies, traffic, missionState);
      }
      // spread the chosen turn over the decision interval; keep the move relative to the current heading
      if (this.turnRate) player.yaw += this.turnRate * dt;
      const [f, r] = fwdRight(player.yaw);
      const [a, b] = this.moveLocal;
      this.moveDir.set(a * f[0] + b * r[0], 0, a * f[1] + b * r[1]);

      // --- AUTONOMOUS MOUSE LOOK & PITCH AIMING ---
      // Dynamically simulates mouse vertical aiming so punches hit chests and crates instead of swinging high
      let desiredPitch = -0.05; // slight natural downward gaze (-3 deg) while walking
      let bestDist = 6.0;

      // 1. Target mission crate or nearby crates if close
      if (missionState && missionState.active && missionState.state === 'active' && missionState.pos) {
        const dBox = Math.hypot(missionState.pos.x - player.pos.x, missionState.pos.z - player.pos.z);
        if (dBox < bestDist) {
          const dy = (missionState.pos.y !== undefined ? missionState.pos.y + 0.5 : 0.5) - (player.pos.y + 1.7);
          desiredPitch = Math.atan2(dy, dBox);
          bestDist = dBox;
        }
      }
      // 2. Target hostile enemies within combat range (aim for torso/chest ~1.1m)
      if (enemies && enemies.length) {
        for (const e of enemies) {
          if (!e || e.isDead || e.isKnockedOut || !e.rig) continue;
          if (e.isCivilian || e.kind === 'civilian') continue; // only aim at hostiles
          const p = e.rig.root.position;
          const de = Math.hypot(p.x - player.pos.x, p.z - player.pos.z);
          if (de < bestDist) {
            // Check if roughly in front of player (within 90 deg forward cone)
            const toEx = (p.x - player.pos.x) / de;
            const toEz = (p.z - player.pos.z) / de;
            const dot = toEx * f[0] + toEz * f[1];
            if (dot > 0.3) {
              const dy = (p.y + 1.1) - (player.pos.y + 1.7);
              desiredPitch = Math.atan2(dy, de);
              bestDist = de;
            }
          }
        }
      }

      // Clamp desired pitch within natural first-person head-height gaze [-7 deg, +3 deg]
      // Never force looking down at the sidewalk during close combat
      desiredPitch = Math.max(-0.12, Math.min(0.04, desiredPitch));
      if (player.pitch === undefined) player.pitch = 0;
      player.pitch += (desiredPitch - player.pitch) * Math.min(1.0, 8.0 * dt);

      if (typeof camera !== 'undefined' && camera) {
        camera.rotation.order = 'YXZ';
        camera.rotation.y = player.yaw;
        camera.rotation.x = player.pitch;
      }
      if (this.intentEl) this.intentEl.innerText = this.aiIntentText;
    }

    goalOf(missionState, peace) {
      if (missionState && missionState.active && missionState.state === 'active' && missionState.pos)
        return { x: missionState.pos.x, z: missionState.pos.z, mission: true };
      return { x: peace.x, z: peace.z, mission: false };
    }

    collectPeople(enemies, playerY) {
      const out = [];
      for (const e of enemies || []) {
        if (!e || e.isDead || e.isKnockedOut || !e.rig) continue;
        if (!!e.isDeckEnemy !== (playerY > 50)) continue;
        const p = e.rig.root.position;
        out.push({ x: p.x, z: p.z, kind: e.kind, unmasked: !!e.unmasked, hp: e.hp, maxHp: e.maxHp || 1,
          staggered: !!e.isStaggered, punching: !!e.isPunching, ref: e });
      }
      return out;
    }

    neuralDecision(player, state, city, enemies, traffic, missionState) {
      const G = grid();
      const peace = (city && city.peaceZone) || G.peace;
      const people = this.collectPeople(enemies, player.pos.y);
      let goal;
      if (this.persona === 'fighter') {
        let best = null, bd = 1e9;
        // Target hysteresis: stick with current hostile target while alive and within range
        if (this.lockedTarget && this.lockedTarget.ref && !this.lockedTarget.ref.isDead && !this.lockedTarget.ref.isKnockedOut) {
          const lp = this.lockedTarget.ref.rig ? this.lockedTarget.ref.rig.root.position : null;
          if (lp) {
            const d = Math.hypot(lp.x - player.pos.x, lp.z - player.pos.z);
            if (d < 45.0) {
              best = { x: lp.x, z: lp.z, kind: this.lockedTarget.kind, ref: this.lockedTarget.ref };
              bd = d;
            }
          }
        }
        if (!best) {
          // 1. Search hostiles in people within 45m, prioritizing direct Line of Sight
          let losBest = null, losBd = 1e9;
          for (const p of people) {
            if (p.kind === 'robot' || (p.kind === 'snatcher' && p.unmasked)) {
              const d = Math.hypot(p.x - player.pos.x, p.z - player.pos.z);
              const hasLos = city && city.hasLineOfSight ? city.hasLineOfSight(player.pos.x, player.pos.z, p.x, p.z) : true;
              if (hasLos && d < losBd) { losBd = d; losBest = p; }
              if (d < bd) { bd = d; best = p; }
            }
          }
          if (losBest) {
            best = losBest;
            bd = losBd;
          }
          this.lockedTarget = best;
        }
        // Only set goal directly to the enemy if it has LOS or is within close combat range (< 12m)
        const hasLos = best && city && city.hasLineOfSight ? city.hasLineOfSight(player.pos.x, player.pos.z, best.x, best.z) : true;
        if (best && (hasLos || bd < 12.0) && bd < 50.0) {
          goal = { x: best.x, z: best.z, mission: false, targetRef: best.ref };
        } else {
          this.lockedTarget = null;
          goal = this.goalOf(missionState, peace);
        }
      } else {
        this.lockedTarget = null;
        goal = this.goalOf(missionState, peace);
      }
      // Only reset LSTM hidden state on major goal category change (never on continuous target motion!)
      const gk = goal.mission ? `m:${Math.round(goal.x / 10)}:${Math.round(goal.z / 10)}` : (goal.targetRef ? 'enemy' : 'peace');
      if (gk !== this.lastGoalKey) { this.lastGoalKey = gk; this.resetMemory(); }
      const obs = buildObservation({ G, spec: this.policy.spec, px: player.pos.x, pz: player.pos.z, yaw: player.yaw,
        st: state, goal, peace, people, prevAct: this.prevAct, isFighter: (this.persona === 'fighter'), traffic });
      const logits = this.policy.step(obs.patch, obs.vec);
      const d = this.policy.spec.act_dims;
      const pick = (lo, hi) => this.sampleTemp > 0 ? sampleSoftmax(logits, lo, hi, this.sampleTemp) : argmax(logits, lo, hi);
      const mv = pick(0, d[0]), tn = pick(d[0], d[0] + d[1]), at = pick(d[0] + d[1], d[0] + d[1] + d[2]);
      this.applyAction(mv, tn, at);
      const dist = Math.hypot(goal.x - player.pos.x, goal.z - player.pos.z);
      if (this.persona === 'fighter') {
        this.aiIntentText = `🥊 BRAWLER • ${MOVE_NAMES[mv]}${ATK_NAMES[at]}`;
      } else {
        this.aiIntentText = `📦 CRATE HUNTER • ${MOVE_NAMES[mv]}${ATK_NAMES[at]} • ${goal.mission ? 'MISSION' : 'SANCTUARY'} ${Math.round(dist)} m`;
      }
      if (this.personaBtnEl) {
        this.personaBtnEl.innerHTML = this.persona === 'fighter' ? 'AI: 🥊 BRAWLER <span class="ai-key-hint">[N]</span>' : 'AI: 📦 CRATE <span class="ai-key-hint">[N]</span>';
      }
    }

    applyAction(mv, tn, at) {
      const turn = this.policy ? this.policy.spec.turns[tn] : [-0.5, -0.15, 0.0, 0.15, 0.5][tn];
      this.moveLocal = [[0, 0], [1, 0], [-1, 0], [0, -1], [0, 1], [1, 0]][mv];
      this.sprint = (mv === 5);
      this.turnRate = -turn / this.decisionInterval; // positive turn = right = yaw decreases

      if (at > 0) {
        // Strict civilian safeguard: suppress attack if facing an innocent pedestrian
        let facingCivilian = false;
        if (enemies && player) {
          const [f] = fwdRight(player.yaw);
          for (const e of enemies) {
            if (!e || e.isDead || e.isKnockedOut || !e.rig) continue;
            if (e.kind !== 'civilian' && !(e.kind === 'snatcher' && !e.unmasked)) continue;
            const pos = e.rig.root.position;
            const dx = pos.x - player.pos.x, dz = pos.z - player.pos.z;
            const d = Math.hypot(dx, dz);
            if (d < 3.0) {
              const dot = (dx * f[0] + dz * f[1]) / d;
              if (dot > 0.5) { facingCivilian = true; break; }
            }
          }
        }
        if (!facingCivilian) {
          if (at === 1 && window.triggerAttack) window.triggerAttack();
          else if (at === 2 && window.triggerQuickKick) window.triggerQuickKick();
        }
      }
      this.prevAct = [mv, tn, at];
    }

    // ---------------------------------------------------------------- hand-written teacher / fallback
    expertDecision(player, state, city, enemies, traffic, missionState) {
      const px = player.pos.x, pz = player.pos.z, py = player.pos.y;
      const peace = (city && city.peaceZone) || (grid() && grid().peace) || { x: 0, z: 0, radius: 1 };
      const turns = [-0.5, -0.15, 0.0, 0.15, 0.5];
      const [f, r] = fwdRight(player.yaw);

      const turnToAngle = (targetAngle) => {
        let bestIdx = 2, minDiff = 1e9;
        for (let i = 0; i < turns.length; i++) {
          const diff = Math.abs(turns[i] - targetAngle);
          if (diff < minDiff) { minDiff = diff; bestIdx = i; }
        }
        return bestIdx;
      };

      let mv = 0, tn = 2, at = 0;
      let goal = this.goalOf(missionState, peace);
      if (state.health < 35) goal = { x: peace.x, z: peace.z, mission: false };

      // 1. Hostile threats
      let best = null, bd = 1e9;
      for (const p of this.collectPeople(enemies, py)) {
        const threat = p.kind === 'robot' || (p.kind === 'snatcher' && p.unmasked);
        if (!threat) continue;
        const d = Math.hypot(p.x - px, p.z - pz);
        if (d < bd) { bd = d; best = p; }
      }

      if (best && bd < 3.5 && state.health > 25) {
        const dx = best.x - px, dz = best.z - pz;
        const ahead = dx * f[0] + dz * f[1], right = dx * r[0] + dz * r[1];
        const ang = Math.atan2(right, ahead);
        tn = turnToAngle(ang);
        mv = (ahead > 1.2) ? 1 : 0;
        if (best.staggered) at = 1; // glory kill
        else if (bd > 2.6) at = 2; // kick
        else at = 1; // punch
        this.aiIntentText = `⚔️ FIGHTING ${best.kind.toUpperCase()} (${Math.round(bd)} m)`;
        this.applyAction(mv, tn, at);
        return;
      }

      if (best && bd < 18 && state.health > 35 && !goal.mission) goal = { x: best.x, z: best.z, mission: false };

      // 2. Navigation toward goal
      const gx = goal.x - px, gz = goal.z - pz, gd = Math.hypot(gx, gz) || 1;
      const gAhead = gx * f[0] + gz * f[1], gRight = gx * r[0] + gz * r[1];
      const gAng = Math.atan2(gRight, gAhead);
      tn = turnToAngle(gAng);

      if (goal.mission && gd < 5.5) {
        mv = 0; at = 1;
        this.aiIntentText = '📦 SMASHING MISSION CRATE';
      } else if (gd > 1.2) {
        mv = (gAhead > 0.35) ? (state.health < 40 ? 5 : 1) : (gAhead > -0.2 ? 1 : 0);
        this.aiIntentText = goal.mission ? `🎯 TO MISSION (${Math.round(gd)} m)` : `🏙️ PATROLLING (${Math.round(gd)} m)`;
      }

      this.applyAction(mv, tn, at);
    }
  }

  window.aiCopilot = new AICopilot();
  window.__aiTest = { buildObservation, Policy, grid, blocked, decodeTensor };   // used by rl/tests
})();

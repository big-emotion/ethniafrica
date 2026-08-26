/* ══════════════════════════════════════════════════════════════════
   LE GLOBE DES FICHES

   Même moteur que la home — sphère texturée, morph vers Mercator — avec
   deux ajouts que les fiches exigent :

   1. une COUCHE DE SURLIGNAGE, texture transparente distincte du fond,
      pour que chaque page dessine ce que sa donnée l'autorise à dessiner
      sans jamais retoucher la carte de base ;
   2. un VOL DE CAMÉRA, qui amène un point (lon, lat) face à l'objectif
      et resserre le cadrage.

   La couche est redessinée par à-coups (~30 Hz) pendant une animation
   seulement, jamais en continu : un envoi de texture 1024×512 à chaque
   image coûterait plus cher que tout le reste de la page.
   ══════════════════════════════════════════════════════════════════ */

const TEX_W = 2048, TEX_H = 1024;
// La couche de surlignage tient la même résolution que la carte de base :
// un pays de 13° de large ne fait que 74 px à 1024, et le vol de caméra
// l'agrandit assez pour que la différence se voie.
const OVER_W = 2048, OVER_H = 1024;
const LAT_LIMIT = 80, SEG_X = 200, SEG_Y = 100;
const GLOBE_R = 1.0;

/* Référentiel de la silhouette du continent (public/africa, 800×758). */
const AFRICA_BOUNDS = { lonMin: -25, lonMax: 52, latMin: -35, latMax: 38 };
const BASEMAP = { width: 800, height: 758 };

const lonToX = (lon, w = TEX_W) => ((lon + 180) / 360) * w;
const latToY = (lat, h = TEX_H) => ((90 - lat) / 180) * h;

/** Anneau géographique → tracé Canvas dans l'espace équirectangulaire. */
function ringPath(ctx, ring, w, h) {
  ctx.beginPath();
  ring.forEach(([lon, lat], i) => {
    const x = lonToX(lon, w), y = latToY(lat, h);
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  });
  ctx.closePath();
}

/** Centroïde du plus grand anneau — une ancre, pas un centre de population. */
function centroidOf(iso, GEO) {
  const rings = GEO[iso]?.rings;
  if (!rings?.length) return null;
  const ring = rings.reduce((a, b) => (b.length > a.length ? b : a));
  const sum = ring.reduce(([alon, alat], [lon, lat]) => [alon + lon, alat + lat], [0, 0]);
  return [sum[0] / ring.length, sum[1] / ring.length];
}

/** Étendue angulaire du pays — sert à choisir la focale du vol. */
function spanOf(iso, GEO) {
  const rings = GEO[iso]?.rings ?? [];
  let lonMin = 180, lonMax = -180, latMin = 90, latMax = -90;
  for (const ring of rings) {
    for (const [lon, lat] of ring) {
      if (lon < lonMin) lonMin = lon;
      if (lon > lonMax) lonMax = lon;
      if (lat < latMin) latMin = lat;
      if (lat > latMax) latMax = lat;
    }
  }
  return Math.max(lonMax - lonMin, latMax - latMin);
}

/**
 * Cède au panneau la part de vue qu'il occupe : le bas sous 760 px, la
 * droite au-dessus. Appelé à chaque ouverture, fermeture et changement
 * de viewport — c'est la seule façon que le sujet reste regardable.
 */
function biasForSheet(globe, frame, sheet) {
  if (sheet.dataset.open !== "true") { globe.setBias(0, 0); return; }
  frame.clientWidth <= 760 ? globe.setBias(0, 0.17) : globe.setBias(0.15, 0);
}

function createGlobe({ canvas, GEO, AFRICA_PATH, drawOverlay }) {
  // La home regarde le globe de loin, où un fond très sombre pose bien le
  // continent. Une fiche s'en approche : à ce cadrage la même palette vire
  // au noir. Le sol est remonté, l'ambiante aussi, et l'équateur — repère
  // utile de loin, ligne criarde de près — redescend en intensité.
  const PALETTE = {
    ocean: "#1c1209", graticule: "#3b2d1a", graticuleMajor: "#443521",
    land: "#7d5828", coast: "#e8b96a", equator: "#4d5794",
    border: "#9c7343", clear: 0x120e0a, ambient: 0.60, rim: 0.24,
  };

  /* ── Carte de base : océan, graticule, continent, frontières ──── */
  function buildBaseTexture() {
    const cv = document.createElement("canvas");
    cv.width = TEX_W; cv.height = TEX_H;
    const ctx = cv.getContext("2d");

    ctx.fillStyle = PALETTE.ocean;
    ctx.fillRect(0, 0, TEX_W, TEX_H);

    ctx.lineWidth = 1;
    for (let lon = -180; lon <= 180; lon += 15) {
      ctx.strokeStyle = lon % 90 === 0 ? PALETTE.graticuleMajor : PALETTE.graticule;
      ctx.beginPath(); ctx.moveTo(lonToX(lon), 0); ctx.lineTo(lonToX(lon), TEX_H); ctx.stroke();
    }
    for (let lat = -75; lat <= 75; lat += 15) {
      ctx.strokeStyle = lat === 0 ? PALETTE.equator : PALETTE.graticule;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, latToY(lat)); ctx.lineTo(TEX_W, latToY(lat)); ctx.stroke();
    }

    // La masse continentale vient de la silhouette 800×758, calée sur
    // ses propres bornes puis remise à l'échelle de la texture monde.
    ctx.save();
    const sx = (lonToX(AFRICA_BOUNDS.lonMax) - lonToX(AFRICA_BOUNDS.lonMin)) / BASEMAP.width;
    const sy = (latToY(AFRICA_BOUNDS.latMin) - latToY(AFRICA_BOUNDS.latMax)) / BASEMAP.height;
    ctx.translate(lonToX(AFRICA_BOUNDS.lonMin), latToY(AFRICA_BOUNDS.latMax));
    ctx.scale(sx, sy);
    const silhouette = new Path2D(AFRICA_PATH);
    ctx.fillStyle = PALETTE.land; ctx.fill(silhouette);
    ctx.strokeStyle = PALETTE.coast; ctx.lineWidth = 2 / sx; ctx.stroke(silhouette);
    ctx.restore();

    // Les frontières nationales en sourdine : c'est le contexte dans
    // lequel le surlignage prendra son sens.
    ctx.strokeStyle = PALETTE.border;
    ctx.lineWidth = 1.4;
    ctx.globalAlpha = 0.55;
    for (const entry of Object.values(GEO)) {
      for (const ring of entry.rings) { ringPath(ctx, ring, TEX_W, TEX_H); ctx.stroke(); }
    }
    ctx.globalAlpha = 1;

    const tex = new CanvasTexture(cv);
    tex.colorSpace = SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }

  /* ── Couche de surlignage : ce que la page a le droit de dessiner ── */
  const overCanvas = document.createElement("canvas");
  overCanvas.width = OVER_W; overCanvas.height = OVER_H;
  const overCtx = overCanvas.getContext("2d");
  const overTex = new CanvasTexture(overCanvas);
  overTex.colorSpace = SRGBColorSpace;

  /** `progress` va de 0 à 1 pendant l'apparition ; la page en fait ce qu'elle veut. */
  function paintOverlay(progress) {
    overCtx.clearRect(0, 0, OVER_W, OVER_H);
    drawOverlay(overCtx, { w: OVER_W, h: OVER_H, progress, lonToX, latToY, ringPath, GEO });
    overTex.needsUpdate = true;
  }
  paintOverlay(0);

  /* ── Géométrie morphable sphère ⇄ Mercator ───────────────────── */
  const mercY = (lat) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
  const FLAT_HALF_W = Math.PI * GLOBE_R;
  const FLAT_HALF_H = GLOBE_R * mercY(LAT_LIMIT);

  function buildMorphGeometry() {
    const geo = new BufferGeometry();
    const flat = [], sphere = [], uv = [], index = [];
    for (let j = 0; j <= SEG_Y; j++) {
      const lat = LAT_LIMIT - (j / SEG_Y) * (2 * LAT_LIMIT);
      for (let i = 0; i <= SEG_X; i++) {
        const u = i / SEG_X;
        const lon = -180 + u * 360;
        flat.push(GLOBE_R * ((lon * Math.PI) / 180), GLOBE_R * mercY(lat), 0);
        const phi = (lat * Math.PI) / 180, lambda = (lon * Math.PI) / 180;
        sphere.push(
          GLOBE_R * Math.cos(phi) * Math.sin(lambda),
          GLOBE_R * Math.sin(phi),
          GLOBE_R * Math.cos(phi) * Math.cos(lambda)
        );
        uv.push(u, 1 - (90 - lat) / 180);
      }
    }
    for (let j = 0; j < SEG_Y; j++) {
      for (let i = 0; i < SEG_X; i++) {
        const a = j * (SEG_X + 1) + i, b = a + 1;
        const c = (j + 1) * (SEG_X + 1) + i, d = c + 1;
        index.push(a, c, b, b, c, d);
      }
    }
    geo.setAttribute("position", new Float32BufferAttribute(flat, 3));
    geo.setAttribute("aFlat", new Float32BufferAttribute(flat, 3));
    geo.setAttribute("aSphere", new Float32BufferAttribute(sphere, 3));
    geo.setAttribute("uv", new Float32BufferAttribute(uv, 2));
    geo.setIndex(index);
    return geo;
  }

  const material = new ShaderMaterial({
    uniforms: {
      uMorph: { value: 1 },
      uMap: { value: buildBaseTexture() },
      uOver: { value: overTex },
      uLight: { value: new Vector3(0.5, 0.42, 0.9).normalize() },
      uAmbient: { value: PALETTE.ambient },
      uRim: { value: PALETTE.rim },
    },
    vertexShader: `
      attribute vec3 aFlat;
      attribute vec3 aSphere;
      uniform float uMorph;
      varying vec2 vUv;
      varying vec3 vNormal;
      void main() {
        vUv = uv;
        vec3 pos = mix(aFlat, aSphere, uMorph);
        vNormal = normalize(mix(vec3(0.0, 0.0, 1.0), normalize(aSphere), uMorph));
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D uMap;
      uniform sampler2D uOver;
      uniform vec3 uLight;
      uniform float uAmbient;
      uniform float uRim;
      varying vec2 vUv;
      varying vec3 vNormal;
      void main() {
        vec4 base = texture2D(uMap, vUv);
        vec4 over = texture2D(uOver, vUv);
        // Le surlignage se pose sur la carte avant l'éclairage : il doit
        // s'assombrir au limbe comme le sol, sinon il flotte au-dessus.
        vec3 surface = mix(base.rgb, over.rgb, over.a);
        vec3 n = normalize(vNormal);
        float lambert = max(dot(n, normalize(uLight)), 0.0);
        float rim = pow(1.0 - abs(n.z), 2.5);
        vec3 col = surface * (uAmbient + (1.0 - uAmbient) * lambert);
        col += vec3(0.55, 0.40, 0.16) * rim * uRim;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
    side: DoubleSide,
  });

  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(PALETTE.clear, 1);

  const scene = new Scene();
  const camera = new PerspectiveCamera(40, 1, 0.1, 100);
  const mesh = new Mesh(buildMorphGeometry(), material);
  scene.add(mesh);

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(canvas);
  resize();

  function frameDistance(t) {
    const halfW = FLAT_HALF_W + (GLOBE_R - FLAT_HALF_W) * t;
    const halfH = FLAT_HALF_H + (GLOBE_R - FLAT_HALF_H) * t;
    const halfFov = (camera.fov * Math.PI) / 360;
    return Math.max(halfH / Math.tan(halfFov), halfW / (Math.tan(halfFov) * camera.aspect)) * 1.16;
  }

  /* ── État de caméra ──────────────────────────────────────────── */
  const AFRICA_LON = 17, AFRICA_LAT = 7;
  const rad = (d) => (d * Math.PI) / 180;
  // Amener (lon, lat) face à l'objectif : la rotation Y annule la
  // longitude, la rotation X relève la latitude.
  const facing = (lon, lat) => ({ y: -rad(lon), x: rad(lat) });

  const home = facing(AFRICA_LON, AFRICA_LAT);
  let morph = 1, morphTarget = 1;
  let rotY = home.y, rotYTarget = home.y;
  let rotX = home.x, rotXTarget = home.x;
  let zoom = 1, zoomTarget = 1;
  // Le panneau d'information mange une part de la vue — le bas sur mobile,
  // la droite sur desktop. Le globe se décale d'autant, sans quoi le pays
  // qu'on vient de choisir atterrit sous la feuille.
  let biasX = 0, biasXTarget = 0, biasY = 0, biasYTarget = 0;
  let dragging = false, lastX = 0, lastY = 0;

  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ── L'apparition du surlignage ──────────────────────────────── */
  let revealFrom = 0, revealing = false, lastPaint = 0;
  const REVEAL_MS = 1100;

  function reveal() {
    if (still) { paintOverlay(1); return; }
    revealFrom = performance.now();
    revealing = true;
  }

  canvas.addEventListener("pointerdown", (e) => {
    dragging = true; lastX = e.clientX; lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointerup", (e) => {
    dragging = false;
    try { canvas.releasePointerCapture(e.pointerId); } catch { /* pointeur déjà relâché */ }
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    rotYTarget += (e.clientX - lastX) * 0.006;
    rotXTarget = Math.max(-1.0, Math.min(1.0, rotXTarget + (e.clientY - lastY) * 0.004));
    lastX = e.clientX; lastY = e.clientY;
  });

  function tick() {
    const ease = still ? 1 : 0.075;
    morph += (morphTarget - morph) * ease;
    rotY += (rotYTarget - rotY) * ease;
    rotX += (rotXTarget - rotX) * ease;
    zoom += (zoomTarget - zoom) * ease;

    if (revealing) {
      const now = performance.now();
      const t = Math.min(1, (now - revealFrom) / REVEAL_MS);
      if (now - lastPaint > 33 || t === 1) {
        // Sortie cubique : le tracé part vite puis vient se poser.
        paintOverlay(1 - Math.pow(1 - t, 3));
        lastPaint = now;
      }
      if (t === 1) revealing = false;
    }

    biasX += (biasXTarget - biasX) * ease;
    biasY += (biasYTarget - biasY) * ease;

    material.uniforms.uMorph.value = morph;
    mesh.rotation.y = rotY * morph;
    mesh.rotation.x = rotX * morph;
    camera.position.z = frameDistance(morph) * zoom;

    const halfH = camera.position.z * Math.tan((camera.fov * Math.PI) / 360);
    mesh.position.set(biasX * halfH * camera.aspect * 2, biasY * halfH * 2, 0);
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  return {
    /** Amène une cible face à l'objectif et resserre selon son étendue. */
    flyTo(lon, lat, span) {
      const t = facing(lon, lat);
      // Le chemin le plus court en longitude : sans ce recalage, un vol
      // du Maroc vers Madagascar repart dans le mauvais sens.
      let dy = t.y - rotYTarget;
      dy = ((dy + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
      rotYTarget += dy;
      rotXTarget = t.x;
      // Un grand pays se regarde de plus loin qu'un petit — mais jamais
      // d'assez près pour perdre le continent autour : une frontière sans
      // ses voisines ne dit plus rien.
      zoomTarget = span ? Math.max(0.62, Math.min(0.95, 0.46 + span / 78)) : 0.78;
      morphTarget = 1;
      reveal();
    },
    recentre() {
      let dy = home.y - rotYTarget;
      dy = ((dy + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
      rotYTarget += dy;
      rotXTarget = home.x;
      zoomTarget = 1;
      morphTarget = 1;
    },
    setFlat(on) { morphTarget = on ? 0 : 1; },
    /** Fractions de la vue à céder au panneau : (droite, bas). */
    setBias(x, y) { biasXTarget = -x; biasYTarget = y; },
    repaint: paintOverlay,
    reveal,
    resize,
  };
}

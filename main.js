import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// ARTWORK METADATA
const artworks = [
  { id: 0, filename: 'Media.jpeg', title: 'Aetherial Echoes', desc: 'A captivating play of light and shadow, exploring abstract organic textures.', location: 'Left Wall (Front)', frame: 'Canvas_Left_Front', medium: 'Colored Pencils on Paper', style: 'Vibrant Sketch Realism', colors: 'Rainbow, Blue, Yellow, Red' },
  { id: 1, filename: 'Media (1).jpeg', title: 'Serene Solitude', desc: 'An intimate study of quiet landscape details, conveying stillness and peace.', location: 'Left Wall (Middle)', frame: 'Canvas_Left_Middle', medium: 'Pencil Sketch & Color Fill', style: 'Vintage Floral Illustration', colors: 'Teal, Yellow, Orange, Green' },
  { id: 2, filename: 'Media (2).jpeg', title: 'Oceanic Whispers', desc: 'A minimalist exploration of coastal horizons and shifting aquatic textures.', location: 'Back Wall (Left)', frame: 'Canvas_Back_Left', medium: 'Color Pencils & Ink Outline', style: 'Botanical Illustration', colors: 'Royal Blue, Crimson, Olive' },
  { id: 3, filename: 'Media (3).jpeg', title: 'Monolithic Structure', desc: 'High-contrast monochrome capture highlighting bold lines and shadows in architecture.', location: 'Back Wall (Center)', frame: 'Canvas_Back_Center', medium: 'Colored Pencils & Stump', style: 'Animal Portraiture', colors: 'Peach, White, Cobalt Blue' },
  { id: 4, filename: 'Media (4).jpeg', title: 'Twilight Horizon', desc: 'A dramatic sunset study blending deep crimson and soft lavender tones.', location: 'Back Wall (Right)', frame: 'Canvas_Back_Right', medium: 'Sketch Pens & Crayons', style: 'Cute Cartoon Character Art', colors: 'White, Bright Orange, Pink' },
  { id: 5, filename: 'Media (5).jpeg', title: 'Verdant Sanctuary', desc: 'A moody, mist-shrouded forest landscape capturing deep greens and tall trees.', location: 'Right Wall (Middle)', frame: 'Canvas_Right_Middle', medium: 'Glitter Pencils & Fineliners', style: 'Fantasy Sketchbook Art', colors: 'Rainbow Pastel, Gold, Silver' },
  { id: 6, filename: 'Media (6).jpeg', title: 'Urban Rhythms', desc: 'A vibrant city perspective emphasizing geometric patterns and street energy.', location: 'Right Wall (Front)', frame: 'Canvas_Right_Front', medium: 'Wax Crayons & Pencils', style: 'Doodle Art', colors: 'Pastel Pink, Turquoise, Purple' },
  { id: 7, filename: 'Media (7).jpeg', title: 'Sunlit Reflections', desc: 'Bright, shimmering light dancing across tranquil water surfaces.', location: 'Unassigned', frame: null, medium: 'Gel Pen & Sketch Pen', style: 'Chibi Illustration', colors: 'Black, Pink, Lavender' },
  { id: 8, filename: 'Media (8).jpeg', title: 'Neon Nocturne', desc: 'A moody night scene of reflection, rain, and glowing city lights.', location: 'Unassigned', frame: null, medium: 'Marker & Sketchbook', style: 'Pop Art Cartoon', colors: 'White, Bright Red, Yellow' },
  { id: 9, filename: 'Media (9).jpeg', title: 'Celestial Canopy', desc: 'An astrophotography study showing stars and the Milky Way over dark mountain peaks.', location: 'Unassigned', frame: null, medium: 'Color Pencils', style: 'Pet Portrait Doodle', colors: 'Yellow, Orange, Black, Brown' }
];

// STATE MANAGEMENT
const state = {
  loaded: false,
  entered: false,
  doorState: 'closed', // 'closed', 'opening', 'open'
  activeMode: 'free', // 'free', 'inspect', 'tour'
  selectedFrame: null, // mesh object currently inspected
  selectedArtworkId: null, // ID of artwork active in details panel
  cameraTargetPos: new THREE.Vector3(0, 1.6, 10),
  cameraLookAtTarget: new THREE.Vector3(0, 1.6, 7),
  currentLookAt: new THREE.Vector3(0, 1.6, 7),
  cameraLerpSpeed: 0.04, // Default lerp speed for camera transitions
  tourIndex: 0,
  tourInterval: null,
  canvasTextures: {}, // filename -> Texture map
  targetProgress: 0,
  loadProgress: 0,
  assetsLoaded: false
};

// DOM ELEMENTS
const dom = {
  loader: document.getElementById('loader'),
  loaderBar: document.getElementById('loader-bar'),
  loaderStatus: document.getElementById('loader-status'),
  fgPalette: document.getElementById('fg-palette'),
  entryOverlay: document.getElementById('entry-overlay'),
  enterBtn: document.getElementById('enter-btn'),
  galleryUi: document.getElementById('gallery-ui'),
  tourBtn: document.getElementById('tour-btn'),
  resetViewBtn: document.getElementById('reset-view-btn'),
  exitBtn: document.getElementById('exit-btn'),
  infoPanel: document.getElementById('info-panel'),
  infoFrameId: document.getElementById('info-frame-id'),
  infoTitle: document.getElementById('info-title'),
  infoDescription: document.getElementById('info-description'),
  infoLocation: document.getElementById('info-location'),
  infoMedium: document.getElementById('info-medium'),
  infoStyle: document.getElementById('info-style'),
  infoColors: document.getElementById('info-colors'),
  closeInfoBtn: document.getElementById('close-info-btn'),
  focusBtn: document.getElementById('focus-btn') || null,
  swapGrid: document.getElementById('swap-grid'),
  panelSwapStrip: document.getElementById('panel-swap-strip'),
  catalogCarousel: document.getElementById('catalog-carousel'),
  controlsHelp: document.getElementById('controls-help'),
  frameContextMenu: document.getElementById('frame-context-menu'),
  ctxCloseBtn: document.getElementById('ctx-close-btn')
};

// GLOBAL THREE.JS VARIABLES
let scene, camera, renderer, controls;
let modelScene;
let textureLoader;
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Door parts
let rightDoorHinge = null;
let leftDoorHingeGroup = null;

// Frame and Canvas mappings
const frameCanvases = {}; // frameName -> mesh object
const spotlightGroup = new THREE.Group();

// INITIALIZATION
function init() {
  setupThree();
  setupLights();
  loadAssets();
  setupUIEventListeners();
  animate();
}

// SETUP THREE.JS
function setupThree() {
  const container = document.getElementById('canvas-container');
  
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf4f4f7);
  scene.fog = new THREE.FogExp2(0xf4f4f7, 0.035);

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.copy(state.cameraTargetPos);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  container.appendChild(renderer.domElement);

  // Setup controls but keep disabled initially
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.maxPolarAngle = Math.PI / 2 - 0.05; // Don't look below floor
  controls.minDistance = 1.0;
  controls.maxDistance = 7.0; // limit zoom out
  controls.enablePan = false; // block panning out of room
  controls.enabled = false;

  scene.add(spotlightGroup);

  window.addEventListener('resize', onWindowResize);
}

// SETUP GALLERY LIGHTS
function setupLights() {
  // Soft ambient fill for bright gallery
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
  scene.add(ambientLight);

  // Soft general overhead light
  const mainLight = new THREE.DirectionalLight(0xffffff, 0.85); // Bright white daylight
  mainLight.position.set(0, 8, 0);
  mainLight.castShadow = true;
  mainLight.shadow.mapSize.width = 2048;
  mainLight.shadow.mapSize.height = 2048;
  mainLight.shadow.bias = -0.0001;
  scene.add(mainLight);

  // Spotlight over the sculpture
  const sculptureSpot = new THREE.SpotLight(0xdfa94b, 3.5, 10, Math.PI / 4, 0.5, 1);
  sculptureSpot.position.set(0, 3.8, -2.5); // Right above the pedestal
  sculptureSpot.target.position.set(0, 1.35, -2.5);
  sculptureSpot.castShadow = true;
  scene.add(sculptureSpot);
  scene.add(sculptureSpot.target);

  // Add subtle light glows at the entrance
  const entranceLightLeft = new THREE.PointLight(0xdfa94b, 1.5, 4);
  entranceLightLeft.position.set(-1.8, 1.8, 6.8);
  scene.add(entranceLightLeft);

  const entranceLightRight = new THREE.PointLight(0xdfa94b, 1.5, 4);
  entranceLightRight.position.set(1.8, 1.8, 6.8);
  scene.add(entranceLightRight);
}

// SETUP DYNAMIC ARTWORK LIGHTS
function addSpotlightToFrame(canvasMesh, name) {
  // Remove existing spotlight if present
  const existing = spotlightGroup.getObjectByName('spot_' + name);
  if (existing) spotlightGroup.remove(existing);

  // Compute bounding box to find center
  canvasMesh.geometry.computeBoundingBox();
  const center = new THREE.Vector3();
  canvasMesh.getWorldPosition(center);

  // Determine direction facing away from frame
  // Frame centers and normals:
  // Back Wall (Z around -6.9): light should point towards -Z, start from -5.0
  // Left Wall (X around -4.9): light should point towards -X, start from -3.5
  // Right Wall (X around 4.9): light should point towards +X, start from 3.5

  const spot = new THREE.SpotLight(0xfffdf2, 2.5, 5, Math.PI / 5, 0.4, 1);
  spot.name = 'spot_' + name;
  spot.castShadow = true;
  spot.shadow.mapSize.width = 512;
  spot.shadow.mapSize.height = 512;
  spot.shadow.bias = -0.0005;

  if (name.includes('Back')) {
    spot.position.set(center.x, center.y + 1.2, center.z + 1.8);
  } else if (name.includes('Left')) {
    spot.position.set(center.x + 1.8, center.y + 1.2, center.z);
  } else if (name.includes('Right')) {
    spot.position.set(center.x - 1.8, center.y + 1.2, center.z);
  }

  spot.target = canvasMesh;
  spotlightGroup.add(spot);
}

// ASSET LOADING MANAGER
function loadAssets() {
  const loadingManager = new THREE.LoadingManager();
  
  loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
    const progress = (itemsLoaded / itemsTotal) * 100;
    dom.loaderBar.style.width = progress + '%';
    dom.loaderStatus.textContent = `Loading asset: ${itemsLoaded} of ${itemsTotal}`;
    if (dom.fgPalette) {
      const clipPercentage = 100 - Math.round(progress);
      dom.fgPalette.style.clipPath = `inset(${clipPercentage}% 0px 0px 0px)`;
    }
  };

  loadingManager.onLoad = () => {
    state.loaded = true;
    dom.loader.classList.remove('active');
    setTimeout(() => {
      dom.loader.style.display = 'none';
      dom.entryOverlay.classList.remove('hidden');
    }, 800);
  };

  // Instantiate TextureLoader with loadingManager to track texture load progress
  textureLoader = new THREE.TextureLoader(loadingManager);

  // 1. Load Textures
  artworks.forEach(art => {
    textureLoader.load(`/${art.filename}`, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = THREE.ClampToEdgeWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.flipY = false; // GLTF/GLB uv maps expect top-left coordinate origin
      state.canvasTextures[art.filename] = tex;

      // If the model is already loaded and the canvas mesh exists, apply the texture immediately
      if (art.frame && frameCanvases[art.frame]) {
        applyTextureToCanvas(frameCanvases[art.frame], tex);
      }
    }, undefined, (err) => {
      console.error(`Failed to load texture ${art.filename}`, err);
    });
  });

  // 2. Load GLB Model
  const gltfLoader = new GLTFLoader(loadingManager);
  gltfLoader.load('/Showroom_Animated.glb', (gltf) => {
    modelScene = gltf.scene;
    scene.add(modelScene);
    setupModelObjects();
  }, undefined, (err) => {
    console.error('Failed to load GLB showroom model', err);
  });
}

// SETUP MODEL PIECES & FRAME TEXTURES
function setupModelObjects() {
  if (!modelScene) return;

  let leftDoorPanel = null;

  modelScene.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;

      // Handle Floor material (reflective dark wood/concrete)
      if (child.name === 'Floor') {
        child.material = new THREE.MeshStandardMaterial({
          color: 0xe2e4e9, // light elegant plaster/stone
          roughness: 0.25,
          metalness: 0.1
        });
      }

      // Handle Walls material (elegant dark matte)
      if (child.name.startsWith('Wall') || child.name.startsWith('Baseboard')) {
        child.material = new THREE.MeshStandardMaterial({
          color: 0xf7f7f9, // bright clean modern wall
          roughness: 0.85,
          metalness: 0.0
        });
      }

      // Handle sculpture and metal frames
      if (child.name.startsWith('Frame_') || child.name === 'Sculpture' || child.name.includes('Handle')) {
        child.material = new THREE.MeshStandardMaterial({
          color: 0x1f1f23, // Charcoal frame for modern contrast
          roughness: 0.3,
          metalness: 0.5
        });
        if (child.name === 'Sculpture') {
          child.material.color.setHex(0xdfa94b); // Golden sculpture!
          child.material.metalness = 0.9;
          child.material.roughness = 0.15;
        }
      }

      // Find door parts
      if (child.name === 'Door_Panel_Left') {
        leftDoorPanel = child;
      }
    }

    // Save empty parent for right door
    if (child.name === 'Hinge_Right_Empty') {
      rightDoorHinge = child;
    }

    // Identify and map Canvases
    if (child.name.startsWith('Canvas_')) {
      frameCanvases[child.name] = child;
      
      // Store original parent frame scale
      const parentFrame = child.parent;
      if (parentFrame && parentFrame.name.startsWith('Frame_')) {
        if (!state.originalFrameScales) {
          state.originalFrameScales = {};
        }
        if (!state.originalFrameScales[parentFrame.name]) {
          state.originalFrameScales[parentFrame.name] = parentFrame.scale.clone();
        }
      }
      
      // Find matching artwork
      const art = artworks.find(a => a.frame === child.name);
      if (art && state.canvasTextures[art.filename]) {
        applyTextureToCanvas(child, state.canvasTextures[art.filename]);
      } else {
        // Default clean matte white if no artwork mapped
        child.material = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.9 });
        addSpotlightToFrame(child, child.name);
      }
    }
  });

  // Attach left door to its pivot hinge group after traversal is done
  if (leftDoorPanel) {
    leftDoorHingeGroup = new THREE.Group();
    leftDoorHingeGroup.position.set(-1.5, 0, 7.0); // Exact hinge side coordinate
    scene.add(leftDoorHingeGroup);
    leftDoorHingeGroup.attach(leftDoorPanel);
  }

  // Build the catalog list in UI
  buildCatalogUI();
}

// ADJUST FRAME SCALE TO MATCH IMAGE ASPECT RATIO
function adjustFrameScaleToImage(canvasMesh, texture) {
  const parentFrame = canvasMesh.parent;
  if (!parentFrame || !parentFrame.name.startsWith('Frame_')) return;

  if (!state.originalFrameScales) {
    state.originalFrameScales = {};
  }
  
  let originalScale = state.originalFrameScales[parentFrame.name];
  if (!originalScale) {
    originalScale = parentFrame.scale.clone();
    state.originalFrameScales[parentFrame.name] = originalScale;
  }

  const imgWidth = texture.image.width;
  const imgHeight = texture.image.height;
  if (!imgWidth || !imgHeight) return;

  const imageAspect = imgWidth / imgHeight;

  // Canvas local scale x (width) and z (height)
  const cx = canvasMesh.scale.x;
  const cz = canvasMesh.scale.z;

  // Original visual dimensions in the scene
  const W_orig = originalScale.x * cx;
  const H_orig = originalScale.y * cz;
  const originalAspect = W_orig / H_orig;

  let W_new, H_new;
  if (imageAspect > originalAspect) {
    // Image is wider than original visual ratio: fit to width, shrink height
    W_new = W_orig;
    H_new = W_orig / imageAspect;
  } else {
    // Image is taller or square relative to original visual ratio: fit to height, shrink width
    H_new = H_orig;
    W_new = H_orig * imageAspect;
  }

  // Calculate new parent scales
  const sx_new = W_new / cx;
  const sy_new = H_new / cz;

  parentFrame.scale.set(sx_new, sy_new, originalScale.z);
}

// APPLY TEXTURE TO CANVAS WITH FIT SHIFT
function applyTextureToCanvas(mesh, texture) {
  mesh.material = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.4,
    metalness: 0.1,
    side: THREE.FrontSide
  });
  mesh.material.map.needsUpdate = true;

  // Adjust frame scale to match image aspect ratio
  if (texture && texture.image) {
    adjustFrameScaleToImage(mesh, texture);
  }

  // Update spotlight position for the new scale/center
  addSpotlightToFrame(mesh, mesh.name);
}

// BUILD BOTTOM CATALOG DRAW & SWAP GRID
function buildCatalogUI() {
  dom.catalogCarousel.innerHTML = '';
  dom.swapGrid.innerHTML = '';
  dom.panelSwapStrip.innerHTML = '';

  artworks.forEach(art => {
    // 1. Bottom Catalog Carousel Item
    const item = document.createElement('div');
    item.className = 'catalog-item';
    if (art.frame) item.classList.add('assigned');
    item.dataset.id = art.id;
    item.innerHTML = `
      <img src="/${art.filename}" alt="${art.title}" />
      <span class="catalog-item-badge">${art.frame ? 'ON STAGE' : 'SPARE'}</span>
    `;
    item.addEventListener('click', () => selectArtwork(art.id));
    dom.catalogCarousel.appendChild(item);

    // 2. Right-click Context Menu Swap Grid
    const swapThumb = document.createElement('div');
    swapThumb.className = 'swap-thumb';
    swapThumb.dataset.id = art.id;
    swapThumb.innerHTML = `<img src="/${art.filename}" alt="${art.title}" />`;
    swapThumb.addEventListener('click', () => {
      swapActiveFrameArtwork(art.id);
      dom.frameContextMenu.classList.add('hidden');
    });
    dom.swapGrid.appendChild(swapThumb);

    // 3. Inline Panel Strip Thumb
    const panelThumb = document.createElement('div');
    panelThumb.className = 'panel-swap-thumb';
    panelThumb.dataset.id = art.id;
    panelThumb.title = art.title;
    panelThumb.innerHTML = `<img src="/${art.filename}" alt="${art.title}" />`;
    panelThumb.addEventListener('click', () => swapActiveFrameArtwork(art.id));
    dom.panelSwapStrip.appendChild(panelThumb);
  });
}

// SELECT AN ARTWORK & ZOOM TO FRAME
function selectArtwork(id) {
  const art = artworks.find(a => a.id === id);
  if (!art) return;

  state.selectedArtworkId = id;

  // Highlight in Carousel
  document.querySelectorAll('.catalog-item').forEach(el => {
    el.classList.toggle('active', parseInt(el.dataset.id) === id);
  });

  // Update swap grid active state
  document.querySelectorAll('.swap-thumb').forEach(el => {
    el.classList.toggle('active', parseInt(el.dataset.id) === id);
  });

  if (art.frame) {
    // Zoom camera to frame
    focusCameraOnFrame(art.frame);
  } else {
    // Show info panel for spare artwork but don't move camera
    showInfoPanel(art, 'Spare (Click to place on frame)');
  }
}

// FOCUS CAMERA ON FRAME (INSPECT MODE)
function focusCameraOnFrame(frameName) {
  const mesh = frameCanvases[frameName];
  if (!mesh) return;

  state.activeMode = 'inspect';
  state.selectedFrame = mesh;
  controls.enabled = false; // Disable OrbitControls during inspect mode

  // Compute camera focus location
  const worldPos = new THREE.Vector3();
  mesh.getWorldPosition(worldPos);

  // Determine offsets based on wall location
  const targetCamPos = new THREE.Vector3();
  const targetLookAt = new THREE.Vector3().copy(worldPos);

  // Frame location mapping logic (offsets for visual comfort)
  if (frameName.includes('Back')) {
    targetCamPos.set(worldPos.x, worldPos.y, worldPos.z + 2.5); // Looking north
  } else if (frameName.includes('Left')) {
    targetCamPos.set(worldPos.x + 2.5, worldPos.y, worldPos.z); // Looking west
  } else if (frameName.includes('Right')) {
    targetCamPos.set(worldPos.x - 2.5, worldPos.y, worldPos.z); // Looking east
  }

  state.cameraTargetPos.copy(targetCamPos);
  state.cameraLookAtTarget.copy(targetLookAt);

  // Show panel
  const art = artworks.find(a => a.frame === frameName);
  showInfoPanel(art, frameName);
}

// SHOW ARTWORK DETAILS PANEL
function showInfoPanel(art, frameName) {
  dom.infoFrameId.textContent = frameName ? frameName.replace('Canvas_', '').replace(/_/g, ' ').toUpperCase() : 'SPARE ARTWORK';
  dom.infoTitle.textContent = art.title;
  dom.infoDescription.textContent = art.desc;
  dom.infoLocation.textContent = art.location;
  dom.infoMedium.textContent = art.medium || '-';
  dom.infoStyle.textContent = art.style || '-';
  dom.infoColors.textContent = art.colors || '-';

  // Set active check inside swap grid
  document.querySelectorAll('.swap-thumb').forEach(el => {
    el.classList.toggle('active', parseInt(el.dataset.id) === art.id);
  });

  dom.infoPanel.classList.remove('hidden');

  // Disable Focus Button if spare (since it's not in 3D frame)
  if (dom.focusBtn) {
    dom.focusBtn.style.display = !art.frame ? 'none' : 'flex';
  }
}

// SWAP ARTWORK ON FRAME
function swapActiveFrameArtwork(newArtworkId) {
  if (state.activeMode !== 'inspect' || !state.selectedFrame) return;

  const currentFrame = state.selectedFrame.name;
  const oldArt = artworks.find(a => a.frame === currentFrame);
  const newArt = artworks.find(a => a.id === newArtworkId);

  if (!newArt || newArt.frame === currentFrame) return;

  // 1. If new artwork is already on another frame, swap them, or free it
  const destinationFrame = newArt.frame;
  if (destinationFrame) {
    // The target frame now gets the old artwork
    newArt.frame = null;
    newArt.location = 'Unassigned';
  }

  // 2. Map old artwork to none
  if (oldArt) {
    oldArt.frame = destinationFrame;
    oldArt.location = destinationFrame ? destinationFrame.replace('Canvas_', '').replace(/_/g, ' ') : 'Unassigned';
    
    // Update old canvas if it moved
    if (destinationFrame && frameCanvases[destinationFrame]) {
      applyTextureToCanvas(frameCanvases[destinationFrame], state.canvasTextures[oldArt.filename]);
    }
  } else if (destinationFrame && frameCanvases[destinationFrame]) {
    // If no old artwork moved to destinationFrame, clear destinationFrame
    const destCanvas = frameCanvases[destinationFrame];
    destCanvas.material = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.9 });
    
    // Reset scale of destination frame
    const destParent = destCanvas.parent;
    if (destParent && destParent.name.startsWith('Frame_') && state.originalFrameScales[destParent.name]) {
      destParent.scale.copy(state.originalFrameScales[destParent.name]);
    }
    // Update spotlight
    addSpotlightToFrame(destCanvas, destCanvas.name);
  }

  // 3. Map new artwork to current frame
  newArt.frame = currentFrame;
  newArt.location = currentFrame.replace('Canvas_', '').replace(/_/g, ' ');

  // Apply texture
  applyTextureToCanvas(state.selectedFrame, state.canvasTextures[newArt.filename]);

  // Update UI lists
  buildCatalogUI();

  // Re-select/re-focus
  selectArtwork(newArtworkId);
}

// OPEN/CLOSE DOORS & ENTER GALLERY
function enterGallery() {
  state.entered = true;
  state.doorState = 'open';

  // Set slow walk-in speed for camera
  state.cameraLerpSpeed = 0.012;

  // Keep camera outside initially while doors swing open
  state.cameraTargetPos.set(0, 1.6, 10.0);
  state.cameraLookAtTarget.set(0, 1.6, 7.0);

  // UI transition
  dom.entryOverlay.classList.add('hidden');
  
  // Wait for doors to swing open, then move camera slowly inside
  setTimeout(() => {
    state.cameraTargetPos.set(0, 1.6, 2.0);
    state.cameraLookAtTarget.set(0, 1.6, -2.5); // Focus forward on sculpture
  }, 1200);

  // Show Controls tutorial temporarily after camera has entered
  setTimeout(() => {
    dom.galleryUi.classList.remove('hidden');
    dom.controlsHelp.classList.remove('hidden');
    
    // Fade controls helper out after 4 seconds
    setTimeout(() => {
      dom.controlsHelp.classList.add('hidden');
    }, 4000);
  }, 2200);

  // Switch camera control type after transition finishes
  setTimeout(() => {
    state.cameraLerpSpeed = 0.04; // Restore normal speed for inspection
    if (state.activeMode === 'free') {
      enableFreeControls();
    }
  }, 4700);
}

// ENABLE FREE ROAM (ORBIT CONTROLS)
function enableFreeControls() {
  state.activeMode = 'free';
  
  // Align orbit controls target with current camera orientation to avoid jerks
  controls.target.copy(state.cameraLookAtTarget);
  controls.enabled = true;
}

// EXIT GALLERY (CLOSE DOORS, BACK OUTSIDE)
function exitGallery() {
  state.entered = false;
  state.doorState = 'closed';
  state.activeMode = 'transition';
  controls.enabled = false;

  // Turn off tour if active
  stopTour();

  // Close info panel
  dom.infoPanel.classList.add('hidden');

  // Move camera back outside
  state.cameraTargetPos.set(0, 1.6, 10.0);
  state.cameraLookAtTarget.set(0, 1.6, 7.0);

  // Fade UI
  dom.galleryUi.classList.add('hidden');
  dom.entryOverlay.classList.remove('hidden');
}

// RECENTER VIEW TO SHOWROOM MIDDLE
function recenterCamera() {
  stopTour();
  state.activeMode = 'transition';
  controls.enabled = false;
  dom.infoPanel.classList.add('hidden');

  state.cameraTargetPos.set(0, 1.6, 2.0);
  state.cameraLookAtTarget.set(0, 1.6, -2.5);
  
  setTimeout(() => {
    enableFreeControls();
  }, 1000);
}

// AUTO MUSEUM TOUR MODE
function toggleTour() {
  if (state.tourInterval) {
    stopTour();
    enableFreeControls();
  } else {
    startTour();
  }
}

function startTour() {
  state.activeMode = 'tour';
  dom.tourBtn.classList.add('active');
  dom.tourBtn.querySelector('span').textContent = 'Stop Tour';
  
  // Find frames that actually have artworks
  const tourFrames = artworks.filter(a => a.frame).map(a => a.frame);
  if (tourFrames.length === 0) return;

  state.tourIndex = 0;
  
  // Immediate transition to first frame
  focusCameraOnFrame(tourFrames[state.tourIndex]);

  // Periodic rotation
  state.tourInterval = setInterval(() => {
    state.tourIndex = (state.tourIndex + 1) % tourFrames.length;
    focusCameraOnFrame(tourFrames[state.tourIndex]);
  }, 7000); // Shift every 7 seconds
}

function stopTour() {
  if (state.tourInterval) {
    clearInterval(state.tourInterval);
    state.tourInterval = null;
  }
  dom.tourBtn.classList.remove('active');
  dom.tourBtn.querySelector('span').textContent = 'Auto Tour';
  
  if (state.activeMode === 'tour') {
    state.activeMode = 'free';
  }
}

// EVENT LISTENERS
function setupUIEventListeners() {
  // Entrance button
  dom.enterBtn.addEventListener('click', enterGallery);
  
  // Top bar buttons
  dom.resetViewBtn.addEventListener('click', recenterCamera);
  dom.exitBtn.addEventListener('click', exitGallery);
  dom.tourBtn.addEventListener('click', toggleTour);

  // Sidebar controls
  dom.closeInfoBtn.addEventListener('click', () => {
    stopTour();
    recenterCamera();
  });

  if (dom.focusBtn) {
    dom.focusBtn.addEventListener('click', () => {
      if (state.selectedFrame) {
        focusCameraOnFrame(state.selectedFrame.name);
      }
    });
  }

  // Clicking on 3D objects (Raycasting)
  window.addEventListener('click', onCanvasClick);
  window.addEventListener('mousemove', onCanvasHover);

  // Right-click context menu for swap
  window.addEventListener('contextmenu', onCanvasRightClick);

  // Close context menu on any left-click outside it
  window.addEventListener('click', (e) => {
    if (!dom.frameContextMenu.classList.contains('hidden')) {
      if (!dom.frameContextMenu.contains(e.target)) {
        dom.frameContextMenu.classList.add('hidden');
      }
    }
  });

  dom.ctxCloseBtn.addEventListener('click', () => {
    dom.frameContextMenu.classList.add('hidden');
  });
}

// RIGHT-CLICK CONTEXT MENU ON FRAME
function onCanvasRightClick(event) {
  event.preventDefault();
  if (!state.entered || state.activeMode === 'tour') return;
  if (event.target.closest('.ui-container') || event.target.closest('.overlay')) return;

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);

  const targets = Object.values(frameCanvases);
  const intersects = raycaster.intersectObjects(targets);

  if (intersects.length > 0) {
    const clickedCanvas = intersects[0].object;
    // Make sure we're inspecting this frame first
    const art = artworks.find(a => a.frame === clickedCanvas.name);
    if (art) {
      selectArtwork(art.id);
    } else {
      // If no art on frame still allow menu so user can assign one
      state.selectedFrame = clickedCanvas;
      state.activeMode = 'inspect';
      controls.enabled = false;
    }

    // Highlight active thumb
    document.querySelectorAll('.swap-thumb').forEach(el => {
      const a = artworks.find(a2 => a2.frame === clickedCanvas.name);
      el.classList.toggle('active', a && parseInt(el.dataset.id) === a.id);
    });

    // Position & show menu
    const menu = dom.frameContextMenu;
    menu.classList.remove('hidden');
    // Keep it within viewport
    const menuW = 300, menuH = 160;
    let x = event.clientX + 6;
    let y = event.clientY + 6;
    if (x + menuW > window.innerWidth) x = event.clientX - menuW - 6;
    if (y + menuH > window.innerHeight) y = event.clientY - menuH - 6;
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
  } else {
    dom.frameContextMenu.classList.add('hidden');
  }
}

// CLICK INTERACTION IN 3D
function onCanvasClick(event) {
  // Only trigger inside showroom and if not currently transitioning
  if (!state.entered || state.activeMode === 'tour') return;

  // Ignore clicks on UI elements
  if (event.target.tagName === 'BUTTON' || event.target.closest('.ui-container') || event.target.closest('.overlay')) {
    return;
  }

  // Calculate mouse position in normalized device coordinates
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  // Raycast against all canvas meshes
  const targets = Object.values(frameCanvases);
  const intersects = raycaster.intersectObjects(targets);

  if (intersects.length > 0) {
    const clickedCanvas = intersects[0].object;
    stopTour();
    
    // Select artwork mapped to this canvas
    const art = artworks.find(a => a.frame === clickedCanvas.name);
    if (art) {
      selectArtwork(art.id);
    }
  }
}

// HOVER MOUSE FEEDBACK IN 3D
function onCanvasHover(event) {
  if (!state.entered) return;

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  const targets = Object.values(frameCanvases);
  const intersects = raycaster.intersectObjects(targets);

  if (intersects.length > 0) {
    document.body.style.cursor = 'pointer';
  } else {
    document.body.style.cursor = 'default';
  }
}

// RESIZE HANDLER
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// RENDER & ANIMATION LOOP
function animate() {
  requestAnimationFrame(animate);

  // 1. Lerp Door Rotations (Swing Doors)
  // Left door panel (uses customized pivot group)
  if (leftDoorHingeGroup) {
    const targetLeftRot = (state.doorState === 'open') ? Math.PI * 0.6 : 0;
    leftDoorHingeGroup.rotation.y = THREE.MathUtils.lerp(leftDoorHingeGroup.rotation.y, targetLeftRot, 0.04);
  }

  // Right door panel (parented to Hinge_Right_Empty in blender)
  if (rightDoorHinge) {
    const targetRightRot = (state.doorState === 'open') ? -Math.PI * 0.6 : 0;
    rightDoorHinge.rotation.y = THREE.MathUtils.lerp(rightDoorHinge.rotation.y, targetRightRot, 0.04);
  }

  // 2. Lerp Camera Position (when not controlled by OrbitControls)
  if (state.activeMode !== 'free' || !controls.enabled) {
    // Lerp position
    camera.position.lerp(state.cameraTargetPos, state.cameraLerpSpeed);
    
    // Lerp lookAt target
    state.currentLookAt.lerp(state.cameraLookAtTarget, state.cameraLerpSpeed);
    camera.lookAt(state.currentLookAt);
  } else {
    // Sync targets in case orbit controls are working
    controls.update();
    state.cameraTargetPos.copy(camera.position);
    state.cameraLookAtTarget.copy(controls.target);
    state.currentLookAt.copy(controls.target);
  }

  // 3. Ambient animations
  if (modelScene) {
    const sculpture = modelScene.getObjectByName('Sculpture');
    if (sculpture) {
      // Gentle floating/rotating sculpture
      sculpture.rotation.y += 0.005;
      sculpture.position.y = 1.35 + Math.sin(Date.now() * 0.0015) * 0.05;
    }
  }

  renderer.render(scene, camera);
}

// RUN THE APP
init();

/**
 * ==============================================================================
 * Allam Family Portal — AllamTreeEngine (Unified Facade)
 * High-Performance 3D WebGL Genealogy Tree Engine
 *
 * Coordinates 5 decoupled architectural layers:
 * 1. GenealogyGraph (data model, parent-child links, ancestry paths)
 * 2. MemberLayoutEngine (3D spatial distribution across 5m tree geometry)
 * 3. TreeVisualAdapter (pluggable 3D tree mesh: placeholder -> photoreal master)
 * 4. MemberNodeRenderer (instanced woven leaves & confirmed ancestry lines)
 * 5. CameraNavigationController (cinematic camera flight & OrbitControls)
 * ==============================================================================
 */

'use strict';

(function () {

  // Local version-pinned Three.js dependencies (100% offline & reproducible)
  const THREEJS_URL = './assets/vendor/three/three.module.js';
  const ORBIT_URL   = './assets/vendor/three/OrbitControls.js';
  const GLTF_URL    = './assets/vendor/three/GLTFLoader.js';
  const DRACO_URL   = './assets/vendor/three/DRACOLoader.js';

  // State
  let THREE = null;
  let scene = null;
  let camera = null;
  let renderer = null;
  let controls = null;
  let canvas = null;
  let animFrameId = null;
  let isInit = false;

  // Subsystem instances
  let graph = null;
  let layoutEngine = null;
  let visualAdapter = null;
  let nodeRenderer = null;
  let cameraNav = null;
  let leafLabelOverlay = null;

  // Layout cache
  let layoutData = null;

  // Raycasting
  let raycaster = null;
  let pointer = null;
  let hoveredNode = null;
  let activeNode = null;

  // DOM Elements
  let floatingBadgeEl = null;
  let badgeNameEl = null;
  let badgeGenEl = null;
  let badgeDescEl = null;
  let badgeBranchEl = null;
  let overlayEl = null;
  let statusEl = null;

  // Lighting references
  let rimLight = null;

  // ──────────────────────────────────────────────
  // Public API
  // ──────────────────────────────────────────────

  /**
   * Initialize the 3D Tree Engine with real member records
   * @param {string} canvasId
   * @param {Array<Object>} members
   */
  async function init(canvasId, members) {
    if (isInit) {
      if (members && members.length > 0) {
        loadMembers(members);
      }
      return;
    }

    canvas = document.getElementById(canvasId);
    if (!canvas) {
      console.error('[AllamTreeEngine] Canvas not found:', canvasId);
      return;
    }

    // 1. Load Three.js modules (locally bundled, version-pinned via importmap)
    let OrbitControls, GLTFLoader, DRACOLoader;
    try {
      THREE         = await import('three');
      const oMod    = await import('three/addons/controls/OrbitControls.js');
      const gMod    = await import('three/addons/loaders/GLTFLoader.js');
      OrbitControls = oMod.OrbitControls;
      GLTFLoader    = gMod.GLTFLoader;

      try {
        const dMod  = await import('three/addons/loaders/DRACOLoader.js');
        DRACOLoader = dMod.DRACOLoader;
      } catch (dErr) {
        // DRACOLoader is optional
      }
    } catch (err) {
      console.warn('[AllamTreeEngine] Importmap notice, trying direct path fallback:', err);
      try {
        THREE         = await import('../assets/vendor/three/three.module.js');
        const oMod    = await import('../assets/vendor/three/OrbitControls.js');
        const gMod    = await import('../assets/vendor/three/GLTFLoader.js');
        OrbitControls = oMod.OrbitControls;
        GLTFLoader    = gMod.GLTFLoader;
      } catch (iErr) {
        console.error('[AllamTreeEngine] Fatal: Failed to load Three.js:', iErr);
        _showFallback();
        return;
      }
    }

    window._THREE = THREE;

    // 2. Initialize Subsystem 1: GenealogyGraph
    const GraphClass = window.GenealogyGraph || (typeof GenealogyGraph !== 'undefined' ? GenealogyGraph : null);
    if (!GraphClass) {
      console.error('[AllamTreeEngine] GenealogyGraph module missing');
      return;
    }
    graph = new GraphClass();
    graph.load(members || []);
    console.log(`[AllamTreeEngine] Ingested ${graph.size} normalized family nodes into GenealogyGraph.`);

    // 3. Initialize Subsystem 2: MemberLayoutEngine
    const LayoutClass = window.MemberLayoutEngine || (typeof MemberLayoutEngine !== 'undefined' ? MemberLayoutEngine : null);
    layoutEngine = new LayoutClass();
    layoutData = layoutEngine.computeLayout(graph);
    console.log(`[AllamTreeEngine] LayoutEngine computed positions for ${layoutData.positionedNodes.length} nodes & ${layoutData.edges.length} ancestry edges.`);

    // 4. Initialize Three.js WebGL Scene & Camera
    _setupScene(OrbitControls);

    // 5. Initialize Subsystem 3: TreeVisualAdapter
    const VisualClass = window.TreeVisualAdapter || (typeof TreeVisualAdapter !== 'undefined' ? TreeVisualAdapter : null);
    visualAdapter = new VisualClass(THREE, scene, {
      defaultModelUrl: 'assets/models/allam-tree-native-eight.glb',
      style: 'source'
    });
    visualAdapter.loadModel(null, GLTFLoader, DRACOLoader, (pct) => {
      if (statusEl) statusEl.textContent = `جاري تحميل مجسم الشجرة... ${pct}٪`;
    }).then(() => {
      _rebuildLayoutForTree();
      if (statusEl) statusEl.textContent = 'شجرة النسب ثلاثية الأبعاد جاهزة';
    });

    // 6. Initialize Subsystem 4: MemberNodeRenderer
    const NodeRendererClass = window.MemberNodeRenderer || (typeof MemberNodeRenderer !== 'undefined' ? MemberNodeRenderer : null);
    nodeRenderer = new NodeRendererClass(THREE, scene);

    // 7. Initialize Subsystem 5: CameraNavigationController
    const CameraNavClass = window.CameraNavigationController || (typeof CameraNavigationController !== 'undefined' ? CameraNavigationController : null);
    cameraNav = new CameraNavClass(THREE, camera, controls);

    // 8. Bind DOM, raycaster & events
    _initDOMReferences();
    _bindEvents();

    isInit = true;

    // 9. Start 60 FPS Render Loop
    _animate();
  }

  function _rebuildLayoutForTree() {
    if (!graph || !layoutEngine || !visualAdapter || !nodeRenderer) return;
    const baseLayout = layoutEngine.computeLayout(graph);
    layoutData = layoutEngine.attachToTree(
      baseLayout,
      visualAdapter.treeRoot,
      THREE,
      branchName => visualAdapter.getBranchAnchorWorldPosition(branchName)
    );
    nodeRenderer.build(layoutData.positionedNodes, layoutData.edges);
    if (leafLabelOverlay) leafLabelOverlay.setNodes(layoutData.positionedNodes);
    if (activeNode) {
      activeNode = layoutData.nodePositionMap.get(activeNode.id) || null;
      if (activeNode) {
        nodeRenderer.setSelectedId(activeNode.id);
        _showFloatingBadge(activeNode);
      }
    }
    if (canvas) {
      canvas.dataset.attachedNodes = String(layoutData.attachment?.attachedNodes || 0);
      canvas.dataset.sampledBranchVertices = String(layoutData.attachment?.sampledVertices || 0);
      canvas.dataset.overviewNodes = String(nodeRenderer.overviewIds?.size || 0);
      canvas.dataset.treePointRanges = JSON.stringify(Object.fromEntries(
        Object.keys(layoutData.branchCentroids).map(name => {
          const points = layoutData.positionedNodes.filter(node => node.branch === name);
          return [name, points.length ? {
            count: points.length,
            minY: Math.min(...points.map(node => node.y)),
            maxY: Math.max(...points.map(node => node.y)),
            minRadius: Math.min(...points.map(node => Math.hypot(node.x, node.z))),
            maxRadius: Math.max(...points.map(node => Math.hypot(node.x, node.z)))
          } : null];
        })
      ));
    }
    console.log('[AllamTreeEngine] Tree attachment:', JSON.stringify(layoutData.attachment || {}));
  }

  /**
   * Set up WebGL Renderer, Scene, Camera and Studio Lights
   * @private
   */
  function _setupScene(OrbitControls) {
    const w = canvas.clientWidth  || canvas.parentElement.clientWidth  || 800;
    const h = canvas.clientHeight || canvas.parentElement.clientHeight || 560;

    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch (glErr) {
      console.warn('[AllamTreeEngine] WebGL initialization failed, activating model-viewer fallback:', glErr);
      _showFallback();
      return;
    }

    renderer.setSize(w, h, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x000000, 0);

    scene = new THREE.Scene();

    // Full overview keeps the crown and woven base legible together.
    camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 100);
    // Match the hero viewer's 75-degree polar orbit while framing the whole tree.
    camera.position.set(0, 4.27, 8.11);
    camera.lookAt(0, 2.1, 0);

    // Orbit Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.minDistance = 3.0;
    controls.maxDistance = 20.0;
    controls.target.set(0, 2.1, 0);
    controls.minPolarAngle = Math.PI * 0.08;
    controls.maxPolarAngle = Math.PI * 0.54; // Keep plinth well-grounded without flipping
    controls.autoRotate = false; // Give user stable control at startup
    controls.autoRotateSpeed = 0.35;

    // Soft studio lighting for the textile inspired materials.
    const ambient = new THREE.AmbientLight(0xf4eee0, 1.8);
    scene.add(ambient);

    // Key Light: warm brilliant sunlight
    const sun = new THREE.DirectionalLight(0xffebd6, 2.7);
    sun.position.set(5, 9, 7);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.bias = -0.0001;
    scene.add(sun);

    // Fill Light: soft emerald reflection from the left
    const fill = new THREE.DirectionalLight(0xb5d5c8, 0.96);
    fill.position.set(-6, 5, 4);
    scene.add(fill);

    // Rim light gives the crown a soft silhouette.
    const rim = new THREE.DirectionalLight(0xd9e4c3, 1.08);
    rim.position.set(0, 7.5, -7);
    scene.add(rim);

    // Low fill keeps the tree stage and roots readable.
    const plinthGlow = new THREE.PointLight(0xffe5cb, 0.48, 9);
    plinthGlow.position.set(0, 0.5, 2.4);
    scene.add(plinthGlow);

    rimLight = new THREE.PointLight(0xdde5c8, 0.48, 14);
    rimLight.position.set(0, 6.2, 0);
    scene.add(rimLight);

    raycaster = new THREE.Raycaster();
    pointer = new THREE.Vector2();
  }

  /**
   * Bind DOM references for floating 3D badge and status overlays
   * @private
   */
  function _initDOMReferences() {
    floatingBadgeEl = document.getElementById('tree-3d-floating-badge');
    badgeNameEl     = document.getElementById('badge-person-name');
    badgeGenEl      = document.getElementById('badge-person-gen');
    badgeDescEl     = document.getElementById('badge-person-desc');
    badgeBranchEl   = document.getElementById('badge-person-branch');
    overlayEl       = document.getElementById('tree-hover-name');
    statusEl        = document.getElementById('tree-status-label');

    if (floatingBadgeEl) {
      floatingBadgeEl.addEventListener('click', () => {
        if (activeNode || hoveredNode) {
          const target = activeNode || hoveredNode;
          if (typeof window.openSafeDrawer === 'function') {
            window.openSafeDrawer(target);
          }
        }
      });
    }

    const OverlayClass = window.TreeLeafLabelOverlay;
    if (OverlayClass && nodeRenderer && canvas.parentElement) {
      leafLabelOverlay = new OverlayClass(canvas.parentElement, nodeRenderer,
        memberId => selectNode(memberId, true),
        node => {
          hoveredNode = node;
          nodeRenderer.setHoveredIndex(node ? nodeRenderer.nodeIndexMap.get(node.id) : -1);
          if (!node && !activeNode) _hideFloatingBadge();
        });
    }
  }

  /**
   * Bind canvas pointer and resize events
   * @private
   */
  function _bindEvents() {
    canvas.addEventListener('pointermove', _onPointerMove);
    canvas.addEventListener('click', _onPointerClick);
    canvas.addEventListener('pointerdown', () => { if (controls) controls.autoRotate = false; });
    canvas.addEventListener('pointerleave', () => {
      hoveredNode = null;
      _hideFloatingBadge();
      if (nodeRenderer) nodeRenderer.setHoveredIndex(-1);
    });

    const ro = new ResizeObserver(_onResize);
    ro.observe(canvas.parentElement);
  }

  function _cleanDisplayName(name) {
    return String(name || '').replace(/\s*\.{2,}\s*/g, '').trim() || String(name || '');
  }

  function _onPointerMove(e) {
    _updatePointerCoordinates(e);
    raycaster.setFromCamera(pointer, camera);

    if (!nodeRenderer || !nodeRenderer.instancedMesh) return;

    const hits = raycaster.intersectObject(nodeRenderer.instancedMesh);
    const visibleHit = hits.find(h => {
      const candidate = layoutData.positionedNodes[h.instanceId];
      return candidate && (!nodeRenderer.visibleNodeIds || nodeRenderer.visibleNodeIds.has(candidate.id));
    });

    if (visibleHit) {
      const idx = visibleHit.instanceId;
      const node = layoutData.positionedNodes[idx];
      if (node) {
        hoveredNode = node;
        nodeRenderer.setHoveredIndex(idx);
        _showFloatingBadge(node);

        if (overlayEl) {
          const gLabel = ['الأول', 'الثاني', 'الثالث', 'الرابع'][node.gen - 1] || node.gen;
          overlayEl.textContent = `📌 ${_cleanDisplayName(node.name)} — ${node.relation || node.branch} (الجيل ${gLabel})`;
        }
        canvas.style.cursor = 'pointer';
      }
    } else {
      if (hoveredNode) {
        hoveredNode = null;
        nodeRenderer.setHoveredIndex(-1);
        canvas.style.cursor = 'grab';
        if (!activeNode) {
          _hideFloatingBadge();
          if (overlayEl) overlayEl.textContent = 'اسحب للتدوير — اختر ورقة أو بطاقة اسم';
        }
      }
    }
  }

  function _onPointerClick(e) {
    _updatePointerCoordinates(e);
    raycaster.setFromCamera(pointer, camera);

    if (!nodeRenderer || !nodeRenderer.instancedMesh) return;

    const hits = raycaster.intersectObject(nodeRenderer.instancedMesh);
    const visibleHit = hits.find(h => {
      const candidate = layoutData.positionedNodes[h.instanceId];
      return candidate && (!nodeRenderer.visibleNodeIds || nodeRenderer.visibleNodeIds.has(candidate.id));
    });

    if (visibleHit) {
      const idx = visibleHit.instanceId;
      const node = layoutData.positionedNodes[idx];
      if (node) {
        selectNode(node.id);

        // Open safe drawer
        if (typeof window.openSafeDrawer === 'function') {
          window.openSafeDrawer(node);
        } else {
          canvas.dispatchEvent(new CustomEvent('allam-node-click', {
            bubbles: true,
            detail: { member: node }
          }));
        }
      }
    }
  }

  function _updatePointerCoordinates(e) {
    const rect = canvas.getBoundingClientRect();
    pointer.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
    pointer.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
  }

  function _onResize() {
    if (!canvas || !renderer || !camera) return;
    const p = canvas.parentElement;
    const w = p ? p.clientWidth : 0;
    const h = p ? (p.clientHeight || 560) : 560;
    if (w <= 0 || h <= 0) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    if (leafLabelOverlay) leafLabelOverlay.markDirty();
  }

  // ──────────────────────────────────────────────
  // Floating Badge Display
  // ──────────────────────────────────────────────

  function _showFloatingBadge(node) {
    if (!floatingBadgeEl || !node) return;
    // Avoid overlapping a node that already has a visible white leaf label card
    if (leafLabelOverlay && leafLabelOverlay.shown && leafLabelOverlay.shown.has(node.id)) {
      _hideFloatingBadge();
      return;
    }
    if (badgeNameEl) badgeNameEl.textContent = _cleanDisplayName(node.name);
    if (badgeGenEl) {
      const g = ['الأول', 'الثاني', 'الثالث', 'الرابع'][node.gen - 1] || node.gen;
      badgeGenEl.textContent = `الجيل ${g}`;
    }
    if (badgeDescEl) badgeDescEl.textContent = node.relation || 'فرد موثق في سجل العائلة';
    if (badgeBranchEl) badgeBranchEl.textContent = `🌿 ${node.branch}`;

    floatingBadgeEl.classList.add('active');
    _updateFloatingBadgePosition(node);
  }

  function _hideFloatingBadge() {
    if (floatingBadgeEl) {
      floatingBadgeEl.classList.remove('active');
      floatingBadgeEl.style.opacity = '0';
    }
  }

  function _updateFloatingBadgePosition(node) {
    if (!floatingBadgeEl || !node || !nodeRenderer) return;
    if (leafLabelOverlay && leafLabelOverlay.shown && leafLabelOverlay.shown.has(node.id)) {
      _hideFloatingBadge();
      return;
    }
    const coords = nodeRenderer.projectNodeToScreen(node, camera, canvas);
    if (!coords || !coords.visible) {
      floatingBadgeEl.style.opacity = '0';
      return;
    }
    floatingBadgeEl.style.left = `${coords.x}px`;
    floatingBadgeEl.style.top  = `${coords.y}px`;
    floatingBadgeEl.style.opacity = '1';
  }

  // ──────────────────────────────────────────────
  // Navigation & Filtering Commands
  // ──────────────────────────────────────────────

  /**
   * Filter tree by branch key ('الفرع 1', 'الفرع 2', etc. or 'all')
   * @param {string} branchKey
   */
  function filterBranch(branchKey) {
    const key = branchKey || 'all';
    activeNode = null;
    hoveredNode = null;
    _hideFloatingBadge();
    if (nodeRenderer) {
      nodeRenderer.setHoveredIndex(-1);
      nodeRenderer.setSelectedId(null);
      nodeRenderer.clearAncestryPath();
      nodeRenderer.setBranchFilter(key);
    }
    if (leafLabelOverlay) leafLabelOverlay.markDirty();
    if (overlayEl) {
      overlayEl.textContent = (key === 'all' || key === 'الجذور الرمزية' || key === 'الجذور الرمزية')
        ? 'اسحب للتدوير — اختر ورقة أو بطاقة اسم'
        : `🌿 ${key} — اختر ورقة أو بطاقة اسم لعرض التفاصيل`;
    }

    if (cameraNav) {
      if (key === 'all' || key === 'الجذور الرمزية' || key === 'الجذور الرمزية') {
        cameraNav.flyToOverview();
      } else {
        const centroid = layoutData ? layoutData.branchCentroids[key] : null;
        const branchAnchor = visualAdapter
          ? visualAdapter.getBranchAnchorWorldPosition(key)
          : null;
        cameraNav.flyToBranch(key, centroid, undefined, branchAnchor);
      }
    }
  }

  /**
   * Filter tree by generation (1, 2, 3, 4, or 'all')
   * @param {string|number} gen
   */
  function filterGeneration(gen) {
    activeNode = null;
    hoveredNode = null;
    _hideFloatingBadge();
    if (nodeRenderer) {
      nodeRenderer.setHoveredIndex(-1);
      nodeRenderer.setSelectedId(null);
      nodeRenderer.clearAncestryPath();
      nodeRenderer.setGenerationFilter(gen);
    }
    if (leafLabelOverlay) leafLabelOverlay.markDirty();
    if (overlayEl) {
      overlayEl.textContent = gen === 'all'
        ? 'اسحب للتدوير — اختر ورقة أو بطاقة اسم'
        : `🌿 تصفية الجيل ${gen} — اختر ورقة أو بطاقة اسم`;
    }
  }

  /**
   * Select a member by ID, highlight their node & fly camera to them
   * @param {string} memberId
   * @param {boolean} triggerDrawer
   */
  function selectNode(memberId, triggerDrawer = true) {
    if (!layoutData) return;
    const node = layoutData.nodePositionMap.get(memberId);
    if (node) {
      activeNode = node;
      if (nodeRenderer) nodeRenderer.setSelectedId(node.id);
      if (leafLabelOverlay) leafLabelOverlay.markDirty();
      if (cameraNav) cameraNav.flyToNode(node);
      _hideFloatingBadge();
      if (overlayEl) {
        const gLabel = ['الأول', 'الثاني', 'الثالث', 'الرابع'][node.gen - 1] || node.gen;
        overlayEl.textContent = `📌 ${_cleanDisplayName(node.name)} — ${node.relation || node.branch} (الجيل ${gLabel})`;
      }
      if (triggerDrawer && typeof window.openSafeDrawer === 'function') {
        window.openSafeDrawer(node);
      }
    }
  }

  /**
   * Dynamically reload new member dataset and update 3D spatial layout and instances
   * @param {Array<Object>} members
   */
  function loadMembers(members) {
    if (!graph || !layoutEngine) return;
    graph.load(members || []);
    if (visualAdapter && visualAdapter.treeRoot && nodeRenderer) _rebuildLayoutForTree();
    else layoutData = layoutEngine.computeLayout(graph);
    console.log(`[AllamTreeEngine] Dynamically reloaded ${graph.size} nodes.`);
  }

  /**
   * Highlight ancestry path connecting root -> ancestors -> target member
   * @param {string} memberId
   */
  function highlightAncestryPath(memberId) {
    if (!graph || !nodeRenderer) return;
    const path = graph.getAncestryPath(memberId);
    if (path.length > 0) {
      // Map path nodes to their 3D positioned counterparts
      const positionedPath = path.map(n => layoutData.nodePositionMap.get(n.id)).filter(Boolean);
      nodeRenderer.highlightAncestryPath(positionedPath);
      if (cameraNav) cameraNav.flyToAncestryPath(positionedPath);
    }
  }

  /**
   * Search for members and fly camera to the first result
   * @param {string} query
   * @returns {Array<Object>} matching members
   */
  function searchAndFocus(query) {
    if (!graph) return [];
    const results = graph.search(query);
    if (results.length > 0) {
      const match = results[0];
      if (nodeRenderer) {
        nodeRenderer.setBranchFilter('all');
        nodeRenderer.setGenerationFilter('all');
      }
      selectNode(match.id, true);
      highlightAncestryPath(match.id);
    }
    return results;
  }

  /**
   * Reset camera to full overview framing the 5.5m tree and plinth
   */
  function resetCamera() {
    if (cameraNav) cameraNav.flyToOverview();
    if (nodeRenderer) {
      nodeRenderer.clearAncestryPath();
      nodeRenderer.setSelectedId(null);
      nodeRenderer.setBranchFilter('all');
      nodeRenderer.setGenerationFilter('all');
    }
    _hideFloatingBadge();
    activeNode = null;
    if (leafLabelOverlay) leafLabelOverlay.markDirty();
  }

  /**
   * Zoom camera in towards target
   */
  function zoomIn() {
    if (!camera || !controls || !THREE) return;
    const dir = new THREE.Vector3().subVectors(controls.target, camera.position).normalize();
    camera.position.addScaledVector(dir, 1.8);
    controls.update();
  }

  /**
   * Zoom camera out away from target
   */
  function zoomOut() {
    if (!camera || !controls || !THREE) return;
    const dir = new THREE.Vector3().subVectors(controls.target, camera.position).normalize();
    camera.position.addScaledVector(dir, -1.8);
    controls.update();
  }

  /**
   * Swap the visual 3D tree mesh on the fly (e.g. from current GLB to future Photoreal GLB)
   * @param {string} newModelUrl
   */
  async function swapTreeModel(newModelUrl) {
    if (!visualAdapter) return;
    const GLTFClass = (await import(GLTF_URL)).GLTFLoader;
    const DRACOClass = (await import(DRACO_URL)).DRACOLoader;
    const model = await visualAdapter.swapModel(newModelUrl, GLTFClass, DRACOClass);
    _rebuildLayoutForTree();
    return model;
  }

  // ──────────────────────────────────────────────
  // Scale Benchmarking Fixture
  // ──────────────────────────────────────────────

  /**
   * Run synthetic performance benchmark for scale testing (393, 1000, 2500, 5000)
   * @param {number} count
   * @returns {Object} benchmark report
   */
  function runBenchmark(count = 1000) {
    const t0 = performance.now();
    const synthData = GenealogyGraph.createSyntheticDataset(count);
    const tDataGen = performance.now();

    const tempGraph = new GenealogyGraph();
    tempGraph.load(synthData);
    const tGraphLoad = performance.now();

    const tempLayout = new MemberLayoutEngine();
    const result = tempLayout.computeLayout(tempGraph);
    const tLayout = performance.now();

    // Measure build time in renderer
    let tRender = tLayout;
    if (nodeRenderer) {
      nodeRenderer.build(result.positionedNodes, result.edges);
      tRender = performance.now();
    }

    const report = {
      count: result.positionedNodes.length,
      edgeCount: result.edges.length,
      dataGenTimeMs: parseFloat((tDataGen - t0).toFixed(2)),
      graphBuildTimeMs: parseFloat((tGraphLoad - tDataGen).toFixed(2)),
      layoutComputeTimeMs: parseFloat((tLayout - tGraphLoad).toFixed(2)),
      renderBuildTimeMs: parseFloat((tRender - tLayout).toFixed(2)),
      totalPipelineMs: parseFloat((tRender - t0).toFixed(2)),
      drawCallsEstimated: 2, // 1 InstancedMesh + 1 LineSegments
      trianglesEstimated: result.positionedNodes.length * 32
    };

    console.log('[AllamTreeEngine Benchmark]', report);
    return report;
  }

  // ──────────────────────────────────────────────
  // Render Loop (60 FPS)
  // ──────────────────────────────────────────────

  function _animate() {
    animFrameId = requestAnimationFrame(_animate);

    const time = performance.now() * 0.001;

    // 1. Subtle living breeze sway in tree canopy
    if (visualAdapter) {
      visualAdapter.update(time);
    }

    // 2. Advance camera smooth interpolation
    if (cameraNav) {
      cameraNav.update();
    }

    if (controls) {
      controls.update();
    }

    // 3. Project labels from leaf anchors using CSS pixel coordinates.
    if (leafLabelOverlay) leafLabelOverlay.update(camera, canvas);

    // 4. Update screen coordinates for 3D floating badge
    if (floatingBadgeEl?.classList.contains('active') && (activeNode || hoveredNode)) {
      _updateFloatingBadgePosition(activeNode || hoveredNode);
    }

    // 5. Render frame (only when canvas has non-zero visible dimensions)
    if (renderer && scene && camera && canvas && canvas.clientWidth > 0 && canvas.clientHeight > 0) {
      renderer.render(scene, camera);
    }
  }

  function _showFallback() {
    const mv = document.getElementById('tree-3d-model-viewer');
    if (mv) mv.style.display = 'block';
    if (canvas) canvas.style.display = 'none';
    if (leafLabelOverlay) {
      leafLabelOverlay.labels.style.display = 'none';
      leafLabelOverlay.lines.style.display = 'none';
    }
  }

  function dispose() {
    if (animFrameId) cancelAnimationFrame(animFrameId);
    if (nodeRenderer) nodeRenderer.dispose();
    if (leafLabelOverlay) leafLabelOverlay.dispose();
    if (visualAdapter) visualAdapter.dispose();
    if (renderer) renderer.dispose();
    isInit = false;
  }

  // Export Facade
  window.AllamTreeEngine = {
    init,
    loadMembers,
    filterBranch,
    filterGeneration,
    selectNode,
    highlightAncestryPath,
    searchAndFocus,
    resetCamera,
    zoomIn,
    zoomOut,
    swapTreeModel,
    runBenchmark,
    triggerFallback: _showFallback,
    dispose,
    // Direct subsystem access for advanced callers
    getGraph: () => graph,
    getLayout: () => layoutData,
    getVisualAdapter: () => visualAdapter,
    getNodeRenderer: () => nodeRenderer,
    getLeafLabelOverlay: () => leafLabelOverlay,
    resize: _onResize,
    getCameraNav: () => cameraNav,
    getRenderer: () => renderer,
    getScene: () => scene,
    getCamera: () => camera,
    getRenderInfo: () => {
      if (!renderer) return null;
      return {
        calls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
        points: renderer.info.render.points,
        lines: renderer.info.render.lines,
        geometries: renderer.info.memory.geometries,
        textures: renderer.info.memory.textures
      };
    }
  };

})();

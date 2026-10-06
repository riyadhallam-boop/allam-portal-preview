/**
 * ==============================================================================
 * Allam Family Portal — TreeVisualAdapter
 * Decoupled 3D Visual Mesh Adapter
 *
 * Encapsulates the visual tree mesh (GLB/GLTF), materials, and lighting.
 * Enables zero-refactor swapping between current placeholder GLB and future
 * Photoreal Blender Master Tree without touching the genealogy data layer.
 * ==============================================================================
 */

'use strict';

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.TreeVisualAdapter = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {

  // Calibrated from the reviewed GLB anchor azimuths: zone numbering is not
  // the same as the branch order used by the UI.
  const BRANCH_ANCHOR_BY_ZONE = Object.freeze({
    BRANCH_ZONE_01: '1',
    BRANCH_ZONE_02: '8',
    BRANCH_ZONE_03: '7',
    BRANCH_ZONE_04: '6',
    BRANCH_ZONE_05: '5',
    BRANCH_ZONE_06: '4',
    BRANCH_ZONE_07: '3',
    BRANCH_ZONE_08: '2'
  });

  class TreeVisualAdapter {
    static BRANCH_ANCHOR_BY_ZONE = BRANCH_ANCHOR_BY_ZONE;
    /**
     * @param {Object} THREE - Three.js namespace
     * @param {Object} scene - Three.js Scene
     * @param {Object} options - { defaultModelUrl, dracoDecoderPath }
     */
    constructor(THREE, scene, options = {}) {
      this.THREE = THREE;
      this.scene = scene;
      this.options = {
        defaultModelUrl: 'assets/models/allam-tree-native-eight.glb',
        dracoDecoderPath: 'https://www.gstatic.com/draco/versioned/decoders/1.5.7/',
        style: 'woven',
        ...options
      };

      this.treeRoot = null;
      this.currentModelUrl = null;
      this.isLoading = false;
      this.branchMeshMap = new Map(); // branchName -> array of Mesh
      this.spatialAnchors = new Map(); // zoneName -> Object3D
      this.branchZoneMap = new Map();  // branchName -> Object3D
      this.textures = this._createProceduralTextures();
      this.materials = this._createPBRMaterials();
    }

    /**
     * Generate procedural textures locally via Offscreen/HTML Canvas
     * @private
     */
    _createProceduralTextures() {
      const THREE = this.THREE;
      if (typeof document === 'undefined') return {};

      // 1. Ancient Walnut Bark Texture (Grain & Bump)
      const barkCanvas = document.createElement('canvas');
      barkCanvas.width = 512;
      barkCanvas.height = 512;
      const bCtx = barkCanvas.getContext('2d');

      const bumpCanvas = document.createElement('canvas');
      bumpCanvas.width = 512;
      bumpCanvas.height = 512;
      const bpCtx = bumpCanvas.getContext('2d');

      // Base walnut tone
      bCtx.fillStyle = '#2c180e';
      bCtx.fillRect(0, 0, 512, 512);

      bpCtx.fillStyle = '#808080';
      bpCtx.fillRect(0, 0, 512, 512);

      // Vertical bark grooves & ridges
      for (let x = 0; x < 512; x += 4) {
        const toneVal = Math.floor(25 + Math.random() * 45);
        const bumpVal = Math.floor(70 + Math.random() * 110);
        bCtx.fillStyle = `rgb(${toneVal + 28}, ${toneVal + 12}, ${toneVal})`;
        bCtx.fillRect(x + Math.sin(x * 0.1) * 3, 0, 3, 512);

        bpCtx.fillStyle = `rgb(${bumpVal}, ${bumpVal}, ${bumpVal})`;
        bpCtx.fillRect(x + Math.sin(x * 0.1) * 3, 0, 3, 512);
      }

      // Add organic fissures and knots
      for (let i = 0; i < 40; i++) {
        const kx = Math.random() * 512;
        const ky = Math.random() * 512;
        const kw = 4 + Math.random() * 8;
        const kh = 25 + Math.random() * 65;

        bCtx.fillStyle = '#150904';
        bCtx.beginPath();
        bCtx.ellipse(kx, ky, kw, kh, Math.PI / 16, 0, Math.PI * 2);
        bCtx.fill();

        bpCtx.fillStyle = '#111111';
        bpCtx.beginPath();
        bpCtx.ellipse(kx, ky, kw, kh, Math.PI / 16, 0, Math.PI * 2);
        bpCtx.fill();
      }

      const barkMap = new THREE.CanvasTexture(barkCanvas);
      barkMap.wrapS = THREE.RepeatWrapping;
      barkMap.wrapT = THREE.RepeatWrapping;
      barkMap.repeat.set(3, 6);

      const barkBump = new THREE.CanvasTexture(bumpCanvas);
      barkBump.wrapS = THREE.RepeatWrapping;
      barkBump.wrapT = THREE.RepeatWrapping;
      barkBump.repeat.set(3, 6);

      // 2. Obsidian Marble Plinth with Gold Veins
      const marbleCanvas = document.createElement('canvas');
      marbleCanvas.width = 512;
      marbleCanvas.height = 512;
      const mCtx = marbleCanvas.getContext('2d');

      // Deep emerald black
      mCtx.fillStyle = '#060b08';
      mCtx.fillRect(0, 0, 512, 512);

      // Organic gold marble veins
      mCtx.lineWidth = 2.5;
      mCtx.strokeStyle = 'rgba(212, 160, 23, 0.45)';
      for (let v = 0; v < 7; v++) {
        mCtx.beginPath();
        let vx = Math.random() * 512;
        let vy = 0;
        mCtx.moveTo(vx, vy);
        while (vy < 512) {
          vx += (Math.random() - 0.48) * 28;
          vy += 14 + Math.random() * 20;
          mCtx.lineTo(vx, vy);
        }
        mCtx.stroke();
      }

      // Secondary fine gold hair veins
      mCtx.lineWidth = 1.0;
      mCtx.strokeStyle = 'rgba(252, 228, 157, 0.3)';
      for (let v = 0; v < 12; v++) {
        mCtx.beginPath();
        let vx = Math.random() * 512;
        let vy = 0;
        mCtx.moveTo(vx, vy);
        while (vy < 512) {
          vx += (Math.random() - 0.5) * 32;
          vy += 20 + Math.random() * 30;
          mCtx.lineTo(vx, vy);
        }
        mCtx.stroke();
      }

      const marbleMap = new THREE.CanvasTexture(marbleCanvas);
      marbleMap.wrapS = THREE.RepeatWrapping;
      marbleMap.wrapT = THREE.RepeatWrapping;
      marbleMap.repeat.set(2, 2);

      // 3. Botanical Emerald Foliage Texture
      const leafCanvas = document.createElement('canvas');
      leafCanvas.width = 256;
      leafCanvas.height = 256;
      const lCtx = leafCanvas.getContext('2d');

      const grad = lCtx.createRadialGradient(128, 128, 10, 128, 128, 128);
      grad.addColorStop(0, '#2d7a48');
      grad.addColorStop(0.65, '#19532e');
      grad.addColorStop(1, '#0e341c');
      lCtx.fillStyle = grad;
      lCtx.fillRect(0, 0, 256, 256);

      // Subtle leaf vein network
      lCtx.strokeStyle = 'rgba(100, 200, 130, 0.2)';
      lCtx.lineWidth = 1.5;
      for (let l = 0; l < 8; l++) {
        lCtx.beginPath();
        lCtx.moveTo(128, 0);
        lCtx.quadraticCurveTo(128 + (Math.random() - 0.5) * 80, 128, Math.random() * 256, 256);
        lCtx.stroke();
      }

      const leafMap = new THREE.CanvasTexture(leafCanvas);
      leafMap.wrapS = THREE.RepeatWrapping;
      leafMap.wrapT = THREE.RepeatWrapping;
      leafMap.repeat.set(4, 4);

      return { barkMap, barkBump, marbleMap, leafMap };
    }

    /**
     * Instantiate shared PBR Materials
     * @private
     */
    _createPBRMaterials() {
      const THREE = this.THREE;
      const tex = this.textures || {};
      const weaveCanvas = document.createElement('canvas');
      weaveCanvas.width = weaveCanvas.height = 128;
      const weave = weaveCanvas.getContext('2d');
      weave.fillStyle = '#f8f7ef';
      weave.fillRect(0, 0, 128, 128);
      weave.strokeStyle = 'rgba(91, 107, 80, 0.10)';
      weave.lineWidth = 1;
      for (let p = 1; p < 128; p += 4) {
        weave.beginPath(); weave.moveTo(p, 0); weave.lineTo(p, 128); weave.stroke();
        weave.beginPath(); weave.moveTo(0, p); weave.lineTo(128, p); weave.stroke();
      }
      const wovenMap = new THREE.CanvasTexture(weaveCanvas);
      wovenMap.colorSpace = THREE.SRGBColorSpace;
      wovenMap.wrapS = wovenMap.wrapT = THREE.RepeatWrapping;
      wovenMap.repeat.set(3, 3);
      this._wovenMap = wovenMap;

      // 1. Organic Emerald Leaf with Subsurface Translucency
      const leafMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x38b269,
        map: tex.leafMap || null,
        roughness: 0.28,
        metalness: 0.05,
        transmission: 0.32,
        thickness: 0.25,
        clearcoat: 0.45,
        clearcoatRoughness: 0.15,
        emissive: 0x165c33,
        emissiveIntensity: 0.45,
        side: THREE.DoubleSide
      });

      // 2. Sculpted Ancient Walnut Bark with Real Bump Mapping & Specular Grain
      const barkMaterial = new THREE.MeshStandardMaterial({
        color: 0x6e4528,
        map: tex.barkMap || null,
        bumpMap: tex.barkBump || null,
        bumpScale: 0.12,
        roughness: 0.68,
        metalness: 0.06
      });

      // 3. Imperial Obsidian Dark Marble with Deep Clearcoat & Gold Veins
      const marbleMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x1a2e22,
        map: tex.marbleMap || null,
        roughness: 0.08,
        metalness: 0.12,
        clearcoat: 1.0,
        clearcoatRoughness: 0.04
      });

      // 4. 24K Royal Gold for Dynamic Medallions & Accents
      const goldMaterial = new THREE.MeshStandardMaterial({
        color: 0xffd700,
        roughness: 0.12,
        metalness: 0.96,
        envMapIntensity: 2.2
      });

      const clayBark = new THREE.MeshStandardMaterial({
        name: 'WovenTrunk', color: 0x736b57, roughness: 0.94,
        metalness: 0, map: wovenMap, side: THREE.DoubleSide
      });
      const clayBranches = new THREE.MeshStandardMaterial({
        name: 'WovenBranches', color: 0x91846a, roughness: 0.94,
        metalness: 0, map: wovenMap, side: THREE.DoubleSide
      });
      const clayGround = new THREE.MeshStandardMaterial({
        name: 'WovenGround', color: 0xd8d5c5, roughness: 1,
        metalness: 0, map: wovenMap
      });
      const clayLeaves = new THREE.MeshStandardMaterial({
        name: 'WovenLeaves', color: 0xffffff, roughness: 0.9,
        metalness: 0, flatShading: true, side: THREE.DoubleSide,
        transparent: true, alphaTest: 0.3, depthWrite: true
      });

      return { leaf: leafMaterial, bark: barkMaterial, marble: marbleMaterial,
        gold: goldMaterial, clayBark, clayBranches, clayGround, clayLeaves };
    }

    /** Preserve the GLB leaf silhouettes while replacing photographic color with matte sage. */
    _makeClayLeafTexture(sourceMap) {
      if (!sourceMap || !sourceMap.image || typeof document === 'undefined') return sourceMap || null;
      if (this._clayLeafTexture) return this._clayLeafTexture;
      try {
        const image = sourceMap.image;
        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(image, 0, 0);
        const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = pixels.data;
        for (let i = 0; i < data.length; i += 4) {
          const variation = (data[i] + data[i + 1] + data[i + 2]) / 3;
          const tone = Math.round((variation - 110) * 0.1);
          data[i] = Math.max(0, Math.min(255, 137 + tone));
          data[i + 1] = Math.max(0, Math.min(255, 170 + tone));
          data[i + 2] = Math.max(0, Math.min(255, 133 + tone));
        }
        ctx.putImageData(pixels, 0, 0);
        const texture = new this.THREE.CanvasTexture(canvas);
        texture.colorSpace = this.THREE.SRGBColorSpace;
        texture.flipY = sourceMap.flipY;
        texture.wrapS = sourceMap.wrapS;
        texture.wrapT = sourceMap.wrapT;
        texture.repeat.copy(sourceMap.repeat);
        texture.offset.copy(sourceMap.offset);
        this._clayLeafTexture = texture;
        return texture;
      } catch (error) {
        console.warn('[TreeVisualAdapter] Using original leaf silhouette texture:', error);
        return sourceMap;
      }
    }

    /**
     * Load a 3D tree model from GLB URL
     * @param {string} url - path to GLB file
     * @param {Function} GLTFLoaderClass
     * @param {Function} [DRACOLoaderClass]
     * @param {Function} [onProgress]
     * @returns {Promise<Object>}
     */
    async loadModel(url, GLTFLoaderClass, DRACOLoaderClass, onProgress) {
      const targetUrl = url || this.options.defaultModelUrl;
      this.isLoading = true;

      const loader = new GLTFLoaderClass();
      if (DRACOLoaderClass) {
        const draco = new DRACOLoaderClass();
        draco.setDecoderPath(this.options.dracoDecoderPath);
        loader.setDRACOLoader(draco);
      }

      return new Promise((resolve, reject) => {
        loader.load(
          targetUrl,
          (gltf) => {
            if (this.treeRoot) {
              this.scene.remove(this.treeRoot);
            }

            this.treeRoot = gltf.scene;
            this.currentModelUrl = targetUrl;
            this.branchMeshMap.clear();

            this._applyMaterialsAndShadows(this.treeRoot);

            const treeScale = targetUrl.includes('allam-tree-native-eight.glb') ? 0.42 : 1.0;
            this.treeRoot.scale.setScalar(treeScale);
            this.treeRoot.position.set(0, 0, 0);
            this.scene.add(this.treeRoot);

            this.isLoading = false;
            console.log(`[TreeVisualAdapter] Loaded visual tree: ${targetUrl}`);
            resolve(this.treeRoot);
          },
          (progress) => {
            if (typeof onProgress === 'function' && progress.total) {
              onProgress(Math.round((progress.loaded / progress.total) * 100));
            }
          },
          (err) => {
            this.isLoading = false;
            console.warn(`[TreeVisualAdapter] Load failed for ${targetUrl}:`, err);
            // Fallback to placeholder if primary model fails
            if (targetUrl !== this.options.defaultModelUrl) {
              this.loadModel(this.options.defaultModelUrl, GLTFLoaderClass, DRACOLoaderClass, onProgress)
                .then(resolve)
                .catch(reject);
            } else {
              this._buildProceduralFallback();
              resolve(this.treeRoot);
            }
          }
        );
      });
    }

    /**
     * Traverse and upgrade meshes with PBR materials and shadow flags
     * @private
     */
    _applyMaterialsAndShadows(root) {
      const THREE = this.THREE;
      this.spatialAnchors.clear();
      this.branchZoneMap.clear();

      root.traverse(obj => {
        // Collect spatial branch anchors
        if (obj.name && obj.name.startsWith('BRANCH_ZONE_')) {
          this.spatialAnchors.set(obj.name, obj);
          const shortName = BRANCH_ANCHOR_BY_ZONE[obj.name];
          if (shortName) {
            const fullName = 'فرع ' + shortName;
            this.branchZoneMap.set(fullName, obj);
            this.branchZoneMap.set(shortName, obj);
          }
        }

        if (obj.isMesh) {
          const name = (obj.name || '').toLowerCase();
          const matName = (obj.material && obj.material.name ? obj.material.name : '').toLowerCase();

          // CRITICAL: Hide static baked dummy fruit/token spheres from old GLB so they don't look like stray balls!
          if (name.includes('fruit') || matName.includes('fruit') || name.includes('token') || matName.includes('token')) {
            obj.visible = false;
            return;
          }

          obj.castShadow = true;
          obj.receiveShadow = true;

          // The home showcase uses this GLB's authored materials. Preserve
          // them in the explorer too so the same asset keeps one visual identity.
          if (this.options.style === 'source') return;

          if (this.options.style === 'woven') {
            const useClay = source => {
              const sourceName = (source && source.name || '').toLowerCase();
              const kind = `${sourceName} ${name} ${matName}`;
              if (kind.includes('gold') || kind.includes('token') || kind.includes('fruit')) {
                obj.visible = false;
                return source;
              }
              if (kind.includes('leaves') || kind.includes('foliage')) {
                const leafMat = this.materials.clayLeaves.clone();
                leafMat.map = this._makeClayLeafTexture(source && source.map);
                return leafMat;
              }
              if (/branch|trunk|bark|wood/.test(kind)) {
                return this.materials.clayBranches;
              }
              if (/plinth|base|platform/.test(kind)) return this.materials.clayGround;
              return this.materials.clayBark;
            };
            obj.material = Array.isArray(obj.material)
              ? obj.material.map(useClay) : useClay(obj.material);
            return;
          }

          // Keep exportable PBR maps and per-leaf vertex colors from Blender.
          // Older GLBs have neither, so they continue through the legacy
          // material classification below.
          const hasExportedAppearance = Boolean(
            (obj.material && obj.material.map) ||
            (obj.geometry && obj.geometry.attributes && obj.geometry.attributes.color)
          );
          if (hasExportedAppearance) {
            if (obj.geometry && obj.geometry.attributes && obj.geometry.attributes.color && obj.material) {
              obj.material.vertexColors = true;
              obj.material.side = THREE.DoubleSide;
            }
            return;
          }

          if (name.includes('leaf') || matName.includes('leaf') || matName.includes('jade') || name.includes('foliage')) {
            obj.material = this.materials.leaf;
          } else if (name.includes('trunk') || name.includes('heritage') || name.includes('root') || name.includes('branch') || name.includes('bough') || matName.includes('bark') || matName.includes('walnut') || matName.includes('wood')) {
            obj.material = this.materials.bark;
          } else if (name.includes('plinth') || name.includes('cylinder') || name.includes('base') || name.includes('pedestal') || matName.includes('marble')) {
            obj.material = this.materials.marble;
          } else if (name.includes('gold') || matName.includes('gold') || name.includes('torus')) {
            obj.material = this.materials.gold;
          }

          // Map branch roots/curves
          branchNameList.forEach(b => {
            if (name.includes(b)) {
              if (!this.branchMeshMap.has(b)) this.branchMeshMap.set(b, []);
              this.branchMeshMap.get(b).push(obj);
            }
          });
        }
      });

      if (this.options.style === 'woven') {
        const base = new THREE.Mesh(
          new THREE.CylinderGeometry(1.48, 1.55, 0.18, 48),
          this.materials.clayGround
        );
        base.name = 'WovenTreeStage';
        base.position.y = -0.13;
        base.receiveShadow = true;
        root.add(base);

        const lower = new THREE.Mesh(
          new THREE.CylinderGeometry(1.57, 1.61, 0.08, 48),
          new THREE.MeshStandardMaterial({ color: 0x9cae9d, roughness: 1, metalness: 0 })
        );
        lower.name = 'WovenTreeStageEdge';
        lower.position.y = -0.26;
        lower.receiveShadow = true;
        root.add(lower);
      }

      // Add grounding ambient contact shadow disc under tree plinth
      try {
        if (typeof document !== 'undefined') {
          const sCanvas = document.createElement('canvas');
          sCanvas.width = 128;
          sCanvas.height = 128;
          const sCtx = sCanvas.getContext('2d');
          const sGrad = sCtx.createRadialGradient(64, 64, 8, 64, 64, 64);
          sGrad.addColorStop(0, 'rgba(3, 7, 5, 0.7)');
          sGrad.addColorStop(0.55, 'rgba(5, 10, 7, 0.28)');
          sGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          sCtx.fillStyle = sGrad;
          sCtx.fillRect(0, 0, 128, 128);

          const sTex = new THREE.CanvasTexture(sCanvas);
          const sGeo = new THREE.PlaneGeometry(5.4, 5.4);
          const sMat = new THREE.MeshBasicMaterial({
            map: sTex,
            transparent: true,
            depthWrite: false
          });
          const sMesh = new THREE.Mesh(sGeo, sMat);
          sMesh.name = 'PlinthGroundContactShadow';
          sMesh.rotation.x = -Math.PI / 2;
          sMesh.position.y = -0.02;
          root.add(sMesh);
        }
      } catch (e) {
        console.warn('[TreeVisualAdapter] Contact shadow creation skipped:', e);
      }
    }

    /**
     * Build procedural architectural fallback tree if GLB unavailable
     * @private
     */
    _buildProceduralFallback() {
      const THREE = this.THREE;
      if (this.treeRoot) this.scene.remove(this.treeRoot);

      this.treeRoot = new THREE.Group();
      this.treeRoot.name = 'ProceduralTreeFallback';

      // Trunk
      const trunkGeo = new THREE.CylinderGeometry(0.2, 0.35, 4.2, 16);
      const trunk = new THREE.Mesh(trunkGeo, this.options.style === 'woven' ? this.materials.clayBark : this.materials.bark);
      trunk.position.y = 2.1;
      trunk.castShadow = true;
      this.treeRoot.add(trunk);

      // Crown
      const crownGeo = new THREE.SphereGeometry(2.4, 16, 12);
      const crown = new THREE.Mesh(crownGeo, this.options.style === 'woven' ? this.materials.clayLeaves : this.materials.leaf);
      crown.position.y = 4.2;
      crown.castShadow = true;
      this.treeRoot.add(crown);

      // Plinth
      const baseGeo = new THREE.CylinderGeometry(2.5, 2.5, 0.1, 32);
      const base = new THREE.Mesh(baseGeo, this.options.style === 'woven' ? this.materials.clayGround : this.materials.marble);
      base.position.y = 0.05;
      base.receiveShadow = true;
      this.treeRoot.add(base);

      this.scene.add(this.treeRoot);
    }

    /**
     * Update subtle organic breeze sway
     * @param {number} time - elapsed seconds
     */
    update(time) {
      // The scanned trunk and its member attachments share fixed coordinates.
      // Rotating the whole asset would make attached medallions drift off bark.
    }

    /**
     * Get world position of branch spatial anchor
     * @param {string} branchName - e.g. 'الفرع 1' or '1'
     * @param {Object} [targetVec]
     * @returns {Object|null}
     */
    getBranchAnchorWorldPosition(branchName, targetVec = null) {
      const THREE = this.THREE;
      const anchor = this.branchZoneMap.get(branchName);
      if (!anchor) return null;
      const v = targetVec || new THREE.Vector3();
      anchor.getWorldPosition(v);
      return v;
    }

    /**
     * Swap the 3D model asset on the fly
     * @param {string} newModelUrl
     * @param {Function} GLTFLoaderClass
     * @param {Function} [DRACOLoaderClass]
     * @returns {Promise<Object>}
     */
    async swapModel(newModelUrl, GLTFLoaderClass, DRACOLoaderClass) {
      console.log(`[TreeVisualAdapter] Swapping tree asset to: ${newModelUrl}`);
      return this.loadModel(newModelUrl, GLTFLoaderClass, DRACOLoaderClass);
    }

    /**
     * Clean up resources
     */
    dispose() {
      if (this.treeRoot) {
        this.scene.remove(this.treeRoot);
        this.treeRoot.traverse(obj => {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) {
            if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
            else obj.material.dispose();
          }
        });
        this.treeRoot = null;
      }
      if (this._wovenMap) {
        this._wovenMap.dispose();
        this._wovenMap = null;
      }
      if (this._clayLeafTexture) {
        this._clayLeafTexture.dispose();
        this._clayLeafTexture = null;
      }
    }
  }

  return TreeVisualAdapter;
});

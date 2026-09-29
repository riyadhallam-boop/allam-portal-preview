/**
 * ==============================================================================
 * Allam Family Portal — MemberNodeRenderer
 * Instanced woven leaf markers and confirmed ancestry path renderer
 *
 * Renders member markers as leaves anchored to the tree geometry.
 * Manages states: DEFAULT, HOVER, SELECTED, ANCESTRY_PATH, and MUTED.
 * ==============================================================================
 */

'use strict';

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.MemberNodeRenderer = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {

  const BRANCH_COLORS = {
    'الفرع 1':    0x8aa96a,
    'الفرع 2':    0x719867,
    'الفرع 3':    0xa6b476,
    'الفرع 4':    0x89a56c,
    'الفرع 5':    0xb7b77c,
    'الفرع 6': 0x9eaf83,
    'الفرع 7':  0x80a27a,
    'الفرع 8':    0xb0bf91,
    'الجذور الرمزية': 0xb88969,
    'root':         0xb88969
  };

  const LEAF_DEFAULT_COLOR = 0x91a972;

  // A small woven leaf with a raised centre vein. One geometry is
  // shared by every instance, including the clickable raycast target.
  function createClayLeafGeometry(THREE) {
    const rows = [
      [-0.12, 0], [-0.075, 0.054], [-0.015, 0.082],
      [0.05, 0.064], [0.11, 0.025], [0.15, 0]
    ];
    const positions = [];
    const colors = [];
    for (const side of [1, -1]) {
      for (const [y, width] of rows) {
        for (const across of [-1, 0, 1]) {
          positions.push(width * across, y, side * (across === 0 ? 0.019 : 0.004));
          const shade = across === 0 ? 1 : 0.78;
          colors.push(shade, shade, shade);
        }
      }
    }
    const indices = [];
    const rowCount = rows.length;
    for (let side = 0; side < 2; side++) {
      const offset = side * rowCount * 3;
      for (let row = 0; row < rowCount - 1; row++) {
        for (let col = 0; col < 2; col++) {
          const a = offset + row * 3 + col;
          const b = a + 3;
          if (side === 0) indices.push(a, b, a + 1, b, b + 1, a + 1);
          else indices.push(a, a + 1, b, b, a + 1, b + 1);
        }
      }
    }
    for (let row = 0; row < rowCount - 1; row++) {
      for (const col of [0, 2]) {
        const a = row * 3 + col;
        const b = (row + 1) * 3 + col;
        const c = rowCount * 3 + a;
        const d = rowCount * 3 + b;
        indices.push(a, c, b, b, c, d);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
  }

  class MemberNodeRenderer {
    /**
     * @param {Object} THREE
     * @param {Object} scene
     * @param {Object} options
     */
    constructor(THREE, scene, options = {}) {
      this.THREE = THREE;
      this.scene = scene;
      this.options = options;

      this.instancedMesh = null;
      this.edgeMesh = null;
      this.ancestryPathMesh = null;

      this.positionedNodes = [];
      this.nodeIndexMap = new Map(); // id -> instanceId
      this.baseColors = [];
      this.visibleNodeIds = new Set();

      this.hoveredIndex = -1;
      this.selectedIndex = -1;
      this.highlightedAncestrySet = new Set();
      this.activeBranch = 'all';
      this.activeGeneration = 'all';

      // Reusable vectors for performance
      this._dummy = new THREE.Object3D();
      this._color = new THREE.Color();
      this._projVector = new THREE.Vector3();
      this._instanceMatrix = new THREE.Matrix4();
      this._leafLocalNormal = new THREE.Vector3(0, 0, 1);
      this._leafSurfaceNormal = new THREE.Vector3();
    }

    /**
     * Build InstancedMesh and Edge lines from layout engine results
     * @param {Array<Object>} positionedNodes
     * @param {Array<Object>} edges
     */
    build(positionedNodes, edges) {
      this.dispose();

      this.positionedNodes = positionedNodes || [];
      this.nodeIndexMap.clear();
      this.baseColors = [];
      this.branchCounts = new Map();
      this.overviewIds = new Set(['root']);
      const overviewBranches = new Set();
      this.hoveredIndex = -1;
      this.selectedIndex = -1;
      this.highlightedAncestrySet.clear();

      const count = this.positionedNodes.length;
      if (count === 0) return;

      const THREE = this.THREE;

      const geo = createClayLeafGeometry(THREE);

      // Matte, sculpted foliage rather than metallic tokens.
      const mat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        vertexColors: true,
        metalness: 0,
        roughness: 0.94,
        flatShading: true,
        side: THREE.DoubleSide,
        emissive: 0x203925,
        emissiveIntensity: 0.08
      });

      this.instancedMesh = new THREE.InstancedMesh(geo, mat, count);
      this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.instancedMesh.castShadow = false;
      this.instancedMesh.receiveShadow = false;
      this.instancedMesh.renderOrder = 10;
      this.instancedMesh.frustumCulled = false;

      this.scaleMap = { 1: 1.3, 2: 1.04, 3: 0.9, 4: 0.78 };

      // Position instances oriented radially outward from the central trunk
      this.positionedNodes.forEach((node, i) => {
        this.nodeIndexMap.set(node.id, i);
        this.branchCounts.set(node.branch, (this.branchCounts.get(node.branch) || 0) + 1);
        if (node.branch && node.branch !== 'الجذور الرمزية' && !overviewBranches.has(node.branch)) {
          const leader = this.positionedNodes.find(candidate =>
            candidate.branch === node.branch && candidate.gen === 1 && candidate.relation === 'نفسه') ||
            this.positionedNodes.find(candidate => candidate.branch === node.branch && candidate.gen === 2);
          if (leader) {
            this.overviewIds.add(leader.id);
            overviewBranches.add(node.branch);
          }
        }

        const baseS = (node.id === 'root' ? 1.55 : this.scaleMap[node.gen] || 1);
        this._setLeafTransform(node, baseS, i);
        this.instancedMesh.setMatrixAt(i, this._dummy.matrix);

        const hex = node.id === 'root' ? BRANCH_COLORS.root : (BRANCH_COLORS[node.branch] || LEAF_DEFAULT_COLOR);
        this._color.setHex(hex);
        this.instancedMesh.setColorAt(i, this._color);
        this.baseColors.push(this._color.clone());
      });

      this.instancedMesh.instanceMatrix.needsUpdate = true;
      if (this.instancedMesh.instanceColor) {
        this.instancedMesh.instanceColor.needsUpdate = true;
      }
      this.scene.add(this.instancedMesh);

      // 3. LineSegments for genealogy lines
      this._buildEdgeLines(edges);
      this.updateAppearance();
    }

    _setLeafTransform(node, scale, index) {
      const radius = Math.hypot(node.x, node.z);
      const angle = radius > 0.03 ? Math.atan2(node.x, node.z) : 0;
      // Tree-attached markers already include a small surface-normal offset from
      // the layout engine. Do not add the legacy radial lift a second time.
      const offset = node.id === 'root' || node.attachedToTree ? 0 : 0.055;
      this._dummy.position.set(
        node.x + Math.sin(angle) * offset,
        node.y,
        node.z + Math.cos(angle) * offset
      );
      this._dummy.scale.setScalar(scale);
      const roll = ((index % 5) - 2) * 0.13;
      if (node.surfaceNormal && Number.isFinite(node.surfaceNormal.x) &&
          Number.isFinite(node.surfaceNormal.y) && Number.isFinite(node.surfaceNormal.z)) {
        this._leafSurfaceNormal.set(node.surfaceNormal.x, node.surfaceNormal.y, node.surfaceNormal.z).normalize();
        this._dummy.quaternion.setFromUnitVectors(this._leafLocalNormal, this._leafSurfaceNormal);
        this._dummy.rotateZ(roll);
      } else {
        this._dummy.rotation.set(0, angle, roll);
      }
      this._dummy.updateMatrix();
    }

    /**
     * Build baseline genealogy connection lines
     * @private
     */
    _buildEdgeLines(edges) {
      if (!edges || edges.length === 0) return;
      const THREE = this.THREE;

      const positions = [];
      edges.forEach(edge => {
        positions.push(edge.from.x, edge.from.y, edge.from.z);
        positions.push(edge.to.x,   edge.to.y,   edge.to.z);
      });

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

      const mat = new THREE.LineBasicMaterial({
        color: 0x4a8c5c,
        transparent: true,
        opacity: 0.22,
        linewidth: 1
      });

      this.edgeMesh = new THREE.LineSegments(geo, mat);
      // A full 393-member line web obscures the scanned branches. The selected
      // ancestry path remains available as a separate, explicit overlay.
      this.edgeMesh.visible = false;
      this.scene.add(this.edgeMesh);
    }

    /**
     * Highlights ancestry path from root to target member
     * @param {Array<Object>} pathNodes - nodes from root down to target
     */
    highlightAncestryPath(pathNodes) {
      const THREE = this.THREE;
      this.highlightedAncestrySet.clear();

      if (this.ancestryPathMesh) {
        this.scene.remove(this.ancestryPathMesh);
        this.ancestryPathMesh.geometry.dispose();
        this.ancestryPathMesh.material.dispose();
        this.ancestryPathMesh = null;
      }

      if (!pathNodes || pathNodes.length < 2) {
        this.updateAppearance();
        return;
      }

      const pathPositions = [];
      for (let i = 0; i < pathNodes.length; i++) {
        this.highlightedAncestrySet.add(pathNodes[i].id);
        if (i < pathNodes.length - 1) {
          pathPositions.push(pathNodes[i].x, pathNodes[i].y, pathNodes[i].z);
          pathPositions.push(pathNodes[i + 1].x, pathNodes[i + 1].y, pathNodes[i + 1].z);
        }
      }

      // Draw a restrained confirmed ancestry path line.
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pathPositions, 3));

      const mat = new THREE.LineBasicMaterial({
        color: 0x9cc8b2,
        linewidth: 3,
        transparent: true,
        opacity: 0.95,
        depthTest: false,
        depthWrite: false
      });

      this.ancestryPathMesh = new THREE.LineSegments(geo, mat);
      this.ancestryPathMesh.renderOrder = 9;
      this.scene.add(this.ancestryPathMesh);

      this.updateAppearance();
    }

    /**
     * Clear highlighted ancestry path
     */
    clearAncestryPath() {
      this.highlightAncestryPath([]);
    }

    /**
     * Set active branch filter
     * @param {string} branchKey
     */
    setBranchFilter(branchKey) {
      this.activeBranch = branchKey || 'all';
      this.updateAppearance();
    }

    /**
     * Set active generation filter
     * @param {string|number} gen
     */
    setGenerationFilter(gen) {
      this.activeGeneration = gen || 'all';
      this.updateAppearance();
    }

    /**
     * Set hover instance index
     * @param {number} idx
     */
    setHoveredIndex(idx) {
      if (this.hoveredIndex !== idx) {
        this.hoveredIndex = idx;
        this.updateAppearance();
      }
    }

    /**
     * Set selected node id
     * @param {string} id
     */
    setSelectedId(id) {
      const idx = id ? (this.nodeIndexMap.get(id) ?? -1) : -1;
      if (this.selectedIndex !== idx) {
        this.selectedIndex = idx;
        this.updateAppearance();
      }
    }

    /**
     * Refresh leaf colors and visibility according to active filters and states
     */
    updateAppearance() {
      if (!this.instancedMesh || !this.instancedMesh.instanceColor) return;

      const hasAncestryHighlight = this.highlightedAncestrySet.size > 0;
      this.visibleNodeIds.clear();

      this.positionedNodes.forEach((node, i) => {
        const base = this.baseColors[i] || { r: 0.6, g: 0.7, b: 0.45 };
        let r = base.r;
        let g = base.g;
        let b = base.b;

        const isAncestryMember = this.highlightedAncestrySet.has(node.id);
        const isSelected = i === this.selectedIndex;
        const isHovered = i === this.hoveredIndex;

        // Check branch & gen filter
        const matchesBranch = (this.activeBranch === 'all' || node.branch === this.activeBranch || node.id === 'root');
        const matchesGen = (this.activeGeneration === 'all' || node.gen === parseInt(this.activeGeneration, 10) || node.id === 'root');
        const isOverview = this.activeBranch === 'all' && this.activeGeneration === 'all' && !hasAncestryHighlight;
        const inOverview = !isOverview || this.overviewIds.has(node.id);
        const isVisible = (matchesBranch && matchesGen && inOverview) || isSelected || isAncestryMember;
        if (isVisible) this.visibleNodeIds.add(node.id);

        let scaleMult = 1.0;
        if (!isVisible) {
          r = 0; g = 0; b = 0;
          scaleMult = 0.00001;
        } else if (isSelected) {
          r = 0.99; g = 0.84; b = 0.59;
          scaleMult = 1.32;
        } else if (isHovered) {
          // A brighter natural leaf identifies the hovered person.
          r = Math.min(1.0, base.r * 1.35);
          g = Math.min(1.0, base.g * 1.35);
          b = Math.min(1.0, base.b * 1.35);
          scaleMult = 1.25;
        } else if (isOverview) {
          // Eight branch entrances remain readable at the overview camera distance.
          scaleMult = node.id === 'root' ? 1 : 1.48;
        } else if (hasAncestryHighlight) {
          if (isAncestryMember) {
            r = 0.96; g = 0.80; b = 0.53;
            scaleMult = 1.28;
          } else {
            // Mute others when path is active
            r *= 0.12; g *= 0.12; b *= 0.12;
            scaleMult = 0.28;
          }
        }

        if (isVisible && this.activeBranch !== 'all' && !isSelected && !isHovered && !isAncestryMember) {
          scaleMult *= Math.min(1, Math.sqrt(36 / (this.branchCounts.get(node.branch) || 36)));
        }

        const baseS = (node.id === 'root' ? 1.55 : (this.scaleMap && this.scaleMap[node.gen]) || 1);
        const finalS = baseS * scaleMult;
        this._setLeafTransform(node, finalS, i);
        this.instancedMesh.setMatrixAt(i, this._dummy.matrix);

        this.instancedMesh.instanceColor.setXYZ(i, r, g, b);
      });

      this.instancedMesh.instanceMatrix.needsUpdate = true;
      this.instancedMesh.instanceColor.needsUpdate = true;
    }

    /**
     * Project 3D node position to 2D screen coordinates
     * @param {Object} node
     * @param {Object} camera
     * @param {HTMLCanvasElement} canvas
     * @returns {Object|null} { x, y, visible }
     */
    projectNodeToScreen(node, camera, canvas) {
      if (!node || !camera || !canvas) return null;
      const instanceId = this.nodeIndexMap.get(node.id);
      if (this.instancedMesh && Number.isInteger(instanceId)) {
        this.instancedMesh.getMatrixAt(instanceId, this._instanceMatrix);
        this._projVector.setFromMatrixPosition(this._instanceMatrix)
          .applyMatrix4(this.instancedMesh.matrixWorld);
      } else {
        this._projVector.set(node.x, node.y, node.z);
      }
      this._projVector.project(camera);

      if (this._projVector.z > 1.0 || this._projVector.z < -1.0) {
        return { x: 0, y: 0, visible: false };
      }

      const rect = canvas.getBoundingClientRect();
      const sx = (this._projVector.x * 0.5 + 0.5) * rect.width;
      const sy = (-(this._projVector.y * 0.5) + 0.5) * rect.height;

      return { x: sx, y: sy, depth: this._projVector.z,
        visible: sx >= 0 && sx <= rect.width && sy >= 0 && sy <= rect.height };
    }

    /**
     * Clean up resources
     */
    dispose() {
      if (this.instancedMesh) {
        this.scene.remove(this.instancedMesh);
        if (this.instancedMesh.geometry) this.instancedMesh.geometry.dispose();
        if (this.instancedMesh.material) this.instancedMesh.material.dispose();
        this.instancedMesh = null;
      }
      if (this.edgeMesh) {
        this.scene.remove(this.edgeMesh);
        if (this.edgeMesh.geometry) this.edgeMesh.geometry.dispose();
        if (this.edgeMesh.material) this.edgeMesh.material.dispose();
        this.edgeMesh = null;
      }
      if (this.ancestryPathMesh) {
        this.scene.remove(this.ancestryPathMesh);
        if (this.ancestryPathMesh.geometry) this.ancestryPathMesh.geometry.dispose();
        if (this.ancestryPathMesh.material) this.ancestryPathMesh.material.dispose();
        this.ancestryPathMesh = null;
      }
    }
  }

  return MemberNodeRenderer;
});

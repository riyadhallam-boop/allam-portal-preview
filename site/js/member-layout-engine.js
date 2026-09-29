/**
 * ==============================================================================
 * Allam Family Portal — MemberLayoutEngine
 * Algorithmic 3D Spatial Layout Engine for Family Lineages
 *
 * Places members dynamically in 3D space by Branch, Generation, Parent & Sibling clusters.
 * Scales effortlessly from 393 to 5,000+ members.
 * ==============================================================================
 */

'use strict';

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.MemberLayoutEngine = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {

  const BRANCH_ANGLES = {
    'الفرع 1':    0.0,
    'الفرع 2':    Math.PI * 0.25,
    'الفرع 3':    Math.PI * 0.50,
    'الفرع 4':    Math.PI * 0.75,
    'الفرع 5':    Math.PI * 1.00,
    'الفرع 6': Math.PI * 1.25,
    'الفرع 7':  Math.PI * 1.50,
    'الفرع 8':    Math.PI * 1.75,
    'الجذور الرمزية': 0.0
  };

  function _wrapAngle(angle) {
    return Math.atan2(Math.sin(angle), Math.cos(angle));
  }

  // Base parameters for 5-meter tree geometry
  const DEFAULT_OPTIONS = {
    elevationLevels: {
      1: { baseHeight: 0.8,  spread: 0.25, baseRadius: 0.9,  radiusSpread: 0.35 },
      2: { baseHeight: 2.3,  spread: 0.35, baseRadius: 1.7,  radiusSpread: 0.40 },
      3: { baseHeight: 3.25, spread: 0.55, baseRadius: 2.35, radiusSpread: 0.45 },
      4: { baseHeight: 4.05, spread: 0.65, baseRadius: 2.65, radiusSpread: 0.50 }
    },
    sectorSpan: (Math.PI * 2) / 8, // 45 degrees per branch
    sectorSafetyMargin: 0.85      // 85% of sector used to prevent branch overlap
  };

  class MemberLayoutEngine {
    constructor(options = {}) {
      this.options = { ...DEFAULT_OPTIONS, ...options };
    }

    /**
     * Compute 3D coordinates for all graph nodes.
     * @param {GenealogyGraph|Map|Array} graphInput
     * @returns {Object} { positionedNodes, edges, branchCentroids, bounds }
     */
    computeLayout(graphInput) {
      // Normalize input nodes
      let nodes = [];
      if (graphInput && typeof graphInput.getAllMembers === 'function') {
        nodes = graphInput.getAllMembers();
      } else if (graphInput instanceof Map) {
        nodes = Array.from(graphInput.values());
      } else if (Array.isArray(graphInput)) {
        nodes = graphInput;
      }

      const placementGeneration = node => {
        if (node.id === 'root' || !node.parentId || !Number.isFinite(node.depth) || node.depth < 1) {
          return Math.min(4, Math.max(1, node.gen || 2));
        }
        return Math.min(4, Math.max(1, node.depth));
      };

      // Group by branch and generation
      const branchGenGroups = new Map();
      nodes.forEach(node => {
        const key = `${node.branch}__gen${placementGeneration(node)}`;
        if (!branchGenGroups.has(key)) {
          branchGenGroups.set(key, []);
        }
        branchGenGroups.get(key).push(node);
      });

      const positionedNodes = [];
      const nodePositionMap = new Map();
      const branchCentroids = {};
      const siblingGroups = new Map();
      const partnerGroups = new Map();
      const confirmedPartnerId = node => node.partnerLinkStatus === 'CONFIRMED' ? node.partnerId : null;
      nodes.forEach(node => {
        if (!node.parentId) return;
        if (!siblingGroups.has(node.parentId)) siblingGroups.set(node.parentId, []);
        siblingGroups.get(node.parentId).push(node);
      });
      nodes.forEach(node => {
        const partnerId = confirmedPartnerId(node);
        if (!partnerId) return;
        if (!partnerGroups.has(partnerId)) partnerGroups.set(partnerId, []);
        partnerGroups.get(partnerId).push(node);
      });
      const sourceOrder = new Map(nodes.map((node, index) => [node.id, index]));
      const placementOrder = nodes.slice().sort((a, b) => {
        const generationDelta = placementGeneration(a) - placementGeneration(b);
        if (generationDelta) return generationDelta;
        if (confirmedPartnerId(a) === b.id) return 1;
        if (confirmedPartnerId(b) === a.id) return -1;
        return 0;
      });

      // Initialize branch centroids accumulator
      Object.keys(BRANCH_ANGLES).forEach(b => {
        branchCentroids[b] = { x: 0, y: 0, z: 0, count: 0 };
      });

      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;
      let minZ = Infinity, maxZ = -Infinity;

      placementOrder.forEach(node => {
        let x = 0, y = 0, z = 0;

        if (node.id === 'root') {
          // Root rests at the foundation center of the plinth
          x = 0;
          y = 0.55;
          z = 0;
        } else {
          const gen = placementGeneration(node);
          const levelCfg = this.options.elevationLevels[gen] || this.options.elevationLevels[2];
          const baseBranchAngle = BRANCH_ANGLES[node.branch] !== undefined
            ? BRANCH_ANGLES[node.branch]
            : 0;

          // Find position within branch generation cohort
          const groupKey = `${node.branch}__gen${gen}`;
          const cohort = branchGenGroups.get(groupKey) || [node];
          const indexInCohort = cohort.indexOf(node);
          const totalInCohort = cohort.length;

          // Place children in a small fan around their actual/inferred parent.
          // Members without a defensible parent stay in their branch sector.
          let azimuth = baseBranchAngle;
          const parent = node.parentId ? nodePositionMap.get(node.parentId) : null;
          const confirmedPartner = confirmedPartnerId(node);
          const partner = confirmedPartner ? nodePositionMap.get(confirmedPartner) : null;
          const partners = partner ? (partnerGroups.get(partner.id) || [node]) : [];
          const partnerIndex = partner ? partners.findIndex(item => item.id === node.id) : -1;
          if (parent && parent.id !== 'root') {
            const siblings = siblingGroups.get(node.parentId) || [node];
            const siblingIndex = siblings.findIndex(sibling => sibling.id === node.id);
            const normalizedOffset = siblings.length > 1 ? siblingIndex / (siblings.length - 1) - 0.5 : 0;
            const fanWidth = Math.min(this.options.sectorSpan * 0.72, Math.max(0.12, Math.sqrt(siblings.length) * 0.075));
            azimuth = Math.atan2(parent.z, parent.x) + normalizedOffset * fanWidth;
          } else if (partner) {
            const side = partnerIndex % 2 === 0 ? 1 : -1;
            azimuth = Math.atan2(partner.z, partner.x) + side * 0.06 * (Math.floor(partnerIndex / 2) + 1);
          } else {
            const usableAngle = this.options.sectorSpan * this.options.sectorSafetyMargin;
            const normalizedOffset = totalInCohort > 1 ? (indexInCohort / (totalInCohort - 1)) - 0.5 : 0;
            azimuth += normalizedOffset * usableAngle;
          }

          // Radius with deterministic pseudo-jitter
          const hashVal = this._deterministicHash(node.id);
          const radiusJitter = (hashVal % 100) / 100 - 0.5;
          let radius = levelCfg.baseRadius + (radiusJitter * levelCfg.radiusSpread);
          if (partner) radius = Math.hypot(partner.x, partner.z) + (partnerIndex % 2 === 0 ? 0.09 : -0.09);

          // Height with subtle layer staggering
          const heightJitter = ((hashVal >> 3) % 100) / 100 - 0.5;
          const siblingCount = node.parentId ? (siblingGroups.get(node.parentId) || []).length : totalInCohort;
          const siblingIndex = node.parentId
            ? (siblingGroups.get(node.parentId) || []).findIndex(sibling => sibling.id === node.id)
            : indexInCohort;
          const siblingOffset = siblingCount > 1 ? (siblingIndex / (siblingCount - 1)) - 0.5 : 0;
          y = levelCfg.baseHeight + (heightJitter * levelCfg.spread) + (siblingOffset * Math.min(0.8, Math.sqrt(siblingCount) * 0.16));
          if (partner) y = partner.y + (partnerIndex % 2 === 0 ? 0.035 : -0.035);

          // Polar to Cartesian
          x = Math.cos(azimuth) * radius;
          z = Math.sin(azimuth) * radius;
        }

        const positioned = {
          ...node,
          x: parseFloat(x.toFixed(4)),
          y: parseFloat(y.toFixed(4)),
          z: parseFloat(z.toFixed(4))
        };

        positionedNodes.push(positioned);
        nodePositionMap.set(node.id, positioned);

        // Accumulate centroid for branch
        if (node.branch && branchCentroids[node.branch]) {
          branchCentroids[node.branch].x += positioned.x;
          branchCentroids[node.branch].y += positioned.y;
          branchCentroids[node.branch].z += positioned.z;
          branchCentroids[node.branch].count++;
        }

        // Bounding box
        minX = Math.min(minX, positioned.x);
        maxX = Math.max(maxX, positioned.x);
        minY = Math.min(minY, positioned.y);
        maxY = Math.max(maxY, positioned.y);
        minZ = Math.min(minZ, positioned.z);
        maxZ = Math.max(maxZ, positioned.z);
      });

      positionedNodes.sort((a, b) => sourceOrder.get(a.id) - sourceOrder.get(b.id));

      // Finalize centroids
      Object.keys(branchCentroids).forEach(b => {
        const c = branchCentroids[b];
        if (c.count > 0) {
          c.x = parseFloat((c.x / c.count).toFixed(3));
          c.y = parseFloat((c.y / c.count).toFixed(3));
          c.z = parseFloat((c.z / c.count).toFixed(3));
        } else {
          const angle = BRANCH_ANGLES[b] || 0;
          c.x = Math.cos(angle) * 2.0;
          c.y = 2.5;
          c.z = Math.sin(angle) * 2.0;
        }
      });

      // Build ancestry edges (parent -> child links in 3D)
      const edges = [];
      positionedNodes.forEach(node => {
        if (!node.parentId) return;
        const parent = nodePositionMap.get(node.parentId);
        if (parent) {
          edges.push({
            fromId: parent.id,
            toId: node.id,
            from: { x: parent.x, y: parent.y, z: parent.z },
            to:   { x: node.x,   y: node.y,   z: node.z },
            branch: node.branch,
            gen: node.gen
          });
        }
      });

      return {
        positionedNodes,
        nodePositionMap,
        edges,
        branchCentroids,
        bounds: { minX, maxX, minY, maxY, minZ, maxZ }
      };
    }

    /** Place leaf markers on branch surfaces relative to the loaded Blender anchors. */
    attachToTree(layout, treeRoot, THREE, getBranchAnchor) {
      if (!layout || !treeRoot || !THREE) return layout;
      treeRoot.updateMatrixWorld(true);

      const branchNames = Object.keys(BRANCH_ANGLES).filter(name => name !== 'الجذور الرمزية');
      const treeOrigin = treeRoot.getWorldPosition(new THREE.Vector3());
      const branchInfo = new Map();
      const branchPoints = new Map(branchNames.map(name => [name, []]));
      for (const name of branchNames) {
        const anchor = typeof getBranchAnchor === 'function' ? getBranchAnchor(name) : null;
        const hasWorldPosition = anchor && Number.isFinite(anchor.x) && Number.isFinite(anchor.z);
        branchInfo.set(name, {
          anchor: hasWorldPosition ? anchor : null,
          angle: hasWorldPosition
            ? Math.atan2(anchor.z - treeOrigin.z, anchor.x - treeOrigin.x)
            : BRANCH_ANGLES[name]
        });
      }

      const seen = new Set();
      const point = new THREE.Vector3();
      const normal = new THREE.Vector3();
      const normalMatrix = new THREE.Matrix3();
      let sampledVertices = 0;

      treeRoot.traverse(mesh => {
        if (!mesh.isMesh || !mesh.geometry || !mesh.geometry.attributes.position) return;
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        const meshName = (mesh.name || '').toLowerCase();
        const materialNames = materials.map(material => (material && material.name || '').toLowerCase());
        const searchableName = `${meshName} ${materialNames.join(' ')}`;
        if (/leaf|leaves|foliage/.test(searchableName) || !/branch|trunk|bark|wood/.test(searchableName)) return;

        const positions = mesh.geometry.attributes.position;
        const normals = mesh.geometry.attributes.normal;
        normalMatrix.getNormalMatrix(mesh.matrixWorld);
        const stride = Math.max(1, Math.floor(positions.count / 16000));
        for (let i = 0; i < positions.count; i += stride) {
          point.fromBufferAttribute(positions, i).applyMatrix4(mesh.matrixWorld);
          const radialX = point.x - treeOrigin.x;
          const radialZ = point.z - treeOrigin.z;
          const radius = Math.hypot(radialX, radialZ);
          if (point.y < 1.35 || point.y > 4.15 || radius < 0.24) continue;
          const key = `${Math.round(point.x * 30)}:${Math.round(point.y * 30)}:${Math.round(point.z * 30)}`;
          if (seen.has(key)) continue;
          seen.add(key);
          const angle = Math.atan2(radialZ, radialX);
          let nearestBranch = null;
          let nearestAngleDelta = Infinity;
          for (const name of branchNames) {
            const delta = Math.abs(_wrapAngle(angle - branchInfo.get(name).angle));
            if (delta < nearestAngleDelta) {
              nearestBranch = name;
              nearestAngleDelta = delta;
            }
          }
          if (!nearestBranch) continue;

          if (normals && i < normals.count) {
            normal.fromBufferAttribute(normals, i).applyMatrix3(normalMatrix).normalize();
          } else {
            normal.set(radialX / radius, 0, radialZ / radius);
          }
          if (!Number.isFinite(normal.x) || !Number.isFinite(normal.y) || !Number.isFinite(normal.z) || normal.lengthSq() < 0.5) {
            normal.set(radialX / radius, 0, radialZ / radius);
          }
          branchPoints.get(nearestBranch).push({
            x: point.x, y: point.y, z: point.z, radius, angle,
            nx: normal.x, ny: normal.y, nz: normal.z
          });
          sampledVertices++;
        }
      });

      if (sampledVertices < 80) return layout;

      const occupied = new Set();
      const placedByBranch = new Map();
      const branchCounts = new Map(branchNames.map(name => [name,
        layout.positionedNodes.filter(node => node.branch === name).length]));
      const positionMap = new Map();
      const positionedNodes = layout.positionedNodes.map(node => {
        if (node.id === 'root' || !BRANCH_ANGLES.hasOwnProperty(node.branch)) {
          const unchanged = { ...node };
          positionMap.set(node.id, unchanged);
          return unchanged;
        }

        const branch = branchInfo.get(node.branch);
        if (!branch) {
          const unchanged = { ...node };
          positionMap.set(node.id, unchanged);
          return unchanged;
        }

        // Each GLB anchor owns the nearest angular surface points. This keeps
        // branch identity aligned with the actual asset instead of assuming that
        // branch names follow fixed 45-degree sectors.
        const candidates = branchPoints.get(node.branch) || [];
        if (!candidates.length) {
          const unchanged = { ...node };
          positionMap.set(node.id, unchanged);
          return unchanged;
        }

        const sourceBranchAngle = BRANCH_ANGLES[node.branch];
        const sourceNodeAngle = Math.atan2(node.z, node.x);
        const branchOffset = _wrapAngle(sourceNodeAngle - sourceBranchAngle);
        const branchAngle = branch.angle;
        const desiredAngle = branchAngle + branchOffset;
        const desiredRadius = Math.min(1.9, Math.max(0.7, Math.hypot(node.x, node.z) * 0.75));
        const desiredY = Math.min(3.85, Math.max(1.55,
          (branch.anchor && Number.isFinite(branch.anchor.y) ? branch.anchor.y : 2.35) + (node.y - 2.3) * 0.54));
        const desiredX = treeOrigin.x + Math.cos(desiredAngle) * desiredRadius;
        const desiredZ = treeOrigin.z + Math.sin(desiredAngle) * desiredRadius;
        const tangentX = -Math.sin(branchAngle);
        const tangentZ = Math.cos(branchAngle);
        const placed = placedByBranch.get(node.branch) || [];
        const minScreenSpacing = Math.max(0.12, Math.min(0.23,
          1.22 / Math.sqrt(branchCounts.get(node.branch) || 1)));

        let best = null;
        let bestScore = Infinity;
        for (const candidate of candidates) {
          const cell = `${Math.round(candidate.x * 11)}:${Math.round(candidate.y * 11)}:${Math.round(candidate.z * 11)}`;
          if (occupied.has(cell)) continue;
          const tangent = (candidate.x - treeOrigin.x) * tangentX + (candidate.z - treeOrigin.z) * tangentZ;
          if (placed.some(other => Math.hypot(tangent - other.tangent,
            candidate.y - other.y) < minScreenSpacing)) continue;
          const dx = candidate.x - desiredX;
          const dy = candidate.y - desiredY;
          const dz = candidate.z - desiredZ;
          const score = dx * dx + dz * dz + dy * dy * 1.7 - candidate.radius * 0.035;
          if (score < bestScore) {
            best = { candidate, cell };
            bestScore = score;
          }
        }

        // Dense branches may exhaust the preferred spacing; keep every person
        // attached to wood instead of falling back to the old floating ring.
        if (!best) {
          for (const candidate of candidates) {
            const cell = `${Math.round(candidate.x * 11)}:${Math.round(candidate.y * 11)}:${Math.round(candidate.z * 11)}`;
            if (occupied.has(cell)) continue;
            const dx = candidate.x - desiredX;
            const dy = candidate.y - desiredY;
            const dz = candidate.z - desiredZ;
            const score = dx * dx + dz * dz + dy * dy * 1.7;
            if (score < bestScore) {
              best = { candidate, cell };
              bestScore = score;
            }
          }
        }

        if (!best) {
          const unchanged = { ...node };
          positionMap.set(node.id, unchanged);
          return unchanged;
        }
        occupied.add(best.cell);
        placed.push({
          tangent: (best.candidate.x - treeOrigin.x) * tangentX + (best.candidate.z - treeOrigin.z) * tangentZ,
          y: best.candidate.y
        });
        placedByBranch.set(node.branch, placed);
        const surfaceOffset = 0.04;
        const attached = {
          ...node,
          x: +(best.candidate.x + best.candidate.nx * surfaceOffset).toFixed(4),
          y: +(best.candidate.y + best.candidate.ny * surfaceOffset).toFixed(4),
          z: +(best.candidate.z + best.candidate.nz * surfaceOffset).toFixed(4),
          attachedToTree: true,
          surfaceNormal: {
            x: best.candidate.nx,
            y: best.candidate.ny,
            z: best.candidate.nz
          }
        };
        positionMap.set(node.id, attached);
        return attached;
      });

      const edges = layout.edges.map(edge => ({
        ...edge,
        from: positionMap.get(edge.fromId) || edge.from,
        to: positionMap.get(edge.toId) || edge.to
      }));
      const branchCentroids = {};
      for (const name of Object.keys(layout.branchCentroids)) {
        const members = positionedNodes.filter(node => node.branch === name);
        branchCentroids[name] = members.length ? {
          x: members.reduce((sum, node) => sum + node.x, 0) / members.length,
          y: members.reduce((sum, node) => sum + node.y, 0) / members.length,
          z: members.reduce((sum, node) => sum + node.z, 0) / members.length,
          count: members.length
        } : layout.branchCentroids[name];
      }

      return {
        ...layout,
        positionedNodes,
        nodePositionMap: positionMap,
        edges,
        branchCentroids,
        bounds: {
          minX: Math.min(...positionedNodes.map(node => node.x)),
          maxX: Math.max(...positionedNodes.map(node => node.x)),
          minY: Math.min(...positionedNodes.map(node => node.y)),
          maxY: Math.max(...positionedNodes.map(node => node.y)),
          minZ: Math.min(...positionedNodes.map(node => node.z)),
          maxZ: Math.max(...positionedNodes.map(node => node.z))
        },
        attachment: {
          sampledVertices,
          attachedNodes: positionedNodes.filter(node => node.attachedToTree).length,
          branchCandidates: Object.fromEntries(branchNames.map(name => [name, branchPoints.get(name).length]))
        }
      };
    }

    /**
     * Fast deterministic hash to ensure consistent layout across reloads
     * @private
     */
    _deterministicHash(str) {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
      }
      return Math.abs(hash);
    }
  }

  MemberLayoutEngine.BRANCH_ANGLES = BRANCH_ANGLES;
  return MemberLayoutEngine;
});

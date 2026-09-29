/**
 * ==============================================================================
 * Allam Family Portal — CameraNavigationController
 * Smooth Cinematic Camera Flight Controller for 3D Family Tree
 *
 * Implements smooth cubic ease-out interpolation for camera position and lookAt target.
 * Synchronizes with Three.js OrbitControls without coordinate jitter.
 * ==============================================================================
 */

'use strict';

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CameraNavigationController = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {

  const DEFAULT_OVERVIEW_CAM = { x: 0, y: 2.35, z: 8.4 };
  const DEFAULT_OVERVIEW_TARGET = { x: 0, y: 2.1, z: 0 };

  class CameraNavigationController {
    /**
     * @param {Object} THREE
     * @param {Object} camera
     * @param {Object} controls
     */
    constructor(THREE, camera, controls) {
      this.THREE = THREE;
      this.camera = camera;
      this.controls = controls;

      this.isAnimating = false;
      this.startTime = 0;
      this.duration = 1200;

      this.startPos = new THREE.Vector3();
      this.targetPos = new THREE.Vector3();
      this.startLookAt = new THREE.Vector3();
      this.targetLookAt = new THREE.Vector3();

      // Cubic ease-out
      this.easing = t => 1 - Math.pow(1 - t, 3);
    }

    /**
     * Start smooth flight to specified camera position and target
     * @param {Object} targetCamPos - { x, y, z }
     * @param {Object} targetLookAt - { x, y, z }
     * @param {number} [duration=1200]
     */
    flyTo(targetCamPos, targetLookAt, duration = 1200) {
      if (!this.camera || !this.controls) return;

      this.controls.autoRotate = false;
      this.isAnimating = true;
      this.startTime = performance.now();
      this.duration = Math.max(300, duration);

      this.startPos.copy(this.camera.position);
      this.targetPos.set(targetCamPos.x, targetCamPos.y, targetCamPos.z);

      this.startLookAt.copy(this.controls.target);
      this.targetLookAt.set(targetLookAt.x, targetLookAt.y, targetLookAt.z);
    }

    /**
     * Fly to hero overview framing the full 5m tree
     * @param {number} [duration=1200]
     */
    flyToOverview(duration = 1200) {
      this.flyTo(DEFAULT_OVERVIEW_CAM, DEFAULT_OVERVIEW_TARGET, duration);
    }

    /**
     * Fly to face a specific branch
     * @param {string} branchKey
     * @param {Object} [centroid]
     * @param {number} [duration=1300]
     */
    flyToBranch(branchKey, centroid, duration = 1300, branchAnchor = null) {
      const bIdx = [
        'الفرع 1', 'الفرع 2', 'الفرع 3', 'الفرع 4',
        'الفرع 5', 'الفرع 6', 'الفرع 7', 'الفرع 8'
      ].indexOf(branchKey);

      if (bIdx === -1) {
        this.flyToOverview(duration);
        return;
      }

      const hasAnchor = branchAnchor && Number.isFinite(branchAnchor.x) && Number.isFinite(branchAnchor.z);
      const angle = hasAnchor
        ? Math.atan2(branchAnchor.z, branchAnchor.x)
        : (bIdx / 8) * Math.PI * 2;
      const dist = 9.6;

      const lookX = centroid ? centroid.x : hasAnchor ? branchAnchor.x * 0.72 : Math.cos(angle) * 0.65;
      const lookZ = centroid ? centroid.z : hasAnchor ? branchAnchor.z * 0.72 : Math.sin(angle) * 0.65;
      const lookY = centroid && Number.isFinite(centroid.y)
        ? centroid.y
        : hasAnchor && Number.isFinite(branchAnchor.y) ? branchAnchor.y : 2.15;
      const camX = lookX + Math.cos(angle) * dist;
      const camZ = lookZ + Math.sin(angle) * dist;
      const camY = Math.max(2.8, Math.min(5.1, lookY + 1.55));

      this.flyTo({ x: camX, y: camY, z: camZ }, { x: lookX, y: lookY, z: lookZ }, duration);
    }

    /**
     * Fly close to inspect an individual member node
     * @param {Object} node - { x, y, z }
     * @param {number} [duration=1100]
     */
    flyToNode(node, duration = 1100) {
      if (!node) return;

      const lookTarget = { x: node.x, y: node.y + 0.08, z: node.z };

      // Gentle radial offset to face node from outside
      let dx = node.x;
      let dz = node.z;
      const len = Math.hypot(dx, dz) || 1;
      dx /= len;
      dz /= len;

      const camPos = {
        x: node.x + dx * 10.5,
        y: node.y + 2.2,
        z: node.z + dz * 10.5
      };

      this.flyTo(camPos, lookTarget, duration);
    }

    /**
     * Frame an entire ancestry path
     * @param {Array<Object>} pathNodes
     * @param {number} [duration=1200]
     */
    flyToAncestryPath(pathNodes, duration = 1200) {
      if (!pathNodes || pathNodes.length === 0) return;
      if (pathNodes.length === 1) {
        this.flyToNode(pathNodes[0], duration);
        return;
      }

      // Compute bounding center
      let cx = 0, cy = 0, cz = 0;
      pathNodes.forEach(n => {
        cx += n.x;
        cy += n.y;
        cz += n.z;
      });
      cx /= pathNodes.length;
      cy /= pathNodes.length;
      cz /= pathNodes.length;

      const target = pathNodes[pathNodes.length - 1];
      const dist = 12.0;
      const dirX = target.x || 1;
      const dirZ = target.z || 0;
      const len = Math.hypot(dirX, dirZ) || 1;

      const camPos = {
        x: cx + (dirX / len) * dist,
        y: cy + 1.2,
        z: cz + (dirZ / len) * dist
      };

      this.flyTo(camPos, { x: cx, y: cy + 0.4, z: cz }, duration);
    }

    /**
     * Update camera tween in render loop
     * @returns {boolean} true if actively animating
     */
    update() {
      if (!this.isAnimating) return false;

      const now = performance.now();
      const elapsed = now - this.startTime;
      const progress = Math.min(1.0, elapsed / this.duration);
      const eased = this.easing(progress);

      this.camera.position.lerpVectors(this.startPos, this.targetPos, eased);
      this.controls.target.lerpVectors(this.startLookAt, this.targetLookAt, eased);

      if (progress >= 1.0) {
        this.isAnimating = false;
        // Resume gentle orbit damping
        this.controls.update();
      }

      return true;
    }
  }

  return CameraNavigationController;
});

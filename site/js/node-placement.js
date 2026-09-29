/**
 * AllamNodePlacement — Dynamic 3D Position Engine
 * Converts family member JSON data into 3D spatial coordinates
 * for placement around the Allam Family Tree model.
 *
 * Architecture: Blender = Visual Tree Body | Web = Family Data Layer
 * 393 members across 8 branches, 4 generations
 */

'use strict';

const ALLAM_BRANCHES = [
  'الفرع 1',    // 0 → angle 0
  'الفرع 2',    // 1 → angle 45
  'الفرع 3',    // 2 → angle 90
  'الفرع 4',    // 3 → angle 135
  'الفرع 5',    // 4 → angle 180
  'الفرع 6', // 5 → angle 225
  'الفرع 7',  // 6 → angle 270
  'الفرع 8'     // 7 → angle 315
];

// Radial ring radii per generation (relative to 5.0m tall tree geometry)
const GEN_RADIUS = {
  1: 1.0,   // Gen 1 = root buttress zone (0.8m - 1.2m radius)
  2: 1.7,   // Gen 2 = main branch origins (1.5m - 1.9m radius)
  3: 2.4,   // Gen 3 = middle foliage canopy (2.2m - 2.6m radius)
  4: 2.7    // Gen 4 = outer crown canopy (2.5m - 3.0m radius)
};

// Y-axis height per generation (distributes 393 nodes across full 5-meter tree)
const GEN_HEIGHT = {
  1: 0.8,   // Gen 1 = lower trunk & roots (resting on plinth)
  2: 2.4,   // Gen 2 = mid trunk where the 8 branch boughs split
  3: 3.3,   // Gen 3 = lush foliage mid-tier among the sculpted leaves
  4: 4.1    // Gen 4 = high crown reaching towards the tree peak
};

// Spread angle (radians) allocated per branch sector
const BRANCH_SECTOR = (Math.PI * 2) / 8;

/**
 * Build 3D positions for all family members.
 * @param {Array} members - symbolic-preview-records.json data
 * @returns {Array} members with x, y, z fields added
 */
function buildFamilyPositions(members) {
  // Count members per branch to space them properly
  const branchCounters = {};
  const branchTotals = {};

  members.forEach(m => {
    const key = `${m.branch}_${m.gen}`;
    branchTotals[key] = (branchTotals[key] || 0) + 1;
  });

  return members.map(member => {
    if (member.id === 'root') {
      return { ...member, x: 0, y: 0.5, z: 0, isRoot: true };
    }

    const branchIdx = Math.max(0, ALLAM_BRANCHES.indexOf(member.branch));
    const gen = member.gen || 2;

    // Base angle for this branch sector
    const baseAngle = (branchIdx / 8) * Math.PI * 2;

    // Within-sector offset key
    const sectorKey = `${member.branch}_${gen}`;
    branchCounters[sectorKey] = (branchCounters[sectorKey] || 0) + 1;
    const posInSector = branchCounters[sectorKey] - 1;
    const totalInSector = branchTotals[sectorKey] || 1;

    // Spread within sector: distribute members across branch angle
    const spreadFraction = totalInSector > 1
      ? (posInSector / (totalInSector - 1)) - 0.5
      : 0;
    const spreadAngle = spreadFraction * BRANCH_SECTOR * 0.75;

    // Final angle
    const theta = baseAngle + spreadAngle;

    // Radius & height by generation
    const radius = GEN_RADIUS[gen] || 2.1;
    const baseY = GEN_HEIGHT[gen] || 0.9;

    // Slight vertical jitter for organic feel
    const jitterY = ((posInSector % 3) - 1) * 0.12;

    const x = Math.cos(theta) * radius;
    const z = Math.sin(theta) * radius;
    const y = baseY + jitterY;

    return {
      ...member,
      x: parseFloat(x.toFixed(3)),
      y: parseFloat(y.toFixed(3)),
      z: parseFloat(z.toFixed(3)),
      theta,
      branchIdx,
      sectorPos: posInSector
    };
  });
}

/**
 * Get parent position for a member (used to draw lineage lines).
 * Simple heuristic: parent is one generation above in same branch.
 * @param {Object} member
 * @param {Array} allPositioned
 * @returns {Object|null}
 */
function findParent(member, allPositioned) {
  if (member.gen <= 1) return null;
  const parentGen = member.gen - 1;

  // Find closest positioned member one gen above in same branch
  const candidates = allPositioned.filter(m =>
    m.branch === member.branch && m.gen === parentGen
  );

  if (!candidates.length) {
    // Fallback: gen1 founders
    const founders = allPositioned.filter(m => m.gen === 1);
    return founders[0] || null;
  }

  // Pick the candidate with closest angular position
  let best = candidates[0];
  let minAngleDiff = Math.abs(best.theta - member.theta);
  candidates.forEach(c => {
    const diff = Math.abs(c.theta - member.theta);
    if (diff < minAngleDiff) {
      minAngleDiff = diff;
      best = c;
    }
  });
  return best;
}

/**
 * Build complete positioned graph with parent links.
 * @param {Array} members
 * @returns {{ nodes: Array, edges: Array }}
 */
function buildFamilyGraph(members) {
  const nodes = buildFamilyPositions(members);

  const edges = [];
  nodes.forEach(node => {
    if (node.isRoot) return;
    const parent = findParent(node, nodes);
    if (parent) {
      edges.push({ from: parent, to: node });
    }
  });

  return { nodes, edges };
}

// Export for use in tree-engine.js
window.AllamNodePlacement = {
  buildFamilyPositions,
  buildFamilyGraph,
  ALLAM_BRANCHES,
  GEN_RADIUS,
  GEN_HEIGHT
};

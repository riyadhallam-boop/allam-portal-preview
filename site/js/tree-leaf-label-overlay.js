/**
 * Clickable Arabic leaf labels projected from the same 3D anchors as the leaves.
 * SVG leaders identify display positions only; they do not encode family ties.
 */
'use strict';

(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.TreeLeafLabelOverlay = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const SVG_NS = 'http://www.w3.org/2000/svg';

  class TreeLeafLabelOverlay {
    constructor(container, nodeRenderer, onSelect, onHover) {
      this.container = container;
      this.nodeRenderer = nodeRenderer;
      this.labels = container.querySelector('#tree-leaf-labels');
      this.lines = container.querySelector('#tree-leaf-connectors');
      this.pageTree = container.closest('#page-tree') || container;
      this.onSelect = onSelect;
      this.onHover = onHover;
      this.nodes = [];
      this.buttons = new Map();
      this.placements = new Map();
      this.shown = new Set();
      this.dirty = true;
      this.lastUpdate = 0;
      this.onKeyDown = event => this._handleTabKey(event);
      this.pageTree.addEventListener('keydown', this.onKeyDown, true);
    }

    setNodes(nodes) {
      this.nodes = nodes || [];
      this.labels.replaceChildren();
      this.lines.replaceChildren();
      this.buttons.clear();
      this.placements.clear();
      this.shown.clear();
      this.dirty = true;
    }

    markDirty() { this.dirty = true; }

    _handleTabKey(event) {
      if (event.key !== 'Tab' || !this.labels) return;
      const visibleButtons = [...this.buttons.values()]
        .map(entry => entry.button)
        .filter(button => button.isConnected && button.style.visibility === 'visible' &&
          button.style.pointerEvents !== 'none');
      if (!visibleButtons.length) return;

      const active = this.container.ownerDocument.activeElement;
      const currentIndex = visibleButtons.indexOf(active);
      if (currentIndex >= 0) {
        const nextIndex = currentIndex + (event.shiftKey ? -1 : 1);
        if (nextIndex >= 0 && nextIndex < visibleButtons.length) {
          event.preventDefault();
          visibleButtons[nextIndex].focus({ preventScroll: true });
        }
        return;
      }

      // Enter the label list from the adjacent search field and return from
      // the canvas zoom controls without asking the browser to scroll to a
      // label whose position is being reprojected during camera motion.
      const search = this.pageTree.querySelector('#tree-3d-search-input');
      const zoomIn = this.container.querySelector('#btn-tree-zoom-in');
      if (!event.shiftKey && active === search) {
        event.preventDefault();
        visibleButtons[0].focus({ preventScroll: true });
      } else if (event.shiftKey && active === zoomIn) {
        event.preventDefault();
        visibleButtons[visibleButtons.length - 1].focus({ preventScroll: true });
      }
    }

    _cleanName(rawName) {
      return String(rawName || '').replace(/\s*\.{2,}\s*/g, '').replace(/\s+/g, ' ').trim() || String(rawName || '');
    }

    _buttonFor(node, isBranch) {
      const displayName = this._cleanName(node.name);
      let entry = this.buttons.get(node.id);
      if (entry) {
        if (entry.isBranch !== isBranch) {
          entry.isBranch = isBranch;
          entry.button.className = 'tree-leaf-label ' + (node.id === 'root' ? 'root-label' :
            isBranch ? 'branch-label' : 'person-label');
          entry.button.textContent = node.id === 'root' ? 'الجذور الرمزية' : isBranch ? node.branch : displayName;
          entry.width = entry.button.offsetWidth;
          entry.height = entry.button.offsetHeight;
        }
        return entry;
      }
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'tree-leaf-label ' + (node.id === 'root' ? 'root-label' :
        isBranch ? 'branch-label' : 'person-label');
      button.dir = 'rtl';
      button.textContent = node.id === 'root' ? 'الجذور الرمزية' : isBranch ? node.branch : displayName;
      button.title = displayName || button.textContent;
      button.setAttribute('aria-label', button.title);
      button.dataset.memberId = node.id;
      button.style.visibility = 'hidden';
      button.style.left = '-1000px';
      button.addEventListener('click', () => this.onSelect(node.id));
      button.addEventListener('pointerenter', () => this.onHover(node));
      button.addEventListener('pointerleave', () => this.onHover(null));
      this.labels.appendChild(button);
      entry = { button, width: button.offsetWidth, height: button.offsetHeight, isBranch };
      this.buttons.set(node.id, entry);
      return entry;
    }

    _orderedNodes() {
      const renderer = this.nodeRenderer;
      const overview = renderer.activeBranch === 'all' && renderer.activeGeneration === 'all' &&
        renderer.highlightedAncestrySet.size === 0;
      const selectedId = this.nodes[renderer.selectedIndex]?.id || null;
      let nodes = this.nodes.filter(node => renderer.visibleNodeIds.has(node.id) &&
        node.relation !== 'عنصر عرض فقط' &&
        (renderer.activeBranch === 'all' || node.id !== 'root'));

      const isSpouse = node => node.partnerLinkStatus === 'CONFIRMED' && Boolean(node.partnerId);

      const rank = node => {
        if (node.id === selectedId) return -3;
        if (node.id === 'root') return -2;
        if (renderer.overviewIds.has(node.id) || node.relation === 'نفسه') return -1;
        const g = Math.max(1, node.gen || 4);
        if (isSpouse(node)) return 10 + g;
        return g;
      };
      nodes.sort((a, b) => rank(a) - rank(b) || a.y - b.y || a.id.localeCompare(b.id));

      // With a generation filter across all branches, distribute labels fairly.
      if (!overview && renderer.activeBranch === 'all' && renderer.activeGeneration !== 'all') {
        const groups = new Map();
        for (const node of nodes) {
          const key = node.branch || 'root';
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key).push(node);
        }
        const spread = [];
        while ([...groups.values()].some(group => group.length)) {
          for (const group of groups.values()) if (group.length) spread.push(group.shift());
        }
        nodes = spread;
      }
      return { nodes, overview, selectedId };
    }

    _positions(anchor, width, height, stageWidth) {
      const right = anchor.x < stageWidth / 2;
      const shifts = [0, -37, 37, -74, 74, -111, 111, -148, 148, -185, 185];
      const positions = [];
      for (const shift of shifts) {
        positions.push({ key: `r${shift}`, x: anchor.x + 18, y: anchor.y - height / 2 + shift });
        positions.push({ key: `l${shift}`, x: anchor.x - width - 18, y: anchor.y - height / 2 + shift });
      }
      positions.sort((a, b) => {
        const aPreferred = (right && a.key[0] === 'r') || (!right && a.key[0] === 'l');
        const bPreferred = (right && b.key[0] === 'r') || (!right && b.key[0] === 'l');
        return Number(bPreferred) - Number(aPreferred);
      });
      return positions;
    }

    update(camera, canvas, now = performance.now()) {
      if (!this.labels || !this.lines || !camera || !canvas) return;
      if (!this.dirty && now - this.lastUpdate < 32) return;
      this.dirty = false;
      this.lastUpdate = now;

      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (!width || !height) return;
      const drawerEl = this.container.querySelector('#safe-drawer.open');
      const drawerOpen = Boolean(drawerEl);
      const reservedLeft = drawerOpen ? Math.max((drawerEl.offsetWidth || 280) + 18, Math.min(330, width * 0.34)) : 0;
      const maxLabels = width < 580 ? 7 : width < 900 ? 10 : drawerOpen ? 12 : 16;
      const { nodes, overview, selectedId } = this._orderedNodes();
      const chosen = new Set();
      const occupied = [];
      const paths = document.createDocumentFragment();
      let placedCount = 0;

      for (const node of nodes) {
        if (placedCount >= maxLabels) break;
        const anchor = this.nodeRenderer.projectNodeToScreen(node, camera, canvas);
        if (!anchor || !anchor.visible || anchor.x < 10 || anchor.x > width - 10 ||
            anchor.y < 15 || anchor.y > height - 15) continue;
        const isBranch = overview && node.id !== 'root' && node.id !== selectedId;
        const entry = this._buttonFor(node, isBranch);
        const candidates = this._positions(anchor, entry.width, entry.height, width);
        if (overview && isBranch) {
          const nearX = anchor.x < width / 2
            ? Math.max(14, anchor.x - entry.width - 58)
            : Math.min(width - entry.width - 14, anchor.x + 58);
          candidates.unshift(...[0, -39, 39, -78, 78, -117, 117].map(shift => ({
            key: `n${shift}`, x: nearX, y: anchor.y - entry.height / 2 + shift
          })));
        }
        const previous = this.placements.get(node.id);
        if (previous) candidates.sort((a, b) => Number(b.key === previous) - Number(a.key === previous));
        // A keyboard-focused label moves with the camera while its 3D anchor is
        // projected. Moving the focused DOM button on every frame makes the
        // browser scroll the whole page to keep it in view. Keep that one label
        // at its current screen position until focus moves; its leader still
        // tracks the real 3D anchor, and the next label can use the new layout.
        const focusedPosition = entry.button.matches(':focus-visible') &&
          entry.button.style.visibility === 'visible'
          ? { x: Number.parseFloat(entry.button.style.left), y: Number.parseFloat(entry.button.style.top) }
          : null;
        const focusedPositionIsValid = focusedPosition && Number.isFinite(focusedPosition.x) &&
          Number.isFinite(focusedPosition.y) && focusedPosition.x >= reservedLeft + 7 &&
          focusedPosition.y >= 8 && focusedPosition.x + entry.width <= width - 7 &&
          focusedPosition.y + entry.height <= height - 8;
        const target = focusedPositionIsValid ? { ...focusedPosition, key: 'focused' } : candidates.find(candidate => {
          const { x, y } = candidate;
          if (x < reservedLeft + 7 || y < 8 || x + entry.width > width - 7 || y + entry.height > height - 8) return false;
          return occupied.every(box => x + entry.width + 8 < box.x || box.x + box.width + 8 < x ||
            y + entry.height + 6 < box.y || box.y + box.height + 6 < y);
        });
        if (!target) continue;

        entry.button.style.left = `${target.x}px`;
        entry.button.style.top = `${target.y}px`;
        entry.button.style.visibility = 'visible';
        entry.button.style.pointerEvents = 'auto';
        entry.button.classList.toggle('selected', node.id === this.nodes[this.nodeRenderer.selectedIndex]?.id);
        this.placements.set(node.id, target.key);
        chosen.add(node.id);
        occupied.push({ x: target.x, y: target.y, width: entry.width, height: entry.height });
        placedCount++;

        const portX = Math.max(target.x, Math.min(target.x + entry.width, anchor.x));
        const portY = Math.max(target.y, Math.min(target.y + entry.height, anchor.y));
        const path = document.createElementNS(SVG_NS, 'path');
        path.setAttribute('d', `M ${anchor.x.toFixed(1)} ${anchor.y.toFixed(1)} L ${portX.toFixed(1)} ${portY.toFixed(1)}`);
        path.setAttribute('class', `tree-leaf-leader${node.id === selectedId ? ' selected' : ''}`);
        paths.appendChild(path);
        const dot = document.createElementNS(SVG_NS, 'circle');
        dot.setAttribute('cx', anchor.x.toFixed(1));
        dot.setAttribute('cy', anchor.y.toFixed(1));
        dot.setAttribute('r', node.id === selectedId ? '4' : '3.2');
        dot.setAttribute('class', `tree-leaf-anchor-dot${node.id === selectedId ? ' selected' : ''}`);
        paths.appendChild(dot);
      }

      for (const id of this.shown) {
        if (chosen.has(id)) continue;
        const entry = this.buttons.get(id);
        if (entry) {
          entry.button.style.visibility = 'hidden';
          entry.button.style.pointerEvents = 'none';
          entry.button.classList.remove('selected');
        }
      }
      this.shown = chosen;
      this.labels.dataset.visibleCount = String(placedCount);
      this.lines.setAttribute('viewBox', `0 0 ${width} ${height}`);
      this.lines.replaceChildren(paths);
    }

    dispose() {
      this.pageTree.removeEventListener('keydown', this.onKeyDown, true);
      this.labels.replaceChildren();
      this.lines.replaceChildren();
      this.buttons.clear();
      this.placements.clear();
      this.shown.clear();
    }
  }

  return TreeLeafLabelOverlay;
});

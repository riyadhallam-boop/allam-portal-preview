/**
 * ==============================================================================
 * Allam Family Portal — GenealogyGraph
 * Normalized Bidirectional Genealogy Graph Engine
 *
 * Decouples family tree data from visual 3D meshes.
 * Resolves parent-child links, ancestry paths, sibling clusters, and descendants.
 * ==============================================================================
 */

'use strict';

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.GenealogyGraph = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {

  const BRANCH_NAMES = [
    'الفرع 1',
    'الفرع 2',
    'الفرع 3',
    'الفرع 4',
    'الفرع 5',
    'الفرع 6',
    'الفرع 7',
    'الفرع 8'
  ];

  // Entrance records in the local display dataset. This is a visual hierarchy,
  // not evidence that a parent-child relationship has been independently verified.
  const DISPLAY_BRANCH_ENTRANCES = Object.freeze({});

  // Preview relationship evidence is omitted from this static bundle.
  const PREVIEW_PARENT_LINKS = Object.freeze({});

  function normalizeForSearch(value) {
    return String(value || '').replace(/[\u064B-\u065F\u0670\u0640]/g, '')
      .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي')
      .replace(/[()،.\-]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
  }

  function searchNameTokens(value) {
    return normalizeForSearch(value)
      .replace(/(^| )عبد\s+(الله|الاله|الرحمن|الرحيم)(?= |$)/g, '$1عبد$2')
      .split(' ').filter(Boolean);
  }

  class GenealogyGraph {
    constructor() {
      this.nodes = new Map();           // id -> node
      this.branchIndex = new Map();     // branchKey -> Set of ids
      this.generationIndex = new Map(); // genNumber -> Set of ids
      this.rootId = 'root';
      this.isLoaded = false;
      this.pendingConfirmedRelations = [];
    }

    /**
     * Load and normalize raw member dataset (e.g. from symbolic-preview-records.json)
     * @param {Array<Object>} rawMembers
     * @returns {GenealogyGraph}
     */
    load(rawMembers) {
      this.nodes.clear();
      this.branchIndex.clear();
      this.generationIndex.clear();
      this.pendingConfirmedRelations = [];

      if (!Array.isArray(rawMembers)) {
        throw new Error('[GenealogyGraph] Expected array of members');
      }

      this.pendingConfirmedRelations = Object.entries(PREVIEW_PARENT_LINKS)
        .filter(([childId]) => !rawMembers.some(member => String(member.id || '').trim() === childId))
        .map(([childId, relation]) => ({
          childId,
          parentId: relation.parentId,
          evidenceId: relation.evidenceId,
          decisionStatus: 'PENDING_ID_BINDING'
        }));

      const ids = new Set();

      // Step 1: Ingest normalized nodes
      rawMembers.forEach(raw => {
        const id = String(raw.id || '').trim();
        if (!id) return;
        if (ids.has(id)) throw new Error(`[GenealogyGraph] Duplicate person ID: ${id}`);
        ids.add(id);

        const node = {
          id,
          name: id === 'root' ? 'الجذور الرمزية' : String(raw.name || '').trim(),
          branch: String(raw.branch || 'الجذور الرمزية').trim(),
          gen: parseInt(raw.gen, 10) || 2,
          relation: String(raw.relation || '').trim(),
          parentId: raw.parentId ? String(raw.parentId).trim() : null,
          parentLinkStatus: raw.parentId ? 'SOURCE_ID' : 'UNRESOLVED',
          parentLinkSource: raw.parentId ? 'member_dataset' : null,
          candidateParentId: null,
          partnerId: null,
          candidatePartnerIds: [],
          partnerLinkStatus: 'UNRESOLVED',
          evidenceRefs: raw.parentEvidenceId ? [String(raw.parentEvidenceId)] : [],
          gender: raw.gender || (raw.name && (raw.name.includes('بنت') || raw.relation?.includes('ابنة')) ? 'F' : 'M'),
          status: id === 'root' ? 'جذر تقني لترتيب العرض' : (raw.status || 'موثق رسمياً في السجل'),
          bio: id === 'root'
            ? 'يجمع مداخل الفروع الثمانية بصريًا؛ اعتماد صلات النسب يتطلب مراجعة مصدر مستقل.'
            : (raw.bio || ''),
          children: [],
          siblings: [],
          ancestorPath: [],
          depth: 0,
          isTechnicalAnchor: id === 'root',
          meta: { ...raw }
        };

        this.nodes.set(id, node);

        // Index by branch
        if (!this.branchIndex.has(node.branch)) {
          this.branchIndex.set(node.branch, new Set());
        }
        this.branchIndex.get(node.branch).add(id);

        // Index by generation
        if (!this.generationIndex.has(node.gen)) {
          this.generationIndex.set(node.gen, new Set());
        }
        this.generationIndex.get(node.gen).add(id);
      });

      // Step 2: Establish root if not explicitly in dataset
      if (!this.nodes.has('root')) {
        const rootNode = {
          id: 'root',
          name: 'الجذور الرمزية',
          branch: 'الجذور الرمزية',
          gen: 1,
          relation: 'المؤسسون الأوائل',
          parentId: null,
          gender: 'M',
          status: 'جذر تقني لترتيب العرض',
          bio: 'يجمع مداخل الفروع الثمانية بصريًا؛ اعتماد صلات النسب يتطلب مراجعة مصدر مستقل.',
          children: [],
          siblings: [],
          ancestorPath: [],
          depth: 0,
          isTechnicalAnchor: true,
          isSyntheticRoot: true,
          meta: { technicalAnchor: true }
        };
        this.nodes.set('root', rootNode);
      }

      // Step 3: Resolve parent-child relationships and branch parentage
      this._resolveHierarchy();

      // Step 4: Compute ancestry paths for every node
      this._computeAncestryPaths();

      this.isLoaded = true;
      return this;
    }

    /**
     * Resolves child arrays, sibling clusters, and automatic parent linking
     * @private
     */
    _resolveHierarchy() {
      // Link children and parents
      this.nodes.forEach(node => {
        if (node.id === 'root') return;

        const sourcePartnerId = String(node.meta.partnerId || '').trim();
        const hasConfirmedPartnerEvidence = node.meta.partnerLinkStatus === 'CONFIRMED' &&
          Boolean(node.meta.partnerEvidenceId) && sourcePartnerId &&
          sourcePartnerId !== node.id && this.nodes.has(sourcePartnerId);
        if (hasConfirmedPartnerEvidence) {
          node.partnerId = sourcePartnerId;
          node.partnerLinkStatus = 'CONFIRMED';
          node.partnerLinkSource = String(node.meta.partnerEvidenceId);
        } else {
          const inferredPartnerIds = this._inferPartnerCandidates(node);
          if (sourcePartnerId && sourcePartnerId !== node.id && this.nodes.has(sourcePartnerId)) {
            inferredPartnerIds.push(sourcePartnerId);
          }
          node.candidatePartnerIds = [...new Set(inferredPartnerIds)];
          node.partnerLinkStatus = node.candidatePartnerIds.length ? 'CANDIDATE_REVIEW' : 'UNRESOLVED';
        }

        const confirmed = PREVIEW_PARENT_LINKS[node.id];
        if (confirmed && !this.nodes.has(confirmed.parentId)) {
          node.candidateParentId = confirmed.parentId;
          node.parentLinkStatus = 'PENDING_ID_BINDING';
          node.parentLinkSource = confirmed.evidenceId;
          node.evidenceRefs.push(confirmed.evidenceId);
        } else if (confirmed && this.nodes.has(confirmed.parentId)) {
          if (node.parentId && node.parentId !== confirmed.parentId) {
            node.conflictingParentId = node.parentId;
            node.parentId = null;
            node.candidateParentId = confirmed.parentId;
            node.parentLinkStatus = 'CONFLICT_REVIEW';
            node.evidenceRefs.push(confirmed.evidenceId);
          } else {
            node.parentId = confirmed.parentId;
            node.parentLinkStatus = 'CONFIRMED';
            node.parentLinkSource = confirmed.evidenceId;
            node.evidenceRefs.push(confirmed.evidenceId);
          }
        }

        if (node.parentId && (node.parentId === node.id || !this.nodes.has(node.parentId))) {
          node.candidateParentId = node.parentId;
          node.parentId = null;
          node.parentLinkStatus = 'CONFLICT_REVIEW';
        }

        // Text and name matching create review candidates only. They never
        // become parent-child edges or confirmed ancestry paths by themselves.
        if (!node.parentId && !['CONFLICT_REVIEW', 'PENDING_ID_BINDING'].includes(node.parentLinkStatus)) {
          const candidate = this._inferParentId(node);
          if (candidate === 'root') {
            node.parentId = 'root';
            node.parentLinkStatus = 'DISPLAY_TOPOLOGY';
            node.parentLinkSource = 'local_branch_entrance_map';
          } else if (candidate) {
            node.candidateParentId = candidate;
            node.parentLinkStatus = 'CANDIDATE_REVIEW';
            node.parentLinkSource = 'relation_text_candidate';
          }
        }

        if (node.parentId && this._wouldCreateCycle(node.id, node.parentId)) {
          node.candidateParentId = node.parentId;
          node.parentId = null;
          node.parentLinkStatus = 'CONFLICT_REVIEW';
        }

        // Add to parent's children array
        const parent = this.nodes.get(node.parentId);
        if (parent && parent.id !== node.id) {
          if (!parent.children.includes(node.id)) {
            parent.children.push(node.id);
          }
        }
      });

      // Resolve siblings (nodes sharing the same parentId)
      const parentGroups = new Map();
      this.nodes.forEach(node => {
        if (!node.parentId) return;
        if (!parentGroups.has(node.parentId)) {
          parentGroups.set(node.parentId, []);
        }
        parentGroups.get(node.parentId).push(node.id);
      });

      parentGroups.forEach(siblingIds => {
        siblingIds.forEach(id => {
          const node = this.nodes.get(id);
          if (node) {
            node.siblings = siblingIds.filter(sibId => sibId !== id);
          }
        });
      });
    }

    _wouldCreateCycle(childId, parentId) {
      const visited = new Set([childId]);
      let current = this.nodes.get(parentId);
      while (current) {
        if (visited.has(current.id)) return true;
        visited.add(current.id);
        current = current.parentId ? this.nodes.get(current.parentId) : null;
      }
      return false;
    }

    _inferParentId(node) {
      const relation = String(node.relation || '').trim();
      // Marriage relations describe spouses, not parent-child links.
      if (/زوجة|زوج\s|أرملة|ارملة/.test(relation)) return null;

      if (node.gen === 1 && relation === 'نفسه' &&
          DISPLAY_BRANCH_ENTRANCES[node.branch] === node.id) return 'root';

      const kinship = relation.match(/(?:أبناء|ابناء|ابن|إبن|ابنة|إبنة)\s+(?:الابن|الإبن|الأبن|الحفيد|الحفيدة|الابنة|الإبنة)\s+(.+)$/);
      const normalize = value => String(value || '')
        .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
        .replace(/[أإآٱ]/g, 'ا')
        .replace(/ى/g, 'ي')
        .replace(/[()،.\-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (kinship) {
        const target = normalize(kinship[1].replace(/\([^)]*\)/g, ' '));
        if (target) {
          const namedCandidates = Array.from(this.nodes.values()).filter(candidate => {
            if (candidate.id === node.id || candidate.branch !== node.branch) return false;
            const candidateName = normalize(candidate.name);
            return candidateName.includes(target) || target.includes(candidateName);
          });
          let candidates = namedCandidates.filter(candidate => {
            if (candidate.gen !== node.gen - 1) return false;
            const candidateKinship = String(candidate.relation || '').match(/(?:أبناء|ابناء|ابن|إبن|ابنة|إبنة)\s+(?:الابن|الإبن|الأبن|الحفيد|الحفيدة|الابنة|الإبنة)\s+(.+)$/);
            if (!candidateKinship) return true;
            const candidateTarget = normalize(candidateKinship[1].replace(/\([^)]*\)/g, ' '));
            // Avoid mistaking another explicitly grouped child of the same
            // named parent for the parent when the dataset's generation field
            // is inconsistent.
            return candidateTarget !== target;
          });
          if (candidates.length > 1) {
            const targetTokens = new Set(target.split(' '));
            const childTokens = new Set(normalize(node.name).split(' '));
            const scored = candidates.map(candidate => {
              const score = normalize(candidate.name).split(' ').filter(token =>
                token.length > 1 && !targetTokens.has(token) && childTokens.has(token)
              ).length;
              return { candidate, score };
            });
            const bestScore = Math.max(...scored.map(item => item.score));
            const best = scored.filter(item => item.score === bestScore);
            if (bestScore > 0 && best.length === 1) candidates = [best[0].candidate];
          }
          if (candidates.length === 1) return candidates[0].id;

          // Some source records carry a generation number that conflicts with
          // their explicit "child of X" relation. Permit a same-generation
          // parent only when X is named directly and that candidate is not
          // itself recorded as a descendant cohort.
          candidates = namedCandidates.filter(candidate =>
            candidate.gen === node.gen && !/(?:أبناء|ابناء|ابن|إبن|ابنة|إبنة)\s+/.test(candidate.relation || '')
          );
          if (candidates.length === 1) return candidates[0].id;
        }
      }

      if (node.gen === 2) {
        const founders = Array.from(this.nodes.values()).filter(candidate =>
          candidate.id !== 'root' && candidate.gen === 1 &&
          candidate.branch === node.branch && candidate.relation === 'نفسه'
        );
        return founders.length === 1 ? founders[0].id : null;
      }
      return null;
    }

    _inferPartnerCandidates(node) {
      const relation = String(node.relation || '').trim();
      const match = relation.match(/(?:زوجة|زوج|أرملة|ارملة)\s+(?:الابن|الإبن|الأبن|الحفيد|الحفيدة|الابنة|الإبنة)\s+(.+)$/);
      if (!match) return [];
      const normalize = value => String(value || '')
        .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
        .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي')
        .replace(/[()،.\-]/g, ' ').replace(/\s+/g, ' ').trim();
      const target = normalize(match[1]);
      if (!target) return [];
      return Array.from(this.nodes.values()).filter(candidate =>
        candidate.id !== node.id && candidate.gen === node.gen && candidate.branch === node.branch &&
        !/(?:زوجة|زوج\s|أرملة|ارملة)/.test(candidate.relation || '') &&
        normalize(candidate.name).includes(target)
      ).map(candidate => candidate.id);
    }

    /** Return possible partner records for review; never treats name matching as a relationship. */
    getPartnerCandidates(id) {
      const member = this.getNode(id);
      if (!member || member.id === 'root') return [];
      return (member.candidatePartnerIds || []).map(personId => ({
        personId,
        reasons: [member.meta.partnerId === personId ? 'SOURCE_ID_REVIEW' : 'RELATION_TEXT_HINT'],
        decisionStatus: 'CANDIDATE_REVIEW'
      }));
    }

    /** Return possible parents and the independent clues behind each hit. */
    getParentCandidates(id) {
      const child = this.getNode(id);
      if (!child || child.id === 'root') return [];
      const childTokens = searchNameTokens(child.name);
      const relationHint = normalizeForSearch(child.relation);
      const results = [];
      this.nodes.forEach(candidate => {
        if (candidate.id === child.id || candidate.id === 'root') return;
        const candidateTokens = searchNameTokens(candidate.name);
        const reasons = [];
        for (const length of [2, 3, 4]) {
          if (childTokens.length >= length && candidateTokens.length >= length &&
              childTokens.slice(-length).join(' ') === candidateTokens.slice(-length).join(' ')) {
            reasons.push(`NAME_SUFFIX_${length}`);
          }
        }
        if (childTokens.length > 1 && candidateTokens[0] === childTokens[1]) {
          reasons.push('POSSIBLE_PARENT_GIVEN_NAME');
        }
        if (candidateTokens.length && relationHint.includes(candidateTokens[0])) {
          reasons.push('RELATION_TEXT_HINT');
        }
        if (!reasons.length) return;
        if (candidate.branch === child.branch) reasons.push('SAME_DISPLAY_BRANCH');
        if (candidate.gen < child.gen) reasons.push('GENERATION_CONTEXT');
        results.push({ personId: candidate.id, reasons,
          decisionStatus: child.parentId === candidate.id && child.parentLinkStatus === 'CONFIRMED'
            ? 'CONFIRMED' : 'CANDIDATE_REVIEW' });
      });
      return results;
    }

    /**
     * Precomputes full ancestry path from root down to each individual
     * @private
     */
    _computeAncestryPaths() {
      this.nodes.forEach(node => {
        const path = [];
        let curr = node;
        const visited = new Set();

        while (curr && !visited.has(curr.id)) {
          visited.add(curr.id);
          path.unshift(curr.id);
          if (!curr.parentId || curr.id === 'root' || curr.parentLinkStatus === 'DISPLAY_TOPOLOGY') break;
          curr = this.nodes.get(curr.parentId);
        }

        node.ancestorPath = path;
        node.depth = path.length - 1;
      });
    }

    /**
     * Get a node by ID
     * @param {string} id
     * @returns {Object|null}
     */
    getNode(id) {
      return this.nodes.get(String(id).trim()) || null;
    }

    /**
     * Returns the full ancestry path (array of node objects) from root to target
     * @param {string} id
     * @returns {Array<Object>}
     */
    getAncestryPath(id) {
      const node = this.getNode(id);
      if (!node || !node.ancestorPath) return [];
      return node.ancestorPath.map(nodeId => this.nodes.get(nodeId)).filter(Boolean);
    }

    /**
     * Returns array of descendant node objects under the given subtree
     * @param {string} id
     * @returns {Array<Object>}
     */
    getDescendants(id) {
      const results = [];
      const queue = [id];
      const visited = new Set([id]);

      while (queue.length > 0) {
        const currentId = queue.shift();
        const node = this.nodes.get(currentId);
        if (node && node.children) {
          node.children.forEach(childId => {
            if (!visited.has(childId)) {
              visited.add(childId);
              const childNode = this.nodes.get(childId);
              if (childNode) {
                results.push(childNode);
                queue.push(childId);
              }
            }
          });
        }
      }
      return results;
    }

    /**
     * Returns siblings of the specified node
     * @param {string} id
     * @returns {Array<Object>}
     */
    getSiblings(id) {
      const node = this.getNode(id);
      if (!node || !node.siblings) return [];
      return node.siblings.map(sibId => this.nodes.get(sibId)).filter(Boolean);
    }

    /**
     * Query graph by filter criteria
     * @param {Object} options - { branch, generation, query }
     * @returns {Array<Object>}
     */
    query({ branch = 'all', generation = 'all', query = '' } = {}) {
      const q = normalizeForSearch(query);
      const results = [];

      this.nodes.forEach(node => {
        if (node.id === 'root') {
          if (branch === 'all' && generation === 'all' && !q) {
            results.push(node);
          }
          return;
        }

        // Branch filter
        if (branch !== 'all' && node.branch !== branch) return;

        // Generation filter
        if (generation !== 'all' && node.gen !== parseInt(generation, 10)) return;

        // Query text match
        if (q) {
          const matchName = normalizeForSearch(node.name).includes(q);
          const matchRel  = normalizeForSearch(node.relation).includes(q);
          const matchBranch = normalizeForSearch(node.branch).includes(q);
          if (!matchName && !matchRel && !matchBranch) return;
        }

        results.push(node);
      });

      return results;
    }

    /**
     * Search by name/keyword
     * @param {string} text
     * @returns {Array<Object>}
     */
    search(text) {
      return this.query({ query: text });
    }

    /**
     * Returns all members as a flat array
     * @returns {Array<Object>}
     */
    getAllMembers() {
      return Array.from(this.nodes.values());
    }

    /**
     * Returns verified family members from the register (excludes technical root anchor)
     * @returns {Array<Object>}
     */
    getRealMembers() {
      return Array.from(this.nodes.values()).filter(n => !n.isTechnicalAnchor && n.id !== 'root');
    }

    /**
     * Returns count of verified real family members from register
     * @returns {number}
     */
    getRealMemberCount() {
      return this.getRealMembers().length;
    }

    /**
     * Returns total node count in the 3D graph (393 real + 1 technical root anchor)
     * @returns {number}
     */
    getTotalNodeCount() {
      return this.nodes.size;
    }

    /**
     * Returns total node count
     * @returns {number}
     */
    get size() {
      return this.nodes.size;
    }

    /**
     * Returns branch summary metrics
     * @returns {Object}
     */
    getBranchStats() {
      const stats = {};
      BRANCH_NAMES.forEach(b => {
        stats[b] = { total: 0, gen2: 0, gen3: 0, gen4: 0 };
      });

      this.nodes.forEach(node => {
        if (node.id === 'root') return;
        if (!stats[node.branch]) {
          stats[node.branch] = { total: 0, gen2: 0, gen3: 0, gen4: 0 };
        }
        stats[node.branch].total++;
        if (node.gen === 2) stats[node.branch].gen2++;
        else if (node.gen === 3) stats[node.branch].gen3++;
        else if (node.gen >= 4) stats[node.branch].gen4++;
      });

      return stats;
    }

    /**
     * Generate synthetic family dataset for scale benchmarking (393, 1000, 2500, 5000)
     * @param {number} targetCount
     * @returns {Array<Object>}
     */
    static createSyntheticDataset(targetCount = 1000) {
      const branches = BRANCH_NAMES;
      const firstNamesM = ['5', 'أحمد', 'عبدالله', '2', 'اسم تجريبي', 'فهد', 'عمر', 'سعود', 'تركي', 'فيصل', 'اسم تجريبي', 'اسم تجريبي', 'اسم تجريبي', 'اسم تجريبي'];
      const firstNamesF = ['سارة', 'نورة', 'فاطمة', 'مها', 'ريم', '8', 'هند', '6', '7', 'منى', 'لطيفة', 'أمل'];

      const list = [
        {
          id: 'root',
          name: 'جذور افتراضية للتوضيح',
          branch: 'الجذور الرمزية',
          gen: 1,
          relation: 'المؤسسون الأوائل',
          status: 'الجذور التاريخية'
        }
      ];

      // 8 Branch Patriarchs/Matriarchs (Gen 2)
      const gen2Ids = [];
      branches.forEach((b, i) => {
        const id = `synth_b_${i + 1}`;
        const isF = b.includes('6') || b.includes('7') || b.includes('8');
        const name = b.replace('فرع ', '') + ' للجذور الرمزية';
        list.push({
          id,
          name: isF ? b.replace('فرع ', '') + ' للجذور الرمزية' : name,
          branch: b,
          gen: 2,
          parentId: 'root',
          relation: isF ? 'ابنة مباشرة' : 'ابن مباشر'
        });
        gen2Ids.push(id);
      });

      // Generate remaining members across Gen 3 and Gen 4
      let count = list.length;
      let nextId = 1;

      while (count < targetCount) {
        const branchIdx = (nextId % branches.length);
        const branch = branches[branchIdx];
        const isFemale = nextId % 3 === 0;
        const fn = isFemale
          ? firstNamesF[nextId % firstNamesF.length]
          : firstNamesM[nextId % firstNamesM.length];

        const gen = nextId % 4 === 0 ? 4 : 3;
        const parentId = gen === 3
          ? gen2Ids[branchIdx]
          : `synth_m_${Math.max(1, nextId - 8)}`;

        list.push({
          id: `synth_m_${nextId}`,
          name: `${fn} بن ${branches[branchIdx].replace('فرع ', '')} افتراضي (${nextId})`,
          branch,
          gen,
          parentId,
          relation: gen === 3 ? 'حفيد' : 'ابن حفيد'
        });

        count++;
        nextId++;
      }

      return list;
    }
  }

  GenealogyGraph.BRANCH_NAMES = BRANCH_NAMES;
  return GenealogyGraph;
});

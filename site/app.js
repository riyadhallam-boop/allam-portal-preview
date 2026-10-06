(() => {
  'use strict';

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const PREVIEW_READ_ONLY = true;

  // Local storage keys
  const STORAGE_KEYS = {
    requests: 'allam-family-requests-v2',
    privacy: 'allam-family-privacy-v2',
    speeches: 'allam-family-speeches-v2',
    contributions: 'allam-family-contributions-v2',
    rsvp: 'allam-family-rsvp-v2',
    googleServices: 'allam-family-google-services-v2',
    driveArchive: 'allam-family-drive-archive-v1',
    userAccounts: 'allam-family-user-accounts-v1',
    currentUser: 'allam-family-current-user-v1',
    treeDelta: 'allam-family-tree-delta-v1'
  };

  // Google Services default configuration for Allam Family Portal
  const DEFAULT_GOOGLE_SERVICES = {
    meetUrl: '#',
    driveUrl: '#',
    mapsUrl: '#'
  };

  let googleServices = loadStored(STORAGE_KEYS.googleServices, DEFAULT_GOOGLE_SERVICES);
  // Auto-heal any legacy placeholder URLs that caused 404s in Google Drive or Meet
  if (
    !googleServices ||
    typeof googleServices !== 'object' ||
    !googleServices.driveUrl ||
    String(googleServices.driveUrl).includes('1AllamFamilyArchive') ||
    googleServices.driveUrl === '#' ||
    !googleServices.meetUrl ||
    String(googleServices.meetUrl).includes('alm-allam-mtg') ||
    !googleServices.mapsUrl ||
    String(googleServices.mapsUrl).startsWith('#')
  ) {
    googleServices = {
      meetUrl: (!googleServices?.meetUrl || String(googleServices.meetUrl).includes('alm-allam-mtg'))
        ? DEFAULT_GOOGLE_SERVICES.meetUrl
        : googleServices.meetUrl,
      driveUrl: (!googleServices?.driveUrl || String(googleServices.driveUrl).includes('1AllamFamilyArchive') || googleServices.driveUrl === '#')
        ? DEFAULT_GOOGLE_SERVICES.driveUrl
        : googleServices.driveUrl,
      mapsUrl: (!googleServices?.mapsUrl || String(googleServices.mapsUrl).startsWith('#'))
        ? DEFAULT_GOOGLE_SERVICES.mapsUrl
        : googleServices.mapsUrl
    };
    try { localStorage.setItem(STORAGE_KEYS.googleServices, JSON.stringify(googleServices)); } catch (_) {}
  }

  // 8 Branches of the Allam Family
  const BRANCHES = [
    'الفرع 1',
    'الفرع 2',
    'الفرع 3',
    'الفرع 4',
    'الفرع 5',
    'الفرع 6',
    'الفرع 7',
    'الفرع 8'
  ];

  // Synthetic preview data only; these branch cards are not family records.
  const MOCK_TREE_DATA = [
    { id: 'root', name: 'الجذور الرمزية — جذر توضيحي', branch: 'الأصل العائلي', gen: 1, relation: 'جذر للمعاينة فقط', status: 'رمزي — غير معتمد كنسب', bio: 'عقدة عرض توضيحية؛ لا تمثل سجلًا عائليًا.' },
    { id: 'b_hussein', recordType: 'main_branch', parentId: 'root', name: 'الفرع 1', branch: 'الفرع 1', gen: 2, relation: 'فرع توضيحي', status: 'رمزي — غير معتمد كنسب', bio: 'عقدة عرض توضيحية؛ لا تحتوي أسماء أفراد.' },
    { id: 'b_khalid', recordType: 'main_branch', parentId: 'root', name: 'الفرع 2', branch: 'الفرع 2', gen: 2, relation: 'فرع توضيحي', status: 'رمزي — غير معتمد كنسب', bio: 'عقدة عرض توضيحية؛ لا تحتوي أسماء أفراد.' },
    { id: 'b_kamal', recordType: 'main_branch', parentId: 'root', name: 'الفرع 3', branch: 'الفرع 3', gen: 2, relation: 'فرع توضيحي', status: 'رمزي — غير معتمد كنسب', bio: 'عقدة عرض توضيحية؛ لا تحتوي أسماء أفراد.' },
    { id: 'b_jamal', recordType: 'main_branch', parentId: 'root', name: 'الفرع 4', branch: 'الفرع 4', gen: 2, relation: 'فرع توضيحي', status: 'رمزي — غير معتمد كنسب', bio: 'عقدة عرض توضيحية؛ لا تحتوي أسماء أفراد.' },
    { id: 'b_muhammad', recordType: 'main_branch', parentId: 'root', name: 'الفرع 5', branch: 'الفرع 5', gen: 2, relation: 'فرع توضيحي', status: 'رمزي — غير معتمد كنسب', bio: 'عقدة عرض توضيحية؛ لا تحتوي أسماء أفراد.' },
    { id: 'b_mastoora', recordType: 'main_branch', parentId: 'root', name: 'الفرع 6', branch: 'الفرع 6', gen: 2, relation: 'فرع توضيحي', status: 'رمزي — غير معتمد كنسب', bio: 'عقدة عرض توضيحية؛ لا تحتوي أسماء أفراد.' },
    { id: 'b_najiya', recordType: 'main_branch', parentId: 'root', name: 'الفرع 7', branch: 'الفرع 7', gen: 2, relation: 'فرع توضيحي', status: 'رمزي — غير معتمد كنسب', bio: 'عقدة عرض توضيحية؛ لا تحتوي أسماء أفراد.' },
    { id: 'b_huda', recordType: 'main_branch', parentId: 'root', name: 'الفرع 8', branch: 'الفرع 8', gen: 2, relation: 'فرع توضيحي', status: 'رمزي — غير معتمد كنسب', bio: 'عقدة عرض توضيحية؛ لا تحتوي أسماء أفراد.' },
    { id: 'demo_hussein', parentId: 'b_hussein', name: 'مثال توضيحي', branch: 'الفرع 1', gen: 3, relation: 'عنصر عرض فقط', status: 'رمزي — غير معتمد كنسب', bio: 'شخصية اصطناعية لعرض التفاعل؛ ليست فردًا من العائلة.' },
    { id: 'demo_khalid', parentId: 'b_khalid', name: 'مثال توضيحي', branch: 'الفرع 2', gen: 3, relation: 'عنصر عرض فقط', status: 'رمزي — غير معتمد كنسب', bio: 'شخصية اصطناعية لعرض التفاعل؛ ليست فردًا من العائلة.' },
    { id: 'demo_kamal', parentId: 'b_kamal', name: 'مثال توضيحي', branch: 'الفرع 3', gen: 3, relation: 'عنصر عرض فقط', status: 'رمزي — غير معتمد كنسب', bio: 'شخصية اصطناعية لعرض التفاعل؛ ليست فردًا من العائلة.' },
    { id: 'demo_jamal', parentId: 'b_jamal', name: 'مثال توضيحي', branch: 'الفرع 4', gen: 3, relation: 'عنصر عرض فقط', status: 'رمزي — غير معتمد كنسب', bio: 'شخصية اصطناعية لعرض التفاعل؛ ليست فردًا من العائلة.' },
    { id: 'demo_muhammad', parentId: 'b_muhammad', name: 'مثال توضيحي', branch: 'الفرع 5', gen: 3, relation: 'عنصر عرض فقط', status: 'رمزي — غير معتمد كنسب', bio: 'شخصية اصطناعية لعرض التفاعل؛ ليست فردًا من العائلة.' },
    { id: 'demo_mastoora', parentId: 'b_mastoora', name: 'مثال توضيحي', branch: 'الفرع 6', gen: 3, relation: 'عنصر عرض فقط', status: 'رمزي — غير معتمد كنسب', bio: 'شخصية اصطناعية لعرض التفاعل؛ ليست فردًا من العائلة.' },
    { id: 'demo_najiya', parentId: 'b_najiya', name: 'مثال توضيحي', branch: 'الفرع 7', gen: 3, relation: 'عنصر عرض فقط', status: 'رمزي — غير معتمد كنسب', bio: 'شخصية اصطناعية لعرض التفاعل؛ ليست فردًا من العائلة.' },
    { id: 'demo_huda', parentId: 'b_huda', name: 'مثال توضيحي', branch: 'الفرع 8', gen: 3, relation: 'عنصر عرض فقط', status: 'رمزي — غير معتمد كنسب', bio: 'شخصية اصطناعية لعرض التفاعل؛ ليست فردًا من العائلة.' }
  ];

  // Default Multimedia News, Quotes & Contributions
  // No fabricated family news, authors, approvals, or member counts in a demo build.
  const DEFAULT_CONTRIBUTIONS = [];

  // State
  let requests = loadStored(STORAGE_KEYS.requests, []);
  let contributions = loadStored(STORAGE_KEYS.contributions, DEFAULT_CONTRIBUTIONS);
  let activeContribFilter = 'all';
  let toastTimer;
  let hero3dShowingRender = false;

  // Helpers
  function loadStored(storageKey, fallback) {
    try {
      const data = localStorage.getItem(storageKey);
      return data ? JSON.parse(data) : fallback;
    } catch {
      return fallback;
    }
  }

  function saveStored(storageKey, data) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(data));
      return true;
    } catch {
      showToast('تعذر الحفظ في التخزين المحلي. تحقق من إعدادات المتصفح.');
      return false;
    }
  }

  function escapeHTML(str) {
    return String(str || '').replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function showToast(message) {
    const toast = $('#toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 3500);
  }

  // Navigation
  function gotoPage(page, updateHistory = true) {
    const targetPage = $('#page-' + page);
    if (!targetPage) return;

    $$('.page').forEach(p => p.classList.toggle('active', p.id === 'page-' + page));
    $$('.nav-item').forEach(btn => btn.classList.toggle('active', btn.dataset.page === page));

    const pageLabels = {
      home: 'الرئيسية',
      members: 'دليل الأعضاء',
      tree: 'شجرة النسب 3D',
      meetings: 'اللقاءات ومساحة الإعداد',
      council: 'مجلس العائلة الافتراضية (مقترح)',
      contributions: 'أخبار العائلة والوسائط',
      fund: 'صندوق العائلة',
      requests: 'الحسابات والأدوار',
      reports: 'التقارير والمؤشرات'
    };

    $('#page-crumb').textContent = pageLabels[page] || 'الرئيسية';
    const nextHash = '#' + page;
    if (updateHistory && location.hash !== nextHash) history.pushState(null, '', nextHash);
    $('.sidebar').classList.remove('open');
    $('#mobile-menu')?.setAttribute('aria-expanded', 'false');
    $('#mobile-menu')?.setAttribute('aria-label', 'فتح القائمة');
    window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });

    if (page === 'members') renderMembers();
    if (page === 'contributions') renderContributions();
    if (page === 'requests' || page === 'home' || page === 'reports') renderRequests();
    if (page === 'tree') initFamilyTree();
  }

  // ==========================================
  // 1. HERO 3D PROCEDURAL TREE CANVAS (WebGL/Canvas)
  // ==========================================
  function initHero3D() {
    const canvas = $('#hero-3d-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width, height;
    function resize() {
      width = canvas.parentElement.clientWidth;
      height = canvas.parentElement.clientHeight || 240;
      canvas.width = width * window.devicePixelRatio;
      canvas.height = height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }
    resize();
    window.addEventListener('resize', resize);

    let angleY = 0.2;
    let angleX = 0.15;
    let zoom = 1.0;
    let isDragging = false;
    let lastX = 0, lastY = 0;

    canvas.addEventListener('mousedown', e => {
      isDragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
    });

    window.addEventListener('mouseup', () => { isDragging = false; });
    window.addEventListener('mousemove', e => {
      if (!isDragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      angleY += dx * 0.01;
      angleX += dy * 0.01;
      angleX = Math.max(-0.4, Math.min(0.5, angleX));
      lastX = e.clientX;
      lastY = e.clientY;
    });

    // Touch support for mobile
    canvas.addEventListener('touchstart', e => {
      if (e.touches.length === 1) {
        isDragging = true;
        lastX = e.touches[0].clientX;
        lastY = e.touches[0].clientY;
      }
    }, { passive: true });

    window.addEventListener('touchend', () => { isDragging = false; });
    window.addEventListener('touchmove', e => {
      if (!isDragging || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - lastX;
      const dy = e.touches[0].clientY - lastY;
      angleY += dx * 0.012;
      angleX += dy * 0.012;
      angleX = Math.max(-0.4, Math.min(0.5, angleX));
      lastX = e.touches[0].clientX;
      lastY = e.touches[0].clientY;
    }, { passive: true });

    // Procedural Tree 3D Node Structure reflecting the 8 branches
    const tree3DNodes = [];
    // Base & Trunk
    tree3DNodes.push({ x: 0, y: -0.85, z: 0, r: 12, type: 'trunk', color: '#9e7842' });
    tree3DNodes.push({ x: 0, y: -0.3, z: 0, r: 10, type: 'trunk', color: '#b58e54' });
    tree3DNodes.push({ x: 0, y: 0.1, z: 0, r: 8, type: 'trunk', color: '#c7a363' });

    // The 8 major branches in circle
    BRANCHES.forEach((bName, i) => {
      const theta = (i / 8) * Math.PI * 2;
      const bx = Math.cos(theta) * 0.75;
      const bz = Math.sin(theta) * 0.75;
      const by = 0.35 + (i % 2) * 0.15;
      tree3DNodes.push({ x: bx, y: by, z: bz, r: 7, type: 'branch', parentIdx: 2, color: '#aa864e', name: bName });

      // Canopy foliage clusters on each branch
      for (let f = 0; f < 3; f++) {
        const offAngle = theta + (f - 1) * 0.3;
        const fx = bx + Math.cos(offAngle) * (0.28 + f * 0.1);
        const fz = bz + Math.sin(offAngle) * (0.28 + f * 0.1);
        const fy = by + 0.22 + f * 0.12;
        tree3DNodes.push({ x: fx, y: fy, z: fz, r: 16 - f * 2, type: 'foliage', parentIdx: tree3DNodes.length - 1, color: f % 2 ? '#497554' : '#69956d' });
      }

      // Golden highlights
      const gx = bx * 1.15;
      const gz = bz * 1.15;
      const gy = by + 0.45;
      tree3DNodes.push({ x: gx, y: gy, z: gz, r: 4, type: 'gold', color: '#e5ca78' });
    });

    function project(x, y, z) {
      // Rotate Y
      const cosY = Math.cos(angleY), sinY = Math.sin(angleY);
      const x1 = x * cosY - z * sinY;
      const z1 = z * cosY + x * sinY;

      // Rotate X
      const cosX = Math.cos(angleX), sinX = Math.sin(angleX);
      const y2 = y * cosX - z1 * sinX;
      const z2 = z1 * cosX + y * sinX;

      // Perspective
      const dist = 3.2;
      const pz = z2 + dist;
      const fov = 340 * zoom;
      const px = width / 2 + (x1 / pz) * fov;
      const py = height / 2 - (y2 / pz) * fov + 25;
      return { x: px, y: py, z: pz, scale: fov / pz };
    }

    // Atmospheric golden dust particles (God rays & ambient life)
    const dustParticles = Array.from({ length: 24 }, () => ({
      x: (Math.random() - 0.5) * 1.8,
      y: -0.8 + Math.random() * 1.6,
      z: (Math.random() - 0.5) * 1.8,
      speedY: 0.0015 + Math.random() * 0.002,
      phase: Math.random() * Math.PI * 2,
      size: 1.5 + Math.random() * 2.2
    }));

    // Cinematic growth timeline state
    let growthStartTime = performance.now();
    function replayGrowthAnimation() {
      growthStartTime = performance.now();
      hero3dShowingRender = false;
      const img = $('#tree-render-img');
      const angleSelector = $('#hero-angle-selector');
      canvas.style.display = 'block';
      if (img) img.style.display = 'none';
      if (angleSelector) angleSelector.style.display = 'none';
      $('#btn-toggle-render').textContent = 'عرض الصور والرندر';
      showToast('🎬 بدء العرض السينمائي: صعود النور، نمو الفروع، وتبرعم أوراق العائلة الافتراضية...');
    }

    function renderLoop(currentTime) {
      if (!hero3dShowingRender && canvas.offsetParent !== null) {
        if (!isDragging) {
          angleY += 0.003; // Gentle auto-rotation
        }

        ctx.clearRect(0, 0, width, height);

        const now = currentTime || performance.now();
        const elapsed = (now - growthStartTime) / 1000; // seconds

        // Growth stages:
        // 0.0 - 1.0s: Roots appear and glow
        // 1.0 - 2.2s: Light pulse ascends the trunk
        // 2.0 - 3.4s: 8 Branches expand outwards
        // 3.2 - 4.4s: Foliage blooms into emerald clusters
        // 4.2s+: Full majestic bloom with glowing motto
        const rootsAlpha = Math.min(1.0, elapsed * 1.8);
        const trunkProgress = Math.max(0, Math.min(1.0, (elapsed - 0.6) / 1.4));
        const branchProgress = Math.max(0, Math.min(1.0, (elapsed - 1.8) / 1.4));
        const foliageProgress = Math.max(0, Math.min(1.0, (elapsed - 3.0) / 1.3));
        const bloomFinished = elapsed >= 4.2;

        // Ground halo & roots glow
        const ground = project(0, -0.9, 0);
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(ground.x, ground.y, 85 * zoom, 28 * zoom, 0, 0, Math.PI * 2);
        const groundGlow = elapsed < 2.0 ? 0.25 : 0.09;
        ctx.fillStyle = `rgba(215, 230, 185, ${groundGlow * rootsAlpha})`;
        ctx.shadowColor = '#d4af37';
        ctx.shadowBlur = elapsed < 2.0 ? 25 : 5;
        ctx.fill();
        ctx.restore();

        // Project and sort nodes by depth
        const projected = tree3DNodes.map((n, i) => {
          let nodeScale = 1.0;
          if (n.type === 'trunk') nodeScale = trunkProgress;
          else if (n.type === 'branch') nodeScale = branchProgress;
          else if (n.type === 'foliage' || n.type === 'gold') nodeScale = foliageProgress;

          // Scale position from parent during growth
          let curX = n.x, curY = n.y, curZ = n.z;
          if (n.parentIdx !== undefined && nodeScale < 1.0) {
            const p = tree3DNodes[n.parentIdx];
            curX = p.x + (n.x - p.x) * nodeScale;
            curY = p.y + (n.y - p.y) * nodeScale;
            curZ = p.z + (n.z - p.z) * nodeScale;
          }

          return {
            ...n,
            idx: i,
            curX, curY, curZ,
            scaleFactor: nodeScale,
            proj: project(curX, curY, curZ)
          };
        }).sort((a, b) => b.proj.z - a.proj.z);

        // Draw connections / branches
        ctx.save();
        projected.forEach(n => {
          if (n.parentIdx !== undefined && n.scaleFactor > 0.05) {
            const p = tree3DNodes[n.parentIdx];
            const pProj = project(p.x, p.y, p.z);
            ctx.beginPath();
            ctx.moveTo(pProj.x, pProj.y);
            ctx.lineTo(n.proj.x, n.proj.y);
            
            // Ascending light pulse effect during growth
            if (elapsed > 0.8 && elapsed < 2.8 && n.type === 'trunk') {
              ctx.strokeStyle = '#ffeaa7';
              ctx.lineWidth = Math.max(2, (n.r / 2) * (n.proj.scale / 100));
              ctx.shadowColor = '#ffd32a';
              ctx.shadowBlur = 15;
            } else {
              ctx.strokeStyle = n.type === 'foliage' ? 'rgba(85, 125, 95, 0.45)' : '#a47e48';
              ctx.lineWidth = Math.max(1, (n.r / 3) * (n.proj.scale / 100));
            }
            ctx.lineCap = 'round';
            ctx.stroke();
          }
        });
        ctx.restore();

        // Draw nodes / foliage
        projected.forEach(n => {
          if (n.scaleFactor <= 0.05) return;
          const pr = n.proj;
          const rad = Math.max(2, (n.r * n.scaleFactor * pr.scale) / 100);

          ctx.save();
          ctx.beginPath();
          ctx.arc(pr.x, pr.y, rad, 0, Math.PI * 2);

          if (n.type === 'foliage') {
            const grad = ctx.createRadialGradient(pr.x - rad * 0.3, pr.y - rad * 0.3, rad * 0.2, pr.x, pr.y, rad);
            grad.addColorStop(0, '#9ad0a2');
            grad.addColorStop(1, n.color);
            ctx.fillStyle = grad;
            ctx.shadowColor = 'rgba(5, 30, 20, 0.3)';
            ctx.shadowBlur = 8;
          } else if (n.type === 'gold') {
            ctx.fillStyle = n.color;
            ctx.shadowColor = '#ffe294';
            ctx.shadowBlur = 8;
          } else {
            ctx.fillStyle = n.color;
          }
          ctx.fill();
          ctx.restore();
        });

        // Ambient floating golden dust particles
        ctx.save();
        dustParticles.forEach(p => {
          p.y += p.speedY;
          p.x += Math.sin(p.phase + now * 0.002) * 0.001;
          if (p.y > 0.9) p.y = -0.85;

          const pProj = project(p.x, p.y, p.z);
          const pRad = Math.max(1, (p.size * pProj.scale) / 100);
          ctx.beginPath();
          ctx.arc(pProj.x, pProj.y, pRad, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255, 230, 150, 0.65)';
          ctx.shadowColor = '#f5d47a';
          ctx.shadowBlur = 6;
          ctx.fill();
        });
        ctx.restore();

        // Cinematic Family Motto Overlay (Glows gently at full bloom)
        if (bloomFinished) {
          ctx.save();
          const titleAlpha = Math.min(1.0, (elapsed - 4.2) * 1.5);
          ctx.globalAlpha = titleAlpha;
          ctx.font = 'bold 13px "IBM Plex Sans Arabic", sans-serif';
          ctx.fillStyle = '#fce49d';
          ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
          ctx.shadowBlur = 8;
          ctx.textAlign = 'center';
          ctx.fillText('المعاينة الرمزية ✦ جذورٌ تجمعنا ومستقبلٌ نبنيه معاً', width / 2, height - 14);
          ctx.restore();
        }
      }
      requestAnimationFrame(renderLoop);
    }
    requestAnimationFrame(renderLoop);

    // Controls
    $('#btn-replay-cinematic')?.addEventListener('click', replayGrowthAnimation);

    $('#btn-reset-hero-3d')?.addEventListener('click', () => {
      const modelViewer = $('#hero-model-viewer');
      if (modelViewer) {
        modelViewer.cameraOrbit = '0deg 75deg 105%';
        if (modelViewer.resetTurntableRotation) modelViewer.resetTurntableRotation();
      }
      angleY = 0.2;
      angleX = 0.15;
      zoom = 1.0;
      showToast('تمت إعادة توسيط الكاميرا.');
    });

    $('#btn-toggle-render')?.addEventListener('click', () => {
      hero3dShowingRender = !hero3dShowingRender;
      const modelViewer = $('#hero-model-viewer');
      const img = $('#tree-render-img');
      const btn = $('#btn-toggle-render');
      const angleSelector = $('#hero-angle-selector');
      if (hero3dShowingRender) {
        if (modelViewer) modelViewer.style.display = 'none';
        canvas.style.display = 'none';
        img.style.display = 'block';
        if (angleSelector) angleSelector.style.display = 'flex';
        btn.textContent = 'عرض مجسم 3D التفاعلي';
        showToast('يُعرض الآن المعرض الفني ورندرات Blender Cycles.');
      } else {
        if (modelViewer) modelViewer.style.display = 'block';
        img.style.display = 'none';
        if (angleSelector) angleSelector.style.display = 'none';
        btn.textContent = 'عرض رندرات بلندر';
        showToast('يُعرض الآن مجسم 3D التفاعلي المغلّف.');
      }
    });

    // Multi-angle render switcher
    $$('#hero-angle-selector .angle-btn').forEach(angleBtn => {
      angleBtn.addEventListener('click', () => {
        $$('#hero-angle-selector .angle-btn').forEach(b => b.classList.remove('active'));
        angleBtn.classList.add('active');
        const img = $('#tree-render-img');
        const targetSrc = angleBtn.getAttribute('data-angle');
        if (img && targetSrc) {
          img.src = targetSrc;
          showToast(`تم التبديل إلى زاوية: ${angleBtn.textContent}`);
        }
      });
    });
  }

  // ==========================================
  // 2. MEMBERS DIRECTORY, AES-256-GCM VAULT & USER ACCOUNTS
  // ==========================================
  let baseVerifiedMembers = MOCK_TREE_DATA.slice(1).map(m => ({ ...m }));
  let activeMembersData = [...MOCK_TREE_DATA];
  // Personal User Accounts & Live Tree Delta Persistence
  // Browser storage and typed names are not proof of identity or registration.
  // Authentication remains unavailable until a trusted server-backed flow exists.
  let userAccounts = {};
  let currentUser = null;
  let treeDelta = { updatedMembers: {}, addedMembers: [] };
  let treeRegistrationViewMode = 'gamified_masked'; // 'gamified_masked' | 'strict_registered' | 'full_registry'

  function isMemberRegistered(member) {
    // No server-verified registration signal is wired into this static build.
    return false;
  }

  function isSymbolicRecord(member) {
    return member?.status === 'رمزي — غير معتمد كنسب';
  }

  function getTreeDisplayMembers() {
    // This static preview exposes only the root and named main branches.
    // Individual nodes require trusted membership, reviewed lineage, and explicit display consent.
    return activeMembersData.filter(member => member.id === 'root' || member.recordType === 'main_branch');
  }

  function getMemberTreeDisplayName(member, shortForm = false) {
    if (!member) return '';
    const rawClean = String(member.name || '').replace(/^\*+/, '').replace(/\s*\.{2,}\s*/g, '').trim() || String(member.name || '');
    if (member.status === 'رمزي — غير معتمد كنسب') {
      if (shortForm) return rawClean;
      return rawClean;
    }
    if (isMemberRegistered(member)) {
      if (shortForm) {
        const parts = rawClean.split(/\s+/);
        return parts.length <= 2 ? rawClean : parts.slice(0, 2).join(' ');
      }
      return rawClean;
    }
    if (shortForm) {
      return '🔒 سجل مخفي';
    }
    return '🔒 سجل مخفي في نسخة العرض';
  }

  function mergeTreeDeltaOntoActiveMembers() {
    const updatedMap = (treeDelta && treeDelta.updatedMembers) ? treeDelta.updatedMembers : {};
    const addedList = (treeDelta && Array.isArray(treeDelta.addedMembers)) ? treeDelta.addedMembers : [];

    const mergedBase = baseVerifiedMembers.map(m => {
      const patch = updatedMap[m.id];
      return patch ? { ...m, ...patch } : { ...m };
    });

    const mergedAdded = addedList.map(m => {
      const patch = updatedMap[m.id];
      return patch ? { ...m, ...patch } : { ...m };
    });

    activeMembersData = [MOCK_TREE_DATA[0], ...mergedBase, ...mergedAdded];
  }

  function applyTreeDeltaAndRefresh(summaryText = null) {
    saveStored(STORAGE_KEYS.treeDelta, treeDelta);
    mergeTreeDeltaOntoActiveMembers();
    renderMembers();
    renderAccessibleTable();
    renderBranchHierarchy(currentTreeBranch);
    if (typeof refreshTreeLayout === 'function') refreshTreeLayout();
    if (typeof updateModelViewerLeafPins === 'function') updateModelViewerLeafPins(currentTreeBranch);
    if (typeof renderRolesDirectory === 'function') renderRolesDirectory();
    if (typeof renderTreeRegistrationLeaderboard === 'function') renderTreeRegistrationLeaderboard();

    if (window.AllamTreeEngine) {
      if (window.AllamTreeEngine.getGraph()) {
        window.AllamTreeEngine.loadMembers(getTreeDisplayMembers());
      } else {
        window.AllamTreeEngine.init('three-canvas', getTreeDisplayMembers())
          .catch(err => console.warn('[AllamTreeEngine] init error:', err));
      }
    }
    if (typeof populateUserLoginSelect === 'function') populateUserLoginSelect();
    if (typeof populateKinshipDatalist === 'function') populateKinshipDatalist();
    if (typeof syncLoggedInUserUI === 'function') syncLoggedInUserUI();
    if (summaryText && window.AllamCloudDB) {
      window.AllamCloudDB.pushTreeDelta(treeDelta, currentUser, summaryText);
      if (typeof renderCloudAuditLog === 'function') renderCloudAuditLog();
    }
  }

  async function bootEncryptedVaultFlow(forceModal = false) {
    const statusText = $('#vault-status-text');
    if (statusText) statusText.textContent = '🔒 سجل العائلة التفصيلي غير متاح في نسخة العرض';
    const dialog = $('#family-vault-dialog');
    if (forceModal && dialog && !dialog.open) dialog.showModal();
  }

  try { sessionStorage.removeItem('allam_vault_passcode'); } catch (_) {}

  // Always start with symbolic placeholders. Real family data is never fetched
  // automatically, including on localhost.
  bootEncryptedVaultFlow();

  // Wire Family Vault modal events
  document.addEventListener('DOMContentLoaded', () => {
    const vaultDialog = $('#family-vault-dialog');
    const vaultForm = $('#family-vault-form');
    const vaultInput = $('#vault-passcode-input');
    const vaultErr = $('#vault-error-msg');

    $('#btn-family-vault-gate')?.addEventListener('click', () => {
      if (vaultErr) vaultErr.style.display = 'none';
      if (vaultDialog) vaultDialog.showModal();
      setTimeout(() => vaultInput?.focus(), 60);
    });

    $('#btn-close-vault-dialog')?.addEventListener('click', () => vaultDialog?.close());
    $('#btn-vault-demo')?.addEventListener('click', () => {
      vaultDialog?.close();
      showToast('تتصفح النسخة الرمزية؛ سجل الأفراد غير محمّل في هذه النسخة.');
    });

    vaultForm?.addEventListener('submit', async e => {
      e.preventDefault();
      if (vaultErr) {
        vaultErr.textContent = 'فتح السجل غير متاح في نسخة العرض؛ لن نطلب أو نستقبل رمز العائلة هنا.';
        vaultErr.style.display = 'block';
      }
      vaultInput?.value && (vaultInput.value = '');
    });
  });

  function renderMembers() {
    const container = $('#members-container');
    if (!container) return;

    const query = ($('#member-search')?.value || '').trim().toLocaleLowerCase('ar');
    const branchFilter = $('#member-branch-filter')?.value || 'all';

    // We take members excluding the root
    const members = (PREVIEW_READ_ONLY ? getTreeDisplayMembers() : activeMembersData).filter(m => m.id !== 'root').filter(m => {
      if (treeRegistrationViewMode === 'strict_registered' && !isMemberRegistered(m)) return false;
      const matchBranch = branchFilter === 'all' || m.branch === branchFilter;
      const matchQuery = !query || `${m.name} ${m.branch} ${m.relation} ${m.bio}`.toLocaleLowerCase('ar').includes(query);
      return matchBranch && matchQuery;
    });

    $('#member-count-badge').textContent = `${members.length} سجلًا رمزيًا`;

    if (!members.length) {
      container.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1">
          <span>🔍</span>
          <b>لم نعثر على نتائج مطابقة</b>
          <p>جرّب البحث باسم آخر أو اختر فرعًا مختلفًا.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = members.map(m => {
      const isMe = currentUser && currentUser.memberId === m.id;
      const acc = userAccounts && userAccounts[m.id];
      const regActive = isMemberRegistered(m);
      const isMasked = !isSymbolicRecord(m) && !regActive && treeRegistrationViewMode === 'gamified_masked';
      const displayName = getMemberTreeDisplayName(m, false);
      const avatarChar = isMasked ? '🔒' : String(m.name || '').replace(/^\*/, '').trim().slice(0, 1);
      const extraInfo = [
        m.city && m.city !== '==' ? `📍 ${m.city}` : '',
        m.job && m.job !== '==' ? `💼 ${m.job}` : ''
      ].filter(Boolean).join(' • ');

      return `
      <article class="member-card" style="${isMe ? 'border:2px solid var(--primary); box-shadow:0 6px 20px rgba(15,104,86,0.12);' : isMasked ? 'border:1.5px dashed rgba(197,160,89,0.55); background:#fffdf8;' : ''}">
        <div class="member-header">
          <span class="member-avatar" style="${isMe ? 'background:var(--primary); color:#fff;' : isMasked ? 'background:#fef3c7; color:#92400e;' : ''}">${escapeHTML(avatarChar)}</span>
          <div class="member-title">
            <b>${escapeHTML(displayName)}</b>
            <span class="member-branch-badge">${escapeHTML(m.branch)}</span>
          </div>
        </div>

        <div class="member-meta-grid">
          <div class="meta-item">
            الجيل
            <b>الجيل ${m.gen === 1 ? 'الأول' : m.gen === 2 ? 'الثاني' : m.gen === 3 ? 'الثالث' : 'الرابع'}</b>
          </div>
          <div class="meta-item">
            الصلة بالفرع
            <b>${escapeHTML(isMasked ? `عضو في ${m.branch}` : m.relation)}</b>
          </div>
        </div>

        ${(!isMasked && extraInfo) ? `<p style="font-size:11.5px; color:var(--primary); font-weight:600; margin:0 0 4px;">${escapeHTML(extraInfo)}</p>` : ''}
        <p style="font-size:12px; color:var(--muted); margin:0; line-height:1.7">
          ${escapeHTML(isMasked ? 'سجل للمعاينة فقط؛ لا يتصل بحساب أو سجل عائلي.' : m.bio)}
        </p>

        <div class="member-tags">
          <span class="tag-pill" style="${isMe ? 'background:#e6f4f1; color:#0f6856; font-weight:700;' : regActive ? 'background:#ecfdf5; color:#047857; font-weight:700;' : 'background:#fef3c7; color:#92400e; font-weight:700;'}">
            ${isSymbolicRecord(m) ? 'عنصر عرض رمزي' : isMe ? 'حسابك الشخصي' : acc?.googleEmail ? 'حساب مرتبط' : regActive ? 'مفعّل' : 'غير مسجل'}
          </span>
          <span class="tag-pill" style="color:var(--gold-dark); background:#fdf9ed">لا يوجد اتصال سحابي</span>
        </div>

        <div style="display:flex; gap:6px; margin-top:auto;">
          <button class="button button-outline" style="flex:1; font-size:12px; padding:8px 10px;" data-view-member="${m.id}">
            عرض بالشجرة ←
          </button>
          <button class="button ${isMe ? 'button-primary' : isMasked ? 'button-gold' : 'button-quiet'}" style="font-size:12px; padding:8px 10px;" data-login-member="${m.id}">
            ${isSymbolicRecord(m) ? 'معاينة فقط' : isMe ? 'تعديل بياناتي' : isMasked ? 'الحساب غير متاح' : 'حسابي'}
          </button>
        </div>
      </article>
      `;
    }).join('');
  }

  // ==========================================
  // 3. FAMILY TREE 3D & 2D INTERACTIVE EXPLORER
  // ==========================================
  let tree3DInitialized = false;
  let tree3DInitPromise = null;
  let treeActiveNode = null;
  let activeBranchFilter = 'all';
  let refreshTreeLayout = null;

  function initThreeFamilyTree() {
    if (!window.AllamTreeEngine || window.AllamTreeEngine.getGraph()) return;
    if (tree3DInitPromise) return tree3DInitPromise;

    tree3DInitPromise = window.AllamTreeEngine.init('three-canvas', getTreeDisplayMembers())
      .catch(error => {
        tree3DInitPromise = null;
        console.warn('[AllamTreeEngine] init error:', error);
      });
    return tree3DInitPromise;
  }

  function initFamilyTree() {
    renderAccessibleTable();
    renderBranchHierarchy(currentTreeBranch);
    initThreeFamilyTree();

    if (tree3DInitialized) return;
    tree3DInitialized = true;

    const canvas = $('#tree-interactive-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 800, height = 580;
    function resize() {
      const parent = canvas.parentElement;
      width = (parent && parent.clientWidth > 0) ? parent.clientWidth : 800;
      height = (parent && parent.clientHeight > 0) ? parent.clientHeight : 580;
      canvas.width = width * window.devicePixelRatio;
      canvas.height = height * window.devicePixelRatio;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      rebuildLayoutNodes();
    }
    window.resizeInteractiveCanvas = resize;

    // 2D GitHub Network / DAG Pan & Zoom State
    let panX = 0.0;
    let panY = 0.0;
    let zoom = 1.0;
    let isDragging = false;
    let dragMoved = false;
    let lastX = 0, lastY = 0;
    let hovered2DNode = null;

    const BRANCH_COLORS = {
      'الفرع 1': '#1b4b3e',
      'الفرع 2': '#235c4b',
      'الفرع 3': '#8a6827',
      'الفرع 4': '#2e6b56',
      'الفرع 5': '#6e5220',
      'الفرع 6': '#356859',
      'الفرع 7': '#7a5923',
      'الفرع 8': '#285446'
    };

    function cleanDisplayName(name) {
      return String(name || '').replace(/^\*/, '').replace(/\s*\.{2,}\s*/g, '').trim() || String(name || '');
    }

    function shortPersonLabel(name) {
      const cleaned = cleanDisplayName(name);
      const parts = cleaned.split(/\s+/);
      if (parts.length <= 2) return cleaned;
      return parts.slice(0, 2).join(' ');
    }

    canvas.addEventListener('mousedown', e => {
      isDragging = true;
      dragMoved = false;
      lastX = e.clientX;
      lastY = e.clientY;
    });

    window.addEventListener('mouseup', () => { isDragging = false; });
    window.addEventListener('mousemove', e => {
      if (!isDragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      if (Math.hypot(dx, dy) > 3) dragMoved = true;
      panX += dx;
      panY += dy;
      lastX = e.clientX;
      lastY = e.clientY;
    });

    canvas.addEventListener('wheel', e => {
      if (canvas.offsetParent === null) return;
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.12 : -0.12;
      zoom = Math.max(0.45, Math.min(2.4, zoom + delta));
    }, { passive: false });

    // Touch Pan
    canvas.addEventListener('touchstart', e => {
      if (e.touches.length === 1) {
        isDragging = true;
        dragMoved = false;
        lastX = e.touches[0].clientX;
        lastY = e.touches[0].clientY;
      }
    }, { passive: true });

    window.addEventListener('touchend', () => { isDragging = false; });
    window.addEventListener('touchmove', e => {
      if (!isDragging || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - lastX;
      const dy = e.touches[0].clientY - lastY;
      if (Math.hypot(dx, dy) > 3) dragMoved = true;
      panX += dx;
      panY += dy;
      lastX = e.touches[0].clientX;
      lastY = e.touches[0].clientY;
    }, { passive: true });

    // Build 2D GitHub Network / Swimlane DAG coordinates from GenealogyGraph
    let layoutNodes = [];
    let layoutEdges = [];
    let nodeById = new Map();

    function rebuildLayoutNodes() {
      const engineGraph = window.AllamTreeEngine?.getGraph();
      let rawNodes = [];
      if (engineGraph && typeof engineGraph.getAllMembers === 'function') {
        rawNodes = engineGraph.getAllMembers();
      } else if (window.GenealogyGraph) {
        const tempG = new window.GenealogyGraph().load(
          getTreeDisplayMembers()
        );
        rawNodes = tempG.getAllMembers();
      } else {
        rawNodes = getTreeDisplayMembers();
      }

      nodeById = new Map(rawNodes.map(n => [n.id, n]));
      const isBranchView = activeBranchFilter && activeBranchFilter !== 'all' && activeBranchFilter !== 'الجذور الرمزية';
      canvas.dataset.activeBranch = isBranchView ? activeBranchFilter : 'all';
      const drawerOpen = Boolean($('#safe-drawer')?.classList.contains('open')) || isBranchView;

      // RTL Column X positions (Root on right -> Gen 1 -> Gen 2 -> Gen 3 -> Gen 4 on left)
      const isCompact = width < 600;
      const rightMargin = isCompact ? width - 36 : Math.max(110, width - 85);
      const leftMargin = isCompact ? 36 : (drawerOpen ? Math.min(375, width * 0.36) : 115);
      const usableW = Math.max(isCompact ? 150 : 380, rightMargin - leftMargin);
      const colX = {
        0: rightMargin,
        1: rightMargin - usableW * 0.22,
        2: rightMargin - usableW * 0.48,
        3: rightMargin - usableW * 0.74,
        4: leftMargin
      };

      const positioned = [];
      const positionedMap = new Map();

      const isSpouse = n => Boolean(n.partnerId || /(زوجة|زوج|أرملة|طليقة)/.test(n.relation || ''));

      if (!isBranchView) {
        // OVERVIEW MODE: GitHub Branch Swimlanes (8 branches + Root + key direct blood nodes per branch)
        const topStart = 88;
        const laneHeight = Math.max(54, (height - topStart - 42) / 8);

        const rootNode = nodeById.get('root') || { id: 'root', name: 'الجذور الرمزية', branch: 'الأصل العائلي', gen: 1 };
        const rootPos = {
          ...rootNode,
          wx: colX[0],
          wy: topStart + laneHeight * 3.5,
          pillW: isCompact ? 74 : 112,
          pillH: 30,
          isRoot: true
        };
        positioned.push(rootPos);
        positionedMap.set('root', rootPos);

        BRANCHES.forEach((bName, bIdx) => {
          const laneY = topStart + bIdx * laneHeight;
          const branchMembers = rawNodes.filter(n => n.branch === bName && n.id !== 'root');
          const founder = branchMembers.find(n => n.gen === 1 && n.relation === 'نفسه') ||
                          branchMembers.find(n => n.gen === 1) ||
                          branchMembers[0];
          if (founder) {
            const fPos = {
              ...founder,
              wx: colX[1],
              wy: laneY,
              pillW: isCompact ? 70 : 118,
              pillH: 26,
              laneIndex: bIdx,
              totalBranchCount: branchMembers.length
            };
            positioned.push(fPos);
            positionedMap.set(founder.id, fPos);
          }

          // Top Gen 2 blood children (up to 2 per lane in overview for clean GitHub swimlane readability)
          const gen2Blood = branchMembers
            .filter(n => n.gen === 2 && !isSpouse(n) && (!founder || n.id !== founder.id))
            .slice(0, 2);
          gen2Blood.forEach((child, cIdx) => {
            const offset = gen2Blood.length === 1 ? 0 : (cIdx === 0 ? -12 : 12);
            const cPos = {
              ...child,
              wx: colX[2],
              wy: laneY + offset,
              pillW: isCompact ? 64 : 108,
              pillH: 22,
              laneIndex: bIdx
            };
            positioned.push(cPos);
            positionedMap.set(child.id, cPos);
          });

          // Top Gen 3 blood grandchildren (up to 2 per lane in overview)
          const gen3Blood = branchMembers
            .filter(n => n.gen === 3 && !isSpouse(n))
            .slice(0, 2);
          gen3Blood.forEach((gchild, gIdx) => {
            const offset = gen3Blood.length === 1 ? 0 : (gIdx === 0 ? -12 : 12);
            const gPos = {
              ...gchild,
              wx: colX[3],
              wy: laneY + offset,
              pillW: isCompact ? 64 : 104,
              pillH: 22,
              laneIndex: bIdx
            };
            positioned.push(gPos);
            positionedMap.set(gchild.id, gPos);
          });

          // Top Gen 4 blood great-grandchildren (1 representative in overview)
          const gen4Blood = branchMembers
            .filter(n => n.gen === 4 && !isSpouse(n))
            .slice(0, 1);
          gen4Blood.forEach(gg => {
            const ggPos = {
              ...gg,
              wx: colX[4],
              wy: laneY,
              pillW: isCompact ? 64 : 102,
              pillH: 22,
              laneIndex: bIdx
            };
            positioned.push(ggPos);
            positionedMap.set(gg.id, ggPos);
          });
        });
      } else {
        // SINGLE BRANCH DAG MODE: Full expanded family tree for the selected branch
        const branchMembers = rawNodes.filter(n => n.branch === activeBranchFilter && n.id !== 'root');
        const rootNode = nodeById.get('root') || { id: 'root', name: 'الجذور الرمزية', branch: 'الأصل العائلي', gen: 1 };

        // Group by generation (1..4), placing blood members first and spouses right after
        const gens = { 1: [], 2: [], 3: [], 4: [] };
        branchMembers.forEach(n => {
          const g = Math.min(4, Math.max(1, n.gen || 2));
          gens[g].push(n);
        });

        Object.keys(gens).forEach(gKey => {
          gens[gKey].sort((a, b) => {
            if (a.relation === 'نفسه') return -1;
            if (b.relation === 'نفسه') return 1;
            const aSp = isSpouse(a) ? 1 : 0;
            const bSp = isSpouse(b) ? 1 : 0;
            if (aSp !== bSp) return aSp - bSp;
            const aP = a.parentId || a.candidateParentId || '';
            const bP = b.parentId || b.candidateParentId || '';
            if (aP !== bP) return aP.localeCompare(bP);
            return a.id.localeCompare(b.id);
          });
        });

        const centerY = height / 2 + 8;

        const rootPos = {
          ...rootNode,
          wx: colX[0],
          wy: centerY,
          pillW: isCompact ? 74 : 106,
          pillH: 28,
          isRoot: true
        };
        positioned.push(rootPos);
        positionedMap.set('root', rootPos);

        [1, 2, 3, 4].forEach(g => {
          const list = gens[g];
          const spacing = g === 1 ? 38 : 29;
          const totalH = (list.length - 1) * spacing;
          // Keep columns with <= 14 items centered at centerY; tall columns start near top so top 15 items are immediately visible
          const startY = totalH <= (height - 130) ? (centerY - totalH / 2) : 68;
          list.forEach((node, idx) => {
            const nPos = {
              ...node,
              wx: colX[g],
              wy: startY + idx * spacing,
              pillW: isCompact ? (g === 1 ? 70 : 64) : (g === 1 ? 116 : 108),
              pillH: g === 1 ? 26 : 22,
              isSpouseNode: isSpouse(node)
            };
            positioned.push(nPos);
            positionedMap.set(node.id, nPos);
          });
        });
      }

      // Build edges with explicit status classification (CONFIRMED, CANDIDATE_REVIEW, DISPLAY_TOPOLOGY)
      const edges = [];
      const branchFounderInView = positioned.find(p => p.gen === 1 && p.relation === 'نفسه') ||
                                  positioned.find(p => p.gen === 1 && !p.isRoot);
      positioned.forEach(node => {
        if (node.id === 'root') return;
        const confirmedParent = node.parentId ? positionedMap.get(node.parentId) : null;
        const candidateParent = (!confirmedParent && node.candidateParentId)
          ? positionedMap.get(node.candidateParentId)
          : null;
        const spousePartner = (!confirmedParent && !candidateParent && node.partnerId)
          ? positionedMap.get(node.partnerId)
          : null;

        if (confirmedParent) {
          edges.push({
            from: confirmedParent,
            to: node,
            status: node.parentLinkStatus || 'CONFIRMED'
          });
        } else if (candidateParent) {
          edges.push({
            from: candidateParent,
            to: node,
            status: 'CANDIDATE_REVIEW'
          });
        } else if (spousePartner && spousePartner.id !== node.id) {
          edges.push({
            from: spousePartner,
            to: node,
            status: 'DISPLAY_TOPOLOGY'
          });
        } else if (node.gen > 1) {
          const fallbackFounder = isBranchView
            ? branchFounderInView
            : positioned.find(p => p.branch === node.branch && p.gen === 1);
          if (fallbackFounder && fallbackFounder.id !== node.id) {
            edges.push({
              from: fallbackFounder,
              to: node,
              status: 'DISPLAY_TOPOLOGY'
            });
          }
        }
      });

      layoutNodes = positioned;
      layoutEdges = edges;
    }

    resize();
    window.addEventListener('resize', resize);
    refreshTreeLayout = rebuildLayoutNodes;

    function toScreen(wx, wy) {
      const cx = width / 2;
      const cy = height / 2;
      return {
        x: cx + (wx - cx) * zoom + panX,
        y: cy + (wy - cy) * zoom + panY
      };
    }

    // Helper to get complete ancestor lineage path (confirmed or candidate)
    function getAncestorIds(targetNode) {
      if (!targetNode) return new Set();
      const ids = new Set([targetNode.id]);
      let curr = targetNode;
      let guard = 0;
      while (curr && guard++ < 16) {
        const nextId = curr.parentId || curr.candidateParentId;
        if (!nextId || ids.has(nextId)) break;
        ids.add(nextId);
        curr = layoutNodes.find(n => n.id === nextId) || nodeById.get(nextId);
      }
      return ids;
    }

    function drawRoundedRect(x, y, w, h, r) {
      const radius = Math.min(r, w / 2, h / 2);
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + w - radius, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
      ctx.lineTo(x + w, y + h - radius);
      ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
      ctx.lineTo(x + radius, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
    }

    function treeRender() {
      if (canvas.offsetParent !== null) {
        const isCompact = width < 600;
        ctx.clearRect(0, 0, width, height);

        // Subtle parchment-grid background for 2D Genealogy Network
        ctx.save();
        ctx.fillStyle = 'rgba(248, 245, 236, 0.94)';
        ctx.fillRect(0, 0, width, height);

        // Draw subtle vertical generation guide columns
        const isBranchView = activeBranchFilter && activeBranchFilter !== 'all' && activeBranchFilter !== 'الجذور الرمزية';
        const drawerOpen = Boolean($('#safe-drawer')?.classList.contains('open')) || isBranchView;
        const rightMargin = isCompact ? width - 36 : Math.max(110, width - 85);
        const leftMargin = isCompact ? 36 : (drawerOpen ? Math.min(375, width * 0.36) : 115);
        const usableW = Math.max(isCompact ? 150 : 380, rightMargin - leftMargin);
        const colDefs = [
          { x: rightMargin, label: isCompact ? 'الجذر' : 'جذر العرض' },
          { x: rightMargin - usableW * 0.22, label: isCompact ? 'الفروع' : 'الجيل الأول (الفروع الـ ٨)' },
          { x: rightMargin - usableW * 0.48, label: isCompact ? 'جيل ٢' : 'الجيل الثاني (الأبناء)' },
          { x: rightMargin - usableW * 0.74, label: isCompact ? 'جيل ٣' : 'الجيل الثالث (الأحفاد)' },
          { x: leftMargin, label: isCompact ? 'جيل ٤' : 'الجيل الرابع' }
        ];

        colDefs.forEach(col => {
          const sx = toScreen(col.x, 0).x;
          ctx.beginPath();
          ctx.setLineDash([3, 6]);
          ctx.strokeStyle = 'rgba(27, 75, 62, 0.11)';
          ctx.lineWidth = 1;
          ctx.moveTo(sx, 48);
          ctx.lineTo(sx, height - 36);
          ctx.stroke();
        });
        ctx.setLineDash([]);

        const focusNode = hovered2DNode || treeActiveNode;
        const ancestorPath = getAncestorIds(focusNode);

        // 1. Draw Bezier DAG edges with status-based styling
        layoutEdges.forEach(edge => {
          const p1 = toScreen(edge.from.wx, edge.from.wy);
          const p2 = toScreen(edge.to.wx, edge.to.wy);
          const isHighlighted = ancestorPath.has(edge.from.id) && ancestorPath.has(edge.to.id);

          ctx.save();
          ctx.beginPath();
          const startX = p1.x - (edge.from.pillW * zoom) * 0.42;
          const endX = p2.x + (edge.to.pillW * zoom) * 0.42;
          const midX = (startX + endX) / 2;

          ctx.moveTo(startX, p1.y);
          ctx.bezierCurveTo(midX, p1.y, midX, p2.y, endX, p2.y);

          if (isHighlighted) {
            ctx.setLineDash([]);
            ctx.strokeStyle = '#c8962e';
            ctx.lineWidth = 3.2;
          } else if (edge.status === 'CONFIRMED') {
            ctx.setLineDash([]);
            ctx.strokeStyle = '#1b4b3e';
            ctx.lineWidth = 2.4;
          } else if (edge.status === 'DISPLAY_TOPOLOGY') {
            ctx.setLineDash([2, 4]);
            ctx.strokeStyle = 'rgba(27, 75, 62, 0.45)';
            ctx.lineWidth = 1.6;
          } else {
            // CANDIDATE_REVIEW
            ctx.setLineDash([6, 4]);
            ctx.strokeStyle = 'rgba(200, 125, 32, 0.68)';
            ctx.lineWidth = 1.5;
          }
          ctx.stroke();
          ctx.restore();
        });

        // 2. Draw Node Pills
        layoutNodes.forEach(node => {
          const sc = toScreen(node.wx, node.wy);
          const pw = node.pillW * Math.max(0.78, Math.min(1.25, zoom));
          const ph = node.pillH * Math.max(0.82, Math.min(1.2, zoom));
          const rx = sc.x - pw / 2;
          const ry = sc.y - ph / 2;

          // Skip off-screen nodes
          if (rx + pw < -20 || rx > width + 20 || ry + ph < 36 || ry > height + 20) return;

          const isSelected = (treeActiveNode && treeActiveNode.id === node.id) ||
                             (hovered2DNode && hovered2DNode.id === node.id);
          const isAncestor = ancestorPath.has(node.id);
          const branchColor = BRANCH_COLORS[node.branch] || '#1b4b3e';

          ctx.save();
          drawRoundedRect(rx, ry, pw, ph, ph / 2);

          if (node.isRoot) {
            ctx.fillStyle = '#1b4b3e';
            ctx.strokeStyle = '#d4af37';
            ctx.lineWidth = 2.2;
          } else if (isSelected) {
            ctx.fillStyle = '#fff5d6';
            ctx.strokeStyle = '#c8962e';
            ctx.lineWidth = 2.4;
          } else if (isAncestor) {
            ctx.fillStyle = '#fdf8e8';
            ctx.strokeStyle = '#d4af37';
            ctx.lineWidth = 2.0;
          } else if (node.gen === 1) {
            ctx.fillStyle = branchColor;
            ctx.strokeStyle = '#d4af37';
            ctx.lineWidth = 1.6;
          } else if (node.isSpouseNode) {
            ctx.fillStyle = '#faf3e3';
            ctx.strokeStyle = 'rgba(180, 145, 75, 0.55)';
            ctx.lineWidth = 1.1;
          } else {
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = node.parentLinkStatus === 'CONFIRMED'
              ? '#1b4b3e'
              : 'rgba(27, 75, 62, 0.32)';
            ctx.lineWidth = node.parentLinkStatus === 'CONFIRMED' ? 1.8 : 1.15;
          }

          ctx.fill();
          ctx.stroke();

          // Status dot on right edge of pill
          const dotX = rx + pw - 9;
          const dotY = sc.y;
          ctx.beginPath();
          ctx.arc(dotX, dotY, 3.2, 0, Math.PI * 2);
          ctx.fillStyle = (node.isRoot || node.gen === 1)
            ? '#f5d47a'
            : node.parentLinkStatus === 'CONFIRMED'
              ? '#1f8b5c'
              : '#d4882a';
          ctx.fill();

          // Node Arabic Label
          const fontSize = Math.max(isCompact ? 8 : 10, Math.min(isCompact ? 10 : 13, Math.round((isCompact ? 9 : 11.5) * Math.max(0.85, Math.min(1.15, zoom)))));
          ctx.font = `${(node.isRoot || node.gen === 1 || isSelected || isAncestor) ? '700' : '600'} ${fontSize}px "IBM Plex Sans Arabic", sans-serif`;
          ctx.fillStyle = (node.isRoot || (node.gen === 1 && !isSelected && !isAncestor))
            ? '#ffffff'
            : '#16352b';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          const labelText = node.isRoot
            ? 'الجذور الرمزية'
            : (node.gen === 1 && activeBranchFilter === 'all')
              ? `${shortPersonLabel(node.name)} (${node.totalBranchCount || ''})`
              : getMemberTreeDisplayName(node, true);
          ctx.fillText(labelText, sc.x - 3, sc.y, Math.max(24, pw - (isCompact ? 14 : 8)));
          ctx.restore();
        });

        // 3. Draw Fixed Top Header Bar (Generation Columns)
        ctx.save();
        ctx.fillStyle = 'rgba(23, 58, 48, 0.94)';
        ctx.fillRect(0, 0, width, 42);
        ctx.font = '700 11.5px "IBM Plex Sans Arabic", sans-serif';
        ctx.fillStyle = '#f5e3b3';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        colDefs.forEach(col => {
          const sx = toScreen(col.x, 0).x;
          if (sx > 45 && sx < width - 45) {
            ctx.fillText(col.label, sx, 21);
          }
        });
        ctx.restore();

        // 4. Draw Fixed Bottom Legend Pill (GitHub DAG Link Status Key)
        ctx.save();
        const legendH = 30;
        const legendY = height - legendH - 6;
        drawRoundedRect(12, legendY, Math.min(width - 24, 560), legendH, 15);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
        ctx.strokeStyle = 'rgba(191, 161, 95, 0.5)';
        ctx.lineWidth = 1;
        ctx.fill();
        ctx.stroke();

        ctx.font = '600 11px "IBM Plex Sans Arabic", sans-serif';
        ctx.fillStyle = '#1b4b3e';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        const modeText = (activeBranchFilter && activeBranchFilter !== 'all')
          ? `تركيز: ${activeBranchFilter} (${layoutNodes.length - 1} عقدة)`
          : 'مخطط المسارات الثمانية (اختر فرعاً لتوسيع كافة أفراده)';
        ctx.fillText(
          `━━ ✓ أبوة مؤكدة   ╌╌ ⏳ مرشح للمراجعة   ┈┈ 🌿 مدخل فرع  |  ${modeText}`,
          Math.min(width - 26, 558),
          legendY + legendH / 2
        );
        ctx.restore();
      }
      requestAnimationFrame(treeRender);
    }
    requestAnimationFrame(treeRender);

    function findNodeAtCanvasPoint(px, py) {
      for (let i = layoutNodes.length - 1; i >= 0; i--) {
        const node = layoutNodes[i];
        const sc = toScreen(node.wx, node.wy);
        const pw = node.pillW * Math.max(0.78, Math.min(1.25, zoom));
        const ph = node.pillH * Math.max(0.82, Math.min(1.2, zoom));
        if (px >= sc.x - pw / 2 && px <= sc.x + pw / 2 &&
            py >= sc.y - ph / 2 && py <= sc.y + ph / 2) {
          return node;
        }
      }
      return null;
    }

    // Canvas hover to preview node info
    canvas.addEventListener('mousemove', e => {
      if (isDragging) return;
      const rect = canvas.getBoundingClientRect();
      const hoverX = e.clientX - rect.left;
      const hoverY = e.clientY - rect.top;
      const hit = findNodeAtCanvasPoint(hoverX, hoverY);
      hovered2DNode = hit;
      if (hit) {
        canvas.style.cursor = 'pointer';
        const gLabel = hit.gen === 1 ? 'الأول' : hit.gen === 2 ? 'الثاني' : hit.gen === 3 ? 'الثالث' : 'الرابع';
        $('#tree-hover-name').textContent = `📌 ${getMemberTreeDisplayName(hit, false)} — ${hit.relation || hit.branch} (الجيل ${gLabel})`;
      } else {
        canvas.style.cursor = 'grab';
      }
    });

    // Canvas click to select node (or expand branch if clicking a Gen 1 founder in overview)
    canvas.addEventListener('click', e => {
      if (dragMoved) return;
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      const found = findNodeAtCanvasPoint(clickX, clickY);
      if (found) {
        if (activeBranchFilter === 'all' && !found.isRoot && BRANCHES.includes(found.branch)) {
          activeBranchFilter = found.branch;
          rebuildLayoutNodes();
          $$('.branch-pill-chip').forEach(p => p.classList.toggle('active', p.getAttribute('data-branch') === activeBranchFilter));
          $('#tree-hover-name').textContent = `تركيز: ${activeBranchFilter}`;
          if (window.AllamTreeEngine) window.AllamTreeEngine.filterBranch(activeBranchFilter);
          showToast(`توسّع مخطط العرض إلى سجلات ${activeBranchFilter} الرمزية.`);
          return;
        }
        openSafeDrawer(found);
      }
    });

    // Zoom & Reset buttons connected to both 2D Network & 3D Engine
    $('#btn-tree-zoom-in')?.addEventListener('click', () => {
      zoom = Math.min(2.4, zoom + 0.2);
      if (window.AllamTreeEngine) window.AllamTreeEngine.zoomIn();
    });
    $('#btn-tree-zoom-out')?.addEventListener('click', () => {
      zoom = Math.max(0.45, zoom - 0.2);
      if (window.AllamTreeEngine) window.AllamTreeEngine.zoomOut();
    });
    $('#btn-tree-reset')?.addEventListener('click', () => {
      panX = 0.0;
      panY = 0.0;
      zoom = 1.0;
      activeBranchFilter = 'all';
      rebuildLayoutNodes();
      $('#tree-hover-name').textContent = 'اسحب للتدوير — اختر ورقة أو بطاقة اسم';
      if (window.AllamTreeEngine) {
        window.AllamTreeEngine.resetCamera();
      }
      $$('.branch-pill-chip').forEach(p => p.classList.toggle('active', p.getAttribute('data-branch') === 'all'));
      showToast('تمت إعادة ضبط زاوية الرؤية لكامل الشجرة والقاعدة.');
    });

    // Toggle branches filter button
    let branchFilterIdx = -1;
    $('#btn-tree-toggle-branches')?.addEventListener('click', () => {
      branchFilterIdx = (branchFilterIdx + 1) % (BRANCHES.length + 1);
      if (branchFilterIdx === BRANCHES.length) {
        activeBranchFilter = 'all';
        panX = 0;
        panY = 0;
        rebuildLayoutNodes();
        $('#tree-hover-name').textContent = 'عرض الفروع الثمانية كافة';
        if (window.AllamTreeEngine) window.AllamTreeEngine.filterBranch('all');
        showToast('تم إظهار كافة الفروع.');
      } else {
        activeBranchFilter = BRANCHES[branchFilterIdx];
        panX = 0;
        panY = 0;
        rebuildLayoutNodes();
        $('#tree-hover-name').textContent = `تركيز: ${activeBranchFilter}`;
        if (window.AllamTreeEngine) window.AllamTreeEngine.filterBranch(activeBranchFilter);
        showToast(`تم تركيز العرض على: ${activeBranchFilter}`);
      }
    });

    // Keyboard navigation
    window.addEventListener('keydown', e => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
      if ($('#page-tree')?.classList.contains('active')) {
        if (e.key === 'ArrowLeft') { panX += 28; e.preventDefault(); }
        if (e.key === 'ArrowRight') { panX -= 28; e.preventDefault(); }
        if (e.key === 'ArrowUp') { panY += 28; e.preventDefault(); }
        if (e.key === 'ArrowDown') { panY -= 28; e.preventDefault(); }
        if (e.key === '+' || e.key === '=') { zoom = Math.min(2.4, zoom + 0.15); e.preventDefault(); }
        if (e.key === '-' || e.key === '_') { zoom = Math.max(0.45, zoom - 0.15); e.preventDefault(); }
        if (e.key === 'Escape') {
          $('#safe-drawer')?.classList.remove('open');
          treeActiveNode = null;
        }
      }
    });

    $('#drawer-close')?.addEventListener('click', () => {
      $('#safe-drawer')?.classList.remove('open');
      treeActiveNode = null;
      if (window.AllamTreeEngine?.getLeafLabelOverlay()) {
        window.AllamTreeEngine.getLeafLabelOverlay().markDirty();
      }
    });

    $('#btn-login-as-drawer-member')?.addEventListener('click', () => {
      if (!treeActiveNode || treeActiveNode.id === 'root') return;
      openUserAccountModal(treeActiveNode.id);
    });

    $('#btn-request-correction')?.addEventListener('click', () => {
      if (!treeActiveNode) return;
      $('#correction-person-name').value = cleanDisplayName(treeActiveNode.name);
      if ($('#correction-city-input')) $('#correction-city-input').value = (treeActiveNode.city && treeActiveNode.city !== '==') ? treeActiveNode.city : '';
      if ($('#correction-job-input')) $('#correction-job-input').value = (treeActiveNode.job && treeActiveNode.job !== '==') ? treeActiveNode.job : '';
      if ($('#correction-details')) $('#correction-details').value = treeActiveNode.bio || '';
      if ($('#correction-action-type')) {
        $('#correction-action-type').value = 'edit_self';
        $('#correction-action-type').dispatchEvent(new Event('change'));
      }
      $('#correction-dialog').showModal();
    });

    $('#btn-highlight-ancestry')?.addEventListener('click', () => {
      if (!treeActiveNode) return;
      if (window.AllamTreeEngine) {
        const path = window.AllamTreeEngine.getGraph()?.getAncestryPath(treeActiveNode.id) || [];
        if (path.length < 2) {
          showToast('لا يوجد مسار أبوة معتمد لهذا الشخص؛ العلاقة تحتاج مراجعة.');
          return;
        }
        window.AllamTreeEngine.highlightAncestryPath(treeActiveNode.id);
        showToast(`تم إضاءة روابط الأبوة المعتمدة المتاحة: ${cleanDisplayName(treeActiveNode.name)}`);
      }
    });
  }

  function openSafeDrawer(person) {
    treeActiveNode = person;
    const drawer = $('#safe-drawer');
    if (!drawer) return;
    const confirmedPath = window.AllamTreeEngine?.getGraph()?.getAncestryPath(person.id) || [];
    $('#btn-highlight-ancestry').disabled = person.id === 'root' || confirmedPath.length < 2;

    const regActive = isMemberRegistered(person);
    const isMasked = !isSymbolicRecord(person) && !regActive && treeRegistrationViewMode === 'gamified_masked';
    const cleanName = isMasked
      ? `🔒 مقعد عائلي بانتظار التسجيل (${person.branch || 'العائلة الافتراضية'})`
      : (String(person.name || '').replace(/\s*\.{2,}\s*/g, '').trim() || person.name);
    $('#drawer-name').textContent = cleanName;
    $('#drawer-badge').textContent = person.branch;
    $('#drawer-gen').textContent = `الجيل ${person.gen === 1 ? 'الأول' : person.gen === 2 ? 'الثاني' : person.gen === 3 ? 'الثالث' : 'الرابع'}`;
    $('#drawer-relation').textContent = isMasked ? `سجل في ${person.branch}` : person.relation;
    const linkStatus = person.parentLinkStatus;
    $('#drawer-status').textContent = isSymbolicRecord(person)
      ? 'عنصر عرض رمزي — لا يمثل شخصًا أو علاقة نسب'
      : isMasked
      ? 'السجل التفصيلي غير متاح في نسخة العرض'
      : linkStatus === 'CONFIRMED'
        ? 'رابط الأبوة مؤكد بتصحيح المستخدم'
        : linkStatus === 'CONFLICT_REVIEW'
          ? 'تعارض في رابط الأبوة — يحتاج مراجعة'
          : linkStatus === 'CANDIDATE_REVIEW' || linkStatus === 'UNRESOLVED'
            ? 'رابط الأبوة يحتاج مراجعة'
            : linkStatus === 'DISPLAY_TOPOLOGY'
              ? 'موضع بصري للفرع؛ لا يثبت الأبوة'
              : person.status;
    $('#drawer-bio').textContent = isMasked
      ? 'هذا موضع توضيحي في نسخة العرض. تسجيل الدخول وربط الأسماء غير متاحين في هذه النسخة.'
      : person.bio;

    drawer.classList.add('open');
    if (window.AllamTreeEngine?.getLeafLabelOverlay()) {
      window.AllamTreeEngine.getLeafLabelOverlay().markDirty();
    }
  }

  // Expose globally so Three.js engine (tree-engine.js) can trigger drawer on node click
  window.openSafeDrawer = openSafeDrawer;

  // Listen for Three.js canvas node-click events (fired when raycaster hits a medallion)
  document.getElementById('three-canvas')?.addEventListener('allam-node-click', e => {
    if (e.detail && e.detail.member) openSafeDrawer(e.detail.member);
  });


  const BRANCH_DETAILS_INFO = {
    'الفرع 1': {
      name: 'الفرع 1 — عنصر عرض',
      children: 'سجلات توضيحية فقط',
      desc: 'مجموعة رمزية لشرح العرض ثلاثي الأبعاد؛ لا تعرض أشخاصًا أو علاقات نسب.',
      orbit: '-45deg 70deg 4m',
      target: '-1.2m 3.0m -0.5m'
    },
    'الفرع 2': {
      name: 'الفرع 2 — عنصر عرض',
      children: 'سجلات توضيحية فقط',
      desc: 'مجموعة رمزية لشرح العرض ثلاثي الأبعاد؛ لا تعرض أشخاصًا أو علاقات نسب.',
      orbit: '-90deg 72deg 4m',
      target: '-1.3m 3.0m 0.3m'
    },
    'الفرع 3': {
      name: 'الفرع 3 — عنصر عرض',
      children: 'سجلات توضيحية فقط',
      desc: 'مجموعة رمزية لشرح العرض ثلاثي الأبعاد؛ لا تعرض أشخاصًا أو علاقات نسب.',
      orbit: '-135deg 70deg 4m',
      target: '-0.8m 3.1m 1.0m'
    },
    'الفرع 4': {
      name: 'الفرع 4 — عنصر عرض',
      children: 'سجلات توضيحية فقط',
      desc: 'مجموعة رمزية لشرح العرض ثلاثي الأبعاد؛ لا تعرض أشخاصًا أو علاقات نسب.',
      orbit: '145deg 70deg 4m',
      target: '0.6m 3.2m 0.9m'
    },
    'الفرع 5': {
      name: 'الفرع 5 — عنصر عرض',
      children: 'سجلات توضيحية فقط',
      desc: 'مجموعة رمزية لشرح العرض ثلاثي الأبعاد؛ لا تعرض أشخاصًا أو علاقات نسب.',
      orbit: '90deg 70deg 4m',
      target: '1.2m 3.0m 0.1m'
    },
    'الفرع 6': {
      name: 'الفرع 6 — عنصر عرض',
      children: 'سجلات توضيحية فقط',
      desc: 'مجموعة رمزية لشرح العرض ثلاثي الأبعاد؛ لا تعرض أشخاصًا أو علاقات نسب.',
      orbit: '45deg 70deg 4m',
      target: '1.0m 3.2m -0.7m'
    },
    'الفرع 7': {
      name: 'الفرع 7 — عنصر عرض',
      children: 'سجلات توضيحية فقط',
      desc: 'مجموعة رمزية لشرح العرض ثلاثي الأبعاد؛ لا تعرض أشخاصًا أو علاقات نسب.',
      orbit: '10deg 68deg 4.2m',
      target: '-0.3m 3.4m -1.0m'
    },
    'الفرع 8': {
      name: 'الفرع 8 — عنصر عرض',
      children: 'سجلات توضيحية فقط',
      desc: 'مجموعة رمزية لشرح العرض ثلاثي الأبعاد؛ لا تعرض أشخاصًا أو علاقات نسب.',
      orbit: '0deg 55deg 4m',
      target: '0.2m 3.8m -0.3m'
    },
    'الجذور الرمزية': {
      name: 'الجذور الرمزية',
      children: 'مدخل الفروع الثمانية في العرض',
      desc: 'ترتيب بصري لمداخل الفروع؛ اعتماد صلات النسب يتطلب مصدرًا مستقلًا ومراجعة بشرية.',
      orbit: '0deg 85deg 3.5m',
      target: '0m 0.6m 0m'
    }
  };

  function updateModelViewerLeafPins(branchKey) {
    const viewer = $('#tree-3d-model-viewer');
    if (!viewer) return;

    // Remove any previously dynamically injected leaf pins
    viewer.querySelectorAll('.dynamic-leaf-pin').forEach(el => el.remove());

    // Static preview exposes branch labels only; suppress legacy person pins.
    const husseinLeaves = viewer.querySelectorAll('.leaf-token:not(.dynamic-leaf-pin)');
    const isHussein = !PREVIEW_READ_ONLY && (branchKey === 'الفرع 1' || branchKey === 'all');
    husseinLeaves.forEach(el => {
      el.style.display = isHussein ? 'flex' : 'none';
      if (branchKey === 'الفرع 1') {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });

    if (PREVIEW_READ_ONLY || branchKey === 'all' || branchKey === 'الجذور الرمزية') return;

    if (branchKey !== 'الفرع 1') {
      // Find Gen 2 children of this branch from activeMembersData
      const branchChildren = activeMembersData.filter(m => m.branch === branchKey && m.gen === 2 && !m.relation.includes('زوجة')).slice(0, 6);
      const branchPin = viewer.querySelector(`.tree-hotspot-pin[data-branch="${branchKey}"]`);
      let basePos = [-1.0, 3.2, 0.0];
      if (branchPin && branchPin.getAttribute('data-position')) {
        basePos = branchPin.getAttribute('data-position').split(' ').map(Number);
      }

      branchChildren.forEach((child, idx) => {
        const pin = document.createElement('button');
        pin.className = 'tree-hotspot-pin leaf-token dynamic-leaf-pin';
        pin.slot = `hotspot-dyn-${branchKey.replace(/\s+/g, '')}-${idx}`;
        
        // Circular offset around the branch hotspot in 3D
        const angle = (idx / Math.max(1, branchChildren.length)) * Math.PI * 1.4 - 0.7;
        const px = (basePos[0] + Math.cos(angle) * 0.42).toFixed(2);
        const py = (basePos[1] + (idx % 2 === 0 ? 0.18 : -0.18)).toFixed(2);
        const pz = (basePos[2] + Math.sin(angle) * 0.42).toFixed(2);

        pin.setAttribute('data-position', `${px} ${py} ${pz}`);
        pin.setAttribute('data-normal', '0 1 0');
        pin.setAttribute('data-member-id', child.id);
        pin.setAttribute('data-branch', branchKey);

        const shortName = child.name.replace(/^\*/, '').trim().split(' ').slice(0, 2).join(' ');
        pin.innerHTML = `
          <span class="hotspot-leaf-icon">🍃</span>
          <span class="hotspot-title">${escapeHTML(shortName)}</span>
        `;
        viewer.appendChild(pin);
      });
    }
  }

  function selectTreeBranch(branchKey, orbit, target) {
    activeBranchFilter = branchKey || 'all';
    if (typeof refreshTreeLayout === 'function') {
      refreshTreeLayout();
    }

    const viewer = $('#tree-3d-model-viewer');
    if (viewer) {
      if (orbit) viewer.cameraOrbit = orbit;
      if (target) viewer.cameraTarget = target;
    }

    // ── Three.js Engine: filter medallions by branch ──
    if (window.AllamTreeEngine) {
      window.AllamTreeEngine.filterBranch(branchKey);
    }
    
    // Highlight pill
    $$('.branch-pill-chip').forEach(p => {
      p.classList.toggle('active', p.getAttribute('data-branch') === branchKey);
    });
    
    // Highlight hotspot (model-viewer fallback)
    $$('.tree-hotspot-pin').forEach(h => {
      h.classList.toggle('active', h.getAttribute('data-branch') === branchKey);
    });

    // Update 3D foliage leaf pins on the model viewer (fallback only)
    updateModelViewerLeafPins(branchKey);

    const branchData = BRANCH_DETAILS_INFO[branchKey];
    const count = getTreeDisplayMembers().filter(m => m.branch === branchKey).length;
    
    if (branchData) {
      const isDisplayRoot = branchKey === 'الجذور الرمزية';
      treeActiveNode = isDisplayRoot ? null :
        (activeMembersData.find(m => m.branch === branchKey && m.gen === 1) || null);
      $('#drawer-name').textContent = branchData.name;
      $('#drawer-badge').textContent = branchKey;
      $('#drawer-gen').textContent = isDisplayRoot ? 'الجذور — ترتيب عرض' : 'الجيل الثاني — الأبناء المباشرون';
      $('#drawer-relation').textContent = branchData.children;
      $('#drawer-status').textContent = isDisplayRoot
        ? 'وصلات الفروع في هذا العرض لا تثبت النسب'
        : `${count} فرداً في سجل العرض؛ الروابط غير المعتمدة تحتاج مراجعة`;
      $('#drawer-bio').textContent = branchData.desc;
      $('#btn-highlight-ancestry').disabled = isDisplayRoot;
      $('#safe-drawer')?.classList.add('open');
      if (window.AllamTreeEngine?.getLeafLabelOverlay()) {
        window.AllamTreeEngine.getLeafLabelOverlay().markDirty();
      }
      renderBranchHierarchy(branchKey);
      showToast(`تم تركيز العرض وشجرة النسب على: ${branchKey}`);
    } else if (branchKey === 'all') {
      treeActiveNode = null;
      if (viewer) {
        viewer.cameraOrbit = '0deg 75deg 6m';
        viewer.cameraTarget = '0 2.2 0';
      }
      $('#safe-drawer')?.classList.remove('open');
      if (window.AllamTreeEngine?.getLeafLabelOverlay()) {
        window.AllamTreeEngine.getLeafLabelOverlay().markDirty();
      }
      renderBranchHierarchy('الفرع 1');
      showToast('يُعرض الآن مجسم الشجرة ثلاثي الأبعاد بكامل فروعها.');
    }
  }

  function selectTreeMember(memberName, orbit, target) {
    const viewer = $('#tree-3d-model-viewer');
    if (viewer) {
      if (orbit) viewer.cameraOrbit = orbit;
      if (target) viewer.cameraTarget = target;
    }
    showToast('التفاصيل الفردية غير متاحة في نسخة العرض الرمزية.');
  }

  // ==============================================================================
  // Dynamic Lineage Hierarchy Tree Renderer
  // ==============================================================================
  let currentTreeBranch = 'الفرع 1';
  let currentSubFilter = 'all';
  let currentHierarchyQuery = '';

  function hasWord(text, word) {
    if (!text) return false;
    const tokens = text.split(/[\s\(\)\-\,\،\.]+/);
    return tokens.includes(word);
  }

  function renderBranchHierarchy(branchKey = currentTreeBranch, subFilter = currentSubFilter, query = currentHierarchyQuery) {
    currentTreeBranch = (branchKey === 'all' || !branchKey) ? 'الفرع 1' : branchKey;
    currentSubFilter = subFilter || 'all';
    currentHierarchyQuery = query !== undefined ? query : currentHierarchyQuery;

    const container = $('#hierarchy-tree-container');
    const chipsBar = $('#sub-family-chips-bar');
    const titleEl = $('#hierarchy-branch-title');
    const badgeEl = $('#hierarchy-branch-badge');
    const descEl = $('#hierarchy-branch-desc');
    const countBadge = $('#hierarchy-count-badge');

    if (!container) return;

    if (currentTreeBranch === 'الجذور الرمزية') {
      if (badgeEl) badgeEl.textContent = 'الجذور الرمزية';
      if (titleEl) titleEl.textContent = 'الجذور الرمزية — مداخل الفروع الثمانية';
      if (descEl) descEl.textContent = 'ترتيب بصري للفروع في الشجرة؛ لا يثبت صلات النسب دون مصدر معتمد.';
      if (countBadge) countBadge.textContent = '٨ مداخل فروع';
      if (chipsBar) chipsBar.innerHTML = '';
      const searchInput = $('#hierarchy-search-input');
      if (searchInput) {
        searchInput.value = '';
        searchInput.placeholder = 'اختر أحد الفروع للبحث في أفراده';
        searchInput.disabled = true;
      }
      container.innerHTML = `
        <div class="branch-patriarch-card">
          <span class="patriarch-badge-tag">جذر العرض</span>
          <h4 style="margin:2px 0 6px; font-size:16px; color:var(--green); font-weight:800;">الجذور الرمزية</h4>
          <p style="font-size:12px; color:var(--muted); margin:0 0 12px; line-height:1.6;">اختر مدخل فرع لاستكشاف أفراده. الربط هنا لتنظيم العرض ولا يعد إثباتاً للنسب.</p>
          <div class="patriarch-grid">
            ${BRANCHES.map(branch => `<button type="button" class="branch-pill-chip" data-branch="${escapeHTML(branch)}" style="margin:4px;">${escapeHTML(branch)}</button>`).join('')}
          </div>
        </div>`;
      return;
    }

    // Preview policy: show the branch label, never person records or hand-written
    // subfamily names before membership and lineage review are actually enabled.
    if (PREVIEW_READ_ONLY) {
      const branchNode = getTreeDisplayMembers().find(m => m.recordType === 'main_branch' && m.branch === currentTreeBranch);
      const branchLabel = branchNode?.name || currentTreeBranch;
      if (badgeEl) badgeEl.textContent = currentTreeBranch;
      if (titleEl) titleEl.textContent = branchLabel;
      if (descEl) descEl.textContent = 'يظهر هذا الفرع كمدخل رئيسي فقط. تُضاف أسماء الأفراد بعد توثيق العضوية ومراجعة صلة النسب وموافقة صاحب الاسم.';
      if (countBadge) countBadge.textContent = 'مدخل فرع رئيسي';
      if (chipsBar) chipsBar.innerHTML = '';
      const searchInput = $('#hierarchy-search-input');
      if (searchInput) {
        searchInput.value = '';
        searchInput.placeholder = 'بحث الأفراد غير متاح في نسخة العرض';
        searchInput.disabled = true;
      }
      container.innerHTML = `<div class="branch-patriarch-card"><span class="patriarch-badge-tag">فرع رئيسي</span><h4 style="margin:2px 0 6px; font-size:16px; color:var(--green); font-weight:800;">${escapeHTML(branchLabel)}</h4><p style="font-size:12px; color:var(--muted); margin:0; line-height:1.6;">الأسماء الفردية لا تظهر في المعاينة.</p></div>`;
      return;
    }

    const searchInput = $('#hierarchy-search-input');
    if (searchInput) {
      searchInput.disabled = false;
      searchInput.placeholder = '🔍 بحث سريع في هذا الفرع...';
    }

    // Get all verified members for this branch
    const branchMembers = getTreeDisplayMembers().filter(m => m.id !== 'root' && m.branch === currentTreeBranch);

    let founders = [];
    let subFamilies = [];

    if (currentTreeBranch === 'الفرع 1') {
      founders = branchMembers.filter(m => m.gen === 1);
      subFamilies = [
        { id: 'sub_suleiman', name: 'اسم تجريبي بن 1 للجذور الرمزية (رحمه الله)', shortName: 'اسم تجريبي 1', match: m => !founders.some(f => f.id === m.id) && (hasWord(m.name, 'اسم تجريبي') || hasWord(m.relation, 'اسم تجريبي')) },
        { id: 'sub_zaki', name: 'اسم تجريبي بن 1 للجذور الرمزية (رحمه الله)', shortName: 'اسم تجريبي 1', match: m => !founders.some(f => f.id === m.id) && (hasWord(m.name, 'اسم تجريبي') || hasWord(m.relation, 'اسم تجريبي')) },
        { id: 'sub_hassan', name: 'اسم تجريبي بن 1 للجذور الرمزية', shortName: 'اسم تجريبي 1', match: m => !founders.some(f => f.id === m.id) && (hasWord(m.name, 'اسم تجريبي') || hasWord(m.relation, 'اسم تجريبي') || (m.relation && (m.relation.includes('اسم تجريبي') || m.relation.includes('اسم تجريبي')))) },
        { id: 'sub_safaa', name: 'اسم تجريبي بنت 1 للجذور الرمزية', shortName: 'اسم تجريبي 1', match: m => !founders.some(f => f.id === m.id) && (hasWord(m.name, 'اسم تجريبي') || hasWord(m.relation, 'اسم تجريبي') || (m.name && m.name.includes('أحمد اسم تجريبي')) || (m.relation && m.relation.includes('أحمد اسم تجريبي'))) },
        { id: 'sub_sami', name: 'اسم تجريبي بن 1 للجذور الرمزية', shortName: 'اسم تجريبي 1', match: m => !founders.some(f => f.id === m.id) && (hasWord(m.name, 'اسم تجريبي') || hasWord(m.relation, 'اسم تجريبي')) },
        { id: 'sub_sadiq', name: 'اسم تجريبي بن 1 للجذور الرمزية', shortName: 'اسم تجريبي 1', match: m => !founders.some(f => f.id === m.id) && (hasWord(m.name, 'اسم تجريبي') || hasWord(m.relation, 'اسم تجريبي')) }
      ];
    } else {
      founders = branchMembers.filter(m => m.gen === 1);
      const gen2Pillars = branchMembers.filter(m => m.gen === 2 && !m.relation.includes('زوجة'));
      subFamilies = gen2Pillars.map(p => {
        const cleanName = p.name.replace(/^\*/, '').trim();
        const fName = cleanName.split(' ')[0];
        const sName = cleanName.split(' ').slice(0, 2).join(' ');
        return {
          id: 'sub_' + p.id,
          name: cleanName,
          shortName: sName,
          match: m => !founders.some(f => f.id === m.id) && (m.id === p.id || hasWord(m.name, fName) || hasWord(m.relation, fName))
        };
      });
    }

    // Partition members across subfamilies with exact uniqueness
    const assignedIds = new Set(founders.map(f => f.id));
    const subFamilyBuckets = subFamilies.map(sub => {
      const list = branchMembers.filter(m => !assignedIds.has(m.id) && sub.match(m));
      list.forEach(m => assignedIds.add(m.id));
      return { ...sub, members: list, count: list.length };
    });

    const unassignedMembers = branchMembers.filter(m => !assignedIds.has(m.id));

    // Update Header
    if (badgeEl) badgeEl.textContent = currentTreeBranch;
    if (titleEl) titleEl.textContent = `أفراد ${currentTreeBranch} (${branchMembers.length} سجلًا)`;
    if (descEl) descEl.textContent = 'المجموعات أدناه للتصفح بحسب الاسم والوصف؛ لا تثبت الأبوة أو الأمومة. تظهر روابط النسب المعتمدة وحدها في الشجرة.';
    if (countBadge) countBadge.textContent = `${branchMembers.length} سجلًا في العرض`;

    // Render Sub-Family Filter Chips
    if (chipsBar) {
      chipsBar.innerHTML = `
        <button class="sub-family-chip ${currentSubFilter === 'all' ? 'active' : ''}" data-sub="all">
          الكل (${branchMembers.length})
        </button>
        ${founders.length ? `
        <button class="sub-family-chip ${currentSubFilter === 'founders' ? 'active' : ''}" data-sub="founders">
          🌿 مدخل الفرع (${founders.length})
        </button>` : ''}
      ` + subFamilyBuckets.map(sub => `
        <button class="sub-family-chip ${currentSubFilter === sub.id ? 'active' : ''}" data-sub="${sub.id}">
          🌿 ${escapeHTML(sub.shortName)} (${sub.count})
        </button>
      `).join('') + (unassignedMembers.length ? `
        <button class="sub-family-chip ${currentSubFilter === 'unassigned' ? 'active' : ''}" data-sub="unassigned">
          ✨ سائر أفراد وأصهار الفرع (${unassignedMembers.length})
        </button>
      ` : '');
    }

    const q = (currentHierarchyQuery || '').trim().toLocaleLowerCase('ar');

    let renderedHtml = '';

    // 1. Render Branch Patriarch / Ancestor Card
    if (founders.length && (currentSubFilter === 'all' || currentSubFilter === 'founders')) {
      const filteredFounders = q ? founders.filter(m => `${m.name} ${m.relation} ${m.bio} ${m.city || ''}`.toLocaleLowerCase('ar').includes(q)) : founders;
      if (filteredFounders.length > 0) {
        renderedHtml += `
          <div class="branch-patriarch-card">
            <span class="patriarch-badge-tag">🏛️ أصول وجذور ${escapeHTML(currentTreeBranch)} (الجيل الأول)</span>
            <h4 style="margin:2px 0 6px; font-size:16px; color:var(--green); font-weight:800;">
              سجلات مدخل الفرع
            </h4>
            <p style="font-size:12px; color:var(--muted); margin:0 0 12px; line-height:1.6;">
              مدخل بصري للفرع من سجل العرض المحلي. تفاصيل القرابة تحتاج دليلًا معتمدًا مستقلًا.
            </p>
            <div class="patriarch-grid">
              ${filteredFounders.map(f => `
                <div class="patriarch-person-box member-node-pill" data-member-id="${f.id}">
                  <span class="member-node-avatar founder">★</span>
                  <div class="member-node-info">
                    <span class="member-node-name">${escapeHTML(f.name)}</span>
                    <span class="member-node-relation">${escapeHTML(f.relation === 'نفسه' ? 'مدخل بصري للفرع' : (f.relation || 'وصف في السجل'))}</span>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }
    }

    // 2. Render Sub-Family Cards
    const visibleSubFamilies = currentSubFilter === 'all'
      ? subFamilyBuckets
      : subFamilyBuckets.filter(s => s.id === currentSubFilter);

    visibleSubFamilies.forEach(sub => {
      let membersInSub = sub.members;
      if (treeRegistrationViewMode === 'strict_registered') {
        membersInSub = membersInSub.filter((m, idx) => idx === 0 || m.gen <= 2 || isMemberRegistered(m));
      }
      if (q) {
        membersInSub = membersInSub.filter(m =>
          `${m.name} ${m.relation} ${m.bio} ${m.job || ''} ${m.city || ''} ${m.edu || ''}`.toLocaleLowerCase('ar').includes(q)
        );
      }
      if (!membersInSub.length) return;

      const head = membersInSub.find(m => m.gen === 2 && !m.relation.includes('زوجة')) || membersInSub[0];
      const others = membersInSub.filter(m => m.id !== head.id);
      renderedHtml += `
        <div class="sub-family-card">
          <div class="sub-family-header">
            <div class="sub-family-title">
              <span style="font-size:18px;">🌿</span>
              <span>${escapeHTML(sub.name)}</span>
              <span style="font-size:11px; font-weight:700; color:#475569; background:#f1f5f9; padding:2px 8px; border-radius:99px; margin-right:6px;">معاينة رمزية</span>
            </div>
            <span class="sub-family-count">${membersInSub.length} سجلًا</span>
          </div>

          <div class="sub-family-members-grid">
            <!-- Head Pillar -->
            <div class="member-node-pill" data-member-id="${head.id}" style="border: 1.5px solid var(--gold); background: #fdfaf0;">
              <span class="member-node-avatar" style="background:var(--gold-soft); color:var(--gold-dark);">★</span>
              <div class="member-node-info">
                <span class="member-node-name">${escapeHTML(head.name)}</span>
                <span class="member-node-relation">${escapeHTML(head.relation || 'الابن / الابنة')}</span>
              </div>
            </div>

            <!-- Descendants & Spouses -->
            ${others.map(m => {
              const isFemale = (m.gender && m.gender.includes('أنثى')) || (m.relation && (m.relation.includes('زوجة') || m.relation.includes('بنت') || m.relation.includes('ابنة') || m.relation.includes('حفيدة')));
              const regActive = isMemberRegistered(m);
              const isMasked = !regActive && treeRegistrationViewMode === 'gamified_masked';
              const acc = userAccounts && userAccounts[m.id];
              const dispName = getMemberTreeDisplayName(m, false);
              const subRelText = isMasked
              ? '🔒 سجل مخفي في نسخة العرض'
                : (acc?.googleEmail ? `🔵 مسجّل عبر Google • ${m.relation || 'الجيل ' + (m.gen || 3)}` : regActive ? `✓ مفعّل بالشجرة • ${m.relation || 'الجيل ' + (m.gen || 3)}` : (m.relation || `الجيل ${m.gen || 3}`));
              return `
                <div class="member-node-pill" data-member-id="${m.id}" style="${isMasked ? 'border:1.5px dashed rgba(218,178,94,0.65); background:#fffdf7; opacity:0.92;' : regActive ? 'border:1.5px solid rgba(16,185,129,0.45); background:#f0fdf4;' : ''}">
                  <span class="member-node-avatar ${isFemale ? 'female' : ''}" style="${isMasked ? 'background:#fef3c7; color:#92400e;' : regActive ? 'background:#10b981; color:#fff;' : ''}">${isMasked ? '🔒' : isFemale ? '👩' : '👨'}</span>
                  <div class="member-node-info">
                    <span class="member-node-name" style="${isMasked ? 'color:#92400e; font-size:12px;' : ''}">${escapeHTML(dispName)}</span>
                    <span class="member-node-relation" style="${regActive && !isMasked ? 'color:#047857; font-weight:700;' : ''}">${escapeHTML(subRelText)}</span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    });

    // 3. Render Unassigned / In-Laws Section if any
    if (unassignedMembers.length && (currentSubFilter === 'all' || currentSubFilter === 'unassigned')) {
      let filteredRemaining = q ? unassignedMembers.filter(m => `${m.name} ${m.relation} ${m.bio}`.toLocaleLowerCase('ar').includes(q)) : unassignedMembers;
      if (treeRegistrationViewMode === 'strict_registered') {
        filteredRemaining = filteredRemaining.filter(m => isMemberRegistered(m));
      }
      if (filteredRemaining.length > 0) {
        renderedHtml += `
          <div class="sub-family-card" style="border-style:dashed;">
            <div class="sub-family-header">
              <div class="sub-family-title">
                <span>✨</span>
                <span>سائر سجلات ${escapeHTML(currentTreeBranch)}</span>
              </div>
              <span class="sub-family-count">${filteredRemaining.length} سجلًا</span>
            </div>
            <div class="sub-family-members-grid">
              ${filteredRemaining.map(m => {
                const regActive = isMemberRegistered(m);
                const isMasked = !regActive && treeRegistrationViewMode === 'gamified_masked';
                const dispName = getMemberTreeDisplayName(m, false);
                return `
                <div class="member-node-pill" data-member-id="${m.id}" style="${isMasked ? 'border:1.5px dashed rgba(218,178,94,0.65); background:#fffdf7;' : ''}">
                  <span class="member-node-avatar">${isMasked ? '🔒' : '👥'}</span>
                  <div class="member-node-info">
                    <span class="member-node-name">${escapeHTML(dispName)}</span>
                    <span class="member-node-relation">${escapeHTML(isMasked ? '🔑 سجّل ليظهر اسمك في الشجرة' : (m.relation || 'وصف في السجل'))}</span>
                  </div>
                </div>
                `;
              }).join('')}
            </div>
          </div>
        `;
      }
    }

    if (!renderedHtml) {
      container.innerHTML = `
        <div class="empty-state">
          <span>🔍</span>
          <b>لم نعثر على أفراد مطابقين للبحث "${escapeHTML(q)}" في هذا الفرع</b>
          <p>يمكنك مسح عبارة البحث أو اختيار فرع عائلي آخر لعرض كافة أفراده.</p>
        </div>
      `;
    } else {
      container.innerHTML = renderedHtml;
    }
  }

  function renderAccessibleTable() {
    const tbody = $('#tree-table-body');
    if (!tbody) return;

    tbody.innerHTML = getTreeDisplayMembers().map(p => `
      <tr>
        <td><b>${escapeHTML(p.name)}</b></td>
        <td><span class="member-branch-badge">${escapeHTML(p.branch)}</span></td>
        <td>الجيل ${p.gen}</td>
        <td>${escapeHTML(p.relation)}</td>
        <td><span class="status review">${escapeHTML(p.status)}</span></td>
      </tr>
    `).join('');
  }

  // ==========================================
  // 4. MEETINGS & SPEECH EDITING
  // ==========================================
  function initMeetings() {
    const defaultSpeeches = {
      hussein: 'بسم الله الرحمن الرحيم، نرحب بجميع الإخوة والأخوات. الفرع 1 يؤكد دعمه الكامل لمسيرة الألفة وصلة الرحم، ونقترح التركيز على رعاية كبار السن ودعم شباب العائلة المبتدئين في مسارهم المهني.',
      khalid: 'السلام عليكم ورحمة الله، نشد على أيدي القائمين على هذا اللقاء المبارك. نرى أهمية أن يكون اللقاء الشهري دوريًا ومبسطًا لتعزيز الترابط بين أحفاد الجيل الرابع والخامس.',
      kamal: 'مساء الخير للجميع، نبارك هذه الخطوة المباركة في توثيق الأنساب وحفظ تاريخ الأسرة، ونوصي باعتماد آلية واضحة وموثقة للتحقق من شجرة النسب بالتعاون مع كبار العائلة.',
      jamal: 'أهلاً بجميع الأهل والأحبة. نؤيد مسار حوكمة صندوق العائلة بما يضمن الشفافية والامتثال للأنظمة، مع إعطاء الأولوية القصوى للمنح التعليمية وتشجيع التفوق الدراسي.',
      muhammad: 'الحمد لله الذي جمعنا على الخير. نشكر الجميع على هذا التفاعل الإيجابي ونتطلع أن يكون مجلس العائلة الافتراضية مظلة جامعة لكل أبناء وأحفاد الأسرة دون استثناء.',
      mastoora: 'نبارك هذا الاجتماع الأخوي الطيب، ونؤكد على دور بنات وأمهات الأسرة في تنظيم الفعاليات الاجتماعية، وحلقات التعريف الموجهة للأطفال والناشئة لترسيخ الهوية العائلية.',
      najiya: 'سعداء بهذا اللقاء المبارك. نقترح إنشاء لجنة تطوعية شبابية من أبناء وبنات العائلة لإدارة المنصة الرقمية وتنظيم الأنشطة واللقاءات بكفاءة.',
      huda: 'تحية طيبة لكل أفراد الأسرة الكريمة. نوصي بأن يخصص جزء من كل لقاء سنوي للاحتفاء بإنجازات المبدعين وحفظة القرآن الكريم وأصحاب المبادرات من أبناء العائلة.'
    };

    const savedSpeeches = loadStored(STORAGE_KEYS.speeches, defaultSpeeches);
    Object.keys(savedSpeeches).forEach(key => {
      const el = $(`#speech-branch-${key}`);
      if (el) el.value = savedSpeeches[key];
    });

    $('#btn-save-speeches')?.addEventListener('click', () => {
      const updated = {};
      Object.keys(defaultSpeeches).forEach(key => {
        const el = $(`#speech-branch-${key}`);
        if (el) updated[key] = el.value.trim();
      });
      saveStored(STORAGE_KEYS.speeches, updated);
      showToast('تم حفظ مسودات كلمات ممثلي الفروع محليًا في المتصفح.');
    });

    $('#btn-export-agenda')?.addEventListener('click', () => {
      const branchNames = {
        hussein: 'الفرع 1 للجذور الرمزية',
        khalid: 'الفرع 2 للجذور الرمزية',
        kamal: 'الفرع 3 للجذور الرمزية',
        jamal: 'الفرع 4 للجذور الرمزية',
        muhammad: 'الفرع 5 للجذور الرمزية',
        mastoora: 'الفرع 6 للجذور الرمزية',
        najiya: 'الفرع 7 للجذور الرمزية',
        huda: 'الفرع 8 للجذور الرمزية'
      };

      let speechesDoc = '';
      Object.keys(branchNames).forEach((k, idx) => {
        const text = $(`#speech-branch-${k}`)?.value.trim() || defaultSpeeches[k];
        speechesDoc += `\n### ${idx + 1}. كلمة ${branchNames[k]}\n> "${text}"\n`;
      });

      const fullDoc = `# وثيقة ومسودة أعمال اللقاء التأسيسي العام لأسرة العائلة الافتراضية
**التاريخ المقترح:** ١٥ نوفمبر ٢٠٢٦م | **المكان:** قاعة المناسبات الكبرى — مدينة افتراضية
**شعار اللقاء:** "جذورٌ تجمعنا، وأثرٌ يمتد" (من الجذور الرمزية بدأت حكايتنا)

---

## 1. جدول الأعمال الزمني المعتمد (٩٠ - ١٢٠ دقيقة)

| الفقرة | المدة | المتحدث / المسؤول | المخرج المستهدف |
|---|---|---|---|
| **الافتتاح والقرآن الكريم** | ١٠ دقائق | أحد أبناء الجيل الصاعد | افتتاح رسمي مبارك وتذكير بصلة الرحم |
| **عرض مرئي وثائقي (شجرة العائلة الافتراضية 3D)** | ١٥ دقيقة | فريق التوثيق والتقنية | استعراض الأصول الثمانية والأجيال الأربعة |
| **كلمات ممثلي الفروع الثمانية** | ٣٠ دقيقة | ممثلو الفروع (٣-٤ دقائق لكل فرع) | إعلان الدعم والتكاتف وتقديم مقترحات الفرع |
| **مناقشة أهداف اللقاءات الدورية** | ١٥ دقيقة | حوار مفتوح بين الحضور | تحديد أولويات وبرامج السنة الأولى |
| **عرض مقترح مجلس العائلة الافتراضية** | ٢٠ دقيقة | كبار الأسرة واللجنة التحضيرية | مسودة التشكيل للمصادقة وتكليف الأعضاء |
| **صندوق العائلة والمسار النظامي** | ١٥ دقيقة | المستشار التنظيمي | التأكيد الصارم على عدم التحصيل قبل ترخيص NCNP |
| **تدوين التوصيات واعتماد المحضر** | ١٠ دقائق | كاتب المحضر والمجلس المقترح | توقيع مسودة المحضر وتحديد موعد اللقاء القادم |

---

## 2. مسودات كلمات ممثلي الفروع الثمانية
${speechesDoc}

---

## 3. تنبيه نظامي وعائلي
- هذه الوثيقة مسودة عمل استرشادية خاصة باللقاء العائلي التحضيري.
- صندوق العائلة يخضع للمركز الوطني لتنمية القطاع غير الربحي (NCNP) ولا يجوز جمع أي تبرعات أو أموال قبل صدور الترخيص النظامي المستقل.
- كافة بيانات الأنساب تخضع لتدقيق كبار العائلة وموافقة أصحاب الشأن وفق نظام حماية البيانات الشخصية السعودي (PDPL).

*تم التوليد والتصدير محلياً عبر بوابة معاينة رمزية الرقمية.*
`;

      const blob = new Blob([fullDoc], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `مسودة_جدول_أعمال_لقاء_آل_علام_${new Date().toISOString().slice(0, 10)}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('تم تصدير وتحميل مسودة جدول الأعمال والكلمات بنجاح!');
    });

    $('#btn-quick-rsvp-1')?.addEventListener('click', () => {
      saveStored(STORAGE_KEYS.rsvp, { status: 'حاضر', meeting: 'اللقاء التأسيسي الأول', date: new Date().toLocaleDateString('ar-SA') });
      showToast('تم تسجيل اهتمامك بحضور اللقاء التأسيسي الأول محليًا.');
    });

    $('#btn-subscribe-reminders')?.addEventListener('click', () => {
      showToast('تم تفعيل تنبيهات اللقاءات الدورية في متصفحك.');
    });

    $('#btn-open-rsvp')?.addEventListener('click', () => {
      showToast('نظام RSVP محلي: تم تأكيد تسجيل الحضور للقاء القادم.');
    });
  }

  // ==========================================
  // 5. CONTRIBUTIONS, NEWS & MULTIMEDIA FEED
  // ==========================================
  const ROLE_HIERARCHY = {
    super_admin: {
      level: 1,
      badge: 'مدير حسابات العائلة',
      shortBadge: 'مدير الحسابات',
      color: '#8d6518',
      bg: '#fdf6e4',
      summary: 'دور مقترح وغير مفعّل؛ يحتاج تكليفًا عائليًا، ولا يثبت صلة النسب أو يمنح وصولًا تلقائيًا للبيانات الخاصة.'
    },
    branch_rep: {
      level: 2,
      badge: 'مراجع عضوية الفرع',
      shortBadge: 'مراجع الفرع',
      color: '#0f6856',
      bg: '#e6f4f1',
      summary: 'دور مقترح وغير مفعّل؛ يراجع طلبات العضوية ضمن فرعه ولا يعتمد النسب النهائي أو يدير الأدوار.'
    },
    family_head: {
      level: 3,
      badge: 'منسق بيانات الأسرة',
      shortBadge: 'منسق الأسرة',
      color: '#1d4ed8',
      bg: '#eff6ff',
      summary: 'دور مقترح وغير مفعّل؛ يقتصر على تنسيق طلبات الأسرة ولا يمنح اعتمادًا تلقائيًا للعلاقات.'
    },
    member: {
      level: 4,
      badge: 'عضو موثّق',
      shortBadge: 'عضو موثّق',
      color: '#475569',
      bg: '#f1f5f9',
      summary: 'دور مقترح وغير مفعّل؛ يدير العضو بياناته وتفضيلات ظهورها، ولا يعدّل سجلات الآخرين.'
    }
  };

  function inferDefaultRoleForMember(member) {
    // A static preview cannot infer or grant account privileges from a name,
    // branch, generation, or locally edited record.
    return 'member';
  }

  function canCurrentUserEditTarget(targetNode, isAddingChildOrSpouse = false) {
    if (!targetNode) return false;
    // If not logged in yet, allow direct local testing or prompt role check
    if (!currentUser || !currentUser.memberId) return false;
    const role = currentUser.role || 'member';
    if (role === 'super_admin') return true;
    if (role === 'branch_rep') {
      return targetNode.branch === currentUser.branch;
    }
    if (role === 'family_head') {
      return (
        targetNode.id === currentUser.memberId ||
        targetNode.parentId === currentUser.memberId ||
        targetNode.candidateParentId === currentUser.memberId ||
        targetNode.partnerId === currentUser.memberId
      );
    }
    // Level 4 ('member') can edit their own record (and add their own spouse/child if they become family_head)
    return targetNode.id === currentUser.memberId && !isAddingChildOrSpouse;
  }

  function renderContributions() {
    const container = $('#contributions-container');
    if (!container) return;

    const filtered = contributions
      .filter(item => activeContribFilter === 'all' || item.category === activeContribFilter)
      .slice()
      .sort((a, b) => {
        if (Boolean(b.pinned) !== Boolean(a.pinned)) return b.pinned ? 1 : -1;
        return 0;
      });

    if (!filtered.length) {
      container.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1">
          <span>📰</span>
          <b>لا توجد منشورات متاحة في نسخة المعاينة</b>
          <p>لن تُرفع أخبار أو صور أو فيديوهات حتى تفعيل المصادقة والتخزين والمراجعة.</p>
        </div>
      `;
      return;
    }

    const userRole = currentUser?.role || 'member';
    const isModerator = userRole === 'super_admin' || userRole === 'branch_rep';

    container.innerHTML = filtered.map(item => {
      const rInfo = ROLE_HIERARCHY[item.authorRole] || ROLE_HIERARCHY.member;
      let mediaHtml = '';
      if (item.mediaUrl) {
        if (item.mediaType === 'video' || /\.(mp4|webm|ogg)$/i.test(item.mediaUrl) || String(item.mediaUrl).startsWith('data:video')) {
          mediaHtml = `
            <div style="margin: 8px 0 10px; border-radius: 10px; overflow: hidden; background: #07130f; border: 1px solid var(--border);">
              <video src="${escapeHTML(item.mediaUrl)}" controls playsinline preload="metadata" style="width: 100%; max-height: 230px; display: block; object-fit: cover;"></video>
            </div>
          `;
        } else {
          mediaHtml = `
            <div style="margin: 8px 0 10px; border-radius: 10px; overflow: hidden; border: 1px solid var(--border); background: #f8faf9; position:relative; cursor:pointer;" data-lightbox-src="${escapeHTML(item.mediaUrl)}" data-lightbox-title="${escapeHTML(item.title)}" title="انقر لتكبير الصورة">
              <img src="${escapeHTML(item.mediaUrl)}" alt="${escapeHTML(item.title)}" loading="lazy" style="width: 100%; max-height: 230px; object-fit: cover; display: block;">
              <span style="position:absolute; bottom:8px; left:8px; background:rgba(0,0,0,0.62); color:#fff; font-size:10.5px; padding:2px 8px; border-radius:12px;">🔍 تكبير</span>
            </div>
          `;
        }
      }

      const canDelete = isModerator || (currentUser && item.authorId === currentUser.memberId);
      const comments = Array.isArray(item.comments) ? item.comments : [];
      const commentsHtml = comments.length
        ? `<div style="margin:6px 0; padding:6px 8px; background:rgba(16,59,50,0.03); border-radius:8px; border:1px solid var(--border); max-height:110px; overflow-y:auto; display:flex; flex-direction:column; gap:4px;">
            ${comments.map(cm => `<div style="font-size:11px; line-height:1.45;"><b style="color:var(--primary);">${escapeHTML(cm.author || 'عضو العائلة')}:</b> ${escapeHTML(cm.text || '')}</div>`).join('')}
          </div>`
        : '';

      return `
      <article class="contribution-card" style="display:flex; flex-direction:column; ${item.pinned ? 'border:2px solid #c5a059; background:linear-gradient(180deg, #fffdf7 0%, #ffffff 100%);' : ''}">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:6px; margin-bottom:6px; flex-wrap:wrap;">
          <span class="contribution-badge approved" style="${item.pinned ? 'background:#fef6e4; color:#7a5510; border:1px solid #d4af37;' : ''}">${item.pinned ? '📌 عنصر عرض مثبت' : 'عنصر عرض محلي'}</span>
          <span style="font-size:11px; font-weight:700; padding:2px 8px; border-radius:12px; background:${rInfo.bg}; color:${rInfo.color};">${escapeHTML(rInfo.shortBadge)}</span>
        </div>
        <span class="card-subtitle">${escapeHTML(item.category)}${item.date ? ' • ' + escapeHTML(item.date) : ''}</span>
        <h3 style="margin:4px 0 6px;">${escapeHTML(item.title)}</h3>
        ${mediaHtml}
        <p style="flex:1; margin-bottom:8px;">${escapeHTML(item.body)}</p>
        ${commentsHtml}
        <form class="contrib-comment-form" data-comment-post-id="${escapeHTML(item.id)}" style="display:flex; gap:5px; margin:6px 0 8px;">
          <input type="text" class="contrib-comment-input" name="commentText" placeholder="💬 اكتب مباركة أو تعليقاً عائلياً..." maxlength="160" required style="flex:1; padding:5px 9px; font-size:11.5px; border-radius:8px; border:1px solid var(--border); font-family:inherit;">
          <button type="submit" class="button button-outline" style="padding:4px 10px; font-size:11px;">إرسال</button>
        </form>
        <div class="contribution-footer" style="margin-top:auto; padding-top:8px; border-top:1px solid var(--border); display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:6px;">
          <span style="font-size:11.5px;">الكاتب: <b>${escapeHTML(item.author)}</b></span>
          <div style="display:flex; align-items:center; gap:5px;">
            <button type="button" class="button button-quiet" data-like-contrib="${escapeHTML(item.id)}" style="padding:4px 9px; font-size:11.5px; background:#fdf2f8; color:#be185d; border:1px solid #fbcfe8;">
              ❤️ بارك الله (${item.likes || 1})
            </button>
            ${isModerator ? `<button type="button" class="button button-quiet" data-pin-contrib="${escapeHTML(item.id)}" title="${item.pinned ? 'إلغاء تثبيت المنشور' : 'تثبيت المنشور في الأعلى'}" style="padding:4px 7px; font-size:11px; color:#7a5510; background:#fef6e4;">📌</button>` : ''}
            ${canDelete ? `<button type="button" class="button button-quiet" data-delete-contrib="${escapeHTML(item.id)}" title="حذف المنشور" style="padding:4px 7px; font-size:11px; color:#b42318;">🗑️</button>` : ''}
          </div>
        </div>
      </article>
      `;
    }).join('');
  }

  // ==========================================
  // 6. ROLES DIRECTORY, CLOUD AUDIT LOG & REQUESTS
  // ==========================================
  function getEffectiveRoleForMember(m) {
    if (!m) return 'member';
    if (userAccounts && userAccounts[m.id] && userAccounts[m.id].role && ROLE_HIERARCHY[userAccounts[m.id].role]) {
      return userAccounts[m.id].role;
    }
    return inferDefaultRoleForMember(m);
  }

  function renderRolesDirectory() {
    const dirList = $('#roles-directory-list');
    if (!dirList) return;

    if (PREVIEW_READ_ONLY) {
      ['super_admin', 'branch_rep', 'family_head', 'member'].forEach(role => {
        const count = $(`#role-count-${role}`);
        if (count) count.textContent = 'غير متاح';
      });
      dirList.innerHTML = '<div role="status" style="grid-column:1/-1;text-align:center;padding:18px;color:var(--muted);">لا توجد حسابات موثقة لعرضها أو تعيين صلاحيات لها في نسخة المعاينة.</div>';
      return;
    }

    const allReal = activeMembersData.filter(m => m.id !== 'root');
    const counts = { super_admin: 0, branch_rep: 0, family_head: 0, member: 0 };
    allReal.forEach(m => {
      const r = getEffectiveRoleForMember(m);
      counts[r] = (counts[r] || 0) + 1;
    });

    if ($('#role-count-super_admin')) $('#role-count-super_admin').textContent = String(counts.super_admin);
    if ($('#role-count-branch_rep')) $('#role-count-branch_rep').textContent = String(counts.branch_rep);
    if ($('#role-count-family_head')) $('#role-count-family_head').textContent = String(counts.family_head);
    if ($('#role-count-member')) $('#role-count-member').textContent = String(counts.member);

    const branchFilter = $('#roles-branch-filter')?.value || 'all';
    const tierFilter = $('#roles-tier-filter')?.value || 'all';
    const searchVal = ($('#roles-member-search')?.value || '').trim().toLocaleLowerCase('ar');

    const filtered = allReal.filter(m => {
      const r = getEffectiveRoleForMember(m);
      const matchBranch = branchFilter === 'all' || m.branch === branchFilter;
      const matchTier = tierFilter === 'all' || r === tierFilter;
      const matchSearch = !searchVal || `${m.name} ${m.branch} ${m.relation}`.toLocaleLowerCase('ar').includes(searchVal);
      return matchBranch && matchTier && matchSearch;
    });

    // Sort by role hierarchy level (1 -> 4)
    filtered.sort((a, b) => {
      const la = ROLE_HIERARCHY[getEffectiveRoleForMember(a)]?.level || 4;
      const lb = ROLE_HIERARCHY[getEffectiveRoleForMember(b)]?.level || 4;
      if (la !== lb) return la - lb;
      return (a.gen || 3) - (b.gen || 3);
    });

    const shown = filtered.slice(0, 48);
    if (!shown.length) {
      dirList.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:18px; color:var(--muted);">لا توجد سجلات مطابقة لمعايير التصفية الحالية.</div>`;
      return;
    }

    dirList.innerHTML = shown.map(m => {
      const rKey = getEffectiveRoleForMember(m);
      const rInfo = ROLE_HIERARCHY[rKey] || ROLE_HIERARCHY.member;
      const cleanName = String(m.name || '').replace(/^\*/, '').trim();
      return `
        <div style="background:#fff; border:1px solid var(--border); border-radius:10px; padding:10px 12px; display:flex; flex-direction:column; gap:6px;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:6px;">
            <div>
              <strong style="font-size:13px; color:var(--ink); display:block;">${escapeHTML(cleanName)}</strong>
              <small style="font-size:11px; color:var(--muted);">${escapeHTML(m.branch || '')} • الجيل ${m.gen || 2}</small>
            </div>
            <span style="font-size:10.5px; font-weight:800; padding:2px 8px; border-radius:12px; background:${rInfo.bg}; color:${rInfo.color}; white-space:nowrap;">${escapeHTML(rInfo.shortBadge)}</span>
          </div>
          <div style="display:flex; align-items:center; justify-content:space-between; gap:6px; margin-top:2px;">
            <select data-assign-role-member="${escapeHTML(m.id)}" aria-label="تخصيص صلاحية ${escapeHTML(cleanName)}" style="flex:1; padding:5px 8px; font-size:11.5px; border-radius:8px; border:1px solid var(--border); font-family:inherit; font-weight:600;">
              <option value="super_admin" ${rKey === 'super_admin' ? 'selected' : ''}>مدير حسابات العائلة</option>
              <option value="branch_rep" ${rKey === 'branch_rep' ? 'selected' : ''}>مراجع عضوية الفرع</option>
              <option value="family_head" ${rKey === 'family_head' ? 'selected' : ''}>منسق بيانات الأسرة</option>
              <option value="member" ${rKey === 'member' ? 'selected' : ''}>عضو موثّق</option>
            </select>
            <button type="button" class="button button-quiet" data-login-member="${escapeHTML(m.id)}" style="font-size:11px; padding:5px 8px;">🔑 دخول</button>
          </div>
        </div>
      `;
    }).join('');
  }

  function renderCloudAuditLog() {
    const logContainer = $('#cloud-audit-log-list');
    if (!logContainer) return;
    const entries = [];
    if (!entries.length) {
      logContainer.innerHTML = `
        <div style="padding:12px; border-radius:8px; background:rgba(15,104,86,0.04); color:var(--muted); font-size:12px;">
          لا يوجد سجل سحابي في نسخة المعاينة؛ التعديلات والمشاركات والمزامنة غير مفعّلة.
        </div>
      `;
      return;
    }
    logContainer.innerHTML = entries.slice(0, 10).map(e => `
      <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; flex-wrap:wrap; padding:8px 12px; border-radius:8px; border:1px solid var(--border); background:#fff; font-size:12px;">
        <div>
          <strong style="color:var(--primary);">${escapeHTML(e.summary)}</strong>
          <div style="font-size:11px; color:var(--muted); margin-top:2px;">بواسطة: ${escapeHTML(e.actorName)} • ${escapeHTML(e.branch)} • ${escapeHTML(e.timeStr)}</div>
        </div>
        <span class="tag-pill" style="background:${e.syncedToCloud ? '#e6f4f1' : '#fef6e4'}; color:${e.syncedToCloud ? '#0f6856' : '#7a5510'}; font-weight:700;">
          ${e.syncedToCloud ? 'حالة Firestore غير متحقق منها' : 'محلي فقط — غير متزامن'}
        </span>
      </div>
    `).join('');
  }

  function renderRequests() {
    const list = $('#request-list');
    const home = $('#home-requests');
    const empty = $('#requests-empty');
    const badge = $('#request-badge');
    const reportCount = $('#report-requests-count');

    renderRolesDirectory();
    renderCloudAuditLog();

    if (badge) badge.textContent = requests.length;
    if (reportCount) reportCount.textContent = new Intl.NumberFormat('ar-SA').format(requests.length);

    if (!requests.length) {
      if (list) list.innerHTML = '';
      if (home) home.innerHTML = '<p class="lead" style="font-size:11px">لا توجد طلبات تجريبية مسجلة بعد.</p>';
      if (empty) empty.hidden = false;
      return;
    }

    if (empty) empty.hidden = true;

    const cards = requests.slice().reverse().map((r, i) => `
      <article class="request-card">
        <span class="request-symbol">${r.type.includes('منحة') ? '✧' : '♡'}</span>
        <div class="request-body">
          <b>${escapeHTML(r.type)}</b>
          <p>${escapeHTML(r.note || 'طلب تجريبي مسجل في المتصفح.')}</p>
          <small>رقم الطلب #${String(requests.length - i).padStart(3, '0')} · ${escapeHTML(r.date)}</small>
        </div>
        <span class="status ${i % 2 ? 'review' : ''}">${i % 2 ? 'قيد المراجعة' : 'تم الاستلام محليًا'}</span>
      </article>
    `).join('');

    if (list) list.innerHTML = cards;
    if (home) {
      home.innerHTML = requests.slice(-2).reverse().map((r, i) => `
        <div class="mini-request">
          <span>${escapeHTML(r.type)}</span>
          <span class="status ${i ? 'review' : ''}">${i ? 'قيد المراجعة' : 'تم الاستلام'}</span>
        </div>
      `).join('');
    }
  }

  function openRequestModal(type) {
    $('#request-type').value = type;
    $('#dialog-title').textContent = type === 'منحة تعليمية' ? 'تقديم طلب منحة تعليمية' : 'تقديم طلب دعم عائلي';
    $('#request-note').value = '';
    $('#form-error').textContent = '';
    $('#request-dialog').showModal();
    $('#request-note').focus();
  }

  // ==========================================
  // EVENT LISTENERS & SETUP
  // ==========================================
  document.addEventListener('click', e => {
    // Navigation
    const navBtn = e.target.closest('[data-page]');
    if (navBtn) {
      e.preventDefault();
      gotoPage(navBtn.dataset.page);
      return;
    }

    // Request trigger
    const reqBtn = e.target.closest('[data-request]');
    if (reqBtn) {
      e.preventDefault();
      openRequestModal(reqBtn.dataset.request);
      return;
    }

    // View member in drawer
    const viewMemberBtn = e.target.closest('[data-view-member]');
    if (viewMemberBtn) {
      const memberId = viewMemberBtn.dataset.viewMember;
      const person = activeMembersData.find(p => p.id === memberId) || MOCK_TREE_DATA.find(p => p.id === memberId);
      if (person) {
        gotoPage('tree');
        setTimeout(() => {
          openSafeDrawer(person);
          if (window.AllamTreeEngine) {
            window.AllamTreeEngine.selectNode(person.id);
          }
        }, 150);
      }
      return;
    }

    // Login / Claim or Edit Member Account from Directory Card
    const loginMemberBtn = e.target.closest('[data-login-member]');
    if (loginMemberBtn) {
      if (PREVIEW_READ_ONLY) {
        showToast('تسجيل الدخول غير متاح في نسخة المعاينة.');
        return;
      }
      const memberId = loginMemberBtn.dataset.loginMember;
      openUserAccountModal(memberId);
      return;
    }

    // Top bar & Sidebar Personal User Account button
    if (e.target.closest('#btn-user-account-top') || e.target.closest('#profile-button')) {
      openUserAccountModal();
      return;
    }

    // Mobile menu toggle
    if (e.target.closest('#mobile-menu')) {
      const sidebar = $('#sidebar');
      const button = $('#mobile-menu');
      const isOpen = sidebar?.classList.toggle('open') || false;
      button?.setAttribute('aria-expanded', String(isOpen));
      button?.setAttribute('aria-label', isOpen ? 'إغلاق القائمة' : 'فتح القائمة');
      return;
    }

    // Help dialog
    if (e.target.closest('#help-button')) {
      showToast('نسخة العرض لا تدعم تسجيل الدخول أو تعديل السجل العائلي.');
      return;
    }

    // Privacy settings dialog
    if (e.target.closest('#btn-open-my-profile')) {
      $('#profile-dialog').showModal();
      return;
    }

    // Add contribution dialog
    if (e.target.closest('#btn-open-contribution-modal')) {
      $('#contribution-dialog').showModal();
      return;
    }

    // Tree View mode toggles
    if (e.target.closest('#btn-tree-mode-3d')) {
      $('#btn-tree-mode-3d').classList.add('active');
      $('#btn-tree-mode-graph')?.classList.remove('active');
      $('#btn-tree-mode-photo')?.classList.remove('active');
      $('#btn-tree-mode-list')?.classList.remove('active');
      const fb = $('#tree-3d-floating-badge');
      if (fb) { fb.classList.remove('active'); fb.style.opacity = '0'; }
      $('#tree-3d-wrapper').style.display = 'block';
      // Show Three.js canvas (primary), hide 2D canvas and model-viewer
      const threeCanvas = $('#three-canvas');
      if (threeCanvas) threeCanvas.style.display = 'block';
      const mViewer = $('#tree-3d-model-viewer');
      if (mViewer) mViewer.style.display = 'none';
      const iCanvas = $('#tree-interactive-canvas');
      if (iCanvas) iCanvas.style.display = 'none';
      $('#tree-leaf-labels').style.display = 'block';
      $('#tree-leaf-connectors').style.display = 'block';
      $('#tree-photo-wrapper').style.display = 'none';
      $('#tree-list-wrapper').style.display = 'none';

      // Re-trigger Three.js renderer layout & size to prevent blank/black screen
      if (window.AllamTreeEngine) {
        requestAnimationFrame(() => {
          window.AllamTreeEngine.resize();
        });
      }

      showToast('تظهر أوراق الأشخاص وبطاقات أسمائهم على شجرة النسيج.');
      return;
    }

    if (e.target.closest('#btn-tree-mode-graph')) {
      $('#btn-tree-mode-graph').classList.add('active');
      $('#btn-tree-mode-3d')?.classList.remove('active');
      $('#btn-tree-mode-photo')?.classList.remove('active');
      $('#btn-tree-mode-list')?.classList.remove('active');
      const fb = $('#tree-3d-floating-badge');
      if (fb) { fb.classList.remove('active'); fb.style.opacity = '0'; }
      $('#tree-3d-wrapper').style.display = 'block';
      // Show 2D canvas (network graph), hide Three.js canvas and model-viewer
      const threeCanvas = $('#three-canvas');
      if (threeCanvas) threeCanvas.style.display = 'none';
      const mViewer = $('#tree-3d-model-viewer');
      if (mViewer) mViewer.style.display = 'none';
      const iCanvas = $('#tree-interactive-canvas');
      if (iCanvas) iCanvas.style.display = 'block';
      $('#tree-leaf-labels').style.display = 'none';
      $('#tree-leaf-connectors').style.display = 'none';
      $('#tree-photo-wrapper').style.display = 'none';
      $('#tree-list-wrapper').style.display = 'none';

      // Re-measure 2D interactive canvas dimensions to prevent empty/zero-size canvas
      if (window.resizeInteractiveCanvas) {
        requestAnimationFrame(() => {
          window.resizeInteractiveCanvas();
        });
      }

      showToast('هذا مخطط عرض للفروع؛ الخطوط لا تثبت صلات النسب.');
      return;
    }

    if (e.target.closest('#btn-tree-mode-photo')) {
      $('#btn-tree-mode-photo').classList.add('active');
      $('#btn-tree-mode-3d')?.classList.remove('active');
      $('#btn-tree-mode-graph')?.classList.remove('active');
      $('#btn-tree-mode-list')?.classList.remove('active');
      const fb = $('#tree-3d-floating-badge');
      if (fb) { fb.classList.remove('active'); fb.style.opacity = '0'; }
      $('#tree-3d-wrapper').style.display = 'none';
      $('#tree-photo-wrapper').style.display = 'block';
      $('#tree-list-wrapper').style.display = 'none';
      showToast('يُعرض الآن معرض رندرات بلندر Cycles.');
      return;
    }

    if (e.target.closest('#btn-tree-mode-list')) {
      $('#btn-tree-mode-list').classList.add('active');
      $('#btn-tree-mode-3d')?.classList.remove('active');
      $('#btn-tree-mode-graph')?.classList.remove('active');
      $('#btn-tree-mode-photo')?.classList.remove('active');
      const fb = $('#tree-3d-floating-badge');
      if (fb) { fb.classList.remove('active'); fb.style.opacity = '0'; }
      $('#tree-3d-wrapper').style.display = 'none';
      $('#tree-photo-wrapper').style.display = 'none';
      $('#tree-list-wrapper').style.display = 'block';
      renderAccessibleTable();
      return;
    }

    // Branch Selector Pills click
    const branchChip = e.target.closest('.branch-pill-chip');
    if (branchChip) {
      const bKey = branchChip.getAttribute('data-branch');
      const orbit = branchChip.getAttribute('data-orbit');
      const target = branchChip.getAttribute('data-target');
      selectTreeBranch(bKey, orbit, target);
      return;
    }

    // 3D Tree Hotspot Pin click
    const hotspotPin = e.target.closest('.tree-hotspot-pin');
    if (hotspotPin) {
      const member = hotspotPin.getAttribute('data-member');
      const orbit = hotspotPin.getAttribute('data-orbit');
      const target = hotspotPin.getAttribute('data-target');
      if (member) {
        selectTreeMember(member, orbit, target);
      } else {
        const bKey = hotspotPin.getAttribute('data-branch');
        selectTreeBranch(bKey, orbit, target);
      }
      return;
    }

    // Sub-family filter chips click
    const subChip = e.target.closest('.sub-family-chip');
    if (subChip) {
      const subId = subChip.getAttribute('data-sub');
      renderBranchHierarchy(currentTreeBranch, subId, currentHierarchyQuery);
      return;
    }

    // Member node pill click in hierarchy tree or 3D dynamic leaf pin
    const memberPill = e.target.closest('.member-node-pill, .dynamic-leaf-pin');
    if (memberPill) {
      const memId = memberPill.getAttribute('data-member-id');
      const member = activeMembersData.find(m => m.id === memId);
      if (member) {
        $('#drawer-name').textContent = member.name;
        $('#drawer-badge').textContent = member.branch;
        $('#drawer-gen').textContent = `الجيل ${member.gen === 1 ? 'الأول' : member.gen === 2 ? 'الثاني' : member.gen === 3 ? 'الثالث' : member.gen === 4 ? 'الرابع' : member.gen || 3}`;
        $('#drawer-relation').textContent = member.relation || 'سجل عرض رمزي';
        $('#drawer-status').textContent = 'سجل عرض رمزي؛ صلة النسب غير معتمدة في هذه النسخة.';
        $('#drawer-bio').textContent = 'هذه البطاقة توضيحية، ولا تثبت هوية الشخص أو صلة القرابة.';
        $('#safe-drawer')?.classList.add('open');
        showToast(`تم استعراض بيانات: ${member.name}`);
      }
      return;
    }

    // Photo Tree Thumbnail clicks (Images & Videos)
    const thumb = e.target.closest('.photo-thumb');
    if (thumb) {
      $$('.photo-thumb').forEach(t => t.classList.remove('active'));
      thumb.classList.add('active');
      const src = thumb.getAttribute('data-src');
      const title = thumb.getAttribute('data-title');
      const desc = thumb.getAttribute('data-desc');
      const type = thumb.getAttribute('data-type');
      const featuredImg = $('#tree-photo-featured');
      const featuredVideo = $('#tree-video-featured');
      const caption = $('#tree-photo-caption');

      if (type === 'video') {
        if (featuredImg) featuredImg.style.display = 'none';
        if (featuredVideo) {
          featuredVideo.style.display = 'block';
          featuredVideo.src = src;
          featuredVideo.play().catch(() => {});
        }
      } else {
        if (featuredVideo) {
          featuredVideo.pause();
          featuredVideo.style.display = 'none';
        }
        if (featuredImg) {
          featuredImg.style.display = 'block';
          featuredImg.src = src;
        }
      }

      if (caption && title) {
        caption.innerHTML = `<b>${escapeHTML(title)}</b><p>${escapeHTML(desc)}</p>`;
      }
      return;
    }

    if (e.target.closest('#btn-tree-print') || e.target.closest('#btn-print-tree')) {
      renderAccessibleTable();
      showToast('جاري تجهيز شجرة العائلة المنظّمة للطباعة وتصدير PDF...');
      openOrganizedPrintTreeWindow();
      return;
    }
  });

  function openOrganizedPrintTreeWindow() {
    const PRINT_BRANCH_META = {
      'الفرع 1':   { num: 1, short: '1',   full: 'الفرع 1 للجذور الرمزية',   color: '4BACC6', genColors: ['4BACC6', '92CDDC', 'B6DDE8', 'DAEEF3'] },
      'الفرع 2':   { num: 2, short: '2',   full: 'الفرع 2 للجذور الرمزية',   color: '4F81BD', genColors: ['4F81BD', '95B3D7', 'B8CCE4', 'DBE5F1'] },
      'الفرع 3':   { num: 3, short: '3',   full: 'الفرع 3 للجذور الرمزية',   color: 'C0504D', genColors: ['C0504D', 'D99694', 'E5B8B7', 'F2DCDB'] },
      'الفرع 4':   { num: 4, short: '4',   full: 'الفرع 4 للجذور الرمزية',   color: '9BBB59', genColors: ['9BBB59', 'C4D79B', 'D7E3BC', 'EAF1DD'] },
      'الفرع 5':   { num: 5, short: '5',   full: 'الفرع 5 للجذور الرمزية',   color: 'F79646', genColors: ['F79646', 'FAC08F', 'FCD5B4', 'FDE9D9'] },
      'الفرع 8':    { num: 6, short: '8',    full: 'الفرع 8 للجذور الرمزية',    color: '8064A2', genColors: ['8064A2', 'B2A1C7', 'CCC0D9', 'E5DFEC'] },
      'الفرع 7':  { num: 7, short: '7',  full: 'الفرع 7 للجذور الرمزية',  color: 'E660C0', genColors: ['E660C0', 'EEA0D8', 'F4C4E8', 'FAE2F4'] },
      'الفرع 6': { num: 8, short: '6', full: 'الفرع 6 للجذور الرمزية', color: 'D4AF37', genColors: ['D4AF37', 'E5C86B', 'EFE0A8', 'F8F2D8'] }
    };
    const ORDERED_PRINT_BRANCHES = ['الفرع 1', 'الفرع 2', 'الفرع 3', 'الفرع 4', 'الفرع 5', 'الفرع 8', 'الفرع 7', 'الفرع 6'];

    let graph = window.AllamTreeEngine?.getGraph();
    if (!graph && window.GenealogyGraph) {
      graph = new window.GenealogyGraph().load(activeMembersData);
    }
    const realMembers = graph ? graph.getRealMembers() : activeMembersData.filter(m => m.id !== 'root');

    function cleanName(n) {
      return String(n || '').replace(/^\*/, '').replace(/\s*\.{2,}\s*/g, '').replace(/\s+/g, ' ').trim();
    }

    function renderCard(node, bMeta, isSpouse) {
      const genIdx = Math.max(0, Math.min(3, (node.gen || 1) - 1));
      const col = bMeta.genColors[genIdx] || bMeta.color;
      const gStr = String(node.gender || node.meta?.gender || '');
      const isFemale = gStr.includes('أنثى') || (!gStr.includes('ذكر') && /(زوجة|ابنة|بنت|حفيدة|أرملة)/.test(node.relation || ''));
      const isDeceased = gStr.includes('متوف') || (node.bio && node.bio.includes('متوف'));
      const genderColor = isFemale ? 'D45A8F' : '3A8FD4';
      const city = String(node.city || node.meta?.city || '').replace(/^==+$/, '').trim();
      const job = String(node.job || node.meta?.job || '').replace(/^==+$/, '').trim();
      let info = '';
      if (city) info += `<div class="info-row">📍<span>${escapeHTML(city)}</span></div>`;
      if (job && job !== 'ربة منزل') info += `<div class="info-row">💼<span>${escapeHTML(job)}</span></div>`;

      return `<div class="person">
        <div class="gen-stripe" style="background:#${col}"></div>
        <div class="person-inner${isSpouse ? ' inlaw' : ''}${isDeceased ? ' deceased' : ''}" style="border-color:#${col}55">
          <div class="gender-dot" style="background:#${genderColor}"></div>
          ${isDeceased ? '<div class="deceased-mark">رحمه الله</div>' : ''}
          <div class="person-name${isSpouse ? ' inlaw-name' : ''}">${escapeHTML(cleanName(node.name))}</div>
          <div class="person-info">${info}</div>
        </div>
      </div>`;
    }

    function renderUnit(node, bMeta, depth) {
      if (!node) return '';
      const genIdx = Math.max(0, Math.min(3, (node.gen || 1) - 1));
      const col = bMeta.genColors[genIdx] || bMeta.color;
      const hasKids = node.children && node.children.length > 0;
      const spouseHtml = (node.spouses || []).map(sp =>
        `<div class="spouse-connector"><div class="heart-line">💕</div></div>${renderCard(sp, bMeta, true)}`
      ).join('');
      let childHtml = '';
      if (hasKids) {
        const labelWord = node.gen === 1 ? 'أبناء وبنات' : node.gen === 2 ? 'أحفاد' : 'أبناء أحفاد';
        childHtml = `<div class="children-wrap" style="border-color:#${col}66">
          <div class="gen-label" style="background:#${col}22;color:#${col};border:1px solid #${col}55">${node.children.length} ${labelWord}</div>
          <div class="children-row">${node.children.map(ch => `<div class="child-group">${renderUnit(ch, bMeta, depth + 1)}</div>`).join('')}</div>
        </div>`;
      }
      return `<div class="family-unit depth-${depth}">
        <div class="header-row">${renderCard(node, bMeta, false)}${spouseHtml}</div>
        ${childHtml}
      </div>`;
    }

    const sectionsHtml = ORDERED_PRINT_BRANCHES.map((bName, idx) => {
      const bMeta = PRINT_BRANCH_META[bName];
      const bm = realMembers.filter(m => m.branch === bName);
      if (!bm.length) return '';
      const byId = new Map(bm.map(m => [m.id, { ...m, children: [], spouses: [] }]));
      const founder = Array.from(byId.values()).find(m => m.gen === 1 && m.relation === 'نفسه') ||
                      Array.from(byId.values()).find(m => m.gen === 1 && !m.partnerId) ||
                      Array.from(byId.values())[0];
      const placed = new Set([founder.id]);
      for (const m of byId.values()) {
        if (m.id === founder.id) continue;
        if (m.gen === 1 || m.partnerId === founder.id) {
          founder.spouses.push(m);
          placed.add(m.id);
        } else if (m.partnerId && byId.has(m.partnerId)) {
          byId.get(m.partnerId).spouses.push(m);
          placed.add(m.id);
        }
      }
      for (const m of byId.values()) {
        if (placed.has(m.id)) continue;
        let pid = m.parentId || m.candidateParentId;
        if (pid && byId.get(pid)?.partnerId) pid = byId.get(pid).partnerId;
        if (pid && byId.has(pid) && pid !== m.id) {
          byId.get(pid).children.push(m);
          placed.add(m.id);
        } else {
          founder.children.push(m);
          placed.add(m.id);
        }
      }
      const males = bm.filter(m => String(m.gender || m.meta?.gender || '').includes('ذكر')).length;
      const females = bm.length - males;
      return `<section class="branch-page${idx > 0 ? ' page-break' : ''}" data-branch="${bName}">
        <div class="branch-header">
          <div class="branch-num" style="background:#${bMeta.color}">${bMeta.num}</div>
          <div>
            <div class="branch-title">${bMeta.full}</div>
            <div class="branch-sub">شجرة عائلة الجذور الرمزية — توزيع تفرعي هرمي للأجيال الأربعة مع الأزواج والأبناء والأحفاد</div>
          </div>
          <div class="branch-stats">
            <div class="bs-item"><span class="bs-val" style="color:#${bMeta.color}">${bm.length}</span>إجمالي</div>
            <div class="bs-item"><span class="bs-val" style="color:#3A8FD4">${males}</span>ذكور</div>
            <div class="bs-item"><span class="bs-val" style="color:#D45A8F">${females}</span>إناث</div>
          </div>
        </div>
        <div class="tree-root">${renderUnit(founder, bMeta, 1)}</div>
      </section>`;
    }).join('');

    const htmlDoc = `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8">
      <title>شجرة عائلة الجذور الرمزية — طباعة PDF (${realMembers.length} فرداً)</title>
      <style>
        @page { size: A3 landscape; margin: 8mm; }
        * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        body { background: #080d16; color: #e8f0fa; font-family: 'Segoe UI', Tahoma, Arial, sans-serif; direction: rtl; }
        body.light-theme { background: #f8f6f0; color: #14241f; }
        .print-toolbar { position: sticky; top: 0; z-index: 100; background: #0d1828; border-bottom: 2px solid #1e3050; padding: 12px 22px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        body.light-theme .print-toolbar { background: #ffffff; border-color: #d8d2c5; }
        .toolbar-btn { padding: 8px 16px; border-radius: 8px; border: 1px solid #2a4060; background: #16263d; color: #f0f4fa; font-weight: 700; cursor: pointer; font-family: inherit; font-size: .85rem; }
        .toolbar-btn.primary { background: #4BACC6; color: #080d16; border-color: #4BACC6; }
        @media print { .print-toolbar { display: none !important; } }
        .branch-page { padding: 16px 22px 26px; }
        .page-break { page-break-before: always; break-before: page; }
        .branch-header { display: flex; align-items: center; gap: 14px; padding: 8px 0 12px; border-bottom: 1px solid #1e3050; margin-bottom: 12px; }
        body.light-theme .branch-header { border-color: #cbd5e1; }
        .branch-num { width: 42px; height: 42px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; font-weight: 700; color: #080d16; flex-shrink: 0; }
        .branch-title { font-size: 1.35rem; font-weight: 700; }
        .branch-sub { font-size: .76rem; color: #5b88b8; margin-top: 2px; }
        .branch-stats { display: flex; gap: 8px; margin-right: auto; }
        .bs-item { background: #0d1828; border: 1px solid #1e3050; border-radius: 8px; padding: 4px 12px; font-size: .78rem; color: #9bb5d4; text-align: center; }
        body.light-theme .bs-item { background: #ffffff; border-color: #cbd5e1; color: #334155; }
        .bs-val { font-size: 1.05rem; font-weight: 700; display: block; }
        .tree-root { display: flex; align-items: flex-start; }
        .person { position: relative; display: inline-flex; flex-direction: column; border-radius: 9px; overflow: hidden; flex-shrink: 0; }
        .person-inner { padding: 7px 10px 6px; min-width: 126px; max-width: 185px; background: #0d1828; border: 1px solid #1e3050; border-radius: 9px; position: relative; }
        body.light-theme .person-inner { background: #ffffff; border-color: #cbd5e1; }
        .person-inner.inlaw { border-style: dashed; background: #0a1424; }
        body.light-theme .person-inner.inlaw { background: #f4f6f9; }
        .person-inner.deceased { opacity: .86; }
        .gen-stripe { height: 4px; width: 100%; }
        .person-name { font-size: .8rem; font-weight: 700; line-height: 1.35; margin-bottom: 3px; padding-left: 16px; text-align: right; }
        .person-inner.deceased .person-name { padding-left: 58px; }
        .person-name.inlaw-name { color: #9bb5d4; }
        body.light-theme .person-name.inlaw-name { color: #475569; }
        .info-row { font-size: .66rem; color: #5a7ea0; display: flex; align-items: center; gap: 3px; }
        .gender-dot { width: 7px; height: 7px; border-radius: 50%; position: absolute; top: 6px; left: 7px; }
        .deceased-mark { position: absolute; top: 4px; left: 18px; font-size: .55rem; color: #7aa2c8; background: #0d1828; padding: 0 4px; border-radius: 3px; border: 1px solid #1e3050; }
        body.light-theme .deceased-mark { background: #f8fafc; color: #475569; border-color: #cbd5e1; }
        .spouse-connector { display: flex; align-items: center; padding: 0 2px; margin-top: 16px; }
        .heart-line { display: flex; align-items: center; gap: 2px; color: #d45a8f; font-size: .75rem; }
        .heart-line::before, .heart-line::after { content: ''; display: block; width: 12px; height: 2px; background: #d45a8f80; }
        .family-unit { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; break-inside: avoid; }
        .family-unit.depth-1 { break-inside: auto; width: 100%; }
        .family-unit.depth-2 { background: #0b132090; border: 1px solid #15243b; border-radius: 11px; padding: 10px 12px; margin-bottom: 8px; }
        body.light-theme .family-unit.depth-2 { background: #ffffff; border-color: #e2e8f0; }
        .family-unit .header-row { display: flex; align-items: flex-start; gap: 5px; flex-wrap: wrap; }
        .family-unit .children-wrap { margin-top: 4px; padding-right: 18px; border-right: 2px dashed #1e3050; margin-right: 8px; }
        body.light-theme .family-unit .children-wrap { border-color: #94a3b8; }
        .gen-label { font-size: .64rem; font-weight: 700; padding: 2px 8px; border-radius: 10px; display: inline-block; margin-bottom: 5px; }
        .children-row { display: flex; flex-wrap: wrap; gap: 9px; align-items: flex-start; padding: 4px 0 2px; }
        .child-group { display: flex; flex-direction: column; align-items: flex-start; }
      </style>
    </head><body>
      <div class="print-toolbar">
        <strong style="font-size:1rem">🌳 شجرة عائلة الجذور الرمزية — نسخة الطباعة وتصدير PDF (${realMembers.length} فرداً · 8 فروع)</strong>
        <div style="margin-right:auto; display:flex; gap:8px; flex-wrap:wrap;">
          <button class="toolbar-btn" onclick="document.body.classList.toggle('light-theme')">🎨 تبديل النمط (الداكن الملكي / الفاتح للورق)</button>
          <button class="toolbar-btn primary" onclick="window.print()">🖨️ حفظ كملف PDF / طباعة الآن</button>
        </div>
      </div>
      ${sectionsHtml}
    </body></html>`;

    const w = window.open('', '_blank');
    if (w && w.document) {
      w.document.open();
      w.document.write(htmlDoc);
      w.document.close();
      setTimeout(() => {
        try { w.focus(); w.print(); } catch (_) {}
      }, 450);
    } else {
      window.print();
    }
  }

  // Request form submit
  $('#request-form')?.addEventListener('submit', e => {
    e.preventDefault();
    const type = $('#request-type').value;
    const note = $('#request-note').value.trim();
    if (!type) {
      $('#form-error').textContent = 'اختر نوع الطلب أولاً.';
      return;
    }
    requests.push({
      type,
      note,
      date: new Intl.DateTimeFormat('ar-SA', { dateStyle: 'medium' }).format(new Date())
    });
    saveStored(STORAGE_KEYS.requests, requests);
    renderRequests();
    $('#request-dialog').close();
    showToast('حُفظ الطلب التجريبي في هذا المتصفح بنجاح.');
    gotoPage('requests');
  });

  // Close modals
  $('#btn-close-request-dialog')?.addEventListener('click', () => $('#request-dialog').close());
  $('#btn-cancel-request')?.addEventListener('click', () => $('#request-dialog').close());

  $('#btn-close-profile-dialog')?.addEventListener('click', () => $('#profile-dialog').close());
  $('#btn-cancel-profile')?.addEventListener('click', () => $('#profile-dialog').close());

  $('#btn-close-contrib-dialog')?.addEventListener('click', () => $('#contribution-dialog').close());
  $('#btn-cancel-contrib')?.addEventListener('click', () => $('#contribution-dialog').close());

  $('#btn-close-correction-dialog')?.addEventListener('click', () => $('#correction-dialog').close());
  $('#btn-cancel-correction')?.addEventListener('click', () => $('#correction-dialog').close());

  // Privacy profile save
  $('#profile-form')?.addEventListener('submit', e => {
    e.preventDefault();
    const privacySettings = {
      phone: $('#vis-phone')?.value,
      email: $('#vis-email')?.value,
      birth: $('#vis-birth')?.value,
      work: $('#vis-work')?.value,
      familyLinks: $('#vis-family-links')?.value,
      bio: $('#vis-bio')?.value
    };
    saveStored(STORAGE_KEYS.privacy, privacySettings);
    $('#profile-dialog').close();
    showToast('تم حفظ إعدادات الخصوصية والظهور محليًا.');
  });

  // ==========================================
  // MULTIMEDIA UPLOAD (PHOTOS & VIDEOS) FOR NEWS & POSTS
  // ==========================================
  let pendingModalMedia = null;
  let pendingInlineMedia = null;

  function readMediaFileForPost(file) {
    return new Promise((resolve, reject) => {
      if (!file) return resolve(null);
      const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|ogg|mov)$/i.test(file.name);
      if (isVideo) {
        // If small video (<= 2.2 MB), store as DataURL; otherwise use fast session ObjectURL
        if (file.size <= 2200000) {
          const reader = new FileReader();
          reader.onload = () => resolve({ url: reader.result, type: 'video', name: file.name });
          reader.onerror = () => resolve({ url: URL.createObjectURL(file), type: 'video', name: file.name });
          reader.readAsDataURL(file);
        } else {
          resolve({ url: URL.createObjectURL(file), type: 'video', name: file.name });
        }
        return;
      }

      // Image: compress & resize via Canvas so it stores cleanly in localStorage
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const maxW = 920;
          let w = img.width || 640;
          let h = img.height || 480;
          if (w > maxW) {
            h = Math.round((h * maxW) / w);
            w = maxW;
          }
          const c = document.createElement('canvas');
          c.width = w;
          c.height = h;
          const cctx = c.getContext('2d');
          cctx.drawImage(img, 0, 0, w, h);
          const compressedUrl = c.toDataURL('image/jpeg', 0.82);
          resolve({ url: compressedUrl, type: 'image', name: file.name });
        };
        img.onerror = () => resolve({ url: reader.result, type: 'image', name: file.name });
        img.src = reader.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function renderMediaPreviewBox(previewEl, mediaObj) {
    if (!previewEl) return;
    if (!mediaObj || !mediaObj.url) {
      previewEl.style.display = 'none';
      previewEl.innerHTML = '';
      return;
    }
    previewEl.style.display = 'block';
    if (mediaObj.type === 'video') {
      previewEl.innerHTML = `<video src="${escapeHTML(mediaObj.url)}" controls playsinline style="width:100%; max-height:190px; display:block;"></video>`;
    } else {
      previewEl.innerHTML = `<img src="${escapeHTML(mediaObj.url)}" alt="معاينة الصورة المرفقة" style="width:100%; max-height:190px; object-fit:cover; display:block;">`;
    }
  }

  $('#contrib-media-file')?.addEventListener('change', async e => {
    const file = e.target.files?.[0];
    if (!file) {
      pendingModalMedia = null;
      renderMediaPreviewBox($('#contrib-media-preview'), null);
      return;
    }
    pendingModalMedia = await readMediaFileForPost(file);
    renderMediaPreviewBox($('#contrib-media-preview'), pendingModalMedia);
    showToast(`✓ تم تجهيز المرفق (${file.name}) للنشر.`);
  });

  $('#inline-post-media-file')?.addEventListener('change', async e => {
    const file = e.target.files?.[0];
    const statusEl = $('#inline-post-media-status');
    if (!file) {
      pendingInlineMedia = null;
      renderMediaPreviewBox($('#inline-post-media-preview'), null);
      if (statusEl) statusEl.textContent = 'يدعم الصور (JPG, PNG, WebP) والفيديو (MP4, WebM)';
      return;
    }
    pendingInlineMedia = await readMediaFileForPost(file);
    renderMediaPreviewBox($('#inline-post-media-preview'), pendingInlineMedia);
    if (statusEl) statusEl.textContent = `✓ مرفق جاهز: ${file.name}`;
    showToast(`✓ تم إرفاق (${file.name})، اضغط نشر لمشاركته مع العائلة.`);
  });

  function publishNewFamilyPost({ category, title, body, mediaObj }) {
    if (PREVIEW_READ_ONLY) {
      showToast('النشر ورفع الوسائط غير متاحين في نسخة المعاينة المحلية.');
      return;
    }
    const authorName = currentUser
      ? `${String(currentUser.name || '').replace(/^\*/, '').trim()} (${currentUser.branch || 'عضو العائلة'})`
      : 'عضو العائلة (نشر مباشر)';
    const authorRole = currentUser?.role || 'member';

    const newPost = {
      id: 'c_' + Date.now(),
      category: category || 'أخبار العائلة والمناسبات',
      title,
      body,
      author: authorName,
      authorId: currentUser?.memberId || null,
      authorMemberId: currentUser?.memberId || 'root',
      authorRole,
      mediaUrl: mediaObj?.url || null,
      mediaType: mediaObj?.type || null,
      likes: 1,
      pinned: false,
      comments: [],
      createdAtMs: Date.now(),
      date: new Intl.DateTimeFormat('ar-SA', { dateStyle: 'short' }).format(new Date()),
      status: 'معتمدة'
    };

    contributions.unshift(newPost);
    saveStored(STORAGE_KEYS.contributions, contributions);
    activeContribFilter = 'all';
    $$('#contributions-filter-bar [data-contrib-filter]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.contribFilter === 'all');
    });
    renderContributions();
    if (window.AllamCloudDB) {
      window.AllamCloudDB.publishPostToCloud(newPost, contributions);
      if (typeof renderCloudAuditLog === 'function') renderCloudAuditLog();
    }
    showToast('حالة النشر غير معتمدة؛ لا يوجد خادم مزامنة مفعّل في نسخة المعاينة.');
  }

  // Modal Contribution Form Submit
  $('#contribution-form')?.addEventListener('submit', e => {
    e.preventDefault();
    if (PREVIEW_READ_ONLY) return showToast('النشر غير متاح في نسخة المعاينة المحلية.');
    const category = $('#contrib-category')?.value;
    const title = $('#contrib-title')?.value.trim();
    const body = $('#contrib-body')?.value.trim();
    if (!title || !body) return;

    publishNewFamilyPost({ category, title, body, mediaObj: pendingModalMedia });
    pendingModalMedia = null;
    renderMediaPreviewBox($('#contrib-media-preview'), null);
    if ($('#contrib-media-file')) $('#contrib-media-file').value = '';
    $('#contribution-dialog').close();
    $('#contrib-title').value = '';
    $('#contrib-body').value = '';
  });

  // Inline Multimedia News & Post Form Submit
  $('#inline-post-form')?.addEventListener('submit', e => {
    e.preventDefault();
    if (PREVIEW_READ_ONLY) return showToast('النشر غير متاح في نسخة المعاينة المحلية.');
    const category = $('#inline-post-category')?.value;
    const title = $('#inline-post-title')?.value.trim();
    const body = $('#inline-post-body')?.value.trim();
    if (!title || !body) return;

    publishNewFamilyPost({ category, title, body, mediaObj: pendingInlineMedia });
    pendingInlineMedia = null;
    renderMediaPreviewBox($('#inline-post-media-preview'), null);
    if ($('#inline-post-media-file')) $('#inline-post-media-file').value = '';
    if ($('#inline-post-media-status')) $('#inline-post-media-status').textContent = 'يدعم الصور (JPG, PNG, WebP) والفيديو (MP4, WebM)';
    $('#inline-post-title').value = '';
    $('#inline-post-body').value = '';
  });

  function buildRoleMapObject() {
    const map = {};
    if (userAccounts && typeof userAccounts === 'object') {
      Object.keys(userAccounts).forEach(mid => {
        if (userAccounts[mid] && userAccounts[mid].role) {
          map[mid] = userAccounts[mid].role;
        }
      });
    }
    return map;
  }

  // Filter Pills, Like, Pin, Delete, Lightbox & Role Actions
  document.addEventListener('click', e => {
    const filterBtn = e.target.closest('[data-contrib-filter]');
    if (filterBtn) {
      activeContribFilter = filterBtn.dataset.contribFilter || 'all';
      $$('#contributions-filter-bar [data-contrib-filter]').forEach(b => {
        b.classList.toggle('active', b === filterBtn);
      });
      renderContributions();
      return;
    }

    const likeBtn = e.target.closest('[data-like-contrib]');
    if (likeBtn) {
      const cid = likeBtn.dataset.likeContrib;
      const item = contributions.find(c => c.id === cid);
      if (item) {
        item.likes = (item.likes || 1) + 1;
        saveStored(STORAGE_KEYS.contributions, contributions);
        renderContributions();
        if (window.AllamCloudDB) window.AllamCloudDB.publishPostToCloud(item, contributions);
      }
      return;
    }

    const pinBtn = e.target.closest('[data-pin-contrib]');
    if (pinBtn) {
      const cid = pinBtn.dataset.pinContrib;
      const item = contributions.find(c => c.id === cid);
      if (item) {
        item.pinned = !item.pinned;
        item.status = item.pinned ? 'مثبتة' : 'معتمدة';
        saveStored(STORAGE_KEYS.contributions, contributions);
        renderContributions();
        if (window.AllamCloudDB) window.AllamCloudDB.publishPostToCloud(item, contributions);
        showToast(item.pinned ? '📌 تم تثبيت المنشور في أعلى منبر العائلة.' : 'تم إلغاء تثبيت المنشور.');
      }
      return;
    }

    const delBtn = e.target.closest('[data-delete-contrib]');
    if (delBtn) {
      const cid = delBtn.dataset.deleteContrib;
      contributions = contributions.filter(c => c.id !== cid);
      saveStored(STORAGE_KEYS.contributions, contributions);
      renderContributions();
      if (window.AllamCloudDB) window.AllamCloudDB.deletePostFromCloud(cid, contributions);
      showToast('🗑️ تم حذف المنشور بنجاح.');
      return;
    }

    const lightboxEl = e.target.closest('[data-lightbox-src]');
    if (lightboxEl) {
      const src = lightboxEl.getAttribute('data-lightbox-src');
      const title = lightboxEl.getAttribute('data-lightbox-title') || '';
      const lbDialog = $('#media-lightbox-dialog');
      const lbImg = $('#lightbox-media-img') || $('#media-lightbox-img');
      const lbCap = $('#lightbox-media-title') || $('#media-lightbox-caption');
      if (lbDialog && lbImg && src) {
        lbImg.src = src;
        if (lbCap) lbCap.textContent = title;
        lbDialog.showModal();
      }
      return;
    }
  });

  $('#btn-close-media-lightbox')?.addEventListener('click', () => $('#media-lightbox-dialog')?.close());
  $('#btn-close-lightbox')?.addEventListener('click', () => $('#media-lightbox-dialog')?.close());

  // Comment / Family Blessing Submit on Posts
  document.addEventListener('submit', e => {
    const commentForm = e.target.closest('form.contrib-comment-form');
    if (!commentForm) return;
    e.preventDefault();
    const postId = commentForm.getAttribute('data-comment-post-id');
    const inputEl = commentForm.querySelector('.contrib-comment-input');
    const text = inputEl?.value.trim();
    if (!postId || !text) return;

    const item = contributions.find(c => c.id === postId);
    if (!item) return;

    const authorName = currentUser
      ? String(currentUser.name || '').replace(/^\*/, '').trim()
      : 'عضو العائلة';

    if (!Array.isArray(item.comments)) item.comments = [];
    item.comments.push({
      author: authorName,
      text,
      date: new Intl.DateTimeFormat('ar-SA', { dateStyle: 'short' }).format(new Date())
    });
    saveStored(STORAGE_KEYS.contributions, contributions);
    renderContributions();
    if (window.AllamCloudDB) {
      window.AllamCloudDB.publishPostToCloud(item, contributions);
      window.AllamCloudDB.recordAuditEntry(
        'post_comment',
        `مباركة وتعليق على منشور «${item.title}»: ${text.slice(0, 60)}`,
        authorName,
        currentUser?.branch || 'منبر العائلة'
      );
      if (typeof renderCloudAuditLog === 'function') renderCloudAuditLog();
    }
    showToast('💬 تمت إضافة مباركتك وتعليقك على المنشور!');
  });

  // 4-Tier Role Assignment Dropdown Change on #page-requests
  document.addEventListener('change', e => {
    const roleSelect = e.target.closest('[data-assign-role-member]');
    if (!roleSelect) return;
    if (PREVIEW_READ_ONLY) {
      showToast('إدارة الحسابات والصلاحيات غير متاحة في نسخة المعاينة.');
      renderRolesDirectory();
      return;
    }
    const memberId = roleSelect.getAttribute('data-assign-role-member');
    const newRole = roleSelect.value;
    if (!memberId || !ROLE_HIERARCHY[newRole]) return;

    const targetMember = activeMembersData.find(m => m.id === memberId);
    const cleanName = targetMember ? String(targetMember.name || '').replace(/^\*/, '').trim() : memberId;

    if (!userAccounts || typeof userAccounts !== 'object') userAccounts = {};
    userAccounts[memberId] = {
      ...(userAccounts[memberId] || {}),
      memberId,
      name: targetMember?.name || cleanName,
      branch: targetMember?.branch || 'الفرع 1',
      role: newRole,
      updatedAt: new Date().toISOString()
    };
    saveStored(STORAGE_KEYS.userAccounts, userAccounts);

    if (currentUser && currentUser.memberId === memberId) {
      currentUser.role = newRole;
      saveStored(STORAGE_KEYS.currentUser, currentUser);
      syncLoggedInUserUI();
    }

    const rInfo = ROLE_HIERARCHY[newRole];
    renderRolesDirectory();
    if (window.AllamCloudDB) {
      window.AllamCloudDB.pushRoleMap(
        buildRoleMapObject(),
        currentUser,
        `تعيين صلاحية (${cleanName}) إلى المستوى: ${rInfo.badge}`
      );
      renderCloudAuditLog();
    }
    showToast(`🛡️ تم تحديث صلاحية (${cleanName}) إلى: ${rInfo.badge}`);
  });

  $('#roles-branch-filter')?.addEventListener('change', renderRolesDirectory);
  $('#roles-tier-filter')?.addEventListener('change', renderRolesDirectory);
  $('#roles-member-search')?.addEventListener('input', renderRolesDirectory);
  $('#btn-clear-audit-log')?.addEventListener('click', () => {
    localStorage.removeItem('allam_cloud_audit_log_v1');
    renderCloudAuditLog();
    showToast('تم مسح سجل العمليات المحلي.');
  });

  // ==========================================
  // GOOGLE SERVICES SUITE & FAMILY DRIVE ARCHIVE HUB
  // ==========================================
  // No archive documents are bundled with this symbolic preview.
  const DEFAULT_DRIVE_ARCHIVE_DOCS = [];

  let driveArchiveDocs = loadStored(STORAGE_KEYS.driveArchive, DEFAULT_DRIVE_ARCHIVE_DOCS);
  if (!Array.isArray(driveArchiveDocs) || driveArchiveDocs.length < DEFAULT_DRIVE_ARCHIVE_DOCS.length) {
    const customUploaded = Array.isArray(driveArchiveDocs)
      ? driveArchiveDocs.filter(d => !DEFAULT_DRIVE_ARCHIVE_DOCS.some(def => def.id === d.id))
      : [];
    driveArchiveDocs = [...customUploaded, ...DEFAULT_DRIVE_ARCHIVE_DOCS];
    saveStored(STORAGE_KEYS.driveArchive, driveArchiveDocs);
  }
  let activeDriveCategory = 'all';

  function applyGoogleServices() {
    const safeMeet = (!googleServices.meetUrl || String(googleServices.meetUrl).includes('alm-allam-mtg'))
      ? DEFAULT_GOOGLE_SERVICES.meetUrl
      : googleServices.meetUrl;
    const safeDrive = (!googleServices.driveUrl || String(googleServices.driveUrl).includes('1AllamFamilyArchive') || googleServices.driveUrl === '#')
      ? DEFAULT_GOOGLE_SERVICES.driveUrl
      : googleServices.driveUrl;
    const safeMaps = (!googleServices.mapsUrl || String(googleServices.mapsUrl).startsWith('#'))
      ? DEFAULT_GOOGLE_SERVICES.mapsUrl
      : googleServices.mapsUrl;

    googleServices.meetUrl = safeMeet;
    googleServices.driveUrl = safeDrive;
    googleServices.mapsUrl = safeMaps;

    const meetBtn = $('#btn-join-meet');
    if (meetBtn) meetBtn.href = safeMeet;

    ['#btn-open-gdrive', '#btn-upload-gdrive', '#link-external-gdrive', '#btn-external-gdrive-open'].forEach(sel => {
      const el = $(sel);
      if (el) el.href = safeDrive;
    });

    const mapsLink = $('#link-gmaps');
    if (mapsLink) mapsLink.href = safeMaps;
  }

  function renderFamilyDriveArchive() {
    const listEl = $('#drive-archive-files-list');
    if (!listEl) return;

    const subEl = $('#drive-archive-status-sub');
    if (subEl) {
      subEl.textContent = `${driveArchiveDocs.length} عناصر محفوظة في هذا المتصفح فقط؛ لا يوجد رفع أو مزامنة سحابية.`;
    }

    const filtered = driveArchiveDocs.filter(d => activeDriveCategory === 'all' || d.category === activeDriveCategory);
    if (!filtered.length) {
      listEl.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:18px; color:var(--muted);">لا توجد وثائق في هذا المجلد حالياً.</div>`;
      return;
    }

    listEl.innerHTML = filtered.map(doc => {
      let actionBtns = '';
      if (doc.action === 'print-tree-pdf') {
        actionBtns = `<button type="button" class="button button-primary" data-drive-action="print-tree-pdf" style="font-size:11.5px; padding:5px 12px;">🖨️ فتح وطباعة PDF</button>`;
      } else if (doc.action === 'download-charter') {
        actionBtns = `<button type="button" class="button button-outline" data-drive-action="download-charter" style="font-size:11.5px; padding:5px 12px;">📥 تحميل اللائحة</button>`;
      } else if (doc.action === 'download-agenda') {
        actionBtns = `<button type="button" class="button button-outline" data-drive-action="download-agenda" style="font-size:11.5px; padding:5px 12px;">📥 تحميل جدول الأعمال</button>`;
      } else if (doc.action === 'download-cloud-json') {
        actionBtns = `<button type="button" class="button button-gold" data-drive-action="download-cloud-json" style="font-size:11.5px; padding:5px 12px;">📦 تحميل الحزمة (JSON)</button>`;
      } else if (doc.fileUrl) {
        const previewBtn = doc.fileType === 'image'
          ? `<button type="button" class="button button-quiet" data-lightbox-src="${escapeHTML(doc.fileUrl)}" data-lightbox-title="${escapeHTML(doc.title)}" style="font-size:11px; padding:5px 9px;">🔍 معاينة</button>`
          : '';
        actionBtns = `
          ${previewBtn}
          <a href="${escapeHTML(doc.fileUrl)}" download="${escapeHTML(doc.fileName || (doc.title + (doc.fileType === 'image' ? '.jpg' : '')))}" target="_blank" rel="noopener noreferrer" class="button button-outline" style="font-size:11px; padding:5px 10px; text-decoration:none;">📥 تحميل</a>
        `;
      }

      return `
        <div style="background:#fff; border:1px solid var(--border); border-radius:10px; padding:10px 12px; display:flex; flex-direction:column; justify-content:space-between; gap:8px;">
          <div>
            <div style="display:flex; align-items:center; justify-content:space-between; gap:6px; margin-bottom:4px;">
              <span style="font-size:18px;">${doc.icon || '📄'}</span>
              <span style="font-size:10.5px; font-weight:700; padding:2px 8px; border-radius:12px; background:#fff8eb; color:#945200; border:1px solid #f5d393;">${escapeHTML(doc.badge || 'وثيقة عائلية')}</span>
            </div>
            <strong style="font-size:12.5px; color:var(--ink); display:block; line-height:1.45;">${escapeHTML(doc.title)}</strong>
            <p style="font-size:11px; color:var(--muted); margin:4px 0 0; line-height:1.5;">${escapeHTML(doc.desc || '')}</p>
          </div>
          <div style="display:flex; align-items:center; justify-content:space-between; gap:6px; padding-top:6px; border-top:1px solid var(--border); flex-wrap:wrap;">
            <small style="font-size:10.5px; color:var(--muted);">${escapeHTML(doc.size || '')} • ${escapeHTML(doc.date || '')}</small>
            <div style="display:flex; gap:5px; align-items:center;">${actionBtns}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  function openFamilyDriveArchiveModal(focusUpload = false) {
    const dialog = $('#family-drive-archive-dialog');
    if (!dialog) return;
    applyGoogleServices();
    renderFamilyDriveArchive();
    dialog.showModal();
    if (focusUpload) {
      setTimeout(() => {
        const titleInput = $('#drive-doc-title');
        if (titleInput) {
          titleInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
          titleInput.focus();
        }
      }, 120);
    }
  }

  $('#btn-drive-archive-top')?.addEventListener('click', () => openFamilyDriveArchiveModal(false));

  $('#btn-open-gdrive')?.addEventListener('click', e => {
    e.preventDefault();
    openFamilyDriveArchiveModal(false);
  });

  $('#btn-upload-gdrive')?.addEventListener('click', e => {
    e.preventDefault();
    openFamilyDriveArchiveModal(true);
  });

  $('#btn-close-drive-archive')?.addEventListener('click', () => $('#family-drive-archive-dialog')?.close());

  $('#btn-drive-open-config')?.addEventListener('click', () => {
    $('#family-drive-archive-dialog')?.close();
    $('#btn-config-google-services')?.click();
  });

  // Category filter pills inside Family Drive Archive modal
  $$('#drive-category-pills [data-drive-cat]').forEach(btn => {
    btn.addEventListener('click', () => {
      activeDriveCategory = btn.getAttribute('data-drive-cat') || 'all';
      $$('#drive-category-pills [data-drive-cat]').forEach(b => {
        const isAct = b === btn;
        b.classList.toggle('button-primary', isAct);
        b.classList.toggle('button-outline', !isAct);
      });
      renderFamilyDriveArchive();
    });
  });

  // Document actions inside Family Drive Archive modal
  document.addEventListener('click', e => {
    const driveActBtn = e.target.closest('[data-drive-action]');
    if (!driveActBtn) return;
    const act = driveActBtn.getAttribute('data-drive-action');
    if (act === 'print-tree-pdf') {
      $('#family-drive-archive-dialog')?.close();
      openOrganizedPrintTreeWindow();
    } else if (act === 'download-agenda') {
      $('#btn-export-agenda')?.click();
    } else if (act === 'download-cloud-json') {
      $('#btn-export-cloud-snapshot')?.click();
    } else if (act === 'download-charter') {
      const charterDoc = `# مسودة نقاش أولية لمجلس وصندوق أسرة العائلة الافتراضية
**الحالة:** مسودة غير معتمدة؛ ليست رأيًا قانونيًا أو شهادة امتثال.

---

## ١. الرؤية والرسالة العائلية
- **الرؤية:** بناء منظومة عائلية مؤسسية مستدامة تجمع ذرية الجذور الرمزية (الفروع الثمانية: 1، 2، 3، 4، 5، 6، 7، 8) على البر وصلة الرحم والتكافل.
- **الرسالة المقترحة:** تنظيم اللقاءات وحفظ تاريخ الأسرة، بعد مراجعة العلاقات والبيانات واعتمادها من أصحابها.

## ٢. مهام إدارة البوابة المقترحة
- **المؤسس:** أعلى صلاحية لإدارة الحسابات والأدوار وتسمية الأعمام المخولين ومراجعة التفويضات؛ يثبت حسابه عند إعداد النظام.
- **الأعمام المخولون:** إدارة عائلية ضمن نطاق التكليف، وتفويض مهام محددة لا تتجاوز صلاحيات المفوِّض.
- **سقف الجيل الأعلى:** أبناء الفرعين 1 و2؛ يليهم أبناؤهم ثم أبناء أبنائهم بمستويات أقل. يُستدل على المستوى من صلة نسب موثقة ومراجعة، لا من الاسم المكتوب وحده.
- **مدير حسابات العائلة:** إدارة الدعوات والحسابات والأدوار بتكليف عائلي؛ لا يعتمد النسب منفردًا.
- **مراجع عضوية الفرع:** مراجعة طلبات الانتساب ضمن الفرع المكلف به.
- **مراجع النسب:** تدقيق روابط النسب ومصادرها وتسجيل القرارات.
- **مشرف المحتوى:** مراجعة المشاركات والوسائط والبلاغات.
- **مسؤول تشغيل الموقع:** إدارة الاستضافة والتحديثات التقنية، منفصلًا عن صلاحيات العائلة.
- هذه أدوار مقترحة وغير مفعّلة؛ مبرمج الموقع لا يصبح مسؤولًا عائليًا تلقائيًا.

## ٣. الضوابط النظامية والمالية وحماية الخصوصية
- يُحظر جمع أي تبرعات أو اشتراكات مالية عبر البوابة قبل استكمال الترخيص الرسمي والحساب البنكي المستقل لدى المركز الوطني لتنمية القطاع غير الربحي (NCNP).
- لا توجد حاليًا قاعدة بيانات عائلية سحابية أو شهادة امتثال؛ يلزم تقييم مستقل قبل أي إطلاق.
`;
      const blob = new Blob([charterDoc], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ميثاق_ولائحة_مجلس_وصندوق_آل_علام_${new Date().toISOString().slice(0, 10)}.md`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast('📜 تم تحميل وثيقة ميثاق ولائحة مجلس وصندوق العائلة الافتراضية بنجاح!');
    }
  });

  // Upload new document or photo to Family Drive Archive
  $('#drive-archive-upload-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const title = $('#drive-doc-title')?.value.trim();
    const category = $('#drive-doc-category')?.value || 'photos';
    const fileInput = $('#drive-doc-file');
    const file = fileInput?.files?.[0];
    if (!title) return;

    let fileUrl = 'assets/renders/concept_01_heritage_photoreal.png';
    let fileType = 'document';
    let fileName = title + '.txt';
    let sizeStr = 'وثيقة مرفوعة';

    if (file) {
      fileName = file.name;
      sizeStr = `${Math.max(1, Math.round(file.size / 1024))} KB`;
      if (file.type.startsWith('image/')) {
        const mediaObj = await readMediaFileForPost(file);
        fileUrl = mediaObj?.url || URL.createObjectURL(file);
        fileType = 'image';
      } else if (file.size <= 1500000) {
        fileUrl = await new Promise(resolve => {
          const r = new FileReader();
          r.onload = () => resolve(r.result);
          r.onerror = () => resolve(URL.createObjectURL(file));
          r.readAsDataURL(file);
        });
      } else {
        fileUrl = URL.createObjectURL(file);
      }
    } else {
      const txtBlob = new Blob([`وثيقة أرشيفية عائلية: ${title}\nتاريخ الرفع: ${new Date().toLocaleString('ar-SA')}`], { type: 'text/plain;charset=utf-8' });
      fileUrl = URL.createObjectURL(txtBlob);
    }

    const uploaderName = currentUser
      ? String(currentUser.name || '').replace(/^\*/, '').trim()
      : 'عضو العائلة';

    const newDoc = {
      id: 'drive_doc_' + Date.now(),
      title,
      category,
      badge: fileType === 'image' ? 'صورة مرفوعة' : 'ملف مرفوع',
      icon: fileType === 'image' ? '🖼️' : '📄',
      size: sizeStr,
      date: new Intl.DateTimeFormat('ar-SA', { dateStyle: 'short' }).format(new Date()),
      fileUrl,
      fileType,
      fileName,
      desc: `مرفوع بواسطة: ${uploaderName}`
    };

    driveArchiveDocs.unshift(newDoc);
    saveStored(STORAGE_KEYS.driveArchive, driveArchiveDocs);
    activeDriveCategory = 'all';
    renderFamilyDriveArchive();
    if ($('#drive-doc-title')) $('#drive-doc-title').value = '';
    if (fileInput) fileInput.value = '';

    if (window.AllamCloudDB) {
      window.AllamCloudDB.recordAuditEntry(
        'drive_upload',
        `رفع ملف في أرشيف العائلة (Drive): ${title}`,
        uploaderName,
        currentUser?.branch || 'أرشيف Drive'
      );
      renderCloudAuditLog();
    }
    showToast(`📁 تم رفع وحفظ «${title}» في أرشيف العائلة السحابي بنجاح!`);
  });

  $('#btn-add-to-gcal')?.addEventListener('click', () => {
    const title = encodeURIComponent('اللقاء التأسيسي الأول لالعائلة الافتراضية');
    const details = encodeURIComponent(
      'اللقاء التأسيسي المبارك لمعاينة رمزية.\n' +
      '• رابط الاتصال المرئي عبر Google Meet: ' + googleServices.meetUrl + '\n' +
      '• أرشيف وثائق ومحاضر اللقاء في Google Drive: ' + googleServices.driveUrl + '\n' +
      '• المكان: ' + googleServices.mapsUrl
    );
    const location = encodeURIComponent('مدينة افتراضية - قاعة مناسبات خاصة / مع رابط افتراضي عبر Google Meet');
    const dates = '20261024T160000Z/20261024T190000Z';
    const gcalUrl = `#`;
    window.open(gcalUrl, '_blank');
    showToast('جاري فتح تقويم Google لإضافة موعد اللقاء...');
  });

  // Universal .ics Calendar File Export (for Apple Calendar, Outlook, Android/iOS)
  $('#btn-download-ics')?.addEventListener('click', () => {
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Allam Family Portal//AR',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      'UID:allam-founding-meeting-2026@allam-portal',
      'DTSTAMP:20260928T120000Z',
      'DTSTART:20261024T160000Z',
      'DTEND:20261024T190000Z',
      'SUMMARY:اللقاء التأسيسي الأول لالعائلة الافتراضية',
      'DESCRIPTION:اجتماع ممثلي وأبناء الفروع الثمانية لأسرة العائلة الافتراضية. رابط Google Meet: ' + googleServices.meetUrl,
      'LOCATION:مدينة افتراضية - قاعة مناسبات خاصة / Google Meet',
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'allam_family_founding_meeting.ics';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast('📅 تم تحميل ملف التقويم (.ics) لإضافته لتقويم جوالك فوراً!');
  });

  $('#btn-config-google-services')?.addEventListener('click', () => {
    const dialog = $('#google-config-dialog');
    if (!dialog) return;
    $('#cfg-meet-url').value = googleServices.meetUrl || '';
    $('#cfg-drive-url').value = googleServices.driveUrl || '';
    $('#cfg-maps-url').value = googleServices.mapsUrl || '';
    dialog.showModal();
  });

  $('#btn-close-google-config')?.addEventListener('click', () => $('#google-config-dialog')?.close());
  $('#btn-cancel-google-config')?.addEventListener('click', () => $('#google-config-dialog')?.close());

  $('#google-config-form')?.addEventListener('submit', e => {
    e.preventDefault();
    googleServices.meetUrl = $('#cfg-meet-url').value.trim() || DEFAULT_GOOGLE_SERVICES.meetUrl;
    googleServices.driveUrl = $('#cfg-drive-url').value.trim() || DEFAULT_GOOGLE_SERVICES.driveUrl;
    googleServices.mapsUrl = $('#cfg-maps-url').value.trim() || DEFAULT_GOOGLE_SERVICES.mapsUrl;
    saveStored(STORAGE_KEYS.googleServices, googleServices);
    applyGoogleServices();
    $('#google-config-dialog')?.close();
    showToast('تم حفظ وتحديث روابط خدمات Google بنجاح.');
  });

  // ==========================================
  // 7. DIRECT TREE EDIT & PERSONAL USER ACCOUNT PORTAL (WITH 4-TIER ROLES)
  // ==========================================
  $('#correction-action-type')?.addEventListener('change', e => {
    const mode = e.target.value;
    const addRelBox = $('#correction-add-relative-fields');
    const editSelfBox = $('#correction-edit-self-fields');
    if (mode === 'edit_self') {
      if (addRelBox) addRelBox.style.display = 'none';
      if (editSelfBox) editSelfBox.style.display = 'grid';
    } else {
      if (addRelBox) addRelBox.style.display = 'block';
      if (editSelfBox) editSelfBox.style.display = 'none';
    }
  });

  // Direct Tree Edit / Add Child or Spouse Submit (Instant Update with Role Check)
  $('#correction-form')?.addEventListener('submit', e => {
    e.preventDefault();
    const personName = $('#correction-person-name')?.value || '';
    const details = $('#correction-details')?.value.trim() || '';
    const actionType = $('#correction-action-type')?.value || 'edit_self';

    if (!treeActiveNode || treeActiveNode.id === 'root') {
      $('#correction-dialog').close();
      return;
    }

    const isAddingRel = actionType !== 'edit_self';
    if (!canCurrentUserEditTarget(treeActiveNode, isAddingRel)) {
      const rInfo = ROLE_HIERARCHY[currentUser?.role || 'member'] || ROLE_HIERARCHY.member;
      showToast(`صلاحية ${rInfo.shortBadge} لا تسمح بهذا التعديل. اطلب المراجعة من مدير حسابات العائلة.`);
      return;
    }

    if (!treeDelta.updatedMembers) treeDelta.updatedMembers = {};
    if (!Array.isArray(treeDelta.addedMembers)) treeDelta.addedMembers = [];

    if (actionType === 'edit_self') {
      const cityVal = $('#correction-city-input')?.value.trim() || treeActiveNode.city || '';
      const jobVal = $('#correction-job-input')?.value.trim() || treeActiveNode.job || '';
      treeDelta.updatedMembers[treeActiveNode.id] = {
        ...(treeDelta.updatedMembers[treeActiveNode.id] || {}),
        city: cityVal,
        job: jobVal,
        bio: details || treeActiveNode.bio,
        status: 'موثق ومحدّث فورياً'
      };
      applyTreeDeltaAndRefresh(`تحديث بيانات وسيرة (${personName}) في الشجرة`);
      const updated = activeMembersData.find(m => m.id === treeActiveNode.id);
      if (updated) openSafeDrawer(updated);
      $('#correction-dialog').close();
      showToast(`✓ تم تحديث بيانات (${personName}) في الشجرة والدليل فوراً!`);
    } else {
      const newRelName = $('#correction-new-relative-name')?.value.trim();
      if (!newRelName) {
        showToast('يرجى كتابة اسم المولود أو الفرد المراد إضافته للشجرة.');
        return;
      }
      const isSpouse = actionType === 'add_spouse';
      const isFemale = actionType === 'add_child_female';
      const newId = 'mem_' + Date.now();
      const parentClean = String(treeActiveNode.name || '').replace(/^\*/, '').trim();
      const newMember = {
        id: newId,
        parentId: isSpouse ? null : treeActiveNode.id,
        partnerId: isSpouse ? treeActiveNode.id : null,
        parentLinkStatus: isSpouse ? 'DISPLAY_TOPOLOGY' : 'CONFIRMED',
        name: newRelName,
        branch: treeActiveNode.branch || 'الفرع 1',
        gen: isSpouse ? (treeActiveNode.gen || 2) : Math.min(4, (treeActiveNode.gen || 2) + 1),
        gender: isFemale ? 'أنثى' : 'ذكر',
        relation: isSpouse ? `زوج/زوجة (${parentClean})` : isFemale ? `ابنة (${parentClean})` : `ابن (${parentClean})`,
        city: treeActiveNode.city || 'مدينة افتراضية',
        job: '',
        status: 'مضاف ومعتمد مباشرة',
        bio: details || `${isSpouse ? 'زوج/زوجة' : isFemale ? 'ابنة' : 'ابن'} ${parentClean} — أُضيف مباشرة عبر الشجرة التفاعلية.`
      };
      treeDelta.addedMembers.push(newMember);
      applyTreeDeltaAndRefresh(`إضافة (${newRelName}) تحت (${parentClean}) في الشجرة`);
      const addedNode = activeMembersData.find(m => m.id === newId);
      if (addedNode) openSafeDrawer(addedNode);
      if ($('#correction-new-relative-name')) $('#correction-new-relative-name').value = '';
      $('#correction-dialog').close();
      showToast(`✓ تمت إضافة (${newRelName}) إلى الشجرة الثلاثية الأبعاد ومخطط النسب فوراً!`);
    }
  });

  // =========================================================================
  // محرك المطابقة الذكي للأسماء والربط التلقائي بالشجرة (Smart Arabic Name-Matching & Auto-Tree Linker)
  // يطابق الاسم الثلاثي/الرباعي مع الـ 393 عضواً أو يتعرف تلقائياً على الأب والفرع للأبناء الجدد
  // =========================================================================
  const CONNECTOR_STOP_WORDS = new Set([
    'بن', 'بنت', 'ابن', 'ابنه', 'ابنة', 'ال', 'آل', 'علام', 'العلام', 'الشريف', 'رحمه', 'الله', 'ابو', 'أبو', 'ام', 'أم'
  ]);

  const FEMALE_INDICATORS = new Set([
    'بنت', 'ابنه', 'ابنة', 'ام', 'أم'
  ]);

  const KNOWN_FEMALE_NAMES = new Set([
    'رحمه', 'مستوره', 'ناجيه', 'هدي', 'ساره', 'نوره', 'فاطمه', 'مريم', 'ريم', 'لولوه', 'دانه',
    'تالا', 'ليان', 'جود', 'لمي', 'هند', 'امل', 'منيره', 'عبير', 'غاده', 'مها', 'وفاء', 'سلمي',
    'عائشه', 'خديجه', 'زينب', 'رقيه', 'اسماء', 'حفصه', 'سميه', 'لطيفه', 'حصه', 'نوف', 'مشاعل',
    'الجوهره', 'جوهره', 'البندري', 'شهد', 'رغد', 'رهف', 'فرح', 'حلا', 'جني', 'ربا', 'رنا',
    'نهي', 'نجوي', 'سلوي', 'خلود', 'عهود', 'عنود', 'العنود', 'بدريه', 'فوزيه', 'ناديه', 'ساميه',
    'ابتسام', 'اشواق', 'افنان', 'الاء', 'ايمان', 'حنان', 'دلال', 'روان', 'ريما', 'سحر', 'سماح',
    'سمر', 'سهام', 'شروق', 'شيماء', 'اسم تجريبي', 'ضحى', 'ضحي', 'عفاف', 'علا', 'فاتن', 'ليلي', 'مرام',
    'نوال', 'نهال', 'هيفاء', 'وداد', 'وسن', 'ياسمين', 'يارا', 'بيان', 'بشائر', 'بشاير', 'تغريد'
  ]);

  function normalizeArabicLineageText(str) {
    if (!str) return '';
    return String(str)
      .replace(/^\*+/, '')
      .replace(/[\u064B-\u065F\u0670\u0640]/g, '') // إزالة التشكيل والمد
      .replace(/[أإآٱ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')
      .replace(/ؤ/g, 'و')
      .replace(/ئ/g, 'ي')
      .replace(/\bعبد\s+/g, 'عبد') // توحيد (عبد الله -> عبدالله، عبد الإله -> عبدالاله، عبد العزيز -> عبدالعزيز)
      .replace(/[^\u0621-\u064A0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function extractLineageTokens(rawStr) {
    const norm = normalizeArabicLineageText(rawStr);
    if (!norm) return [];
    const rawParts = norm.split(/\s+/).filter(Boolean);
    const filtered = rawParts.filter(part => !CONNECTOR_STOP_WORDS.has(part));
    return filtered.length > 0 ? filtered : rawParts;
  }

  function inferArabicGenderFromInput(rawStr, firstTokenNorm) {
    const norm = normalizeArabicLineageText(rawStr);
    const rawWords = norm.split(/\s+/).filter(Boolean);
    if (rawWords.some(w => FEMALE_INDICATORS.has(w))) return 'F';
    if (!firstTokenNorm) return 'M';
    if (KNOWN_FEMALE_NAMES.has(firstTokenNorm)) return 'F';
    if (firstTokenNorm.endsWith('ه') && !['حمزه', 'طلحه', 'عبيده', 'قتاده', 'اسامه', 'معاويه', 'حذيفه', 'عكرمه'].includes(firstTokenNorm)) {
      return 'F';
    }
    return 'M';
  }

  function getMemberFullLineageTokens(member, byIdMap = null) {
    if (!member) return [];
    const tokens = extractLineageTokens(member.name);
    const map = byIdMap || new Map(activeMembersData.map(m => [m.id, m]));
    const visited = new Set([member.id]);
    let curr = member;
    let depth = 0;

    while (curr && depth < 6) {
      const pid = curr.parentId || curr.candidateParentId;
      if (!pid || pid === 'root' || visited.has(pid)) break;
      visited.add(pid);
      const parentObj = map.get(pid);
      if (!parentObj) break;
      const parentTokens = extractLineageTokens(parentObj.name);
      if (parentTokens.length > 0) {
        const parentGiven = parentTokens[0];
        if (!tokens.includes(parentGiven)) {
          tokens.push(parentGiven);
        }
        // Also append any subsequent ancestor tokens from parent's name not yet in chain
        for (let i = 1; i < parentTokens.length; i++) {
          if (!tokens.includes(parentTokens[i])) {
            tokens.push(parentTokens[i]);
          }
        }
      }
      curr = parentObj;
      depth++;
    }
    return tokens;
  }

  function scoreExistingMemberMatch(queryTokens, member, byIdMap) {
    if (!queryTokens || queryTokens.length === 0 || !member || member.id === 'root') return 0;
    const memberTokens = getMemberFullLineageTokens(member, byIdMap);
    if (memberTokens.length === 0) return 0;

    // First token must match the member's given name (exact, or prefix if user is still typing 1st word)
    const qFirst = queryTokens[0];
    const mFirst = memberTokens[0];
    let score = 0;

    if (mFirst === qFirst) {
      score += 100;
    } else if (queryTokens.length === 1 && qFirst.length >= 2 && mFirst.startsWith(qFirst)) {
      score += 55;
    } else {
      return 0;
    }

    if (queryTokens.length === 1) {
      // Slight boost for earlier generations (founders/heads) when only 1 token is typed
      score += Math.max(0, 10 - (member.gen || 3) * 2);
      return score;
    }

    // Match remaining patronymic tokens (father, grandfather, etc.) in order
    let searchStartIdx = 1;
    for (let qi = 1; qi < queryTokens.length; qi++) {
      const qt = queryTokens[qi];
      const isLastQueryToken = qi === queryTokens.length - 1;
      let matchedAt = -1;
      let isExact = false;

      for (let mi = searchStartIdx; mi < memberTokens.length; mi++) {
        if (memberTokens[mi] === qt) {
          matchedAt = mi;
          isExact = true;
          break;
        }
        if (isLastQueryToken && qt.length >= 2 && memberTokens[mi].startsWith(qt)) {
          matchedAt = mi;
          isExact = false;
          break;
        }
      }

      if (matchedAt === -1) {
        return 0; // Patronymic mismatch!
      }

      if (qi === 1 && matchedAt === 1) {
        // Direct father match
        score += isExact ? 130 : 75;
      } else {
        score += isExact ? 85 : 45;
        // Small penalty for skipped ancestor generation
        score -= (matchedAt - searchStartIdx) * 8;
      }
      searchStartIdx = matchedAt + 1;
    }

    // Bonus if the query matched 2+ exact tokens
    if (queryTokens.length >= 2) {
      score += 25;
    }
    return score;
  }

  function matchOrLinkNameToTree(rawInput, customMembersList = null) {
    const dataset = (Array.isArray(customMembersList) && customMembersList.length > 0)
      ? customMembersList
      : activeMembersData;
    const realPool = dataset.filter(m => m && m.id !== 'root');
    const byIdMap = new Map(dataset.map(m => [m.id, m]));

    const queryTokens = extractLineageTokens(rawInput);
    if (queryTokens.length === 0) {
      return { status: 'EMPTY', queryTokens: [], candidates: [] };
    }

    // 1. Try matching against existing 393 members
    const scoredExisting = [];
    for (const m of realPool) {
      const sc = scoreExistingMemberMatch(queryTokens, m, byIdMap);
      if (sc > 0) {
        scoredExisting.push({ member: m, score: sc, lineageTokens: getMemberFullLineageTokens(m, byIdMap) });
      }
    }
    scoredExisting.sort((a, b) => b.score - a.score || (a.member.gen || 3) - (b.member.gen || 3));

    if (scoredExisting.length > 0) {
      const top = scoredExisting[0];
      const second = scoredExisting[1];
      const isUniqueOrClearWinner = scoredExisting.length === 1 ||
        (queryTokens.length >= 2 && (!second || top.score > second.score));

      return {
        status: isUniqueOrClearWinner ? 'EXISTING_MEMBER' : 'AMBIGUOUS_EXISTING',
        confidence: isUniqueOrClearWinner ? 'HIGH' : 'MEDIUM',
        member: top.member,
        score: top.score,
        queryTokens,
        candidates: scoredExisting.slice(0, 6).map(x => x.member)
      };
    }

    // 2. If no existing member matched and user typed 2+ tokens (ChildName + FatherName + ...),
    // strip the first token (new child's given name) and match the remaining tokens as the Father/Parent!
    if (queryTokens.length >= 2) {
      const childGivenToken = queryTokens[0];
      const parentQueryTokens = queryTokens.slice(1);
      const scoredParents = [];

      for (const m of realPool) {
        const pScore = scoreExistingMemberMatch(parentQueryTokens, m, byIdMap);
        if (pScore > 0) {
          scoredParents.push({ member: m, score: pScore });
        }
      }
      scoredParents.sort((a, b) => b.score - a.score || (a.member.gen || 2) - (b.member.gen || 2));

      if (scoredParents.length > 0) {
        const bestParent = scoredParents[0].member;
        const parentClean = String(bestParent.name || '').replace(/^\*/, '').trim();
        const rawFirstWord = normalizeArabicLineageText(rawInput).split(/\s+/)[0] || childGivenToken;
        const inferredGender = inferArabicGenderFromInput(rawInput, childGivenToken);
        const fullSuggestedName = `${rawFirstWord} ${parentClean}`;

        return {
          status: 'NEW_CHILD_AUTO_PARENT',
          confidence: (scoredParents.length === 1 || parentQueryTokens.length >= 2) ? 'HIGH' : 'MEDIUM',
          childGivenName: rawFirstWord,
          fullSuggestedName,
          inferredGender,
          parentMember: bestParent,
          branch: bestParent.branch || 'الفرع 1',
          gen: Math.min(5, (bestParent.gen || 2) + 1),
          queryTokens,
          parentCandidates: scoredParents.slice(0, 5).map(x => x.member)
        };
      }
    }

    return {
      status: 'NO_MATCH',
      queryTokens,
      candidates: []
    };
  }

  // Expose Smart Matcher API globally for diagnostics and tests
  window.AllamSmartNameMatcher = {
    normalizeArabicLineageText,
    extractLineageTokens,
    getMemberFullLineageTokens,
    matchOrLinkNameToTree
  };

  let selectedSmartCandidateId = null;
  let selectedSmartParentId = null;

  function renderSmartMatchPreviewCard() {
    const inputEl = $('#smart-auth-name-input');
    const cardEl = $('#smart-match-result-card');
    if (!inputEl || !cardEl) return;

    if (PREVIEW_READ_ONLY) {
      selectedSmartCandidateId = null;
      selectedSmartParentId = null;
      cardEl.style.display = 'block';
      cardEl.textContent = 'مطابقة الأسماء وربطها بالشجرة غير متاحين في نسخة العرض. طلب العضوية لا يضيف اسمًا ولا يثبت صلة نسب.';
      return;
    }

    const rawVal = inputEl.value.trim();
    if (!rawVal) {
      cardEl.style.display = 'none';
      cardEl.innerHTML = '';
      selectedSmartCandidateId = null;
      selectedSmartParentId = null;
      return;
    }

    const res = matchOrLinkNameToTree(rawVal);
    cardEl.style.display = 'block';

    if (res.status === 'EXISTING_MEMBER' || res.status === 'AMBIGUOUS_EXISTING') {
      const targetMem = (selectedSmartCandidateId && res.candidates.find(c => c.id === selectedSmartCandidateId))
        || res.member;
      const clean = String(targetMem.name || '').replace(/^\*/, '').trim();
      const roleKey = userAccounts?.[targetMem.id]?.role || inferDefaultRoleForMember(targetMem);
      const roleInfo = ROLE_HIERARCHY[roleKey] || ROLE_HIERARCHY.member;

      // Also sync the underlying #login-member-select automatically!
      if ($('#login-branch-filter')) $('#login-branch-filter').value = 'all';
      populateUserLoginSelect(targetMem.id);

      let candidatesHtml = '';
      if (res.candidates.length > 1) {
        candidatesHtml = `
          <div style="margin-top:0.45rem; padding-top:0.4rem; border-top:1px dashed rgba(39,174,96,0.3);">
            <div style="font-size:0.75rem; color:var(--text-muted); margin-bottom:0.3rem;">وجدنا (${res.candidates.length}) أسماء مطابقة — اختر أو أكمل كتابة اسم الأب:</div>
            <div style="display:flex; flex-wrap:wrap; gap:0.35rem;">
              ${res.candidates.map(c => {
                const cClean = String(c.name || '').replace(/^\*/, '').trim();
                const isSel = c.id === targetMem.id;
                return `<button type="button" class="button ${isSel ? 'button-primary' : 'button-outline'} smart-cand-pill" data-cand-id="${c.id}" style="font-size:0.74rem; padding:0.2rem 0.55rem;">${escapeHTML(cClean)} (${escapeHTML(c.branch)})</button>`;
              }).join('')}
            </div>
          </div>
        `;
      }

      cardEl.style.background = 'rgba(39, 174, 96, 0.12)';
      cardEl.style.border = '1px solid rgba(39, 174, 96, 0.45)';
      cardEl.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.4rem;">
          <div>
            <span style="font-size:0.76rem; color:#27ae60; font-weight:bold;">✅ تم التعرف والربط التلقائي مع عضو مسجل في الشجرة:</span>
            <div style="font-weight:bold; font-size:0.95rem; color:var(--text-main); margin-top:0.15rem;">
              🌳 ${escapeHTML(clean)}
            </div>
            <div style="font-size:0.8rem; color:var(--text-muted); margin-top:0.1rem;">
              ${escapeHTML(targetMem.branch)} • الجيل ${targetMem.gen || 2} • الصلاحية: <strong style="color:var(--gold-light);">${escapeHTML(roleInfo.badge)}</strong>
            </div>
          </div>
          <span class="badge" style="background:rgba(39,174,96,0.2); color:#2ecc71; border:1px solid rgba(39,174,96,0.4);">مطابقة فورية 100%</span>
        </div>
        ${candidatesHtml}
      `;

      cardEl.querySelectorAll('.smart-cand-pill').forEach(btn => {
        btn.addEventListener('click', () => {
          selectedSmartCandidateId = btn.getAttribute('data-cand-id');
          renderSmartMatchPreviewCard();
        });
      });
      return;
    }

    if (res.status === 'NEW_CHILD_AUTO_PARENT') {
      const parentMem = (selectedSmartParentId && res.parentCandidates.find(p => p.id === selectedSmartParentId))
        || res.parentMember;
      const parentClean = String(parentMem.name || '').replace(/^\*/, '').trim();
      const relLabel = res.inferredGender === 'F' ? 'ابنة' : 'ابن';

      let parentPillsHtml = '';
      if (res.parentCandidates.length > 1) {
        parentPillsHtml = `
          <div style="margin-top:0.45rem; padding-top:0.4rem; border-top:1px dashed rgba(212,175,55,0.3);">
            <div style="font-size:0.75rem; color:var(--text-muted); margin-bottom:0.3rem;">أو اختر الأب المطابق إذا تشابه الاسم:</div>
            <div style="display:flex; flex-wrap:wrap; gap:0.35rem;">
              ${res.parentCandidates.map(p => {
                const pClean = String(p.name || '').replace(/^\*/, '').trim();
                const isSel = p.id === parentMem.id;
                return `<button type="button" class="button ${isSel ? 'button-primary' : 'button-outline'} smart-parent-pill" data-parent-id="${p.id}" style="font-size:0.74rem; padding:0.2rem 0.55rem;">${escapeHTML(pClean)} (${escapeHTML(p.branch)})</button>`;
              }).join('')}
            </div>
          </div>
        `;
      }

      cardEl.style.background = 'rgba(212, 175, 55, 0.13)';
      cardEl.style.border = '1px solid rgba(212, 175, 55, 0.5)';
      cardEl.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.4rem;">
          <div>
            <span style="font-size:0.76rem; color:var(--gold-light); font-weight:bold;">✨ اسم جديد — تم التعرف تلقائياً على الأب والفرع من سياق الاسم!</span>
            <div style="font-weight:bold; font-size:0.95rem; color:var(--text-main); margin-top:0.15rem;">
              🌱 ${escapeHTML(res.childGivenName)} (${relLabel}: ${escapeHTML(parentClean)})
            </div>
            <div style="font-size:0.8rem; color:var(--text-muted); margin-top:0.1rem;">
              سيُضاف تلقائياً تحت <strong>${escapeHTML(parentClean)}</strong> • ${escapeHTML(parentMem.branch)} • الجيل ${Math.min(5, (parentMem.gen || 2) + 1)}
            </div>
          </div>
          <span class="badge" style="background:rgba(212,175,55,0.2); color:var(--gold-light); border:1px solid rgba(212,175,55,0.4);">ربط أبوي ذكي</span>
        </div>
        ${parentPillsHtml}
      `;

      cardEl.querySelectorAll('.smart-parent-pill').forEach(btn => {
        btn.addEventListener('click', () => {
          selectedSmartParentId = btn.getAttribute('data-parent-id');
          renderSmartMatchPreviewCard();
        });
      });
      return;
    }

    // NO_MATCH state
    cardEl.style.background = 'rgba(230, 126, 34, 0.12)';
    cardEl.style.border = '1px solid rgba(230, 126, 34, 0.4)';
    cardEl.innerHTML = `
      <div style="font-size:0.82rem; color:#f39c12;">
        💡 لم نجد تطابقاً مباشراً لـ "<strong>${escapeHTML(rawVal)}</strong>" — جرب كتابة الاسم مع اسم الأب والجد (مثال: <em>فلان بن علان افتراضي</em>)، أو استخدم تبويب "إضافة عضو جديد" أدناه لتحديد الفرع يدوياً.
      </div>
    `;
  }

  function updateRegAutoLinkBanner() {
    const bannerEl = $('#reg-auto-link-banner');
    if (!bannerEl) return;
    bannerEl.style.display = 'block';
    bannerEl.textContent = 'إرسال الطلب لا يضيف اسمك إلى الشجرة. يلزم التحقق من العضوية ومراجعة صلة النسب وموافقتك على عرض الاسم.';
  }

  function populateUserLoginSelect(preselectMemberId = null) {
    const selectEl = $('#login-member-select');
    const regParentSelect = $('#reg-member-parent');
    if (!selectEl) return;

    const branchVal = $('#login-branch-filter')?.value || 'all';
    const rawSearchVal = ($('#login-member-search')?.value || '').trim();
    const searchVal = rawSearchVal.toLocaleLowerCase('ar');
    const searchTokens = extractLineageTokens(rawSearchVal);
    const byIdMap = new Map(activeMembersData.map(m => [m.id, m]));

    const candidates = activeMembersData
      .filter(m => m.id !== 'root')
      .filter(m => {
        const matchBranch = branchVal === 'all' || m.branch === branchVal;
        if (!matchBranch) return false;
        if (!rawSearchVal) return true;
        const directSubstr = `${m.name} ${m.branch} ${m.relation}`.toLocaleLowerCase('ar').includes(searchVal);
        if (directSubstr) return true;
        return scoreExistingMemberMatch(searchTokens, m, byIdMap) > 0;
      });

    selectEl.innerHTML = candidates.map(m => {
      const clean = String(m.name || '').replace(/^\*/, '').trim();
      const genText = `ج${m.gen || 2}`;
      const defRole = ROLE_HIERARCHY[userAccounts?.[m.id]?.role || inferDefaultRoleForMember(m)]?.shortBadge || '👤 عضو';
      return `<option value="${m.id}">${escapeHTML(clean)} — (${escapeHTML(m.branch)} • ${genText} • ${escapeHTML(defRole)})</option>`;
    }).join('');

    if (preselectMemberId && candidates.some(c => c.id === preselectMemberId)) {
      selectEl.value = preselectMemberId;
    } else if (currentUser && candidates.some(c => c.id === currentUser.memberId)) {
      selectEl.value = currentUser.memberId;
    } else if (candidates.length > 0 && !selectEl.value) {
      selectEl.value = candidates[0].id;
    }

    // Also populate parent selector in Register New Member form
    if (regParentSelect) {
      const currentParentVal = regParentSelect.value;
      const regBranch = $('#reg-member-branch')?.value || 'الفرع 1';
      const branchParents = activeMembersData.filter(m => m.id !== 'root' && m.branch === regBranch);
      regParentSelect.innerHTML = '<option value="" selected disabled>اختر شخصًا تقترح مراجعته</option>' + branchParents.map(p => {
        const clean = String(p.name || '').replace(/^\*/, '').trim();
        return `<option value="${p.id}">${escapeHTML(clean)} (الجيل ${p.gen || 2})</option>`;
      }).join('');
      if (currentParentVal && branchParents.some(p => p.id === currentParentVal)) {
        regParentSelect.value = currentParentVal;
      } else {
        regParentSelect.value = '';
      }
    }
  }

  function syncLoggedInUserUI() {
    const topLabel = $('#topbar-user-label') || $('#user-account-top-label');
    const sidebarAvatar = $('#sidebar-user-avatar');
    const sidebarName = $('#sidebar-user-name');
    const sidebarRole = $('#sidebar-user-role');
    const inlineBadge = $('#inline-post-author-badge');

    if (currentUser && currentUser.memberId) {
      const liveMember = activeMembersData.find(m => m.id === currentUser.memberId) || currentUser;
      const cleanName = String(liveMember.name || '').replace(/^\*/, '').trim();
      const shortName = cleanName.split(/\s+/).slice(0, 2).join(' ');
      const roleKey = currentUser.role || inferDefaultRoleForMember(liveMember);
      const roleInfo = ROLE_HIERARCHY[roleKey] || ROLE_HIERARCHY.member;

      if (topLabel) topLabel.textContent = `${roleInfo.shortBadge.split(' ')[0]} ${shortName}`;
      if (sidebarAvatar) sidebarAvatar.textContent = cleanName.slice(0, 1) || 'ع';
      if (sidebarName) sidebarName.textContent = cleanName;
      if (sidebarRole) sidebarRole.textContent = `${roleInfo.badge} • ${liveMember.branch || 'العائلة'}`;
      if (inlineBadge) inlineBadge.textContent = `ينشر باسم: ${cleanName} (${roleInfo.shortBadge})`;

      // Populate dashboard fields if open
      if ($('#dash-user-avatar')) $('#dash-user-avatar').textContent = cleanName.slice(0, 1) || 'ع';
      if ($('#dash-user-name')) $('#dash-user-name').textContent = cleanName;
      if ($('#dash-user-role-badge')) $('#dash-user-role-badge').textContent = roleInfo.badge;
      if ($('#dash-role-select')) $('#dash-role-select').value = roleKey;
      if ($('#dash-permissions-summary')) $('#dash-permissions-summary').textContent = roleInfo.summary;
      if ($('#dash-user-meta')) $('#dash-user-meta').textContent = `${liveMember.branch || ''} • الجيل ${liveMember.gen || 3}`;
      if ($('#dash-edit-name')) $('#dash-edit-name').value = cleanName;
      if ($('#dash-edit-city')) $('#dash-edit-city').value = (liveMember.city && liveMember.city !== '==') ? liveMember.city : '';
      if ($('#dash-edit-job')) $('#dash-edit-job').value = (liveMember.job && liveMember.job !== '==') ? liveMember.job : '';
      if ($('#dash-edit-edu')) $('#dash-edit-edu').value = (liveMember.edu && liveMember.edu !== '==') ? liveMember.edu : '';
      if ($('#dash-edit-bio')) $('#dash-edit-bio').value = liveMember.bio || '';
    } else {
      if (topLabel) topLabel.textContent = 'الحساب (غير مفعّل)';
      if (sidebarAvatar) sidebarAvatar.textContent = '👤';
      if (sidebarName) sidebarName.textContent = 'تسجيل الدخول بحسابك';
      if (sidebarRole) sidebarRole.textContent = 'نسخة عرض — تسجيل الدخول غير متاح';
      if (inlineBadge) inlineBadge.textContent = 'النشر باسم مستخدم غير مفعّل';
    }
  }

  function openUserAccountModal(targetMemberId = null) {
    const dialog = $('#user-account-dialog');
    if (!dialog) return;

    const authView = $('#user-auth-view');
    const dashView = $('#user-dashboard-view');
    const inlineVaultBar = $('#user-dialog-vault-unlock-bar');
    if (inlineVaultBar) {
      inlineVaultBar.style.display = activeMembersData.length > 50 ? 'none' : 'block';
    }

    // If targetMemberId is passed and differs from currentUser, show login form pre-selected to targetMemberId
    const switchingToAnotherMember = targetMemberId && (!currentUser || currentUser.memberId !== targetMemberId);

    if (currentUser && currentUser.memberId && !switchingToAnotherMember) {
      if (authView) authView.style.display = 'none';
      if (dashView) dashView.style.display = 'flex';
      syncLoggedInUserUI();
    } else {
      if (authView) authView.style.display = 'block';
      if (dashView) dashView.style.display = 'none';
      if (targetMemberId) {
        const targetMem = activeMembersData.find(m => m.id === targetMemberId);
        if (targetMem && $('#login-branch-filter')) {
          $('#login-branch-filter').value = targetMem.branch || 'all';
        }
        if ($('#login-member-search')) $('#login-member-search').value = '';
        if ($('#smart-auth-name-input') && targetMem) {
          $('#smart-auth-name-input').value = String(targetMem.name || '').replace(/^\*/, '').trim();
          renderSmartMatchPreviewCard();
        }
      }
      populateUserLoginSelect(targetMemberId);
    }

    if (!dialog.open) dialog.showModal();
  }

  function initUserAccountPortal() {
    const authView = $('#user-auth-view');
    if (authView) {
      authView.innerHTML = '<section style="padding:18px;border:1px solid #d8c8a4;border-radius:12px;background:#fffdf7;color:#493d26;line-height:1.8"><strong>دخول العائلة الآمن</strong><p>سجّل بحساب Google. لا تظهر سجلات الأنساب إلا للحسابات المرتبطة بعضوية معتمدة.</p><button id="allam-google-sign-in" class="button button-primary" type="button">الدخول بحساب Google</button><button id="allam-google-sign-out" class="button button-quiet" type="button" hidden>تسجيل الخروج</button><p id="allam-auth-status" role="status" aria-live="polite">جارٍ التحقق من إعداد تسجيل الدخول…</p></section>';
    }
    $('#user-dashboard-view') && ($('#user-dashboard-view').style.display = 'none');
    $('#btn-close-user-account')?.addEventListener('click', () => $('#user-account-dialog')?.close());
    const status = $('#allam-auth-status');
    const signIn = $('#allam-google-sign-in');
    const signOut = $('#allam-google-sign-out');
    const setAccountState = (account) => {
      if (!status) return;
      if (!account?.user) {
        status.textContent = account?.error || 'لم تسجل الدخول بعد. سجّل بحساب Google للمتابعة.';
        if (signIn) signIn.hidden = false;
        if (signOut) signOut.hidden = true;
        return;
      }
      if (signIn) signIn.hidden = true;
      if (signOut) signOut.hidden = false;
      status.textContent = account.membership === 'active'
        ? 'تم التحقق من الحساب والعضوية. عرض شجرة الأسماء غير مفعّل في هذه المعاينة بعد.'
        : 'تم تسجيل الدخول، لكن الحساب غير مرتبط بعضوية عائلية معتمدة. لن تظهر أسماء أو سجلات خاصة قبل مراجعة الربط.';
    };
    if (window.AllamAuthGate) {
      window.AllamAuthGate.init(setAccountState).catch(() => setAccountState({ error: 'تعذر الاتصال بخدمة تسجيل الدخول. تحقق من إعداد Firebase والنطاق المسموح.' }));
    } else {
      setAccountState({ error: 'تعذر تحميل تسجيل Google. حدّث الصفحة أو تحقق من اتصال الإنترنت.' });
    }
    signIn?.addEventListener('click', async () => {
      signIn.disabled = true;
      status.textContent = 'جارٍ فتح نافذة تسجيل Google…';
      const result = await window.AllamAuthGate?.signIn();
      if (!result?.ok) status.textContent = result?.message || 'تعذر تسجيل الدخول. تأكد من تفعيل Google وإضافة نطاق الموقع في Firebase.';
      signIn.disabled = false;
    });
    signOut?.addEventListener('click', async () => {
      await window.AllamAuthGate?.signOut();
      setAccountState(null);
    });
    syncLoggedInUserUI();
  }
  function initCloudSyncPortal() {
    const cloudDialog = $('#cloud-sync-dialog');
    const openCloudDialog = () => cloudDialog?.showModal();
    $('#btn-cloud-sync-top')?.addEventListener('click', openCloudDialog);
    $('#btn-open-cloud-sync-page')?.addEventListener('click', openCloudDialog);
    $('#btn-close-cloud-sync')?.addEventListener('click', () => cloudDialog?.close());
    const statusTitle = $('#cloud-modal-status-title');
    const statusSub = $('#cloud-modal-status-sub');
    if (statusTitle) statusTitle.textContent = 'المزامنة السحابية متوقفة';
    if (statusSub) statusSub.textContent = 'لن تُفتح قاعدة بيانات أو تُرسل بيانات حتى تكتمل المصادقة الموثوقة ومراجعة الصلاحيات.';
    const syncLabel = $('#cloud-sync-status-text');
    if (syncLabel) syncLabel.textContent = 'المزامنة متوقفة';
    const syncDot = $('#cloud-sync-dot');
    if (syncDot) syncDot.style.background = '#b45309';
    $('#btn-cloud-sync-now')?.setAttribute('hidden', '');
    $('#firebase-config-form')?.setAttribute('hidden', '');
    $('#btn-export-cloud-snapshot') && ($('#btn-export-cloud-snapshot').disabled = true);
    $('#input-import-cloud-snapshot') && ($('#input-import-cloud-snapshot').disabled = true);
    const snapshotStatus = $('#cloud-snapshot-status');
    if (snapshotStatus) snapshotStatus.textContent = 'تصدير واستيراد اللقطات غير متاحين؛ لا يوجد حساب موثق أو مزامنة بين الأجهزة.';
    return;

    window.AllamCloudDB.init({
      onStatusChange: () => {
        renderCloudAuditLog();
      },
      onRemoteTreeDelta: (remoteDelta) => {
        if (!remoteDelta || typeof remoteDelta !== 'object') return;
        treeDelta = {
          updatedMembers: remoteDelta.updatedMembers || remoteDelta.editedById || {},
          addedMembers: Array.isArray(remoteDelta.addedMembers) ? remoteDelta.addedMembers : []
        };
        applyTreeDeltaAndRefresh();
      },
      onRemoteRoles: (remoteRoleMap) => {
        if (!remoteRoleMap || typeof remoteRoleMap !== 'object') return;
        if (!userAccounts || typeof userAccounts !== 'object') userAccounts = {};
        Object.keys(remoteRoleMap).forEach(mid => {
          userAccounts[mid] = {
            ...(userAccounts[mid] || { memberId: mid }),
            role: remoteRoleMap[mid]
          };
        });
        saveStored(STORAGE_KEYS.userAccounts, userAccounts);
        if (currentUser && currentUser.memberId && remoteRoleMap[currentUser.memberId]) {
          currentUser.role = remoteRoleMap[currentUser.memberId];
          saveStored(STORAGE_KEYS.currentUser, currentUser);
          syncLoggedInUserUI();
        }
        renderRolesDirectory();
      },
      onRemotePosts: (remotePosts) => {
        if (!Array.isArray(remotePosts) || remotePosts.length === 0) return;
        contributions = remotePosts;
        saveStored(STORAGE_KEYS.contributions, contributions);
        renderContributions();
      },
      onAuditLogChange: () => {
        renderCloudAuditLog();
      }
    });

    $('#firebase-config-form')?.addEventListener('submit', async e => {
      e.preventDefault();
      const inputEl = $('#firebase-config-textarea') || $('#firebase-config-input');
      const rawText = inputEl?.value.trim() || '';
      const msgEl = $('#firebase-config-feedback') || $('#firebase-config-msg');
      const res = await window.AllamCloudDB.saveAndConnectConfig(rawText);
      if (msgEl) {
        msgEl.style.display = 'block';
        if (res.ok) {
          msgEl.style.color = '#1b5e20';
          msgEl.textContent = `✓ تم الاتصال بمشروع Firebase (${res.config.projectId}) وتفعيل المزامنة اللحظية بنجاح!`;
          await window.AllamCloudDB.syncAllLocalStateToCloud({
            treeDelta,
            roleMap: buildRoleMapObject(),
            posts: contributions,
            currentUser
          });
          showToast(`☁️ متصل الآن بقاعدة بيانات Firestore (${res.config.projectId})!`);
        } else {
          msgEl.style.color = '#b71c1c';
          msgEl.textContent = res.error || 'تعذر الاتصال بمشروع Firebase المحدد.';
        }
      }
    });

    const handleDisconnectFirebase = () => {
      window.AllamCloudDB.disconnectAndClearConfig();
      const inputEl = $('#firebase-config-textarea') || $('#firebase-config-input');
      if (inputEl) inputEl.value = '';
      const msgEl = $('#firebase-config-feedback') || $('#firebase-config-msg');
      if (msgEl) {
        msgEl.style.display = 'block';
        msgEl.style.color = 'var(--text-secondary)';
        msgEl.textContent = 'تم قطع الاتصال السحابي والعودة لوضع المزامنة الهجينة المحلية.';
      }
      showToast('تم فصل إعدادات Firebase الخارجية.');
    };
    $('#btn-firebase-disconnect')?.addEventListener('click', handleDisconnectFirebase);
    $('#btn-disconnect-firebase')?.addEventListener('click', handleDisconnectFirebase);

    $('#btn-cloud-sync-now')?.addEventListener('click', async () => {
      const res = await window.AllamCloudDB.syncAllLocalStateToCloud({
        treeDelta,
        roleMap: buildRoleMapObject(),
        posts: contributions,
        currentUser
      });
      renderCloudAuditLog();
      if (res.ok) {
        showToast('☁️ تمت مزامنة الشجرة والصلاحيات والمنشورات مع Firebase Firestore بنجاح!');
      } else {
        showToast('🔄 تمت مزامنة التعديلات عبر قنوات المتصفح اللحظية وحفظها في السجل.');
      }
    });

    // Export Full Family Cloud Snapshot JSON
    $('#btn-export-cloud-snapshot')?.addEventListener('click', () => {
      const snapshot = {
        schema: 'ALLAM_CLOUD_SNAPSHOT_V1',
        exportedAt: new Date().toISOString(),
        treeDelta,
        roleMap: buildRoleMapObject(),
        contributions,
        auditLog: window.AllamCloudDB.getAuditLog()
      };
      const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `allam_family_cloud_snapshot_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast('📥 تم تصدير حزمة بيانات العائلة المشتركة (JSON) بنجاح!');
    });

    // Import Full Family Cloud Snapshot JSON
    $('#input-import-cloud-snapshot')?.addEventListener('change', async e => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (data.treeDelta) {
          treeDelta = {
            updatedMembers: data.treeDelta.updatedMembers || data.treeDelta.editedById || {},
            addedMembers: Array.isArray(data.treeDelta.addedMembers) ? data.treeDelta.addedMembers : []
          };
          applyTreeDeltaAndRefresh('استيراد حزمة بيانات سحابية مشتركة (JSON Snapshot)');
        }
        if (data.roleMap && typeof data.roleMap === 'object') {
          Object.keys(data.roleMap).forEach(mid => {
            userAccounts[mid] = { ...(userAccounts[mid] || { memberId: mid }), role: data.roleMap[mid] };
          });
          saveStored(STORAGE_KEYS.userAccounts, userAccounts);
          renderRolesDirectory();
        }
        if (Array.isArray(data.contributions) && data.contributions.length > 0) {
          contributions = data.contributions;
          saveStored(STORAGE_KEYS.contributions, contributions);
          renderContributions();
        }
        showToast('📤 تم استيراد وتطبيق حزمة بيانات العائلة المشتركة بنجاح!');
      } catch (_) {
        showToast('⚠️ تعذر قراءة ملف الحزمة. يرجى التأكد من صحة ملف JSON.');
      } finally {
        e.target.value = '';
      }
    });
  }

  // Search and filters
  $('#member-search')?.addEventListener('input', renderMembers);
  $('#member-branch-filter')?.addEventListener('change', renderMembers);
  $('#hierarchy-search-input')?.addEventListener('input', e => {
    const val = e.target.value.trim();
    renderBranchHierarchy(currentTreeBranch, currentSubFilter, val);
    if (val && window.AllamTreeEngine) {
      window.AllamTreeEngine.searchAndFocus(val);
    }
  });

  // Tree Generation Filter Pills
  $$('#tree-gen-pills .gen-pill-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      $$('#tree-gen-pills .gen-pill-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const genVal = chip.getAttribute('data-gen');
      if (window.AllamTreeEngine) {
        window.AllamTreeEngine.filterGeneration(genVal === 'all' ? 'all' : parseInt(genVal, 10));
      }
    });
  });

  // Prominent 3D Fast Member Search
  const tree3dSearch = $('#tree-3d-search-input');
  const tree3dClear = $('#tree-3d-search-clear');
  const tree3dCount = $('#tree-3d-search-count');
  const symbolicTreeCount = getTreeDisplayMembers().filter(m => m && m.id !== 'root').length;

  if (tree3dSearch) {
    tree3dSearch.addEventListener('input', e => {
      const val = e.target.value.trim();
      if (tree3dClear) tree3dClear.style.display = val ? 'inline-block' : 'none';

      if (window.AllamTreeEngine) {
        const found = window.AllamTreeEngine.searchAndFocus(val);
        if (tree3dCount) {
          if (!val) {
            tree3dCount.textContent = `${symbolicTreeCount} سجلات رمزية`;
          } else if (found && found.length > 0) {
            tree3dCount.textContent = `✓ تم التوجيه: ${found[0].name}`;
          } else {
            tree3dCount.textContent = 'لم يتم العثور';
          }
        }
      }
    });

    if (tree3dClear) {
      tree3dClear.addEventListener('click', () => {
        tree3dSearch.value = '';
        tree3dClear.style.display = 'none';
        if (tree3dCount) tree3dCount.textContent = `${symbolicTreeCount} سجلات رمزية`;
        if (window.AllamTreeEngine) {
          window.AllamTreeEngine.resetCamera();
        }
      });
    }
  }

  // =========================================================================
  // 10. حاسبة صلة القرابة والجد المشترك (LCA) + مصدّر GEDCOM 5.5.1 العالمي
  // =========================================================================
  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getMemberCleanFullLineage(member, byIdMap) {
    if (!member) return '';
    const map = byIdMap || new Map(activeMembersData.map(m => [m.id, m]));
    const names = [];
    const visited = new Set();
    let curr = member;
    let depth = 0;
    while (curr && depth < 6) {
      const clean = String(curr.name || '').replace(/^\*+/, '').trim();
      if (clean) names.push(clean);
      const pid = curr.parentId || curr.candidateParentId;
      if (!pid || pid === 'root' || visited.has(pid)) break;
      visited.add(pid);
      curr = map.get(pid);
      depth++;
    }
    return names.join(' بن ').replace(/بن\s+بن/g, 'بن');
  }

  function populateKinshipDatalist() {
    const dl = $('#kinship-members-datalist');
    if (!dl || !Array.isArray(activeMembersData)) return;
    const byId = new Map(activeMembersData.map(m => [m.id, m]));
    const nonRoot = activeMembersData.filter(m => m && m.id !== 'root');
    const optionsHtml = nonRoot
      .map(m => {
        const cleanName = String(m.name || '').replace(/^\*+/, '').trim();
        const fullLin = getMemberCleanFullLineage(m, byId);
        const branchLabel = m.branch || '';
        return `<option value="${escapeHtml(fullLin || cleanName)}" label="${escapeHtml(cleanName)} (${escapeHtml(branchLabel)} — الجيل ${m.gen || 1})"></option>`;
      })
      .join('');
    dl.innerHTML = optionsHtml;

    const inputA = $('#kinship-input-a');
    const inputB = $('#kinship-input-b');
    if (nonRoot.length >= 2) {
      const sampleA = nonRoot.find(m => (m.gen || 1) >= 3 && m.branch === 'الفرع 1') || nonRoot[Math.min(2, nonRoot.length - 1)];
      const sampleB = nonRoot.find(m => m.id !== sampleA.id && (m.gen || 1) >= 2 && m.branch === 'الفرع 3') || nonRoot.find(m => m.id !== sampleA.id && m.branch !== sampleA.branch) || nonRoot[0];
      if (inputA && (!inputA.value.trim() || !resolveMemberFromKinshipQuery(inputA.value, byId))) {
        inputA.value = getMemberCleanFullLineage(sampleA, byId);
      }
      if (inputB && (!inputB.value.trim() || !resolveMemberFromKinshipQuery(inputB.value, byId))) {
        inputB.value = getMemberCleanFullLineage(sampleB, byId);
      }
    }
  }

  function resolveMemberFromKinshipQuery(rawQuery, byIdMap) {
    if (!rawQuery || !Array.isArray(activeMembersData)) return null;
    const qTrim = String(rawQuery).trim();
    if (!qTrim) return null;

    // 1. Direct ID match
    if (byIdMap.has(qTrim)) return byIdMap.get(qTrim);

    const qNorm = normalizeArabicLineageText(qTrim);
    // 2. Match against full lineage string
    for (const m of activeMembersData) {
      if (!m || m.id === 'root') continue;
      const fullLinNorm = normalizeArabicLineageText(getMemberCleanFullLineage(m, byIdMap));
      if (fullLinNorm === qNorm) return m;
    }

    // 3. Use Smart Arabic Lineage Matcher
    const smartRes = matchOrLinkNameToTree(qTrim);
    if (smartRes && smartRes.member) return smartRes.member;
    if (smartRes && smartRes.parentMember && extractLineageTokens(qTrim).length === 1) {
      return smartRes.parentMember;
    }

    // 4. Fallback substring match on normalized name
    return activeMembersData.find(m => m && m.id !== 'root' && normalizeArabicLineageText(m.name).includes(qNorm)) || null;
  }

  function getAncestorChainToRoot(member, byIdMap) {
    const rootNode = {
      id: 'root',
      name: 'الجد الجامع جذور افتراضية للتوضيح (العائلة الافتراضية)',
      branch: 'الجذر الجامع للأسرة',
      gen: 0
    };
    if (!member) return [rootNode];
    const chain = [];
    const visited = new Set();
    let curr = member;
    let depth = 0;
    while (curr && depth < 10) {
      chain.push(curr);
      visited.add(curr.id);
      const pid = curr.parentId || curr.candidateParentId;
      let parentObj = (pid && pid !== 'root' && !visited.has(pid)) ? byIdMap.get(pid) : null;

      // Smart Patronymic & Branch Founder Fallback when parentId is not explicitly stored on decrypted record
      if (!parentObj && (curr.gen || 1) > 1 && Array.isArray(activeMembersData)) {
        const currTokens = extractLineageTokens(curr.name);
        const fatherToken = currTokens.length >= 2 ? currTokens[1] : '';
        const targetGen = (curr.gen || 2) - 1;
        if (fatherToken) {
          parentObj = activeMembersData.find(m =>
            m &&
            m.id !== 'root' &&
            !visited.has(m.id) &&
            m.branch === curr.branch &&
            (m.gen === targetGen || m.gen < curr.gen) &&
            !String(m.relation || '').includes('زوج') &&
            extractLineageTokens(m.name)[0] === fatherToken
          ) || null;
        }
        if (!parentObj && targetGen === 1) {
          parentObj = activeMembersData.find(m =>
            m &&
            m.id !== 'root' &&
            !visited.has(m.id) &&
            m.branch === curr.branch &&
            m.gen === 1 &&
            !String(m.relation || '').includes('زوج')
          ) || null;
        }
      }

      if (!parentObj || visited.has(parentObj.id)) break;
      curr = parentObj;
      depth++;
    }
    chain.push(rootNode);
    return chain;
  }

  function describeArabicKinship(memberA, memberB, lcaNode, dA, dB) {
    const cleanA = String(memberA.name || '').replace(/^\*+/, '').trim();
    const cleanB = String(memberB.name || '').replace(/^\*+/, '').trim();
    const cleanLca = String(lcaNode.name || '').replace(/^\*+/, '').trim();
    const isFemA = String(memberA.gender || '').includes('أنثى') || memberA.gender === 'F';
    const isFemB = String(memberB.gender || '').includes('أنثى') || memberB.gender === 'F';

    if (dA === 0 && dB === 0) {
      return {
        badge: 'نفس العضو في الشجرة',
        summary: `كلا المدخلين يشيران إلى نفس الفرد (${cleanA}) في شجرة العائلة الافتراضية.`
      };
    }
    if (dA === 1 && dB === 0) {
      return {
        badge: isFemA ? 'ابنة مباشرة (درجة أولى)' : 'ابن مباشر (درجة أولى)',
        summary: `(${cleanA}) ${isFemA ? 'هي ابنة مباشرة لـ' : 'هو ابن مباشر لـ'} (${cleanB}).`
      };
    }
    if (dA === 0 && dB === 1) {
      return {
        badge: isFemA ? 'الأم / الوالدة المباشرة' : 'الأب / الوالد المباشر',
        summary: `(${cleanA}) ${isFemA ? 'هي والدة' : 'هو والد'} (${cleanB}) مباشرة.`
      };
    }
    if (dA >= 2 && dB === 0) {
      return {
        badge: isFemA ? `حفيدة مباشرة (الدرجة ${dA})` : `حفيد مباشر (الدرجة ${dA})`,
        summary: `(${cleanA}) من أحفاد (${cleanB}) عبر ${dA} أجيال متصلة.`
      };
    }
    if (dA === 0 && dB >= 2) {
      return {
        badge: `الجد المباشر (${dB} أجيال)`,
        summary: `(${cleanA}) هو الجد الأعلى لـ (${cleanB}) بفارق ${dB} أجيال.`
      };
    }
    if (dA === 1 && dB === 1) {
      return {
        badge: 'إخوة أشقاء (درجة ثانية)',
        summary: `(${cleanA}) و(${cleanB}) إخوة يجتمعون مباشرة في والدهم (${cleanLca}).`
      };
    }
    if (dA === 1 && dB === 2) {
      return {
        badge: isFemA ? 'عمة شقيقة للوالد' : 'عم شقيق للوالد',
        summary: `(${cleanA}) ${isFemA ? 'هي عمة' : 'هو عم'} (${cleanB}) — يجتمعان في الجد (${cleanLca}).`
      };
    }
    if (dA === 2 && dB === 1) {
      return {
        badge: isFemA ? 'ابنة الأخ / الأخت' : 'ابن الأخ / الأخت',
        summary: `(${cleanB}) ${isFemB ? 'هي عمة' : 'هو عم'} (${cleanA}) — يجتمعان في الجد (${cleanLca}).`
      };
    }
    if (dA === 2 && dB === 2) {
      return {
        badge: 'أبناء عمومة من الدرجة الأولى (اللزم)',
        summary: `(${cleanA}) و(${cleanB}) أبناء عمومة مباشرة يجتمعان في الجد المشترك (${cleanLca}).`
      };
    }
    if ((dA === 2 && dB === 3) || (dA === 3 && dB === 2)) {
      return {
        badge: 'عمومة من الدرجة الثانية (ابن عم الوالد)',
        summary: `صلة عمومة بين جيلين متتاليين؛ يجتمع (${cleanA}) و(${cleanB}) في الجد الجامع (${cleanLca}).`
      };
    }
    if (dA === 3 && dB === 3) {
      return {
        badge: 'أبناء عمومة من الدرجة الثانية',
        summary: `(${cleanA}) و(${cleanB}) أبناء عمومة من الجيل الثالث للجد المشترك (${cleanLca}).`
      };
    }
    return {
      badge: `قرابة عصبة ونسب (الدرجة ${dA + dB})`,
      summary: `يجتمع (${cleanA}) و(${cleanB}) في الجد الجامع المشترك (${cleanLca}) بمسافة (${dA}) أجيال للأول و(${dB}) أجيال للثاني.`
    };
  }

  function computeKinshipAndLCA(rawA, rawB) {
    if (activeMembersData.some(isSymbolicRecord)) {
      return { ok: false, reason: 'UNVERIFIED_PREVIEW' };
    }
    const byId = new Map(activeMembersData.map(m => [m.id, m]));
    const memberA = resolveMemberFromKinshipQuery(rawA, byId);
    const memberB = resolveMemberFromKinshipQuery(rawB, byId);
    if (!memberA || !memberB) {
      return { ok: false, memberA, memberB };
    }

    const chainA = getAncestorChainToRoot(memberA, byId);
    const chainB = getAncestorChainToRoot(memberB, byId);
    const setB = new Map(chainB.map((node, idx) => [node.id, { node, idx }]));

    let lcaNode = chainA[chainA.length - 1];
    let dA = chainA.length - 1;
    let dB = chainB.length - 1;

    for (let i = 0; i < chainA.length; i++) {
      const hit = setB.get(chainA[i].id);
      if (hit) {
        lcaNode = chainA[i];
        dA = i;
        dB = hit.idx;
        break;
      }
    }

    const upPathA = chainA.slice(0, dA); // from memberA up to child of LCA
    const downPathB = chainB.slice(0, dB).reverse(); // from child of LCA down to memberB
    const fullPath = [...upPathA, lcaNode, ...downPathB];
    const desc = describeArabicKinship(memberA, memberB, lcaNode, dA, dB);

    return {
      ok: true,
      memberA,
      memberB,
      lcaNode,
      dA,
      dB,
      totalDegree: dA + dB,
      fullPath,
      badge: desc.badge,
      summary: desc.summary
    };
  }

  function renderKinshipCalculationResult(res) {
    const panel = $('#kinship-result-panel');
    if (!panel) return;
    if (!res || !res.ok) {
      panel.style.display = 'block';
      panel.innerHTML = `
        <div style="color:#fca5a5; font-size:0.85rem; font-weight:700;">
          ${res?.reason === 'UNVERIFIED_PREVIEW'
            ? 'أداة القرابة متوقفة لأن بيانات هذه النسخة رمزية وغير معتمدة.'
            : 'تعذر العثور على أحد الاسمين في سجل المعاينة.'}
        </div>
      `;
      return;
    }

    const cleanLca = String(res.lcaNode.name || '').replace(/^\*+/, '').trim();
    const pathNodesHtml = res.fullPath.map((node, idx) => {
      const isLca = node.id === res.lcaNode.id;
      const isEndpoint = idx === 0 || idx === res.fullPath.length - 1;
      const cleanName = String(node.name || '').replace(/^\*+/, '').trim();
      const bg = isLca
        ? 'linear-gradient(135deg, rgba(218,178,94,0.32), rgba(16,185,129,0.22))'
        : isEndpoint
          ? 'rgba(16,185,129,0.18)'
          : 'rgba(255,255,255,0.06)';
      const border = isLca
        ? '1.5px solid #ffd97d'
        : isEndpoint
          ? '1px solid rgba(52,211,153,0.55)'
          : '1px solid rgba(255,255,255,0.15)';
      return `
        <button type="button" class="kinship-path-node" data-focus-member-id="${escapeHtml(node.id)}"
          style="background:${bg}; border:${border}; color:#f8fafc; border-radius:8px; padding:5px 10px; font-size:0.78rem; font-weight:${isLca || isEndpoint ? '800' : '600'}; cursor:pointer; display:inline-flex; align-items:center; gap:5px;">
          ${isLca ? '👑 ' : isEndpoint ? '👤 ' : ''}${escapeHtml(cleanName)}
          <span style="font-size:0.68rem; color:#cbd5e1; opacity:0.85;">(${node.gen ? 'ج' + node.gen : 'الجذر'})</span>
        </button>
      `;
    }).join('<span style="color:#dab25e; font-weight:800; font-size:0.85rem; margin:0 3px;">⟵</span>');

    panel.style.display = 'block';
    panel.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:8px;">
        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
          <span style="background:rgba(16,185,129,0.2); border:1px solid rgba(52,211,153,0.55); color:#6ee7b7; padding:3px 10px; border-radius:99px; font-size:0.78rem; font-weight:800;">
            🧬 ${escapeHtml(res.badge)}
          </span>
          <span style="background:rgba(218,178,94,0.18); border:1px solid rgba(218,178,94,0.45); color:#fde68a; padding:3px 10px; border-radius:99px; font-size:0.76rem; font-weight:700;">
            👑 الجد المشترك (LCA): ${escapeHtml(cleanLca)}
          </span>
          <span style="color:#94a3b8; font-size:0.75rem;">
            (درجة القرابة الكلية: ${res.totalDegree} | الأول: ${escapeHtml(res.memberA.branch || '')} • الثاني: ${escapeHtml(res.memberB.branch || '')})
          </span>
        </div>
      </div>
      <p style="margin:0 0 10px 0; font-size:0.83rem; color:#e2e8f0; line-height:1.55;">
        ${escapeHtml(res.summary)}
      </p>
      <div style="display:flex; align-items:center; flex-wrap:wrap; gap:4px; padding-top:6px; border-top:1px dashed rgba(218,178,94,0.22);">
        <span style="font-size:0.74rem; color:#94a3b8; margin-left:6px;">سلسلة النسب الرابطة (اضغط على أي اسم للتركيز عليه في الشجرة):</span>
        ${pathNodesHtml}
      </div>
    `;

    panel.querySelectorAll('.kinship-path-node').forEach(btn => {
      btn.addEventListener('click', () => {
        const mid = btn.getAttribute('data-focus-member-id');
        if (!mid || mid === 'root') {
          if (window.AllamTreeEngine) window.AllamTreeEngine.resetCamera();
          return;
        }
        const target = activeMembersData.find(m => m.id === mid);
        if (target) {
          openSafeDrawer(target);
          if (window.AllamTreeEngine && typeof window.AllamTreeEngine.searchAndFocus === 'function') {
            window.AllamTreeEngine.searchAndFocus(String(target.name || '').replace(/^\*+/, '').trim());
          }
        }
      });
    });
  }

  function exportFamilyTreeGEDCOM() {
    if (activeMembersData.some(isSymbolicRecord)) {
      showToast('تصدير GEDCOM متوقف إلى أن تتوفر علاقات نسب موثقة ومعتمدة.');
      return;
    }
    if (!Array.isArray(activeMembersData) || activeMembersData.length === 0) {
      showToast('⚠️ لا توجد بيانات شجرة جاهزة للتصدير.');
      return;
    }

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const lines = [
      '0 HEAD',
      '1 SOUR ALLAM_FAMILY_PORTAL_V3',
      '2 NAME بوابة معاينة رمزية الرقمية',
      '2 VERS 3.34',
      `1 DATE ${dateStr}`,
      '1 GEDC',
      '2 VERS 5.5.1',
      '2 FORM LINEAGE-LINKED',
      '1 CHAR UTF-8',
      '1 LANG Arabic'
    ];

    const byId = new Map(activeMembersData.map(m => [m.id, m]));
    const childrenByParent = new Map();

    activeMembersData.forEach(m => {
      if (!m || m.id === 'root') return;
      const pid = m.parentId || m.candidateParentId || 'root';
      if (!childrenByParent.has(pid)) childrenByParent.set(pid, []);
      childrenByParent.get(pid).push(m);
    });

    // Root Ancestors INDI
    lines.push('0 @I_ROOT_AWAD@ INDI');
    lines.push('1 NAME شخص افتراضي /العائلة الافتراضية/');
    lines.push('2 GIVN شخص افتراضي');
    lines.push('2 SURN العائلة الافتراضية');
    lines.push('1 SEX M');
    lines.push('1 NOTE الجد الجامع لأسرة العائلة الافتراضية');
    lines.push('1 FAMS @F_ROOT@');

    lines.push('0 @I_ROOT_RAHMA@ INDI');
    lines.push('1 NAME شخص افتراضي /العائلة الافتراضية/');
    lines.push('2 GIVN شخص افتراضي');
    lines.push('2 SURN العائلة الافتراضية');
    lines.push('1 SEX F');
    lines.push('1 NOTE الجدة الجامعة لأسرة العائلة الافتراضية');
    lines.push('1 FAMS @F_ROOT@');

    // All 393+ Members INDI records
    activeMembersData.forEach(m => {
      if (!m || m.id === 'root') return;
      const safeId = String(m.id).replace(/[^A-Za-z0-9_]/g, '_');
      const cleanName = String(m.name || '').replace(/^\*+/, '').trim();
      const sex = (String(m.gender || '').includes('أنثى') || m.gender === 'F') ? 'F' : 'M';
      const pid = m.parentId || m.candidateParentId || 'root';
      const famcId = pid === 'root' ? 'F_ROOT' : 'F_' + String(pid).replace(/[^A-Za-z0-9_]/g, '_');

      lines.push(`0 @I_${safeId}@ INDI`);
      lines.push(`1 NAME شخص افتراضي /العائلة الافتراضية/`);
      lines.push(`2 GIVN ${cleanName}`);
      lines.push('2 SURN العائلة الافتراضية');
      lines.push(`1 SEX ${sex}`);
      lines.push(`1 FAMC @${famcId}@`);
      if (childrenByParent.has(m.id)) {
        lines.push(`1 FAMS @F_${safeId}@`);
      }
      if (m.branch || m.gen) {
        lines.push(`1 NOTE الفرع: ${m.branch || 'العائلة الافتراضية'} | الجيل: ${m.gen || 1}`);
      }
    });

    // Root Family Record
    lines.push('0 @F_ROOT@ FAM');
    lines.push('1 HUSB @I_ROOT_AWAD@');
    lines.push('1 WIFE @I_ROOT_RAHMA@');
    (childrenByParent.get('root') || []).forEach(child => {
      const cSafe = String(child.id).replace(/[^A-Za-z0-9_]/g, '_');
      lines.push(`1 CHIL @I_${cSafe}@`);
    });

    // Descendant Family Records
    childrenByParent.forEach((kids, pid) => {
      if (pid === 'root') return;
      const parentMember = byId.get(pid);
      if (!parentMember) return;
      const pSafe = String(pid).replace(/[^A-Za-z0-9_]/g, '_');
      const pSex = (String(parentMember.gender || '').includes('أنثى') || parentMember.gender === 'F') ? 'F' : 'M';
      lines.push(`0 @F_${pSafe}@ FAM`);
      lines.push(`1 ${pSex === 'F' ? 'WIFE' : 'HUSB'} @I_${pSafe}@`);
      kids.forEach(child => {
        const cSafe = String(child.id).replace(/[^A-Za-z0-9_]/g, '_');
        lines.push(`1 CHIL @I_${cSafe}@`);
      });
    });

    lines.push('0 TRLR');

    const gedContent = lines.join('\r\n');
    const blob = new Blob([gedContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `allam_family_tree_${activeMembersData.length}.ged`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast(`🧬 تم تصدير شجرة العائلة الافتراضية بصيغة GEDCOM 5.5.1 القياسية (${activeMembersData.length} فرداً) بنجاح!`);
  }

  function initKinshipAndGedcomTools() {
    populateKinshipDatalist();

    const inputA = $('#kinship-input-a');
    const inputB = $('#kinship-input-b');
    const btnCalc = $('#btn-calc-kinship');
    const btnUseMe = $('#btn-kinship-use-me');
    const btnGedcom = $('#btn-export-gedcom');

    // Pre-fill sensible defaults from two different branches so the user can test immediately with 1 click
    if (inputA && !inputA.value && activeMembersData.length > 20) {
      const sampleA = activeMembersData.find(m => m.gen >= 3 && m.branch === 'الفرع 1') || activeMembersData[10];
      const sampleB = activeMembersData.find(m => m.gen >= 2 && m.branch === 'الفرع 3') || activeMembersData[25];
      const byId = new Map(activeMembersData.map(m => [m.id, m]));
      if (sampleA) inputA.value = getMemberCleanFullLineage(sampleA, byId);
      if (sampleB && inputB) inputB.value = getMemberCleanFullLineage(sampleB, byId);
    }

    btnCalc?.addEventListener('click', () => {
      populateKinshipDatalist();
      const rawA = inputA?.value.trim() || '';
      const rawB = inputB?.value.trim() || '';
      if (!rawA || !rawB) {
        showToast('يرجى إدخال أو اختيار اسمي الطرف الأول والطرف الثاني لحساب صلة القرابة.');
        return;
      }
      const res = computeKinshipAndLCA(rawA, rawB);
      renderKinshipCalculationResult(res);
    });

    btnUseMe?.addEventListener('click', () => {
      populateKinshipDatalist();
      const byId = new Map(activeMembersData.map(m => [m.id, m]));
      if (currentUser && currentUser.memberId && byId.has(currentUser.memberId)) {
        const me = byId.get(currentUser.memberId);
        if (inputA) inputA.value = getMemberCleanFullLineage(me, byId);
        showToast(`👤 تم وضع اسمك (${String(me.name || '').replace(/^\*+/, '')}) كطرف أول في حاسبة القرابة.`);
      } else {
        const fallback = activeMembersData.find(m => m.gen >= 3 && m.branch === 'الفرع 1') || activeMembersData[8];
        if (fallback && inputA) {
          inputA.value = getMemberCleanFullLineage(fallback, byId);
          showToast('👤 تم اختيار عضو من الشجرة كطرف أول؛ يمكنك أيضاً تسجيل الدخول بحسابك.');
        }
      }
    });

    btnGedcom?.addEventListener('click', exportFamilyTreeGEDCOM);
  }

  // =========================================================================
  // 11. نظام تحفيز وتفعيل الشجرة بالتسجيل + الدخول والربط السريع عبر Google
  // =========================================================================
  function renderTreeRegistrationLeaderboard() {
    const leaderboardEl = $('#branch-registration-leaderboard');
    const badgeEl = $('#tree-reg-progress-badge');
    if (!leaderboardEl && !badgeEl) return;
    if (badgeEl) badgeEl.textContent = 'التسجيل وإحصاءات التفعيل غير متاحة في نسخة العرض';
    if (leaderboardEl) {
      leaderboardEl.textContent = 'لا توجد سجلات تسجيل موثقة من خادم؛ لذلك لا نعرض نسبًا أو ترتيبًا للفروع.';
      leaderboardEl.style.display = 'block';
    }
  }

  function initGoogleAuthAndTreeGamification() {
    renderTreeRegistrationLeaderboard();
    const card = $('#tree-registration-gamification-card');
    const title = card?.querySelector('h3');
    const description = card?.querySelector('p');
    if (title) title.textContent = 'التسجيل العائلي غير مفعّل في نسخة العرض';
    if (description) description.textContent = 'لا يوجد حاليًا تسجيل موثوق أو إحصاء فعلي لأفراد العائلة. بيانات الفروع الظاهرة رمزية، وستبقى أسماء السجل الكامل محجوبة.';
    const publishButton = $('#btn-open-contribution-modal');
    if (publishButton) {
      publishButton.disabled = true;
      publishButton.title = 'النشر غير متاح في نسخة المعاينة';
      publishButton.textContent = 'النشر غير متاح في المعاينة';
    }
    $$('#inline-post-form input, #inline-post-form select, #inline-post-form textarea, #inline-post-form button, #contribution-form input, #contribution-form select, #contribution-form textarea, #contribution-form button').forEach(control => {
      control.disabled = true;
    });
    $$('#profile-form input, #profile-form select, #profile-form textarea, #profile-form button[type="submit"]').forEach(control => {
      control.disabled = true;
    });
    const postBadge = $('#inline-post-author-badge');
    if (postBadge) postBadge.textContent = 'النشر والمزامنة غير مفعّلين';
    const mediaStatus = $('#inline-post-media-status');
    if (mediaStatus) mediaStatus.textContent = 'لن تُرفع الصور أو الفيديوهات في نسخة المعاينة.';
    [
      '#btn-tree-google-auth-cta', '#btn-copy-whatsapp-invite', '#tree-reg-mode-pills',
      '#google-auth-fast-card', '#smart-auth-form', '#tree-branch-detail-view',
      '#kinship-calculator-card', '#btn-export-gedcom', '#btn-tree-print',
      '#btn-print-tree', '#btn-login-as-drawer-member', '#btn-request-correction'
    ].forEach(selector => {
      const el = $(selector);
      if (el) {
        el.hidden = true;
        el.style.setProperty('display', 'none', 'important');
      }
    });
  }
  // Hash routing
  window.addEventListener('hashchange', () => {
    const hash = location.hash.slice(1);
    gotoPage(hash || 'home', false);
  });
  window.addEventListener('popstate', () => {
    const hash = location.hash.slice(1);
    gotoPage(hash || 'home', false);
  });

  // Initial Boot
  mergeTreeDeltaOntoActiveMembers();
  initHero3D();
  initMeetings();
  applyGoogleServices();
  initUserAccountPortal();
  initCloudSyncPortal();
  initKinshipAndGedcomTools();
  initGoogleAuthAndTreeGamification();
  renderMembers();
  renderRequests();
  renderContributions();

  const initialHash = location.hash.slice(1);
  if (initialHash && $('#page-' + initialHash)) {
    gotoPage(initialHash);
  }

  // Register Service Worker for offline PWA functionality
  if ('serviceWorker' in navigator && (window.location.protocol.startsWith('http') || window.location.protocol === 'https:')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').then(reg => {
        reg.update();
        console.log('[Allam Portal] PWA ServiceWorker active:', reg.scope);
      }).catch(err => {
        console.log('[Allam Portal] PWA ServiceWorker notice:', err.message);
      });
    });
  }
})();

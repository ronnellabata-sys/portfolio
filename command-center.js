(() => {
  'use strict';

  const boot = document.getElementById('os-boot');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  // Services live marquee runs continuously via GPU-accelerated CSS.
  // Enhance the existing records; source descriptions and evidence stay in the HTML.
  const archive = document.getElementById('projectsSliderWrapper');
  if (archive) {
    const toolbar = document.createElement('div');
    toolbar.className = 'archive-system-bar';
    toolbar.innerHTML = '<span>RL / DEVELOPMENT RECORDS</span><span>03 RECORDS · READ ONLY</span><span id="archive-sync" role="status">PROJECT DATA SYNCHRONIZED / 001</span>';
    archive.prepend(toolbar);
    const systems = ['INTERACTIVE LEARNING PLATFORM', 'LANGUAGE LEARNING PLATFORM', 'PRODUCTIVITY PLATFORM'];
    archive.querySelectorAll('.project-slide').forEach((slide, index) => {
      const id = String(index + 1).padStart(3, '0');
      const count = slide.querySelectorAll('.proof-thumb-item').length;
      const media = slide.querySelector('.slide-media-col');
      const header = document.createElement('div');
      header.className = 'archive-evidence-header';
      header.innerHTML = `<span>PROJECT EVIDENCE</span><strong>REC / ${id}</strong>`;
      media.prepend(header);
      const evidence = document.createElement('div');
      evidence.className = 'archive-evidence-footer';
      evidence.innerHTML = `<strong>✓ ${String(count).padStart(2, '0')} DOCUMENTED IMAGES</strong><span>PROOF ATTACHED / SOURCE-LINKED RECORD</span>`;
      media.append(evidence);
      slide.querySelector('.slide-number-circle').textContent = id;
      const metadata = document.createElement('dl');
      metadata.className = 'archive-metadata';
      metadata.innerHTML = `<div><dt>STATUS</dt><dd><i aria-hidden="true"></i> DOCUMENTED</dd></div><div><dt>CATEGORY</dt><dd>MOBILE APPLICATION</dd></div><div><dt>SYSTEM TYPE</dt><dd>${systems[index]}</dd></div>`;
      slide.querySelector('.slide-title').after(metadata);
      const database = document.createElement('p');
      database.className = 'archive-database-label';
      database.textContent = 'MOBILE SYSTEMS DATABASE / RECORD ' + id;
      slide.querySelector('.slide-case-badge').after(database);
      const labels = ['PROBLEM', 'SOLUTION', 'TECHNOLOGY', 'IMPACT'];
      slide.querySelectorAll('.fact-box > strong').forEach((label, position) => {
        label.textContent = labels[position];
        label.dataset.field = String(position + 1).padStart(2, '0');
      });
    });
    document.getElementById('modeCircleBtn').innerHTML = '<span aria-hidden="true">◎</span> Scan View';
    document.getElementById('modeCardBtn').innerHTML = '<span aria-hidden="true">▤</span> Evidence View';
  }
  let bootSeen = false;
  try { bootSeen = sessionStorage.getItem('ronnel-os-booted') === 'true'; } catch (_) { /* Storage is optional. */ }
  if (boot && !bootSeen && !reduceMotion.matches) {
    const previousFocus = document.activeElement;
    const surfaces = [...document.body.children].filter(element => element !== boot && !['SCRIPT', 'STYLE'].includes(element.tagName));
    const priorInert = surfaces.map(element => element.inert);
    const timers = [];
    let finished = false;
    const finishBoot = () => {
      if (finished) return;
      finished = true;
      timers.forEach(clearTimeout);
      boot.hidden = true;
      document.body.classList.remove('os-booting');
      surfaces.forEach((element, index) => { element.inert = priorInert[index]; });
      document.removeEventListener('keydown', onBootKey);
      reduceMotion.removeEventListener('change', onMotionChange);
      try { sessionStorage.setItem('ronnel-os-booted', 'true'); } catch (_) { /* Continue without storage. */ }
      if (previousFocus && previousFocus !== document.body) previousFocus.focus();
      else document.querySelector('.brand').focus({ preventScroll: true });
    };
    const onBootKey = event => {
      if (event.key === 'Escape') finishBoot();
      if (event.key === 'Tab') { event.preventDefault(); document.getElementById('boot-skip').focus(); }
    };
    const onMotionChange = event => { if (event.matches) finishBoot(); };
    boot.hidden = false;
    document.body.classList.add('os-booting');
    surfaces.forEach(element => { element.inert = true; });
    document.getElementById('boot-skip').focus({ preventScroll: true });
    document.getElementById('boot-skip').addEventListener('click', finishBoot, { once: true });
    document.addEventListener('keydown', onBootKey);
    reduceMotion.addEventListener('change', onMotionChange);
    const stages = [...boot.querySelectorAll('[data-boot-stage]')];
    const messages = ['System initialization complete.', 'Loading software, hardware, and intelligence modules.', 'Access granted. Welcome to RONNEL OS.'];
    stages.forEach((stage, index) => {
      timers.push(setTimeout(() => {
        stage.classList.add('is-ready');
        document.getElementById('boot-progress').style.width = `${(index + 1) / stages.length * 100}%`;
        document.getElementById('boot-status').textContent = messages[index];
      }, index * 650));
    });
    timers.push(setTimeout(finishBoot, 2100));
  }

  const modules = {
    web: {
      title: 'WEB SYSTEMS / Architecture to interface',
      copy: 'Connected front ends, maintainable back ends, and APIs designed around real workflows.',
      flow: 'INTERFACE → API → DATABASE'
    },
    embedded: {
      title: 'EMBEDDED SYSTEMS / Physical to digital',
      copy: 'Arduino, ESP32, and IoT sensors connect physical observations to monitoring systems. Hardware telemetry is a design focus; no live device is connected to this portfolio.',
      flow: 'SENSOR → ESP32 → TELEMETRY → DASHBOARD'
    },
    ai: {
      title: 'AI & RESEARCH / Observation to insight',
      copy: 'Exploring machine learning and computer vision for AI-assisted image analysis, including the AgriSentry agricultural monitoring concept.',
      flow: 'IMAGE → ANALYSIS → HUMAN REVIEW'
    },
    digital: {
      title: 'DIGITAL SOLUTIONS / Process to system',
      copy: 'Business systems and automation bring structured data, repeatable workflows, and useful reporting into everyday operations.',
      flow: 'WORKFLOW → AUTOMATION → REPORTING'
    }
  };

  const moduleButtons = [...document.querySelectorAll('[data-module]')];
  moduleButtons.forEach(button => {
    button.addEventListener('click', () => {
      const selected = modules[button.dataset.module];
      if (!selected) return;
      moduleButtons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      document.getElementById('module-detail-title').textContent = selected.title;
      document.getElementById('module-detail-copy').textContent = selected.copy;
      document.getElementById('module-detail-flow').textContent = selected.flow;
    });
  });

  const branches = {
    software: 'SOFTWARE / Interfaces and application logic connect people to the system.',
    hardware: 'HARDWARE / Arduino, ESP32, and sensors connect the physical environment to digital workflows.',
    systems: 'SYSTEMS / Databases, APIs, and automation connect information across applications and devices.',
    ai: 'AI / Computer vision and machine learning connect observations to patterns, with human review guiding decisions.'
  };
  const nodes = [...document.querySelectorAll('[data-network]')];
  nodes.forEach(node => {
    node.addEventListener('click', () => {
      const description = branches[node.dataset.network];
      if (!description) return;
      nodes.forEach(item => item.setAttribute('aria-pressed', String(item === node)));
      document.getElementById('network-readout').textContent = description;
    });
  });

  const terminal = document.getElementById('comms-terminal');
  // Track only addressable navigation modules; auxiliary sections retain their parent module.
  const navLinks = [...document.querySelectorAll('.nav-links a[href^="#"]')];
  const navSections = navLinks.map(link => document.querySelector(link.getAttribute('href')));
  let navFrame = 0;
  const updateNavigation = () => {
    navFrame = 0;
    const offset = document.querySelector('header').getBoundingClientRect().height + 32;
    let active = 0;
    navSections.forEach((section, index) => {
      if (section && section.getBoundingClientRect().top <= offset) active = index;
    });
    if (scrollY + innerHeight >= document.documentElement.scrollHeight - 4) active = navLinks.length - 1;
    navLinks.forEach((link, index) => {
      link.classList.toggle('active', index === active);
      if (index === active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  };
  const scheduleNavigation = () => {
    if (!navFrame) navFrame = requestAnimationFrame(updateNavigation);
  };
  window.addEventListener('scroll', scheduleNavigation, { passive: true });
  window.addEventListener('resize', scheduleNavigation);
  window.addEventListener('pageshow', scheduleNavigation);
  updateNavigation();

  // Stop decorative work outside the viewport and when the tab is hidden.
  if ('IntersectionObserver' in window) {
    const ambientObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => entry.target.classList.toggle('ambient-idle', !entry.isIntersecting));
    }, { rootMargin: '100px' });
    document.querySelectorAll('.comms-terminal,.lab-environment,.technology-network,#services,#stack-showcase').forEach(element => ambientObserver.observe(element));
  }
  const syncVisibility = () => document.body.classList.toggle('os-background', document.hidden);
  document.addEventListener('visibilitychange', syncVisibility);
  syncVisibility();
  const activate = document.getElementById('comms-activate');
  const channels = document.getElementById('comms-channels');
  let channelTimers = [];
  const clearChannelTimers = () => { channelTimers.forEach(clearTimeout); channelTimers = []; };
  const openChannels = () => {
    clearChannelTimers();
    terminal.dataset.state = 'active';
    channels.inert = false;
    activate.setAttribute('aria-expanded', 'true');
    activate.querySelector('strong').textContent = 'LOCK CHANNEL';
    activate.querySelector('small').textContent = 'TERMINAL ACTIVE';
  };
  const lockChannels = () => {
    clearChannelTimers();
    activate.focus({ preventScroll: true });
    terminal.dataset.state = 'locked';
    channels.inert = true;
    activate.setAttribute('aria-expanded', 'false');
    activate.querySelector('strong').textContent = 'OPEN CHANNEL';
    activate.querySelector('small').textContent = 'TERMINAL LOCKED';
  };
  activate.addEventListener('click', () => {
    if (terminal.dataset.state === 'active') { lockChannels(); return; }
    if (terminal.dataset.state === 'activating') return;
    terminal.dataset.state = 'activating';
    activate.querySelector('strong').textContent = 'INITIALIZING';
    activate.querySelector('small').textContent = 'DISCOVERING CHANNELS';
    if (reduceMotion.matches) { openChannels(); return; }
    channelTimers.push(setTimeout(openChannels, 1100));
  });
  terminal.addEventListener('keydown', event => {
    if (event.key === 'Escape' && terminal.dataset.state !== 'locked') { event.preventDefault(); lockChannels(); }
  });
  const resumeTrigger = document.getElementById('resume-trigger');
    const resumeModal = document.getElementById('resume-modal');
    const resumeClose = document.getElementById('resume-close');
    let resumeReturnFocus = null;
    const closeResume = () => {
      resumeModal.hidden = true;
      document.body.classList.remove('modal-open');
      if (resumeReturnFocus) resumeReturnFocus.focus({ preventScroll: true });
    };
    resumeTrigger.addEventListener('click', () => {
      resumeReturnFocus = document.activeElement;
      resumeModal.hidden = false;
      document.body.classList.add('modal-open');
      resumeClose.focus();
    });
    resumeClose.addEventListener('click', closeResume);
    resumeModal.addEventListener('click', event => {
      if (event.target === resumeModal) closeResume();
    });
    resumeModal.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); closeResume(); }
    });
  reduceMotion.addEventListener('change', event => {
    if (event.matches && terminal.dataset.state === 'activating') openChannels();
  });

  const motionToggle = document.getElementById('motion-toggle');
  motionToggle.addEventListener('click', () => {
    const paused = document.body.classList.toggle('ambient-paused');
    motionToggle.setAttribute('aria-pressed', String(paused));
    motionToggle.textContent = paused ? 'Resume ambient motion' : 'Pause ambient motion';
  });
})();

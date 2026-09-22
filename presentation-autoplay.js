(() => {
  'use strict';
  // Shared timing only: each section owns its content and transition.
  window.createPresentationAutoplay = (root, controls, advance) => {
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const section = root.closest('section');
    let timer;
    let hovering = false;
    let visible = false;
    let paused = false;
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'presentation-pause';
    const update = () => {
      toggle.textContent = paused ? 'Resume' : 'Pause';
      toggle.setAttribute('aria-label', paused ? 'Resume automatic presentation' : 'Pause automatic presentation');
      toggle.setAttribute('aria-pressed', String(paused));
      toggle.hidden = motion.matches;
    };
    const schedule = () => {
      clearTimeout(timer);
      if (paused || hovering || !visible || document.hidden || motion.matches) return;
      timer = setTimeout(() => {
        // Never hide a technology control while it owns keyboard focus.
        if (!root.querySelector('.stack-slide:focus-within')) advance();
        schedule();
      }, 7000);
    };
    toggle.addEventListener('click', () => { paused = !paused; update(); schedule(); });
    controls.append(toggle);
    section.addEventListener('pointerenter', event => {
      if (event.pointerType === 'touch') return;
      hovering = true;
      schedule();
    });
    section.addEventListener('pointerleave', () => { hovering = false; schedule(); });
    ['pointerdown', 'click', 'keydown', 'focusin', 'focusout'].forEach(type => section.addEventListener(type, schedule));
    document.addEventListener('visibilitychange', schedule);
    motion.addEventListener('change', () => { update(); schedule(); });
    new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      schedule();
    }, { threshold: 0 }).observe(root);
    update();
  };
})();
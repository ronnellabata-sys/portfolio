(() => {
  'use strict';
  const root = document.getElementById('stack-showcase');
  if (!root) return;
  // Each technology has a local SVG and its own concise presentation copy.
  const categories = [
    ['FRONTEND DEVELOPMENT', 'Frontend', [
      ['React', 'react', 'Building modern interactive interfaces using the React ecosystem.'],
      ['TypeScript', 'typescript', 'Adding typed contracts and clarity to application code.'],
      ['Vite', 'vite', 'Supporting a focused frontend development and build workflow.'],
      ['JavaScript', 'javascript', 'Connecting interface interactions, browser logic, and application data.'],
      ['Tailwind CSS', 'tailwindcss', 'Creating consistent responsive interfaces with utility-based styling.'],
      ['Framer Motion', 'framer', 'Giving interface changes purposeful movement and visual continuity.'],
      ['GSAP', 'gsap', 'Coordinating precise animation sequences and interactive motion.'],
      ['Three.js', 'threedotjs', 'Bringing interactive 3D scenes into web experiences.'],
      ['React Three Fiber', 'react', 'Composing interactive Three.js experiences through React.'],
      ['WebGL / GLSL', 'webgl', 'Exploring real-time graphics, shaders, and visual rendering.']
    ]],
    ['BACKEND DEVELOPMENT', 'Backend', [
      ['PHP', 'php', 'Building server-side application logic and data-driven systems.'],
      ['Laravel', 'laravel', 'Structuring web applications around maintainable backend architecture.'],
      ['CodeIgniter', 'codeigniter', 'Developing focused PHP applications with clear application structure.'],
      ['REST API', 'api', 'Connecting clients and services through clear resource-based interfaces.'],
      ['MySQL', 'mysql', 'Organizing relational application data and queries.'],
      ['Database Design', 'database', 'Modeling relationships, constraints, and dependable data structures.']
    ]],
    ['MOBILE DEVELOPMENT', 'Mobile', [
      ['Flutter', 'flutter', 'Creating cohesive mobile interfaces from a shared application codebase.'],
      ['Dart', 'dart', 'Implementing application state, asynchronous logic, and mobile interactions.'],
      ['Android Development', 'android', 'Building mobile experiences for Android devices.']
    ]],
    ['EMBEDDED SYSTEMS & IOT', 'IoT', [
      ['Arduino', 'arduino', 'Prototyping hardware interactions and sensor-driven systems.'],
      ['ESP32', 'espressif', 'Connecting embedded devices, sensor data, and networked applications.'],
      ['Sensors', 'sensors', 'Turning physical measurements into useful digital inputs.'],
      ['Electronics', 'electronics', 'Connecting circuits, components, and practical hardware prototypes.'],
      ['Embedded C/C++', 'cplusplus', 'Writing firmware that connects application logic to hardware behavior.']
    ]],
    ['AI & COMPUTER VISION', 'AI & Vision', [
      ['Machine Learning', 'learning', 'Exploring data-driven models that identify patterns and support decisions.'],
      ['Computer Vision', 'vision', 'Turning visual observations into structured information.'],
      ['Image Processing', 'image', 'Preparing, transforming, and analyzing digital images.'],
      ['Python AI Libraries', 'python', 'Supporting experimentation, model workflows, and image analysis in Python.']
    ]],
    ['DEVELOPMENT TOOLS', 'Dev Tools', [
      ['Git', 'git', 'Tracking changes and organizing a dependable development history.'],
      ['GitHub', 'github', 'Organizing source repositories and collaborative development workflows.'],
      ['VS Code', 'vscode', 'Editing, navigating, and debugging application code.'],
      ['Docker', 'docker', 'Packaging application environments for repeatable development workflows.'],
      ['Linux/Kali', 'linux', 'Working with command-line tools and Linux development environments.'],
      ['Figma', 'figma', 'Exploring interface layouts, visual systems, and interactive prototypes.']
    ]]
  ];
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const nav = root.querySelector('.stack-categories');
  const stage = root.querySelector('.stack-stage');
  const count = root.querySelector('.stack-count');
  let active = 0;
  let animation;
  const image = (slug, size) => {
    const img = document.createElement('img');
    img.src = `images/stack/${slug}.svg`;
    img.alt = '';
    img.width = img.height = size;
    return img;
  };
  const slides = categories.map(([title, label, tools], index) => {
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.textContent = label;
    tab.dataset.stackCategory = index;
    tab.setAttribute('aria-controls', 'stack-slide-' + index);
    tab.addEventListener('click', () => selectCategory(index, index > active ? 1 : -1));
    nav.append(tab);
    const slide = document.createElement('article');
    slide.className = 'stack-slide';
    slide.id = 'stack-slide-' + index;
    slide.setAttribute('role', 'group');
    slide.setAttribute('aria-roledescription', 'slide');
    slide.setAttribute('aria-label', `${index + 1} of ${categories.length}: ${title}`);
    const heading = document.createElement('h3');
    heading.className = 'stack-category-title';
    heading.textContent = String(index + 1).padStart(2, '0') + ' / ' + title;
    const feature = document.createElement('div');
    feature.className = 'stack-feature';
    feature.setAttribute('aria-live', 'polite');
    feature.setAttribute('aria-atomic', 'true');
    const emblem = document.createElement('div');
    emblem.className = 'stack-emblem';
    const copy = document.createElement('div');
    const name = document.createElement('h4');
    const description = document.createElement('p');
    copy.append(name, description);
    feature.append(emblem, copy);
    const list = document.createElement('div');
    list.className = 'stack-technologies';
    list.setAttribute('role', 'group');
    list.setAttribute('aria-label', 'Inspect a technology');
    const selectTool = (toolIndex, animate = true) => {
      const [toolName, slug, text] = tools[toolIndex];
      emblem.replaceChildren(image(slug, 80));
      name.textContent = toolName;
      description.textContent = text;
      [...list.children].forEach((button, i) => button.setAttribute('aria-pressed', String(i === toolIndex)));
      if (animate && !motion.matches) emblem.animate([{ opacity: .4, transform: 'scale(.92) rotate(-5deg)' }, { opacity: 1, transform: 'scale(1) rotate(0)' }], { duration: 300, easing: 'ease-out' });
    };
    tools.forEach(([toolName, slug], toolIndex) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.stackTool = toolIndex;
      button.append(image(slug, 18), document.createTextNode(toolName));
      button.addEventListener('click', () => selectTool(toolIndex));
      list.append(button);
    });
    selectTool(0, false);
    slide.append(heading, feature, list);
    stage.append(slide);
    return slide;
  });
  const buttons = [...nav.children];
  function selectCategory(index, direction = 1, animate = true) {
    animation?.cancel();
    const outgoing = slides[active];
    root.getAnimations({ subtree: true }).forEach(item => item.cancel());
    active = (index + categories.length) % categories.length;
    slides.forEach((slide, i) => { slide.hidden = i !== active; slide.inert = i !== active; });
    buttons.forEach((button, i) => button.setAttribute('aria-pressed', String(i === active)));
    count.textContent = String(active + 1).padStart(2, '0') + ' / 06';
    if (animate && !motion.matches && outgoing !== slides[active]) {
      outgoing.hidden = false;
      const exit = outgoing.animate([
        { opacity: 1, transform: 'translateX(0)' },
        { opacity: 0, transform: `translateX(${-direction * 24}px)` }
      ], { duration: 1200, easing: 'ease-in-out' });
      exit.onfinish = () => { outgoing.hidden = true; };
    }
    if (animate && !motion.matches) animation = slides[active].animate([
      { opacity: 0, transform: `translateX(${direction * 24}px)` },
      { opacity: 1, transform: 'translateX(0)' }
    ], { duration: 1200, easing: 'ease-in-out' });
  }
  root.querySelector('[data-stack-prev]').parentElement.remove();
  count.setAttribute('aria-live', 'off');
  window.createPresentationAutoplay(root, root.querySelector('.stack-navigation'), () => selectCategory(active + 1));
  root.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? 6 : active + (event.key === 'ArrowRight' ? 1 : -1);
    selectCategory(next, event.key === 'ArrowLeft' ? -1 : 1);
    if (nav.contains(event.target) || stage.contains(event.target)) buttons[active].focus();
  });
  // Measure all categories at the current width so switching never shifts the page.
  let measuredWidth = 0;
  const measure = () => {
    slides.forEach(slide => { slide.hidden = false; });
    stage.style.minHeight = Math.ceil(Math.max(...slides.map(slide => slide.offsetHeight))) + 'px';
    slides.forEach((slide, i) => { slide.hidden = i !== active; });
  };
  new ResizeObserver(entries => {
    const width = entries[0].contentRect.width;
    if (width !== measuredWidth) { measuredWidth = width; measure(); }
  }).observe(stage);
  document.fonts.ready.then(measure);
  motion.addEventListener('change', () => {
    if (!motion.matches) return;
    root.getAnimations({ subtree: true }).forEach(item => item.cancel());
    slides.forEach((slide, i) => { slide.hidden = i !== active; });
  });
  root.querySelector('.stack-navigation').hidden = false;
  selectCategory(0, 1, false);
})();
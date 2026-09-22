// Asset preparation only; no runtime dependency or CDN requests.
const fs = require('node:fs');
const path = require('node:path');
const dest = path.join(__dirname, 'images', 'stack');
fs.mkdirSync(dest, { recursive: true });
const colors = {react:'61DAFB',typescript:'3178C6',vite:'646CFF',javascript:'F7DF1E',tailwindcss:'06B6D4',framer:'FFFFFF',gsap:'88CE02',threedotjs:'FFFFFF',webgl:'FFFFFF',php:'777BB4',laravel:'FF2D20',codeigniter:'EF4223',mysql:'FFFFFF',python:'3776AB',cplusplus:'659AD2',c:'A8B9CC',flutter:'02569B',dart:'0175C2',android:'3DDC84',arduino:'00979D',espressif:'E7352C',git:'F05032',github:'FFFFFF',vscode:'23A9F2',docker:'2496ED',linux:'FFFFFF',figma:'F24E1E'};
const concepts = {
  api:'<path d="m8 6-6 6 6 6m8-12 6 6-6 6m-3-14-2 16"/>',
  database:'<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 4 16 4 16 0V5M4 12c0 4 16 4 16 0"/>',
  sensors:'<circle cx="12" cy="12" r="2"/><path d="M7 7a7 7 0 0 0 0 10M17 7a7 7 0 0 1 0 10M4 4a11 11 0 0 0 0 16M20 4a11 11 0 0 1 0 16"/>',
  electronics:'<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4m6-4v4M9 18v4m6-4v4M2 9h4m-4 6h4m12-6h4m-4 6h4"/>',
  learning:'<circle cx="5" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="5" r="2"/><circle cx="19" cy="19" r="2"/><circle cx="12" cy="12" r="3"/><path d="m7 7 3 3m4 4 3 3M7 17l3-3m4-4 3-3"/>',
  vision:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  image:'<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8" cy="8" r="2"/><path d="m3 18 6-6 4 4 3-3 5 5"/>'
};
(async () => {
  const sources = [];
  await Promise.all(Object.entries(colors).map(async ([slug, color]) => {
    const name = slug === 'vscode' ? 'visualstudiocode' : slug === 'gsap' ? 'greensock' : slug;
    const version = slug === 'vscode' ? '11.15.0' : '12.4.0';
    const url = `https://cdn.jsdelivr.net/npm/simple-icons@${version}/icons/${name}.svg`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${slug}: ${response.status}`);
    const svg = await response.text();
    if (!svg.includes('<svg')) throw new Error('Invalid SVG: ' + slug);
    fs.writeFileSync(path.join(dest, slug + '.svg'), svg.replace('<svg ', `<svg fill="#${color}" `));
    sources.push(`${slug}.svg: ${url}`);
  }));
  Object.entries(concepts).forEach(([name, markup]) => fs.writeFileSync(path.join(dest, name + '.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#91d6e5" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${markup}</svg>`));
  const response = await fetch('https://cdn.jsdelivr.net/npm/simple-icons@12.4.0/LICENSE.md');
  if (!response.ok) throw new Error('Unable to retrieve asset license');
  fs.writeFileSync(path.join(dest, 'LICENSE.md'), await response.text());
  fs.writeFileSync(path.join(dest, 'SOURCES.txt'), 'Brand SVGs: Simple Icons, pinned versions below. Brand trademarks and usage rules remain with their respective owners.\nReact Three Fiber uses the React ecosystem mark; Embedded C/C++ uses C++; Python AI Libraries uses Python; ESP32 uses Espressif. Generic concepts use original line illustrations (not brand logos).\n\n' + sources.sort().join('\n'));
  console.log('Saved and validated 34 local SVG icons and source/license documentation.');
})().catch(error => { console.error(error); process.exitCode = 1; });
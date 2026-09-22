// Browser regression checks using Node's built-in WebSocket and local Chrome CDP.
// Start a static server on 8765 and an isolated Chrome debugging session on 9223.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

(async () => {
  const tabs = await (await fetch('http://127.0.0.1:9223/json')).json();
  const tab = tabs.find(item => item.type === 'page');
  assert.ok(tab, 'Chrome page is available');
  const socket = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }));
  let id = 0;
  const pending = new Map();
  const errors = [];
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject, timeout } = pending.get(message.id);
      clearTimeout(timeout);
      pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result);
    }
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const request = ++id;
    const timeout = setTimeout(() => { pending.delete(request); reject(new Error('CDP timeout: ' + method)); }, 15000);
    pending.set(request, { resolve, reject, timeout });
    socket.send(JSON.stringify({ id: request, method, params }));
  });
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    assert.ok(!result.exceptionDetails, JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
  try {
    await send('Runtime.enable');
    await send('Page.enable');
    await send('Emulation.setFocusEmulationEnabled', { enabled: true });
    await send('Network.enable');
    await send('Network.setCacheDisabled', { cacheDisabled: true });
    await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
    await send('Page.navigate', { url: 'http://127.0.0.1:8765/' });
    await wait(1500);
    await evaluate('sessionStorage.removeItem("ronnel-os-booted")');
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
    await send('Page.reload');
    await wait(450);
    assert.equal(await evaluate('document.getElementById("os-boot").hidden'), false);
    assert.equal(await evaluate('document.querySelector("main").inert'), true);
    await evaluate('document.getElementById("boot-skip").click()');
    assert.equal(await evaluate('document.getElementById("os-boot").hidden'), true);
    assert.equal(await evaluate('document.querySelector("main").inert'), false);
    await send('Page.reload');
    await wait(500);
    assert.equal(await evaluate('document.getElementById("os-boot").hidden'), true, 'Boot runs once per session');
    await evaluate('sessionStorage.removeItem("ronnel-os-booted")');
    await send('Page.reload');
    await wait(2600);
    for (let attempt = 0; attempt < 20 && !(await evaluate('document.getElementById("os-boot").hidden')); attempt++) await wait(250);
    assert.equal(await evaluate('document.getElementById("os-boot").hidden'), true, 'Boot completes automatically');
    assert.equal(await evaluate('document.querySelectorAll("[data-boot-stage].is-ready").length'), 3);
    assert.equal(await evaluate('document.querySelectorAll(".fact-box").length'), 12);
    assert.equal(await evaluate('document.querySelectorAll(".slide-grid-layout > .slide-content-col").length'), 3, 'Information is a sibling of evidence, not nested inside it');
    assert.equal(await evaluate('document.querySelectorAll(".proof-thumb-item").length'), 15, 'All original evidence retained');
    assert.equal(await evaluate('document.querySelectorAll(".archive-metadata").length'), 3);
    assert.equal(await evaluate('document.querySelectorAll(".project-slide[inert]").length'), 2);
    await evaluate('document.getElementById("sliderNextBtn").click()');
    assert.equal(await evaluate('document.getElementById("archive-sync").textContent'), 'LOADING PROJECT ARCHIVE…');
    await wait(650);
    assert.equal(await evaluate('document.getElementById("archive-sync").textContent'), 'PROJECT DATA SYNCHRONIZED / 002');
    await evaluate('document.getElementById("sliderPrevBtn").click()');
    await wait(650);
    assert.equal(await evaluate('document.title'), 'RONNEL OS | Engineering Command Center');
    assert.equal(await evaluate('document.readyState'), 'complete');
    // Services-only presentation regression checks.
    assert.equal(await evaluate('document.querySelectorAll("#services .services-slide").length'), 3);
    for (const expected of [1, 2, 0]) {
      await evaluate('document.querySelector("[data-service-next]").click()');
      await wait(500);
      assert.equal(await evaluate('Number(document.querySelector("[data-service][aria-current]").dataset.service)'), expected);
      assert.equal(await evaluate('document.querySelectorAll("#services .services-slide:not([hidden])").length'), 1);
    }
    await evaluate('document.querySelector("[data-service-prev]").click()');
    await wait(500);
    assert.equal(await evaluate('Number(document.querySelector("[data-service][aria-current]").dataset.service)'), 2);
    await evaluate(`document.querySelector('[data-service="0"]').click()`);
    await wait(500);
    await evaluate('document.querySelector("[data-service-next]").focus()');
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowRight', code: 'ArrowRight' });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowRight', code: 'ArrowRight' });
    await wait(500);
    assert.equal(await evaluate('Number(document.querySelector("[data-service][aria-current]").dataset.service)'), 1);
    await evaluate('for(let i=0;i<8;i++) document.querySelector("[data-service-next]").click()');
    await wait(500);
    assert.equal(await evaluate('document.querySelectorAll("#services .services-slide:not([hidden])").length'), 1);
    for (const width of [320, 390, 768, 1024, 1440]) {
      await send('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width < 600 });
      await wait(200);
      const heights = [];
      for (let index = 0; index < 3; index++) {
        await evaluate(`document.querySelector('[data-service="${index}"]').click()`);
        await wait(500);
        heights.push(await evaluate('document.getElementById("services").getBoundingClientRect().height'));
        assert.ok(await evaluate('document.querySelector("#services .services-stage").scrollWidth <= document.querySelector("#services .services-stage").clientWidth + 1'));
      }
      assert.ok(Math.max(...heights) - Math.min(...heights) < 2, 'Service height stays stable');
      assert.ok(Math.max(...heights) < 550, 'Services stays compact');
    }
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    await evaluate('document.querySelector("[data-service-next]").click()');
    assert.equal(await evaluate('document.querySelectorAll("#services .services-slide:not([hidden])").length'), 1);
    assert.equal(await evaluate('document.querySelector("#services").getAnimations({subtree:true}).length'), 0);
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
    await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
    console.log('PASS: Services navigation, wraparound, dots, keyboard, rapid clicks, reduced motion, and compact stable layout at five widths.');
    assert.equal(await evaluate('document.querySelectorAll("[data-module]").length'), 4);
    for (const key of ['embedded', 'ai', 'digital', 'web']) {
      await evaluate(`document.querySelector('[data-module="${key}"]').click()`);
      assert.equal(await evaluate(`document.querySelector('[data-module="${key}"]').getAttribute('aria-pressed')`), 'true');
      assert.equal(await evaluate(`document.querySelectorAll('[data-module][aria-pressed="true"]').length`), 1);
    }
    assert.equal(await evaluate('document.querySelectorAll("[data-stack-category]").length'), 7);
    assert.equal(await evaluate('document.querySelectorAll("[data-stack-tool]").length'), 39);
    for (let category = 0; category < 7; category++) {
      await evaluate(`document.querySelector('[data-stack-category="${category}"]').click()`);
      await wait(450);
      assert.equal(await evaluate('document.querySelectorAll(".stack-slide:not([hidden])").length'), 1);
      const tools = await evaluate('document.querySelector(".stack-slide:not([hidden])").querySelectorAll("[data-stack-tool]").length');
      for (let tool = 0; tool < tools; tool++) {
        await evaluate(`document.querySelector('.stack-slide:not([hidden]) [data-stack-tool="${tool}"]').click()`);
        assert.equal(await evaluate('document.querySelectorAll(".stack-slide:not([hidden]) [aria-pressed=true]").length'), 1);
        assert.ok(await evaluate('document.querySelector(".stack-slide:not([hidden]) h4").textContent.length > 0'));
      }
    }
    await evaluate('document.querySelector("[data-stack-next]").click()');
    assert.equal(await evaluate('document.querySelector(".stack-count").textContent'), '01 / 07');
    await evaluate('document.querySelector("[data-stack-prev]").click()');
    assert.equal(await evaluate('document.querySelector(".stack-count").textContent'), '07 / 07');
    await evaluate('document.querySelector("[data-stack-prev]").focus()');
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Home', code: 'Home' });
    assert.equal(await evaluate('document.querySelector(".stack-count").textContent'), '01 / 07');
    for (const width of [320, 390, 768, 1024, 1440]) {
      await send('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width < 600 });
      await wait(200);
      const heights = [];
      for (let category = 0; category < 7; category++) {
        await evaluate(`document.querySelector('[data-stack-category="${category}"]').click()`);
        await wait(420);
        heights.push(await evaluate('document.querySelector("#stack-showcase").offsetHeight'));
        assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth + 1'));
      }
      assert.ok(Math.max(...heights) - Math.min(...heights) < 2, 'Stack height stays stable');
      if ([390, 1440].includes(width)) {
        await evaluate('document.querySelector("#capabilities").scrollIntoView({behavior:"instant"})');
        await wait(200);
        const shot = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(process.env.TEMP, `ronnel-stack-${width}.png`), Buffer.from(shot.data, 'base64'));
      }
    }
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    await evaluate('document.querySelector("[data-stack-next]").click()');
    assert.equal(await evaluate('document.querySelector("#stack-showcase").getAnimations({subtree:true}).length'), 0);
    assert.ok(await evaluate('[...document.querySelectorAll("#stack-showcase img")].every(img => img.complete && img.naturalWidth > 0)'));
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
    console.log('PASS: Seven technology categories, all 39 technology selections, SVG assets, wraparound, keyboard, reduced motion, and five responsive widths.');
    await evaluate('document.getElementById("motion-toggle").click()');
    assert.equal(await evaluate('document.body.classList.contains("ambient-paused")'), true);
    await evaluate('document.getElementById("motion-toggle").click()');
    await evaluate('document.getElementById("sliderNextBtn").click()');
    await wait(700);
    assert.equal(await evaluate('document.getElementById("sliderCounterNum").textContent'), '02');
    await evaluate('document.getElementById("sliderPrevBtn").click()');
    await wait(700);
    assert.equal(await evaluate('document.getElementById("sliderCounterNum").textContent'), '01');
    await evaluate('document.querySelector(".gallery-trigger").click()');
    assert.equal(await evaluate('document.body.classList.contains("modal-open")'), true);
    await evaluate('document.querySelector(".gallery-close").click()');
    assert.equal(await evaluate('document.body.classList.contains("modal-open")'), false);
    assert.deepEqual(await evaluate(`Array.from(document.querySelectorAll('a[href^="#"]')).map(a=>a.getAttribute('href')).filter(h=>h.length>1&&!document.getElementById(h.slice(1)))`), []);
    assert.deepEqual(await evaluate(`Array.from(document.images).filter(i=>i.complete&&i.naturalWidth===0).map(i=>i.src)`), []);
    assert.equal(await evaluate('document.getElementById("comms-channels").inert'), true);
    await evaluate('document.getElementById("comms-activate").click()');
    assert.equal(await evaluate('document.getElementById("comms-terminal").dataset.state'), 'activating');
    await wait(1200);
    assert.equal(await evaluate('document.getElementById("comms-activate").getAttribute("aria-expanded")'), 'true');
    assert.equal(await evaluate('document.getElementById("comms-channels").inert'), false);
    assert.equal(await evaluate('document.querySelectorAll(".comms-channel").length'), 6);
    assert.equal(await evaluate('document.querySelectorAll(".comms-footer a").length'), 0, 'No duplicate footer contact links');
    assert.ok((await evaluate('document.querySelector(".comms-channel[aria-describedby=tip-email]").getAttribute("href")')).startsWith('mailto:ronnel.labata@gmail.com'));
    assert.deepEqual(await evaluate('(() => { const a = document.querySelector(".comms-channel[aria-describedby=tip-facebook]"); return [a.getAttribute("href"), a.target, a.rel]; })()'), ['https://www.facebook.com/ronnel.labata/', '_blank', 'noopener noreferrer']);
    assert.deepEqual(await evaluate('(() => { const a = document.querySelector(".comms-channel[aria-describedby=tip-linkedin]"); return [a.tagName, a.getAttribute("href"), a.target, a.rel, a.hasAttribute("aria-disabled")]; })()'), ['A', 'https://www.linkedin.com/in/ronnel-labata-5b82a941b', '_blank', 'noopener noreferrer', false]);
    assert.ok((await evaluate('document.querySelector(".comms-instruments").textContent')).includes('04 / 06 CHANNELS AVAILABLE'));
    assert.ok((await evaluate('document.getElementById("comms-status").textContent')).includes('Facebook, LinkedIn, Email, and Project Inquiry ready'));
    assert.ok((await evaluate('document.querySelector("[aria-describedby=tip-projects]").getAttribute("href")')).includes('subject=Engineering%20Project%20Inquiry'));
    await evaluate('document.querySelector(".comms-channel[aria-disabled]").click()');
    assert.ok((await evaluate('document.getElementById("comms-status").textContent')).startsWith('GitHub: destination not supplied'));
    await evaluate('document.activeElement.blur(); document.querySelector(".comms-channel").focus()');
    await wait(250);
    assert.equal(await evaluate('getComputedStyle(document.querySelector(".comms-tooltip")).visibility'), 'visible');
    assert.equal(await evaluate('document.getElementById("comms-preview").querySelector("p").textContent'), await evaluate('document.getElementById(document.activeElement.getAttribute("aria-describedby")).textContent'), 'Inspector describes the focused channel');
    assert.equal(await evaluate('getComputedStyle(document.querySelector(".comms-orbit")).animationPlayState'), 'paused');
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape' });
    assert.equal(await evaluate('document.getElementById("comms-terminal").dataset.state'), 'locked');
    assert.equal(await evaluate('document.activeElement.id'), 'comms-activate');
    await evaluate('document.getElementById("comms-activate").click()');
    await wait(1200);
    for (const width of [1440, 1024, 768, 390, 320]) {
      await send('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: false });
      await wait(350);
      await evaluate('document.getElementById("projects").scrollIntoView({behavior:"instant"})');
      for (let record = 0; record < 3; record++) {
        await evaluate(`document.querySelectorAll('.slider-dot')[${record}].click()`);
        await wait(600);
        assert.equal(await evaluate(`(() => {
          const image = document.querySelector('.project-slide.is-active-card .circle-portal-inner img');
          const style = getComputedStyle(image);
          const box = image.getBoundingClientRect();
          const frame = image.parentElement.getBoundingClientRect();
          return style.borderRadius === '50%' && style.padding === '0px' &&
            Math.abs(box.width - box.height) < 1 &&
            Math.abs((box.left + box.right) - (frame.left + frame.right)) < 1 &&
            Math.abs((box.top + box.bottom) - (frame.top + frame.bottom)) < 1;
        })()`), true, 'Scan image is circular and centered at ' + width + ', record ' + record);
        assert.equal(await evaluate(`(() => {
          const slide = document.querySelector('.project-slide.is-active-card');
          const media = slide.querySelector('.slide-media-col').getBoundingClientRect();
          const content = slide.querySelector('.slide-content-col').getBoundingClientRect();
          return media.left >= 0 && media.right <= innerWidth && content.left >= 0 && content.right <= innerWidth && (innerWidth <= 900 ? content.top >= media.bottom : content.left >= media.right);
        })()`), true, 'Archive columns fit at ' + width + ', record ' + record);
        await evaluate('document.querySelector(".is-active-card .gallery-trigger").click()');
        assert.equal(await evaluate('document.getElementById("project-gallery").hidden'), false);
        await evaluate('document.querySelector(".gallery-next").click()');
        await evaluate('document.querySelector(".gallery-close").click()');
        assert.equal(await evaluate('document.activeElement.closest(".project-slide").classList.contains("is-active-card")'), true, 'Gallery restores focus to active record');
      }
      const archiveShot = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(process.env.TEMP, `ronnel-archive-${width}.png`), Buffer.from(archiveShot.data, 'base64'));
      assert.equal(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), true, 'No horizontal overflow at ' + width + ': ' + await evaluate('JSON.stringify({sw:document.documentElement.scrollWidth,iw:innerWidth,cw:document.documentElement.clientWidth,body:document.body.scrollWidth,contact:document.getElementById("contact").scrollWidth,stage:document.querySelector(".comms-stage").scrollWidth,terminal:document.getElementById("comms-terminal").scrollWidth})'));
      if (width === 390) {
        await evaluate('document.querySelector(".menu-toggle").click()');
        assert.equal(await evaluate('document.querySelector(".menu-toggle").getAttribute("aria-expanded")'), 'true');
        await evaluate(`document.querySelector('.nav-links a[href="#about"]').click()`);
        assert.equal(await evaluate('document.querySelector(".menu-toggle").getAttribute("aria-expanded")'), 'false');
      }
      await evaluate('document.getElementById("contact").scrollIntoView({behavior:"instant"})');
      await evaluate('document.querySelector(".comms-channel").focus({preventScroll:true})');
      await wait(500);
      assert.equal(await evaluate('document.querySelector(".nav-links [aria-current=location]").getAttribute("href")'), '#contact');
      assert.equal(await evaluate('document.querySelectorAll(".nav-links .active").length'), 1);
      assert.equal(await evaluate(`(() => {
        const boxes = [...document.querySelectorAll('.comms-channel,.comms-core')].map(e=>e.getBoundingClientRect());
        return boxes.every((a,i)=>a.width>=44&&a.height>=44&&a.left>=0&&a.right<=innerWidth&&boxes.every((b,j)=>i===j||a.right<=b.left||b.right<=a.left||a.bottom<=b.top||b.bottom<=a.top));
      })()`), true, 'Touch targets fit without overlap at ' + width);
      assert.equal(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), true, 'Contact has no overflow at ' + width);
      const contactShot = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(process.env.TEMP, `ronnel-contact-${width}.png`), Buffer.from(contactShot.data, 'base64'));
      if (width === 1440 || width === 390) {
        await evaluate('window.scrollTo({top:0,behavior:"instant"})');
        await wait(300);
        const screenshot = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(process.env.TEMP, `ronnel-command-center-${width}.png`), Buffer.from(screenshot.data, 'base64'));
      }
    }
    for (const [section, expected] of [['home','home'],['about','about'],['services','about'],['projects','projects'],['capabilities','capabilities'],['experience','capabilities']]) {
      await evaluate(`document.getElementById('${section}').scrollIntoView({behavior:'instant'})`);
      await wait(150);
      assert.equal(await evaluate('document.querySelector(".nav-links [aria-current=location]").getAttribute("href")'), '#' + expected, 'Navigation tracks ' + section);
    }
    assert.equal(await evaluate('document.getElementById("comms-terminal").classList.contains("ambient-idle")'), true, 'Off-screen terminal pauses');
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    assert.equal(await evaluate('getComputedStyle(document.querySelector(".technical-ring")).animationName'), 'none');
    await evaluate('sessionStorage.removeItem("ronnel-os-booted")');
    await send('Page.reload');
    await wait(500);
    assert.equal(await evaluate('document.getElementById("os-boot").hidden'), true, 'Reduced motion bypasses boot');
    await evaluate('document.getElementById("comms-activate").click()');
    assert.equal(await evaluate('document.getElementById("comms-terminal").dataset.state'), 'active', 'Reduced motion activates immediately');
    assert.equal(await evaluate('getComputedStyle(document.querySelector(".comms-orbit")).animationName'), 'none');
    await evaluate('document.getElementById("comms-lock").click()');
    assert.equal(await evaluate('document.getElementById("comms-channels").inert'), true);
    console.log('PASS: Communication activation, unavailable destinations, keyboard tooltip, orbital pause, Escape lock, responsive contact, and reduced motion.');
    assert.deepEqual(errors, [], 'No browser JavaScript exceptions');
    console.log('PASS: OS boot, skip, session persistence, automatic completion, reduced-motion bypass, archive fields, modules, technology branches, motion controls, slider, gallery, anchors, images, mobile menu, and responsive overflow at five widths.');
  } finally {
    socket.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
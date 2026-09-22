const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
(async () => {
  const tabs = await (await fetch('http://127.0.0.1:9223/json')).json();
  const socket = new WebSocket(tabs.find(tab => tab.type === 'page').webSocketDebuggerUrl);
  await new Promise(resolve => socket.addEventListener('open', resolve, {once:true}));
  let id = 0;
  const pending = new Map(), errors = [];
  socket.addEventListener('message', event => {
    const data = JSON.parse(event.data);
    if (data.method === 'Runtime.exceptionThrown') errors.push(data.params.exceptionDetails.text);
    if (pending.has(data.id)) { pending.get(data.id)(data); pending.delete(data.id); }
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const key = ++id;
    const timer = setTimeout(() => { pending.delete(key); reject(new Error(method + ' timed out')); }, 15000);
    pending.set(key, data => { clearTimeout(timer); data.error ? reject(new Error(data.error.message)) : resolve(data.result); });
    socket.send(JSON.stringify({id:key, method, params}));
  });
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', {expression, returnByValue:true, awaitPromise:true});
    assert.ok(!result.exceptionDetails, JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  try {
    await send('Runtime.enable'); await send('Page.enable');
    await send('Page.navigate', {url:'http://127.0.0.1:8765/'}); await wait(1800);
    await evaluate('document.getElementById("boot-skip").click()');
    for (const width of [320,375,390,430,768,1024,1440]) {
      await send('Emulation.setDeviceMetricsOverride', {width,height:844,deviceScaleFactor:1,mobile:width<900});
      await send('Emulation.setTouchEmulationEnabled', {enabled:width<900});
      await wait(200);
      for (const section of ['home','about','services','projects','capabilities','experience','contact']) {
        await evaluate(`document.getElementById('${section}')?.scrollIntoView({behavior:'instant'})`);
        await wait(180);
      }
      const report = await evaluate(`(() => {
        const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}};
        const serviceViewport=document.querySelector('.services-marquee-viewport');
        const serviceTrack=document.querySelector('.services-marquee-track');
        const stackViewport=document.querySelector('.tech-marquee-viewport');
        const stackTrack=document.querySelector('.tech-marquee-track');
        return {width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,
          services:[...document.querySelectorAll('.services-marquee-group:first-child .service-live-item')].map(rect),
          stage:rect(document.querySelector('.comms-stage')),
          serviceMode:{overflowX:getComputedStyle(serviceViewport).overflowX,snap:getComputedStyle(serviceViewport).scrollSnapType,animation:getComputedStyle(serviceTrack).animationName,duplicate:getComputedStyle(document.querySelector('.services-marquee-group[aria-hidden="true"]')).display},
          stackMode:{overflow:getComputedStyle(stackViewport).overflowX,animation:getComputedStyle(stackTrack).animationName,duration:getComputedStyle(stackTrack).animationDuration},
          smallTargets:[...document.querySelectorAll('button,a')].filter(e=>e.getClientRects().length&&!e.closest('[inert]')&&getComputedStyle(e).visibility!=='hidden'&&e.getBoundingClientRect().height<40).map(e=>({tag:e.tagName,className:e.className,text:e.textContent.trim().replace(/\\s+/g,' ').slice(0,35),width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height})).slice(0,20)};
      })()`);
      console.log(JSON.stringify(report));
      if (process.argv.includes('--audit')) {
        for (const section of ['home','services','projects','capabilities']) {
          await evaluate(`document.getElementById('${section}').scrollIntoView({behavior:'instant'})`);
          await wait(180);
          const sectionShot=await send('Page.captureScreenshot',{format:'png'});
          fs.writeFileSync(path.join(process.env.TEMP,`mobile-audit-${width}-${section}.png`),Buffer.from(sectionShot.data,'base64'));
        }
        await evaluate('document.getElementById("contact").scrollIntoView({behavior:"instant"})');
        await evaluate('if(document.getElementById("comms-terminal").dataset.state!=="active")document.getElementById("comms-activate").click()');
        await wait(1400);
        const terminalGeometry = await evaluate(`(() => {
          const stage=document.querySelector('.comms-stage').getBoundingClientRect();
          return {stage:{left:stage.left,right:stage.right,top:stage.top,bottom:stage.bottom},boxes:[...document.querySelectorAll('.comms-channel,.comms-core')].map(e=>{const r=e.getBoundingClientRect();return {label:e.textContent.trim().replace(/\\s+/g,' '),left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}})};
        })()`);
        console.log(JSON.stringify({width,terminalGeometry}));
        const shot=await send('Page.captureScreenshot',{format:'png'});
        fs.writeFileSync(path.join(process.env.TEMP,`mobile-audit-${width}.png`),Buffer.from(shot.data,'base64'));
        continue;
      }
      assert.equal(report.overflow,false,'Page overflow at '+width);
      if(width<=820) assert.deepEqual(report.smallTargets,[],'Touch targets under 40px at '+width);
      if(width<=600){
        assert.ok(['auto','scroll'].includes(report.serviceMode.overflowX),'Services are swipeable at '+width);
        assert.ok(report.serviceMode.snap.startsWith('x'),'Services use horizontal snap at '+width);
        assert.equal(report.serviceMode.animation,'none','Desktop services marquee disabled at '+width);
        assert.equal(report.serviceMode.duplicate,'none','Duplicate services group hidden at '+width);
        assert.equal(report.stackMode.overflow,'hidden','Stack rail clips to viewport at '+width);
        assert.equal(report.stackMode.animation,'tech-marquee-loop','Stack rail stays live at '+width);
        assert.equal(report.stackMode.duration,'42s','Stack rail slows down at '+width);
      }
      await evaluate('if(document.getElementById("comms-terminal").dataset.state!=="active")document.getElementById("comms-activate").click()');
      await wait(1400);
      assert.equal(await evaluate(`(() => {
        const stage=document.querySelector('.comms-stage').getBoundingClientRect();
        const boxes=[...document.querySelectorAll('.comms-channel,.comms-core')].map(e=>e.getBoundingClientRect());
        return boxes.every((a,i)=>a.width>=44&&a.height>=44&&a.left>=stage.left-1&&a.right<=stage.right+1&&boxes.every((b,j)=>i===j||a.right<=b.left||b.right<=a.left||a.bottom<=b.top||b.bottom<=a.top));
      })()`),true,'Terminal spacing at '+width);
      for (let index=0; index<3; index++) {
        await evaluate(`document.querySelectorAll('.slider-dot')[${index}].click()`); await wait(700);
        assert.equal(await evaluate(`(() => {const s=document.querySelector('.is-active-card');const a=s.querySelector('.slide-media-col').getBoundingClientRect(),b=s.querySelector('.slide-content-col').getBoundingClientRect();return a.left>=0&&b.right<=innerWidth+1&&(innerWidth<=900?b.top>=a.bottom:b.left>=a.right)})()`),true,'Archive layout '+width);
        if(width<=600) assert.equal(await evaluate(`(() => {
          const slide=document.querySelector('.is-active-card');
          const media=slide.querySelector('.slide-media-col').getBoundingClientRect();
          const title=slide.querySelector('.slide-title').getBoundingClientRect();
          const facts=[...slide.querySelectorAll('.fact-box')].map(e=>e.getBoundingClientRect());
          const actions=slide.querySelector('.slide-actions-row').getBoundingClientRect();
          const ordered=[media.bottom,title.top,...facts.map(r=>r.top),actions.top].every((value,i,list)=>!i||value>=list[i-1]);
          const fullWidth=[...slide.querySelectorAll('.slide-actions-row .button')].every(e=>Math.abs(e.getBoundingClientRect().width-actions.width)<2&&e.getBoundingClientRect().height>=44);
          return ordered&&fullWidth;
        })()`),true,'Mobile archive evidence/title/facts/actions order at '+width);
        await evaluate('document.querySelector(".is-active-card .gallery-trigger").click()'); await wait(200);
        assert.equal(await evaluate('document.getElementById("project-gallery").hidden'),false);
        await evaluate('document.querySelector(".gallery-next").click()');
        await evaluate('document.querySelector(".gallery-close").click()');
        assert.equal(await evaluate('document.getElementById("project-gallery").hidden'),true);
      }
      if(width<=820){
        await evaluate('document.querySelector(".menu-toggle").click()');
        await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});
        assert.equal(await evaluate('document.querySelector(".menu-toggle").getAttribute("aria-expanded")'),'false');
        await evaluate('document.querySelector(".menu-toggle").click();document.querySelector(".nav-links a[href=\\"#about\\"]").click()');
        await wait(1300);
        assert.equal(await evaluate('document.querySelector(".nav-links [aria-current]").getAttribute("href")'),'#about');
      }
      await evaluate('document.getElementById("contact").scrollIntoView({behavior:"instant"})');await wait(200);
      const shot=await send('Page.captureScreenshot',{format:'png'});
      fs.writeFileSync(path.join(process.env.TEMP,`mobile-audit-${width}.png`),Buffer.from(shot.data,'base64'));
    }
    if(!process.argv.includes('--audit')){
      await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
      assert.equal(await evaluate('[...document.querySelectorAll(".services-marquee-track,.tech-marquee-track")].every(e=>getComputedStyle(e).animationName==="none")'),true,'Reduced motion');
      assert.equal(await evaluate('[...document.images].filter(e=>e.complete&&!e.naturalWidth).length'),0,'Failed images');
      assert.deepEqual(errors,[],'Runtime errors');
      console.log('PASS: seven widths, archive/gallery, navigation, terminal, reduced motion, images and runtime checks.');
    }
  } finally { socket.close(); }
})().catch(error=>{console.error(error);process.exitCode=1});

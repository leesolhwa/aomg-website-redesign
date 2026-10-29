import asyncio
from playwright.async_api import async_playwright
BASE='http://127.0.0.1:8765/'; BLOCK=['googleapis','gstatic','jsdelivr']
results=[]
def check(name, ok, detail=''): results.append((name, ok, detail)); print(('PASS ' if ok else 'FAIL ')+name, detail)
OPEN=[]
async def newpage(b, w=1440, h=900, intro=False, keep=False, **kw):
  # 이전 페이지를 닫아 WebGL 렌더 루프가 CPU를 점유하지 않게 함 (소프트웨어 렌더링 환경)
  if not keep:
    while OPEN: await OPEN.pop().close()
  ctx=await b.new_context(viewport={'width':w,'height':h}, **kw); OPEN.append(ctx)
  if not intro: await ctx.add_init_script("try{sessionStorage.setItem('aomg-entered','1')}catch(e){}")
  pg=await ctx.new_page(); errs=[]
  pg.set_default_timeout(120000)  # 소프트웨어 렌더링(2코어)에서는 한 프레임이 1초 이상 걸릴 수 있음
  pg.on('console', lambda m: errs.append(m.text+' @'+pg.url.split('/')[-1]+' src='+str(m.location.get('url','')).split('/')[-1]) if m.type=='error' and 'ERR_FAILED' not in m.text else None)
  pg.on('pageerror', lambda e: errs.append(f'{e.name}: {e} @{pg.url.split("/")[-1]} stack={e.stack!r}'[:300]))
  pg.on('response', lambda r: errs.append(f'HTTP {r.status} {r.url}') if r.status>=400 else None)
  await pg.route('**/*', lambda r: r.abort() if any(x in r.request.url for x in BLOCK) else r.continue_())
  return pg, errs
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--autoplay-policy=no-user-gesture-required'])
    # 1 audio + player
    pg,errs=await newpage(b); await pg.goto(BASE+'index.html')
    await pg.click('.hero [data-action=audio-toggle]'); await pg.wait_for_timeout(1500)
    s=await pg.evaluate('Player.state'); check('audio on plays demo-01', s['playing'] and s['trackId']=='demo-01', str(s))
    lab=await pg.inner_text('.player [data-action=audio-toggle]'); check('player label AUDIO OFF', 'AUDIO OFF' in lab, lab)
    await pg.click('.player [data-action=play-toggle]'); await pg.wait_for_timeout(300)
    check('player pause', not (await pg.evaluate('Player.state.playing')))
    # 1b 히어로 → NOW PLAYING (로고 → 선 → CD). 진행도는 스크롤로만 바뀜
    await pg.wait_for_function('window.SoundScene', timeout=120000)
    async def goP(v):
      await pg.evaluate(f"(()=>{{const s=document.getElementById('sound');scrollTo({{top:s.offsetTop+(s.offsetHeight-innerHeight)*{v},behavior:'instant'}})}})()")
      await pg.wait_for_function(f"Math.abs(SoundScene.progress-{v})<0.01", timeout=120000)
    check('np panel hidden at hero', await pg.evaluate("document.getElementById('np').inert"))
    await goP(0.6)
    await pg.wait_for_function("!document.getElementById('np').inert", timeout=20000)
    check('np panel shown when 5 CDs are formed (60%)', await pg.evaluate("!document.getElementById('np').inert"))
    rects=await pg.evaluate('SoundScene.cdRects()')
    check('5 CDs visible, none clipped by viewport/mini player', len(rects)==5 and all(r['x0']>=0 and r['y0']>=50 and r['x1']<=1440 and r['y1']<=840 for r in rects), str([(r['title'],r['x0'],r['y0'],r['x1'],r['y1']) for r in rects]))
    check('np first album OXY_GEN', (await pg.inner_text('[data-render=np-title]'))=='OXY_GEN')
    check('GNB dark tone over CDs', (await pg.get_attribute('#gnb','data-tone'))=='on-dark')
    # 고정 무대 안의 버튼: 테스트 도구가 클릭 전에 페이지를 스크롤하지 않도록 직접 클릭 이벤트를 보냄
    await pg.locator('#np [data-action=play-track]').dispatch_event('click')
    try: await pg.wait_for_function('Player.state.playing', timeout=10000)
    except Exception: pass
    check('np PLAY plays demo-01', await pg.evaluate("Player.state.playing && Player.state.trackId==='demo-01'"))
    await pg.locator('#np [data-action=play-track]').dispatch_event('click'); await pg.wait_for_timeout(300)
    check('np PAUSE', not await pg.evaluate('Player.state.playing'))
    await pg.locator('[data-action=cd-next]').dispatch_event('click')
    await pg.wait_for_function("document.querySelector('[data-render=np-title]').textContent==='KEY BEATS'", timeout=30000)
    check('NEXT -> KEY BEATS + DEMO 02', 'DEMO BEAT 02' in await pg.inner_text('[data-render=np-tracks]'))
    await pg.locator('[data-action=cd-next]').dispatch_event('click')
    await pg.wait_for_function("document.querySelector('[data-render=np-title]').textContent==='CHECK OUT'", timeout=30000)
    check('album without demo: no play button, message', await pg.evaluate("!document.querySelector('#np [data-action=play-track]') && document.querySelector('[data-render=np-tracks]').textContent.includes('데모 트랙 없음')"))
    await pg.locator('[data-action=cd-prev]').dispatch_event('click'); await pg.locator('[data-action=cd-prev]').dispatch_event('click')
    await pg.wait_for_function("document.querySelector('[data-render=np-title]').textContent==='OXY_GEN'", timeout=60000)
    check('PREV x2 -> OXY_GEN', True)
    # 스크롤 = CD 이동: 내리면 다음 CD가 가운데로
    await goP(0.6 + 0.36*4/8)
    check('scroll moves CD row (index 5 at 78%)', (await pg.inner_text('[data-render=np-index]'))=='05', await pg.inner_text('[data-render=np-index]'))
    await goP(0.6)
    await goP(0)
    check('reverse scroll restores hero', await pg.evaluate("document.getElementById('np').inert && getComputedStyle(document.querySelector('.hero__release')).opacity==='1'"))
    # 2 discography (스크롤 고정)
    info=await pg.evaluate("(()=>{const s=document.getElementById('discography');return {top:s.getBoundingClientRect().top+scrollY, range:s.offsetHeight-innerHeight, stat:s.classList.contains('is-static')}})()")
    check('discography pinned at 1440x900', not info['stat'] and info['range']>0, str(info))
    years=[]
    for f,exp in ((0.05,'2026'),(0.5,'2022'),(0.95,'2019')):
      await pg.evaluate(f"scrollTo({{top:{info['top']+info['range']*f},behavior:'instant'}})")
      try: await pg.wait_for_function(f"document.querySelector('.discography__year').textContent.trim()==='{exp}'", timeout=6000)
      except Exception: pass
      years.append(await pg.inner_text('.discography__year'))
    check('scroll changes year', years[0]=='2026' and years[-1]=='2019' and len(set(years))==3, str(years))
    await pg.click('[data-action=year-prev]'); await pg.wait_for_timeout(1200)
    check('PREV button moves to previous year', (await pg.inner_text('.discography__year'))!='2019')
    # scratch
    await pg.evaluate("document.querySelector('.scratch').scrollIntoView({block:'center',behavior:'instant'})"); await pg.wait_for_timeout(500)
    await pg.click('[data-action=reveal]'); await pg.wait_for_timeout(300)
    check('REVEAL button uncovers poster', await pg.evaluate("document.querySelector('.scratch').classList.contains('is-revealed')"))
    # 3d hero
    check('hero 3D ready', await pg.evaluate("document.getElementById('hero').classList.contains('is-3d')"))
    # 3 navigate to artist, restore, back
    await pg.click('a[data-artist=kimkipyo]'); await pg.wait_for_load_state('load'); await pg.wait_for_timeout(400)
    check('artist link -> kimkipyo', 'KIMKIPY' in await pg.inner_text('#artist-name'))
    t=await pg.evaluate("document.querySelector('.player__title').textContent"); check('player restored after nav', 'DEMO BEAT 01' in t, t)  # 플레이어가 접혀 있어도 마지막으로 재생한 트랙 = NOW PLAYING의 DEMO 01
    await pg.click('.detail-hero__body .cta'); await pg.wait_for_load_state('load')
    check('back to artists -> index#artists', pg.url.endswith('index.html#artists'), pg.url)
    check('no console/http errors (desktop flow)', not errs, '; '.join(errs[:3]))
    # 3b intro
    pg,errs=await newpage(b, intro=True); await pg.goto(BASE+'index.html')
    check('intro visible on first visit', await pg.evaluate("getComputedStyle(document.getElementById('intro')).display!=='none'"))
    await pg.wait_for_selector('[data-action=enter]', state='visible', timeout=20000)
    check('intro has single ENTER only', await pg.eval_on_selector_all('#intro button','e=>e.length')==1)
    check('intro focuses ENTER', await pg.evaluate("document.activeElement.dataset.action")=='enter')
    await pg.keyboard.press('Tab'); await pg.keyboard.press('Tab')
    check('intro traps focus', await pg.evaluate("!!document.activeElement.closest('#intro')"))
    check('favicon is logo_thin svg', await pg.evaluate("document.querySelector('link[rel=icon]').getAttribute('href')")=='img/favicon.svg')
    check('no side captions or hint texts', await pg.eval_on_selector_all('.section-caption, .hero__hint, .now-playing__muted','e=>e.length')==0)
    check('intro mark has 4 letter pieces from img/logo', await pg.evaluate("[...document.querySelectorAll('.intro__piece')].map(i=>i.getAttribute('src')).join(',')=='img/logo/a.svg,img/logo/o.svg,img/logo/m.svg,img/logo/g.svg'"))
    check('hero statement is 4 lines', await pg.eval_on_selector_all('.hero__statement span, .hero__statement em','e=>e.map(x=>x.textContent).join(" ")')=='Above Ordinary Music Group')
    check('assets are versioned', await pg.evaluate("[...document.querySelectorAll('link[rel=stylesheet][href^=css], script[src^=js]')].every(e=>/\\?v=/.test(e.getAttribute('href')||e.getAttribute('src')))"))
    await pg.click('[data-action=enter]')
    try: await pg.wait_for_function("!document.getElementById('intro')", timeout=10000)
    except Exception: pass
    check('ENTER removes intro', not await pg.evaluate("!!document.getElementById('intro')"))
    await pg.reload(); await pg.wait_for_timeout(500)
    check('intro skipped on revisit in session', not await pg.evaluate("!!document.getElementById('intro')"))
    check('no errors (intro flow)', not errs, '; '.join(errs[:3]))
    # 4 keyboard focus visible
    pg,errs=await newpage(b); await pg.goto(BASE+'index.html')
    bad=[]
    for i in range(40):
      await pg.keyboard.press('Tab')
      info=await pg.evaluate('''()=>{const e=document.activeElement; if(!e||e===document.body) return null; const s=getComputedStyle(e); const r=e.getBoundingClientRect(); return {t:(e.textContent||e.getAttribute('aria-label')||'').trim().slice(0,20), outline:s.outlineStyle!=='none'&&parseFloat(s.outlineWidth)>0, vis:r.width>0&&r.height>0}}''')
      if info and not (info['outline'] and info['vis']): bad.append(info)
    check('focus visible on 40 tab stops', not bad, str(bad[:3]))
    # 5 mobile menu
    pg,errs=await newpage(b, 390, 844); await pg.goto(BASE+'index.html')
    await pg.click('.gnb__toggle'); await pg.wait_for_timeout(400)
    check('menu opens', (await pg.get_attribute('.gnb__toggle','aria-expanded'))=='true')
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
    check('menu closes on Esc', (await pg.get_attribute('.gnb__toggle','aria-expanded'))=='false')
    await pg.click('.gnb__toggle'); await pg.wait_for_timeout(400); await pg.click('.gnb__menu a[href="#news"]')
    try: await pg.wait_for_function("(()=>{const t=document.querySelector('#news').getBoundingClientRect().top;return t>=0&&t<=60})()", timeout=20000)  # 긴 고정 구간을 지나는 부드러운 스크롤
    except Exception: pass
    top=await pg.evaluate("Math.round(document.querySelector('#news').getBoundingClientRect().top)")
    check('menu link scrolls to #news under GNB', 0<=top<=60, f'top={top}')
    pg2,_=await newpage(b, 390, 844, keep=True); await pg2.goto(BASE+'artist.html'); await pg2.click('.gnb__toggle'); await pg2.wait_for_timeout(400)
    await pg2.click('.gnb__menu a[href="index.html#live"]'); await pg2.wait_for_load_state('load'); await pg2.wait_for_timeout(800)
    check('artist page menu -> index.html#live', pg2.url.endswith('index.html#live'), pg2.url)
    # footer links on mobile
    hrefs=await pg.eval_on_selector_all('footer a', 'els=>els.map(e=>e.href)'); check('footer links present', len(hrefs)>=5, str(len(hrefs)))
    # 6 reduced motion
    pg,errs=await newpage(b, 1440, 900, reduced_motion='reduce'); await pg.goto(BASE+'index.html'); await pg.wait_for_timeout(300)
    n=await pg.eval_on_selector_all('.discography__year','e=>e.length'); hid=await pg.evaluate("document.querySelector('.discography__controls').hidden")
    check('reduced motion: all years listed', n>1 and hid, f'years={n}')
    op=await pg.evaluate("getComputedStyle(document.querySelector('#news [data-reveal]')||document.querySelector('[data-reveal]')).opacity")
    check('reduced motion: content visible without reveal', op=='1', op)
    await pg.wait_for_function('window.SoundScene', timeout=120000)
    await pg.evaluate("(()=>{const s=document.getElementById('sound');scrollTo({top:s.offsetTop+(s.offsetHeight-innerHeight)*0.7,behavior:'instant'})})()")
    await pg.wait_for_timeout(1500)
    check('reduced motion: no morph, jumps to CD state', await pg.evaluate("SoundScene.progress>=0.6"))
    pg,errs=await newpage(b, 1440, 900, intro=True, reduced_motion='reduce'); await pg.goto(BASE+'index.html'); await pg.wait_for_timeout(400)
    check('reduced motion: intro shows buttons immediately', await pg.is_visible('[data-action=enter]'))
    # 7 unknown id
    pg,errs=await newpage(b); await pg.goto(BASE+'artist.html?id=nope'); await pg.wait_for_timeout(300)
    check('unknown id falls back with message', 'KEYVEATZ' in await pg.inner_text('#artist-name') and await pg.locator('[role=status]').count()==1)
    # 8 no-JS readability
    ctx=await b.new_context(java_script_enabled=False, viewport={'width':390,'height':844}); pgn=await ctx.new_page()
    await pgn.route('**/*', lambda r: r.abort() if any(x in r.request.url for x in BLOCK) else r.continue_())
    await pgn.goto(BASE+'index.html'); op=await pgn.evaluate("getComputedStyle(document.querySelector('[data-reveal]')).opacity")
    check('no-JS: content not hidden', op=='1', op)
    check('no-JS: intro not shown, statement visible', await pgn.evaluate("getComputedStyle(document.getElementById('intro')).display==='none' && getComputedStyle(document.querySelector('.hero__statement')).opacity==='1'"))
    check('no-JS: hero not pinned, fallback NOW PLAYING shown', await pgn.evaluate("document.getElementById('sound').offsetHeight < innerHeight*1.5 && getComputedStyle(document.getElementById('now-playing-fallback')).display!=='none'"))
    # 9 WebGL 없음: 고정 해제 + 대체 NOW PLAYING
    bn=await p.chromium.launch(args=['--disable-webgl','--disable-3d-apis'])
    pgw=await (await bn.new_context(viewport={'width':1440,'height':900})).new_page()
    await pgw.add_init_script("sessionStorage.setItem('aomg-entered','1')")
    await pgw.route('**/*', lambda r: r.abort() if any(x in r.request.url for x in BLOCK) else r.continue_())
    await pgw.goto(BASE+'index.html')
    try: await pgw.wait_for_function("document.documentElement.classList.contains('no-webgl')", timeout=20000)
    except Exception: pass
    check('no-WebGL: fallback NOW PLAYING + no pin', await pgw.evaluate("document.documentElement.classList.contains('no-webgl') && getComputedStyle(document.getElementById('now-playing-fallback')).display!=='none' && document.getElementById('sound').offsetHeight < innerHeight*1.5"))
    await bn.close()
    await b.close()
  fails=[r for r in results if not r[1]]; print(f'\n{len(results)-len(fails)}/{len(results)} passed')
asyncio.run(main())

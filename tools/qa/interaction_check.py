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
    await pg.click('[data-track-row=demo-03] [data-action=play-track]'); await pg.wait_for_timeout(500)
    check('track switch demo-03', (await pg.evaluate('Player.state.trackId'))=='demo-03')
    await pg.click('.player [data-action=play-toggle]'); await pg.wait_for_timeout(300)
    check('player pause', not (await pg.evaluate('Player.state.playing')))
    # 2 discography (스크롤 고정)
    info=await pg.evaluate("(()=>{const s=document.getElementById('discography');return {top:s.getBoundingClientRect().top+scrollY, range:s.offsetHeight-innerHeight, stat:s.classList.contains('is-static')}})()")
    check('discography pinned at 1440x900', not info['stat'] and info['range']>0, str(info))
    years=[]
    for f in (0.05,0.5,0.95):
      await pg.evaluate(f"scrollTo({{top:{info['top']+info['range']*f},behavior:'instant'}})"); await pg.wait_for_timeout(1200)
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
    t=await pg.inner_text('.player__title'); check('player restored after nav', 'DEMO BEAT 03' in t, t)
    await pg.click('.detail-hero__body .cta'); await pg.wait_for_load_state('load')
    check('back to artists -> index#artists', pg.url.endswith('index.html#artists'), pg.url)
    check('no console/http errors (desktop flow)', not errs, '; '.join(errs[:3]))
    # 3b intro
    pg,errs=await newpage(b, intro=True); await pg.goto(BASE+'index.html')
    check('intro visible on first visit', await pg.evaluate("getComputedStyle(document.getElementById('intro')).display!=='none'"))
    await pg.wait_for_selector('[data-action=enter-sound]', state='visible', timeout=20000)
    check('intro focuses ENTER WITH SOUND', await pg.evaluate("document.activeElement.dataset.action")=='enter-sound')
    await pg.keyboard.press('Tab'); await pg.keyboard.press('Tab')
    check('intro traps focus', await pg.evaluate("!!document.activeElement.closest('#intro')"))
    await pg.click('[data-action=enter-sound]'); await pg.wait_for_timeout(1200)
    check('ENTER WITH SOUND starts audio and removes intro', (await pg.evaluate('Player.state.playing')) and not await pg.evaluate("!!document.getElementById('intro')"))
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
    await pg.click('.gnb__toggle'); await pg.wait_for_timeout(400); await pg.click('.gnb__menu a[href="#news"]'); await pg.wait_for_timeout(1200)
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
    await b.close()
  fails=[r for r in results if not r[1]]; print(f'\n{len(results)-len(fails)}/{len(results)} passed')
asyncio.run(main())

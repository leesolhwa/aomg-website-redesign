import asyncio
from playwright.async_api import async_playwright
BASE='http://127.0.0.1:8765/'; BLOCK=['googleapis','gstatic','jsdelivr']
results=[]
def check(name, ok, detail=''): results.append((name, ok, detail)); print(('PASS ' if ok else 'FAIL ')+name, detail)
async def newpage(b, w=1440, h=900, **kw):
  ctx=await b.new_context(viewport={'width':w,'height':h}, **kw); pg=await ctx.new_page(); errs=[]
  pg.on('console', lambda m: errs.append(m.text+' @'+pg.url.split('/')[-1]+' src='+str(m.location.get('url','')).split('/')[-1]) if m.type=='error' and 'ERR_FAILED' not in m.text else None)
  pg.on('pageerror', lambda e: errs.append(f'{e.name}: {e} @{pg.url.split("/")[-1]} stack={e.stack!r}'[:300]))
  pg.on('response', lambda r: errs.append(f'HTTP {r.status} {r.url}') if r.status>=400 else None)
  await pg.route('**/*', lambda r: r.abort() if any(x in r.request.url for x in BLOCK) else r.continue_())
  return pg, errs
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
    # 1 audio + player
    pg,errs=await newpage(b); await pg.goto(BASE+'index.html')
    await pg.click('.hero [data-action=audio-toggle]'); await pg.wait_for_timeout(1500)
    s=await pg.evaluate('Player.state'); check('audio on plays demo-01', s['playing'] and s['trackId']=='demo-01', str(s))
    lab=await pg.inner_text('.player [data-action=audio-toggle]'); check('player label AUDIO OFF', 'AUDIO OFF' in lab, lab)
    await pg.click('[data-track-row=demo-03] [data-action=play-track]'); await pg.wait_for_timeout(500)
    check('track switch demo-03', (await pg.evaluate('Player.state.trackId'))=='demo-03')
    await pg.click('.player [data-action=play-toggle]'); await pg.wait_for_timeout(300)
    check('player pause', not (await pg.evaluate('Player.state.playing')))
    # 2 discography
    y1=await pg.inner_text('.discography__year'); await pg.click('[data-action=year-next]'); await pg.wait_for_timeout(400)
    y2=await pg.inner_text('.discography__year'); check('year next', y1!=y2, f'{y1}->{y2}')
    await pg.focus('[data-action=year-next]'); await pg.keyboard.press('ArrowLeft'); await pg.wait_for_timeout(400)
    check('year arrow key', (await pg.inner_text('.discography__year'))==y1)
    # 3 navigate to artist, restore, back
    await pg.click('a[data-artist=kimkipyo]'); await pg.wait_for_load_state('load'); await pg.wait_for_timeout(400)
    check('artist link -> kimkipyo', 'KIMKIPY' in await pg.inner_text('#artist-name'))
    t=await pg.inner_text('.player__title'); check('player restored after nav', 'DEMO BEAT 03' in t, t)
    await pg.click('.detail-hero__body .cta'); await pg.wait_for_load_state('load')
    check('back to artists -> index#artists', pg.url.endswith('index.html#artists'), pg.url)
    check('no console/http errors (desktop flow)', not errs, '; '.join(errs[:3]))
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
    pg2,_=await newpage(b, 390, 844); await pg2.goto(BASE+'artist.html'); await pg2.click('.gnb__toggle'); await pg2.wait_for_timeout(400)
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
    # 7 unknown id
    pg,errs=await newpage(b); await pg.goto(BASE+'artist.html?id=nope'); await pg.wait_for_timeout(300)
    check('unknown id falls back with message', 'KEYVEATZ' in await pg.inner_text('#artist-name') and await pg.locator('[role=status]').count()==1)
    # 8 no-JS readability
    ctx=await b.new_context(java_script_enabled=False, viewport={'width':390,'height':844}); pgn=await ctx.new_page()
    await pgn.route('**/*', lambda r: r.abort() if any(x in r.request.url for x in BLOCK) else r.continue_())
    await pgn.goto(BASE+'index.html'); op=await pgn.evaluate("getComputedStyle(document.querySelector('[data-reveal]')).opacity")
    check('no-JS: content not hidden', op=='1', op)
    await b.close()
  fails=[r for r in results if not r[1]]; print(f'\n{len(results)-len(fails)}/{len(results)} passed')
asyncio.run(main())

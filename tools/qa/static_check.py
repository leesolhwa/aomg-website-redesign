"""AOMG static QA: pages x widths. Fonts from Google/jsDelivr are unreachable in this
sandbox, so the display font is swapped to DejaVu Serif Condensed (wider than Instrument
Serif -> conservative for overflow)."""
import asyncio, json, sys, re
from playwright.async_api import async_playwright
BASE='http://127.0.0.1:8765/'
WIDTHS=[390,430,768,1024,1440,1740]
IDS=['keyveatz','yugyeom','jvckiwai','kian84','koreanzombie','leemijoo','uglyduck','kimkipyo','punchnello','sikkoo','nope']
PAGES=['index.html']+[f'artist.html?id={i}' for i in IDS]
OUT=sys.argv[1]; SHOT=set(sys.argv[2:])
BLOCK=['googleapis','gstatic','jsdelivr']
JS = r'''() => {
 const vw = innerWidth, issues = [];
 const vis = e => { const s=getComputedStyle(e); const r=e.getBoundingClientRect(); if (!(s.display!=='none' && s.visibility!=='hidden' && r.width>0 && r.height>0 && !e.closest('[hidden]'))) return false; for (let n=e; n && n.nodeType===1; n=n.parentElement) if (getComputedStyle(n).opacity==='0') return false; return true; };
 if (document.documentElement.scrollWidth > vw) issues.push(['Major','h-scroll', document.documentElement.scrollWidth+'>'+vw]);
 document.querySelectorAll('body *').forEach(e => { if (!vis(e)) return; const r=e.getBoundingClientRect(); if (r.right>vw+1 && getComputedStyle(e).position!=='fixed') issues.push(['Major','overflow-x', e.tagName+'.'+e.className+' '+(e.textContent||'').trim().slice(0,24)]); });
 document.querySelectorAll('img').forEach(i => { if (!i.hasAttribute('alt')) issues.push(['Major','img-no-alt', i.src.split('/').pop()]); if (vis(i) && i.complete && i.naturalWidth===0 && i.getAttribute('src')) issues.push(['Major','img-broken', i.getAttribute('src')]); });
 document.querySelectorAll('a').forEach(a => { const h=a.getAttribute('href'); if (h===null||h==='#'||h==='') issues.push(['Major','bad-href', a.outerHTML.slice(0,60)]); });
 document.querySelectorAll('a[target=_blank]').forEach(a => { if (!/noopener/.test(a.rel)) issues.push(['Minor','no-noopener', a.href]); });
 // touch targets (mobile only)
 if (vw < 768) document.querySelectorAll('a, button').forEach(e => { if (!vis(e)) return; const r=e.getBoundingClientRect(); if (r.height < 43.5 && !e.closest('p')) issues.push(['Minor','touch<44', e.tagName+' '+(e.textContent||e.getAttribute('aria-label')||'').trim().slice(0,20)+' h='+Math.round(r.height)]); });
 // interactive elements with display:contents (not focus-visible)
 document.querySelectorAll('a, button').forEach(e => { if (getComputedStyle(e).display==='contents') issues.push(['Major','display-contents-link', (e.textContent||'').trim().slice(0,24)]); });
 // text overlap between sibling text blocks in same section
 const blocks=[...document.querySelectorAll('main p, main h1, main h2, main li, main a, main span, footer p, footer a, header a, header button, .player a, .player button, .player p')].filter(e=>vis(e) && getComputedStyle(e).display!=='inline'); // inline 요소는 줄 상자 합집합이라 제외
 for (let i=0;i<blocks.length;i++) for (let j=i+1;j<blocks.length;j++) { const a=blocks[i], b=blocks[j]; if (a.contains(b)||b.contains(a)) continue; const r1=a.getBoundingClientRect(), r2=b.getBoundingClientRect(); const ox=Math.min(r1.right,r2.right)-Math.max(r1.left,r2.left), oy=Math.min(r1.bottom,r2.bottom)-Math.max(r1.top,r2.top); if (ox>4 && oy>4) issues.push(['Major','text-overlap', (a.textContent||'').trim().slice(0,16)+' / '+(b.textContent||'').trim().slice(0,16)]); }
 // empty visible text containers that should have content
 document.querySelectorAll('[data-render]').forEach(e => { if (vis(e) && !['IMG','CANVAS'].includes(e.tagName) && !e.textContent.trim() && !e.children.length) issues.push(['Major','empty-render', e.dataset.render]); });
 // headings
 const h1=document.querySelectorAll('h1'); if (h1.length!==1) issues.push(['Major','h1-count', h1.length]);
 // hero CTA above fixed player in first viewport
 const cta=document.querySelector('.hero__cta, .detail-hero__body .cta'); const pl=document.querySelector('.player');
 if (cta && pl && cta.getBoundingClientRect().bottom > pl.getBoundingClientRect().top) issues.push(['Major','hero-cta-under-player', Math.round(cta.getBoundingClientRect().bottom)]);
 // dummy text
 const txt=document.body.innerText; ['lorem','ipsum','TODO','undefined','null','NaN','[needs-check]'].forEach(w=>{ if (txt.includes(w)) issues.push(['Major','dummy-text', w]); });
 // 100vw usage
 return {issues, title: document.title, sections:[...document.querySelectorAll('main > section')].map(s=>s.id+(s.hidden?'(hidden)':''))};
}'''
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    report={}
    for page in PAGES:
      for w in WIDTHS:
        if page.startswith('artist') and 'keyveatz' not in page and w not in (390,1440): continue
        ctx=await b.new_context(viewport={'width':w,'height':844 if w<768 else 900})
        await ctx.add_init_script("try{sessionStorage.setItem('aomg-entered','1')}catch(e){}")  # 인트로는 interaction_check에서 따로 검사
        pg=await ctx.new_page(); errs=[]; bad=[]
        pg.on('console', lambda m: errs.append(m.text) if m.type=='error' and 'ERR_FAILED' not in m.text else None)
        pg.on('pageerror', lambda e: errs.append('PAGEERROR '+str(e)))
        pg.on('response', lambda r: bad.append(f'{r.status} {r.url}') if r.status>=400 else None)
        await pg.route('**/*', lambda r: r.abort() if any(h in r.request.url for h in BLOCK) else r.continue_())
        await pg.goto(BASE+page, wait_until='load')
        await pg.add_style_tag(content=':root{--font-display-en:"DejaVu Serif Condensed",serif}')
        await pg.evaluate("document.querySelectorAll('[data-reveal]').forEach(e=>e.classList.add('is-in')); document.querySelectorAll('img[loading=lazy]').forEach(i=>i.loading='eager')")
        await pg.wait_for_timeout(1500)
        r=await pg.evaluate(JS)
        for e in errs: r['issues'].append(['Critical','console',e])
        for x in bad: r['issues'].append(['Major','http',x])
        report[f'{page}@{w}']=r
        if f'{page}@{w}' in SHOT or 'all' in SHOT:
          await pg.screenshot(path=f"{OUT}/{page.replace('.html','').replace('?id=','-')}-{w}.png", full_page=True, timeout=180000)
        await ctx.close()
    await b.close()
  json.dump(report, open(f'{OUT}/report.json','w'), ensure_ascii=False, indent=1)
  tally={}
  for k,v in report.items():
    for sev,kind,det in v['issues']:
      tally.setdefault((sev,kind),[]).append(f'{k}: {det}')
  for (sev,kind),items in sorted(tally.items()):
    print(f'[{sev}] {kind} x{len(items)}'); [print('   ',i) for i in items[:4]]
  print('TOTAL', sum(len(v) for v in tally.values()), 'pages/widths checked', len(report))
asyncio.run(main())

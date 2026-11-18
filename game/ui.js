'use strict';
/* Интерфейс: карта на canvas, верхняя полоса, нижняя навигация, выдвижные экраны, окна боя и торговли. */
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pad = n => String(n).padStart(2, '0');
const RM = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const fmtH = h => { const m = Math.round(h * 60); if (m < 60) return m + ' мин'; const hh = Math.floor(m / 60); if (hh >= 48) return Math.floor(hh / 24) + ' д ' + (hh % 24) + ' ч'; return hh + ' ч' + (m % 60 ? ' ' + (m % 60) + ' мин' : ''); };
const fmtKm = k => (k < 10 ? k.toFixed(1) : Math.round(k)) + ' км';
const fmtT = t => { const r = Math.round(t); return (r < 0 ? '−' : r > 0 ? '+' : '') + Math.abs(r) + '°'; };
const qty = q => Number.isInteger(q) ? q : q.toFixed(1);
let scr = 'map', sel = null, pick = null, invCat = 'all', craftG = null, rsel = null, tradeTab = 'buy', confirmNew = false, showF = true, hudT = 0;

function toast(m, k) { if (!m) return; const el = document.createElement('div'); el.className = 'toast ' + (k || ''); el.textContent = m; const box = $('#toasts'); box.appendChild(el); while (box.children.length > 3) box.firstChild.remove(); setTimeout(() => el.classList.add('out'), 2600); setTimeout(() => el.remove(), 3100); }
const modalOpen = () => !$('#modal').hidden;
function showModal(html) { const m = $('#modal'); m.innerHTML = html; m.hidden = false; }
function hideModal() { const m = $('#modal'); m.hidden = true; m.innerHTML = ''; }

/* ---------- мелкие детали ---------- */
function btn(act, label, sub, dis, cls, arg) { return `<button class="btn ${cls || ''}" data-act="${act}"${arg != null ? ` data-arg="${arg}"` : ''}${dis ? ' disabled' : ''}><span>${label}</span>${sub ? `<small>${sub}</small>` : ''}</button>`; }
function cell(ic, name, o) { o = o || {}; const inner = `<span class="ic">${ic}</span>${o.n != null ? `<span class="cn${o.bad ? ' bad' : ''}">${o.n}</span>` : ''}${o.tag ? `<span class="ct">${o.tag}</span>` : ''}<span class="cl">${esc(name)}</span>`; return o.act ? `<button class="cell${o.on ? ' on' : ''}${o.dim ? ' dim' : ''}" data-act="${o.act}" data-arg="${o.arg}" title="${esc(name)}">${inner}</button>` : `<div class="cell info${o.dim ? ' dim' : ''}" title="${esc(name)}">${inner}</div>`; }
function itemDesc(k) {
  const it = ITEMS[k], p = [];
  if (it.use) { const u = it.use, L = { hunger: 'сытость', thirst: 'вода', hp: 'здоровье', warmth: 'тепло', rad: 'радиация', mood: 'настрой' }; for (const q in L) if (u[q]) p.push((u[q] > 0 ? '+' : '−') + Math.abs(u[q]) + ' ' + L[q]); if (u.cure) p.push('лечит: ' + u.cure.map(d => DIS[d].n.toLowerCase()).join(', ')); if (u.ease) p.push('облегчает простуду'); if (u.pk) p.push('снимает боль на ' + u.pk + ' ч'); if (u.kit) p.push('перевязка всех ран'); if (u.poison) p.push('можно отравиться'); if (u.time) p.push(u.time + ' ч'); }
  if (it.dmg) p.push(`урон ${it.dmg[0]}–${it.dmg[1]}` + (it.rng ? `, до ${it.rng} м` : `, вплотную${it.reach > 2 ? ' (дотягивается дальше)' : ''}`) + (it.burst ? ', очередь' : ''));
  if (it.ammo) p.push(ITEMS[it.ammo].n.toLowerCase());
  if (it.warm) p.push('тепло +' + it.warm); if (it.arm) p.push('броня ' + it.arm); if (it.prot) p.push('радиация −' + Math.round(it.prot * 100) + '%'); if (it.cap) p.push('груз +' + it.cap + ' кг');
  if (it.d) p.push(it.d);
  if (it.w) p.push(it.w + ' кг');
  return p.join(' · ');
}

/* ---------- верх и низ ---------- */
function renderHud() {
  const h = hour(), s = g.s;
  $('#clock').innerHTML = `<span>День ${dayNum()} · ${dateStr()}</span><span>${pad(Math.floor(h))}:${pad(Math.floor(h % 1 * 60))}</span><span class="cold">${fmtT(tempAt(g.pos.x, g.pos.y))}</span><span class="dim">${WEATHER[g.weather].n}</span>`;
  const rows = [['cross', 'Здоровье', 'var(--blood)', s.hp, s.hp < 30], ['fork', 'Сытость', 'var(--lamp)', s.hunger, s.hunger < 20], ['drop', 'Вода', 'var(--frost)', s.thirst, s.thirst < 20], ['thermo', 'Тепло', 'var(--ember)', s.warmth, s.warmth < 25], ['rad', 'Радиация', 'var(--ash)', s.rad, s.rad >= 30], ['face', 'Настрой', 'var(--soft)', s.mood, s.mood < 25]];
  $('#stats').innerHTML = rows.map(r => `<div class="need${r[4] ? ' crit' : ''}" title="${r[1]}"><span style="color:${r[2]}">${uiIcon(r[0])}</span><b>${Math.round(r[3])}</b></div>`).join('');
  const c = [];
  if (g.wounds.some(w => w.bl > 0 && !w.b)) c.push(['bad', 'Кровотечение']);
  if (g.wounds.length) c.push(['', 'Раны: ' + g.wounds.length]);
  for (const k in g.dis) c.push(['bad', DIS[k].n]);
  if (s.rad >= 30) c.push(['ash', 'Лучевая болезнь ' + (s.rad >= 85 ? 'III' : s.rad >= 60 ? 'II' : 'I')]);
  if (g.time < g.pk) c.push(['', 'Обезболен']);
  if (weight() > capacity()) c.push(['ash', 'Перегруз']);
  $('#cond').innerHTML = c.map(x => `<span class="chip ${x[0]}">${x[1]}</span>`).join('');
}
function renderNav() {
  const bad = { place: Object.keys(groundHere()).length, camp: RECIPES.filter(r => !craftMiss(r).length).length, char: g.wounds.length + Object.keys(g.dis).length + g.perkPts };
  $('#nav').innerHTML = [['map', 'mapf', 'Карта'], ['place', 'lens', 'Место'], ['inv', 'pack', 'Рюкзак'], ['camp', 'tent', 'Лагерь'], ['char', 'person', 'Герой'], ['world', 'globe', 'Мир']].map(n => `<button class="${scr === n[0] ? 'on' : ''}" data-act="scr" data-arg="${n[0]}">${uiIcon(n[1])}<span>${n[2]}</span>${bad[n[0]] ? `<i class="bdg">${bad[n[0]]}</i>` : ''}</button>`).join('');
}
function renderRoute() {
  const el = $('#route');
  if (trip) { el.hidden = false; el.innerHTML = `<div class="rt"><div class="eyebrow">В пути · ${moveMode().by}</div><div class="rname">${sel && sel.n ? esc(sel.n) : 'Точка на карте'}</div><div class="mono" id="tripInfo">&nbsp;</div><div class="hp"><i id="tripBar" style="width:0%"></i></div></div><button class="btn row" data-act="stop">Стоп</button>`; return; }
  if (!sel || scr !== 'map') { el.hidden = true; el.innerHTML = ''; return; }
  const r = routeInfo(sel.x, sel.y), warn = r.m.blocked || (r.cut ? 'Дальше вода: дойдёшь только до берега.' : r.fuel > (g.inv.fuel || 0) + .01 ? 'Бензина на весь путь не хватит.' : '');
  el.hidden = false;
  el.innerHTML = `<div class="rt"><div class="eyebrow">Маршрут</div><div class="rname">${sel.n ? esc(sel.n) : 'Точка на карте'}</div><div class="mono">${fmtKm(r.km)} · ${fmtH(r.h)} ${r.m.by}${r.fuel ? ` · ${r.fuel.toFixed(1)} л` : ''}</div>${warn ? `<div class="ef bad">${warn}</div>` : ''}</div><button class="btn row primary" data-act="go">В путь</button><button class="btn row" data-act="unsel" aria-label="Сбросить маршрут">✕</button>`;
}

/* ---------- экран «Место» ---------- */
function renderPlace() {
  const { city, site } = curHere, fire = fireOn(), rad = radAt(g.pos.x, g.pos.y), f = factionAt(g.pos.x, g.pos.y), fresh = freshDist() <= 12;
  let eb, nm, ds = '';
  if (site) { eb = city ? city.n : BIOME[curBiome]; nm = site.n; }
  else if (city) { eb = city.n; nm = 'Улицы города'; ds = 'Обыскивать можно только здания: приблизь карту и выбери дом.'; }
  else { const nc = nearestCity(); eb = BIOME[curBiome]; nm = 'Глушь'; ds = `${Math.round(nc.d)} км к ${nc.dir} от города ${nc.c.n}.`; }
  const pic = art(site ? 'b:' + site.t : city ? 't:street' : 't:' + curBiome);
  let info = `<div><div class="phead">${pic ? `<span class="ppic">${pic}</span>` : ''}<div><div class="eyebrow">${eb}</div><h2 class="loc">${esc(nm)}</h2></div></div>${ds ? `<p class="desc">${ds}</p>` : ''}<div class="chips">`
    + (site ? '<span class="chip">Укрытие</span>' : '<span class="chip cold">Под открытым небом</span>')
    + (fire ? `<span class="chip warm">Костёр · ещё ${fmtH(g.fire.until - g.time)}</span>` : '')
    + (rad > 0 ? `<span class="chip ash">Заражение: ${owns('geiger') ? (rad * 3.2 * (1 - radProt())).toFixed(1) + ' в час' : rad > 2 ? 'смертельное' : rad > 1 ? 'сильное' : 'слабое'}</span>` : '')
    + (f ? `<span class="chip" style="border-color:${FACTIONS[f].c};color:${FACTIONS[f].c}">${FACTIONS[f].n} · ${repWord(f)}</span>` : '')
    + (fresh ? '<span class="chip cold">Вода рядом</span>' : '') + (snowHere() ? '<span class="chip">Снег</span>' : '') + (site && site.t !== 'base' ? (has('flashlight') ? '<span class="chip warm">Фонарик: находок больше</span>' : has('torch') ? '<span class="chip warm">Факел: находок больше</span>' : '<span class="chip">Темно: нужен свет</span>') : '') + '</div></div>';
  const mk = [...new Set(encPool(encCtx()).map(p => p[0]))], meetH = `<div class="grid small">${mk.map(k => cell(art('e:' + k) || uiIcon('person', '#8797a3'), ENEMIES[k].n)).join('')}</div>`, A = [];
  let finds = '', note = '';
  if (site && site.t === 'base') {
    const bf = baseHere();
    if (canTrade(bf)) A.push(btn('trade', 'Торговать', `талонов: ${g.inv.coupon || 0} · отношение: ${repWord(bf)}`, false, 'wide primary'));
    else note = `<p class="desc">${FACTIONS[bf].n}: с тобой здесь не торгуют, отношение «${repWord(bf)}».</p>`;
  } else if (site) {
    const st = siteState(site), m = BUILD[site.t], rows = m.loot.slice().sort((a, b) => b.p - a.p);
    A.push(btn('search', st.s > 0 ? 'Искать' : 'Обыскано полностью', st.s > 0 ? `${fmtH(m.h)} · осталось заходов: ${st.s} из ${st.m}${rad > 0 ? ' · фонит' : ''}` : 'больше здесь ничего нет', st.s <= 0, 'wide primary'));
    if (st.wr) note = `<p class="desc">В гараже стоит остов: ${VEH[st.wr].n.toLowerCase()}. Восстановить можно на верстаке 3 уровня.</p>`;
    finds = `<div><h3>Здесь можно найти</h3><div class="grid small">${rows.map(r => cell(icon(r[0]), ITEMS[r[0]].n, { tag: Math.round(r.p * 100) + '%' })).join('')}</div></div>`
      + `<div><h3>Можно встретить${m.dng >= .25 ? ' — <span class="bad">опасное место</span>' : ''}</h3>${meetH}</div>`;
  } else {
    const fs = wildFinds();
    finds = (fs.length ? `<div><h3>Здесь можно найти</h3><div class="grid small">${fs.map(k => cell(icon(k), ITEMS[k].n)).join('')}</div></div>` : '')
      + `<div><h3>Можно встретить</h3>${meetH}</div>`;
  }
  if (wildOK() && !site) { A.push(btn('forage', 'Собирать', snowHere() ? 'под снегом пусто' : '1,5 ч: ягоды, грибы, травы', snowHere())); A.push(btn('wood', 'Дрова', '1,5 ч' + (owns('axe') ? ', с топором больше' : ''))); A.push(btn('hunt', 'Охота', '3 ч, нужно оружие')); }
  if (fresh) { A.push(btn('water', 'Набрать воды', 'сырая, лучше кипятить')); A.push(btn('fish', 'Рыбачить', owns('fishrod') ? '2 ч' : 'нужна удочка', !owns('fishrod'))); }
  if (withVeh()) A.push(btn('park', 'Оставить транспорт', VEH[g.veh.t].n)); else if (g.veh && hyp(g.veh.parked.x - g.pos.x, g.veh.parked.y - g.pos.y) <= 3) A.push(btn('board', 'Сесть', VEH[g.veh.t].n));
  const gr = groundHere(), gk = Object.keys(gr);
  const left = `<div class="hrow"><h3>На земле</h3><button class="sbtn hot" data-act="pickall"${gk.length ? '' : ' disabled'}>Подобрать всё</button></div>`
    + (gk.length ? `<div class="grid">${gk.map(k => cell(icon(k), ITEMS[k].n, { n: qty(gr[k]), act: 'pick', arg: k })).join('')}</div>` : '<p class="desc">Пусто. Найденное появится здесь. Сюда же можно выложить лишнее из рюкзака — оно останется лежать.</p>');
  return `<div class="panes place"><div class="pane">${left}</div><div class="pane side">${info}${A.length ? `<div class="acts">${A.join('')}</div>` : ''}${note}${finds}</div></div>`;
}

/* ---------- экран «Рюкзак» ---------- */
const INVCAT = [['all', 'Всё'], ['food', 'Провизия'], ['med', 'Медицина'], ['gear', 'Снаряжение'], ['tool', 'Инструменты'], ['arms', 'Оружие'], ['mat', 'Материалы']];
const CATMAP = { food: ['food', 'drink'], med: ['med'], gear: ['wear'], tool: ['tool'], arms: ['melee', 'ranged', 'ammo'], mat: ['mat', 'part', 'money'] };
function renderInv() {
  const w = weight(), cap = capacity();
  if (pick && ((pick.t === 'inv' && !has(pick.k)) || (pick.t === 'eq' && !g.eq[pick.k]))) pick = null;
  const ks = Object.keys(g.inv).filter(k => invCat === 'all' || CATMAP[invCat].includes(ITEMS[k].c));
  ks.sort((a, b) => CATS.findIndex(c => c[0] === ITEMS[a].c) - CATS.findIndex(c => c[0] === ITEMS[b].c));
  const left = `<div class="invl"><div class="cats">${INVCAT.map(c => `<button class="cat${invCat === c[0] ? ' sel' : ''}" data-act="cat" data-arg="${c[0]}">${c[1]}</button>`).join('')}</div><div class="invg">`
    + `<div class="hrow"><div class="eyebrow">Груз</div><div class="mono${w > cap ? ' bad' : ''}">${w.toFixed(1)} / ${cap} кг</div></div><div class="hp"><i style="width:${Math.min(100, w / cap * 100)}%;background:${w > cap ? 'var(--blood)' : 'var(--soft)'}"></i></div>`
    + (ks.length ? `<div class="grid">${ks.map(k => cell(icon(k), ITEMS[k].n, { n: qty(g.inv[k]), act: 'pickinv', arg: k, on: pick && pick.t === 'inv' && pick.k === k })).join('')}</div>` : '<p class="desc">Пусто.</p>') + '</div></div>';
  const slot = s => { const k = g.eq[s], l = SLOTS.find(x => x[0] === s)[1]; return `<div style="grid-area:${s}">${k ? cell(icon(k), ITEMS[k].n, { act: 'pickeq', arg: s, on: pick && pick.t === 'eq' && pick.k === s }) : cell('', l, { dim: 1 })}</div>`; };
  let right = `<div class="doll">${['head', 'mask', 'body', 'back', 'armor', 'legs', 'melee', 'feet', 'ranged'].map(slot).join('')}<div class="fig" style="grid-area:fig">${uiIcon('person', '#5d6c77')}<b>уровень ${g.lvl}</b></div></div>`
    + `<div><div class="hp thin"><i style="width:${g.xp / lvlNeed(g.lvl) * 100}%;background:var(--lamp)"></i></div><div class="ef">Опыт: ${g.xp} из ${lvlNeed(g.lvl)}</div></div>`;
  if (pick) {
    const k = pick.t === 'eq' ? g.eq[pick.k] : pick.k, it = ITEMS[k]; let b = '';
    if (pick.t === 'eq') b = `<button class="sbtn hot" data-act="unequip" data-arg="${pick.k}">Снять</button>`;
    else {
      if (it.use) b += `<button class="sbtn hot" data-act="use" data-arg="${k}">${{ food: 'Съесть', drink: 'Выпить' }[it.c] || 'Применить'}</button>`;
      if (it.c === 'melee' || it.c === 'ranged' || it.slot) b += `<button class="sbtn hot" data-act="equip" data-arg="${k}">${it.slot ? 'Надеть' : 'Взять в руки'}</button>`;
      b += `<button class="sbtn" data-act="drop" data-arg="${k}">Выложить</button>` + (g.inv[k] > 1 ? `<button class="sbtn" data-act="dropall" data-arg="${k}">Выложить всё</button>` : '');
    }
    right += `<div class="detail"><div class="dic">${icon(k)}</div><div class="dtx"><div class="nm">${it.n}${pick.t === 'inv' ? `<span class="q">×${qty(g.inv[k])}</span>` : ''}</div><div class="ef">${itemDesc(k)}</div></div><div class="dbt">${b}</div></div>`;
  } else right += '<p class="desc">Нажми на вещь, чтобы использовать, надеть или выложить.</p>';
  return `<div class="panes"><div class="pane">${left}</div><div class="pane side">${right}</div></div>`;
}

/* ---------- экран «Лагерь» ---------- */
const SICON = { fire: ['flame', ['#e08a3c', '#7a3c12', '#f8dc8c']], kitchen: ['pot', DRK], bench: ['wrench', PAL.melee], sew: ['needle', PAL.tool], med: ['medkit', PAL.med], rest: ['tent', PAL.wear] };
let stn = null, rqty = 1, perkSnooze = 0;
const recipeIcon = r => r.veh ? (art('v:' + r.veh) || svgStr(VICON[r.veh], PAL.part)) : icon(Object.keys(r.out)[0]);
function renderCamp() {
  if (stn) return renderStation();
  const fire = fireOn();
  const tiles = Object.keys(STATIONS).map(k => {
    const S = STATIONS[k], lv = S.up ? g.st[k] : 0, max = S.up ? S.up.length : 0, can = S.up && lv < max && Object.entries(S.up[lv]).every(([i, q]) => has(i, q)), n = RECIPES.filter(r => r.st[0] === k && !craftMiss(r).length).length;
    return `<button class="stile" data-act="stn" data-arg="${k}"><span class="sic">${art('s:' + k) || svgStr(SICON[k][0], SICON[k][1])}</span><span class="nm">${S.n}</span><small>${k === 'fire' ? (fire ? 'горит ещё ' + fmtH(g.fire.until - g.time) : 'не горит') : lv ? `уровень ${lv} из ${max}` : 'не построено'}</small>${n ? `<i class="bdg">${n}</i>` : ''}${can ? '<i class="upm">▲ можно улучшить</i>' : ''}</button>`;
  }).join('');
  return `<div class="panes one"><div class="pane"><div class="sgrid">${tiles}</div><p class="desc">Стоянка всегда с тобой. Чем выше уровень станка, тем больше на нём рецептов. Цифра на плитке — сколько вещей можно сделать прямо сейчас.</p></div></div>`;
}
function renderStation() {
  const S = STATIONS[stn], lv = S.up ? g.st[stn] : 0, max = S.up ? S.up.length : 0, fire = fireOn();
  const list = RECIPES.filter(r => r.st[0] === stn);
  if (!rsel || !list.find(r => r.id === rsel)) { const f0 = list.find(r => !craftMiss(r).length) || list[0]; rsel = f0 ? f0.id : null; rqty = 1; }
  let left = `<div class="hrow"><button class="sbtn" data-act="stn" data-arg="">← Лагерь</button><div class="eyebrow">${S.n}${max ? ` · уровень ${lv} из ${max}` : ''}</div></div>`;
  for (let L = 0; L <= max; L++) { const rs = list.filter(r => r.st[1] === L); if (!rs.length) continue; left += `<div><h3 class="lv${L > lv ? ' lock' : ''}">${L === 0 ? 'Доступно сразу' : 'Уровень ' + L}${L > lv ? ' — нужно улучшение' : ''}</h3><div class="grid">${rs.map(r => cell(recipeIcon(r), r.n, { act: 'rsel', arg: r.id, on: rsel === r.id, dim: craftMiss(r).length > 0 })).join('')}</div></div>`; }
  if (!list.length) left += '<p class="desc">Здесь ничего не мастерят.</p>';
  let right = `<p class="desc">${S.d}</p>`;
  if (stn === 'fire') right += `<div class="acts">${fire ? btn('stoke', 'Подбросить дров', `горит ещё ${fmtH(g.fire.until - g.time)} · 1 дрова → +2 ч`, !has('wood'), 'wide') : btn('fire', 'Развести костёр', '2 дрова и спички', !has('wood', 2) || !(has('matches') || owns('lighter')), 'wide primary')}</div>`;
  if (stn === 'rest') right += `<div class="acts">${btn('rest', 'Передохнуть', '2 ч', false, '', 2)}${btn('rest', 'Долгий отдых', '8 ч', false, '', 8)}</div>`;
  if (S.up && lv < max) { const cost = S.up[lv], ok = Object.entries(cost).every(([i, q]) => has(i, q)); right += `<div class="detail col"><div class="nm">${lv ? 'Улучшение' : 'Постройка'}: уровень ${lv + 1}</div><div class="grid small">${Object.keys(cost).map(k => cell(icon(k), ITEMS[k].n, { n: `${qty(g.inv[k] || 0)}/${cost[k]}`, bad: !has(k, cost[k]) })).join('')}</div>${btn('upg', lv ? 'Улучшить' : 'Построить', '1 ч', !ok, 'wide', stn)}</div>`; }
  const r = list.find(x => x.id === rsel);
  if (r) {
    const miss = craftMiss(r), extra = [];
    for (const t of r.tools || []) extra.push(`<span class="${owns(t) ? '' : 'miss'}">${ITEMS[t].n}</span>`);
    if (r.fire) extra.push(`<span class="${fire ? '' : 'miss'}">костёр</span>`);
    if (r.snow) extra.push(`<span class="${snowHere() ? '' : 'miss'}">снег</span>`);
    if (r.sk) extra.push(`<span class="${g.sk[r.sk[0]][0] >= r.sk[1] ? '' : 'miss'}">${SKILLS[r.sk[0]]} ${r.sk[1]}</span>`);
    if (r.wr) extra.push(`<span class="${wreckHere(r.wr) ? '' : 'miss'}">остов в гаражах</span>`);
    if (r.st[1] > lv) extra.push(`<span class="miss">${S.n}, ур. ${r.st[1]}</span>`);
    const nk = Object.keys(r.need), maxN = r.veh ? 1 : clamp(nk.length ? Math.min(...nk.map(k => Math.floor((g.inv[k] || 0) / r.need[k]))) : 5, 1, 20); rqty = clamp(rqty, 1, maxN);
    const out = r.veh ? VEH[r.veh].n : Object.entries(r.out).map(([k, q]) => ITEMS[k].n + (q * rqty > 1 ? ' ×' + q * rqty : '')).join(', ');
    right += `<div class="detail col"><div class="irow"><span class="mic">${recipeIcon(r)}</span><div><div class="nm">${r.n}</div><div class="ef">Получится: ${out}${r.veh ? '' : ' · ' + itemDesc(Object.keys(r.out)[0])}</div></div></div>`
      + (nk.length ? `<div class="grid small">${nk.map(k => cell(icon(k), ITEMS[k].n, { n: `${qty(g.inv[k] || 0)}/${r.need[k] * rqty}`, bad: !has(k, r.need[k] * rqty) })).join('')}</div>` : '')
      + (extra.length ? `<div class="needs">${extra.join('')}</div>` : '')
      + `<div class="qrow">${r.veh ? '' : `<button class="sbtn" data-act="q-"${rqty <= 1 ? ' disabled' : ''}>−</button><b>${rqty}</b><button class="sbtn" data-act="q+"${rqty >= maxN ? ' disabled' : ''}>+</button>`}${btn('craft', 'Создать', fmtH(craftTime(r) * rqty), miss.length > 0, 'primary grow', r.id)}</div></div>`;
  }
  return `<div class="panes"><div class="pane">${left}</div><div class="pane side">${right}</div></div>`;
}
function showPerk() {
  const o = perkOffer(); $('#modal').dataset.kind = 'perk';
  showModal(`<div class="card wide"><div class="eyebrow">Уровень ${g.lvl}</div><h3 class="big">Новая способность</h3><div class="perks">${o.map(id => `<button class="perk" data-act="perk" data-arg="${id}"><span class="pm">${svgStr('star', ['#e8a03a', '#7a4a1e', '#f8dc8c'])}</span><b>${PERKS[id].n}${pk(id) ? ' ' + (pk(id) + 1) : ''}</b><small>${PERKS[id].d}</small></button>`).join('')}</div><button class="btn row" data-act="perklater">Отложить</button></div>`);
}

/* ---------- экраны «Герой» и «Мир» ---------- */
function renderChar() {
  const s = g.s, pl = Object.keys(g.perks);
  let h = `<div><h3>Уровень ${g.lvl}</h3><div class="hp thin"><i style="width:${g.xp / lvlNeed(g.lvl) * 100}%;background:var(--lamp)"></i></div><div class="ef">Опыт: ${g.xp} из ${lvlNeed(g.lvl)}</div>${g.perkPts > 0 ? btn('perkopen', 'Выбрать способность', 'доступно: ' + g.perkPts, false, 'wide primary') : ''}${pl.length ? '<div class="items">' + pl.map(k => `<div class="item"><div><div class="nm">${PERKS[k].n}<span class="q">ур. ${g.perks[k]}</span></div><div class="ef">${PERKS[k].d}</div></div></div>`).join('') + '</div>' : '<p class="desc">Способностей пока нет. Они даются за новые уровни.</p>'}</div>`;
  h += '<div><h3>Раны</h3>';
  if (!g.wounds.length) h += '<p class="desc">Ран нет.</p>';
  else h += '<div class="items">' + g.wounds.map((w, i) => {
    const d = WOUNDS[w.t], st = []; let b = '';
    if (d.bleed) { if (w.b) st.push(w.b === 2 ? 'перевязана бинтом' : 'перевязана тряпкой'); else if (w.bl > 0) { st.push('<span class="bad">кровоточит</span>'); b += `<button class="sbtn hot" data-act="treat" data-arg="${i}:band"${has('bandage') || has('ragband') ? '' : ' disabled'}>Перевязать</button>`; } }
    if (d.inf) { if (w.c) st.push('обработана'); else { st.push('не обработана'); b += `<button class="sbtn" data-act="treat" data-arg="${i}:clean"${['iodine', 'alcohol', 'vodka'].some(x => has(x)) ? '' : ' disabled'}>Обработать</button>`; } }
    if (w.t === 'fracture') { if (w.sp) st.push('шина наложена'); else { st.push('без шины срастается плохо'); b += `<button class="sbtn" data-act="treat" data-arg="${i}:splint"${has('splint') ? '' : ' disabled'}>Шина</button>`; } }
    return `<div class="item"><div><div class="nm">${d.n}</div><div class="ef">${st.join(' · ') || 'заживает'} · ещё примерно ${fmtH(w.h)}</div></div><div class="bt">${b}</div></div>`;
  }).join('') + '</div>';
  h += '</div><div><h3>Болезни</h3>';
  const dl = Object.keys(g.dis);
  if (!dl.length && s.rad < 30) h += '<p class="desc">Ты здоров.</p>';
  else h += '<div class="items">' + dl.map(k => `<div class="item"><div><div class="nm bad">${DIS[k].n}</div><div class="ef">${DIS[k].d}${g.dis[k] > 0 ? ' Пройдёт само через ' + fmtH(g.dis[k]) + '.' : ' Само не пройдёт.'}</div></div></div>`).join('')
    + (s.rad >= 30 ? `<div class="item"><div><div class="nm bad">Лучевая болезнь ${s.rad >= 85 ? 'III' : s.rad >= 60 ? 'II' : 'I'}</div><div class="ef">Доза ${Math.round(s.rad)}. Антирад и водка выводят, вдали от очагов доза медленно спадает.${s.rad >= 60 ? ' Здоровье тает.' : ' Здоровье не восстанавливается.'}</div></div></div>` : '') + '</div>';
  h += `</div><div><h3>Защита</h3><div class="kv"><span>Тепло одежды</span><b class="mono">${wearWarm()}</b><span>Броня</span><b class="mono">${armor()}</b><span>Защита от радиации</span><b class="mono">${Math.round(radProt() * 100)}%</b><span>Запас здоровья</span><b class="mono">${maxHp()}</b></div></div>`;
  h += '<div><h3>Навыки</h3><div class="items">' + Object.keys(SKILLS).map(k => { const [l, x] = g.sk[k]; return `<div class="item"><div><div class="nm">${SKILLS[k]}<span class="q">ур. ${l}</span></div><div class="ef">${SKILLD[k]}</div><div class="hp thin"><i style="width:${x / xpNeed(l) * 100}%;background:var(--moss)"></i></div></div></div>`; }).join('') + '</div></div>';
  return h;
}
function renderWorld() {
  let h = '<div><h3>Фракции и банды</h3><div class="items">' + Object.keys(FACTIONS).map(k => { const f = FACTIONS[k]; return `<div class="item"><div><div class="nm"><i class="dot" style="background:${f.c}"></i>${f.n}<span class="q">${f.gang ? 'банда' : 'фракция'}</span></div><div class="ef">${f.d}</div><div class="ef">Базы: ${f.bases.join(', ')}</div></div><div class="bt"><span class="rep${g.rep[k] <= -20 ? ' bad' : ''}">${repWord(k)}<br><b class="mono">${Math.round(g.rep[k])}</b></span></div></div>`; }).join('') + '</div>'
    + `<p class="desc">Торговля поднимает отношение, убийство людей фракции — роняет. От банды можно откупиться талонами прямо в стычке. Торговец сидит в «Фактории» внутри города-базы.</p><button class="sbtn" data-act="togf">${showF ? 'Скрыть территории на карте' : 'Показать территории на карте'}</button></div>`;
  h += `<div><h3>Итоги</h3><div class="kv"><span>Дней в пути</span><b class="mono">${dayNum()}</b><span>Пройдено</span><b class="mono">${fmtKm(g.stats.km)}</b><span>Побед</span><b class="mono">${g.stats.kills}</b><span>Обысков</span><b class="mono">${g.stats.searched}</b></div></div>`;
  h += '<div><h3>Журнал</h3><ul class="log">' + g.log.slice().reverse().map(e => { const a = e.t + 8; return `<li class="${e.k}"><time>д${Math.floor(a / 24) + 1} ${pad(Math.floor(a % 24))}:${pad(Math.floor(a % 1 * 60))}</time><span>${esc(e.m)}</span></li>`; }).join('') + '</ul></div>';
  h += confirmNew ? '<div class="rbt"><button class="btn row" data-act="newyes">Да, начать заново</button><button class="btn row" data-act="newno">Отмена</button></div>' : '<button class="sbtn ghost" data-act="newgame">Новая игра</button>';
  return h;
}
const TITLES = { place: 'Место', inv: 'Рюкзак', camp: 'Лагерь', char: 'Герой', world: 'Мир' };
function renderSheet(keep) {
  const sh = $('#sheet'); if (scr === 'map') { sh.hidden = true; sh.innerHTML = ''; return; }
  const old = keep ? [...sh.querySelectorAll('#sb, .pane')].map(e => e.scrollTop) : [];
  const body = scr === 'place' ? renderPlace() : scr === 'inv' ? renderInv() : scr === 'camp' ? renderCamp() : `<div class="panes one"><div class="pane">${scr === 'char' ? renderChar() : renderWorld()}</div></div>`;
  sh.hidden = false;
  sh.innerHTML = `<div class="shead"><span>${TITLES[scr]}</span><button class="xbtn" data-act="scr" data-arg="map" aria-label="Закрыть">✕</button></div><div id="sb">${body}</div>`;
  if (keep) [...sh.querySelectorAll('#sb, .pane')].forEach((e, i) => { if (old[i]) e.scrollTop = old[i]; });
}
function render() {
  renderHud(); renderNav(); renderRoute(); renderSheet(true);
  if (g.combat) renderCombat(); else if (modalOpen() && $('#modal').dataset.kind === 'trade') renderTrade();
  else if (g.perkPts > 0 && !trip && !g.over && !modalOpen() && perkSnooze !== g.lvl) showPerk();
}

/* ---------- бой, торговля, конец ---------- */
const TER1 = ['x:wcar', 't:taiga', 'x:rad'];
function renderCombat() {
  const c = g.combat; if (!c) return;
  const me = c.un[0], mw = cWeapon('melee'), rw = cWeapon('ranged'), w = (c.mode === 'ranged' && rw) || mw, ranged = !!w.acc, reach = c.moved ? {} : cReach(c, me, cSteps()), foes = cFoes(c);
  let grid = '';
  for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) {
    const t = c.cells[y][x], u = cUnitAt(c, x, y); let cls = 'bc t' + t, inner = '';
    if (t === 1) inner += `<span class="ter">${art(TER1[(x * 3 + y) % 3])}</span>`; else if (t === 2) inner += `<span class="ter">${art('t:steppe')}</span>`; else if (t === 3) inner += `<span class="ter">${art('t:desert')}</span>`; else if (t === 4) inner += '<span class="tm bad">✕</span>'; else if (t === 5) inner += '<span class="tm">⇲</span>';
    if (u && u.me) inner += `<span class="un me">${uiIcon('person', '#1b1206')}</span>`;
    else if (u) { if (cCanHit(c, me, u, w.r, ranged)) cls += ' tg'; inner += `<span class="un foe">${art('e:' + u.k) || uiIcon('person', '#fff')}</span><span class="uh"><i style="width:${clamp(u.hp / u.max * 100, 0, 100)}%"></i></span>`; }
    else if (reach[x + ',' + y]) cls += ' mv';
    grid += `<button class="${cls}" data-act="cb" data-arg="cell:${x},${y}">${inner}</button>`;
  }
  const wb = (m, ww) => ww ? btn('cb', ww.n, `урон ${ww.dmg[0]}–${ww.dmg[1]} · ${ww.ap} ОД · дальность ${ww.r}${ww.ammo ? ' · патронов ' + (g.inv[ww.ammo] || 0) : ''}`, ww.ammo && !has(ww.ammo), c.mode === m || (m === 'melee' && !rw) ? 'sel' : '', 'mode:' + m) : '';
  const canHeal = (g.wounds.some(x => x.bl > 0 && !x.b) && (has('bandage') || has('ragband'))) || has('medkit'), gang = c.f && FACTIONS[c.f].gang, onExit = c.cells[me.y][me.x] === 5, onT = c.cells[me.y][me.x];
  $('#modal').dataset.kind = 'combat';
  showModal(`<div class="card battle"><div class="bt">
    <div class="bside"><div class="eyebrow">Ход ${c.turn}${c.f ? ' · ' + FACTIONS[c.f].n : ''}</div>
      <div><div class="hpline"><span>Здоровье</span><span class="mono">${Math.max(0, Math.round(g.s.hp))} / ${maxHp()}</span></div><div class="hp you"><i style="width:${clamp(g.s.hp, 0, 100)}%"></i></div></div>
      ${c.armMax ? `<div><div class="hpline"><span>Броня</span><span class="mono">${Math.round(c.arm)} / ${c.armMax}</span></div><div class="hp arm"><i style="width:${c.arm / c.armMax * 100}%"></i></div></div>` : ''}
      <div class="hpline"><span>Очки действия</span><span class="aps">${[0, 1, 2, 3, 4].map(i => `<i class="${i < c.ap ? 'on' : ''}"></i>`).join('')}</span></div>
      <div class="ef">${c.moved ? 'Перемещение в этом ходу использовано.' : `Перемещение: до ${cSteps()} клеток, бесплатно.`}${onT === 2 ? ' Ты в укрытии.' : onT === 3 ? ' Ты на высоте: +1 к дальности.' : ''}</div>
      ${btn('cb', 'Конец хода', 'следующий ход: +2 ОД', false, 'primary', 'end')}
      ${wb('melee', mw)}${wb('ranged', rw)}
      ${btn('cb', 'Лечиться', canHeal ? '1 ОД · бинт или аптечка' : 'нечем', !canHeal || c.ap < 1, '', 'heal')}
      ${onExit ? btn('cb', 'Уйти с поля', 'ты на выходе', false, 'primary', 'exit') : ''}
      ${gang ? btn('cb', 'Откупиться', `${bribeCost()} талонов (есть ${g.inv.coupon || 0})`, !has('coupon', bribeCost()), '', 'bribe') : ''}
    </div>
    <div class="bgrid">${grid}</div>
    <div class="bside"><div class="eyebrow">Противники</div>
      ${foes.map(u => { const e = ENEMIES[u.k]; return `<div class="frow"><span class="fp">${art('e:' + u.k)}</span><div><div class="nm">${e.n}</div><div class="hp"><i style="width:${clamp(u.hp / u.max * 100, 0, 100)}%"></i></div><div class="ef">${Math.max(0, u.hp)} зд.${u.arm > 0 ? ' · броня ' + Math.round(u.arm) : ''} · ${cheb(me, u)} кл.${cCanHit(c, me, u, w.r, ranged) ? ' · ' + Math.round(cAcc(c, w, u) * 100) + '%' : ''}</div></div></div>`; }).join('')}
      <ul class="clog">${c.log.slice(-5).map(m => `<li>${esc(m)}</li>`).join('')}</ul>
      <div class="ef">Зелёные клетки — куда можно шагнуть. Красная рамка — кого достаёшь выбранным оружием. Куст — укрытие от пуль, бархан — высота, ✕ — ловушка, ⇲ — выход.</div>
    </div></div></div>`);
}
function renderTrade() {
  const f = baseHere(); if (!f || !canTrade(f)) return hideModal();
  const s = stockOf(), F = FACTIONS[f]; let rows = '';
  if (tradeTab === 'buy') { const ks = Object.keys(s.it); rows = ks.length ? ks.map(k => { const p = buyPrice(k, f); return `<div class="item"><div class="irow"><span class="mic">${icon(k)}</span><div><div class="nm">${ITEMS[k].n}<span class="q">×${qty(s.it[k])}</span></div><div class="ef">${itemDesc(k)}</div></div></div><div class="bt"><button class="sbtn" data-act="buy" data-arg="${k}"${has('coupon', p) ? '' : ' disabled'}>${p} т.</button></div></div>`; }).join('') : '<p class="desc">Прилавок пуст.</p>'; }
  else { const ks = Object.keys(g.inv).filter(k => k !== 'coupon'); rows = ks.length ? ks.map(k => `<div class="item"><div class="irow"><span class="mic">${icon(k)}</span><div><div class="nm">${ITEMS[k].n}<span class="q">×${qty(g.inv[k])}</span></div></div></div><div class="bt"><button class="sbtn" data-act="sell" data-arg="${k}">+${sellPrice(k, f)} т.</button></div></div>`).join('') : '<p class="desc">Продавать нечего.</p>'; }
  const old = $('#tsc') ? $('#tsc').scrollTop : 0;
  $('#modal').dataset.kind = 'trade';
  showModal(`<div class="card tall"><div class="eyebrow" style="color:${F.c}">${F.n} · ${repWord(f)}</div><div class="hpline"><h3 class="big">Обмен</h3><span class="mono">талонов: ${g.inv.coupon || 0}</span></div>
    <div class="tabs two"><button class="${tradeTab === 'buy' ? 'on' : ''}" data-act="ttab" data-arg="buy">Купить</button><button class="${tradeTab === 'sell' ? 'on' : ''}" data-act="ttab" data-arg="sell">Продать</button></div>
    <div class="items scroll" id="tsc">${rows}</div><button class="btn row" data-act="closemodal">Закрыть</button></div>`);
  $('#tsc').scrollTop = old;
}
function showOver() { const o = g.over; $('#modal').dataset.kind = 'over'; showModal(`<div class="card"><div class="eyebrow">Конец пути</div><h3 class="big">Ты не выжил</h3><p class="desc">${esc(o.reason)}.</p><div class="kv"><span>Дней</span><b class="mono">${dayNum()}</b><span>Пройдено</span><b class="mono">${fmtKm(g.stats.km)}</b><span>Побед</span><b class="mono">${g.stats.kills}</b></div><button class="btn row primary" data-act="newyes">Начать заново</button></div>`); }

/* ---------- действия ---------- */
function focusCity() { const c = curHere.city; if (c && cw) { cam.follow = false; cam.x = c.x; cam.y = c.y; cam.z = clamp(Math.min(cw, ch) * .96 / (2 * c.r), 2, ZMAX); } else { cam.follow = true; if (cam.z < 2) cam.z = 6; } }
function fresh() { hideModal(); newGame(); sel = null; pick = null; stn = null; perkSnooze = 0; scr = 'map'; confirmNew = false; cam.x = g.pos.x; cam.y = g.pos.y; focusCity(); save(); render(); }
const FREE = { scr: 1, cat: 1, stn: 1, rsel: 1, 'q-': 1, 'q+': 1, pickinv: 1, pickeq: 1, use: 1, equip: 1, unequip: 1, togf: 1, newgame: 1, newno: 1 };
function act(a, arg) {
  if (a === 'zin' || a === 'zout') { cam.z = clamp(cam.z * (a === 'zin' ? 1.6 : 1 / 1.6), zMin(), ZMAX); return; }
  if (a === 'center') { focusCity(); return; }
  if (a === 'newyes') return fresh();
  if (a === 'cb') { const p = String(arg).split(':'); return cAct(p[0], p[1]); }
  if (a === 'stop') return stopTrip('Остановился.');
  if (a === 'closemodal') { hideModal(); return render(); }
  if (a === 'ttab') { tradeTab = arg; return renderTrade(); }
  if (a === 'buy') return actBuy(arg); if (a === 'sell') return actSell(arg);
  if (a === 'perk') { hideModal(); return actPerk(arg); }
  if (a === 'perklater') { perkSnooze = g.lvl; return hideModal(); }
  if (g.over || g.combat || modalOpen()) return;
  if (trip && !FREE[a]) return toast('Сначала остановись.', '');
  switch (a) {
    case 'scr': scr = scr === arg ? 'map' : arg; pick = null; stn = null; confirmNew = false; renderNav(); renderRoute(); renderSheet(false); break;
    case 'go': if (sel && startTrip(sel.x, sel.y)) { cam.follow = !(curHere.city && hyp(sel.x - curHere.city.x, sel.y - curHere.city.y) <= curHere.city.r); scr = 'map'; renderNav(); renderSheet(false); renderRoute(); } break;
    case 'unsel': sel = null; renderRoute(); break;
    case 'fire': actFire(); break; case 'stoke': actStoke(); break; case 'rest': actRest(+arg); break;
    case 'water': actWater(); break; case 'wood': actWood(); break; case 'forage': actForage(); break; case 'hunt': actHunt(); break; case 'fish': actFish(); break;
    case 'park': actPark(); break; case 'board': actBoard(); break;
    case 'search': actSearch(); break; case 'trade': tradeTab = 'buy'; renderTrade(); break;
    case 'pick': actPick(arg); break; case 'pickall': actPickAll(); break;
    case 'pickinv': pick = pick && pick.t === 'inv' && pick.k === arg ? null : { t: 'inv', k: arg }; renderSheet(true); break;
    case 'pickeq': pick = pick && pick.t === 'eq' && pick.k === arg ? null : { t: 'eq', k: arg }; renderSheet(true); break;
    case 'use': actUse(arg); break; case 'equip': actEquip(arg); break; case 'unequip': actUnequip(arg); break;
    case 'drop': actDrop(arg, false); break; case 'dropall': actDrop(arg, true); break;
    case 'cat': invCat = arg; pick = null; renderSheet(true); break; case 'stn': stn = arg || null; rsel = null; rqty = 1; renderSheet(false); break; case 'rsel': rsel = arg; rqty = 1; renderSheet(true); break;
    case 'q-': rqty--; renderSheet(true); break; case 'q+': rqty++; renderSheet(true); break;
    case 'upg': actUpgrade(arg); break; case 'perkopen': showPerk(); break;
    case 'treat': { const p = arg.split(':'); actTreat(+p[0], p[1]); break; }
    case 'craft': actCraft(arg, rqty); rqty = 1; break;
    case 'togf': showF = !showF; renderSheet(true); break;
    case 'newgame': confirmNew = true; renderSheet(true); break; case 'newno': confirmNew = false; renderSheet(true); break;
  }
}
document.addEventListener('click', e => { const b = e.target.closest('[data-act]'); if (b && !b.disabled) act(b.dataset.act, b.dataset.arg); });
UIH.toast = toast; UIH.refresh = render; UIH.combat = () => { renderHud(); renderCombat(); }; UIH.over = showOver;
UIH.tripEnd = arrived => { if (sel && hyp(sel.x - g.pos.x, sel.y - g.pos.y) < .3) sel = null; if (arrived && curHere.site) scr = 'place'; if (arrived && curHere.city && cam.z < 2) focusCity(); };

/* ---------- карта ---------- */
const cv = $('#map'), cx = cv.getContext('2d'), cam = { x: 0, y: 0, z: 8, follow: true }, ZMAX = 30;
let cw = 0, ch = 0, dpr = 1, terrain = null, detail = null, vcx = 0, vcy = 0;
const INK = '#3a332a', PAPER = '#f4eedc', REDP = '#cf4428', SEA = '#587c91', INKP = ['#3a332a', '#8a7f6d', '#f4eedc'];
const zMin = () => Math.max(.03, cw / W * .95);
function resize() { const r = cv.getBoundingClientRect(); dpr = Math.min(2, window.devicePixelRatio || 1); cw = r.width; ch = r.height; cv.width = Math.max(1, Math.round(cw * dpr)); cv.height = Math.max(1, Math.round(ch * dpr)); }
function buildTerrain() {
  const S = 10, w = Math.ceil(W / S), h = Math.ceil(H / S); terrain = document.createElement('canvas'); terrain.width = w; terrain.height = h;
  const c = terrain.getContext('2d'), img = c.createImageData(w, h), d = img.data, COL = { tundra: [152, 160, 146], taiga: [92, 118, 90], forest: [120, 142, 94], steppe: [172, 160, 104], desert: [198, 176, 124] };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const ll = unproj(x * S, y * S), col = COL[biome(ll[0], ll[1])], k = .8 + fbm(x / 22, y / 22) * .28 + fbm(x / 5, y / 5) * .14, i = (y * w + x) * 4; d[i] = col[0] * k; d[i + 1] = col[1] * k; d[i + 2] = col[2] * k; d[i + 3] = 255; }
  c.putImageData(img, 0, 0);
  const P = 128, dc = document.createElement('canvas'); dc.width = dc.height = P; const dx = dc.getContext('2d'), im2 = dx.createImageData(P, P), e = im2.data;
  const pn = (u, v, per) => { const xi = Math.floor(u), yi = Math.floor(v), xf = u - xi, yf = v - yi, s = t => t * t * (3 - 2 * t), hh = (a, b) => D.hash2(((a % per) + per) % per, ((b % per) + per) % per + 77), a = hh(xi, yi), b = hh(xi + 1, yi), cc = hh(xi, yi + 1), dd = hh(xi + 1, yi + 1), uu = s(xf), vv = s(yf); return a + (b - a) * uu + (cc - a) * vv + (a - b - cc + dd) * uu * vv; };
  for (let y = 0; y < P; y++) for (let x = 0; x < P; x++) { const n = pn(x / 16, y / 16, 8) * .5 + pn(x / 6.4, y / 6.4, 20) * .3 + pn(x / 2.56, y / 2.56, 50) * .2, i = (y * P + x) * 4, v = n > .5 ? 255 : 0; e[i] = e[i + 1] = e[i + 2] = v; e[i + 3] = Math.min(60, Math.abs(n - .5) * 2 * 110); }
  dx.putImageData(im2, 0, 0); detail = cx.createPattern(dc, 'repeat');
}
function viewCenter() { return [cw / 2, ch / 2]; }
const S2 = (x, y) => [(x - cam.x) * cam.z + vcx, (y - cam.y) * cam.z + vcy];
function path(p, close) { cx.beginPath(); for (let i = 0; i < p.length; i++) { const sx = (p[i][0] - cam.x) * cam.z + vcx, sy = (p[i][1] - cam.y) * cam.z + vcy; if (i) cx.lineTo(sx, sy); else cx.moveTo(sx, sy); } if (close) cx.closePath(); }
function label(t, x, y, col, font, align) { cx.font = font || '600 11px "Golos Text", system-ui, sans-serif'; cx.textAlign = align || 'center'; cx.textBaseline = 'top'; cx.lineWidth = 3; cx.lineJoin = 'round'; cx.strokeStyle = 'rgba(244,238,220,.9)'; cx.strokeText(t, x, y); cx.fillStyle = col || INK; cx.fillText(t, x, y); }
function box(sx, sy, s, fill, stroke, lw) { const r = s / 2; cx.beginPath(); cx.moveTo(sx - r + 3, sy - r); cx.arcTo(sx + r, sy - r, sx + r, sy + r, 3); cx.arcTo(sx + r, sy + r, sx - r, sy + r, 3); cx.arcTo(sx - r, sy + r, sx - r, sy - r, 3); cx.arcTo(sx - r, sy - r, sx + r, sy - r, 3); cx.closePath(); cx.fillStyle = fill; cx.fill(); cx.lineWidth = lw || 1.3; cx.strokeStyle = stroke; cx.stroke(); }
function drawSite(s, sx, sy, sz) {
  const st = g.sites[s.id], empty = st && st.s <= 0 && s.t !== 'base', cur = curHere.site === s, isSel = sel && sel.id === s.id;
  const key = s.t === 'house' && ART['h:' + s.v] ? 'h:' + s.v : 'b:' + s.t;
  if (ART[key]) {
    cx.fillStyle = 'rgba(40,36,30,.25)'; cx.beginPath(); cx.ellipse(sx, sy + sz * .3, sz * .4, sz * .13, 0, 0, 7); cx.fill();
    cx.globalAlpha = empty ? .42 : 1; const ok = drawArt(cx, key, sx, sy, sz); cx.globalAlpha = 1;
    if (ok) { if (s.t === 'base') { cx.beginPath(); cx.arc(sx, sy, sz * .6, 0, 7); cx.strokeStyle = FACTIONS[CITY[s.city].f].c; cx.lineWidth = 2.4; cx.stroke(); } if (cur || isSel) { cx.beginPath(); cx.arc(sx, sy, sz * .68, 0, 7); cx.strokeStyle = REDP; cx.lineWidth = 2.2; cx.stroke(); } return; }
  }
  const b = Math.min(sz, 20); box(sx, sy, b, empty ? '#d9d1bc' : PAPER, s.t === 'base' ? FACTIONS[CITY[s.city].f].c : INK, s.t === 'base' ? 2.2 : 1.3);
  const im = glyphImg(BICON[s.t], INKP); if (im.complete && im.naturalWidth) { cx.globalAlpha = empty ? .35 : 1; cx.drawImage(im, sx - b * .34, sy - b * .34, b * .68, b * .68); cx.globalAlpha = 1; }
  if (cur || isSel) { cx.beginPath(); cx.arc(sx, sy, b * .9, 0, 7); cx.strokeStyle = REDP; cx.lineWidth = 2; cx.stroke(); }
}
const siteSize = (c, z) => clamp(c.grid.s * z * 1.42, 24, 130);
const TDENS = { forest: .15, taiga: .12, steppe: .55, tundra: .5, desert: .6 }, TSIZE = { forest: 46, taiga: 46, steppe: 34, tundra: 36, desert: 40 };
function draw() {
  const z = cam.z;
  cx.setTransform(dpr, 0, 0, dpr, 0, 0); cx.fillStyle = SEA; cx.fillRect(0, 0, cw, ch);
  const o = S2(0, 0); cx.imageSmoothingEnabled = true; cx.drawImage(terrain, o[0], o[1], W * z, H * z);
  if (detail) { cx.save(); cx.translate(-((cam.x * z) % 128), -((cam.y * z) % 128)); cx.fillStyle = detail; cx.fillRect(-128, -128, cw + 384, ch + 384); cx.restore(); }
  cx.lineJoin = 'round'; cx.lineCap = 'round';
  cx.fillStyle = SEA; cx.strokeStyle = '#2f4a5a'; cx.lineWidth = 1.5;
  for (const p of SEAS) { path(p, true); cx.fill(); cx.stroke(); }
  cx.fillStyle = '#9aa091'; for (const p of ISLES) { path(p, true); cx.fill(); cx.stroke(); }
  cx.fillStyle = SEA; for (const p of LAKES) { path(p, true); cx.fill(); cx.stroke(); }
  const rw = clamp(z * 3, 1.5, 9);
  cx.strokeStyle = '#2f4a5a'; cx.lineWidth = rw + 2; for (const r of RIVERS) { path(r, false); cx.stroke(); }
  cx.strokeStyle = '#6a93aa'; cx.lineWidth = rw; for (const r of RIVERS) { path(r, false); cx.stroke(); }
  const vis = CITIES.filter(c => { const p = S2(c.x, c.y), r = c.r * z; return p[0] + r > -90 && p[1] + r > -40 && p[0] - r < cw + 90 && p[1] - r < ch + 40; });
  // растительность и рельеф: рисованные островки по сетке
  {
    const sp = Math.max(1.4, 44 / z), x0 = Math.floor((cam.x - vcx / z) / sp) - 1, x1 = Math.ceil((cam.x + (cw - vcx) / z) / sp) + 1, y0 = Math.floor((cam.y - vcy / z) / sp) - 1, y1 = Math.ceil((cam.y + (ch - vcy) / z) / sp) + 1, lod = Math.round(Math.log2(sp) * 2);
    for (let gy = y0; gy <= y1; gy++) for (let gx = x0; gx <= x1; gx++) {
      const hx = D.hash2(gx * 7 + lod * 31, gy * 13 + 5), hy = D.hash2(gx * 11 + 3, gy * 5 + lod * 17), wx = (gx + hx) * sp, wy = (gy + hy) * sp;
      if (wx < 0 || wy < 0 || wx > W || wy > H || isWater(wx, wy) || vis.some(c => hyp(c.x - wx, c.y - wy) < c.r + sp * .3)) continue;
      const ll = unproj(wx, wy), b = biome(ll[0], ll[1]); if (D.hash2(gx * 3 + 9, gy * 17 + lod) < TDENS[b]) continue;
      drawArt(cx, 't:' + b, (wx - cam.x) * z + vcx, (wy - cam.y) * z + vcy, TSIZE[b] * (.8 + hx * .4));
    }
  }
  // дороги между городами
  const dw = clamp(z * 2.2, 1.4, 8);
  cx.strokeStyle = 'rgba(58,48,36,.75)'; cx.lineWidth = dw + 1.6; cx.beginPath(); for (const r of D.ROADS) { const a = S2(r[0].x, r[0].y), b = S2(r[1].x, r[1].y); cx.moveTo(a[0], a[1]); cx.lineTo(b[0], b[1]); } cx.stroke();
  cx.strokeStyle = '#b9a67c'; cx.lineWidth = dw; cx.stroke();
  // заражение
  for (const q of ZONES) { const [sx, sy] = S2(q.x, q.y), r = q.r * z; if (sx + r < 0 || sy + r < 0 || sx - r > cw || sy - r > ch) continue; const gr = cx.createRadialGradient(sx, sy, 0, sx, sy, r); gr.addColorStop(0, `rgba(214,190,40,${.16 + q.lvl * .07})`); gr.addColorStop(1, 'rgba(214,190,40,.05)'); cx.fillStyle = gr; cx.beginPath(); cx.arc(sx, sy, r, 0, 7); cx.fill(); cx.setLineDash([5, 5]); cx.strokeStyle = 'rgba(232,206,60,.85)'; cx.lineWidth = 1.5; cx.stroke(); cx.setLineDash([]); }
  // территории
  if (showF) for (const b of D.BASES) { const [sx, sy] = S2(b.x, b.y), r = b.r * z; if (sx + r < 0 || sy + r < 0 || sx - r > cw || sy - r > ch) continue; cx.beginPath(); cx.arc(sx, sy, r, 0, 7); cx.setLineDash([2, 6]); cx.strokeStyle = FACTIONS[b.f].c; cx.globalAlpha = .95; cx.lineWidth = 1.8; cx.stroke(); cx.globalAlpha = .06; cx.fillStyle = FACTIONS[b.f].c; cx.fill(); cx.globalAlpha = 1; cx.setLineDash([]); }
  // города
  let focus = null;
  for (const c of vis) {
    const [sx, sy] = S2(c.x, c.y), r = c.r * z, G = c.grid;
    if (r > 44) {
      if (r * 2 > Math.min(cw, ch) * .6) focus = [sx, sy, r];
      cx.save(); cx.beginPath(); cx.arc(sx, sy, r, 0, 7); cx.fillStyle = '#b39c74'; cx.fill(); cx.clip();
      if (detail) { cx.save(); cx.translate(-((cam.x * z) % 128), -((cam.y * z) % 128)); cx.fillStyle = detail; cx.fillRect(-128, -128, cw + 384, ch + 384); cx.restore(); }
      // улицы изометрической сеткой: кварталы 3×2 участка
      const s = G.s * z, m = Math.ceil(c.r / G.s) + 3, wst = clamp(s * .2, 2, 16);
      const streets = (col, add, dash) => { cx.strokeStyle = col; cx.setLineDash(dash || []); cx.lineWidth = wst + add; cx.beginPath();
        for (let i = -m; i <= m; i++) { if ((((i - G.ph[0]) % 3) + 3) % 3) continue; cx.moveTo(sx + (i + m) * s, sy + (i - m) * s * .5); cx.lineTo(sx + (i - m) * s, sy + (i + m) * s * .5); }
        for (let j = -m; j <= m; j++) { if ((((j - G.ph[1]) % 2) + 2) % 2) continue; cx.moveTo(sx + (-m - j) * s, sy + (-m + j) * s * .5); cx.lineTo(sx + (m - j) * s, sy + (m + j) * s * .5); }
        cx.stroke(); cx.setLineDash([]); };
      streets('#4a443a', 3); streets('#7d776b', 0); if (wst > 6) streets('rgba(228,220,198,.5)', -wst + 1.3, [9, 11]);
      const sz = siteSize(c, z);
      for (const d of c.deco) { const p = S2(d.x, d.y); if (p[0] < -40 || p[1] < -40 || p[0] > cw + 40 || p[1] > ch + 40) continue; drawArt(cx, d.t, p[0], p[1] - sz * .08, sz * d.k); }
      for (const st of c.sitesY) { const p = S2(st.x, st.y); if (p[0] < -70 || p[1] < -70 || p[0] > cw + 70 || p[1] > ch + 70) continue; drawSite(st, p[0], p[1] - sz * .14, sz); }
      const sh = cx.createRadialGradient(sx, sy, r * .78, sx, sy, r); sh.addColorStop(0, 'rgba(30,22,12,0)'); sh.addColorStop(1, 'rgba(30,22,12,.5)'); cx.fillStyle = sh; cx.fillRect(sx - r, sy - r, r * 2, r * 2);
      cx.restore();
      cx.beginPath(); cx.arc(sx, sy, r, 0, 7); cx.lineWidth = 7; cx.strokeStyle = '#1f1a14'; cx.stroke(); cx.lineWidth = 2.5; cx.strokeStyle = c.f ? FACTIONS[c.f].c : '#cdbf9a'; cx.stroke();
      for (const st of c.sites) if (curHere.site === st || (sel && sel.id === st.id)) { const p = S2(st.x, st.y); label(st.n, p[0], p[1] + sz * .34, INK, '600 11px "Golos Text", system-ui, sans-serif'); }
      label(c.n, sx, clamp(sy - r - 22, 6, ch - 30), INK, '600 14px "Unbounded", "Golos Text", sans-serif');
    } else {
      const rp = Math.max(c.size * 1.5 + 3, r); cx.beginPath(); cx.arc(sx, sy, rp, 0, 7); cx.fillStyle = '#b39c74'; cx.fill(); cx.lineWidth = c.size === 3 ? 3 : 2.2; cx.strokeStyle = '#1f1a14'; cx.stroke(); if (c.f) { cx.lineWidth = 1.4; cx.strokeStyle = FACTIONS[c.f].c; cx.stroke(); }
      if (rp > 9) drawArt(cx, 'h:' + (hashStr(c.n) & 3), sx, sy, rp * 1.7); else { cx.beginPath(); cx.arc(sx, sy, Math.min(2.5, rp * .4), 0, 7); cx.fillStyle = '#1f1a14'; cx.fill(); }
      if (c.size === 3 || z > .22 || (c.size === 2 && z > .1)) label(c.n, sx, sy + rp + 3, INK, c.size === 3 ? '600 12.5px "Golos Text", system-ui, sans-serif' : null);
    }
  }
  if (focus) { cx.beginPath(); cx.rect(0, 0, cw, ch); cx.moveTo(focus[0] + focus[2] + 4, focus[1]); cx.arc(focus[0], focus[1], focus[2] + 4, 0, Math.PI * 2, true); cx.closePath(); cx.fillStyle = 'rgba(8,14,26,.42)'; cx.fill(); }
  // одиночные точки
  if (z > .28) for (const p of POIS) { if (!g.found[p.id]) continue; const [sx, sy] = S2(p.x, p.y); if (sx < -40 || sy < -20 || sx > cw + 40 || sy > ch + 20) continue; if (z > 1.2) { const sz = clamp(z * 9, 30, 60); drawSite(p.site, sx, sy, sz); if (z > 2.5) label(p.n, sx, sy + sz * .5, INK, '500 10.5px "Golos Text", system-ui, sans-serif'); } else { cx.fillStyle = PAPER; cx.strokeStyle = '#2a251e'; cx.lineWidth = 1.2; cx.fillRect(sx - 3, sy - 3, 6, 6); cx.strokeRect(sx - 3, sy - 3, 6, 6); } }
  // ночь
  const dk = (1 - clamp(Math.sin((hour() - 6) / 15 * Math.PI), 0, 1)) * .45; if (dk > .01) { cx.fillStyle = `rgba(10,16,40,${dk})`; cx.fillRect(0, 0, cw, ch); }
  // маршрут, костёр, транспорт, игрок
  const P = S2(g.pos.x, g.pos.y);
  if (sel) { const e = trip ? { x: trip.tx, y: trip.ty } : clipRoute(g.pos.x, g.pos.y, sel.x, sel.y), E = S2(e.x, e.y); cx.beginPath(); cx.moveTo(P[0], P[1]); cx.lineTo(E[0], E[1]); cx.setLineDash([7, 5]); cx.strokeStyle = PAPER; cx.lineWidth = 4.5; cx.stroke(); cx.strokeStyle = REDP; cx.lineWidth = 2.4; cx.stroke(); cx.setLineDash([]); cx.beginPath(); cx.moveTo(E[0] - 5, E[1] - 5); cx.lineTo(E[0] + 5, E[1] + 5); cx.moveTo(E[0] + 5, E[1] - 5); cx.lineTo(E[0] - 5, E[1] + 5); cx.stroke(); }
  if (g.fire && g.time < g.fire.until) { const [sx, sy] = S2(g.fire.x, g.fire.y); if (!drawArt(cx, 's:fire', sx + 16, sy - 14, 26)) { cx.fillStyle = '#e07a2c'; cx.beginPath(); cx.arc(sx + 11, sy - 11, 3.5, 0, 7); cx.fill(); } }
  if (g.veh && g.veh.parked) { const [sx, sy] = S2(g.veh.parked.x, g.veh.parked.y); if (!drawArt(cx, 'v:' + g.veh.t, sx, sy, 34)) box(sx, sy, 18, PAPER, '#2f6f9f', 2); }
  const pr = RM ? 13 : 12 + Math.sin(performance.now() / 420) * 3; cx.beginPath(); cx.arc(P[0], P[1], pr, 0, 7); cx.strokeStyle = 'rgba(244,238,220,.9)'; cx.lineWidth = 2; cx.stroke();
  cx.beginPath(); cx.arc(P[0], P[1], 6.5, 0, 7); cx.fillStyle = REDP; cx.fill(); cx.lineWidth = 2.4; cx.strokeStyle = PAPER; cx.stroke();
  // масштаб
  const kmv = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000].find(k => k * z >= 46) || 2000, bl = kmv * z, bx = 12, by = ch - 14;
  cx.strokeStyle = PAPER; cx.lineWidth = 3.4; cx.beginPath(); cx.moveTo(bx, by - 4); cx.lineTo(bx, by); cx.lineTo(bx + bl, by); cx.lineTo(bx + bl, by - 4); cx.stroke(); cx.strokeStyle = INK; cx.lineWidth = 1.6; cx.stroke(); label(kmv + ' км', bx + bl / 2, by - 17, INK, '600 10.5px "JetBrains Mono", monospace');
}
function tapAt(sx, sy) {
  if (trip || g.over || g.combat || modalOpen()) return;
  const z = cam.z, wx = cam.x + (sx - vcx) / z, wy = cam.y + (sy - vcy) / z, tol = 16 / z;
  let best = null, bd = 1e9;
  const city = CITIES.find(c => hyp(c.x - wx, c.y - wy) <= Math.max(c.r, tol));
  if (city) { const fine = city.r * z > 44, tl = Math.max(tol, city.grid.s * .75); for (const s of city.sites) { const d = hyp(s.x - wx, s.y - wy); if ((fine ? d <= tl : true) && d < bd) { bd = d; best = { x: s.x, y: s.y, n: s.n + ', ' + city.n, id: s.id }; } } }
  if (!best) for (const p of POIS) { if (!g.found[p.id]) continue; const d = hyp(p.x - wx, p.y - wy); if (d <= Math.max(2, tol) && d < bd) { bd = d; best = { x: p.x, y: p.y, n: p.n, id: p.id }; } }
  if (!best) { if (isWater(wx, wy)) return toast('Там вода.', ''); best = { x: wx, y: wy, n: city ? 'Улицы, ' + city.n : null }; }
  sel = best; scr = 'map'; if (startTrip(sel.x, sel.y)) cam.follow = !(curHere.city && hyp(sel.x - curHere.city.x, sel.y - curHere.city.y) <= curHere.city.r); else sel = null;
  renderNav(); renderSheet(false); renderRoute();
}
const ptrs = new Map(); let drag = null, pinch = null;
cv.addEventListener('pointerdown', e => { try { cv.setPointerCapture(e.pointerId); } catch (_) { /* не критично */ } ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (ptrs.size === 1) drag = { x: e.clientX, y: e.clientY, moved: false }; else if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, z: cam.z }; if (drag) drag.moved = true; } });
cv.addEventListener('pointermove', e => {
  const p = ptrs.get(e.pointerId); if (!p) return; const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
  if (ptrs.size === 2 && pinch) { const [a, b] = [...ptrs.values()]; cam.z = clamp(pinch.z * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d, zMin(), ZMAX); return; }
  if (drag) { if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 6) drag.moved = true; if (drag.moved) { cam.x = clamp(cam.x - dx / cam.z, 0, W); cam.y = clamp(cam.y - dy / cam.z, 0, H); cam.follow = false; } }
});
const pUp = e => { if (!ptrs.has(e.pointerId)) return; ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null; if (!ptrs.size) { if (drag && !drag.moved && e.type === 'pointerup') { const r = cv.getBoundingClientRect(); tapAt(e.clientX - r.left, e.clientY - r.top); } drag = null; } };
cv.addEventListener('pointerup', pUp); cv.addEventListener('pointercancel', pUp);
cv.addEventListener('wheel', e => { e.preventDefault(); const r = cv.getBoundingClientRect(), mx = e.clientX - r.left - vcx, my = e.clientY - r.top - vcy, wx = cam.x + mx / cam.z, wy = cam.y + my / cam.z; cam.z = clamp(cam.z * Math.exp(-e.deltaY * .0015), zMin(), ZMAX); cam.x = clamp(wx - mx / cam.z, 0, W); cam.y = clamp(wy - my / cam.z, 0, H); cam.follow = false; }, { passive: false });

/* ---------- цикл ---------- */
let lastT = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(.1, (now - lastT) / 1000 || 0); lastT = now;
  if (!g || !cw) return;
  if (trip) {
    tripStep(dt);
    if (trip) { hudT += dt; if (hudT > .2) { hudT = 0; renderHud(); const left = hyp(trip.tx - g.pos.x, trip.ty - g.pos.y), ti = $('#tripInfo'), tb = $('#tripBar'); if (ti) ti.textContent = `осталось ${fmtKm(left)} · ${fmtH(left / moveMode().sp)}`; if (tb) tb.style.width = clamp((1 - left / trip.total) * 100, 0, 100) + '%'; } }
  }
  const vc = viewCenter(), k = RM ? 1 : .18; vcx += (vc[0] - vcx) * k; vcy += (vc[1] - vcy) * k;
  if (cam.follow) { const q = RM ? 1 : .12; cam.x += (g.pos.x - cam.x) * q; cam.y += (g.pos.y - cam.y) * q; }
  draw();
}
function boot(data) {
  g = (data && data.g && data.g.v === 5 ? data.g : null) || load() || newGame();
  g.combat = null; trip = null; locate(); discover();
  resize(); new ResizeObserver(resize).observe(cv);
  buildTerrain(); cam.x = g.pos.x; cam.y = g.pos.y; cam.z = 8; vcx = cw / 2; vcy = ch / 2; focusCity();
  scr = 'map'; render(); if (g.over) showOver();
  requestAnimationFrame(frame);
}
try { window.claude && window.claude.hot && window.claude.hot.snapshot && window.claude.hot.snapshot(() => ({ g })); } catch (e) { /* вне просмотрщика */ }
if (window.claude && window.claude.hot && window.claude.hot.ready) window.claude.hot.ready(boot); else boot((window.claude && window.claude.hot && window.claude.hot.data) || {});

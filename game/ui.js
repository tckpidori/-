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
    + (fresh ? '<span class="chip cold">Вода рядом</span>' : '') + (snowHere() ? '<span class="chip">Снег</span>' : '') + '</div></div>';
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
function renderCombat() {
  const c = g.combat; if (!c) return;
  if (!c.en[c.tgt] || c.en[c.tgt].hp <= 0) c.tgt = c.en.findIndex(x => x.hp > 0);
  const t = c.en[c.tgt], mk = g.eq.melee, mw = mk ? ITEMS[mk] : { n: 'Кулаки', reach: 2 }, rk = g.eq.ranged, rw = rk ? ITEMS[rk] : null, am = rw ? (g.inv[rw.ammo] || 0) : 0;
  const canHeal = (g.wounds.some(w => w.bl > 0 && !w.b) && (has('bandage') || has('ragband'))) || has('medkit'), gang = c.f && FACTIONS[c.f].gang;
  $('#modal').dataset.kind = 'combat';
  showModal(`<div class="card"><div class="eyebrow">Стычка${c.f ? ' · ' + FACTIONS[c.f].n : ''}</div>
    <div class="foes">${c.en.map((x, i) => { const e = ENEMIES[x.k]; return `<button class="foe${i === c.tgt ? ' on' : ''}${x.hp <= 0 ? ' dead' : ''}" data-act="cb" data-arg="tgt:${i}"${x.hp <= 0 ? ' disabled' : ''}><span class="fp">${art('e:' + x.k)}</span><span class="fn">${e.n}</span><span class="mono">${x.hp > 0 ? Math.round(x.d) + ' м' : 'убит'}</span><span class="hp"><i style="width:${clamp(x.hp / e.hp * 100, 0, 100)}%"></i></span></button>`; }).join('')}</div>
    <div class="hpline"><span>Ты</span><span class="mono">${Math.max(0, Math.round(g.s.hp))} / ${maxHp()}</span></div><div class="hp you"><i style="width:${clamp(g.s.hp, 0, 100)}%"></i></div>
    <ul class="clog">${c.log.slice(-5).map(m => `<li>${esc(m)}</li>`).join('')}</ul>
    <div class="cbtns">
      ${btn('cb', mw.n, t.d > mw.reach ? 'далеко' : Math.round(playerAcc(mw, t.d) * 100) + '%', false, t.d <= mw.reach ? 'primary' : '', 'melee')}
      ${btn('cb', rw ? rw.n : 'Нет ствола', rw ? (am ? `${Math.round(playerAcc(rw, t.d) * 100)}% · патронов ${am}` : 'нет патронов') : '', !rw || !am, rw && am && t.d > mw.reach ? 'primary' : '', 'ranged')}
      ${btn('cb', 'Сблизиться', '−8 м', false, '', 'near')}
      ${btn('cb', 'Отойти', '+5 м', false, '', 'far')}
      ${btn('cb', 'Лечиться', canHeal ? 'бинт или аптечка' : 'нечем', !canHeal, '', 'heal')}
      ${btn('cb', 'Бежать', Math.round(fleeChance() * 100) + '%', false, '', 'flee')}
      ${gang ? btn('cb', 'Откупиться', `${bribeCost()} талонов (есть ${g.inv.coupon || 0})`, !has('coupon', bribeCost()), 'wide', 'bribe') : ''}
    </div></div>`);
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
function fresh() { hideModal(); newGame(); sel = null; pick = null; stn = null; perkSnooze = 0; scr = 'map'; confirmNew = false; cam.x = g.pos.x; cam.y = g.pos.y; cam.z = 8; cam.follow = true; save(); render(); }
const FREE = { scr: 1, cat: 1, stn: 1, rsel: 1, 'q-': 1, 'q+': 1, pickinv: 1, pickeq: 1, use: 1, equip: 1, unequip: 1, togf: 1, newgame: 1, newno: 1 };
function act(a, arg) {
  if (a === 'zin' || a === 'zout') { cam.z = clamp(cam.z * (a === 'zin' ? 1.6 : 1 / 1.6), zMin(), ZMAX); return; }
  if (a === 'center') { cam.follow = true; return; }
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
    case 'go': if (sel && startTrip(sel.x, sel.y)) { cam.follow = true; scr = 'map'; renderNav(); renderSheet(false); renderRoute(); } break;
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
UIH.tripEnd = arrived => { if (sel && hyp(sel.x - g.pos.x, sel.y - g.pos.y) < .3) sel = null; if (arrived && curHere.site) scr = 'place'; };

/* ---------- карта ---------- */
const cv = $('#map'), cx = cv.getContext('2d'), cam = { x: 0, y: 0, z: 8, follow: true }, ZMAX = 30;
let cw = 0, ch = 0, dpr = 1, terrain = null, vcx = 0, vcy = 0;
const INK = '#3a332a', PAPER = '#f4eedc', REDP = '#cf4428', SEA = '#a9c3d2', INKP = ['#3a332a', '#8a7f6d', '#f4eedc'];
const zMin = () => Math.max(.03, cw / W * .95);
function resize() { const r = cv.getBoundingClientRect(); dpr = Math.min(2, window.devicePixelRatio || 1); cw = r.width; ch = r.height; cv.width = Math.max(1, Math.round(cw * dpr)); cv.height = Math.max(1, Math.round(ch * dpr)); }
function buildTerrain() {
  const S = 12, w = Math.ceil(W / S), h = Math.ceil(H / S); terrain = document.createElement('canvas'); terrain.width = w; terrain.height = h;
  const c = terrain.getContext('2d'), img = c.createImageData(w, h), d = img.data, COL = { tundra: [214, 217, 210], taiga: [178, 194, 164], forest: [194, 206, 166], steppe: [222, 210, 166], desert: [230, 212, 172] };
  const lv = new Uint8Array(w * h), bi = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const ll = unproj(x * S, y * S), n = fbm(x / 13, y / 13); lv[y * w + x] = Math.floor(n * 9); bi.push(COL[biome(ll[0], ll[1])]); }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x, col = bi[i], edge = (x + 1 < w && lv[i + 1] !== lv[i]) || (y + 1 < h && lv[i + w] !== lv[i]), k = (.95 + lv[i] * .012) * (edge ? .965 : 1); d[i * 4] = col[0] * k; d[i * 4 + 1] = col[1] * k; d[i * 4 + 2] = col[2] * k; d[i * 4 + 3] = 255; }
  c.putImageData(img, 0, 0);
}
function viewCenter() { return [cw / 2, ch / 2]; }
const S2 = (x, y) => [(x - cam.x) * cam.z + vcx, (y - cam.y) * cam.z + vcy];
function path(p, close) { cx.beginPath(); for (let i = 0; i < p.length; i++) { const sx = (p[i][0] - cam.x) * cam.z + vcx, sy = (p[i][1] - cam.y) * cam.z + vcy; if (i) cx.lineTo(sx, sy); else cx.moveTo(sx, sy); } if (close) cx.closePath(); }
function label(t, x, y, col, font, align) { cx.font = font || '600 11px "Golos Text", system-ui, sans-serif'; cx.textAlign = align || 'center'; cx.textBaseline = 'top'; cx.lineWidth = 3; cx.lineJoin = 'round'; cx.strokeStyle = 'rgba(244,238,220,.9)'; cx.strokeText(t, x, y); cx.fillStyle = col || INK; cx.fillText(t, x, y); }
function box(sx, sy, s, fill, stroke, lw) { const r = s / 2; cx.beginPath(); cx.moveTo(sx - r + 3, sy - r); cx.arcTo(sx + r, sy - r, sx + r, sy + r, 3); cx.arcTo(sx + r, sy + r, sx - r, sy + r, 3); cx.arcTo(sx - r, sy + r, sx - r, sy - r, 3); cx.arcTo(sx - r, sy - r, sx + r, sy - r, 3); cx.closePath(); cx.fillStyle = fill; cx.fill(); cx.lineWidth = lw || 1.3; cx.strokeStyle = stroke; cx.stroke(); }
function drawSite(s, sx, sy, big) {
  const st = g.sites[s.id], empty = st && st.s <= 0 && s.t !== 'base', cur = curHere.site === s, isSel = sel && sel.id === s.id;
  if (ART['b:' + s.t]) {
    const sz = big ? 46 : 30; cx.fillStyle = 'rgba(58,51,42,.22)'; cx.beginPath(); cx.ellipse(sx, sy + sz * .32, sz * .42, sz * .14, 0, 0, 7); cx.fill();
    cx.globalAlpha = empty ? .45 : 1; const ok = drawArt(cx, 'b:' + s.t, sx, sy, sz); cx.globalAlpha = 1;
    if (ok) { if (s.t === 'base') { cx.beginPath(); cx.arc(sx, sy, sz * .62, 0, 7); cx.strokeStyle = FACTIONS[CITY[s.city].f].c; cx.lineWidth = 2.2; cx.stroke(); } if (cur || isSel) { cx.beginPath(); cx.arc(sx, sy, sz * .7, 0, 7); cx.strokeStyle = REDP; cx.lineWidth = 2; cx.stroke(); } return sz; }
  }
  const sz = big ? 20 : 15;
  box(sx, sy, sz, empty ? '#d9d1bc' : PAPER, s.t === 'base' ? FACTIONS[CITY[s.city].f].c : INK, s.t === 'base' ? 2.2 : 1.3);
  const im = glyphImg(BICON[s.t], INKP); if (im.complete && im.naturalWidth) { cx.globalAlpha = empty ? .35 : 1; cx.drawImage(im, sx - sz * .34, sy - sz * .34, sz * .68, sz * .68); cx.globalAlpha = 1; }
  if (cur || isSel) { cx.beginPath(); cx.arc(sx, sy, sz * .9, 0, 7); cx.strokeStyle = REDP; cx.lineWidth = 2; cx.stroke(); }
  return sz;
}
function draw() {
  const z = cam.z;
  cx.setTransform(dpr, 0, 0, dpr, 0, 0); cx.fillStyle = SEA; cx.fillRect(0, 0, cw, ch);
  const o = S2(0, 0); cx.imageSmoothingEnabled = true; cx.drawImage(terrain, o[0], o[1], W * z, H * z);
  cx.fillStyle = SEA; cx.strokeStyle = '#6f93aa'; cx.lineWidth = 1.2; cx.lineJoin = 'round';
  for (const p of SEAS) { path(p, true); cx.fill(); cx.stroke(); }
  cx.fillStyle = '#d6d9d2'; for (const p of ISLES) { path(p, true); cx.fill(); cx.stroke(); }
  cx.fillStyle = SEA; for (const p of LAKES) { path(p, true); cx.fill(); cx.stroke(); }
  cx.strokeStyle = '#7fa3bb'; cx.lineWidth = clamp(z * 2.5, 1, 7); for (const r of RIVERS) { path(r, false); cx.stroke(); }
  const vis = CITIES.filter(c => { const p = S2(c.x, c.y), r = c.r * z; return p[0] + r > -80 && p[1] + r > -30 && p[0] - r < cw + 80 && p[1] - r < ch + 30; });
  // штриховка местности
  if (z > .8) {
    const sp = Math.max(1.5, 30 / z), x0 = Math.floor((cam.x - vcx / z) / sp), x1 = Math.ceil((cam.x + (cw - vcx) / z) / sp), y0 = Math.floor((cam.y - vcy / z) / sp), y1 = Math.ceil((cam.y + (ch - vcy) / z) / sp);
    cx.lineWidth = 1.1; cx.strokeStyle = 'rgba(70,92,60,.5)'; cx.fillStyle = 'rgba(110,100,70,.45)';
    for (let gy = y0; gy <= y1; gy++) for (let gx = x0; gx <= x1; gx++) {
      const hx = D.hash2(gx * 7 + 1, gy * 13 + 5), hy = D.hash2(gx * 11 + 3, gy * 5 + 9); if (hx < .25) continue;
      const wx = (gx + hx) * sp, wy = (gy + hy) * sp; if (isWater(wx, wy) || vis.some(c => hyp(c.x - wx, c.y - wy) < c.r)) continue;
      const ll = unproj(wx, wy), b = biome(ll[0], ll[1]), sx = (wx - cam.x) * z + vcx, sy = (wy - cam.y) * z + vcy;
      if (b === 'forest' || b === 'taiga') { cx.beginPath(); cx.moveTo(sx - 4, sy + 4); cx.lineTo(sx, sy - 5); cx.lineTo(sx + 4, sy + 4); if (b === 'taiga') { cx.moveTo(sx - 3, sy); cx.lineTo(sx + 3, sy); } cx.stroke(); }
      else if (b === 'steppe') { cx.fillRect(sx - 3, sy, 6, 1.2); } else if (b === 'tundra') { cx.fillRect(sx - 1, sy - 1, 2, 2); cx.fillRect(sx + 3, sy + 2, 2, 2); } else { cx.beginPath(); cx.arc(sx, sy, 3, Math.PI, 0); cx.strokeStyle = 'rgba(140,110,60,.45)'; cx.stroke(); cx.strokeStyle = 'rgba(70,92,60,.5)'; }
    }
  }
  // заражение
  for (const q of ZONES) { const [sx, sy] = S2(q.x, q.y), r = q.r * z; if (sx + r < 0 || sy + r < 0 || sx - r > cw || sy - r > ch) continue; const gr = cx.createRadialGradient(sx, sy, 0, sx, sy, r); gr.addColorStop(0, `rgba(200,130,30,${.14 + q.lvl * .06})`); gr.addColorStop(1, 'rgba(200,130,30,.05)'); cx.fillStyle = gr; cx.beginPath(); cx.arc(sx, sy, r, 0, 7); cx.fill(); cx.setLineDash([5, 5]); cx.strokeStyle = 'rgba(170,96,20,.75)'; cx.lineWidth = 1.3; cx.stroke(); cx.setLineDash([]); }
  // территории
  if (showF) for (const b of D.BASES) { const [sx, sy] = S2(b.x, b.y), r = b.r * z; if (sx + r < 0 || sy + r < 0 || sx - r > cw || sy - r > ch) continue; cx.beginPath(); cx.arc(sx, sy, r, 0, 7); cx.setLineDash([2, 6]); cx.strokeStyle = FACTIONS[b.f].c; cx.globalAlpha = .9; cx.lineWidth = 1.6; cx.stroke(); cx.globalAlpha = .07; cx.fillStyle = FACTIONS[b.f].c; cx.fill(); cx.globalAlpha = 1; cx.setLineDash([]); }
  // города
  for (const c of vis) {
    const [sx, sy] = S2(c.x, c.y), r = c.r * z;
    if (r > 44) {
      cx.save(); cx.beginPath(); cx.arc(sx, sy, r, 0, 7); cx.fillStyle = 'rgba(244,238,220,.6)'; cx.fill(); cx.clip();
      const rr = mulberry32(hashStr('st' + c.n)); cx.strokeStyle = 'rgba(58,51,42,.22)'; cx.lineWidth = clamp(z * .35, 1.5, 8);
      for (let i = 0; i < 4 + c.size * 2; i++) { const a = (i % 2 ? Math.PI / 2 : 0) + (rr() - .5) * .5, off = (rr() - .5) * 1.7 * r, nx = Math.cos(a + Math.PI / 2) * off, ny = Math.sin(a + Math.PI / 2) * off; cx.beginPath(); cx.moveTo(sx + nx - Math.cos(a) * r * 1.2, sy + ny - Math.sin(a) * r * 1.2); cx.lineTo(sx + nx + Math.cos(a) * r * 1.2, sy + ny + Math.sin(a) * r * 1.2); cx.stroke(); }
      cx.restore(); cx.beginPath(); cx.arc(sx, sy, r, 0, 7); cx.lineWidth = 2; cx.strokeStyle = c.f ? FACTIONS[c.f].c : INK; cx.stroke();
      for (const s of c.sites) { const p = S2(s.x, s.y); if (p[0] < -20 || p[1] < -20 || p[0] > cw + 20 || p[1] > ch + 20) continue; const dz = drawSite(s, p[0], p[1], z > 6); if (z > 9) label(s.n, p[0], p[1] + dz * .55 + 2, INK, '500 10.5px "Golos Text", system-ui, sans-serif'); }
      label(c.n, sx, sy - r - 18, INK, '600 13px "Unbounded", "Golos Text", sans-serif');
    } else {
      const rp = Math.max(c.size + 2, r); cx.beginPath(); cx.arc(sx, sy, rp, 0, 7); cx.fillStyle = 'rgba(244,238,220,.7)'; cx.fill(); cx.lineWidth = c.size === 3 ? 2.2 : 1.5; cx.strokeStyle = c.f ? FACTIONS[c.f].c : INK; cx.stroke();
      if (rp > 5) { cx.beginPath(); cx.arc(sx, sy, Math.min(3, rp * .3), 0, 7); cx.fillStyle = INK; cx.fill(); }
      if (c.size === 3 || z > .22 || (c.size === 2 && z > .1)) label(c.n, sx, sy + rp + 3, INK, c.size === 3 ? '600 12px "Golos Text", system-ui, sans-serif' : null);
    }
  }
  // одиночные точки
  if (z > .28) for (const p of POIS) { if (!g.found[p.id]) continue; const [sx, sy] = S2(p.x, p.y); if (sx < -40 || sy < -20 || sx > cw + 40 || sy > ch + 20) continue; if (z > 1.6) { const dz = drawSite(p.site, sx, sy, z > 6); if (z > 2.5) label(p.n, sx, sy + dz * .55 + 2, INK, '500 10.5px "Golos Text", system-ui, sans-serif'); } else { cx.fillStyle = INK; cx.fillRect(sx - 2.5, sy - 2.5, 5, 5); } }
  // ночь
  const dk = (1 - clamp(Math.sin((hour() - 6) / 15 * Math.PI), 0, 1)) * .42; if (dk > .01) { cx.fillStyle = `rgba(16,24,52,${dk})`; cx.fillRect(0, 0, cw, ch); }
  // маршрут, костёр, транспорт, игрок
  const P = S2(g.pos.x, g.pos.y);
  if (sel) { const e = trip ? { x: trip.tx, y: trip.ty } : clipRoute(g.pos.x, g.pos.y, sel.x, sel.y), E = S2(e.x, e.y); cx.beginPath(); cx.moveTo(P[0], P[1]); cx.lineTo(E[0], E[1]); cx.setLineDash([7, 5]); cx.strokeStyle = REDP; cx.lineWidth = 2.2; cx.stroke(); cx.setLineDash([]); cx.beginPath(); cx.moveTo(E[0] - 5, E[1] - 5); cx.lineTo(E[0] + 5, E[1] + 5); cx.moveTo(E[0] + 5, E[1] - 5); cx.lineTo(E[0] - 5, E[1] + 5); cx.stroke(); }
  if (g.fire && g.time < g.fire.until) { const [sx, sy] = S2(g.fire.x, g.fire.y); cx.fillStyle = '#e07a2c'; cx.beginPath(); cx.arc(sx + 11, sy - 11, 3.5, 0, 7); cx.fill(); }
  if (g.veh && g.veh.parked) { const [sx, sy] = S2(g.veh.parked.x, g.veh.parked.y); box(sx, sy, 18, PAPER, '#2f6f9f', 2); const im = glyphImg(VICON[g.veh.t], ['#2f6f9f', '#2f6f9f', '#2f6f9f']); if (im.complete && im.naturalWidth) cx.drawImage(im, sx - 6, sy - 6, 12, 12); }
  const pr = RM ? 12 : 11 + Math.sin(performance.now() / 420) * 3; cx.beginPath(); cx.arc(P[0], P[1], pr, 0, 7); cx.strokeStyle = 'rgba(207,68,40,.55)'; cx.lineWidth = 1.6; cx.stroke();
  cx.beginPath(); cx.arc(P[0], P[1], 5.5, 0, 7); cx.fillStyle = REDP; cx.fill(); cx.lineWidth = 2; cx.strokeStyle = PAPER; cx.stroke();
  // масштаб и север
  const kmv = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000].find(k => k * z >= 46) || 2000, bl = kmv * z, bx = 12, by = ch - 14;
  cx.strokeStyle = INK; cx.lineWidth = 1.6; cx.beginPath(); cx.moveTo(bx, by - 4); cx.lineTo(bx, by); cx.lineTo(bx + bl, by); cx.lineTo(bx + bl, by - 4); cx.stroke(); label(kmv + ' км', bx + bl / 2, by - 17, INK, '600 10.5px "JetBrains Mono", monospace');
}
function tapAt(sx, sy) {
  if (trip || g.over || g.combat || modalOpen()) return;
  const z = cam.z, wx = cam.x + (sx - vcx) / z, wy = cam.y + (sy - vcy) / z, tol = 16 / z;
  let best = null, bd = 1e9;
  const city = CITIES.find(c => hyp(c.x - wx, c.y - wy) <= Math.max(c.r, tol));
  if (city) { const fine = city.r * z > 44; for (const s of city.sites) { const d = hyp(s.x - wx, s.y - wy); if ((fine ? d <= tol : true) && d < bd) { bd = d; best = { x: s.x, y: s.y, n: s.n + ', ' + city.n, id: s.id }; } } }
  if (!best) for (const p of POIS) { if (!g.found[p.id]) continue; const d = hyp(p.x - wx, p.y - wy); if (d <= Math.max(2, tol) && d < bd) { bd = d; best = { x: p.x, y: p.y, n: p.n, id: p.id }; } }
  if (!best) { if (isWater(wx, wy)) return toast('Там вода.', ''); best = { x: wx, y: wy, n: city ? 'Улицы, ' + city.n : null }; }
  sel = best; scr = 'map'; renderNav(); renderSheet(false); renderRoute();
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
  g = (data && data.g && data.g.v === 3 ? data.g : null) || load() || newGame();
  g.combat = null; trip = null; locate(); discover();
  resize(); new ResizeObserver(resize).observe(cv);
  buildTerrain(); cam.x = g.pos.x; cam.y = g.pos.y; cam.z = 8; vcx = cw / 2; vcy = ch / 2;
  scr = 'map'; render(); if (g.over) showOver();
  requestAnimationFrame(frame);
}
try { window.claude && window.claude.hot && window.claude.hot.snapshot && window.claude.hot.snapshot(() => ({ g })); } catch (e) { /* вне просмотрщика */ }
if (window.claude && window.claude.hot && window.claude.hot.ready) window.claude.hot.ready(boot); else boot((window.claude && window.claude.hot && window.claude.hot.data) || {});

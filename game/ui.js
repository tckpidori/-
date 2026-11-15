'use strict';
/* Интерфейс: карта на canvas, HUD, вкладки, окна боя и торговли. */
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pad = n => String(n).padStart(2, '0');
const RM = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const fmtH = h => { const m = Math.round(h * 60); if (m < 60) return m + ' мин'; const hh = Math.floor(m / 60); if (hh >= 48) return Math.floor(hh / 24) + ' д ' + (hh % 24) + ' ч'; return hh + ' ч' + (m % 60 ? ' ' + (m % 60) + ' мин' : ''); };
const fmtKm = k => (k < 10 ? k.toFixed(1) : Math.round(k)) + ' км';
const fmtT = t => { const r = Math.round(t); return (r < 0 ? '−' : r > 0 ? '+' : '') + Math.abs(r) + '°'; };
const qty = q => Number.isInteger(q) ? q : q.toFixed(1);
let tab = 'place', sel = null, tradeTab = 'buy', confirmNew = false, showF = true, modalCb = null, hudT = 0;

/* ---------- всплывашки и окна ---------- */
function toast(m, k) { if (!m) return; const el = document.createElement('div'); el.className = 'toast ' + (k || ''); el.textContent = m; const box = $('#toasts'); box.appendChild(el); while (box.children.length > 3) box.firstChild.remove(); setTimeout(() => el.classList.add('out'), 2600); setTimeout(() => el.remove(), 3100); }
const modalOpen = () => !$('#modal').hidden;
function showModal(html) { const m = $('#modal'); m.innerHTML = html; m.hidden = false; }
function hideModal() { const m = $('#modal'); m.hidden = true; m.innerHTML = ''; }

/* ---------- HUD ---------- */
function renderHud() {
  const h = hour(), s = g.s;
  $('#clock').innerHTML = `<span>День ${dayNum()}</span><span>${dateStr()}</span><span>${pad(Math.floor(h))}:${pad(Math.floor(h % 1 * 60))}</span><span class="cold">${fmtT(tempAt(g.pos.x, g.pos.y))}</span><span class="dim">${WEATHER[g.weather].n}</span>`;
  const rows = [['Здоровье', 'var(--blood)', s.hp, s.hp < 30], ['Сытость', 'var(--lamp)', s.hunger, s.hunger < 20], ['Вода', 'var(--frost)', s.thirst, s.thirst < 20], ['Тепло', 'var(--ember)', s.warmth, s.warmth < 25], ['Радиация', 'var(--ash)', s.rad, s.rad >= 30], ['Настрой', 'var(--soft)', s.mood, s.mood < 25]];
  $('#stats').innerHTML = rows.map(r => `<div class="stat${r[3] ? ' crit' : ''}"><span class="lbl">${r[0]}</span><span class="val">${Math.round(r[2])}</span><span class="bar"><i style="width:${clamp(r[2], 0, 100)}%;background:${r[1]}"></i></span></div>`).join('');
  const c = [];
  const bl = g.wounds.filter(w => w.bl > 0 && !w.b).length; if (bl) c.push(['bad', 'Кровотечение']);
  if (g.wounds.length) c.push(['', 'Раны: ' + g.wounds.length]);
  for (const k in g.dis) c.push(['bad', DIS[k].n]);
  if (s.rad >= 30) c.push(['ash', 'Лучевая болезнь ' + (s.rad >= 85 ? 'III' : s.rad >= 60 ? 'II' : 'I')]);
  if (g.time < g.pk) c.push(['', 'Обезболен']);
  if (weight() > capacity()) c.push(['ash', 'Перегруз']);
  if (g.veh) c.push(['', VEH[g.veh.t].n + (g.veh.parked ? ' оставлен' : '')]);
  $('#cond').innerHTML = c.map(x => `<span class="chip ${x[0]}">${x[1]}</span>`).join('');
}

/* ---------- панель ---------- */
function btn(act, label, sub, dis, cls, arg) { return `<button class="btn ${cls || ''}" data-act="${act}"${arg != null ? ` data-arg="${arg}"` : ''}${dis ? ' disabled' : ''}><span>${label}</span>${sub ? `<small>${sub}</small>` : ''}</button>`; }
function itemDesc(k) {
  const it = ITEMS[k], p = [];
  if (it.use) { const u = it.use, L = { hunger: 'сытость', thirst: 'вода', hp: 'здоровье', warmth: 'тепло', rad: 'радиация', mood: 'настрой' }; for (const q in L) if (u[q]) p.push((u[q] > 0 ? '+' : '−') + Math.abs(u[q]) + ' ' + L[q]); if (u.cure) p.push('лечит: ' + u.cure.map(d => DIS[d].n.toLowerCase()).join(', ')); if (u.ease) p.push('облегчает простуду'); if (u.pk) p.push('снимает боль на ' + u.pk + ' ч'); if (u.kit) p.push('перевязка всех ран'); if (u.poison) p.push('можно отравиться'); if (u.time) p.push(u.time + ' ч'); }
  if (it.dmg) p.push(`урон ${it.dmg[0]}–${it.dmg[1]}` + (it.rng ? `, до ${it.rng} м` : `, вплотную${it.reach > 2 ? ' (дотягивается дальше)' : ''}`) + (it.burst ? ', очередь' : ''));
  if (it.ammo) p.push(ITEMS[it.ammo].n.toLowerCase());
  if (it.warm) p.push('тепло +' + it.warm); if (it.arm) p.push('броня ' + it.arm); if (it.prot) p.push('радиация −' + Math.round(it.prot * 100) + '%'); if (it.cap) p.push('груз +' + it.cap + ' кг');
  if (it.clean && !it.use) p.length = 0;
  if (it.d) p.push(it.d);
  if (it.w) p.push(it.w + ' кг');
  return p.join(' · ');
}
function renderPlace() {
  let h = '';
  if (trip) {
    return `<div class="route"><div class="eyebrow">В пути · ${moveMode().by}</div><div class="rname">${sel && sel.n ? esc(sel.n) : 'Точка на карте'}</div><div class="mono" id="tripInfo"></div><div class="hp"><i id="tripBar" style="width:0%"></i></div><button class="btn row" data-act="stop">Остановиться</button></div>`;
  }
  if (sel) {
    const r = routeInfo(sel.x, sel.y);
    h += `<div class="route"><div class="eyebrow">Маршрут</div><div class="rname">${sel.n ? esc(sel.n) : 'Точка на карте'}</div><div class="mono">${fmtKm(r.km)} · ${fmtH(r.h)} ${r.m.by}${r.fuel ? ` · бензин ${r.fuel.toFixed(1)} л` : ''}</div>`
      + (r.cut ? '<div class="ef">Дальше вода: дойдёшь только до берега.</div>' : '') + (r.m.blocked ? `<div class="ef bad">${r.m.blocked}</div>` : '') + (r.fuel > (g.inv.fuel || 0) + .01 ? '<div class="ef bad">Бензина на весь путь не хватит.</div>' : '')
      + `<div class="rbt"><button class="btn row primary" data-act="go">В путь</button><button class="btn row" data-act="unsel">Сбросить</button></div></div>`;
  }
  const hr = curHere, fire = fireOn(), rad = radAt(g.pos.x, g.pos.y), f = factionAt(g.pos.x, g.pos.y), fresh = freshDist() <= 12;
  let eb, nm, ds = '';
  if (hr && hr.kind === 'city') { eb = ['', 'Посёлок', 'Город', 'Большой город'][hr.o.size]; nm = hr.o.n; if (hr.o.f) ds = `База фракции «${FACTIONS[hr.o.f].n}».`; }
  else if (hr) { eb = POIT[hr.o.t].n; nm = hr.o.n; }
  else { const nc = nearestCity(); eb = BIOME[curBiome]; nm = 'Глушь'; ds = `${Math.round(nc.d)} км к ${nc.dir} от города ${nc.c.n}.`; }
  h += `<div><div class="eyebrow">${eb}</div><h2 class="loc">${esc(nm)}</h2>${ds ? `<p class="desc">${ds}</p>` : ''}<div class="chips">`
    + (hr ? '<span class="chip">Укрытие</span>' : '<span class="chip cold">Под открытым небом</span>')
    + (fire ? `<span class="chip warm">Костёр · ещё ${fmtH(g.fire.until - g.time)}</span>` : '')
    + (rad > 0 ? `<span class="chip ash">Заражение: ${owns('geiger') ? (rad * 3.2 * (1 - radProt())).toFixed(1) + ' в час' : rad > 2 ? 'смертельное' : rad > 1 ? 'сильное' : 'слабое'}</span>` : '')
    + (f ? `<span class="chip" style="border-color:${FACTIONS[f].c};color:${FACTIONS[f].c}">${FACTIONS[f].n} · ${repWord(f)}</span>` : '')
    + (fresh ? '<span class="chip cold">Вода рядом</span>' : '') + (snowHere() ? '<span class="chip">Снег</span>' : '') + '</div></div>';
  const A = [];
  A.push(fire ? btn('stoke', 'Подбросить дров', '1 дрова → +2 ч', !has('wood')) : btn('fire', 'Развести костёр', '2 дрова и спички', !has('wood', 2) || !(has('matches') || owns('lighter'))));
  A.push(btn('rest', 'Передохнуть', '2 ч, раны заживают быстрее', false, '', 2));
  A.push(btn('rest', 'Долгий отдых', '8 ч', false, '', 8));
  if (fresh) A.push(btn('water', 'Набрать воды', 'сырая, лучше кипятить'));
  A.push(btn('wood', 'Собрать дрова', '1,5 ч' + (owns('axe') ? ', с топором больше' : '')));
  A.push(btn('forage', 'Собирательство', snowHere() ? 'под снегом пусто' : '1,5 ч: ягоды, грибы, травы', snowHere()));
  A.push(btn('hunt', 'Охота', '3 ч, нужно оружие'));
  if (fresh) A.push(btn('fish', 'Рыбалка', owns('fishrod') ? '2 ч' : 'нужна удочка', !owns('fishrod')));
  if (withVeh()) A.push(btn('park', 'Оставить транспорт', VEH[g.veh.t].n));
  else if (g.veh && hyp(g.veh.parked.x - g.pos.x, g.veh.parked.y - g.pos.y) <= 3) A.push(btn('board', 'Сесть', VEH[g.veh.t].n));
  h += `<div><h3>Лагерь и природа</h3><div class="acts">${A.join('')}</div></div>`;
  if (hr) {
    const bf = baseHere();
    if (bf) h += `<div><h3>Торговец · ${FACTIONS[bf].n}</h3>${canTrade(bf) ? btn('trade', 'Торговать', `талонов: ${g.inv.coupon || 0} · отношение: ${repWord(bf)}`, false, 'wide') : `<p class="desc">С тобой здесь не торгуют: отношение «${repWord(bf)}».</p>`}</div>`;
    const P = getPlace(hr);
    h += '<div><h3>Постройки</h3><div class="items">' + P.b.map((b, i) => { const m = BUILD[b.t]; return `<div class="item"><div><div class="nm">${m.n}${m.dng >= .25 ? '<span class="q bad">опасно</span>' : ''}</div><div class="ef">${b.s > 0 ? `осталось обыскать: ${b.s} из ${b.m}` : 'пусто'}${b.wr ? ` · остов: ${VEH[b.wr].n.toLowerCase()} — можно восстановить` : ''}</div></div><div class="bt"><button class="sbtn" data-act="search" data-arg="${i}"${b.s > 0 ? '' : ' disabled'}>Обыскать · ${fmtH(m.h)}</button></div></div>`; }).join('') + '</div></div>';
  }
  return h;
}
function renderInv() {
  const w = weight(), cap = capacity();
  let h = `<div><div class="eyebrow">Груз</div><div class="wline"><b class="mono">${w.toFixed(1)}</b> из ${cap} кг${w > cap ? ' — перегруз, скорость вдвое ниже' : ''}</div><div class="hp"><i style="width:${Math.min(100, w / cap * 100)}%;background:${w > cap ? 'var(--blood)' : 'var(--soft)'}"></i></div></div>`;
  h += '<div><h3>Надето</h3><div class="items">' + SLOTS.map(([s, l]) => { const k = g.eq[s]; return `<div class="item"><div><div class="ef">${l}</div><div class="nm">${k ? ITEMS[k].n : '—'}</div>${k ? `<div class="ef">${itemDesc(k)}</div>` : ''}</div><div class="bt">${k ? `<button class="sbtn ghost" data-act="unequip" data-arg="${s}">Снять</button>` : ''}</div></div>`; }).join('') + '</div></div>';
  const V = { food: 'Съесть', drink: 'Выпить', med: 'Применить' };
  for (const [c, l] of CATS) {
    const ks = Object.keys(g.inv).filter(k => ITEMS[k].c === c); if (!ks.length) continue;
    h += `<div><h3>${l}</h3><div class="items">` + ks.map(k => { const it = ITEMS[k]; let b = ''; if (it.use) b += `<button class="sbtn" data-act="use" data-arg="${k}">${V[it.c] || 'Применить'}</button>`; if (it.c === 'melee' || it.c === 'ranged' || it.slot) b += `<button class="sbtn" data-act="equip" data-arg="${k}">${it.slot ? 'Надеть' : 'Взять'}</button>`; b += `<button class="sbtn ghost" data-act="drop" data-arg="${k}" aria-label="Выбросить: ${it.n}">✕</button>`; return `<div class="item"><div><div class="nm">${it.n}<span class="q">×${qty(g.inv[k])}</span></div><div class="ef">${itemDesc(k)}</div></div><div class="bt">${b}</div></div>`; }).join('') + '</div></div>';
  }
  return h;
}
function renderCraft() {
  let h = `<p class="desc">${fireOn() ? 'Костёр горит: можно готовить и кипятить.' : 'Для готовки нужен костёр — разведи его на вкладке «Место».'}</p>`, grp = '';
  for (const r of RECIPES) {
    if (r.wr && !wreckHere(r.wr)) continue;
    if (r.g !== grp) { if (grp) h += '</div></div>'; grp = r.g; h += `<div><h3>${grp}</h3><div class="items">`; }
    const miss = craftMiss(r), parts = [];
    for (const k in r.need) parts.push(`<span class="need${has(k, r.need[k]) ? '' : ' miss'}">${ITEMS[k].n} ${qty(g.inv[k] || 0)}/${r.need[k]}</span>`);
    for (const t of r.tools || []) parts.push(`<span class="need${owns(t) ? '' : ' miss'}">${ITEMS[t].n}</span>`);
    if (r.fire) parts.push(`<span class="need${fireOn() ? '' : ' miss'}">костёр</span>`);
    if (r.snow) parts.push(`<span class="need${snowHere() ? '' : ' miss'}">снег</span>`);
    if (r.sk) parts.push(`<span class="need${g.sk[r.sk[0]][0] >= r.sk[1] ? '' : ' miss'}">${SKILLS[r.sk[0]]} ${r.sk[1]}</span>`);
    const out = r.veh ? VEH[r.veh].n : Object.entries(r.out).map(([k, q]) => ITEMS[k].n + (q > 1 ? ' ×' + q : '')).join(', ');
    h += `<div class="item"><div><div class="nm">${r.n}</div><div class="needs">${parts.join('')}</div><div class="ef">→ ${out}</div></div><div class="bt"><button class="sbtn" data-act="craft" data-arg="${r.id}"${miss.length ? ' disabled' : ''}>${fmtH(craftTime(r))}</button></div></div>`;
  }
  return h + (grp ? '</div></div>' : '');
}
function renderHealth() {
  const s = g.s; let h = '<div><h3>Раны</h3>';
  if (!g.wounds.length) h += '<p class="desc">Ран нет.</p>';
  else h += '<div class="items">' + g.wounds.map((w, i) => {
    const d = WOUNDS[w.t], st = []; let b = '';
    if (d.bleed) { if (w.b) st.push(w.b === 2 ? 'перевязана бинтом' : 'перевязана тряпкой'); else if (w.bl > 0) { st.push('<span class="bad">кровоточит</span>'); b += `<button class="sbtn" data-act="treat" data-arg="${i}:band"${has('bandage') || has('ragband') ? '' : ' disabled'}>Перевязать</button>`; } }
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
    + `<p class="desc">Торговля поднимает отношение, убийство людей фракции — роняет. От банды можно откупиться талонами прямо в стычке.</p><button class="sbtn" data-act="togf">${showF ? 'Скрыть территории на карте' : 'Показать территории на карте'}</button></div>`;
  h += `<div><h3>Итоги</h3><div class="kv"><span>Дней в пути</span><b class="mono">${dayNum()}</b><span>Пройдено</span><b class="mono">${fmtKm(g.stats.km)}</b><span>Побед</span><b class="mono">${g.stats.kills}</b><span>Обысков</span><b class="mono">${g.stats.searched}</b></div></div>`;
  h += '<div><h3>Журнал</h3><ul class="log">' + g.log.slice().reverse().map(e => { const a = e.t + 8; return `<li class="${e.k}"><time>д${Math.floor(a / 24) + 1} ${pad(Math.floor(a % 24))}:${pad(Math.floor(a % 1 * 60))}</time><span>${esc(e.m)}</span></li>`; }).join('') + '</ul></div>';
  h += confirmNew ? '<div class="rbt"><button class="btn row" data-act="newyes">Да, начать заново</button><button class="btn row" data-act="newno">Отмена</button></div>' : '<button class="sbtn ghost" data-act="newgame">Новая игра</button>';
  return h;
}
function renderPanel() {
  const cc = RECIPES.filter(r => !craftMiss(r).length).length, wn = g.wounds.length + Object.keys(g.dis).length;
  $('#tabs').innerHTML = [['place', 'Место'], ['inv', 'Рюкзак'], ['craft', 'Крафт', cc], ['health', 'Здоровье', wn], ['world', 'Мир']].map(t => `<button class="${tab === t[0] ? 'on' : ''}" data-act="tab" data-arg="${t[0]}">${t[1]}${t[2] ? `<span class="n">${t[2]}</span>` : ''}</button>`).join('');
  $('#pc').innerHTML = tab === 'place' ? renderPlace() : tab === 'inv' ? renderInv() : tab === 'craft' ? renderCraft() : tab === 'health' ? renderHealth() : renderWorld();
}
function render() { renderHud(); renderPanel(); if (g.combat) renderCombat(); else if (modalOpen() && $('#modal').dataset.kind === 'trade') renderTrade(); }

/* ---------- бой, торговля, конец ---------- */
function renderCombat() {
  const c = g.combat; if (!c) return;
  if (!c.en[c.tgt] || c.en[c.tgt].hp <= 0) c.tgt = c.en.findIndex(x => x.hp > 0);
  const t = c.en[c.tgt], mw = g.eq.melee ? ITEMS[g.eq.melee] : { n: 'Кулаки', reach: 2 }, rw = g.eq.ranged ? ITEMS[g.eq.ranged] : null, am = rw ? (g.inv[rw.ammo] || 0) : 0;
  const canHeal = (g.wounds.some(w => w.bl > 0 && !w.b) && (has('bandage') || has('ragband'))) || has('medkit'), gang = c.f && FACTIONS[c.f].gang;
  $('#modal').dataset.kind = 'combat';
  showModal(`<div class="card"><div class="eyebrow">Стычка${c.f ? ' · ' + FACTIONS[c.f].n : ''}</div>
    <div class="foes">${c.en.map((x, i) => { const e = ENEMIES[x.k]; return `<button class="foe${i === c.tgt ? ' on' : ''}${x.hp <= 0 ? ' dead' : ''}" data-act="cb" data-arg="tgt:${i}"${x.hp <= 0 ? ' disabled' : ''}><span class="fn">${e.n}</span><span class="mono">${x.hp > 0 ? Math.round(x.d) + ' м' : 'убит'}</span><span class="hp"><i style="width:${clamp(x.hp / e.hp * 100, 0, 100)}%"></i></span></button>`; }).join('')}</div>
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
  if (tradeTab === 'buy') { const ks = Object.keys(s.it); rows = ks.length ? ks.map(k => { const p = buyPrice(k, f); return `<div class="item"><div><div class="nm">${ITEMS[k].n}<span class="q">×${qty(s.it[k])}</span></div><div class="ef">${itemDesc(k)}</div></div><div class="bt"><button class="sbtn" data-act="buy" data-arg="${k}"${has('coupon', p) ? '' : ' disabled'}>${p} т.</button></div></div>`; }).join('') : '<p class="desc">Прилавок пуст.</p>'; }
  else { const ks = Object.keys(g.inv).filter(k => k !== 'coupon'); rows = ks.length ? ks.map(k => `<div class="item"><div><div class="nm">${ITEMS[k].n}<span class="q">×${qty(g.inv[k])}</span></div></div><div class="bt"><button class="sbtn" data-act="sell" data-arg="${k}">+${sellPrice(k, f)} т.</button></div></div>`).join('') : '<p class="desc">Продавать нечего.</p>'; }
  $('#modal').dataset.kind = 'trade';
  showModal(`<div class="card tall"><div class="eyebrow" style="color:${F.c}">${F.n} · ${repWord(f)}</div><div class="hpline"><h3 class="big">Обмен</h3><span class="mono">талонов: ${g.inv.coupon || 0}</span></div>
    <div class="tabs two"><button class="${tradeTab === 'buy' ? 'on' : ''}" data-act="ttab" data-arg="buy">Купить</button><button class="${tradeTab === 'sell' ? 'on' : ''}" data-act="ttab" data-arg="sell">Продать</button></div>
    <div class="items scroll">${rows}</div><button class="btn row" data-act="closemodal">Закрыть</button></div>`);
}
function showOver() { const o = g.over; $('#modal').dataset.kind = 'over'; showModal(`<div class="card"><div class="eyebrow">Конец пути</div><h3 class="big">Ты не выжил</h3><p class="desc">${esc(o.reason)}.</p><div class="kv"><span>Дней</span><b class="mono">${dayNum()}</b><span>Пройдено</span><b class="mono">${fmtKm(g.stats.km)}</b><span>Побед</span><b class="mono">${g.stats.kills}</b></div><button class="btn row primary" data-act="newyes">Начать заново</button></div>`); }

/* ---------- действия ---------- */
function fresh() { hideModal(); newGame(); sel = null; tab = 'place'; confirmNew = false; cam.x = g.pos.x; cam.y = g.pos.y; cam.follow = true; save(); render(); }
function act(a, arg) {
  if (a === 'tab') { tab = arg; confirmNew = false; renderPanel(); $('#pc').scrollTop = 0; return; }
  if (a === 'zin' || a === 'zout') { cam.z = clamp(cam.z * (a === 'zin' ? 1.5 : 1 / 1.5), zMin(), 4); return; }
  if (a === 'center') { cam.follow = true; return; }
  if (a === 'newyes') return fresh();
  if (a === 'cb') { const p = String(arg).split(':'); return cAct(p[0], p[1]); }
  if (a === 'stop') return stopTrip('Остановился.');
  if (a === 'closemodal') { hideModal(); return render(); }
  if (a === 'ttab') { tradeTab = arg; return renderTrade(); }
  if (a === 'buy') return actBuy(arg); if (a === 'sell') return actSell(arg);
  if (g.over || g.combat || trip || modalOpen()) return;
  switch (a) {
    case 'go': if (sel && startTrip(sel.x, sel.y)) { cam.follow = true; renderPanel(); } break;
    case 'unsel': sel = null; renderPanel(); break;
    case 'fire': actFire(); break; case 'stoke': actStoke(); break; case 'rest': actRest(+arg); break;
    case 'water': actWater(); break; case 'wood': actWood(); break; case 'forage': actForage(); break; case 'hunt': actHunt(); break; case 'fish': actFish(); break;
    case 'park': actPark(); break; case 'board': actBoard(); break;
    case 'search': actSearch(+arg); break; case 'trade': tradeTab = 'buy'; renderTrade(); break;
    case 'use': actUse(arg); break; case 'equip': actEquip(arg); break; case 'unequip': actUnequip(arg); break; case 'drop': actDrop(arg); break;
    case 'treat': { const p = arg.split(':'); actTreat(+p[0], p[1]); break; }
    case 'craft': actCraft(arg); break;
    case 'togf': showF = !showF; renderPanel(); break;
    case 'newgame': confirmNew = true; renderPanel(); break; case 'newno': confirmNew = false; renderPanel(); break;
  }
}
document.addEventListener('click', e => { const b = e.target.closest('[data-act]'); if (b && !b.disabled) act(b.dataset.act, b.dataset.arg); });
UIH.toast = toast; UIH.refresh = render; UIH.combat = () => { renderHud(); renderCombat(); }; UIH.over = showOver;
UIH.tripEnd = () => { if (sel && hyp(sel.x - g.pos.x, sel.y - g.pos.y) < 1) sel = null; };

/* ---------- карта ---------- */
const cv = $('#map'), cx = cv.getContext('2d'), cam = { x: 0, y: 0, z: 1, follow: true };
let cw = 0, ch = 0, dpr = 1, terrain = null;
const zMin = () => Math.max(.03, cw / W * .95);
function resize() { const r = cv.getBoundingClientRect(); dpr = Math.min(2, window.devicePixelRatio || 1); cw = r.width; ch = r.height; cv.width = Math.max(1, Math.round(cw * dpr)); cv.height = Math.max(1, Math.round(ch * dpr)); }
function buildTerrain() {
  const S = 12, w = Math.ceil(W / S), h = Math.ceil(H / S); terrain = document.createElement('canvas'); terrain.width = w; terrain.height = h;
  const c = terrain.getContext('2d'), img = c.createImageData(w, h), d = img.data, COL = { tundra: [46, 55, 60], taiga: [27, 43, 38], forest: [36, 50, 36], steppe: [60, 56, 37], desert: [74, 63, 44] };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const ll = unproj(x * S, y * S), col = COL[biome(ll[0], ll[1])], k = .78 + fbm(x / 13, y / 13) * .5, i = (y * w + x) * 4; d[i] = col[0] * k; d[i + 1] = col[1] * k; d[i + 2] = col[2] * k; d[i + 3] = 255; }
  c.putImageData(img, 0, 0);
}
const S2 = (x, y) => [(x - cam.x) * cam.z + cw / 2, (y - cam.y) * cam.z + ch / 2];
function path(p, close) { cx.beginPath(); for (let i = 0; i < p.length; i++) { const sx = (p[i][0] - cam.x) * cam.z + cw / 2, sy = (p[i][1] - cam.y) * cam.z + ch / 2; if (i) cx.lineTo(sx, sy); else cx.moveTo(sx, sy); } if (close) cx.closePath(); }
function label(t, x, y, col, font, align) { cx.font = font || '600 11px "Golos Text", system-ui, sans-serif'; cx.textAlign = align || 'center'; cx.textBaseline = 'top'; cx.lineWidth = 3; cx.strokeStyle = 'rgba(12,17,21,.85)'; cx.strokeText(t, x, y); cx.fillStyle = col; cx.fillText(t, x, y); }
function draw() {
  const z = cam.z;
  cx.setTransform(dpr, 0, 0, dpr, 0, 0); cx.fillStyle = '#0f1c27'; cx.fillRect(0, 0, cw, ch);
  const o = S2(0, 0); cx.imageSmoothingEnabled = true; cx.drawImage(terrain, o[0], o[1], W * z, H * z);
  // вода
  cx.fillStyle = '#0f1c27'; cx.strokeStyle = 'rgba(125,160,185,.38)'; cx.lineWidth = 1;
  for (const p of SEAS) { path(p, true); cx.fill(); cx.stroke(); }
  cx.fillStyle = '#2b3438'; for (const p of ISLES) { path(p, true); cx.fill(); cx.stroke(); }
  cx.fillStyle = '#14283a'; for (const p of LAKES) { path(p, true); cx.fill(); cx.stroke(); }
  cx.strokeStyle = 'rgba(96,150,190,.55)'; cx.lineWidth = clamp(z * 3, .8, 3); cx.lineJoin = 'round'; for (const r of RIVERS) { path(r, false); cx.stroke(); }
  // ночь
  const dk = (1 - clamp(Math.sin((hour() - 6) / 15 * Math.PI), 0, 1)) * .34; if (dk > .01) { cx.fillStyle = `rgba(4,8,22,${dk})`; cx.fillRect(0, 0, cw, ch); }
  // заражение
  for (const q of ZONES) { const [sx, sy] = S2(q.x, q.y), r = q.r * z; if (sx + r < 0 || sy + r < 0 || sx - r > cw || sy - r > ch) continue; const gr = cx.createRadialGradient(sx, sy, 0, sx, sy, r); gr.addColorStop(0, `rgba(196,186,84,${.16 + q.lvl * .07})`); gr.addColorStop(1, 'rgba(196,186,84,.03)'); cx.fillStyle = gr; cx.beginPath(); cx.arc(sx, sy, r, 0, 7); cx.fill(); cx.setLineDash([4, 5]); cx.strokeStyle = 'rgba(196,186,84,.5)'; cx.lineWidth = 1; cx.stroke(); cx.setLineDash([]); }
  // территории
  if (showF) for (const b of D.BASES) { const [sx, sy] = S2(b.x, b.y), r = b.r * z; if (sx + r < 0 || sy + r < 0 || sx - r > cw || sy - r > ch) continue; cx.beginPath(); cx.arc(sx, sy, r, 0, 7); cx.setLineDash([2, 6]); cx.strokeStyle = FACTIONS[b.f].c; cx.globalAlpha = .45; cx.lineWidth = 1.2; cx.stroke(); cx.globalAlpha = .05; cx.fillStyle = FACTIONS[b.f].c; cx.fill(); cx.globalAlpha = 1; cx.setLineDash([]); }
  // маршрут
  const P = S2(g.pos.x, g.pos.y);
  if (sel) { const e = trip ? { x: trip.tx, y: trip.ty } : clipRoute(g.pos.x, g.pos.y, sel.x, sel.y), E = S2(e.x, e.y); cx.beginPath(); cx.moveTo(P[0], P[1]); cx.lineTo(E[0], E[1]); cx.setLineDash([6, 5]); cx.strokeStyle = '#e8a03a'; cx.lineWidth = 2; cx.stroke(); cx.setLineDash([]); cx.beginPath(); cx.arc(E[0], E[1], 5, 0, 7); cx.strokeStyle = '#e8a03a'; cx.stroke(); }
  // точки интереса
  if (z > .28) for (const p of POIS) { if (!g.found[p.id]) continue; const [sx, sy] = S2(p.x, p.y); if (sx < -40 || sy < -20 || sx > cw + 40 || sy > ch + 20) continue; const st = g.places[p.id], empty = st && st.b.every(b => b.s <= 0); cx.fillStyle = empty ? '#5d6c77' : '#cfd8dd'; cx.fillRect(sx - 3, sy - 3, 6, 6); cx.strokeStyle = '#0e1317'; cx.lineWidth = 1; cx.strokeRect(sx - 3, sy - 3, 6, 6); if (z > .9) label(p.n, sx, sy + 6, empty ? '#7f8f9a' : '#b8c3ca', '500 10.5px "Golos Text", system-ui, sans-serif'); }
  // города
  for (const c of CITIES) {
    const [sx, sy] = S2(c.x, c.y), r = Math.max(c.size + 1.5, c.r * z); if (sx + r < -60 || sy + r < -20 || sx - r > cw + 60 || sy - r > ch + 20) continue;
    cx.beginPath(); cx.arc(sx, sy, r, 0, 7); cx.fillStyle = 'rgba(18,25,31,.55)'; cx.fill(); cx.lineWidth = c.size === 3 ? 2 : 1.3; cx.strokeStyle = c.f ? FACTIONS[c.f].c : '#c9d3d9'; cx.stroke();
    if (r > 26) { const rr = mulberry32(hashStr(c.n)); cx.fillStyle = 'rgba(205,214,220,.45)'; for (let i = 0, n = D.CITYSET[c.size].length; i < n; i++) { const a = rr() * 6.283, d = Math.sqrt(rr()) * r * .8; cx.fillRect(sx + Math.cos(a) * d - 2, sy + Math.sin(a) * d - 2, 4, 4); } }
    if (c.f) { cx.fillStyle = FACTIONS[c.f].c; cx.beginPath(); cx.moveTo(sx, sy - 4); cx.lineTo(sx + 4, sy); cx.lineTo(sx, sy + 4); cx.lineTo(sx - 4, sy); cx.closePath(); cx.fill(); }
    if (c.size === 3 || z > .22 || (c.size === 2 && z > .1)) label(c.n, sx, sy + r + 3, '#e2e8eb', c.size === 3 ? '600 12px "Golos Text", system-ui, sans-serif' : null);
  }
  // костёр, транспорт, игрок
  if (g.fire && g.time < g.fire.until) { const [sx, sy] = S2(g.fire.x, g.fire.y); cx.fillStyle = '#e07a4c'; cx.beginPath(); cx.arc(sx + 9, sy - 9, 3, 0, 7); cx.fill(); }
  if (g.veh && g.veh.parked) { const [sx, sy] = S2(g.veh.parked.x, g.veh.parked.y); cx.strokeStyle = '#74b4dc'; cx.lineWidth = 2; cx.strokeRect(sx - 5, sy - 5, 10, 10); label(VEH[g.veh.t].n, sx, sy + 7, '#74b4dc'); }
  const pr = RM ? 12 : 11 + Math.sin(performance.now() / 420) * 3; cx.beginPath(); cx.arc(P[0], P[1], pr, 0, 7); cx.strokeStyle = 'rgba(232,160,58,.45)'; cx.lineWidth = 1.5; cx.stroke();
  cx.beginPath(); cx.arc(P[0], P[1], 5.5, 0, 7); cx.fillStyle = '#e8a03a'; cx.fill(); cx.lineWidth = 2; cx.strokeStyle = '#1b1206'; cx.stroke();
  // масштаб и север
  const kmv = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000].find(k => k * z >= 46) || 2000, bl = kmv * z, bx = 12, by = ch - 14;
  cx.strokeStyle = '#e2e8eb'; cx.lineWidth = 1.5; cx.beginPath(); cx.moveTo(bx, by - 4); cx.lineTo(bx, by); cx.lineTo(bx + bl, by); cx.lineTo(bx + bl, by - 4); cx.stroke(); label(kmv + ' км', bx + bl / 2, by - 17, '#e2e8eb', '500 10.5px "JetBrains Mono", monospace');
  label('С', 20, 10, '#e2e8eb', '600 11px "JetBrains Mono", monospace'); cx.beginPath(); cx.moveTo(20, 40); cx.lineTo(20, 25); cx.moveTo(16, 30); cx.lineTo(20, 25); cx.lineTo(24, 30); cx.strokeStyle = '#e2e8eb'; cx.lineWidth = 1.5; cx.stroke();
}
function tapAt(sx, sy) {
  if (trip || g.over || g.combat || modalOpen()) return;
  const wx = cam.x + (sx - cw / 2) / cam.z, wy = cam.y + (sy - ch / 2) / cam.z, tol = 16 / cam.z;
  let best = null, bd = 1e9;
  for (const c of CITIES) { const d = hyp(c.x - wx, c.y - wy); if (d <= Math.max(c.r, tol) && d < bd) { bd = d; best = { x: c.x, y: c.y, n: c.n }; } }
  if (!best) for (const p of POIS) { if (!g.found[p.id]) continue; const d = hyp(p.x - wx, p.y - wy); if (d <= Math.max(4, tol) && d < bd) { bd = d; best = { x: p.x, y: p.y, n: p.n }; } }
  if (!best) { if (isWater(wx, wy)) return toast('Там вода.', ''); best = { x: wx, y: wy, n: null }; }
  sel = best; tab = 'place'; renderPanel(); $('#pc').scrollTop = 0;
}
const ptrs = new Map(); let drag = null, pinch = null;
cv.addEventListener('pointerdown', e => { try { cv.setPointerCapture(e.pointerId); } catch (_) { /* не критично */ } ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (ptrs.size === 1) drag = { x: e.clientX, y: e.clientY, moved: false }; else if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, z: cam.z }; if (drag) drag.moved = true; } });
cv.addEventListener('pointermove', e => {
  const p = ptrs.get(e.pointerId); if (!p) return; const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
  if (ptrs.size === 2 && pinch) { const [a, b] = [...ptrs.values()]; cam.z = clamp(pinch.z * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d, zMin(), 4); return; }
  if (drag) { if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 6) drag.moved = true; if (drag.moved) { cam.x = clamp(cam.x - dx / cam.z, 0, W); cam.y = clamp(cam.y - dy / cam.z, 0, H); cam.follow = false; } }
});
const pUp = e => { if (!ptrs.has(e.pointerId)) return; ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null; if (!ptrs.size) { if (drag && !drag.moved && e.type === 'pointerup') { const r = cv.getBoundingClientRect(); tapAt(e.clientX - r.left, e.clientY - r.top); } drag = null; } };
cv.addEventListener('pointerup', pUp); cv.addEventListener('pointercancel', pUp);
cv.addEventListener('wheel', e => { e.preventDefault(); const r = cv.getBoundingClientRect(), mx = e.clientX - r.left - cw / 2, my = e.clientY - r.top - ch / 2, wx = cam.x + mx / cam.z, wy = cam.y + my / cam.z; cam.z = clamp(cam.z * Math.exp(-e.deltaY * .0015), zMin(), 4); cam.x = clamp(wx - mx / cam.z, 0, W); cam.y = clamp(wy - my / cam.z, 0, H); cam.follow = false; }, { passive: false });

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
  if (cam.follow) { const k = RM ? 1 : .12; cam.x += (g.pos.x - cam.x) * k; cam.y += (g.pos.y - cam.y) * k; }
  draw();
}
function boot(data) {
  g = (data && data.g) || load() || newGame();
  g.combat = null; trip = null; locate(); discover();
  resize(); new ResizeObserver(resize).observe(cv);
  buildTerrain(); cam.x = g.pos.x; cam.y = g.pos.y; cam.z = 1;
  render(); if (g.over) showOver();
  requestAnimationFrame(frame);
}
try { window.claude && window.claude.hot && window.claude.hot.snapshot && window.claude.hot.snapshot(() => ({ g })); } catch (e) { /* вне просмотрщика */ }
if (window.claude && window.claude.hot && window.claude.hot.ready) window.claude.hot.ready(boot); else boot((window.claude && window.claude.hot && window.claude.hot.data) || {});

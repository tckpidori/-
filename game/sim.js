'use strict';
/* Правила: состояние, время, потребности, раны, болезни, обыск, бой, торговля, крафт, путь. */
const { W, H, unproj, mulberry32, hashStr, isWater, biome, BIOME, CITIES, CITY, ZONES, FACTIONS, BASES, STOCKS, ITEMS, CATS, SLOTS, BUILD, POIT, POIS, RECIPES, VEH, ENEMIES, WILD, DIS, WOUNDS, SKILLS, SKILLD, LAKES, RIVERS, SEAS, ISLES, fbm, hash2, STATIONS, PERKS } = D;
const rnd = (a, b) => a + Math.random() * (b - a), ri = (a, b) => Math.floor(rnd(a, b + 1)), chance = p => Math.random() < p, clamp = (v, a, b) => Math.max(a, Math.min(b, v)), hyp = Math.hypot;
const pickW = l => { let t = 0; for (const x of l) t += x[1]; let r = Math.random() * t; for (const x of l) { r -= x[1]; if (r <= 0) return x; } return l[l.length - 1]; };
const WEATHER = { clear: { n: 'Ясно', t: 0 }, cloud: { n: 'Пасмурно', t: -1 }, rain: { n: 'Дождь', t: -3 }, snow: { n: 'Снег', t: -2 }, blizzard: { n: 'Метель', t: -7 } };
const SAVE_KEY = 'pepel-trakt-v5';

let g = null, curHere = { city: null, site: null }, curBiome = 'forest', trip = null, combatCb = null;
const UIH = { toast() {}, refresh() {}, combat() {}, over() {}, tripEnd() {} };

/* ---------- инвентарь и земля ---------- */
const has = (k, n = 1) => (g.inv[k] || 0) >= n - 1e-9;
const add = (k, n = 1) => { g.inv[k] = (g.inv[k] || 0) + n; };
const take = (k, n = 1) => { g.inv[k] = (g.inv[k] || 0) - n; if (g.inv[k] <= 1e-6) delete g.inv[k]; };
const owns = k => has(k) || Object.values(g.eq).includes(k);
function weight() { let w = 0; for (const k in g.inv) w += ITEMS[k].w * g.inv[k]; return w; }
const withVeh = () => g.veh && !g.veh.parked;
const pk = id => (g.perks && g.perks[id]) || 0;
function capacity() { const b = g.eq.back; return 30 + (b ? ITEMS[b].cap : 0) + (withVeh() ? VEH[g.veh.t].cap : 0) + 5 * pk('mule'); }
function wearWarm() { let w = 0; for (const s of ['head', 'body', 'legs', 'feet']) { const k = g.eq[s]; if (k) w += ITEMS[k].warm || 0; } return w + 3 * pk('hardy'); }
function armor() { let a = 0; for (const s of ['head', 'body', 'armor']) { const k = g.eq[s]; if (k) a += ITEMS[k].arm || 0; } return a; }
function radProt() { let p = 0; for (const s of ['mask', 'body']) { const k = g.eq[s]; if (k) p += ITEMS[k].prot || 0; } return Math.min(.9, p + .08 * pk('lead')); }
function log(m, k = '') { g.log.push({ t: g.time, m, k }); if (g.log.length > 140) g.log.shift(); }
const fmtGot = got => Object.entries(got).map(([k, q]) => `${ITEMS[k].n} ×${Number.isInteger(q) ? q : q.toFixed(1)}`).join(', ');
const gkey = () => curHere.site ? curHere.site.id : 'w' + Math.round(g.pos.x) + '_' + Math.round(g.pos.y);
const groundHere = () => g.ground[gkey()] || {};
function gput(k, n) { const key = gkey(), o = g.ground[key] || (g.ground[key] = {}); o[k] = (o[k] || 0) + n; }
function gtake(k, n) { const key = gkey(), o = g.ground[key]; if (!o || !o[k]) return 0; n = Math.min(n, o[k]); o[k] -= n; if (o[k] <= 1e-6) delete o[k]; if (!Object.keys(o).length) delete g.ground[key]; return n; }
function found(got, what) { for (const k in got) gput(k, got[k]); const t = fmtGot(got); log(`${what}: ${t || 'ничего'}.`, t ? 'good' : ''); UIH.toast(t ? 'Найдено: ' + t : 'Ничего не нашлось', t ? 'good' : ''); }
function actPick(k) { const n = gtake(k, 1e9); if (n) add(k, n); done(); }
function actPickAll() { const o = groundHere(); for (const k of Object.keys(o)) add(k, gtake(k, 1e9)); done(); }
function actDrop(k, all) { if (!has(k)) return; const n = all ? g.inv[k] : Math.min(g.inv[k], 1); take(k, n); gput(k, n); done(); }

/* ---------- время и погода ---------- */
const absH = () => g.time + 8;
const hour = () => absH() % 24;
const dayNum = () => Math.floor(absH() / 24) + 1;
const doy = () => (226 + Math.floor(absH() / 24)) % 365;
const isNight = () => { const h = hour(); return h < 6 || h >= 21; };
function dateStr() { const ML = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31], MN = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']; let d = doy(), m = 0; while (d >= ML[m]) { d -= ML[m]; m++; } return (d + 1) + ' ' + MN[m]; }
function seasonT(x, y) { const [lon, lat] = unproj(x, y); const mean = 18 - .62 * (lat - 35) - .035 * clamp(lon - 30, 0, 100), amp = 11 + .14 * clamp(lon - 20, 0, 90) + .1 * (lat - 40); return mean + amp * Math.cos((doy() - 200) / 365 * 2 * Math.PI); }
function tempAt(x, y) { return seasonT(x, y) + (curBiome === 'desert' ? 8 : 5) * Math.sin((hour() - 9) / 24 * 2 * Math.PI) + WEATHER[g.weather].t; }
const snowHere = () => seasonT(g.pos.x, g.pos.y) < -2;
function rollWeather() {
  const cold = seasonT(g.pos.x, g.pos.y) < 1, old = g.weather;
  g.weather = pickW(cold ? [['clear', 4], ['cloud', 3], ['snow', 3], ['blizzard', 1]] : [['clear', 5], ['cloud', 3], ['rain', 2]])[0];
  g.wLeft = rnd(4, 10);
  if (g.weather !== old && (g.weather === 'blizzard' || g.weather === 'rain')) log(g.weather === 'blizzard' ? 'Поднялась метель.' : 'Пошёл дождь.');
}

/* ---------- место ---------- */
function here() {
  const { x, y } = g.pos;
  for (const c of CITIES) if (hyp(c.x - x, c.y - y) <= c.r + 1) { let b = null, bd = Math.min(1.2, c.grid.s * .45); for (const s of c.sites) { const d = hyp(s.x - x, s.y - y); if (d < bd) { bd = d; b = s; } } return { city: c, site: b }; }
  for (const p of POIS) if (hyp(p.x - x, p.y - y) <= 2) return { city: null, site: p.site };
  return { city: null, site: null };
}
function locate() { curHere = here(); const ll = unproj(g.pos.x, g.pos.y); curBiome = biome(ll[0], ll[1]); }
function discover() { for (const p of POIS) if (!g.found[p.id] && hyp(p.x - g.pos.x, p.y - g.pos.y) < 35) g.found[p.id] = 1; }
function radAt(x, y) { let m = 0; for (const z of ZONES) { const d = hyp(z.x - x, z.y - y); if (d < z.r) m = Math.max(m, z.lvl * (.35 + .65 * (1 - d / z.r))); } return m; }
function factionAt(x, y) { let best = null, bd = 1e9; for (const b of BASES) { const d = hyp(b.x - x, b.y - y); if (d < b.r && d < bd) { bd = d; best = b.f; } } return best; }
const hostile = f => g.rep[f] <= -20;
function siteState(s) {
  let st = g.sites[s.id]; if (st) return st;
  const m = BUILD[s.t], r = mulberry32(g.seed ^ hashStr(s.id));
  const n = m.se[1] ? m.se[0] + Math.floor(r() * (m.se[1] - m.se[0] + 1)) + (s.big ? 2 : 0) + (radAt(s.x, s.y) > .1 ? 1 : 0) : 0;
  st = { s: n, m: n }; if (s.t === 'garage') { const q = r(); if (q < .16) st.wr = 'moto'; else if (q < .26) st.wr = 'car'; }
  return g.sites[s.id] = st;
}
function freshDist() {
  const { x, y } = g.pos; let m = 1e9;
  const seg = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = dx * dx + dy * dy; const t = l ? clamp(((x - a[0]) * dx + (y - a[1]) * dy) / l, 0, 1) : 0; m = Math.min(m, hyp(x - a[0] - t * dx, y - a[1] - t * dy)); };
  for (const r of RIVERS) for (let i = 1; i < r.length; i++) seg(r[i - 1], r[i]);
  for (const p of LAKES) for (let i = 0; i < p.length; i++) seg(p[i], p[(i + 1) % p.length]);
  return m;
}
function nearestCity() { let b = null, bd = 1e9; for (const c of CITIES) { const d = hyp(c.x - g.pos.x, c.y - g.pos.y); if (d < bd) { bd = d; b = c; } } const a = Math.atan2(g.pos.y - b.y, g.pos.x - b.x) * 180 / Math.PI, dirs = ['востоку', 'юго-востоку', 'югу', 'юго-западу', 'западу', 'северо-западу', 'северу', 'северо-востоку']; return { c: b, d: bd, dir: dirs[((Math.round(a / 45) % 8) + 8) % 8] }; }
const fireOn = () => !!(g.fire && g.time < g.fire.until && hyp(g.fire.x - g.pos.x, g.fire.y - g.pos.y) < 1.5);

/* ---------- новая игра ---------- */
function newGame() {
  const s0 = CITY['Рязань'].sites.find(s => s.t === 'house');
  g = {
    v: 5, seed: (Math.random() * 2147483647) | 0, time: 0, pos: { x: s0.x, y: s0.y },
    s: { hp: 100, hunger: 75, thirst: 75, warmth: 80, rad: 0, mood: 60 },
    inv: { crackers: 2, water: 2, matches: 6, ragband: 1, cloth: 2 },
    eq: { melee: 'knife', ranged: null, head: null, body: 'jacket', legs: 'pants', feet: 'shoes', mask: null, armor: null, back: null },
    veh: null, wounds: [], dis: {}, pk: 0, fire: null, sites: {}, ground: {}, found: {}, rep: {}, stock: {},
    sk: { surv: [0, 0], med: [0, 0], mech: [0, 0], fight: [0, 0] },
    weather: 'clear', wLeft: 6, log: [], warn: {}, stats: { km: 0, kills: 0, searched: 0 }, over: null, combat: null,
    st: { kitchen: 0, bench: 0, sew: 0, med: 0, rest: 0 }, lvl: 1, xp: 0, perks: {}, perkPts: 0, perkOffer: null
  };
  for (const k in FACTIONS) g.rep[k] = FACTIONS[k].rep;
  locate(); discover();
  log('Ты один, в пустом доме на окраине Рязани. В рюкзаке почти ничего.');
  log('Обыскивай здания, ищи воду и тёплую одежду. Приблизь карту — внутри города видны отдельные дома. Заштрихованные пятна — заражённые земли.');
  return g;
}
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(g)); } catch (e) { /* хранилище недоступно */ } }
function load() { try { const s = localStorage.getItem(SAVE_KEY); if (s) { const o = JSON.parse(s); if (o && o.v === 5 && o.pos && o.ground && o.st) return o; } } catch (e) { /* нет сохранения */ } return null; }

/* ---------- навыки ---------- */
const xpNeed = l => 20 * (l + 1);
function addXp(s, n) { const k = g.sk[s]; k[1] += n; while (k[1] >= xpNeed(k[0])) { k[1] -= xpNeed(k[0]); k[0]++; log(`Навык «${SKILLS[s]}» вырос до ${k[0]}.`, 'good'); UIH.toast(`${SKILLS[s]}: уровень ${k[0]}`, 'good'); } g.xp += n; while (g.xp >= lvlNeed(g.lvl)) { g.xp -= lvlNeed(g.lvl); g.lvl++; g.perkPts++; log(`Новый уровень: ${g.lvl}. Доступна способность.`, 'good'); UIH.toast(`Уровень ${g.lvl}: выбери способность`, 'good'); } }
const lvlNeed = l => 30 + 20 * l;

/* ---------- потребности, раны, болезни ---------- */
const painLevel = () => g.time < g.pk ? 0 : g.wounds.reduce((a, w) => a + WOUNDS[w.t].pain, 0);
const maxHp = () => 100 - (g.dis.frostbite ? 15 : 0) - (g.s.rad >= 60 ? 15 : 0);
function clampS() { const s = g.s; for (const k of ['hunger', 'thirst', 'warmth', 'mood']) s[k] = clamp(s[k], 0, 100); s.rad = clamp(s.rad, 0, 120); s.hp = Math.min(s.hp, maxHp()); }
function addWound(t) { if (g.wounds.length >= 7) return; g.wounds.push({ t, bl: WOUNDS[t].bleed, b: 0, c: 0, sp: 0, h: WOUNDS[t].heal }); }
function getSick(d, msg) { if (g.dis[d]) return; g.dis[d] = DIS[d].dur || -1; log(msg, 'bad'); UIH.toast(DIS[d].n, 'bad'); }

function step(dt, ctx) {
  g.time += dt; g.wLeft -= dt; if (g.wLeft <= 0) rollWeather();
  const s = g.s, ds = g.dis, mv = ctx.move, rest = !!ctx.rest, legs = mv === 'foot' || mv === 'bike';
  const shelter = !mv && !!curHere.site, fire = !mv && fireOn(), T = tempAt(g.pos.x, g.pos.y);
  let hm = 1, tm = 1;
  if (legs) { hm = 1.3; tm = 1.3; }
  if (rest) { hm *= .7; tm *= .7; }
  if (ds.poison) { hm *= 1.5; tm *= 1.6; }
  if (ds.dysentery) tm *= 2;
  if (ds.cold || ds.pneumonia) tm *= 1.2;
  if (s.rad >= 30) hm *= 1.2;
  if (T > 28) tm *= 1.4;
  const thr = 1 - .06 * pk('thrifty'); s.hunger -= 2 * dt * hm * thr; s.thirst -= 2.9 * dt * tm * thr;
  let comfort = T + wearWarm() * 1.5 + (fire ? 22 : 0) + (shelter ? 6 : 0) + (legs ? 4 : 0) + (mv === 'car' ? 10 : 0);
  if (rest) comfort += (owns('sleepbag') ? 6 : 0) + (!shelter && owns('tent') ? 8 : 0) + (g.st.rest >= 2 ? 5 : 0);
  if (!shelter && mv !== 'car') { if (g.weather === 'rain') comfort -= 4; if (g.weather === 'blizzard') comfort -= 5; }
  const e = comfort - 12;
  s.warmth += (e >= 0 ? Math.min(12, 2 + e * .5) : Math.max(-9, e * .3)) * dt;
  const rr = radAt(g.pos.x, g.pos.y) * 3.2 * (1 - radProt());
  s.rad += rr > 0 ? rr * dt : -.12 * dt;
  let md = -.3;
  if (isNight() && !fire && !shelter) md -= .4;
  if (fire && rest) md += 1.6; else if (rest && shelter) md += .6;
  if (s.hunger < 20 || s.thirst < 20) md -= .6;
  md -= painLevel() * .15; if (Object.keys(ds).length) md -= .3;
  s.mood += (md < 0 ? md * (1 - .2 * pk('calm')) : md) * dt;
  let bleed = 0;
  for (let i = g.wounds.length - 1; i >= 0; i--) {
    const w = g.wounds[i], d = WOUNDS[w.t];
    if (w.bl > 0 && !w.b) { bleed += w.bl; w.bl = Math.max(0, w.bl - d.clot * dt); }
    if (d.inf && !w.c && !ds.infection && chance(d.inf * (w.b === 1 ? 1.3 : w.b === 2 ? .6 : 1) * dt)) getSick('infection', 'Рана воспалилась: заражение крови. Нужны антибиотики.');
    let hs = 1; if (d.bleed && !w.b && w.bl > 0) hs = .3; if (w.t === 'fracture' && !w.sp) hs = .35; if (rest) hs *= 1.5; hs *= 1 + .1 * g.sk.med[0] + .15 * pk('healer');
    w.h -= dt * hs;
    if (w.h <= 0) { g.wounds.splice(i, 1); log(`Зажило: ${d.n.toLowerCase()}.`, 'good'); }
  }
  for (const k in ds) if (ds[k] > 0) { ds[k] -= dt * (rest ? 1.3 : 1); if (ds[k] <= 0) { delete ds[k]; log(`${DIS[k].n}: прошло.`, 'good'); } }
  if (s.warmth < 32 && !ds.cold && !ds.pneumonia && chance(.05 * dt)) getSick('cold', 'Ты простудился. Нужно тепло и лекарство.');
  if (ds.cold && s.warmth < 35 && chance(.015 * dt)) { delete ds.cold; getSick('pneumonia', 'Простуда перешла в пневмонию. Без антибиотиков не выжить.'); }
  if (s.warmth < 8 && chance(.15 * dt)) getSick('frostbite', 'Обморожение. Срочно в тепло.');
  clampS();
  let dmg = 0, worst = 0, cause = '';
  const src = (v, c) => { if (v > 0) { dmg += v; if (v > worst) { worst = v; cause = c; } } };
  src(s.hunger <= 0 ? 1.5 : 0, 'от голода'); src(s.thirst <= 0 ? 3 : 0, 'от жажды');
  src(s.warmth < 15 ? (15 - s.warmth) * .2 + .3 : 0, 'от переохлаждения');
  src(s.rad >= 60 ? (s.rad - 60) * .05 + .2 : 0, 'от лучевой болезни');
  src(bleed, 'от потери крови');
  for (const k in ds) src(DIS[k].hp, 'от болезни (' + DIS[k].n.toLowerCase() + ')');
  if (dmg > 0) { s.hp -= dmg * dt; g.cause = cause; }
  else if (s.hunger > 30 && s.thirst > 30 && s.warmth > 35 && s.rad < 30) s.hp += (rest ? 1.6 * (1 + .25 * g.st.rest) : .4) * (1 + .1 * g.sk.med[0]) * dt;
  clampS();
  if (s.hp <= 0) die('Погиб ' + (g.cause || 'от ран'));
}
function pass(h, ctx) { const n = Math.max(1, Math.ceil(h * 4)), dt = h / n; for (let i = 0; i < n && !g.over; i++) step(dt, ctx || {}); }
function warnCheck() {
  const s = g.s, w = g.warn || (g.warn = {}); let fresh = false;
  const c = { hunger: [s.hunger < 20, 'Сильный голод.'], thirst: [s.thirst < 20, 'Мучает жажда.'], warmth: [s.warmth < 25, 'Ты замерзаешь. Нужен костёр, укрытие или тёплая одежда.'], rad: [s.rad >= 30, 'Тошнит и ломит кости: лучевая болезнь.'], bleed: [g.wounds.some(x => x.bl > 0 && !x.b), 'Рана кровоточит. Перевяжи её.'], hp: [s.hp < 30, 'Здоровье на исходе.'] };
  for (const k in c) { if (c[k][0] && !w[k]) { w[k] = 1; log(c[k][1], 'bad'); UIH.toast(c[k][1], 'bad'); fresh = true; } else if (!c[k][0]) w[k] = 0; }
  return fresh;
}
function die(reason) { if (g.over) return; g.s.hp = 0; g.over = { win: false, reason }; trip = null; g.combat = null; combatCb = null; log(reason + '.', 'bad'); }
function done() { if (!g.over) warnCheck(); save(); UIH.refresh(); if (g.over) UIH.over(); }

/* ---------- лагерь и природа ---------- */
function actFire() {
  if (!has('wood', 2)) return UIH.toast('Нужно 2 дрова.', 'bad');
  if (owns('lighter')) { /* зажигалка не тратится */ } else if (has('matches')) take('matches', 1); else return UIH.toast('Нечем разжечь: нужны спички или зажигалка.', 'bad');
  take('wood', 2); g.fire = { x: g.pos.x, y: g.pos.y, until: g.time + 4 }; pass(.3, {}); log('Костёр разгорелся.'); done();
}
function actStoke() { if (!fireOn() || !has('wood')) return; take('wood', 1); g.fire.until += 2; done(); }
const friendlyCity = () => !!(curHere.city && curHere.city.f && !hostile(curHere.city.f));
function wildDanger() { if (friendlyCity()) return 0; return curHere.site ? .05 : fireOn() ? .07 : .14; }
const encCtx = () => curHere.site ? (BUILD[curHere.site.t].mil ? 'mil' : 'city') : curHere.city ? 'city' : 'wild';
function actRest(h) {
  let n = 0, why = '';
  while (n < h) { pass(1, { rest: true }); n++; if (g.over) return done(); if (g.s.warmth < 18) { why = 'Холод не даёт лежать.'; break; } if (g.s.thirst < 5 || g.s.hunger < 5) { why = 'Голод и жажда подняли на ноги.'; break; } }
  log(`Отдых: ${n} ч. ${why}`);
  if (chance(wildDanger() * n / 8)) return startCombat(makeEncounter(encCtx()), { close: true, intro: 'Шорох совсем рядом — тебя нашли.' }, () => done());
  done();
}
const wildOK = () => !curHere.city;
function wildFinds() {
  const b = curBiome, o = [];
  if (wildOK()) {
    if (b === 'forest' || b === 'taiga') o.push('wood'); else o.push('wood');
    if (!snowHere()) { if (b === 'forest' || b === 'taiga') o.push('berries', 'mushrooms', 'herbs'); else if (b === 'steppe') o.push('herbs', 'berries'); else if (b === 'tundra') o.push('berries'); }
    if (b !== 'desert') o.push('rawmeat', 'leather');
  }
  if (freshDist() <= 12) o.push('dirtywater', 'fish');
  return o;
}
function actWater() { if (freshDist() > 12) return; pass(.4, {}); found({ dirtywater: 3 }, 'Набрал воды'); done(); }
function actWood() {
  if (!wildOK()) return;
  const base = { forest: [2, 4], taiga: [2, 4], steppe: [0, 2], tundra: [0, 1], desert: [0, 1] }[curBiome];
  pass(1.5, {}); if (g.over) return done();
  const q = ri(base[0], base[1]) + (owns('axe') ? 2 : 0), got = {}; if (q) got.wood = q;
  addXp('surv', 2); found(got, 'Сбор дров');
  if (chance(.06)) return startCombat(makeEncounter('wild'), { intro: 'Пока ты возился с дровами, кто-то подошёл.' }, () => done());
  done();
}
function actForage() {
  if (!wildOK()) return; if (snowHere()) return UIH.toast('Под снегом ничего не найти.', '');
  pass(1.5, {}); if (g.over) return done();
  const b = curBiome, got = {}, lv = g.sk.surv[0], put = (k, a, c) => { const q = ri(a, c + (chance(.15 * lv) ? 1 : 0)); if (q > 0) got[k] = q; };
  if (b === 'forest' || b === 'taiga') { put('berries', 0, 3); put('mushrooms', 0, 3); put('herbs', 0, 2); }
  else if (b === 'steppe') { put('herbs', 0, 2); put('berries', 0, 1); }
  else if (b === 'tundra') { put('berries', 0, 3); }
  addXp('surv', 3); found(got, 'Собирательство'); done();
}
function actHunt() {
  if (!wildOK()) return;
  const rw = g.eq.ranged ? ITEMS[g.eq.ranged] : null, shoot = rw && has(rw.ammo), spear = g.eq.melee === 'spear';
  if (!shoot && !spear) return UIH.toast('Для охоты нужно стрелковое оружие с патронами или копьё.', 'bad');
  pass(3, {}); if (g.over) return done();
  if (chance(.12)) return startCombat(makeEncounter('wild'), { intro: 'Ты шёл по следу, а вышли на тебя.' }, () => done());
  if (shoot) take(rw.ammo, 1);
  if (curBiome !== 'desert' && chance((shoot ? .62 : .32) + .05 * g.sk.surv[0])) { const got = { rawmeat: ri(2, 4) }; if (chance(.7)) got.leather = ri(1, 2); addXp('surv', 6); found(got, 'Охота'); }
  else { addXp('surv', 2); log('Охота впустую.'); UIH.toast('Зверь ушёл', ''); }
  done();
}
function actFish() {
  if (!owns('fishrod') || freshDist() > 12) return;
  pass(2, {}); if (g.over) return done();
  const q = ri(0, 3) + (chance(.2 * g.sk.surv[0]) ? 1 : 0), got = {}; if (q) got.fish = q;
  addXp('surv', 3); found(got, 'Рыбалка'); done();
}

/* ---------- обыск ---------- */
function actSearch() {
  const s = curHere.site; if (!s) return; const st = siteState(s), m = BUILD[s.t]; if (st.s <= 0) return;
  pass(m.h, {}); if (g.over) return done();
  st.s--; g.stats.searched++;
  const zone = radAt(g.pos.x, g.pos.y) > .1;
  const loot = () => { const got = {}, bonus = 1 + .06 * g.sk.surv[0] + (owns('crowbar') ? .12 : 0) + .08 * pk('scout'); for (const r of m.loot) if (chance(Math.min(.95, r.p * bonus))) got[r[0]] = (got[r[0]] || 0) + (r.length > 2 ? ri(r[2], r[3]) : 1); addXp('surv', 2); found(got, s.n); };
  if (chance(m.dng * (isNight() ? 1.4 : 1) * (zone ? 1.3 : 1) * (friendlyCity() ? .3 : 1))) {
    return startCombat(makeEncounter(m.mil ? 'mil' : 'city'), { close: true, intro: `${m.n}: внутри кто-то есть.` }, res => { if (res === 'win') loot(); else { log('Обыск сорван.', 'bad'); st.s++; } done(); });
  }
  loot(); done();
}

/* ---------- предметы ---------- */
function actUse(k) {
  const it = ITEMS[k], u = it.use; if (!u || !has(k)) return; take(k, 1);
  const s = g.s, med = 1 + .1 * g.sk.med[0];
  for (const q of ['hunger', 'thirst', 'warmth', 'rad', 'mood']) if (u[q]) s[q] += u[q];
  if (u.hp) s.hp += u.hp * med;
  if (u.cure) for (const d of u.cure) if (g.dis[d]) { delete g.dis[d]; log(`${DIS[d].n}: лекарство помогло.`, 'good'); addXp('med', 5); }
  if (u.ease && g.dis[u.ease] > 0) g.dis[u.ease] = Math.max(1, g.dis[u.ease] - 30);
  if (u.pk) g.pk = g.time + u.pk;
  if (u.kit) { for (const w of g.wounds) { const d = WOUNDS[w.t]; if (d.bleed) w.b = 2; if (d.inf) w.c = 1; } addXp('med', 4); }
  if (u.burn) for (const w of g.wounds) if (w.t === 'burn') w.h *= .5;
  if (u.poison && chance(u.poison * Math.max(0, 1 - .3 * pk('stomach')))) getSick('poison', 'Живот скрутило: отравление.');
  if (u.dys && chance(u.dys)) getSick('dysentery', 'Вода была плохой: дизентерия.');
  if (k === 'dirtywater' && radAt(g.pos.x, g.pos.y) > .2) s.rad += 5;
  clampS(); if (u.time) pass(u.time, { rest: true }); else g.time += .05;
  done();
}
function actEquip(k) { const it = ITEMS[k], slot = it.c === 'melee' ? 'melee' : it.c === 'ranged' ? 'ranged' : it.slot; if (!slot || !has(k)) return; take(k, 1); if (g.eq[slot]) add(g.eq[slot], 1); g.eq[slot] = k; done(); }
function actUnequip(slot) { if (!g.eq[slot]) return; add(g.eq[slot], 1); g.eq[slot] = null; done(); }
function actTreat(i, kind) {
  const w = g.wounds[i]; if (!w) return;
  if (kind === 'band') { if (has('bandage')) { take('bandage'); w.b = 2; } else if (has('ragband')) { take('ragband'); w.b = 1; } else return; }
  else if (kind === 'clean') { const k = ['iodine', 'alcohol', 'vodka'].find(x => has(x)); if (!k) return; take(k); w.c = 1; }
  else if (kind === 'splint') { if (!has('splint')) return; take('splint'); w.sp = 1; }
  addXp('med', 4); g.time += .2; done();
}

/* ---------- крафт ---------- */
const wreckHere = t => { const s = curHere.site; if (!s) return null; const st = siteState(s); return st.wr === t ? st : null; };
function craftMiss(r) {
  const m = [];
  if (r.st[1] > 0 && g.st[r.st[0]] < r.st[1]) m.push(`${STATIONS[r.st[0]].n}, ур. ${r.st[1]}`);
  for (const k in r.need) if (!has(k, r.need[k])) m.push(ITEMS[k].n);
  for (const t of r.tools || []) if (!owns(t)) m.push(ITEMS[t].n);
  if (r.fire && !fireOn()) m.push('костёр');
  if (r.snow && !snowHere()) m.push('снег');
  if (r.sk && g.sk[r.sk[0]][0] < r.sk[1]) m.push(`${SKILLS[r.sk[0]]} ${r.sk[1]}`);
  if (r.wr && !wreckHere(r.wr)) m.push('остов в гаражах');
  return m;
}
const craftTime = r => r.h * Math.max(.5, 1 - .08 * g.sk.mech[0]) * (g.s.mood < 25 ? 1.3 : 1);
function actCraft(id, n) {
  const r = RECIPES.find(x => x.id === id); if (!r || craftMiss(r).length) return;
  n = r.veh ? 1 : Math.max(1, n || 1); let made = 0;
  for (let i = 0; i < n && !craftMiss(r).length; i++) {
    for (const k in r.need) take(k, r.need[k]);
    pass(craftTime(r), {}); if (g.over) return done();
    made++; if (!r.veh) for (const k in r.out) add(k, r.out[k]);
    if (r.xp) addXp(r.xp[0], r.xp[1]); else addXp('surv', 1);
  }
  if (r.veh) { if (r.wr) wreckHere(r.wr).wr = null; if (g.veh) log(`${VEH[g.veh.t].n} оставлен.`); g.veh = { t: r.veh, parked: null }; log(`Готово: ${VEH[r.veh].n.toLowerCase()}.`, 'good'); UIH.toast(VEH[r.veh].n + ' на ходу', 'good'); }
  else { const got = {}; for (const k in r.out) got[k] = r.out[k] * made; const t = fmtGot(got); log(`${r.n}: ${t}.`, 'good'); UIH.toast('Готово: ' + t, 'good'); }
  done();
}
function actUpgrade(k) {
  const S = STATIONS[k]; if (!S || !S.up) return; const lv = g.st[k], cost = S.up[lv]; if (!cost) return;
  for (const i in cost) if (!has(i, cost[i])) return UIH.toast('Не хватает: ' + ITEMS[i].n, 'bad');
  for (const i in cost) take(i, cost[i]);
  pass(1, {}); if (g.over) return done();
  g.st[k]++; addXp('mech', 8); log(`${S.n}: уровень ${g.st[k]}.`, 'good'); UIH.toast(`${S.n}: уровень ${g.st[k]}`, 'good'); done();
}
function perkOffer() { if (!g.perkOffer) { const ids = Object.keys(PERKS).filter(k => pk(k) < 3), o = []; while (o.length < 3 && ids.length) o.push(ids.splice(Math.floor(Math.random() * ids.length), 1)[0]); g.perkOffer = o; } return g.perkOffer; }
function actPerk(id) { if (g.perkPts <= 0 || !g.perkOffer || !g.perkOffer.includes(id)) return; g.perks[id] = pk(id) + 1; g.perkPts--; g.perkOffer = null; log(`Способность: ${PERKS[id].n}, уровень ${pk(id)}.`, 'good'); clampS(); done(); }

/* ---------- транспорт и путь ---------- */
function moveMode() {
  const w = weight(), cap = capacity(); let sp = 5, fuel = 0, id = 'foot', by = 'пешком', blocked = null;
  if (withVeh()) { const v = VEH[g.veh.t]; if (v.fuel && !has('fuel', .05)) blocked = 'Нет бензина. Заправься или оставь транспорт.'; else { sp = v.sp; fuel = v.fuel || 0; id = g.veh.t; by = v.by; } }
  const snow = snowHere(), fr = g.wounds.find(x => x.t === 'fracture');
  if (id === 'foot') { sp *= 1 + .08 * pk('walker'); if (snow) sp *= .8; if (isNight()) sp *= .9; if (fr) sp *= fr.sp ? .7 : .5; }
  if (id === 'bike') { if (snow) sp *= .5; if (fr) sp *= .6; }
  if (g.weather === 'blizzard') sp *= .6; else if (g.weather === 'rain') sp *= .9;
  if (w > cap * 1.4) blocked = 'Слишком тяжело. Выложи лишнее.'; else if (w > cap) sp *= .5;
  return { sp, fuel, id, by, blocked };
}
function clipRoute(x0, y0, x1, y1) {
  x1 = clamp(x1, 5, W - 5); y1 = clamp(y1, 5, H - 5);
  const d = hyp(x1 - x0, y1 - y0), n = Math.max(1, Math.ceil(d / 4)); let lx = x0, ly = y0, run = 0;
  for (let i = 1; i <= n; i++) { const t = i / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t; if (isWater(x, y)) { run += d / n; if (run > 40) return { x: lx, y: ly, cut: true }; } else { run = 0; lx = x; ly = y; } }
  return { x: lx, y: ly, cut: isWater(x1, y1) };
}
function routeInfo(tx, ty) { const e = clipRoute(g.pos.x, g.pos.y, tx, ty), km = hyp(e.x - g.pos.x, e.y - g.pos.y), m = moveMode(); return { x: e.x, y: e.y, cut: e.cut, km, m, h: km / m.sp, fuel: km * m.fuel }; }
function startTrip(tx, ty) {
  const r = routeInfo(tx, ty);
  if (r.km < .05) { UIH.toast(r.cut ? 'Туда не пройти: вода.' : 'Ты уже здесь.', ''); return false; }
  if (r.m.blocked) { UIH.toast(r.m.blocked, 'bad'); return false; }
  trip = { tx: r.x, ty: r.y, total: r.km, rate: r.h / clamp(r.h * .4, 1.2, 16), saveT: 0 };
  return true;
}
function stopTrip(msg) { trip = null; if (msg) { log(msg); UIH.toast(msg, ''); } UIH.tripEnd(false); done(); }
function tripStep(realDt) {
  if (!trip || g.over || g.combat) return;
  const m = moveMode(); if (m.blocked) return stopTrip(m.blocked);
  let dtH = trip.rate * Math.min(realDt, .1), dist = m.sp * dtH; const rem = hyp(trip.tx - g.pos.x, trip.ty - g.pos.y);
  if (dist >= rem) { dist = rem; dtH = rem / m.sp; }
  if (m.fuel) { const need = dist * m.fuel; if (!has('fuel', need)) return stopTrip('Бензин кончился.'); take('fuel', need); }
  if (rem > 1e-6) { g.pos.x += (trip.tx - g.pos.x) / rem * dist; g.pos.y += (trip.ty - g.pos.y) / rem * dist; }
  g.stats.km += dist; locate(); discover(); step(dtH, { move: m.id });
  if (g.over) { trip = null; return done(); }
  if (warnCheck()) return stopTrip('');
  if (rem - dist < .02) { trip = null; if (curHere.site) log(`Прибыл: ${curHere.site.n}${curHere.city ? ', ' + curHere.city.n : ''}.`); UIH.tripEnd(true); return done(); }
  let er = (m.id === 'moto' || m.id === 'car') ? .012 : .03; if (isNight()) er *= 1.5; if (radAt(g.pos.x, g.pos.y) > .2) er *= 1.4; const f = factionAt(g.pos.x, g.pos.y); if (f && hostile(f)) er *= 2; if (friendlyCity()) er *= .3;
  if (!isWater(g.pos.x, g.pos.y) && chance(er * dtH)) { const enc = makeEncounter(curHere.city ? 'city' : 'wild'); trip = null; UIH.tripEnd(false); return startCombat(enc, {}, () => done()); }
  if (chance(.006 * dtH)) { const r = pickW(BUILD.camp.loot), got = {}; got[r[0]] = 1; add(r[0], 1); log('Находка у дороги: ' + fmtGot(got) + '.', 'good'); UIH.toast('Находка: ' + fmtGot(got), 'good'); }
  trip.saveT += realDt; if (trip.saveT > 4) { trip.saveT = 0; save(); }
}
function actPark() { if (!withVeh()) return; g.veh.parked = { x: g.pos.x, y: g.pos.y }; log(`${VEH[g.veh.t].n} оставлен здесь.`); done(); }
function actBoard() { const v = g.veh; if (!v || !v.parked || hyp(v.parked.x - g.pos.x, v.parked.y - g.pos.y) > 3) return; v.parked = null; done(); }

/* ---------- бой ---------- */
function encPool(ctx) {
  const { x, y } = g.pos, f = factionAt(x, y); let pool;
  if (ctx === 'city') pool = [['rat', 3], ['bigrat', 1], ['dog', 3], ['marauder', 3], ['gunman', 1.5]];
  else if (ctx === 'mil') pool = [['gunman', 2], ['deserter', 3], ['marauder', 1]];
  else pool = WILD[curBiome].slice();
  if (radAt(x, y) > .15) pool = pool.concat([['glowdog', 4], ['burnt', 3], ['mwolf', 2], ['mboar', 1.5], ['mbear', .6]]);
  if (f && hostile(f) && ctx === 'wild') pool = pool.concat([[FACTIONS[f].unit, 7]]);
  return pool;
}
function makeEncounter(ctx) { const k = pickW(encPool(ctx))[0], e = ENEMIES[k]; return { k, n: ri(e.grp[0], e.grp[1]) }; }
function startCombat(enc, opt, cb) {
  const e = ENEMIES[enc.k], en = [];
  for (let i = 0; i < enc.n; i++) en.push({ k: enc.k, hp: e.hp, d: (opt.close ? ri(4, 14) : e.rng ? ri(25, Math.min(60, e.rng + 15)) : ri(14, 38)) + i * ri(0, 4) });
  const who = enc.n > 1 ? `${e.n} — ${enc.n}` : e.n;
  g.combat = { en, tgt: 0, f: e.f || null, log: [(opt.intro ? opt.intro + ' ' : '') + `Противник: ${who}.`] };
  combatCb = cb; trip = null; UIH.combat();
}
function playerAcc(w, d) { const base = w.rng ? (d > w.rng ? .1 : w.acc - d / w.rng * .45) : .85; return clamp(base + (w.rng ? .04 * pk('marksman') : 0) + .04 * g.sk.fight[0] - .05 * painLevel() - (g.s.mood < 25 ? .12 : 0), .08, .96); }
const fleeChance = () => { const c = g.combat, al = c.en.filter(x => x.hp > 0), md = Math.min(...al.map(x => x.d)); return clamp(.3 + md / 50 * .4 + (withVeh() ? .25 : 0) - (g.wounds.some(x => x.t === 'fracture') ? .25 : 0) - (al.some(x => ENEMIES[x.k].rng >= x.d) ? .15 : 0), .08, .95); };
const bribeCost = () => 12 * g.combat.en.filter(x => x.hp > 0).length;
function hitPlayer(x, e, push) {
  const dmg = Math.max(1, ri(e.dmg[0], e.dmg[1]) - armor()); g.s.hp -= dmg; if (e.rad) g.s.rad += e.rad; if (e.venom && chance(.35)) getSick('poison', 'Змеиный яд: тошнит и темнеет в глазах.');
  let w = null; const r = Math.random();
  if (e.atk === 'bite') { if (r < .45) w = 'bite'; } else if (e.atk === 'claw') { if (r < .6) w = 'cut'; } else if (e.atk === 'blade') { if (r < .5) w = 'cut'; }
  else if (e.atk === 'blunt') { if (r < .08) w = 'fracture'; else if (r < .5) w = 'bruise'; } else if (e.atk === 'shot') { if (r < .6) w = 'gunshot'; }
  if (w) addWound(w);
  push(`${e.n}: −${dmg} здоровья${w ? ' · ' + WOUNDS[w].n.toLowerCase() : ''}.`);
}
function cAct(a, arg) {
  const c = g.combat; if (!c) return;
  const push = m => c.log.push(m), alive = () => c.en.filter(x => x.hp > 0);
  if (a === 'tgt') { if (c.en[+arg] && c.en[+arg].hp > 0) c.tgt = +arg; return UIH.combat(); }
  if (!c.en[c.tgt] || c.en[c.tgt].hp <= 0) c.tgt = c.en.findIndex(x => x.hp > 0);
  const t = c.en[c.tgt], te = ENEMIES[t.k], fl = 1 + .05 * g.sk.fight[0];
  if (a === 'melee') {
    const w = g.eq.melee ? ITEMS[g.eq.melee] : { n: 'Кулаки', dmg: [2, 4], reach: 2 };
    if (t.d > w.reach) { push(`До цели ${Math.round(t.d)} м — слишком далеко для удара.`); return UIH.combat(); }
    if (chance(playerAcc(w, t.d))) { const dmg = Math.round(ri(w.dmg[0], w.dmg[1]) * fl * (1 + .1 * pk('heavy'))); t.hp -= dmg; push(`${w.n}: ${te.n} −${dmg}${t.hp <= 0 ? ' — готов' : ''}.`); } else push(`${w.n}: мимо.`);
  } else if (a === 'ranged') {
    const w = g.eq.ranged ? ITEMS[g.eq.ranged] : null; if (!w || !has(w.ammo)) { push('Стрелять нечем.'); return UIH.combat(); }
    const shots = Math.min(w.burst || 1, g.inv[w.ammo]);
    for (let i = 0; i < shots; i++) {
      take(w.ammo, 1); let x = c.en[c.tgt]; if (!x || x.hp <= 0) { c.tgt = c.en.findIndex(q => q.hp > 0); x = c.en[c.tgt]; if (!x) break; }
      if (chance(playerAcc(w, x.d))) { let dmg = ri(w.dmg[0], w.dmg[1]) * fl; if (w.spread && x.d > 8) dmg *= Math.max(.4, 1 - (x.d - 8) / w.rng * .7); dmg = Math.round(dmg); x.hp -= dmg; push(`${w.n}: ${ENEMIES[x.k].n} −${dmg}${x.hp <= 0 ? ' — готов' : ''}.`); }
      else push(`${w.n}: мимо.`);
    }
  } else if (a === 'near') { for (const x of alive()) x.d = Math.max(1.5, x.d - 8); push('Ты идёшь на сближение.'); }
  else if (a === 'far') { for (const x of alive()) x.d += 5; push('Ты отходишь.'); }
  else if (a === 'heal') {
    const i = g.wounds.findIndex(w => w.bl > 0 && !w.b);
    if (i >= 0 && (has('bandage') || has('ragband'))) { if (has('bandage')) { take('bandage'); g.wounds[i].b = 2; } else { take('ragband'); g.wounds[i].b = 1; } push('Ты наскоро перевязал рану.'); }
    else if (has('medkit')) { take('medkit'); g.s.hp += 40 * (1 + .1 * g.sk.med[0]); for (const w of g.wounds) { if (WOUNDS[w.t].bleed) w.b = 2; if (WOUNDS[w.t].inf) w.c = 1; } clampS(); push('Аптечка: +здоровье.'); }
    else { push('Лечиться нечем.'); return UIH.combat(); }
  } else if (a === 'flee') {
    if (chance(fleeChance())) return endCombat('flee'); push('Уйти не удалось.');
  } else if (a === 'bribe') {
    const cost = bribeCost(); if (!c.f || !FACTIONS[c.f].gang || !has('coupon', cost)) return UIH.combat();
    take('coupon', cost); g.rep[c.f] = clamp(g.rep[c.f] + 6, -100, 100); log(`Откупился от банды «${FACTIONS[c.f].n}»: ${cost} талонов.`); return endCombat('bribe');
  }
  if (!alive().length) return endCombat('win');
  for (const x of c.en) {
    if (x.hp <= 0) continue; const e = ENEMIES[x.k];
    if (e.rng) { if (x.d <= e.rng) { if (chance(Math.max(.15, e.acc * (1 - x.d / e.rng * .5)))) hitPlayer(x, e, push); else push(`${e.n} стреляет — мимо.`); } else x.d = Math.max(e.rng * .8, x.d - e.spd); }
    else if (x.d <= 2.5) { if (chance(.75)) hitPlayer(x, e, push); else push(`${e.n} промахивается.`); }
    else x.d = Math.max(2, x.d - e.spd);
  }
  g.time += .03;
  if (g.s.hp <= 0) { die('Погиб в бою: ' + te.n.toLowerCase()); return done(); }
  UIH.combat();
}
function endCombat(res) {
  const c = g.combat, cb = combatCb; g.combat = null; combatCb = null;
  if (res === 'win') {
    const got = {}; let xp = 0;
    for (const x of c.en) { const e = ENEMIES[x.k]; xp += e.xp; g.stats.kills++; for (const d of e.drop) if (chance(d[1])) { const q = ri(d[2], d[3]); gput(d[0], q); got[d[0]] = (got[d[0]] || 0) + q; } }
    if (c.f) { g.rep[c.f] = clamp(g.rep[c.f] - 8, -100, 100); if (FACTIONS[c.f].gang) { g.rep.gar = clamp(g.rep.gar + 1, -100, 100); g.rep.put = clamp(g.rep.put + 1, -100, 100); } }
    g.s.mood = clamp(g.s.mood + 3, 0, 100); addXp('fight', xp);
    const t = fmtGot(got); log(`Победа. ${t ? 'Трофеи лежат на земле: ' + t + '.' : 'Трофеев нет.'}`, 'good'); UIH.toast(t ? 'Трофеи на земле: ' + t : 'Победа', 'good');
  } else if (res === 'flee') { log('Удалось уйти.'); UIH.toast('Ты ушёл', ''); }
  if (cb) cb(res); else done();
}

/* ---------- торговля ---------- */
const baseHere = () => curHere.site && curHere.site.t === 'base' && curHere.city ? curHere.city.f : null;
const canTrade = f => g.rep[f] > (FACTIONS[f].gang ? -10 : -20);
function stockOf() { const key = curHere.site.id, f = baseHere(); let s = g.stock[key]; if (!s || g.time - s.t > 72) { const it = {}; for (const r of STOCKS[FACTIONS[f].stock]) { const q = ri(r[1], r[2]); if (q > 0) it[r[0]] = q; } s = g.stock[key] = { t: g.time, it }; } return s; }
const buyPrice = (k, f) => Math.max(1, Math.ceil(ITEMS[k].v * 1.35 * (1 - g.rep[f] / 250)));
const sellPrice = (k, f) => Math.max(1, Math.floor(ITEMS[k].v * .55 * (1 + g.rep[f] / 250)));
function actBuy(k) { const f = baseHere(); if (!f || !canTrade(f)) return; const s = stockOf(), p = buyPrice(k, f); if (!s.it[k] || !has('coupon', p)) return; take('coupon', p); add(k, 1); if (--s.it[k] <= 0) delete s.it[k]; g.rep[f] = clamp(g.rep[f] + ITEMS[k].v / 60, -100, 100); done(); }
function actSell(k) { const f = baseHere(); if (!f || !canTrade(f) || !has(k) || k === 'coupon') return; const s = stockOf(), n = Math.min(1, g.inv[k]); take(k, n); add('coupon', Math.max(1, Math.round(sellPrice(k, f) * n))); s.it[k] = (s.it[k] || 0) + n; g.rep[f] = clamp(g.rep[f] + ITEMS[k].v / 60, -100, 100); done(); }
const repWord = f => { const r = g.rep[f]; return r <= -20 ? 'враждебны' : r < 10 ? 'нейтральны' : r < 40 ? 'расположены' : 'свой человек'; };

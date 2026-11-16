'use strict';
/* Данные мира: география, предметы, постройки, рецепты, противники, фракции. */
window.D = (function () {
  const LON0 = 19, LAT1 = 78.5, KX = 60, KY = 111;
  const W = (191 - LON0) * KX, H = (LAT1 - 35) * KY;
  const proj = (lon, lat) => [(lon - LON0) * KX, (LAT1 - lat) * KY];
  const unproj = (x, y) => [x / KX + LON0, LAT1 - y / KY];
  const pl = a => { const o = []; for (let i = 0; i < a.length; i += 2) o.push(proj(a[i], a[i + 1])); return o; };

  /* ---------- шум и ГСЧ ---------- */
  function hash2(x, y) { let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ 0x5bd1e995; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
  function vnoise(x, y) { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi; const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf); const a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
  function fbm(x, y) { let v = 0, a = .5, f = 1; for (let i = 0; i < 4; i++) { v += a * vnoise(x * f, y * f); f *= 2; a *= .5; } return v / .9375; }
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h | 0; }

  /* ---------- вода (lon, lat парами) ---------- */
  const SEAS = [
    // Северный Ледовитый и Тихий океаны
    pl([19,78.5, 19,69.8, 22,70.5, 25.5,71, 28,71, 31,70.3, 31,69.8, 33.5,69.4, 36,69.1, 40.5,68, 41.3,67, 41,66.3, 39,66.1, 36.5,66.3, 34.5,66.6, 33,66.7, 32.6,67.1, 33.5,66.4, 34.8,65.2, 34.7,64.5, 36.5,64, 37.8,63.9, 38.3,64.7, 39.8,64.6, 40.6,64.6, 40,65.2, 40.5,65.9, 42.2,66.5, 43.8,66.2, 44.2,65.9, 44.5,67, 43.8,68.5, 45.5,68.4, 46.5,67.8, 47.8,67, 49,67.8, 51,68.4, 53.5,68.9, 54.5,68.3, 57,68.6, 59.5,68.8, 60.8,69.8, 63,69.6, 64.8,69.2, 66.5,68.7, 67.2,68.6, 68.2,68.4, 69,68.9, 67.8,69.7, 66.9,70.8, 67.5,71.8, 69,72.9, 71.5,73.2, 72.8,72.7, 72.5,71.3, 73.3,69.5, 72.2,68.3, 73.5,67.3, 71.8,66.6, 72.2,66.2, 74.5,67, 74.8,68.5, 74.2,69.8, 73.8,71.2, 75,72.4, 77.5,72.2, 78,71.3, 79.5,70.8, 82.8,70.4, 83.3,71.5, 81,72.5, 80.6,73.4, 84.5,73.8, 87,74.8, 91,75.6, 96,76.1, 100,76.5, 104.2,77.6, 106.5,76.6, 111.5,76.5, 113.5,75.6, 110.5,74.2, 107.5,73.3, 106,73.1, 110,73.9, 113.5,73.6, 118,73.5, 123.5,73.4, 127,73.4, 129.5,72.8, 129.2,71.6, 131,71, 133.5,71.5, 137.5,71.4, 139.5,72.3, 141.5,72.8, 145.5,72.4, 149.5,72, 152,70.9, 155,71, 159.8,70.5, 160.8,69.6, 164,69.7, 167.5,69.8, 170.6,70, 173,69.9, 176,69.7, 179.5,69, 183,67.9, 186.5,67, 190,66.1, 188,65.5, 187,64.4, 184,64.7, 181.5,65.4, 179,65, 178.2,64.9, 178,64.4, 179.5,63, 179.3,62.4, 176,61.9, 173.5,61.5, 170.5,60, 167,60.2, 164.5,59.9, 163.3,59, 163.2,57.8, 162.8,56.2, 161.8,55, 160,53.2, 158.9,52.9, 158.3,51.9, 156.7,51, 156,52.5, 155.6,55, 155.7,57, 157,57.8, 158.5,58.5, 160.5,60.5, 162.5,61.6, 164.5,62.5, 163,62.4, 160.5,61.8, 159.5,61.7, 157,61.6, 155,59.8, 153,59.1, 150.9,59.45, 149,59.6, 146,59.3, 143.3,59.25, 141.5,58.6, 139.5,57.3, 138,56.2, 136,54.8, 137.3,53.8, 139.5,54.2, 141.2,53.3, 141.3,52.2, 140.6,50.8, 140.4,49, 140.3,48.5, 139,47.2, 138.3,46.3, 136.5,44.8, 135.2,43.6, 133.2,42.8, 132.1,42.95, 131.3,42.7, 130.7,42.3, 129.8,41, 129.3,39.5, 128.4,38.2, 129.4,36.5, 129.3,35, 191,35, 191,78.5]),
    // Балтика
    pl([19,54.4, 20,54.45, 20.9,55.2, 21.05,56, 21,57, 21.6,57.6, 22.6,57.75, 23.3,57.1, 24,57.05, 24.4,57.9, 24.4,58.3, 23.5,58.6, 23.4,59.2, 24.6,59.5, 26,59.65, 28,59.6, 29.8,59.95, 30.15,59.97, 29.5,60.2, 28.6,60.55, 27,60.5, 25,60.2, 23,59.85, 22,60.3, 21.3,61, 21.3,62.5, 19,63]),
    // Чёрное море
    pl([28.6,43.8, 28.7,44.6, 29.7,45.2, 30.2,45.9, 30.75,46.4, 31.6,46.55, 32.3,46.2, 33.5,46.05, 33.6,45.9, 32.6,45.4, 33.4,45.1, 33.45,44.55, 34.2,44.42, 35.3,44.95, 36.6,45.1, 37.3,45.05, 37.75,44.65, 39,44.05, 39.75,43.5, 41,42.9, 41.6,41.7, 41,41, 37,41, 33,42, 31,41.2, 29,41.3, 28,42, 27.9,43.2]),
    // Азовское
    pl([35,46.2, 35.4,46.4, 36.6,46.75, 37.6,47.05, 38.6,47.15, 39.25,47.05, 38.4,46.65, 38,46.1, 37.9,45.5, 37.3,45.3, 36.7,45.4, 35.6,45.35, 35,45.8]),
    // Каспий
    pl([47,45, 47.6,45.6, 48.5,46, 49.5,46.4, 51,46.9, 52.5,46.9, 53.1,46.3, 52.9,45.4, 51.4,45.2, 50.4,44.6, 50.9,44.2, 51.15,43.6, 52,42.8, 52.7,41.7, 52.5,41.2, 53.6,40.9, 52.9,40, 53.3,39.2, 53.8,37.6, 52,36.9, 50.5,36.8, 49.2,37.6, 48.9,38.4, 49.3,39.3, 49.5,40.3, 50.3,40.35, 49.6,40.65, 49.2,41.2, 48.6,41.9, 47.55,42.95, 47.5,43.7, 46.8,44.4]),
    // Арал
    pl([58.5,46.8, 60.8,46.7, 61.6,45.6, 60.5,44.3, 59.5,43.5, 58.2,43.7, 58.3,45.2])
  ];
  const ISLES = [
    pl([142.1,54.3, 142.9,54.2, 143.3,52.5, 143.2,51, 144.2,49.3, 144.6,49, 143.2,48.8, 142.6,47.6, 143.5,46.8, 143.6,46.2, 142.5,46.7, 142,46, 141.9,47.5, 142.1,49, 142.2,51, 141.7,52.2, 141.9,53.4]),
    pl([51.5,71, 53,70.9, 56,72.2, 57.8,73.5, 62,75.4, 68.5,76.7, 66,77.1, 60,76.3, 55.5,74.6, 52.5,72.5])
  ];
  const LAKES = [
    pl([103.7,51.6, 104.5,51.45, 106,52.2, 108.5,53.3, 109.9,55.3, 109.5,55.8, 108.3,54.6, 106.8,53.3, 105.3,52.5, 104.3,51.95]),
    pl([30.9,59.95, 32.9,60.2, 32.8,61.2, 30.9,61.6, 30,61, 30.4,60.2]),
    pl([35.3,61, 36.4,61.3, 35.9,62.4, 34.6,62.7, 34.4,61.8]),
    pl([73.7,45.2, 75,46.6, 77,46.65, 79,46.5, 78.5,46, 76,46.2, 74.5,45])
  ];
  const RIVERS = [
    pl([33,57.2, 35.9,56.9, 38.8,58, 39.9,57.6, 44,56.3, 49.1,55.8, 48.4,54.3, 50.1,53.2, 46,51.5, 44.5,48.7, 48,46.35]), // Волга
    pl([38,54, 39.2,51.7, 42,49.5, 43.7,48.6, 39.7,47.2]), // Дон
    pl([33.2,55.3, 32,54.8, 30.5,53.9, 30.5,50.45, 35,48.45, 35.1,47.85, 32.6,46.6]), // Днепр
    pl([56.2,58, 53,56, 49.3,55.4]), // Кама
    pl([59,53.4, 58.6,51.2, 55.1,51.8, 51.4,51.2, 51.9,47.1]), // Урал
    pl([46.3,60.75, 42.5,62.5, 40.5,64.5]), // Сев. Двина
    pl([57,62, 57.2,65.1, 52.3,67.6, 54,68.2]), // Печора
    pl([85.2,52.5, 83.8,53.35, 82.9,55, 84.9,56.5, 77,61, 73.4,61.25, 69,61, 66.6,66.5, 72,66.5]), // Обь
    pl([83,48, 80.2,50.4, 77,52.3, 73.4,55, 68.2,58.2, 69,61]), // Иртыш
    pl([94.4,51.7, 91.4,53.7, 92.9,56, 92.1,58.4, 90,61.7, 87.9,65.8, 86.2,69.4, 82.5,70.8]), // Енисей
    pl([104.3,52.3, 101.6,56.15, 98,58, 93.5,58.1]), // Ангара
    pl([106,54, 105.8,56.8, 114,60.3, 120.4,60.4, 129.7,62, 127.5,64, 126,68, 127,72.4]), // Лена
    pl([121.5,53.3, 127.5,50.3, 131,47.7, 135,48.5, 137,50.5, 140.5,53]), // Амур
    pl([152,62.5, 153.7,65.7, 161,68.7, 161.5,69.5]), // Колыма
    pl([69,40.5, 68,43.2, 65.5,44.85, 61,46]), // Сырдарья
    pl([68,37.3, 63.6,39.1, 60.6,41.55, 59.5,43.3]) // Амударья
  ];
  const bbox = p => { let a = 1e9, b = 1e9, c = -1e9, d = -1e9; for (const q of p) { a = Math.min(a, q[0]); b = Math.min(b, q[1]); c = Math.max(c, q[0]); d = Math.max(d, q[1]); } p.bb = [a, b, c, d]; };
  [...SEAS, ...ISLES, ...LAKES].forEach(bbox);
  function inPoly(p, x, y) { const bb = p.bb; if (x < bb[0] || x > bb[2] || y < bb[1] || y > bb[3]) return false; let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const a = p[i], b = p[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; }
  function isWater(x, y) { if (x < 0 || y < 0 || x > W || y > H) return true; for (const p of ISLES) if (inPoly(p, x, y)) return false; for (const p of SEAS) if (inPoly(p, x, y)) return true; for (const p of LAKES) if (inPoly(p, x, y)) return true; return false; }

  /* ---------- природные зоны ---------- */
  function biome(lon, lat) {
    const la = lat + (vnoise(lon * .35, lat * .5) - .5) * 2.4;
    if (la >= 66.5) return 'tundra';
    if (lon > 46 && lon < 88 && la < 46.5) return 'desert';
    if (lon < 45 ? la < 49.5 : lon < 98 ? la < 51.5 : lon < 120 ? la < 50.5 : false) return 'steppe';
    if (lon >= 120) return la > 50 ? 'taiga' : 'forest';
    if (la > 57.5 || lon > 62) return 'taiga';
    return 'forest';
  }
  const BIOME = { tundra: 'Тундра', taiga: 'Тайга', forest: 'Лес', steppe: 'Степь', desert: 'Пустыня' };

  /* ---------- города: название, широта, долгота, размер ---------- */
  const CITIES = [
    ['Мурманск',68.97,33.08,2],['Архангельск',64.54,40.54,2],['Петрозаводск',61.79,34.35,2],['Санкт-Петербург',59.94,30.31,3],['Псков',57.82,28.33,2],['Великий Новгород',58.52,31.27,2],['Калининград',54.71,20.51,2],['Таллин',59.44,24.75,2],['Рига',56.95,24.11,2],['Вильнюс',54.69,25.28,2],['Минск',53.9,27.57,3],['Брест',52.1,23.7,1],['Гомель',52.43,31,2],['Киев',50.45,30.52,3],['Львов',49.84,24.03,2],['Одесса',46.48,30.73,3],['Харьков',49.99,36.23,3],['Днепр',48.46,35.05,3],['Донецк',48,37.8,3],['Севастополь',44.6,33.53,2],['Кишинёв',47.01,28.86,2],
    ['Смоленск',54.78,32.05,2],['Тверь',56.86,35.9,2],['Москва',55.75,37.62,3],['Тула',54.19,37.62,2],['Рязань',54.63,39.74,2],['Ярославль',57.63,39.87,2],['Вологда',59.22,39.89,2],['Нижний Новгород',56.33,44,3],['Казань',55.79,49.12,3],['Воронеж',51.67,39.2,2],['Курск',51.73,36.19,2],['Ростов-на-Дону',47.23,39.72,3],['Краснодар',45.04,38.98,2],['Сочи',43.6,39.73,2],['Волгоград',48.71,44.51,3],['Саратов',51.53,46.03,2],['Самара',53.2,50.15,3],['Ульяновск',54.32,48.4,2],['Пенза',53.2,45,2],['Астрахань',46.35,48.04,2],['Махачкала',42.98,47.5,2],['Грозный',43.32,45.69,2],['Тбилиси',41.72,44.79,3],['Ереван',40.18,44.51,2],['Баку',40.41,49.87,3],
    ['Киров',58.6,49.66,2],['Сыктывкар',61.67,50.84,2],['Ухта',63.57,53.7,1],['Воркута',67.5,64.04,1],['Нарьян-Мар',67.64,53,1],['Пермь',58.01,56.25,3],['Ижевск',56.85,53.2,2],['Уфа',54.74,55.97,3],['Оренбург',51.77,55.1,2],['Екатеринбург',56.84,60.6,3],['Челябинск',55.16,61.4,3],['Магнитогорск',53.42,58.98,2],['Тюмень',57.15,65.53,2],['Курган',55.44,65.34,2],['Тобольск',58.2,68.25,1],['Сургут',61.25,73.4,2],['Нижневартовск',60.94,76.56,2],['Салехард',66.53,66.6,1],['Новый Уренгой',66.08,76.63,1],['Норильск',69.35,88.2,2],
    ['Омск',54.99,73.37,3],['Новосибирск',55.03,82.92,3],['Томск',56.5,84.97,2],['Барнаул',53.35,83.78,2],['Кемерово',55.35,86.09,2],['Новокузнецк',53.76,87.12,2],['Красноярск',56.01,92.87,3],['Абакан',53.72,91.43,2],['Кызыл',51.72,94.44,1],['Туруханск',65.8,87.96,1],['Хатанга',71.98,102.47,1],['Братск',56.15,101.63,2],['Усть-Кут',56.79,105.77,1],['Иркутск',52.29,104.3,2],['Улан-Удэ',51.83,107.6,2],['Чита',52.03,113.5,2],['Мирный',62.54,113.96,1],['Якутск',62.03,129.73,2],['Тикси',71.64,128.87,1],['Нерюнгри',56.66,124.71,1],['Тында',55.15,124.72,1],['Благовещенск',50.27,127.53,2],['Хабаровск',48.48,135.08,2],['Комсомольск-на-Амуре',50.55,137,2],['Николаевск-на-Амуре',53.14,140.73,1],['Владивосток',43.12,131.89,3],['Охотск',59.36,143.2,1],['Усть-Нера',64.57,143.2,1],['Магадан',59.56,150.8,2],['Петропавловск-Камчатский',53.02,158.65,2],['Анадырь',64.73,177.5,1],['Певек',69.7,170.3,1],['Южно-Сахалинск',46.96,142.73,2],['Оха',53.57,142.95,1],
    ['Астана',51.17,71.43,2],['Караганда',49.8,73.1,2],['Алматы',43.24,76.9,3],['Павлодар',52.3,76.95,2],['Семей',50.41,80.25,2],['Актобе',50.28,57.2,2],['Атырау',47.1,51.92,1],['Актау',43.65,51.2,1],['Костанай',53.21,63.63,2],['Кызылорда',44.85,65.5,1],['Шымкент',42.32,69.6,2],['Ташкент',41.3,69.24,3],['Самарканд',39.65,66.96,2],['Бишкек',42.87,74.59,2],['Душанбе',38.56,68.77,2],['Ашхабад',37.95,58.38,2],['Нукус',42.46,59.6,1]
  ].map(a => { const [x, y] = proj(a[2], a[1]); return { n: a[0], lat: a[1], lon: a[2], size: a[3], x, y, r: [0, 10, 18, 30][a[3]] }; });
  const CITY = {}; CITIES.forEach(c => CITY[c.n] = c);

  /* ---------- очаги заражения: город, радиус км, уровень ---------- */
  const ZONES = [['Москва',110,3],['Санкт-Петербург',80,3],['Киев',80,2],['Минск',60,2],['Харьков',50,2],['Севастополь',50,3],['Мурманск',60,3],['Архангельск',50,2],['Нижний Новгород',50,2],['Самара',50,2],['Екатеринбург',70,3],['Челябинск',70,3],['Омск',50,2],['Новосибирск',70,2],['Красноярск',60,3],['Семей',90,3],['Норильск',40,1],['Владивосток',60,3],['Хабаровск',50,2],['Петропавловск-Камчатский',40,3],['Баку',50,2],['Ташкент',50,2],['Алматы',40,2]]
    .map(z => ({ n: z[0], x: CITY[z[0]].x, y: CITY[z[0]].y, r: z[1], lvl: z[2] }));

  /* ---------- фракции и банды ---------- */
  const FACTIONS = {
    put: { n: 'Путейцы', d: 'Держат узловые станции и водят обозы по насыпям. Торгуют со всеми, кто не стреляет первым.', c: '#74b4dc', rep: 0, tr: 260, unit: 'putguard', stock: 'general', bases: ['Вологда', 'Киров', 'Тюмень', 'Братск', 'Чита', 'Тында'] },
    gar: { n: 'Гарнизон', d: 'Остатки армейских частей. Порядок, пайки и оружие — для тех, кому доверяют.', c: '#93c097', rep: 0, tr: 260, unit: 'soldier', stock: 'arms', bases: ['Псков', 'Пенза', 'Оренбург', 'Курган', 'Иркутск', 'Якутск'] },
    art: { n: 'Артель', d: 'Мастеровые заводских городов. Чинят всё, что ездит и стреляет.', c: '#dba55c', rep: 0, tr: 240, unit: 'artguard', stock: 'parts', bases: ['Ижевск', 'Магнитогорск', 'Новокузнецк', 'Караганда', 'Донецк'] },
    oboz: { n: 'Чёрные обозы', gang: 1, d: 'Налётчики на грузовиках. Берут дань на южных трассах.', c: '#d05a41', rep: -25, tr: 320, unit: 'oboz', stock: 'loot', bases: ['Курск', 'Ростов-на-Дону', 'Волгоград'] },
    step: { n: 'Степняки', gang: 1, d: 'Конные банды. В степи от них не уйти пешком.', c: '#c2ad4f', rep: -25, tr: 340, unit: 'rider', stock: 'loot', bases: ['Актобе', 'Кызылорда', 'Павлодар'] },
    taiga: { n: 'Таёжные', gang: 1, d: 'Браконьеры и беглые. Тайга за Енисеем — их угодья.', c: '#a487c9', rep: -25, tr: 360, unit: 'poacher', stock: 'hunt', bases: ['Туруханск', 'Усть-Кут', 'Мирный'] }
  };
  const BASES = [];
  for (const k in FACTIONS) for (const n of FACTIONS[k].bases) { const c = CITY[n]; c.f = k; BASES.push({ f: k, x: c.x, y: c.y, r: FACTIONS[k].tr, n }); }
  const STOCKS = {
    general: [['canned',4,8],['crackers',4,8],['water',4,8],['buckwheat',3,6],['salt',2,4],['tealeaf',2,4],['matches',10,20],['bandage',3,6],['cloth',4,8],['fuel',5,15],['tobacco',2,5],['coal',3,6],['rope',2,4],['coldmed',1,3],['iodine',1,3],['backpack',0,1],['tent',0,1],['sleepbag',0,1],['pot',0,1],['sewkit',0,1],['wheel',0,2]],
    arms: [['a9',10,30],['a12',8,20],['a762',10,30],['pistol',0,1],['shotgun',0,1],['rifle',0,1],['vest',0,1],['helmet',0,2],['medkit',1,3],['antirad',1,3],['canned',3,6],['gasmask',0,1],['geiger',0,1],['boots',1,2],['antibiotic',1,2]],
    parts: [['wheel',2,4],['battery',1,2],['chain',1,2],['bikeframe',0,1],['toolkit',0,1],['scrap',5,10],['wire',4,8],['electronics',2,5],['rubber',2,5],['fuel',10,25],['tape',3,6],['nails',4,8],['crowbar',0,1],['axe',0,1],['gunpowder',2,5]],
    loot: [['vodka',2,5],['canned',2,5],['fuel',5,15],['a12',5,15],['a9',5,15],['tobacco',3,6],['knife',1,2],['jerky',2,5],['leather',2,4],['painkiller',1,3]],
    hunt: [['jerky',4,8],['leather',3,6],['a12',8,20],['a762',5,15],['furcoat',0,1],['valenki',0,1],['ushanka',1,2],['fishrod',1,2],['bow',0,1],['herbs',3,6],['rifle',0,1],['salt',2,4]]
  };

  /* ---------- предметы ---------- */
  // c: категория; w: вес кг; v: цена в талонах
  const ITEMS = {
    canned: { n: 'Тушёнка', c: 'food', w: .4, v: 14, use: { hunger: 38 } },
    cfish: { n: 'Рыбные консервы', c: 'food', w: .3, v: 10, use: { hunger: 28 } },
    condmilk: { n: 'Сгущёнка', c: 'food', w: .4, v: 12, use: { hunger: 22, mood: 8 } },
    crackers: { n: 'Сухари', c: 'food', w: .2, v: 5, use: { hunger: 14, thirst: -4 } },
    choco: { n: 'Шоколад', c: 'food', w: .1, v: 10, use: { hunger: 10, mood: 10 } },
    porridge: { n: 'Гречневая каша', c: 'food', w: .5, v: 9, use: { hunger: 40, warmth: 4 } },
    bpotato: { n: 'Печёный картофель', c: 'food', w: .3, v: 5, use: { hunger: 18 } },
    meat: { n: 'Жареное мясо', c: 'food', w: .6, v: 12, use: { hunger: 40, mood: 3 } },
    jerky: { n: 'Вяленое мясо', c: 'food', w: .3, v: 14, use: { hunger: 24, thirst: -5 } },
    fishc: { n: 'Печёная рыба', c: 'food', w: .4, v: 9, use: { hunger: 28 } },
    stew: { n: 'Грибная похлёбка', c: 'food', w: .6, v: 9, use: { hunger: 34, thirst: 15, warmth: 6 } },
    bread: { n: 'Лепёшка', c: 'food', w: .3, v: 6, use: { hunger: 22 } },
    berries: { n: 'Ягоды', c: 'food', w: .2, v: 3, use: { hunger: 6, thirst: 5, mood: 3 } },
    rawmeat: { n: 'Сырое мясо', c: 'food', w: .8, v: 6, use: { hunger: 14, poison: .5, mood: -6 } },
    fish: { n: 'Сырая рыба', c: 'food', w: .5, v: 5, use: { hunger: 10, poison: .4, mood: -4 } },
    potato: { n: 'Картофель', c: 'food', w: .3, v: 3, use: { hunger: 7, poison: .12 } },
    mushrooms: { n: 'Грибы', c: 'food', w: .2, v: 3, use: { hunger: 7, poison: .3 } },
    buckwheat: { n: 'Гречка', c: 'mat', w: .5, v: 6, d: 'Крупа. Сварить в котелке' },
    flour: { n: 'Мука', c: 'mat', w: .5, v: 5, d: 'Для лепёшек' },
    salt: { n: 'Соль', c: 'mat', w: .2, v: 5, d: 'Для заготовки мяса' },
    tealeaf: { n: 'Заварка', c: 'mat', w: .05, v: 5 },
    herbs: { n: 'Лечебные травы', c: 'mat', w: .1, v: 4, d: 'Для отвара' },

    water: { n: 'Чистая вода', c: 'drink', w: .5, v: 4, use: { thirst: 35 } },
    dirtywater: { n: 'Сырая вода', c: 'drink', w: .5, v: 1, use: { thirst: 28, poison: .3, dys: .2 } },
    tea: { n: 'Горячий чай', c: 'drink', w: .5, v: 8, use: { thirst: 30, warmth: 15, mood: 6 } },
    herbtea: { n: 'Травяной отвар', c: 'drink', w: .5, v: 8, use: { thirst: 25, warmth: 10, ease: 'cold' } },
    vodka: { n: 'Водка', c: 'drink', w: .5, v: 15, use: { thirst: -5, rad: -10, mood: 8, warmth: 4 }, clean: 1 },

    ragband: { n: 'Тряпичная повязка', c: 'med', w: .05, v: 2, d: 'Останавливает кровь, но рана может загноиться' },
    bandage: { n: 'Бинт', c: 'med', w: .05, v: 6, d: 'Останавливает кровь' },
    iodine: { n: 'Йод', c: 'med', w: .05, v: 8, clean: 1, d: 'Обработка раны от заражения' },
    alcohol: { n: 'Спирт', c: 'med', w: .3, v: 12, clean: 1, d: 'Обработка раны от заражения' },
    splint: { n: 'Шина', c: 'med', w: .4, v: 8, d: 'Фиксирует перелом' },
    medkit: { n: 'Аптечка', c: 'med', w: .5, v: 40, use: { hp: 40, kit: 1 } },
    antibiotic: { n: 'Антибиотики', c: 'med', w: .05, v: 25, use: { cure: ['infection', 'pneumonia', 'dysentery'] } },
    charcoaltab: { n: 'Активированный уголь', c: 'med', w: .05, v: 8, use: { cure: ['poison'] } },
    coldmed: { n: 'Жаропонижающее', c: 'med', w: .05, v: 10, use: { cure: ['cold'] } },
    ointment: { n: 'Мазь', c: 'med', w: .1, v: 10, use: { cure: ['frostbite'], burn: 1 } },
    painkiller: { n: 'Анальгин', c: 'med', w: .05, v: 8, use: { pk: 8, mood: 4 } },
    antirad: { n: 'Антирад', c: 'med', w: .05, v: 30, use: { rad: -40 } },
    tobacco: { n: 'Махорка', c: 'med', w: .05, v: 6, use: { mood: 12, hunger: -2 } },
    book: { n: 'Книга', c: 'med', w: .3, v: 6, use: { mood: 15, time: 2 } },

    knife: { n: 'Нож', c: 'melee', w: .3, v: 15, dmg: [6, 10], reach: 2, tool: 1 },
    club: { n: 'Дубина', c: 'melee', w: 1.2, v: 4, dmg: [5, 9], reach: 2 },
    crowbar: { n: 'Монтировка', c: 'melee', w: 1.5, v: 18, dmg: [8, 13], reach: 2, tool: 1 },
    shovel: { n: 'Сапёрная лопатка', c: 'melee', w: 1, v: 20, dmg: [8, 13], reach: 2 },
    axe: { n: 'Топор', c: 'melee', w: 1.5, v: 25, dmg: [10, 16], reach: 2, tool: 1 },
    spear: { n: 'Копьё', c: 'melee', w: 1.5, v: 12, dmg: [9, 14], reach: 4 },
    bow: { n: 'Лук', c: 'ranged', w: 1, v: 25, dmg: [10, 16], rng: 35, acc: .65, ammo: 'arrow' },
    pistol: { n: 'Пистолет', c: 'ranged', w: .8, v: 80, dmg: [14, 22], rng: 25, acc: .72, ammo: 'a9' },
    shotgun: { n: 'Двустволка', c: 'ranged', w: 3, v: 110, dmg: [24, 38], rng: 22, acc: .82, ammo: 'a12', spread: 1 },
    rifle: { n: 'Карабин', c: 'ranged', w: 3.8, v: 160, dmg: [26, 40], rng: 90, acc: .85, ammo: 'a762' },
    akm: { n: 'Автомат', c: 'ranged', w: 3.5, v: 220, dmg: [16, 26], rng: 60, acc: .62, ammo: 'a762', burst: 3 },
    arrow: { n: 'Стрелы', c: 'ammo', w: .05, v: 2 },
    a9: { n: 'Патроны 9 мм', c: 'ammo', w: .01, v: 3 },
    a12: { n: 'Патроны 12 калибра', c: 'ammo', w: .04, v: 4 },
    a762: { n: 'Патроны 7,62', c: 'ammo', w: .02, v: 5 },

    cap: { n: 'Вязаная шапка', c: 'wear', slot: 'head', w: .1, v: 6, warm: 3 },
    ushanka: { n: 'Ушанка', c: 'wear', slot: 'head', w: .3, v: 16, warm: 6 },
    helmet: { n: 'Каска', c: 'wear', slot: 'head', w: 1.2, v: 25, warm: 1, arm: 1 },
    jacket: { n: 'Куртка', c: 'wear', slot: 'body', w: 1, v: 10, warm: 5 },
    coat: { n: 'Ватник', c: 'wear', slot: 'body', w: 2, v: 22, warm: 9, arm: 1 },
    furcoat: { n: 'Тулуп', c: 'wear', slot: 'body', w: 3.5, v: 45, warm: 14, arm: 1 },
    chemsuit: { n: 'Защитный костюм', c: 'wear', slot: 'body', w: 3, v: 70, warm: 3, prot: .45 },
    pants: { n: 'Штаны', c: 'wear', slot: 'legs', w: .5, v: 6, warm: 3 },
    warmpants: { n: 'Ватные штаны', c: 'wear', slot: 'legs', w: 1.2, v: 18, warm: 7 },
    shoes: { n: 'Ботинки', c: 'wear', slot: 'feet', w: .8, v: 8, warm: 2 },
    boots: { n: 'Кирзовые сапоги', c: 'wear', slot: 'feet', w: 1.5, v: 16, warm: 4 },
    valenki: { n: 'Валенки', c: 'wear', slot: 'feet', w: 1.2, v: 20, warm: 7 },
    unty: { n: 'Унты', c: 'wear', slot: 'feet', w: 1.4, v: 30, warm: 9 },
    respirator: { n: 'Респиратор', c: 'wear', slot: 'mask', w: .2, v: 18, prot: .25 },
    gasmask: { n: 'Противогаз', c: 'wear', slot: 'mask', w: .9, v: 50, prot: .45 },
    vest: { n: 'Бронежилет', c: 'wear', slot: 'armor', w: 5, v: 90, arm: 4 },
    bag: { n: 'Сумка', c: 'wear', slot: 'back', w: .4, v: 10, cap: 10 },
    backpack: { n: 'Рюкзак', c: 'wear', slot: 'back', w: 1, v: 35, cap: 25 },
    bigpack: { n: 'Станковый рюкзак', c: 'wear', slot: 'back', w: 2, v: 70, cap: 40 },

    matches: { n: 'Спички', c: 'tool', w: .01, v: 1, d: 'Для костра' },
    lighter: { n: 'Зажигалка', c: 'tool', w: .05, v: 25, tool: 1, d: 'Костёр без спичек' },
    pot: { n: 'Котелок', c: 'tool', w: .5, v: 15, tool: 1, d: 'Кипятить воду и варить' },
    sewkit: { n: 'Швейный набор', c: 'tool', w: .2, v: 20, tool: 1, d: 'Шить одежду и снаряжение' },
    toolkit: { n: 'Набор инструментов', c: 'tool', w: 3, v: 60, tool: 1, d: 'Чинить технику' },
    fishrod: { n: 'Удочка', c: 'tool', w: .5, v: 12, tool: 1, d: 'Рыбалка у пресной воды' },
    geiger: { n: 'Дозиметр', c: 'tool', w: .4, v: 60, tool: 1, d: 'Показывает уровень заражения' },
    tent: { n: 'Палатка', c: 'tool', w: 4, v: 50, tool: 1, d: 'Теплее отдыхать под открытым небом' },
    sleepbag: { n: 'Спальник', c: 'tool', w: 2, v: 35, tool: 1, d: 'Теплее отдыхать' },

    wood: { n: 'Дрова', c: 'mat', w: 1.5, v: 1 },
    cloth: { n: 'Ткань', c: 'mat', w: .2, v: 2 },
    leather: { n: 'Шкура', c: 'mat', w: 1, v: 8 },
    scrap: { n: 'Металлолом', c: 'mat', w: 1, v: 2 },
    wire: { n: 'Проволока', c: 'mat', w: .2, v: 3 },
    nails: { n: 'Гвозди', c: 'mat', w: .2, v: 2 },
    tape: { n: 'Изолента', c: 'mat', w: .1, v: 4 },
    rope: { n: 'Верёвка', c: 'mat', w: .4, v: 5 },
    rubber: { n: 'Резина', c: 'mat', w: .5, v: 4 },
    coal: { n: 'Уголь', c: 'mat', w: .5, v: 2 },
    chemicals: { n: 'Химикаты', c: 'mat', w: .3, v: 8 },
    gunpowder: { n: 'Порох', c: 'mat', w: .1, v: 8 },
    electronics: { n: 'Электродетали', c: 'mat', w: .2, v: 10 },
    fuel: { n: 'Бензин, л', c: 'mat', w: .75, v: 4 },
    battery: { n: 'Аккумулятор', c: 'part', w: 8, v: 40 },
    wheel: { n: 'Колесо', c: 'part', w: 3, v: 15 },
    chain: { n: 'Цепь', c: 'part', w: .5, v: 10 },
    bikeframe: { n: 'Велосипедная рама', c: 'part', w: 6, v: 25 },
    coupon: { n: 'Талоны', c: 'money', w: 0, v: 1, d: 'Ходят у всех фракций' }
  };
  const CATS = [['food', 'Еда'], ['drink', 'Питьё'], ['med', 'Медицина и досуг'], ['melee', 'Оружие ближнего боя'], ['ranged', 'Стрелковое'], ['ammo', 'Боеприпасы'], ['wear', 'Одежда и снаряжение'], ['tool', 'Инструменты'], ['part', 'Запчасти'], ['mat', 'Материалы'], ['money', 'Деньги']];
  const SLOTS = [['melee', 'Ближний бой'], ['ranged', 'Стрелковое'], ['head', 'Голова'], ['body', 'Тело'], ['legs', 'Ноги'], ['feet', 'Обувь'], ['mask', 'Лицо'], ['armor', 'Броня'], ['back', 'Спина']];

  /* ---------- постройки и лут: [предмет, вес, мин, макс] ---------- */
  const BUILD = {
    house: { n: 'Жилой дом', se: [2, 3], dng: .08, h: 1, loot: [['canned',3],['crackers',3,1,2],['buckwheat',2],['condmilk',1],['water',3,1,2],['tealeaf',2],['salt',1.5],['matches',3,3,8],['cloth',4,1,3],['book',2],['tobacco',1],['vodka',1],['pot',1],['sewkit',.8],['knife',1],['cap',1],['jacket',.8],['pants',.8],['shoes',.8],['bag',.7],['bandage',1.5],['coldmed',1],['painkiller',1],['coupon',1,3,10],['tape',1],['rope',.8]] },
    shop: { n: 'Продмаг', se: [2, 3], dng: .12, h: 1, loot: [['canned',5,1,2],['cfish',4,1,2],['condmilk',3],['crackers',4,1,3],['buckwheat',4,1,2],['flour',2],['salt',2],['choco',2],['water',4,1,3],['vodka',2],['tealeaf',3],['tobacco',2],['matches',3,5,10],['coupon',2,5,15]] },
    pharmacy: { n: 'Аптека', se: [2, 2], dng: .12, h: 1, loot: [['bandage',5,1,3],['iodine',4],['painkiller',4,1,2],['coldmed',3],['charcoaltab',3,1,2],['antibiotic',2],['alcohol',2],['ointment',2],['medkit',.8],['antirad',.6]] },
    hospital: { n: 'Больница', se: [3, 5], dng: .22, h: 1.5, loot: [['bandage',5,2,4],['iodine',3],['alcohol',3],['antibiotic',3,1,2],['painkiller',3],['medkit',1.5],['antirad',1.2],['splint',2],['ointment',2],['charcoaltab',2],['cloth',2,2,4]] },
    garage: { n: 'Гаражи', se: [2, 4], dng: .1, h: 1, loot: [['scrap',5,1,3],['wire',3,1,2],['tape',3],['rubber',3],['fuel',3,2,6],['wheel',2],['chain',1.2],['bikeframe',.9],['battery',1],['toolkit',1],['crowbar',1.2],['nails',2],['rope',1],['electronics',1.5]] },
    gas: { n: 'АЗС', se: [1, 2], dng: .12, h: .7, loot: [['fuel',6,3,10],['crackers',2],['water',2],['tobacco',1.5],['matches',2,3,6],['rubber',1],['choco',1],['coupon',1,3,10]] },
    warehouse: { n: 'Склад', se: [3, 4], dng: .15, h: 1.5, loot: [['canned',3,1,3],['buckwheat',2,1,3],['flour',2],['cloth',3,2,4],['nails',3],['wire',2],['rope',2],['scrap',2],['coal',2,1,3],['tape',2],['boots',1],['coat',1],['backpack',.6],['tent',.5],['salt',1]] },
    factory: { n: 'Завод', se: [3, 5], dng: .15, h: 1.5, loot: [['scrap',6,2,4],['wire',4,1,3],['chemicals',3],['electronics',3,1,2],['coal',3,1,3],['rubber',2],['toolkit',1],['nails',2],['battery',.8],['helmet',1],['respirator',1]] },
    police: { n: 'Отдел милиции', se: [2, 3], dng: .25, h: 1, mil: 1, loot: [['pistol',1.2],['a9',4,4,10],['vest',.8],['bandage',2],['canned',1.5],['coupon',1,5,15],['helmet',.8],['crowbar',.5],['lighter',.6]] },
    military: { n: 'Воинская часть', se: [3, 5], dng: .4, h: 1.5, mil: 1, loot: [['a762',5,5,15],['a9',2,5,10],['canned',4,1,3],['medkit',2],['antirad',2],['gasmask',1.5],['chemsuit',.9],['rifle',.7],['akm',.5],['vest',1],['helmet',1.5],['geiger',1],['boots',1.5],['fuel',2,3,8],['shovel',1]] },
    school: { n: 'Школа', se: [2, 3], dng: .08, h: 1, loot: [['book',4,1,2],['cloth',2],['chemicals',2],['crackers',1],['bandage',1],['iodine',1],['tape',1],['coupon',.5,2,6]] },
    station: { n: 'Вокзал', se: [2, 4], dng: .15, h: 1, loot: [['coal',4,1,3],['crackers',2],['water',2],['bag',1],['cloth',2],['scrap',2],['canned',1.5],['tealeaf',1.5],['matches',2,3,6],['coat',.8],['rope',1]] },
    hunting: { n: 'Охотничий магазин', se: [2, 2], dng: .15, h: 1, loot: [['shotgun',1],['a12',5,4,10],['knife',2],['fishrod',2],['tent',1.2],['sleepbag',1.5],['backpack',1.2],['boots',1.5],['warmpants',1],['matches',2,5,10],['rope',2],['gunpowder',2]] },
    izba: { n: 'Изба', se: [1, 2], dng: .06, h: .7, loot: [['potato',4,1,3],['buckwheat',2],['flour',2],['salt',2],['wood',3,1,3],['matches',2,3,6],['valenki',1],['furcoat',.6],['ushanka',1],['axe',1],['pot',1],['cloth',2],['vodka',1.5],['herbs',1.5],['tealeaf',1.5],['shotgun',.25],['a12',.8,2,5],['knife',1],['rope',1]] },
    farm: { n: 'Ферма', se: [2, 3], dng: .1, h: 1, loot: [['potato',5,2,4],['flour',3],['leather',2],['rope',2],['salt',1],['nails',2],['scrap',2],['fuel',1.5,2,5],['shovel',1],['axe',1],['wire',1]] },
    sawmill: { n: 'Лесопилка', se: [2, 3], dng: .1, h: 1, loot: [['wood',6,2,5],['nails',3],['axe',1.5],['rope',1.5],['scrap',2],['fuel',2,2,4],['toolkit',.6],['coat',.8]] },
    checkpoint: { n: 'Блокпост', se: [2, 3], dng: .3, h: 1, mil: 1, loot: [['a762',3,4,10],['a9',2,3,8],['canned',3,1,2],['medkit',1],['bandage',2],['helmet',1],['vest',.5],['gasmask',.8],['antirad',1],['fuel',2,2,6],['geiger',.6]] },
    camp: { n: 'Брошенная стоянка', se: [1, 2], dng: .1, h: .7, loot: [['canned',2],['crackers',2],['tent',1],['sleepbag',1.2],['pot',1.5],['matches',2,3,8],['bandage',1.5],['knife',1],['rope',1.5],['fishrod',1],['backpack',.8],['water',2]] },
    zimovye: { n: 'Зимовье', se: [2, 2], dng: .08, h: .7, loot: [['jerky',3,1,2],['wood',4,2,4],['salt',2],['matches',3,3,8],['leather',2,1,2],['a12',2,2,6],['furcoat',.8],['valenki',1],['ushanka',1],['knife',1],['pot',1],['fishrod',1],['tealeaf',2],['herbs',2]] },
    meteo: { n: 'Метеостанция', se: [2, 3], dng: .08, h: 1, loot: [['canned',3],['fuel',3,2,6],['electronics',2],['geiger',1.2],['coal',2],['tealeaf',2],['warmpants',1],['furcoat',.6],['battery',1],['book',1],['medkit',.8]] }
  };
  const rpt = (t, n) => Array(n).fill(t);
  const CITYSET = {
    1: [...rpt('house', 9), 'shop', 'pharmacy', 'garage'],
    2: [...rpt('house', 20), 'shop', 'shop', 'pharmacy', 'hospital', 'garage', 'garage', 'gas', 'warehouse', 'police', 'station', 'school'],
    3: [...rpt('house', 38), 'shop', 'shop', 'shop', 'pharmacy', 'pharmacy', 'hospital', 'garage', 'garage', 'gas', 'gas', 'warehouse', 'warehouse', 'factory', 'factory', 'police', 'station', 'school', 'hunting']
  };
  const CITYEXTRA = { 1: ['gas', 'warehouse', 'station', 'school'], 2: ['factory', 'hunting'], 3: [] };
  const POIT = {
    village: { n: 'Деревня', b: ['izba', 'izba', 'izba', 'shop'] },
    farm: { n: 'Ферма', b: ['farm', 'farm', 'izba'] },
    gas: { n: 'Придорожная АЗС', b: ['gas', 'garage'] },
    sawmill: { n: 'Лесопилка', b: ['sawmill', 'izba'] },
    checkpoint: { n: 'Блокпост', b: ['checkpoint'] },
    camp: { n: 'Брошенная стоянка', b: ['camp'] },
    zimovye: { n: 'Зимовье', b: ['zimovye'] },
    meteo: { n: 'Метеостанция', b: ['meteo'] }
  };
  const POI_BY = {
    forest: [['village', 5], ['farm', 2], ['gas', 2], ['sawmill', 1.5], ['checkpoint', 1], ['camp', 1]],
    taiga: [['village', 3], ['sawmill', 3], ['camp', 2], ['zimovye', 2], ['gas', 1], ['checkpoint', .7]],
    steppe: [['village', 3], ['farm', 3], ['gas', 2], ['checkpoint', 1], ['camp', 1]],
    desert: [['camp', 2], ['village', 2], ['gas', 1], ['checkpoint', 1]],
    tundra: [['camp', 2], ['zimovye', 2], ['meteo', 2]]
  };
  const VNAMES = ['Берёзовка', 'Сосновка', 'Ольховка', 'Каменка', 'Ключи', 'Заречье', 'Луговое', 'Дубки', 'Озёрное', 'Высокое', 'Красный Яр', 'Малиновка', 'Ивановка', 'Покровка', 'Михайловка', 'Николаевка', 'Отрадное', 'Степное', 'Лесное', 'Раздолье', 'Тихое', 'Новосёлки', 'Горки', 'Подгорное', 'Зелёный Дол', 'Привольное', 'Ягодное', 'Кедровка', 'Быстрая', 'Усть-Речка', 'Хвойное', 'Медвежье', 'Студёное', 'Белый Ключ', 'Сухой Лог', 'Журавлёвка', 'Черёмушки', 'Долгое', 'Крутояр', 'Светлое'];
  const POIS = (function () {
    const r = mulberry32(20240607), out = [], hyp = Math.hypot; let tries = 0;
    while (out.length < 380 && tries < 9000) {
      tries++;
      const c = CITIES[Math.floor(r() * CITIES.length)], a = r() * Math.PI * 2, d = c.r + 20 + r() * (c.lon < 60 ? 220 : 340);
      const x = c.x + Math.cos(a) * d, y = c.y + Math.sin(a) * d;
      if (x < 50 || y < 50 || x > W - 50 || y > H - 50 || isWater(x, y)) continue;
      if (CITIES.some(q => hyp(q.x - x, q.y - y) < q.r + 15) || out.some(q => hyp(q.x - x, q.y - y) < 30)) continue;
      const ll = unproj(x, y), b = biome(ll[0], ll[1]), pool = POI_BY[b];
      let t = pool[0][0], tot = 0, q = 0; for (const p of pool) tot += p[1]; q = r() * tot; for (const p of pool) { q -= p[1]; if (q <= 0) { t = p[0]; break; } }
      out.push({ id: 'p' + out.length, x, y, t, b, n: t === 'village' ? VNAMES[Math.floor(r() * VNAMES.length)] : POIT[t].n });
    }
    return out;
  })();

  /* ---------- места для обыска: здания внутри городов и одиночные точки ---------- */
  BUILD.base = { n: 'Фактория', se: [0, 0], dng: 0, h: 0, loot: [] };
  for (const k in BUILD) for (const r of BUILD[k].loot) r.p = Math.min(.9, r[1] * .065);
  const POIB = { village: 'izba', farm: 'farm', gas: 'gas', sawmill: 'sawmill', checkpoint: 'checkpoint', camp: 'camp', zimovye: 'zimovye', meteo: 'meteo' };
  (function () {
    let sid = 0;
    for (const c of CITIES) {
      const r = mulberry32(hashStr('city' + c.n)), types = CITYSET[c.size].slice(), ex = CITYEXTRA[c.size];
      if (ex.length) types.push(ex[Math.floor(r() * ex.length)]);
      if ((c.size === 3 && r() < .55) || (c.size === 2 && r() < .2)) types.push('military');
      if (c.f) types.push('base');
      // улицы — повёрнутая сетка; здания стоят в кварталах между улицами
      c.sites = [];
      const R = c.r * .86, n = types.length, step = Math.sqrt(Math.PI * R * R / (1.18 * n)), rot = .3 + r() * .55, cs = Math.cos(rot), sn = Math.sin(rot), m = Math.ceil(R / step) + 1, lots = [];
      for (let i = -m; i < m; i++) for (let j = -m; j < m; j++) { const u = (i + .5) * step, v = (j + .5) * step, d = Math.hypot(u, v); if (d > R - step * .3) continue; const x = c.x + u * cs - v * sn, y = c.y + u * sn + v * cs; if (isWater(x, y)) continue; lots.push({ x, y, k: d + r() * R * .45 }); }
      lots.sort((p, q) => p.k - q.k); lots.length = Math.min(lots.length, n);
      for (let i = lots.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)), t = lots[i]; lots[i] = lots[j]; lots[j] = t; }
      const order = types.filter(t => t !== 'house').reverse().concat(types.filter(t => t === 'house'));
      order.forEach((t, i) => { const q = lots[i]; if (!q) return; c.sites.push({ id: 's' + (sid++), x: q.x + (r() - .5) * step * .14, y: q.y + (r() - .5) * step * .14, t, n: BUILD[t].n, city: c.n, v: Math.floor(r() * 16) }); });
      c.grid = { rot, step, R };
    }
    for (const p of POIS) p.site = { id: p.id, x: p.x, y: p.y, t: POIB[p.t], n: p.n, big: p.t === 'village' || p.t === 'farm' };
  })();
  const ROADS = [];
  (function () { const seen = {}; for (const a of CITIES) { const near = CITIES.filter(b => b !== a).map(b => [Math.hypot(a.x - b.x, a.y - b.y), b]).sort((p, q) => p[0] - q[0]).slice(0, 3); for (const [d, b] of near) { if (d > 1100) continue; const key = a.n < b.n ? a.n + '|' + b.n : b.n + '|' + a.n; if (seen[key]) continue; let wet = 0; for (let i = 1; i < 10; i++) if (isWater(a.x + (b.x - a.x) * i / 10, a.y + (b.y - a.y) * i / 10)) wet++; if (wet > 1) continue; seen[key] = 1; ROADS.push([a, b]); } } })();

  /* ---------- рецепты ---------- */
  const RECIPES = [
    { id: 'boil', g: 'Еда и вода', n: 'Вскипятить воду', need: { dirtywater: 1 }, tools: ['pot'], fire: 1, out: { water: 1 }, h: .3 },
    { id: 'filter', g: 'Еда и вода', n: 'Угольный фильтр', need: { dirtywater: 1, coal: 1 }, out: { water: 1 }, h: .4 },
    { id: 'melt', g: 'Еда и вода', n: 'Растопить снег', need: {}, tools: ['pot'], fire: 1, snow: 1, out: { water: 1 }, h: .5 },
    { id: 'tea', g: 'Еда и вода', n: 'Заварить чай', need: { water: 1, tealeaf: 1 }, tools: ['pot'], fire: 1, out: { tea: 1 }, h: .3 },
    { id: 'herbtea', g: 'Еда и вода', n: 'Травяной отвар', need: { water: 1, herbs: 1 }, tools: ['pot'], fire: 1, out: { herbtea: 1 }, h: .3, xp: ['med', 3] },
    { id: 'meat', g: 'Еда и вода', n: 'Пожарить мясо', need: { rawmeat: 1 }, fire: 1, out: { meat: 1 }, h: .4 },
    { id: 'fishc', g: 'Еда и вода', n: 'Испечь рыбу', need: { fish: 1 }, fire: 1, out: { fishc: 1 }, h: .4 },
    { id: 'bpotato', g: 'Еда и вода', n: 'Испечь картофель', need: { potato: 2 }, fire: 1, out: { bpotato: 2 }, h: .4 },
    { id: 'porridge', g: 'Еда и вода', n: 'Сварить кашу', need: { buckwheat: 1, water: 1 }, tools: ['pot'], fire: 1, out: { porridge: 2 }, h: .5 },
    { id: 'stew', g: 'Еда и вода', n: 'Грибная похлёбка', need: { mushrooms: 2, potato: 1, water: 1 }, tools: ['pot'], fire: 1, out: { stew: 2 }, h: .6 },
    { id: 'bread', g: 'Еда и вода', n: 'Испечь лепёшки', need: { flour: 1, water: 1 }, fire: 1, out: { bread: 2 }, h: .5 },
    { id: 'jerky', g: 'Еда и вода', n: 'Завялить мясо', need: { rawmeat: 2, salt: 1 }, fire: 1, out: { jerky: 3 }, h: 3 },
    { id: 'ragband', g: 'Медицина', n: 'Тряпичная повязка', need: { cloth: 1 }, out: { ragband: 1 }, h: .2 },
    { id: 'bandage', g: 'Медицина', n: 'Прокипятить бинты', need: { cloth: 2 }, tools: ['pot'], fire: 1, out: { bandage: 2 }, h: .5, xp: ['med', 4] },
    { id: 'splint', g: 'Медицина', n: 'Шина', need: { wood: 1, cloth: 1 }, out: { splint: 1 }, h: .3, xp: ['med', 3] },
    { id: 'charcoaltab', g: 'Медицина', n: 'Толчёный уголь', need: { coal: 1 }, out: { charcoaltab: 2 }, h: .3, xp: ['med', 3] },
    { id: 'club', g: 'Оружие', n: 'Дубина', need: { wood: 1 }, tools: ['knife'], out: { club: 1 }, h: .5 },
    { id: 'spear', g: 'Оружие', n: 'Копьё', need: { wood: 1, scrap: 1, wire: 1 }, tools: ['knife'], out: { spear: 1 }, h: 1, xp: ['mech', 4] },
    { id: 'bow', g: 'Оружие', n: 'Лук', need: { wood: 2, rope: 1 }, tools: ['knife'], out: { bow: 1 }, h: 2, xp: ['mech', 6] },
    { id: 'arrow', g: 'Оружие', n: 'Стрелы', need: { wood: 1, scrap: 1 }, tools: ['knife'], out: { arrow: 6 }, h: 1, xp: ['mech', 3] },
    { id: 'gunpowder', g: 'Оружие', n: 'Порох', need: { chemicals: 1, coal: 1 }, out: { gunpowder: 2 }, h: 1, sk: ['mech', 1], xp: ['mech', 5] },
    { id: 'a12', g: 'Оружие', n: 'Снарядить патроны 12 калибра', need: { gunpowder: 1, scrap: 1 }, tools: ['toolkit'], out: { a12: 4 }, h: 1, sk: ['mech', 1], xp: ['mech', 5] },
    { id: 'fishrod', g: 'Снаряжение', n: 'Удочка', need: { wood: 1, wire: 1, nails: 1 }, out: { fishrod: 1 }, h: .7 },
    { id: 'respirator', g: 'Снаряжение', n: 'Респиратор', need: { cloth: 2, coal: 1, tape: 1 }, out: { respirator: 1 }, h: 1 },
    { id: 'bag', g: 'Снаряжение', n: 'Сумка', need: { cloth: 4 }, tools: ['sewkit'], out: { bag: 1 }, h: 1.5 },
    { id: 'backpack', g: 'Снаряжение', n: 'Рюкзак', need: { cloth: 6, leather: 2, rope: 1 }, tools: ['sewkit'], out: { backpack: 1 }, h: 3 },
    { id: 'tent', g: 'Снаряжение', n: 'Палатка', need: { cloth: 8, rope: 2 }, tools: ['sewkit'], out: { tent: 1 }, h: 4 },
    { id: 'sleepbag', g: 'Снаряжение', n: 'Спальник', need: { cloth: 6, leather: 2 }, tools: ['sewkit'], out: { sleepbag: 1 }, h: 3 },
    { id: 'cap', g: 'Одежда', n: 'Вязаная шапка', need: { cloth: 2 }, tools: ['sewkit'], out: { cap: 1 }, h: 1 },
    { id: 'ushanka', g: 'Одежда', n: 'Ушанка', need: { leather: 2, cloth: 1 }, tools: ['sewkit'], out: { ushanka: 1 }, h: 2 },
    { id: 'coat', g: 'Одежда', n: 'Ватник', need: { cloth: 6 }, tools: ['sewkit'], out: { coat: 1 }, h: 3 },
    { id: 'furcoat', g: 'Одежда', n: 'Тулуп', need: { leather: 5, cloth: 2 }, tools: ['sewkit'], out: { furcoat: 1 }, h: 5 },
    { id: 'warmpants', g: 'Одежда', n: 'Ватные штаны', need: { cloth: 5 }, tools: ['sewkit'], out: { warmpants: 1 }, h: 2.5 },
    { id: 'unty', g: 'Одежда', n: 'Унты', need: { leather: 3 }, tools: ['sewkit'], out: { unty: 1 }, h: 2.5 },
    { id: 'bike', g: 'Транспорт', n: 'Собрать велосипед', need: { bikeframe: 1, wheel: 2, chain: 1 }, tools: ['toolkit'], veh: 'bike', h: 2, xp: ['mech', 10] },
    { id: 'moto', g: 'Транспорт', n: 'Восстановить мотоцикл', need: { wheel: 2, battery: 1, scrap: 4, wire: 2, electronics: 1 }, tools: ['toolkit'], wr: 'moto', veh: 'moto', h: 6, sk: ['mech', 2], xp: ['mech', 25] },
    { id: 'car', g: 'Транспорт', n: 'Восстановить внедорожник', need: { wheel: 4, battery: 1, scrap: 8, wire: 3, electronics: 3, rubber: 2 }, tools: ['toolkit'], wr: 'car', veh: 'car', h: 10, sk: ['mech', 3], xp: ['mech', 40] }
  ];
  const VEH = {
    bike: { n: 'Велосипед', sp: 14, cap: 15, by: 'на велосипеде' },
    moto: { n: 'Мотоцикл', sp: 45, cap: 40, fuel: .035, by: 'на мотоцикле' },
    car: { n: 'Внедорожник', sp: 60, cap: 250, fuel: .11, by: 'на машине' }
  };

  /* ---------- противники ---------- */
  const ENEMIES = {
    wolf: { n: 'Волк', hp: 30, dmg: [5, 9], spd: 14, atk: 'bite', grp: [1, 3], xp: 10, drop: [['rawmeat', 1, 1, 2], ['leather', .6, 1, 1]] },
    dog: { n: 'Одичавший пёс', hp: 18, dmg: [3, 6], spd: 12, atk: 'bite', grp: [2, 4], xp: 6, drop: [['rawmeat', .5, 1, 1]] },
    rat: { n: 'Крысы-мутанты', hp: 20, dmg: [3, 6], spd: 9, atk: 'bite', rad: 1, grp: [2, 3], xp: 7, drop: [] },
    bigrat: { n: 'Крысиный вожак', hp: 45, dmg: [6, 10], spd: 10, atk: 'bite', rad: 1, grp: [1, 1], xp: 14, drop: [['leather', .4, 1, 1]] },
    mwolf: { n: 'Волк-мутант', hp: 50, dmg: [8, 13], spd: 15, atk: 'bite', rad: 2, grp: [1, 2], xp: 18, drop: [['rawmeat', .6, 1, 2], ['leather', .6, 1, 1]] },
    mboar: { n: 'Кабан-мутант', hp: 75, dmg: [10, 16], spd: 11, atk: 'blunt', rad: 2, grp: [1, 1], xp: 22, drop: [['rawmeat', .8, 2, 3], ['leather', .7, 1, 2]] },
    mbear: { n: 'Медведь-мутант', hp: 160, dmg: [16, 26], spd: 10, atk: 'claw', rad: 3, grp: [1, 1], xp: 45, drop: [['rawmeat', 1, 3, 5], ['leather', 1, 2, 4]] },
    snake: { n: 'Гадюка', hp: 10, dmg: [3, 5], spd: 6, atk: 'bite', venom: 1, grp: [1, 2], xp: 5, drop: [] },
    boar: { n: 'Кабан', hp: 45, dmg: [7, 12], spd: 11, atk: 'blunt', grp: [1, 2], xp: 12, drop: [['rawmeat', 1, 2, 3], ['leather', .7, 1, 1]] },
    bear: { n: 'Медведь', hp: 110, dmg: [12, 22], spd: 10, atk: 'claw', grp: [1, 1], xp: 30, drop: [['rawmeat', 1, 3, 5], ['leather', 1, 2, 3]] },
    glowdog: { n: 'Облучённый пёс', hp: 35, dmg: [6, 11], spd: 13, atk: 'bite', rad: 3, grp: [1, 3], xp: 12, drop: [] },
    burnt: { n: 'Выжженный', hp: 60, dmg: [8, 14], spd: 7, atk: 'blunt', rad: 4, grp: [1, 2], xp: 18, drop: [['coupon', .3, 2, 8], ['antirad', .08, 1, 1]] },
    marauder: { n: 'Мародёр', hum: 1, hp: 40, dmg: [6, 11], spd: 6, atk: 'blade', grp: [1, 3], xp: 12, drop: [['canned', .4, 1, 1], ['cloth', .5, 1, 2], ['coupon', .6, 3, 12], ['knife', .2, 1, 1], ['bandage', .3, 1, 1]] },
    gunman: { n: 'Бандит с обрезом', hum: 1, hp: 45, dmg: [12, 20], spd: 5, atk: 'shot', rng: 15, acc: .55, grp: [1, 2], xp: 18, drop: [['a12', .8, 1, 4], ['coupon', .6, 5, 15], ['shotgun', .12, 1, 1], ['vodka', .3, 1, 1]] },
    deserter: { n: 'Дезертир', hum: 1, hp: 55, dmg: [14, 22], spd: 5, atk: 'shot', rng: 50, acc: .6, grp: [1, 2], xp: 24, drop: [['a762', .8, 2, 8], ['canned', .5, 1, 2], ['akm', .08, 1, 1], ['medkit', .2, 1, 1], ['boots', .2, 1, 1]] },
    oboz: { n: 'Обозник', f: 'oboz', hum: 1, hp: 45, dmg: [10, 16], spd: 5, atk: 'shot', rng: 25, acc: .55, grp: [2, 4], xp: 16, drop: [['a9', .8, 2, 6], ['fuel', .5, 1, 4], ['coupon', .7, 5, 20], ['pistol', .1, 1, 1]] },
    rider: { n: 'Степняк', f: 'step', hum: 1, hp: 50, dmg: [8, 14], spd: 16, atk: 'blade', grp: [2, 4], xp: 16, drop: [['jerky', .6, 1, 2], ['leather', .5, 1, 1], ['coupon', .5, 3, 12], ['bow', .1, 1, 1]] },
    poacher: { n: 'Браконьер', f: 'taiga', hum: 1, hp: 45, dmg: [18, 28], spd: 5, atk: 'shot', rng: 70, acc: .6, grp: [1, 3], xp: 22, drop: [['a762', .7, 1, 5], ['jerky', .5, 1, 2], ['leather', .5, 1, 2], ['rifle', .08, 1, 1]] },
    soldier: { n: 'Боец Гарнизона', f: 'gar', hum: 1, hp: 60, dmg: [14, 22], spd: 5, atk: 'shot', rng: 60, acc: .65, grp: [2, 3], xp: 26, drop: [['a762', .9, 3, 10], ['canned', .6, 1, 2], ['medkit', .25, 1, 1], ['helmet', .2, 1, 1]] },
    putguard: { n: 'Охранник обоза', f: 'put', hum: 1, hp: 45, dmg: [10, 16], spd: 5, atk: 'shot', rng: 25, acc: .6, grp: [2, 3], xp: 16, drop: [['a9', .8, 2, 8], ['coupon', .8, 5, 20], ['canned', .5, 1, 2]] },
    artguard: { n: 'Дружинник Артели', f: 'art', hum: 1, hp: 50, dmg: [12, 20], spd: 5, atk: 'shot', rng: 18, acc: .6, grp: [2, 3], xp: 18, drop: [['a12', .8, 2, 6], ['scrap', .6, 1, 3], ['wire', .5, 1, 2]] }
  };
  const WILD = {
    forest: [['wolf', 3], ['boar', 2], ['bear', .7], ['dog', 2], ['marauder', 2], ['gunman', 1], ['snake', 1]],
    taiga: [['wolf', 4], ['bear', 1.5], ['boar', 1], ['marauder', 1], ['deserter', .7]],
    steppe: [['wolf', 2], ['dog', 2], ['marauder', 2], ['gunman', 1.5], ['snake', 1.5]],
    desert: [['dog', 2], ['marauder', 2], ['gunman', 1], ['snake', 2]],
    tundra: [['wolf', 3], ['bear', 1.5]]
  };

  /* ---------- болезни и раны ---------- */
  // dur: часов до выздоровления, 0 = само не пройдёт
  const DIS = {
    cold: { n: 'Простуда', hp: .15, dur: 72, d: 'Жаропонижающее или травяной отвар, тепло.' },
    pneumonia: { n: 'Пневмония', hp: .8, dur: 0, d: 'Только антибиотики.' },
    poison: { n: 'Отравление', hp: .45, dur: 16, d: 'Активированный уголь. Голод и жажда растут быстрее.' },
    dysentery: { n: 'Дизентерия', hp: .5, dur: 90, d: 'Антибиотики. Сильная жажда.' },
    infection: { n: 'Заражение крови', hp: .9, dur: 0, d: 'Только антибиотики.' },
    frostbite: { n: 'Обморожение', hp: .3, dur: 60, d: 'Мазь и тепло. Снижает запас здоровья.' }
  };
  // bleed: потеря здоровья в час; clot: как быстро кровь останавливается сама; inf: шанс заражения в час без обработки
  const WOUNDS = {
    bruise: { n: 'Ушиб', bleed: 0, clot: 0, heal: 24, inf: 0, pain: 1 },
    cut: { n: 'Порез', bleed: .7, clot: .08, heal: 48, inf: .012, pain: 1 },
    bite: { n: 'Укус', bleed: .9, clot: .06, heal: 60, inf: .03, pain: 2 },
    gunshot: { n: 'Огнестрельная рана', bleed: 2.2, clot: .02, heal: 120, inf: .03, pain: 3 },
    fracture: { n: 'Перелом', bleed: 0, clot: 0, heal: 240, inf: 0, pain: 3 },
    burn: { n: 'Ожог', bleed: 0, clot: 0, heal: 72, inf: .015, pain: 2 }
  };
  const SKILLS = { surv: 'Выживание', med: 'Медицина', mech: 'Механика', fight: 'Бой' };
  const SKILLD = { surv: 'Больше находок при обыске, охоте и сборе.', med: 'Раны заживают быстрее, лечение эффективнее.', mech: 'Нужна для техники и патронов. Крафт быстрее.', fight: 'Точность и урон в бою.' };

  /* ---------- станки лагеря и способности ---------- */
  const STATIONS = {
    fire: { n: 'Костёр', d: 'Простая готовка на огне. Костёр нужно разводить из дров, со временем он гаснет.' },
    kitchen: { n: 'Полевая кухня', d: 'Котлы и решётка над огнём: каши, похлёбки, заготовки впрок.', up: [{ scrap: 2, wood: 2 }, { scrap: 4, wire: 2 }] },
    bench: { n: 'Верстак', d: 'Оружие, инструмент и техника.', up: [{ wood: 4, nails: 2, scrap: 2 }, { scrap: 6, wire: 3 }, { scrap: 10, electronics: 3 }] },
    sew: { n: 'Швейный стол', d: 'Одежда, сумки, палатка и спальник.', up: [{ wood: 2, cloth: 3 }, { cloth: 6, leather: 2 }] },
    med: { n: 'Знахарский стол', d: 'Перевязки, шины, отвары и порошки.', up: [{ wood: 2, cloth: 2 }, { alcohol: 1, cloth: 4 }] },
    rest: { n: 'Лежанка', d: 'Каждый уровень ускоряет лечение на отдыхе. На втором уровне отдыхать теплее.', up: [{ wood: 3, cloth: 3 }, { cloth: 6, leather: 2 }] }
  };
  const RST = { boil: ['fire', 0], melt: ['fire', 0], meat: ['fire', 0], fishc: ['fire', 0], bpotato: ['fire', 0],
    filter: ['kitchen', 1], tea: ['kitchen', 1], porridge: ['kitchen', 1], bread: ['kitchen', 1], stew: ['kitchen', 2], jerky: ['kitchen', 2],
    ragband: ['med', 0], splint: ['med', 0], bandage: ['med', 1], charcoaltab: ['med', 1], herbtea: ['med', 1],
    club: ['bench', 0], fishrod: ['bench', 0], spear: ['bench', 1], arrow: ['bench', 1], bow: ['bench', 1], respirator: ['bench', 1], bike: ['bench', 2], gunpowder: ['bench', 2], a12: ['bench', 2], moto: ['bench', 3], car: ['bench', 3],
    cap: ['sew', 1], bag: ['sew', 1], coat: ['sew', 1], warmpants: ['sew', 1], ushanka: ['sew', 2], furcoat: ['sew', 2], unty: ['sew', 2], backpack: ['sew', 2], tent: ['sew', 2], sleepbag: ['sew', 2] };
  for (const r of RECIPES) r.st = RST[r.id] || ['bench', 0];
  const PERKS = {
    scout: { n: 'Следопыт', d: 'При обыске находится больше: +8% за уровень.' },
    mule: { n: 'Вьючный', d: 'Переносимый груз +5 кг за уровень.' },
    stomach: { n: 'Крепкий желудок', d: 'Шанс отравиться едой ниже на 30% за уровень.' },
    marksman: { n: 'Меткий глаз', d: 'Точность стрельбы +4% за уровень.' },
    heavy: { n: 'Тяжёлая рука', d: 'Урон в ближнем бою +10% за уровень.' },
    healer: { n: 'Знахарь', d: 'Раны заживают на 15% быстрее за уровень.' },
    hardy: { n: 'Закалённый', d: 'Тепло одежды +3 за уровень.' },
    walker: { n: 'Ходок', d: 'Скорость пешком +8% за уровень.' },
    lead: { n: 'Свинцовая шкура', d: 'Защита от радиации +8% за уровень.' },
    calm: { n: 'Хладнокровие', d: 'Настрой падает на 20% медленнее за уровень.' },
    thrifty: { n: 'Запасливый', d: 'Голод и жажда растут на 6% медленнее за уровень.' }
  };

  return { W, H, proj, unproj, hash2, vnoise, fbm, mulberry32, hashStr, SEAS, ISLES, LAKES, RIVERS, isWater, biome, BIOME, CITIES, CITY, ZONES, FACTIONS, BASES, STOCKS, ITEMS, CATS, SLOTS, BUILD, CITYSET, CITYEXTRA, POIT, POIS, RECIPES, VEH, ENEMIES, WILD, DIS, WOUNDS, SKILLS, SKILLD, STATIONS, PERKS, ROADS };
})();

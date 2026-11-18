'use strict';
/* Собственный набор пиктограмм: {a} основной цвет, {b} тёмная деталь, {c} светлая деталь. */
const GLY = {
  can: '<rect x="6" y="6" width="12" height="14" rx="1.5" fill="{a}"/><rect x="6" y="10.5" width="12" height="5" fill="{b}"/><ellipse cx="12" cy="6" rx="6" ry="2" fill="{c}"/>',
  bottle: '<path d="M10 2h4v5l2.5 3v11a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1V10L10 7z" fill="{a}"/><rect x="7.5" y="13" width="9" height="5" fill="{b}"/><rect x="10" y="2" width="4" height="2" fill="{c}"/>',
  mug: '<path d="M5 8h11v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z" fill="{a}"/><path d="M16 10h2.5a2 2 0 0 1 2 2v1.5a2 2 0 0 1-2 2H16v-2h2v-1.5h-2z" fill="{b}"/><path d="M8 6c0-2 2-1.5 2-3.5M12 6c0-2 2-1.5 2-3.5" stroke="{c}" stroke-width="1.3" fill="none"/>',
  bowl: '<path d="M3 11h18a9 9 0 0 1-18 0z" fill="{a}"/><ellipse cx="12" cy="11" rx="9" ry="2.4" fill="{c}"/><path d="M9 6c0-2 2-1.5 2-3.5M13 6c0-2 2-1.5 2-3.5" stroke="{b}" stroke-width="1.2" fill="none"/>',
  loaf: '<path d="M4 14a8 6 0 0 1 16 0v3a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" fill="{a}"/><path d="M8 11l1.5 3M12 10l1.5 3M16 11l1 2.5" stroke="{b}" stroke-width="1.4"/>',
  meat: '<path d="M5 13a6 6 0 0 1 9-6l5 2a3 3 0 0 1 0 6l-6 4a6 6 0 0 1-8-6z" fill="{a}"/><circle cx="10" cy="13" r="2.3" fill="{c}"/><circle cx="10" cy="13" r="1" fill="{b}"/>',
  fish: '<path d="M2 12c3-5 10-5 14 0-4 5-11 5-14 0z" fill="{a}"/><path d="M15 12l6-4.5v9z" fill="{b}"/><circle cx="6.5" cy="11" r="1.1" fill="{c}"/>',
  berry: '<circle cx="8" cy="15" r="4.2" fill="{a}"/><circle cx="16" cy="15" r="4.2" fill="{a}"/><circle cx="12" cy="9.5" r="4.2" fill="{b}"/><path d="M12 5.5l2.5-3.5" stroke="{c}" stroke-width="1.6"/>',
  mushroom: '<rect x="9.5" y="11" width="5" height="10" rx="2" fill="{c}"/><path d="M3 12a9 8 0 0 1 18 0z" fill="{a}"/><circle cx="9" cy="8" r="1.2" fill="{b}"/><circle cx="14.5" cy="7" r="1" fill="{b}"/>',
  potato: '<ellipse cx="12" cy="13" rx="8.5" ry="6.5" fill="{a}"/><circle cx="9" cy="11" r="1.1" fill="{b}"/><circle cx="14" cy="15" r="1.1" fill="{b}"/><circle cx="15.5" cy="10" r=".9" fill="{b}"/>',
  sack: '<path d="M8 4h8l-1.5 3.5c4 2 5 6 5 9.5a3 3 0 0 1-3 3h-9a3 3 0 0 1-3-3c0-3.500 1-7.500 5-9.500z" fill="{a}"/><path d="M8.500 7.500h7" stroke="{b}" stroke-width="1.8"/>',
  leaf: '<path d="M5 19C4 9 10 4 20 4c0 10-5 16-15 15z" fill="{a}"/><path d="M6 18L17 7M10 14V9.500M10 14h5" stroke="{b}" stroke-width="1.3" fill="none"/>',
  choco: '<rect x="4" y="6" width="16" height="12" rx="1.5" fill="{a}"/><path d="M9.300 6v12M14.700 6v12M4 12h16" stroke="{b}" stroke-width="1.3"/>',
  pill: '<rect x="3" y="8" width="18" height="8" rx="4" fill="{a}"/><path d="M12 8h5a4 4 0 0 1 0 8h-5z" fill="{c}"/>',
  bandage: '<rect x="3" y="7" width="18" height="10" rx="5" fill="{c}"/><circle cx="8" cy="12" r="2.2" fill="{b}"/><path d="M15.500 9.300v5.400M12.800 12h5.400" stroke="{a}" stroke-width="2"/>',
  vial: '<rect x="9" y="3" width="6" height="3" fill="{b}"/><path d="M8 6h8v13a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2z" fill="{a}"/><path d="M12 10v6M9 13h6" stroke="{c}" stroke-width="1.8"/>',
  medkit: '<rect x="9" y="4" width="6" height="3.500" fill="{b}"/><rect x="3" y="7" width="18" height="13" rx="2" fill="{a}"/><path d="M12 10v7M8.500 13.500h7" stroke="{c}" stroke-width="2.400"/>',
  tube: '<path d="M6 4h12l-2 13H8z" fill="{a}"/><rect x="9" y="17" width="6" height="4" fill="{b}"/><path d="M9 8h6" stroke="{c}" stroke-width="1.600"/>',
  splint: '<rect x="5" y="4" width="4" height="16" rx="1" fill="{a}"/><rect x="15" y="4" width="4" height="16" rx="1" fill="{a}"/><path d="M5 8.500h14M5 15.500h14" stroke="{c}" stroke-width="2.200"/>',
  book: '<path d="M3 5h7.500a2 2 0 0 1 1.500.700A2 2 0 0 1 13.500 5H21v14h-7.500a2 2 0 0 0-1.500.700A2 2 0 0 0 10.500 19H3z" fill="{a}"/><path d="M12 5.700v14M5.500 9h4M5.500 12h4M14.500 9h4M14.500 12h4" stroke="{b}" stroke-width="1.100"/>',
  knife: '<path d="M21 3L9.500 12.500l2.500 2.500z" fill="{c}"/><path d="M9.500 12.500l2.500 2.500-6 6-2.500-2.500z" fill="{a}"/><path d="M8.300 11.300l4.400 4.400" stroke="{b}" stroke-width="1.600"/>',
  axe: '<path d="M5.500 21.500L15 6l2 1.200L7.500 22.500z" fill="{a}"/><path d="M12.500 4.500c3-2.500 7.500-1.500 8.500 3l-5.500 4-4-3.500z" fill="{c}"/>',
  bar: '<path d="M4.500 20.500L17 6c1-3 4.500-2.500 4 .500" stroke="{c}" stroke-width="2.600" fill="none" stroke-linecap="round"/><path d="M4.500 20.500l2.500-3" stroke="{b}" stroke-width="2.600" stroke-linecap="round"/>',
  club: '<path d="M5 20L14 9" stroke="{b}" stroke-width="3" stroke-linecap="round"/><path d="M13.500 9.500l5-5" stroke="{a}" stroke-width="6.500" stroke-linecap="round"/>',
  shovel: '<path d="M20 4L10.500 13.500" stroke="{a}" stroke-width="2.400" stroke-linecap="round"/><path d="M11 11l2.500 2.500-5 6.500-5.500 1 1-5.500z" fill="{c}"/>',
  spear: '<path d="M4 20L16 8" stroke="{a}" stroke-width="2.200" stroke-linecap="round"/><path d="M21.500 2.500l-2.500 7.500-5-5z" fill="{c}"/>',
  bow: '<path d="M7 3c11 3 11 15 0 18" stroke="{a}" stroke-width="2.400" fill="none" stroke-linecap="round"/><path d="M7 3v18" stroke="{c}" stroke-width="1"/><path d="M3 12h16m-3-2.500l3 2.500-3 2.500" stroke="{b}" stroke-width="1.400" fill="none"/>',
  pistol: '<path d="M3 7h18v4.500h-8.500l-1 2H8l-1 6.500H3l2-9H3z" fill="{a}"/><rect x="3" y="7" width="18" height="1.800" fill="{c}"/>',
  longgun: '<path d="M2 15l4-3.500h16V14H12l-3 1.500-4 4H2z" fill="{a}"/><rect x="9" y="9.700" width="13" height="1.600" fill="{c}"/>',
  bullet: '<path d="M9 21V9c0-3 1.500-5 3-6 1.500 1 3 3 3 6v12z" fill="{a}"/><rect x="9" y="17" width="6" height="4" fill="{b}"/>',
  shell: '<rect x="8" y="4" width="8" height="13" rx="1" fill="{a}"/><rect x="7.500" y="17" width="9" height="4" rx="1" fill="{c}"/>',
  arrow: '<path d="M4 20L18 6" stroke="{a}" stroke-width="1.800"/><path d="M21.500 2.500l-1.500 6.500L15 4z" fill="{c}"/><path d="M4 20l1-4.500M4 20l4.500-1" stroke="{b}" stroke-width="1.800"/>',
  hat: '<path d="M5 15a7 8 0 0 1 14 0z" fill="{a}"/><rect x="4" y="14" width="16" height="4.500" rx="2" fill="{b}"/><circle cx="12" cy="6.300" r="1.700" fill="{c}"/>',
  helmet: '<path d="M3 15a9 9 0 0 1 18 0v2.500H3z" fill="{a}"/><rect x="3" y="15" width="18" height="2.500" fill="{b}"/>',
  coat: '<path d="M8 3l4 2 4-2 5 4-2.500 4-1.500-1v11H7V10l-1.500 1L3 7z" fill="{a}"/><path d="M12 5v16" stroke="{b}" stroke-width="1.300"/>',
  pants: '<path d="M6 3h12l1 18h-5l-2-10-2 10H5z" fill="{a}"/><rect x="6" y="3" width="12" height="2.500" fill="{b}"/>',
  boot: '<path d="M8 3h6v10l6 3v3H7z" fill="{a}"/><rect x="7" y="19" width="13" height="2.200" fill="{b}"/>',
  mask: '<path d="M4 9c5-3 11-3 16 0v4c-2 5-5 7-8 7s-6-2-8-7z" fill="{a}"/><circle cx="8.500" cy="11.500" r="2.100" fill="{c}"/><circle cx="15.500" cy="11.500" r="2.100" fill="{c}"/><circle cx="12" cy="17" r="2.300" fill="{b}"/>',
  vest: '<path d="M7 3h3l2 3 2-3h3l2 5v13H5V8z" fill="{a}"/><path d="M8 12h8M8 16h8" stroke="{b}" stroke-width="1.500"/>',
  pack: '<path d="M9 6a3 3 0 0 1 6 0" stroke="{b}" stroke-width="1.800" fill="none"/><rect x="6" y="6" width="12" height="15" rx="3" fill="{a}"/><rect x="8.500" y="12" width="7" height="5" rx="1" fill="{b}"/>',
  flame: '<path d="M12 2c3 4 5.500 6 5.500 10.500a5.500 5.500 0 0 1-11 0c0-2 1-3.500 2-4.500 0 2 1 3 2 3 0-3-1-5 1.500-9z" fill="{a}"/><path d="M12 13c1.500 1.500 2.200 2.500 2.200 3.700a2.200 2.200 0 0 1-4.400 0c0-1.200.800-2.200 2.200-3.700z" fill="{c}"/>',
  pot: '<path d="M6 9a6 6 0 0 1 12 0" stroke="{b}" stroke-width="1.600" fill="none"/><path d="M4 9h16v8a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z" fill="{a}"/><rect x="3" y="8" width="18" height="2.200" fill="{b}"/>',
  needle: '<path d="M4 20L20 4" stroke="{c}" stroke-width="2" stroke-linecap="round"/><circle cx="18" cy="6" r="1" fill="{b}"/><path d="M4 11c4-3.500 6.500 3.500 11 0" stroke="{a}" stroke-width="1.600" fill="none"/>',
  wrench: '<path d="M5 21L14.500 9.500" stroke="{a}" stroke-width="3.200" stroke-linecap="round"/><path d="M13 6a4.700 4.700 0 1 0 6.500 6l-3.200-1-2-2.200z" fill="{a}"/><circle cx="5.500" cy="20.500" r="1" fill="{b}"/>',
  rod: '<path d="M3 21L19 3" stroke="{a}" stroke-width="2" stroke-linecap="round"/><path d="M19 3v11" stroke="{c}" stroke-width="1"/><path d="M19 14a2 2 0 1 1-3 1.500" stroke="{c}" stroke-width="1.400" fill="none"/>',
  device: '<rect x="5" y="4" width="14" height="17" rx="2" fill="{a}"/><rect x="7.500" y="6.500" width="9" height="5" fill="{c}"/><circle cx="9.500" cy="16" r="1.600" fill="{b}"/><circle cx="14.500" cy="16" r="1.600" fill="{b}"/>',
  tent: '<path d="M12 4L2 20h20z" fill="{a}"/><path d="M12 10l-4 10h8z" fill="{b}"/>',
  roll: '<rect x="3" y="8" width="18" height="9" rx="4.500" fill="{a}"/><circle cx="7.500" cy="12.500" r="2.500" fill="{b}"/><path d="M13 8v9M17 8v9" stroke="{b}" stroke-width="1.400"/>',
  log: '<rect x="3" y="9" width="15" height="7" rx="3.500" fill="{a}"/><circle cx="18" cy="12.500" r="3.500" fill="{c}"/><circle cx="18" cy="12.500" r="1.400" fill="{b}"/>',
  crate: '<path d="M4 7l8-3 8 3v10l-8 3-8-3z" fill="{a}"/><path d="M4 7l8 3 8-3M12 10v10" stroke="{b}" stroke-width="1.300" fill="none"/>',
  hide: '<path d="M6 4l3 2h6l3-2 2 4-2 3 2 6-4 3-4-2-4 2-4-3 2-6-2-3z" fill="{a}"/><path d="M12 8v9" stroke="{b}" stroke-width="1.200"/>',
  nut: '<path d="M12 3l8 4.500v9L12 21l-8-4.500v-9z" fill="{a}"/><circle cx="12" cy="12" r="3.300" fill="{b}"/>',
  coil: '<ellipse cx="12" cy="12" rx="8" ry="6" fill="none" stroke="{a}" stroke-width="3.200"/><ellipse cx="12" cy="12" rx="4" ry="2.500" fill="none" stroke="{b}" stroke-width="1.600"/>',
  nails: '<path d="M6.500 5h5M9 5v15M14.500 7h5M17 7v13" stroke="{a}" stroke-width="2.200" stroke-linecap="round"/>',
  ring: '<circle cx="12" cy="12" r="8.500" fill="{a}"/><circle cx="12" cy="12" r="3.700" fill="{b}"/>',
  rock: '<path d="M5 15l3-8 6-2 5 5-1 8-8 2z" fill="{a}"/><path d="M8 7l3 5 8-2M11 12l-1 8" stroke="{b}" stroke-width="1.300" fill="none"/>',
  flask: '<path d="M9 3h6v6l5 9a2 2 0 0 1-2 3H6a2 2 0 0 1-2-3l5-9z" fill="{a}"/><path d="M7 15h10l2 3.500H5z" fill="{c}"/>',
  chip: '<path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3" stroke="{a}" stroke-width="1.700"/><rect x="6" y="6" width="12" height="12" rx="1.500" fill="{a}"/><rect x="9" y="9" width="6" height="6" fill="{b}"/>',
  jerry: '<rect x="6" y="3" width="5" height="3.500" fill="{b}"/><path d="M5 6h9l5 4v11H5z" fill="{a}"/><path d="M8 11l8 8M16 11l-8 8" stroke="{b}" stroke-width="1.600"/>',
  battery: '<rect x="6" y="5" width="3" height="3" fill="{b}"/><rect x="15" y="5" width="3" height="3" fill="{b}"/><rect x="3" y="8" width="18" height="12" rx="1.500" fill="{a}"/><path d="M6.500 14h3M15 14h3M16.500 12.500v3" stroke="{c}" stroke-width="1.600"/>',
  wheel: '<circle cx="12" cy="12" r="9" fill="{a}"/><circle cx="12" cy="12" r="5" fill="{b}"/><circle cx="12" cy="12" r="1.700" fill="{c}"/>',
  chain: '<rect x="3" y="9" width="9.500" height="6" rx="3" fill="none" stroke="{a}" stroke-width="2.400"/><rect x="11.500" y="9" width="9.500" height="6" rx="3" fill="none" stroke="{c}" stroke-width="2.400"/>',
  bike: '<circle cx="6" cy="16" r="4" fill="none" stroke="{a}" stroke-width="2"/><circle cx="18" cy="16" r="4" fill="none" stroke="{a}" stroke-width="2"/><path d="M6 16l4-8h6l2 8M10 8l4 8M9 6h3M16 8l-1-3h2" stroke="{c}" stroke-width="1.700" fill="none"/>',
  moto: '<circle cx="6" cy="16" r="4" fill="{a}"/><circle cx="18" cy="16" r="4" fill="{a}"/><path d="M6 16l4-6h6l2 6M10 10h7l2-3" stroke="{c}" stroke-width="2.400" fill="none"/>',
  car: '<path d="M2 16v-4l3-1 2-4h9l3 4 3 1v4z" fill="{a}"/><path d="M8 8.500h3.500V11H7zM13 8.500h2.500L17 11h-4z" fill="{c}"/><circle cx="7" cy="16.500" r="2.600" fill="{b}"/><circle cx="17" cy="16.500" r="2.600" fill="{b}"/>',
  ticket: '<path d="M3 7h18v4a2 2 0 0 0 0 4v4H3v-4a2 2 0 0 0 0-4z" fill="{a}"/><path d="M9 7v12" stroke="{b}" stroke-width="1.400" stroke-dasharray="2 2"/>',
  house: '<path d="M2.500 12l9.500-8.500 9.500 8.500v9h-19z" fill="{a}"/><rect x="10" y="14" width="4" height="7" fill="{b}"/>',
  factory: '<path d="M3 21V11l6 3v-3l6 3V5h4v16z" fill="{a}"/><rect x="6" y="16" width="3" height="3" fill="{b}"/><rect x="12" y="16" width="3" height="3" fill="{b}"/>',
  star: '<path d="M12 2l3 7h7l-5.500 4.500 2 7.500L12 16.500 5.500 21l2-7.500L2 9h7z" fill="{a}"/>',
  cross: '<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z" fill="{a}"/>',
  rail: '<path d="M7 3v18M17 3v18M7 7h10M7 12h10M7 17h10" stroke="{a}" stroke-width="2.200"/>',
  cart: '<path d="M3 4h3l2 10h10l2-7H7" stroke="{a}" stroke-width="2.200" fill="none"/><circle cx="9.500" cy="18.500" r="1.900" fill="{a}"/><circle cx="16.500" cy="18.500" r="1.900" fill="{a}"/>',
  shield: '<path d="M12 2l8 3v6c0 5-3.500 8.500-8 10-4.500-1.500-8-5-8-10V5z" fill="{a}"/><path d="M12 6v11" stroke="{b}" stroke-width="1.500"/>',
  fork: '<path d="M7 3v6a2 2 0 0 0 4 0V3M9 3v18M16 3c-2.500 2-2.500 7 0 9v9" stroke="{a}" stroke-width="2" fill="none" stroke-linecap="round"/>',
  drop: '<path d="M12 3c4 5 6.500 8 6.500 11.500a6.500 6.500 0 0 1-13 0C5.500 11 8 8 12 3z" fill="{a}"/>',
  thermo: '<path d="M10 4a2 2 0 0 1 4 0v9a4.500 4.500 0 1 1-4 0z" fill="{a}"/><circle cx="12" cy="17" r="2" fill="{b}"/>',
  rad: '<circle cx="12" cy="12" r="9.500" fill="{a}"/><path d="M12 12L7.500 4.200a9 9 0 0 1 9 0zM12 12l9 0a9 9 0 0 1-4.500 7.800zM12 12l-4.500 7.800A9 9 0 0 1 3 12z" fill="{b}"/><circle cx="12" cy="12" r="2" fill="{a}"/>',
  face: '<circle cx="12" cy="12" r="9.500" fill="{a}"/><circle cx="8.500" cy="10" r="1.300" fill="{b}"/><circle cx="15.500" cy="10" r="1.300" fill="{b}"/><path d="M8 15c2 2 6 2 8 0" stroke="{b}" stroke-width="1.600" fill="none" stroke-linecap="round"/>',
  mapf: '<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z" fill="{a}"/><path d="M9 4v14M15 6v14" stroke="{b}" stroke-width="1.400"/>',
  lens: '<circle cx="10.500" cy="10.500" r="6.500" fill="none" stroke="{a}" stroke-width="2.600"/><path d="M15.500 15.500L21 21" stroke="{a}" stroke-width="3" stroke-linecap="round"/>',
  person: '<circle cx="12" cy="7" r="4.200" fill="{a}"/><path d="M4 21a8 8 0 0 1 16 0z" fill="{a}"/>',
  globe: '<circle cx="12" cy="12" r="9" fill="none" stroke="{a}" stroke-width="2"/><path d="M3 12h18M12 3c4 4 4 14 0 18M12 3c-4 4-4 14 0 18" stroke="{a}" stroke-width="1.500" fill="none"/>'
};
const PAL = {
  food: ['#d59a55', '#7a4a1e', '#f3d9a8'], drink: ['#6fa9d8', '#2d5878', '#d7ecfa'], med: ['#d9645a', '#7c2a25', '#f6e9e4'],
  melee: ['#9fb0bb', '#4d5a63', '#dfe8ee'], ranged: ['#8f9da8', '#3f4a52', '#cfd9e0'], ammo: ['#cfa64a', '#7a5a18', '#f1dd9c'],
  wear: ['#86a27c', '#3f5638', '#d6e5cf'], tool: ['#c0a878', '#6b5633', '#efe2c2'], mat: ['#a99a84', '#5b5042', '#e2d8c6'],
  part: ['#8f9bb0', '#465064', '#d5dcea'], money: ['#d9bb5c', '#7d6420', '#f5e7ae'], ui: ['#e2e8eb', '#151c22', '#ffffff']
};
const RED = ['#c9584c', '#6e231c', '#f0c9bf'], GRN = ['#7fae6a', '#35592a', '#d9ecc9'], BRN = ['#9a7350', '#4f3722', '#dcc3a4'], WHT = ['#e6e2d6', '#8d8676', '#ffffff'], DRK = ['#5d6168', '#26282c', '#a5aab2'], BLU = ['#6a9bc9', '#2b4f72', '#d3e6f6'];
const ICON = {
  canned: ['can'], cfish: ['can', BLU], condmilk: ['can', WHT], crackers: ['loaf'], choco: ['choco', BRN], porridge: ['bowl'], bpotato: ['potato'], meat: ['meat', BRN], jerky: ['meat', ['#7d4a36', '#3d2118', '#c79a84']], fishc: ['fish'], stew: ['bowl', GRN], bread: ['loaf', ['#dcb06a', '#8a5a22', '#f6e2b5']], berries: ['berry', RED], rawmeat: ['meat', RED], fish: ['fish', BLU], potato: ['potato', BRN], mushrooms: ['mushroom', RED],
  buckwheat: ['sack', BRN], flour: ['sack', WHT], salt: ['sack', ['#cfd6da', '#7c868c', '#ffffff']], tealeaf: ['leaf', BRN], herbs: ['leaf', GRN],
  water: ['bottle'], dirtywater: ['bottle', BRN], tea: ['mug', BRN], herbtea: ['mug', GRN], vodka: ['bottle', WHT],
  ragband: ['bandage', ['#8d8676', '#5b5042', '#cfc8b6']], bandage: ['bandage'], iodine: ['vial', BRN], alcohol: ['vial', BLU], splint: ['splint', ['#b89468', '#5b4326', '#f1ead8']], medkit: ['medkit'], antibiotic: ['pill'], charcoaltab: ['pill', DRK], coldmed: ['pill', BLU], ointment: ['tube', GRN], painkiller: ['pill', WHT], antirad: ['pill', ['#b9b23f', '#5f5a16', '#eeeaa6']], tobacco: ['leaf', ['#8a6a3c', '#46331a', '#d0b58a']], book: ['book', BLU],
  knife: ['knife'], club: ['club', BRN], crowbar: ['bar'], shovel: ['shovel', BRN], axe: ['axe', BRN], spear: ['spear', BRN], bow: ['bow', BRN], pistol: ['pistol'], shotgun: ['longgun', BRN], rifle: ['longgun'], akm: ['longgun', DRK],
  arrow: ['arrow', BRN], a9: ['bullet'], a12: ['shell', RED], a762: ['bullet', ['#b9894a', '#6b4a1c', '#e9cf9c']],
  cap: ['hat'], ushanka: ['hat', BRN], helmet: ['helmet'], jacket: ['coat'], coat: ['coat', ['#7d8a5c', '#3d4628', '#cfd8b4']], furcoat: ['coat', BRN], chemsuit: ['coat', ['#b9b23f', '#5f5a16', '#eeeaa6']], pants: ['pants'], warmpants: ['pants', BRN], shoes: ['boot'], boots: ['boot', DRK], valenki: ['boot', ['#a39683', '#5b5042', '#e2d8c6']], unty: ['boot', BRN], respirator: ['mask', WHT], gasmask: ['mask', DRK], vest: ['vest', DRK], bag: ['pack', BRN], backpack: ['pack'], bigpack: ['pack', DRK],
  torch: ['flame', ['#e0662c', '#5b3a1c', '#f8c46c']], flashlight: ['device', ['#8f9bb0', '#2a3038', '#f5e7ae']],
  matches: ['flame', ['#e08a3c', '#7a3c12', '#f8dc8c']], lighter: ['flame', BLU], pot: ['pot', DRK], sewkit: ['needle'], toolkit: ['wrench', ['#9fb0bb', '#4d5a63', '#dfe8ee']], fishrod: ['rod', BRN], geiger: ['device', ['#b9b23f', '#3f3c12', '#20261a']], tent: ['tent', ['#86a27c', '#3f5638', '#d6e5cf']], sleepbag: ['roll', BLU],
  wood: ['log', BRN], cloth: ['roll', ['#b9ad96', '#6f6552', '#e9e1cf']], leather: ['hide', BRN], scrap: ['nut', ['#9aa2a8', '#474d52', '#d9dee2']], wire: ['coil', ['#b9894a', '#6b4a1c', '#e9cf9c']], nails: ['nails', ['#9aa2a8', '#474d52', '#d9dee2']], tape: ['ring', BLU], rope: ['coil', BRN], rubber: ['ring', DRK], coal: ['rock', DRK], chemicals: ['flask', GRN], gunpowder: ['sack', DRK], electronics: ['chip', GRN], fuel: ['jerry', RED],
  battery: ['battery'], wheel: ['wheel', DRK], chain: ['chain'], bikeframe: ['bike'], coupon: ['ticket']
};
const BICON = { house: 'house', shop: 'cart', pharmacy: 'cross', hospital: 'medkit', garage: 'wrench', gas: 'jerry', warehouse: 'crate', factory: 'factory', police: 'shield', military: 'star', school: 'book', station: 'rail', hunting: 'longgun', izba: 'house', farm: 'sack', sawmill: 'log', checkpoint: 'star', camp: 'tent', zimovye: 'house', meteo: 'device', base: 'ticket' };
const VICON = { bike: 'bike', moto: 'moto', car: 'car' };
const svgStr = (gl, p) => `<svg viewBox="0 0 24 24" aria-hidden="true">${(GLY[gl] || GLY.nut).replace(/\{a\}/g, p[0]).replace(/\{b\}/g, p[1]).replace(/\{c\}/g, p[2])}</svg>`;
/* Рисованные картинки: листы 4×4, ключ → [лист, номер ячейки]. Если листа нет, остаётся значок. */
const ARTS = {
  f1: ['canned', 'cfish', 'condmilk', 'crackers', 'choco', 'porridge', 'bpotato', 'meat', 'jerky', 'fishc', 'stew', 'bread', 'berries', 'rawmeat', 'fish', 'potato'],
  f2: ['mushrooms', 'buckwheat', 'flour', 'salt', 'tealeaf', 'herbs', 'water', 'dirtywater', 'tea', 'herbtea', 'vodka', 'tobacco', 'book', 'matches', 'lighter', 'pot'],
  m: ['ragband', 'bandage', 'iodine', 'alcohol', 'splint', 'medkit', 'antibiotic', 'charcoaltab', 'coldmed', 'ointment', 'painkiller', 'antirad', 'sewkit', 'toolkit', 'fishrod', 'geiger'],
  w: ['knife', 'club', 'crowbar', 'shovel', 'axe', 'spear', 'bow', 'arrow', 'shotgun', 'rifle', 'a12', 'a762', 'a9', 'coupon', 'x:map', 'x:compass'],
  c: ['cap', 'ushanka', 'helmet', 'jacket', 'coat', 'furcoat', 'chemsuit', 'pants', 'warmpants', 'shoes', 'boots', 'valenki', 'unty', 'respirator', 'gasmask', 'vest'],
  x: ['bag', 'backpack', 'bigpack', 'tent', 'sleepbag', 'wood', 'cloth', 'leather', 'scrap', 'wire', 'nails', 'tape', 'rope', 'rubber', 'coal', 'chemicals'],
  p: ['gunpowder', 'electronics', 'fuel', 'battery', 'wheel', 'chain', 'bikeframe', 'v:bike', 'v:moto', 'v:car', 's:fire', 's:rest', 's:bench', 's:kitchen', 's:sew', 's:med'],
  b1: ['b:house', 'b:shop', 'b:pharmacy', 'b:hospital', 'b:garage', 'b:gas', 'b:warehouse', 'b:factory', 'b:police', 'b:military', 'b:school', 'b:station', 'b:hunting', 'b:izba', 'b:farm', 'b:sawmill'],
  b2: ['b:checkpoint', 'b:camp', 'b:zimovye', 'b:meteo', 'b:base', 't:forest', 't:taiga', 't:steppe', 't:tundra', 't:desert', 't:street', 't:river', 'x:wmoto', 'x:wcar', 'x:rad', 'x:sign'],
  ui: ['u:hp', 'u:food', 'u:water', 'u:warm', 'u:rad', 'u:mood', 'u:map', 'u:lens', 'u:pack', 'u:tent', 'u:hero', 'u:globe', 'u:ap', 'u:weight', 'u:coin', 'u:craft'],
  h: ['h:0', 'h:1', 'h:2', 'h:3', 'h:4', 'h:5', 'h:6', 'h:7', 'h:8', 'h:9', 'h:10', 'h:11', 'h:12', 'h:13', 'h:14', 'h:15'],
  e2: ['e:rat', 'e:bigrat', 'e:mwolf', 'e:mboar', 'e:mbear', 'e:snake', 'e:spider', 'e:crow', 'e:elk', 'e:lynx', 'e:swarm', 'e:hare', 'e:alpha', 'e:catfish', 'e:bat', 'e:toad'],
  e: ['e:wolf', 'e:dog', 'e:mice', 'e:boar', 'e:bear', 'e:glowdog', 'e:burnt', 'e:marauder', 'e:gunman', 'e:deserter', 'e:oboz', 'e:rider', 'e:poacher', 'e:soldier', 'e:putguard', 'e:artguard']
};
const ART = {}, HAVE = typeof ART_HAVE !== 'undefined' ? ART_HAVE : [];
for (const sh in ARTS) if (HAVE.includes(sh)) ARTS[sh].forEach((k, i) => { ART[k] = [sh, i]; });
const art = k => { const a = ART[k]; return a ? `<span class="pi" style="background-image:url(art/${a[0]}.webp);background-position:${(a[1] % 4) / 3 * 100}% ${Math.floor(a[1] / 4) / 3 * 100}%"></span>` : ''; };
const _sheet = {};
function drawArt(c, k, x, y, size) { const a = ART[k]; if (!a) return false; let im = _sheet[a[0]]; if (!im) { im = _sheet[a[0]] = new Image(); im.src = 'art/' + a[0] + '.webp'; } if (!im.complete || !im.naturalWidth) return false; const t = im.naturalWidth / 4; c.drawImage(im, (a[1] % 4) * t, Math.floor(a[1] / 4) * t, t, t, x - size / 2, y - size / 2, size, size); return true; }
const _ic = {};
function icon(k) { if (_ic[k]) return _ic[k]; const a = art(k); if (a) return _ic[k] = a; const d = ICON[k] || ['nut']; return _ic[k] = svgStr(d[0], d[1] || PAL[ITEMS[k].c] || PAL.mat); }
const uiIcon = (gl, col) => svgStr(gl, [col || 'currentColor', 'rgba(0,0,0,.45)', 'rgba(255,255,255,.75)']);
const _img = {};
function glyphImg(gl, p) { const key = gl + p[0]; if (_img[key]) return _img[key]; const im = new Image(); im.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(svgStr(gl, p).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" ')); return _img[key] = im; }

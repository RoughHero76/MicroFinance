import React from 'react';
import { Svg, G, Path, Circle, Line, Rect, Polyline, Ellipse } from 'react-native-svg';
import { colors } from './tokens';

/**
 * Icon — hand-drawn SVG icon set (24×24 grid, stroke-based).
 * Drop-in replacement for `react-native-vector-icons/MaterialCommunityIcons`:
 * same `name` / `size` / `color` / `style` API, plus MDI name aliases.
 */

const STROKE = 1.8;

const I = {
  // ---------- navigation & basics ----------
  menu: <G><Line x1="4" y1="7" x2="20" y2="7" /><Line x1="4" y1="12" x2="20" y2="12" /><Line x1="4" y1="17" x2="14" y2="17" /></G>,
  close: <G><Path d="M6 6l12 12M18 6L6 18" /></G>,
  'chevron-right': <Polyline points="9 6 15 12 9 18" />,
  'chevron-left': <Polyline points="15 6 9 12 15 18" />,
  'chevron-down': <Polyline points="6 9 12 15 18 9" />,
  'chevron-up': <Polyline points="6 15 12 9 18 15" />,
  plus: <G><Path d="M12 5v14M5 12h14" /></G>,
  minus: <Path d="M5 12h14" />,
  'dots-vertical': <G fill="currentColor" stroke="none"><Circle cx="12" cy="5.5" r="1.6" /><Circle cx="12" cy="12" r="1.6" /><Circle cx="12" cy="18.5" r="1.6" /></G>,
  'arrow-right': <G><Path d="M4 12h15M13 6l6 6-6 6" /></G>,
  'arrow-left': <G><Path d="M20 12H5M11 6l-6 6 6 6" /></G>,
  search: <G><Circle cx="11" cy="11" r="7" /><Path d="M16.5 16.5L21 21" /></G>,

  // ---------- status ----------
  check: <Polyline points="5 13 9.5 17.5 19 7" />,
  'check-circle': <G><Circle cx="12" cy="12" r="9" /><Polyline points="8 12.5 11 15.5 16.5 9" /></G>,
  'check-all': <G><Path d="M4 20h16" /><Polyline points="5 12 9.5 16.5 19 6" /></G>,
  'x-circle': <G><Circle cx="12" cy="12" r="9" /><Path d="M9 9l6 6M15 9l-6 6" /></G>,
  'alert-circle': <G><Circle cx="12" cy="12" r="9" /><Line x1="12" y1="7.5" x2="12" y2="12.5" /><Circle cx="12" cy="16.2" r="1.1" fill="currentColor" stroke="none" /></G>,
  'alert-triangle': <G><Path d="M12 3.5L22 20H2L12 3.5z" /><Line x1="12" y1="9.5" x2="12" y2="14" /><Circle cx="12" cy="17" r="1.1" fill="currentColor" stroke="none" /></G>,
  info: <G><Circle cx="12" cy="12" r="9" /><Line x1="12" y1="11" x2="12" y2="16.5" /><Circle cx="12" cy="7.8" r="1.1" fill="currentColor" stroke="none" /></G>,
  clock: <G><Circle cx="12" cy="12" r="9" /><Polyline points="12 7 12 12 15.5 14" /></G>,
  history: <G><Path d="M12 3a9 9 0 1 1-8.3 5.5" /><Polyline points="3.5 3.5 3.5 8.5 8.5 8.5" /><Polyline points="12 7.5 12 12 15.5 14" /></G>,
  'trending-up': <G><Polyline points="3 17 9.5 10.5 13.5 14.5 21 7" /><Polyline points="15 7 21 7 21 13" /></G>,
  'trending-down': <G><Polyline points="3 7 9.5 13.5 13.5 9.5 21 17" /><Polyline points="15 17 21 17 21 11" /></G>,

  // ---------- people ----------
  user: <G><Circle cx="12" cy="8" r="4" /><Path d="M4.5 20.5c0-4 3.4-6.5 7.5-6.5s7.5 2.5 7.5 6.5" /></G>,
  'user-plus': <G><Circle cx="10" cy="8" r="4" /><Path d="M2.5 20.5c0-4 3.4-6.5 7.5-6.5s7.5 2.5 7.5 6.5" /><Path d="M19 7v6M16 10h6" /></G>,
  users: <G><Circle cx="9" cy="8.5" r="3.5" /><Path d="M2.5 19.5c0-3.6 3-5.5 6.5-5.5s6.5 1.9 6.5 5.5" /><Path d="M15.5 5.6a3.5 3.5 0 0 1 0 5.8" /><Path d="M17.5 14.3c2.3.6 4 2.2 4 4.7" /></G>,
  'user-check': <G><Circle cx="10" cy="8" r="4" /><Path d="M2.5 20.5c0-4 3.4-6.5 7.5-6.5 1.6 0 3.1.4 4.3 1.1" /><Polyline points="14.5 16.5 17 19 21.5 13.5" /></G>,
  'user-x': <G><Circle cx="10" cy="8" r="4" /><Path d="M2.5 20.5c0-4 3.4-6.5 7.5-6.5 1.4 0 2.7.3 3.9.9" /><Path d="M16 15.5l5 5M21 15.5l-5 5" /></G>,
  'user-cog': <G><Circle cx="10" cy="8" r="4" /><Path d="M2.5 20.5c0-4 3.4-6.5 7.5-6.5" /><Circle cx="17.5" cy="16.5" r="2.5" /><Path d="M17.5 12.5v2M17.5 18.5v2M13.9 14.7l1.4 1.4M19.7 20.5l1.4 1.4M21.1 14.7l-1.4 1.4M15.3 20.5l-1.4 1.4" /></G>,
  'user-circle': <G><Circle cx="12" cy="12" r="9.5" /><Circle cx="12" cy="10" r="3.2" /><Path d="M5.8 19.5c.9-3 3.3-4.5 6.2-4.5s5.3 1.5 6.2 4.5" /></G>,

  // ---------- money & finance ----------
  bank: <G><Path d="M3 21h18" /><Path d="M5.5 21v-10M10 21v-10M14 21v-10M18.5 21v-10" /><Path d="M2.5 11L12 3.5 21.5 11z" /></G>,
  bill: <G><Rect x="2.5" y="6.5" width="19" height="11" rx="2" /><Circle cx="12" cy="12" r="2.6" /><Path d="M5.5 12h.01M18.5 12h.01" strokeWidth={2.4} /></G>,
  bills: <G><Rect x="2.5" y="4" width="15" height="10" rx="1.8" /><Path d="M20.5 8.5v9a2 2 0 0 1-2 2h-13" /><Path d="M20.5 8.5a2 2 0 0 0-2-2h-8" /></G>,
  wallet: <G><Rect x="2.5" y="6" width="19" height="13.5" rx="2.5" /><Path d="M2.5 10h19" opacity="0" /><Path d="M15.5 12.5h6" /><Rect x="15.5" y="11" width="6" height="3.4" rx="1.7" fill={colors.surface} /></G>,
  percent: <G><Line x1="19" y1="5" x2="5" y2="19" /><Circle cx="7" cy="7" r="2.2" /><Circle cx="17" cy="17" r="2.2" /></G>,
  rupee: <G><Path d="M6.5 4h11M6.5 8.5h11" /><Path d="M9 4c4.5 0 4.5 6.5 0 6.5H6.5L14.5 20" /></G>,
  dollar: <G><Path d="M12 3.5v17" /><Path d="M16 7c-1-1.2-2.6-1.8-4-1.8-2.4 0-4.3 1.4-4.3 3.2s1.9 2.9 4.3 3.4 4.3 1.6 4.3 3.4-1.9 3.2-4.3 3.2c-1.4 0-3-.6-4-1.8" /></G>,
  coins: <G><Circle cx="9" cy="9" r="5.5" /><Path d="M14.8 7.2A5.5 5.5 0 1 1 7.2 14.8" /></G>,
  'cash-check': <G><Rect x="2.5" y="5.5" width="19" height="11" rx="2" /><Polyline points="7.5 11 10 13.5 14 8.5" /><Path d="M17.5 19.5a2.5 2.5 0 0 1 4 0" opacity="0" /></G>,
  'chart-line': <G><Path d="M3 20.5h18" /><Polyline points="4.5 15 9.5 9.5 13 13 19.5 6" /><Circle cx="19.5" cy="6" r="1.2" fill="currentColor" stroke="none" /></G>,
  'chart-bar': <G><Path d="M4 20.5h16.5" /><Path d="M7 20.5v-6M12 20.5v-10M17 20.5v-4" strokeWidth={2.6} /></G>,
  calculator: <G><Rect x="5" y="2.8" width="14" height="18.4" rx="2.2" /><Path d="M8.5 7h7" /><G fill="currentColor" stroke="none"><Circle cx="8.8" cy="11.5" r="1" /><Circle cx="12" cy="11.5" r="1" /><Circle cx="15.2" cy="11.5" r="1" /><Circle cx="8.8" cy="15" r="1" /><Circle cx="12" cy="15" r="1" /><Circle cx="15.2" cy="15" r="1" /><Circle cx="8.8" cy="18.2" r="1" /><Circle cx="12" cy="18.2" r="1" /><Circle cx="15.2" cy="18.2" r="1" /></G></G>,
  receipt: <G><Path d="M5.5 2.8h13v18.4l-2.2-1.6-2.1 1.6-2.2-1.6-2.1 1.6-2.2-1.6-2.2 1.6V2.8z" /><Path d="M9 8h6M9 12h6" /></G>,
  swap: <G><Path d="M7 8.5h13M17 4.5l4 4-4 4" /><Path d="M17 15.5H4M7 11.5l-4 4 4 4" /></G>,
  'coins-stack': <G><Ellipse cx="12" cy="6.5" rx="7" ry="2.8" /><Path d="M5 6.5v5c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8v-5" /><Path d="M5 11.5v5c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8v-5" /></G>,

  // ---------- actions ----------
  pencil: <G><Path d="M4 20l1.2-4.5L16.6 4.1a2.1 2.1 0 0 1 3 3L8.2 18.5 4 20z" /><Path d="M14.5 6.2l3.3 3.3" /></G>,
  trash: <G><Path d="M4 7h16" /><Path d="M9.5 7V4.5h5V7" /><Path d="M6 7l1 14h10l1-14" /><Path d="M10 11v6M14 11v6" /></G>,
  refresh: <G><Path d="M20 12a8 8 0 1 1-2.4-5.7L20 8.5" /><Polyline points="20 3.5 20 8.5 15 8.5" /></G>,
  download: <G><Path d="M12 3.5v11M7.5 10.5L12 15l4.5-4.5" /><Path d="M4 20.5h16" /></G>,
  upload: <G><Path d="M12 15.5v-11M7.5 8.5L12 4l4.5 4.5" /><Path d="M4 20.5h16" /></G>,
  share: <G><Circle cx="6" cy="12" r="2.4" /><Circle cx="17.5" cy="5.5" r="2.4" /><Circle cx="17.5" cy="18.5" r="2.4" /><Path d="M8.2 10.8l7-4M8.2 13.2l7 4" /></G>,
  filter: <Path d="M3.5 5h17l-6.5 7.5v5.5l-4 2.5v-8L3.5 5z" />,
  eye: <G><Path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><Circle cx="12" cy="12" r="3" /></G>,
  'eye-off': <G><Path d="M4 4.5l16 15" /><Path d="M10 6a9.6 9.6 0 0 1 2-.5c6 0 9.5 6.5 9.5 6.5a16.9 16.9 0 0 1-2.9 3.7M6.4 6.7A16.6 16.6 0 0 0 2.5 12S6 18.5 12 18.5c1.3 0 2.5-.3 3.7-.8" /><Path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></G>,
  camera: <G><Path d="M3.5 8h3.2l1.8-2.8h7l1.8 2.8h3.2a1.5 1.5 0 0 1 1.5 1.5v9a1.5 1.5 0 0 1-1.5 1.5h-17a1.5 1.5 0 0 1-1.5-1.5v-9A1.5 1.5 0 0 1 3.5 8z" /><Circle cx="12" cy="13.5" r="3.4" /></G>,
  send: <G><Path d="M21 3.5L10.5 13.8" /><Path d="M21 3.5L14 20.5l-3.5-6.7L3.5 10.5 21 3.5z" /></G>,

  // ---------- files & docs ----------
  file: <G><Path d="M6 2.8h7.5L18 7.3v13a.8.8 0 0 1-.8.8H6a.8.8 0 0 1-.8-.8V3.6a.8.8 0 0 1 .8-.8z" /><Polyline points="13.5 2.8 13.5 7.3 18 7.3" /><Path d="M8.8 13h6.4M8.8 16.5h6.4" /></G>,
  'file-search': <G><Path d="M6 2.8h7.5L18 7.3v7" /><Path d="M6 2.8v17.4a.8.8 0 0 0 .8.8h8" /><Polyline points="13.5 2.8 13.5 7.3 18 7.3" /><Circle cx="15" cy="15" r="3.4" /><Path d="M17.5 17.5L21 21" /></G>,
  'file-up': <G><Path d="M6 2.8h7.5L18 7.3v13a.8.8 0 0 1-.8.8H6a.8.8 0 0 1-.8-.8V3.6a.8.8 0 0 1 .8-.8z" /><Polyline points="13.5 2.8 13.5 7.3 18 7.3" /><Path d="M12 18.5v-6M9.5 14.5L12 12l2.5 2.5" /></G>,
  notebook: <G><Path d="M5 3.5h11.5a1.5 1.5 0 0 1 1.5 1.5v14a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19V5A1.5 1.5 0 0 1 5 3.5z" /><Path d="M3.5 17.5H18" /><Path d="M8 8h6" /></G>,
  clipboard: <G><Rect x="5" y="4.5" width="14" height="16.5" rx="2" /><Rect x="9" y="2.5" width="6" height="4" rx="1.2" fill={colors.surface} /><Polyline points="9 13.5 11.3 15.8 15.5 11" /></G>,
  keyboard: <G><Rect x="2.5" y="6" width="19" height="12" rx="2" /><G fill="currentColor" stroke="none"><Circle cx="6.5" cy="10" r="0.9" /><Circle cx="10" cy="10" r="0.9" /><Circle cx="13.5" cy="10" r="0.9" /><Circle cx="17" cy="10" r="0.9" /><Circle cx="6.5" cy="14" r="0.9" /><Circle cx="10" cy="14" r="0.9" /><Circle cx="13.5" cy="14" r="0.9" /><Circle cx="17" cy="14" r="0.9" /></G></G>,
  image: <G><Rect x="3" y="4.5" width="18" height="15" rx="2" /><Circle cx="8.6" cy="9.8" r="1.6" /><Path d="M4.5 17.5l4.5-4.5 3.5 3.5 2.8-2.8 4.2 4.2" /></G>,

  // ---------- communication ----------
  phone: <Path d="M5.5 4h3.4l1.6 4.2-2.2 1.6a12.6 12.6 0 0 0 5.9 5.9l1.6-2.2L20 15.1v3.4a2 2 0 0 1-2.2 2A16.4 16.4 0 0 1 3.5 6.2 2 2 0 0 1 5.5 4z" />,
  mail: <G><Rect x="3" y="5.5" width="18" height="13" rx="2" /><Path d="M3.5 7.5L12 13.5l8.5-6" /></G>,

  // ---------- place ----------
  pin: <G><Path d="M12 21.5s-7-5.8-7-11.3a7 7 0 0 1 14 0c0 5.5-7 11.3-7 11.3z" /><Circle cx="12" cy="10" r="2.6" /></G>,
  map: <G><Path d="M9 4L3 6.2v13.6L9 17.6l6 2.2 6-2.2V4l-6 2.2L9 4z" /><Path d="M9 4v13.6M15 6.2v13.6" /></G>,
  globe: <G><Circle cx="12" cy="12" r="9" /><Path d="M3 12h18" /><Path d="M12 3c2.4 2.6 3.7 5.7 3.7 9s-1.3 6.4-3.7 9c-2.4-2.6-3.7-5.7-3.7-9S9.6 5.6 12 3z" /></G>,
  home: <G><Path d="M3.5 11L12 3.5 20.5 11" /><Path d="M6 10v10.5h12V10" /><Path d="M10 20.5v-5.5h4v5.5" /></G>,
  store: <G><Path d="M4.5 9L6 4.5h12L19.5 9" /><Path d="M4.5 9a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 4.4 0" opacity="0" /><Path d="M5.5 11.5V20h13v-8.5" /><Path d="M9.5 20v-4.5h5V20" /></G>,
  building: <G><Rect x="5" y="8" width="14" height="13" /><Rect x="8.5" y="3.5" width="7" height="4.5" /><G fill="currentColor" stroke="none"><Circle cx="9" cy="12" r="1" /><Circle cx="12" cy="12" r="1" /><Circle cx="15" cy="12" r="1" /><Circle cx="9" cy="15.5" r="1" /><Circle cx="12" cy="15.5" r="1" /><Circle cx="15" cy="15.5" r="1" /></G><Path d="M10.5 21v-2.5h3V21" /></G>,

  // ---------- security & system ----------
  lock: <G><Rect x="5" y="10.5" width="14" height="10" rx="2.2" /><Path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" /><Circle cx="12" cy="15.5" r="1.2" fill="currentColor" stroke="none" /></G>,
  'lock-check': <G><Rect x="5" y="10.5" width="14" height="10" rx="2.2" /><Path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" /><Polyline points="9.5 15.5 11.5 17.5 14.8 14" /></G>,
  unlock: <G><Rect x="5" y="10.5" width="14" height="10" rx="2.2" /><Path d="M8 10.5V7.5a4 4 0 0 1 7.8-1.2" /></G>,
  bell: <G><Path d="M6.3 9.5a5.7 5.7 0 0 1 11.4 0c0 4.6 1.8 5.7 1.8 5.7H4.5s1.8-1.1 1.8-5.7z" /><Path d="M10.2 18.8a2.2 2.2 0 0 0 3.6 0" /></G>,
  gear: <G><Circle cx="12" cy="12" r="3.2" /><Circle cx="12" cy="12" r="6.6" /><G strokeWidth={2.6}><Path d="M12 2.4v2.2M12 19.4v2.2M2.4 12h2.2M19.4 12h2.2M5.4 5.4l1.6 1.6M17 17l1.6 1.6M18.6 5.4L17 7M7 17l-1.6 1.6" /></G></G>,
  shield: <G><Path d="M12 2.8l7.5 3v5.4c0 5-3.6 8.6-7.5 10-3.9-1.4-7.5-5-7.5-10V5.8l7.5-3z" /><Polyline points="8.8 12 11.2 14.4 15.5 9.5" /></G>,
  logout: <G><Path d="M9.5 21H5a1.5 1.5 0 0 1-1.5-1.5v-15A1.5 1.5 0 0 1 5 3h4.5" /><Path d="M15.5 16.5L20 12l-4.5-4.5" /><Path d="M20 12H9" /></G>,
  calendar: <G><Rect x="3.5" y="5" width="17" height="16" rx="2" /><Path d="M3.5 9.8h17" /><Path d="M8.3 3v4M15.7 3v4" /></G>,
  'calendar-check': <G><Rect x="3.5" y="5" width="17" height="16" rx="2" /><Path d="M3.5 9.8h17" /><Path d="M8.3 3v4M15.7 3v4" /><Polyline points="9 15 11.3 17.3 15.3 13" /></G>,
  'calendar-search': <G><Rect x="3" y="4.5" width="14" height="14" rx="2" /><Path d="M3 8.5h14" /><Path d="M7 2.8v3.5M13 2.8v3.5" /><Circle cx="16" cy="16" r="3.2" /><Path d="M18.4 18.4L21.2 21.2" /></G>,
  star: <Path d="M12 3.5l2.5 5.2 5.7.7-4.2 3.9 1.1 5.6-5.1-2.8-5.1 2.8 1.1-5.6L3.8 9.4l5.7-.7L12 3.5z" />,
  gift: <G><Rect x="3.5" y="8" width="17" height="4.5" /><Rect x="5" y="12.5" width="14" height="8.5" /><Path d="M12 8v13" /><Path d="M12 8c-1.5-4-6-4.5-6-1.5S10 8 12 8zM12 8c1.5-4 6-4.5 6-1.5S14 8 12 8z" /></G>,
  target: <G><Circle cx="12" cy="12" r="9" /><Circle cx="12" cy="12" r="5.2" /><Circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" /></G>,
  layers: <G><Path d="M12 3l9 5-9 5-9-5 9-5z" /><Path d="M3 12.5l9 5 9-5" /><Path d="M3 16.5l9 5 9-5" opacity="0" /></G>,
  briefcase: <G><Rect x="3" y="7.5" width="18" height="13" rx="2" /><Path d="M9 7.5V5.5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" /><Path d="M3 12.5h18" /><Circle cx="12" cy="12.5" r="1" fill="currentColor" stroke="none" /></G>,
};

/** MDI (Material Community Icons) name → our icon key.
 *  Lets existing `<Icon name="magnify" />` calls render without touching every screen. */
const MDI_ALIAS = {
  account: 'user',
  'account-arrow-right': 'user',
  'account-check-outline': 'user-check',
  'account-circle': 'user-circle',
  'account-circle-outline': 'user-circle',
  'account-edit': 'user',
  'account-outline': 'user',
  'account-plus': 'user-plus',
  'account-remove': 'user-x',
  'account-tie': 'briefcase',
  'account-group': 'users',
  'account-cash': 'wallet',
  'alert-circle': 'alert-circle',
  'alert-circle-check': 'check-circle',
  'alert-circle-outline': 'alert-circle',
  'alert-decagon': 'alert-triangle',
  bank: 'bank',
  'bell-outline': 'bell',
  calculator: 'calculator',
  calendar: 'calendar',
  'calendar-check': 'calendar-check',
  'calendar-clock': 'calendar',
  'calendar-end': 'calendar',
  'calendar-month': 'calendar',
  'calendar-month-outline': 'calendar',
  'calendar-range': 'calendar',
  'calendar-search': 'calendar-search',
  'calendar-start': 'calendar',
  camera: 'camera',
  'camera-alt': 'camera',
  cash: 'bill',
  'cash-check': 'cash-check',
  'cash-multiple': 'bills',
  check: 'check',
  'check-all': 'check-all',
  'check-circle': 'check-circle',
  'check-circle-outline': 'check-circle',
  'check-underline': 'check-all',
  'chevron-left': 'chevron-left',
  'chevron-right': 'chevron-right',
  city: 'building',
  'clipboard-check': 'clipboard',
  'clock-alert-outline': 'clock',
  close: 'close',
  'close-circle': 'x-circle',
  'close-circle-outline': 'x-circle',
  'close-outline': 'close',
  cog: 'gear',
  'currency-inr': 'rupee',
  'currency-usd': 'dollar',
  delete: 'trash',
  'delete-outline': 'trash',
  'delete-forever': 'trash',
  'trash-can': 'trash',
  'dots-vertical': 'dots-vertical',
  download: 'download',
  earth: 'globe',
  email: 'mail',
  'email-outline': 'mail',
  eye: 'eye',
  'eye-off': 'eye-off',
  'eye-off-outline': 'eye-off',
  'eye-outline': 'eye',
  'file-document-outline': 'file',
  'file-excel-box': 'file',
  'file-pdf-box': 'file',
  'file-search-outline': 'file-search',
  'file-upload': 'file-up',
  filter: 'filter',
  'filter-check-outline': 'filter',
  'filter-variant': 'filter',
  'gender-male-female': 'users',
  handshake: 'users',
  history: 'history',
  'home-outline': 'home',
  image: 'image',
  'info-outline': 'info',
  information: 'info',
  'information-outline': 'info',
  'lead-pencil': 'pencil',
  'lock-check-outline': 'lock-check',
  'lock-outline': 'lock',
  logout: 'logout',
  magnify: 'search',
  'map-marker': 'pin',
  'map-marker-radius-outline': 'pin',
  'map-outline': 'map',
  menu: 'menu',
  'notebook-outline': 'notebook',
  numeric: 'keyboard',
  percent: 'percent',
  pencil: 'pencil',
  'person-off': 'user-x',
  phone: 'phone',
  'phone-alert': 'phone',
  'phone-outline': 'phone',
  plus: 'plus',
  'progress-check': 'check-circle',
  'receipt-long': 'receipt',
  refresh: 'refresh',
  share: 'share',
  'shield-check': 'shield',
  store: 'store',
  'swap-horizontal': 'swap',
  warning: 'alert-triangle',
};

/** Resolve an icon node by direct key, MDI alias, or a safe fallback. */
const resolve = (name) => I[name] ?? I[MDI_ALIAS[name]] ?? I.info;

const Icon = ({ name, size = 24, color = colors.ink, style }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" color={color} style={style}>
    <G stroke={color} strokeWidth={STROKE} fill="none" strokeLinecap="round" strokeLinejoin="round">
      {resolve(name)}
    </G>
  </Svg>
);

Icon.displayName = 'Icon';

export { I as _rawIcons, MDI_ALIAS };
export default Icon;

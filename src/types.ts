export type BuildMode = 'BUILD' | 'ERASE';
export type Theme = 'dark' | 'light';

export interface BrickColor {
  hex: number;
  label: string;
  css: string;
}

export const BRICK_GRID_UNIT = 0.5; // Grid spacing in meters (50cm)

export interface BrickType {
  id: string;
  name: string;
  w: number;
  l: number;
  h: number;
  studsX: number;
  studsZ: number;
}

export const BRICK_TYPES: BrickType[] = [
  { id: 'bb3005', name: '1x1 Kostka (3005)', w: 0.5, l: 0.5, h: 0.6, studsX: 1, studsZ: 1 },
  { id: 'bb3004', name: '1x2 Kostka (3004)', w: 1.0, l: 0.5, h: 0.6, studsX: 2, studsZ: 1 },
  { id: 'bb3003', name: '2x2 Kostka (3003)', w: 1.0, l: 1.0, h: 0.6, studsX: 2, studsZ: 2 },
  { id: 'bb3001', name: '2x4 Kostka (3001)', w: 2.0, l: 1.0, h: 0.6, studsX: 4, studsZ: 2 },
  { id: 'bb3024', name: '1x1 Destička (3024)', w: 0.5, l: 0.5, h: 0.2, studsX: 1, studsZ: 1 },
  { id: 'bb3023', name: '1x2 Destička (3023)', w: 1.0, l: 0.5, h: 0.2, studsX: 2, studsZ: 1 },
];

export const COLORS: BrickColor[] = [
  { hex: 0xff3b30, label: 'Červená', css: '#ff3b30' },
  { hex: 0x007aff, label: 'Modrá', css: '#007aff' },
  { hex: 0x34c759, label: 'Zelená', css: '#34c759' },
  { hex: 0xffcc00, label: 'Žlutá', css: '#ffcc00' },
  { hex: 0xffffff, label: 'Bílá', css: '#ffffff' },
  { hex: 0x1c1c1e, label: 'Černá', css: '#1c1c1e' },
  { hex: 0x5856d6, label: 'Fialová', css: '#5856d6' },
  { hex: 0xff9500, label: 'Oranžová', css: '#ff9500' },
  { hex: 0x8e8e93, label: 'Šedá', css: '#8e8e93' },
  { hex: 0xaf52de, label: 'Magenta', css: '#af52de' },
  { hex: 0x5ac8fa, label: 'Azurová', css: '#5ac8fa' },
  { hex: 0xa2845e, label: 'Hnědá', css: '#a2845e' },
  { hex: 0x30d158, label: 'Limetková', css: '#30d158' },
  { hex: 0xff2d55, label: 'Růžová', css: '#ff2d55' },
  { hex: 0x636366, label: 'Tmavá šedá', css: '#636366' },
];

export interface EngineState {
  mode: BuildMode;
  colorIdx: number;
  rotation: number; // 0, 1, 2, 3 (each is 90 deg)
  invOpen: boolean;
  brickTypeId: string;
  soundEnabled: boolean;
  brickCount: number;
  canUndo: boolean;
  realisticFx: boolean;
  ssaoEnabled: boolean;
  sunAngle: number;
  dynamicSunOrbit: boolean;
}

export interface Vec2 {
  x: number;
  y: number;
}

export interface GameItem {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  width: number;
  height: number;
  imageIndex: number;
  sliced: boolean;
  offScreen: boolean;
  counted: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
}

export interface BladePoint {
  x: number;
  y: number;
  time: number;
}

export interface Star {
  x: number;
  y: number;
  size: number;
  brightness: number;
  twinkleSpeed: number;
  twinkleOffset: number;
}

export type GameScreen = 'start' | 'playing' | 'gameover';

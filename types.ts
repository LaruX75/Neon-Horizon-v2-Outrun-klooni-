
export enum GameState {
  MENU = 'MENU',
  START = 'START',
  PLAYING = 'PLAYING',
  GAMEOVER = 'GAMEOVER',
  STAGE_COMPLETE = 'STAGE_COMPLETE',
  VICTORY = 'VICTORY' // Final stage ending
}

export enum SpriteType {
  PALM_TREE = 'PALM_TREE',
  BILLBOARD_01 = 'BILLBOARD_01', 
  BILLBOARD_02 = 'BILLBOARD_02', 
  BILLBOARD_03 = 'BILLBOARD_03', 
  COLUMN = 'COLUMN',
  CACTUS = 'CACTUS',
  CAR_NPC = 'CAR_NPC', 
  SAND_DUNE = 'SAND_DUNE',
  BUSH = 'BUSH',            
  CHECKPOINT = 'CHECKPOINT',
  SPRUCE = 'SPRUCE',        
  PINE = 'PINE',            
  STREETLIGHT = 'STREETLIGHT', 
  BUILDING = 'BUILDING',     
  HOUSE = 'HOUSE',           
  SKYSCRAPER = 'SKYSCRAPER',
  SIGN_LIMIT_80 = 'SIGN_LIMIT_80', // New
  SIGN_PRIORITY = 'SIGN_PRIORITY', // New
  TRAFFIC_LIGHT = 'TRAFFIC_LIGHT'  // New
}

export interface Point {
  x: number;
  y: number;
  z: number;
}

export interface ScreenPoint {
  x: number;
  y: number;
  w: number; 
  scale: number;
}

export interface Sprite {
  type: SpriteType;
  offset: number; 
}

export interface Segment {
  index: number;
  p1: Point; 
  p2: Point; 
  p1Screen: ScreenPoint; 
  p2Screen: ScreenPoint; 
  curve: number;
  color: {
    road: string;
    grass: string;
    rumble: string;
    lane: string;
  };
  sprites: Sprite[];
  clip: number; 
  cars: Car[]; // Traffic on this segment
}

export interface Car {
  offset: number; 
  z: number; 
  speed: number;
  sprite: string;
  id: number; // Stable ID for consistent rendering (color, variations)
}

export interface BackgroundState {
  skyOffset: number;
  timeOfDay: number; 
}

// Particle for Fireworks
export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  alpha: number;
  life: number;
  size: number;
}

export interface RenderContext {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  segments: Segment[];
  baseSegment: Segment;
  playerX: number;
  playerZ: number;
  cameraHeight: number;
  cameraDepth: number;
  roadWidth: number;
  trackLength: number;
  cars: Car[];
  background: BackgroundState;
  curve: number;
  stage: number; 
  fireworks: Particle[]; // For passing visual fx to renderer
  braking?: boolean; // New property for brake lights
}

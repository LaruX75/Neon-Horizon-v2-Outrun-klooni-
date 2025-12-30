
export enum GameState {
  MENU = 'MENU',
  START = 'START',
  PLAYING = 'PLAYING',
  GAMEOVER = 'GAMEOVER',
  STAGE_COMPLETE = 'STAGE_COMPLETE' // New state for checkpoints
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
  CHECKPOINT = 'CHECKPOINT',
  SPRUCE = 'SPRUCE',        // Finland Stage
  PINE = 'PINE',            // Finland Stage
  STREETLIGHT = 'STREETLIGHT', // City Stage
  BUILDING = 'BUILDING'     // City Stage
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
}

export interface BackgroundState {
  skyOffset: number;
  timeOfDay: number; 
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
  stage: number; // Added for stage specific rendering effects
}
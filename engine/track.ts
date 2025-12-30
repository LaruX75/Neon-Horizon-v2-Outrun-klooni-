
import { Segment, SpriteType, Car } from '../types';
import { COLORS, SEGMENT_LENGTH, RUMBLE_LENGTH, TRAFFIC_COUNT, TRAFFIC_SPEED } from '../constants';

export class TrackEngine {
  segments: Segment[] = [];
  npcCars: Car[] = [];

  constructor() {
    this.segments = [];
  }

  private easeIn(a: number, b: number, percent: number): number {
    return a + (b - a) * Math.pow(percent, 2);
  }

  private easeInOut(a: number, b: number, percent: number): number {
    return a + (b - a) * ((-Math.cos(percent * Math.PI) / 2) + 0.5);
  }

  private addSegment(curve: number, y: number, stage: number = 1) {
    const n = this.segments.length;
    // OutRun style alternate lightness every few segments
    const isLoop = Math.floor(n / RUMBLE_LENGTH) % 2;
    
    // Select color scheme based on stage
    let colorScheme = isLoop ? COLORS.ROAD.LIGHT : COLORS.ROAD.DARK;
    
    if (stage === 5) {
        colorScheme = isLoop ? COLORS.ROAD.LAKESIDE_LIGHT : COLORS.ROAD.LAKESIDE_DARK;
    }

    this.segments.push({
      index: n,
      p1: { x: 0, y: this.getLastY(), z: n * SEGMENT_LENGTH },
      p2: { x: 0, y: y, z: (n + 1) * SEGMENT_LENGTH },
      p1Screen: { x: 0, y: 0, w: 0, scale: 0 },
      p2Screen: { x: 0, y: 0, w: 0, scale: 0 },
      curve: curve,
      color: colorScheme,
      sprites: [],
      clip: 0,
      cars: []
    });
  }

  private getLastY(): number {
    return (this.segments.length === 0) ? 0 : this.segments[this.segments.length - 1].p2.y;
  }

  private addRoad(enter: number, hold: number, leave: number, curve: number, y: number, stage: number = 1) {
    const startY = this.getLastY();
    const endY = startY + (Math.floor(y) * SEGMENT_LENGTH);
    
    // Enter curve/hill
    for (let n = 0; n < enter; n++) {
      this.addSegment(this.easeIn(0, curve, n / enter), this.easeInOut(startY, endY, n / (enter + hold + leave)), stage);
    }
    // Hold
    for (let n = 0; n < hold; n++) {
      this.addSegment(curve, this.easeInOut(startY, endY, (enter + n) / (enter + hold + leave)), stage);
    }
    // Leave
    for (let n = 0; n < leave; n++) {
      this.addSegment(this.easeInOut(curve, 0, n / leave), this.easeInOut(startY, endY, (enter + hold + n) / (enter + hold + leave)), stage);
    }
  }

  private addSprite(n: number, sprite: SpriteType, offset: number) {
    if (this.segments.length > n) {
      this.segments[n].sprites.push({ type: sprite, offset });
    }
  }

  public resetRoad(stage: number) {
    this.segments = [];
    this.npcCars = [];
    
    // START LINE (Flat)
    this.addRoad(50, 50, 50, 0, 0, stage); 

    // Generate Layout based on Stage
    if (stage === 1) { // Beach
        this.addRoad(60, 60, 60, 3, 40, stage); 
        this.addRoad(60, 60, 60, -3, -40, stage); 
        this.addRoad(30, 30, 30, 0, 20, stage);
        this.addRoad(30, 30, 30, 0, -20, stage);
        this.addRoad(200, 200, 200, 0, 0, stage); 
    } else if (stage === 2) { // Desert
        this.addRoad(100, 100, 100, -4, 60, stage);
        this.addRoad(50, 50, 50, 2, -60, stage);
        this.addRoad(200, 50, 200, 0, 0, stage);
    } else if (stage === 3) { // City
        this.addRoad(50, 50, 50, 2, 0, stage);
        this.addRoad(50, 50, 50, -2, 0, stage);
        this.addRoad(100, 100, 100, 0, 0, stage); // Long straight
        this.addRoad(50, 50, 50, 3, 0, stage);
        this.addRoad(100, 50, 100, 0, 0, stage);
    } else if (stage === 4) { // Finland (Forest)
        this.addRoad(50, 50, 50, 4, 40, stage);  // Uphill curve
        this.addRoad(50, 50, 50, -4, -40, stage); // Downhill curve
        this.addRoad(50, 50, 50, 3, 30, stage);  
        this.addRoad(50, 50, 50, -3, -30, stage);
        this.addRoad(50, 50, 50, 5, 20, stage);
        this.addRoad(200, 50, 50, 0, 0, stage);
    } else if (stage === 5) { // Lakeside (Sunset Chrome)
        this.addRoad(100, 100, 100, -2, 0, stage); // Gentle curve along lake
        this.addRoad(50, 50, 50, 2, 0, stage);
        this.addRoad(80, 80, 80, -3, 0, stage);
        this.addRoad(50, 50, 50, 3, 0, stage);
        this.addRoad(200, 100, 200, 0, 0, stage); // Long final straight
    }

    // CHECKPOINT AT THE END
    const lastIdx = this.segments.length - 20;
    if (lastIdx > 0) {
        this.addSprite(lastIdx, SpriteType.CHECKPOINT, 0);
    }

    // VEGETATION & SCENERY SPRITES
    const len = this.segments.length;
    
    for(let i = 20; i < len - 50; i++) { 
      
      // STAGE 1: Beach (Palms + Dunes)
      if (stage === 1) {
        if (i % 4 === 0) {
          this.addSprite(i, SpriteType.PALM_TREE, -1.5 - Math.random() * 2.0);
          this.addSprite(i, SpriteType.PALM_TREE, 1.5 + Math.random() * 2.0);
        }
        if (i % 8 === 0) {
          this.addSprite(i, SpriteType.SAND_DUNE, -3.5 - Math.random() * 2);
          this.addSprite(i, SpriteType.SAND_DUNE, 3.5 + Math.random() * 2);
        }
      } 
      // STAGE 2: Desert (Cactus + Billboards)
      else if (stage === 2) {
         if (i % 3 === 0) {
            this.addSprite(i, SpriteType.CACTUS, -1.5 - Math.random() * 3.0);
            this.addSprite(i, SpriteType.CACTUS, 1.5 + Math.random() * 3.0);
         }
         if (i % 150 === 0) {
            const signOffset = Math.random() > 0.5 ? -2.2 : 2.2;
            this.addSprite(i, SpriteType.BILLBOARD_01, signOffset);
         }
      }
      // STAGE 3: City (Buildings + Streetlights)
      else if (stage === 3) {
          // Streetlights (Regular intervals)
          if (i % 3 === 0) {
              this.addSprite(i, SpriteType.STREETLIGHT, -1.2);
              this.addSprite(i, SpriteType.STREETLIGHT, 1.2);
          }
          // Buildings (Dense)
          if (i % 2 === 0) {
              // Left side
              this.addSprite(i, SpriteType.BUILDING, -2.5 - Math.random() * 1.5);
              // Right side
              this.addSprite(i, SpriteType.BUILDING, 2.5 + Math.random() * 1.5);
          }
      }
      // STAGE 4: Finland (Spruce + Pine)
      else if (stage === 4) {
          // Dense Forest
          if (i % 2 === 0) {
              const typeL = Math.random() > 0.5 ? SpriteType.SPRUCE : SpriteType.PINE;
              const typeR = Math.random() > 0.5 ? SpriteType.SPRUCE : SpriteType.PINE;
              
              // Layered forest
              this.addSprite(i, typeL, -1.5 - Math.random());
              this.addSprite(i, typeL, -2.5 - Math.random() * 2);
              
              this.addSprite(i, typeR, 1.5 + Math.random());
              this.addSprite(i, typeR, 2.5 + Math.random() * 2);
          }
      }
      // STAGE 5: Lakeside
      else if (stage === 5) {
          // Palms on the left only (Right side is water)
          if (i % 3 === 0) {
              this.addSprite(i, SpriteType.PALM_TREE, -1.5 - Math.random() * 1.0);
              this.addSprite(i, SpriteType.PALM_TREE, -2.5 - Math.random() * 1.0);
          }
          // Sparse City Skyline on far right (distance)
          if (i % 10 === 0) {
               this.addSprite(i, SpriteType.BUILDING, 4.0 + Math.random() * 3.0);
          }
      }
    }

    // Traffic Generation
    // Lanes: -0.4 (Left), 0.4 (Right), 0 (Center) - narrowed from 0.6 to fit road better
    const lanes = [-0.4, 0.4, 0]; 

    for (let i = 0; i < TRAFFIC_COUNT; i++) {
        const lane = lanes[Math.floor(Math.random() * lanes.length)];
        const offset = lane + (Math.random() * 0.1 - 0.05); // Small jitter
        
        const z = Math.floor(Math.random() * (len - 100)) * SEGMENT_LENGTH + 20000;
        const speed = TRAFFIC_SPEED + Math.random() * 3000;
        this.npcCars.push({ offset, z, speed, sprite: SpriteType.CAR_NPC });
    }
  }

  public getLength(): number {
    return this.segments.length * SEGMENT_LENGTH;
  }
}
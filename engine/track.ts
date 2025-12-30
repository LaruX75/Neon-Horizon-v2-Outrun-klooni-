
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

  // Helper to adjust hex color brightness (e.g., amount = -20 to darken)
  private alterColorBrightness(hex: string, amount: number): string {
    let useHex = hex;
    if (hex.startsWith('#')) {
        useHex = hex.slice(1);
    }
    
    // Handle short hex (e.g. #333)
    if (useHex.length === 3) {
        useHex = useHex[0] + useHex[0] + useHex[1] + useHex[1] + useHex[2] + useHex[2];
    }

    const num = parseInt(useHex, 16);
    let r = (num >> 16) + amount;
    let g = ((num >> 8) & 0x00FF) + amount;
    let b = (num & 0x0000FF) + amount;

    r = Math.min(255, Math.max(0, r));
    g = Math.min(255, Math.max(0, g));
    b = Math.min(255, Math.max(0, b));

    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  }

  private addSegment(curve: number, y: number, stage: number = 1) {
    const n = this.segments.length;
    // OutRun style alternate lightness every few segments
    const isLoop = Math.floor(n / RUMBLE_LENGTH) % 2;
    
    // Select base color scheme based on stage
    // DEFAULT: Beach (Stage 1)
    let baseColorScheme = isLoop ? COLORS.ROAD.LIGHT : COLORS.ROAD.DARK;
    
    if (stage === 2) { // Desert
        baseColorScheme = isLoop ? COLORS.ROAD.DESERT_LIGHT : COLORS.ROAD.DESERT_DARK;
    } else if (stage === 3) { // City
        baseColorScheme = isLoop ? COLORS.ROAD.CITY_LIGHT : COLORS.ROAD.CITY_DARK;
    } else if (stage === 4) { // Finland
        baseColorScheme = isLoop ? COLORS.ROAD.FOREST_LIGHT : COLORS.ROAD.FOREST_DARK;
    } else if (stage === 5) { // Lakeside
        baseColorScheme = isLoop ? COLORS.ROAD.LAKESIDE_LIGHT : COLORS.ROAD.LAKESIDE_DARK;
    } else if (stage === 6) { // Final City
        baseColorScheme = isLoop ? COLORS.ROAD.FINAL_LIGHT : COLORS.ROAD.FINAL_DARK;
    }

    // Clone the color object to allow modification without affecting constants
    const segmentColors = { ...baseColorScheme };

    // --- VISUAL VARIATION ---
    // Procedural organic noise based on index and stage
    const stageSeed = stage * 123.45;
    
    // Road Variation: patches and grit
    // Low freq: Patches of worn asphalt (sine wave)
    // High freq: Grain/Texture (random)
    const roadPatch = Math.sin((n * 0.05) + stageSeed) * 8; 
    const roadGrit = (Math.random() * 10) - 5;
    const roadTotal = Math.floor(roadPatch + roadGrit);
    
    // Rumble Variation: mostly grit/wear
    const rumbleWear = (Math.random() * 16) - 8;
    
    // Grass/Terrain Variation: broader patches
    const grassPatch = Math.cos((n * 0.02) + stageSeed) * 12;
    const grassGrit = (Math.random() * 10) - 5;
    const grassTotal = Math.floor(grassPatch + grassGrit);

    segmentColors.road = this.alterColorBrightness(segmentColors.road, roadTotal);
    segmentColors.rumble = this.alterColorBrightness(segmentColors.rumble, Math.floor(rumbleWear));
    segmentColors.grass = this.alterColorBrightness(segmentColors.grass, grassTotal);
    
    // Stage 5 Transparent Grass (Water/Void effect)
    if (stage === 5) {
        segmentColors.grass = '#000000'; // Black rendered transparent by renderer logic
    }

    this.segments.push({
      index: n,
      p1: { x: 0, y: this.getLastY(), z: n * SEGMENT_LENGTH },
      p2: { x: 0, y: y, z: (n + 1) * SEGMENT_LENGTH },
      p1Screen: { x: 0, y: 0, w: 0, scale: 0 },
      p2Screen: { x: 0, y: 0, w: 0, scale: 0 },
      curve: curve,
      color: segmentColors,
      sprites: [],
      clip: 0,
      cars: []
    });
  }

  private getLastY() {
    return (this.segments.length === 0) ? 0 : this.segments[this.segments.length - 1].p2.y;
  }

  private addRoad(enter: number, hold: number, leave: number, curve: number, y: number, stage: number) {
    const startY = this.getLastY();
    const endY = startY + (y * SEGMENT_LENGTH);
    const total = enter + hold + leave;
    
    for(let n = 0; n < enter; n++) this.addSegment(this.easeIn(0, curve, n / enter), this.easeInOut(startY, endY, n / total), stage);
    for(let n = 0; n < hold; n++) this.addSegment(curve, this.easeInOut(startY, endY, (enter + n) / total), stage);
    for(let n = 0; n < leave; n++) this.addSegment(this.easeInOut(curve, 0, n / leave), this.easeInOut(startY, endY, (enter + hold + n) / total), stage);
  }

  private addStraight(num: number = 25, stage: number) {
    this.addRoad(num, num, num, 0, 0, stage);
  }

  private addCurve(num: number = 25, curve: number = 2, stage: number) {
    this.addRoad(num, num, num, curve, 0, stage);
  }

  private addHill(num: number = 25, height: number = 20, stage: number) {
    this.addRoad(num, num, num, 0, height, stage);
  }

  private addSCurves(stage: number) {
    this.addRoad(25, 25, 25, -3, 0, stage); // Shortened S-Curves
    this.addRoad(25, 25, 25, 3, 0, stage);
    this.addRoad(25, 25, 25, -3, 0, stage);
    this.addRoad(25, 25, 25, 3, 0, stage);
  }

  public getLength() {
    return this.segments.length * SEGMENT_LENGTH;
  }

  public addSprite(index: number, sprite: SpriteType, offset: number) {
    if (this.segments[index]) {
      this.segments[index].sprites.push({ type: sprite, offset });
    }
  }

  public resetRoad(stage: number = 1) {
    this.segments = [];
    
    // Stage Generation Logic
    // Reduced counts to make stages finishable within time limit
    this.addStraight(25, stage); // Start line (shortened)
    
    // Procedurally generate track blocks
    // Reduced blocks from 20 to 12 to shorten stage length significantly
    const blocks = 12; 
    for(let i=0; i<blocks; i++) {
        const mode = Math.floor(Math.random() * 4);
        const curve = (Math.random() * 4) * (Math.random() > 0.5 ? 1 : -1);
        const hill = (Math.random() * 40) * (Math.random() > 0.5 ? 1 : -1);
        
        // Use shorter segment counts (25 instead of 50 default)
        switch(mode) {
            case 0: this.addStraight(25, stage); break;
            case 1: this.addCurve(25, curve, stage); break;
            case 2: this.addHill(25, hill, stage); break;
            case 3: this.addSCurves(stage); break;
        }
    }
    
    this.addStraight(50, stage); // Finish line buffer

    // Add Checkpoint at the very end
    const lastIndex = this.segments.length - 10;
    this.addSprite(lastIndex, SpriteType.CHECKPOINT, 0);

    // Add Scenery
    this.populateSprites(stage);
    
    // Add Traffic
    this.createTraffic(stage);
  }

  private populateSprites(stage: number) {
    const len = this.segments.length;
    
    // Determine Stage Assets
    let treeType = SpriteType.PALM_TREE;
    let rockType = SpriteType.BILLBOARD_01; 
    let density = 20; 

    if (stage === 1) { // Beach
        treeType = SpriteType.PALM_TREE;
        rockType = SpriteType.SAND_DUNE;
        density = 5; 
    } else if (stage === 2) { // Desert
        treeType = SpriteType.CACTUS;
        rockType = SpriteType.BILLBOARD_02;
        density = 30;
    } else if (stage === 3) { // City
        treeType = SpriteType.STREETLIGHT;
        rockType = SpriteType.BUILDING;
        density = 5; 
    } else if (stage === 4) { // Finland
        treeType = SpriteType.SPRUCE; 
        rockType = SpriteType.PINE;
        density = 2; // Wall of trees
    } else if (stage === 5) { // Lakeside
        treeType = SpriteType.STREETLIGHT; 
        rockType = SpriteType.PALM_TREE; 
        density = 15;
    } else if (stage === 6) { // Final City
        treeType = SpriteType.HOUSE; 
        rockType = SpriteType.SKYSCRAPER;
        density = 5; 
    }

    for(let n = 20; n < len - 20; n += density) {
        
        // ROAD SIGNS (Every ~100 segments)
        if (n % 100 === 0) {
            const signType = Math.random() > 0.5 ? SpriteType.SIGN_LIMIT_80 : SpriteType.SIGN_PRIORITY;
            this.addSprite(n, signType, 1.2); // Right side
        }

        // STAGE 1: Beach Palms (Varied placement)
        if (stage === 1) {
            // Strict placement for the "Boulevard" look but with Jitter
            const tunnelOffset = 2.0; 
            
            // Random variation in offset (0.0 to 0.8) to break the straight line
            const jitterLeft = Math.random() * 0.8;
            const jitterRight = Math.random() * 0.8;

            this.addSprite(n, SpriteType.PALM_TREE, -tunnelOffset - jitterLeft);
            this.addSprite(n, SpriteType.PALM_TREE, tunnelOffset + jitterRight);

            if (Math.random() > 0.3) {
                const bushSide = Math.random() > 0.5 ? 1 : -1;
                const bushOffset = tunnelOffset + 1.5 + Math.random();
                this.addSprite(n + Math.floor(Math.random()*3), SpriteType.BUSH, bushOffset * bushSide);
            }

            // Sand Dunes - Must be FAR from road
            if (n % (density * 3) === 0) {
                const duneSide = Math.random() > 0.5 ? 1 : -1;
                const duneOffset = 4.5 + Math.random() * 3; 
                this.addSprite(n, SpriteType.SAND_DUNE, duneOffset * duneSide);
            }

        } else if (stage === 3 || stage === 6) {
             // CITY LOGIC
             // Standard offset for city must be wider because buildings are huge
             const safeCityOffset = 3.5; 
             const side = Math.random() > 0.5 ? 1 : -1;
             
             const buildingOffset = safeCityOffset + Math.random() * 3;
             const buildingType = stage === 6 && Math.random() > 0.5 ? SpriteType.SKYSCRAPER : SpriteType.BUILDING;
             
             this.addSprite(n, buildingType, buildingOffset * side);
             
             // Double side sometimes
             if (Math.random() > 0.4) {
                 this.addSprite(n, buildingType, buildingOffset * -side);
             }

             // Streetlights closer
             if (stage === 3) {
                 this.addSprite(n + 2, SpriteType.STREETLIGHT, 1.5 * side);
                 this.addSprite(n + 2, SpriteType.STREETLIGHT, 1.5 * -side);
             }

             // TRAFFIC LIGHTS (City Only)
             // Hanging over road
             if (stage === 3 && n % 150 === 0) {
                 this.addSprite(n, SpriteType.TRAFFIC_LIGHT, 0); // Center offset
             }

        } else {
            // Standard logic for other stages
            const side = Math.random() > 0.5 ? 1 : -1;
            const tunnelProbability = stage === 4 ? 0.8 : 0.4; 

            // Standard Offset
            const offset = 1.5 + Math.random() * 4;
            const sprite = Math.random() > 0.3 ? treeType : rockType;
            
            this.addSprite(n, sprite, offset * side);
            
            if (Math.random() > tunnelProbability) {
                this.addSprite(n, sprite, offset * -side);
            }
        }
    }
  }

  public createTraffic(stage: number) {
    this.npcCars = [];
    const totalLen = this.getLength();
    
    for (let i = 0; i < TRAFFIC_COUNT; i++) {
      const z = Math.random() * totalLen;
      
      const laneChoice = Math.floor(Math.random() * 3);
      let baseOffset = 0;
      if (laneChoice === 0) baseOffset = -0.67; // Left Lane
      if (laneChoice === 1) baseOffset = 0;     // Center Lane
      if (laneChoice === 2) baseOffset = 0.67;  // Right Lane
      
      const offset = baseOffset + (Math.random() * 0.1 - 0.05); // Tiny jitter

      const speed = TRAFFIC_SPEED + (Math.random() * 3000); 
      
      this.npcCars.push({
        offset,
        z,
        speed,
        sprite: 'NPC',
        id: i 
      });
    }
  }
}

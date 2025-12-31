
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

  private alterColorBrightness(hex: string, amount: number): string {
    let useHex = hex;
    if (hex.startsWith('#')) {
        useHex = hex.slice(1);
    }
    
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
    const isLoop = Math.floor(n / RUMBLE_LENGTH) % 2;
    
    let baseColorScheme = isLoop ? COLORS.ROAD.LIGHT : COLORS.ROAD.DARK;
    
    if (stage === 2) { 
        baseColorScheme = isLoop ? COLORS.ROAD.DESERT_LIGHT : COLORS.ROAD.DESERT_DARK;
    } else if (stage === 3) { 
        baseColorScheme = isLoop ? COLORS.ROAD.CITY_LIGHT : COLORS.ROAD.CITY_DARK;
    } else if (stage === 4) { 
        baseColorScheme = isLoop ? COLORS.ROAD.FOREST_LIGHT : COLORS.ROAD.FOREST_DARK;
    } else if (stage === 5) { 
        baseColorScheme = isLoop ? COLORS.ROAD.LAKESIDE_LIGHT : COLORS.ROAD.LAKESIDE_DARK;
    } else if (stage === 6) { 
        baseColorScheme = isLoop ? COLORS.ROAD.FINAL_LIGHT : COLORS.ROAD.FINAL_DARK;
    }

    const segmentColors = { ...baseColorScheme };

    const stageSeed = stage * 123.45;
    const roadPatch = Math.sin((n * 0.05) + stageSeed) * 8; 
    const roadGrit = (Math.random() * 10) - 5;
    const roadTotal = Math.floor(roadPatch + roadGrit);
    const rumbleWear = (Math.random() * 16) - 8;
    const grassPatch = Math.cos((n * 0.02) + stageSeed) * 12;
    const grassGrit = (Math.random() * 10) - 5;
    const grassTotal = Math.floor(grassPatch + grassGrit);

    segmentColors.road = this.alterColorBrightness(segmentColors.road, roadTotal);
    segmentColors.rumble = this.alterColorBrightness(segmentColors.rumble, Math.floor(rumbleWear));
    segmentColors.grass = this.alterColorBrightness(segmentColors.grass, grassTotal);
    
    if (stage === 5) {
        segmentColors.grass = '#000000'; 
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
    this.addRoad(25, 25, 25, -3, 0, stage); 
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
    this.addStraight(25, stage); 
    
    const blocks = 12; 
    for(let i=0; i<blocks; i++) {
        const mode = Math.floor(Math.random() * 4);
        const curve = (Math.random() * 4) * (Math.random() > 0.5 ? 1 : -1);
        const hill = (Math.random() * 40) * (Math.random() > 0.5 ? 1 : -1);
        
        switch(mode) {
            case 0: this.addStraight(25, stage); break;
            case 1: this.addCurve(25, curve, stage); break;
            case 2: this.addHill(25, hill, stage); break;
            case 3: this.addSCurves(stage); break;
        }
    }
    
    this.addStraight(50, stage); 
    const lastIndex = this.segments.length - 10;
    this.addSprite(lastIndex, SpriteType.CHECKPOINT, 0);
    this.populateSprites(stage);
    this.createTraffic(stage);
  }

  private populateSprites(stage: number) {
    const len = this.segments.length;
    
    let treeType = SpriteType.PALM_TREE;
    let rockType = SpriteType.BILLBOARD_01; 
    let density = 20; 

    if (stage === 1) { // Beach
        treeType = SpriteType.PALM_TREE;
        rockType = SpriteType.SAND_DUNE;
        density = 5; 
    } else if (stage === 2) { // Desert
        treeType = SpriteType.CACTUS;
        rockType = SpriteType.BILLBOARD_02; // Used as Massive Rocks now
        density = 10; // More dense to create the wall effect
    } else if (stage === 3) { // City
        treeType = SpriteType.STREETLIGHT;
        rockType = SpriteType.BUILDING;
        density = 5; 
    } else if (stage === 4) { // Finland
        treeType = SpriteType.SPRUCE; 
        rockType = SpriteType.PINE;
        density = 2; 
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
        
        if (n % 100 === 0) {
            const signType = Math.random() > 0.5 ? SpriteType.SIGN_LIMIT_80 : SpriteType.SIGN_PRIORITY;
            this.addSprite(n, signType, 1.2); 
        }

        if (stage === 1) {
            const tunnelOffset = 2.0; 
            const jitterLeft = Math.random() * 0.8;
            const jitterRight = Math.random() * 0.8;
            this.addSprite(n, SpriteType.PALM_TREE, -tunnelOffset - jitterLeft);
            this.addSprite(n, SpriteType.PALM_TREE, tunnelOffset + jitterRight);

            if (Math.random() > 0.3) {
                const bushSide = Math.random() > 0.5 ? 1 : -1;
                const bushOffset = tunnelOffset + 1.5 + Math.random();
                this.addSprite(n + Math.floor(Math.random()*3), SpriteType.BUSH, bushOffset * bushSide);
            }
            if (n % (density * 3) === 0) {
                const duneOffset = 4.5 + Math.random() * 3; 
                this.addSprite(n, SpriteType.SAND_DUNE, duneOffset); // Right only
            }
            
            // Sailboats on horizon (Far left)
            if (n % 300 === 0) {
                const boatOffset = -15 - (Math.random() * 10);
                this.addSprite(n, SpriteType.SAILBOAT, boatOffset);
            }

        } else if (stage === 3 || stage === 6) {
             const safeCityOffset = 3.5; 
             const side = Math.random() > 0.5 ? 1 : -1;
             
             const buildingOffset = safeCityOffset + Math.random() * 3;
             const buildingType = stage === 6 && Math.random() > 0.5 ? SpriteType.SKYSCRAPER : SpriteType.BUILDING;
             
             this.addSprite(n, buildingType, buildingOffset * side);
             if (Math.random() > 0.4) {
                 this.addSprite(n, buildingType, buildingOffset * -side);
             }
             if (stage === 3) {
                 this.addSprite(n + 2, SpriteType.STREETLIGHT, 1.5 * side);
                 this.addSprite(n + 2, SpriteType.STREETLIGHT, 1.5 * -side);
             }
             if (stage === 3 && n % 150 === 0) {
                 this.addSprite(n, SpriteType.TRAFFIC_LIGHT, 0); 
             }
        } else if (stage === 2) {
             // Desert Logic
             // Left side: Scattered Cacti
             if (Math.random() > 0.7) {
                 const offset = 2.5 + Math.random() * 2;
                 this.addSprite(n, SpriteType.CACTUS, -offset);
             }
             
             // Right side: Massive Rock Wall
             // Place constantly with small jitter to create a continuous mountain range
             const rockOffset = 3.0 + (Math.random() * 0.5);
             this.addSprite(n, SpriteType.BILLBOARD_02, rockOffset);

        } else if (stage === 4) {
             // Forest Logic - Dense Left
             // Right side is lake, so no trees close to road on right
             
             // Dense Left
             this.addSprite(n, SpriteType.SPRUCE, -1.5 - Math.random());
             this.addSprite(n, SpriteType.PINE, -3.5 - Math.random());
             if(Math.random() > 0.5) this.addSprite(n, SpriteType.SPRUCE, -5.5 - Math.random());

             // Far right trees (behind lake)
             this.addSprite(n, SpriteType.PINE, 8 + Math.random() * 5);

        } else {
            const side = Math.random() > 0.5 ? 1 : -1;
            const tunnelProbability = 0.4; 
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
      if (laneChoice === 0) baseOffset = -0.67; 
      if (laneChoice === 1) baseOffset = 0;     
      if (laneChoice === 2) baseOffset = 0.67;  
      
      const offset = baseOffset + (Math.random() * 0.1 - 0.05); 

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

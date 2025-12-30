
import { RenderContext, Segment, SpriteType, Point, ScreenPoint } from '../types';
import { WIDTH, HEIGHT, ROAD_WIDTH, COLORS, CAMERA_DISTANCE_TO_PLAYER, SEGMENT_LENGTH } from '../constants';

export class Renderer {
  
  private project(p: Point, cameraX: number, cameraY: number, cameraZ: number, cameraDepth: number, width: number, height: number, roadWidth: number): ScreenPoint {
    const transX = p.x - cameraX;
    const transY = p.y - cameraY;
    const transZ = p.z - cameraZ;
    
    const effectiveZ = Math.max(1, transZ);
    const scale = cameraDepth / effectiveZ;

    const x = Math.round((width / 2) + (scale * transX * width / 2));
    const y = Math.round((height / 2) - (scale * transY * height / 2));
    const w = Math.round(scale * roadWidth * width / 2);

    return { x, y, w, scale };
  }

  private adjustBrightness(hex: string, factor: number): string {
      if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) return '#000000';

      let r = 0, g = 0, b = 0;
      
      if (hex.length === 7) {
          r = parseInt(hex.slice(1, 3), 16);
          g = parseInt(hex.slice(3, 5), 16);
          b = parseInt(hex.slice(5, 7), 16);
      } else if (hex.length === 4) {
          r = parseInt(hex[1] + hex[1], 16);
          g = parseInt(hex[2] + hex[2], 16);
          b = parseInt(hex[3] + hex[3], 16);
      }

      if (isNaN(r)) r = 0;
      if (isNaN(g)) g = 0;
      if (isNaN(b)) b = 0;

      r = Math.min(255, Math.max(0, r * factor));
      g = Math.min(255, Math.max(0, g * factor));
      b = Math.min(255, Math.max(0, b * factor));

      return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
  }

  // Helper to extract RGB numbers from "rgb(r, g, b)" string
  private parseRgbString(rgbStr: string): [number, number, number] {
      const match = rgbStr.match(/\d+/g);
      if (!match || match.length < 3) return [255, 255, 255];
      return [parseInt(match[0]), parseInt(match[1]), parseInt(match[2])];
  }

  // Deterministic pseudo-random number generator based on seed
  private pseudoRandom(seed: number): number {
      return Math.abs(Math.sin(seed * 12.9898 + 78.233) * 43758.5453) % 1;
  }

  private drawPolygon(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number, color: string) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x3, y3);
    ctx.lineTo(x4, y4);
    ctx.closePath();
    ctx.fill();
  }

  private hash(n: number): number {
    return Math.abs(Math.sin(n * 12.9898 + 78.233) * 43758.5453) % 1;
  }

  private interpolateColor(color1: number[], color2: number[], factor: number): number[] {
      return color1.slice().map((c, i) => Math.round(c + factor * (color2[i] - c)));
  }

  private formatRgb(rgb: number[]): string {
      return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
  }

  private SKY_COLORS = {
      DAWN: { top: [0, 85, 255], bottom: [255, 100, 100], terrain: [100, 50, 80], cloud: [255, 200, 200] },
      DAY: { top: [0, 120, 255], bottom: [135, 206, 235], terrain: [24, 71, 133], cloud: [255, 255, 255] },
      DUSK: { top: [34, 0, 51], bottom: [255, 69, 0], terrain: [60, 20, 20], cloud: [255, 150, 100] },
      NIGHT: { top: [0, 0, 10], bottom: [0, 10, 40], terrain: [5, 5, 15], cloud: [40, 40, 70] },
      // Stage 5 Override colors handled in logic
      LAKESIDE: COLORS.SKY.LAKESIDE
  };

  private getEnvironmentColors(time: number, stage: number) {
      // Force Stage 5 Aesthetics if active
      if (stage === 5) {
          // Blend fixed Lakeside colors with a bit of time pulsing
          const t = Math.sin(Date.now() / 2000) * 0.1 + 0.5;
          return {
              top: this.formatRgb(this.SKY_COLORS.LAKESIDE.top),
              bottom: this.formatRgb(this.SKY_COLORS.LAKESIDE.bottom),
              terrain: this.formatRgb(this.SKY_COLORS.LAKESIDE.terrain),
              cloud: this.formatRgb(this.SKY_COLORS.LAKESIDE.cloud),
              lightFactor: 0.8
          };
      }

      let c1, c2, t;
      let lightFactor = 1.0;

      const safeTime = Math.max(0, Math.min(1, time));

      if (safeTime < 0.25) { // Dawn -> Day
          t = safeTime / 0.25;
          c1 = this.SKY_COLORS.DAWN;
          c2 = this.SKY_COLORS.DAY;
          lightFactor = 0.4 + (0.6 * t);
      } else if (safeTime < 0.6) { // Day -> Dusk
          t = (safeTime - 0.25) / 0.35;
          c1 = this.SKY_COLORS.DAY;
          c2 = this.SKY_COLORS.DUSK;
          lightFactor = 1.0 - (0.3 * t);
      } else if (safeTime < 0.75) { // Dusk -> Night
          t = (safeTime - 0.6) / 0.15;
          c1 = this.SKY_COLORS.DUSK;
          c2 = this.SKY_COLORS.NIGHT;
          lightFactor = 0.7 - (0.6 * t); 
      } else { // Night -> Dawn
          t = (safeTime - 0.75) / 0.25;
          c1 = this.SKY_COLORS.NIGHT;
          c2 = this.SKY_COLORS.DAWN;
          lightFactor = 0.1 + (0.3 * t);
      }

      const top = this.formatRgb(this.interpolateColor(c1.top, c2.top, t));
      const bottom = this.formatRgb(this.interpolateColor(c1.bottom, c2.bottom, t));
      const terrain = this.formatRgb(this.interpolateColor(c1.terrain, c2.terrain, t));
      const cloud = this.formatRgb(this.interpolateColor(c1.cloud, c2.cloud, t));

      return { top, bottom, terrain, cloud, lightFactor };
  }

  private drawCloud(ctx: CanvasRenderingContext2D, cx: number, cy: number, scale: number, colorBase: string) {
      const w = 120 * scale;
      const h = 40 * scale;
      
      if (w <= 0) return;

      const [r, g, b] = this.parseRgbString(colorBase);

      // Create Gradient for cloud shading based on Time of Day color
      const grad = ctx.createLinearGradient(cx, cy - h/2, cx, cy + h/2);
      
      // Top is lighter/brighter
      grad.addColorStop(0, `rgba(${Math.min(255, r+50)}, ${Math.min(255, g+50)}, ${Math.min(255, b+50)}, 0.9)`);
      // Bottom is the shadow color (the passed color)
      grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0.7)`);

      ctx.fillStyle = grad;
      
      // Draw overlapping ellipses
      ctx.beginPath();
      // Center
      ctx.ellipse(cx, cy, w/2, h/2, 0, 0, Math.PI * 2);
      // Left bump
      ctx.ellipse(cx - w*0.3, cy + h*0.2, w*0.3, h*0.4, 0, 0, Math.PI * 2);
      // Right bump
      ctx.ellipse(cx + w*0.3, cy + h*0.2, w*0.3, h*0.4, 0, 0, Math.PI * 2);
      // Top bump
      ctx.ellipse(cx, cy - h*0.3, w*0.4, h*0.4, 0, 0, Math.PI * 2);
      
      ctx.fill();
  }

  private drawSun(ctx: CanvasRenderingContext2D, width: number, horizonY: number, skyOffset: number, time: number, stage: number) {
      if (stage !== 5 && (time > 0.7 && time < 0.9)) return; 

      let sunHeight = -0.2; 
      if (stage === 5) {
          sunHeight = 0.2; // Fixed sunset position
      } else {
          if (time < 0.25) sunHeight = time / 0.25; 
          else if (time < 0.6) sunHeight = 1.0 - ((time - 0.25) / 0.35); 
          else if (time < 0.75) sunHeight = 0; 
      }

      const sunY = horizonY + 50 - (sunHeight * 400); 
      const sunX = (width / 2) - (skyOffset * 0.05); 
      
      const isSunset = stage === 5 || (time > 0.5 && time < 0.75);
      const r = isSunset ? 255 : 255;
      const g = isSunset ? 50 : 255; // Redder for Stage 5
      const b = isSunset ? 100 : 200; // Purpler for Stage 5

      const glow = ctx.createRadialGradient(sunX, sunY, 40, sunX, sunY, 200);
      glow.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.6)`);
      glow.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(sunX, sunY, 200, 0, Math.PI*2);
      ctx.fill();

      // Sun Core with scanlines for Stage 5
      const grad = ctx.createLinearGradient(sunX, sunY - 70, sunX, sunY + 70);
      grad.addColorStop(0, `rgb(255, 255, 200)`);
      grad.addColorStop(1, `rgb(${r}, ${g}, ${b})`);
      
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(sunX, sunY, 70, 0, Math.PI*2);
      ctx.fill();

      // Retro Scanlines on sun for Stage 5
      if (stage === 5) {
          ctx.fillStyle = 'rgba(80, 0, 100, 0.4)'; // Dark bands
          for(let i=0; i<8; i++) {
              ctx.fillRect(sunX - 70, sunY + 10 + (i*8), 140, 4);
          }
      }
  }

  private drawTerrain(ctx: CanvasRenderingContext2D, width: number, height: number, horizonY: number, skyOffset: number, color: string) {
      const terrainSpeed = 0.3; 
      const offset = skyOffset * terrainSpeed;
      
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, horizonY);
      
      for (let x = 0; x <= width; x += 10) {
          const worldX = x + offset;
          const elevation = 
             Math.sin(worldX * 0.003) * 60 + 
             Math.sin(worldX * 0.01) * 30 + 
             Math.sin(worldX * 0.02) * 10;
          
          const y = horizonY - Math.abs(elevation) - 5; 
          ctx.lineTo(x, y);
      }
      
      ctx.lineTo(width, height); 
      ctx.lineTo(0, height);
      ctx.closePath();
      ctx.fill();
  }

  private drawWater(ctx: CanvasRenderingContext2D, width: number, height: number, horizonY: number, skyTop: string, skyBottom: string) {
      // Reflection Gradient
      const grad = ctx.createLinearGradient(0, horizonY, 0, height);
      grad.addColorStop(0, skyBottom); // Mirror horizon
      grad.addColorStop(1, skyTop);    // Mirror top
      
      ctx.fillStyle = grad;
      ctx.fillRect(0, horizonY, width, height - horizonY);

      // Waves / Grid
      ctx.fillStyle = 'rgba(255, 100, 255, 0.2)';
      const waveCount = 20;
      for(let i=0; i<waveCount; i++) {
          const y = horizonY + Math.pow(i/waveCount, 2) * (height - horizonY);
          const thickness = 1 + i/2;
          ctx.fillRect(0, y, width, thickness);
      }
  }

  private drawCloudLayer(ctx: CanvasRenderingContext2D, width: number, horizonY: number, skyOffset: number, speed: number, heightOffset: number, cloudColor: string, layerIndex: number) {
      const density = 400; 
      const worldWidth = 4000; 
      
      const rawShift = skyOffset * speed;
      const shift = rawShift % worldWidth;
      const stagger = (layerIndex * 150);

      const count = Math.ceil((width + 400) / density) + 2;
      const startX = -200 - (shift % density);

      for(let i=0; i<count; i++) {
           const cx = startX + (i * density);
           const worldBlockIndex = Math.floor((rawShift + cx) / density);
           const rnd = this.hash(worldBlockIndex * 100 + layerIndex * 50);

           if (rnd > 0.4) {
               const cy = horizonY - heightOffset - (rnd * 100);
               const scale = 0.8 + rnd;
               const floatY = Math.sin(Date.now() / 2000 + worldBlockIndex) * 10;
               this.drawCloud(ctx, cx + stagger, cy + floatY, scale, cloudColor);
           }
      }
  }

  private drawBackground(ctx: CanvasRenderingContext2D, width: number, height: number, background: any, stage: number) {
    const { skyOffset, timeOfDay } = background;
    const horizonY = height / 2;
    
    const env = this.getEnvironmentColors(timeOfDay, stage);

    // 1. Sky Gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, env.top); 
    gradient.addColorStop(1, env.bottom); 

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // 2. The Sun
    this.drawSun(ctx, width, horizonY, skyOffset, timeOfDay, stage);

    // 3. Clouds (Staggered layers)
    this.drawCloudLayer(ctx, width, horizonY, skyOffset, 0.05, 120, env.cloud, 0); 
    this.drawCloudLayer(ctx, width, horizonY, skyOffset, 0.10, 80, env.cloud, 1); 
    this.drawCloudLayer(ctx, width, horizonY, skyOffset, 0.20, 40, env.cloud, 2); 

    // Stars at night
    if (stage === 5 || timeOfDay > 0.6) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        for(let i=0; i<80; i++) {
            const x = (this.hash(i) * 2000 + skyOffset * 0.02) % width;
            const y = this.hash(i+100) * (height/2);
            const size = this.hash(i+200) * 2.5;
            ctx.fillRect(x, y, size, size);
        }
    }

    // 4. Terrain or Water (Stage 5)
    if (stage === 5) {
        this.drawWater(ctx, width, height, horizonY, env.top, env.bottom);
    } else {
        this.drawTerrain(ctx, width, height, horizonY, skyOffset, env.terrain); 
        // Ocean line
        ctx.fillStyle = env.terrain; 
        ctx.fillRect(0, horizonY, width, 40);
    }

    return env.lightFactor;
  }

  private drawCheckpoint(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
      ctx.fillStyle = '#333';
      ctx.fillRect(x - w/2, y - h, w * 0.05, h);
      ctx.fillRect(x + w/2 - w*0.05, y - h, w * 0.05, h);

      const bannerH = h * 0.3;
      const bannerY = y - h + bannerH/2;
      
      ctx.fillStyle = '#111';
      ctx.fillRect(x - w/2, y - h, w, bannerH);
      
      ctx.strokeStyle = '#ffff00';
      ctx.lineWidth = w * 0.01;
      ctx.strokeRect(x - w/2, y - h, w, bannerH);

      ctx.fillStyle = '#ff0000';
      ctx.font = `900 ${Math.ceil(bannerH * 0.7)}px Orbitron`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = '#ff0000';
      ctx.shadowBlur = 10;
      ctx.fillText("CHECKPOINT", x, bannerY);
      ctx.shadowBlur = 0;

      const blink = Math.floor(Date.now() / 200) % 2 === 0;
      ctx.fillStyle = blink ? '#00ff00' : '#005500';
      const r = bannerH * 0.2;
      ctx.beginPath(); ctx.arc(x - w * 0.4, bannerY, r, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + w * 0.4, bannerY, r, 0, Math.PI*2); ctx.fill();
  }

  // New function to draw a scaled-down Ferrari for NPCs
  private drawNPCCar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, light: number, seed: number) {
      const dim = Math.max(0.1, light);
      
      // Select Color based on seed
      const colors = [
          '#cc0000', // Red
          '#00cccc', // Cyan
          '#cccc00', // Yellow
          '#00cc00', // Green
          '#cc00cc', // Purple
          '#aaaaaa'  // Silver
      ];
      const colorIndex = Math.floor(Math.abs(seed)) % colors.length;
      const baseColor = colors[colorIndex];
      const mainColor = this.adjustBrightness(baseColor, dim);

      // Tyres
      ctx.fillStyle = this.adjustBrightness('#111111', dim);
      ctx.fillRect(x + w*0.05, y + h*0.75, w*0.15, h*0.25); 
      ctx.fillRect(x + w*0.80, y + h*0.75, w*0.15, h*0.25); 

      // Main Body
      ctx.fillStyle = mainColor;
      ctx.fillRect(x + w*0.1, y + h*0.7, w*0.8, h*0.25);

      // Deck (Rear)
      ctx.beginPath();
      ctx.moveTo(x + w*0.05, y + h*0.7);
      ctx.lineTo(x + w*0.05, y + h*0.4);
      ctx.lineTo(x + w*0.2, y + h*0.3);
      ctx.lineTo(x + w*0.8, y + h*0.3);
      ctx.lineTo(x + w*0.95, y + h*0.4);
      ctx.lineTo(x + w*0.95, y + h*0.7);
      ctx.closePath();
      ctx.fill();

      // Cabin/Roof
      ctx.fillStyle = this.adjustBrightness('#550000', dim); // Darker tint
      ctx.beginPath();
      ctx.moveTo(x + w*0.2, y + h*0.3);
      ctx.lineTo(x + w*0.3, y + h*0.05);
      ctx.lineTo(x + w*0.7, y + h*0.05);
      ctx.lineTo(x + w*0.8, y + h*0.3);
      ctx.fill();

      // Rear Window
      ctx.fillStyle = this.adjustBrightness('#050505', dim);
      ctx.beginPath();
      ctx.moveTo(x + w*0.25, y + h*0.28);
      ctx.lineTo(x + w*0.33, y + h*0.1);
      ctx.lineTo(x + w*0.67, y + h*0.1);
      ctx.lineTo(x + w*0.75, y + h*0.28);
      ctx.fill();

      // Grille area
      const grillY = y + h * 0.45;
      const grillH = h * 0.25;
      ctx.fillStyle = '#111';
      ctx.fillRect(x + w*0.05, grillY, w*0.9, grillH);

      // Taillights
      ctx.fillStyle = '#cc0000';
      ctx.shadowColor = '#cc0000';
      ctx.shadowBlur = 5;
      ctx.fillRect(x + w*0.1, grillY + h*0.05, w*0.25, grillH - h*0.1);
      ctx.fillRect(x + w*0.65, grillY + h*0.05, w*0.25, grillH - h*0.1);
      ctx.shadowBlur = 0;
      
      // Exhausts
      ctx.fillStyle = '#222';
      ctx.beginPath(); ctx.arc(x + w*0.2, y + h*0.9, w*0.03, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + w*0.25, y + h*0.9, w*0.03, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + w*0.75, y + h*0.9, w*0.03, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + w*0.8, y + h*0.9, w*0.03, 0, Math.PI*2); ctx.fill();
  }

  private drawSprite(ctx: CanvasRenderingContext2D, width: number, height: number, resolution: number, roadWidth: number, sprite: SpriteType | string, scale: number, destX: number, destY: number, clipY: number, light: number, seed: number, offset: number) {
    let worldW = 0;
    let worldH = 0;

    const spriteType = sprite as SpriteType;

    // Dimensions in world units
    switch(spriteType) {
        case SpriteType.PALM_TREE: worldW = 1200; worldH = 1800; break;
        case SpriteType.SPRUCE: worldW = 1000; worldH = 2200; break;
        case SpriteType.PINE: worldW = 1100; worldH = 2000; break;
        case SpriteType.BILLBOARD_01: worldW = 1000; worldH = 600; break;
        case SpriteType.CAR_NPC: worldW = 500; worldH = 250; break;
        case SpriteType.SAND_DUNE: worldW = 2500; worldH = 700; break;
        case SpriteType.CACTUS: worldW = 300; worldH = 800; break;
        case SpriteType.STREETLIGHT: worldW = 100; worldH = 1800; break;
        case SpriteType.BUILDING: worldW = 2000; worldH = 3000; break; // Variable H
        case SpriteType.CHECKPOINT: worldW = 4000; worldH = 2000; break;
        default: worldW = 200; worldH = 200;
    }

    // Procedural building height/color using PSEUDO-RANDOM generator (Stable)
    let buildingFloors = 3;
    let buildingColor = '#444';
    if (spriteType === SpriteType.BUILDING) {
        const rnd = this.pseudoRandom(Math.floor(seed)); // Stable rnd based on seed
        buildingFloors = 1 + Math.floor(rnd * 6); // 1-6 floors
        worldH = 600 + (buildingFloors * 400); // Adjust height based on floors
        
        // Pick one of 3 grey shades for the base color
        const greys = ['#A0A0A0', '#808080', '#505050'];
        // Use part of the seed to pick index
        const colorIdx = Math.floor(rnd * 100) % 3;
        buildingColor = greys[colorIdx];
    }

    const w = worldW * scale * (width / 2);
    const h = worldH * scale * (width / 2);

    const x = destX - (w / 2);
    const y = destY - h;

    if (w < 2 || h < 2) return; 

    const clipHeight = clipY ? Math.max(0, (y + h) - clipY) : 0;
    if (clipHeight >= h) return; 

    ctx.save();
    
    if (clipHeight > 0) {
        ctx.beginPath();
        ctx.rect(x, y, w, h - clipHeight);
        ctx.clip();
    }

    // --- SPRITE DRAWING ---

    if (spriteType === SpriteType.CHECKPOINT) {
        this.drawCheckpoint(ctx, destX, destY, w, h);
    } 
    else if (spriteType === SpriteType.CAR_NPC || sprite === 'CAR_NPC') {
        // Use new detailed Ferrari drawing
        this.drawNPCCar(ctx, x, y, w, h, light, seed);
    } 
    else if (spriteType === SpriteType.PALM_TREE) {
        // ... (Existing Palm Logic)
        const trunk = this.adjustBrightness('#8B5A2B', light);
        const leaf = this.adjustBrightness('#009900', light);
        const stroke = this.adjustBrightness('#005500', light);
        ctx.fillStyle = trunk; 
        ctx.beginPath();
        ctx.moveTo(x + w*0.42, y + h); 
        ctx.quadraticCurveTo(x + w*0.5, y + h*0.5, x + w*0.48, y + h*0.2);
        ctx.lineTo(x + w*0.52, y + h*0.2);
        ctx.quadraticCurveTo(x + w*0.55, y + h*0.5, x + w*0.58, y + h); 
        ctx.fill();
        ctx.fillStyle = leaf;
        ctx.strokeStyle = stroke;
        ctx.lineWidth = w * 0.01;
        const cx = x + w*0.5;
        const cy = y + h*0.2;
        const radius = w * 0.6;
        for(let i=0; i<8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const lx = cx + Math.cos(angle) * radius;
            const ly = cy + Math.sin(angle) * (radius * 0.8);
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.quadraticCurveTo(cx + Math.cos(angle - 0.2) * radius * 0.5, cy + Math.sin(angle - 0.2) * radius * 0.5 - h*0.1, lx, ly);
            ctx.quadraticCurveTo(cx + Math.cos(angle + 0.2) * radius * 0.5, cy + Math.sin(angle + 0.2) * radius * 0.5, cx, cy);
            ctx.fill();
            ctx.stroke();
        }
    } 
    else if (spriteType === SpriteType.SPRUCE) {
        // FINLAND: Spruce (Triangle layers)
        const dkGreen = this.adjustBrightness('#003311', light);
        const mdGreen = this.adjustBrightness('#004411', light);
        
        ctx.fillStyle = this.adjustBrightness('#3d2817', light); // Trunk
        ctx.fillRect(x + w*0.45, y + h*0.8, w*0.1, h*0.2);

        // Layers
        ctx.fillStyle = dkGreen;
        ctx.beginPath(); ctx.moveTo(x, y + h*0.9); ctx.lineTo(x + w/2, y + h*0.3); ctx.lineTo(x + w, y + h*0.9); ctx.fill();
        ctx.fillStyle = mdGreen;
        ctx.beginPath(); ctx.moveTo(x + w*0.1, y + h*0.6); ctx.lineTo(x + w/2, y + h*0.1); ctx.lineTo(x + w*0.9, y + h*0.6); ctx.fill();
        ctx.fillStyle = this.adjustBrightness('#005522', light);
        ctx.beginPath(); ctx.moveTo(x + w*0.2, y + h*0.3); ctx.lineTo(x + w/2, y); ctx.lineTo(x + w*0.8, y + h*0.3); ctx.fill();
    }
    else if (spriteType === SpriteType.PINE) {
        // FINLAND: Pine (Tall trunk, roundish top)
        ctx.fillStyle = this.adjustBrightness('#5c4033', light); // Trunk
        ctx.fillRect(x + w*0.45, y + h*0.3, w*0.1, h*0.7);

        // Foliage
        ctx.fillStyle = this.adjustBrightness('#225511', light);
        ctx.beginPath();
        ctx.ellipse(x + w*0.5, y + h*0.3, w*0.4, h*0.3, 0, 0, Math.PI*2);
        ctx.fill();
        // Highlights
        ctx.fillStyle = this.adjustBrightness('#336622', light);
        ctx.beginPath();
        ctx.ellipse(x + w*0.5, y + h*0.25, w*0.3, h*0.2, 0, 0, Math.PI*2);
        ctx.fill();
    }
    else if (spriteType === SpriteType.STREETLIGHT) {
        // CITY: Streetlight (Tall pole with arm pointing to road)
        // Check which side of road (offset < 0 is left, needs arm to right)
        
        ctx.fillStyle = this.adjustBrightness('#555', light);
        ctx.fillRect(x + w*0.45, y, w*0.1, h); // Pole
        
        // Arm
        ctx.beginPath();
        ctx.moveTo(x + w*0.5, y + h*0.1);
        
        // Arm Direction
        const armEndX = offset < 0 ? x + w : x;
        const lampX = offset < 0 ? x + w : x;

        ctx.lineTo(armEndX, y + h*0.05); 
        ctx.stroke();
        
        // Lamp head
        ctx.fillStyle = '#fff';
        ctx.shadowColor = '#fff';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(lampX, y + h*0.06, w*0.2, 0, Math.PI*2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }
    else if (spriteType === SpriteType.BUILDING) {
        // CITY: Building (Rect with windows)
        const dimColor = this.adjustBrightness(buildingColor, light);
        ctx.fillStyle = dimColor;
        ctx.fillRect(x, y, w, h);
        
        // Door
        ctx.fillStyle = this.adjustBrightness('#222', light);
        ctx.fillRect(x + w*0.4, y + h*0.85, w*0.2, h*0.15);

        // Windows
        const floors = buildingFloors; 
        const winW = w * 0.15;
        const winH = h * 0.08;
        
        // Lit windows logic
        const isNight = light < 0.3;

        for(let f=0; f<floors; f++) {
             const fy = y + h - (h*0.15) - ((f+1) * (h/floors/1.2));
             for(let wx=0; wx<3; wx++) {
                  const wxPos = x + w*0.15 + (wx * w*0.25);
                  
                  // Use deterministic seed for window stability
                  // Combine seed (building ID), floor (f), and window X (wx)
                  const winRnd = this.pseudoRandom(seed * 100 + f * 10 + wx);
                  const isLit = isNight && (winRnd > 0.4);
                  
                  ctx.fillStyle = isLit ? '#ffeb3b' : '#111';
                  if(isLit) {
                      ctx.shadowColor = '#ffeb3b';
                      ctx.shadowBlur = 5;
                  }
                  
                  ctx.fillRect(wxPos, fy, winW, winH);
                  ctx.shadowBlur = 0;
             }
        }
    }
    else if (spriteType === SpriteType.CACTUS) {
        const green = this.adjustBrightness('#2e8b57', light);
        ctx.fillStyle = green;
        ctx.fillRect(x + w*0.4, y + h*0.3, w*0.2, h*0.7);
        ctx.fillRect(x + w*0.1, y + h*0.4, w*0.3, h*0.1);
        ctx.fillRect(x + w*0.1, y + h*0.2, w*0.1, h*0.3);
        ctx.fillRect(x + w*0.6, y + h*0.5, w*0.3, h*0.1);
        ctx.fillRect(x + w*0.8, y + h*0.1, w*0.1, h*0.5);
    }
    else if (spriteType === SpriteType.SAND_DUNE) {
        const sand = this.adjustBrightness('#dcb68a', light);
        ctx.fillStyle = sand; 
        ctx.beginPath();
        ctx.moveTo(x, y + h);
        ctx.quadraticCurveTo(x + w*0.3, y + h*0.4, x + w*0.6, y + h*0.6); 
        ctx.quadraticCurveTo(x + w*0.8, y + h*0.7, x + w, y + h);
        ctx.fill();
    } 
    else {
        // Billboard
        const board = this.adjustBrightness('#ffeb3b', Math.max(light, 0.5));
        ctx.fillStyle = board;
        ctx.fillRect(x + w*0.1, y, w*0.8, h*0.8);
        ctx.fillStyle = 'black';
        ctx.font = `bold ${Math.ceil(w * 0.2)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText("NEON", x + w*0.5, y + h*0.5);
    }

    ctx.restore();
  }

  // ... (drawHead and drawPlayer remain similar)
  private drawHead(ctx: CanvasRenderingContext2D, x: number, y: number, hairColor: string, isDriver: boolean) {
      ctx.fillStyle = '#dca'; 
      ctx.beginPath(); ctx.arc(x, y, 12, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = hairColor;
      ctx.beginPath(); ctx.arc(x, y - 2, 14, Math.PI, 0); ctx.fill();
      if (!isDriver) {
          ctx.beginPath();
          ctx.moveTo(x + 14, y);
          ctx.quadraticCurveTo(x + 25, y + 5, x + 30, y - 5);
          ctx.lineTo(x + 10, y - 10);
          ctx.fill();
      }
  }

  private drawPlayerCar(ctx: CanvasRenderingContext2D, width: number, height: number, resolution: number, roadWidth: number, speedPercent: number, turn: number, light: number) {
      const w = 260 * resolution; 
      const h = 100 * resolution;
      
      // Compute positions including bounce/lean here for sync
      const bounce = Math.sin(Date.now() / 100) * speedPercent * 1.5 * resolution;
      const leanX = turn * 10 * resolution;
      
      const centerX = width / 2;
      const carX = centerX + leanX;
      // FIX: Subtract h to position top of car correctly
      const carY = (height - 15) - h - bounce;

      // HEADLIGHTS BEAMS (Night/Dusk)
      if (light < 0.7) { 
          const horizonY = height / 2;
          const beamTargetY = horizonY + 10; 
          // FIX: Emission point relative to car top
          const lightY = carY + h * 0.65; 
          const leftLightX = carX - w * 0.42;
          const rightLightX = carX + w * 0.42;

          const intensity = (1.0 - light) * 0.5;

          ctx.save();
          ctx.globalCompositeOperation = 'screen'; 
          
          // Beam Gradient
          const grad = ctx.createLinearGradient(0, lightY, 0, beamTargetY);
          grad.addColorStop(0, `rgba(255, 255, 200, ${intensity})`); 
          grad.addColorStop(0.8, `rgba(255, 255, 200, ${intensity * 0.2})`); 
          grad.addColorStop(1, `rgba(255, 255, 200, 0)`);
          
          ctx.fillStyle = grad;

          // Combined Beam approach for center convergence
          // Left Beam
          ctx.beginPath();
          ctx.moveTo(leftLightX, lightY); 
          ctx.lineTo(centerX - w * 1.5, beamTargetY); // Spread Far Left
          ctx.lineTo(centerX + w * 0.2, beamTargetY); // Spread to Center Right (Overlap)
          ctx.fill();

          // Right Beam
          ctx.beginPath();
          ctx.moveTo(rightLightX, lightY);
          ctx.lineTo(centerX - w * 0.2, beamTargetY); // Spread to Center Left (Overlap)
          ctx.lineTo(centerX + w * 1.5, beamTargetY); // Spread Far Right
          ctx.fill();

          ctx.restore();
      }

      ctx.save();
      // Translate to the calculated position
      
      ctx.translate(carX, carY + h); // Anchor at bottom-center
      ctx.translate(-(w/2), -h); // Move back to top-left of sprite relative to anchor

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath(); ctx.ellipse(w/2, h - 5, w/2, 10, 0, 0, Math.PI * 2); ctx.fill();

      const dim = Math.max(0.1, light);
      
      // Use local coords (0,0 is top-left of car sprite now)
      // Tyres
      ctx.fillStyle = this.adjustBrightness('#111111', dim);
      ctx.fillRect(10, h - 25, 40, 25); 
      ctx.fillRect(w - 50, h - 25, 40, 25); 

      // Body (Red Ferrari)
      const ferrariRed = this.adjustBrightness('#cc0000', dim);
      ctx.fillStyle = ferrariRed; 
      ctx.fillRect(20, h - 30, w - 40, 25);
      
      // Exhausts
      ctx.fillStyle = '#222'; 
      ctx.beginPath(); ctx.arc(45, h - 15, 6, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(60, h - 15, 6, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(w - 60, h - 15, 6, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(w - 45, h - 15, 6, 0, Math.PI*2); ctx.fill();

      // Flame (Bright)
      if (speedPercent > 0.9) {
           ctx.fillStyle = `rgba(255, ${Math.floor(Math.random()*200)}, 0, 0.8)`;
           const flameSize = Math.random() * 20;
           ctx.beginPath(); ctx.arc(52, h - 15, flameSize, 0, Math.PI*2); ctx.fill();
           ctx.beginPath(); ctx.arc(w - 52, h - 15, flameSize, 0, Math.PI*2); ctx.fill();
      }

      // Deck
      const gradBody = ctx.createLinearGradient(0, 0, w, h);
      gradBody.addColorStop(0, this.adjustBrightness('#cc0000', dim));
      gradBody.addColorStop(0.5, this.adjustBrightness('#ff0000', dim));
      gradBody.addColorStop(1, this.adjustBrightness('#990000', dim));
      ctx.fillStyle = gradBody;

      ctx.beginPath();
      ctx.moveTo(0, h - 30); 
      ctx.lineTo(0, h * 0.4); 
      ctx.lineTo(w * 0.15, h * 0.3); 
      ctx.lineTo(w * 0.85, h * 0.3); 
      ctx.lineTo(w, h * 0.4); 
      ctx.lineTo(w, h - 30); 
      ctx.closePath();
      ctx.fill();

      // Cabin
      ctx.fillStyle = this.adjustBrightness('#b30000', dim); 
      ctx.beginPath();
      ctx.moveTo(w * 0.15, h * 0.3);
      ctx.lineTo(w * 0.25, 5); 
      ctx.lineTo(w * 0.75, 5); 
      ctx.lineTo(w * 0.85, h * 0.3);
      ctx.fill();
      
      // Window
      ctx.fillStyle = this.adjustBrightness('#050505', dim);
      ctx.beginPath();
      ctx.moveTo(w * 0.20, h * 0.28);
      ctx.lineTo(w * 0.28, 10);
      ctx.lineTo(w * 0.72, 10);
      ctx.lineTo(w * 0.80, h * 0.28);
      ctx.fill();

      // Grille
      ctx.fillStyle = '#111';
      const grillY = h * 0.45;
      const grillH = h * 0.25;
      ctx.fillRect(10, grillY, w - 20, grillH);

      // Lights (Taillights) - Self lit
      ctx.fillStyle = '#cc0000'; 
      ctx.fillRect(20, grillY + 5, w * 0.25, grillH - 10);
      ctx.fillRect(w - 20 - w * 0.25, grillY + 5, w * 0.25, grillH - 10);
      
      if (turn !== 0 || speedPercent < 0.9) ctx.fillStyle = '#ff5555'; 
      else ctx.fillStyle = '#ff3333';
      
      ctx.fillRect(25, grillY + 10, w * 0.20, grillH - 20);
      ctx.fillRect(w - 25 - w * 0.20, grillY + 10, w * 0.20, grillH - 20);

      ctx.fillStyle = '#111'; 
      for(let i=1; i<4; i++) {
          ctx.fillRect(10, grillY + (i * (grillH/4)), w - 20, 2); 
      }
      
      this.drawHead(ctx, w * 0.35, h * 0.25, '#331100', true);
      this.drawHead(ctx, w * 0.65, h * 0.25, '#ffeeaa', false); 

      ctx.restore();
  }

  public render(opts: RenderContext) {
    const { ctx, width, height, segments, baseSegment, playerX, playerZ, cameraHeight, cameraDepth, roadWidth, cars, background, curve, stage } = opts;

    ctx.clearRect(0, 0, width, height);
    
    // Draw Background and get current ambient light level (0.0 - 1.0)
    // Pass stage
    const ambientLight = this.drawBackground(ctx, width, height, background, stage);

    let maxy = height;
    let x = 0;
    const cameraZ = playerZ - CAMERA_DISTANCE_TO_PLAYER;
    let dx = -(baseSegment.curve * (playerZ % SEGMENT_LENGTH)/200); 

    for(let n = 0; n < segments.length; n++) {
        const segment = segments[n];
        segment.clip = maxy;

        segment.p1Screen = this.project(
            {x: segment.p1.x - x - playerX * roadWidth, y: segment.p1.y, z: segment.p1.z}, 
            0, cameraHeight, cameraZ, cameraDepth, width, height, roadWidth
        );
        segment.p2Screen = this.project(
            {x: segment.p2.x - x - dx - playerX * roadWidth, y: segment.p2.y, z: segment.p2.z}, 
            0, cameraHeight, cameraZ, cameraDepth, width, height, roadWidth
        );

        x += dx;
        dx += segment.curve;

        if (segment.p1Screen.y <= segment.p2Screen.y || segment.p2Screen.y >= maxy) continue;

        // Apply brightness to colors
        // Stage 5 has custom colors in segment, ambientLight still applies
        const grassColor = this.adjustBrightness(segment.color.grass, ambientLight);
        const roadColor = this.adjustBrightness(segment.color.road, ambientLight);
        const rumbleColor = this.adjustBrightness(segment.color.rumble, ambientLight);
        const laneColor = this.adjustBrightness(segment.color.lane, ambientLight);

        // Stage 5 water effect is handled by drawBackground, so grass can be transparent or dark
        // If grass is transparent, we see the background (water)
        if (stage === 5 && segment.color.grass === '#000000') {
            // Draw nothing for grass, letting background show through
        } else {
            this.drawPolygon(ctx, 0, segment.p2Screen.y, width, segment.p2Screen.y, width, segment.p1Screen.y, 0, segment.p1Screen.y, grassColor);
        }

        this.drawPolygon(ctx, segment.p1Screen.x, segment.p1Screen.y, segment.p1Screen.x + segment.p1Screen.w, segment.p1Screen.y, segment.p2Screen.x + segment.p2Screen.w, segment.p2Screen.y, segment.p2Screen.x, segment.p2Screen.y, roadColor);

        const r1 = segment.p1Screen.w / 6;
        const r2 = segment.p2Screen.w / 6;
        this.drawPolygon(ctx, segment.p1Screen.x - r1, segment.p1Screen.y, segment.p1Screen.x, segment.p1Screen.y, segment.p2Screen.x, segment.p2Screen.y, segment.p2Screen.x - r2, segment.p2Screen.y, rumbleColor);
        this.drawPolygon(ctx, segment.p1Screen.x + segment.p1Screen.w, segment.p1Screen.y, segment.p1Screen.x + segment.p1Screen.w + r1, segment.p1Screen.y, segment.p2Screen.x + segment.p2Screen.w + r2, segment.p2Screen.y, segment.p2Screen.x + segment.p2Screen.w, segment.p2Screen.y, rumbleColor);

        if (segment.color.lane) {
            const laneW1 = segment.p1Screen.w / 32;
            const laneW2 = segment.p2Screen.w / 32;
            const laneX1 = segment.p1Screen.x + segment.p1Screen.w / 3;
            const laneX2 = segment.p2Screen.x + segment.p2Screen.w / 3;
             this.drawPolygon(ctx, laneX1, segment.p1Screen.y, laneX1 + laneW1, segment.p1Screen.y, laneX2 + laneW2, segment.p2Screen.y, laneX2, segment.p2Screen.y, laneColor);
             const laneX1b = segment.p1Screen.x + segment.p1Screen.w * 0.66;
             const laneX2b = segment.p2Screen.x + segment.p2Screen.w * 0.66;
             this.drawPolygon(ctx, laneX1b, segment.p1Screen.y, laneX1b + laneW1, segment.p1Screen.y, laneX2b + laneW2, segment.p2Screen.y, laneX2b, segment.p2Screen.y, laneColor);
        }

        maxy = segment.p2Screen.y;
    }

    // Draw Sprites
    for(let n = segments.length - 1; n > 0 ; n--) {
        const segment = segments[n];
        const scale = segment.p1Screen.scale;
        
        for(let i = 0; i < segment.sprites.length; i++) {
            const sprite = segment.sprites[i];
            const destX = segment.p1Screen.x + (scale * sprite.offset * roadWidth * width / 2);
            // Pass absolute segment.index + i as seed for stability
            this.drawSprite(ctx, width, height, width/1000, roadWidth, sprite.type, scale, destX, segment.p1Screen.y, segment.clip, ambientLight, segment.index + i, sprite.offset);
        }

        for(let i = 0; i < segment.cars.length; i++) {
             const car = segment.cars[i];
             const destX = segment.p1Screen.x + (scale * car.offset * roadWidth * width / 2);
             const spriteType = car.sprite === 'NPC' ? SpriteType.CAR_NPC : car.sprite;
             this.drawSprite(ctx, width, height, width/1000, roadWidth, spriteType, scale, destX, segment.p1Screen.y, segment.clip, ambientLight, segment.index + i, car.offset);
        }
    }

    const speedPercent = opts.cars && opts.cars.length > 0 ? (opts.cars[0].speed / 12000) : 0;
    this.drawPlayerCar(ctx, width, height, width/1000, roadWidth, speedPercent, curve * 2, ambientLight); 
  }
}
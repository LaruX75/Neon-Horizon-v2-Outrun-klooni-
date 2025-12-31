
import { RenderContext, Segment, SpriteType, Point, ScreenPoint, Particle } from '../types';
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

  private parseRgbString(rgbStr: string): [number, number, number] {
      const match = rgbStr.match(/\d+/g);
      if (!match || match.length < 3) return [255, 255, 255];
      return [parseInt(match[0]), parseInt(match[1]), parseInt(match[2])];
  }

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
      LAKESIDE: COLORS.SKY.LAKESIDE,
      FINAL_CITY: COLORS.SKY.FINAL_CITY
  };

  private getEnvironmentColors(time: number, stage: number) {
      if (stage === 5) {
          const t = Math.sin(Date.now() / 2000) * 0.1 + 0.5;
          return {
              top: this.formatRgb(this.SKY_COLORS.LAKESIDE.top),
              bottom: this.formatRgb(this.SKY_COLORS.LAKESIDE.bottom),
              terrain: this.formatRgb(this.SKY_COLORS.LAKESIDE.terrain),
              cloud: this.formatRgb(this.SKY_COLORS.LAKESIDE.cloud),
              lightFactor: 0.8
          };
      }
      
      if (stage === 6) {
          const colors = this.SKY_COLORS.FINAL_CITY;
          const dim = Math.max(0.2, 1.0 - Math.abs(time - 0.5)*2); 
          return {
              top: this.formatRgb(colors.top),
              bottom: this.formatRgb(colors.bottom), 
              terrain: this.formatRgb(colors.terrain),
              cloud: this.formatRgb(colors.cloud),
              lightFactor: dim
          };
      }

      let c1, c2, t;
      let lightFactor = 1.0;

      const safeTime = Math.max(0, Math.min(1, time));

      if (safeTime < 0.25) { 
          t = safeTime / 0.25;
          c1 = this.SKY_COLORS.DAWN;
          c2 = this.SKY_COLORS.DAY;
          lightFactor = 0.4 + (0.6 * t);
      } else if (safeTime < 0.6) { 
          t = (safeTime - 0.25) / 0.35;
          c1 = this.SKY_COLORS.DAY;
          c2 = this.SKY_COLORS.DUSK;
          lightFactor = 1.0 - (0.3 * t);
      } else if (safeTime < 0.75) { 
          t = (safeTime - 0.6) / 0.15;
          c1 = this.SKY_COLORS.DUSK;
          c2 = this.SKY_COLORS.NIGHT;
          lightFactor = 0.7 - (0.6 * t); 
      } else { 
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
      const grad = ctx.createLinearGradient(cx, cy - h/2, cx, cy + h/2);
      grad.addColorStop(0, `rgba(${Math.min(255, r+50)}, ${Math.min(255, g+50)}, ${Math.min(255, b+50)}, 0.9)`);
      grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0.7)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(cx, cy, w/2, h/2, 0, 0, Math.PI * 2);
      ctx.ellipse(cx - w*0.3, cy + h*0.2, w*0.3, h*0.4, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + w*0.3, cy + h*0.2, w*0.3, h*0.4, 0, 0, Math.PI * 2);
      ctx.ellipse(cx, cy - h*0.3, w*0.4, h*0.4, 0, 0, Math.PI * 2);
      ctx.fill();
  }

  private drawSun(ctx: CanvasRenderingContext2D, width: number, horizonY: number, skyOffset: number, time: number, stage: number) {
      if (stage !== 5 && stage !== 6 && (time > 0.7 && time < 0.9)) return; 
      let sunHeight = -0.2; 
      if (stage === 5 || stage === 6) {
          sunHeight = 0.2; 
          if (stage === 6 && time > 0.6) sunHeight = 0.2 - ((time - 0.6) * 2); 
      } else {
          if (time < 0.25) sunHeight = time / 0.25; 
          else if (time < 0.6) sunHeight = 1.0 - ((time - 0.25) / 0.35); 
          else if (time < 0.75) sunHeight = 0; 
      }
      const sunY = horizonY + 50 - (sunHeight * 400); 
      const sunX = (width / 2) - (skyOffset * 0.05); 
      const isSunset = stage === 5 || stage === 6 || (time > 0.5 && time < 0.75);
      const r = isSunset ? 255 : 255;
      const g = isSunset ? 50 : 255; 
      const b = isSunset ? 100 : 200; 
      const glow = ctx.createRadialGradient(sunX, sunY, 40, sunX, sunY, 200);
      glow.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.6)`);
      glow.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(sunX, sunY, 200, 0, Math.PI*2); ctx.fill();
      const grad = ctx.createLinearGradient(sunX, sunY - 70, sunX, sunY + 70);
      grad.addColorStop(0, `rgb(255, 255, 200)`);
      grad.addColorStop(1, `rgb(${r}, ${g}, ${b})`);
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(sunX, sunY, 70, 0, Math.PI*2); ctx.fill();
      if (stage === 5 || stage === 6) {
          ctx.fillStyle = 'rgba(80, 0, 100, 0.4)';
          for(let i=0; i<8; i++) {
              ctx.fillRect(sunX - 70, sunY + 10 + (i*8), 140, 4);
          }
      }
  }

  private drawTerrain(ctx: CanvasRenderingContext2D, width: number, height: number, horizonY: number, skyOffset: number, color: string, stage: number) {
      const terrainSpeed = 0.3; 
      const offset = skyOffset * terrainSpeed;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, horizonY);
      const centerX = width / 2;
      for (let x = 0; x <= width; x += 10) {
          const worldX = x + offset;
          let elevation = Math.sin(worldX * 0.003) * 60 + Math.sin(worldX * 0.01) * 30 + Math.sin(worldX * 0.02) * 10;
          const y = horizonY - Math.abs(elevation) - 5; 
          ctx.lineTo(x, y);
      }
      ctx.lineTo(width, height); 
      ctx.lineTo(0, height);
      ctx.closePath();
      ctx.fill();
  }

  private drawCitySilhouette(ctx: CanvasRenderingContext2D, width: number, height: number, horizonY: number, skyOffset: number) {
      const offset = skyOffset * 0.1;
      ctx.fillStyle = '#050510'; 
      ctx.beginPath();
      ctx.moveTo(0, height);
      ctx.lineTo(0, horizonY);
      const blockWidth = 60;
      const numBlocks = Math.ceil(width / blockWidth) + 2;
      for(let i=0; i<numBlocks; i++) {
           const x = (i * blockWidth) - (offset % blockWidth);
           const seed = Math.floor(offset / blockWidth) + i;
           const h = 50 + this.hash(seed) * 150; 
           ctx.lineTo(x, horizonY - h);
           ctx.lineTo(x + blockWidth, horizonY - h);
      }
      ctx.lineTo(width, horizonY);
      ctx.lineTo(width, height);
      ctx.fill();
      ctx.fillStyle = '#221133'; 
      for(let i=0; i<numBlocks; i++) {
        const x = (i * blockWidth) - (offset % blockWidth);
        const seed = Math.floor(offset / blockWidth) + i;
        const h = 50 + this.hash(seed) * 150;
        if (this.hash(seed + 10) > 0.3) {
            const wins = 4 + Math.floor(this.hash(seed+1) * 5);
            for(let w=0; w<wins; w++) {
                if (this.hash(seed * w) > 0.5) {
                    ctx.fillRect(x + 10, horizonY - h + 10 + (w*15), 10, 10);
                    ctx.fillRect(x + 30, horizonY - h + 10 + (w*15), 10, 10);
                }
            }
        }
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

  private drawFireworks(ctx: CanvasRenderingContext2D, fireworks: Particle[]) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for(const p of fireworks) {
          ctx.globalAlpha = p.alpha;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
      }
      ctx.restore();
  }

  private drawBackground(ctx: CanvasRenderingContext2D, width: number, height: number, background: any, stage: number) {
    const { skyOffset, timeOfDay } = background;
    const horizonY = height / 2;
    const env = this.getEnvironmentColors(timeOfDay, stage);

    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, env.top); 
    gradient.addColorStop(1, env.bottom); 
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    this.drawSun(ctx, width, horizonY, skyOffset, timeOfDay, stage);

    this.drawCloudLayer(ctx, width, horizonY, skyOffset, 0.05, 120, env.cloud, 0); 
    this.drawCloudLayer(ctx, width, horizonY, skyOffset, 0.10, 80, env.cloud, 1); 
    this.drawCloudLayer(ctx, width, horizonY, skyOffset, 0.20, 40, env.cloud, 2); 

    if (stage === 5 || stage === 6 || timeOfDay > 0.6) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        for(let i=0; i<80; i++) {
            const x = (this.hash(i) * 2000 + skyOffset * 0.02) % width;
            const y = this.hash(i+100) * (height/2);
            const size = this.hash(i+200) * 2.5;
            ctx.fillRect(x, y, size, size);
        }
    }

    if (stage === 5) {
        // Stage 5 background is special Synthwave sky/water
        // Water horizon line already handled in render() but we need sky here
        // The getEnvironmentColors handles the colors
    } else if (stage === 6 || stage === 3) { // Stage 3 uses City Background too
        this.drawCitySilhouette(ctx, width, height, horizonY, skyOffset);
        ctx.fillStyle = env.terrain;
        ctx.fillRect(0, horizonY, width, height - horizonY);
    } else {
        this.drawTerrain(ctx, width, height, horizonY, skyOffset, env.terrain, stage); 
        ctx.fillStyle = env.terrain; 
        ctx.fillRect(0, horizonY, width, 40);
    }

    return env.lightFactor;
  }

  private drawCheckpoint(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
      const gradPillar = ctx.createLinearGradient(x - w/2, y - h, x - w/2 + w*0.05, y - h);
      gradPillar.addColorStop(0, '#555');
      gradPillar.addColorStop(0.5, '#fff');
      gradPillar.addColorStop(1, '#888');
      ctx.fillStyle = gradPillar;
      ctx.fillRect(x - w/2, y - h, w * 0.05, h); 
      ctx.fillRect(x + w/2 - w*0.05, y - h, w * 0.05, h); 
      const bannerH = h * 0.25;
      const bannerY = y - h + bannerH/2;
      ctx.fillStyle = '#000';
      ctx.fillRect(x - w/2, y - h, w, bannerH);
      const time = Date.now() / 100;
      const strobe = Math.sin(time) > 0 ? '#ffff00' : '#ff0000';
      ctx.strokeStyle = strobe;
      ctx.lineWidth = w * 0.015;
      ctx.strokeRect(x - w/2, y - h, w, bannerH);
      ctx.fillStyle = '#ff0000';
      ctx.font = `900 ${Math.ceil(bannerH * 0.8)}px Orbitron`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = '#ff0000';
      ctx.shadowBlur = 20;
      ctx.fillText("CHECKPOINT", x, bannerY);
      ctx.shadowBlur = 0;
      const lightColor = Math.floor(time / 2) % 2 === 0 ? '#00ff00' : '#ffff00';
      const r = bannerH * 0.3;
      ctx.fillStyle = lightColor;
      ctx.shadowColor = lightColor;
      ctx.shadowBlur = 15;
      ctx.beginPath(); ctx.arc(x - w * 0.45, bannerY, r, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + w * 0.45, bannerY, r, 0, Math.PI*2); ctx.fill();
      ctx.shadowBlur = 0;
  }

  private drawNPCCar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, light: number, seed: number) {
      const dim = Math.max(0.1, light);
      const colors = ['#d32f2f', '#0288d1', '#fbc02d', '#388e3c', '#7b1fa2', '#e0e0e0', '#1a1a1a'];
      const rnd = this.pseudoRandom(seed * 123);
      const colorIndex = Math.floor(rnd * 100) % colors.length;
      const baseColor = colors[colorIndex];
      const mainColor = this.adjustBrightness(baseColor, dim);
      const highlightColor = this.adjustBrightness(baseColor, dim + 0.3);
      const darkColor = this.adjustBrightness(baseColor, dim - 0.2);
      const isConvertible = (Math.floor(rnd * 100) % 3) === 0; 
      const isWide = (Math.floor(rnd * 100) % 2) === 0;
      const widthMod = isWide ? 1.0 : 0.9;
      const effectiveW = w * widthMod;
      const offsetX = x + (w - effectiveW) / 2;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.beginPath(); 
      ctx.ellipse(x + w/2, y + h*0.9, effectiveW/1.8, h*0.15, 0, 0, Math.PI*2);
      ctx.fill();
      ctx.fillStyle = this.adjustBrightness('#111111', dim);
      ctx.fillRect(offsetX + effectiveW*0.05, y + h*0.75, effectiveW*0.18, h*0.25); 
      ctx.fillRect(offsetX + effectiveW*0.77, y + h*0.75, effectiveW*0.18, h*0.25); 
      ctx.fillStyle = darkColor;
      ctx.fillRect(offsetX + effectiveW*0.05, y + h*0.8, effectiveW*0.9, h*0.15);
      ctx.fillStyle = mainColor;
      ctx.beginPath();
      ctx.moveTo(offsetX + effectiveW*0.05, y + h*0.8); 
      ctx.lineTo(offsetX + effectiveW*0.05, y + h*0.45); 
      ctx.lineTo(offsetX + effectiveW*0.95, y + h*0.45); 
      ctx.lineTo(offsetX + effectiveW*0.95, y + h*0.8); 
      ctx.fill();
      if (isWide) {
          ctx.fillStyle = this.adjustBrightness('#000000', dim);
          const ventH = h*0.03;
          for(let i=0; i<3; i++) {
              ctx.fillRect(offsetX + effectiveW*0.05, y + h*0.5 + (i*ventH*2), effectiveW*0.15, ventH);
              ctx.fillRect(offsetX + effectiveW*0.8, y + h*0.5 + (i*ventH*2), effectiveW*0.15, ventH);
          }
      }
      ctx.fillStyle = mainColor;
      ctx.fillRect(offsetX + effectiveW*0.1, y + h*0.35, effectiveW*0.8, h*0.2);
      if (isConvertible) {
          ctx.fillStyle = this.adjustBrightness('#3e2723', dim); 
          ctx.fillRect(offsetX + effectiveW*0.2, y + h*0.25, effectiveW*0.6, h*0.2);
          ctx.fillStyle = '#222';
          ctx.beginPath(); ctx.arc(offsetX + effectiveW*0.35, y + h*0.2, effectiveW*0.05, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = this.adjustBrightness('#111', dim);
          ctx.fillRect(offsetX + effectiveW*0.2, y + h*0.25, effectiveW*0.6, h*0.05);
      } else {
          ctx.fillStyle = highlightColor;
          ctx.beginPath();
          ctx.moveTo(offsetX + effectiveW*0.2, y + h*0.35); 
          ctx.lineTo(offsetX + effectiveW*0.25, y + h*0.05); 
          ctx.lineTo(offsetX + effectiveW*0.75, y + h*0.05); 
          ctx.lineTo(offsetX + effectiveW*0.8, y + h*0.35); 
          ctx.fill();
          const winGrad = ctx.createLinearGradient(0, y + h*0.05, 0, y + h*0.35);
          winGrad.addColorStop(0, this.adjustBrightness('#111', dim));
          winGrad.addColorStop(0.5, this.adjustBrightness('#455a64', dim));
          winGrad.addColorStop(1, this.adjustBrightness('#000', dim));
          ctx.fillStyle = winGrad;
          ctx.beginPath();
          ctx.moveTo(offsetX + effectiveW*0.24, y + h*0.32);
          ctx.lineTo(offsetX + effectiveW*0.28, y + h*0.08);
          ctx.lineTo(offsetX + effectiveW*0.72, y + h*0.08);
          ctx.lineTo(offsetX + effectiveW*0.76, y + h*0.32);
          ctx.fill();
      }
      const lightY = y + h * 0.45;
      const lightH = h * 0.15;
      ctx.fillStyle = '#000';
      ctx.fillRect(offsetX + effectiveW*0.1, lightY, effectiveW*0.8, lightH);
      ctx.fillStyle = '#d50000';
      ctx.shadowColor = '#f44336';
      ctx.shadowBlur = (light < 0.5) ? 10 : 0;
      const lightStyle = Math.floor(rnd * 100) % 3;
      if (lightStyle === 0) {
          ctx.fillRect(offsetX + effectiveW*0.15, lightY + lightH*0.2, effectiveW*0.7, lightH*0.6);
      } else if (lightStyle === 1) {
          const r = lightH * 0.4;
          const cy = lightY + lightH/2;
          ctx.beginPath(); ctx.arc(offsetX + effectiveW*0.25, cy, r, 0, Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.arc(offsetX + effectiveW*0.35, cy, r, 0, Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.arc(offsetX + effectiveW*0.65, cy, r, 0, Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.arc(offsetX + effectiveW*0.75, cy, r, 0, Math.PI*2); ctx.fill();
      } else {
          ctx.fillRect(offsetX + effectiveW*0.12, lightY + lightH*0.1, effectiveW*0.25, lightH*0.8);
          ctx.fillRect(offsetX + effectiveW*0.63, lightY + lightH*0.1, effectiveW*0.25, lightH*0.8);
      }
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffeb3b';
      ctx.fillRect(offsetX + effectiveW*0.42, lightY + lightH*0.2, effectiveW*0.16, lightH*0.6);
      ctx.fillStyle = '#222';
      const exY = y + h*0.85;
      ctx.beginPath(); ctx.arc(offsetX + effectiveW*0.2, exY, effectiveW*0.04, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(offsetX + effectiveW*0.8, exY, effectiveW*0.04, 0, Math.PI*2); ctx.fill();
  }

  private drawSprite(ctx: CanvasRenderingContext2D, width: number, height: number, resolution: number, roadWidth: number, sprite: SpriteType | string, scale: number, destX: number, destY: number, clipY: number, light: number, seed: number, offset: number) {
    let worldW = 0;
    let worldH = 0;
    const spriteType = sprite as SpriteType;
    switch(spriteType) {
        case SpriteType.PALM_TREE: worldW = 1200; worldH = 1800; break;
        case SpriteType.SPRUCE: worldW = 1000; worldH = 2200; break;
        case SpriteType.PINE: worldW = 1100; worldH = 2000; break;
        case SpriteType.BILLBOARD_01: worldW = 1000; worldH = 600; break;
        case SpriteType.BILLBOARD_02: worldW = 5000; worldH = 6000; break; // Massive Rocks for Stage 2
        case SpriteType.CAR_NPC: worldW = 700; worldH = 350; break; 
        case SpriteType.SAND_DUNE: worldW = 2500; worldH = 700; break;
        case SpriteType.CACTUS: worldW = 300; worldH = 800; break;
        case SpriteType.STREETLIGHT: worldW = 100; worldH = 1800; break;
        case SpriteType.BUILDING: worldW = 2000; worldH = 3000; break; 
        case SpriteType.SKYSCRAPER: worldW = 2500; worldH = 5000; break; 
        case SpriteType.HOUSE: worldW = 1200; worldH = 1000; break; 
        case SpriteType.CHECKPOINT: worldW = 4000; worldH = 2000; break;
        case SpriteType.BUSH: worldW = 400; worldH = 300; break;
        case SpriteType.SIGN_LIMIT_80: worldW = 300; worldH = 600; break;
        case SpriteType.SIGN_PRIORITY: worldW = 300; worldH = 600; break;
        case SpriteType.TRAFFIC_LIGHT: worldW = 3000; worldH = 800; break;
        case SpriteType.SAILBOAT: worldW = 2000; worldH = 1500; break; // New
        default: worldW = 200; worldH = 200;
    }

    if (spriteType === SpriteType.PALM_TREE) {
        const scaleVar = 1 + (this.pseudoRandom(seed * 1.1) * 0.4 - 0.2);
        worldW *= scaleVar;
        worldH *= scaleVar;
        const widthVar = 1 + (this.pseudoRandom(seed * 2.2) * 0.4 - 0.2);
        worldW *= widthVar;
    }

    let buildingFloors = 3;
    let buildingColor = '#444';
    if (spriteType === SpriteType.BUILDING || spriteType === SpriteType.SKYSCRAPER || spriteType === SpriteType.HOUSE) {
        const rnd = this.pseudoRandom(Math.floor(seed)); 
        const greys = ['#A0A0A0', '#808080', '#505050'];
        const colorIdx = Math.floor(rnd * 100) % 3;
        buildingColor = greys[colorIdx];
        if (spriteType === SpriteType.HOUSE) {
            buildingFloors = 1;
            worldH = 1000;
            buildingColor = ['#dddddd', '#ccbbcc', '#aaaaaa'][colorIdx];
        } else if (spriteType === SpriteType.SKYSCRAPER) {
            buildingFloors = 10 + Math.floor(rnd * 10);
            worldH = 4000 + (buildingFloors * 150);
            buildingColor = ['#112233', '#111122', '#222233'][colorIdx];
        } else {
             buildingFloors = 1 + Math.floor(rnd * 6);
             worldH = 600 + (buildingFloors * 400); 
        }
    }

    const w = worldW * scale * (width / 2);
    const h = worldH * scale * (width / 2);
    const x = destX - (w / 2);
    const y = destY - h;

    if (w < 2 || h < 2) return; 
    if (spriteType !== SpriteType.TRAFFIC_LIGHT && destY < clipY) return;

    const clipHeight = clipY ? Math.max(0, (y + h) - clipY) : 0;
    if (clipHeight >= h) return; 

    ctx.save();
    
    if (clipHeight > 0) {
        ctx.beginPath();
        ctx.rect(x, y, w, h - clipHeight);
        ctx.clip();
    }

    if (spriteType === SpriteType.CHECKPOINT) {
        this.drawCheckpoint(ctx, destX, destY, w, h);
    } 
    else if (spriteType === SpriteType.CAR_NPC || sprite === 'CAR_NPC') {
        this.drawNPCCar(ctx, x, y, w, h, light, seed);
    } 
    else if (spriteType === SpriteType.PALM_TREE) {
        const trunk = this.adjustBrightness('#8B5A2B', light);
        const leaf = this.adjustBrightness('#009900', light);
        const stroke = this.adjustBrightness('#005500', light);
        ctx.fillStyle = trunk; 
        ctx.beginPath();
        const curveDir = this.pseudoRandom(seed * 3) > 0.5 ? 1 : -1;
        ctx.moveTo(x + w*0.42, y + h); 
        ctx.quadraticCurveTo(x + w*(0.5 + 0.1*curveDir), y + h*0.5, x + w*(0.48 + 0.1*curveDir), y + h*0.2);
        ctx.lineTo(x + w*(0.52 + 0.1*curveDir), y + h*0.2);
        ctx.quadraticCurveTo(x + w*(0.55 + 0.1*curveDir), y + h*0.5, x + w*0.58, y + h); 
        ctx.fill();
        ctx.fillStyle = leaf;
        ctx.strokeStyle = stroke;
        ctx.lineWidth = w * 0.01;
        const cx = x + w*(0.5 + 0.1*curveDir);
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
    else if (spriteType === SpriteType.BILLBOARD_02) {
        // Massive ROCKS for Stage 2 - Updated for texture and flatness
        // Gradient fill for rock texture
        const rockColor = this.adjustBrightness('#8b5a2b', light);
        const rockColorDark = this.adjustBrightness('#5d4037', light);
        
        const grad = ctx.createLinearGradient(x, y, x, y + h);
        grad.addColorStop(0, this.adjustBrightness('#a17d5a', light)); // Lighter top
        grad.addColorStop(0.3, rockColor);
        grad.addColorStop(1, rockColorDark); // Dark base

        ctx.fillStyle = grad;
        ctx.beginPath();
        // Flat top mesa/butte shape
        ctx.moveTo(x, y + h); // Bottom Left
        ctx.lineTo(x + w*0.1, y + h*0.3); // Left slope
        ctx.lineTo(x + w*0.2, y + h*0.1); // Top Left edge
        // Jagged flat top
        ctx.lineTo(x + w*0.4, y + h*0.12);
        ctx.lineTo(x + w*0.6, y + h*0.08);
        ctx.lineTo(x + w*0.8, y + h*0.1); // Top Right edge
        ctx.lineTo(x + w*0.9, y + h*0.3); // Right slope
        ctx.lineTo(x + w, y + h); // Bottom Right
        ctx.fill();
        
        // Horizontal Sediment Layers
        ctx.fillStyle = this.adjustBrightness('#4e342e', light * 0.8);
        for(let i=0; i<5; i++) {
            const ly = y + h*0.3 + (i * h * 0.12);
            // Draw rough lines
            ctx.fillRect(x + w*0.15, ly, w*0.7, h*0.02);
        }
    }
    else if (spriteType === SpriteType.SAILBOAT) {
        // Hull
        ctx.fillStyle = this.adjustBrightness('#ffffff', light);
        ctx.beginPath();
        ctx.moveTo(x + w*0.2, y + h);
        ctx.lineTo(x + w*0.8, y + h);
        ctx.lineTo(x + w*0.9, y + h*0.9);
        ctx.lineTo(x + w*0.1, y + h*0.9);
        ctx.fill();
        // Mast
        ctx.fillStyle = '#333';
        ctx.fillRect(x + w*0.48, y + h*0.3, w*0.04, h*0.6);
        // Sails
        ctx.fillStyle = '#eee';
        ctx.beginPath(); // Main sail
        ctx.moveTo(x + w*0.5, y + h*0.35);
        ctx.lineTo(x + w*0.5, y + h*0.85);
        ctx.lineTo(x + w*0.8, y + h*0.85);
        ctx.fill();
        ctx.beginPath(); // Front sail
        ctx.moveTo(x + w*0.48, y + h*0.38);
        ctx.lineTo(x + w*0.48, y + h*0.85);
        ctx.lineTo(x + w*0.2, y + h*0.85);
        ctx.fill();
    }
    else if (spriteType === SpriteType.BUSH) {
        const green = this.adjustBrightness('#228b22', light);
        ctx.fillStyle = green;
        ctx.beginPath(); ctx.arc(x + w*0.2, y + h*0.7, w*0.3, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(x + w*0.5, y + h*0.6, w*0.4, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(x + w*0.8, y + h*0.7, w*0.3, 0, Math.PI*2); ctx.fill();
    }
    else if (spriteType === SpriteType.SIGN_LIMIT_80) {
        ctx.fillStyle = '#555';
        ctx.fillRect(x + w*0.45, y + h*0.3, w*0.1, h*0.7);
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = '#d00';
        ctx.lineWidth = w * 0.05;
        ctx.beginPath();
        ctx.arc(x + w*0.5, y + h*0.3, w*0.3, 0, Math.PI*2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `bold ${Math.floor(w*0.25)}px sans-serif`;
        ctx.fillText("80", x + w*0.5, y + h*0.3);
    }
    else if (spriteType === SpriteType.SIGN_PRIORITY) {
        ctx.fillStyle = '#555';
        ctx.fillRect(x + w*0.45, y + h*0.3, w*0.1, h*0.7);
        ctx.fillStyle = '#fb0';
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = w * 0.03;
        ctx.beginPath();
        ctx.moveTo(x + w*0.5, y); 
        ctx.lineTo(x + w*0.8, y + h*0.3); 
        ctx.lineTo(x + w*0.5, y + h*0.6); 
        ctx.lineTo(x + w*0.2, y + h*0.3); 
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }
    else if (spriteType === SpriteType.TRAFFIC_LIGHT) {
        const poleW = w * 0.05;
        ctx.fillStyle = '#333';
        ctx.fillRect(x + w*0.1, y, poleW, h);
        ctx.fillRect(x + w*0.9, y, poleW, h);
        ctx.fillRect(x + w*0.1, y + h*0.1, w*0.8, h*0.1);
        const lightBoxW = w * 0.08;
        const lightBoxH = h * 0.25;
        const drawLight = (lx: number) => {
            ctx.fillStyle = '#111';
            ctx.fillRect(lx, y + h*0.15, lightBoxW, lightBoxH);
            const radius = lightBoxW * 0.3;
            const cx = lx + lightBoxW/2;
            const time = Date.now() / 1000;
            const state = Math.floor(time) % 2; 
            ctx.fillStyle = state === 0 ? '#500' : '#f00'; 
            ctx.beginPath(); ctx.arc(cx, y + h*0.15 + lightBoxH*0.2, radius, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#550'; 
            ctx.beginPath(); ctx.arc(cx, y + h*0.15 + lightBoxH*0.5, radius, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = state === 1 ? '#030' : '#0f0'; 
            ctx.beginPath(); ctx.arc(cx, y + h*0.15 + lightBoxH*0.8, radius, 0, Math.PI*2); ctx.fill();
        };
        drawLight(x + w*0.3);
        drawLight(x + w*0.5);
        drawLight(x + w*0.7);
    }
    else if (spriteType === SpriteType.SPRUCE) {
        const dkGreen = this.adjustBrightness('#003311', light);
        const mdGreen = this.adjustBrightness('#004411', light);
        ctx.fillStyle = this.adjustBrightness('#3d2817', light); 
        ctx.fillRect(x + w*0.45, y + h*0.8, w*0.1, h*0.2);
        ctx.fillStyle = dkGreen;
        ctx.beginPath(); ctx.moveTo(x, y + h*0.9); ctx.lineTo(x + w/2, y + h*0.3); ctx.lineTo(x + w, y + h*0.9); ctx.fill();
        ctx.fillStyle = mdGreen;
        ctx.beginPath(); ctx.moveTo(x + w*0.1, y + h*0.6); ctx.lineTo(x + w/2, y + h*0.1); ctx.lineTo(x + w*0.9, y + h*0.6); ctx.fill();
        ctx.fillStyle = this.adjustBrightness('#005522', light);
        ctx.beginPath(); ctx.moveTo(x + w*0.2, y + h*0.3); ctx.lineTo(x + w/2, y); ctx.lineTo(x + w*0.8, y + h*0.3); ctx.fill();
    }
    else if (spriteType === SpriteType.PINE) {
        ctx.fillStyle = this.adjustBrightness('#5c4033', light); 
        ctx.fillRect(x + w*0.45, y + h*0.3, w*0.1, h*0.7);
        ctx.fillStyle = this.adjustBrightness('#225511', light);
        ctx.beginPath();
        ctx.ellipse(x + w*0.5, y + h*0.3, w*0.4, h*0.3, 0, 0, Math.PI*2);
        ctx.fill();
        ctx.fillStyle = this.adjustBrightness('#336622', light);
        ctx.beginPath();
        ctx.ellipse(x + w*0.5, y + h*0.25, w*0.3, h*0.2, 0, 0, Math.PI*2);
        ctx.fill();
    }
    else if (spriteType === SpriteType.STREETLIGHT) {
        ctx.fillStyle = this.adjustBrightness('#555', light);
        ctx.fillRect(x + w*0.45, y, w*0.1, h); 
        ctx.beginPath();
        ctx.moveTo(x + w*0.5, y + h*0.1);
        const armEndX = offset < 0 ? x + w : x;
        const lampX = offset < 0 ? x + w : x;
        ctx.lineTo(armEndX, y + h*0.05); 
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.shadowColor = '#fff';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(lampX, y + h*0.06, w*0.2, 0, Math.PI*2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }
    else if (spriteType === SpriteType.BUILDING || spriteType === SpriteType.SKYSCRAPER || spriteType === SpriteType.HOUSE) {
        const dimColor = this.adjustBrightness(buildingColor, light);
        ctx.fillStyle = dimColor;
        ctx.fillRect(x, y + h - 1, w, 20); 

        if (spriteType === SpriteType.HOUSE) {
            ctx.beginPath();
            ctx.moveTo(x, y + h*0.4);
            ctx.lineTo(x + w/2, y); 
            ctx.lineTo(x + w, y + h*0.4);
            ctx.lineTo(x + w, y + h);
            ctx.lineTo(x, y + h);
            ctx.fill();
            ctx.fillStyle = this.adjustBrightness('#332222', light);
            ctx.beginPath();
            ctx.moveTo(x - w*0.1, y + h*0.4);
            ctx.lineTo(x + w/2, y - h*0.1);
            ctx.lineTo(x + w + w*0.1, y + h*0.4);
            ctx.lineTo(x + w, y + h*0.4);
            ctx.lineTo(x + w/2, y);
            ctx.lineTo(x, y + h*0.4);
            ctx.fill();
        } else {
            ctx.fillRect(x, y, w, h);
        }
        const isNight = light < 0.3;
        if (spriteType === SpriteType.HOUSE) {
             ctx.fillStyle = isNight ? '#ffaa00' : '#222';
             if(isNight) { ctx.shadowColor = '#ffaa00'; ctx.shadowBlur = 5; }
             ctx.fillRect(x + w*0.2, y + h*0.5, w*0.2, h*0.2);
             ctx.fillRect(x + w*0.6, y + h*0.5, w*0.2, h*0.2);
             ctx.shadowBlur = 0;
        } else {
            const floors = buildingFloors; 
            const winW = w * 0.15;
            const winH = h * 0.08;
            for(let f=0; f<floors; f++) {
                const fy = y + h - (h*0.15) - ((f+1) * (h/floors/1.2));
                for(let wx=0; wx<3; wx++) {
                    const wxPos = x + w*0.15 + (wx * w*0.25);
                    const winRnd = this.pseudoRandom(seed * 100 + f * 10 + wx);
                    const isLit = isNight && (winRnd > (spriteType === SpriteType.SKYSCRAPER ? 0.2 : 0.4));
                    ctx.fillStyle = isLit ? (spriteType === SpriteType.SKYSCRAPER ? '#aaccff' : '#ffeb3b') : '#111';
                    if(isLit) {
                        ctx.shadowColor = ctx.fillStyle;
                        ctx.shadowBlur = 5;
                    }
                    ctx.fillRect(wxPos, fy, winW, winH);
                    ctx.shadowBlur = 0;
                }
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

  private drawPlayerCar(ctx: CanvasRenderingContext2D, width: number, height: number, resolution: number, roadWidth: number, speedPercent: number, curve: number, ambientLight: number, braking: boolean) {
      const destX = width / 2;
      const destY = height;
      const bounce = (Math.random() * speedPercent * 4) * ((Math.random() > 0.5) ? 1 : -1);
      const scale = resolution * 0.8; 
      
      const carW = 380 * scale; 
      const carH = 150 * scale;
      const carX = destX - (carW / 2);
      const carY = destY - carH + bounce;

      // HEADLIGHTS (If Night/Dusk)
      if (ambientLight < 0.5) {
           ctx.save();
           ctx.globalCompositeOperation = 'screen';
           const beamWidthStart = carW * 0.2;
           const beamWidthEnd = carW * 1.5;
           const beamH = height * 0.5; 
           
           const drawBeam = (bx: number) => {
               const grad = ctx.createLinearGradient(bx, carY + carH*0.6, bx, carY - beamH);
               grad.addColorStop(0, 'rgba(255, 255, 200, 0.6)');
               grad.addColorStop(1, 'rgba(255, 255, 200, 0)');
               
               ctx.fillStyle = grad;
               ctx.beginPath();
               ctx.moveTo(bx - beamWidthStart/2, carY + carH*0.6);
               ctx.lineTo(bx + beamWidthStart/2, carY + carH*0.6);
               ctx.lineTo(bx + beamWidthEnd, carY - beamH);
               ctx.lineTo(bx - beamWidthEnd, carY - beamH);
               ctx.fill();
           };
           drawBeam(carX + carW*0.2);
           drawBeam(carX + carW*0.8);
           ctx.restore();
      }

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.beginPath();
      ctx.ellipse(destX, destY - carH*0.1, carW * 0.45, carH * 0.15, 0, 0, Math.PI * 2);
      ctx.fill();

      // --- TIRES (Wide Rears) ---
      const tireW = carW * 0.22;
      const tireH = carH * 0.25;
      const tireColor = this.adjustBrightness('#111111', ambientLight);
      
      ctx.fillStyle = tireColor;
      ctx.fillRect(carX + carW*0.08, carY + carH*0.7, tireW, tireH); // Left
      ctx.fillRect(carX + carW*0.70, carY + carH*0.7, tireW, tireH); // Right
      
      // Tire Detail (Rim center)
      ctx.fillStyle = '#333';
      ctx.beginPath(); ctx.arc(carX + carW*0.19, carY + carH*0.82, tireW*0.3, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(carX + carW*0.81, carY + carH*0.82, tireW*0.3, 0, Math.PI*2); ctx.fill();

      // --- BODY COLORS ---
      const red = this.adjustBrightness('#e00000', ambientLight); // Ferrari Red
      const darkRed = this.adjustBrightness('#800000', ambientLight);
      const interior = this.adjustBrightness('#d2b48c', ambientLight); // Tan

      // --- REAR BUMPER ---
      ctx.fillStyle = '#111';
      ctx.fillRect(carX + carW*0.05, carY + carH*0.85, carW*0.9, carH*0.15);
      
      // Exhausts (Quad tips)
      ctx.fillStyle = '#555';
      const exY = carY + carH*0.9;
      ctx.beginPath(); ctx.arc(carX + carW*0.15, exY, carW*0.03, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(carX + carW*0.22, exY, carW*0.03, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(carX + carW*0.78, exY, carW*0.03, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(carX + carW*0.85, exY, carW*0.03, 0, Math.PI*2); ctx.fill();
      
      // --- MAIN BODY (Wedge Lower Block) ---
      const bodyGrad = ctx.createLinearGradient(carX, carY, carX + carW, carY);
      bodyGrad.addColorStop(0, darkRed);
      bodyGrad.addColorStop(0.2, red);
      bodyGrad.addColorStop(0.8, red);
      bodyGrad.addColorStop(1, darkRed);
      
      ctx.fillStyle = bodyGrad;
      // Lower block
      ctx.fillRect(carX, carY + carH*0.45, carW, carH*0.4);
      
      // Rear Deck / Engine Cover (Tapers in)
      ctx.beginPath();
      ctx.moveTo(carX, carY + carH*0.45);
      ctx.lineTo(carX + carW*0.15, carY + carH*0.15); // Deck Top Left
      ctx.lineTo(carX + carW*0.85, carY + carH*0.15); // Deck Top Right
      ctx.lineTo(carX + carW, carY + carH*0.45);
      ctx.fill();

      // --- WINDSHIELD (Drawn BEFORE Passengers so it is "in front" in physical Z space from chase cam perspective) ---
      // In Chase cam: Camera -> Rear -> Passengers -> Dashboard -> Windshield.
      // Painter's Algo (Back to Front): Windshield -> Dashboard -> Passengers -> Rear.
      ctx.save();
      
      const wsTopW = carW * 0.7;
      const wsBotW = carW * 0.82; // Matches Dash
      const wsH = carH * 0.35;
      const wsTopY = carY - wsH * 0.15; 
      const wsBotY = carY + carH*0.35; // Starts at dashboard level
      
      // Frame
      ctx.strokeStyle = '#888';
      ctx.lineWidth = 3;
      
      // Glass
      ctx.fillStyle = 'rgba(200, 240, 255, 0.4)'; 
      
      ctx.beginPath();
      ctx.moveTo(destX - wsTopW/2, wsTopY); // Top Left
      ctx.lineTo(destX + wsTopW/2, wsTopY); // Top Right
      ctx.lineTo(destX + wsBotW/2, wsBotY); // Bottom Right
      ctx.lineTo(destX - wsBotW/2, wsBotY); // Bottom Left
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      
      // Reflection
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(destX - wsTopW*0.3, wsTopY + wsH*0.2);
      ctx.lineTo(destX - wsBotW*0.2, wsBotY - wsH*0.2);
      ctx.stroke();
      
      ctx.restore();

      // --- DASHBOARD (Drawn BEFORE Passengers) ---
      ctx.fillStyle = '#111';
      // Covers bottom of passengers area
      ctx.beginPath();
      ctx.moveTo(carX + carW*0.15, carY + carH*0.45);
      ctx.lineTo(carX + carW*0.85, carY + carH*0.45);
      ctx.lineTo(carX + carW*0.80, carY + carH*0.35); // Dash top right
      ctx.lineTo(carX + carW*0.20, carY + carH*0.35); // Dash top left
      ctx.fill();

      // --- INTERIOR & SEATS ---
      ctx.fillStyle = interior;
      ctx.beginPath();
      ctx.moveTo(carX + carW*0.18, carY + carH*0.4);
      ctx.lineTo(carX + carW*0.22, carY + carH*0.12); 
      ctx.lineTo(carX + carW*0.78, carY + carH*0.12); 
      ctx.lineTo(carX + carW*0.82, carY + carH*0.4);
      ctx.fill();

      // Headrests (Visible behind passengers, so drawn before them)
      ctx.fillStyle = this.adjustBrightness('#8b4513', ambientLight); 
      ctx.fillRect(carX + carW*0.25, carY + carH*0.08, carW*0.12, carH*0.15); // Left
      ctx.fillRect(carX + carW*0.63, carY + carH*0.08, carW*0.12, carH*0.15); // Right

      // --- PASSENGERS (Drawn ON TOP of dashboard/windshield layer to appear closer to camera) ---
      const time = Date.now() / 100;
      const hairWiggle = Math.sin(time * 2) * (speedPercent * 10);
      
      // 1. DRIVER (Left - Male)
      const driverX = carX + carW * 0.31;
      const driverY = carY + carH * 0.15;
      
      // Shirt (White)
      ctx.fillStyle = this.adjustBrightness('#eeeeee', ambientLight);
      ctx.beginPath(); ctx.ellipse(driverX, driverY + carH*0.15, carW*0.09, carH*0.12, 0, 0, Math.PI, true); ctx.fill();
      // Head
      ctx.fillStyle = this.adjustBrightness('#ffdbac', ambientLight);
      ctx.beginPath(); ctx.arc(driverX, driverY, carW*0.05, 0, Math.PI*2); ctx.fill();
      // Hair (Short Dark)
      ctx.fillStyle = '#221100';
      ctx.beginPath();
      ctx.arc(driverX, driverY - carH*0.02, carW*0.055, Math.PI, 0); 
      ctx.lineTo(driverX + carW*0.05, driverY + carH*0.05);
      ctx.lineTo(driverX - carW*0.05, driverY + carH*0.05);
      ctx.fill();
      
      // 2. PASSENGER (Right - Female)
      const passX = carX + carW * 0.69;
      const passY = carY + carH * 0.15;
      // Dress (Pink)
      ctx.fillStyle = this.adjustBrightness('#ff69b4', ambientLight); 
      ctx.beginPath(); ctx.ellipse(passX, passY + carH*0.15, carW*0.08, carH*0.12, 0, 0, Math.PI, true); ctx.fill();
      // Head
      ctx.fillStyle = this.adjustBrightness('#ffdbac', ambientLight);
      ctx.beginPath(); ctx.arc(passX, passY, carW*0.045, 0, Math.PI*2); ctx.fill();
      // Hair (Blonde, Flowing)
      ctx.fillStyle = '#fdd835'; 
      ctx.beginPath();
      ctx.arc(passX, passY - carH*0.02, carW*0.05, Math.PI, 0); 
      const blowX = (Math.random() * 2 + 3) * speedPercent; 
      const blowY = (Math.random() * 2 - 5) * speedPercent;
      ctx.moveTo(passX - carW*0.05, passY);
      ctx.quadraticCurveTo(passX - carW*0.08 - hairWiggle, passY + carH*0.2, passX - carW*0.04, passY + carH*0.3);
      ctx.lineTo(passX + carW*0.05 + blowX, passY + carH*0.2 + blowY);
      ctx.quadraticCurveTo(passX + carW*0.1, passY, passX + carW*0.05, passY - carH*0.05);
      ctx.fill();

      // --- SIDE MIRRORS (Draw here to be somewhat integrated with body) ---
      ctx.fillStyle = red;
      // Left Mirror Housing
      ctx.beginPath();
      ctx.moveTo(carX + carW*0.1, carY + carH*0.2);
      ctx.lineTo(carX - carW*0.05, carY + carH*0.15);
      ctx.lineTo(carX - carW*0.05, carY + carH*0.25);
      ctx.lineTo(carX + carW*0.1, carY + carH*0.3);
      ctx.fill();
      // Left Mirror Reflection (Glass)
      ctx.fillStyle = '#aaddff'; 
      ctx.beginPath();
      ctx.moveTo(carX + carW*0.08, carY + carH*0.21);
      ctx.lineTo(carX - carW*0.04, carY + carH*0.16);
      ctx.lineTo(carX - carW*0.04, carY + carH*0.24);
      ctx.lineTo(carX + carW*0.08, carY + carH*0.29);
      ctx.fill();

      // Right Mirror Housing
      ctx.fillStyle = red;
      ctx.beginPath();
      ctx.moveTo(carX + carW*0.9, carY + carH*0.2);
      ctx.lineTo(carX + carW*1.05, carY + carH*0.15);
      ctx.lineTo(carX + carW*1.05, carY + carH*0.25);
      ctx.lineTo(carX + carW*0.9, carY + carH*0.3);
      ctx.fill();
      // Right Mirror Reflection (Glass)
      ctx.fillStyle = '#aaddff';
      ctx.beginPath();
      ctx.moveTo(carX + carW*0.92, carY + carH*0.21);
      ctx.lineTo(carX + carW*1.04, carY + carH*0.16);
      ctx.lineTo(carX + carW*1.04, carY + carH*0.24);
      ctx.lineTo(carX + carW*0.92, carY + carH*0.29);
      ctx.fill();

      // --- REAR GRILL (Testarossa Strakes) ---
      // Black background panel
      const grillY = carY + carH * 0.5;
      const grillH = carH * 0.25;
      ctx.fillStyle = '#111';
      ctx.fillRect(carX + carW*0.02, grillY, carW*0.96, grillH);

      // Taillights (behind strakes)
      const brakeColor = braking ? '#ff0000' : '#aa0000';
      const brakeGlow = braking ? 20 : 0;
      ctx.fillStyle = brakeColor;
      if (braking) {
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = brakeGlow;
      }
      ctx.fillRect(carX + carW*0.05, grillY + grillH*0.1, carW*0.25, grillH*0.8);
      ctx.fillRect(carX + carW*0.7, grillY + grillH*0.1, carW*0.25, grillH*0.8);
      ctx.shadowBlur = 0;

      // License Plate
      ctx.fillStyle = '#ffcc00'; 
      ctx.fillRect(carX + carW*0.42, grillY + grillH*0.2, carW*0.16, grillH*0.6);
      ctx.fillStyle = '#000';
      ctx.font = `bold ${Math.floor(carH*0.12)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText("OUTRUN", carX + carW*0.5, grillY + grillH*0.65);

      // Strakes (Horizontal Lines)
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; 
      const slatCount = 5;
      const slatH = grillH / (slatCount * 2 + 1);
      for(let i=0; i<slatCount; i++) {
          const sy = grillY + (i * slatH * 2) + slatH;
          ctx.fillRect(carX + carW*0.02, sy, carW*0.96, slatH);
      }

      // Ferrari Badge
      ctx.fillStyle = '#ffff00';
      ctx.beginPath();
      ctx.arc(carX + carW*0.5, carY + carH*0.42, carW*0.02, 0, Math.PI*2);
      ctx.fill();

      // Smoke
      if (speedPercent > 0.8 && !braking) {
           ctx.fillStyle = 'rgba(200,200,200,0.3)';
           const fumeX = (Math.random() > 0.5 ? carX + carW*0.15 : carX + carW*0.85) + (Math.random()*10 - 5);
           const fumeY = exY + Math.random() * 10;
           ctx.beginPath(); ctx.arc(fumeX, fumeY, carW*0.06 * Math.random(), 0, Math.PI*2); ctx.fill();
      }
  }

  // Helper for drawing realistic water (Stages 1 & 4)
  private drawWaterSurface(ctx: CanvasRenderingContext2D, segment: Segment, p1: ScreenPoint, p2: ScreenPoint, waterColorBase: string, ambientLight: number, x1: number, x2: number) {
      const waterColor = this.adjustBrightness(waterColorBase, ambientLight); 
      
      const waterRightBound = x1 + 5000; // Draw far to right if x1 is left edge, or just fill
      // In stage 1 we pass x1 as the start (beach edge), x2 as the end (0)
      
      ctx.fillStyle = waterColor;
      ctx.beginPath();
      ctx.moveTo(x1, p1.y);
      ctx.lineTo(x2, p1.y);
      ctx.lineTo(x2, p2.y);
      ctx.lineTo(x1 + (p2.x - p1.x), p2.y); // Parallel logic approx
      ctx.fill();

      // Draw Wave Highlight Lines
      const time = Date.now() / 500;
      
      if (segment.index % 3 === 0) {
          const highlightColor = this.adjustBrightness(waterColorBase, ambientLight + 0.3);
          ctx.fillStyle = highlightColor;
          
          const waveY = p1.y + (p2.y - p1.y) * 0.5;
          const waveH = (p2.y - p1.y) * 0.2;
          
          // Draw wave from start x to end x
          ctx.fillRect(Math.min(x1, x2), waveY, Math.abs(x2 - x1), waveH);
      }
  }

  public render(opts: RenderContext) {
    const { ctx, width, height, segments, baseSegment, playerX, playerZ, cameraHeight, cameraDepth, roadWidth, cars, background, curve, stage, fireworks, braking } = opts;

    ctx.clearRect(0, 0, width, height);
    
    const ambientLight = this.drawBackground(ctx, width, height, background, stage);

    if (fireworks && fireworks.length > 0) {
        this.drawFireworks(ctx, fireworks);
    }

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

        const grassColor = this.adjustBrightness(segment.color.grass, ambientLight);
        const roadColor = this.adjustBrightness(segment.color.road, ambientLight);
        const rumbleColor = this.adjustBrightness(segment.color.rumble, ambientLight);
        const laneColor = this.adjustBrightness(segment.color.lane, ambientLight);

        // --- STAGE SPECIFIC TERRAIN RENDERING ---

        if (stage === 5) {
             // STAGE 5: Synthwave Coast
             // Left Side: Neon Ocean Grid
             
             // Calculate Land Width (Similar to Stage 1 Beach)
             const landWidth1 = segment.p1Screen.w * 3;
             const landWidth2 = segment.p2Screen.w * 3;
             
             const roadLeft1 = segment.p1Screen.x - segment.p1Screen.w;
             const roadLeft2 = segment.p2Screen.x - segment.p2Screen.w;
             
             const waterStart1 = roadLeft1 - landWidth1;
             const waterStart2 = roadLeft2 - landWidth2;

             // 1. Draw Water (From 0 to waterStart)
             const waterBase = '#2a0a3a'; 
             const waterColor = this.adjustBrightness(waterBase, ambientLight * 0.8); 
             ctx.fillStyle = waterColor;
             ctx.beginPath();
             ctx.moveTo(0, segment.p1Screen.y);
             ctx.lineTo(waterStart1, segment.p1Screen.y);
             ctx.lineTo(waterStart2, segment.p2Screen.y);
             ctx.lineTo(0, segment.p2Screen.y);
             ctx.fill();

             // Grid Lines on Water
             const gridColor = this.adjustBrightness('#00ffff', ambientLight); // Cyan
             const timeOffset = Math.floor(Date.now() / 50) % 10;
             if ((segment.index + timeOffset) % 4 === 0) {
                 ctx.fillStyle = gridColor;
                 ctx.fillRect(0, segment.p2Screen.y, waterStart2, segment.p1Screen.y - segment.p2Screen.y);
             }
             
             // 2. Draw Ground (Grid from waterStart to Road)
             const groundColor = this.adjustBrightness('#110522', ambientLight); 
             ctx.fillStyle = groundColor;
             ctx.beginPath();
             ctx.moveTo(waterStart1, segment.p1Screen.y);
             ctx.lineTo(roadLeft1, segment.p1Screen.y);
             ctx.lineTo(roadLeft2, segment.p2Screen.y);
             ctx.lineTo(waterStart2, segment.p2Screen.y);
             ctx.fill();

             // 3. Draw Right Side Ground
             this.drawPolygon(ctx, segment.p1Screen.x + segment.p1Screen.w, segment.p1Screen.y, width, segment.p1Screen.y, width, segment.p2Screen.y, segment.p2Screen.x + segment.p2Screen.w, segment.p2Screen.y, groundColor);

        } else if (stage === 4) {
             // STAGE 4: Lake Right
             this.drawPolygon(ctx, 0, segment.p2Screen.y, segment.p2Screen.x - segment.p2Screen.w, segment.p2Screen.y, segment.p1Screen.x - segment.p1Screen.w, segment.p1Screen.y, 0, segment.p1Screen.y, grassColor);
             // Water starts at road edge
             this.drawWaterSurface(ctx, segment, segment.p1Screen, segment.p2Screen, '#2b4c6f', ambientLight, segment.p1Screen.x + segment.p1Screen.w, width);

        } else if (stage === 1) {
            // STAGE 1: Beach Left
            // Calculate Beach Width to push water away
            const beachWidth1 = segment.p1Screen.w * 3;
            const beachWidth2 = segment.p2Screen.w * 3;
            
            const roadLeft1 = segment.p1Screen.x - segment.p1Screen.w;
            const roadLeft2 = segment.p2Screen.x - segment.p2Screen.w;
            
            const waterStart1 = roadLeft1 - beachWidth1;
            const waterStart2 = roadLeft2 - beachWidth2;

            // Draw Water (From 0 to waterStart)
            this.drawWaterSurface(ctx, segment, segment.p1Screen, segment.p2Screen, '#006994', ambientLight, 0, waterStart1);
            
            // Draw Sand Beach (Between water and road)
            const sandColor = this.adjustBrightness('#eecfaa', ambientLight);
            ctx.fillStyle = sandColor;
            ctx.beginPath();
            ctx.moveTo(waterStart1, segment.p1Screen.y);
            ctx.lineTo(roadLeft1, segment.p1Screen.y);
            ctx.lineTo(roadLeft2, segment.p2Screen.y);
            ctx.lineTo(waterStart2, segment.p2Screen.y);
            ctx.fill();

            // Draw Ground Right
            this.drawPolygon(ctx, segment.p1Screen.x + segment.p1Screen.w, segment.p1Screen.y, width, segment.p1Screen.y, width, segment.p2Screen.y, segment.p2Screen.x + segment.p2Screen.w, segment.p2Screen.y, grassColor);
        } else {
            // Standard Grass
            this.drawPolygon(ctx, 0, segment.p2Screen.y, width, segment.p2Screen.y, width, segment.p1Screen.y, 0, segment.p1Screen.y, grassColor);
        }

        // Draw Full Road
        this.drawPolygon(ctx, segment.p1Screen.x - segment.p1Screen.w, segment.p1Screen.y, segment.p1Screen.x + segment.p1Screen.w, segment.p1Screen.y, segment.p2Screen.x + segment.p2Screen.w, segment.p2Screen.y, segment.p2Screen.x - segment.p2Screen.w, segment.p2Screen.y, roadColor);

        const r1 = segment.p1Screen.w / 6;
        const r2 = segment.p2Screen.w / 6;
        this.drawPolygon(ctx, segment.p1Screen.x - segment.p1Screen.w - r1, segment.p1Screen.y, segment.p1Screen.x - segment.p1Screen.w, segment.p1Screen.y, segment.p2Screen.x - segment.p2Screen.w, segment.p2Screen.y, segment.p2Screen.x - segment.p2Screen.w - r2, segment.p2Screen.y, rumbleColor);
        this.drawPolygon(ctx, segment.p1Screen.x + segment.p1Screen.w, segment.p1Screen.y, segment.p1Screen.x + segment.p1Screen.w + r1, segment.p1Screen.y, segment.p2Screen.x + segment.p2Screen.w + r2, segment.p2Screen.y, segment.p2Screen.x + segment.p2Screen.w, segment.p2Screen.y, rumbleColor);

        if (segment.color.lane) {
             const w1 = segment.p1Screen.w;
             const w2 = segment.p2Screen.w;
             const markerW1 = w1 / 32;
             const markerW2 = w2 / 32;

             const leftDividerX1 = segment.p1Screen.x - (w1 / 3);
             const leftDividerX2 = segment.p2Screen.x - (w2 / 3);
             
             const rightDividerX1 = segment.p1Screen.x + (w1 / 3);
             const rightDividerX2 = segment.p2Screen.x + (w2 / 3);

             this.drawPolygon(ctx, leftDividerX1, segment.p1Screen.y, leftDividerX1 + markerW1, segment.p1Screen.y, leftDividerX2 + markerW2, segment.p2Screen.y, leftDividerX2, segment.p2Screen.y, laneColor);
             this.drawPolygon(ctx, rightDividerX1, segment.p1Screen.y, rightDividerX1 + markerW1, segment.p1Screen.y, rightDividerX2 + markerW2, segment.p2Screen.y, rightDividerX2, segment.p2Screen.y, laneColor);
             
             const edgeW1 = w1 / 24; 
             const edgeW2 = w2 / 24;
             
             const leftEdgeX1 = segment.p1Screen.x - w1;
             const leftEdgeX2 = segment.p2Screen.x - w2;
             this.drawPolygon(ctx, leftEdgeX1, segment.p1Screen.y, leftEdgeX1 + edgeW1, segment.p1Screen.y, leftEdgeX2 + edgeW2, segment.p2Screen.y, leftEdgeX2, segment.p2Screen.y, '#ffffff');

             const rightEdgeX1 = segment.p1Screen.x + w1 - edgeW1;
             const rightEdgeX2 = segment.p2Screen.x + w2 - edgeW2;
             this.drawPolygon(ctx, rightEdgeX1, segment.p1Screen.y, rightEdgeX1 + edgeW1, segment.p1Screen.y, rightEdgeX2 + edgeW2, segment.p2Screen.y, rightEdgeX2, segment.p2Screen.y, '#ffffff');
        }

        maxy = segment.p2Screen.y;
    }

    for(let n = segments.length - 1; n > 0 ; n--) {
        const segment = segments[n];
        const scale = segment.p1Screen.scale;
        
        for(let i = 0; i < segment.sprites.length; i++) {
            const sprite = segment.sprites[i];
            const destX = segment.p1Screen.x + (scale * sprite.offset * roadWidth * width / 2);
            this.drawSprite(ctx, width, height, width/1000, roadWidth, sprite.type, scale, destX, segment.p1Screen.y, segment.clip, ambientLight, segment.index + i, sprite.offset);
        }

        for(let i = 0; i < segment.cars.length; i++) {
             const car = segment.cars[i];
             const destX = segment.p1Screen.x + (scale * car.offset * roadWidth * width / 2);
             const spriteType = car.sprite === 'NPC' ? SpriteType.CAR_NPC : car.sprite;
             this.drawSprite(ctx, width, height, width/1000, roadWidth, spriteType, scale, destX, segment.p1Screen.y, segment.clip, ambientLight, car.id, car.offset);
        }
    }

    const speedPercent = opts.cars && opts.cars.length > 0 ? (opts.cars[0].speed / 12000) : 0;
    this.drawPlayerCar(ctx, width, height, width/1000, roadWidth, speedPercent, curve * 2, ambientLight, !!braking); 
  }
}

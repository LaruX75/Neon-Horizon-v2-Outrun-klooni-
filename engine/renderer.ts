
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
      LAKESIDE: COLORS.SKY.LAKESIDE,
      // Stage 6
      FINAL_CITY: COLORS.SKY.FINAL_CITY
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
      
      if (stage === 6) {
          // Start with Sunset (Dusk colors) but shift rapidly to Night if needed by TimeOfDay
          // But base palette is custom neon
          const colors = this.SKY_COLORS.FINAL_CITY;
          // Apply time dimming to base color
          const dim = Math.max(0.2, 1.0 - Math.abs(time - 0.5)*2); // Simple dimming curve
          return {
              top: this.formatRgb(colors.top),
              bottom: this.formatRgb(colors.bottom), // Orange Sunset
              terrain: this.formatRgb(colors.terrain),
              cloud: this.formatRgb(colors.cloud),
              lightFactor: dim
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
      if (stage !== 5 && stage !== 6 && (time > 0.7 && time < 0.9)) return; 

      let sunHeight = -0.2; 
      if (stage === 5 || stage === 6) {
          sunHeight = 0.2; // Fixed sunset position
          // In stage 6 allow it to dip lower
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
      const g = isSunset ? 50 : 255; // Redder for Stage 5/6
      const b = isSunset ? 100 : 200; // Purpler for Stage 5/6

      const glow = ctx.createRadialGradient(sunX, sunY, 40, sunX, sunY, 200);
      glow.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.6)`);
      glow.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(sunX, sunY, 200, 0, Math.PI*2);
      ctx.fill();

      // Sun Core with scanlines for Stage 5 & 6
      const grad = ctx.createLinearGradient(sunX, sunY - 70, sunX, sunY + 70);
      grad.addColorStop(0, `rgb(255, 255, 200)`);
      grad.addColorStop(1, `rgb(${r}, ${g}, ${b})`);
      
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(sunX, sunY, 70, 0, Math.PI*2);
      ctx.fill();

      // Retro Scanlines on sun for Stage 5 & 6
      if (stage === 5 || stage === 6) {
          ctx.fillStyle = 'rgba(80, 0, 100, 0.4)'; // Dark bands
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
          let elevation = 
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

  private drawCitySilhouette(ctx: CanvasRenderingContext2D, width: number, height: number, horizonY: number, skyOffset: number) {
      const offset = skyOffset * 0.1;
      ctx.fillStyle = '#050510'; // Dark silhouette color

      ctx.beginPath();
      ctx.moveTo(0, height);
      ctx.lineTo(0, horizonY);

      const blockWidth = 60;
      const numBlocks = Math.ceil(width / blockWidth) + 2;
      
      for(let i=0; i<numBlocks; i++) {
           const x = (i * blockWidth) - (offset % blockWidth);
           // Procedural height based on index + big offset to simulate scrolling
           const seed = Math.floor(offset / blockWidth) + i;
           const h = 50 + this.hash(seed) * 150; 
           
           ctx.lineTo(x, horizonY - h);
           ctx.lineTo(x + blockWidth, horizonY - h);
      }
      
      ctx.lineTo(width, horizonY);
      ctx.lineTo(width, height);
      ctx.fill();

      // Windows
      ctx.fillStyle = '#221133'; // Dim windows
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

  private drawWater(ctx: CanvasRenderingContext2D, width: number, height: number, horizonY: number, skyTop: string, skyBottom: string) {
      // 1. Reflection Gradient with "Sunset Chrome" aesthetic
      const grad = ctx.createLinearGradient(0, horizonY, 0, height);
      // Horizon - match the bottom of the sky for seamless transition
      grad.addColorStop(0, skyBottom); 
      // Mid - Deep purple/magenta band typical of synthwave aesthetics
      grad.addColorStop(0.3, 'rgba(80, 20, 100, 0.95)'); 
      // Bottom - Dark reflection of the top sky
      grad.addColorStop(1, skyTop);
      
      ctx.fillStyle = grad;
      ctx.fillRect(0, horizonY, width, height - horizonY);

      // 2. Central Sun Glare Path
      const cx = width / 2;
      const glareGrad = ctx.createLinearGradient(0, horizonY, 0, height);
      glareGrad.addColorStop(0, 'rgba(255, 220, 100, 0.4)'); // Yellowish glare at horizon
      glareGrad.addColorStop(0.7, 'rgba(255, 100, 200, 0.1)'); // Fading pink
      glareGrad.addColorStop(1, 'rgba(255, 0, 255, 0.0)'); 
      
      ctx.fillStyle = glareGrad;
      ctx.beginPath();
      // Trapezoid shape for reflection path
      ctx.moveTo(cx - width * 0.02, horizonY);
      ctx.lineTo(cx + width * 0.02, horizonY);
      ctx.lineTo(cx + width * 0.25, height);
      ctx.lineTo(cx - width * 0.25, height);
      ctx.fill();

      // 3. Procedural Dynamic Waves / Grid
      const time = Date.now() / 1000;
      const waveCount = 28; // Increased count for smoother gradient
      
      for(let i=0; i<waveCount; i++) {
          // Calculate wave position with perspective scrolling
          // Scroll speed: time * 0.15
          // Loop using modulo
          let p = (i / waveCount) + (time * 0.15 % 1);
          if (p > 1) p -= 1; // Wrap around
          
          // Exponential distance distribution to cluster waves near horizon
          // x^4 gives strong perspective effect
          const perspectiveP = Math.pow(p, 4);
          
          const y = horizonY + perspectiveP * (height - horizonY);
          
          // Stop if off screen
          if (y >= height) continue;

          // Wave thickness increases closer to camera
          const thickness = 1 + perspectiveP * 6;
          
          // Alpha logic: fade in from horizon, fade out at very bottom
          const alpha = Math.sin(p * Math.PI) * 0.6; 
          
          // Base wave color - Neon Pink/Cyan mix
          ctx.fillStyle = `rgba(255, 80, 220, ${alpha})`;
          
          // Draw the full width wave line
          ctx.fillRect(0, y, width, thickness);

          // Add dynamic "sparkle" or "broken" segments on top to simulate ripples
          // Using sine waves to create moving highlights
          const segCount = 12;
          const segWidth = width / segCount;
          
          ctx.fillStyle = `rgba(200, 240, 255, ${alpha + 0.3})`; // Bright highlight
          
          for(let s=0; s<segCount; s++) {
              // Create oscillating movement for highlights
              const shift = Math.sin(time * 3 + i * 0.5 + s) * 0.5 + 0.5;
              
              // Only draw some segments to look like broken water surface
              if (shift > 0.6) {
                  const sx = s * segWidth + (shift * 20); // Minor lateral shift
                  const sw = segWidth * 0.7; // Width of sparkle
                  ctx.fillRect(sx, y, sw, thickness);
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
    if (stage === 5 || stage === 6 || timeOfDay > 0.6) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        for(let i=0; i<80; i++) {
            const x = (this.hash(i) * 2000 + skyOffset * 0.02) % width;
            const y = this.hash(i+100) * (height/2);
            const size = this.hash(i+200) * 2.5;
            ctx.fillRect(x, y, size, size);
        }
    }

    // 4. Terrain / Water / City Skyline
    if (stage === 5) {
        this.drawWater(ctx, width, height, horizonY, env.top, env.bottom);
    } else if (stage === 6) {
        this.drawCitySilhouette(ctx, width, height, horizonY, skyOffset);
        // Add a ground plane
        ctx.fillStyle = env.terrain;
        ctx.fillRect(0, horizonY, width, height - horizonY);
    } else {
        this.drawTerrain(ctx, width, height, horizonY, skyOffset, env.terrain, stage); 
        // Ocean line
        ctx.fillStyle = env.terrain; 
        ctx.fillRect(0, horizonY, width, 40);
    }

    return env.lightFactor;
  }

  private drawCheckpoint(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
      // Create a brighter, high-contrast checkpoint gate
      
      // Side Pillars - Chrome/Metallic
      const gradPillar = ctx.createLinearGradient(x - w/2, y - h, x - w/2 + w*0.05, y - h);
      gradPillar.addColorStop(0, '#555');
      gradPillar.addColorStop(0.5, '#fff');
      gradPillar.addColorStop(1, '#888');

      ctx.fillStyle = gradPillar;
      ctx.fillRect(x - w/2, y - h, w * 0.05, h); // Left
      ctx.fillRect(x + w/2 - w*0.05, y - h, w * 0.05, h); // Right

      // Top Banner Background
      const bannerH = h * 0.25;
      const bannerY = y - h + bannerH/2;
      
      ctx.fillStyle = '#000';
      ctx.fillRect(x - w/2, y - h, w, bannerH);
      
      // Strobing Border
      const time = Date.now() / 100;
      const strobe = Math.sin(time) > 0 ? '#ffff00' : '#ff0000';
      ctx.strokeStyle = strobe;
      ctx.lineWidth = w * 0.015;
      ctx.strokeRect(x - w/2, y - h, w, bannerH);

      // Text "CHECKPOINT"
      ctx.fillStyle = '#ff0000';
      ctx.font = `900 ${Math.ceil(bannerH * 0.8)}px Orbitron`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Text Glow
      ctx.shadowColor = '#ff0000';
      ctx.shadowBlur = 20;
      ctx.fillText("CHECKPOINT", x, bannerY);
      ctx.shadowBlur = 0;

      // Traffic Lights on top of pillars
      const lightColor = Math.floor(time / 2) % 2 === 0 ? '#00ff00' : '#ffff00';
      const r = bannerH * 0.3;
      
      ctx.fillStyle = lightColor;
      ctx.shadowColor = lightColor;
      ctx.shadowBlur = 15;
      
      ctx.beginPath(); ctx.arc(x - w * 0.45, bannerY, r, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + w * 0.45, bannerY, r, 0, Math.PI*2); ctx.fill();
      
      ctx.shadowBlur = 0;
  }

  // New function to draw a detailed, varied NPC Car
  private drawNPCCar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, light: number, seed: number) {
      const dim = Math.max(0.1, light);
      
      // Select Color based on seed
      const colors = [
          '#d32f2f', // Red
          '#0288d1', // Blue
          '#fbc02d', // Yellow
          '#388e3c', // Green
          '#7b1fa2', // Purple
          '#e0e0e0', // Silver
          '#1a1a1a'  // Black
      ];
      // Use the seed to pick a car type and color
      const rnd = this.pseudoRandom(seed * 123);
      const colorIndex = Math.floor(rnd * 100) % colors.length;
      const baseColor = colors[colorIndex];
      const mainColor = this.adjustBrightness(baseColor, dim);
      const highlightColor = this.adjustBrightness(baseColor, dim + 0.3);
      const darkColor = this.adjustBrightness(baseColor, dim - 0.2);

      const isConvertible = (Math.floor(rnd * 100) % 3) === 0; // 1 in 3 chance
      const isWide = (Math.floor(rnd * 100) % 2) === 0;

      const widthMod = isWide ? 1.0 : 0.9;
      const effectiveW = w * widthMod;
      const offsetX = x + (w - effectiveW) / 2;

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.beginPath(); 
      ctx.ellipse(x + w/2, y + h*0.9, effectiveW/1.8, h*0.15, 0, 0, Math.PI*2);
      ctx.fill();

      // Tyres
      ctx.fillStyle = this.adjustBrightness('#111111', dim);
      ctx.fillRect(offsetX + effectiveW*0.05, y + h*0.75, effectiveW*0.18, h*0.25); 
      ctx.fillRect(offsetX + effectiveW*0.77, y + h*0.75, effectiveW*0.18, h*0.25); 

      // Lower Body (Bumper/Skirt)
      ctx.fillStyle = darkColor;
      ctx.fillRect(offsetX + effectiveW*0.05, y + h*0.8, effectiveW*0.9, h*0.15);

      // Main Body Block
      ctx.fillStyle = mainColor;
      // Start form bottom up
      ctx.beginPath();
      ctx.moveTo(offsetX + effectiveW*0.05, y + h*0.8); // Bottom Left
      ctx.lineTo(offsetX + effectiveW*0.05, y + h*0.45); // Top Left (Deck height)
      ctx.lineTo(offsetX + effectiveW*0.95, y + h*0.45); // Top Right
      ctx.lineTo(offsetX + effectiveW*0.95, y + h*0.8); // Bottom Right
      ctx.fill();

      // Side Vents (Testarossa style strakes or intakes)
      if (isWide) {
          ctx.fillStyle = this.adjustBrightness('#000000', dim);
          const ventH = h*0.03;
          for(let i=0; i<3; i++) {
              ctx.fillRect(offsetX + effectiveW*0.05, y + h*0.5 + (i*ventH*2), effectiveW*0.15, ventH);
              ctx.fillRect(offsetX + effectiveW*0.8, y + h*0.5 + (i*ventH*2), effectiveW*0.15, ventH);
          }
      }

      // Upper Deck / Trunk
      ctx.fillStyle = mainColor;
      ctx.fillRect(offsetX + effectiveW*0.1, y + h*0.35, effectiveW*0.8, h*0.2);

      // Cabin / Roof / Interior
      if (isConvertible) {
          // Open Top
          // Interior base
          ctx.fillStyle = this.adjustBrightness('#3e2723', dim); // Brown leatherish
          ctx.fillRect(offsetX + effectiveW*0.2, y + h*0.25, effectiveW*0.6, h*0.2);
          
          // Drivers (Simple circles for NPC)
          ctx.fillStyle = '#222';
          ctx.beginPath(); ctx.arc(offsetX + effectiveW*0.35, y + h*0.2, effectiveW*0.05, 0, Math.PI*2); ctx.fill();

          // Windshield frame
          ctx.fillStyle = this.adjustBrightness('#111', dim);
          ctx.fillRect(offsetX + effectiveW*0.2, y + h*0.25, effectiveW*0.6, h*0.05);

      } else {
          // Hard Top Coupe
          // Roof
          ctx.fillStyle = highlightColor;
          ctx.beginPath();
          ctx.moveTo(offsetX + effectiveW*0.2, y + h*0.35); // Base Left
          ctx.lineTo(offsetX + effectiveW*0.25, y + h*0.05); // Roof Left
          ctx.lineTo(offsetX + effectiveW*0.75, y + h*0.05); // Roof Right
          ctx.lineTo(offsetX + effectiveW*0.8, y + h*0.35); // Base Right
          ctx.fill();

          // Rear Window
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

      // Rear Panel / Taillights
      const lightY = y + h * 0.45;
      const lightH = h * 0.15;
      
      // Black strip for lights
      ctx.fillStyle = '#000';
      ctx.fillRect(offsetX + effectiveW*0.1, lightY, effectiveW*0.8, lightH);

      // Lights style based on random
      ctx.fillStyle = '#d50000';
      ctx.shadowColor = '#f44336';
      ctx.shadowBlur = (light < 0.5) ? 10 : 0;

      const lightStyle = Math.floor(rnd * 100) % 3;
      
      if (lightStyle === 0) {
          // Bar style (Cyberpunk/Robocop)
          ctx.fillRect(offsetX + effectiveW*0.15, lightY + lightH*0.2, effectiveW*0.7, lightH*0.6);
      } else if (lightStyle === 1) {
          // Dual Round (Corvette/Ferrari)
          const r = lightH * 0.4;
          const cy = lightY + lightH/2;
          ctx.beginPath(); ctx.arc(offsetX + effectiveW*0.25, cy, r, 0, Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.arc(offsetX + effectiveW*0.35, cy, r, 0, Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.arc(offsetX + effectiveW*0.65, cy, r, 0, Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.arc(offsetX + effectiveW*0.75, cy, r, 0, Math.PI*2); ctx.fill();
      } else {
          // Rectangular blocks (DeLorean/Testarossa)
          ctx.fillRect(offsetX + effectiveW*0.12, lightY + lightH*0.1, effectiveW*0.25, lightH*0.8);
          ctx.fillRect(offsetX + effectiveW*0.63, lightY + lightH*0.1, effectiveW*0.25, lightH*0.8);
      }
      ctx.shadowBlur = 0;

      // License Plate
      ctx.fillStyle = '#ffeb3b';
      ctx.fillRect(offsetX + effectiveW*0.42, lightY + lightH*0.2, effectiveW*0.16, lightH*0.6);
      
      // Exhausts
      ctx.fillStyle = '#222';
      const exY = y + h*0.85;
      ctx.beginPath(); ctx.arc(offsetX + effectiveW*0.2, exY, effectiveW*0.04, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(offsetX + effectiveW*0.8, exY, effectiveW*0.04, 0, Math.PI*2); ctx.fill();
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
        default: worldW = 200; worldH = 200;
    }

    // VARIATION FOR PALMS
    if (spriteType === SpriteType.PALM_TREE) {
        // Use seed to vary scale by +/- 20%
        const scaleVar = 1 + (this.pseudoRandom(seed * 1.1) * 0.4 - 0.2);
        worldW *= scaleVar;
        worldH *= scaleVar;
        // Make some fatter/skinnier independently
        const widthVar = 1 + (this.pseudoRandom(seed * 2.2) * 0.4 - 0.2);
        worldW *= widthVar;
    }

    // Procedural building height/color using PSEUDO-RANDOM generator (Stable)
    let buildingFloors = 3;
    let buildingColor = '#444';
    if (spriteType === SpriteType.BUILDING || spriteType === SpriteType.SKYSCRAPER || spriteType === SpriteType.HOUSE) {
        const rnd = this.pseudoRandom(Math.floor(seed)); 
        
        // Pick one of 3 grey shades for the base color
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

    // FIX: Flying object prevention. 
    // If the visual bottom (destY) is clearly above the clip line (clipY), don't draw.
    // However, for traffic lights hanging over road, this check might fail if they are high up?
    // No, destY is the 'base' of the sprite on the ground. Traffic lights have a base on the ground too (poles).
    // But my TRAFFIC_LIGHT logic puts it at center offset... it needs a pole.
    if (spriteType !== SpriteType.TRAFFIC_LIGHT && destY < clipY) return;

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
        this.drawNPCCar(ctx, x, y, w, h, light, seed);
    } 
    else if (spriteType === SpriteType.PALM_TREE) {
        // ... (Existing Palm Logic)
        const trunk = this.adjustBrightness('#8B5A2B', light);
        const leaf = this.adjustBrightness('#009900', light);
        const stroke = this.adjustBrightness('#005500', light);
        ctx.fillStyle = trunk; 
        ctx.beginPath();
        // Dynamic Curve based on seed
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
    else if (spriteType === SpriteType.BUSH) {
        const green = this.adjustBrightness('#228b22', light);
        ctx.fillStyle = green;
        // Simple cluster of circles
        ctx.beginPath(); ctx.arc(x + w*0.2, y + h*0.7, w*0.3, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(x + w*0.5, y + h*0.6, w*0.4, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(x + w*0.8, y + h*0.7, w*0.3, 0, Math.PI*2); ctx.fill();
    }
    else if (spriteType === SpriteType.SIGN_LIMIT_80) {
        // Pole
        ctx.fillStyle = '#555';
        ctx.fillRect(x + w*0.45, y + h*0.3, w*0.1, h*0.7);
        // Circle
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = '#d00';
        ctx.lineWidth = w * 0.05;
        ctx.beginPath();
        ctx.arc(x + w*0.5, y + h*0.3, w*0.3, 0, Math.PI*2);
        ctx.fill();
        ctx.stroke();
        // Text
        ctx.fillStyle = '#000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `bold ${Math.floor(w*0.25)}px sans-serif`;
        ctx.fillText("80", x + w*0.5, y + h*0.3);
    }
    else if (spriteType === SpriteType.SIGN_PRIORITY) {
        // Pole
        ctx.fillStyle = '#555';
        ctx.fillRect(x + w*0.45, y + h*0.3, w*0.1, h*0.7);
        // Diamond (Yellow with white border)
        ctx.fillStyle = '#fb0';
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = w * 0.03;
        ctx.beginPath();
        ctx.moveTo(x + w*0.5, y); // Top
        ctx.lineTo(x + w*0.8, y + h*0.3); // Right
        ctx.lineTo(x + w*0.5, y + h*0.6); // Bottom
        ctx.lineTo(x + w*0.2, y + h*0.3); // Left
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Inner Black diamond outline? Or plain yellow for "Priority Road"? 
        // Standard Priority road is Yellow Diamond with White Border.
    }
    else if (spriteType === SpriteType.TRAFFIC_LIGHT) {
        // Gantry spanning road
        // x is roughly center of road if offset=0
        const poleW = w * 0.05;
        // Left Pole
        ctx.fillStyle = '#333';
        ctx.fillRect(x + w*0.1, y, poleW, h);
        // Right Pole
        ctx.fillRect(x + w*0.9, y, poleW, h);
        // Crossbar
        ctx.fillRect(x + w*0.1, y + h*0.1, w*0.8, h*0.1);
        
        // Lights (3 sets)
        const lightBoxW = w * 0.08;
        const lightBoxH = h * 0.25;
        const drawLight = (lx: number) => {
            ctx.fillStyle = '#111';
            ctx.fillRect(lx, y + h*0.15, lightBoxW, lightBoxH);
            // Colors
            const radius = lightBoxW * 0.3;
            const cx = lx + lightBoxW/2;
            const time = Date.now() / 1000;
            const state = Math.floor(time) % 2; // Flip flop green/red just for visuals
            
            ctx.fillStyle = state === 0 ? '#500' : '#f00'; // Red
            ctx.beginPath(); ctx.arc(cx, y + h*0.15 + lightBoxH*0.2, radius, 0, Math.PI*2); ctx.fill();
            
            ctx.fillStyle = '#550'; // Yellow (off)
            ctx.beginPath(); ctx.arc(cx, y + h*0.15 + lightBoxH*0.5, radius, 0, Math.PI*2); ctx.fill();
            
            ctx.fillStyle = state === 1 ? '#030' : '#0f0'; // Green
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
        ctx.fillRect(x + w*0.45, y, w*0.1, h); // Pole
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
        
        // FIX: Removed infinite foundation to prevent covering road
        // Draw modest foundation for hills, but keep it tight
        ctx.fillRect(x, y + h - 1, w, 20); 

        if (spriteType === SpriteType.HOUSE) {
            // Simple House shape with gable roof
            ctx.beginPath();
            ctx.moveTo(x, y + h*0.4);
            ctx.lineTo(x + w/2, y); // Roof peak
            ctx.lineTo(x + w, y + h*0.4);
            ctx.lineTo(x + w, y + h);
            ctx.lineTo(x, y + h);
            ctx.fill();
            
            // Roof darker
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
            // Box
            ctx.fillRect(x, y, w, h);
        }
        
        // Windows
        const isNight = light < 0.3;
        
        if (spriteType === SpriteType.HOUSE) {
             ctx.fillStyle = isNight ? '#ffaa00' : '#222';
             if(isNight) { ctx.shadowColor = '#ffaa00'; ctx.shadowBlur = 5; }
             ctx.fillRect(x + w*0.2, y + h*0.5, w*0.2, h*0.2);
             ctx.fillRect(x + w*0.6, y + h*0.5, w*0.2, h*0.2);
             ctx.shadowBlur = 0;
        } else {
            // Skyscraper/Building windows
            const floors = buildingFloors; 
            const winW = w * 0.15;
            const winH = h * 0.08;
            
            for(let f=0; f<floors; f++) {
                const fy = y + h - (h*0.15) - ((f+1) * (h/floors/1.2));
                for(let wx=0; wx<3; wx++) {
                    const wxPos = x + w*0.15 + (wx * w*0.25);
                    const winRnd = this.pseudoRandom(seed * 100 + f * 10 + wx);
                    // More lit windows in skyscrapers
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

  // UPDATED HEAD DRAWING WITH WIND PHYSICS
  private drawHead(ctx: CanvasRenderingContext2D, x: number, y: number, hairColor: string, isDriver: boolean, speedPercent: number) {
      // Wind calculation based on speed
      const windForce = speedPercent * 15; 
      const windFlutter = Math.sin(Date.now() / 50) * 3 * speedPercent;

      // Neck
      ctx.fillStyle = '#dca'; 
      ctx.fillRect(x - 6, y, 12, 10);

      // Face Base
      ctx.beginPath(); ctx.arc(x, y, 12, 0, Math.PI*2); ctx.fill();
      
      // Sunglasses for driver
      if (isDriver) {
          ctx.fillStyle = '#111';
          ctx.fillRect(x - 10, y - 4, 20, 6);
      }

      // Hair
      ctx.fillStyle = hairColor;
      ctx.beginPath();
      if (isDriver) {
          // Short hair, slight ruffle
          ctx.moveTo(x - 14, y);
          ctx.quadraticCurveTo(x - 5, y - 18 + windFlutter * 0.5, x + 14, y); // Top arch
          ctx.lineTo(x + 12, y + 5);
          ctx.lineTo(x - 12, y + 5);
      } else {
          // Long Passenger Hair - FLOWING BACK
          // Anchor at forehead
          ctx.moveTo(x - 12, y - 5);
          // Top curve blowing back
          ctx.bezierCurveTo(
              x - 5, y - 25, // Control point up
              x + 10, y - 20, // Control point back
              x + 25 + windForce, y - 10 + windFlutter // Tip trailing back
          );
          // Bottom curve blowing back
          ctx.bezierCurveTo(
              x + 15, y + 10, 
              x + 5, y + 15, 
              x - 12, y + 5  // Back to ear
          );
      }
      ctx.fill();
  }

  private drawPlayerCar(ctx: CanvasRenderingContext2D, width: number, height: number, resolution: number, roadWidth: number, speedPercent: number, turn: number, light: number, braking: boolean) {
      const w = 320 * resolution; // Widened player car
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
          const leftLightX = carX - w * 0.38;
          const rightLightX = carX + w * 0.38;

          const intensity = (1.0 - light) * 0.6;

          ctx.save();
          ctx.globalCompositeOperation = 'screen'; 
          
          // Beam Gradient
          const grad = ctx.createLinearGradient(0, lightY, 0, beamTargetY);
          grad.addColorStop(0, `rgba(255, 255, 200, ${intensity})`); 
          grad.addColorStop(0.8, `rgba(255, 255, 200, ${intensity * 0.2})`); 
          grad.addColorStop(1, `rgba(255, 255, 200, 0)`);
          
          ctx.fillStyle = grad;

          // Left Beam
          ctx.beginPath();
          ctx.moveTo(leftLightX, lightY); 
          ctx.lineTo(centerX - w * 1.8, beamTargetY); 
          ctx.lineTo(centerX + w * 0.5, beamTargetY); 
          ctx.fill();

          // Right Beam
          ctx.beginPath();
          ctx.moveTo(rightLightX, lightY);
          ctx.lineTo(centerX - w * 0.5, beamTargetY); 
          ctx.lineTo(centerX + w * 1.8, beamTargetY); 
          ctx.fill();

          ctx.restore();
      }

      ctx.save();
      
      ctx.translate(carX, carY + h); // Anchor at bottom-center
      ctx.translate(-(w/2), -h); // Move back to top-left of sprite relative to anchor

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.beginPath(); ctx.ellipse(w/2, h - 5, w/2, 10, 0, 0, Math.PI * 2); ctx.fill();

      const dim = Math.max(0.1, light);

      // Colors
      const ferrariRed = this.adjustBrightness('#d32f2f', dim);
      const ferrariDark = this.adjustBrightness('#8e0000', dim);
      const ferrariHighlight = this.adjustBrightness('#ff6659', dim);
      
      // 0. SIDE MIRRORS (Revised: Symmetrical Beltline Mount)
      ctx.fillStyle = ferrariRed;
      
      // Left Mirror
      ctx.beginPath();
      ctx.moveTo(w*0.15, h*0.48); // Body attachment
      ctx.lineTo(w*0.05, h*0.48); // Arm
      ctx.lineTo(w*0.05, h*0.55); // Mirror bottom inner
      ctx.lineTo(-w*0.05, h*0.55); // Mirror bottom outer
      ctx.lineTo(-w*0.05, h*0.40); // Mirror top outer
      ctx.lineTo(w*0.05, h*0.40); // Mirror top inner
      ctx.fill();
      
      // Glass Left
      ctx.fillStyle = '#112233';
      ctx.fillRect(-w*0.04, h*0.41, w*0.08, h*0.13);

      // Right Mirror
      ctx.fillStyle = ferrariRed;
      ctx.beginPath();
      ctx.moveTo(w*0.85, h*0.48); 
      ctx.lineTo(w*0.95, h*0.48); 
      ctx.lineTo(w*0.95, h*0.55); 
      ctx.lineTo(w*1.05, h*0.55); 
      ctx.lineTo(w*1.05, h*0.40); 
      ctx.lineTo(w*0.95, h*0.40); 
      ctx.fill();

      // Glass Right
      ctx.fillStyle = '#112233';
      ctx.fillRect(w*0.96, h*0.41, w*0.08, h*0.13);

      // 1. TYRES (Wider, more detail)
      ctx.fillStyle = this.adjustBrightness('#151515', dim);
      const tireW = w * 0.22;
      const tireH = h * 0.25;
      const tireY = h - tireH;
      ctx.fillRect(10, tireY, tireW, tireH); // Left
      ctx.fillRect(w - 10 - tireW, tireY, tireW, tireH); // Right
      
      // Tread detail
      ctx.fillStyle = '#000';
      for(let i=0; i<3; i++) {
        ctx.fillRect(10 + i*(tireW/3), tireY, 2, tireH);
        ctx.fillRect(w - 10 - tireW + i*(tireW/3), tireY, 2, tireH);
      }

      // 2. MAIN BODY (Lower Chassis & Fenders)
      ctx.fillStyle = ferrariRed;
      
      // Wide rear fenders (Testarossa hips)
      ctx.beginPath();
      ctx.moveTo(0, h * 0.55); // Top outer left fender
      ctx.lineTo(0, h - 10); // Bottom outer left
      ctx.lineTo(w, h - 10); // Bottom outer right
      ctx.lineTo(w, h * 0.55); // Top outer right
      ctx.lineTo(w * 0.85, h * 0.45); // Top inner right (waistline)
      ctx.lineTo(w * 0.15, h * 0.45); // Top inner left
      ctx.fill();

      // 3. SIDE INTAKES (The "Cheese Grater")
      ctx.fillStyle = ferrariDark;
      const strakeCount = 5;
      const strakeH = h * 0.04;
      const strakeGap = h * 0.04;
      const strakeStartY = h * 0.55;
      
      // Left Side Strakes
      for(let i=0; i<strakeCount; i++) {
          const yPos = strakeStartY + (i * (strakeH + strakeGap));
          ctx.beginPath();
          ctx.moveTo(0, yPos);
          ctx.lineTo(w * 0.14, yPos + 2); 
          ctx.lineTo(w * 0.14, yPos + 2 + strakeH);
          ctx.lineTo(0, yPos + strakeH);
          ctx.fill();
      }

      // Right Side Strakes
      for(let i=0; i<strakeCount; i++) {
          const yPos = strakeStartY + (i * (strakeH + strakeGap));
          ctx.beginPath();
          ctx.moveTo(w, yPos);
          ctx.lineTo(w - (w * 0.14), yPos + 2);
          ctx.lineTo(w - (w * 0.14), yPos + 2 + strakeH);
          ctx.lineTo(w, yPos + strakeH);
          ctx.fill();
      }

      // 4. BUMPER / UNDERCARRIAGE
      ctx.fillStyle = this.adjustBrightness('#111', dim);
      ctx.fillRect(w * 0.1, h * 0.85, w * 0.8, h * 0.15); // Lower valence
      
      // 5. EXHAUSTS (Quad pipes)
      ctx.fillStyle = '#222';
      ctx.strokeStyle = '#666';
      ctx.lineWidth = 2;
      
      const drawExhaust = (x: number) => {
          ctx.beginPath(); ctx.arc(x, h - 6, 6, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      };
      drawExhaust(w * 0.25); drawExhaust(w * 0.32); // Left Pair
      drawExhaust(w * 0.75); drawExhaust(w * 0.68); // Right Pair

      // 6. DYNAMIC FLAMES
      if (speedPercent > 0.8) {
          const flicker = Math.random();
          // Always draw if very fast, else random
          if (speedPercent > 0.95 || flicker > 0.6) {
              const flameLen = (speedPercent - 0.7) * (h * 0.8) * (0.8 + Math.random() * 0.4);
              const flameW = (w * 0.04) * Math.random();
              
              const drawFlame = (x: number) => {
                 ctx.beginPath();
                 const grad = ctx.createLinearGradient(x, h-6, x, h-6+flameLen);
                 grad.addColorStop(0, 'rgba(255, 255, 255, 0.8)'); // Core
                 grad.addColorStop(0.2, 'rgba(255, 255, 0, 0.6)'); // Yellow
                 grad.addColorStop(0.6, 'rgba(255, 80, 0, 0.4)'); // Orange
                 grad.addColorStop(1, 'rgba(255, 0, 0, 0)'); // Red tip
                 ctx.fillStyle = grad;
                 
                 ctx.moveTo(x - flameW, h - 6);
                 ctx.quadraticCurveTo(x, h - 6 + flameLen, x + flameW, h - 6);
                 ctx.fill();
              };
              
              // Randomly pick left or right pair source
              drawFlame(w * 0.285); 
              drawFlame(w * 0.715); 
          }
      }

      // 7. ENGINE DECK (Rear slope)
      const deckGrad = ctx.createLinearGradient(0, h*0.4, 0, h*0.7);
      deckGrad.addColorStop(0, ferrariRed);
      deckGrad.addColorStop(1, ferrariDark);
      ctx.fillStyle = deckGrad;
      
      ctx.beginPath();
      ctx.moveTo(w * 0.15, h * 0.45);
      ctx.lineTo(w * 0.25, h * 0.38); 
      ctx.lineTo(w * 0.75, h * 0.38); 
      ctx.lineTo(w * 0.85, h * 0.45);
      ctx.fill();

      // Engine Vents on Deck
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      for(let i=0; i<6; i++) {
         ctx.fillRect(w*0.3 + (i * w*0.08), h*0.4, w*0.02, h*0.05); 
      }

      // 8. CABIN STRUCTURE (PILLARS) - SEPARATED FROM ROOF TO ALLOW TRANSPARENT WINDOW
      ctx.fillStyle = ferrariRed;
      
      // Left C-Pillar
      ctx.beginPath();
      ctx.moveTo(w * 0.22, h * 0.40); // Base Outer
      ctx.lineTo(w * 0.28, 5);        // Top Outer
      ctx.lineTo(w * 0.34, 5);        // Top Inner
      ctx.lineTo(w * 0.30, h * 0.38); // Base Inner (approx)
      ctx.fill();

      // Right C-Pillar
      ctx.beginPath();
      ctx.moveTo(w * 0.78, h * 0.40); // Base Outer
      ctx.lineTo(w * 0.72, 5);        // Top Outer
      ctx.lineTo(w * 0.66, 5);        // Top Inner
      ctx.lineTo(w * 0.70, h * 0.38); // Base Inner (approx)
      ctx.fill();

      // Roof Bar
      ctx.beginPath();
      ctx.moveTo(w * 0.28, 5);
      ctx.lineTo(w * 0.72, 5);
      ctx.lineTo(w * 0.72, 9);
      ctx.lineTo(w * 0.28, 9);
      ctx.fill();
      
      // Highlight on roof edge
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillRect(w*0.32, 6, w*0.36, 2);

      // 9. REAR WINDOW (Transparent Glass)
      // Since we didn't fill the cabin area with red, this transparent gradient will show the road behind!
      const winGrad = ctx.createLinearGradient(w*0.3, 10, w*0.7, h*0.38);
      // Use RGBA for transparency
      winGrad.addColorStop(0, `rgba(0, 0, 0, 0.2)`);
      winGrad.addColorStop(0.5, `rgba(20, 30, 50, 0.3)`);
      winGrad.addColorStop(1, `rgba(0, 0, 0, 0.4)`);
      
      ctx.fillStyle = winGrad;
      ctx.beginPath();
      ctx.moveTo(w * 0.30, h * 0.38); // Base Left
      ctx.lineTo(w * 0.34, 9);        // Top Left
      ctx.lineTo(w * 0.66, 9);        // Top Right
      ctx.lineTo(w * 0.70, h * 0.38); // Base Right
      ctx.fill();
      
      // Diagonal Glare on Window (Subtle reflection)
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.beginPath();
      ctx.moveTo(w*0.6, 9);
      ctx.lineTo(w*0.65, 9);
      ctx.lineTo(w*0.45, h*0.38);
      ctx.lineTo(w*0.4, h*0.38);
      ctx.fill();

      // 10. REAR FASCIA (The Black Grille & TAILLIGHTS)
      const grillY = h * 0.50;
      const grillH = h * 0.22;
      
      // Black background
      ctx.fillStyle = '#050505';
      ctx.fillRect(w * 0.15, grillY, w * 0.7, grillH);

      // Taillights Logic: If braking, bright red + glow, else dark red + no glow
      const lightColor = braking ? '#ff0000' : '#cc0000';
      const lightShadow = braking ? 20 : 0;
      
      ctx.fillStyle = lightColor;
      ctx.shadowColor = '#ff0000';
      ctx.shadowBlur = lightShadow;
      
      // Left Cluster
      ctx.fillRect(w * 0.18, grillY + 4, w * 0.25, grillH - 8);
      // Right Cluster
      ctx.fillRect(w * 0.57, grillY + 4, w * 0.25, grillH - 8);
      
      ctx.shadowBlur = 0; // Reset shadow

      // The Slats (Draw over the lights to create the iconic "slotted" look)
      ctx.fillStyle = '#111';
      for(let i=0; i<4; i++) {
          ctx.fillRect(w * 0.15, grillY + (i* (grillH/4.5)) + 2, w * 0.7, grillH/8);
      }
      
      // Prancing Horse Badge (Silver)
      ctx.fillStyle = '#silver';
      ctx.beginPath(); ctx.arc(w/2, grillY + grillH/2, 2, 0, Math.PI*2); ctx.fill();

      // 11. HEADS (NEW ANIMATED HAIR) & REARVIEW MIRROR
      this.drawHead(ctx, w * 0.35, h * 0.32, '#2e1c1c', true, speedPercent); // Driver (Dark Hair)
      this.drawHead(ctx, w * 0.65, h * 0.32, '#ffecb3', false, speedPercent); // Passenger (Blonde)

      // REARVIEW MIRROR (NEW)
      // Small dark rectangle hanging from roof center
      ctx.fillStyle = '#111';
      ctx.fillRect(w*0.48, 9, w*0.04, h*0.05);

      ctx.restore();
  }

  public render(opts: RenderContext) {
    const { ctx, width, height, segments, baseSegment, playerX, playerZ, cameraHeight, cameraDepth, roadWidth, cars, background, curve, stage, fireworks, braking } = opts;

    ctx.clearRect(0, 0, width, height);
    
    // Draw Background and get current ambient light level (0.0 - 1.0)
    // Pass stage
    const ambientLight = this.drawBackground(ctx, width, height, background, stage);

    // If fireworks present, draw in sky
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
            // FIX: Draw "skirt" to prevent floating road look on hills
            // Draw a polygon from road edge down to bottom of screen (or deep enough)
            ctx.fillStyle = ambientLight > 0.5 ? '#110022' : '#000000'; // Dark foundation color
            
            // Left Foundation
            ctx.beginPath();
            ctx.moveTo(0, segment.p2Screen.y);
            ctx.lineTo(segment.p2Screen.x - segment.p2Screen.w, segment.p2Screen.y);
            ctx.lineTo(segment.p1Screen.x - segment.p1Screen.w, segment.p1Screen.y);
            ctx.lineTo(0, segment.p1Screen.y);
            ctx.fill();

            // Right Foundation
            ctx.beginPath();
            ctx.moveTo(width, segment.p2Screen.y);
            ctx.lineTo(segment.p2Screen.x + segment.p2Screen.w, segment.p2Screen.y);
            ctx.lineTo(segment.p1Screen.x + segment.p1Screen.w, segment.p1Screen.y);
            ctx.lineTo(width, segment.p1Screen.y);
            ctx.fill();

        } else {
            // Standard Grass Drawing
            // LEFT SIDE
            this.drawPolygon(ctx, 0, segment.p2Screen.y, width, segment.p2Screen.y, width, segment.p1Screen.y, 0, segment.p1Screen.y, grassColor);
            
            // STAGE 1 GEOMETRY FIX:
            if (stage === 1) {
                // FIXED SLOPE CALCULATION based on horizon geometry relative to road edge
                // Right Side (UP): Hill
                // We draw a polygon from the right road edge up to the screen edge but higher up.
                
                // Height variance using sine wave based on Z position (n)
                const heightVar = Math.sin(segment.index * 0.1) * 0.5 + 0.5; // 0.0 to 1.0
                const hillHeightY = (segment.p1Screen.y - (height/2)) * (0.8 + heightVar * 0.4); 
                
                // Draw Right Hill
                ctx.fillStyle = grassColor;
                ctx.beginPath();
                ctx.moveTo(segment.p1Screen.x + segment.p1Screen.w, segment.p1Screen.y);
                ctx.lineTo(segment.p2Screen.x + segment.p2Screen.w, segment.p2Screen.y);
                ctx.lineTo(width, segment.p2Screen.y - hillHeightY);
                ctx.lineTo(width, segment.p1Screen.y - hillHeightY);
                ctx.fill();

                // Left Side (DOWN): Embankment / Cliff
                // We draw a polygon from left road edge down to screen edge but lower down.
                const dropY = (segment.p1Screen.y - (height/2)) * 0.5;
                ctx.fillStyle = this.adjustBrightness(grassColor, 0.8); // Darker side
                ctx.beginPath();
                ctx.moveTo(segment.p1Screen.x - segment.p1Screen.w, segment.p1Screen.y);
                ctx.lineTo(segment.p2Screen.x - segment.p2Screen.w, segment.p2Screen.y);
                ctx.lineTo(0, segment.p2Screen.y + dropY);
                ctx.lineTo(0, segment.p1Screen.y + dropY);
                ctx.fill();
            }
        }

        // Draw Full Road (Including areas where rumble might sit)
        this.drawPolygon(ctx, segment.p1Screen.x, segment.p1Screen.y, segment.p1Screen.x + segment.p1Screen.w, segment.p1Screen.y, segment.p2Screen.x + segment.p2Screen.w, segment.p2Screen.y, segment.p2Screen.x, segment.p2Screen.y, roadColor);

        // Rumble Strips
        const r1 = segment.p1Screen.w / 6;
        const r2 = segment.p2Screen.w / 6;
        this.drawPolygon(ctx, segment.p1Screen.x - r1, segment.p1Screen.y, segment.p1Screen.x, segment.p1Screen.y, segment.p2Screen.x, segment.p2Screen.y, segment.p2Screen.x - r2, segment.p2Screen.y, rumbleColor);
        this.drawPolygon(ctx, segment.p1Screen.x + segment.p1Screen.w, segment.p1Screen.y, segment.p1Screen.x + segment.p1Screen.w + r1, segment.p1Screen.y, segment.p2Screen.x + segment.p2Screen.w + r2, segment.p2Screen.y, segment.p2Screen.x + segment.p2Screen.w, segment.p2Screen.y, rumbleColor);

        // --- LANE MARKINGS (Revised for 3 Distinct Lanes) ---
        if (segment.color.lane) {
             const w1 = segment.p1Screen.w;
             const w2 = segment.p2Screen.w;
             
             // Dashed Lane Markers (Dividing lines)
             // Lanes are at -0.33 and +0.33 of half-width W
             const markerW1 = w1 / 32;
             const markerW2 = w2 / 32;

             const leftDividerX1 = segment.p1Screen.x - (w1 / 3);
             const leftDividerX2 = segment.p2Screen.x - (w2 / 3);
             
             const rightDividerX1 = segment.p1Screen.x + (w1 / 3);
             const rightDividerX2 = segment.p2Screen.x + (w2 / 3);

             this.drawPolygon(ctx, leftDividerX1, segment.p1Screen.y, leftDividerX1 + markerW1, segment.p1Screen.y, leftDividerX2 + markerW2, segment.p2Screen.y, leftDividerX2, segment.p2Screen.y, laneColor);
             this.drawPolygon(ctx, rightDividerX1, segment.p1Screen.y, rightDividerX1 + markerW1, segment.p1Screen.y, rightDividerX2 + markerW2, segment.p2Screen.y, rightDividerX2, segment.p2Screen.y, laneColor);

             // --- EDGE LINES (Solid lines defining road boundary) ---
             // To clearly distinguish the outer lanes from the shoulder
             const edgeW1 = w1 / 24; 
             const edgeW2 = w2 / 24;
             
             // Left Edge (Just inside rumble strip)
             // FIX: Adjusted position to be exactly at road edge minus width
             const leftEdgeX1 = segment.p1Screen.x - w1;
             const leftEdgeX2 = segment.p2Screen.x - w2;
             this.drawPolygon(ctx, leftEdgeX1, segment.p1Screen.y, leftEdgeX1 + edgeW1, segment.p1Screen.y, leftEdgeX2 + edgeW2, segment.p2Screen.y, leftEdgeX2, segment.p2Screen.y, '#ffffff');

             // Right Edge
             const rightEdgeX1 = segment.p1Screen.x + w1 - edgeW1;
             const rightEdgeX2 = segment.p2Screen.x + w2 - edgeW2;
             this.drawPolygon(ctx, rightEdgeX1, segment.p1Screen.y, rightEdgeX1 + edgeW1, segment.p1Screen.y, rightEdgeX2 + edgeW2, segment.p2Screen.y, rightEdgeX2, segment.p2Screen.y, '#ffffff');
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
             // FIX: Use car.id instead of segment.index + i to prevent flickering colors
             this.drawSprite(ctx, width, height, width/1000, roadWidth, spriteType, scale, destX, segment.p1Screen.y, segment.clip, ambientLight, car.id, car.offset);
        }
    }

    const speedPercent = opts.cars && opts.cars.length > 0 ? (opts.cars[0].speed / 12000) : 0;
    this.drawPlayerCar(ctx, width, height, width/1000, roadWidth, speedPercent, curve * 2, ambientLight, !!braking); 
  }
}

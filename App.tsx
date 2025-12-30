
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameState, Segment, Particle } from './types';
import { 
    WIDTH, HEIGHT, STEP, SEGMENT_LENGTH, 
    MAX_SPEED, MAX_SPEED_LOW, ACCEL, DECEL, BREAKING, OFF_ROAD_DECEL, 
    OFF_ROAD_LIMIT, CENTRIFUGAL, CAMERA_HEIGHT, CAMERA_DEPTH, ROAD_WIDTH,
    INITIAL_TIME, CHECKPOINT_BONUS, STAGE_LENGTH, VICTORY_DURATION,
    RADIO_CHANNELS
} from './constants';
import { TrackEngine } from './engine/track';
import { Renderer } from './engine/renderer';
import { AudioEngine } from './engine/audio';
import HUD from './components/HUD';
import Menu from './components/Menu';
import StartLights from './components/StartLights';

const STAGE_NAMES: Record<number, string> = {
    1: "COCONUT BEACH",
    2: "SCORCHED DESERT",
    3: "NEON METROPOLIS",
    4: "NORDIC FOREST",
    5: "SYNTHWAVE COAST",
    6: "FINAL HORIZON"
};

const App: React.FC = () => {
    // React State for UI
    const [gameState, setGameState] = useState<GameState>(GameState.MENU);
    const [score, setScore] = useState(0);
    const [speedDisplay, setSpeedDisplay] = useState(0);
    const [channelName, setChannelName] = useState("");
    const [channelIndex, setChannelIndex] = useState(0);
    const [timeLeft, setTimeLeft] = useState(INITIAL_TIME); 
    const [gear, setGear] = useState<'LOW' | 'HIGH'>('LOW');
    const [stage, setStage] = useState(1);
    const [volume, setVolume] = useState(0.6); // 0.0 to 1.0
    const [trafficActive, setTrafficActive] = useState(false);
    
    // Transition State
    const [showStageTransition, setShowStageTransition] = useState<{show: boolean, stage: number, name: string}>({ show: false, stage: 1, name: '' });
    const [transitionOpacity, setTransitionOpacity] = useState(0);

    // Victory State
    const [victoryTimer, setVictoryTimer] = useState(VICTORY_DURATION);

    // Refs for Game Engine
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const trackRef = useRef(new TrackEngine());
    const rendererRef = useRef(new Renderer());
    const audioRef = useRef(new AudioEngine());
    const fireworksRef = useRef<Particle[]>([]);
    
    // Game Loop State
    const stats = useRef({
        position: 0,
        playerX: 0,
        speed: 0,
        score: 0,
        startWait: false,
        skyOffset: 0,
        stageProgress: 0,
        time: 0
    });
    
    const keys = useRef<{ [key: string]: boolean }>({
        ArrowUp: false,
        ArrowDown: false,
        ArrowLeft: false,
        ArrowRight: false,
        KeyZ: false, // Gear shift
        KeyG: false, // Gear shift alternative
        ShiftLeft: false
    });

    const requestRef = useRef<number>(0);

    // Update AudioEngine Stage and Trigger Traffic Announcement
    useEffect(() => {
        audioRef.current.setStage(stage);
        
        if (gameState === GameState.PLAYING) {
            // Trigger traffic announcement 5 seconds into the stage
            const timer = setTimeout(() => {
                audioRef.current.playTrafficAnnouncement(
                    stage,
                    () => setTrafficActive(true),
                    () => setTrafficActive(false)
                );
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [stage, gameState]);

    // Handle Volume Changes
    const handleVolumeChange = (newVol: number) => {
        setVolume(newVol);
        audioRef.current.setMusicVolume(newVol);
    };

    const handleChannelSelect = (index: number) => {
        if (trafficActive) setTrafficActive(false); // Cancel traffic UI if user switches
        audioRef.current.setChannel(index);
        setChannelName(audioRef.current.getCurrentChannelName());
        setChannelIndex(audioRef.current.getCurrentChannelIndex());
    };

    const handleToggleRadio = () => {
        const currentIndex = audioRef.current.getCurrentChannelIndex();
        // If current is NOT OFF (4), switch to OFF (4)
        // If current IS OFF (4), switch to NEON FM (0)
        const offIndex = 4;
        if (currentIndex !== offIndex) {
            audioRef.current.setChannel(offIndex);
        } else {
            audioRef.current.setChannel(0);
        }
        setChannelName(audioRef.current.getCurrentChannelName());
        setChannelIndex(audioRef.current.getCurrentChannelIndex());
        setTrafficActive(false);
    };

    // Input Handling
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (keys.current.hasOwnProperty(e.code)) keys.current[e.code] = true;
            
            if (gameState === GameState.PLAYING) {
                // Radio Controls
                if (e.code === 'Space') {
                    audioRef.current.nextChannel();
                    setChannelName(audioRef.current.getCurrentChannelName());
                    setChannelIndex(audioRef.current.getCurrentChannelIndex());
                    setTrafficActive(false);
                }
                if (e.code === 'Digit1') handleChannelSelect(0);
                if (e.code === 'Digit2') handleChannelSelect(1);
                if (e.code === 'Digit3') handleChannelSelect(2);
                if (e.code === 'Digit4') handleChannelSelect(3);
                // Radio Off switch
                if (e.code === 'Digit0') handleToggleRadio();

                // Gear Shifting
                if (e.code === 'KeyZ' || e.code === 'ShiftLeft' || e.code === 'KeyG') {
                    setGear(prev => prev === 'LOW' ? 'HIGH' : 'LOW');
                }
            }
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            if (keys.current.hasOwnProperty(e.code)) keys.current[e.code] = false;
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [gameState, trafficActive]);

    const updateFireworks = (dt: number) => {
        // Spawn
        if (Math.random() < 0.05) {
            const x = Math.random() * WIDTH;
            const y = Math.random() * (HEIGHT / 2);
            const color = `hsl(${Math.random() * 360}, 100%, 60%)`;
            // Explosion
            for(let i=0; i<50; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = Math.random() * 200;
                fireworksRef.current.push({
                    x, y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    color: color,
                    alpha: 1,
                    life: 1.0 + Math.random(),
                    size: 2 + Math.random() * 2
                });
            }
        }

        // Update
        for(let i = fireworksRef.current.length - 1; i >= 0; i--) {
            const p = fireworksRef.current[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += 100 * dt; // Gravity
            p.alpha -= dt / p.life;
            
            if (p.alpha <= 0) {
                fireworksRef.current.splice(i, 1);
            }
        }
    };

    // Update Logic
    const update = useCallback((dt: number) => {
        stats.current.time += dt;

        if (gameState === GameState.VICTORY) {
            updateFireworks(dt);
            // Slow car to stop
            stats.current.speed = stats.current.speed * 0.95;
            stats.current.position += stats.current.speed * dt;
            
            setVictoryTimer(prev => {
                if (prev <= 0) {
                    setGameState(GameState.MENU);
                    return 0;
                }
                return prev - dt;
            });
            return;
        }

        if (gameState === GameState.STAGE_COMPLETE) {
            // Auto drive during transition
            stats.current.speed = stats.current.speed * 0.98; // Gradual slow down
            stats.current.position += stats.current.speed * dt;
            stats.current.playerX = stats.current.playerX * 0.95; // Center car
            return;
        }

        if (stats.current.startWait) return;

        const track = trackRef.current;
        if (track.segments.length === 0) return;

        // Timer Logic
        if (gameState === GameState.PLAYING) {
            setTimeLeft(prev => {
                const newVal = prev - dt;
                if (newVal <= 0) {
                    setGameState(GameState.GAMEOVER);
                    return 0;
                }
                return newVal;
            });
        }

        const playerSegment = track.segments[Math.floor(stats.current.position / SEGMENT_LENGTH) % track.segments.length];
        const speedPercent = stats.current.speed / MAX_SPEED;

        // Physics
        const dx = dt * 2 * speedPercent; 
        let driftMod = 1.0;
        if (speedPercent > 0.8 && Math.abs(playerSegment.curve) > 2) {
             driftMod = 1.2; 
        }

        if (keys.current.ArrowLeft) stats.current.playerX = stats.current.playerX - dx * driftMod;
        else if (keys.current.ArrowRight) stats.current.playerX = stats.current.playerX + dx * driftMod;

        stats.current.playerX = stats.current.playerX - (dx * speedPercent * playerSegment.curve * CENTRIFUGAL);
        
        // Sky Offset Logic:
        stats.current.skyOffset += (playerSegment.curve * speedPercent);

        const currentMaxSpeed = gear === 'LOW' ? MAX_SPEED_LOW : MAX_SPEED;
        
        if (keys.current.ArrowUp) {
            const accelRate = gear === 'LOW' ? ACCEL * 1.5 : ACCEL;
            if (stats.current.speed < currentMaxSpeed) {
                stats.current.speed = stats.current.speed + accelRate * dt;
            } else {
                 stats.current.speed = stats.current.speed + DECEL * dt; 
            }
        }
        else if (keys.current.ArrowDown) stats.current.speed = stats.current.speed + BREAKING * dt;
        else stats.current.speed = stats.current.speed + DECEL * dt;

        // FIX: Relax off-road limit slightly to allow touching the rumble strip without slowdown
        if ((Math.abs(stats.current.playerX) > 1.2) && stats.current.speed > OFF_ROAD_LIMIT) {
            stats.current.speed = stats.current.speed + OFF_ROAD_DECEL * dt;
        }

        stats.current.playerX = Math.max(-2, Math.min(2, stats.current.playerX));
        stats.current.speed = Math.max(0, stats.current.speed); 

        stats.current.position += stats.current.speed * dt;
        stats.current.score += (stats.current.speed * dt) / 100;

        // Traffic AI Logic
        const trackLen = track.getLength();
        
        for(let i = 0; i < track.npcCars.length; i++) {
            const car = track.npcCars[i];
            
            let targetSpeed = 6000; // Default cruising speed
            let acceleration = 0;

            // 1. Look ahead for other cars to avoid bunching
            for(let j = 0; j < track.npcCars.length; j++) {
                if (i === j) continue;
                const other = track.npcCars[j];
                
                // If in same lane roughly
                if (Math.abs(car.offset - other.offset) < 0.3) {
                    let dist = other.z - car.z;
                    // Handle wrap-around
                    if (dist < -trackLen / 2) dist += trackLen;
                    if (dist > trackLen / 2) dist -= trackLen;

                    // If other car is ahead and close (< 600 units)
                    if (dist > 0 && dist < 600) {
                        // Brake proportional to distance to maintain gap
                        acceleration = -2000 * (1 - dist/600); 
                    }
                }
            }

            // 2. Look ahead for player to avoid crashing into back of player (if player is slow)
            const playerZRel = stats.current.position % trackLen;
             if (Math.abs(car.offset - stats.current.playerX) < 0.3) {
                 let distToPlayer = playerZRel - car.z;
                 if (distToPlayer < -trackLen / 2) distToPlayer += trackLen;
                 if (distToPlayer > trackLen / 2) distToPlayer -= trackLen;

                 // If player is ahead and close
                 if (distToPlayer > 0 && distToPlayer < 800) {
                      acceleration = -3000; 
                 }
             }
             
            // 3. Apply AI speed adjustments
            if (acceleration === 0) {
                 // If clear, slowly drift towards target cruising speed
                 if (car.speed < targetSpeed) acceleration = 500;
                 else if (car.speed > targetSpeed) acceleration = -200;
                 
                 // Add some random noise for realism
                 if (Math.random() > 0.98) acceleration += (Math.random() * 1000 - 500);
            }

            car.speed += acceleration * dt;
            // Clamp speeds
            car.speed = Math.max(2000, Math.min(9000, car.speed));

            // Move Car
            car.z += car.speed * dt;
            if (car.z > trackLen) car.z -= trackLen;
            if (car.z < 0) car.z += trackLen;

            // 4. Collision Check with Player
            let distToPlayerCheck = car.z - playerZRel;
            if (distToPlayerCheck > trackLen / 2) distToPlayerCheck -= trackLen;
            if (distToPlayerCheck < -trackLen / 2) distToPlayerCheck += trackLen;

            // Simple collision box
            if (Math.abs(distToPlayerCheck) < SEGMENT_LENGTH) {
                 // FIX: Tighten collision width to allow closer overtakes (0.25 -> 0.18)
                 // This prevents "phantom" braking when driving near a car in adjacent lane
                 if (Math.abs(car.offset - stats.current.playerX) < 0.18) {
                      stats.current.speed = stats.current.speed * 0.98; // Bump Player
                      car.speed += 200; // Small feedback to NPC
                 }
            }
        }

        // Checkpoint / Stage Complete Logic
        if (stats.current.position >= trackLen) {
            stats.current.position -= trackLen; 
            
            if (stage < 6) {
                // Play Sound
                audioRef.current.playCheckpointSound();
                
                // Add Bonus Time
                setTimeLeft(prev => prev + CHECKPOINT_BONUS);
                
                // Transition Sequence
                setGameState(GameState.STAGE_COMPLETE);
                
                // 1. Fade Out
                setTransitionOpacity(1);
                const nextStage = stage + 1;
                
                setShowStageTransition({
                    show: true,
                    stage: nextStage,
                    name: STAGE_NAMES[nextStage] || `STAGE ${nextStage}`
                });

                // 2. Wait for Fade, then Swap Road
                setTimeout(() => {
                    setStage(nextStage);
                    track.resetRoad(nextStage);
                    
                    // Reset position/player for new stage
                    stats.current.position = 0;
                    stats.current.playerX = 0;
                    
                    // 3. Fade In
                    setTransitionOpacity(0);
                    setGameState(GameState.PLAYING);
                    
                    // Hide overlay
                    setTimeout(() => {
                        setShowStageTransition(prev => ({...prev, show: false}));
                    }, 1000);

                }, 2000);

            } else {
                // Game Completed (End of Stage 6)
                setGameState(GameState.VICTORY); 
                setVictoryTimer(VICTORY_DURATION);
                // Trigger transition animation logic via renderer params (TimeOfDay)
            }
        }
        
        audioRef.current.setEnginePitch(stats.current.speed);
    }, [gameState, gear, stage]);

    // Draw Logic
    const draw = useCallback(() => {
        if (!canvasRef.current) return;
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        const track = trackRef.current;
        if (track.segments.length === 0) return;

        const width = canvasRef.current.width;
        const height = canvasRef.current.height;
        const totalSegments = track.segments.length;
        const baseIndex = Math.floor(stats.current.position / SEGMENT_LENGTH) % totalSegments;
        const baseSegment = track.segments[baseIndex];
        const loopLength = track.getLength();

        if (!baseSegment) return; 

        // Assign cars
        track.segments.forEach(s => s.cars = []);
        track.npcCars.forEach(car => {
             const segIdx = Math.floor(car.z / SEGMENT_LENGTH) % totalSegments;
             if(track.segments[segIdx]) track.segments[segIdx].cars.push(car);
        });

        const viewableSegments: Segment[] = [];
        for(let i = 0; i < 300; i++) {
            const idx = (baseIndex + i) % totalSegments;
            const segment = track.segments[idx];
            
            // Fix loop rendering logic
            let loopedZ = segment.p1.z;
            
            if (idx < baseIndex) {
                loopedZ += loopLength;
            }
            
            viewableSegments.push({
                ...segment,
                p1: { ...segment.p1, z: loopedZ },
                p2: { ...segment.p2, z: loopedZ + SEGMENT_LENGTH }
            });
        }

        // Fast Cycle: 60 seconds per full day/night loop
        let cycle = (stats.current.time % 60) / 60; 
        
        // Victory Cycle (Rapid Sunset to Night)
        if (gameState === GameState.VICTORY) {
            // Mapping timer to cycle. Timer goes 150 -> 0.
            // We want TimeOfDay to go 0.5 (Day) -> 0.75 (Night) very fast, then stay
            const elapsed = VICTORY_DURATION - victoryTimer;
            if (elapsed < 5) {
                // First 5 seconds: Sunset
                cycle = 0.5 + (elapsed / 5) * 0.25; 
            } else {
                // Night
                cycle = 0.8;
            }
        }

        const playerPercent = (stats.current.position % SEGMENT_LENGTH) / SEGMENT_LENGTH;
        const currentBaseY = baseSegment.p1.y + (baseSegment.p2.y - baseSegment.p1.y) * playerPercent;
        const dynamicCameraHeight = CAMERA_HEIGHT + currentBaseY;

        rendererRef.current.render({
            ctx,
            width,
            height,
            segments: viewableSegments,
            baseSegment,
            playerX: stats.current.playerX,
            playerZ: stats.current.position, 
            cameraHeight: dynamicCameraHeight,
            cameraDepth: CAMERA_DEPTH,
            roadWidth: ROAD_WIDTH,
            trackLength: track.getLength(),
            cars: [{ offset: 0, z: 0, speed: stats.current.speed, sprite: '', id: -1 }], 
            background: { skyOffset: stats.current.skyOffset, timeOfDay: cycle },
            curve: baseSegment.curve,
            stage: stage,
            fireworks: gameState === GameState.VICTORY ? fireworksRef.current : [],
            braking: keys.current.ArrowDown // Pass braking state
        });

        if (Math.floor(stats.current.time * 60) % 5 === 0) { 
             setSpeedDisplay(stats.current.speed);
             setScore(Math.floor(stats.current.score));
        }
    }, [stage, gameState, victoryTimer]);

    // Game Loop Effect
    useEffect(() => {
        // Add STAGE_COMPLETE to allowed loop states
        if (gameState !== GameState.PLAYING && gameState !== GameState.START && gameState !== GameState.VICTORY && gameState !== GameState.STAGE_COMPLETE) return;

        let animationFrameId: number;

        const loop = () => {
            animationFrameId = requestAnimationFrame(loop);
            update(STEP);
            draw();
        };
        
        loop();

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [gameState, update, draw]);

    const startGame = () => {
        trackRef.current.resetRoad(1);
        // Explicitly set playerX to 0 (Center)
        stats.current = { position: 0, playerX: 0, speed: 0, score: 0, startWait: true, skyOffset: 0, stageProgress: 0, time: 0 };
        fireworksRef.current = [];
        setTimeLeft(INITIAL_TIME);
        setStage(1);
        setScore(0);
        setTransitionOpacity(0);
        setShowStageTransition({ show: false, stage: 1, name: '' });
        
        audioRef.current.init();
        audioRef.current.playMusic();
        audioRef.current.setMusicVolume(volume); // Set initial volume
        setChannelName(audioRef.current.getCurrentChannelName());
        setChannelIndex(audioRef.current.getCurrentChannelIndex());

        setGameState(GameState.START);
    };

    const handleLightsOut = () => {
        stats.current.startWait = false;
        setGameState(GameState.PLAYING);
    };

    const handleBeep = (stage: number) => {
        audioRef.current.playCountdownTone(stage);
    };

    // Initial Black Screen
    useEffect(() => {
        if (canvasRef.current && gameState === GameState.MENU) {
             const ctx = canvasRef.current.getContext('2d');
             if(ctx) {
                 ctx.fillStyle = '#050510';
                 ctx.fillRect(0,0, WIDTH, HEIGHT);
             }
        }
    }, [gameState]);

    return (
        <div className="relative w-full h-screen bg-black flex items-center justify-center overflow-hidden">
            <canvas 
                ref={canvasRef} 
                width={WIDTH} 
                height={HEIGHT} 
                className="w-full h-full object-contain bg-black shadow-2xl"
            />
            
            {/* FULL SCREEN TRANSITION OVERLAY */}
            <div 
                className="absolute inset-0 bg-black pointer-events-none z-40 flex items-center justify-center transition-opacity duration-[2000ms]"
                style={{ opacity: transitionOpacity }}
            >
                 {showStageTransition.show && (
                    <div className="text-center animate-pulse">
                         <h3 className="text-3xl text-yellow-400 font-bold tracking-[0.5em] italic mb-4 drop-shadow-[0_0_10px_rgba(255,255,0,0.8)]">
                            STAGE COMPLETED
                        </h3>
                        <h1 className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-white to-pink-500 drop-shadow-[0_0_20px_rgba(0,255,255,0.8)] font-orbitron skew-x-[-10deg]">
                            {showStageTransition.name}
                        </h1>
                        <div className="mt-8 inline-block px-6 py-2 border-2 border-white/50 rounded bg-black/50 text-white font-mono animate-bounce">
                             EXTENDED PLAY +{CHECKPOINT_BONUS}"
                        </div>
                    </div>
                )}
            </div>

            {gameState === GameState.VICTORY && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-50">
                     <h1 className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-red-600 drop-shadow-[0_0_20px_rgba(255,215,0,0.8)] font-orbitron animate-pulse">
                         GAME OVER
                     </h1>
                     <h2 className="text-4xl text-cyan-400 font-bold mt-4 drop-shadow-[0_0_10px_rgba(0,255,255,0.8)]">
                         CONGRATULATIONS
                     </h2>
                 </div>
            )}

            {gameState === GameState.MENU && (
                <Menu onStart={startGame} gameOver={false} score={score} />
            )}
            
            {gameState === GameState.GAMEOVER && (
                 <Menu onStart={startGame} gameOver={true} score={score} />
            )}

            {gameState === GameState.START && (
                <>
                    <HUD 
                        speed={0} score={0} time={timeLeft} channelName={channelName} channelIndex={channelIndex} gear={gear} stage={stage} 
                        onVolumeChange={handleVolumeChange} onToggleRadio={handleToggleRadio} volume={volume}
                        trafficActive={false} onChannelSelect={handleChannelSelect}
                    />
                    <StartLights onComplete={handleLightsOut} onBeep={handleBeep} />
                </>
            )}

            {gameState === GameState.PLAYING && (
                <HUD 
                    speed={speedDisplay} score={score} time={timeLeft} channelName={channelName} channelIndex={channelIndex} gear={gear} stage={stage}
                    onVolumeChange={handleVolumeChange} onToggleRadio={handleToggleRadio} volume={volume}
                    trafficActive={trafficActive} onChannelSelect={handleChannelSelect}
                />
            )}
        </div>
    );
};

export default App;

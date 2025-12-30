
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameState, Segment } from './types';
import { 
    WIDTH, HEIGHT, STEP, SEGMENT_LENGTH, 
    MAX_SPEED, MAX_SPEED_LOW, ACCEL, DECEL, BREAKING, OFF_ROAD_DECEL, 
    OFF_ROAD_LIMIT, CENTRIFUGAL, CAMERA_HEIGHT, CAMERA_DEPTH, ROAD_WIDTH,
    INITIAL_TIME, CHECKPOINT_BONUS, STAGE_LENGTH
} from './constants';
import { TrackEngine } from './engine/track';
import { Renderer } from './engine/renderer';
import { AudioEngine } from './engine/audio';
import HUD from './components/HUD';
import Menu from './components/Menu';
import StartLights from './components/StartLights';

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

    // Refs for Game Engine
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const trackRef = useRef(new TrackEngine());
    const rendererRef = useRef(new Renderer());
    const audioRef = useRef(new AudioEngine());
    
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
                audioRef.current.playTrafficAnnouncement(stage);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [stage, gameState]);

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
                }
                if (e.code === 'Digit1') { audioRef.current.setChannel(0); setChannelName(audioRef.current.getCurrentChannelName()); setChannelIndex(0); }
                if (e.code === 'Digit2') { audioRef.current.setChannel(1); setChannelName(audioRef.current.getCurrentChannelName()); setChannelIndex(1); }
                if (e.code === 'Digit3') { audioRef.current.setChannel(2); setChannelName(audioRef.current.getCurrentChannelName()); setChannelIndex(2); }
                if (e.code === 'Digit4') { audioRef.current.setChannel(3); setChannelName(audioRef.current.getCurrentChannelName()); setChannelIndex(3); }

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
    }, [gameState]);

    // Update Logic
    const update = useCallback((dt: number) => {
        stats.current.time += dt;

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

        if ((stats.current.playerX < -1 || stats.current.playerX > 1) && stats.current.speed > OFF_ROAD_LIMIT) {
            stats.current.speed = stats.current.speed + OFF_ROAD_DECEL * dt;
        }

        stats.current.playerX = Math.max(-2, Math.min(2, stats.current.playerX));
        stats.current.speed = Math.max(0, stats.current.speed); 

        stats.current.position += stats.current.speed * dt;
        stats.current.score += (stats.current.speed * dt) / 100;

        // Traffic
        for(const car of track.npcCars) {
            car.z += car.speed * dt;
            if (car.z > track.getLength()) car.z -= track.getLength();

            const playerPosRel = stats.current.position % track.getLength();
            // Collision roughly
            if (car.z > playerPosRel - SEGMENT_LENGTH && car.z < playerPosRel + SEGMENT_LENGTH) {
                 // FIX: Reduce collision width from 0.8 to 0.25 to prevent phantom slowing
                 if (Math.abs(car.offset - stats.current.playerX) < 0.25) {
                      stats.current.speed = stats.current.speed * 0.98; // Bump
                 }
            }
        }

        const trackLen = track.getLength();
        // Checkpoint / Stage Complete Logic
        if (stats.current.position >= trackLen) {
            
            // Check if player has time left (which they must if we are here in PLAYING state)
            // Move to next stage
            stats.current.position -= trackLen; 
            
            if (stage < 5) {
                // Play Sound
                audioRef.current.playCheckpointSound();
                
                // Add Bonus Time
                setTimeLeft(prev => prev + CHECKPOINT_BONUS);
                
                // Advance Stage
                const nextStage = stage + 1;
                setStage(nextStage);
                
                // Generate new road for next stage
                track.resetRoad(nextStage);
            } else {
                // Game Completed (5 stages)
                // For now, simple loop or game over with win
                setGameState(GameState.GAMEOVER); 
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
        const cycle = (stats.current.time % 60) / 60; 

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
            cars: [{ offset: 0, z: 0, speed: stats.current.speed, sprite: '' }], 
            background: { skyOffset: stats.current.skyOffset, timeOfDay: cycle },
            curve: baseSegment.curve,
            stage: stage
        });

        if (Math.floor(stats.current.time * 60) % 5 === 0) { 
             setSpeedDisplay(stats.current.speed);
             setScore(Math.floor(stats.current.score));
        }
    }, [stage]);

    // Game Loop Effect
    useEffect(() => {
        if (gameState !== GameState.PLAYING && gameState !== GameState.START) return;

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
        setTimeLeft(INITIAL_TIME);
        setStage(1);
        setScore(0);
        
        audioRef.current.init();
        audioRef.current.playMusic();
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
            
            {gameState === GameState.MENU && (
                <Menu onStart={startGame} gameOver={false} score={score} />
            )}
            
            {gameState === GameState.GAMEOVER && (
                 <Menu onStart={startGame} gameOver={true} score={score} />
            )}

            {gameState === GameState.START && (
                <>
                    <HUD speed={0} score={0} time={timeLeft} channelName={channelName} channelIndex={channelIndex} gear={gear} stage={stage} />
                    <StartLights onComplete={handleLightsOut} onBeep={handleBeep} />
                </>
            )}

            {gameState === GameState.PLAYING && (
                <HUD speed={speedDisplay} score={score} time={timeLeft} channelName={channelName} channelIndex={channelIndex} gear={gear} stage={stage} />
            )}
        </div>
    );
};

export default App;
import React, { useEffect, useState } from 'react';
import MusicVisualizer from './MusicVisualizer';
import { RADIO_CHANNELS } from '../constants';

interface HUDProps {
    speed: number;
    score: number;
    time: number;
    channelName: string;
    channelIndex: number;
    gear: 'LOW' | 'HIGH';
    stage: number;
}

const HUD: React.FC<HUDProps> = ({ speed, score, time, channelName, channelIndex, gear, stage }) => {
    // Checkpoint Flash State
    const [flashCheckpoint, setFlashCheckpoint] = useState(false);

    useEffect(() => {
        if (stage > 1) {
            setFlashCheckpoint(true);
            const t = setTimeout(() => setFlashCheckpoint(false), 3000);
            return () => clearTimeout(t);
        }
    }, [stage]);

    // Speed display mapping (0-12000 -> 0-293 km/h)
    const displaySpeed = Math.floor((speed / 12000) * 293);
    
    // RPM Calculation: 0 to 10000 RPM
    // Max RPM depends on Gear. 
    // Low Gear: Max speed 170 ~ 7000 RPM (Redline)
    // High Gear: Max speed 293 ~ 9000 RPM (Redline)
    const maxSpeedForGear = gear === 'LOW' ? 170 : 293;
    const rpmBase = (displaySpeed / maxSpeedForGear) * 8000;
    const rpmJitter = Math.random() * 50;
    const rpm = Math.min(10000, Math.max(800, rpmBase + rpmJitter)); // Idle at 800
    
    // Gauge Logic
    // 0 RPM = -135deg, 10000 RPM = +45deg (180deg sweep)
    const rpmRotation = -135 + (rpm / 10000) * 180;

    const timeColor = time < 10 ? 'text-red-500 animate-pulse' : 'text-cyan-400';

    return (
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none p-4 flex flex-col justify-between z-10 text-white font-orbitron">
            
            {/* CHECKPOINT FLASH MESSAGE */}
            {flashCheckpoint && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center animate-bounce z-50">
                    <h2 className="text-5xl font-black text-yellow-400 drop-shadow-[0_0_10px_rgba(255,0,0,1)] italic">CHECKPOINT!</h2>
                    <p className="text-2xl text-white mt-2">TIME EXTENDED</p>
                </div>
            )}

            {/* Top Bar */}
            <div className="flex justify-between items-start">
                <div className="flex flex-col gap-2">
                    <div className="bg-black/60 backdrop-blur-sm p-3 border-l-4 border-pink-500 rounded-r-xl w-48 shadow-lg">
                        <div className="text-xs text-pink-300 uppercase tracking-widest mb-1">Score</div>
                        <div className="text-2xl font-bold text-pink-500 tracking-wider font-mono">
                            {score.toString().padStart(7, '0')}
                        </div>
                    </div>
                    <div className="bg-black/60 backdrop-blur-sm p-2 border-l-4 border-yellow-500 rounded-r-xl w-36 shadow-lg">
                         <div className="text-[10px] text-yellow-300 uppercase">Stage</div>
                         <div className="text-xl font-bold text-yellow-500">
                             {stage} <span className="text-sm text-yellow-700">/ 5</span>
                         </div>
                    </div>
                </div>

                <div className="bg-black/60 backdrop-blur-sm p-3 border-r-4 border-cyan-500 rounded-l-xl text-right min-w-[140px] shadow-lg">
                    <div className="text-xs text-cyan-300 uppercase tracking-widest mb-1">Time Extension</div>
                    <div className={`text-5xl font-black drop-shadow-[0_0_8px_rgba(0,255,255,0.6)] ${timeColor} font-mono`}>
                        {Math.ceil(time)}<span className="text-lg">"</span>
                    </div>
                </div>
            </div>

            {/* Bottom Bar (Dashboard) */}
            <div className="flex justify-between items-end pb-4">
                
                {/* Car Stereo UI */}
                <div className="pointer-events-auto bg-gray-900 border-2 border-gray-600 rounded-lg p-3 w-72 shadow-2xl flex flex-col gap-2 relative overflow-hidden">
                    {/* Glossy Overlay */}
                    <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/10 to-transparent pointer-events-none"></div>

                    <div className="flex justify-between items-center border-b border-gray-700 pb-2 mb-1">
                        <div className="text-xs text-gray-400 font-bold tracking-widest">NEON FM</div>
                        <div className="flex gap-1">
                             <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_5px_red]"></div>
                             <div className="text-[10px] text-red-400">STEREO</div>
                        </div>
                    </div>

                    {/* Display Screen */}
                    <div className="bg-[#1a1a2e] border border-gray-700 rounded p-2 mb-2 relative overflow-hidden h-16 flex flex-col justify-center">
                         <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-0 bg-[length:100%_2px,3px_100%] pointer-events-none"></div>
                         <div className="relative z-10 flex justify-between items-end">
                            <div>
                                <div className="text-xs text-cyan-300 font-mono mb-1">CH-{channelIndex + 1} MEMORY</div>
                                <div className="text-xl text-yellow-300 font-bold tracking-wider drop-shadow-[0_0_5px_rgba(253,224,71,0.5)]">
                                    {channelIndex < RADIO_CHANNELS.length ? RADIO_CHANNELS[channelIndex].freq : '---'}
                                </div>
                            </div>
                            <div className="w-24 h-8 opacity-80">
                                <MusicVisualizer active={true} />
                            </div>
                         </div>
                         <div className="relative z-10 text-[10px] text-pink-400 truncate mt-1 font-mono uppercase">
                             {channelName}
                         </div>
                    </div>

                    {/* Preset Buttons */}
                    <div className="grid grid-cols-4 gap-2">
                        {[0, 1, 2, 3].map(idx => (
                            <div key={idx} className={`h-8 rounded flex items-center justify-center text-xs font-bold border-b-2 transition-all shadow-inner
                                ${channelIndex === idx 
                                    ? 'bg-cyan-600 text-white border-cyan-800 shadow-[inset_0_0_10px_rgba(34,211,238,0.5)]' 
                                    : 'bg-gray-800 text-gray-400 border-gray-950'
                                }
                            `}>
                                {idx + 1}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Dashboard Cluster */}
                <div className="relative flex gap-6 items-end mr-8">
                    
                    {/* Gear Indicator */}
                    <div className="flex flex-col gap-1 mb-8 bg-black/50 p-2 rounded border border-gray-700">
                        <div className={`px-4 py-1 rounded border font-bold text-center text-sm transition-colors ${gear === 'HIGH' ? 'bg-red-900/80 border-red-500 text-red-100 shadow-[0_0_10px_red]' : 'bg-gray-900 border-gray-800 text-gray-700'}`}>
                            H
                        </div>
                        <div className={`px-4 py-1 rounded border font-bold text-center text-sm transition-colors ${gear === 'LOW' ? 'bg-green-900/80 border-green-500 text-green-100 shadow-[0_0_10px_green]' : 'bg-gray-900 border-gray-800 text-gray-700'}`}>
                            L
                        </div>
                    </div>

                    {/* Tachometer (RPM) */}
                    <div className="relative w-56 h-56">
                        {/* Housing */}
                        <div className="w-full h-full bg-gray-900 rounded-full border-8 border-gray-800 shadow-2xl relative overflow-hidden">
                             {/* Face */}
                             <div className="absolute inset-2 rounded-full bg-black border border-gray-700">
                                {/* Ticks */}
                                {[...Array(11)].map((_, i) => {
                                    const rot = -135 + (i * 18); // 180 deg spread / 10
                                    const isRedline = i >= 8;
                                    return (
                                        <div key={i} className="absolute w-full h-full" style={{ transform: `rotate(${rot}deg)` }}>
                                            <div className={`absolute top-2 left-1/2 -translate-x-1/2 w-1 h-3 ${isRedline ? 'bg-red-500' : 'bg-white'}`}></div>
                                            {/* Subticks */}
                                            {i < 10 && <div className="absolute top-2 left-1/2 -translate-x-1/2 w-0.5 h-1.5 bg-gray-500" style={{ transformOrigin: '50% 102px', transform: `rotate(9deg)` }}></div>}
                                            {/* Numbers */}
                                            <div className={`absolute top-6 left-1/2 -translate-x-1/2 text-lg font-bold ${isRedline ? 'text-red-500' : 'text-white'}`} style={{ transform: `rotate(${-rot}deg)` }}>
                                                {i}
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Labels */}
                                <div className="absolute top-2/3 left-1/2 -translate-x-1/2 text-center">
                                    <div className="text-xs text-gray-400 font-bold">x1000</div>
                                    <div className="text-[10px] text-gray-600">RPM</div>
                                </div>
                                
                                {/* Digital Speed inset */}
                                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-gray-800 px-3 py-1 rounded border border-gray-600">
                                    <span className="text-2xl font-mono text-cyan-400 font-bold">{Math.abs(displaySpeed)}</span>
                                    <span className="text-[8px] text-gray-400 ml-1">KM/H</span>
                                </div>
                             </div>

                             {/* Needle */}
                             <div 
                                className="absolute w-1.5 h-24 bg-orange-500 origin-bottom left-[calc(50%-3px)] top-[calc(50%-96px)] rounded-t-full shadow-[0_0_5px_orange] transition-transform duration-100 ease-linear"
                                style={{ transformOrigin: '50% 100%', transform: `rotate(${rpmRotation}deg)` }}
                             ></div>
                             
                             {/* Center Cap */}
                             <div className="absolute top-1/2 left-1/2 w-6 h-6 bg-gray-800 rounded-full -translate-x-1/2 -translate-y-1/2 border-2 border-gray-600 shadow-lg"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HUD;
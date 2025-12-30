
import React, { useEffect, useState } from 'react';
import MusicVisualizer from './MusicVisualizer';
import SegmentDisplay from './SegmentDisplay';
import { RADIO_CHANNELS } from '../constants';

interface HUDProps {
    speed: number;
    score: number;
    time: number;
    channelName: string;
    channelIndex: number;
    gear: 'LOW' | 'HIGH';
    stage: number;
    volume?: number;
    onVolumeChange?: (vol: number) => void;
    onToggleRadio?: () => void;
    trafficActive?: boolean;
    onChannelSelect?: (index: number) => void;
}

const HUD: React.FC<HUDProps> = ({ 
    speed, score, time, channelName, channelIndex, gear, stage, volume = 0.6, 
    onVolumeChange, onToggleRadio, trafficActive, onChannelSelect 
}) => {
    // Checkpoint Flash State
    const [flashCheckpoint, setFlashCheckpoint] = useState(false);

    useEffect(() => {
        if (stage > 1) {
            setFlashCheckpoint(true);
            const t = setTimeout(() => setFlashCheckpoint(false), 3000);
            return () => clearTimeout(t);
        }
    }, [stage]);

    // Handle Volume Wheel
    const handleWheel = (e: React.WheelEvent) => {
        if (onVolumeChange) {
            // Scroll Up = Vol Up, Down = Vol Down
            const delta = e.deltaY < 0 ? 0.05 : -0.05;
            onVolumeChange(Math.max(0, Math.min(1, volume + delta)));
        }
    };

    // Speed display mapping (0-12000 -> 0-293 km/h)
    const displaySpeed = Math.floor((speed / 12000) * 293);
    
    // RPM Calculation
    const maxSpeedForGear = gear === 'LOW' ? 170 : 293;
    const rpmBase = (displaySpeed / maxSpeedForGear) * 8000;
    const rpmJitter = Math.random() * 50;
    const rpm = Math.min(10000, Math.max(800, rpmBase + rpmJitter)); 
    
    // Gauge Logic
    const rpmRotation = -135 + (rpm / 10000) * 180;
    const knobRotation = -135 + (volume * 270);

    const timeColor = time < 10 ? 'text-red-500 animate-pulse' : 'text-cyan-400';

    // Helper for channel freq
    const freqDisplay = channelIndex < 4 ? RADIO_CHANNELS[channelIndex].freq : '---';
    // Helper for station name/status
    const stationDisplay = channelIndex === 4 ? 'STANDBY' : channelName;

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
                
                {/* CAR RADIO UI */}
                <div className="pointer-events-auto bg-gray-900 border-4 border-gray-800 rounded-lg w-80 shadow-2xl flex flex-col relative overflow-hidden font-sans">
                    {/* Brand Header */}
                    <div className="bg-gray-800 px-3 py-1 flex justify-between items-center border-b border-gray-950">
                        <span className="text-[10px] tracking-[0.2em] font-bold text-gray-400 italic font-orbitron">BLASTPUNKT</span>
                        <div className="flex gap-1">
                             <div className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></div>
                             <span className="text-[8px] text-gray-500">STEREO</span>
                        </div>
                    </div>

                    {/* Main Panel */}
                    <div className="p-3 bg-[#111] relative">
                         
                         {/* LCD Display */}
                        <div 
                            className="bg-[#05111a] border-2 border-gray-700 rounded mb-3 relative overflow-hidden h-20 flex flex-col justify-between p-2 shadow-[inset_0_0_15px_rgba(0,0,0,1)]"
                        >
                             {/* LCD Grid Background Effect */}
                             <div className="absolute inset-0 pointer-events-none opacity-10" style={{ 
                                 backgroundImage: 'linear-gradient(rgba(0, 255, 0, 0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 0, 0.8) 1px, transparent 1px)', 
                                 backgroundSize: '4px 4px' 
                             }}></div>
                             
                             <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-white/5 to-transparent opacity-20 animate-pulse"></div>

                             {/* Top Row: Info */}
                             <div className="relative z-10 flex justify-between items-start leading-none h-6">
                                {/* Frequency - Segment Display */}
                                <SegmentDisplay 
                                    text={freqDisplay} 
                                    size={10} 
                                    color="#22d3ee" 
                                    dimColor="#164e63" 
                                />

                                <div className="flex items-center gap-2">
                                    {/* TA/TP Indicators on LCD */}
                                    <div className="flex gap-1 mr-1">
                                        <div className={`text-[10px] px-0.5 font-mono ${trafficActive ? 'text-red-500 font-bold animate-pulse drop-shadow-[0_0_8px_red]' : 'text-cyan-900'}`}>TP</div>
                                        <div className={`text-[10px] px-0.5 font-mono ${trafficActive ? 'text-red-500 font-bold animate-pulse drop-shadow-[0_0_8px_red]' : 'text-cyan-900'}`}>TA</div>
                                    </div>

                                    <span className="text-[10px] border border-cyan-800 px-1 rounded text-cyan-500 font-mono">RDS</span>
                                    <div className="w-12 h-4 opacity-80">
                                        <MusicVisualizer active={channelIndex < 4} />
                                    </div>
                                </div>
                             </div>

                             {/* Middle Row: Track Name (Marquee-ish) - Keep as pixel font for scrolling text */}
                             <div className="relative z-10 overflow-hidden whitespace-nowrap my-1">
                                <span 
                                    className={`text-xl tracking-wider uppercase font-['VT323'] ${trafficActive ? 'text-red-500 animate-pulse font-bold drop-shadow-[0_0_8px_rgba(255,0,0,0.8)]' : 'text-yellow-300 drop-shadow-[0_0_5px_rgba(253,224,71,0.8)]'}`}
                                >
                                    {channelIndex === 4 
                                        ? "SYSTEM OFF" 
                                        : (trafficActive ? "*** LIIKENNETIEDOTE ***" : RADIO_CHANNELS[channelIndex].track)
                                    }
                                </span>
                             </div>
                             
                             {/* Bottom Row: Channel Name - Segment Display */}
                             <div className="relative z-10 flex items-end">
                                 <SegmentDisplay 
                                    text={stationDisplay} 
                                    size={14} 
                                    color="#ec4899" 
                                    dimColor="#831843"
                                 />
                             </div>
                        </div>

                        {/* Controls Row */}
                        <div className="flex justify-between items-center">
                            {/* Preset Buttons */}
                            <div className="grid grid-cols-4 gap-1 w-48">
                                {[0, 1, 2, 3].map(idx => (
                                    <div 
                                        key={idx} 
                                        onClick={() => onChannelSelect && onChannelSelect(idx)}
                                        className={`h-6 rounded-sm flex items-center justify-center text-[10px] font-bold border-b-2 cursor-pointer transition-all active:scale-95 font-mono select-none
                                        ${channelIndex === idx 
                                            ? 'bg-cyan-700 text-white border-cyan-900 shadow-[inset_0_0_5px_rgba(0,0,0,0.5)]' 
                                            : 'bg-gray-700 text-gray-300 border-gray-950 hover:bg-gray-600'
                                        }
                                    `}>
                                        {idx + 1}
                                    </div>
                                ))}
                            </div>

                            {/* Volume Knob */}
                            <div 
                                className="relative w-10 h-10 rounded-full bg-gradient-to-br from-gray-600 to-gray-900 shadow-lg border border-gray-950 cursor-pointer group active:scale-95"
                                onWheel={handleWheel}
                                onClick={onToggleRadio}
                                title="Scroll to Volume, Click to Power"
                            >
                                {/* Marker Line */}
                                <div 
                                    className="absolute w-1 h-3 bg-white top-1 left-1/2 -translate-x-1/2 origin-[50%_16px]"
                                    style={{ transform: `rotate(${knobRotation}deg)` }}
                                ></div>
                                {/* Center Cap */}
                                <div className="absolute top-1/2 left-1/2 w-4 h-4 bg-gray-800 rounded-full -translate-x-1/2 -translate-y-1/2 border border-gray-600"></div>
                            </div>
                        </div>
                    </div>

                    {/* Cassette Deck */}
                    <div className="bg-gray-800 h-16 border-t border-gray-950 p-2 flex items-center justify-center relative">
                        {/* Slot */}
                        <div className="w-full h-8 bg-black rounded border-b border-gray-700 shadow-[inset_0_2px_5px_rgba(0,0,0,0.8)] flex items-center justify-center relative overflow-hidden group">
                            {/* Door */}
                            <div className="w-[90%] h-[80%] bg-[#111] border border-gray-800 rounded flex items-center justify-between px-4 relative">
                                <span className="text-[6px] text-gray-500 font-mono">AUTO REVERSE</span>
                                
                                {/* Cassette Branding */}
                                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                                    <span className="text-[10px] text-transparent bg-clip-text bg-gradient-to-b from-gray-400 to-gray-600 font-black tracking-[0.25em] font-sans italic drop-shadow-[0_1px_0_rgba(255,255,255,0.1)]">
                                        CASSETTE
                                    </span>
                                </div>

                                <div className="w-12 h-1 bg-gray-900 rounded-full"></div>
                            </div>
                        </div>
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

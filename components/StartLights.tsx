import React, { useEffect, useState } from 'react';

interface Props {
    onComplete: () => void;
    onBeep: (stage: number) => void;
}

const StartLights: React.FC<Props> = ({ onComplete, onBeep }) => {
    const [stage, setStage] = useState(0);

    useEffect(() => {
        const timers: number[] = [];
        
        // 3...
        timers.push(window.setTimeout(() => { 
            setStage(1); 
            onBeep(1); 
        }, 1000));
        
        // 2...
        timers.push(window.setTimeout(() => { 
            setStage(2); 
            onBeep(2); 
        }, 2000));
        
        // 1... (Green/Go visual, typically games do Red Red Green or R Y G)
        timers.push(window.setTimeout(() => { 
            setStage(3); 
            onBeep(3); // High pitch here
        }, 3000)); 

        // Start Game
        timers.push(window.setTimeout(() => onComplete(), 4000)); 

        return () => timers.forEach(clearTimeout);
    }, [onComplete, onBeep]);

    const getLightClass = (active: boolean, color: string) => 
        `w-16 h-16 rounded-full border-4 border-gray-800 transition-all duration-200 ${active ? `bg-${color}-500 shadow-[0_0_30px_rgba(255,255,255,0.8)] scale-110` : 'bg-gray-900 opacity-50'}`;

    if (stage > 3) return null;

    return (
        <div className="absolute top-1/4 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-40 bg-black/80 p-6 rounded-xl border border-gray-700 flex gap-4">
            <div className={getLightClass(stage >= 1, 'red')}></div>
            <div className={getLightClass(stage >= 2, 'yellow')}></div>
            <div className={getLightClass(stage >= 3, 'green')}></div>
        </div>
    );
};

export default StartLights;
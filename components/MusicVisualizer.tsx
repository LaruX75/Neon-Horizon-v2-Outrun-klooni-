import React, { useEffect, useRef } from 'react';

interface Props {
    active: boolean;
}

const MusicVisualizer: React.FC<Props> = ({ active }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!active || !canvasRef.current) return;
        
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationId: number;

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const bars = 10;
            const barWidth = canvas.width / bars;

            for (let i = 0; i < bars; i++) {
                // Fake data visualization if AudioContext link is tricky
                // In a real scenario, we'd pass uint8array from parent
                const height = Math.random() * canvas.height * 0.8;
                
                ctx.fillStyle = `hsl(${(i / bars) * 360}, 100%, 50%)`;
                ctx.fillRect(i * barWidth, canvas.height - height, barWidth - 2, height);
            }
            animationId = requestAnimationFrame(draw);
        };

        draw();

        return () => cancelAnimationFrame(animationId);
    }, [active]);

    return (
        <canvas ref={canvasRef} width={100} height={30} className="rounded border border-purple-500/50 bg-black/50" />
    );
};

export default MusicVisualizer;
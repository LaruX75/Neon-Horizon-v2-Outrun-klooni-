import React from 'react';

interface MenuProps {
    onStart: () => void;
    gameOver: boolean;
    score: number;
}

const Menu: React.FC<MenuProps> = ({ onStart, gameOver, score }) => {
    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
            <div className="text-center p-8 border-4 border-pink-600 bg-gray-900/90 rounded-2xl shadow-[0_0_50px_rgba(236,72,153,0.5)] max-w-lg w-full transform transition-all hover:scale-105">
                <h1 className="font-['Press_Start_2P'] text-5xl text-transparent bg-clip-text bg-gradient-to-b from-cyan-300 to-blue-600 mb-2 drop-shadow-[4px_4px_0_rgba(255,0,255,1)]">
                    NEON
                </h1>
                <h1 className="font-['Press_Start_2P'] text-4xl text-pink-500 mb-8 drop-shadow-[2px_2px_0_rgba(0,255,255,1)]">
                    HORIZON
                </h1>

                {gameOver ? (
                    <div className="mb-8">
                        <h2 className="text-3xl text-red-500 font-bold mb-2">GAME OVER</h2>
                        <p className="text-xl text-white">SCORE: <span className="text-yellow-400">{score}</span></p>
                    </div>
                ) : (
                    <div className="text-gray-300 mb-8 font-orbitron text-sm leading-7">
                        <p>Use <span className="border border-white px-1 rounded text-white">ARROWS</span> to drive</p>
                        <p><span className="border border-white px-1 rounded text-white">Z</span> / <span className="border border-white px-1 rounded text-white">SHIFT</span> = GEARS</p>
                        <p><span className="border border-white px-1 rounded text-white">SPACE</span> to change radio</p>
                    </div>
                )}

                <button 
                    onClick={onStart}
                    className="font-['Press_Start_2P'] px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded hover:from-purple-500 hover:to-pink-500 transition-colors shadow-[0_0_20px_rgba(168,85,247,0.6)] animate-pulse"
                >
                    {gameOver ? 'TRY AGAIN' : 'INSERT COIN'}
                </button>
            </div>
        </div>
    );
};

export default Menu;
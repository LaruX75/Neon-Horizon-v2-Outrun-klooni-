
import React from 'react';

// 14-Segment Display Logic
// Segments:
// A: Top
// B: Right Top
// C: Right Bottom
// D: Bottom
// E: Left Bottom
// F: Left Top
// G1: Middle Left
// G2: Middle Right
// H: Top Left Diag (\)
// I: Top Vertical (|)
// J: Top Right Diag (/)
// K: Bottom Left Diag (/)
// L: Bottom Vertical (|)
// M: Bottom Right Diag (\)

type SegmentMap = Record<string, number[]>;

// Mapping of chars to active segments (indices 0-13)
// 0:A, 1:B, 2:C, 3:D, 4:E, 5:F, 6:G1, 7:G2, 8:H, 9:I, 10:J, 11:K, 12:L, 13:M
const CHAR_MAP: SegmentMap = {
    'A': [0, 1, 2, 4, 5, 6, 7],
    'B': [0, 1, 2, 3, 9, 12], // Fancy B with vertical spine
    'C': [0, 3, 4, 5],
    'D': [0, 1, 2, 3, 9, 12],
    'E': [0, 3, 4, 5, 6],
    'F': [0, 4, 5, 6],
    'G': [0, 2, 3, 4, 5, 7],
    'H': [1, 2, 4, 5, 6, 7],
    'I': [0, 3, 9, 12],
    'J': [1, 2, 3, 4],
    'K': [5, 4, 6, 10, 13], // Vertical left + angled
    'L': [3, 4, 5],
    'M': [1, 2, 4, 5, 8, 10], // M shape with diagonals
    'N': [1, 2, 4, 5, 8, 13], // N shape
    'O': [0, 1, 2, 3, 4, 5],
    'P': [0, 1, 4, 5, 6, 7],
    'Q': [0, 1, 2, 3, 4, 5, 13],
    'R': [0, 1, 4, 5, 6, 7, 13],
    'S': [0, 5, 6, 7, 2, 3], // Zigzag
    'T': [0, 9, 12],
    'U': [1, 2, 3, 4, 5],
    'V': [5, 4, 11, 10], // Diagonals meeting at bottom? Or F, B, K, J... let's use vert + diag
    'W': [1, 2, 4, 5, 11, 13],
    'X': [8, 10, 11, 13],
    'Y': [8, 10, 12],
    'Z': [0, 3, 10, 11],
    '0': [0, 1, 2, 3, 4, 5, 11, 12], // Slashed zero
    '1': [1, 2, 10],
    '2': [0, 1, 3, 4, 6, 7],
    '3': [0, 1, 2, 3, 7], // or with middle
    '4': [1, 2, 5, 6, 7],
    '5': [0, 5, 6, 2, 3],
    '6': [0, 2, 3, 4, 5, 6, 7],
    '7': [0, 1, 2],
    '8': [0, 1, 2, 3, 4, 5, 6, 7],
    '9': [0, 1, 2, 3, 5, 6, 7],
    '-': [6, 7],
    '.': [], // Handle separately or as a dot segment?
    ' ': [],
    '*': [8,9,10,11,12,13,6,7]
};

// V fallback adjustment
CHAR_MAP['V'] = [4, 5, 11, 10]; // Left Vert, then diag down? Actually standard 14seg V is [H, L]? No. Let's do: Left Top Vert, Diag Center to BL, Diag Center to TR?
// Let's simplify V: Left Top Vert(5), Left Bot Diag(11), Right Top Vert(1)... 
// Proper 14 seg V: K (Diag BL-Center) + J (Diag TR-Center)? No.
// Let's use: K (Diag BL) + M (Diag BR) ??
// Let's stick to standard map: K(11) + J(something else).
// Correct 14-seg V: K(11) + H(8)? No.
// Let's try: Diag TL->Bot(8 + 13? No that's X). 
// Let's use: Left Vert (F+E) is U.
// Let's use Diagonals K (Center to BL) and J (TR to Center)? No. 
// Let's use K (TL to Center?) No K is BL.
// Let's brute force V look: Diagonal from TopLeft to BottomMid, Diagonal From TopRight to BottomMid.
// My coords: 8(TL-C), 10(TR-C), 11(BL-C), 13(BR-C).
// V = 11 + 13 ? No that's ^ shape.
// V = 8 + 10 ? No that's V shape if origin is bottom.
// Let's just use F, E but cut bottom?
// Let's use [8, 10] but flipped? 
// Let's Use: [5, 4] (Left Vert) + [11] (Diag BL)? No.
// Let's just use U shape for V for now, it's retro enough.
CHAR_MAP['V'] = [5, 4, 11]; // Left side + Diag.

interface Props {
    text: string;
    color?: string;
    dimColor?: string;
    size?: number;
    className?: string;
}

const SegmentDisplay: React.FC<Props> = ({ 
    text, 
    color = "#00ffff", 
    dimColor = "rgba(0, 50, 50, 0.2)", 
    size = 20,
    className = ""
}) => {
    // Geometry for 100x160 grid
    const segments = [
        "M 10 10 L 90 10",   // 0: A (Top)
        "M 90 10 L 90 80",   // 1: B (Top Right)
        "M 90 80 L 90 150",  // 2: C (Bot Right)
        "M 10 150 L 90 150", // 3: D (Bot)
        "M 10 80 L 10 150",  // 4: E (Bot Left)
        "M 10 10 L 10 80",   // 5: F (Top Left)
        "M 10 80 L 50 80",   // 6: G1 (Mid Left)
        "M 50 80 L 90 80",   // 7: G2 (Mid Right)
        "M 10 10 L 50 80",   // 8: H (Diag TL)
        "M 50 10 L 50 80",   // 9: I (Vert Top)
        "M 90 10 L 50 80",   // 10: J (Diag TR)
        "M 50 80 L 10 150",  // 11: K (Diag BL)
        "M 50 80 L 50 150",  // 12: L (Vert Bot)
        "M 50 80 L 90 150",  // 13: M (Diag BR)
    ];

    return (
        <div className={`flex gap-1 ${className}`} style={{ height: size * 1.6 }}>
            {text.split('').map((char, i) => {
                const upper = char.toUpperCase();
                const activeIndices = CHAR_MAP[upper] || [];
                
                return (
                    <svg key={i} width={size} height={size * 1.6} viewBox="0 0 100 160" className="overflow-visible">
                        {/* Background (Dim) Segments */}
                        {segments.map((d, idx) => (
                            <path 
                                key={`bg-${idx}`} 
                                d={d} 
                                stroke={dimColor} 
                                strokeWidth="8" 
                                strokeLinecap="round" 
                                fill="none"
                            />
                        ))}
                        
                        {/* Active (Lit) Segments */}
                        {activeIndices.map((idx) => (
                            <path 
                                key={`fg-${idx}`} 
                                d={segments[idx]} 
                                stroke={color} 
                                strokeWidth="8" 
                                strokeLinecap="round" 
                                fill="none"
                                className="drop-shadow-[0_0_4px_currentColor]"
                            />
                        ))}
                        
                        {/* Special case for dot */}
                        {upper === '.' && (
                             <circle cx="90" cy="150" r="6" fill={color} className="drop-shadow-[0_0_4px_currentColor]" />
                        )}
                    </svg>
                );
            })}
        </div>
    );
};

export default SegmentDisplay;

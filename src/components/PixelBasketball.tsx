interface PixelBasketballProps {
  size?: number;
  className?: string;
}

export default function PixelBasketball({ size = 32, className = '' }: PixelBasketballProps) {
  // 8x8 pixel art basketball
  const pixels = [
    '..OOOO..',
    '.OBOOBO.',
    'OBOOBOO',
    'OOBOOBOO',
    'OOOBOOOO',
    'OOOBOOO',
    '.OOOOBO.',
    '..OOOO..',
  ];
  
  const pixelSize = size / 8;
  
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 8 8" 
      className={className}
      style={{ imageRendering: 'pixelated' }}
    >
      {pixels.map((row, y) => 
        row.split('').map((pixel, x) => {
          if (pixel === '.') return null;
          return (
            <rect
              key={`${x}-${y}`}
              x={x}
              y={y}
              width={1}
              height={1}
              fill={pixel === 'O' ? '#E85D04' : '#1A1A1A'}
            />
          );
        })
      )}
    </svg>
  );
}

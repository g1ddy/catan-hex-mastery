import React from 'react';

interface NumberTokenProps {
  value: number;
  pips: number;
}

export const NumberToken: React.FC<NumberTokenProps> = ({ value, pips }) => {
  const isRed = value === 6 || value === 8;
  const textColorClass = isRed ? 'text-red-600' : 'text-gray-900';
  const pipColorClass = isRed ? 'bg-red-600' : 'bg-gray-900';

  return (
    <foreignObject x="-4" y="-4" width="8" height="8">
      <div
          className="w-full h-full rounded-full bg-[#f3e5ab] shadow-sm flex flex-col items-center justify-center border-[0.5px] border-gray-500/50"
      >
          <span className={`font-bold leading-none ${textColorClass} text-[0.25rem] mb-[0.5px]`}>
              {value}
          </span>
          <div className="flex gap-[0.5px] items-center justify-center h-[1px]">
              {Array.from({ length: pips }).map((_, i) => (
                  <div key={i} className={`w-[0.5px] h-[0.5px] rounded-full ${pipColorClass}`} />
              ))}
          </div>
      </div>
    </foreignObject>
  );
};

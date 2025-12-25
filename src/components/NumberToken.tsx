import React from 'react';

interface NumberTokenProps {
  value: number;
  pips: number;
}

export const NumberToken: React.FC<NumberTokenProps> = ({ value, pips }) => {
  const isRed = value === 6 || value === 8;
  const textColorClass = isRed ? 'text-red-600 font-bold' : 'text-gray-900';

  return (
    <foreignObject x="-4" y="-4" width="8" height="8">
      <div
          className="w-full h-full rounded-full bg-[#f3e5ab] shadow-md flex flex-col items-center justify-center border border-gray-400/30 text-[0.2rem]"
      >
          <span className={`leading-none ${textColorClass} text-[0.35rem]`}>
              {value}
          </span>
          <div className={`flex gap-[0.5px] leading-none ${textColorClass} text-[0.25rem] mt-[0.5px]`}>
              {Array.from({ length: pips }).map((_, i) => (
                  <span key={i}>•</span>
              ))}
          </div>
      </div>
    </foreignObject>
  );
};

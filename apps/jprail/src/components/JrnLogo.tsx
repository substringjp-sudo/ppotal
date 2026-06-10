import React from 'react';

interface JrnLogoProps {
  className?: string;
  size?: number;
  showBackground?: boolean;
}

export const JrnLogo: React.FC<JrnLogoProps> = ({
  className = '',
  size = 512,
  showBackground = true,
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        {/* 카드 테두리 그라디언트 */}
        <linearGradient id="jrn-border-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#A81534" />
          <stop offset="50%" stopColor="#D82A4F" />
          <stop offset="100%" stopColor="#FF4B4B" />
        </linearGradient>

        {/* JRN 텍스트 그라디언트 - 대각선 흐름 */}
        <linearGradient id="jrn-text-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7E0A24" />
          <stop offset="50%" stopColor="#C41C3E" />
          <stop offset="100%" stopColor="#FF4D4D" />
        </linearGradient>

        {/* 소프트 드롭 섀도 필터 */}
        <filter id="jrn-card-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="16" stdDeviation="24" floodColor="#000000" floodOpacity="0.15" />
        </filter>
      </defs>

      {/* 모서리가 둥근 흰색 카드 배경 */}
      {showBackground && (
        <rect
          x="36"
          y="36"
          width="440"
          height="440"
          rx="110"
          fill="#FFFFFF"
          stroke="url(#jrn-border-grad)"
          strokeWidth="10"
          filter="url(#jrn-card-shadow)"
        />
      )}

      {/* JRN 정교한 모노그램 싱글 패스 */}
      <path
        d="M 136 295 
           C 136 335, 160 340, 185 340 
           C 215 340, 210 305, 210 280
           C 210 260, 190 250, 190 230
           C 190 210, 205 190, 215 185
           C 220 183, 275 183, 275 245
           C 275 260, 245 260, 210 260
           L 250 328
           C 260 338, 275 338, 285 310
           L 285 185
           L 335 325
           C 345 338, 365 338, 365 310
           L 365 185"
        stroke="url(#jrn-text-grad)"
        strokeWidth="44"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
};

export default JrnLogo;

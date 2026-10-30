import React from 'react';
import { getGeometricPolygonPoints } from '../../utils/dnd-math';

export interface GeometricSvgBorderProps {
  shape?: string;
  borderColor?: string;
  borderWidthPx?: number;
  hideBorder?: boolean;
  insetPct?: number;
  className?: string;
}

export const GeometricSvgBorder: React.FC<GeometricSvgBorderProps> = ({
  shape,
  borderColor = '#c8a45c',
  borderWidthPx = 2,
  hideBorder = false,
  insetPct = 1.5,
  className = '',
}) => {
  if (hideBorder || !borderWidthPx || borderWidthPx <= 0) return null;
  const points = getGeometricPolygonPoints(shape, insetPct);
  if (!points) return null;

  return (
    <svg
      className={`pointer-events-none absolute inset-0 w-full h-full z-20 overflow-visible ${className}`}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <polygon
        points={points}
        fill="none"
        stroke={borderColor}
        strokeWidth={Math.max(1, borderWidthPx * 1.35)}
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
};

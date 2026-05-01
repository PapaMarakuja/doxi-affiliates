import React from 'react';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
  circle?: boolean;
  style?: React.CSSProperties;
}

/**
 * Reusable Skeleton loading component with shimmer effect.
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  width,
  height,
  borderRadius,
  className = '',
  circle = false,
  style,
}) => {
  const skeletonStyle: React.CSSProperties = {
    width: width || '100%',
    height: height || '20px',
    borderRadius: circle ? '50%' : (borderRadius || '6px'),
    ...style,
  };

  return (
    <div 
      className={`ui-skeleton ${className}`} 
      style={skeletonStyle}
      aria-hidden="true"
    />
  );
};

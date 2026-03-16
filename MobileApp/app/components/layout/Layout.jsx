import React from 'react';
import { cn } from '../../utils';

/**
 * Container Component
 * Responsive container with max-width constraints
 */
const Container = ({
  children,
  size = 'default',
  className,
  ...props
}) => {
  const sizeClasses = {
    sm: 'max-w-3xl',
    default: 'max-w-7xl',
    lg: 'max-w-full',
    fluid: 'max-w-none'
  };

  return (
    <div
      className={cn(
        'mx-auto w-full px-4 sm:px-6 lg:px-8',
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

/**
 * Section Component
 * Page section with consistent spacing
 */
const Section = ({
  children,
  className,
  spacing = 'default',
  ...props
}) => {
  const spacingClasses = {
    none: '',
    sm: 'py-8',
    default: 'py-12',
    lg: 'py-16',
    xl: 'py-20'
  };

  return (
    <section
      className={cn(spacingClasses[spacing], className)}
      {...props}
    >
      {children}
    </section>
  );
};

/**
 * Grid Component
 * Responsive grid layout
 */
const Grid = ({
  children,
  cols = 1,
  gap = 6,
  className,
  ...props
}) => {
  const getGridCols = () => {
    if (typeof cols === 'object') {
      const { base = 1, sm, md, lg, xl } = cols;
      const classes = [`grid-cols-${base}`];
      if (sm) classes.push(`sm:grid-cols-${sm}`);
      if (md) classes.push(`md:grid-cols-${md}`);
      if (lg) classes.push(`lg:grid-cols-${lg}`);
      if (xl) classes.push(`xl:grid-cols-${xl}`);
      return classes.join(' ');
    }
    return `grid-cols-${cols}`;
  };

  return (
    <div
      className={cn(
        'grid',
        getGridCols(),
        `gap-${gap}`,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

/**
 * Flex Component
 * Flexible layout component
 */
const Flex = ({
  children,
  direction = 'row',
  align = 'stretch',
  justify = 'start',
  wrap = false,
  gap = 0,
  className,
  ...props
}) => {
  const directionClasses = {
    row: 'flex-row',
    'row-reverse': 'flex-row-reverse',
    col: 'flex-col',
    'col-reverse': 'flex-col-reverse'
  };

  const alignClasses = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    stretch: 'items-stretch',
    baseline: 'items-baseline'
  };

  const justifyClasses = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
    around: 'justify-around',
    evenly: 'justify-evenly'
  };

  return (
    <div
      className={cn(
        'flex',
        directionClasses[direction],
        alignClasses[align],
        justifyClasses[justify],
        wrap && 'flex-wrap',
        gap > 0 && `gap-${gap}`,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

/**
 * Stack Component
 * Vertical stack with consistent spacing
 */
const Stack = ({
  children,
  space = 4,
  className,
  ...props
}) => {
  return (
    <div
      className={cn(`space-y-${space}`, className)}
      {...props}
    >
      {children}
    </div>
  );
};

/**
 * HStack Component
 * Horizontal stack with consistent spacing
 */
const HStack = ({
  children,
  space = 4,
  className,
  ...props
}) => {
  return (
    <div
      className={cn(`flex items-center space-x-${space}`, className)}
      {...props}
    >
      {children}
    </div>
  );
};

/**
 * Divider Component
 * Horizontal or vertical divider
 */
const Divider = ({
  orientation = 'horizontal',
  className,
  ...props
}) => {
  const orientationClasses = {
    horizontal: 'w-full h-px',
    vertical: 'w-px h-full'
  };

  return (
    <div
      className={cn(
        'bg-neutral-200',
        orientationClasses[orientation],
        className
      )}
      {...props}
    />
  );
};

/**
 * Spacer Component
 * Flexible space component
 */
const Spacer = ({ className, ...props }) => {
  return <div className={cn('flex-1', className)} {...props} />;
};

/**
 * AspectRatio Component
 * Maintain aspect ratio for content
 */
const AspectRatio = ({
  ratio = 16/9,
  children,
  className,
  ...props
}) => {
  return (
    <div 
      className={cn('relative w-full', className)}
      style={{ paddingBottom: `${(1/ratio) * 100}%` }}
      {...props}
    >
      <div className="absolute inset-0">
        {children}
      </div>
    </div>
  );
};

/**
 * Center Component
 * Center content both horizontally and vertically
 */
const Center = ({
  children,
  className,
  ...props
}) => {
  return (
    <div
      className={cn('flex items-center justify-center', className)}
      {...props}
    >
      {children}
    </div>
  );
};

export {
  Container,
  Section,
  Grid,
  Flex,
  Stack,
  HStack,
  Divider,
  Spacer,
  AspectRatio,
  Center
};
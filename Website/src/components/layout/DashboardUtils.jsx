import React from "react";
import { cn } from "../../utils";

/**
 * Responsive Dashboard Grid System
 * Provides consistent grid layouts for dashboard components
 */
const DashboardGrid = ({
  children,
  columns = "auto",
  gap = "md",
  className,
  ...props
}) => {
  const gapClasses = {
    sm: "gap-3",
    md: "gap-4 lg:gap-6",
    lg: "gap-6 lg:gap-8",
  };

  const columnClasses = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
    auto: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
    responsive: "grid-cols-[repeat(auto-fit,minmax(280px,1fr))]",
  };

  return (
    <div
      className={cn(
        "grid",
        columnClasses[columns] || columnClasses.auto,
        gapClasses[gap],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
};

/**
 * Dashboard Stats Grid
 * Specialized grid for statistics cards
 */
const DashboardStatsGrid = ({ children, className, ...props }) => {
  return (
    <DashboardGrid
      columns="responsive"
      gap="md"
      className={cn(
        "grid-cols-[repeat(auto-fit,minmax(240px,1fr))]",
        className,
      )}
      {...props}
    >
      {children}
    </DashboardGrid>
  );
};

/**
 * Dashboard Card Container
 * Enhanced card with mobile-optimized padding and shadows
 */
const DashboardCard = ({
  children,
  className,
  padding = "md",
  shadow = true,
  border = true,
  ...props
}) => {
  const paddingClasses = {
    sm: "p-4",
    md: "p-4 lg:p-6",
    lg: "p-6 lg:p-8",
    none: "p-0",
  };

  return (
    <div
      className={cn(
        "bg-white rounded-lg",
        border && "border border-primary-100",
        shadow && "shadow-sm hover:shadow-md transition-shadow duration-200",
        paddingClasses[padding],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
};

/**
 * Dashboard Section
 * Provides consistent spacing and structure for dashboard sections
 */
const DashboardSection = ({
  title,
  description,
  action,
  children,
  className,
  headerClassName,
  contentClassName,
  spacing = "md",
  ...props
}) => {
  const spacingClasses = {
    sm: "space-y-3",
    md: "space-y-4 lg:space-y-6",
    lg: "space-y-6 lg:space-y-8",
  };

  return (
    <section className={cn(spacingClasses[spacing], className)} {...props}>
      {(title || description || action) && (
        <div
          className={cn(
            "flex flex-col sm:flex-row sm:items-center sm:justify-between",
            "space-y-2 sm:space-y-0",
            headerClassName,
          )}
        >
          <div className="min-w-0">
            {title && (
              <h2 className="text-xl lg:text-2xl font-bold text-neutral-900">
                {title}
              </h2>
            )}
            {description && (
              <p className="text-sm lg:text-base text-neutral-600 mt-1">
                {description}
              </p>
            )}
          </div>
          {action && <div className="flex-shrink-0">{action}</div>}
        </div>
      )}

      <div className={contentClassName}>{children}</div>
    </section>
  );
};

/**
 * Mobile-Optimized List Container
 * Responsive list layout with proper touch targets
 */
const DashboardList = ({ children, className, spacing = "sm", ...props }) => {
  const spacingClasses = {
    none: "space-y-0",
    sm: "space-y-1",
    md: "space-y-2",
    lg: "space-y-3",
  };

  return (
    <div
      className={cn(
        "divide-y divide-neutral-100",
        spacingClasses[spacing],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
};

/**
 * Dashboard List Item
 * Mobile-friendly list item with proper touch targets
 */
const DashboardListItem = ({
  children,
  className,
  clickable = false,
  onClick,
  ...props
}) => {
  const baseClasses = "px-4 py-3 lg:px-6 lg:py-4";
  const interactiveClasses =
    clickable || onClick
      ? "hover:bg-primary-50 cursor-pointer transition-colors duration-150"
      : "";

  const Component = clickable || onClick ? "button" : "div";

  return (
    <Component
      className={cn(
        baseClasses,
        interactiveClasses,
        clickable || onClick ? "w-full text-left" : "",
        className,
      )}
      onClick={onClick}
      {...props}
    >
      {children}
    </Component>
  );
};

/**
 * Responsive Flex Container
 * Handles responsive flex layouts common in dashboards
 */
const DashboardFlex = ({
  children,
  direction = "col-sm",
  align = "stretch",
  justify = "start",
  gap = "md",
  className,
  ...props
}) => {
  const directionClasses = {
    row: "flex-row",
    col: "flex-col",
    "row-sm": "flex-col sm:flex-row",
    "col-sm": "flex-row sm:flex-col",
    "row-md": "flex-col md:flex-row",
    "col-md": "flex-row md:flex-col",
    "row-lg": "flex-col lg:flex-row",
    "col-lg": "flex-row lg:flex-col",
  };

  const alignClasses = {
    start: "items-start",
    center: "items-center",
    end: "items-end",
    stretch: "items-stretch",
    baseline: "items-baseline",
  };

  const justifyClasses = {
    start: "justify-start",
    center: "justify-center",
    end: "justify-end",
    between: "justify-between",
    around: "justify-around",
    evenly: "justify-evenly",
  };

  const gapClasses = {
    none: "gap-0",
    sm: "gap-2",
    md: "gap-4",
    lg: "gap-6",
    xl: "gap-8",
  };

  return (
    <div
      className={cn(
        "flex",
        directionClasses[direction],
        alignClasses[align],
        justifyClasses[justify],
        gapClasses[gap],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
};

/**
 * Dashboard Widget Container
 * Standardized container for dashboard widgets/modules
 */
const DashboardWidget = ({
  title,
  subtitle,
  action,
  children,
  className,
  headerClassName,
  contentClassName,
  loading = false,
  error = null,
  ...props
}) => {
  return (
    <DashboardCard className={className} {...props}>
      {/* Widget Header */}
      {(title || subtitle || action) && (
        <div
          className={cn(
            "flex items-center justify-between mb-4 pb-3 border-b border-neutral-100",
            headerClassName,
          )}
        >
          <div className="min-w-0">
            {title && (
              <h3 className="text-lg font-semibold text-neutral-900">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-sm text-neutral-600 mt-1">{subtitle}</p>
            )}
          </div>
          {action && <div className="flex-shrink-0 ml-4">{action}</div>}
        </div>
      )}

      {/* Widget Content */}
      <div className={contentClassName}>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <div className="text-red-500 text-sm">{error}</div>
          </div>
        ) : (
          children
        )}
      </div>
    </DashboardCard>
  );
};

export {
  DashboardGrid,
  DashboardStatsGrid,
  DashboardCard,
  DashboardSection,
  DashboardList,
  DashboardListItem,
  DashboardFlex,
  DashboardWidget,
};

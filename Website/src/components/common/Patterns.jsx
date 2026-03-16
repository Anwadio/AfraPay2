import React from "react";
import { cn } from "../../utils";

/**
 * Reusable Section Pattern
 * Standardizes section layouts across the app
 */
export const PageSection = ({
  title,
  subtitle,
  badge,
  children,
  className,
  spacing = "lg",
  background = "white",
  centered = false,
  ...props
}) => {
  const backgroundClasses = {
    white: "bg-white",
    neutral: "bg-neutral-50",
    primary: "bg-primary-50",
    gradient: "bg-gradient-to-br from-primary-50 to-primary-100",
  };

  const spacingClasses = {
    sm: "py-8",
    md: "py-12",
    lg: "py-16",
    xl: "py-20",
  };

  return (
    <section
      className={cn(
        spacingClasses[spacing],
        backgroundClasses[background],
        className
      )}
      {...props}
    >
      <div className="container mx-auto px-4">
        {(title || subtitle || badge) && (
          <div className={cn("mb-12", centered && "text-center")}>
            {badge && <div className="mb-4">{badge}</div>}

            {title && (
              <h2
                className={cn(
                  "text-3xl md:text-4xl font-bold text-neutral-900 mb-4",
                  centered && "text-center"
                )}
              >
                {title}
              </h2>
            )}

            {subtitle && (
              <p
                className={cn(
                  "text-lg text-neutral-600 max-w-2xl",
                  centered && "mx-auto text-center"
                )}
              >
                {subtitle}
              </p>
            )}
          </div>
        )}

        {children}
      </div>
    </section>
  );
};

/**
 * Feature Grid Pattern
 * Standardizes feature display across pages
 */
export const FeatureGrid = ({ features, columns = 3, className, ...props }) => {
  const gridCols = {
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
  };

  return (
    <div className={cn("grid gap-8", gridCols[columns], className)} {...props}>
      {features.map((feature, index) => (
        <FeatureCard key={index} {...feature} />
      ))}
    </div>
  );
};

/**
 * Feature Card Pattern
 * Reusable feature card component
 */
export const FeatureCard = ({
  icon,
  title,
  description,
  badge,
  className,
  ...props
}) => {
  return (
    <div
      className={cn(
        "p-6 bg-white rounded-lg border border-neutral-200 hover:border-primary-200 transition-colors text-center",
        className
      )}
      {...props}
    >
      {icon && (
        <div className="text-primary-500 mb-4 flex justify-center">{icon}</div>
      )}

      <div className="mb-3 flex items-center justify-center gap-3">
        {title && (
          <h3 className="text-xl font-bold text-neutral-900">{title}</h3>
        )}
        {badge && badge}
      </div>

      {description && (
        <p className="text-neutral-600 leading-relaxed">{description}</p>
      )}
    </div>
  );
};

/**
 * CTA Section Pattern
 * Standardizes call-to-action sections
 */
export const CTASection = ({
  title,
  subtitle,
  primaryButton,
  secondaryButton,
  badges,
  className,
  background = "gradient",
  ...props
}) => {
  const backgroundClasses = {
    white: "bg-white",
    dark: "bg-neutral-900 text-white",
    gradient: "bg-gradient-to-br from-neutral-900 to-neutral-800 text-white",
    primary: "bg-primary-600 text-white",
  };

  return (
    <section
      className={cn("py-20", backgroundClasses[background], className)}
      {...props}
    >
      <div className="container mx-auto px-4">
        <div className="text-center max-w-4xl mx-auto">
          {title && (
            <h2 className="text-3xl md:text-5xl font-bold mb-6">{title}</h2>
          )}

          {subtitle && (
            <p className="text-xl md:text-2xl mb-10 opacity-90">{subtitle}</p>
          )}

          {badges && (
            <div className="flex flex-wrap items-center justify-center gap-6 mb-10">
              {badges}
            </div>
          )}

          {(primaryButton || secondaryButton) && (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {primaryButton}
              {secondaryButton}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

/**
 * Stats Grid Pattern
 * Reusable statistics display
 */
export const StatsGrid = ({ stats, columns = 4, className, ...props }) => {
  const gridCols = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 md:grid-cols-3",
    4: "grid-cols-2 md:grid-cols-4",
  };

  return (
    <div className={cn("grid gap-8", gridCols[columns], className)} {...props}>
      {stats.map((stat, index) => (
        <div key={index} className="text-center">
          <div className="text-4xl md:text-6xl font-bold mb-2">
            {stat.value}
          </div>
          <div className="font-medium mb-1">{stat.label}</div>
          {stat.subtitle && (
            <div className="text-sm opacity-70">{stat.subtitle}</div>
          )}
        </div>
      ))}
    </div>
  );
};

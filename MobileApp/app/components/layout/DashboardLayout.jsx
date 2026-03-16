import React, { useState, useEffect } from "react";
import { cn } from "../../utils";
import { DashboardSidebar } from "./DashboardSidebar";
import { DashboardHeader } from "./DashboardHeader";
import { SkipLinks, useTranslation } from "../../utils/accessibility";

/**
 * Main Accessible Dashboard Layout Component
 * Responsive layout with sidebar, header, and content area
 * Includes skip links and proper landmark structure
 */
const DashboardLayout = ({
  children,
  user,
  className,
  sidebarClassName,
  headerClassName,
  contentClassName,
  showSearch = true,
  showNotifications = true,
  ...props
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { t } = useTranslation();

  // Handle responsive behavior
  useEffect(() => {
    const checkIsMobile = () => {
      const mobile = window.innerWidth < 1024;

      // Auto-close sidebar on mobile when resizing to mobile view
      if (mobile && isSidebarOpen) {
        setIsSidebarOpen(false);
      }
    };

    // Initial check
    checkIsMobile();

    // Listen for resize events
    window.addEventListener("resize", checkIsMobile);
    return () => window.removeEventListener("resize", checkIsMobile);
  }, [isSidebarOpen]);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  // Skip links for keyboard navigation
  const skipLinks = [
    { href: "#main-content", text: t("navigation.skipToMain") },
    { href: "#navigation", text: t("navigation.skipToNavigation") },
  ];

  return (
    <>
      {/* Skip Links for Accessibility */}
      <SkipLinks links={skipLinks} />

      <div
        className={cn(
          "min-h-screen h-screen bg-gray-50",
          "flex flex-col lg:flex-row",
          "relative m-0 p-0",
          "antialiased", // Better text rendering
          className
        )}
        {...props}
      >
        {/* Sidebar - Navigation Landmark */}
        <nav
          id="navigation"
          role="navigation"
          aria-label={t("navigation.menu")}
          className="h-full"
        >
          <DashboardSidebar
            isOpen={isSidebarOpen}
            onClose={closeSidebar}
            user={user}
            className={cn("h-full", sidebarClassName)}
          />
        </nav>

        {/* Main content area */}
        <div className="flex-1 flex flex-col min-w-0 h-full">
          {/* Header - Banner Landmark */}
          <header role="banner">
            <DashboardHeader
              user={user}
              onToggleSidebar={toggleSidebar}
              showSearch={showSearch}
              showNotifications={showNotifications}
              className={cn("flex-shrink-0", headerClassName)}
            />
          </header>

          {/* Content - Main Landmark */}
          <main
            id="main-content"
            role="main"
            tabIndex="-1"
            className={cn(
              "flex-1 overflow-auto",
              "h-0", // This forces the flex child to use available space
              "focus:outline-none", // Remove focus outline for tabindex=-1
              "animate-fade-in", // Smooth content entry
              contentClassName
            )}
          >
            <div
              className={cn(
                "container-comfortable section-padding-sm",
                "animate-slide-up space-y-content"
              )}
            >
              {children}
            </div>
          </main>
        </div>

        {/* Backdrop for mobile sidebar */}
        {isSidebarOpen && (
          <div
            className={cn(
              "fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden",
              "transition-opacity duration-300 ease-in-out",
              "animate-fade-in"
            )}
            onClick={closeSidebar}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                closeSidebar();
              }
            }}
            tabIndex={0}
            role="button"
            aria-label={t("navigation.closeMenu")}
          />
        )}
      </div>
    </>
  );
};

export { DashboardLayout };

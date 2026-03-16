import React from "react";
import { Button } from "../ui";

/**
 * Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    // eslint-disable-next-line no-console
    console.error("ErrorBoundary caught an error:", error, errorInfo);

    this.setState({
      error: error,
      errorInfo: errorInfo,
    });

    // Report to error tracking service in production
    if (process.env.NODE_ENV === "production") {
      // Analytics.reportError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-neutral-50">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-error-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-error-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>

            <h2 className="text-xl font-bold text-neutral-900 mb-2">
              Something went wrong
            </h2>

            <p className="text-neutral-600 mb-6">
              We're sorry for the inconvenience. The page encountered an error.
            </p>

            {process.env.NODE_ENV === "development" && (
              <details className="text-left mb-4 p-4 bg-neutral-50 rounded text-xs">
                <summary className="font-semibold cursor-pointer mb-2">
                  Error Details
                </summary>
                <pre className="whitespace-pre-wrap text-error-600">
                  {this.state.error && this.state.error.toString()}
                </pre>
                <pre className="whitespace-pre-wrap text-neutral-500 mt-2">
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}

            <div className="flex gap-3 justify-center">
              <Button
                onClick={this.handleReset}
                className="bg-primary-500 hover:bg-primary-600"
              >
                Try Again
              </Button>

              <Button
                variant="outline"
                onClick={() => window.location.reload()}
              >
                Reload Page
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Async Error Boundary for handling Promise rejections in components
 */
export const AsyncErrorBoundary = ({ children, fallback }) => {
  return (
    <ErrorBoundary>
      <React.Suspense
        fallback={
          fallback || (
            <div className="min-h-screen flex items-center justify-center">
              <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full"></div>
            </div>
          )
        }
      >
        {children}
      </React.Suspense>
    </ErrorBoundary>
  );
};

/**
 * Higher-order component for wrapping components with error boundaries
 */
export const withErrorBoundary = (WrappedComponent, fallbackComponent) => {
  const WithErrorBoundaryComponent = (props) => {
    return (
      <ErrorBoundary fallback={fallbackComponent}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };

  WithErrorBoundaryComponent.displayName = `withErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name})`;

  return WithErrorBoundaryComponent;
};

export default ErrorBoundary;

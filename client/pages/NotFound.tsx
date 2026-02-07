import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();
  const user = localStorage.getItem("user");

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-foreground mb-3">
          Page Not Found
        </h2>
        <p className="text-muted-foreground mb-8">
          The page you're looking for doesn't exist. This page is yet to be built.
        </p>
        <p className="text-sm text-muted-foreground mb-8">
          💡 Want to see this page built? Continue prompting to fill in the page contents!
        </p>

        <Link
          to={user ? "/dashboard" : "/login"}
          className="inline-block px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
        >
          {user ? "Back to Dashboard" : "Back to Login"}
        </Link>
      </div>
    </div>
  );
};

export default NotFound;

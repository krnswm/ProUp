import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle, CheckCircle } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [errorType, setErrorType] = useState<"notfound" | "invalid" | "">();
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to dashboard if already logged in
    const user = localStorage.getItem("user");
    if (user) {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate]);

  // Helper function to get or initialize registered users
  const getRegisteredUsers = () => {
    const users = localStorage.getItem("registeredUsers");
    return users ? JSON.parse(users) : [];
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setErrorType(undefined);

    if (!email || !password) {
      setError("Please fill in all fields");
      setErrorType("invalid");
      return;
    }

    setIsLoading(true);

    // Simulate API delay
    setTimeout(() => {
      const registeredUsers = getRegisteredUsers();
      const user = registeredUsers.find(
        (u: { email: string; password: string }) => u.email === email
      );

      if (!user) {
        setError("Account not found. Create a new account to get started.");
        setErrorType("notfound");
        setIsLoading(false);
        return;
      }

      if (user.password !== password) {
        setError("Incorrect password. Please try again.");
        setErrorType("invalid");
        setIsLoading(false);
        return;
      }

      // Successful login
      localStorage.setItem(
        "user",
        JSON.stringify({
          email: user.email,
          name: user.name,
        })
      );
      navigate("/dashboard");
    }, 500);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground">ProUp</h1>
          <p className="text-muted-foreground mt-2">Project Management Made Simple</p>
        </div>

        <div className="bg-card border border-border rounded-lg p-8">
          <h2 className="text-xl font-semibold text-foreground mb-6">Log In</h2>

          {/* Error Message - Account Not Found */}
          {error && errorType === "notfound" && (
            <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-orange-900 mb-2">{error}</p>
                  <Link
                    to="/register"
                    className="inline-block text-sm font-medium text-orange-700 hover:text-orange-900 underline"
                  >
                    Create an account →
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Error Message - Invalid Credentials */}
          {error && errorType === "invalid" && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-900">{error}</p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                  setErrorType(undefined);
                }}
                placeholder="your@email.com"
                className="w-full px-4 py-2 border border-border rounded-lg bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                  setErrorType(undefined);
                }}
                placeholder="••••••••"
                className="w-full px-4 py-2 border border-border rounded-lg bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary text-primary-foreground py-2 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? "Logging in..." : "Log In"}
            </button>
          </form>

          {/* Demo Accounts Info */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex gap-3">
              <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-blue-900 mb-2">
                  Demo Accounts Available:
                </p>
                <p className="text-xs text-blue-800 font-mono mb-1">
                  Email: demo@example.com | Pass: password
                </p>
                <p className="text-xs text-blue-800 font-mono mb-1">
                  Email: john@example.com | Pass: password
                </p>
                <p className="text-xs text-blue-700">
                  Or create a new account below
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-muted-foreground text-sm">
              Don't have an account?{" "}
              <Link to="/register" className="text-primary font-medium hover:opacity-80">
                Register here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

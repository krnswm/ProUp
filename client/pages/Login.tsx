import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle, CheckCircle, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [errorType, setErrorType] = useState<"notfound" | "invalid" | "">();
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { user, login: authLogin } = useAuth();

  useEffect(() => {
    // Redirect to dashboard if already logged in
    if (user) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setErrorType(undefined);

    if (!email || !password) {
      setError("Please fill in all fields");
      setErrorType("invalid");
      return;
    }

    setIsLoading(true);

    try {
      await authLogin(email, password);
      navigate("/dashboard");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Login failed";
      if (errorMessage.includes("credentials")) {
        setError("Invalid email or password. Please try again.");
        setErrorType("invalid");
      } else {
        setError(errorMessage);
        setErrorType("invalid");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-blue-50/30 dark:via-blue-950/20 to-purple-50/30 dark:to-purple-950/20 flex items-center justify-center px-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{ duration: 10, repeat: Infinity }}
        />
      </div>

      <motion.div 
        className="w-full max-w-md relative z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <motion.div 
          className="text-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <motion.div
            className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary to-blue-600 rounded-2xl shadow-lg mb-4"
            whileHover={{ rotate: 360, scale: 1.1 }}
            transition={{ duration: 0.6 }}
          >
            <Sparkles className="w-8 h-8 text-primary-foreground" />
          </motion.div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground via-primary to-purple-600 bg-clip-text text-transparent">ProUp</h1>
          <p className="text-muted-foreground mt-2">Project Management Made Simple</p>
        </motion.div>

        <motion.div 
          className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl p-8 shadow-2xl"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className="flex items-center gap-2 mb-6">
            <div className="h-8 w-1 bg-gradient-to-b from-primary to-purple-600 rounded-full" />
            <h2 className="text-xl font-semibold bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">Log In</h2>
          </div>

          {/* Error Message - Account Not Found */}
          {error && errorType === "notfound" && (
            <motion.div 
              className="mb-6 p-4 bg-orange-50/80 dark:bg-orange-950/30 backdrop-blur-sm border border-orange-200 dark:border-orange-800 rounded-xl shadow-sm"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-orange-900 dark:text-orange-100 mb-2">{error}</p>
                  <Link
                    to="/register"
                    className="inline-block text-sm font-medium text-orange-700 dark:text-orange-400 hover:text-orange-900 dark:hover:text-orange-300 underline"
                  >
                    Create an account →
                  </Link>
                </div>
              </div>
            </motion.div>
          )}

          {/* Error Message - Invalid Credentials */}
          {error && errorType === "invalid" && (
            <motion.div 
              className="mb-6 p-4 bg-red-50/80 dark:bg-red-950/30 backdrop-blur-sm border border-red-200 dark:border-red-800 rounded-xl shadow-sm"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-900 dark:text-red-100">{error}</p>
                </div>
              </div>
            </motion.div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Email
              </label>
              <motion.input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                  setErrorType(undefined);
                }}
                placeholder="your@email.com"
                className="w-full px-4 py-2.5 border border-border rounded-xl bg-input/50 backdrop-blur-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all shadow-sm"
                whileFocus={{ scale: 1.01 }}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Password
              </label>
              <motion.input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                  setErrorType(undefined);
                }}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 border border-border rounded-xl bg-input/50 backdrop-blur-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all shadow-sm"
                whileFocus={{ scale: 1.01 }}
                required
              />
            </div>

            <div className="text-right">
              <Link
                to="/forgot-password"
                className="text-sm font-medium text-primary hover:opacity-80"
              >
                Forgot password?
              </Link>
            </div>

            <motion.button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-primary to-blue-600 text-primary-foreground py-2.5 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all disabled:opacity-70 disabled:cursor-not-allowed relative overflow-hidden group"
              whileHover={{ scale: isLoading ? 1 : 1.02 }}
              whileTap={{ scale: isLoading ? 1 : 0.98 }}
            >
              <span className="relative z-10">{isLoading ? "Logging in..." : "Log In"}</span>
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </motion.button>
          </form>

          {/* Demo Accounts Info */}
          <motion.div 
            className="mt-6 p-4 bg-blue-50/80 dark:bg-blue-950/30 backdrop-blur-sm border border-blue-200 dark:border-blue-800 rounded-xl shadow-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <div className="flex gap-3">
              <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-blue-900 dark:text-blue-100 mb-2">
                  Demo Accounts Available:
                </p>
                <p className="text-xs text-blue-800 dark:text-blue-300 font-mono mb-1">
                  Email: demo@example.com | Pass: password
                </p>
                <p className="text-xs text-blue-800 dark:text-blue-300 font-mono mb-1">
                  Email: john@example.com | Pass: password
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-400">
                  Or create a new account below
                </p>
              </div>
            </div>
          </motion.div>

          <div className="mt-6 text-center space-y-3">
            <p className="text-muted-foreground text-sm">
              Don't have an account?
            </p>
            <Link 
              to="/register" 
              className="block w-full py-2.5 rounded-xl font-medium border border-primary text-primary hover:bg-primary/10 transition-all text-center"
            >
              Create an Account
            </Link>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

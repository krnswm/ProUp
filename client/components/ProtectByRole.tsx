import { ReactNode } from "react";

interface ProtectByRoleProps {
  children: ReactNode;
  userRole?: string;
  requiredRole?: string | string[];
  fallback?: ReactNode;
}

const roleHierarchy: { [key: string]: number } = {
  Owner: 4,
  Admin: 3,
  Member: 2,
  Viewer: 1,
};

/**
 * ProtectByRole component
 * Conditionally renders children based on user's role
 * 
 * @param children - Content to render if user has sufficient role
 * @param userRole - Current user's role
 * @param requiredRole - Minimum required role (string or array of strings)
 * @param fallback - Optional content to render if user doesn't have sufficient role
 * 
 * @example
 * <ProtectByRole userRole="Member" requiredRole="Admin">
 *   <button>Delete Project</button>
 * </ProtectByRole>
 * 
 * @example
 * <ProtectByRole userRole="Viewer" requiredRole={["Admin", "Member"]}>
 *   <button>Edit Task</button>
 * </ProtectByRole>
 */
export default function ProtectByRole({
  children,
  userRole = "Viewer",
  requiredRole = "Viewer",
  fallback = null,
}: ProtectByRoleProps) {
  const userRoleLevel = roleHierarchy[userRole] || 0;

  // Check if user has required role
  const hasAccess = (() => {
    if (Array.isArray(requiredRole)) {
      // User needs to have at least one of the required roles
      return requiredRole.some((role) => {
        const requiredLevel = roleHierarchy[role] || 0;
        return userRoleLevel >= requiredLevel;
      });
    } else {
      // User needs to have at least the required role level
      const requiredLevel = roleHierarchy[requiredRole] || 0;
      return userRoleLevel >= requiredLevel;
    }
  })();

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Hook to check if user has required role
 */
export function useHasRole(userRole: string = "Viewer", requiredRole: string | string[]): boolean {
  const userRoleLevel = roleHierarchy[userRole] || 0;

  if (Array.isArray(requiredRole)) {
    return requiredRole.some((role) => {
      const requiredLevel = roleHierarchy[role] || 0;
      return userRoleLevel >= requiredLevel;
    });
  } else {
    const requiredLevel = roleHierarchy[requiredRole] || 0;
    return userRoleLevel >= requiredLevel;
  }
}

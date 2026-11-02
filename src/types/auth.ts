/** Account types mirror the trusted profile returned by the backend. */

export type AuthRole = "admin" | "analyst" | "manager";

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  role: AuthRole;
  roleLevel: number;
  /** Assigned branch for managers; null for global accounts. */
  branchId: string | null;
  branchName: string | null;
  branchCity: string | null;
}

export interface LoginResponse {
  token: string;
  expiresIn: string;
  user: AuthUser;
}

/** Where each role lands after sign-in. */
export const ROLE_LABELS: Record<AuthRole, string> = {
  admin: "Main Administrator",
  analyst: "Business Analyst",
  manager: "Branch Manager",
};

export function isBranchManager(user: AuthUser | null): boolean {
  return user?.role === "manager";
}

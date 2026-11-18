/** Account types mirror the trusted profile returned by the backend. */

export type AuthRole = "admin" | "analyst" | "manager";

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  role: AuthRole;
  roleLevel: number;
}

export interface LoginResponse {
  token: string;
  expiresIn: string;
  user: AuthUser;
}

/** Labels shown in the account menu and login hints. */
export const ROLE_LABELS: Record<AuthRole, string> = {
  admin: "Administrator",
  analyst: "Business Analyst",
  manager: "Manager",
};

/** The five locked team roles — also the sign-up role-step choices.
 *  Kept in a plain module: "use server" files may only export functions. */
export const SIGNUP_ROLES = ["Owner", "Admin", "Manager", "Sales Rep", "Viewer"] as const;
export type SignupRole = (typeof SIGNUP_ROLES)[number];

const COMPANY_ROLE_MANAGER_ROLES = new Set([
  "Engineering Manager",
  "Senior Engineering Manager",
  "Engineering Director",
]);

export function canManageCompanyRoles(role: string | null | undefined) {
  return role != null && COMPANY_ROLE_MANAGER_ROLES.has(role);
}

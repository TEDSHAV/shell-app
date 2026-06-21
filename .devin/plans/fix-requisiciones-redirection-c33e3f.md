# Fix Requisiciones Redirection on Localhost - c33e3f

This plan addresses the issue where users are redirected to the dashboard when accessing the new requisiciones app on localhost.

## Summary
The redirection happens because the new `requisiciones` app-specific role check fails if the app hasn't been added to the database's `apps` table. I will add a fallback check for the user's global role (from Supabase claims) to ensure admins and leaders can always access the app even without app-specific assignments.

## Proposed Changes

### Shell App
- **AppSidebar.tsx**: Fetch the global user role and pass it to `SidebarNavClient`.
- **SidebarNavClient.tsx**: Use the global user role as a fallback in `canAccessApp` and `canAccess` logic.
- **requisiciones/layout.tsx**: Update the server-side role check to fetch the global role and allow access if either the app-specific role OR the global role is authorized (admin/lider).

## Verification Plan
1. **Manual Test**: Verify that a user with a global "admin" or "lider" role can access the requisiciones app even if it's not explicitly assigned to them in the `authprisma` tables.
2. **Localhost Access**: Confirm that development on localhost is no longer hindered by the new role-based access control.

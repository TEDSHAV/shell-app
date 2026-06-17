# Debug and Fix Requisiciones Redirection - c33e3f

This plan aims to diagnose and fix the redirection issue for the requisiciones app on localhost by adding debug logging and ensuring consistent role-based filtering across the dashboard and sidebar.

## Summary
The redirection to the dashboard suggests that the role-based access check in `requisiciones/layout.tsx` is failing. I will add logging to identify exactly what roles are being retrieved and update the dashboard to hide unauthorized apps to provide a better user experience.

## Proposed Changes

### Shell App
- **requisiciones/layout.tsx**: Add server-side console logs to output the retrieved `appRole` and `userGlobalRole`.
- **actions/apps.ts**: Add logging to `getUserRole` and `getUserRolesByApp` to trace where the role information might be missing.
- **dashboard/page.tsx**: Convert to a server component that fetches user roles and filters the `apps` list before rendering, matching the sidebar's behavior.

## Verification Plan
1. **Log Analysis**: Inspect the server console logs when clicking the requisiciones card to see the actual role values.
2. **Dashboard Consistency**: Verify that the requisiciones card only appears if the user has the required roles (admin, lider, superadmin).
3. **Manual Test**: Confirm that once the roles are correctly identified and handled, the redirection no longer occurs for authorized users.

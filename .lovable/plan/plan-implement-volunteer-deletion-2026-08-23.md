# Plan: Implement Volunteer Deletion

Add a "Delete" option for volunteers in the admin dashboard to allow coordinators to remove volunteer records when necessary.

## Proposed Changes

### Database & Backend
- Use the existing `profiles` table which has RLS enabled.
- Create a new server function `deleteVolunteer` in `src/lib/volunteer.functions.ts` to handle the deletion logic securely.
- Ensure only admins can delete records via RLS (already configured in previous steps, but will verify).

### UI/UX
- **Dashboard List**: Add a "Delete" option to the `MoreVertical` dropdown menu for each volunteer row in `src/routes/_authenticated/admin/dashboard.tsx`.
- **Profile Modal**: Add a "Delete Volunteer" button in the `VolunteerProfileModal` for quick access when viewing details.
- **Confirmation**: Implement a confirmation dialog using a standard UI pattern (e.g., `AlertDialog` from shadcn/ui) to prevent accidental deletions.
- **Feedback**: Show a success toast using `sonner` after successful deletion and invalidate the React Query cache to refresh the list.

## Technical Details
- **Server Function**: `deleteVolunteer(id: string)` will call `supabase.from('profiles').delete().eq('id', id)`.
- **UI Components**:
    - `src/routes/_authenticated/admin/dashboard.tsx`: Update the actions cell.
    - `src/components/admin/VolunteerProfileModal.tsx`: Add a destructive button in the header or footer.
- **State Management**: Use `useMutation` from TanStack Query for the deletion operation.

## User Review Required
- Should the deletion be permanent, or should we implement a "Soft Delete" (e.g., setting `is_active = false`)? Given the request "eliminar" or "sacarlo", I will implement a hard delete but can switch to soft delete if preferred.

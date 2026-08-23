# Implementation Plan - Admin Dashboard and Remaining Features

I will complete the remaining sections of the application, focusing on the Admin Dashboard with high-security RLS, advanced filters, drag-and-drop calendar, and management tools.

## User-facing changes

- **Admin Dashboard**: A secure area for coordinators to manage volunteers, view KPIs, and export reports.
- **Interactive Calendar**: A drag-and-drop interface for assigning volunteers to work shifts.
- **Category Management**: Tools to manage work categories and skills.
- **Reporting**: Ability to export data to Excel (xlsx) and PDF.

## Technical details

- **Auth & Security**:
    - Implement a pathless `_authenticated` layout route with a `beforeLoad` guard.
    - Verify both session and role (`is_staff` check) in the server context and route guard.
- **Admin Layout**:
    - Create `src/routes/_authenticated/admin.tsx` as the main layout for admin pages.
    - Implement sidebar navigation and user profile summary.
- **Dashboard (`/admin/dashboard`)**:
    - Build `src/routes/_authenticated/admin/dashboard.tsx`.
    - Integrated TanStack Query for data fetching with advanced filters (name, locality, skills, availability).
    - KPI cards (total volunteers, active assignments, pending accommodation).
    - Paged volunteer table with quick assignment options.
- **Calendar (`/admin/calendario`)**:
    - Build `src/routes/_authenticated/admin/calendario.tsx`.
    - Implement a monthly/weekly view for shifts.
    - Drag-and-drop functionality for volunteer assignments using `dnd-kit` or native drag events.
- **Categories (`/admin/categorias`)**:
    - Build `src/routes/_authenticated/admin/categorias.tsx`.
    - CRUD operations for work categories.
- **Reports (`/admin/reportes`)**:
    - Build `src/routes/_authenticated/admin/reportes.tsx`.
    - Integration with `xlsx` for Excel exports and print-friendly CSS for PDF reports.

## Verification plan

- **Auth Flow**: Verify that `/admin/*` routes redirect to `/login` if not authenticated or not staff.
- **Data Integrity**: Ensure RLS policies correctly restrict access to authenticated staff only.
- **Dashboard Features**: Test filters, pagination, and CSV/Excel exports.
- **Calendar Interaction**: Verify that dragging volunteers to dates correctly updates the `calendar_assignments` table in Supabase.

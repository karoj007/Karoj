# Medical Laboratory Management System

## Overview

This project is a full-stack web application designed for managing medical laboratory operations. It provides features for patient tracking, test management, result entry, and comprehensive financial reporting, including income and expense tracking. Built with React for the frontend and Express for the backend, the system aims for clinical precision and workflow efficiency in medical laboratory environments. Its business vision is to streamline lab processes, enhance data management, and provide robust reporting capabilities for improved operational insights and patient care.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

The frontend is built with React 18 and TypeScript, using Vite for development and bundling. Routing is handled by Wouter, and server state management and caching are managed by React Query. The UI uses Shadcn/ui (built on Radix UI) and Tailwind CSS, adhering to Material Design principles with a focus on clinical precision and information hierarchy. State management uses React Query for server state, React hooks for local UI state, and localStorage for persisting user preferences like themes.

### Backend Architecture

The backend is an Express.js application with a RESTful API. It uses session-based authentication with hardcoded credentials for simplicity (username: "KAROZH", password: "Karoj1996"). Data persistence is handled by a PostgreSQL database using Drizzle ORM, with schema definitions in `shared/schema.ts` and CRUD operations managed by a `DatabaseStorage` class. API endpoints are under `/api/*` and support standard CRUD operations for various entities, with data validation via Zod schemas.

### Data Models

Core entities include Tests, Patients, Visits, TestResults, Expenses, and Settings. These are defined using Drizzle ORM schemas in `shared/schema.ts` and validated at runtime using Zod.

### Design System

The system uses Inter for primary text and JetBrains Mono for numeric values. A semantic color system with light/dark theme support ensures appropriate clinical aesthetics. Spacing follows Tailwind's unit system, and the design is mobile-first with a responsive 12-column grid. Print outputs are highly customizable, allowing users to define custom headers and footers, and dynamically paginate results based on test type, with specific styling for readability.

### Key Features and Technical Implementations

- **Patient Management**: Full CRUD operations for patients with comprehensive cascading updates and deletes, accessible from the Results page via Settings icon (⚙️) next to "Patient Information" title. Features include:
  - Edit patient dialog with all fields (name, age, gender, phone, source)
  - Delete confirmation with AlertDialog warning about permanent data loss
  - **Cascading Delete**: When a patient is deleted, all related visits and test results are automatically removed from the database, ensuring complete data cleanup across all pages (Results, Patients, Reports)
  - **Cascading Update**: When a patient's name is changed, the name is automatically updated in all associated visits, ensuring consistency across the entire application
  - Real-time UI updates via React Query mutations
  - Toast notifications for success/error feedback
  - Patient Information card dynamically appears when patient selected, disappears after deletion
  - PUT /api/patients/:id for updates (with automatic visit name sync), DELETE /api/patients/:id for cascading deletion
- **Enhanced Visit Management**: Comprehensive visit editing from Results page with three integrated sections:
  - **Patient Information**: Full edit capabilities for patient details (name, age, gender, phone, source)
  - **Tests Management**: Dynamic test selection with visual feedback
    - View all requested tests with prices
    - Add tests via dropdown (automatically excludes already-selected tests)
    - Remove tests individually with single-click X buttons
    - Real-time test count indicator ("X test(s) selected")
    - "No tests selected" message when list is empty
    - Scrollable test list with clean UI (max-height with overflow)
  - **Pricing Control**: Flexible pricing with smart suggestions
    - Editable Total Cost field for custom pricing
    - Auto-calculated "Suggested" price based on selected tests
    - Clear visual distinction between actual and suggested prices
  - Dual mutation system updates both patient data (PUT /api/patients/:id) and visit data (PUT /api/visits/:id) simultaneously
  - Single success notification after both updates complete
  - Automatic cache invalidation for immediate UI refresh
  - Error handling for missing or deleted patient records with informative toast messages
- **Financial Reports**: Interactive reports with modern design, smart patient grouping by source, and three sections (Patient Income, Expenses, Optional Info). Features automatic calculations for Total Income, Total Expenses, and Net Income, dynamic row management, and single-page print output with RTL Arabic styling.
- **Intelligent Print Pagination**: Automatically classifies tests (long vs. short) and applies dynamic pagination logic for optimal page fit and grouping. Long tests get dedicated pages with auto-scaling, while short tests are intelligently grouped. Includes professional design elements and customizable print sections.
- **Urine Analysis Test**: Specialized UI for Urine tests with multi-section input (Physical, Chemical, Microscopical Examination) and default clinical values. Integrates with the batch update API and "Initialize Default Tests" feature.
- **Production Deployment Improvements**: Enhanced error handling, startup validation, and logging for robust production environments.
- **UI Customization**: Branding changes (e.g., "KAROZH" dashboard header) are supported.
- **PostgreSQL Database Integration**: Migration from in-memory storage to persistent PostgreSQL using Drizzle ORM, ensuring data persistence across restarts.
- **Custom Print Sections System**: Allows users to add unlimited custom text sections (top/bottom, alignment, font size, color) to print outputs, with results displayed in emerald green.
- **Auto-Fill Unit and Normal Range**: Automatically pre-fills unit and normal range for tests in the Results page, improving efficiency and consistency.
- **Data Management**: "Clear Patient Data" feature for deleting patient-related information while preserving test catalogs and print settings.

## External Dependencies

- **Database**: Drizzle ORM (`drizzle-orm`), Neon serverless PostgreSQL adapter (`@neondatabase/serverless`), PostgreSQL.
- **UI Component Libraries**: Radix UI primitives (30+ packages), Shadcn/ui, Embla Carousel, CMDK.
- **Form Management**: React Hook Form, Hookform Resolvers, Zod.
- **Development Tools**: TypeScript, ESBuild, Vite, PostCSS, Tailwind CSS, Autoprefixer.
- **Session Management**: Express Session (in-memory, though `connect-pg-simple` is configured).
- **Styling Utilities**: Class Variance Authority (CVA), CLSX, `tailwind-merge`.
- **Date Management**: `date-fns`.
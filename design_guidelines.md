# Design Guidelines: Medical Laboratory Management System

## Design Approach

**Selected Framework:** Material Design System with Medical/Clinical Adaptation

This is a utility-focused, data-intensive medical application requiring clarity, efficiency, and trust. Material Design provides the structured foundation needed for complex data management while maintaining modern aesthetics.

**Key Design Principles:**
- Clinical Precision: Every element serves data accuracy and workflow efficiency
- Information Hierarchy: Clear visual distinction between critical and secondary data
- Professional Trust: Clean, confident aesthetics appropriate for medical context
- Efficient Workflows: Minimal friction in repetitive tasks

## Typography

**Font Family:**
- Primary: 'Inter' (Google Fonts) - exceptional readability for data-heavy interfaces
- Monospace: 'JetBrains Mono' - for test results, numeric values, patient IDs

**Type Scale:**
- Page Titles: text-3xl font-semibold (30px)
- Section Headers: text-xl font-semibold (20px)
- Card Titles: text-lg font-medium (18px)
- Body Text: text-base (16px)
- Labels/Meta: text-sm font-medium (14px)
- Table Data: text-sm (14px)
- Small Print: text-xs (12px)

## Layout System

**Spacing Primitives:** Use Tailwind units of 2, 4, 6, and 8 exclusively
- Component padding: p-6 or p-8
- Card spacing: gap-6 or gap-8
- Section margins: mb-8
- Form field spacing: space-y-4
- Button padding: px-6 py-3

**Grid System:**
- Dashboard: 12-column responsive grid (grid-cols-1 md:grid-cols-2 lg:grid-cols-3)
- Forms: Single column on mobile, 2-column on desktop (lg:grid-cols-2)
- Data tables: Full-width with horizontal scroll on mobile
- Max container width: max-w-7xl for main content areas

## Component Library

### Navigation
- **Top Navigation Bar:** Fixed header with system logo, current page title, user profile dropdown, theme toggle
- **Back Button:** Consistent placement (top-left) on all pages with left arrow icon + "Back" text
- **Breadcrumbs:** Show navigation path on complex pages (Results → Patient Selection → Test Entry)

### Dashboard Cards
- **Draggable Section Cards:** Elevated cards (shadow-lg) with grab cursor on headers
- Card header: Drag handle icon, section title, action menu (rename, resize, recolor options)
- Card body: Quick stats or recent entries preview
- Resize handles: Visible corner indicators on hover
- Minimum size constraints to prevent illegible cards

### Data Tables
- **Modern Table Design:** Striped rows (alternate subtle background), hover states
- Column headers: Sticky positioning, sort indicators, filter icons
- Action columns: Icon buttons (edit, delete, print) aligned right
- Row selection: Checkbox column with bulk actions bar
- Empty states: Centered illustration + "No data yet" message
- Pagination: Bottom-aligned with page numbers and records count

### Forms
- **Input Fields:** Outlined style with floating labels
- Field grouping: Related fields in bordered sections with group titles
- Autocomplete: Dropdown suggestions appearing below input with keyboard navigation
- Required vs Optional: Visual indicator (asterisk for required, "(optional)" for optional)
- Validation: Inline error messages below fields in red with icon
- Help text: Gray text below inputs for guidance

### Buttons
- **Primary Actions:** Solid background, medium size (px-6 py-3)
- **Secondary Actions:** Outlined style with border
- **Icon Buttons:** Circular for single actions (edit, delete), square for toolbars
- **Save Buttons:** Prominent green accent, positioned bottom-right or top-right
- **Print/PDF Buttons:** Use document/printer icons from Heroicons
- **Add/Create Buttons:** Use plus icon with "Add [Item]" text

### Modals & Dialogs
- **Confirmation Modals:** Centered overlay with blur backdrop, clear Yes/No actions
- **Delete Confirmations:** Red accent for destructive action
- **Success Notifications:** Toast-style, top-right corner, auto-dismiss after 3s with checkmark icon
- **Error Notifications:** Red toast with error icon, requires manual dismissal

### Patient/Test Search
- **Search Bar Design:** Large prominent input with magnifying glass icon
- **Results Display:** Card-based list showing patient name, date, test count
- **Date Badges:** Pill-shaped tags showing "Today", "Yesterday", or formatted date
- **Highlight Matches:** Bold the matching search term within results

### Print Layouts
- **Results Print View:**
  - A4 page format with professional margins (2.5cm all sides)
  - Header section: Lab logo/name on left, patient details card on right
  - Test results: Clean card-based layout (not tables) with test name, result value, unit, and normal range
  - Abnormal results: Highlighted with subtle warning background
  - Custom text positioning: Dedicated areas at top/bottom with customizable styling
  - Footer: Print date, page numbers

- **Reports Print View:**
  - Summary cards for each organization/source
  - Visual breakdown: Progress bars or simple charts showing contribution to total
  - Expense itemization in clean list format
  - Net income prominently displayed in large typography
  - Custom text areas as configured in settings

### Settings Interface
- **Tabbed Layout:** Horizontal tabs for different setting categories (General, Print Customization, Data Management)
- **Print Customization Panel:**
  - Live preview pane showing current print template
  - Form controls on left: Text input (multi-line), position selector (radio buttons), orientation toggle, color pickers, font size slider
  - Separate sections for Results template and Reports template
- **Dark/Light Mode Toggle:** Prominent switch with sun/moon icons
- **Danger Zone:** Red-bordered section at bottom for destructive actions (Delete All Data)

## Theme Implementation

**Light Mode:**
- Background: White and gray-50
- Cards: White with subtle shadows
- Text: gray-900 (primary), gray-600 (secondary)
- Borders: gray-200

**Dark Mode:**
- Background: gray-900 and gray-800
- Cards: gray-800 with enhanced shadows
- Text: white (primary), gray-300 (secondary)
- Borders: gray-700

**Accent Colors (consistent across themes):**
- Primary: Blue-600 (trust, medical context)
- Success: Green-600 (saved, normal results)
- Warning: Amber-600 (attention needed)
- Danger: Red-600 (abnormal results, delete actions)

## Animations

**Minimal Motion Philosophy:**
- Page transitions: Simple fade-in (200ms)
- Dashboard card dragging: Smooth transform with drop shadow enhancement
- Modal overlays: Fade + scale (150ms ease-out)
- Notification toasts: Slide-in from right (200ms)
- **No hover animations** - rely on cursor changes and subtle color shifts only

## Accessibility

- All form inputs have associated labels
- Color is never the only indicator (icons + text for states)
- Focus indicators on all interactive elements (2px blue ring)
- Skip navigation link for keyboard users
- High contrast maintained in both light and dark modes
- Touch targets minimum 44x44px for mobile

## Responsive Behavior

**Mobile (< 768px):**
- Single-column layouts throughout
- Bottom navigation for main sections
- Simplified dashboard (stacked cards, no drag-drop)
- Full-width modals

**Tablet (768px - 1024px):**
- 2-column grids where appropriate
- Condensed navigation
- Dashboard with 2 columns

**Desktop (> 1024px):**
- Full 3-column dashboard
- Side-by-side form layouts
- Enhanced drag-drop interactions
- More table columns visible

This design system creates a professional, efficient medical laboratory management interface that prioritizes data accuracy and workflow speed while maintaining modern aesthetics appropriate for clinical environments.
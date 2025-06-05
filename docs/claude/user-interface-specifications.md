# Screen List (Development Task List Compliant Version)

## [A] Common Components

UI elements used commonly across the application that don't belong to specific screens.

### A-1. Common Layout (Application Shell)

- **Purpose:** Provide consistent navigation and structure across all screens.
- **Key UI Elements/Features:**
  - **[A-1-1] Sidebar Navigation:**
    - Links to each major screen (icon + text).
    - Open/close (collapse) functionality.
    - Highlight currently displayed screen.
  - **[A-1-2] Fixed Top Header:**
    - **Global Search Box:** Trigger for cross-searching materials by entered keywords.
    - (Placeholder for future expansion) User icon, notification bell, etc.

---

## [B] Dashboard

The activity summary screen displayed first when the application starts.

### B-1. Dashboard Screen

- **Purpose:** List activity status and motivate next actions (material organization or new registration).
- **Key UI Elements/Features:**
  - **[B-1-1] Widget Grid:**
    - Grid system for placing widgets.
  - **[B-1-2] Layout Customization Features:**
    - UI suggesting move/resize in each widget header (handles or icons).
    - Widget rearrangement via drag & drop.
    - Widget resizing by dragging boundaries.
    - Save/reset current layout buttons.
  - **[B-1-3] Various Widgets:**
    - **Materials Needing Organization List:** Display a few materials lacking metadata, with link to "Materials Needing Organization Screen (C-5)".
    - **Today's Sound:** Randomly pick one past material and play with simple waveform player.
    - **Collection Map:** Plot recording locations of all materials on a map.
    - **Recording Calendar:** Display recording dates as heatmap (activity graph).
    - **Statistical Data:** Visualize tag type counts, monthly recording numbers, etc. in graphs.

---

## [C] Material Management Features

Core screens for registering and managing audio materials.

### C-1. Materials List Screen

- **Purpose:** Browse, search, sort all registered materials and perform various operations.
- **Key UI Elements/Features:**
  - **[C-1-1] Materials List Table:**
    - Table displaying material information list. Includes pagination.
    - Display columns: Checkbox, Title, Recording Date, **File Format**, **Rate/Depth**, Tags, Favorite Rating, Action Buttons.
  - **[C-1-2] Filter/Sort UI:**
    - Dropdown to select sort order (registration date, title, etc.).
    - UI for detailed filtering by tags, date range, etc. (separate from global search).
  - **[C-1-3] Bulk Operation Toolbar:**
    - Displayed when multiple materials are selected via table checkboxes.
    - Has buttons for "Add to Project", "Bulk Tag Assignment", "Bulk Download (ZIP)", "Bulk Delete".
  - **[C-1-4] New Registration Route:**
    - Button to navigate to "New Material Registration Screen (C-2)".

### C-2. New Material Registration Screen

- **Purpose:** Register new audio materials and related metadata into the system.
- **Key UI Elements/Features:**
  - **[C-2-1] File Upload UI:** Supports drag & drop and file selection.
  - **[C-2-2] Metadata Input Form:**
    - Title, recording date/time (auto-filled from file + manual correction).
    - **Technical Metadata Fields:** Format, sampling rate, bit depth (auto-filled from file + manual correction).
    - **Equipment Selection UI:** Multiple selection from equipment master via checkbox list, etc.
    - **Location Specification UI:** GPS photo upload, current location button, map pin placement.
    - **Tag Input UI:** Has input completion (suggest) feature, can register multiple tags.
    - Free text memo field, favorite rating (star rating) UI.
  - **[C-2-3] Action Buttons:** "Save" and "Cancel" buttons.

### C-3. Material Edit Screen

- **Purpose:** Modify and update existing material information.
- **Key UI Elements/Features:**
  - Almost identical UI to "New Material Registration Screen (C-2)". Form displayed with existing data pre-filled.

### C-4. Material Detail Modal

- **Purpose:** Display detailed information in a popup when specific material is selected from materials list.
- **Key UI Elements/Features:**
  - Audio player with waveform.
  - Display area for all registered metadata (technical metadata, selected equipment list, etc.).
  - Action buttons: **Single File Download**, navigation to Edit Screen (C-3), display Delete Confirmation Modal (C-6), Close.

### C-5. Materials Needing Organization List Screen

- **Purpose:** Display only materials with incomplete metadata to support efficient data organization.
- **Key UI Elements/Features:**
  - Reuses UI from "Materials List Screen (C-1)", automatically filtered by conditions like "tags not set", "memo empty", etc.

### C-6. Delete Confirmation Modal

- **Purpose:** Prevent data deletion due to misoperation by performing final confirmation.
- **Key UI Elements/Features:**
  - Display name of material to be deleted.
  - "Delete" and "Cancel" buttons.

---

## [D] Project Management Features

Feature group for organizing multiple materials by theme.

### D-1. Projects List Screen

- **Purpose:** Browse and manage all created projects.
- **Key UI Elements/Features:**
  - Display projects in card format (or list format) (project name, material count, last updated date, etc.).
  - Navigate from each project card to "Project Detail Screen (D-3)".
  - Button to display "New Project Creation Modal (D-2)".

### D-2. Project Create/Edit Modal

- **Purpose:** Create new project or edit existing project information.
- **Key UI Elements/Features:**
  - Project name input form, description text area.
  - "Save" and "Cancel" buttons.

### D-3. Project Detail Screen

- **Purpose:** List and manage materials belonging to specific project.
- **Key UI Elements/Features:**
  - Project information display area (name, description). Route to Edit Modal (D-2).
  - List of belonging materials (reuses UI from "Materials List Screen (C-1)").

---

## [E] Master Management Features

Screen group for maintaining data such as options used throughout the application.

### E-1. Equipment Master Management Screen

- **Purpose:** Register, edit, delete equipment information linked to materials.
- **Key UI Elements/Features:**
  - Equipment list table (display columns: Equipment Name, **Type**, Manufacturer, Notes, Action Buttons).
  - Button to display "New Equipment Registration Modal (E-2)".

### E-2. Equipment Create/Edit Modal

- **Purpose:** Register new equipment or edit existing equipment information.
- **Key UI Elements/Features:**
  - Equipment name, manufacturer, notes input form.
  - **"Type" selection dropdown** (e.g., Recorder, Microphone, Other).
  - "Save" and "Cancel" buttons.

### E-3. Tag Management Screen

- **Purpose:** Check usage status of all registered tags and organize (rename, merge, delete).
- **Key UI Elements/Features:**
  - Tag list table (or tag cloud).
    - Display columns: Tag Name, Number of Materials Used, Action Buttons.
  - UI for executing tag rename, delete, merge (e.g., pressing edit button enables inline editing, etc.).

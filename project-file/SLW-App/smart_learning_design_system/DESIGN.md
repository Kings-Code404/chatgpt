---
name: Smart Learning Design System
colors:
  surface: '#faf8ff'
  surface-dim: '#d9d9e5'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3fe'
  surface-container: '#ededf9'
  surface-container-high: '#e7e7f3'
  surface-container-highest: '#e1e2ed'
  on-surface: '#191b23'
  on-surface-variant: '#434655'
  inverse-surface: '#2e3039'
  inverse-on-surface: '#f0f0fb'
  outline: '#737686'
  outline-variant: '#c3c6d7'
  surface-tint: '#0053db'
  primary: '#004ac6'
  on-primary: '#ffffff'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#b4c5ff'
  secondary: '#4b41e1'
  on-secondary: '#ffffff'
  secondary-container: '#645efb'
  on-secondary-container: '#fffbff'
  tertiary: '#943700'
  on-tertiary: '#ffffff'
  tertiary-container: '#bc4800'
  on-tertiary-container: '#ffede6'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#e2dfff'
  secondary-fixed-dim: '#c3c0ff'
  on-secondary-fixed: '#0f0069'
  on-secondary-fixed-variant: '#3323cc'
  tertiary-fixed: '#ffdbcd'
  tertiary-fixed-dim: '#ffb596'
  on-tertiary-fixed: '#360f00'
  on-tertiary-fixed-variant: '#7d2d00'
  background: '#faf8ff'
  on-background: '#191b23'
  surface-variant: '#e1e2ed'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.2'
    letterSpacing: 0.05em
  caption:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: '1.4'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  2xl: 64px
  container-max: 1440px
  sidebar-width: 280px
  gutter: 24px
---

## Brand & Style

This design system is built to facilitate focus, clarity, and trust in the educational technology space. The brand personality is **innovative yet grounded**, utilizing a **Premium Modern** aesthetic that blends high-utility functionalism with sophisticated visual depth.

The core style movement is **Glassmorphism**, used sparingly to create a sense of hierarchy and modernity without compromising accessibility. We employ translucent layers, subtle background blurs, and soft gradients to simulate a "physical workspace" environment. The interface should feel light, airy, and expansive, evoking a sense of limitless intellectual growth.

**Key Stylistic Pillars:**
- **Clarity over Clutter:** High whitespace usage to reduce cognitive load for students and educators.
- **Visual Depth:** Multi-layered surfaces using backdrop filters and tonal shifts.
- **Fluidity:** Soft transitions and organic movement between states to maintain engagement.

## Colors

The palette is anchored by **Deep Blue (#2563eb)** for primary actions and **Indigo (#4f46e5)** for accentuation and progressive discovery. This combination signals stability and intelligence.

We utilize a "Cool Gray" neutral scale to maintain a professional, calm environment. 
- **Gradients:** Use a linear gradient from Primary to Secondary (135deg) for high-impact areas like progress bars, primary buttons, and active learning states.
- **Glassmorphism:** Surfaces intended to float above the main canvas should use the `glass_fill_hex` with a `backdrop-filter: blur(12px)` and a subtle `glass_stroke_hex` border to define the edge against vibrant backgrounds.

## Typography

This design system uses **Inter** for its exceptional legibility in data-dense SaaS environments and its neutral, professional character. 

- **Hierarchy:** Use `display-lg` for dashboard welcomes and hero sections. `headline-md` is the standard for card titles and section headers.
- **Readability:** Body text uses a generous `1.6` line-height to ensure long-form educational content is easy to digest.
- **Emphasis:** Semi-bold (600) is preferred for interactive elements to distinguish them clearly from static content.

## Layout & Spacing

The layout follows a **Fixed-Fluid Hybrid** model. The sidebar remains fixed at `280px` for persistent navigation, while the main content area resides within a max-width container of `1440px` to prevent line lengths from becoming unreadable on ultra-wide monitors.

- **Grid:** A 12-column grid is used for the main workspace. On tablet (under 1024px), the sidebar collapses into a drawer, and the grid shifts to 8 columns. On mobile (under 640px), the grid shifts to 4 columns.
- **Rhythm:** We use a 4px baseline shift. All components should have padding/margins in multiples of `sm (8px)` or `md (16px)`.
- **Safe Zones:** Always maintain a minimum `lg (24px)` margin on the edges of the viewport to preserve the "premium" airy feel.

## Elevation & Depth

Depth is conveyed through a combination of **Ambient Shadows** and **Tonal Layers**.

1.  **Level 0 (Base):** The `background_color_hex` (#f8fafc) serves as the canvas.
2.  **Level 1 (Cards):** White surfaces with a very soft shadow (`0 4px 20px rgba(0,0,0,0.03)`) and a 1px border (#e2e8f0).
3.  **Level 2 (Navigation/Sticky):** Sidebar and top nav bars should have a subtle tint or glass effect to indicate they sit above the content.
4.  **Level 3 (Overlays/Modals):** These use the **Glassmorphism** effect. Apply `backdrop-filter: blur(16px)` with a slightly more pronounced shadow (`0 20px 40px rgba(0,0,0,0.1)`) to pull focus.

Shadows should never be pure black; always tint them with a fraction of the Primary or Neutral-Dark color to keep the UI feeling integrated and "clean."

## Shapes

The shape language is **friendly and modern**, utilizing consistent rounded corners to soften the professional tone.

- **Standard Elements:** Buttons, input fields, and small chips use `rounded-md` (0.5rem).
- **Large Containers:** Dashboard cards and glassmorphic modals use `rounded-lg` (1rem).
- **Feature Components:** Avatars and search bars should be fully pill-shaped (rounded-full) to provide visual variety and signify "high-touch" interactive areas.

## Components

### Buttons
- **Primary:** Uses the Primary-to-Secondary gradient. On hover, increase the brightness slightly. Text is always white.
- **Secondary:** Transparent background with a 1px border of the primary color.
- **Ghost:** No border or background; uses primary color text. Reserved for low-priority actions.

### Cards
- Standard cards use the `surface_color_hex` with a `1rem` corner radius.
- Interactive cards (lessons, courses) should have a subtle hover lift: `translateY(-4px)` with a slightly deeper shadow.

### Form Inputs
- Inputs should be tall (`48px`) with `body-md` text.
- Use a `2px` solid border on focus using the Primary Blue. 
- Validation states (Success/Error) must change the border color and include an icon for accessibility.

### Glassmorphic Overlays
- Use for slide-overs and dropdown menus. 
- Apply a white 10% opacity fill and a 12px blur. 
- Borders should be "inner" borders using `glass_stroke_hex`.

### Navigation
- **Sticky Sidebar:** Use a slightly darker neutral tint (#f1f5f9) or a glass effect if content scrolls behind it. Active states in the sidebar should be marked with a vertical "pill" indicator in Primary Blue.
- **Progress Bars:** Always use a rounded-full track with the Primary gradient for the fill to celebrate student progress.
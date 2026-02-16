# Requirements Document

## Overview

### Project Name
DemoTime Animated SVG Diagrams

### Purpose
Enable DemoTime users to include animated diagrams in their presentations using SVG files. Diagrams will animate as if being hand-drawn in real-time, simulating the experience of a presenter drawing on a whiteboard. This enhances technical presentations, workshops, and educational demos by progressively revealing complex diagrams in a visually engaging way.

### Scope

**In Scope:**
- New slide type/layout with dedicated React component for SVG animation
- Support for SVG files from multiple drawing tools (Excalidraw, Inkscape, Concepts, and others)
- Configurable animation speed (global and per-element via XML comments)
- Text typewriter effects (character-by-character reveal)
- Pause controls (timed and interactive)
- Transport controls (reset, play/pause, skip to end) in multiple UI locations
- Color inversion for light/dark theme compatibility
- Automatic scaling to 960x540 slide dimensions with aspect ratio preservation
- Animation state persistence when navigating between slides

**Out of Scope:**
- Security considerations (VSCode extension, trusted environment)
- Scalability/performance for large distributed systems
- Support for other vector formats (only SVG)
- SVG editing capabilities (users prepare SVGs externally)
- Audio synchronization with animations

---

## Stakeholders

| Role | Name | Responsibilities | Contact |
|------|------|------------------|---------|
| Product Owner | TBD | Feature prioritization, acceptance | |
| End Users (Presenters) | Technical presenters, educators, workshop leaders | Create diagrams, configure animations, deliver presentations | |
| Development Team | TBD | Implementation, testing | |
| DemoTime Extension Users | Current user base | Integration with existing workflows | |

---

## Functional Requirements

### FR-1: New Slide Type for Animated SVG
- **Description:** Create a new slide type/layout that uses a dedicated React component to display and animate SVG diagrams
- **Priority:** High
- **Acceptance Criteria:**
  - [ ] Slide type is defined in markdown frontmatter
  - [ ] SVG file path is specified in frontmatter
  - [ ] Component renders SVG content within DemoTime slide framework
  - [ ] Integrates with existing DemoTime slide navigation

### FR-2: SVG File Loading and Parsing
- **Description:** Load and parse SVG files from various drawing tools (Excalidraw, Inkscape, Concepts)
- **Priority:** High
- **Acceptance Criteria:**
  - [ ] SVG files are loaded from specified path
  - [ ] Parser extracts all drawable elements in document order
  - [ ] Parser identifies and extracts XML comments for animation control
  - [ ] Handles variations in element grouping from different tools
  - [ ] Handles variations in color/opacity attributes from different tools

### FR-3: Automatic Scaling to Slide Dimensions
- **Description:** Scale SVG content to exactly 960x540 pixels while maintaining aspect ratio
- **Priority:** High
- **Acceptance Criteria:**
  - [ ] Calculate bounding box of all SVG content
  - [ ] Scale SVG to fit 960x540 while maintaining aspect ratio
  - [ ] Use letterbox/pillarbox approach for non-16:9 SVGs
  - [ ] Letterbox/pillarbox bars match slide background color (invisible)
  - [ ] No distortion of original diagram proportions

### FR-4: Sequential Element Animation
- **Description:** Animate SVG elements in document order, simulating hand-drawing
- **Priority:** High
- **Acceptance Criteria:**
  - [ ] All elements start invisible
  - [ ] Elements animate in the order they appear in SVG XML
  - [ ] Path elements are stroked along their length using CSS animation
  - [ ] Elements with stroke: draw outline first, then fade in fill
  - [ ] Elements without stroke: fade in fill only
  - [ ] Grouped elements (&lt;g&gt;) are animated individually, not as unit
  - [ ] Animation respects current speed setting

### FR-5: Configurable Animation Speed (Line Speed Model)
- **Description:** Control animation speed using a line speed model (pseudo pixels per millisecond) that simulates realistic hand-drawing
- **Priority:** High
- **Acceptance Criteria:**
  - [ ] Global default speed configurable in demo.json/yaml
  - [ ] Per-slide speed override in markdown frontmatter (animationSpeed)
  - [ ] Speed represents rate of drawing (pixels per millisecond or equivalent unit)
  - [ ] Longer/more complex paths take proportionally longer to animate
  - [ ] Speed units: milliseconds (ms) or seconds (s) with unit detection
  - [ ] Path length calculation includes curves, arcs, and line segments
  - [ ] Speed affects stroke animation duration based on calculated path length
  - [ ] Non-path elements (shapes, text) use reasonable approximations

### FR-6: Speed Control via XML Comments
- **Description:** Allow fine-grained speed control using XML comments in SVG
- **Priority:** High
- **Acceptance Criteria:**
  - [ ] `<!--speed:X-->` comment changes speed for all following elements
  - [ ] X is a multiplier relative to slide's animationSpeed (0.5 = half speed, 2.0 = double)
  - [ ] `<!--speed:1.0-->` reverts to slide's base animation speed
  - [ ] Comments must be between elements (not inside)
  - [ ] Multiple speed changes supported throughout SVG
  - [ ] Parser correctly identifies and applies speed modifiers

### FR-7: Timed Pauses via XML Comments
- **Description:** Support timed pauses during animation
- **Priority:** High
- **Acceptance Criteria:**
  - [ ] `<!--pause:Xms-->` pauses for specified milliseconds before next element
  - [ ] `<!--pause:Xs-->` pauses for specified seconds before next element
  - [ ] Pause occurs before the next element is rendered
  - [ ] Multiple pauses supported throughout animation
  - [ ] Pauses are skippable via transport controls

### FR-8: Interactive Pause (Wait for User)
- **Description:** Pause animation until user explicitly resumes
- **Priority:** High
- **Acceptance Criteria:**
  - [ ] `<!--pause:untilPlay-->` pauses until user action
  - [ ] Animation resumes when user clicks play on transport controls
  - [ ] Animation resumes when user presses advance on clicker
  - [ ] Animation resumes from master slide controls
  - [ ] Visual indicator shows animation is paused and waiting

### FR-9: Text Typewriter Effect
- **Description:** Animate text elements character-by-character to simulate typing
- **Priority:** Medium
- **Acceptance Criteria:**
  - [ ] Enabled/disabled via frontmatter (textTypeWriterEffect: true/false)
  - [ ] Speed configurable via frontmatter (textTypewriterSpeed)
  - [ ] Characters revealed one-by-one from start to end
  - [ ] Applies to all &lt;text&gt; and &lt;tspan&gt; elements
  - [ ] Respects current animation speed modifiers
  - [ ] Works with various text encodings and special characters

### FR-10: Transport Controls UI
- **Description:** Provide visual controls for animation playback
- **Priority:** High
- **Acceptance Criteria:**
  - [ ] Three buttons: Reset to Beginning, Play/Pause, Skip to End
  - [ ] Uses standard double-arrow and single-arrow icons
  - [ ] Controls appear in: bottom slide controls bar, presenter view, on-hover (configurable)
  - [ ] Position configurable via frontmatter: topLeft, topRight, bottomLeft, bottomRight, none
  - [ ] Controls only visible on SVG animated slides
  - [ ] Visual state indicates playing vs paused
  - [ ] Keyboard shortcuts supported (space for play/pause, etc.)

### FR-11: Color Inversion for Theme Compatibility
- **Description:** Invert lightness of colors to adapt diagrams to dark slide themes
- **Priority:** Medium
- **Acceptance Criteria:**
  - [ ] Enabled via frontmatter (invertLightAndDarkColours: true/false)
  - [ ] Uses OKLCH color space to invert lightness only
  - [ ] Preserves hue and saturation of original colors
  - [ ] Applies to all color properties (fill, stroke, etc.)
  - [ ] Handles gradients, patterns, and semi-transparent colors
  - [ ] Sets appropriate background color for inverted diagram
  - [ ] Black-on-white diagrams render nicely on dark themes

### FR-12: Auto-play Configuration
- **Description:** Control whether animation starts automatically when slide is shown
- **Priority:** Medium
- **Acceptance Criteria:**
  - [ ] Configurable via frontmatter (autoplay: true/false)
  - [ ] When true, animation starts immediately on slide display
  - [ ] When false, user must press play to start
  - [ ] Default behavior is configurable

### FR-13: Show Complete Diagram Option
- **Description:** Display final diagram without animation
- **Priority:** Medium
- **Acceptance Criteria:**
  - [ ] Configurable via frontmatter (showCompleteDiagram: true/false)
  - [ ] When true, entire diagram displays instantly without animation
  - [ ] When false, normal animation behavior applies
  - [ ] Useful for quick reference or when animation not needed

### FR-14: Animation State Persistence
- **Description:** Remember animation progress when navigating between slides
- **Priority:** Medium
- **Acceptance Criteria:**
  - [ ] When navigating away from slide, current animation state is saved
  - [ ] When returning to slide, animation continues from saved position
  - [ ] State includes: which elements are visible, current playback position
  - [ ] Respects user actions (if reset was clicked, state reflects that)

### FR-15: Frontmatter Configuration Schema
- **Description:** Define all configurable options in markdown slide frontmatter
- **Priority:** High
- **Acceptance Criteria:**
  - [ ] `svgFile`: path to SVG file (required)
  - [ ] `animationSpeed`: base animation speed with units (optional, inherits from demo)
  - [ ] `textTypeWriterEffect`: boolean (optional, default false)
  - [ ] `textTypewriterSpeed`: speed for text animation (optional)
  - [ ] `autoplay`: boolean (optional, default true)
  - [ ] `showCompleteDiagram`: boolean (optional, default false)
  - [ ] `invertLightAndDarkColours`: boolean (optional, default false)
  - [ ] `transportControlsPosition`: topLeft|topRight|bottomLeft|bottomRight|none (optional, default bottomRight)
  - [ ] Schema validation provides clear error messages
  - [ ] Documentation with examples for all options

---

## Non-Functional Requirements

### Performance
- **NFR-1:** SVG parsing and animation setup must complete within 500ms for diagrams up to 1000 elements
- **NFR-2:** Animation frame rate must maintain 60fps during playback
- **NFR-3:** Slide rendering must not block UI thread or cause VSCode webview to freeze

### Usability
- **NFR-4:** Frontmatter configuration must use clear, self-documenting property names
- **NFR-5:** Error messages for malformed SVGs or invalid config must be specific and actionable
- **NFR-6:** Transport controls must be accessible via mouse, keyboard, and presentation clickers
- **NFR-7:** Animation speed and timing must feel natural and smooth to viewers

### Compatibility
- **NFR-8:** Must work in VSCode webview environment (Chromium-based)
- **NFR-9:** Must support SVG files from Excalidraw, Inkscape, and Concepts
- **NFR-10:** Must handle variations in SVG structure from different tools gracefully

### Maintainability
- **NFR-11:** SVG parsing logic must be modular and testable independently
- **NFR-12:** Animation engine must be decoupled from React component for reusability
- **NFR-13:** Code must include comprehensive unit tests for parsing and animation logic

---

## Business Rules

1. **BR-1:** All SVG elements must be animated in the exact order they appear in the XML document
2. **BR-2:** Speed modifiers (XML comments) apply to all following elements until a new modifier is encountered
3. **BR-3:** Pause commands occur before the next element is rendered
4. **BR-4:** Strokes must always be drawn before fills for elements that have both
5. **BR-5:** Grouped elements must be ungrouped and animated individually
6. **BR-6:** Aspect ratio must always be preserved when scaling to 960x540
7. **BR-7:** Animation state persists when navigating away and returning to slide
8. **BR-8:** Transport controls only appear on slides with animated SVGs
9. **BR-9:** XML comment directives must be placed between elements, never inside
10. **BR-10:** Color inversion preserves hue and saturation, only inverts lightness

---

## User Stories

### US-1: Animate Architecture Diagram
**As a** technical presenter  
**I want** to progressively reveal an architecture diagram during my talk  
**So that** my audience can follow along as I explain each component

**Acceptance Criteria:**
- [ ] I can create a diagram in Excalidraw and save as SVG
- [ ] I can specify the SVG in my slide's frontmatter
- [ ] The diagram animates component-by-component when I present
- [ ] I can control animation speed to match my speaking pace

### US-2: Add Strategic Pauses
**As a** workshop leader  
**I want** to pause diagram animation at key points  
**So that** I can discuss important concepts before continuing

**Acceptance Criteria:**
- [ ] I can insert `<!--pause:untilPlay-->` comments in my SVG
- [ ] Animation stops at these points until I click play
- [ ] I can resume with my presentation clicker
- [ ] Audience sees a clear visual indicator of the pause

### US-3: Control Animation Pace
**As a** educator creating a tutorial  
**I want** to slow down complex parts and speed up simple parts  
**So that** students can absorb information at the right pace

**Acceptance Criteria:**
- [ ] I can add `<!--speed:0.5-->` to slow down sections
- [ ] I can add `<!--speed:2.0-->` to speed up simple parts
- [ ] I can revert to normal with `<!--speed:1.0-->`
- [ ] Speed changes are smooth and natural

### US-4: Text Typewriter Effect
**As a** presenter explaining code concepts  
**I want** text labels to appear character-by-character  
**So that** it feels like I'm writing on a whiteboard

**Acceptance Criteria:**
- [ ] I enable textTypeWriterEffect in frontmatter
- [ ] Text in my diagram types out character by character
- [ ] Typing speed is configurable
- [ ] Effect works with all text in the SVG

### US-5: Dark Theme Compatibility
**As a** presenter using dark VS Code theme  
**I want** my black-on-white diagrams to look good on dark slides  
**So that** I don't need to create separate diagram versions

**Acceptance Criteria:**
- [ ] I set invertLightAndDarkColours: true in frontmatter
- [ ] Black lines become light, white backgrounds become dark
- [ ] Colors maintain their hue (blue stays blue, red stays red)
- [ ] Diagram is clearly visible on dark slide background

### US-6: Quick Reference Mode
**As a** presenter reviewing completed material  
**I want** to skip animation and show complete diagrams  
**So that** I can quickly navigate to specific slides for Q&A

**Acceptance Criteria:**
- [ ] I set showCompleteDiagram: true in frontmatter
- [ ] Entire diagram appears instantly without animation
- [ ] I can toggle this per-slide as needed
- [ ] Navigation remains fast and responsive

### US-7: Flexible Tool Support
**As a** designer comfortable with Inkscape  
**I want** to use my preferred drawing tool  
**So that** I don't have to learn new software

**Acceptance Criteria:**
- [ ] SVGs created in Inkscape work without modification
- [ ] SVGs from Excalidraw work without modification
- [ ] SVGs from Concepts app work without modification
- [ ] Different grouping/attribute styles are handled gracefully

---

## Data Requirements

### Data Sources
- **SVG Files**: Vector graphics created by external tools (Excalidraw, Inkscape, Concepts, etc.), XML format, loaded once per slide
- **Markdown Frontmatter**: YAML configuration at top of slide markdown files, parsed when slide is loaded
- **Demo Configuration**: JSON/YAML demo definition files, contains global defaults for animation settings

### Data Entities
| Entity | Description | Key Attributes |
|--------|-------------|----------------|
| SVGElement | Parsed SVG drawable element | type, attributes (fill, stroke, opacity), drawOrder, boundingBox |
| AnimationDirective | Control comment from SVG | type (speed/pause), value, position |
| SlideConfig | Frontmatter configuration | svgFile, animationSpeed, textTypeWriterEffect, autoplay, etc. |
| AnimationState | Runtime animation state | currentElementIndex, isPlaying, isPaused, completedElements |

### Data Flows
1. User creates SVG file in drawing tool → saves to project directory
2. User creates markdown slide → specifies SVG path and config in frontmatter
3. User adds demo step → references the markdown slide
4. DemoTime loads slide → parses frontmatter → loads SVG file
5. SVG parser extracts elements in document order → identifies XML comments → builds animation sequence
6. React component calculates bounding box → scales to 960x540 → applies letterboxing
7. Animation engine applies speed/pause directives → animates elements sequentially
8. User interacts with transport controls → state updates → animation responds
9. User navigates away → state persisted → returns → animation resumes from saved position

---

## Integration Requirements

### INT-1: DemoTime Slide System Integration
- **System:** Existing DemoTime slide rendering infrastructure
- **Protocol:** React component integration, follows existing slide type pattern
- **Frequency:** On-demand when slide is displayed
- **Data Format:** Markdown with YAML frontmatter
- **Authentication:** N/A (local file system)

### INT-2: VSCode Webview API
- **System:** VSCode webview rendering engine
- **Protocol:** VSCode Webview API, CSS animations, DOM manipulation
- **Frequency:** Real-time during presentation
- **Data Format:** HTML/CSS/JavaScript
- **Authentication:** N/A (extension runs in trusted context)

### INT-3: File System Access
- **System:** Local file system for loading SVG files
- **Protocol:** Node.js file system API (fs module)
- **Frequency:** Once per slide load
- **Data Format:** SVG (XML)
- **Authentication:** N/A (workspace files)

### INT-4: OKLCH Color Library
- **System:** OKLCH color space conversion library
- **Protocol:** JavaScript library API
- **Frequency:** At animation initialization (if color inversion enabled)
- **Data Format:** Color values (hex, rgb, etc. → oklch)
- **Authentication:** N/A (npm package)

### INT-5: DemoTime Transport Controls
- **System:** Existing slide navigation and control system
- **Protocol:** Extension message passing, event handlers
- **Frequency:** User-triggered events
- **Data Format:** Command messages (play, pause, reset, skip)
- **Authentication:** N/A (internal extension communication)

---

## Constraints

### Technical Constraints
- Must run in VSCode webview environment (Chromium-based)
- Must integrate with existing DemoTime extension architecture
- Must use React for UI components (consistent with existing panels)
- Slide dimensions are fixed at 960x540 pixels
- Must preserve existing DemoTime slide navigation and control behavior
- Must use CSS animations for performance (avoid JavaScript-based animation loops)
- OKLCH library (or equivalent) must be compatible with webview environment and support color inversion
- Path length calculation must work with all SVG path commands (M, L, C, Q, A, etc.)

### Business Constraints
- Feature must not break existing DemoTime functionality
- Must maintain backward compatibility with existing slides
- Implementation should reuse existing DemoTime patterns and conventions
- Documentation must be added to existing DemoTime docs
- MVP approach - defer advanced features (templates, video export, preview) to future releases

### User Experience Constraints
- Animation must feel natural and smooth (60fps minimum)
- Controls must be intuitive without training
- Configuration must be simple enough for typical VS Code users
- Error messages must be actionable (users can fix issues themselves)
- Line speed model must be understandable and configurable without deep technical knowledge

---

## Assumptions

1. Users will prepare SVG files externally using their preferred drawing tools
2. SVG files will be well-formed XML (not corrupted or malformed)
3. Users have basic familiarity with markdown frontmatter syntax
4. VSCode webview environment provides modern browser capabilities (ES6+, CSS animations)
5. SVG files will be reasonably sized (< 5MB, < 10,000 elements) for performance
6. Users understand basic SVG structure enough to insert XML comments
7. Presentation clickers send standard keyboard events (e.g., arrow keys, space)
8. Most diagrams will be created with paths and basic shapes (not exotic SVG features)
9. Color inversion will be needed primarily for black/white diagrams, not complex color schemes
10. Users will test animations before live presentations
11. Users are comfortable with organic adoption of new feature (no migration tooling needed)
12. Line speed model approximates natural hand-drawing sufficiently for user satisfaction
13. Evil Martians OKLCH library or similar can handle color inversion needs

---

## Edge Cases & Error Handling

### Edge Case 1: SVG File Not Found
- **Trigger:** svgFile path in frontmatter points to non-existent file
- **Expected Behavior:** Display error message on slide with file path, suggest checking path or creating file

### Edge Case 2: Malformed SVG XML
- **Trigger:** SVG file contains invalid XML structure
- **Expected Behavior:** Display error message identifying parsing error location (line number if possible)

### Edge Case 3: Empty SVG or No Drawable Elements
- **Trigger:** SVG file has no paths, shapes, or text elements to animate
- **Expected Behavior:** Display blank slide or warning message "No animatable elements found"

### Edge Case 4: Very Large SVG (>10,000 elements)
- **Trigger:** User loads SVG with thousands of elements
- **Expected Behavior:** Show warning about performance, offer to show complete diagram instead

### Edge Case 5: Invalid XML Comment Syntax
- **Trigger:** User writes `<!--speed:abc-->` or `<!--pause:xyz-->`
- **Expected Behavior:** Log warning, ignore invalid directive, continue with previous setting

### Edge Case 6: Nested Groups Beyond Reasonable Depth
- **Trigger:** SVG has groups nested 50+ levels deep
- **Expected Behavior:** Flatten groups up to reasonable depth, warn if truncated

### Edge Case 7: Missing Unit in Time Value
- **Trigger:** User specifies `animationSpeed: 500` without unit
- **Expected Behavior:** Default to milliseconds, document this behavior clearly

### Edge Case 8: Extremely Fast/Slow Speed Values
- **Trigger:** User sets `speed:0.001` or `speed:1000`
- **Expected Behavior:** Clamp to reasonable min/max (e.g., 0.1x to 10x), warn user

### Edge Case 9: Pause During Last Element
- **Trigger:** `<!--pause:untilPlay-->` appears after last element
- **Expected Behavior:** Pause is applied, animation shows as complete but paused

### Edge Case 10: Non-16:9 Aspect Ratio (Square, Portrait)
- **Trigger:** SVG is 1000x1000 or 500x1000
- **Expected Behavior:** Scale to fit within 960x540, letterbox/pillarbox with background color

### Edge Case 11: SVG with Embedded Bitmaps
- **Trigger:** SVG contains `<image>` elements referencing external files
- **Expected Behavior:** Attempt to load and animate (fade in), handle missing images gracefully

### Edge Case 12: Color Inversion with Complex Gradients
- **Trigger:** SVG has multi-stop gradients with transparency
- **Expected Behavior:** Invert each gradient stop's lightness independently

### Edge Case 13: Multiple Concurrent Animations
- **Trigger:** User rapidly navigates between SVG slides
- **Expected Behavior:** Cancel previous animations cleanly, no memory leaks or visual glitches

### Edge Case 14: Animation State When Slide Hidden
- **Trigger:** User minimizes VSCode or switches tabs during animation
- **Expected Behavior:** Pause animation, resume when slide visible again (or remember position)

### Error Handling
| Error Type | User-Facing Message | System Action | Logging |
|------------|---------------------|---------------|---------|
| SVG file not found | "SVG file not found: [path]. Check frontmatter configuration." | Display error on slide | Log error with full path |
| XML parsing error | "Invalid SVG format. Line X: [error detail]" | Display error on slide | Log parse exception |
| Invalid color format | "Could not parse color: [value]. Using default." | Use fallback color | Log warning |
| OKLCH library error | "Color inversion failed. Displaying original colors." | Skip inversion | Log error details |
| Missing frontmatter | "svgFile not specified in frontmatter." | Display error on slide | Log validation error |
| Invalid speed value | "Invalid speed value: [value]. Using default." | Use default speed | Log warning |
| File system permission | "Cannot read SVG file: [path]. Check file permissions." | Display error on slide | Log permission error |

---

## Success Criteria

### Measurable Goals
- [ ] Successfully animate SVG files from Excalidraw, Inkscape, and Concepts without modification
- [ ] Maintain 60fps animation performance for SVGs up to 1000 elements
- [ ] Zero animation glitches or visual artifacts during testing
- [ ] All XML comment directives (speed, pause) work as documented
- [ ] Color inversion produces visually acceptable results for common diagram types
- [ ] Animation state persistence works 100% when navigating between slides
- [ ] Transport controls respond within 100ms to user input

### Definition of Done
- [ ] All 15 functional requirements implemented and tested
- [ ] All user stories have passing acceptance tests
- [ ] Unit tests cover SVG parsing logic (>80% coverage)
- [ ] Integration tests validate animation sequence and timing
- [ ] Performance tests verify 60fps and < 500ms initialization
- [ ] Documentation includes:
  - [ ] Frontmatter configuration reference
  - [ ] XML comment directive syntax
  - [ ] Example SVG files from each supported tool
  - [ ] Troubleshooting guide
  - [ ] Migration guide for existing slide users
- [ ] Code review completed by at least one other developer
- [ ] Manual testing on Windows, macOS, and Linux
- [ ] No P0 or P1 bugs remaining
- [ ] Feature showcased in demo video/presentation

---

## Open Questions

### ✅ RESOLVED QUESTIONS:

1. **Q:** Should animation speed be specified as duration-per-element or duration-for-entire-animation?  
   **Status:** ✅ **Answered**  
   **Decision:** Animation speed represents **line speed** (pseudo pixels per millisecond) to model realistic hand-drawing. This means longer/more complex paths take longer to draw naturally.  
   **Impact:** Requires calculating path lengths and applying speed as a rate, not a fixed duration

2. **Q:** What specific OKLCH library should be used?  
   **Status:** ✅ **Answered**  
   **Decision:** Investigate and potentially use **Evil Martians' OKLCH picker** (https://github.com/evilmartians/oklch-picker) or its underlying color conversion utilities  
   **Impact:** Dependencies and bundle size - need to evaluate library for color inversion needs

3. **Q:** Should there be a visual preview/scrubber for animations in edit mode?  
   **Status:** ✅ **Answered**  
   **Decision:** **No** - Users test in presentation mode (MVP approach, low effort)  
   **Impact:** Reduces initial scope; may be future enhancement based on user feedback

4. **Q:** How should animations interact with slide themes beyond color inversion?  
   **Status:** ✅ **Answered**  
   **Decision:** **Start simple with color inversion only**, but theme color integration would be a nice future enhancement  
   **Impact:** MVP focuses on inversion; theme color support is future work

5. **Q:** Should there be built-in animation templates/presets for common use cases?  
   **Status:** ✅ **Answered**  
   **Decision:** **Future enhancement** - observe usage patterns first before creating templates  
   **Impact:** Reduces initial scope; gather real-world usage data before building presets

6. **Q:** What telemetry (if any) should be collected about SVG animation usage?  
   **Status:** ✅ **Answered**  
   **Decision:** **No telemetry** - respect user privacy  
   **Impact:** No analytics infrastructure needed; rely on user feedback and community engagement

7. **Q:** Should users be able to export animated SVGs as video files?  
   **Status:** ✅ **Answered**  
   **Decision:** **Future enhancement** - valuable but not MVP. Users can use screen recording tools (OBS, etc.)  
   **Impact:** Reduces initial scope significantly; document workarounds

8. **Q:** Are there accessibility requirements for animations (e.g., reduced motion preferences)?  
   **Status:** ✅ **Answered**  
   **Decision:** **No** - presentation tool context means users control when to present; not relevant for controlled presentation environment  
   **Impact:** No need to implement prefers-reduced-motion detection

9. **Q:** Should XML comments support more complex expressions?  
   **Status:** ✅ **Answered**  
   **Decision:** **No** - keep syntax simple for MVP (one directive affects all following elements)  
   **Impact:** Simpler parser implementation; may add scoped directives in future based on demand

10. **Q:** What's the upgrade/migration path for users who want to convert existing static diagram slides?  
    **Status:** ✅ **Answered**  
    **Decision:** **No special tooling** - new feature that users adopt organically. Manual conversion is straightforward.  
    **Impact:** No migration tool development needed; focus documentation on new feature creation

### 🔍 NEW OPEN QUESTIONS:

11. **Q:** What is the exact algorithm for calculating "pixels per millisecond" line speed?  
    **Status:** Open  
    **Owner:** Development Team  
    **Impact:** Core animation timing implementation - needs precise specification

12. **Q:** How should speed be configured in frontmatter - as pixels/ms, or as a more intuitive unit?  
    **Status:** Open  
    **Owner:** UX Designer / Product Owner  
    **Impact:** User experience of configuration - may need conversion from user-friendly units

13. **Q:** Should different element types (paths, shapes, text) use different speed calculations?  
    **Status:** Open  
    **Owner:** Product Owner  
    **Impact:** Animation timing complexity and naturalness

14. **Q:** Does the Evil Martians OKLCH library support all required color formats from SVG files?  
    **Status:** Open  
    **Owner:** Development Team (requires technical investigation)  
    **Impact:** May need fallback color parsing or additional libraries

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-15 | Business Analyst Agent | Initial comprehensive requirements document based on stakeholder interviews |
| 1.1 | 2026-02-15 | Business Analyst Agent | Resolved all 10 open questions, updated requirements for line speed model, clarified MVP scope |

---

## Appendix: Scope Summary (MVP vs Future)

### ✅ IN SCOPE (MVP - Initial Release):
- New animated SVG slide type with React component
- Line speed animation model (pixels per millisecond)
- Sequential element animation (stroke-then-fill)
- XML comment directives (speed, pause, pause:untilPlay)
- Text typewriter effect
- Transport controls (reset, play/pause, skip to end)
- OKLCH-based color inversion (lightness only)
- Auto-scaling to 960x540 with letterboxing
- Animation state persistence
- Support for Excalidraw, Inkscape, Concepts SVGs
- Comprehensive error handling
- Documentation and examples

### 🔮 OUT OF SCOPE (Future Enhancements):
- Animation preview/scrubber in edit mode
- Theme color integration beyond inversion
- Built-in animation templates/presets
- Video export (MP4, GIF, WebM)
- Complex XML directive syntax (scoped, element selectors)
- Migration/conversion tooling for existing slides
- Telemetry/analytics
- Reduced motion accessibility features (not applicable in presentation context)

---

## Appendix: Example Frontmatter Configuration

```yaml
---
layout: animated-svg
svgFile: ./diagrams/architecture.svg
animationSpeed: 100  # pixels per second (line speed model)
textTypeWriterEffect: true
textTypewriterSpeed: 50ms  # time per character
autoplay: true
showCompleteDiagram: false
invertLightAndDarkColours: false
transportControlsPosition: bottomRight
---
```

## Appendix: Example XML Comments in SVG

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
  <!-- Initial elements at normal speed -->
  <path d="M 10 10 L 100 100" stroke="black" />
  
  <!-- Slow down for complex part (50% of normal line speed) -->
  <!--speed:0.5-->
  <path d="M 100 100 L 200 150" stroke="blue" />
  <circle cx="200" cy="150" r="20" fill="red" />
  
  <!-- Pause to explain - wait for user to click play -->
  <!--pause:untilPlay-->
  
  <!-- Speed up for simple parts (2x normal line speed) -->
  <!--speed:2.0-->
  <rect x="250" y="130" width="40" height="40" fill="green" />
  
  <!-- Brief timed pause (500 milliseconds) -->
  <!--pause:500ms-->
  
  <!-- Back to normal speed -->
  <!--speed:1.0-->
  <text x="300" y="150">Database</text>
</svg>
```

## Appendix: Line Speed Model Explanation

**Concept:** Animation speed is defined as the rate at which lines are drawn, measured in pixels per unit time (e.g., pixels per second or pixels per millisecond).

**How it works:**
1. Calculate the total length of each path/element in pixels
2. Divide path length by the current line speed to get animation duration
3. Apply CSS animation with calculated duration to stroke the path
4. Speed modifiers (via XML comments) multiply the base line speed

**Example:**
- Base speed: `100 pixels/second`
- Path length: `500 pixels`
- Animation duration: `500 / 100 = 5 seconds`
- With `<!--speed:2.0-->`: duration becomes `500 / 200 = 2.5 seconds`
- With `<!--speed:0.5-->`: duration becomes `500 / 50 = 10 seconds`

**Benefits:**
- Mimics natural hand-drawing (longer paths take longer)
- Intuitive: faster speed = quicker drawing
- Consistent across different diagram complexities
- Proportional to visual complexity


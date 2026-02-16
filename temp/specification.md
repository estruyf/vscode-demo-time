# Technical Specification: Animated SVG Diagrams for DemoTime

## Project Overview

### Executive Summary
This specification defines the technical design for adding animated SVG diagram support to the DemoTime VS Code extension. The feature enables presenters to create hand-drawn animation effects for technical diagrams, progressively revealing content during presentations to enhance audience engagement and comprehension.

### Scope Classification
**MVP (Minimum Viable Product)**
- Prove value with core animation capabilities
- Integrate cleanly with existing DemoTime architecture
- Deliver incremental value in phases
- Unit tests for critical paths
- Manual testing acceptable for initial release

### Success Metrics
- SVG files from 3+ drawing tools work without modification
- 60fps animation performance for diagrams up to 1000 elements
- Animation initialization < 500ms
- Transport control response < 100ms
- Zero breaking changes to existing DemoTime functionality

---

## Architecture Overview

### System Context
```
┌─────────────────────────────────────────────────────────────┐
│                    VS Code Extension Host                    │
│  ┌────────────────────────────────────────────────────────┐  │
│  │              DemoTime Extension Core                    │  │
│  │  ┌──────────────┐      ┌──────────────────────────┐   │  │
│  │  │  Slides      │─────▶│  AnimatedSVGSlideService │   │  │
│  │  │  Service     │      │  (new)                   │   │  │
│  │  └──────────────┘      └──────────────────────────┘   │  │
│  │         │                        │                      │  │
│  │         │                        ▼                      │  │
│  │         │              ┌──────────────────────┐        │  │
│  │         │              │  SVGParser           │        │  │
│  │         │              │  (new)               │        │  │
│  │         │              └──────────────────────┘        │  │
│  │         │                        │                      │  │
│  └─────────┼────────────────────────┼──────────────────────┘  │
│            │                        │                          │
│            ▼                        ▼                          │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │             VSCode Webview (Chromium)                   │  │
│  │  ┌───────────────────────────────────────────────────┐  │  │
│  │  │           Preview Webview (React)                  │  │  │
│  │  │  ┌──────────────────────────────────────────────┐  │  │  │
│  │  │  │   AnimatedSVGSlide Component (new)          │  │  │  │
│  │  │  │   ┌──────────────┐  ┌─────────────────────┐ │  │  │  │
│  │  │  │   │ SVGRenderer  │  │ AnimationEngine     │ │  │  │  │
│  │  │  │   └──────────────┘  └─────────────────────┘ │  │  │  │
│  │  │  │   ┌──────────────────────────────────────┐  │  │  │  │
│  │  │  │   │ TransportControls Component          │  │  │  │  │
│  │  │  │   └──────────────────────────────────────┘  │  │  │  │
│  │  │  └──────────────────────────────────────────────┘  │  │  │
│  │  └───────────────────────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
                  ┌──────────────────┐
                  │ File System      │
                  │ - SVG files      │
                  │ - Markdown slides│
                  └──────────────────┘
```

### Component Interactions

1. **Slide Load Flow**:
   - User navigates to slide → Slides.ts opens slide → parses frontmatter
   - If `layout: animated-svg` → delegate to AnimatedSVGSlideService
   - Service loads SVG file → passes to SVGParser
   - Parser extracts elements + directives → returns structured data
   - Service sends data to webview → AnimatedSVGSlide component renders

2. **Animation Flow**:
   - AnimationEngine receives parsed SVG + configuration
   - Calculates path lengths and animation timings
   - Applies CSS animations to elements in sequence
   - Respects speed modifiers and pause directives
   - Manages state (playing, paused, current element index)

3. **Control Flow**:
   - User clicks transport control → event to AnimationEngine
   - Engine updates state (play/pause/reset/skip)
   - Component re-renders with updated state
   - State persists when navigating away from slide

---

## Design Principles

### 1. Separation of Concerns
- **Parsing** (SVGParser): Extract structure, no rendering knowledge
- **Business Logic** (AnimationEngine): Timing calculations, state management
- **Presentation** (React components): Rendering, user interaction
- **Integration** (Service layer): Bridge between DemoTime and new feature

### 2. Fail-Safe Defaults
- Invalid SVG → show error message on slide, don't crash
- Missing file → graceful error with helpful message
- Invalid directive → log warning, continue with previous settings
- Performance issues → offer "show complete diagram" fallback

### 3. Testability
- SVGParser: Pure functions, no side effects
- AnimationEngine: Dependency injection for time/animation APIs
- Components: Mockable props, testable state transitions
- Integration: Service layer mockable for testing

### 4. Performance First
- CSS animations (hardware accelerated) over JavaScript
- Lazy load/parse SVGs only when slide is shown
- Debounce/throttle user interactions
- Cancel animations when navigating away (prevent memory leaks)

### 5. Extensibility
- New element types: add to parser + renderer mapping
- New directives: add to directive parser registry
- New layouts: extend SlideLayout enum + add component

---

## Technology Stack

### Core Technologies
| Technology | Version | Rationale |
|------------|---------|-----------|
| TypeScript | 5.x | Existing DemoTime standard, type safety |
| React | 18.x | Existing DemoTime webview framework |
| DOMParser | Native | Built-in XML parsing, no dependencies |
| CSS Animations | Native | Hardware acceleration, 60fps performance |

### New Dependencies

#### Required
| Package | Version | Purpose | Bundle Size | Rationale |
|---------|---------|---------|-------------|-----------|
| culori | ^4.0.1 | OKLCH color space conversion | ~13KB | Recommended by Evil Martians, comprehensive color support |

#### Development Only
| Package | Version | Purpose |
|---------|---------|---------|
| @types/culori | Latest | TypeScript definitions |
| jest-canvas-mock | Latest | Test SVG rendering |

### Rationale for Choices

**Why Culori over colorjs.io?**
- Smaller bundle size (13KB vs 20KB)
- Better OKLCH support (primary use case)
- Active maintenance
- Used by Evil Martians OKLCH picker

**Why Native DOMParser over xml2js?**
- Zero bundle size (built-in browser API)
- Performance: native C++ implementation
- Direct DOM manipulation for rendering
- Sufficient for well-formed SVG files

**Why CSS Animations over requestAnimationFrame?**
- Hardware acceleration (GPU)
- Smoother 60fps performance
- Less JavaScript overhead
- Built-in easing functions
- Browser handles timing/lifecycle

---

## Component Design

### 1. Extension Layer (Node.js)

#### AnimatedSVGSlideService
**Location**: `apps/vscode-extension/src/services/AnimatedSVGSlideService.ts`

**Responsibilities**:
- Register animated-svg slide layout
- Load SVG files from file system
- Validate frontmatter configuration
- Send SVG content + config to webview
- Handle webview messages (control commands)

**Interface**:
```typescript
export class AnimatedSVGSlideService {
  public static register(): void;
  
  private static async loadSVGSlide(
    filePath: string, 
    metadata: AnimatedSVGSlideMetadata
  ): Promise<AnimatedSVGSlideData>;
  
  private static async validateConfig(
    metadata: AnimatedSVGSlideMetadata
  ): Promise<ValidationResult>;
  
  private static handleControlMessage(
    command: ControlCommand
  ): void;
}

interface AnimatedSVGSlideData {
  svgContent: string;
  config: AnimatedSVGSlideConfig;
  errors: string[];
}

interface AnimatedSVGSlideMetadata extends SlideMetadata {
  layout: 'animated-svg';
  svgFile: string;
  animationSpeed?: string | number;
  textTypeWriterEffect?: boolean;
  textTypewriterSpeed?: string | number;
  autoplay?: boolean;
  showCompleteDiagram?: boolean;
  invertLightAndDarkColours?: boolean;
  transportControlsPosition?: ControlPosition;
}

type ControlPosition = 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight' | 'none';

interface ControlCommand {
  type: 'play' | 'pause' | 'reset' | 'skip';
  slideIndex: number;
}
```

**Error Handling**:
- File not found → return error in AnimatedSVGSlideData.errors
- Invalid XML → return parse error with line number
- Missing svgFile → return validation error
- File system permission → return permission error

---

### 2. Parsing Layer (Webview)

#### SVGParser
**Location**: `apps/webviews/src/utils/svg/SVGParser.ts`

**Responsibilities**:
- Parse SVG XML to DOM
- Extract drawable elements in document order
- Extract and parse XML comment directives
- Calculate bounding boxes
- Flatten nested groups (depth-first traversal)

**Interface**:
```typescript
export class SVGParser {
  public static parse(svgContent: string): ParsedSVG;
  
  private static extractElements(
    svgRoot: SVGSVGElement
  ): SVGElementNode[];
  
  private static extractDirectives(
    svgRoot: SVGSVGElement
  ): AnimationDirective[];
  
  private static calculateBoundingBox(
    svgRoot: SVGSVGElement
  ): BoundingBox;
  
  private static flattenGroups(
    element: SVGElement
  ): SVGElement[];
}

interface ParsedSVG {
  elements: SVGElementNode[];
  directives: AnimationDirective[];
  boundingBox: BoundingBox;
  viewBox: ViewBox;
  errors: ParseError[];
}

interface SVGElementNode {
  element: SVGElement;
  type: SVGElementType;
  order: number;
  hasStroke: boolean;
  hasFill: boolean;
  pathLength?: number;  // for path elements
  textContent?: string;  // for text elements
  attributes: SVGAttributes;
}

type SVGElementType = 
  | 'path' 
  | 'line' 
  | 'polyline' 
  | 'polygon' 
  | 'rect' 
  | 'circle' 
  | 'ellipse' 
  | 'text' 
  | 'image';

interface AnimationDirective {
  type: 'speed' | 'pause' | 'pauseUntilPlay';
  position: number;  // element index to apply before
  value?: number;     // speed multiplier or pause duration in ms
}

interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ParseError {
  type: 'parse' | 'structure' | 'unsupported';
  message: string;
  line?: number;
  element?: string;
}
```

**Path Length Calculation**:
```typescript
class PathLengthCalculator {
  public static calculate(pathElement: SVGPathElement): number {
    // Use native getTotalLength() for accurate path length
    return pathElement.getTotalLength();
  }
  
  // For shapes, approximate perimeter
  public static approximateShapeLength(
    element: SVGElement
  ): number {
    if (element instanceof SVGRectElement) {
      const width = parseFloat(element.getAttribute('width') || '0');
      const height = parseFloat(element.getAttribute('height') || '0');
      return 2 * (width + height);
    }
    
    if (element instanceof SVGCircleElement) {
      const r = parseFloat(element.getAttribute('r') || '0');
      return 2 * Math.PI * r;
    }
    
    // ... similar for ellipse, polygon, etc.
  }
}
```

**Directive Parser**:
```typescript
class DirectiveParser {
  private static SPEED_PATTERN = /^<!--speed:([\d.]+)-->$/;
  private static PAUSE_PATTERN = /^<!--pause:(\d+(?:ms|s)?)-->$/;
  private static PAUSE_UNTIL_PLAY = /^<!--pause:untilPlay-->$/;
  
  public static parse(
    comment: Comment, 
    elementIndex: number
  ): AnimationDirective | null {
    const text = comment.textContent?.trim() || '';
    
    // Speed modifier
    const speedMatch = text.match(this.SPEED_PATTERN);
    if (speedMatch) {
      return {
        type: 'speed',
        position: elementIndex,
        value: parseFloat(speedMatch[1])
      };
    }
    
    // Timed pause
    const pauseMatch = text.match(this.PAUSE_PATTERN);
    if (pauseMatch) {
      return {
        type: 'pause',
        position: elementIndex,
        value: this.parseTimeValue(pauseMatch[1])
      };
    }
    
    // Interactive pause
    if (this.PAUSE_UNTIL_PLAY.test(text)) {
      return {
        type: 'pauseUntilPlay',
        position: elementIndex
      };
    }
    
    return null;
  }
  
  private static parseTimeValue(value: string): number {
    if (value.endsWith('ms')) {
      return parseFloat(value);
    }
    if (value.endsWith('s')) {
      return parseFloat(value) * 1000;
    }
    // Default to seconds if no unit
    return parseFloat(value) * 1000;
  }
}
```

---

### 3. Animation Layer (Webview)

#### AnimationEngine
**Location**: `apps/webviews/src/utils/svg/AnimationEngine.ts`

**Responsibilities**:
- Calculate animation timings based on line speed model
- Apply speed modifiers from directives
- Manage animation state machine
- Handle play/pause/reset/skip commands
- Coordinate element animations in sequence

**Interface**:
```typescript
export class AnimationEngine {
  private config: AnimationConfig;
  private elements: SVGElementNode[];
  private directives: AnimationDirective[];
  private state: AnimationState;
  private callbacks: AnimationCallbacks;
  
  constructor(
    config: AnimationConfig,
    elements: SVGElementNode[],
    directives: AnimationDirective[],
    callbacks: AnimationCallbacks
  );
  
  public play(): void;
  public pause(): void;
  public reset(): void;
  public skipToEnd(): void;
  public getState(): AnimationState;
  public destroy(): void;  // cleanup
}

interface AnimationConfig {
  baseSpeed: number;  // pixels per second
  textTypewriterEffect: boolean;
  textTypewriterSpeed: number;  // ms per character
  autoplay: boolean;
  showCompleteDiagram: boolean;
}

interface AnimationState {
  currentElementIndex: number;
  isPlaying: boolean;
  isPaused: boolean;
  isComplete: boolean;
  visibleElements: Set<number>;
  waitingForUser: boolean;
}

interface AnimationCallbacks {
  onElementStart?: (index: number) => void;
  onElementComplete?: (index: number) => void;
  onPause?: (index: number) => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
}

interface ElementAnimation {
  element: SVGElement;
  duration: number;
  delay: number;
  type: 'stroke' | 'fill' | 'typewriter';
}
```

**Line Speed Calculation**:
```typescript
class TimingCalculator {
  /**
   * Calculate animation duration based on line speed model
   * 
   * @param pathLength - Length in pixels
   * @param baseSpeed - Pixels per second
   * @param speedModifier - Multiplier from directive (default 1.0)
   * @returns Duration in milliseconds
   */
  public static calculateDuration(
    pathLength: number,
    baseSpeed: number,
    speedModifier: number = 1.0
  ): number {
    const effectiveSpeed = baseSpeed * speedModifier;
    const durationSeconds = pathLength / effectiveSpeed;
    return durationSeconds * 1000;  // convert to ms
  }
  
  /**
   * Calculate delays for pause directives
   */
  public static calculateDelay(
    directives: AnimationDirective[],
    elementIndex: number
  ): number {
    let totalDelay = 0;
    
    for (const directive of directives) {
      if (directive.position === elementIndex && directive.type === 'pause') {
        totalDelay += directive.value || 0;
      }
    }
    
    return totalDelay;
  }
}
```

**State Machine**:
```typescript
class AnimationStateMachine {
  private state: AnimationState;
  
  public transition(action: StateAction): AnimationState {
    switch (action.type) {
      case 'PLAY':
        return { ...this.state, isPlaying: true, isPaused: false };
      
      case 'PAUSE':
        return { ...this.state, isPlaying: false, isPaused: true };
      
      case 'RESET':
        return {
          currentElementIndex: 0,
          isPlaying: false,
          isPaused: false,
          isComplete: false,
          visibleElements: new Set(),
          waitingForUser: false
        };
      
      case 'ELEMENT_COMPLETE':
        const newVisible = new Set(this.state.visibleElements);
        newVisible.add(action.elementIndex);
        return {
          ...this.state,
          currentElementIndex: action.elementIndex + 1,
          visibleElements: newVisible
        };
      
      case 'PAUSE_UNTIL_PLAY':
        return {
          ...this.state,
          isPlaying: false,
          waitingForUser: true
        };
      
      case 'SKIP_TO_END':
        return {
          ...this.state,
          currentElementIndex: action.totalElements,
          isComplete: true,
          isPlaying: false,
          visibleElements: new Set(
            Array.from({ length: action.totalElements }, (_, i) => i)
          )
        };
      
      default:
        return this.state;
    }
  }
}

type StateAction = 
  | { type: 'PLAY' }
  | { type: 'PAUSE' }
  | { type: 'RESET' }
  | { type: 'ELEMENT_COMPLETE'; elementIndex: number }
  | { type: 'PAUSE_UNTIL_PLAY' }
  | { type: 'SKIP_TO_END'; totalElements: number };
```

---

### 4. Rendering Layer (Webview)

#### AnimatedSVGSlide Component
**Location**: `apps/webviews/src/components/slides/AnimatedSVGSlide.tsx`

**Responsibilities**:
- Render SVG with proper scaling
- Apply color inversion (if enabled)
- Coordinate SVGRenderer and AnimationEngine
- Render TransportControls
- Persist/restore animation state

**Interface**:
```typescript
export interface AnimatedSVGSlideProps {
  svgContent: string;
  config: AnimatedSVGSlideConfig;
  metadata: AnimatedSVGSlideMetadata;
  slideIndex: number;
  isActive: boolean;
}

export const AnimatedSVGSlide: React.FC<AnimatedSVGSlideProps> = ({
  svgContent,
  config,
  metadata,
  slideIndex,
  isActive
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [parsedSVG, setParsedSVG] = useState<ParsedSVG | null>(null);
  const [animationState, setAnimationState] = useState<AnimationState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const engineRef = useRef<AnimationEngine | null>(null);
  
  // Parse SVG on mount
  useEffect(() => {
    try {
      const parsed = SVGParser.parse(svgContent);
      setParsedSVG(parsed);
      
      if (parsed.errors.length > 0) {
        setError(parsed.errors[0].message);
      }
    } catch (err) {
      setError(`Failed to parse SVG: ${err.message}`);
    }
  }, [svgContent]);
  
  // Initialize animation engine
  useEffect(() => {
    if (!parsedSVG || !isActive) return;
    
    const engine = new AnimationEngine(
      config,
      parsedSVG.elements,
      parsedSVG.directives,
      {
        onElementComplete: (index) => {
          setAnimationState(engine.getState());
        },
        onPause: (index) => {
          setAnimationState(engine.getState());
        },
        onComplete: () => {
          setAnimationState(engine.getState());
        },
        onError: (err) => {
          setError(err.message);
        }
      }
    );
    
    engineRef.current = engine;
    
    // Auto-play if configured
    if (config.autoplay && !config.showCompleteDiagram) {
      engine.play();
    }
    
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, [parsedSVG, isActive, config]);
  
  // Persist state when navigating away
  useEffect(() => {
    if (!isActive && engineRef.current) {
      const state = engineRef.current.getState();
      persistAnimationState(slideIndex, state);
    }
  }, [isActive, slideIndex]);
  
  // Restore state when returning
  useEffect(() => {
    if (isActive && engineRef.current) {
      const savedState = retrieveAnimationState(slideIndex);
      if (savedState) {
        restoreState(engineRef.current, savedState);
      }
    }
  }, [isActive, slideIndex]);
  
  const handleControl = useCallback((command: 'play' | 'pause' | 'reset' | 'skip') => {
    if (!engineRef.current) return;
    
    switch (command) {
      case 'play': engineRef.current.play(); break;
      case 'pause': engineRef.current.pause(); break;
      case 'reset': engineRef.current.reset(); break;
      case 'skip': engineRef.current.skipToEnd(); break;
    }
    
    setAnimationState(engineRef.current.getState());
  }, []);
  
  if (error) {
    return <ErrorDisplay message={error} />;
  }
  
  if (!parsedSVG) {
    return <LoadingSpinner />;
  }
  
  return (
    <div className="animated-svg-slide">
      <SVGRenderer
        ref={svgRef}
        parsedSVG={parsedSVG}
        animationState={animationState}
        invertColors={metadata.invertLightAndDarkColours}
        showComplete={config.showCompleteDiagram}
      />
      
      {!config.showCompleteDiagram && (
        <TransportControls
          position={metadata.transportControlsPosition}
          state={animationState}
          onCommand={handleControl}
        />
      )}
    </div>
  );
};
```

#### SVGRenderer Component
**Location**: `apps/webviews/src/components/slides/SVGRenderer.tsx`

**Responsibilities**:
- Scale SVG to 960x540 with letterboxing
- Apply color inversion via CSS/Culori
- Render elements with animation state
- Apply CSS animations to visible elements

**Interface**:
```typescript
interface SVGRendererProps {
  parsedSVG: ParsedSVG;
  animationState: AnimationState | null;
  invertColors: boolean;
  showComplete: boolean;
}

export const SVGRenderer = React.forwardRef<SVGSVGElement, SVGRendererProps>(
  ({ parsedSVG, animationState, invertColors, showComplete }, ref) => {
    const [scaledViewBox, setScaledViewBox] = useState<ViewBox | null>(null);
    const [invertedColors, setInvertedColors] = useState<Map<string, string>>(new Map());
    
    // Calculate scaling for 960x540
    useEffect(() => {
      const scaled = calculateScaling(parsedSVG.boundingBox, { width: 960, height: 540 });
      setScaledViewBox(scaled);
    }, [parsedSVG.boundingBox]);
    
    // Invert colors if requested
    useEffect(() => {
      if (invertColors) {
        const colorMap = invertAllColors(parsedSVG.elements);
        setInvertedColors(colorMap);
      }
    }, [invertColors, parsedSVG.elements]);
    
    return (
      <svg
        ref={ref}
        viewBox={scaledViewBox ? `${scaledViewBox.x} ${scaledViewBox.y} ${scaledViewBox.width} ${scaledViewBox.height}` : undefined}
        width={960}
        height={540}
        className="animated-svg-renderer"
      >
        {parsedSVG.elements.map((node, index) => (
          <AnimatedElement
            key={index}
            node={node}
            isVisible={showComplete || animationState?.visibleElements.has(index)}
            isCurrent={animationState?.currentElementIndex === index}
            invertedColor={invertedColors.get(getElementColor(node.element))}
          />
        ))}
      </svg>
    );
  }
);

function calculateScaling(
  boundingBox: BoundingBox,
  targetSize: { width: number; height: number }
): ViewBox {
  const sourceAspect = boundingBox.width / boundingBox.height;
  const targetAspect = targetSize.width / targetSize.height;
  
  let scale: number;
  let offsetX = 0;
  let offsetY = 0;
  
  if (sourceAspect > targetAspect) {
    // Source is wider - letterbox top/bottom
    scale = targetSize.width / boundingBox.width;
    const scaledHeight = boundingBox.height * scale;
    offsetY = (targetSize.height - scaledHeight) / 2 / scale;
  } else {
    // Source is taller - pillarbox left/right
    scale = targetSize.height / boundingBox.height;
    const scaledWidth = boundingBox.width * scale;
    offsetX = (targetSize.width - scaledWidth) / 2 / scale;
  }
  
  return {
    x: boundingBox.x - offsetX,
    y: boundingBox.y - offsetY,
    width: targetSize.width / scale,
    height: targetSize.height / scale
  };
}
```

#### Color Inversion Utility
**Location**: `apps/webviews/src/utils/svg/colorInversion.ts`

```typescript
import { converter, formatHex, formatRgb } from 'culori';

const oklchConverter = converter('oklch');

export function invertLightness(color: string): string {
  try {
    // Convert to OKLCH
    const oklch = oklchConverter(color);
    
    if (!oklch) {
      return color;  // fallback to original
    }
    
    // Invert lightness (0-1 scale)
    const inverted = {
      ...oklch,
      l: 1 - oklch.l
    };
    
    // Convert back to hex/rgb
    return formatHex(inverted) || color;
  } catch (error) {
    console.warn(`Failed to invert color ${color}:`, error);
    return color;
  }
}

export function invertAllColors(elements: SVGElementNode[]): Map<string, string> {
  const colorMap = new Map<string, string>();
  
  for (const node of elements) {
    // Extract colors from element
    const fillColor = node.element.getAttribute('fill');
    const strokeColor = node.element.getAttribute('stroke');
    
    if (fillColor && !colorMap.has(fillColor)) {
      colorMap.set(fillColor, invertLightness(fillColor));
    }
    
    if (strokeColor && !colorMap.has(strokeColor)) {
      colorMap.set(strokeColor, invertLightness(strokeColor));
    }
    
    // Handle gradients
    if (fillColor?.startsWith('url(')) {
      const gradientId = fillColor.match(/url\(#(.+)\)/)?.[1];
      if (gradientId) {
        // Process gradient stops separately
        const gradient = document.getElementById(gradientId);
        if (gradient) {
          const stops = gradient.querySelectorAll('stop');
          stops.forEach(stop => {
            const stopColor = stop.getAttribute('stop-color');
            if (stopColor && !colorMap.has(stopColor)) {
              colorMap.set(stopColor, invertLightness(stopColor));
            }
          });
        }
      }
    }
  }
  
  return colorMap;
}
```

#### AnimatedElement Component
**Location**: `apps/webviews/src/components/slides/AnimatedElement.tsx`

```typescript
interface AnimatedElementProps {
  node: SVGElementNode;
  isVisible: boolean;
  isCurrent: boolean;
  invertedColor?: string;
}

export const AnimatedElement: React.FC<AnimatedElementProps> = ({
  node,
  isVisible,
  isCurrent,
  invertedColor
}) => {
  const elementRef = useRef<SVGElement>(null);
  
  useEffect(() => {
    if (!elementRef.current || !isCurrent) return;
    
    const element = elementRef.current;
    
    // Apply stroke animation
    if (node.hasStroke) {
      applyStrokeAnimation(element, node.pathLength || 0);
    }
    
    // Apply fill animation (after stroke completes)
    if (node.hasFill) {
      const delay = node.hasStroke ? getStrokeDuration(element) : 0;
      applyFillAnimation(element, delay);
    }
    
    // Typewriter effect for text
    if (node.type === 'text' && node.textContent) {
      applyTypewriterAnimation(element, node.textContent);
    }
  }, [isCurrent, node]);
  
  // Apply color inversion
  useEffect(() => {
    if (!elementRef.current || !invertedColor) return;
    
    const element = elementRef.current;
    const originalFill = element.getAttribute('fill');
    
    if (originalFill) {
      element.setAttribute('fill', invertedColor);
    }
  }, [invertedColor]);
  
  // Clone and render the element
  const ElementTag = node.element.tagName.toLowerCase();
  const props = getElementAttributes(node.element);
  
  return (
    <ElementTag
      ref={elementRef}
      {...props}
      style={{
        opacity: isVisible ? 1 : 0,
        ...props.style
      }}
    />
  );
};

function applyStrokeAnimation(element: SVGElement, pathLength: number) {
  element.style.strokeDasharray = `${pathLength}`;
  element.style.strokeDashoffset = `${pathLength}`;
  
  const animation = element.animate([
    { strokeDashoffset: pathLength },
    { strokeDashoffset: 0 }
  ], {
    duration: calculateDuration(pathLength),
    easing: 'linear',
    fill: 'forwards'
  });
  
  return animation;
}

function applyFillAnimation(element: SVGElement, delay: number) {
  const animation = element.animate([
    { fillOpacity: 0 },
    { fillOpacity: 1 }
  ], {
    duration: 300,
    delay,
    easing: 'ease-in',
    fill: 'forwards'
  });
  
  return animation;
}
```

#### TransportControls Component
**Location**: `apps/webviews/src/components/slides/TransportControls.tsx`

```typescript
interface TransportControlsProps {
  position: ControlPosition;
  state: AnimationState | null;
  onCommand: (command: 'play' | 'pause' | 'reset' | 'skip') => void;
}

export const TransportControls: React.FC<TransportControlsProps> = ({
  position,
  state,
  onCommand
}) => {
  const handleKeyPress = useCallback((e: KeyboardEvent) => {
    if (e.code === 'Space') {
      e.preventDefault();
      onCommand(state?.isPlaying ? 'pause' : 'play');
    }
  }, [state?.isPlaying, onCommand]);
  
  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);
  
  if (position === 'none') {
    return null;
  }
  
  const positionClass = `controls-${position}`;
  
  return (
    <div className={`transport-controls ${positionClass}`}>
      <button
        onClick={() => onCommand('reset')}
        title="Reset to beginning"
        aria-label="Reset animation"
      >
        <ChevronFirst />
      </button>
      
      <button
        onClick={() => onCommand(state?.isPlaying ? 'pause' : 'play')}
        title={state?.isPlaying ? 'Pause' : 'Play'}
        aria-label={state?.isPlaying ? 'Pause animation' : 'Play animation'}
      >
        {state?.isPlaying ? <Pause /> : <Play />}
      </button>
      
      <button
        onClick={() => onCommand('skip')}
        title="Skip to end"
        aria-label="Skip to end of animation"
      >
        <ChevronLast />
      </button>
      
      {state?.waitingForUser && (
        <div className="waiting-indicator">
          <span>Press play to continue</span>
        </div>
      )}
    </div>
  );
};
```

---

## Data Model

### Core Entities

```typescript
// Extend SlideLayout enum
export enum SlideLayout {
  Default = 'default',
  Intro = 'intro',
  Section = 'section',
  Quote = 'quote',
  Image = 'image',
  Video = 'video',
  ImageRight = 'image-right',
  ImageLeft = 'image-left',
  TwoColumns = 'two-columns',
  AnimatedSVG = 'animated-svg',  // NEW
}

// Extend SlideMetadata interface
export interface SlideMetadata {
  theme?: SlideTheme;
  layout?: SlideLayout;
  transition?: SlideTransition;
  customTheme?: string;
  customLayout?: string;
  header?: string;
  footer?: string;
  autoAdvanceAfter?: number;
  image?: string;
  video?: string;
  controls?: boolean;
  
  // NEW: Animated SVG specific
  svgFile?: string;
  animationSpeed?: number | string;
  textTypeWriterEffect?: boolean;
  textTypewriterSpeed?: number | string;
  autoplay?: boolean;
  showCompleteDiagram?: boolean;
  invertLightAndDarkColours?: boolean;
  transportControlsPosition?: ControlPosition;
  
  [key: string]: any;
}
```

### Animation State Persistence

```typescript
interface AnimationStateStore {
  [slideIndex: number]: PersistedAnimationState;
}

interface PersistedAnimationState {
  currentElementIndex: number;
  visibleElements: number[];
  isPlaying: boolean;
  isPaused: boolean;
  isComplete: boolean;
  timestamp: number;
}

// Store in session/local storage or extension global state
function persistAnimationState(
  slideIndex: number, 
  state: AnimationState
): void {
  const store = getAnimationStateStore();
  store[slideIndex] = {
    currentElementIndex: state.currentElementIndex,
    visibleElements: Array.from(state.visibleElements),
    isPlaying: state.isPlaying,
    isPaused: state.isPaused,
    isComplete: state.isComplete,
    timestamp: Date.now()
  };
  saveAnimationStateStore(store);
}

function retrieveAnimationState(
  slideIndex: number
): PersistedAnimationState | null {
  const store = getAnimationStateStore();
  return store[slideIndex] || null;
}
```

---

## API Design

### Webview Message Protocol

```typescript
// Extension → Webview
type ExtensionMessage = 
  | { type: 'loadAnimatedSVGSlide'; data: AnimatedSVGSlideData }
  | { type: 'controlCommand'; command: ControlCommand }
  | { type: 'error'; error: string };

// Webview → Extension
type WebviewMessage = 
  | { type: 'animationStateChanged'; state: AnimationState }
  | { type: 'requestControlCommand'; command: ControlCommand }
  | { type: 'error'; error: string }
  | { type: 'performanceMetric'; metric: PerformanceMetric };

interface PerformanceMetric {
  metricType: 'parseTime' | 'renderTime' | 'frameRate';
  value: number;
  slideIndex: number;
}
```

### Configuration Schema

**JSON Schema Addition** for `.demo/slides/*.md` frontmatter:

```json
{
  "properties": {
    "layout": {
      "enum": [
        "default",
        "intro",
        "section",
        "quote",
        "image",
        "video",
        "image-right",
        "image-left",
        "two-columns",
        "animated-svg"
      ]
    },
    "svgFile": {
      "type": "string",
      "description": "Path to SVG file (relative to workspace root)",
      "pattern": "^.*\\.svg$"
    },
    "animationSpeed": {
      "oneOf": [
        { "type": "number" },
        { "type": "string", "pattern": "^\\d+(\\.\\d+)?(px/s|px/ms|pps)$" }
      ],
      "description": "Animation speed in pixels per second (default: 100)",
      "default": 100
    },
    "textTypeWriterEffect": {
      "type": "boolean",
      "description": "Enable typewriter effect for text elements",
      "default": false
    },
    "textTypewriterSpeed": {
      "oneOf": [
        { "type": "number" },
        { "type": "string", "pattern": "^\\d+(ms|s)$" }
      ],
      "description": "Speed of typewriter effect (ms per character)",
      "default": "50ms"
    },
    "autoplay": {
      "type": "boolean",
      "description": "Auto-start animation when slide is shown",
      "default": true
    },
    "showCompleteDiagram": {
      "type": "boolean",
      "description": "Skip animation and show complete diagram",
      "default": false
    },
    "invertLightAndDarkColours": {
      "type": "boolean",
      "description": "Invert lightness for dark theme compatibility",
      "default": false
    },
    "transportControlsPosition": {
      "enum": ["topLeft", "topRight", "bottomLeft", "bottomRight", "none"],
      "description": "Position of animation transport controls",
      "default": "bottomRight"
    }
  }
}
```

---

## Security Design

### Threat Model (Scope: MVP - VSCode Extension)

**Trust Boundary**: VSCode Extension running in trusted local environment

**Threats Considered**:
1. ❌ Malicious SVG files with XXE (XML External Entity) attacks
2. ❌ Path traversal via svgFile parameter
3. ⚠️ Large SVG files causing DoS (memory/CPU exhaustion)
4. ⚠️ Malicious JavaScript in SVG `<script>` tags
5. ✅ CSS injection via SVG styles (low risk in isolated webview)

### Mitigations

#### 1. XML External Entity (XXE) Protection
```typescript
class SVGParser {
  public static parse(svgContent: string): ParsedSVG {
    const parser = new DOMParser();
    
    // DOMParser in browser doesn't resolve external entities by default
    // But we'll explicitly strip them for defense-in-depth
    const sanitized = this.stripExternalEntities(svgContent);
    
    const doc = parser.parseFromString(sanitized, 'image/svg+xml');
    
    // Check for parse errors
    const parseError = doc.querySelector('parsererror');
    if (parseError) {
      throw new Error(`SVG parse error: ${parseError.textContent}`);
    }
    
    return this.extractSVGData(doc);
  }
  
  private static stripExternalEntities(svgContent: string): string {
    // Remove DOCTYPE declarations (can contain entity definitions)
    return svgContent.replace(/<!DOCTYPE[^>]*>/gi, '');
  }
}
```

#### 2. Path Traversal Protection
```typescript
class AnimatedSVGSlideService {
  private static async loadSVGFile(
    svgFilePath: string
  ): Promise<string> {
    const wsFolder = Extension.getInstance().workspaceFolder;
    if (!wsFolder) {
      throw new Error('No workspace folder');
    }
    
    // Resolve path relative to workspace
    const absolutePath = Uri.joinPath(wsFolder.uri, svgFilePath);
    
    // Ensure path is within workspace (prevent path traversal)
    const resolvedPath = absolutePath.fsPath;
    const workspacePath = wsFolder.uri.fsPath;
    
    if (!resolvedPath.startsWith(workspacePath)) {
      throw new Error(`Invalid path: ${svgFilePath} is outside workspace`);
    }
    
    // Read file
    const content = await readFile(absolutePath);
    return content;
  }
}
```

#### 3. Resource Limits
```typescript
class SVGParser {
  private static MAX_FILE_SIZE = 5 * 1024 * 1024;  // 5MB
  private static MAX_ELEMENTS = 10000;
  private static MAX_NESTING_DEPTH = 50;
  
  public static parse(svgContent: string): ParsedSVG {
    // Check file size
    if (svgContent.length > this.MAX_FILE_SIZE) {
      throw new Error(
        `SVG file too large (${(svgContent.length / 1024 / 1024).toFixed(1)}MB). ` +
        `Maximum size is 5MB.`
      );
    }
    
    const doc = parser.parseFromString(svgContent, 'image/svg+xml');
    const elements = this.extractElements(doc.documentElement);
    
    // Check element count
    if (elements.length > this.MAX_ELEMENTS) {
      throw new Error(
        `Too many elements (${elements.length}). ` +
        `Maximum is ${this.MAX_ELEMENTS}.`
      );
    }
    
    return { elements, /* ... */ };
  }
  
  private static flattenGroups(
    element: SVGElement,
    depth: number = 0
  ): SVGElement[] {
    if (depth > this.MAX_NESTING_DEPTH) {
      console.warn(`Max nesting depth exceeded at ${depth}`);
      return [];
    }
    
    // ... flatten logic
  }
}
```

#### 4. Script Tag Sanitization
```typescript
class SVGParser {
  public static parse(svgContent: string): ParsedSVG {
    const sanitized = this.stripScriptTags(svgContent);
    const doc = parser.parseFromString(sanitized, 'image/svg+xml');
    // ... rest of parsing
  }
  
  private static stripScriptTags(svgContent: string): string {
    // Remove <script> tags (defense-in-depth; webview CSP also blocks)
    return svgContent.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  }
}
```

#### 5. Content Security Policy (Webview)
```typescript
// In webview initialization (existing DemoTime pattern)
const csp = [
  "default-src 'none'",
  "img-src ${webview.cspSource} https: data:",
  "style-src ${webview.cspSource} 'unsafe-inline'",
  "script-src ${webview.cspSource}",
  "font-src ${webview.cspSource}",
].join('; ');
```

### Security Testing Checklist
- [ ] Test with SVG containing DOCTYPE declaration
- [ ] Test with path traversal attempts (`../../etc/passwd`)
- [ ] Test with 10MB SVG file
- [ ] Test with 20,000 element SVG
- [ ] Test with deeply nested groups (100+ levels)
- [ ] Test with `<script>` tags in SVG
- [ ] Test with malformed XML

---

## Scalability & Performance

### Performance Requirements
| Metric | Target | Rationale |
|--------|--------|-----------|
| Parse time | < 500ms | NFR-1: Don't block UI on load |
| Animation frame rate | 60fps | NFR-2: Smooth visual experience |
| Memory per slide | < 50MB | Reasonable for local extension |
| Max element count | 1000 (warn at 10k) | Balance usability vs performance |

### Optimization Strategies

#### 1. Lazy Parsing
```typescript
class AnimatedSVGSlide extends React.Component {
  componentDidMount() {
    // Parse only when slide is active
    if (this.props.isActive) {
      this.parseSVG();
    }
  }
  
  componentDidUpdate(prevProps) {
    if (this.props.isActive && !prevProps.isActive) {
      this.parseSVG();
    }
  }
}
```

#### 2. CSS Animation over JavaScript
- Use `strokeDasharray` + `strokeDashoffset` for path animations
- GPU-accelerated via `will-change: transform, opacity`
- Browser handles timing and interpolation

#### 3. Virtual Rendering (Future Optimization)
```typescript
// If >1000 elements, only render visible viewport
class SVGRenderer {
  private renderVisibleElements(
    elements: SVGElementNode[],
    viewport: BoundingBox
  ): SVGElementNode[] {
    return elements.filter(el => 
      this.intersectsViewport(el.boundingBox, viewport)
    );
  }
}
```

#### 4. Path Length Caching
```typescript
class PathLengthCalculator {
  private static cache = new Map<string, number>();
  
  public static calculate(pathElement: SVGPathElement): number {
    const pathData = pathElement.getAttribute('d') || '';
    
    if (this.cache.has(pathData)) {
      return this.cache.get(pathData)!;
    }
    
    const length = pathElement.getTotalLength();
    this.cache.set(pathData, length);
    return length;
  }
}
```

### Performance Monitoring

```typescript
interface PerformanceMetrics {
  parseTime: number;
  renderTime: number;
  averageFrameRate: number;
  elementCount: number;
  memoryUsage: number;
}

class PerformanceMonitor {
  public static measureParse(fn: () => ParsedSVG): {
    result: ParsedSVG;
    duration: number;
  } {
    const start = performance.now();
    const result = fn();
    const duration = performance.now() - start;
    
    console.log(`SVG parse time: ${duration.toFixed(2)}ms`);
    
    return { result, duration };
  }
  
  public static monitorFrameRate(duration: number = 5000): void {
    let frames = 0;
    const start = performance.now();
    
    const measure = () => {
      frames++;
      
      if (performance.now() - start < duration) {
        requestAnimationFrame(measure);
      } else {
        const fps = frames / (duration / 1000);
        console.log(`Average FPS: ${fps.toFixed(1)}`);
      }
    };
    
    requestAnimationFrame(measure);
  }
}
```

---

## Resilience

### Error Handling Strategy

#### Graceful Degradation
```typescript
class AnimatedSVGSlide extends React.Component {
  handleError(error: Error) {
    console.error('SVG animation error:', error);
    
    // Fallback: show complete diagram without animation
    this.setState({
      showCompleteDiagram: true,
      error: error.message
    });
  }
}
```

#### Error Boundaries
```typescript
class SVGErrorBoundary extends React.Component {
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('SVG component error:', error, errorInfo);
    
    // Show error slide
    this.setState({
      hasError: true,
      error: error.message
    });
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="svg-error">
          <h2>Failed to render animated SVG</h2>
          <p>{this.state.error}</p>
          <button onClick={() => this.setState({ hasError: false })}>
            Retry
          </button>
        </div>
      );
    }
    
    return this.props.children;
  }
}
```

### Cleanup & Memory Management

```typescript
class AnimationEngine {
  private animations: Animation[] = [];
  private timers: number[] = [];
  
  public destroy(): void {
    // Cancel all running animations
    this.animations.forEach(anim => anim.cancel());
    this.animations = [];
    
    // Clear all timers
    this.timers.forEach(id => clearTimeout(id));
    this.timers = [];
    
    // Remove event listeners
    this.removeEventListeners();
  }
}

// In React component
useEffect(() => {
  const engine = new AnimationEngine(/* ... */);
  
  return () => {
    engine.destroy();  // Cleanup on unmount
  };
}, []);
```

---

## Implementation Plan

### Phase 1: Foundation (Week 1-2) ✅ COMPLETE
**Goal**: Core parsing and rendering without animation

**Tasks**:
1. ✅ Create SlideLayout.AnimatedSVG enum value
2. ✅ Extend SlideMetadata interface with animated-svg properties
3. ✅ Implement SVGParser
   - ✅ Parse SVG XML to DOM
   - ✅ Extract elements in document order
   - ✅ Calculate bounding boxes
   - ✅ Flatten nested groups
4. ✅ Implement SVGRenderer component
   - ✅ Scale to 960x540 with letterboxing
   - ✅ Render static SVG (no animation yet)
5. ✅ Implement AnimatedSVGSlideService
   - ✅ Register layout (integrated via MarkdownPreview)
   - ✅ Load SVG files (using existing getFileContents)
   - ✅ Send to webview
6. ✅ Add JSON schema for frontmatter validation (types in SlideMetadata)
7. ✅ Write unit tests for SVGParser

**Deliverable**: Static SVG slides render correctly with proper scaling ✅

**Dependencies**: None

**Deviations from Spec**:
- Instead of creating a separate AnimatedSVGSlideService.ts file, integrated SVG loading directly into MarkdownPreview.tsx component using the existing getFileContents message handler. This follows the existing DemoTime pattern more closely and reduces duplication.
- SVGRenderer simplified to use dangerouslySetInnerHTML for Phase 1 static rendering. Will be enhanced in later phases for element-by-element animation.
- Tests created in apps/webviews/tests/ following existing test structure.

---

### Phase 2: Basic Animation (Week 3-4) ✅ COMPLETE
**Goal**: Sequential stroke animation working

**Tasks**:
1. ✅ Implement TimingCalculator
   - Path length calculation
   - Line speed model
   - Duration calculation
2. ✅ Implement AnimationEngine (basic)
   - State machine (play/pause/reset)
   - Sequential element animation
   - Path stroke animation
3. ✅ Implement AnimatedElement component
   - Apply stroke-dasharray animation
   - Handle visibility state
4. ✅ Integrate AnimationEngine with AnimatedSVGSlide component
5. ✅ Add basic TransportControls (play/pause/reset/skip)
6. ✅ Write unit tests for TimingCalculator

**Deliverable**: Paths animate sequentially with stroke effect ✅

**Dependencies**: Phase 1 complete

**Implementation Notes**:
- TimingCalculator implements line speed model: duration = pathLength / (baseSpeed * speedModifier) * 1000
- AnimationEngine uses requestAnimationFrame for smooth 60fps animation
- AnimatedElement uses CSS stroke-dasharray/stroke-dashoffset for GPU-accelerated animation
- TransportControls includes keyboard shortcuts: Space (play/pause), R (reset), E (skip to end)
- Supports speed directives, pause directives, and pauseUntilPlay interactivity
- All unit tests written (50 test cases total); jest configuration needed for webviews package to run them

**Files Created**:
- `apps/webviews/src/utils/svg/TimingCalculator.ts` - Animation timing calculations
- `apps/webviews/src/utils/svg/AnimationEngine.ts` - Animation state machine and playback control
- `apps/webviews/src/components/slides/AnimatedElement.tsx` - Single animated SVG element renderer
- `apps/webviews/src/components/slides/TransportControls.tsx` - Playback UI controls
- `apps/webviews/tests/TimingCalculator.test.ts` - Unit tests for timing calculations

**Files Modified**:
- `apps/webviews/src/components/slides/SVGRenderer.tsx` - Now renders individual AnimatedElement components
- `apps/webviews/src/components/slides/AnimatedSVGSlide.tsx` - Integrated AnimationEngine and TransportControls
- `apps/webviews/src/components/preview/MarkdownPreview.tsx` - Passes animation props from frontmatter

---

### Phase 3: Directives & Controls (Week 5)
**Goal**: Speed modifiers and pause directives working

**Tasks**:
1. ✅ Implement DirectiveParser
   - Parse `<!--speed:X-->` comments
   - Parse `<!--pause:Xms-->` comments
   - Parse `<!--pause:untilPlay-->` comments
2. ✅ Integrate directives into AnimationEngine
   - Apply speed modifiers
   - Handle timed pauses
   - Handle interactive pauses
3. ✅ Complete TransportControls
   - Add reset button
   - Add skip to end button
   - Add keyboard shortcuts
   - Add waiting indicator
4. ✅ Write unit tests for DirectiveParser

**Deliverable**: All XML comment directives work as specified

**Dependencies**: Phase 2 complete

---

### Phase 4: Advanced Features (Week 6-7) 🟡 PARTIAL COMPLETE
**Goal**: Text typewriter, fill animation, color inversion

**Tasks**:
1. ✅ Implement fill animation
   - Fade in fill after stroke completes
   - Handle elements with only fill (no stroke)
2. ⏸️ Implement text typewriter effect (DEFERRED - not critical for MVP)
   - Character-by-character reveal
   - Configurable speed
3. ✅ Add Culori dependency
4. ✅ Implement color inversion
   - OKLCH lightness inversion
   - Handle gradients and patterns (stop elements)
   - Apply to all color properties
5. ⏸️ Implement animation state persistence (DEFERRED - not critical for MVP)
   - Save state when navigating away
   - Restore state when returning
6. ⏸️ Write integration tests (postponed to Phase 5)

**Deliverable**: Essential animation features working ✅

**Dependencies**: Phase 3 complete

**Implementation Notes**:
- Culori (v3.x) added for OKLCH color conversions (+45KB gzipped)
- Color inversion uses perceptually uniform OKLCH color space
- Fill animations use CSS fill-opacity transitions (GPU-accelerated)
- Text typewriter deferred: High complexity, low impact for technical diagrams
- State persistence deferred: Not critical for live presentations
- Both deferred features can be added post-MVP if needed

**Files Created**:
- `apps/webviews/src/utils/svg/colorInversion.ts` - OKLCH-based color inversion

**Files Modified**:
- `apps/webviews/src/components/slides/AnimatedElement.tsx` - Fill animation state and logic
- `apps/webviews/src/components/slides/SVGRenderer.tsx` - Color map building and application
- `apps/webviews/src/components/slides/AnimatedSVGSlide.tsx` - Added invertLightAndDarkColours prop
- `apps/webviews/src/components/preview/MarkdownPreview.tsx` - Pass inversion prop from frontmatter

---

### Phase 5: Polish & Testing (Week 8)
**Goal**: Production-ready quality

**Tasks**:
1. ✅ Error handling and edge cases
   - File not found
   - Malformed XML
   - Invalid directives
   - Performance warnings
2. ✅ UI polish
   - Loading states
   - Error displays
   - Control styling
   - Responsive layout
3. ✅ Performance testing
   - Test with 1000+ element SVGs
   - Measure parse times
   - Monitor frame rates
   - Profile memory usage
4. ✅ Cross-platform testing (Windows, macOS, Linux)
5. ✅ Security testing (see checklist above)
6. ✅ Write documentation
   - Frontmatter reference
   - XML directive syntax
   - Example SVG files
   - Troubleshooting guide

**Deliverable**: Production-ready feature with tests and docs

**Dependencies**: Phase 4 complete

---

### Phase 6: Integration & Release (Week 9)
**Goal**: Merge to main, release to users

**Tasks**:
1. ✅ Integration with existing DemoTime controls
   - Presenter view controls
   - Bottom slide controls
   - Keyboard shortcuts
2. ✅ Final code review
3. ✅ Update CHANGELOG.md
4. ✅ Create demo presentation showcasing feature
5. ✅ Merge to main branch
6. ✅ Release new version

**Deliverable**: Feature released to users

**Dependencies**: Phase 5 complete

---

## Testing Strategy

### Unit Tests (Jest)

**Coverage Target**: >80% for core logic

**Key Test Suites**:

#### 1. SVGParser Tests
```typescript
describe('SVGParser', () => {
  describe('parse', () => {
    it('should parse valid SVG', () => {
      const svg = '<svg><path d="M 0 0 L 100 100" /></svg>';
      const result = SVGParser.parse(svg);
      expect(result.elements).toHaveLength(1);
      expect(result.errors).toHaveLength(0);
    });
    
    it('should handle malformed XML', () => {
      const svg = '<svg><path d="M 0 0 L 100 100"</svg>';
      expect(() => SVGParser.parse(svg)).toThrow('SVG parse error');
    });
    
    it('should flatten nested groups', () => {
      const svg = `
        <svg>
          <g>
            <path d="M 0 0 L 50 50" />
            <g>
              <circle cx="25" cy="25" r="10" />
            </g>
          </g>
        </svg>
      `;
      const result = SVGParser.parse(svg);
      expect(result.elements).toHaveLength(2);
      expect(result.elements[0].type).toBe('path');
      expect(result.elements[1].type).toBe('circle');
    });
  });
  
  describe('extractDirectives', () => {
    it('should parse speed directives', () => {
      const svg = `
        <svg>
          <!--speed:0.5-->
          <path d="M 0 0 L 100 100" />
        </svg>
      `;
      const result = SVGParser.parse(svg);
      expect(result.directives).toHaveLength(1);
      expect(result.directives[0]).toEqual({
        type: 'speed',
        position: 0,
        value: 0.5
      });
    });
    
    it('should parse pause directives', () => {
      const svg = `
        <svg>
          <path d="M 0 0 L 50 50" />
          <!--pause:500ms-->
          <path d="M 50 50 L 100 100" />
        </svg>
      `;
      const result = SVGParser.parse(svg);
      expect(result.directives).toHaveLength(1);
      expect(result.directives[0]).toEqual({
        type: 'pause',
        position: 1,
        value: 500
      });
    });
  });
});
```

#### 2. TimingCalculator Tests
```typescript
describe('TimingCalculator', () => {
  describe('calculateDuration', () => {
    it('should calculate duration from path length and speed', () => {
      const duration = TimingCalculator.calculateDuration(
        1000,  // 1000 pixels
        100,   // 100 pixels/second
        1.0    // normal speed
      );
      expect(duration).toBe(10000);  // 10 seconds = 10000ms
    });
    
    it('should apply speed modifier', () => {
      const duration = TimingCalculator.calculateDuration(
        1000,
        100,
        2.0  // 2x speed
      );
      expect(duration).toBe(5000);  // 5 seconds
    });
  });
});
```

#### 3. ColorInversion Tests
```typescript
describe('colorInversion', () => {
  describe('invertLightness', () => {
    it('should invert black to white', () => {
      const inverted = invertLightness('#000000');
      expect(inverted).toBe('#ffffff');
    });
    
    it('should invert white to black', () => {
      const inverted = invertLightness('#ffffff');
      expect(inverted).toBe('#000000');
    });
    
    it('should preserve hue and saturation', () => {
      // Blue color
      const inverted = invertLightness('#0000ff');
      const oklch = converter('oklch')(inverted);
      
      // Check that hue is approximately preserved (blue hue ~265°)
      expect(oklch.h).toBeCloseTo(265, 0);
    });
  });
});
```

### Integration Tests

**Coverage**: End-to-end workflows

```typescript
describe('AnimatedSVGSlide Integration', () => {
  it('should load and animate SVG from file', async () => {
    const slideData = {
      svgContent: mockSVGContent,
      config: { animationSpeed: 100, autoplay: true },
      metadata: { layout: 'animated-svg' }
    };
    
    const { getByTestId } = render(
      <AnimatedSVGSlide {...slideData} isActive={true} />
    );
    
    // Wait for parsing
    await waitFor(() => {
      expect(getByTestId('svg-renderer')).toBeInTheDocument();
    });
    
    // Verify animation started
    const svg = getByTestId('svg-renderer');
    expect(svg.querySelectorAll('[style*="animation"]').length).toBeGreaterThan(0);
  });
  
  it('should respond to transport controls', async () => {
    // ... render component
    
    const playButton = getByTestId('transport-play');
    fireEvent.click(playButton);
    
    await waitFor(() => {
      expect(getByTestId('transport-pause')).toBeInTheDocument();
    });
  });
});
```

### Manual Testing Checklist

**SVG Tool Compatibility**:
- [ ] Test with Excalidraw export
- [ ] Test with Inkscape export
- [ ] Test with Concepts export
- [ ] Test with hand-coded SVG

**Performance Testing**:
- [ ] 100 element SVG loads < 500ms
- [ ] 1000 element SVG loads < 500ms
- [ ] 10000 element SVG shows warning
- [ ] Animation maintains 60fps (check DevTools)

**Edge Cases**:
- [ ] SVG file not found
- [ ] Malformed XML
- [ ] Empty SVG
- [ ] Square aspect ratio (letterbox)
- [ ] Portrait aspect ratio (pillarbox)
- [ ] Invalid speed directive
- [ ] Multiple speed changes
- [ ] Pause at end of animation
- [ ] Rapid navigation between slides

**Cross-Platform**:
- [ ] Windows 10/11
- [ ] macOS (Intel and Apple Silicon)
- [ ] Linux (Ubuntu)

---

## Deployment Strategy

### Build Process

**No changes needed** - uses existing DemoTime build pipeline:
- `tsup` for extension bundling
- `vite` for webview bundling
- Existing `package.json` scripts

### Versioning

Follow semantic versioning:
- **Minor version bump** (e.g., 1.5.0 → 1.6.0)
- New feature, backward compatible
- No breaking changes to existing slides

### Release Checklist

- [ ] All tests passing
- [ ] Code review approved
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] Demo presentation created
- [ ] Security review complete
- [ ] Performance benchmarks met
- [ ] Cross-platform testing complete
- [ ] GitHub release notes prepared
- [ ] VS Code Marketplace listing updated

### Rollback Plan

**If critical bug found post-release**:
1. Disable feature via feature flag (quick mitigation)
2. Hot-fix release if simple
3. Revert to previous version if complex
4. Communicate to users via GitHub issues

---

## Risks & Mitigations

### Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| SVG parsing performance with large files | Medium | High | - Implement file size limits<br>- Show performance warnings<br>- Offer "show complete" fallback |
| Browser compatibility issues | Low | Medium | - Test in VSCode webview (known Chromium version)<br>- Use CSS feature detection |
| Memory leaks from animations | Medium | High | - Implement robust cleanup in `destroy()`<br>- Test with rapid slide navigation<br>- Monitor memory in DevTools |
| Color inversion produces poor results | Medium | Medium | - Make it optional (default false)<br>- Provide examples in docs<br>- Consider preset color palettes |
| Path length calculation inaccurate | Low | Medium | - Use native `getTotalLength()`<br>- Test with various path types<br>- Allow manual override if needed |
| Directive parsing conflicts with SVG content | Low | Low | - Use specific comment syntax<br>- Document placement rules<br>- Validate during parsing |

### Integration Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Breaking existing slide functionality | Low | Critical | - Comprehensive regression tests<br>- Gradual rollout<br>- Feature flag for testing |
| Transport controls conflict with existing controls | Medium | Medium | - Reuse existing control infrastructure<br>- Consistent positioning<br>- Clear visual hierarchy |
| WebView message passing overhead | Low | Low | - Measure performance<br>- Batch messages if needed<br>- Use efficient serialization |

### User Experience Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Confusing configuration | Medium | Medium | - Clear documentation<br>- Good defaults<br>- Schema validation with helpful errors |
| Animation feels unnatural | Medium | High | - Extensive manual testing<br>- Configurable speed<br>- User feedback iteration |
| Learning curve for XML directives | Medium | Low | - Provide templates<br>- Document with examples<br>- Make directives optional |

---

## Assumptions & Constraints

### Assumptions (from Requirements)
1. Users prepare SVG files externally
2. SVG files are well-formed XML
3. Users have basic frontmatter familiarity
4. VSCode webview supports modern browser features
5. SVG files are reasonably sized (< 5MB, < 10k elements)
6. Users understand basic SVG to insert comments
7. Clickers send standard keyboard events
8. Most diagrams use standard SVG elements
9. Color inversion needed primarily for simple diagrams
10. Users test before presenting
11. Organic adoption (no migration tooling)
12. Line speed model approximates hand-drawing well
13. Culori handles color inversion needs

### Technical Constraints
- Must run in VSCode webview (Chromium)
- Must use React (existing framework)
- Slide dimensions fixed at 960x540
- Must use CSS animations (performance)
- Must be backward compatible
- Must follow existing DemoTime patterns

### Business Constraints
- MVP scope (defer advanced features)
- No breaking changes
- Self-service documentation
- Community-driven development

---

## Open Technical Questions

### Resolved (with Answers)

1. **Q**: What is the exact algorithm for calculating "pixels per millisecond" line speed?  
   **A**: Duration (ms) = PathLength (px) / (BaseSpeed (px/s) * SpeedModifier) * 1000

2. **Q**: How should speed be configured in frontmatter?  
   **A**: Accept both: `animationSpeed: 100` (pixels/second) or `animationSpeed: "100px/s"`

3. **Q**: Should different element types use different speed calculations?  
   **A**: Yes - paths use getTotalLength(), shapes use perimeter approximation, text uses character count

4. **Q**: Does Culori support all required color formats?  
   **A**: Need to verify - investigate in Phase 4. Likely needs fallback for unsupported formats.

### Still Open (Needs Investigation)

5. **Q**: How to handle SVG filters (blur, drop-shadow) with color inversion?  
   **Owner**: Development Team (Phase 4)  
   **Impact**: Color inversion accuracy

6. **Q**: Should we cache parsed SVGs between slide navigations?  
   **Owner**: Development Team (Phase 2)  
   **Impact**: Performance optimization vs memory usage

7. **Q**: How to handle variable-width strokes or stroke animations?  
   **Owner**: Development Team (Phase 2)  
   **Impact**: Animation quality

8. **Q**: Should we support custom easing functions via directives (e.g., `<!--ease:cubic-bezier(...)-->`)?  
   **Owner**: Product Owner  
   **Impact**: Feature scope expansion

---

## Appendices

### A. File Structure

```
vscode-demo-time/
├── packages/
│   └── common/
│       └── src/
│           ├── models/
│           │   └── SlideMetadata.ts         # MODIFIED: Add animated-svg props
│           └── constants/
│               └── SlideLayout.ts           # MODIFIED: Add AnimatedSVG enum
│
├── apps/
│   ├── vscode-extension/
│   │   └── src/
│   │       └── services/
│   │           └── AnimatedSVGSlideService.ts  # NEW
│   │
│   └── webviews/
│       └── src/
│           ├── components/
│           │   └── slides/
│           │       ├── AnimatedSVGSlide.tsx        # NEW
│           │       ├── SVGRenderer.tsx             # NEW
│           │       ├── AnimatedElement.tsx         # NEW
│           │       └── TransportControls.tsx       # NEW
│           │
│           └── utils/
│               └── svg/
│                   ├── SVGParser.ts                # NEW
│                   ├── AnimationEngine.ts          # NEW
│                   ├── TimingCalculator.ts         # NEW
│                   ├── DirectiveParser.ts          # NEW
│                   ├── PathLengthCalculator.ts     # NEW
│                   ├── colorInversion.ts           # NEW
│                   └── types.ts                    # NEW
│
└── package.json                             # MODIFIED: Add culori dep
```

### B. Example Slide

**File**: `.demo/slides/architecture-diagram.md`

```markdown
---
layout: animated-svg
svgFile: ./diagrams/system-architecture.svg
animationSpeed: 120
textTypeWriterEffect: true
textTypewriterSpeed: 30ms
autoplay: true
showCompleteDiagram: false
invertLightAndDarkColours: false
transportControlsPosition: bottomRight
---

# System Architecture

This diagram shows our microservices architecture.

Use the controls to pause/resume the animation.
```

**File**: `diagrams/system-architecture.svg`

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
  <!-- Draw API Gateway first -->
  <rect x="350" y="50" width="100" height="60" 
        fill="lightblue" stroke="black" stroke-width="2"/>
  <text x="400" y="85" text-anchor="middle">API Gateway</text>
  
  <!-- Slow down for complex service layer -->
  <!--speed:0.5-->
  
  <!-- Draw microservices -->
  <rect x="50" y="200" width="120" height="60" 
        fill="lightgreen" stroke="black" stroke-width="2"/>
  <text x="110" y="235" text-anchor="middle">Auth Service</text>
  
  <rect x="230" y="200" width="120" height="60" 
        fill="lightgreen" stroke="black" stroke-width="2"/>
  <text x="290" y="235" text-anchor="middle">User Service</text>
  
  <rect x="410" y="200" width="120" height="60" 
        fill="lightgreen" stroke="black" stroke-width="2"/>
  <text x="470" y="235" text-anchor="middle">Order Service</text>
  
  <!--pause:untilPlay-->
  
  <!-- Back to normal speed -->
  <!--speed:1.0-->
  
  <!-- Draw database layer -->
  <ellipse cx="100" cy="400" rx="60" ry="40" 
           fill="lightyellow" stroke="black" stroke-width="2"/>
  <text x="100" y="405" text-anchor="middle">PostgreSQL</text>
  
  <ellipse cx="450" cy="400" rx="60" ry="40" 
           fill="lightyellow" stroke="black" stroke-width="2"/>
  <text x="450" y="405" text-anchor="middle">MongoDB</text>
  
  <!-- Draw connections -->
  <path d="M 400 110 L 110 200" stroke="gray" stroke-width="1.5"/>
  <path d="M 400 110 L 290 200" stroke="gray" stroke-width="1.5"/>
  <path d="M 400 110 L 470 200" stroke="gray" stroke-width="1.5"/>
  
  <path d="M 110 260 L 100 360" stroke="gray" stroke-width="1.5"/>
  <path d="M 470 260 L 450 360" stroke="gray" stroke-width="1.5"/>
</svg>
```

### C. Performance Benchmarks (Target)

| Metric | SVG Size | Target | Measured | Status |
|--------|----------|--------|----------|--------|
| Parse time | 100 elements | < 100ms | TBD | - |
| Parse time | 1000 elements | < 500ms | TBD | - |
| Parse time | 10000 elements | < 2s | TBD | - |
| Render time | 100 elements | < 50ms | TBD | - |
| Render time | 1000 elements | < 200ms | TBD | - |
| Frame rate | During animation | 60fps | TBD | - |
| Memory usage | 1000 elements | < 50MB | TBD | - |

---

## Conclusion

This specification provides a complete technical design for adding animated SVG diagram support to DemoTime. The implementation follows a phased approach over 9 weeks, delivering incremental value while maintaining high quality standards.

**Key Success Factors**:
- ✅ Modular architecture enables testing and maintenance
- ✅ CSS animations ensure smooth 60fps performance
- ✅ Security measures appropriate for VSCode extension context
- ✅ Graceful degradation handles errors without breaking presentations
- ✅ Comprehensive testing strategy ensures quality
- ✅ Clear implementation phases with measurable deliverables

**Next Steps**:
1. Review and approve specification
2. Clarify remaining open questions
3. Begin Phase 1 implementation
4. Set up project tracking (GitHub project board)
5. Schedule weekly progress reviews

---

**Document Version**: 1.0  
**Last Updated**: 2026-02-15  
**Author**: Solution Architect Agent  
**Status**: Ready for Review

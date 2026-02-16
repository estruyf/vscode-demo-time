# SVG Scaling Debug Fix

## Issue
User reported that when testing the animated-svg layout, the SVG file renders but the whole image is not visible. The scaling and/or bounding box calculation was not working correctly.

## Root Cause
The `SVGRenderer` component was calculating the `scaledViewBox` but never applying it to the rendered SVG element. The SVG content was simply dumped with `dangerouslySetInnerHTML` without modifying the viewBox attribute.

## Fix Applied

### 1. Updated SVGRenderer.tsx
**Changed**: The component now:
- Parses the SVG content using DOMParser
- Extracts the SVG element
- Sets the calculated viewBox attribute: `viewBox="${x} ${y} ${width} ${height}"`
- Sets explicit width/height to 960x540
- Sets `preserveAspectRatio="xMidYMid meet"` to ensure proper centering
- Serializes the modified SVG back to HTML

**Before**:
```tsx
<div dangerouslySetInnerHTML={{ __html: svgContent }} />
```

**After**:
```tsx
const parser = new DOMParser();
const doc = parser.parseFromString(svgContent, 'image/svg+xml');
const svgElement = doc.querySelector('svg');

svgElement.setAttribute('viewBox', `${scaledViewBox.x} ${scaledViewBox.y} ${scaledViewBox.width} ${scaledViewBox.height}`);
svgElement.setAttribute('width', '960');
svgElement.setAttribute('height', '540');
svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');

const modifiedSVG = new XMLSerializer().serializeToString(svgElement);
```

### 2. Improved Bounding Box Calculation (SVGParser.ts)
**Changed**: The parser now:
- Tries to use the viewBox attribute first (more reliable)
- Falls back to `getBBox()` only if viewBox doesn't exist
- `getBBox()` can fail when SVG is not in the DOM, so viewBox is preferred

**Reasoning**: 
- SVGs created in drawing tools typically have a viewBox attribute
- This is more reliable than getBBox() which requires the SVG to be rendered
- Follows SVG best practices

### 3. Added Debug Logging
Added console.log statements to help diagnose issues:
- `[SVGParser] Using viewBox from attribute:` - Shows the bounding box extracted
- `[SVGRenderer] Bounding box:` - Shows the bounding box passed to renderer
- `[SVGRenderer] Scaled viewBox:` - Shows the calculated scaled viewBox
- `[SVGRenderer] Setting viewBox:` - Shows the final viewBox value applied

## Testing
To test the fix:
1. Open a slide with `layout: animated-svg`
2. Open browser DevTools console
3. Look for the debug log messages
4. Verify the SVG now renders completely visible

Expected console output:
```
[SVGParser] Using viewBox from attribute: {x: 0, y: 0, width: 800, height: 600}
[SVGRenderer] Bounding box: {x: 0, y: 0, width: 800, height: 600}
[SVGRenderer] Scaled viewBox: {x: 0, y: -60, width: 1280, height: 720, scale: 0.75}
[SVGRenderer] Setting viewBox: 0 -60 1280 720
```

## Build Status
✅ Build successful
✅ No TypeScript errors
✅ Ready for testing

## Files Modified
1. `apps/webviews/src/components/slides/SVGRenderer.tsx` - Apply viewBox to SVG
2. `apps/webviews/src/utils/svg/SVGParser.ts` - Prefer viewBox attribute over getBBox()

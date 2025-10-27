# Demo Time Theme Builder

A web-based theme builder for creating and customizing Demo Time slide themes. This tool makes it easy to design beautiful themes by providing visual controls for colors, backgrounds, fonts, and more.

## ✨ Features

- **🎨 Visual Theme Editor**: Customize colors, backgrounds, and typography with intuitive controls
- **👁️ Live Preview**: See your changes in real-time across all slide layouts
- **📦 Export & Download**: Download your custom theme as a ready-to-use CSS file
- **🎯 All Layout Support**: Preview your theme across all Demo Time slide layouts:
  - Default
  - Intro
  - Section
  - Quote
  - Image
  - Image Left
  - Image Right
  - Two Columns
  - Video
- **🎨 Color Picker**: Easy-to-use color pickers for all theme colors
- **🖼️ Background Options**: Support for solid colors, gradients, and images
- **💾 Save & Share**: Copy shareable theme configurations

## 🚀 Quick Start

1. **Install Dependencies**

   ```bash
   yarn install
   ```

2. **Development**

   ```bash
   yarn dev
   ```

   Opens at `http://localhost:5173`

3. **Build for Production**

   ```bash
   yarn build
   ```

4. **Preview Production Build**
   ```bash
   yarn preview
   ```

## 📱 Usage

1. **Customize**: Use the theme editor panel to adjust colors, backgrounds, and styling
2. **Preview**: Switch between different slide layouts to see how your theme looks
3. **Export**: Click "Download Theme" to get your theme.css file
4. **Apply**: Add the theme file to your Demo Time project's `.demo/` folder

## 🎨 Customizable Options

### Colors
- Primary text color
- Background color
- Heading colors
- Link colors
- Accent colors

### Backgrounds
- Solid colors
- Linear gradients
- Background images
- Per-layout backgrounds

### Typography
- Font size
- Font family (future)
- Line height (future)

## 📋 Using Your Theme

After downloading your theme file:

1. Save it to `.demo/slides/theme.css` in your project
2. Reference it in your slide's frontmatter:
   ```md
   ---
   customTheme: .demo/slides/theme.css
   ---
   ```
3. Or set it globally in `.vscode/settings.json`:
   ```json
   {
     "demoTime.customTheme": ".demo/slides/theme.css"
   }
   ```

## 🛠 Development

Built with modern web technologies:

- **React 18** with TypeScript
- **Vite** for fast development
- **Tailwind CSS** for styling
- **CSS Custom Properties** for theme system

## 🎯 Theme Structure

Themes use CSS custom properties for easy customization:

```css
.slide.your-theme {
  --demotime-color: #000000;
  --demotime-background: #ffffff;
  --demotime-heading-color: #333333;
  /* ... more variables */
}
```

## 📄 License

Same license as the Demo Time VS Code extension (MIT).

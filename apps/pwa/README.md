# Demo Time PWA Remote Control

A Progressive Web App (PWA) that serves as a professional remote control for the Demo Time VS Code
extension. This app recreates the presenter view functionality with a modern, sleek interface
perfect for live coding presentations.

## ✨ Features

- **🎯 Smart Demo Control**: Always shows a "Start Demo" button - works even when no next demo is
  available
- **🔄 Live Updates**: Automatic polling every 3 seconds for real-time demo status
- **🎮 Precise Demo Execution**: Run specific demos by ID with query parameter API calls
- **📱 Professional UI**: Modern gradient design matching the Demo Time website aesthetic
- **🔗 PWA Support**: Install as standalone app with offline capabilities
- **📊 Demo Overview**: Visual status indicators for current, next, and completed demos
- **⚡ Real-time Feedback**: Loading states, connection status, and error handling

## 🎨 Design Inspiration

The UI is designed to match the professional look and feel of the
[Demo Time website](https://demotime.show), featuring:

- Gradient backgrounds and text effects
- Modern card-based layouts with subtle shadows
- Blue and purple accent colors
- Clean typography and spacing
- Smooth animations and transitions

## 🚀 Quick Start

1. **Install Dependencies**

   ```bash
   npm install
   ```

2. **Development**

   ```bash
   npm run dev
   ```

   Opens at `http://localhost:3001`

3. **Build for Production**

   ```bash
   npm run build
   ```

4. **Preview Production Build**
   ```bash
   npm run preview
   ```

## 📱 Usage

1. **Connect**: Enter your Demo Time API server URL (usually `localhost:3710`)
2. **Start Demo**: Use the "🚀 Start Demo" button to begin your presentation
3. **Control Flow**: Click "▶ Start Next Demo" to advance through your scripted demos
4. **Run Specific**: Click "▶ Run" on any demo in the list to execute it directly
5. **Monitor Status**: Watch real-time updates of demo execution status

## 🔌 API Integration

Connects to Demo Time API endpoints:

- `GET /api/demos` - Fetch all demo data with live polling
- `POST /api/next?bringToFront=true` - Trigger next demo
- `GET /api/runById?id=<demoId>&bringToFront=true` - Run specific demo by ID

## 🎯 Smart Features

- **Always Available**: Next button works even without a predefined next demo
- **ID Validation**: Run buttons are disabled for demos without IDs
- **Auto-polling**: Real-time updates every 3 seconds when connected
- **Connection Persistence**: Remembers your API URL between sessions
- **Error Handling**: Clear feedback for connection and execution errors

## 📋 Requirements

- Demo Time VS Code extension with API server enabled
- Modern browser with PWA support (Chrome, Firefox, Safari, Edge)
- Network access to Demo Time API server

## 🛠 Development

Built with modern web technologies:

- **React 18** with TypeScript for type safety
- **Vite** for fast development and building
- **Tailwind CSS** for responsive, utility-first styling
- **Vite PWA Plugin** for offline functionality
- **Fetch API** for reliable HTTP communication

## 🎨 Customization

The design system uses:

- Gradient backgrounds: `from-slate-900 via-blue-900/20 to-slate-900`
- Accent colors: Blue (`#3b82f6`) and purple (`#8b5cf6`) gradients
- Card styling: `bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm`
- Button effects: Hover scaling and shadow transitions

## 📄 License

Same license as the Demo Time VS Code extension.

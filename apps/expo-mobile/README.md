# Demo Time Mobile App

A native mobile application for iOS and Android that provides remote control for Demo Time presentations with haptic feedback support.

## Features

- **Cross-Platform**: Runs on both iOS and Android devices
- **Haptic Feedback**: Enhanced user experience with tactile feedback on navigation buttons
- **Real-time Updates**: Automatic polling to keep demo state synchronized
- **Native Performance**: Built with Expo and React Native for smooth performance
- **Persistent Connection**: Remembers your server URL for quick reconnection

## Getting Started

### Prerequisites

- Node.js (v16 or later)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- For iOS: macOS with Xcode
- For Android: Android Studio with Android SDK

### Installation

```bash
# Install dependencies
cd apps/expo-mobile
npm install
```

### Running the App

#### Development Mode

Start the Expo development server:

```bash
npm start
```

Then:
- Scan the QR code with your phone using the Expo Go app
- Press `i` for iOS simulator (macOS only)
- Press `a` for Android emulator

#### Running on Device

For iOS:
```bash
npm run ios
```

For Android:
```bash
npm run android
```

### Building for Production

For production builds, you'll need to set up EAS (Expo Application Services):

```bash
# Install EAS CLI
npm install -g eas-cli

# Configure EAS
eas build:configure

# Build for Android
npm run build:android

# Build for iOS
npm run build:ios
```

## How It Works

The app connects to the Demo Time VS Code extension's API server to control your presentation remotely. 

1. **Connection**: Enter the URL of your Demo Time API server (e.g., `http://192.168.1.100:3000`)
2. **Navigation**: Use the Previous/Next buttons to navigate through demo steps
3. **Haptic Feedback**: Feel tactile feedback when pressing navigation buttons
4. **Direct Selection**: Tap any demo step to jump directly to it

## Haptic Feedback

This app uses Expo's Haptics API to provide tactile feedback:

- **Medium Impact**: Triggered when pressing Next/Previous buttons
- **Light Impact**: Triggered when selecting a specific demo step

The haptic feedback enhances the user experience by providing physical confirmation of button presses, especially useful during presentations.

## API Connection

The app communicates with the Demo Time VS Code extension API:

- `GET /api/demos` - Fetch current demo state
- `GET /api/next` - Trigger next demo step
- `GET /api/previous` - Trigger previous demo step
- `GET /api/runById?id={stepId}` - Run a specific demo step

## Architecture

The app follows the same patterns as the PWA:

- **Hooks**: `useApi` for API communication
- **Context**: `BringToFrontContext` for shared state
- **Screens**: `ConnectionScreen` and `DemoScreen`
- **Types**: Shared TypeScript interfaces for API data

## Comparison with PWA

| Feature | PWA | Mobile App |
|---------|-----|------------|
| Platform | Web browsers | iOS & Android native |
| Haptic Feedback | ❌ Not available | ✅ Supported |
| Installation | Add to home screen | App stores |
| Performance | Good | Better (native) |
| Offline capability | Service workers | Native storage |

## Contributing

Contributions are welcome! Please ensure your changes:
- Follow the existing code style
- Work on both iOS and Android
- Include appropriate error handling
- Maintain haptic feedback functionality

## License

MIT License - see the root LICENSE file for details

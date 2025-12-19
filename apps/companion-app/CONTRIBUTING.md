# Contributing to Demo Time Companion

Thank you for your interest in contributing to the Demo Time Companion app! This guide will help you get started.

## Development Setup

### Prerequisites

1. **Node.js & Yarn**: Version 20+ with Yarn 4.9.4
2. **Rust**: Latest stable version (install via [rustup](https://rustup.rs/))
3. **Platform-specific dependencies**:
   
   **Linux:**
   ```bash
   sudo apt-get install -y \
     libwebkit2gtk-4.1-dev \
     build-essential \
     curl \
     wget \
     file \
     libxdo-dev \
     libssl-dev \
     libayatana-appindicator3-dev \
     librsvg2-dev
   ```

   **macOS:**
   ```bash
   xcode-select --install
   ```

   **Windows:**
   - Install [Visual Studio C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
   - Install [WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/)

### Getting Started

1. **Clone the repository:**
   ```bash
   git clone https://github.com/estruyf/vscode-demo-time.git
   cd vscode-demo-time/apps/companion-app
   ```

2. **Install dependencies:**
   ```bash
   yarn install
   ```

3. **Run in development mode:**
   ```bash
   yarn tauri:dev
   ```

## Project Structure

```
apps/companion-app/
├── src/                    # React frontend
│   ├── App.tsx            # Main UI component
│   ├── App.css            # Styles
│   └── main.tsx           # Entry point
├── src-tauri/             # Rust backend
│   ├── src/
│   │   ├── lib.rs         # Main logic & Tauri commands
│   │   ├── api_server.rs  # HTTP API server
│   │   ├── overlay.rs     # Overlay window management
│   │   └── main.rs        # Entry point
│   ├── Cargo.toml         # Rust dependencies
│   └── tauri.conf.json    # Tauri configuration
├── examples/              # Example demos and scripts
├── package.json           # Node dependencies
├── README.md              # User documentation
├── INTEGRATION.md         # Integration guide
└── CONTRIBUTING.md        # This file
```

## Making Changes

### Frontend Changes (React/TypeScript)

The frontend is built with React and TypeScript. Key files:

- `src/App.tsx` - Main application UI
- `src/App.css` - Styling
- Changes hot-reload automatically in development mode

### Backend Changes (Rust)

The backend is built with Tauri and Rust. Key modules:

- `src-tauri/src/lib.rs` - Core application logic, Tauri commands
- `src-tauri/src/api_server.rs` - HTTP API endpoints
- `src-tauri/src/overlay.rs` - Overlay window creation/management

After making Rust changes, the app will rebuild automatically.

### Adding New Actions

To add a new action to the companion app:

1. **Add the action handler in `api_server.rs`:**
   ```rust
   "myaction.toggle" => {
       if let Ok(mut s) = state.lock() {
           s.my_feature_active = !s.my_feature_active;
           let _ = app_handle.emit("myaction-toggled", s.my_feature_active);
           ActionResponse {
               success: true,
               message: format!("My Action {}", 
                   if s.my_feature_active { "enabled" } else { "disabled" }),
           }
       } else {
           ActionResponse {
               success: false,
               message: "Failed to toggle my action".to_string(),
           }
       }
   }
   ```

2. **Add state field in `lib.rs`:**
   ```rust
   pub struct OverlayState {
       // ... existing fields
       pub my_feature_active: bool,
   }
   ```

3. **Add Tauri command in `lib.rs` (if needed):**
   ```rust
   #[tauri::command]
   fn toggle_myaction(
       app_handle: AppHandle,
       state: State<AppState>,
   ) -> Result<bool, String> {
       // Implementation
   }
   ```

4. **Update frontend in `App.tsx` (if needed):**
   ```tsx
   const handleToggleMyAction = async () => {
     try {
       await invoke("toggle_myaction");
       await loadState();
     } catch (error) {
       console.error("Failed to toggle my action:", error);
     }
   };
   ```

5. **Document the new action in README.md**

### Testing Your Changes

1. **Manual testing:**
   ```bash
   yarn tauri:dev
   ```
   Test all UI interactions and verify the API endpoints.

2. **API testing:**
   ```bash
   ./examples/test-api.sh
   ```

3. **Build testing:**
   ```bash
   yarn build
   yarn tauri:build
   ```

## Code Style

### TypeScript/React

- Use functional components with hooks
- Use TypeScript types for all props and state
- Follow existing code formatting
- Use meaningful variable names

### Rust

- Follow standard Rust formatting (`cargo fmt`)
- Use `cargo clippy` for linting
- Add comments for complex logic
- Handle errors properly

## Pull Request Process

1. **Fork the repository** and create a new branch from `main`
2. **Make your changes** following the code style guidelines
3. **Test your changes** thoroughly
4. **Update documentation** if you're adding new features
5. **Commit your changes** with clear, descriptive messages
6. **Push to your fork** and submit a pull request
7. **Wait for review** - maintainers will review your PR

### Pull Request Guidelines

- One feature/fix per PR
- Include tests if applicable
- Update documentation
- Keep changes focused and minimal
- Write clear commit messages
- Reference any related issues

## Common Development Tasks

### Running Rust Tests
```bash
cd src-tauri
cargo test
```

### Checking Rust Code
```bash
cd src-tauri
cargo check
cargo clippy
```

### Formatting Rust Code
```bash
cd src-tauri
cargo fmt
```

### Building for Production
```bash
yarn build
yarn tauri:build
```

### Cleaning Build Artifacts
```bash
cd src-tauri
cargo clean
rm -rf ../dist
```

## Debugging

### Frontend Debugging

1. Run in development mode: `yarn tauri:dev`
2. Open DevTools in the app window (Right-click > Inspect)
3. Console logs appear in DevTools

### Backend Debugging

1. Add debug prints in Rust:
   ```rust
   println!("Debug: {:?}", some_value);
   eprintln!("Error: {}", error_message);
   ```

2. Check the terminal output where you ran `yarn tauri:dev`

### API Debugging

1. Use curl to test endpoints:
   ```bash
   curl -v http://127.0.0.1:42042/status
   ```

2. Check the API server logs in the terminal

## Feature Requests

Have an idea for a new feature? Great!

1. **Check existing issues** - Someone might have already suggested it
2. **Open a new issue** describing your feature
3. **Discuss the feature** with maintainers
4. **Implement if approved** - Wait for maintainer feedback before starting work

## Bug Reports

Found a bug? Please report it!

1. **Check existing issues** - It might already be reported
2. **Open a new issue** with:
   - Clear title
   - Steps to reproduce
   - Expected vs actual behavior
   - Your environment (OS, versions, etc.)
   - Screenshots if applicable

## Questions?

- Check the [README.md](./README.md) for usage documentation
- Check the [INTEGRATION.md](./INTEGRATION.md) for integration examples
- Open an issue for questions
- Join the community discussions

## License

By contributing to Demo Time Companion, you agree that your contributions will be licensed under the Apache-2.0 License.

## Thank You!

Thank you for contributing to Demo Time Companion! Your help makes this project better for everyone. 🎉

// Theme management
export async function loadTheme() {
  try {
    const result = await chrome.storage.local.get(['theme']);
    const theme = result.theme || 'system';
    applyTheme(theme);
    return theme;
  } catch (error) {
    console.error('Error loading theme:', error);
    applyTheme('system');
    return 'system';
  }
}

export function applyTheme(theme) {
  const root = document.documentElement;
  
  if (theme === 'system') {
    // Remove data-theme attribute to let system preference take effect
    root.removeAttribute('data-theme');
  } else {
    // Set explicit theme
    root.setAttribute('data-theme', theme);
  }
}

export async function saveTheme(theme) {
  try {
    await chrome.storage.local.set({ theme });
    applyTheme(theme);
  } catch (error) {
    console.error('Error saving theme:', error);
    throw error;
  }
}

// Main function for Extension.js
export default function main() {
  // Initialize theme on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadTheme);
  } else {
    loadTheme();
  }

  // Cleanup function
  return () => {
    // No cleanup needed for theme management
  };
}

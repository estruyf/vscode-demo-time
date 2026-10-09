// Settings page functionality
export default function main() {
  const urlInput = document.getElementById('urlInput');
  const themeSelect = document.getElementById('themeSelect');
  const saveBtn = document.getElementById('saveBtn');
  const errorMsg = document.getElementById('errorMsg');
  
  // Setup navbar navigation
  setupNavbar();

  // Apply theme function
  const applyTheme = (theme) => {
    const root = document.documentElement;
    if (theme === 'system') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', theme);
    }
  };

  // Load saved URL and theme
  (async () => {
    try {
      const result = await chrome.storage.local.get(['demotimeUrl', 'theme']);
      if (result.demotimeUrl) {
        urlInput.value = result.demotimeUrl;
      }
      if (result.theme) {
        themeSelect.value = result.theme;
      } else {
        themeSelect.value = 'system';
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  })();

  // Validate URL
  function isValidUrl(string) {
    try {
      const url = new URL(string);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
      return false;
    }
  }

  // Handle input validation
  const handleInput = () => {
    errorMsg.textContent = '';
    urlInput.classList.remove('error');
  };

  // Save URL and theme
  const handleSave = async () => {
    const url = urlInput.value.trim();
    const theme = themeSelect.value;

    if (!url) {
      errorMsg.textContent = 'Please enter a URL';
      urlInput.classList.add('error');
      return;
    }

    if (!isValidUrl(url)) {
      errorMsg.textContent = 'Please enter a valid URL (http:// or https://)';
      urlInput.classList.add('error');
      return;
    }

    try {
      console.log('Saving settings:', { url, theme });
      await chrome.storage.local.set({ demotimeUrl: url, theme });
      console.log('Settings saved to storage');
      
      applyTheme(theme);
      console.log('Theme applied');
      
      // Show success feedback
      saveBtn.textContent = 'Saved!';
      saveBtn.disabled = true;
      
      setTimeout(() => {
        window.location.href = chrome.runtime.getURL('pages/home.html');
      }, 500);
    } catch (error) {
      console.error('Error saving settings:', error);
      console.error('Error details:', error.message, error.stack);
      errorMsg.textContent = `Failed to save settings: ${error.message}`;
    }
  };

  // Allow saving with Enter key
  const handleKeypress = (e) => {
    if (e.key === 'Enter') {
      saveBtn.click();
    }
  };

  urlInput.addEventListener('input', handleInput);
  saveBtn.addEventListener('click', handleSave);
  urlInput.addEventListener('keypress', handleKeypress);

  // Cleanup function
  return () => {
    urlInput.removeEventListener('input', handleInput);
    saveBtn.removeEventListener('click', handleSave);
    urlInput.removeEventListener('keypress', handleKeypress);
  };
}

// Setup navbar navigation with proper URLs
function setupNavbar() {
  const navLinks = document.querySelectorAll('.nav-icon');
  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    link.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.href = chrome.runtime.getURL('pages/' + href);
    });
  });
}

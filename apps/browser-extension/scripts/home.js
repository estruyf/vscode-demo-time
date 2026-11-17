// Home page functionality
export default function main() {
  const previousBtn = document.getElementById('previousBtn');
  const nextBtn = document.getElementById('nextBtn');
  
  // Setup navbar navigation
  setupNavbar();

  // Handle previous button click
  const handlePrevious = async () => {
    try {
      // Get the stored URL from Chrome storage
      const result = await chrome.storage.local.get(['demotimeUrl']);
      const url = result.demotimeUrl;

      if (url) {
        // Remove trailing slash if present
        const baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
        // Open the URL with previous API endpoint
        chrome.tabs.create({ url: baseUrl + '/api/previous?bringToFront=true' });
      } else {
        // If no URL is set, navigate to settings
        alert('Please set your DemoTime URL in settings first.');
        window.location.href = chrome.runtime.getURL('pages/settings.html');
      }
    } catch (error) {
      console.error('Error accessing stored URL:', error);
      alert('Failed to retrieve URL. Please check your settings.');
    }
  };

  // Handle next button click
  const handleNext = async () => {
    try {
      // Get the stored URL from Chrome storage
      const result = await chrome.storage.local.get(['demotimeUrl']);
      const url = result.demotimeUrl;

      if (url) {
        // Remove trailing slash if present
        const baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
        // Open the URL with next API endpoint
        chrome.tabs.create({ url: baseUrl + '/api/next?bringToFront=true' });
      } else {
        // If no URL is set, navigate to settings
        alert('Please set your DemoTime URL in settings first.');
        window.location.href = chrome.runtime.getURL('pages/settings.html');
      }
    } catch (error) {
      console.error('Error accessing stored URL:', error);
      alert('Failed to retrieve URL. Please check your settings.');
    }
  };

  previousBtn.addEventListener('click', handlePrevious);
  nextBtn.addEventListener('click', handleNext);

  // Cleanup function
  return () => {
    previousBtn.removeEventListener('click', handlePrevious);
    nextBtn.removeEventListener('click', handleNext);
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

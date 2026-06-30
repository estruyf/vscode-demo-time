// Scenes page functionality
export default function main() {
  const scenesList = document.getElementById('scenesList');
  
  // Setup navbar navigation
  setupNavbar();

  // Load scenes from DemoTime API
  const loadScenes = async () => {
    scenesList.innerHTML = '<div class="loading-message">Loading scenes...</div>';
    
    try {
      // Get the stored URL from Chrome storage
      const result = await chrome.storage.local.get(['demotimeUrl']);
      const url = result.demotimeUrl;

      console.log('DemoTime URL:', url);

      if (!url) {
        scenesList.innerHTML = '<div class="loading-message">Please set your DemoTime URL in settings first.</div>';
        return;
      }

      // Remove trailing slash if present
      const baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
      const apiUrl = baseUrl + '/api/demos';
      
      console.log('Fetching from:', apiUrl);
      
      // Fetch demos from the API
      const response = await fetch(apiUrl);
      
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch scenes: ${response.status} ${response.statusText}`);
      }

      const scenes = await response.json();
      
      console.log('Scenes loaded:', scenes);
      console.log('Scenes type:', typeof scenes, 'Is array:', Array.isArray(scenes));

      // Clear loading message
      scenesList.innerHTML = '';

      // Handle if scenes is an object with a demos property or similar
      let scenesList_data = scenes;
      if (!Array.isArray(scenes)) {
        // Check if it's an object with demos/scenes/data property
        scenesList_data = scenes.demos || scenes.scenes || scenes.data || scenes;
        
        // If still not an array, try to convert object to array
        if (!Array.isArray(scenesList_data)) {
          scenesList_data = Object.values(scenes);
        }
      }

      if (!scenesList_data || scenesList_data.length === 0) {
        scenesList.innerHTML = '<div class="loading-message">No scenes available</div>';
        return;
      }

      // Flatten the scenes by iterating through demo groups and their children
      scenesList_data.forEach(demoGroup => {
        // Check if this demo group has children (the actual scenes)
        const children = demoGroup.children || [];
        
        children.forEach(scene => {
          // Skip disabled scenes
          if (scene.disabled === true) {
            return;
          }
          
          const sceneItem = document.createElement('div');
          sceneItem.className = 'scene-item';
          
          const label = document.createElement('span');
          label.className = 'scene-label';
          label.textContent = scene.originalLabel || scene.label || 'Untitled Scene';
          
          const playIcon = document.createElement('div');
          playIcon.className = 'play-icon';
          playIcon.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z"/>
            </svg>
          `;
          
          sceneItem.appendChild(label);
          sceneItem.appendChild(playIcon);
          
          // Add click handler to navigate to the scene using the scene's ID
          sceneItem.addEventListener('click', () => {
            const sceneUrl = baseUrl + '/api/runById?id=' + encodeURIComponent(scene.id) + '&bringToFront=true';
            chrome.tabs.create({ url: sceneUrl });
          });
          
          scenesList.appendChild(sceneItem);
        });
      });
    } catch (error) {
      console.error('Error loading scenes:', error);
      scenesList.innerHTML = '<div class="loading-message">Failed to load scenes. Please check your DemoTime URL.</div>';
    }
  };

  loadScenes();

  // Cleanup function (no event listeners to clean up)
  return () => {};
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

(function () {
  if (typeof window === 'undefined') {
    return;
  }

  const isMobile = () => window.matchMedia('(max-width: 640px)').matches;

  function findSiteSearch() {
    return document.querySelector('#site-search, .site-search, [data-site-search], [aria-label="site-search"], [aria-label="Search"]');
  }

  function addDocsLink() {
    if (!isMobile()) {
      return;
    }
    const siteSearch = findSiteSearch();
    if (!siteSearch) {
      return;
    }
    if (siteSearch.dataset.docsInjected) {
      return;
    }

    const link = document.createElement('a');
    // Replace this with your desired Context7 URI when available
    link.href = '/getting-started/';
    link.className = 'navigation__docs_link sl-flex';
    link.title = 'Open docs';
    link.textContent = 'Docs';
    link.style.marginLeft = '0.5rem';
    link.style.display = 'flex';
    link.style.justifyContent = 'center';
    link.style.alignItems = 'center';

    siteSearch.insertAdjacentElement('afterend', link);
    siteSearch.dataset.docsInjected = '1';
  }

  function removeDocsLink() {
    const siteSearch = findSiteSearch();
    if (!siteSearch) {
      return;
    }
    const next = siteSearch.nextElementSibling;
    if (next && next.classList && next.classList.contains('navigation__docs_link')) {
      next.remove();
    }
    delete siteSearch.dataset.docsInjected;
  }

  window.addEventListener('DOMContentLoaded', () => {
    addDocsLink();

    // Observe briefly in case the search is rendered after initial load
    const observer = new MutationObserver(() => addDocsLink());
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => observer.disconnect(), 4000);
  });

  // Toggle when viewport changes across the mobile breakpoint
  const mq = window.matchMedia('(max-width: 640px)');
  if (mq.addEventListener) {
    mq.addEventListener('change', (e) => {
      if (e.matches) {
        addDocsLink();
      } else {
        removeDocsLink();
      }
    });
  } else if (mq.addListener) {
    mq.addListener((e) => {
      if (e.matches) {
        addDocsLink();
      } else {
        removeDocsLink();
      }
    });
  }
})();

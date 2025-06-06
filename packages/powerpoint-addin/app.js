(function(){
  Office.onReady(function(){
    var urlInput = document.getElementById('serverUrl');
    var idInput = document.getElementById('commandId');
    var bringInput = document.getElementById('bringToFront');
    var saveBtn = document.getElementById('saveBtn');

    // Load saved settings
    urlInput.value = localStorage.getItem('dtServerUrl') || 'http://localhost:3000';
    idInput.value = localStorage.getItem('dtCommandId') || '';
    bringInput.checked = localStorage.getItem('dtBringToFront') === 'true';

    function runCommand() {
      var url = urlInput.value.replace(/\/$/, '');
      var payload = {
        id: idInput.value,
        bringToFront: bringInput.checked
      };
      fetch(url + '/api/runbyid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(function(err){ console.error('Demo Time trigger failed', err); });
    }

    saveBtn.addEventListener('click', function(){
      localStorage.setItem('dtServerUrl', urlInput.value);
      localStorage.setItem('dtCommandId', idInput.value);
      localStorage.setItem('dtBringToFront', bringInput.checked);
      runCommand();
    });

    // Automatically run on load
    runCommand();
  });
})();

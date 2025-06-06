(function () {
  // Wait for Office to be ready
  Office.onReady(function () {
    // Initialize add-in after the loading screen has faded
    // This gives the DOM time to fully load
    setTimeout(() => {
      initializeAddin();
    }, 1600);

    function initializeAddin() {
      // This script will handle the loading screen
      // Show loading screen for a moment then fade out
      setTimeout(function() {
          document.getElementById('loadingScreen').classList.add('fade-out');
          document.getElementById('formContainer').style.display = 'block';
      }, 1500);

      // Get form elements and add null checks
      var urlInput = document.getElementById("serverUrl");
      var idInput = document.getElementById("commandId");
      var bringInput = document.getElementById("bringToFront");
      var saveBtn = document.getElementById("saveBtn");

      // Check if elements exist before accessing them
      if (!urlInput || !idInput || !bringInput || !saveBtn) {
        console.error("Required DOM elements not found. Retrying in 500ms...");
        setTimeout(initializeAddin, 500);
        return;
      }

      // Load saved settings
      const savedUrl = localStorage.getItem("dtServerUrl") || "http://localhost:3710";
      const savedCommandId = localStorage.getItem("dtCommandId") || "";
      const savedBringToFront = localStorage.getItem("dtBringToFront") === "true";

      urlInput.value = savedUrl;
      idInput.value = savedCommandId;
      bringInput.checked = savedBringToFront;

      function runCommand() {
        var url = urlInput.value.replace(/\/$/, "");
        var payload = {
          id: idInput.value,
          bringToFront: bringInput.checked,
        };

        // Only proceed if we have a command ID
        if (!payload.id) {
          const statusMessage = document.getElementById("statusMessage");
          if (statusMessage) {
            statusMessage.className = "error";
            statusMessage.style.display = "block";
            statusMessage.textContent = "Please enter a command ID";
            setTimeout(() => {
              statusMessage.style.display = "none";
            }, 3000);
          }
          return;
        }

        // Get the status message element
        const statusMessage = document.getElementById("statusMessage");

        // Check if statusMessage element exists
        if (!statusMessage) {
          console.error("Status message element not found");
        } else {
          // Show loading message
          statusMessage.className = "";
          statusMessage.style.display = "block";
          statusMessage.textContent = "Sending command...";
        }

        fetch(url + "/api/runbyid", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify(payload),
          })
          .then((response) => {
            if (!response.ok) {
              throw new Error(`HTTP error ${response.status}`);
            }

            // Success message
            if (statusMessage) {
              statusMessage.className = "success";
              statusMessage.textContent = "Command executed successfully!";

              // Auto hide after 5 seconds
              setTimeout(() => {
                if (statusMessage) {
                  statusMessage.style.display = "none";
                }
              }, 5000);
            }
          })
          .catch(function (err) {
            console.error("Demo Time trigger failed", err);

            // Error message
            if (statusMessage) {
              statusMessage.className = "error";
              statusMessage.textContent = "Error: " + (err.message || "Failed to execute command");
            }
          });
      }

      // Check if we're in presentation mode (slide show mode in PowerPoint)
      // and if the slide containing the add-in is currently shown
      function checkPresentationMode() {
        if (Office.context.document) {
          try {
        // Check if in presentation mode
        Office.context.document.getActiveViewAsync((viewResult) => {
          if (
            viewResult.status === Office.AsyncResultStatus.Succeeded &&
            viewResult.value === "read"
          ) {
            // Now check if the add-in's slide is currently shown
            Office.context.document.getSelectedDataAsync(
          Office.CoercionType.SlideRange,
          (slideResult) => {
            if (
              slideResult.status === Office.AsyncResultStatus.Succeeded
            ) {
              // If we get a slide, assume the add-in is visible on the current slide
              // (You may want to add more checks here if needed)
              console.log(
            "Presentation mode and add-in slide is shown, running command"
              );
              runCommand();
            } else {
              // Not on the slide with the add-in
              console.log(
            "Presentation mode, but add-in slide is not shown"
              );
            }
          }
            );
          }
        });
          } catch (err) {
        console.error("Failed to check presentation mode:", err);
          }
        }
      }

      saveBtn.addEventListener("click", function () {
        localStorage.setItem("dtServerUrl", urlInput.value);
        localStorage.setItem("dtCommandId", idInput.value);
        localStorage.setItem("dtBringToFront", bringInput.checked.toString());
        runCommand();
      });

      // Listen for slide show start events
      try {
        if (Office.context.document) {
          // @ts-ignore - The event might not be properly typed
          Office.context.document.addHandlerAsync(
            Office.EventType.ActiveViewChanged,
            checkPresentationMode
          );
        }
      } catch (err) {
        console.error("Failed to add view change handler:", err);
      }

      // Automatically run on load only if we have saved settings
      if (savedCommandId) {
        runCommand();
      }

      // Check if already in presentation mode when loaded
      checkPresentationMode();
    }
  });
})();
// @ts-check

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


      Office.context.document.settings.set("TestSetting", "TestValue");
      Office.context.document.settings.saveAsync(function (asyncResult) {
        if (asyncResult.status === Office.AsyncResultStatus.Failed) {
          console.error("Failed to save settings:", asyncResult.error.message);
        } else {
          console.log("Settings saved successfully");
        }
      });

      const testSetting = Office.context.document.settings.get("TestSetting");
      console.log("Loaded TestSetting:", testSetting);

      // Get form elements and add null checks
      var urlInput = document.getElementById("serverUrl");
      var idInput = document.getElementById("commandId");
      var bringInput = document.getElementById("bringToFront");
      var saveBtn = document.getElementById("saveBtn");
      var testBtn = document.getElementById("testBtn");

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
            // Step 1: Check if in presentation mode (reading view/slide show)
            Office.context.document.getActiveViewAsync((viewResult) => {
              if (
                viewResult.status === Office.AsyncResultStatus.Succeeded &&
                viewResult.value === "read"  // "read" means slide show/presentation mode
              ) {
                console.log("Detected presentation mode (slide show view)");

                // PowerPoint.run(async (context) => {
                //   const selectedSlides = context.presentation.getSelectedSlides();
                //   const currentSlide = selectedSlides.items[0];
                //   const slideId = currentSlide.id;

                //   const allSlides = context.presentation.slides;

                //   await context.sync();
                //   const slideIndex = currentSlide.index;
                //   localStorage.setItem("dtAddInSlideIndex", slideIndex.toString());
                //   console.log(`Add-in is on slide index: ${slideIndex}`);
                // });
                
                // Step 2: Check if the add-in's slide is currently visible
                Office.context.document.getSelectedDataAsync(
                  Office.CoercionType.SlideRange,
                  (slideResult) => {
                    if (
                      slideResult.status === Office.AsyncResultStatus.Succeeded &&
                      slideResult.value &&  // Verify we have slide data
                      slideResult.value.slides && 
                      slideResult.value.slides.length > 0
                    ) {
                      // Extract slide information
                      const currentSlide = slideResult.value.slides[0];
                      const slideIndex = currentSlide.index;
                      
                      const controlSlide = localStorage.getItem("dtAddInSlideId");

                      updateSlideInfoDisplay(slideIndex, controlSlide);
                      
                      // We have confirmed:
                      // 1. We're in presentation mode
                      // 2. We can detect the current slide
                      // 3. The add-in is visible (otherwise we wouldn't get slide data)
                      console.log(
                        "Presentation mode confirmed and add-in slide is shown, running command"
                      );

                      // runCommand();
                    } else {
                      // Either not on the slide with the add-in or couldn't get slide data
                      console.log(
                        "Presentation mode active, but add-in slide is not currently shown"
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

      testBtn.addEventListener("click", function () {
        runCommand();
      });

      saveBtn.addEventListener("click", function () {
        localStorage.setItem("dtServerUrl", urlInput.value);
        localStorage.setItem("dtCommandId", idInput.value);
        localStorage.setItem("dtBringToFront", bringInput.checked.toString());

        // PowerPoint.run(async (context) => {
        //   const slides = context.presentation.getSelectedSlides()
        //   const currentSlide = slides.items[0];
        //   localStorage.setItem("dtAddInSlideIndex", currentSlide.index.toString());
        //   console.log(`Saved add-in slide index: ${currentSlide.index}`);
        // });

        Office.context.document.getSelectedDataAsync(
          Office.CoercionType.SlideRange,
          (slideResult) => {
            if (
              slideResult.status === Office.AsyncResultStatus.Succeeded &&
              slideResult.value &&  // Verify we have slide data
              slideResult.value.slides && 
              slideResult.value.slides.length > 0
            ) {
              // Extract slide information
              const currentSlide = slideResult.value.slides[0];
              const slideIndex = currentSlide.index;

              localStorage.setItem("dtAddInSlideId", slideIndex.toString());
              // Office.context.document.settings.set("CurrentSlide", currentSlide);
              // Office.context.document.settings.saveAsync(function (asyncResult) { });
            }
          }
        );

        console.log("Settings saved");
        const statusMessage = document.getElementById("statusMessage");
        if (statusMessage) {
          statusMessage.className = "success";
          statusMessage.style.display = "block";
          statusMessage.textContent = "Settings saved successfully!";
          setTimeout(() => {
            statusMessage.style.display = "none";
          }, 3000);
        }
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

      // Check if already in presentation mode when loaded
      checkPresentationMode();

      // Add function to update slide information display
      function updateSlideInfoDisplay(currentSlideNum, addInSlideNum) {
        // Create slide info container if it doesn't exist
        let slideInfoContainer = document.getElementById("slideInfoContainer");
        if (!slideInfoContainer) {
          slideInfoContainer = document.createElement("div");
          slideInfoContainer.id = "slideInfoContainer";
          slideInfoContainer.className = "slide-info-container";
          
          // Add CSS for the slide info container
          const style = document.createElement("style");
          style.textContent = `
            .slide-info-container {
              margin-top: 10px;
              padding: 8px;
              background-color: #f5f5f5;
              border-radius: 4px;
              font-size: 12px;
              color: #555;
            }
            .slide-info {
              display: flex;
              justify-content: space-between;
              margin-bottom: 4px;
            }
            .slide-info-label {
              font-weight: bold;
            }
            .slide-current {
              color: #4CAF50;
            }
            .slide-addin {
              color: #2196F3;
            }
          `;
          document.head.appendChild(style);
          
          // Create the slide info elements
          const currentSlideInfo = document.createElement("div");
          currentSlideInfo.className = "slide-info slide-current";
          currentSlideInfo.innerHTML = `<span class="slide-info-label">Current Slide:</span> <span id="currentSlideNum"></span>`;
          
          const addInSlideInfo = document.createElement("div");
          addInSlideInfo.className = "slide-info slide-addin";
          addInSlideInfo.innerHTML = `<span class="slide-info-label">Add-in Slide:</span> <span id="addInSlideNum"></span>`;
          
          slideInfoContainer.appendChild(currentSlideInfo);
          slideInfoContainer.appendChild(addInSlideInfo);
          
          // Insert before the save button or at the end of the form
          const formContainer = document.getElementById("formContainer");
          if (formContainer) {
            formContainer.appendChild(slideInfoContainer);
          }
        }
        
        // Update the slide numbers
        const currentSlideNumElement = document.getElementById("currentSlideNum");
        const addInSlideNumElement = document.getElementById("addInSlideNum");
        
        if (currentSlideNumElement) {
          currentSlideNumElement.textContent = currentSlideNum;
        }
        
        if (addInSlideNumElement) {
          addInSlideNumElement.textContent = addInSlideNum;
        }
      }
    }
  });
})();
// Tab system - similar to your original code
var panel1 = document.getElementById("panel1");
var tabs = ["Settings", "Output", "Display", "Memory"];
var panelContents = [];

// Create tab content divs
for (var i = 0; i < tabs.length; i++) {
    var div = document.createElement("div");
    div.style.display = "none";
    div.style.height = "calc(100% - 29px)";
    div.style.width = "100%";
    div.style.position = "absolute";
    div.style.top = "29px";
    div.style.left = "0";
    div.id = tabs[i];
    panel1.appendChild(div);
    panelContents.push(div);
}

// Function to switch tabs
function openTab(i, tab) {
    // Hide all panels
    for (var j = 0; j < panelContents.length; j++) {
        panelContents[j].style.display = "none";
    }
    // Remove active class from all tabs
    var tabButtons = document.getElementsByClassName("tabs")[0].getElementsByTagName("button");
    for (var j = 0; j < tabButtons.length; j++) {
        tabButtons[j].classList.remove("openTab");
    }
    // Show selected panel and mark tab as active
    panelContents[i].style.display = "block";
    tab.classList.add("openTab");
}

// Create tab buttons
for (var i = 0; i < tabs.length; i++) {
    (function(i) {  // Closure to capture i value (similar to Lua's closure behavior)
        var tab = document.createElement("button");
        tab.innerText = tabs[i];
        tab.onclick = function() {
            openTab(i, tab);
        }
        document.getElementsByClassName("tabs")[0].appendChild(tab);
    })(i);
}

// Global variables for the interpreter
var displayWidth = 16;
var displayHeight = 16;
var memorySize = 30000;
var memory = [];
var memoryPointer = 0;
var codePointer = 0;
var inputPointer = 0;
var output = "";
var isRunning = false;
var colorMode = "grayscale";  // "grayscale", "rgb", or "rgba"
var millisecondsPerTick = 0;  // New variable for execution delay
var executionTimeout = null;  // For managing async execution

// New variables for display update control
var displayUpdateMode = "immediate";  // "immediate" or "periodic"
var displayUpdateInterval = null;     // Timer for periodic updates
var needsDisplayUpdate = false;       // Flag to track if display needs updating

// Initialize Settings tab
panelContents[0].innerHTML = `
    <div class="settings-content">
        <h2>Display Settings</h2>
        <p>Configure the visual display for Brainfuck output.</p>
        <p>
            <label>Display Size:</label>
            <input type='number' id='displayWidth' min='1' max='50' value='16'>
            x
            <input type='number' id='displayHeight' min='1' max='50' value='16'>
        </p>
        <p>
            <label>Color Mode:</label>
            <select id='colorMode' onchange="changeColorMode()">
                <option value="grayscale">Grayscale (1 byte/pixel)</option>
                <option value="rgb">RGB (3 bytes/pixel)</option>
                <option value="rgba">RGBA (4 bytes/pixel)</option>
            </select>
        </p>
        <p>
            <label>Display Update Mode:</label>
            <select id='displayUpdateMode' onchange="changeDisplayUpdateMode()">
                <option value="immediate">Update Immediately</option>
                <option value="periodic">Update Every 0.1 Seconds</option>
            </select>
            <small>(Periodic updates can improve performance for complex programs)</small>
        </p>
        <p>Minimum Memory for Display: <b id='minMemory'>256</b></p>
        
        <h2>Interpreter Settings</h2>
        <p>
            <label>Memory Size:</label>
            <input type='number' id='memorySize' min='256' max='100000' value='30000'>
        </p>
        <p>
            <label>Milliseconds per Tick:</label>
            <input type='number' id='millisecondsPerTick' min='0' max='10000' value='0' step='0.01'>
            <small>(0 = full speed, 0.01-0.99 = multiple instructions per ms, 1+ = slower execution)</small>
        </p>
        <button onclick="updateSettings()">Apply Settings</button>
        <button onclick="downloadCode()">Download Code</button>
        <button onclick="uploadCode()">Upload Code</button>
        <button onclick="downloadMem()">Download Memory</button>
        <button onclick="stopExecution()" id="stopButton" style="display:none; background-color: #ff4444; color: white;">Stop Execution</button>
    </div>
`;

function saveFile(name, type, data) {
    // Check for legacy IE support
    if (data !== null && navigator.msSaveBlob) {
        return navigator.msSaveBlob(new Blob([data], { type: type }), name);
    }
    
    // Create download link using vanilla JavaScript
    var a = document.createElement("a");
    a.style.display = "none";
    var url = window.URL.createObjectURL(new Blob([data], {type: type}));
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
}

function downloadCode() {
    var code = document.getElementById("codeEditor").value;
    saveFile("code.bf", "text/plain", code);
}

function downloadImage() {
    // Create a canvas from the memory data
    var canvas = document.createElement("canvas");
    canvas.width = displayWidth;
    canvas.height = displayHeight;
    var ctx = canvas.getContext("2d");
    
    // Create image data from memory
    var imageData = ctx.createImageData(displayWidth, displayHeight);
    var data = imageData.data;
    
    for (var y = 0; y < displayHeight; y++) {
        for (var x = 0; x < displayWidth; x++) {
            var pixelIndex = (y * displayWidth + x) * 4; // RGBA has 4 components
            
            if (colorMode === "rgba") {
                // RGBA mode: use 4 bytes per pixel
                var baseIndex = (y * displayWidth + x) * 4;
                data[pixelIndex] = (baseIndex < memory.length) ? memory[baseIndex] : 0;     // R
                data[pixelIndex + 1] = (baseIndex + 1 < memory.length) ? memory[baseIndex + 1] : 0; // G
                data[pixelIndex + 2] = (baseIndex + 2 < memory.length) ? memory[baseIndex + 2] : 0; // B
                data[pixelIndex + 3] = (baseIndex + 3 < memory.length) ? memory[baseIndex + 3] : 255; // A
            } else if (colorMode === "rgb") {
                // RGB mode: use 3 bytes per pixel
                var baseIndex = (y * displayWidth + x) * 3;
                data[pixelIndex] = (baseIndex < memory.length) ? memory[baseIndex] : 0;     // R
                data[pixelIndex + 1] = (baseIndex + 1 < memory.length) ? memory[baseIndex + 1] : 0; // G
                data[pixelIndex + 2] = (baseIndex + 2 < memory.length) ? memory[baseIndex + 2] : 0; // B
                data[pixelIndex + 3] = 255; // A (fully opaque)
            } else {
                // Grayscale mode: use 1 byte per pixel
                var memIndex = y * displayWidth + x;
                var grayValue = (memIndex < memory.length) ? memory[memIndex] : 0;
                data[pixelIndex] = grayValue;     // R
                data[pixelIndex + 1] = grayValue; // G
                data[pixelIndex + 2] = grayValue; // B
                data[pixelIndex + 3] = 255;       // A (fully opaque)
            }
        }
    }
    
    // Put image data on canvas
    ctx.putImageData(imageData, 0, 0);
    
    // Download the canvas as PNG
    canvas.toBlob(function(blob) {
        var url = window.URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.style.display = "none";
        a.href = url;
        a.download = "brainfuck_display.png";
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    });
}

function uploadCode() {
    var upload = document.createElement("input");
    upload.type = "file";
    upload.accept = ".bf";
    upload.style.display = "none";
    document.body.appendChild(upload);
    upload.click();
    upload.onchange = function() {
        var file = upload.files[0];
        var reader = new FileReader();
        reader.onload = function() {
            var code = reader.result;
            document.getElementById("codeEditor").value = code;
        }
        reader.readAsText(file);
        document.body.removeChild(upload);
    }
}

function downloadMem() {
    var mem = document.getElementById("memoryView").innerText;
    saveFile("memory.txt", "text/plain", mem);
}

// Initialize Output tab
panelContents[1].innerHTML = '<div id="output" class="mono"></div>';

// Initialize Display tab
panelContents[2].innerHTML = '<div id="display"></div>        <button onclick="downloadImage()">Download Image</button>';

// Initialize Memory tab
panelContents[3].innerHTML = '<div id="memoryView"></div>';

// Change color mode function
function changeColorMode() {
    colorMode = document.getElementById("colorMode").value;
    updateMinMemoryDisplay();
    updateSettings();
}

// Change display update mode function
function changeDisplayUpdateMode() {
    displayUpdateMode = document.getElementById("displayUpdateMode").value;
    
    // Clear existing periodic update timer if it exists
    if (displayUpdateInterval) {
        clearInterval(displayUpdateInterval);
        displayUpdateInterval = null;
    }
    
    if (displayUpdateMode === "periodic") {
        // Set up periodic updates every 1 second (1000 milliseconds)
        // Similar to Lua's timer functions, setInterval runs code repeatedly
        displayUpdateInterval = setInterval(function() {
            if (needsDisplayUpdate) {
                updateDisplay();
                updateMemoryView();
                needsDisplayUpdate = false;
            }
        }, 100);
    }
}

// Update minimum memory display
function updateMinMemoryDisplay() {
    var baseMemory = displayWidth * displayHeight;
    var minMemory;
    switch (colorMode) {
        case "rgb":
            minMemory = baseMemory * 3;
            break;
        case "rgba":
            minMemory = baseMemory * 4;
            break;
        default: // grayscale
            minMemory = baseMemory;
    }
    document.getElementById("minMemory").innerText = minMemory;
}

// Update settings function
function updateSettings() {
    displayWidth = parseInt(document.getElementById("displayWidth").value) || 16;
    displayHeight = parseInt(document.getElementById("displayHeight").value) || 16;
    memorySize = parseInt(document.getElementById("memorySize").value) || 30000;
    millisecondsPerTick = parseFloat(document.getElementById("millisecondsPerTick").value) || 0;
    
    // Update display mode if the element exists
    if (document.getElementById("displayUpdateMode")) {
        displayUpdateMode = document.getElementById("displayUpdateMode").value;
        changeDisplayUpdateMode(); // Apply the display update mode
    }
    
    var baseMemory = displayWidth * displayHeight;
    var minMemory;
    switch (colorMode) {
        case "rgb":
            minMemory = baseMemory * 3;
            break;
        case "rgba":
            minMemory = baseMemory * 4;
            break;
        default: // grayscale
            minMemory = baseMemory;
    }
    document.getElementById("minMemory").innerText = minMemory;
    
    if (memorySize < minMemory) {
        memorySize = minMemory;
        document.getElementById("memorySize").value = memorySize;
    }
    
    initMemory();
    updateDisplay();
    updateMemoryView();
}

// Initialize memory array
function initMemory() {
    memory = [];
    for (var i = 0; i < memorySize; i++) {
        memory[i] = 0;
    }
    memoryPointer = 0;
}

// Helper function to request display update
// This is like setting a flag in Lua - we mark that an update is needed
function requestDisplayUpdate() {
    if (displayUpdateMode === "immediate") {
        updateDisplay();
        updateMemoryView();
    } else {
        // Just set the flag - the periodic timer will handle the actual update
        needsDisplayUpdate = true;
    }
}

// Update display visualization
function updateDisplay() {
    var displayDiv = document.getElementById("display");
    displayDiv.innerHTML = "";
    
    // Create grid container
    var grid = document.createElement("div");
    grid.id = "displayGrid";
    
    // Calculate available space
    var containerWidth = displayDiv.clientWidth - 20; // Account for padding
    var containerHeight = displayDiv.clientHeight - 20;
    
    // Calculate optimal square size
    var maxSquareWidth = Math.floor(containerWidth / displayWidth);
    var maxSquareHeight = Math.floor(containerHeight / displayHeight);
    var squareSize = Math.min(maxSquareWidth, maxSquareHeight);
    
    // Set grid properties
    grid.style.gridTemplateColumns = "repeat(" + displayWidth + ", " + squareSize + "px)";
    grid.style.gridTemplateRows = "repeat(" + displayHeight + ", " + squareSize + "px)";
    
    // Create pixels
    for (var y = 0; y < displayHeight; y++) {
        for (var x = 0; x < displayWidth; x++) {
            var pixel = document.createElement("div");
            pixel.className = "pixel";
            pixel.title = "(" + x + ", " + y + "), " + (y * displayWidth + x);
            if (colorMode === "rgba") {
                // RGBA mode: use 4 bytes per pixel (R, G, B, A)
                var baseIndex = (y * displayWidth + x) * 4;
                var r = (baseIndex < memory.length) ? memory[baseIndex] : 0;
                var g = (baseIndex + 1 < memory.length) ? memory[baseIndex + 1] : 0;
                var b = (baseIndex + 2 < memory.length) ? memory[baseIndex + 2] : 0;
                var a = (baseIndex + 3 < memory.length) ? memory[baseIndex + 3] / 255 : 1; // Alpha as 0-1
                pixel.style.backgroundColor = "rgba(" + r + "," + g + "," + b + "," + a + ")";
            } else if (colorMode === "rgb") {
                // RGB mode: use 3 bytes per pixel (R, G, B)
                var baseIndex = (y * displayWidth + x) * 3;
                var r = (baseIndex < memory.length) ? memory[baseIndex] : 0;
                var g = (baseIndex + 1 < memory.length) ? memory[baseIndex + 1] : 0;
                var b = (baseIndex + 2 < memory.length) ? memory[baseIndex + 2] : 0;
                pixel.style.backgroundColor = "rgb(" + r + "," + g + "," + b + ")";
            } else {
                // Grayscale mode: use 1 byte per pixel
                var memIndex = y * displayWidth + x;
                if (memIndex < memory.length) {
                    // Convert 0-255 value to grayscale (0=black, 255=white)
                    var grayValue = memory[memIndex];
                    pixel.style.backgroundColor = "rgb(" + grayValue + "," + grayValue + "," + grayValue + ")";
                } else {
                    pixel.style.backgroundColor = "rgb(0,0,0)";  // Black for out of bounds
                }
            }
            
            grid.appendChild(pixel);
        }
    }
    
    displayDiv.appendChild(grid);
}

// Update memory visualization
function updateMemoryView() {
    var memoryDiv = document.getElementById("memoryView");
    memoryDiv.innerHTML = "";
    
    // Show memory in rows of 16
    for (var i = 0; i < Math.min(memory.length, 512); i++) {
        if (i % 16 === 0) {
            var addr = document.createElement("div");
            addr.style.color = "gray";
            addr.style.fontSize = "10px";
            addr.textContent = i.toString(16).padStart(4, "0") + ":";
            memoryDiv.appendChild(addr);
        }
        
        var cell = document.createElement("span");
        cell.className = "memory-cell";
        if (i === memoryPointer) {
            cell.classList.add("current");
        }
        
        // Add color coding for color modes
        if (colorMode === "rgba") {
            var colorChannel = i % 4;
            if (colorChannel === 0) {
                cell.style.borderLeft = "2px solid rgb(255, 100, 100)"; // R
            } else if (colorChannel === 1) {
                cell.style.borderLeft = "2px solid rgb(100, 255, 100)"; // G
            } else if (colorChannel === 2) {
                cell.style.borderLeft = "2px solid rgb(100, 100, 255)"; // B
            } else {
                cell.style.borderLeft = "2px solid rgb(200, 200, 200)"; // A
            }
        } else if (colorMode === "rgb") {
            var colorChannel = i % 3;
            if (colorChannel === 0) {
                cell.style.borderLeft = "2px solid rgb(255, 100, 100)"; // R
            } else if (colorChannel === 1) {
                cell.style.borderLeft = "2px solid rgb(100, 255, 100)"; // G
            } else {
                cell.style.borderLeft = "2px solid rgb(100, 100, 255)"; // B
            }
        }
        
        cell.textContent = memory[i].toString();
        memoryDiv.appendChild(cell);
        
        if ((i + 1) % 16 === 0) {
            memoryDiv.appendChild(document.createElement("br"));
        }
    }
}

// Stop execution function
function stopExecution() {
    if (executionTimeout) {
        clearTimeout(executionTimeout);
        executionTimeout = null;
    }
    
    // Clear the periodic display update timer
    if (displayUpdateInterval) {
        clearInterval(displayUpdateInterval);
        displayUpdateInterval = null;
    }
    
    isRunning = false;
    var outputDiv = document.getElementById("output");
    outputDiv.textContent = output + "\n\n--- Execution stopped ---";
    document.getElementById("stopButton").style.display = "none";
    document.getElementById("run").disabled = false;
    
    // Final display update when stopping
    updateDisplay();
    updateMemoryView();
    
    // Restart periodic updates if that mode is selected
    if (displayUpdateMode === "periodic") {
        changeDisplayUpdateMode();
    }
}

// Main Brainfuck interpreter function
function runBrainfuck() {
    if (isRunning) return;
    
    var code = document.getElementById("codeEditor").value;
    var input = document.getElementById("input").value;
    
    // Reset state
    initMemory();
    memoryPointer = 0;
    codePointer = 0;
    inputPointer = 0;
    output = "";
    isRunning = true;
    needsDisplayUpdate = false;
    
    var outputDiv = document.getElementById("output");
    outputDiv.textContent = "Running...\n";
    
    // Show stop button and disable run button
    document.getElementById("stopButton").style.display = "inline-block";
    document.getElementById("run").disabled = true;
    
    // Set up periodic updates if needed
    if (displayUpdateMode === "periodic") {
        changeDisplayUpdateMode();
    }
    
    // Choose execution method based on milliseconds per tick
    if (millisecondsPerTick > 0) {
        // Slow execution with delays
        executeCodeWithDelay(code, input);
    } else {
        // Fast execution (original behavior)
        setTimeout(function() {
            try {
                executeCode(code, input);
                outputDiv.textContent = output || "(no output)";
                // Always update display immediately when execution finishes
                updateDisplay();
                updateMemoryView();
            } catch (error) {
                outputDiv.textContent = "Error: " + error.message;
            }
            isRunning = false;
            document.getElementById("stopButton").style.display = "none";
            document.getElementById("run").disabled = false;
        }, 10);
    }
}

// Execute code with delay between instructions
function executeCodeWithDelay(code, input) {
    var loopStack = [];
    var maxInstructions = 1000000;  // Lower limit for delayed execution
    var instructionCount = 0;
    
    // Calculate instructions per frame and delay
    var instructionsPerFrame = 1;
    var frameDelay = millisecondsPerTick;
    
    if (millisecondsPerTick > 0 && millisecondsPerTick < 1) {
        // For values between 0 and 1, run multiple instructions per millisecond
        instructionsPerFrame = Math.ceil(1 / millisecondsPerTick);
        frameDelay = 1; // Execute every millisecond
    } else if (millisecondsPerTick >= 1) {
        // For values >= 1, run one instruction per specified milliseconds
        instructionsPerFrame = 1;
        frameDelay = millisecondsPerTick;
    }
    
    function executeInstructionBatch() {
        if (!isRunning || codePointer >= code.length || instructionCount >= maxInstructions) {
            // Execution finished
            var outputDiv = document.getElementById("output");
            if (instructionCount >= maxInstructions) {
                outputDiv.textContent = output + "\n\nError: Maximum instruction limit reached";
            } else {
                outputDiv.textContent = output || "(no output)";
            }
            // Always update display immediately when execution finishes
            updateDisplay();
            updateMemoryView();
            isRunning = false;
            document.getElementById("stopButton").style.display = "none";
            document.getElementById("run").disabled = false;
            return;
        }
        
        // Execute multiple instructions in this frame
        for (var i = 0; i < instructionsPerFrame && isRunning && codePointer < code.length && instructionCount < maxInstructions; i++) {
            var command = code[codePointer];
            
            try {
                switch (command) {
                    case '>':  // Move pointer right
                        memoryPointer++;
                        if (memoryPointer >= memorySize) {
                            memoryPointer = 0;
                        }
                        break;
                        
                    case '<':  // Move pointer left
                        memoryPointer--;
                        if (memoryPointer < 0) {
                            memoryPointer = memorySize - 1;
                        }
                        break;
                        
                    case '+':  // Increment memory cell
                        memory[memoryPointer] = (memory[memoryPointer] + 1) % 256;
                        // Request display update since memory changed
                        requestDisplayUpdate();
                        break;
                        
                    case '-':  // Decrement memory cell
                        memory[memoryPointer]--;
                        if (memory[memoryPointer] < 0) {
                            memory[memoryPointer] = 255;
                        }
                        // Request display update since memory changed
                        requestDisplayUpdate();
                        break;
                        
                    case '.':  // Output character
                        output += String.fromCharCode(memory[memoryPointer]);
                        break;
                        
                    case ',':  // Input character
                        if (inputPointer < input.length) {
                            memory[memoryPointer] = input.charCodeAt(inputPointer);
                            inputPointer++;
                        } else {
                            memory[memoryPointer] = 0;
                        }
                        // Request display update since memory changed
                        requestDisplayUpdate();
                        break;
                        
                    case '[':  // Loop start
                        if (memory[memoryPointer] === 0) {
                            // Skip to matching ]
                            var bracketCount = 1;
                            while (bracketCount > 0 && codePointer < code.length - 1) {
                                codePointer++;
                                if (code[codePointer] === '[') bracketCount++;
                                else if (code[codePointer] === ']') bracketCount--;
                            }
                        } else {
                            loopStack.push(codePointer);
                        }
                        break;
                        
                    case ']':  // Loop end
                        if (memory[memoryPointer] !== 0) {
                            if (loopStack.length > 0) {
                                codePointer = loopStack[loopStack.length - 1];
                            }
                        } else {
                            if (loopStack.length > 0) {
                                loopStack.pop();
                            }
                        }
                        break;
                }
                
                codePointer++;
                instructionCount++;
                
            } catch (error) {
                document.getElementById("output").textContent = "Error: " + error.message;
                isRunning = false;
                document.getElementById("stopButton").style.display = "none";
                document.getElementById("run").disabled = false;
                return;
            }
        }
        
        // Update output every frame (this is always immediate)
        document.getElementById("output").textContent = output || "(no output)";
        
        // Schedule next batch of instructions
        executionTimeout = setTimeout(executeInstructionBatch, frameDelay);
    }
    
    // Start execution
    executeInstructionBatch();
}

// Execute Brainfuck code (original fast version)
function executeCode(code, input) {
    var loopStack = [];
    var maxInstructions = 1000000000000000;
    var instructionCount = 0;
    
    while (codePointer < code.length && instructionCount < maxInstructions) {
        var command = code[codePointer];
        
        switch (command) {
            case '>':  // Move pointer right
                memoryPointer++;
                if (memoryPointer >= memorySize) {
                    memoryPointer = 0;
                }
                break;
                
            case '<':  // Move pointer left
                memoryPointer--;
                if (memoryPointer < 0) {
                    memoryPointer = memorySize - 1;
                }
                break;
                
            case '+':  // Increment memory cell
                memory[memoryPointer] = (memory[memoryPointer] + 1) % 256;
                break;
                
            case '-':  // Decrement memory cell
                memory[memoryPointer]--;
                if (memory[memoryPointer] < 0) {
                    memory[memoryPointer] = 255;
                }
                break;
                
            case '.':  // Output character
                output += String.fromCharCode(memory[memoryPointer]);
                break;
                
            case ',':  // Input character
                if (inputPointer < input.length) {
                    memory[memoryPointer] = input.charCodeAt(inputPointer);
                    inputPointer++;
                } else {
                    memory[memoryPointer] = 0;
                }
                break;
                
            case '[':  // Loop start
                if (memory[memoryPointer] === 0) {
                    // Skip to matching ]
                    var bracketCount = 1;
                    while (bracketCount > 0 && codePointer < code.length - 1) {
                        codePointer++;
                        if (code[codePointer] === '[') bracketCount++;
                        else if (code[codePointer] === ']') bracketCount--;
                    }
                } else {
                    loopStack.push(codePointer);
                }
                break;
                
            case ']':  // Loop end
                if (memory[memoryPointer] !== 0) {
                    if (loopStack.length > 0) {
                        codePointer = loopStack[loopStack.length - 1];
                    }
                } else {
                    if (loopStack.length > 0) {
                        loopStack.pop();
                    }
                }
                break;
        }
        
        codePointer++;
        instructionCount++;
    }
    
    if (instructionCount >= maxInstructions) {
        throw new Error("Maximum instruction limit reached (possible infinite loop)");
    }
}

// Set up event listeners
document.getElementById("run").onclick = runBrainfuck;

// Initialize everything
updateSettings();
openTab(1, document.getElementsByClassName("tabs")[0].getElementsByTagName("button")[1]);

function updateMemorySizeDisplay() {
    if (memorySize > 1000) {
        document.getElementById("memorySizeDisplay").innerText = Math.round(memorySize / 100)/10 + " KB";
        document.getElementById("memorySizeDisplay").style.backgroundColor = "rgb(100, 255, 146)";
        if (memorySize > 1000000) {
            document.getElementById("memorySizeDisplay").innerText = Math.round(memorySize / 100000)/10 + " MB";
            document.getElementById("memorySizeDisplay").style.backgroundColor = "rgb(206, 255, 100)";
            if (memorySize > 1000000000) {
                document.getElementById("memorySizeDisplay").innerText = Math.round(memorySize / 100000000)/10 + " GB";
                document.getElementById("memorySizeDisplay").style.backgroundColor = "rgb(255, 100, 100)";
            }
        }
    } else {
        document.getElementById("memorySizeDisplay").innerText = memorySize + " B"; 
        document.getElementById("memorySizeDisplay").style.backgroundColor = "rgb(105, 100, 255)";
    }
    if (displayUpdateMode === "immediate") {
        updateDisplay();
        updateMemoryView();
    }
    setTimeout(updateMemorySizeDisplay, 1);
}
updateMemorySizeDisplay();
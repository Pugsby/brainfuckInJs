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
            <label>Memory Size:</label>
            <input type='number' id='memorySize' min='256' max='100000' value='30000'>
        </p>
        <p>Minimum Memory for Display: <b id='minMemory'>256</b></p>
        <button onclick="updateSettings()">Apply Settings</button>
    </div>
`;

// Initialize Output tab
panelContents[1].innerHTML = '<div id="output" class="mono"></div>';

// Initialize Display tab
panelContents[2].innerHTML = '<div id="display"></div>';

// Initialize Memory tab
panelContents[3].innerHTML = '<div id="memoryView"></div>';

// Update settings function
function updateSettings() {
    displayWidth = parseInt(document.getElementById("displayWidth").value) || 16;
    displayHeight = parseInt(document.getElementById("displayHeight").value) || 16;
    memorySize = parseInt(document.getElementById("memorySize").value) || 30000;
    
    var minMemory = displayWidth * displayHeight;
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
            var memIndex = y * displayWidth + x;
            if (memIndex < memory.length) {
                // Convert 0-255 value to grayscale (0=black, 255=white)
                var grayValue = memory[memIndex];
                pixel.style.backgroundColor = "rgb(" + grayValue + "," + grayValue + "," + grayValue + ")";
            } else {
                pixel.style.backgroundColor = "rgb(0,0,0)";  // Black for out of bounds
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
        cell.textContent = memory[i].toString();
        memoryDiv.appendChild(cell);
        
        if ((i + 1) % 16 === 0) {
            memoryDiv.appendChild(document.createElement("br"));
        }
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
    
    var outputDiv = document.getElementById("output");
    outputDiv.textContent = "Running...\n";
    
    // Use setTimeout to prevent browser freezing
    setTimeout(function() {
        try {
            executeCode(code, input);
            outputDiv.textContent = output || "(no output)";
            updateDisplay();
            updateMemoryView();
        } catch (error) {
            outputDiv.textContent = "Error: " + error.message;
        }
        isRunning = false;
    }, 10);
}

// Execute Brainfuck code
function executeCode(code, input) {
    var loopStack = [];  // Stack for handling loops (like Lua tables used as stacks)
    var maxInstructions = 1000000;  // Prevent infinite loops
    var instructionCount = 0;
    
    while (codePointer < code.length && instructionCount < maxInstructions) {
        var command = code[codePointer];
        
        switch (command) {
            case '>':  // Move pointer right
                memoryPointer++;
                if (memoryPointer >= memorySize) {
                    throw new Error("Memory pointer out of bounds");
                }
                break;
                
            case '<':  // Move pointer left
                memoryPointer--;
                if (memoryPointer < 0) {
                    throw new Error("Memory pointer out of bounds");
                }
                break;
                
            case '+':  // Increment memory cell
                memory[memoryPointer] = (memory[memoryPointer] + 1) % 256;
                break;
                
            case '-':  // Decrement memory cell
                memory[memoryPointer]--;
                if (memory[memoryPointer] < 0) {
                    memory[memoryPointer] = 255;  // Wrap to 255
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
                    memory[memoryPointer] = 0;  // EOF
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
                    loopStack.push(codePointer);  // Save loop start position
                }
                break;
                
            case ']':  // Loop end
                if (memory[memoryPointer] !== 0) {
                    if (loopStack.length > 0) {
                        codePointer = loopStack[loopStack.length - 1];  // Jump back to loop start
                    }
                } else {
                    if (loopStack.length > 0) {
                        loopStack.pop();  // Remove loop start from stack
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
openTab(1, document.getElementsByClassName("tabs")[0].getElementsByTagName("button")[1]);  // Start with Output tab
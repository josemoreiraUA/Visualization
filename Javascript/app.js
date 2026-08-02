import * as d3 from 'd3';
import * as duckdb from '@duckdb/duckdb-wasm';

// Import your custom graph engine setup script 
// import { updateGraphLayout } from './lineage.js';
// Application Central State Management Registry
let useCaseConfig = {};
const loadedFileNamesSet = new Set();
let duckDbInstance = null;
let duckDbConnection = null;

// Initialize layout actions on loading completion
document.addEventListener('DOMContentLoaded', () => {
    initTabNavigation();
    initHelpAccordion();
    loadUseCaseConfigJSON();
    initDuckDatabaseEngine();
    initFileUploadHandler();
    initSqlQueryConsoleHandler();
});

// 1. Tab Views Swapping Mechanism
function initTabNavigation() {
    const buttons = document.querySelectorAll('.nav-btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.hasAttribute('disabled')) return;
            
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active-tab'));
            document.querySelectorAll('.view-panel').forEach(v => v.classList.remove('active-view'));
            
            btn.classList.add('active-tab');
            const targetId = btn.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active-view');

            // DETAILED STEP 2: Broadcast a decoupled global announcement window notification
            if (targetId === 'lineage-view') {
                const eventNotification = new CustomEvent('lineage-tab-visible');
                window.dispatchEvent(eventNotification);
            }
        });
    });
}


// 2. Expandable Accordion Widget Handler
function initHelpAccordion() {
    const accordion = document.getElementById('help-accordion');
    const previewSpan = document.getElementById('help-text-preview');
    const iconSpan = document.getElementById('help-toggle-icon');
    
    const fullTextStr = "Instructions: Load required datasets to unblock specific features. To activate specific analysis views, upload the matching parquet filenames specified in your environment configuration profile (use_cases.json). Once verified, buttons will instantly unlock.";

    accordion.addEventListener('click', () => {
        const isCollapsed = accordion.classList.toggle('collapsed');
        if (isCollapsed) {
            previewSpan.textContent = "Instructions: Load required datasets to unblock specific features...";
            iconSpan.textContent = "▼";
        } else {
            previewSpan.textContent = "Instructions:";
            iconSpan.textContent = "▲";
        }
    });
}

// 3. Load Use Cases Matrix Configurations Profiles
async function loadUseCaseConfigJSON() {
    try {
        const response = await fetch('/use_cases.json');
        useCaseConfig = await response.json();
        evaluateButtonUnlockingStates();
    } catch (err) {
        console.error("Failed to parse use_cases.json profile configuration mapping matrix:", err);
    }
}

// 4. Evaluate and Adjust Button Disabling Rules
function evaluateButtonUnlockingStates() {
    const mappings = [
        { btnId: "btn-lineage", key: "Lineage" },
        { btnId: "btn-knn", key: "K-nn" },
        { btnId: "btn-fairness", key: "Fairness" },
        { btnId: "btn-decision-tree", key: "Decision tree" }
    ];

    mappings.forEach(map => {
        const targetBtn = document.getElementById(map.btnId);
        const requiredFilesList = useCaseConfig[map.key] || [];
        
        // Fix: If a button needs "Data/employees.parquet", extract "employees.parquet" to match file.name
        const metRequirements = requiredFilesList.every(filePath => {
            const cleanFileName = filePath.split('/').pop(); 
            return loadedFileNamesSet.has(cleanFileName);
        });

        if (metRequirements && requiredFilesList.length > 0) {
            targetBtn.removeAttribute('disabled');
        } else {
            targetBtn.setAttribute('disabled', 'true');
        }
    });
}


// 5. Setup Bundler-Safe DuckDB Web Worker Environment
async function initDuckDatabaseEngine() {
    try {
        // FIX: Extract the core namespace dynamically to handle Vite CommonJS grouping wrappers safely
        const duckdbModule = duckdb.ConsoleLogger ? duckdb : (duckdb.default || duckdb);

        // Fetch local module/worker paths from your dependencies installation
        const allBundles = duckdbModule.getJsDelivrBundles();
        const chosenBundle = await duckdbModule.selectBundle(allBundles);

        // Instantiate the logger from the safe module wrapper reference
        const logger = new duckdbModule.ConsoleLogger();
        
        // Wrap the bundle workers smoothly inside a dynamic safe runtime script blob
        const workerBlobUrl = URL.createObjectURL(
            new Blob([`importScripts("${chosenBundle.mainWorker}");`], { type: 'text/javascript' })
        );
        const worker = new Worker(workerBlobUrl);
        
        duckDbInstance = new duckdbModule.AsyncDuckDB(logger, worker);
        await duckDbInstance.instantiate(chosenBundle.mainModule, chosenBundle.pthreadWorker);
        
        duckDbConnection = await duckDbInstance.connect();
        URL.revokeObjectURL(workerBlobUrl);
        
        console.log("DuckDB WASM Engine connected successfully!");
        
        // Clear any previous error/unreachable markers from the presentation area
        document.getElementById('preview-table-container').innerHTML = '';
    } catch (err) {
        console.error("Failed to connect to local DuckDB bundle instance:", err);
        document.getElementById('preview-table-container').innerHTML = `
            <div style="background-color: #451a03; border: 1px solid #f59e0b; padding: 15px; color: #fef3c7; border-radius: 6px; font-family: monospace;">
                <strong>Database Engine Initialization Error:</strong><br>
                <p style="margin: 5px 0 0 0; font-size: 13px;">${err.message}</p>
            </div>`;
    }
}



// 6. Manage File Upload Input Parsing Buffers
function initFileUploadHandler() {
    const input = document.getElementById('parquet-picker');
    input.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        // FIX: Safely resolve the dynamic namespace wrapper from Vite
        const duckdbModule = duckdb.ConsoleLogger ? duckdb : (duckdb.default || duckdb);

        for (const file of files) {
            if (!loadedFileNamesSet.has(file.name)) {
                if (duckDbInstance) {
                    await duckDbInstance.registerFileHandle(
                        file.name,
                        file,
                        duckdbModule.DuckDBDataProtocol.BROWSER_FILEREADER, // Fix: use duckdbModule wrapper here
                        true
                    );
                }
                loadedFileNamesSet.add(file.name);
            }
        }
        
        renderLoadedFilesListUI();
        evaluateButtonUnlockingStates();
        input.value = ''; // Reset file input descriptor state
    });
}


// 7. Render Uploaded File Storage Tracking Rows UI
function renderLoadedFilesListUI() {
    const listElement = document.getElementById('files-list');
    listElement.innerHTML = '';

    loadedFileNamesSet.forEach(fileName => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span>📄 <strong>${fileName}</strong> (Loaded into Sandbox)</span>
            <button class="preview-icon-btn" data-file="${fileName}" title="Preview First 10 Rows">🔍 Preview</button>
        `;
        
        li.querySelector('.preview-icon-btn').addEventListener('click', (e) => {
            const targetFile = e.target.getAttribute('data-file');
            executePreviewRowExtraction(targetFile);
        });

        listElement.appendChild(li);
    });
}

// 8. Execute SQL  Query and Draw HTML Output Grid
function renderDuckTable(queryResponse, container) {
    const structuralRows = queryResponse.toArray();

    if (structuralRows.length === 0) {
        container.innerHTML = `<p style="color: #10b981;">✅ Execution successful. Empty output set returned.</p>`;
        return;
    }

    // Extract headers safely from Apache Arrow schema structure fields
    const keys = queryResponse.schema.fields.map(field => field.name);
    
    container.innerHTML = `
        <table class="duck-preview-table">
            <thead>
                <tr>${keys.map(k => `<th>${k}</th>`).join('')}</tr>
            </thead>
            <tbody>
                ${structuralRows.map(row => `
                    <tr>
                        ${keys.map(k => `<td>${row[k] !== null ? row[k] : ''}</td>`).join('')}
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

async function executePreviewRowExtraction(fileName) {
    const container = document.getElementById('preview-table-container');
    if (!duckDbConnection || !container) return;

    container.innerHTML = `<p style="color:#38bdf8;">Querying record streams for ${fileName}...</p>`;

    try {
        const queryResponse = await duckDbConnection.query(`SELECT * FROM "${fileName}" LIMIT 10`);
        container.innerHTML = `<h4>File Preview (${fileName}):</h4>`;
        renderDuckTable(queryResponse, container);
    } catch (err) {
        container.innerHTML = `<p style="color:#ef4444;">SQL Read Error: ${err.message}</p>`;
    }
}

// 9. Draw workspace headers from structuralRows[0] 
function initSqlQueryConsoleHandler() {
    const runBtn = document.getElementById('execute-sql-btn');
    if (!runBtn) return;

    console.log("SQL Workspace Console script handler attached successfully!");

    runBtn.addEventListener('click', async () => {
        const queryInput = document.getElementById('custom-sql-input');
        const container = document.getElementById('preview-table-container');
        if (!queryInput || !container) return;

        const sqlQueryRaw = queryInput.value.trim();
        if (!sqlQueryRaw) {
            container.innerHTML = `<p style="color:#orange;">⚠️ The SQL text input console area is empty.</p>`;
            return;
        }

        container.innerHTML = `<p style="color:#38bdf8;">Evaluating active query statement...</p>`;

        try {
            const queryResponse = await duckDbConnection.query(sqlQueryRaw);
            renderDuckTable(queryResponse, container);
        } catch (err) {
            container.innerHTML = `
                <div style="background-color: #451a03; border: 1px solid #f59e0b; padding: 15px; color: #fef3c7; border-radius: 6px; font-family: monospace;">
                    <strong>DuckDB Syntax Parse Exception:</strong><br>
                    <pre style="white-space: pre-wrap; margin-top: 8px; font-size:12px;">${err.message}</pre>
                </div>`;
        }
    });
}


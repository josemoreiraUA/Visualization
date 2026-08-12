import * as d3 from 'd3';
import * as duckdb from '@duckdb/duckdb-wasm';

let useCaseConfig = {};
const loadedFileNamesSet = new Set();
let duckDbInstance = null;
let duckDbConnection = null;

document.addEventListener('DOMContentLoaded', () => {
    initTabNavigation();
    initHelpAccordion();
    initConsoleAccordion();
    loadUseCaseConfigJSON();
    initDuckDatabaseEngine();
    initFileUploadHandler();
    initSqlQueryConsoleHandler();
});

function initTabNavigation() {
    const buttons = document.querySelectorAll('.nav-btn');
    
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.hasAttribute('disabled')) {
                console.log("Tab blocked by initialization constraints. Unlocking for lineage verification...");
                btn.removeAttribute('disabled');
            }
            
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active-tab'));
            document.querySelectorAll('.view-panel').forEach(v => v.classList.remove('active-view'));
            
            btn.classList.add('active-tab');
            const targetId = btn.getAttribute('data-target');
            const targetPanel = document.getElementById(targetId);
            if (targetPanel) {
                targetPanel.classList.add('active-view');
            }

            if (targetId === 'lineage-view') {
                console.log("Signaling visibility trace strictly to Lineage module...");
                window.dispatchEvent(new CustomEvent('lineage-tab-visible'));
            } 
            else if (targetId === 'knn-view') {
                console.log("Signaling visibility trace strictly to K-nn module...");
                window.dispatchEvent(new CustomEvent('knn-tab-visible'));
            }
        });
    });
}

function initHelpAccordion() {
    const accordion = document.getElementById('help-accordion');
    const previewSpan = document.getElementById('help-text-preview');
    const iconSpan = document.getElementById('help-toggle-icon');

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

function initConsoleAccordion() {
    const consoleContainer = document.getElementById('query-console-section');
    const header = document.getElementById('console-accordion-header');
    const content = document.getElementById('console-accordion-content');
    const iconSpan = document.getElementById('console-toggle-icon');

    if (!header || !consoleContainer || !content || !iconSpan) return;

    header.addEventListener('click', () => {
        const isCollapsed = consoleContainer.classList.toggle('collapsed');
        if (isCollapsed) {
            content.style.display = "none";
            iconSpan.textContent = "▼";
        } else {
            content.style.display = "block";
            iconSpan.textContent = "▲";
        }
    });
}

async function loadUseCaseConfigJSON() {
    try {
        const response = await fetch('use_cases.json');
        useCaseConfig = await response.json();
        evaluateButtonUnlockingStates();
        renderStorageStatusUI(); 
    } catch (err) {
        console.error("Failed to parse use_cases.json configuration:", err);
    }
}

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

async function initDuckDatabaseEngine() {
    try {
        const duckdbModule = duckdb.ConsoleLogger ? duckdb : (duckdb.default || duckdb);
        const allBundles = duckdbModule.getJsDelivrBundles();
        const chosenBundle = await duckdbModule.selectBundle(allBundles);
        const logger = new duckdbModule.ConsoleLogger();
        
        const workerBlobUrl = URL.createObjectURL(
            new Blob([`importScripts("${chosenBundle.mainWorker}");`], { type: 'text/javascript' })
        );
        const worker = new Worker(workerBlobUrl);
        
        duckDbInstance = new duckdbModule.AsyncDuckDB(logger, worker);
        await duckDbInstance.instantiate(chosenBundle.mainModule, chosenBundle.pthreadWorker);
        
        duckDbConnection = await duckDbInstance.connect();
        window.duckDbConnection = duckDbConnection; 
        console.log("DuckDB WASM Engine connected successfully!");
        
        URL.revokeObjectURL(workerBlobUrl);
        document.getElementById('preview-table-container').innerHTML = '';
    } catch (err) {
        console.error("Failed to connect to local DuckDB instance:", err);
        document.getElementById('preview-table-container').innerHTML = `
            <div style="background-color: #451a03; border: 1px solid #f59e0b; padding: 15px; color: #fef3c7; border-radius: 6px; font-family: monospace;">
                <strong>Database Engine Initialization Error:</strong><br>
                <p style="margin: 5px 0 0 0; font-size: 13px;">${err.message}</p>
            </div>`;
    }
}

function initFileUploadHandler() {
    const input = document.getElementById('parquet-picker');
    input.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        const duckdbModule = duckdb.ConsoleLogger ? duckdb : (duckdb.default || duckdb);

        for (const file of files) {
            if (!loadedFileNamesSet.has(file.name)) {
                if (duckDbInstance) {
                    await duckDbInstance.registerFileHandle(
                        file.name,
                        file,
                        duckdbModule.DuckDBDataProtocol.BROWSER_FILEREADER,
                        true
                    );
                }
                loadedFileNamesSet.add(file.name);
            }
        }
        
        renderStorageStatusUI();
        evaluateButtonUnlockingStates();
        input.value = '';
    });
}

function renderStorageStatusUI() {
    const container = document.getElementById('storage-status-container');
    if (!container || !useCaseConfig) return;

    container.innerHTML = '';
    const relevantUseCases = ["Lineage", "K-nn", "Fairness", "Decision tree"];

    relevantUseCases.forEach(useCaseKey => {
        const requiredFiles = useCaseConfig[useCaseKey] || [];
        if (requiredFiles.length === 0) return;

        const isUseCaseFullyLoaded = requiredFiles.every(filePath => {
            const cleanFileName = filePath.split('/').pop();
            return loadedFileNamesSet.has(cleanFileName);
        });

        const titleColor = isUseCaseFullyLoaded ? "#10b981" : "#94a3b8";
        const rowItem = document.createElement('div');
        rowItem.style.display = "flex";
        rowItem.style.alignItems = "center";
        rowItem.style.justifyContent = "space-between";
        rowItem.style.backgroundColor = "#1e293b";
        rowItem.style.padding = "10px 15px";
        rowItem.style.borderRadius = "6px";
        rowItem.style.marginBottom = "8px";
        rowItem.style.fontSize = "13px";
        rowItem.style.border = `1px solid ${isUseCaseFullyLoaded ? '#10b981' : '#334155'}`;

        const filesSpanHTML = requiredFiles.map(filePath => {
            const cleanFileName = filePath.split('/').pop();
            const isFileLoaded = loadedFileNamesSet.has(cleanFileName);
            const fileColor = isFileLoaded ? "#10b981" : "#94a3b8";
            const previewBtn = isFileLoaded ? `<button class="preview-icon-btn" data-file="${cleanFileName}" style="padding: 2px 6px; font-size: 10px; margin-left: 4px; background-color: #334155; color: #38bdf8; border: none; border-radius: 4px; cursor: pointer;">🔍</button>` : '';

            return `<span style="color: ${fileColor}; font-weight: 500;">${cleanFileName}${previewBtn}</span>`;
        }).join('<span style="color: #475569; margin: 0 6px;">,</span> ');

        rowItem.innerHTML = `
            <div style="display: flex; align-items: center; gap: 15px;">
                <strong style="color: ${titleColor}; min-width: 110px;">${useCaseKey}:</strong>
                <div style="display: flex; align-items: center; flex-wrap: wrap;">${filesSpanHTML}</div>
            </div>
            <div>
                ${isUseCaseFullyLoaded ? '<span style="font-size: 11px; background: rgba(16,185,129,0.2); color: #10b981; padding: 2px 8px; border-radius: 4px; font-weight: bold;">Ready</span>' : ''}
            </div>
        `;

        rowItem.querySelectorAll('.preview-icon-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const targetFile = btn.getAttribute('data-file');
                executePreviewRowExtraction(targetFile);
            });
        });

        container.appendChild(rowItem);
    });
}

function renderDuckTable(queryResponse, container) {
    const structuralRows = queryResponse.toArray();

    if (structuralRows.length === 0) {
        container.innerHTML = `<p style="color: #10b981;">Execution successful. Empty output set returned.</p>`;
        return;
    }

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
            container.innerHTML = `
                <div style="background-color: #451a03; border: 1px solid #f59e0b; padding: 15px; color: #fef3c7; border-radius: 6px; font-family: monospace;">
                    <strong>Workspace Input Warning:</strong><br>
                    <pre style="white-space: pre-wrap; margin-top: 8px; font-size:12px; font-family: monospace;">The SQL text input console area is empty.</pre>
                </div>`;
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
                    <pre style="white-space: pre-wrap; margin-top: 8px; font-size:12px; font-family: monospace;">${err.message}</pre>
                </div>`;
        }
    });
}

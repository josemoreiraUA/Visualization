import * as d3 from 'd3';

// 1. GLOBAL VARIABLES (Declared outside so they can be modified by the loader function)
let sourceData = { Training_actions: [], Employees_training_actions: [], Employees_training: [] };
let resultNodes = [];

// Persistent tracking of expand/collapse card drawers
const expansionState = {
    "Training_actions": false,
    "Employees_training_actions": false,
    "Employees_training": false
};

const themeColors = {
    actions: { default: "#38bdf8", active: "#0ea5e9" },
    empActions: { default: "#10b981", active: "#059669" },
    empTraining: { default: "#a855f7", active: "#8b5cf6" },
    result: { bg: "#1e1b4b", stroke: "#818cf8" }
};

// ==========================================================================
// 2. DYNAMIC METADATA EXTRACTOR ENGINE FROM ALL THREE PARQUET FILES
// ==========================================================================
async function loadLineageFromParquetFiles(duckDb) {
    if (!duckDb) return;
    try {
        console.log("📊 Pulling active runtime metadata from local Parquet storage blocks...");

        // Query all three raw structural source tables from browser memory sandbox
        const resActions = await duckDb.query("SELECT prov, name, hours, actionId FROM 'Training_actions.parquet'");
        const resEmpActions = await duckDb.query("SELECT prov, name, actionId FROM 'Employees_training_actions.parquet'");
        const resEmpTraining = await duckDb.query("SELECT prov, name, training_program, hours FROM 'Employees_training.parquet'");

        // Populate Training_actions list dynamically
        sourceData.Training_actions = resActions.toArray().map(row => ({
            id: row.prov,
            txt: `${row.prov}: ${row.name} (${row.hours}h)`,
            actionId: row.actionId
        }));

        // Populate Employees_training_actions list dynamically
        sourceData.Employees_training_actions = resEmpActions.toArray().map(row => {
            const cleanActionNum = row.actionId ? row.actionId.replace('ACT-0', '').replace('ACT-', '') : '';
            return {
                id: row.prov,
                txt: `${row.prov}: ${row.name} [${row.actionId}]`,
                linksTo: cleanActionNum ? `a${cleanActionNum}` : null
            };
        });

        // Populate Employees_training list dynamically
        sourceData.Employees_training = resEmpTraining.toArray().map(row => ({
            id: row.prov,
            txt: `${row.prov}: ${row.name} - ${row.training_program} (${row.hours}h)`
        }));

        // Execute your exact annotated aggregate query statement across the schemas
        const resultQuery = await duckDb.query(`
            SELECT EA.name as Employee, SUM(T.hours) as hours, 
                   '(' || STRING_AGG(EA.prov || ' · ' || T.prov || ' ⊗ ' || T.hours, '  +  ' ORDER BY EA.prov, T.prov) || ')' as prov
            FROM   'Training_actions.parquet' T, 'Employees_training_actions.parquet' EA
            WHERE  T.actionId = EA.actionId
            GROUP BY EA.name
            UNION ALL
            SELECT ET.name, ET.hours, ET.prov as prov
            FROM   'Employees_training.parquet' ET
        `);

        // Dynamically build the linkage line network paths based on the aggregated query output
        resultNodes = resultQuery.toArray().map((row, idx) => {
            const lineagePaths = [];
            
            if (row.prov && row.prov.startsWith('(')) {
                // Strip the surrounding parentheses bounding wrappers
                const cleanProv = row.prov.slice(1, -1);
                // Split each algebraic term separated by the double-space '+' string operator
                const tokens = cleanProv.split('  +  ');
                
                tokens.forEach(token => {
                    // Example token format: "t1 · a3 ⊗ 6"
                    const parts = token.split(' · ');
                    if (parts.length >= 2) {
                        // 🟢 FIXED: Extract strings using array brackets first before trimming!
                        const midId = parts[0].trim(); // Pulls 't1' safely
                        
                        // Extract left column action ID token ('a3') by removing the trailing hours metric
                        const remainder = parts[1];
                        const leftId = remainder.split(' ⊗ ')[0].trim(); // Pulls 'a3' safely
                        
                        lineagePaths.push({ midId: midId, leftId: leftId, midTable: "Employees_training_actions" });
                    }
                });
            } else if (row.prov) {
                // Fallback route for standard linear industrial sector rows
                lineagePaths.push({ midId: row.prov, leftId: null, midTable: "Employees_training" });
            }

            return {
                id: `R${idx + 1}`,
                name: row.Employee,
                h: row.hours,
                prov: row.prov,
                lineage: lineagePaths
            };
        });


        console.log("✅ Live database records successfully loaded into graph structures:", { sourceData, resultNodes });
    } catch (err) {
        console.error("❌ Failed to query and populate data from active Parquet context layers:", err);
    }
}


// 3. GRAPH PLOTTING CALCULATION ENGINE
export async function updateAggregatedGraphLayout() {
    console.log("=== [AGGREGATED LINEAGE] Initiating Layout Generator Pipeline ===");

    const container = d3.select("#chart-container-knn");
    container.selectAll("*").remove();

    // Setup visual tooltip layout anchor layer directly over the container scope
    let tooltip = d3.select("#provenance-tooltip");
    if (tooltip.empty()) {
        tooltip = d3.select("body").append("div")
            .attr("id", "provenance-tooltip")
            .style("position", "absolute")
            .style("visibility", "hidden")
            .style("background-color", "#0f172a")
            .style("border", "1px solid #334155")
            .style("color", "#f8fafc")
            .style("padding", "8px 12px")
            .style("border-radius", "6px")
            .style("font-family", "monospace")
            .style("font-size", "11px")
            .style("pointer-events", "none")
            .style("box-shadow", "0 4px 6px -1px rgba(0, 0, 0, 0.5)")
            .style("z-index", "1000");
    }

    // Dynamic heights based on number of records loaded to prevent card clipping
    const totalSourceRows = Math.max(sourceData.Training_actions.length, sourceData.Employees_training_actions.length + 2);
    const calculatedCanvasHeight = Math.max(550, totalSourceRows * 35);

    const margin = { top: 40, right: 50, bottom: 40, left: 50 };
    const width = 1100 - margin.left - margin.right;
    const height = calculatedCanvasHeight - margin.top - margin.bottom;

    const svg = container.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const cardWidth = 240;
    const positions = {
        "Training_actions": { x: 0, y: 80 },
        "Employees_training_actions": { x: 360, y: 10 },
        "Employees_training": { x: 360, y: Math.max(260, (sourceData.Employees_training_actions.length * 20) + 70) },
        "ResultsColumn": { x: 740 }
    };

    function getCardHeight(key, baseRows) {
        return expansionState[key] ? 45 + (baseRows.length * 20) : 45;
    }

    function getTupleY(tableKey, tupleId, baseRows) {
        const tableY = positions[tableKey].y;
        if (!expansionState[tableKey]) return tableY + 22; // Midpoint cluster collapse pivot anchor
        const idx = baseRows.findIndex(r => r.id === tupleId);
        return tableY + 52 + (idx * 20);
    }

    // 4. Paint Left Column & Stacked Center Column Schemas
    const tablesKeys = ["Training_actions", "Employees_training_actions", "Employees_training"];
    tablesKeys.forEach(key => {
        const rows = sourceData[key] || [];
        const pos = positions[key];
        const isExpanded = expansionState[key];
        const h = getCardHeight(key, rows);

        const tableG = svg.append("g")
            .attr("class", "node-table")
            .attr("transform", `translate(${pos.x}, ${pos.y})`)
            .style("cursor", "pointer")
            .on("click", () => {
                expansionState[key] = !expansionState[key];
                updateAggregatedGraphLayout(); // Safe redraw callback pass
            });

        tableG.append("rect")
            .attr("width", cardWidth)
            .attr("height", h)
            .attr("fill", "#1e293b")
            .attr("stroke", key === "Training_actions" ? themeColors.actions.default : (key === "Employees_training_actions" ? themeColors.empActions.default : themeColors.empTraining.default))
            .attr("stroke-width", 1.5)
            .attr("rx", 6);

        tableG.append("text")
            .attr("x", 12)
            .attr("y", 26)
            .attr("font-size", "12px")
            .attr("font-weight", "bold")
            .attr("fill", "#ffffff")
            .text(`${isExpanded ? "⊟" : "⊞"} ${key.replace(/_/g, " ")} (${rows.length})`);

        if (isExpanded) {
            rows.forEach((row, i) => {
                tableG.append("text")
                    .attr("x", 20)
                    .attr("y", 54 + (i * 20))
                    .attr("font-size", "11px")
                    .attr("fill", "#cbd5e1")
                    .text(`• ${row.txt}`);
            });
        }
    });

    // 5. Paint Right Column Aggregated Result Rows
    const resultCardHeight = 60;
    const resultElements = svg.append("g")
        .selectAll(".result-card")
        .data(resultNodes)
        .join("g")
        .attr("class", "result-card")
        .attr("transform", (d, i) => `translate(${positions.ResultsColumn.x}, ${i * (resultCardHeight + 15)})`);

    resultElements.append("rect")
        .attr("width", cardWidth + 20)
        .attr("height", resultCardHeight)
        .attr("fill", themeColors.result.bg)
        .attr("stroke", themeColors.result.stroke)
        .attr("stroke-width", 1.5)
        .attr("rx", 6)
        .style("cursor", "help");

    resultElements.append("text")
        .attr("x", 12)
        .attr("y", 24)
        .attr("font-size", "12px")
        .attr("font-weight", "bold")
        .attr("fill", "#ffffff")
        .text(d => d.name);

    resultElements.append("text")
        .attr("x", 12)
        .attr("y", 44)
        .attr("font-size", "11px")
        .attr("fill", "#38bdf8")
        .text(d => `Total Training: ${d.h} hours`);

    // 6. Trace Multi-Connection Link Line Paths (Wire Bundles)
    const activePathsRegistry = new Map();

    resultNodes.forEach((res, resIdx) => {
        const resY = (resIdx * (resultCardHeight + 15)) + (resultCardHeight / 2);
        const resX = positions.ResultsColumn.x;
        const connectedWires = [];

        res.lineage.forEach(link => {
            const midTableKey = link.midTable;
            const midTupleY = getTupleY(midTableKey, link.midId, sourceData[midTableKey]);
            const midTableX = positions[midTableKey].x + cardWidth;

            // Generate center trace pathway wire segment
            const pathCenter = svg.append("path")
                .attr("d", d3.linkHorizontal()({ source: [midTableX, midTupleY], target: [resX, resY] }))
                .attr("fill", "none")
                .attr("stroke", midTableKey === "Employees_training_actions" ? themeColors.empActions.default : themeColors.empTraining.default)
                .attr("stroke-width", 2)
                .attr("stroke-opacity", 0.3);
            
            connectedWires.push(pathCenter);

            // Generate optional left trace pathway wire segment from center table back to left actions
            if (link.leftId) {
                const leftTableX = positions["Training_actions"].x + cardWidth;
                const leftTupleY = getTupleY("Training_actions", link.leftId, sourceData["Training_actions"]);
                const midTableLeftX = positions[midTableKey].x;

                const pathLeft = svg.append("path")
                    .attr("d", d3.linkHorizontal()({ source: [leftTableX, leftTupleY], target: [midTableLeftX, midTupleY] }))
                    .attr("fill", "none")
                    .attr("stroke", themeColors.actions.default)
                    .attr("stroke-width", 2)
                    .attr("stroke-opacity", 0.3);
                
                connectedWires.push(pathLeft);
            }
        });

        activePathsRegistry.set(res.id, connectedWires);
    });

    // 7. Interactive Context Hover & Tooltip Events Binding
    resultElements
        .on("mouseover", function(event, d) {
            const pathsToHighlight = activePathsRegistry.get(d.id) || [];
            pathsToHighlight.forEach(p => p.attr("stroke-width", 4.5).attr("stroke-opacity", 1));

            d3.select(this).select("rect").attr("stroke", "#38bdf8").attr("stroke-width", 2);

            tooltip.style("visibility", "visible")
                .html(`<strong>Provenance Semiring Annotation:</strong><br><span style='color:#ec4899;'>${d.prov}</span>`);
        })
        .on("mousemove", function(event) {
            tooltip.style("top", (event.pageY - 10) + "px")
                   .style("left", (event.pageX + 15) + "px");
        })
        .on("mouseleave", function(event, d) {
            const pathsToDehighlight = activePathsRegistry.get(d.id) || [];
            pathsToDehighlight.forEach(p => p.attr("stroke-width", 2).attr("stroke-opacity", 0.3));

            d3.select(this).select("rect").attr("stroke", themeColors.result.stroke).attr("stroke-width", 1.5);
            tooltip.style("visibility", "hidden");
        });

    console.log("=== [AGGREGATED LINEAGE] Graph Drawing Phase Complete ===");
}

// 8. FIXED: Sequential async loader unblocks data fetching before plotting the graphics canvas
// Garante que este bloco está no final absoluto do teu k-nn.js
window.addEventListener('knn-tab-visible', async () => {
    console.log("[EVENT CAPTURED] K-nn panel visible trigger caught! Syncing database metadata...");
    
    if (window.duckDbConnection) {
        await loadLineageFromParquetFiles(window.duckDbConnection);
    } else {
        console.warn(" window.duckDbConnection cannot be reached from window scope framework context.");
    }
    
    await updateAggregatedGraphLayout();
});

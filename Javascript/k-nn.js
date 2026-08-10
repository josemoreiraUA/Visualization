import * as d3 from 'd3';

let sourceData = { Training_actions: [], Employees_training_actions: [], Employees_training: [] };
let resultNodes = [];

// Force all tables to stay permanently expanded by default
const expansionState = {
    "Training_actions": true,
    "Employees_training_actions": true,
    "Employees_training": true
};

// Persistent tracking registry for user click filters
let activeFilter = {
    tableKey: null,
    tupleId: null
};

const themeColors = {
    actions: { default: "#38bdf8", active: "#0ea5e9" },
    empActions: { default: "#10b981", active: "#059669" },
    empTraining: { default: "#a855f7", active: "#8b5cf6" },
    result: { bg: "#1e1b4b", stroke: "#818cf8" }
};



async function loadLineageFromParquetFiles(duckDb) {
    if (!duckDb) return;
    try {
        console.log("Pulling active runtime metadata from local Parquet storage blocks...");

        const resActions = await duckDb.query("SELECT prov, name, hours, actionId FROM 'Training_actions.parquet'");
        const resEmpActions = await duckDb.query("SELECT prov, name, actionId FROM 'Employees_training_actions.parquet'");
        const resEmpTraining = await duckDb.query("SELECT prov, name, training_program, hours FROM 'Employees_training.parquet'");

        sourceData.Training_actions = resActions.toArray().map(row => ({
            id: row.prov,
            txt: `${row.prov}: ${row.name} (${row.hours}h)`,
            actionId: row.actionId
        }));

        sourceData.Employees_training_actions = resEmpActions.toArray().map(row => {
            const cleanActionNum = row.actionId ? row.actionId.replace('ACT-0', '').replace('ACT-', '') : '';
            return {
                id: row.prov,
                txt: `${row.prov}: ${row.name} [${row.actionId}]`,
                linksTo: cleanActionNum ? `a${cleanActionNum}` : null
            };
        });

        sourceData.Employees_training = resEmpTraining.toArray().map(row => ({
            id: row.prov,
            txt: `${row.prov}: ${row.name} - ${row.training_program} (${row.hours}h)`
        }));

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

        resultNodes = resultQuery.toArray().map((row, idx) => {
            const lineagePaths = [];
            
            if (row.prov && row.prov.startsWith('(')) {
                const cleanProv = row.prov.slice(1, -1);
                const tokens = cleanProv.split('  +  ');
                
                tokens.forEach(token => {
                    const parts = token.split(' · ');
                    if (parts.length >= 2) {
                        const midId = parts[0].trim();
                        const remainder = parts[1];
                        const leftId = remainder.split(' ⊗ ')[0].trim();
                        
                        lineagePaths.push({ midId: midId, leftId: leftId, midTable: "Employees_training_actions" });
                    }
                });
            } else if (row.prov) {
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

        console.log("Live database records successfully loaded into graph structures:", { sourceData, resultNodes });
    } catch (err) {
        console.error("Failed to query and populate data from active Parquet context layers:", err);
    }
}

export async function updateAggregatedGraphLayout() {
    console.log("=== [AGGREGATED LINEAGE] Initiating Layout Generator Pipeline ===");

    const container = d3.select("#chart-container-knn");
    container.selectAll("*").remove();

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
    
    // Calculate the real physical height of the upper center table dynamically
    const empActionsRows = sourceData.Employees_training_actions || [];
    const empActionsHeight = expansionState["Employees_training_actions"] 
        ? 45 + (empActionsRows.length * 20) 
        : 45;

    // Calculate the dynamic starting coordinate for the lower center table
    // Adds a clean 30px gap spacer directly below the bottom edge of the upper table
    const positions = {
        "Training_actions": { x: 0, y: 80 },
        "Employees_training_actions": { x: 360, y: 10 },
        
        // The y position is calculated dynamically relative to the upper table's height
        "Employees_training": { x: 360, y: 10 + empActionsHeight + 30 },
        
        "ResultsColumn": { x: 740 }
    };


    function getCardHeight(key, baseRows) {
        return expansionState[key] ? 45 + (baseRows.length * 20) : 45;
    }

    function getTupleY(tableKey, tupleId, baseRows) {
        const tableY = positions[tableKey].y;
        if (!expansionState[tableKey]) return tableY + 22;
        const idx = baseRows.findIndex(r => r.id === tupleId);
        return tableY + 52 + (idx * 20);
    }

    // Render Source Column Table Containers
    // 4. Paint Left Column & Stacked Center Column Schemas
    const tablesKeys = ["Training_actions", "Employees_training_actions", "Employees_training"];
    tablesKeys.forEach(key => {
        const rows = sourceData[key] || [];
        const pos = positions[key];
        const isExpanded = expansionState[key];
        const h = getCardHeight(key, rows);

        const tableG = svg.append("g")
            .attr("class", "node-table")
            .attr("transform", `translate(${pos.x}, ${pos.y})`);

        // Main table card background panel
        tableG.append("rect")
            .attr("width", cardWidth)
            .attr("height", h)
            .attr("fill", "#1e293b")
            .attr("stroke", key === "Training_actions" ? themeColors.actions.default : (key === "Employees_training_actions" ? themeColors.empActions.default : themeColors.empTraining.default))
            .attr("stroke-width", 1.5)
            .attr("rx", 6);

        // Create a dedicated clickable boundary box strictly for the title header area
        const headerInteractiveZone = tableG.append("rect")
            .attr("width", cardWidth)
            .attr("height", 38)
            .attr("fill", "transparent")
            .style("cursor", "pointer")
            .on("click", (event) => {
                event.stopPropagation();
                // Minimize or maximize the table drawer when clicking the header box zone
                expansionState[key] = !expansionState[key];
                updateAggregatedGraphLayout(); // Redraw the graphics canvas dynamically
            });

        // Table label text containing the interactive toggle icons (⊟ and ⊞)
        tableG.append("text")
            .attr("x", 12)
            .attr("y", 24)
            .attr("font-size", "12px")
            .attr("font-weight", "bold")
            .attr("fill", "#ffffff")
            .style("pointer-events", "none") // Let clicks pass right through to the interactive zone box below
            .text(`${isExpanded ? "⊟" : "⊞"} ${key.replace(/_/g, " ")} (${rows.length})`);

        // Render data rows only if the card container is currently expanded
        if (isExpanded) {
            rows.forEach((row, i) => {
                const isSelectedTuple = (activeFilter.tableKey === key && activeFilter.tupleId === row.id);
                
                const tupleGroup = tableG.append("g")
                    .attr("class", "tuple-row-item")
                    .style("cursor", "pointer")
                    .on("click", (event) => {
                        event.stopPropagation();
                        // Isolate lineage paths upon selecting rows without collapsing the table card
                        if (activeFilter.tableKey === key && activeFilter.tupleId === row.id) {
                            activeFilter.tableKey = null;
                            activeFilter.tupleId = null;
                        } else {
                            activeFilter.tableKey = key;
                            activeFilter.tupleId = row.id;
                        }
                        updateAggregatedGraphLayout(); // Repaint line maps with isolated focus masks
                    });

                // Highlight cell background block if row is active
                tupleGroup.append("rect")
                    .attr("x", 8)
                    .attr("y", 40 + (i * 20))
                    .attr("width", cardWidth - 16)
                    .attr("height", 18)
                    .attr("fill", isSelectedTuple ? "rgba(56, 189, 248, 0.2)" : "transparent")
                    .attr("rx", 4);

                tupleGroup.append("text")
                    .attr("x", 20)
                    .attr("y", 54 + (i * 20))
                    .attr("font-size", "11px")
                    .attr("fill", isSelectedTuple ? "#38bdf8" : "#cbd5e1")
                    .attr("font-weight", isSelectedTuple ? "bold" : "normal")
                    .text(`• ${row.txt}`);
            });
        }
    });

    // Render Right Column Aggregated Result Rows
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

    // Trace Multi-Connection Link Line Paths (Wire Bundles)
    const activePathsRegistry = new Map();

    resultNodes.forEach((res, resIdx) => {
        const resY = (resIdx * (resultCardHeight + 15)) + (resultCardHeight / 2);
        const resX = positions.ResultsColumn.x;
        const connectedWires = [];

        res.lineage.forEach(link => {
            const midTableKey = link.midTable;
            const midTupleY = getTupleY(midTableKey, link.midId, sourceData[midTableKey]);
            const midTableX = positions[midTableKey].x + cardWidth;

            // Determine if this exact connection segment matches active filters
            let isWireActive = true;
            if (activeFilter.tableKey) {
                if (activeFilter.tableKey === "Training_actions" && link.leftId !== activeFilter.tupleId) {
                    isWireActive = false;
                } else if (activeFilter.tableKey === "Employees_training_actions" && (midTableKey !== "Employees_training_actions" || link.midId !== activeFilter.tupleId)) {
                    isWireActive = false;
                } else if (activeFilter.tableKey === "Employees_training" && (midTableKey !== "Employees_training" || link.midId !== activeFilter.tupleId)) {
                    isWireActive = false;
                }
            }

            // Generate center trace pathway wire segment
            const pathCenter = svg.append("path")
                .attr("d", d3.linkHorizontal()({ source: [midTableX, midTupleY], target: [resX, resY] }))
                .attr("fill", "none")
                .attr("stroke", midTableKey === "Employees_training_actions" ? themeColors.empActions.default : themeColors.empTraining.default)
                .attr("stroke-width", isWireActive && activeFilter.tableKey ? 3.5 : 2)
                .attr("stroke-opacity", isWireActive ? (activeFilter.tableKey ? 1.0 : 0.3) : 0.05);
            
            connectedWires.push({ path: pathCenter, active: isWireActive });

            // Generate optional left trace pathway wire segment from center table back to left actions
            if (link.leftId) {
                const leftTableX = positions["Training_actions"].x + cardWidth;
                const leftTupleY = getTupleY("Training_actions", link.leftId, sourceData["Training_actions"]);
                const midTableLeftX = positions[midTableKey].x;

                let isLeftWireActive = isWireActive;
                if (activeFilter.tableKey === "Training_actions" && link.leftId !== activeFilter.tupleId) {
                    isLeftWireActive = false;
                }

                const pathLeft = svg.append("path")
                    .attr("d", d3.linkHorizontal()({ source: [leftTableX, leftTupleY], target: [midTableLeftX, midTupleY] }))
                    .attr("fill", "none")
                    .attr("stroke", themeColors.actions.default)
                    .attr("stroke-width", isLeftWireActive && activeFilter.tableKey ? 3.5 : 2)
                    .attr("stroke-opacity", isLeftWireActive ? (activeFilter.tableKey ? 1.0 : 0.3) : 0.05);
                
                connectedWires.push({ path: pathLeft, active: isLeftWireActive });
            }
        });

        activePathsRegistry.set(res.id, connectedWires);
    });

    // Evaluate opacity constraints on final output cards if filtering is active
    resultElements.style("opacity", d => {
        if (!activeFilter.tableKey) return 1.0;
        const wires = activePathsRegistry.get(d.id) || [];
        const hasActiveConnection = wires.some(w => w.active);
        return hasActiveConnection ? 1.0 : 0.15;
    });

    // 7. Interactive Context Hover & Tooltip Events Binding
    resultElements
        .on("mouseover", function(event, d) {
            // Only fire generalized hover highlights if no active click locks exist
            if (!activeFilter.tableKey) {
                const wires = activePathsRegistry.get(d.id) || [];
                wires.forEach(w => w.path.attr("stroke-width", 4.5).attr("stroke-opacity", 1));
            }
            d3.select(this).select("rect").attr("stroke", "#38bdf8").attr("stroke-width", 2);
            tooltip.style("visibility", "visible")
                .html(`<strong>Provenance Semiring Annotation:</strong><br><span style='color:#ec4899;'>${d.prov}</span>`);
        })
        .on("mousemove", function(event) {
            tooltip.style("top", (event.pageY - 10) + "px")
                   .style("left", (event.pageX + 15) + "px");
        })
        .on("mouseleave", function(event, d) {
            if (!activeFilter.tableKey) {
                const wires = activePathsRegistry.get(d.id) || [];
                wires.forEach(w => w.path.attr("stroke-width", 2).attr("stroke-opacity", 0.3));
            }
            d3.select(this).select("rect").attr("stroke", themeColors.result.stroke).attr("stroke-width", 1.5);
            tooltip.style("visibility", "hidden");
        });

    console.log("=== [AGGREGATED LINEAGE] Graph Drawing Phase Complete ===");
}

window.addEventListener('knn-tab-visible', async () => {
    console.log("K-nn panel visible trigger caught! Syncing database metadata...");
    
    if (window.duckDbConnection) {
        await loadLineageFromParquetFiles(window.duckDbConnection);
    } else {
        console.warn("window.duckDbConnection cannot be reached from window scope context.");
    }
    
    await updateAggregatedGraphLayout();
});

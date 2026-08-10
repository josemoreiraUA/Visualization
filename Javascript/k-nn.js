import * as d3 from 'd3';

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

export function updateAggregatedGraphLayout() {
    console.log("=== [AGGREGATED LINEAGE] Initiating Layout Generator Pipeline ===");

    //const container = d3.select("#chart-container");
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

    const margin = { top: 40, right: 50, bottom: 40, left: 50 };
    const width = 1100 - margin.left - margin.right;
    const height = 550 - margin.top - margin.bottom;

    const svg = container.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // 1. Core Source Data Records Definitions Schema
    const sourceData = {
        Training_actions: [
            { id: "a1", txt: "a1: CRM (8h)" },
            { id: "a2", txt: "a2: Advanced Excel (12h)" },
            { id: "a3", txt: "a3: Digital Marketing (6h)" }
        ],
        Employees_training_actions: [
            { id: "t1", txt: "t1: Carla Gomez [ACT-03]", linksTo: "a3" },
            { id: "t2", txt: "t2: Carla Gomez [ACT-01]", linksTo: "a1" },
            { id: "t3", txt: "t3: David Miller [ACT-03]", linksTo: "a3" },
            { id: "t4", txt: "t4: David Miller [ACT-01]", linksTo: "a1" },
            { id: "t5", txt: "t5: David Miller [ACT-02]", linksTo: "a2" }
        ],
        Employees_training: [
            { id: "p1", txt: "p1: Alice Smith - Safety (16h)" }
        ]
    };

    // 2. Aggregated Result Nodes Mapping multi-tuple source relationships
    const resultNodes = [
        { 
            id: "R1", 
            name: "Carla Gomez", 
            h: 14, 
            prov: "(t1 · a3 ⊗ 6 + t2 · a1 ⊗ 8)",
            lineage: [
                { midId: "t1", leftId: "a3", midTable: "Employees_training_actions" },
                { midId: "t2", leftId: "a1", midTable: "Employees_training_actions" }
            ]
        },
        { 
            id: "R2", 
            name: "David Miller", 
            h: 20, 
            prov: "(t3 · a3 ⊗ 6 + t4 · a1 ⊗ 8 + t5 · a2 ⊗ 6)",
            lineage: [
                { midId: "t3", leftId: "a3", midTable: "Employees_training_actions" },
                { midId: "t4", leftId: "a1", midTable: "Employees_training_actions" },
                { midId: "t5", leftId: "a2", midTable: "Employees_training_actions" }
            ]
        },
        { 
            id: "R3", 
            name: "Alice Smith", 
            h: 16, 
            prov: "p1",
            lineage: [
                { midId: "p1", leftId: null, midTable: "Employees_training" }
            ]
        }
    ];

    // 3. Grid Axis Positioning Specifications (Layout Separation Requirement)
    const cardWidth = 240;
    const positions = {
        "Training_actions": { x: 0, y: 150 },
        "Employees_training_actions": { x: 360, y: 30 },
        "Employees_training": { x: 360, y: 280 },
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
        const rows = sourceData[key];
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
            .text(`${isExpanded ? "⊟" : "⊞"} ${key.replace(/_/g, " ")}`);

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
            // High-intensity highlight for lines mapped to active card focus limits
            const pathsToHighlight = activePathsRegistry.get(d.id) || [];
            pathsToHighlight.forEach(p => p.attr("stroke-width", 4.5).attr("stroke-opacity", 1));

            d3.select(this).select("rect").attr("stroke", "#38bdf8").attr("stroke-width", 2);

            // Pop and fill the custom provenance metadata tooltip string content
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

// Global browser window listener integration hook to support Vite modular tab switches
window.addEventListener('knn-tab-visible', () => {
    console.log("K-nn module intercepted unique visibility signal! Running layout arithmetic...");
    updateAggregatedGraphLayout();
});

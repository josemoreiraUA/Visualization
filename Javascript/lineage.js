import * as d3 from 'd3';

// Persistent expansion state for source nodes
const expansionState = {
    "Annual_reviews": true,
    "Business_reviews": true,
    "Manager_reviews": true
};

// Persistent filter state for the outcomes column
let outcomeFilter = "ALL"; // Options: "ALL", "PROMOTED", "REJECTED"

const themeColors = {
    industrial: { default: "#a855f7", active: "#8b5cf6" }, // Purple for Annual_reviews
    business: { default: "#10b981", active: "#059669" },   // Green for Business_reviews
    manager: { default: "#38bdf8", active: "#0ea5e9" },    // Blue for Manager_reviews
    result: { bg: "#1e1b4b", stroke: "#818cf8" }
};

export function updateTrainingGraphLayout() {
    console.log("=== [HR LINEAGE] Rendering Grid Graph Layout ===");

    const container = d3.select("#chart-container");
    container.selectAll("*").remove();

    // Create the top filter control toolbar container dynamically above the canvas
    const toolbar = container.append("div")
        .attr("class", "lineage-toolbar")
        .style("margin-bottom", "15px")
        .style("display", "flex")
        .style("gap", "10px")
        .style("align-items", "center")
        .style("font-family", "system-ui, sans-serif")
        .style("font-size", "13px");

    toolbar.append("span")
        .style("color", "#cbd5e1")
        .style("font-weight", "600")
        .text("Filter Promotions:");

    const filterOptions = [
        { label: "All Candidates", value: "ALL" },
        { label: "Promoted Only", value: "PROMOTED" },
        { label: "Rejected Only", value: "REJECTED" }
    ];

    filterOptions.forEach(opt => {
        const btn = toolbar.append("button")
            .style("background", outcomeFilter === opt.value ? "#38bdf8" : "#1e293b")
            .style("color", outcomeFilter === opt.value ? "#0f172a" : "#cbd5e1")
            .style("border", "1px solid #334155")
            .style("padding", "6px 12px")
            .style("border-radius", "4px")
            .style("cursor", "pointer")
            .style("font-weight", "600")
            .style("font-size", "12px")
            .text(opt.label)
            .on("click", () => {
                outcomeFilter = opt.value;
                updateTrainingGraphLayout(); // Trigger layout repaint instantly
            });
    });

    // Canvas Dimensions
    const margin = { top: 20, right: 50, bottom: 40, left: 50 };
    const width = 1100 - margin.left - margin.right;
    const height = 650 - margin.top - margin.bottom;

    const svg = container.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // 1. Definition of mock dataset records per table
    const sourceData = {
        Annual_reviews: [
            { id: "p1", txt: "p1: emp-101 (2025) Official: 72, Mgr: 61" },
            { id: "p2", txt: "p2: emp-102 (2025) Official: 85, Mgr: 78" },
            { id: "p3", txt: "p3: emp-103 (2025) Official: 68, Mgr: 59" },
            { id: "p4", txt: "p4: emp-104 (2025) Official: 90, Mgr: 88" },
            { id: "p5", txt: "p5: emp-105 (2025) Official: 70, Mgr: 60" },
            { id: "p6", txt: "p6: emp-106 (2025) Official: 64, Mgr: 55" },
            { id: "p7", txt: "p7: emp-107 (2025) Official: 88, Mgr: 82" },
            { id: "p8", txt: "p8: emp-108 (2025) Official: 71, Mgr: 62" },
            { id: "p9", txt: "p9: emp-109 (2025) Official: 65, Mgr: 58" },
            { id: "p10", txt: "p10: emp-110 (2025) Official: 73, Mgr: 64" }
        ],
        Business_reviews: [
            { id: "b1", txt: "b1: emp-201 (2025) Score: 84" },
            { id: "b2", txt: "b2: emp-202 (2025) Score: 69" },
            { id: "b3", txt: "b3: emp-203 (2025) Score: 78" },
            { id: "b4", txt: "b4: emp-204 (2025) Score: 88" },
            { id: "b5", txt: "b5: emp-205 (2025) Score: 71" },
            { id: "b6", txt: "b6: emp-206 (2025) Score: 92" },
            { id: "b7", txt: "b7: emp-207 (2025) Score: 65" },
            { id: "b8", txt: "b8: emp-208 (2025) Score: 80" },
            { id: "b9", txt: "b9: emp-209 (2025) Score: 74" },
            { id: "b10", txt: "b10: emp-210 (2025) Score: 85" }
        ],
        Manager_reviews: [
            { id: "m1", txt: "m1: emp-201 (2025) Score: 80" },
            { id: "m2", txt: "m2: emp-202 (2025) Score: 63" },
            { id: "m3", txt: "m3: emp-203 (2025) Score: 75" },
            { id: "m4", txt: "m4: emp-204 (2025) Score: 85" },
            { id: "m5", txt: "m5: emp-205 (2025) Score: 68" },
            { id: "m6", txt: "m6: emp-206 (2025) Score: 90" },
            { id: "m7", txt: "m7: emp-207 (2025) Score: 58" },
            { id: "m8", txt: "m8: emp-208 (2025) Score: 77" },
            { id: "m9", txt: "m9: emp-209 (2025) Score: 70" },
            { id: "m10", txt: "m10: emp-210 (2025) Score: 82" }
        ]
    };

    const allResultNodes = [
        { id: "R1", name: "Alice Smith (emp-101)", decision: "REJECTED", table: "Annual_reviews", srcId: "p1", refId: null, prov: "p1" },
        { id: "R2", name: "Michael Tatum (emp-102)", decision: "PROMOTED", table: "Annual_reviews", srcId: "p2", refId: null, prov: "p2" },
        { id: "R3", name: "John Ewing (emp-103)", decision: "REJECTED", table: "Annual_reviews", srcId: "p3", refId: null, prov: "p3" },
        { id: "R4", name: "Nancy Davis (emp-104)", decision: "PROMOTED", table: "Annual_reviews", srcId: "p4", refId: null, prov: "p4" },
        { id: "R5", name: "Robert Jones (emp-105)", decision: "REJECTED", table: "Annual_reviews", srcId: "p5", refId: null, prov: "p5" },
        { id: "R6", name: "Linda Vance (emp-106)", decision: "REJECTED", table: "Annual_reviews", srcId: "p6", refId: null, prov: "p6" },
        { id: "R7", name: "William Vance (emp-107)", decision: "PROMOTED", table: "Annual_reviews", srcId: "p7", refId: null, prov: "p7" },
        { id: "R8", name: "David Miller (emp-108)", decision: "REJECTED", table: "Annual_reviews", srcId: "p8", refId: null, prov: "p8" },
        { id: "R9", name: "Susan Connor (emp-109)", decision: "REJECTED", table: "Annual_reviews", srcId: "p9", refId: null, prov: "p9" },
        { id: "R10", name: "James Kelly (emp-110)", decision: "PROMOTED", table: "Annual_reviews", srcId: "p10", refId: null, prov: "p10" },
        { id: "R11", name: "Carla Gomez (emp-201)", decision: "PROMOTED", table: "Business_reviews", srcId: "b1", refId: "m1", prov: "b1 · m1" },
        { id: "R12", name: "Marcus Aurel (emp-202)", decision: "REJECTED", table: "Business_reviews", srcId: "b2", refId: "m2", prov: "b2 · m2" },
        { id: "R13", name: "Elena Rostova (emp-203)", decision: "PROMOTED", table: "Business_reviews", srcId: "b3", refId: "m3", prov: "b3 · m3" },
        { id: "R14", name: "Sanjay Dutt (emp-204)", decision: "PROMOTED", table: "Business_reviews", srcId: "b4", refId: "m4", prov: "b4 · m4" },
        { id: "R15", name: "Louis Litt (emp-205)", decision: "REJECTED", table: "Business_reviews", srcId: "b5", refId: "m5", prov: "b5 · m5" }
    ];

    // Filter results dynamically based on active selection toolbar state
    const resultNodes = allResultNodes.filter(d => {
        if (outcomeFilter === "ALL") return true;
        return d.decision === outcomeFilter;
    });

    const cardWidth = 240;
    
    // Updated grid coordinates positioning Business and Manager side-by-side below Annual_reviews
    const positions = {
        "Annual_reviews": { x: 180, y: 10 },        // Centered on top row
        "Business_reviews": { x: 0, y: 300 },       // Bottom-left column
        "Manager_reviews": { x: 360, y: 300 },      // Bottom-right column
        "ResultsColumn": { x: 740 }                  // Outcomes column stays on the far right
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

    // 4. Paint Source Column Tables (Left & Center Columns)
    const tablesKeys = ["Annual_reviews", "Business_reviews", "Manager_reviews"];
    
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
                updateTrainingGraphLayout();
            });

        tableG.append("rect")
            .attr("width", cardWidth)
            .attr("height", h)
            .attr("fill", "#1e293b")
            .attr("stroke", key === "Annual_reviews" ? themeColors.industrial.default : (key === "Business_reviews" ? themeColors.business.default : themeColors.manager.default))
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

    // 5. Paint Target Promotion Outcome Cards (Right Column)
    const resultCardHeight = 65;
    
    const resultElements = svg.append("g")
        .selectAll(".result-card")
        .data(resultNodes)
        .join("g")
        .attr("class", "result-card")
        .attr("transform", (d, i) => `translate(${positions.ResultsColumn.x}, ${i * (resultCardHeight + 12)})`);

    resultElements.append("rect")
        .attr("width", cardWidth + 20)
        .attr("height", resultCardHeight)
        .attr("fill", themeColors.result.bg)
        .attr("stroke", d => d.decision === "PROMOTED" ? "#10b981" : "#ef4444")
        .attr("stroke-width", 1.5)
        .attr("rx", 6);

    resultElements.append("text")
        .attr("x", 12)
        .attr("y", 20)
        .attr("font-size", "12px")
        .attr("font-weight", "bold")
        .attr("fill", "#ffffff")
        .text(d => d.name);

    resultElements.append("text")
        .attr("x", 12)
        .attr("y", 38)
        .attr("font-size", "11px")
        .attr("font-weight", "600")
        .attr("fill", d => d.decision === "PROMOTED" ? "#10b981" : "#ef4444")
        .text(d => `Decision: ${d.decision}`);

    resultElements.append("text")
        .attr("x", 12)
        .attr("y", 54)
        .attr("font-size", "10px")
        .attr("font-family", "monospace")
        .attr("fill", "#a855f7")
        .text(d => `prov: ${d.prov}`);

    // 6. Connect Lineage Pathways (Wires)
    resultNodes.forEach((res, resIdx) => {
        const resY = (resIdx * (resultCardHeight + 12)) + (resultCardHeight / 2);
        const resX = positions.ResultsColumn.x;

        const mainTableKey = res.table;
        const mainTupleY = getTupleY(mainTableKey, res.srcId, sourceData[mainTableKey]);
        const mainTableX = positions[mainTableKey].x + cardWidth;

        // Trace line connection from right column to center/left source table
        const pathMain = svg.append("path")
            .attr("d", d3.linkHorizontal()({ source: [mainTableX, mainTupleY], target: [resX, resY] }))
            .attr("fill", "none")
            .attr("stroke", mainTableKey === "Annual_reviews" ? themeColors.industrial.default : themeColors.business.default)
            .attr("stroke-width", 2)
            .attr("stroke-opacity", 0.4);

        // Trace secondary line if the record involves an explicit join (Business & Manager reviews)
        if (res.refId) {
            // Anchor to Business_reviews table right edge
            const businessTableX = positions["Business_reviews"].x + cardWidth;
            const businessTupleY = getTupleY("Business_reviews", res.srcId, sourceData["Business_reviews"]);

            // Anchor to Manager_reviews table left edge
            const managerTableLeftX = positions["Manager_reviews"].x;
            const managerTupleY = getTupleY("Manager_reviews", res.refId, sourceData["Manager_reviews"]);

            const pathJoin = svg.append("path")
                .attr("d", d3.linkHorizontal()({ source: [businessTableX, businessTupleY], target: [managerTableLeftX, managerTupleY] }))
                .attr("fill", "none")
                .attr("stroke", themeColors.manager.default)
                .attr("stroke-width", 2)
                .attr("stroke-opacity", 0.4);

            setupHoverEffect(res.id, [pathMain, pathJoin], res.srcId, res.refId);
        } else {
            setupHoverEffect(res.id, [pathMain], res.srcId, null);
        }
    });

    function setupHoverEffect(cardId, paths, srcId, refId) {
        const elementToTrigger = resultElements.filter(d => d.id === cardId);
        
        elementToTrigger.on("mouseenter", () => {
            paths.forEach(p => p.attr("stroke-width", 4).attr("stroke-opacity", 1));
        }).on("mouseleave", () => {
            paths.forEach(p => p.attr("stroke-width", 2).attr("stroke-opacity", 0.4));
        });
    }

    print("=== [HR LINEAGE] Graph Render Complete ===");
}

window.addEventListener('lineage-tab-visible', () => {
    updateTrainingGraphLayout();
});

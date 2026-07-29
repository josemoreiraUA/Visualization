const margin = {top: 40, right: 220, bottom: 40, left: 220};
const width = 1100 - margin.left - margin.right;
const height = 450 - margin.top - margin.bottom;

const svg = d3.select("#chart-container")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

// 1. Dynamic Toggle State tracker
const expansionState = {
    "UsersTable": false,
    "OrdersTable": false
};

// 2. Define Table Colors Map (Neutral vs Highlighted states)
const tableColors = {
    "UsersTable": { default: "#3b82f6", active: "#60a5fa" },   // Blue / Light Blue
    "OrdersTable": { default: "#10b981", active: "#34d399" }  // Green / Emerald Green
};

// 3. Stable Source Schema Configuration
const sourceTables = [
    {
        id: "UsersTable",
        name: "Users Table",
        tuples: [
            { id: "S1", name: "Tuple #101 (Alice)", targetId: "R1", value: 8 },
            { id: "S2", name: "Tuple #102 (Bob)", targetId: "R2", value: 6 }
        ]
    },
    {
        id: "OrdersTable",
        name: "Orders Table",
        tuples: [
            { id: "S3", name: "Tuple #901 ($50)", targetId: "R1", value: 4 },
            { id: "S4", name: "Tuple #902 ($120)", targetId: "R1", value: 4 },
            { id: "S5", name: "Tuple #903 (Audit)", targetId: "R3", value: 12 }
        ]
    }
];

const resultNodes = [
    { id: "R1", title: "User Revenue View", tuples: ["Alice - Total: $170", "Status: Active Verified", "Partition: Node-0A"], type: "result" },
    { id: "R2", title: "Zero Balance View", tuples: ["Bob - Total: $0", "Status: Idle Hibernated"], type: "result" },
    { id: "R3", title: "System Audit Logs", tuples: ["Global Aggregation Sum", "Validation Checksum: OK"], type: "result" }
];

let linkElement, nodeElement;
let selectedNode = null;

updateGraphLayout();

function updateGraphLayout() {
    svg.selectAll("*").remove();

    // Keep nodes completely fixed to prevent items jumping around
    const nodes = [
        { id: "UsersTable", name: "Users Table", type: "source" },
        { id: "OrdersTable", name: "Orders Table", type: "source" }
    ];
    resultNodes.forEach(r => nodes.push(JSON.parse(JSON.stringify(r))));

    // Consolidate connection data paths
    const links = [];
    sourceTables.forEach(table => {
        table.tuples.forEach(tuple => {
            links.push({
                source: table.id,
                target: tuple.targetId,
                value: tuple.value,
                tupleId: tuple.id,
                tableId: table.id 
            });
        });
    });

    const sankey = d3.sankey()
        .nodeId(d => d.id)
        .nodeWidth(220)
        .nodePadding(80) 
        .extent([[0, 0], [width, height]]);

    const computedGraph = sankey({ nodes: JSON.parse(JSON.stringify(nodes)), links: JSON.parse(JSON.stringify(links)) });

    // 4. FIX: Use a Custom SVG Path Generator function to cleanly align endpoints safely
    function drawPerfectLine(d) {
        const isExpanded = expansionState[d.source.id];
        let startX = d.source.x1;
        let startY = d.source.y0 + 20; // Default collapsed center point

        if (isExpanded) {
            const table = sourceTables.find(t => t.id === d.source.id);
            const tupleIndex = table.tuples.findIndex(t => t.id === d.tupleId);
            if (tupleIndex !== -1) {
                startY = d.source.y0 + 46 + (tupleIndex * 18); // Dynamic source row alignment
            }
        }

        let endX = d.target.x0;
        let endY = d.target.y0 + 42; // Default first result tuple row alignment

        // Route row offsets precisely based on the targeting destination IDs
        if (d.target.id === "R1") {
            endY = d.target.y0 + 42; // Row 1: Alice text line
        } else if (d.target.id === "R2") {
            endY = d.target.y0 + 42; // Row 1: Bob text line
        } else if (d.target.id === "R3") {
            endY = d.target.y0 + 42; // Row 1: Global metrics text line
        }

        // Draw a clean, custom Cubic Bézier curve profile
        const controlX = (startX + endX) / 2;
        return `M ${startX} ${startY} C ${controlX} ${startY}, ${controlX} ${endY}, ${endX} ${endY}`;
    }

    // Render connection paths with table-specific color assignment
    linkElement = svg.append("g")
        .selectAll(".link")
        .data(computedGraph.links)
        .join("path")
        .attr("class", "link")
        .attr("d", drawPerfectLine) // Swapped to our custom drawing script
        .attr("stroke", d => tableColors[d.tableId].default)
        .attr("stroke-width", d => {
            const isSourceExpanded = expansionState[d.source.id];
            return isSourceExpanded ? 2 : Math.min(Math.max(4, d.value * 1.2), 14);
        })
        .attr("fill", "none");

    // Render nodes containers
    nodeElement = svg.append("g")
        .selectAll(".node")
        .data(computedGraph.nodes)
        .join("g")
        .attr("class", "node")
        .attr("transform", d => `translate(${d.x0},${d.y0})`)
        .on("click", handleNodeClick);

    // Draw main background shapes
    nodeElement.append("rect")
        .attr("class", "main-box")
        .attr("height", d => {
            if (d.type === "result") return 75;
            if (expansionState[d.id]) {
                const table = sourceTables.find(t => t.id === d.id);
                return 40 + (table.tuples.length * 18) + 10;
            }
            return 40; 
        })
        .attr("width", sankey.nodeWidth())
        .attr("fill", d => {
            if (d.type === "result") return "#1e1b4b";
            return d.id === "UsersTable" ? "#1e3a8a" : d.id === "OrdersTable" ? "#064e3b" : "#1e3a8a";
        })
        .attr("stroke", d => {
            if (d.type === "result") return "#818cf8";
            return tableColors[d.id] ? tableColors[d.id].default : "#3b82f6";
        })
        .attr("stroke-width", 1.5);

    // Render box header titles
    nodeElement.append("text")
        .attr("x", 12)
        .attr("y", 22)
        .attr("font-size", "11px")
        .attr("font-weight", "bold")
        .attr("fill", d => d.type === "source" ? "#38bdf8" : "#c7d2fe")
        .text(d => {
            if (d.type === "result") return d.title;
            const icon = expansionState[d.id] ? "⊟" : "⊞";
            return `${icon} ${d.name}`;
        });

    // Dynamically inject text rows inside BOTH left and right boxes
    nodeElement.each(function(d) {
        const currentBox = d3.select(this);

        if (d.type === "result" && d.tuples) {
            d.tuples.forEach((tupleText, index) => {
                currentBox.append("text")
                    .attr("class", "tuple-row")
                    .attr("x", 16)
                    .attr("y", 42 + (index * 15))
                    .text(`• ${tupleText}`);
            });
        } 
        else if (d.type === "source" && expansionState[d.id]) {
            const table = sourceTables.find(t => t.id === d.id);
            table.tuples.forEach((tuple, index) => {
                currentBox.append("text")
                    .attr("class", "tuple-row")
                    .attr("x", 16)
                    .attr("y", 46 + (index * 18))
                    .text(`• ${tuple.name}`);
            });
        }
    });
}

// 6. Interaction Management
function handleNodeClick(event, d) {
    if (d.type === "source") {
        expansionState[d.id] = !expansionState[d.id];
        selectedNode = null;
        updateGraphLayout();
        return;
    }

    if (selectedNode === d.id) {
        resetHighlighting();
        return;
    }
    
    selectedNode = d.id;
    const activeLinks = new Set();
    const activeNodes = new Set([d.id]);

    d.targetLinks.forEach(l => {
        activeLinks.add(l);
        activeNodes.add(l.source.id);
    });

    linkElement
        .classed("active", l => activeLinks.has(l))
        .classed("dimmed", l => !activeLinks.has(l))
        .style("stroke", l => activeLinks.has(l) ? tableColors[l.tableId].active : tableColors[l.tableId].default); 

    nodeElement
        .classed("active-node", n => n.id === d.id)
        .classed("dimmed", n => !activeNodes.has(n.id));
}

function resetHighlighting() {
    selectedNode = null;
    linkElement
        .classed("active", false)
        .classed("dimmed", false)
        .style("stroke", d => tableColors[d.tableId].default); 
    nodeElement.classed("active-node", false).classed("dimmed", false);
}

const margin = {top: 40, right: 220, bottom: 40, left: 220};
const width = 1100 - margin.left - margin.right;
const height = 450 - margin.top - margin.bottom;

const svg = d3.select("#chart-container")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

// Structured dataset mapping
const data = {
    nodes: [
        // Left Side: Input Data Sources
        { id: "S1", name: "Users Table: Tuple #101 (Alice)", type: "source" },
        { id: "S2", name: "Users Table: Tuple #102 (Bob)", type: "source" },
        { id: "S3", name: "Orders Table: Tuple #901 ($50)", type: "source" },
        { id: "S4", name: "Orders Table: Tuple #902 ($120)", type: "source" },
        
        // Right Side: Query Result Sets with nested target rows text
        { 
            id: "R1", 
            title: "User Revenue View", 
            tuples: ["Alice - Total: $170", "Status: Active Verified", "Partition: Node-0A"], 
            type: "result" 
        },
        { 
            id: "R2", 
            title: "Zero Balance View", 
            tuples: ["Bob - Total: $0", "Status: Idle Hibernated"], 
            type: "result" 
        },
        { 
            id: "R3", 
            title: "System Audit Logs", 
            tuples: ["Global Aggregation Sum", "Validation Checksum: OK"], 
            type: "result" 
        }
    ],
    links: [
        { source: "S1", target: "R1", value: 8 },
        { source: "S3", target: "R1", value: 4 },
        { source: "S4", target: "R1", value: 4 },
        { source: "S2", target: "R2", value: 6 },
        { source: "S3", target: "R3", value: 2 },
        { source: "S4", target: "R3", value: 10 }
    ]
};

const sankey = d3.sankey()
    .nodeId(d => d.id)
    .nodeWidth(220) 
    .nodePadding(40)
    .extent([[0, 0], [width, height]]);

const { nodes, links } = sankey(data);

// Render line connections
const linkElement = svg.append("g")
    .selectAll(".link")
    .data(links)
    .join("path")
    .attr("class", "link")
    .attr("d", d3.sankeyLinkHorizontal())
    .attr("stroke", "#64748b") 
    .attr("stroke-width", d => Math.max(3, d.width))
    .attr("fill", "none");

// Render card wrappers
const nodeElement = svg.append("g")
    .selectAll(".node")
    .data(nodes)
    .join("g")
    .attr("class", "node")
    .attr("transform", d => `translate(${d.x0},${d.y0})`)
    .on("click", handleNodeClick);

// Draw main envelope cards
nodeElement.append("rect")
    .attr("class", "main-box")
    .attr("height", d => Math.max(70, d.y1 - d.y0)) 
    .attr("width", sankey.nodeWidth())
    .attr("fill", d => d.type === "source" ? "#1e3a8a" : "#1e1b4b") 
    .attr("stroke", d => d.type === "source" ? "#3b82f6" : "#818cf8")
    .attr("stroke-width", 1.5);

// Render box primary header titles
nodeElement.append("text")
    .attr("x", 12)
    .attr("y", 18)
    .attr("font-size", "11px")
    .attr("font-weight", "bold")
    .attr("fill", d => d.type === "source" ? "#93c5fd" : "#c7d2fe")
    .text(d => d.type === "source" ? d.name : d.title);

// Inject the specific tuple texts INSIDE the right-side cards dynamically
nodeElement.each(function(d) {
    if (d.type === "result" && d.tuples) {
        const currentBox = d3.select(this);
        
        d.tuples.forEach((tupleText, index) => {
            currentBox.append("text")
                .attr("class", "tuple-row")
                .attr("x", 16) 
                .attr("y", 38 + (index * 15)) 
                .text(`• ${tupleText}`);
        });
    }
});

// Interactive Tracking Highlighting State Engine
let selectedNode = null;

function handleNodeClick(event, d) {
    if (selectedNode === d.id) {
        resetHighlighting();
        return;
    }
    
    selectedNode = d.id;
    const activeLinks = new Set();
    const activeNodes = new Set([d.id]);

    if (d.type === "source") {
        d.sourceLinks.forEach(l => {
            activeLinks.add(l);
            activeNodes.add(l.target.id);
        });
    } else {
        d.targetLinks.forEach(l => {
            activeLinks.add(l);
            activeNodes.add(l.source.id);
        });
    }

    linkElement
        .classed("active", l => activeLinks.has(l))
        .classed("dimmed", l => !activeLinks.has(l))
        .style("stroke", l => activeLinks.has(l) ? (d.type === "source" ? "#10b981" : "#f43f5e") : "#64748b"); 

    nodeElement
        .classed("active-node", n => n.id === d.id)
        .classed("dimmed", n => !activeNodes.has(n.id));
}

function resetHighlighting() {
    selectedNode = null;
    linkElement.classed("active", false).classed("dimmed", false).style("stroke", "#64748b");
    nodeElement.classed("active-node", false).classed("dimmed", false);
}

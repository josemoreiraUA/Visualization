import * as d3 from 'd3';

// Estado de expansão persistente para os nós de origem
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

export function updateTrainingGraphLayout() {
    console.log("=== [TRAINING LINEAGE] Rendering Graph Layout ===");

    const container = d3.select("#chart-container");
    container.selectAll("*").remove();

    // Dimensões do Canvas (Três colunas horizontais bem distribuídas)
    const margin = { top: 40, right: 50, bottom: 40, left: 50 };
    const width = 1100 - margin.left - margin.right;
    const height = 550 - margin.top - margin.bottom;

    const svg = container.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // 1. Definição estática dos dados das tabelas fonte
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

    // 2. Resultados Finais anotados com Proveniência Composta
    const resultNodes = [
        { id: "R1", name: "Carla Gomez", act: "Digital Marketing", h: 6, prov: "t1.a3", sourceTable: "Employees_training_actions", sourceId: "t1", refId: "a3" },
        { id: "R2", name: "Carla Gomez", act: "CRM", h: 8, prov: "t2.a1", sourceTable: "Employees_training_actions", sourceId: "t2", refId: "a1" },
        { id: "R3", name: "David Miller", act: "Digital Marketing", h: 6, prov: "t3.a3", sourceTable: "Employees_training_actions", sourceId: "t3", refId: "a3" },
        { id: "R4", name: "David Miller", act: "CRM", h: 8, prov: "t4.a1", sourceTable: "Employees_training_actions", sourceId: "t4", refId: "a1" },
        { id: "R5", name: "David Miller", act: "Advanced Excel", h: 12, prov: "t5.a2", sourceTable: "Employees_training_actions", sourceId: "t5", refId: "a2" },
        { id: "R6", name: "Alice Smith", act: "Industrial Safety", h: 16, prov: "p1", sourceTable: "Employees_training", sourceId: "p1", refId: null }
    ];

    // 3. Mapeamento de Coordenadas Fixas por Colunas (Resolução do Requisito de Espaço)
    const cardWidth = 240;
    
    const positions = {
        "Training_actions": { x: 0, y: 150 },                         // Coluna Esquerda
        "Employees_training_actions": { x: 360, y: 30 },             // Coluna Central Superior
        "Employees_training": { x: 360, y: 280 },                    // Coluna Central Inferior (Debaixo)
        "ResultsColumn": { x: 740 }                                   // Coluna Direita (Resultados)
    };

    // Calcular alturas dinâmicas das tabelas com base na expansão
    function getCardHeight(key, baseRows) {
        return expansionState[key] ? 45 + (baseRows.length * 20) : 45;
    }

    // Gerar coordenadas exatas para cada tuplo interno para ancorar os caminhos (Wires)
    function getTupleY(tableKey, tupleId, baseRows) {
        const tableY = positions[tableKey].y;
        if (!expansionState[tableKey]) return tableY + 22; // Centro do cabeçalho se colapsado
        const idx = baseRows.findIndex(r => r.id === tupleId);
        return tableY + 52 + (idx * 20);
    }

    // 4. Desenhar as Tabelas Fonte (Módulos da Esquerda e Centro)
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
                updateTrainingGraphLayout(); // Re-renderização fluida
            });

        // Fundo do Card
        tableG.append("rect")
            .attr("width", cardWidth)
            .attr("height", h)
            .attr("fill", "#1e293b")
            .attr("stroke", key === "Training_actions" ? themeColors.actions.default : (key === "Employees_training_actions" ? themeColors.empActions.default : themeColors.empTraining.default))
            .attr("stroke-width", 1.5)
            .attr("rx", 6);

        // Título do Cabeçalho
        tableG.append("text")
            .attr("x", 12)
            .attr("y", 26)
            .attr("font-size", "12px")
            .attr("font-weight", "bold")
            .attr("fill", "#ffffff")
            .text(`${isExpanded ? "⊟" : "⊞"} ${key.replace(/_/g, " ")}`);

        // Adicionar linhas de tuplos se expandido
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

    // 5. Desenhar os Cards de Resultado (Coluna Direita)
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
        .attr("stroke", themeColors.result.stroke)
        .attr("stroke-width", 1.5)
        .attr("rx", 6);

    resultElements.append("text")
        .attr("x", 12)
        .attr("y", 20)
        .attr("font-size", "12px")
        .attr("font-weight", "bold")
        .attr("fill", "#38bdf8")
        .text(d => d.name);

    resultElements.append("text")
        .attr("x", 12)
        .attr("y", 38)
        .attr("font-size", "11px")
        .attr("fill", "#e2e8f0")
        .text(d => `${d.act} (${d.h}h)`);

    resultElements.append("text")
        .attr("x", 12)
        .attr("y", 54)
        .attr("font-size", "10px")
        .attr("font-family", "monospace")
        .attr("fill", "#a855f7")
        .text(d => `prov: ${d.prov}`);

    // 6. Construção e Renderização dos Caminhos de Linhagem (Wires)
    resultNodes.forEach((res, resIdx) => {
        const resY = (resIdx * (resultCardHeight + 12)) + (resultCardHeight / 2);
        const resX = positions.ResultsColumn.x;

        // Conexão do Resultado para a sua respetiva Tabela Intermédia (Centro)
        const midTableKey = res.sourceTable;
        const midTupleY = getTupleY(midTableKey, res.sourceId, sourceData[midTableKey]);
        const midTableX = positions[midTableKey].x + cardWidth;

        const pathCenter = svg.append("path")
            .attr("d", d3.linkHorizontal()({ source: [midTableX, midTupleY], target: [resX, resY] }))
            .attr("fill", "none")
            .attr("stroke", midTableKey === "Employees_training_actions" ? themeColors.empActions.default : themeColors.empTraining.default)
            .attr("stroke-width", 2)
            .attr("stroke-opacity", 0.4);

        // Conexão Adicional: Da Tabela Intermédia para as Ações de Treino (Se aplicável)
        if (res.refId) {
            const leftTableX = positions["Training_actions"].x + cardWidth;
            const leftTupleY = getTupleY("Training_actions", res.refId, sourceData["Training_actions"]);
            const midTableLeftX = positions[midTableKey].x;

            const pathLeft = svg.append("path")
                .attr("d", d3.linkHorizontal()({ source: [leftTableX, leftTupleY], target: [midTableLeftX, midTupleY] }))
                .attr("fill", "none")
                .attr("stroke", themeColors.actions.default)
                .attr("stroke-width", 2)
                .attr("stroke-opacity", 0.4);

            // Efeito de Destaque Interativo Combinado (Hover)
            setupHoverEffect([pathCenter, pathLeft], res.sourceId, res.refId);
        } else {
            setupHoverEffect([pathCenter], res.sourceId, null);
        }
    });

    // Função de Destaque Visual por Proximidade Rápida
    function setupHoverEffect(paths, midId, leftId) {
        const elementsToTrigger = resultElements.filter(d => d.sourceId === midId && d.refId === leftId);
        
        elementsToTrigger.on("mouseenter", () => {
            paths.forEach(p => p.attr("stroke-width", 4).attr("stroke-opacity", 1));
        }).on("mouseleave", () => {
            paths.forEach(p => p.attr("stroke-width", 2).attr("stroke-opacity", 0.4));
        });
    }

    console.log("=== [TRAINING LINEAGE] Graph Render Complete ===");
}

// Escuta no canal global de mudanças de tab do sistema modular
window.addEventListener('lineage-tab-visible', () => {
    updateTrainingGraphLayout();
});

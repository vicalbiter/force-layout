var SHOW_TIP = false;

const svg = d3.select("svg"),
    width = +svg.attr("width"),
    height = +svg.attr("height");

const hovercard = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0)
    .style("width", 200)

// Set up the simulation 
const simulation = d3.forceSimulation()
    .force("link", d3.forceLink().id(function(d) { return d.name; })) // Sets the "id" property as the reference for the links
    .force("charge", d3.forceManyBody().strength(-70)) // Force that makes nodes repel from each other
    .force("centerX", d3.forceX(width / 2))
    .force("centerY", d3.forceY(height / 2))

// Add the links and nodes to the simulation from a JSON file
d3.json("data/epsilons_graph_v2.json").then(function(graph) {

    const EPSILON_FILTER = 2

    var fnodes = getLinkedNodes(graph, EPSILON_FILTER)
    var flinks = graph.links.filter(d => d.epsilon > EPSILON_FILTER)

    // Define the links group
    const link = svg
        .append("g")
        .attr("class", "links")
        .selectAll(".link")
        .data(flinks)
        .join("line")
        .classed("link", true)

    // Define the nodes (each one as a group)
    const node = svg
        .selectAll(".node")
        .data(graph.nodes.filter(d => d.name in fnodes))
        .join("g")
        .classed("node", true)
        .classed("fixed", d => { return d.fx !== undefined })

    const circle = node
        .append("circle")
        // .attr("r", 5)
        .attr("r", d => { return Math.sqrt(fnodes[d.name] + 24)})
        .style("fill", d => colorScale(d.type))

    const label = node
        .append("text")
        .text(function(d) { return d.name; })


    // Legend
    const legend = svg.selectAll(".legend")
        .data(colorScale.domain())
        .join("g")
        .attr("transform", (d, i) => `translate(${width - 200},${(i + 2) * 20})`)

    legend.append("circle")
        .attr("cx", 0)
        .attr("cy", 0)
        .attr("r", 5)
        .attr("fill", colorScale)

    legend.append("text")
        .attr("x", 10)
        .attr("y", 5)
        .text(d => d)

    // Simulation

    simulation
        .nodes(graph.nodes)
        .on("tick", ticked);

    simulation
        .force("link")
        .links(flinks);

    const drag = d3
        .drag()
        .on("start", dragstart)
        .on("drag", dragged);

    node.call(drag).on("click", unstick);

    // Attach event listeners to the nodes in order to show further information
    node.on("mouseover", showTip);
    node.on("mouseout", hideTip);
    node.on("contextmenu", toggleNeighbors);

    // Gets called at every 'tick' of the simulation
    function ticked() {
        link
            .attr("x1", function(d) { return d.source.x })
            .attr("y1", function(d) { return d.source.y })
            .attr("x2", function(d) { return d.target.x })
            .attr("y2", function(d) { return d.target.y });

        circle
            .attr("cx", function(d) { return d.x })
            .attr("cy", function(d) { return d.y });

        label
            .attr("x", function(d) { return d.x + 10 })
            .attr("y", function(d) { return d.y});

    }

    function toggleNeighbors(event, nd) {
        event.preventDefault()
        svg.selectAll('.link').filter(ld => ld.source.name === nd.name || ld.target.name === nd.name).classed("highlighted", function() {
            if (d3.select(this).classed("highlighted")) {
                return false
            } else {
                return true
            }
        })
    }
})

/* Auxiliary functions */

// Color scale
colorScale = d3.scaleOrdinal()
    .domain(["Facilities", "Socio-Demographical"])
    .range(['#86cbff', '#c2e5a0'])

// Filters out those nodes that have links with a minimum strength of 'epsilon'
function getLinkedNodes(graph, epsilon) {
    linkedNodes = {}
    graph.links.forEach(link => {
        if (link.epsilon > epsilon) {
            if (link.source in linkedNodes) {
                linkedNodes[link.source] += 1
            } else {
                linkedNodes[link.source] = 0
            }
            if (link.target in linkedNodes) {
                linkedNodes[link.target] += 1
            } else {
                linkedNodes[link.target] = 0
            }
        }
    })
    return linkedNodes
}

// Removes the sticky force of a node
function unstick(event, d) {
    delete d.fx;
    delete d.fy;
    d3.select(this).classed("fixed", false);
    simulation.alpha(0.3).restart();
}

// Shows the HTML hovercard on a fixed node when it gets hovered by the mouse
function showTip(event, d) {

    if(this.classList.contains("fixed")) {
        hovercard.transition()
            .duration(300)
            .style("opacity", 1);
        
        var tip = 
            "<h3>" + d.desc + "</h3><hr>" +
            "<strong>Bin: </strong>" + d.cg_value + "<br>" +
            "<strong>Interval: </strong>" + d.cg_min.toFixed(2) + " - " + d.cg_max.toFixed(2);

        hovercard.html(tip)
            .style("left", (d.fx + 20) + "px")
            .style("top", (d.fy + 15) + "px");

    }
}

// Hides the HTML hovercard
function hideTip(event, d) {
    hovercard.transition()
    .duration(300)
    .style("opacity", 0);
}

/* Dragging functionality */

function dragstart() {
    d3.select(this).classed("fixed", true);
}

function dragged(event, d) {
    d.fx = clamp(event.x, 0, width);
    d.fy = clamp(event.y, 0, height);
    simulation.alpha(0.3).restart();
}

function clamp(x, lo, hi) {
    return x < lo ? lo : x > hi ? hi : x;
  }
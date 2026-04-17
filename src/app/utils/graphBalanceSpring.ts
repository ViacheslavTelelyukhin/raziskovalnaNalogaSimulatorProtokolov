import { Edge, Node } from "@xyflow/react/dist/esm";

const springCoefficient = 0.1
const disconnectedNodeSpringCoefficient = 0.1
//takes in nodes, edges and maximum iterations, returns a more balanced node array and the total distance that they were moved
//does not modify the inputted nodes array
export const balanceGraphStepSpring = (
    nodes: Node[],
    edges: Edge[],
    iterations: {
        max: number,
        until: number
    } = {
        max: 3,
        until: 30
    },
    config: {
        edgeLength: number,
        disconnectedNodeEdgeLength: number,
    } = {
        edgeLength: 400,
        disconnectedNodeEdgeLength: 400,
    }
): {
    nodes: Node[],
    movement: number,
    iterations: number
} => {
    //use a simple adjacency matrix
    //since the algorithm is O(n^2) anyway this is better than an edge vector
    const graph = Array.from(Array(nodes.length), () => Array(nodes.length));
    const nodeIndexes = Object.fromEntries(nodes.map((n, i) => [n.id, i]))
    //note that we do not fill out the matrix symetrycally because we apply more force to double edges
    //Maybe this should also apply to multiple edges to a single node but I'm not sure yet
    edges.forEach(e => graph[nodeIndexes[e.source]][nodeIndexes[e.target]] = 1)

    let newNodes: Node[], nodesInitial = nodes.concat(), moved: number;
    while (iterations.max--) {
        moved = 0;
        //to avoid infinite loops apply changes in increments
        newNodes = nodesInitial.concat()
        nodes.forEach((node, i) => {
            const force = nodes.reduce((acc, val, idx) => {
                if (i === idx) return acc
                let distX = node.position.x-val.position.x, distY = node.position.y-val.position.y
                //this may be risky because random can average out
                if (distX === 0 && distY === 0) {
                    distX = (Math.random()-0.5)*config.edgeLength
                    distY = (Math.random()-0.5)*config.edgeLength
                }
                let dist = Math.hypot(distX, distY), displacement
                const sin = distY/dist, cos = distX/dist //these values carry the appropriate sign
                //apply force, hooks law
                if (graph[i][idx] && graph[idx][i]) dist*=1.25;
                if ((!graph[i][idx]) && (!graph[idx][i]))
                    displacement = Math.max(0, (config.disconnectedNodeEdgeLength-dist))*disconnectedNodeSpringCoefficient
                else
                    displacement = (config.edgeLength-dist)*springCoefficient
                
                return [acc[0]+displacement*cos, acc[1]+displacement*sin]
            }, [0, 0])
            moved += Math.hypot(...force)
            newNodes[i].position.x += force[0]
            newNodes[i].position.y += force[1]
        })
        if (moved < iterations.until) break
        nodesInitial = newNodes
    }

    return {
        movement: moved,
        nodes: newNodes,
        iterations: iterations.max
    };
}
import { Edge, Node } from "@xyflow/react/dist/esm";
import { FLOW_NODE_TYPES, network, protocolLayer, simulation, simulationProgressType } from "../../types";
import { balanceGraphStepSpring } from "./graphBalanceSpring";

interface createEdgeProps {
    source: string
    target: string
    frame: string
    ifFrom: string
    ifTo: string
}
const createEdge = ({source, target, ifFrom, ifTo, frame}: createEdgeProps): Edge => ({
    source,
    target,
    id: source+"§§"+target,
    label: ifFrom + '--('+frame+')->' + ifTo,
    type: 'straight'
})

export const executePgss = async (
    network: network,
    layer: protocolLayer,
    name: string,
    //callbacks
    //in retrospect errors should be sent through a separate callback
    setProgress: (p: simulationProgressType) => void,
    saveSimulation: (s: simulation) => void,
) => {
    const automatonMap = Object.fromEntries(layer.roles.map(r => [r.name, {...r, stateMap: Object.fromEntries(r.states.map(s => [s.name, s]))}]))
    const interfaces = network.devices.flatMap(d =>
        d.interfaces.map(dif => ({
            name: d.name+'§'+dif.name,
            ...dif.interfaces.find(lif => lif.protocolLayer === layer.name)
        }))
    )
    const interfacesMap = new Map(interfaces.map((i, index) => [i.name, index]))

    if (interfaces.find(lif => !lif.automaton)) return setProgress({
        done: true,
        errors: ['Not all interfaces exist on the layer being simulated'],
        warnings: [],
        maxStates: 0,
        foundStates: 0,
    })
    new Promise<void>(async (resolve, reject) => {
        const maxStates = interfaces.reduce((prev, cur) => prev*automatonMap[cur.automaton].states.length, 1)
        const warnings: string[] = []
        let foundStates = 0
        const update = () => setProgress({maxStates, warnings, errors: [], foundStates, done: false, abortFunction: reject})
        update()
        const interval = setInterval(update, 1000) //I wonder if it clears when it rejects

        //may consume more ram than necessary. Will consider later
        const nodes: Node[] = [], edges: Edge[] = []
        const visited = new Set<string>()
        let toCheckStates = [interfaces.map(lif => automatonMap[lif.automaton].states[0])]
        
        while (toCheckStates.length) {
            // console.log(toCheckStates);
            
            await new Promise<void>((resolveInner, rejectInner) => {
                const state = toCheckStates.pop()
                const stateStr = state.map(s => s.name).join("§")
                if(!visited.has(stateStr)) {//need node
                    nodes.push({
                        type: FLOW_NODE_TYPES.SYSTEM_STATE,
                        id: stateStr,
                        data: {
                            label: stateStr
                        },
                        position: {x: 0, y: 0}
                    })
                    foundStates++
                    visited.add(stateStr)
                    //discovered new node, draw all its edges
                    state.forEach((s, i) => {
                        //no receive here because we can't receive without someone ending something
                        s.send.forEach(send => {
                            const sendingToIndex = interfacesMap.get(interfaces[i].automatonConfig[send.on])
                            if (sendingToIndex === undefined) {
                                warnings.push(`Failed to send a frame "${send.frame}" from "${interfaces[i].name}" to "${interfaces[i].automatonConfig[send.on]}"`)
                                return
                            }
                            const targetState = state.concat()
                            const ifTo = interfaces[sendingToIndex]
                            //a long call. maybe should be avoided
                            //find whether ifTo receives the frame
                            const receive = state[sendingToIndex].receive.find(recv => {
                                if (recv.frame !== send.frame) return false
                                const receivingFromIndex = interfacesMap.get(ifTo.automatonConfig[recv.on])
                                if (i!==receivingFromIndex) return false
                                return true
                            })
                            if (!receive) {
                                warnings.push(`"${ifTo.name}" does not receive frame "${send.frame}" sent from "${interfaces[i].name}`)
                            } else targetState[sendingToIndex] = automatonMap[ifTo.automaton].stateMap[receive.moveTo]
                            targetState[i] = automatonMap[interfaces[i].automaton].stateMap[send.moveTo]

                            edges.push(createEdge({
                                frame: send.frame,
                                ifFrom: interfaces[i].name,
                                ifTo: ifTo.name,
                                source: stateStr,
                                target: targetState.map(s => s.name).join("§")
                            }))
                            toCheckStates.push(targetState)
                        })
                    })
                } else {
                    //if the node has been visited we don't actually do anything because we have already drawn the edge to it when we pushed it to the stack
                    //if a node has been visited ALL it's outgoing edges have been drawn.
                    //Since an incoming edge must have been outgoing form the previous node we don't need to draw it here
                }
                resolveInner()
            })
        }
        clearTimeout(interval)
        saveSimulation({
            name,
            nodes: balanceGraphStepSpring(nodes, edges, {max: 100, until: 5}).nodes, //balance graph once after generating it
            edges,
            deviceOrder: network.devices.map(d => [d.name, d.interfaces.length])
        })
        resolve()
    })
    //representing each state as a promise is slower (i think) but it makes sure gui stays responsive
}
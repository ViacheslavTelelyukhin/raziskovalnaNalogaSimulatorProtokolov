import React, { SetStateAction, useCallback, useEffect, useRef, useState } from "react";
import { automaton, automatonState, FIELD_TYPES, FLOW_NODE_TYPES, frame, frameField, INTERFACE_INPUT_TYPES, project, protocolLayer } from "../../types";
import { Button, Input, Select, Space, Tooltip, Typography } from "antd/es";
import { DownOutlined, UpOutlined, DeleteOutlined, PlusOutlined, DragOutlined } from "@ant-design/icons";
import { notify } from "../utils/notify";
import EditList from "../components/listEdit";
import { createSetStateAction } from "../utils/setStateAction";
import { ReactFlow, applyNodeChanges, Edge, Node, EdgeChange, NodeChange, Connection, Controls, Background, BackgroundVariant, NodeDimensionChange } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { AutomatonStateNode, DirectedStraightEdge } from "../components/nodes";
import StateEditorModal from "../components/stateEditor";
import { balanceGraphStepSpring } from "../utils/graphBalanceSpring";

interface Props {
    proj: project,
    setProj: (p: SetStateAction<project>) => void,
    setPage: (page: string) => void,
}

interface createEdgeProps {
    source: string
    target: string
    id?: string
    label: any
}
const createEdge = ({source, target, id, label}: createEdgeProps): Edge => ({
    source,
    target,
    id: id || (source+'-'+target), //todo: change this to source-/+frame(target)
    label,
    type: 'DirectedStraightEdge',
    // animated: true,
})

export default function Layers({proj, setPage, setProj}: Props) {

    const [editingLayer, setEditingLayer] = useState<number>(null)
    const [editingFrame, setEditingFrame] = useState<number>(null)
    const [editingRole, setEditingRole] = useState<number>(null)
    
    //layers
    const editLayer = (i: any) => {
        setEditingLayer(i)
        setEditingFrame(null)
        setEditingRole(null)
    }
    const newLayer = (name: string) => {
        setProj(createSetStateAction(['layers', undefined], {
            name: name,
            frames: [],
            roles: []
        }))
    }
    const deleteLayer = (index: number) => {
        setProj(createSetStateAction(['layers', index], undefined))
    }
    const moveUpLayer = (index: number) => {
        const first = proj.layers[index-1]
        const second = proj.layers[index]
        const copy = proj.layers.concat()
        copy[index] = first
        copy[index-1] = second
        setProj({...proj, layers: copy})
    }

    //frames
    const newFrame = (index: number, name: string) => {
        setProj(createSetStateAction(['layers', index, 'frames', undefined], {
            name: name,
            fields: [],
            checkFunctions: []
        }))
    }
    const deleteFrame = (li: number, fi: number) => {
        setProj(createSetStateAction(['layers', li, 'frames', fi], undefined))
    }

    //frame fields
    const newField = (index: number, fi: number, name: string) => {
        setProj(createSetStateAction(['layers', index, 'frames', fi, 'fields', undefined], {
            name: name,
            represents: FIELD_TYPES.BITS,
            size: 1
        } as frameField))
    }
    const editField = (index: number, fi: number, fieldIndex: number, key: keyof frameField, value: any) => {
        setProj(createSetStateAction(['layers', index, 'frames', fi, 'fields', fieldIndex, key], value as frameField))
    }
    const deleteFrameField = (li: number, fi: number, fieldIndex: number) => {
        setProj(createSetStateAction(['layers', li, 'frames', fi, 'fields', fieldIndex], undefined))
    }

    //roles
    const newRole = (li: number, name: string) => {
        setProj(createSetStateAction(['layers', li, 'roles', undefined], {
            name: name,
            states: [],
            inputs: {}
        } as automaton))
    }
    const deleteRole = (li: number, ri: number) => {
        setProj(createSetStateAction(['layers', li, 'roles', ri], undefined))
    }

    //role inputs
    const editRoleInput = (li: number, ri: number, key: string, value: any) => {
        setProj(createSetStateAction(['layers', li, 'roles', ri, 'inputs', key], value as frameField))
    }
    const deleteRoleInput = (li: number, ri: number, key: string) => {
        setProj(createSetStateAction(['layers', li, 'roles', ri, 'inputs', key], undefined))
    }
    const newRoleInput = (li: number, ri: number, name: string) => {
        setProj(createSetStateAction(['layers', li, 'roles', ri, 'inputs', name], INTERFACE_INPUT_TYPES.ADDRESS))
    }

    //role graph
    //not best practice but it's fine
    const [nodes, setNodes] = useState<Node[]>(null);
    const [edges, setEdges] = useState<Edge[]>(null);
    const [editingState, setEditingState] = useState<number>(null)
    const lastGeneratedFrom = useRef<[automaton | undefined, number, number]>([undefined, -1, -1])
    useEffect(() => {
        const automaton = proj?.layers?.[editingLayer]?.roles?.[editingRole]
        if (lastGeneratedFrom.current[0] === automaton) return
        const graphPositions = nodes ? Object.fromEntries(nodes.map(n => [n.id, n.position])) : {}
        //this means we closed the graph and must now apply positions
        if (!automaton && lastGeneratedFrom.current[0]) {
            const newStates = lastGeneratedFrom.current[0].states.map(s => ({...s, onGraphPosition: (graphPositions[s.name] || s.onGraphPosition)}))
            setProj(createSetStateAction(['layers', lastGeneratedFrom.current[1], 'roles', lastGeneratedFrom.current[2], 'states'], newStates))
        }
        lastGeneratedFrom.current = [automaton, editingLayer, editingRole]
        if (!automaton) return
        
        const edges: Edge[] = [], newNodes: Record<string, Node> = {}
        const incomingEdges: Record<string, number> = {}
        for (let i = 0; i < automaton.states.length; i++) {
            const state = automaton.states[i];
            
            newNodes[state.name] = ({
                id: state.name,
                position: graphPositions[state.name] || state.onGraphPosition,
                data: {
                    label: state.name,
                    sii: i,
                    sendCt: state.send.length,
                    recvCt: state.receive.length,
                    style: i===0?{fontWeight: 800, background: '#edfffe'}:null
                },
                draggable: true,
                type: FLOW_NODE_TYPES.AUTOMATON_STATE,
                width: 120,
                height: 50
            })
            if (state.logic) {

            } else {
                for (let j = 0; j < state.send?.length; j++) {
                    const send = state.send[j];
                    edges.push(createEdge({
                        source: state.name,
                        target: send.moveTo,
                        label: `-${send.frame}(${send.on})`,
                        // sourceHandle: '-'+j,
                        // targetHandle: 'i'+(incomingEdges[send.moveTo] = (incomingEdges[send.moveTo]||0) + 1)
                    }))
                }
                for (let j = 0; j < state.receive?.length; j++) {
                    const receive = state.receive[j];
                    edges.push(createEdge({
                        source: state.name,
                        target: receive.moveTo,
                        label: `+${receive.frame}(${receive.on})`,
                        // sourceHandle: '+'+j,
                        // targetHandle: "i"+(incomingEdges[receive.moveTo] = (incomingEdges[receive.moveTo]||0) + 1)
                    }))
                }
            }
        }

        setNodes(Object.values(newNodes).map(n => ({...n, data: {...n.data, targetHandles: incomingEdges[n.id]}})))
        setEdges(edges)
    }, [proj?.layers?.[editingLayer]?.roles?.[editingRole]?.states])

    const onNodesChange = useCallback(
        (changes: NodeChange<Node>[]) => {
            // console.log("HERE!!!", changes);
            setNodes((p: Node[]) => p && applyNodeChanges(changes, p))
        },
        [],
    );
    const onEdgesChange = useCallback(
        (changes: EdgeChange<Edge>[]) => {
            // setEdges((edgesSnapshot) => applyEdgeChanges(changes, edgesSnapshot))
        },
        [],
    );
    const onConnect = useCallback(
        (params: Connection) => {
            console.log(params);
            // setEdges((edgesSnapshot) => addEdge(params, edgesSnapshot))
        },
        [],
    );
    const addNewRoleState = (li: number, ri: number, name: string) => {
        const roleNames = proj?.layers[li]?.roles[ri]?.states.map(s => s.name)
        if (!roleNames) return //must be some error, avoid crash
        let i = 0
        while (roleNames.includes(name + (i===0?'':`(${i})`))) i++
        if (i) name+=`(${i})`
        setProj(createSetStateAction(['layers', li, 'roles', ri, 'states', undefined], {
            name,
            onGraphPosition: {x:0, y:0},
            send: [],
            receive: [],
            triggers: [],
        } as automatonState))
    }
    const openStateEditor = (stateIndex: number | null) => {
        setEditingState(stateIndex)
    }

    const nodeTypes = {
        [FLOW_NODE_TYPES.AUTOMATON_STATE]: (props: any) => <AutomatonStateNode {...props} openStateEditor={openStateEditor}/>
    }
    const edgeTypes = {
        'DirectedStraightEdge': DirectedStraightEdge
    }

    // console.log(edges, nodes);

    return <>
        <EditList
            name="layer"
            onAdd={newLayer}
            items={proj.layers}
            enforceUniqueName={true}
            fontSize="2.4em"
            render={(layer: protocolLayer, li) => <div key={layer.name}>
                <Space style={{margin: '0.4em'}}>
                    <Typography.Text>
                        {layer.name}
                    </Typography.Text>
                    {(editingLayer === li)
                        ? <UpOutlined onClick={() => editLayer(null)}/>
                        : <DownOutlined onClick={() => editLayer(li)}/>
                    }
                    <Space.Compact>
                        <Button onClick={() => deleteLayer(li)} danger><DeleteOutlined/></Button>
                        <Button onClick={() => moveUpLayer(li)} disabled={li===0}><UpOutlined/></Button>
                    </Space.Compact>
                </Space>
                {editingLayer !== li ? null :
                    <div>   
                    <EditList
                        margin={1}
                        name="frame"
                        onAdd={(name) => newFrame(li, name)}
                        items={layer.frames}
                        enforceUniqueName={true}
                        render={(frame: frame, fi) => <div key={layer.name+"_"+frame.name}>
                            <Space style={{margin: '0.4em'}}>
                                <Typography.Text>
                                    {frame.name}
                                </Typography.Text>
                                {(editingFrame === fi)
                                    ? <UpOutlined onClick={() => setEditingFrame(null)}/>
                                    : <DownOutlined onClick={() => setEditingFrame(fi)}/>
                                }
                                <Button onClick={() => deleteFrame(li, fi)} danger><DeleteOutlined/></Button>
                            </Space>
                            {editingFrame !== fi ? null :
                                <EditList
                                    margin={1}
                                    name="field"
                                    onAdd={(name) => newField(li, fi, name)}
                                    items={frame.fields}
                                    enforceUniqueName={true}
                                    render={(field: frameField, fieldI) => <div key={layer.name+"_"+frame.name+'_'+field.name}>
                                        <Space.Compact style={{margin: '0.4em'}}>
                                            <Input placeholder="Field name" value={field.name} disabled={true}/>
                                            <Tooltip title="Enter a number of bits or a javascript function that takes a dictionary of previous fields and returns size of bits (ex: function(fields){return fields['header']*8;}">
                                                <Input
                                                    placeholder="Field size"
                                                    value={field.size}
                                                    onChange={e => editField(li, fi, fieldI, 'size', e.target.value)}
                                                    onBlur={e => {
                                                        if (!isNaN(parseInt(e.target.value))) return
                                                        let testFunction: Function
                                                        try {
                                                            eval("testFunction = "+e.target.value)
                                                            if (typeof testFunction !== 'function') throw new Error("not a true function")
                                                        } catch (err) {
                                                            notify("Entered invalid value for size")
                                                        }
                                                    }}
                                                />
                                            </Tooltip>
                                            <Select popupMatchSelectWidth={false} options={Object.entries(FIELD_TYPES).slice(Object.entries(FIELD_TYPES).length/2).map(e => ({
                                                value: e[1],
                                                label: e[0]
                                            }))} value={field.represents} onChange={v => {
                                                if (v === FIELD_TYPES.CONTENTS && frame.fields.find(f => f.represents === FIELD_TYPES.CONTENTS)) return notify("There may only be one content field")
                                                editField(li, fi, fieldI, 'represents', v)
                                            }}/>
                                            <Button onClick={() => deleteFrameField(li, fi, fieldI)} danger><DeleteOutlined/></Button>
                                        </Space.Compact>
                                    </div>}
                                />
                            }
                        </div>}
                    />
                    <EditList
                        margin={1}
                        name="automaton"
                        onAdd={(name) => newRole(li, name)}
                        items={layer.roles}
                        enforceUniqueName={true}
                        render={(role: automaton, ri) => <div key={layer.name+"_"+role.name}>
                            <Space style={{margin: '0.4em'}}>
                                <Typography.Text>
                                    {role.name}
                                </Typography.Text>
                                {(editingRole === ri)
                                    ? <UpOutlined onClick={() => setEditingRole(null)}/>
                                    : <DownOutlined onClick={() => setEditingRole(ri)}/>
                                }
                                <Button onClick={() => deleteRole(li, ri)} danger><DeleteOutlined/></Button>
                            </Space>
                            {editingRole !== ri ? null :
                                <div>
                                    <EditList
                                        margin={1}
                                        name="parameter"
                                        onAdd={(name) => newRoleInput(li, ri, name)}
                                        items={Object.entries(role.inputs)}
                                        enforceUniqueName={false}
                                        render={(entry: [string, INTERFACE_INPUT_TYPES]) => <div key={layer.name+"_"+role.name+"_"+entry[0]}>
                                            <Space.Compact style={{margin: '0.4em'}}>
                                                <Input disabled={true} value={entry[0]}/>
                                                <Select popupMatchSelectWidth={false} options={Object.entries(INTERFACE_INPUT_TYPES).slice(Object.entries(INTERFACE_INPUT_TYPES).length/2).map(e => ({
                                                    value: e[1],
                                                    label: e[0]
                                                }))} value={entry[1]} onChange={v => {
                                                    editRoleInput(li, ri, entry[0], v)
                                                }}/>
                                                <Button onClick={() => deleteRoleInput(li, ri, entry[0])} danger><DeleteOutlined/></Button>
                                            </Space.Compact>
                                        </div>}
                                    />
                                    {nodes ? <div style={{height: '40vw'}}>
                                        <ReactFlow
                                            nodes={nodes}
                                            edges={edges}
                                            onNodesChange={onNodesChange}
                                            onEdgesChange={onEdgesChange}
                                            onConnect={onConnect}
                                            nodeTypes={nodeTypes}
                                            edgeTypes={edgeTypes}
                                            fitView
                                        >
                                            <Controls  />
                                            <Space style={{position: 'absolute', zIndex: 10, top: '1em', left: '1em'}}>
                                                <Button icon={<PlusOutlined/>} onClick={() => addNewRoleState(li, ri, 'new state')}>New state</Button>
                                                <Button 
                                                    onClick={() => {
                                                        const result = balanceGraphStepSpring(nodes, edges, {max: 100, until: 5}, {edgeLength: 200, disconnectedNodeEdgeLength: 200})
                                                        setNodes(result.nodes.map(n => ({...n}))) //react flow doesn't update unless reference of individual nodes changes
                                                    }}
                                                    icon={<DragOutlined/>}
                                                >Balance</Button>
                                            </Space>
                                            {/* <MiniMap /> */}
                                            <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
                                        </ReactFlow>
                                    </div> : null}
                                </div>
                            }
                        </div>}
                    />
                    </div>
                }
            </div>}
        />
        <StateEditorModal
            role={proj?.layers?.[editingLayer]?.roles?.[editingRole]}
            editingState={editingState}
            onSave={s => {
                const prevName = proj?.layers?.[editingLayer]?.roles?.[editingRole]?.states?.[editingState]?.name
                if (s.name !== prevName) s = {...s, onGraphPosition: (nodes.find(n => n.id === prevName)?.position || s.onGraphPosition)}
                setProj(createSetStateAction(['layers', editingLayer, 'roles', editingRole, 'states', editingState], s))
            }}
            onDelete={() => {
                setProj(createSetStateAction(['layers', editingLayer, 'roles', editingRole, 'states', editingState], undefined))
            }}
            onSwap={() => {
                const newStates = proj.layers[editingLayer].roles[editingRole].states.concat()
                const tmp = newStates[0]
                newStates[0] = newStates[editingState]
                newStates[editingState] = tmp
                setProj(createSetStateAction(['layers', editingLayer, 'roles', editingRole, 'states'], newStates))
            }}
            setEditingState={setEditingState}
            frames={proj?.layers?.[editingLayer]?.frames}
        />
    </>;
}
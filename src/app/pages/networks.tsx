import React, { SetStateAction, useCallback, useEffect, useRef, useState } from "react";
import { device, deviceInterface, FLOW_NODE_TYPES, INTERFACE_INPUT_TYPES, layerInterface, network, project, simulationProgressType } from "../../types";
import { Button, Input, Modal, Popover, Space, Typography } from "antd/es";
import { CloseOutlined, DeleteOutlined, DragOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import { notify } from "../utils/notify";
import EditList from "../components/listEdit";
import { createSetStateAction } from "../utils/setStateAction";
import { applyNodeChanges, Edge, Node, EdgeChange, NodeChange, Connection, Position, ReactFlow, Controls, Background, BackgroundVariant, MarkerType } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import DeviceEditorModal from "../components/deviceEditor";
import { NetworkDeviceNode, NetworkRelationShipEdge } from "../components/nodes";
import { executePgss } from "../utils/executePgss";
import { balanceGraphStepSpring } from "../utils/graphBalanceSpring";

interface Props {
    proj: project,
    setProj: (p: SetStateAction<project>) => void,
    setPage: (page: string) => void,
}

export default function Networks({proj, setPage, setProj}: Props) {

    const [editingNetwork, setEditingNetwork] = useState<number>(null)
    const [editingDevice, setEditingDevice] = useState<number>(null)
    const [editingLayer, setEditingLayer] = useState<number>(null)
    const [graphLayer, setGraphLayer] = useState<number>(0)
    const [pgssName, setPgssName] = useState<string>(null)

    //simulation progress and errors
    const [pgssSimulationState, setPgssSimulationState] = useState<simulationProgressType>(null)
    
    //list
    const editNetwork = (i: any) => {
        setEditingNetwork(i)
        setEditingDevice(null)
        setEditingLayer(null)
        setGraphLayer(0)
    }
    const newNetwork = (name: string) => {
        setProj(createSetStateAction(['networks', undefined], {
            config: {},
            devices: [],
            simulations: [],
            name
        } as network))
    }
    const deleteNetwork = (index: number) => {
        setProj(createSetStateAction(['networks', index], undefined))
    }

    //devices
    const deleteDevice = () => {
        setProj(createSetStateAction(['networks', editingNetwork, 'devices', editingDevice], undefined))
    }
    const addNewDevice = () => {
        let name = 'new device'
        const deviceNames = proj?.networks?.[editingNetwork]?.devices?.map(d => d.name)
        if (!deviceNames) return //must be some error, avoid crash
        let i = 0
        while (deviceNames.includes(name + (i===0?'':`(${i})`))) i++
        if (i) name+=`(${i})`
        setProj(createSetStateAction(['networks', editingNetwork, 'devices', undefined], {
            name: name,
            interfaces: [],
            config: {},
            onGraphPosition: {x: 0, y: 0},
            ownedByApp: true
        } as device))
    }

    //network graph
    //not best practice but it's fine
    const [nodes, setNodes] = useState<Node[]>(null);
    const [edges, setEdges] = useState<Edge[]>(null);
    const lastGeneratedFrom = useRef<[network | undefined, number, number]>([undefined, -1, -1]) //network graph was made from, its index, the layer we were looking at
    useEffect(() => {
        const network = proj?.networks?.[editingNetwork]
        if (lastGeneratedFrom.current[0] === network && lastGeneratedFrom.current[2] === graphLayer) return
        const graphPositions = nodes ? Object.fromEntries(nodes.map(n => [n.id, n.position])) : {}
        //this means we closed the graph and must now apply positions
        if (!network && lastGeneratedFrom.current[0]) {
            const newDevices = lastGeneratedFrom.current[0].devices.map(s => ({...s, onGraphPosition: (graphPositions[s.name] || s.onGraphPosition)}))
            setProj(createSetStateAction(['networks', lastGeneratedFrom.current[1], 'devices'], newDevices))
        }
        lastGeneratedFrom.current = [network, editingNetwork, editingLayer]
        if (!network) return
        
        const edges: Edge[] = [], newNodes: Node[] = []
        for (let i = 0; i < network.devices.length; i++) {
            const device = network.devices[i];
            newNodes.push({
                id: device.name,
                position: graphPositions[device.name] || device.onGraphPosition,
                data: {
                    label: device.name,
                    index: i,
                    interfaces: device.interfaces //trim these a little?
                },
                draggable: true,
                type: FLOW_NODE_TYPES.NETWORK_DEVICE,
                width: 120,
                height: 50
            })
            const layer = proj.layers[graphLayer]
            
            for (let j = 0; j < device.interfaces.length; j++) {
                const layerInterface = device.interfaces[j].interfaces[graphLayer]
                if (!layerInterface) continue
                const layerConfig = layer.roles.find(r => r.name === layerInterface.automaton).inputs
                if (!layerConfig) continue
                Object.entries(layerConfig).forEach(([key, type]) => {
                    if (type !== INTERFACE_INPUT_TYPES.ADDRESS) return
                    const [targetDevice, targetInterface] = layerInterface.automatonConfig[key]?.split("§") || []
                    if (!targetDevice || !targetInterface) return
                    edges.push({
                        id: device.name+'§'+targetDevice+'§'+targetInterface,
                        source: device.name,
                        target: targetDevice,
                        label: key,
                        sourceHandle: " "+device.interfaces[j].name,
                        targetHandle: "T"+targetInterface,
                        type: 'NetworkRelationShipEdge',
                        markerEnd: { type: MarkerType.ArrowClosed }
                    })
                })
            }
        }

        setNodes(newNodes)
        setEdges(edges)
    }, [proj?.networks?.[editingNetwork]?.devices, editingLayer])

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

    const nodeTypes = {
        [FLOW_NODE_TYPES.NETWORK_DEVICE]: (props: any) => <NetworkDeviceNode {...props} openStateEditor={setEditingDevice}/>
    }
    const edgeTypes = {
        'NetworkRelationShipEdge': NetworkRelationShipEdge
    }

    const openPgss = () => {
        setPgssSimulationState(null)
        setPgssName('')
    }
    const startPgss = () => {
        const network = proj?.networks?.[editingNetwork]
        const layer = proj?.layers[0]
        if (!layer) return
        if (!network) return//error
        if (network.simulations.find(s => s.name === pgssName)) return notify("Simulation name must be unique")

        executePgss(
            network,
            layer,
            pgssName,
            setPgssSimulationState,
            (simulation) => {
                notify("Simulation successfully finished")
                setProj(createSetStateAction(['networks', editingNetwork, 'simulations', undefined], simulation))
                setPgssName(null)
            }
        )
    }
    const stopPgss = () => {
        pgssSimulationState?.abortFunction?.()
        setPgssSimulationState(null)
    }

    const executeSimulation = () => {

    }

    // console.log(edges, nodes);

    return <> { editingNetwork === null
        ? <EditList
            name="network"
            onAdd={newNetwork}
            items={proj.networks}
            enforceUniqueName={true}
            fontSize="2em"
            render={(network: network, ni) => <div key={network.name}>
                <Space style={{margin: '0.4em'}}>
                    <Typography.Text>
                        {network.name}
                    </Typography.Text>
                    <EditOutlined onClick={() => editNetwork(ni)}/>
                    <DeleteOutlined onClick={() => deleteNetwork(ni)} style={{color: '#c22'}}/>
                </Space>
            </div>}
        />
        : <>
            <Typography.Title style={{fontSize: '1.4em'}}>
                <Space>
                    <CloseOutlined onClick={() => setEditingNetwork(null)}/>
                    {proj.networks[editingNetwork].name}
                    <Popover content='Graph all possible sates of the top layer (application) protocol layer.'>
                        <Button onClick={openPgss}>Run PGSS</Button>
                    </Popover>
                    <Popover
                        content={<div>
                            Simulate selected devices and trace all the packets sent to them.<br/>
                            Opens a window for each device for you to control flow of packets
                        </div>}
                    >
                        <Button onClick={executeSimulation} disabled>Launch manual traversal</Button>
                    </Popover>
                    <Button 
                        onClick={() => {
                            const result = balanceGraphStepSpring(nodes, edges, {max: 100, until: 5})
                            setNodes(result.nodes.map(n => ({...n}))) //react flow doesn't update unless reference of individual nodes changes
                        }}
                        icon={<DragOutlined/>}
                    >Balance</Button>
                </Space>
            </Typography.Title>
            <ReactFlow
                style={{maxWidth: '100%', maxHeight: '80vh'}}
                nodes={nodes || []}
                edges={edges || []}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                fitView
            >
                <Controls  />
                <Space style={{position: 'absolute', zIndex: 10, top: '1em', left: '1em'}}>
                    <Button icon={<PlusOutlined/>} onClick={addNewDevice}>New device</Button>
                </Space>
                <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
            </ReactFlow>
            <DeviceEditorModal
                devices={proj?.networks?.[editingNetwork]?.devices}
                editingDevice={editingDevice}
                onSave={s => {
                    const prevName = proj?.networks?.[editingNetwork]?.devices?.[editingDevice]?.name
                    if (s.name !== prevName) s = {...s, onGraphPosition: (nodes.find(n => n.id === prevName)?.position || s.onGraphPosition)}
                    setProj(createSetStateAction(['networks', editingNetwork, 'devices', editingDevice], s))
                }}
                onDelete={deleteDevice}
                setEditingDevice={setEditingDevice}
                layers={proj?.layers}
            />
    </>}
        <Modal
            open={pgssName !== null}
            onOk={startPgss}
            onCancel={() => {
                if (pgssSimulationState) return
                setPgssName(null)
            }}
            title="Start a pgss simulation"
        >
            <Input value={pgssName} onChange={e => setPgssName(e.target.value)} placeholder="Simulation name"/>
        </Modal>
    </>;
}
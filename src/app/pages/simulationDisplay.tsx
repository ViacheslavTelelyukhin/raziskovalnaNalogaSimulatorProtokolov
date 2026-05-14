import React, { SetStateAction, useCallback, useEffect, useRef, useState } from "react";
import { device, deviceInterface, FLOW_NODE_TYPES, INTERFACE_INPUT_TYPES, layerInterface, network, project, simulationProgressType } from "../../types";
import { Button, Input, Modal, Popover, Space, Switch, Typography } from "antd/es";
import { CloseOutlined, DeleteOutlined, DragOutlined, EditOutlined, EyeOutlined, PlusOutlined } from "@ant-design/icons";
import { notify } from "../utils/notify";
import EditList from "../components/listEdit";
import { createSetStateAction } from "../utils/setStateAction";
import { applyNodeChanges, Edge, Node, EdgeChange, NodeChange, Connection, Position, ReactFlow, Controls, Background, BackgroundVariant } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import DeviceEditorModal from "../components/deviceEditor";
import { DirectedStraightEdge, NetworkDeviceNode, SystemStateNode } from "../components/nodes";
import { executePgss } from "../utils/executePgss";
import { balanceGraphStepSpring } from "../utils/graphBalanceSpring";

interface Props {
    proj: project,
    setProj: (p: SetStateAction<project>) => void,
    setPage: (page: string) => void,
}

export default function Simulations({proj, setPage, setProj}: Props) {

    const [nodes, setNodes] = useState<Node[]>(null);
    const [edges, setEdges] = useState<Edge[]>(null);
    const [displaying, setDisplaying] = useState<[number, number]>(null)
    const [balancing, setBalancing] = useState(false)
    const [balanced, setBalanced] = useState(false)
    
    const edit = (di: number, si: number) => {
        setDisplaying([di, si])
        const sim = proj.networks[di].simulations[si]
        setNodes(sim.nodes.map(node => ({...node, data: {...node.data, devices: sim.deviceOrder}}))) //don't save device order in each node for smaller archive
        setEdges(sim.edges)
    }
    const close = () => {
        const newNodes = nodes.map(node => ({...node, data: {...node.data, devices: undefined}}))
        setProj(createSetStateAction(['networks', displaying[0], 'simulations', displaying[1], 'nodes'], newNodes))
        setNodes(null)
        setEdges(null)
        setDisplaying(null)
    }
    const deleteSim = (di: number, si: number) => {
        setProj(createSetStateAction(['networks', di, 'simulations', si], undefined))
    }
    
    const onNodesChange = useCallback(
        (changes: NodeChange<Node>[]) => {
            setNodes((p: Node[]) => p && applyNodeChanges(changes, p))
            setBalanced(false)
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
        [FLOW_NODE_TYPES.SYSTEM_STATE]: SystemStateNode
    }

    useEffect(() => {
        if (!nodes || !balancing || balanced) return
        const i = setInterval(() => {
            const result = balanceGraphStepSpring(nodes, edges, {max: 1, until: 0})
            setNodes(result.nodes.map(n => ({...n}))) //react flow doesn't update unless reference of individual nodes changes
            if (result.movement < 4) setBalanced(true)
                console.log(result.movement);
                
        }, 100)
        return () => clearInterval(i)
    }, [nodes, balancing, balanced])

    // console.log(edges, nodes);

    return <> { displaying === null
        ? proj.networks.flatMap((d, di) => d.simulations.map((s, si) =>
            <div key={d.name+"§"+s.name}>
                <Space style={{margin: '0.4em'}}>
                    <Typography.Text>
                        {d.name +"-"+ s.name}
                    </Typography.Text>
                    <EyeOutlined onClick={() => edit(di, si)}/>
                    <DeleteOutlined onClick={() => deleteSim(di, si)} style={{color: '#c22'}}/>
                </Space>
            </div>
        ))
        : <>
            <Typography.Title style={{fontSize: '1.4em'}}>
                <Space>
                    <CloseOutlined onClick={() => close()}/>
                    {proj.networks[displaying[0]].simulations[displaying[1]].name}
                    <Button 
                        onClick={() => {
                            const result = balanceGraphStepSpring(nodes, edges, {max: 100, until: 5})
                            setNodes(result.nodes.map(n => ({...n}))) //react flow doesn't update unless reference of individual nodes changes
                        }}
                        icon={<DragOutlined/>}
                    >Balance once</Button>
                    <Switch 
                        onChange={setBalancing}
                        value={balancing}
                    />Balance continuos
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
                edgeTypes={{'straight': DirectedStraightEdge}}
                fitView
            >
                <Controls  />
                <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
            </ReactFlow>
    </>}
    </>;
}
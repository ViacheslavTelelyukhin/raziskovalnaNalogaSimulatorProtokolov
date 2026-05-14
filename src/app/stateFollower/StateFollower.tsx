import React, { useEffect, useReducer, useState } from "react";
import { automaton, deviceInterface, ETHERTYPES, FLOW_NODE_TYPES, IPC_METHODS, layerInterface, project, protocolLayer, windowWithApi } from "../../types";
import { decapsulatePacket, hexStringToArrayBuffer } from "../utils/decapsulate";
import decapDefaults from "./L1-L4Decap.json";
import { Divider, Popover, Typography } from "antd/es";
import { getFn } from "../utils/parseFn";
import { Background, BackgroundVariant, Controls, Edge, Node, ReactFlow } from "@xyflow/react";
import { AutomatonStateNode, DirectedStraightEdge } from "../components/nodes";
import '@xyflow/react/dist/style.css';
import { DownOutlined, UpOutlined } from "@ant-design/icons";

const l2l3decap: project = decapDefaults as any

type packet = {
  raw: string,
  decap: any
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

function renderEntries(obj:packet, depth: number) {
  if (!obj) return
  return Object.entries(obj).map((entry, i) => entry[0] === "_SIZES" ? null :
    <div key={depth+"_"+i} style={{marginLeft: '1em', wordWrap: 'break-word'}}>
      <span>{entry[0]}: </span>
      {typeof entry[1] !== 'object'
        ? entry[1]
        : entry[1] instanceof Uint8Array
          ? <span>{(entry[1] as any).toHex()}</span>
          : <div>{renderEntries(entry[1] as any, depth+1)}</div>
      }
    </div>
  )
}

//takes a role and the top layer packet. moves the index
const createMoveAction = (role: automaton, packet: any, from: string, received: boolean) => {
  //console.log(role, packet, from, received);
  return (cur: number) => {
    const state = role.states[cur]
    let moveToIdx = -1
    if (received) {
      const validReceive = state.receive.find(transition => transition.on === from && transition.frame == packet?._CONTENT?._NAME)
      moveToIdx = role.states.findIndex(s => s.name === validReceive?.moveTo)
    } else {
      const validSend = state.send.find(transition => transition.on === from && transition.frame == packet?._CONTENT?._NAME)
      moveToIdx = role.states.findIndex(s => s.name === validSend?.moveTo)
    }
    if (moveToIdx !== -1) return moveToIdx
    else return cur
  }
}

const parseIpNotation = (hex: string) => {
  const ret: string[] = []
  for (let i = 0; i < 8; i+=2)
    ret.push(parseInt(hex.slice(i, i+2), 16).toString())
  return ret.join('.')
}

function getAllSizeEntries(packet:any) {
  if (!packet?._SIZES) return []
  const contentIdx = packet._SIZES.findIndex((e: string) => e[0] === '_CONTENT')
  if (contentIdx === -1) return packet._SIZES
  const sizes = packet._SIZES.concat()//they took toSpliced() (((((((
  sizes.splice(contentIdx, 1, ...getAllSizeEntries(packet._CONTENT))
  return sizes
}

export default function StateFollower() {
  const [packets, setPackets] = useState<packet[]>([])
  const [openPackets, setOpenPackets] = useState<number[]>([])
  const [tracing, setTracing] = useState<{
    tracing: {
      automaton: layerInterface[]
      filter: string
      ip: string
      name: string
      port: number
      etherType: ETHERTYPES
    },
    layers: protocolLayer[],
    devices: deviceInterface[]
  } | null>(null)


  const [interfaceState, setInterfaceState] = useState<number>(0)
  const topLayerRole = tracing?.tracing.automaton[0].automaton
  const roles = tracing?.layers?.[0]?.roles
  const role = roles?.find(r => r.name === topLayerRole)
  
  //effect for attaching tracers
  useEffect(() => {
    const w: windowWithApi = (window as windowWithApi)
    let onPacket
    
    if ((tracing?.tracing.etherType === undefined) || !role) onPacket = () => {}; //discard packet if can't parse it
    else onPacket = (packet: string) => {
      let cur, parsed: any;
      const packetData = (Uint8Array as any).fromHex(packet)
      parsed = decapsulatePacket(packetData, l2l3decap.layers[l2l3decap.layers.length-1].frames[0]);
      cur = parsed
      for (let i = l2l3decap.layers.length-2; i >= 0; i--) {
        const layer = l2l3decap.layers[i];
        let frameType = 0
        if (layer.determineFrameType) {
          const name = getFn(layer.determineFrameType)?.({
            outer: cur,
            etherType: tracing?.tracing.etherType
          })
          
          frameType = layer.frames.findIndex(f => f.name === name)
          if (frameType === -1) break;
        }
        cur._CONTENT = decapsulatePacket(cur._CONTENT, layer.frames[frameType]);
        cur = cur._CONTENT;
      }

      for (let i = tracing.layers.length-1; i >= 0; i--) {
        const layer = tracing.layers[i];
        let frameType = 0
        if (layer.determineFrameType) {
          try {
            const name = getFn(layer.determineFrameType)?.({
              outer: cur,
              etherType: tracing?.tracing.etherType
            })
            frameType = layer.frames.findIndex(f => f.name === name)
            if (frameType === -1) break;
          } catch (e) {
            console.log("User function got an error", e, layer.determineFrameType, {
              outer: cur,
              etherType: tracing?.tracing.etherType
            });
          }
        }
        
        cur._CONTENT = decapsulatePacket(cur._CONTENT, layer.frames[frameType]);
        //if a toplayer packet is detected handle the state change
        if (i==0) {
          //determines the role of who the packet was received and sent form
          // this is done through ip configs
          let srcIP, destIp, srcPort, destPort;
          const ipPacket = parsed?._CONTENT?._CONTENT
          srcIP = ipPacket?.Source
          destIp = ipPacket?.Destination
          //convert to notation
          if (srcIP) srcIP = parseIpNotation(srcIP)
          if (destIp) destIp = parseIpNotation(destIp)

          const transportPacket = ipPacket?._CONTENT
          destPort = transportPacket?.['dest port']
          srcPort = transportPacket?.['source port']

          //console.log(srcIP, destIp, srcPort, destPort);
          const isSource = tracing.tracing.ip == srcIP && tracing.tracing.port == srcPort
          const isDest = tracing.tracing.ip == destIp && tracing.tracing.port == destPort
          //if what we are tracking isn't involved its an error
          //if it's both we drop the packet anyway because we don't know what to do with it. Application does not support this
          if (isSource !== isDest) {
            // console.log(isDest ? 'We are dest' : "We are source");
            // console.log(tracing.devices, tracing.tracing.automaton[0].automatonConfig);
            const otherIp = isDest ? srcIP : destIp, otherPort = isDest ? srcPort : destPort
            const gotFromDevice = tracing.devices.find(d => d.ipConfig.addr === otherIp && d.ipConfig.port == otherPort)
            //if we don't recognise the device drop the packet
            if (gotFromDevice) {
              //console.log(gotFromDevice);
              const roleEntry = Object.entries(tracing.tracing.automaton[0].automatonConfig).find(e => e[1] === gotFromDevice.name)
              if (roleEntry) {
                const otherRole = roleEntry[0]
                setInterfaceState(createMoveAction(role, cur, otherRole, isDest))
              }
            }
          }
        }
        cur = cur._CONTENT;
      }
      
      setPackets(prev => [...prev, {raw: packet, decap: parsed}])
    }
    const offPacket = w.api.on('packets', onPacket)

    if(!tracing) w.api.invoke(IPC_METHODS.GET_TRACING).then(dat => {
      setTracing(dat)
    })

    return () => {
      offPacket()
    }
  }, [tracing])

  //effect for drawing graph
  const [nodes, setNodes] = useState<Node[]>(null);
  const [edges, setEdges] = useState<Edge[]>(null);
  useEffect(() => {
    if (!role) return
    const automaton = role
    
    const edges: Edge[] = [], newNodes: Record<string, Node> = {}
    const incomingEdges: Record<string, number> = {}
    for (let i = 0; i < automaton.states.length; i++) {
        const state = automaton.states[i];
        
        newNodes[state.name] = ({
            id: state.name,
            position: state.onGraphPosition,
            data: {
                label: state.name,
                sii: i,
                sendCt: state.send.length,
                recvCt: state.receive.length,
                style: i===interfaceState?{fontWeight: 800, background: '#edfffe'}:null
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
                }))
            }
            for (let j = 0; j < state.receive?.length; j++) {
                const receive = state.receive[j];
                edges.push(createEdge({
                    source: state.name,
                    target: receive.moveTo,
                    label: `+${receive.frame}(${receive.on})`,
                }))
            }
        }
    }

    setNodes(Object.values(newNodes).map(n => ({...n, data: {...n.data, targetHandles: incomingEdges[n.id]}})))
    setEdges(edges)
  }, [role, interfaceState])

  const nodeTypes = {
    [FLOW_NODE_TYPES.AUTOMATON_STATE]: (props: any) => <AutomatonStateNode {...props} openStateEditor={() => {}}/>
  }
  const edgeTypes = {
    'DirectedStraightEdge': DirectedStraightEdge
  }

  return (<div>
    <Typography.Title>{tracing?.tracing?.name || "State follower"}</Typography.Title>
    <Typography.Paragraph>Address: {tracing?.tracing.ip + ':' + tracing?.tracing.port}</Typography.Paragraph>
    <Typography.Paragraph>Pcap filter: {tracing?.tracing.filter}</Typography.Paragraph>
    <Typography.Paragraph>Layer 2 encapsulation#: {tracing?.tracing.etherType !== undefined ? (ETHERTYPES[tracing?.tracing.etherType] || <Popover content={"If the ethertype shows up as a number thet means the application does not know how to decapsulate it. Add the frame as a protocol layer in your own project. (as well as all ecapsulated layers)"}>{tracing?.tracing.etherType}</Popover>) : "Waiting..."} (see here: https://www.tcpdump.org/linktypes.html)</Typography.Paragraph>
    {nodes && edges && <div style={{height: '40vh'}}><ReactFlow
      nodes={nodes}
      edges={edges}
      style={{maxWidth: '88%', maxHeight: '40vh', margin: 'auto'}}
      // onNodesChange={onNodesChange}
      // onEdgesChange={onEdgesChange}
      // onConnect={onConnect}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      fitView
    >
      <Controls />
      <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
    </ReactFlow></div>}
    <div>
      {packets.map((p, i) => <div key={(i)+'_packet'}>
        {openPackets.includes(i) ? <>
          <UpOutlined key={(i)+'_hide'} style={{margin: '0 0.5em', color: 'red'}} onClick={() => setOpenPackets(p => p.filter(n => n!==i))}/>
          <Typography.Paragraph key={(i)+'_raw'} style={{wordWrap: 'break-word'}}>
            Packet HEX: <br/>
            <div style={{display: 'grid', gridTemplateColumns: '20% repeat(4, 20%)', gap: '12px'}}>
              <div></div>
              {(() => {
                //const colors= ['#3fa', '#a3f', "#fa3", "#f3a"]
                const ret = []
                let curi = 0, allSizes = getAllSizeEntries(p.decap), rem = allSizes[0][1]
                
                for (let j = 0; j < 32; j+=8) {
                  ret.push(<div key={j+"hdr"}>{j}</div>)
                }
                for (let i = 0; i < p.raw.length; i+=8) {
                  ret.push(<div key={i+"_i"}>0x{i.toString(16)}</div>)
                  for (let j = i; j < p.raw.length && j < i+8; j+=2) {
                    rem -= 8;
                    while (rem < 0) {
                      curi++
                      rem += (allSizes[curi]?.[1]) ?? Infinity
                    }
                    ret.push(<div key={j} data-tooltip={allSizes[curi]?.[0] || ''} className="showTooltipFast">{p.raw.substring(j, j+2)}</div>)
                  }
                }
                return ret
              })()}
            </div>
          </Typography.Paragraph>
          <Typography.Paragraph key={(i)+'_values'} style={{wordWrap: 'break-word'}}>
            {renderEntries(p.decap, 0)}
          </Typography.Paragraph>
        </> : <DownOutlined key={(i)+'_reveal'} onClick={() => setOpenPackets(p => [...p, i])} style={{margin: '0 0.5em', color: 'red'}}/>
        }
        <Divider key={(i)+'_divider'}/>
      </div>
      )}
    </div>
  </div>
  );
}
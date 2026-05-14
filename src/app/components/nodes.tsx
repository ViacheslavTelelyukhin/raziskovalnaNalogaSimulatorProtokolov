import { EdgeLabelRenderer, getStraightPath, Handle, Position } from "@xyflow/react";
import React, { useCallback } from "react";
import { deviceInterface } from "../../types";

export function AutomatonStateNode(props: any) {
    const data = props.data
    // console.log(props);
    
    const openStateEditor: (sii: number) => void = props.openStateEditor
    return (<>
        <div className="automaton-state-node" onClick={() => openStateEditor(data.sii)} style={data.style}>
            {data.label}
            <Handle style={{top: '50%', left: '50%', zIndex: -4}} type="source" position={Position.Top}/>
            <Handle style={{top: '50%', left: '50%', zIndex: -4}} type="target" position={Position.Top}/>
        </div>
    </>
    );
}

export function NetworkDeviceNode(props: any) {
    const data = props.data
    // console.log(data);
    
    const openStateEditor: (sii: number) => void = props.openStateEditor
    return (<>
        <div className="automaton-state-node hoverAbleNode" onClick={() => openStateEditor(data.index)}>
            {data.label}
            {/* use many handles so it's future proof if we ever actually need them */}
            {(() => {
                const handles = []
                for (let i = 0; i < data.interfaces.length; i++) {
                    const dif: deviceInterface = data.interfaces[i]
                    handles.push(<Handle
                        isConnectable={false}
                        draggable={false}
                        key={'ifT'+(dif.name)}
                        type="target"
                        id={"T"+dif.name}
                        position={dif.position}
                        style={{...(
                            [Position.Bottom, Position.Top].includes(dif.position)
                            ? {left: dif.offset}//, ...(dif.position === Position.Bottom ? {bottom: 10} : {top: 10})}
                            : {top: dif.offset}//, ...(dif.position === Position.Left ? {left: 10} : {right: 10})}
                        )}}
                    />, <Handle
                        isConnectable={false}
                        draggable={false}
                        key={'ifS'+(dif.name)}
                        type="source"
                        id={" "+dif.name}
                        position={dif.position}
                        style={{...(
                            [Position.Bottom, Position.Top].includes(dif.position)
                            ? {left: dif.offset}//, ...(dif.position === Position.Bottom ? {bottom: -10} : {top: -10})}
                            : {top: dif.offset}//, ...(dif.position === Position.Left ? {left: -10} : {right: -10})}
                        )}}
                        className="hasAfter"
                    />)
                }
                // console.log(handles);
                
                return handles
            })()}
        </div>
    </>
    );
}

export function SystemStateNode(props: any) {
    const data = props.data
    const deviceOrder = data.devices
    // console.log(props);
    return (<>
        <div className="automaton-state-node">
            {(() => {
                let index = 0, ret: any[] = [];
                const interfaceNames = data.label.split("§")
                deviceOrder.forEach((d: [string, number], i: number) => {
                    ret.push(<div key={i} style={i !== deviceOrder.length-1 ? {borderBottom: 'black solid'} : {}}>
                        <div style={{textAlign: 'left'}}>{d[0]}:</div>
                        {interfaceNames.slice(index, index+d[1]).map((ifState: string, i: number) =>
                            <div key={i}>{ifState}</div>
                        )}
                    </div>)
                    index += d[1]
                })
                return ret
            })()}
            <Handle style={{top: '50%', left: '50%', zIndex: -4}} type="source" position={Position.Top}/>
            <Handle style={{top: '50%', left: '50%', zIndex: -4}} type="target" position={Position.Top}/>
        </div>
    </>
    );
}

import {
  getBezierPath,
  useStore,
  BaseEdge,
  type EdgeProps,
  type ReactFlowState,
} from '@xyflow/react';
 
export type GetSpecialPathParams = {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
};
 
export const getSpecialPath = (
  { sourceX, sourceY, targetX, targetY }: GetSpecialPathParams,
  offset: number,
) => {
    const centerX = (sourceX + targetX) / 2;
    const centerY = (sourceY + targetY) / 2;
    
    return [`M ${sourceX} ${sourceY} Q ${centerX} ${
        centerY + offset
    } ${targetX} ${targetY}`, centerX, centerY+offset/2];
};
 
export function NetworkRelationShipEdge({
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  label
}: EdgeProps) {
    const isBiDirectionEdge = useStore((s: ReactFlowState) => {
        const edgeExists = s.edges.some(
        (e) =>
            (e.source === target && e.target === source) ||
            (e.target === source && e.source === target),
        );
        return edgeExists;
    });
    
    const edgePathParams = {
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    };
    
    let path = '', labelX, labelY;
    
    if (isBiDirectionEdge) {
        [path, labelX, labelY] = getSpecialPath(edgePathParams, sourceX < targetX ? 50 : -50) as any;
    } else {
        [path, labelX, labelY] = getStraightPath(edgePathParams);
    }
    
    return <>
        <BaseEdge path={path} markerEnd={markerEnd} />
        <EdgeLabelRenderer>
            <div
                className="button-edge__label nodrag nopan"
                style={{
                    transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                    position: 'absolute',
                    transformOrigin: 'center',
                    background: 'white',
                }}
            >
                <div>
                    {label}
                </div>
            </div>
        </EdgeLabelRenderer>
    </>
}

export function DirectedStraightEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  label
}: EdgeProps) {
    const edgePathParams = {
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    }
    let [path, labelX, labelY] = getStraightPath(edgePathParams);
    
    return <>
        <BaseEdge path={path} markerEnd={markerEnd} />
        <EdgeLabelRenderer>
            <div
                className="button-edge__label nodrag nopan"
                style={{
                    transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                    position: 'absolute',
                    transformOrigin: 'center',
                    background: 'white',
                }}
            >
                {label}
            </div>
            <div
                className="button-edge__label nodrag nopan"
                style={{
                    position: 'absolute',
                    transformOrigin: 'center',
                    background: '#b1b1b7',
                    offsetPath: `path('${path}')`,
                    offsetRotate: 'auto',
                    offsetAnchor: 'center',
                    offsetDistance: '33%',
                    clipPath: 'polygon(0% 0%, 70% 0%, 100% 50%, 70% 100%, 0% 100%, 30% 50%)',
                    display: 'inline-block',
                    minWidth: '0.7em',
                    minHeight: '0.5em'
                }}
            >
            </div>
            <div
                className="button-edge__label nodrag nopan"
                style={{
                    position: 'absolute',
                    transformOrigin: 'center',
                    background: '#b1b1b7',
                    offsetPath: `path('${path}')`,
                    offsetRotate: 'auto',
                    offsetAnchor: 'center',
                    offsetDistance: '66%',
                    clipPath: 'polygon(0% 0%, 70% 0%, 100% 50%, 70% 100%, 0% 100%, 30% 50%)',
                    display: 'inline-block',
                    minWidth: '0.7em',
                    minHeight: '0.5em'
                }}
            >
            </div>
        </EdgeLabelRenderer>
    </>
}

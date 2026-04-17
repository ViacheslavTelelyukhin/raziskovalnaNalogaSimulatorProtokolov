import React, { useEffect, useState } from "react";
import { automaton, automatonAction, automatonChangeStateTrigger, automatonState, frame, logicEdgeDescriptionType, TRIGGER_TYPES } from "../../types";
import { Button, Input, Modal, Select, Space, Typography } from "antd/es";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { notify } from "../utils/notify";
import { createSetStateAction } from "../utils/setStateAction";
import '@xyflow/react/dist/style.css';

interface Props {
    frames: frame[]
    role: automaton
    onSave: (s: automatonState) => void
    onDelete: () => void
    editingState: number
    setEditingState: (s: number) => void
    onSwap: () => void
}

const addId = (a: any[]) => a.map(i => ({...i, id: Math.random().toString()}))
const remId = (a: any[]) => a.map(i => ({...i, id: undefined}))

export default function StateEditorModal({role, editingState, onSave, setEditingState, frames, onDelete, onSwap}: Props) {
    const [name, setName] = useState(null)
    const [send, setSend] = useState([{frame: undefined, on: undefined, moveTo: undefined}])
    const [recv, setRecv] = useState([{frame: undefined, on: undefined, moveTo: undefined}])
    const [trig, setTrig] = useState([{value: '', type: TRIGGER_TYPES.TIMEOUT, moveTo: undefined}])
    const [logics, setLogics] = useState([{when: '', moveTo: undefined}])
    const [logicFunction, setLogicFunction] = useState<string>(null)

    const state = role?.states?.[editingState]
    useEffect(() => {
        setName(state?.name)
        setSend(addId([...(state?.send || []), {frame: undefined, on: undefined, moveTo: undefined}]))
        setRecv(addId([...(state?.receive || []), {frame: undefined, on: undefined, moveTo: undefined}]))
        setTrig([...(state?.triggers || []), {value: '', type: TRIGGER_TYPES.TIMEOUT, moveTo: undefined}])
        setLogics([...(state?.logic?.description || []), {when: '', moveTo: undefined}])
        setLogicFunction(state?.logic?.func || null)
    }, [state])

    const save = () => {
        onSave({
            ...state,
            name,
            send: remId(send.slice(0, -1)),
            receive: remId(recv.slice(0, -1)),
            triggers: trig.slice(0, -1),
            logic: (logicFunction !== null) ? {
                func: logicFunction,
                description: logics.slice(0, -1)
            } : undefined
        })
    }
    const close = () => {
        save()
        setEditingState(null)
    }

    const newSend = () => {
        const toAdd = send[send.length-1]
        if (!toAdd.frame || !toAdd.moveTo || !toAdd.on) return notify("Must set all values before adding an edge")
        setSend(p => [...p, {frame: undefined, on: undefined, moveTo: undefined, id: Math.random()}])
    }
    const newRecv = () => {
        const toAdd = recv[recv.length-1]
        if (!toAdd.frame || !toAdd.moveTo || !toAdd.on) return notify("Must set all values before adding an edge")
        setRecv(p => [...p, {frame: undefined, on: undefined, moveTo: undefined, id: Math.random()}])
    }
    const remSend = (i: number) => {
        setSend(p => [...p.slice(0, i), ...p.slice(i+1)])
    }
    const remRecv = (i: number) => {
        setRecv(p => [...p.slice(0, i), ...p.slice(i+1)])
    }

    return <Modal
        title={'Edit automaton state'}
        open={editingState!==null}
        onOk={close}
        onCancel={close}
        footer={(e, a)=> <Space>
            <Button onClick={() => {onDelete(); setEditingState(null)}} danger type="primary">Delete state</Button>
            <Button onClick={() => {save(); onSwap(); setEditingState(null)}}>Set as initial state</Button>
            <a.OkBtn/>
        </Space>}
        width={'84%'}
    >
        <Input placeholder="name" value={name} onChange={e => {
            if(!(role?.states.find(s => (s.name === e.target.value)))) setName(e.target.value)
        }}/>
        <EdgeList
            name="send"
            items={send}
            addNew={newSend}
            remove={remSend}
            columns={{
                moveTo: (e, i) => <Select
                    key={'SN'+i}
                    placeholder="next state"
                    style={{width: '30%'}}
                    popupMatchSelectWidth={false}
                    options={[...role.states.slice(0, editingState), ...role.states.slice(editingState+1)].map(s => ({value: s.name, label: s.name}))}
                    value={e}
                    onChange={v => setSend(createSetStateAction([i, 'moveTo'], v))}
                />,
                on: (e, i) => <Select
                    key={'SA'+i}
                    placeholder="address to send to (input role)"
                    style={{width: '30%'}}
                    popupMatchSelectWidth={false}
                    options={Object.keys(role.inputs).map(k => ({value: k, label: k}))}
                    value={e}
                    onChange={v => setSend(createSetStateAction([i, 'on'], v))}
                />,
                frame: (e, i) => <Select
                    key={'SF'+i}
                    placeholder="frame to send"
                    style={{width: '30%'}}
                    popupMatchSelectWidth={false}
                    options={frames.map(k => ({value: k.name, label: k.name}))}
                    value={e}
                    onChange={v => setSend(createSetStateAction([i, 'frame'], v))}
                />,
            }}
        />
        <EdgeList
            name="receive"
            items={recv}
            addNew={newRecv}
            remove={remRecv}
            columns={{
                moveTo: (e, i) => <Select
                    key={'RN'+i}
                    placeholder="next state"
                    style={{width: '30%'}}
                    popupMatchSelectWidth={false}
                    options={[...role.states.slice(0, editingState), ...role.states.slice(editingState+1)].map(s => ({value: s.name, label: s.name}))}
                    value={e}
                    onChange={v => setRecv(createSetStateAction([i, 'moveTo'], v))}
                />,
                on: (e, i) => <Select
                    key={'RA'+i}
                    placeholder="address to receive from (input role)"
                    style={{width: '30%'}}
                    popupMatchSelectWidth={false}
                    options={Object.keys(role.inputs).map(k => ({value: k, label: k}))}
                    value={e}
                    onChange={v => setRecv(createSetStateAction([i, 'on'], v))}
                />,
                frame: (e, i) => <Select
                    key={'RF'+i}
                    placeholder="frame type"
                    style={{width: '30%'}}
                    popupMatchSelectWidth={false}
                    options={frames.map(k => ({value: k.name, label: k.name}))}
                    value={e}
                    onChange={v => setRecv(createSetStateAction([i, 'frame'], v))}
                />,
            }}
        />
    </Modal>;
}

interface EdgeListProps {
    name: string
    items: (automatonChangeStateTrigger | logicEdgeDescriptionType | automatonAction)[]
    columns: Record<string, (val: any, i: number) => React.JSX.Element>
    addNew: () => void
    remove: (i: number) => void
}
const EdgeList = ({name, items, columns, addNew, remove}: EdgeListProps) => {
    return <div>
        <Typography.Title style={{fontSize: '1.6em'}}>{name}</Typography.Title>
        {items.slice(0, -1)?.map((item: any, i) =>
            <Space.Compact style={{width: '100%'}} key={item.id}>
                {Object.keys(item).map(k => k==='id'?null:columns[k](item[k], i))}
                <Button onClick={() => remove(i)} icon={<DeleteOutlined/>} style={{width: '10%'}} danger></Button>
            </Space.Compact>
        )}
        <br/>
        New:
        <br/>
        <Space.Compact style={{width: '100%'}}>
            {Object.keys(items[items.length-1]).map(k => k==='id'?null:columns[k]((items[items.length-1] as any)[k], items.length-1))}
            <Button onClick={addNew} icon={<PlusOutlined/>} style={{width: '10%'}}></Button>
        </Space.Compact>
    </div>
}
import React, { useEffect, useState } from "react";
import { device, deviceInterface, INTERFACE_INPUT_TYPES, layerInterface, protocolLayer } from "../../types";
import { Button, Checkbox, Input, Modal, Popover, Select, Space, Typography } from "antd/es";
import { DeleteOutlined, DownOutlined, PlusOutlined, UpOutlined } from "@ant-design/icons";
import { notify } from "../utils/notify";
import { createSetStateAction } from "../utils/setStateAction";
import '@xyflow/react/dist/style.css';
import { Position } from "@xyflow/react";
import EditList from "./listEdit";

interface Props {
    layers: protocolLayer[],
    devices: device[],
    onSave: (s: device) => void,
    onDelete: () => void,
    editingDevice: number,
    setEditingDevice: (s: number) => void
}

const addId = (a: any[]) => a.map(i => ({...i, id: Math.random().toString()}))
const remId = (a: any[]) => a.map(i => ({...i, id: undefined}))

export default function DeviceEditorModal({devices, onSave, layers, setEditingDevice, editingDevice, onDelete}: Props) {
    const device = devices?.[editingDevice]
    const [name, setName] = useState(null)
    const [ownedByApp, setOwnedByApp] = useState(null)
    const [interfaces, setInterfaces] = useState<deviceInterface[]>(null)
    const [editingInterface, setEditingInterface] = useState<number>(null)

    const newInterface = (name: string) => {
        setInterfaces(createSetStateAction([undefined], {
            name,
            position: Position.Right,
            offset: 0,
            interfaces: layers.map(l => ({protocolLayer: l.name, automaton: l.roles?.[0].name||'', automatonConfig: {}})).reverse(),
            ipConfig: {
                addr: '127.0.0.1',
                port: 10000,
                v: 4
            }
        } as deviceInterface))
    }
    const editDeviceInterface = (ii: number, key: keyof deviceInterface, value: any) => {
        setInterfaces(createSetStateAction([ii, key], value))
    }
    const deleteDeviceInterface = (ii: number) => {
        setInterfaces(createSetStateAction([ii], undefined))
    }
    const editLayerInterface = (ii: number, li: number, key: keyof layerInterface, value: any) => {
        setInterfaces(createSetStateAction([ii, 'interfaces', li, key], value))
    }

    useEffect(() => {
        if (!device) setEditingInterface(null)
        setName(device?.name)
        setOwnedByApp(device?.ownedByApp)
        setInterfaces(addId(device?.interfaces || []))
    }, [device])

    const close = () => {
        onSave({
            ...device,
            name,
            interfaces: remId(interfaces).map((dif: deviceInterface) => ({
                ...dif,
                offset: isNaN(parseInt(dif.offset as any as string)) ? 0 : parseInt(dif.offset as any as string),
                ipConfig: {
                    ...dif.ipConfig,
                    port: isNaN(parseInt(dif.ipConfig.port as any as string)) ? 10000 : parseInt(dif.ipConfig.port as any as string),
                }
            })),
            config: {},
            ownedByApp
            // send: remId(send.slice(0, -1)),
            // receive: remId(recv.slice(0, -1)),
        })
        setEditingDevice(null)
    }

    return <Modal
        title={'Edit device state'}
        open={editingDevice !== null}
        onOk={close}
        onCancel={close}
        footer={(e, a)=> <Space><Button onClick={() => {onDelete(); setEditingDevice(null)}} danger type="primary">Delete device</Button><a.OkBtn/></Space>}
        width={'84%'}
    >
        <Input placeholder="name" value={name} onChange={e => {
            if(!(devices.find(d => (d.name === e.target.value)))) setName(e.target.value)
        }}/>
        Should this device be simulated by app when manually traversing protocol state?
        <Checkbox
            checked={ownedByApp}
            onChange={c => setOwnedByApp(c.target.checked)}
        />
        <EditList
            name="interface"
            onAdd={newInterface}
            enforceUniqueName={true}
            items={interfaces}
            render={(dif: deviceInterface, difI) => <div key={dif.name}>
                <Space style={{margin: '0.4em'}}>
                    <Typography.Text>
                        {dif.name}
                    </Typography.Text>
                    {(editingInterface === difI)
                        ? <UpOutlined onClick={() => setEditingInterface(null)}/>
                        : <DownOutlined onClick={() => setEditingInterface(difI)}/>
                    }
                    <Button onClick={() => deleteDeviceInterface(difI)} danger><DeleteOutlined/></Button>
                </Space>
                {editingInterface !== difI ? null : <div>
                    Transport config for simulation:
                    <Space.Compact style={{width: '100%'}}>
                        <Select
                            value={dif.ipConfig.v}
                            style={{width: '20%'}}
                            onChange={v => editDeviceInterface(editingInterface, 'ipConfig', {...dif.ipConfig, v})}
                            options={[
                                {value: 4, label: 'IPv4'},
                                {value: 6, label: 'IPv6 (developing)', disabled: true},
                            ]}
                        />
                        <Input
                            placeholder={"Actual address"}
                            onChange={v => editDeviceInterface(editingInterface, 'ipConfig', {...dif.ipConfig, addr: v.target.value})}
                            style={{width: '50%'}}
                            value={dif.ipConfig.addr}
                        />
                        <Input
                            placeholder={"Actual port"}
                            onChange={v => editDeviceInterface(editingInterface, 'ipConfig', {...dif.ipConfig, port: v.target.value})}
                            style={{width: '30%'}}
                            value={dif.ipConfig.port}
                        />
                    </Space.Compact>
                    Drawing:
                    <Space.Compact style={{width: '100%'}}>
                        {/* this should be made better looking or removed later */}
                        <Select
                            value={dif.position}
                            style={{width: '30%'}}
                            onChange={v => editDeviceInterface(editingInterface, 'position', v)}
                            options={[
                                {value: Position.Top, label: 'Top'},
                                {value: Position.Bottom, label: 'Bottom'},
                                {value: Position.Left, label: 'Left'},
                                {value: Position.Right, label: 'Right'},
                            ]}
                        />
                        <Input
                            placeholder={[Position.Top, Position.Bottom].includes(dif.position) ? "Offset from left" : "Offset from top"}
                            onChange={v => editDeviceInterface(editingInterface, 'offset', v.target.value)}
                            style={{width: '70%'}}
                            value={dif.offset}
                        />
                    </Space.Compact>
                    <Typography.Title style={{fontSize: '1.2em'}}>Layers:</Typography.Title>
                    {interfaces[editingInterface].interfaces.map((lif, lifI) => {
                        const layer = layers.find(l => l.name === lif.protocolLayer)
                        const automaton = layer?.roles?.find(r => r.name === lif.automaton)
                        return layer
                        ? <div key={lif.protocolLayer}>
                            <Typography.Text>{lif.protocolLayer}:</Typography.Text>
                            <div style={{paddingLeft: '1em', padding: '0.2em', borderLeft: 'solid #00000040 2px'}}>
                                Interface role: <Select
                                    value={lif.automaton}
                                    options={layer?.roles.map(r => ({
                                        value: r.name,
                                        label: r.name
                                    })) || []}
                                    notFoundContent={'Invalid protocol layer name of empty protocol layer (delete device interface and create it again)'}
                                />
                                <br/>
                                Interface config:
                                {automaton ? Object.entries(automaton.inputs).map(([key, type]) => <div key={key}>
                                    <Typography.Text>{key}: </Typography.Text>
                                    {type === INTERFACE_INPUT_TYPES.ADDRESS
                                        ? <Select
                                            style={{width: '40%'}}
                                            popupMatchSelectWidth={false}
                                            value={lif.automatonConfig[key]}
                                            onChange={v => editLayerInterface(difI, lifI, 'automatonConfig', {...lif.automatonConfig, [key]: v})}
                                            options={devices.flatMap(d =>
                                                // d === devices[editingDevice] ? [] : 
                                                d.interfaces.filter(fDif =>
                                                    //an interface may not talk to itself
                                                    !((d.name === devices[editingDevice].name) && (fDif.name === dif.name)) &&
                                                    fDif.interfaces.find(fLif => fLif.protocolLayer === lif.protocolLayer)
                                                ).map(
                                                    fDif => ({
                                                        label: d.name+" - "+fDif.name,
                                                        value: d.name+"§"+fDif.name //todo forbid § symbols form names
                                                    })
                                                )
                                            )}
                                            
                                        />
                                        : "Under development"
                                    }
                                </div>) : "Select a valid interface role before configuring"}
                            </div>
                        </div>
                        : ("Could not find a layer named "+lif.protocolLayer+" in this project. This network will not work, either create the layer or recreate this device interface")})}
                </div>}
            </div>}
        />
    </Modal>;
}
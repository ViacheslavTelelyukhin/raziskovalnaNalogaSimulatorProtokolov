import React, { SetStateAction, useEffect, useState } from "react";
import { IPC_METHODS, project, windowWithApi } from "../../types";
import { Button, Input, Popover, Space, Typography, Upload } from "antd/es";
import { PlusOutlined, ImportOutlined, DownOutlined, EditOutlined, UpOutlined } from "@ant-design/icons";
import { validateOrReject } from "class-validator";
import { notify } from "../utils/notify";
import { readFileUtil, saveFile } from "../utils/file";
import { plainToClass } from "class-transformer";

interface Props {
    onAdd: (name: string) => void,
    // onRemove: (index: number) => void,
    items: any[],
    render: (a: any, i?: number) => React.JSX.Element
    name: string
    enforceUniqueName: boolean
    fontSize?: string
    margin?: number
}

export default function EditList({name, onAdd, items, render, enforceUniqueName, fontSize, margin}: Props) {

    const [newName, setNewName] = useState<string>(null)
    
    const newClick = () => {
        setNewName('')
    }
    
    const newLayer = () => {
        if (enforceUniqueName && items.find(l => l.name === newName)) return notify(name+" name must be unique")
        onAdd(newName)
        setNewName(null)
    }
    
    return <div style={{margin: (margin||0)+'em', padding: '0.2em', borderLeft: 'solid #00000040 2px'}}>
        <Typography.Title style={{fontSize: fontSize || '2em'}}>{name}s</Typography.Title>
        {items?.map(render)}
        <br/>
        <Space>
            <Popover
                open={newName !== null}
                content={<Input
                    placeholder={name+" name"}
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    onKeyDown={e => {
                        if (e.key !== 'Enter' || !newName) return
                        newLayer()
                    }}
                />}
            >
                <Button onClick={newClick} icon={<PlusOutlined/>}>Add {name}</Button>
            </Popover>
        </Space>
    </div>;
}
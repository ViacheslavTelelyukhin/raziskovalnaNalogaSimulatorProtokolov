import React, { useEffect, useState } from "react";
import { IPC_METHODS, project, windowWithApi } from "../../types";
import { Button, Input, Popover, Space, Typography, Upload } from "antd/es";
import { PlusOutlined, ImportOutlined } from "@ant-design/icons";
import { validateOrReject } from "class-validator";
import { notify } from "../utils/notify";
import { readFileUtil, saveFile } from "../utils/file";
import { plainToClass } from "class-transformer";

interface Props {
    proj: project,
    setProject: (v: project) => void
    setPage: (page: string) => void,
}

const w = window as windowWithApi
export default function Projects({proj, setProject, setPage}: Props) {
    const [projects, setProjects] = useState<Array<string>>(null)
    const [newProjectName, setNewProjectName] = useState<string>(null)

    const listProjects = () => w.api.invoke(IPC_METHODS.LIST_PROJECTS).then(files => {setProjects(files)})

    useEffect(() => {
        listProjects()
    }, [])

    const newProjectClick = () => {
        setNewProjectName('')
    }

    const newProject = () => {
        const newProj: project = {
            name: newProjectName,
            layers: [],
            networks: [],
            preferences: {name: 'll'},
            protocolBase: {},
            scripts: []
        }
        if (!newProjectName.match(/^[^~)('!*<>:;,?"*|/]+$/)) return notify("Invalid file name")
        saveFile(newProjectName+'.json', JSON.stringify(newProj))
            .catch(() => notify("Error occurred while trying to save project"))
            .then(() => {
                notify("Successfully saved project")
                listProjects()
                setProject(newProj)
            })
        setNewProjectName(null)
    }

    const openPath = (path: string) => {
        readFileUtil(path).then(openProject).catch(() => notify("Failed to open project file"))
    }

    const openProject = async (file: string) => {
        const parsed: project = plainToClass(project, JSON.parse(file))
        console.log(parsed);
        
        validateOrReject(parsed)
            .then(() => setProject(parsed))
            .catch(err => {
                notify("Invalid project file, check console")
                console.log(err);
            })
    }

    return <>
        <Typography.Title>Projects</Typography.Title>
        {projects?.map(path => <div key={path}>
            <Space style={{margin: '0.4em'}}>
                <Typography.Text>
                    {path}
                </Typography.Text>
                <Button onClick={() => openPath(path)}><ImportOutlined/></Button>
            </Space>
        </div>)}
        <br/>
        <Space>
            <Popover
                open={newProjectName !== null}
                content={<Input
                    placeholder="project name"
                    value={newProjectName}
                    onChange={e => setNewProjectName(e.target.value)}
                    onKeyDown={e => {
                        if (e.key !== 'Enter' || !newProjectName) return
                        newProject()
                    }}
                />}
            >
                <Button onClick={newProjectClick}><PlusOutlined/></Button>
            </Popover>
            
            <Upload
                beforeUpload={async (file) => {
                    openProject(await file.text())
                    return false
                }}
                accept='.json'
                fileList={[]}
            ><Button><ImportOutlined/></Button></Upload>
        </Space>
        {proj && <Typography.Paragraph style={{fontSize: '1.8em'}}>Opened project: {proj?.name}</Typography.Paragraph>}
    </>;
}
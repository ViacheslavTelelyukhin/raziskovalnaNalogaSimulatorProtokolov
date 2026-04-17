import React, { useState } from "react";
import { Breadcrumb, Button, Card, Layout, Menu, Space, theme, Typography } from 'antd';
import { CloseOutlined, BarsOutlined, SaveOutlined } from "@ant-design/icons"
import { MenuItemType } from "antd/es/menu/interface";
import { project } from "../../types";
import { saveFile } from "../utils/file";
import { notify } from "../utils/notify";
const { Header, Content, Footer, Sider } = Layout;

interface Props {
    children?: React.ReactNode
    setPage: (page: string) => void,
    page: string
    pages: any
    proj: project
}

export default function AppLayout({ children, pages, setPage, page, proj }: Props) {
    const [isOpen, setOpen] = useState<boolean>(true)
    
    const saveProject = () => {
        saveFile(proj.name+'.json', JSON.stringify(proj))
        .catch(() => notify("Error occurred while trying to save project"))
        .then(() => {notify("Successfully saved project")})
    }

    return (<>
        <div id="notificationContainer" style={{
            transition: '400ms ease-in-out transform',
            margin: '1em',
            padding: '0.3em',
            fontSize: '1.5em',
            borderRadius: '8px',
            background: '#96c3ff',
            maxWidth: '40vw',
            display: "block",
            zIndex: 1000,
            position: 'fixed',
        }} className="translateHide"></div>
        <Layout style={{height: "100vh"}}>
            <Header style={{ display: 'flex', alignItems: 'center', color: 'white', backgroundColor: "#000f4a", height: '6vh' }}>
                <Space
                    style={{ flex: 1, minWidth: 0 }}
                >
                    <div style={{fontSize: '1.4em'}}>{(proj ? "Project - "+proj.name : 'No project open')}</div>
                    {proj ? <div style={{position: 'relative'}}>
                        <SaveOutlined
                            style={{
                                fontSize: '2em',
                                position: 'absolute',
                                top: '50%',
                                transform: 'translate(0, -50%)',
                                transition: 'color ease 200ms'
                            }}
                            className="saveIcon"
                            onClick={saveProject}
                        />
                    </div> : null}
                </Space>
            </Header>
            {/* <Breadcrumb
                style={{ margin: '16px 0', padding: '0 2em' }}
                items={[
                    { title: 'Home' },
                    { title: 'List' },
                    { title: 'App' }
                ]}
            /> */}
            <div style={{ flexGrow: 1, display: "flex", flexDirection: 'column' }}>
                <Layout
                    style={{ background: '', borderRadius: 4, flexGrow: 1, display: 'flex' }}
                >
                    <Sider
                        width={isOpen ? 200 : 40}
                        style={{background: 'white'}}
                    >
                        {isOpen
                        ? <div style={{ display: "flex", flexDirection: 'column' }}>
                            <CloseOutlined
                                onClick={() => setOpen(false)}
                                style={{padding: '12px 4px', margin: '0 0 0 24px'}}
                                size={20}
                            />
                            <Menu
                                mode="inline"
                                // defaultSelectedKeys={['projects']}
                                selectedKeys={[page]}
                                //   defaultOpenKeys={['sub1']}
                                style={{ flexGrow: 1 }}
                                onSelect={e => setPage(e.key)}
                                items={
                                    Array.from(Object.entries(pages), (e: any) => ({
                                        key: e[0],
                                        icon: React.createElement(e[1].icon),
                                        label: e[0],
                                        disabled: e[1].disabled
                                    } as MenuItemType))
                                }
                            />
                        </div>
                        : <div style={{textAlign: 'center'}}><BarsOutlined
                            onClick={() => setOpen(true)}
                            style={{padding: '12px 0', margin: 'auto'}}
                            size={28}
                        /></div>
                        }
                    </Sider>
                    <Content style={{ padding: '12px 24px', minHeight: 280 }}>
                        {children}
                    </Content>
                </Layout>
            </div>
        {/* <Footer style={{ textAlign: 'center' }}>
        </Footer> */}
        </Layout></>
    );
}

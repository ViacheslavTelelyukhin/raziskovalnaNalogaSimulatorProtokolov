import React, { useState } from "react";
import AppLayout from "./components/layout";
import Projects from "./pages/projects";
import { ProjectOutlined, GroupOutlined, PartitionOutlined, PlaySquareOutlined, RobotOutlined } from "@ant-design/icons";
import { project } from "../types";
import Layers from "./pages/layers";
import Networks from "./pages/networks";
import Simulations from "./pages/simulationDisplay";

export default function App() {

  const [page, setPage] = useState<string>('projects')
  const [proj, setProject] = useState<project>(null)

  const menu: Record<string, any> = {
    simulations: {
      icon: PlaySquareOutlined,
      page: <Simulations proj={proj} setProj={setProject} setPage={setPage}/>,
      disabled: !Boolean(proj)
    },
    networks: {
      icon: PartitionOutlined,
      page: <Networks proj={proj} setProj={setProject} setPage={setPage}/>,
      disabled: !Boolean(proj),
    },
    layers: {
      icon: GroupOutlined,
      page: <Layers proj={proj} setProj={setProject} setPage={setPage}/>,
      disabled: !Boolean(proj)
    },
    projects: {
      icon: ProjectOutlined,
      page: <Projects proj={proj} setPage={setPage} setProject={setProject}/>
    }
  }

  return (
    <AppLayout setPage={setPage} page={page} pages={menu} proj={proj}>
      {menu[page]?.page || menu['projects'].page}
    </AppLayout>
  );
}


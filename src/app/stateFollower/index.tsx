
import React from "react";
import ReactDOM from "react-dom/client";
import "../index.css";
import StateFollower from "./StateFollower";

const root = ReactDOM.createRoot(document.getElementById("root")!);
root.render(
  <React.StrictMode>
    <StateFollower />
  </React.StrictMode>
);

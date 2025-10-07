import React, { useState } from "react";

import Sidebar from "../partials/Sidebar";
import Header from "../partials/Header";

function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-[100dvh] overflow-hidden">
      {/* Sidebar */}
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      {/* Content area */}
      <div className="relative flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
        {/*  Site header */}
        <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

        <main className="grow flex items-center justify-center w-full h-full flex-1">
          <div className="p-4 flex flex-col gap-4">
            <div className="size-12">
              <img src={"/logo.png"} alt="logo" />
            </div>
            <h1 className="text-2xl font-bold">欢迎</h1>
          </div>
        </main>
      </div>
    </div>
  );
}

export default Dashboard;

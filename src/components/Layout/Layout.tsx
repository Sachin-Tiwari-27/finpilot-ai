import { Outlet } from "react-router-dom";
import TitleBar from "./TitleBar";
import Sidebar from "./SideBar";

export default function Layout() {
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-hidden bg-fp-bg">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

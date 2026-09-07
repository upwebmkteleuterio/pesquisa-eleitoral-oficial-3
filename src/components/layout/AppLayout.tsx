import { Outlet } from "react-router-dom";
import { InstallPwaBanner } from "../InstallPwaBanner";
import { TopBar } from "./TopBar";
import { Navbar } from "./Navbar";

export function AppLayout() {
  return (
    <div className="flex flex-col min-h-screen bg-background transition-colors duration-300">
      <TopBar />
      <main className="flex-1 pt-16 pb-24 w-full flex justify-center">
        <div className="w-full max-w-2xl px-5">
          <InstallPwaBanner />
          <Outlet />
        </div>
      </main>
      <Navbar />
    </div>
  );
}

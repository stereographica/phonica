'use client'; // Add this for useState and client-side interactions

import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/toaster";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const sidebarWidthClass = isSidebarCollapsed ? 'w-16' : 'w-60';
  const mainContentPaddingClass = isSidebarCollapsed ? 'pl-16' : 'pl-60';

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <Sidebar 
        isCollapsed={isSidebarCollapsed} 
        toggleSidebar={toggleSidebar} 
        sidebarWidthClass={sidebarWidthClass}
      />
      <div className={cn("flex flex-col transition-all duration-300 ease-in-out", mainContentPaddingClass)}>
        <Header />
        <main className="flex-1 p-4 sm:px-6 md:p-6">
          {children}
        </main>
      </div>
      <Toaster />
    </div>
  );
} 

import { create } from "zustand";

interface AppState {
  sidebarOpen: boolean;
  currentAcademicYear: string;
  selectedClass: string;
  selectedSection: string;
  isOnline: boolean;
  notifications: number;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setAcademicYear: (year: string) => void;
  setSelectedClass: (cls: string) => void;
  setSelectedSection: (section: string) => void;
  setOnlineStatus: (status: boolean) => void;
  setNotifications: (count: number) => void;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarOpen: true,
  currentAcademicYear: "2081/2082",
  selectedClass: "",
  selectedSection: "",
  isOnline: typeof window !== "undefined" ? navigator.onLine : true,
  notifications: 0,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setAcademicYear: (year) => set({ currentAcademicYear: year }),
  setSelectedClass: (cls) => set({ selectedClass: cls }),
  setSelectedSection: (section) => set({ selectedSection: section }),
  setOnlineStatus: (status) => set({ isOnline: status }),
  setNotifications: (count) => set({ notifications: count }),
}));

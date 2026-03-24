import { create } from "zustand";

interface ContentRejectionStore {
  isRejectionModalOpen: boolean;
  openRejectionModal: () => void;
  closeRejectionModal: () => void;
}

export const useContentRejectionStore = create<ContentRejectionStore>((set) => ({
  isRejectionModalOpen: false,
  openRejectionModal: () => set({ isRejectionModalOpen: true }),
  closeRejectionModal: () => set({ isRejectionModalOpen: false }),
}));

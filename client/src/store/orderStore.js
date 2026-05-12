import { create } from 'zustand';

const useOrderStore = create((set) => ({
  selectedDate: null,
  selectedSlot: null,

  setSelectedDate(date) {
    set({ selectedDate: date });
  },

  setSelectedSlot(slot) {
    set({ selectedSlot: slot });
  },

  clearSelection() {
    set({ selectedDate: null, selectedSlot: null });
  },
}));

export default useOrderStore;

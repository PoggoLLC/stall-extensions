import { createSelectors } from "@/utils";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface RatesState {
  data: Record<string, string>;
}

export const useRatesStore = create<RatesState>()(
  persist(
    (set) => ({
      data: {},
    }),
    {
      name: "extension-store",
    },
  ),
);

const useRatesSelector = createSelectors(useRatesStore);

export default useRatesSelector;

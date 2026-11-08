import { createContext, useContext, useState, type ReactNode } from "react";

interface ReviewBatchSelection {
  selectedBatchId: string | null;
  selectBatch: (batchId: string) => void;
}

const ReviewBatchContext = createContext<ReviewBatchSelection | null>(null);

export function ReviewBatchProvider({ children }: { children: ReactNode }) {
  const [selectedBatchId, selectBatch] = useState<string | null>(null);
  return (
    <ReviewBatchContext.Provider value={{ selectedBatchId, selectBatch }}>
      {children}
    </ReviewBatchContext.Provider>
  );
}

export function useReviewBatchSelection() {
  const selection = useContext(ReviewBatchContext);
  if (!selection) throw new Error("Review pages require a ReviewBatchProvider.");
  return selection;
}

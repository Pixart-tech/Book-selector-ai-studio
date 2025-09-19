
import type { ReactNode } from 'react';

// This hook is deprecated and no longer in use.
// PDF state management has been moved to a more robust IndexedDB solution
// located in `services/api.ts` to handle cross-tab state and large files.
// This file is kept to prevent breaking existing imports but can be safely removed
// if all references are updated.

const DeprecatedHook = (): never => {
    throw new Error('usePdfStore is deprecated. Use the IndexedDB functions from services/api.ts instead.');
};

export const usePdfStore = DeprecatedHook;

export const PdfProvider = ({ children }: { children: ReactNode }) => <>{children}</>;

interface PageActionState {
    action: (() => void) | null;
    icon: string;
    label: string;
    setPageAction: (action: () => void, icon: string, label: string) => void;
    clearPageAction: () => void;
}
export declare const usePageActionStore: import("zustand").UseBoundStore<import("zustand").StoreApi<PageActionState>>;
export {};

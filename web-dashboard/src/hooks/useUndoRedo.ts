import { useState, useCallback, useRef } from 'react';

interface UndoRedoAction<T> {
    type: string;
    data: T;
    undo: () => void | Promise<void>;
    redo: () => void | Promise<void>;
}

interface UseUndoRedoOptions {
    maxHistory?: number;
}

export function useUndoRedo<T = any>(options: UseUndoRedoOptions = {}) {
    const { maxHistory = 50 } = options;

    const [undoStack, setUndoStack] = useState<UndoRedoAction<T>[]>([]);
    const [redoStack, setRedoStack] = useState<UndoRedoAction<T>[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);

    const groupingRef = useRef<UndoRedoAction<T>[] | null>(null);

    // Push an action to the undo stack
    const pushAction = useCallback((action: UndoRedoAction<T>) => {
        if (groupingRef.current) {
            // If grouping, add to group
            groupingRef.current.push(action);
        } else {
            setUndoStack(prev => {
                const newStack = [...prev, action];
                // Limit stack size
                if (newStack.length > maxHistory) {
                    return newStack.slice(-maxHistory);
                }
                return newStack;
            });
            // Clear redo stack on new action
            setRedoStack([]);
        }
    }, [maxHistory]);

    // Undo last action
    const undo = useCallback(async () => {
        if (undoStack.length === 0 || isProcessing) return false;

        setIsProcessing(true);
        try {
            const action = undoStack[undoStack.length - 1];
            await action.undo();

            setUndoStack(prev => prev.slice(0, -1));
            setRedoStack(prev => [...prev, action]);

            return true;
        } catch (err) {
            console.error('[UndoRedo] Undo failed:', err);
            return false;
        } finally {
            setIsProcessing(false);
        }
    }, [undoStack, isProcessing]);

    // Redo last undone action
    const redo = useCallback(async () => {
        if (redoStack.length === 0 || isProcessing) return false;

        setIsProcessing(true);
        try {
            const action = redoStack[redoStack.length - 1];
            await action.redo();

            setRedoStack(prev => prev.slice(0, -1));
            setUndoStack(prev => [...prev, action]);

            return true;
        } catch (err) {
            console.error('[UndoRedo] Redo failed:', err);
            return false;
        } finally {
            setIsProcessing(false);
        }
    }, [redoStack, isProcessing]);

    // Start grouping actions (for compound operations)
    const startGroup = useCallback(() => {
        groupingRef.current = [];
    }, []);

    // End grouping and push as single compound action
    const endGroup = useCallback((_label?: string) => {
        if (!groupingRef.current || groupingRef.current.length === 0) {
            groupingRef.current = null;
            return;
        }

        const groupedActions = [...groupingRef.current];
        groupingRef.current = null;

        const compoundAction: UndoRedoAction<T[]> = {
            type: 'compound',
            data: groupedActions.map(a => a.data) as any,
            undo: async () => {
                // Undo in reverse order
                for (let i = groupedActions.length - 1; i >= 0; i--) {
                    await groupedActions[i].undo();
                }
            },
            redo: async () => {
                // Redo in original order
                for (const action of groupedActions) {
                    await action.redo();
                }
            },
        };

        setUndoStack(prev => [...prev, compoundAction as any]);
        setRedoStack([]);
    }, []);

    // Clear all history
    const clearHistory = useCallback(() => {
        setUndoStack([]);
        setRedoStack([]);
    }, []);

    return {
        pushAction,
        undo,
        redo,
        startGroup,
        endGroup,
        clearHistory,
        canUndo: undoStack.length > 0 && !isProcessing,
        canRedo: redoStack.length > 0 && !isProcessing,
        undoCount: undoStack.length,
        redoCount: redoStack.length,
        isProcessing,
    };
}

export default useUndoRedo;

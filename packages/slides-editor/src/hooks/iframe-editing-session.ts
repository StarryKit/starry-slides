export function nextSingleSelection(value: string | null): string[] {
  return value ? [value] : [];
}

export function ensureSelectionContainsTarget(currentIds: string[], targetId: string): string[] {
  return currentIds.includes(targetId) ? currentIds : [...currentIds, targetId];
}

export function clearSelectionForEscape({
  selectedElementIds,
  activeGroupScopeId,
}: {
  selectedElementIds: string[];
  activeGroupScopeId: string | null;
}): { handled: boolean; nextSelection: string[]; exitGroupScope: boolean } {
  if (activeGroupScopeId) {
    return {
      handled: true,
      nextSelection: [activeGroupScopeId],
      exitGroupScope: true,
    };
  }

  if (selectedElementIds.length) {
    return {
      handled: true,
      nextSelection: [],
      exitGroupScope: false,
    };
  }

  return {
    handled: false,
    nextSelection: selectedElementIds,
    exitGroupScope: false,
  };
}

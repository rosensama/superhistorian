/**
 * True when `nodeId` is not the current path tip — card actions that show
 * results on the expanded header (or need the node in the tree) must select first.
 */
export function needsExpandForAction(nodeId: string, currentPath: string[]): boolean {
  return currentPath[currentPath.length - 1] !== nodeId;
}

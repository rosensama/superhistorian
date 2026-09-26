// CRUD operations for history_node in SurrealDB
import type { RecordId } from "surrealdb";
import { getDb } from "./client";
import { LlmUsageData } from "./types";
import { HistoryNode } from "../types";

interface HistoryNodeRow {
  id: RecordId | string;
  title?: string;
  summary?: string;
  time_range_start?: string;
  time_range_end?: string;
  geographic_scope?: string;
  split_axis?: "time" | "geography" | null;
  depth?: number;
}

export interface CreateNodeOptions {
  node: HistoryNode;
  model: string;
  usage?: LlmUsageData;
}

export async function createNode(opts: CreateNodeOptions): Promise<string> {
  const db = await getDb();
  const { node, model, usage } = opts;
  const nodeId = node.id;

  await db.query(
    `CREATE type::thing('history_node', $id) SET
      title = $title,
      summary = $summary,
      time_range_start = $time_range_start,
      time_range_end = $time_range_end,
      geographic_scope = $geographic_scope,
      split_axis = $split_axis,
      depth = $depth,
      llm_model = $llm_model,
      prompt_tokens = $prompt_tokens,
      completion_tokens = $completion_tokens,
      total_tokens = $total_tokens
    `,
    {
      id: nodeId,
      title: node.title,
      summary: node.summary,
      time_range_start: node.timeRange.start,
      time_range_end: node.timeRange.end,
      geographic_scope: node.geographicScope,
      split_axis: node.splitAxis,
      depth: node.depth,
      llm_model: model,
      prompt_tokens: usage?.prompt_tokens ?? null,
      completion_tokens: usage?.completion_tokens ?? null,
      total_tokens: usage?.total_tokens ?? null,
    }
  );

  return nodeId;
}

export async function linkChild(parentId: string, childId: string, order: number): Promise<void> {
  const db = await getDb();
  await db.query(
    `RELATE type::thing('history_node', $parentId) -> parent_of -> type::thing('history_node', $childId)
     SET child_order = $order`,
    { parentId, childId, order }
  );
}

export async function saveEssay(nodeId: string, essay: string, model: string, usage?: LlmUsageData): Promise<void> {
  const db = await getDb();
  await db.query(
    `UPDATE type::thing('history_node', $id) SET essay = $essay`,
    { id: nodeId, essay }
  );
  // Also log the usage if available
  if (usage) {
    const { logUsage } = await import("./usage");
    await logUsage({ nodeId, action: "essay", model, ...usage });
  }
}

export async function saveImagePath(nodeId: string, imagePath: string, imageModel: string): Promise<void> {
  const db = await getDb();
  await db.query(
    `UPDATE type::thing('history_node', $id) SET image_path = $imagePath, image_model = $imageModel`,
    { id: nodeId, imagePath, imageModel }
  );
}

export async function getNode(nodeId: string): Promise<HistoryNode | null> {
  const db = await getDb();
  const [rows] = await db.query<[HistoryNodeRow[]]>(
    `SELECT * FROM type::thing('history_node', $id)`,
    { id: nodeId }
  );
  const [row] = rows;
  return row ? dbRowToHistoryNode(row) : null;
}

export async function getChildren(parentId: string): Promise<HistoryNode[]> {
  const db = await getDb();
  const [rows] = await db.query<[HistoryNodeRow[]]>(
    `SELECT out.* FROM parent_of WHERE in = type::thing('history_node', $parentId) ORDER BY child_order`,
    { parentId }
  );
  return rows.map((row) => dbRowToHistoryNode(row));
}

export async function getTree(rootId: string): Promise<HistoryNode | null> {
  const root = await getNode(rootId);
  if (!root) return null;
  const children = await getChildren(rootId);
  root.children = [];
  for (const child of children) {
    const subtree = await getTree(child.id);
    if (subtree) root.children.push(subtree);
  }
  return root;
}

function dbRowToHistoryNode(row: HistoryNodeRow): HistoryNode {
  // SurrealDB returns IDs as "history_node:xyz" — extract just "xyz"
  const rawId = row.id.toString();
  const id = rawId.includes(":") ? rawId.split(":").slice(1).join(":") : rawId;

  return {
    id,
    title: row.title ?? "",
    summary: row.summary ?? "",
    timeRange: {
      start: row.time_range_start ?? "",
      end: row.time_range_end ?? "",
    },
    geographicScope: row.geographic_scope ?? "",
    parentId: null,
    children: [],
    splitAxis: row.split_axis ?? null,
    depth: row.depth ?? 0,
  };
}

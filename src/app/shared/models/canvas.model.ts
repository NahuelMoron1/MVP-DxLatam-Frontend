import { FilterNode } from './filter.model';

export type NodeType = 'segment' | 'sms';

export interface SmsConfig {
  message: string;
}

export type NodeConfig = FilterNode | SmsConfig;

export interface CanvasNode {
  id: string;
  campaign_id?: string;
  type: NodeType;
  x: number;
  y: number;
  config: NodeConfig;
  created_at?: string;
  updated_at?: string;
}

export interface CanvasEdge {
  id: string;
  campaign_id?: string;
  source_node_id: string;
  target_node_id: string;
  created_at?: string;
}

export interface CanvasNodePayload {
  id: string;
  type: NodeType;
  x: number;
  y: number;
  config: NodeConfig;
}

export interface CanvasEdgePayload {
  id: string;
  source_node_id: string;
  target_node_id: string;
}

export interface CanvasPayload {
  nodes: CanvasNodePayload[];
  edges: CanvasEdgePayload[];
}

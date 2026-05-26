import { CanvasEdge, CanvasNode } from './canvas.model';

export type CampaignStatus = 'draft' | 'active';

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  status: CampaignStatus;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface CampaignWithCanvas extends Campaign {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}

export interface CreateCampaignDto {
  name: string;
  description?: string;
  status?: CampaignStatus;
}

export type UpdateCampaignDto = Partial<CreateCampaignDto>;

export interface CampaignFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: CampaignStatus;
}

import { Contact } from './contact.model';

export type FilterOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in'
  | 'contains';

export interface FilterLeaf {
  field: string;
  operator: FilterOperator;
  value: unknown;
}

export interface FilterGroup {
  op: 'AND' | 'OR';
  conditions: FilterNode[];
}

export type FilterNode = FilterLeaf | FilterGroup;

export interface AudienceResponse {
  count: number;
  contacts: Contact[];
}

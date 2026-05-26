export interface ContactAttributes {
  age?: number;
  plan?: string;
  last_purchase_days?: number;
  [key: string]: unknown;
}

export type ContactStatus = 'ACTIVE' | 'INACTIVE';

export interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  country: string;
  city: string;
  status: ContactStatus;
  attributes: ContactAttributes;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface CreateContactDto {
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  country: string;
  city: string;
  status?: ContactStatus;
  attributes?: ContactAttributes;
}

export type UpdateContactDto = Partial<CreateContactDto>;

export interface ContactFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  country?: string;
  status?: ContactStatus;
  created_after?: string;
}

import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { PaginatedResponse } from '../models/api-response.model';
import {
  Campaign,
  CampaignFilters,
  CampaignWithCanvas,
  CreateCampaignDto,
  UpdateCampaignDto,
} from '../models/campaign.model';

@Injectable({
  providedIn: 'root',
})
export class CampaignService {
  private myAppUrl: string;
  private myApiUrl: string;
  private http = inject(HttpClient);

  constructor() {
    this.myAppUrl = environment.endpoint;
    this.myApiUrl = 'api/campaigns/';
  }

  getCampaigns(filters?: CampaignFilters): Observable<PaginatedResponse<Campaign>> {
    let params = new HttpParams();
    if (filters?.page) params = params.set('page', filters.page);
    if (filters?.pageSize) params = params.set('pageSize', filters.pageSize);
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.status) params = params.set('status', filters.status);

    return this.http.get<PaginatedResponse<Campaign>>(
      `${this.myAppUrl}${this.myApiUrl}`,
      { params },
    );
  }

  getCampaignById(id: string): Observable<CampaignWithCanvas> {
    return this.http.get<CampaignWithCanvas>(
      `${this.myAppUrl}${this.myApiUrl}${id}`,
    );
  }

  createCampaign(campaign: CreateCampaignDto): Observable<Campaign> {
    return this.http.post<Campaign>(
      `${this.myAppUrl}${this.myApiUrl}`,
      campaign,
    );
  }

  updateCampaign(id: string, campaign: UpdateCampaignDto): Observable<Campaign> {
    return this.http.put<Campaign>(
      `${this.myAppUrl}${this.myApiUrl}${id}`,
      campaign,
    );
  }

  deleteCampaign(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.myAppUrl}${this.myApiUrl}${id}`,
    );
  }
}

import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AudienceResponse, FilterNode } from '../models/filter.model';

@Injectable({
  providedIn: 'root',
})
export class SegmentService {
  private myAppUrl: string;
  private myApiUrl: string;
  private http = inject(HttpClient);

  constructor() {
    this.myAppUrl = environment.endpoint;
    this.myApiUrl = 'api/segments/';
  }

  getAudience(
    nodeId: string,
    filters?: FilterNode,
  ): Observable<AudienceResponse> {
    return this.http.post<AudienceResponse>(
      `${this.myAppUrl}${this.myApiUrl}${nodeId}/audience`,
      filters ?? {},
    );
  }
}

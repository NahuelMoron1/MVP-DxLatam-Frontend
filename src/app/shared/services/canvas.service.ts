import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { CanvasPayload } from '../models/canvas.model';

@Injectable({
  providedIn: 'root',
})
export class CanvasService {
  private myAppUrl: string;
  private myApiUrl: string;
  private http = inject(HttpClient);

  constructor() {
    this.myAppUrl = environment.endpoint;
    this.myApiUrl = 'api/campaigns/';
  }

  saveCanvas(
    campaignId: string,
    payload: CanvasPayload,
  ): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(
      `${this.myAppUrl}${this.myApiUrl}${campaignId}/canvas`,
      payload,
    );
  }
}

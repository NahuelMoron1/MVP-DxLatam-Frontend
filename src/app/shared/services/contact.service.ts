import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { PaginatedResponse } from '../models/api-response.model';
import {
  Contact,
  ContactFilters,
  CreateContactDto,
  UpdateContactDto,
} from '../models/contact.model';

@Injectable({
  providedIn: 'root',
})
export class ContactService {
  private myAppUrl: string;
  private myApiUrl: string;
  private http = inject(HttpClient);

  constructor() {
    this.myAppUrl = environment.endpoint;
    this.myApiUrl = 'api/contacts/';
  }

  getContacts(filters?: ContactFilters): Observable<PaginatedResponse<Contact>> {
    let params = new HttpParams();
    if (filters?.page) params = params.set('page', filters.page);
    if (filters?.pageSize) params = params.set('pageSize', filters.pageSize);
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.country) params = params.set('country', filters.country);
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.created_after) params = params.set('created_after', filters.created_after);

    return this.http.get<PaginatedResponse<Contact>>(
      `${this.myAppUrl}${this.myApiUrl}`,
      { params },
    );
  }

  createContact(contact: CreateContactDto): Observable<Contact> {
    return this.http.post<Contact>(
      `${this.myAppUrl}${this.myApiUrl}`,
      contact,
    );
  }

  updateContact(id: string, contact: UpdateContactDto): Observable<Contact> {
    return this.http.put<Contact>(
      `${this.myAppUrl}${this.myApiUrl}${id}`,
      contact,
    );
  }

  deleteContact(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.myAppUrl}${this.myApiUrl}${id}`,
    );
  }
}

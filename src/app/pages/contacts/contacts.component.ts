import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ContactService } from '../../shared/services/contact.service';
import { Contact, ContactFilters, ContactStatus } from '../../shared/models/contact.model';

@Component({
  selector: 'app-contacts',
  standalone: true,
  imports: [FormsModule, DatePipe],
  templateUrl: './contacts.component.html',
  styleUrl: './contacts.component.css',
})
export class ContactsComponent implements OnInit {
  private contactService = inject(ContactService);

  readonly pageSize = 10;

  contacts = signal<Contact[]>([]);
  total = signal(0);
  page = signal(1);
  loading = signal(false);

  totalPages = computed(() => Math.ceil(this.total() / this.pageSize));
  pages = computed(() =>
    Array.from({ length: this.totalPages() }, (_, i) => i + 1),
  );

  searchQuery = '';
  selectedStatus: ContactStatus | '' = '';
  selectedCountry = '';

  ngOnInit(): void {
    this.loadContacts();
  }

  loadContacts(): void {
    this.loading.set(true);
    const filters: ContactFilters = {
      page: this.page(),
      pageSize: this.pageSize,
      ...(this.searchQuery && { search: this.searchQuery }),
      ...(this.selectedStatus && { status: this.selectedStatus }),
      ...(this.selectedCountry && { country: this.selectedCountry }),
    };

    this.contactService.getContacts(filters).subscribe({
      next: (res) => {
        this.contacts.set(res.data);
        this.total.set(res.total);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onSearch(): void {
    this.page.set(1);
    this.loadContacts();
  }

  setPage(p: number): void {
    if (p < 1 || p > this.totalPages()) return;
    this.page.set(p);
    this.loadContacts();
  }

  initials(contact: Contact): string {
    return (contact.first_name[0] + contact.last_name[0]).toUpperCase();
  }

  delete(id: string, event: MouseEvent): void {
    event.stopPropagation();
    if (!confirm('¿Eliminar este contacto?')) return;
    this.contactService.deleteContact(id).subscribe({
      next: () => this.loadContacts(),
    });
  }
}

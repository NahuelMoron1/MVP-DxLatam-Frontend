import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ContactService } from '../../shared/services/contact.service';
import { ToastService } from '../../shared/services/toast.service';
import {
  Contact,
  ContactFilters,
  ContactStatus,
  CreateContactDto,
  UpdateContactDto,
} from '../../shared/models/contact.model';

@Component({
  selector: 'app-contacts',
  standalone: true,
  imports: [FormsModule, DatePipe],
  templateUrl: './contacts.component.html',
  styleUrl: './contacts.component.css',
})
export class ContactsComponent implements OnInit {
  private contactService = inject(ContactService);
  private toast = inject(ToastService);

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
  selectedCreatedAfter = '';

  get activeFilters(): { label: string; field: 'country' | 'status' | 'createdAfter' }[] {
    const filters: { label: string; field: 'country' | 'status' | 'createdAfter' }[] = [];
    if (this.selectedCountry) filters.push({ label: this.selectedCountry, field: 'country' });
    if (this.selectedStatus) filters.push({ label: this.selectedStatus === 'ACTIVE' ? 'Active' : 'Inactive', field: 'status' });
    if (this.selectedCreatedAfter) filters.push({ label: `Últ. ${this.selectedCreatedAfter} días`, field: 'createdAfter' });
    return filters;
  }

  clearFilter(field: 'country' | 'status' | 'createdAfter'): void {
    if (field === 'country') this.selectedCountry = '';
    else if (field === 'status') this.selectedStatus = '';
    else this.selectedCreatedAfter = '';
    this.page.set(1);
    this.loadContacts();
  }

  private daysAgoIso(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().split('T')[0];
  }

  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  showCreateModal = signal(false);
  showEditModal = signal(false);
  editingContact: Contact | null = null;

  newContact: CreateContactDto = this.emptyContact();
  editForm: UpdateContactDto = {};

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
      ...(this.selectedCreatedAfter && { created_after: this.daysAgoIso(+this.selectedCreatedAfter) }),
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
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.page.set(1);
      this.loadContacts();
    }, 350);
  }

  onFilterChange(): void {
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

  // ─── Create ────────────────────────────────────────────────────────────────

  openCreateModal(): void {
    this.newContact = this.emptyContact();
    this.showCreateModal.set(true);
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
  }

  create(): void {
    if (!this.isValid(this.newContact)) return;
    this.contactService.createContact(this.newContact).subscribe({
      next: () => {
        this.closeCreateModal();
        this.loadContacts();
        this.toast.show('Contacto creado exitosamente');
      },
      error: (err) => this.toast.showError(err, 'Error al crear el contacto'),
    });
  }

  // ─── Edit ──────────────────────────────────────────────────────────────────

  openEditModal(contact: Contact, event: MouseEvent): void {
    event.stopPropagation();
    this.editingContact = contact;
    this.editForm = {
      first_name: contact.first_name,
      last_name: contact.last_name,
      email: contact.email,
      phone: contact.phone,
      country: contact.country,
      city: contact.city,
      status: contact.status,
    };
    this.showEditModal.set(true);
  }

  closeEditModal(): void {
    this.showEditModal.set(false);
    this.editingContact = null;
  }

  update(): void {
    if (!this.editingContact || !this.isEditValid()) return;
    this.contactService.updateContact(this.editingContact.id, this.editForm).subscribe({
      next: () => {
        this.closeEditModal();
        this.loadContacts();
        this.toast.show('Contacto actualizado');
      },
      error: (err) => this.toast.showError(err, 'Error al actualizar el contacto'),
    });
  }

  // ─── Delete ────────────────────────────────────────────────────────────────

  delete(id: string, event: MouseEvent): void {
    event.stopPropagation();
    if (!confirm('¿Eliminar este contacto?')) return;
    this.contactService.deleteContact(id).subscribe({
      next: () => {
        this.loadContacts();
        this.toast.show('Contacto eliminado');
      },
      error: (err) => this.toast.showError(err, 'Error al eliminar el contacto'),
    });
  }

  // ─── Export ────────────────────────────────────────────────────────────────

  exportContacts(): void {
    const filters: ContactFilters = {
      page: 1,
      pageSize: 10000,
      ...(this.searchQuery && { search: this.searchQuery }),
      ...(this.selectedStatus && { status: this.selectedStatus }),
      ...(this.selectedCountry && { country: this.selectedCountry }),
      ...(this.selectedCreatedAfter && { created_after: this.daysAgoIso(+this.selectedCreatedAfter) }),
    };
    this.contactService.getContacts(filters).subscribe({
      next: (res) => {
        const headers = ['Nombre', 'Apellido', 'Email', 'Teléfono', 'País', 'Ciudad', 'Estado', 'Creado'];
        const rows = res.data.map((c) => [
          c.first_name,
          c.last_name,
          c.email,
          c.phone ?? '',
          c.country ?? '',
          c.city ?? '',
          c.status,
          new Date(c.created_at).toLocaleDateString('es'),
        ]);
        const csv = [headers, ...rows]
          .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
          .join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'contactos.csv';
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.toast.show('Error al exportar contactos', 'error'),
    });
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private emptyContact(): CreateContactDto {
    return {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      country: '',
      city: '',
      status: 'ACTIVE',
    };
  }

  isValid(c: CreateContactDto): boolean {
    return !!(
      c.first_name?.trim() &&
      c.last_name?.trim() &&
      c.email?.trim() &&
      c.phone?.trim() &&
      c.country?.trim() &&
      c.city?.trim()
    );
  }

  isEditValid(): boolean {
    return !!(
      this.editForm.first_name?.trim() &&
      this.editForm.last_name?.trim() &&
      this.editForm.email?.trim() &&
      this.editForm.phone?.trim() &&
      this.editForm.country?.trim() &&
      this.editForm.city?.trim()
    );
  }
}

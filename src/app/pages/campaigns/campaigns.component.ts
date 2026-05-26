import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { CampaignService } from '../../shared/services/campaign.service';
import {
  Campaign,
  CampaignFilters,
  CampaignStatus,
  CreateCampaignDto,
} from '../../shared/models/campaign.model';

@Component({
  selector: 'app-campaigns',
  standalone: true,
  imports: [FormsModule, DatePipe],
  templateUrl: './campaigns.component.html',
  styleUrl: './campaigns.component.css',
})
export class CampaignsComponent implements OnInit {
  private campaignService = inject(CampaignService);
  private router = inject(Router);

  readonly pageSize = 10;

  campaigns = signal<Campaign[]>([]);
  total = signal(0);
  page = signal(1);
  loading = signal(false);
  showModal = signal(false);

  totalPages = computed(() => Math.ceil(this.total() / this.pageSize));
  pages = computed(() =>
    Array.from({ length: this.totalPages() }, (_, i) => i + 1),
  );

  searchQuery = '';
  selectedStatus: CampaignStatus | '' = '';

  newCampaign: CreateCampaignDto = { name: '', description: '' };

  ngOnInit(): void {
    this.loadCampaigns();
  }

  loadCampaigns(): void {
    this.loading.set(true);
    const filters: CampaignFilters = {
      page: this.page(),
      pageSize: this.pageSize,
      ...(this.searchQuery && { search: this.searchQuery }),
      ...(this.selectedStatus && { status: this.selectedStatus }),
    };

    this.campaignService.getCampaigns(filters).subscribe({
      next: (res) => {
        this.campaigns.set(res.data);
        this.total.set(res.total);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onSearch(): void {
    this.page.set(1);
    this.loadCampaigns();
  }

  setPage(p: number): void {
    if (p < 1 || p > this.totalPages()) return;
    this.page.set(p);
    this.loadCampaigns();
  }

  openModal(): void {
    this.newCampaign = { name: '', description: '' };
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  create(): void {
    if (!this.newCampaign.name.trim()) return;
    this.campaignService.createCampaign(this.newCampaign).subscribe({
      next: (campaign) => {
        this.closeModal();
        this.router.navigate(['/campaigns', campaign.id]);
      },
    });
  }

  open(id: string): void {
    this.router.navigate(['/campaigns', id]);
  }

  delete(id: string, event: MouseEvent): void {
    event.stopPropagation();
    if (!confirm('¿Eliminar esta campaña?')) return;
    this.campaignService.deleteCampaign(id).subscribe({
      next: () => this.loadCampaigns(),
    });
  }
}

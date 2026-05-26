import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { CampaignService } from '../../shared/services/campaign.service';
import { CanvasService } from '../../shared/services/canvas.service';
import { ToastService } from '../../shared/services/toast.service';
import {
  Campaign,
  CampaignFilters,
  CampaignStatus,
  CreateCampaignDto,
  UpdateCampaignDto,
} from '../../shared/models/campaign.model';
import { CanvasNode, CanvasEdge } from '../../shared/models/canvas.model';

@Component({
  selector: 'app-campaigns',
  standalone: true,
  imports: [FormsModule, DatePipe],
  templateUrl: './campaigns.component.html',
  styleUrl: './campaigns.component.css',
})
export class CampaignsComponent implements OnInit {
  private campaignService = inject(CampaignService);
  private canvasService = inject(CanvasService);
  private router = inject(Router);
  private toast = inject(ToastService);

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

  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  newCampaign: CreateCampaignDto = { name: '', description: '' };

  showEditModal = signal(false);
  editingCampaign: Campaign | null = null;
  editForm: UpdateCampaignDto = { name: '', description: '', status: 'draft' };

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
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.page.set(1);
      this.loadCampaigns();
    }, 350);
  }

  onFilterChange(): void {
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
      error: (err) => this.toast.showError(err, 'Error al crear la campaña'),
    });
  }

  openEditModal(campaign: Campaign, event: MouseEvent): void {
    event.stopPropagation();
    this.editingCampaign = campaign;
    this.editForm = {
      name: campaign.name,
      description: campaign.description ?? '',
      status: campaign.status,
    };
    this.showEditModal.set(true);
  }

  closeEditModal(): void {
    this.showEditModal.set(false);
    this.editingCampaign = null;
  }

  update(): void {
    if (!this.editingCampaign || !this.editForm.name?.trim()) return;
    this.campaignService.updateCampaign(this.editingCampaign.id, this.editForm).subscribe({
      next: () => {
        this.closeEditModal();
        this.loadCampaigns();
        this.toast.show('Campaña actualizada');
      },
      error: (err) => this.toast.showError(err, 'Error al actualizar la campaña'),
    });
  }

  open(id: string): void {
    this.router.navigate(['/campaigns', id]);
  }

  triggerImport(): void {
    (document.getElementById('campaign-import-file') as HTMLInputElement).click();
  }

  onImportFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string) as {
          name: string;
          description?: string;
          nodes: CanvasNode[];
          edges: CanvasEdge[];
        };
        if (!data.name || !Array.isArray(data.nodes) || !Array.isArray(data.edges)) {
          this.toast.show('Archivo inválido: formato incorrecto', 'error');
          return;
        }
        this.campaignService
          .createCampaign({ name: data.name, description: data.description })
          .subscribe({
            next: (campaign) => {
              this.canvasService
                .saveCanvas(campaign.id, {
                  nodes: data.nodes.map((n) => ({
                    id: n.id,
                    type: n.type,
                    x: n.x,
                    y: n.y,
                    config: n.config,
                  })),
                  edges: data.edges.map((e) => ({
                    id: e.id,
                    source_node_id: e.source_node_id,
                    target_node_id: e.target_node_id,
                  })),
                })
                .subscribe({
                  next: () => this.router.navigate(['/campaigns', campaign.id]),
                  error: () => this.router.navigate(['/campaigns', campaign.id]),
                });
            },
            error: (err) =>
              this.toast.showError(err, 'Error al importar la campaña'),
          });
      } catch {
        this.toast.show('El archivo no es un JSON válido', 'error');
      }
      input.value = '';
    };
    reader.readAsText(file);
  }

  delete(id: string, event: MouseEvent): void {
    event.stopPropagation();
    if (!confirm('¿Eliminar esta campaña?')) return;
    this.campaignService.deleteCampaign(id).subscribe({
      next: () => {
        this.loadCampaigns();
        this.toast.show('Campaña eliminada');
      },
      error: (err) => this.toast.showError(err, 'Error al eliminar la campaña'),
    });
  }
}

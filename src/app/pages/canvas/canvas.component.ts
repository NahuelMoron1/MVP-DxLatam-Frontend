import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CampaignWithCanvas } from '../../shared/models/campaign.model';
import { NodeType } from '../../shared/models/canvas.model';
import { CampaignService } from '../../shared/services/campaign.service';
import { CanvasService } from '../../shared/services/canvas.service';

@Component({
  selector: 'app-canvas',
  standalone: true,
  imports: [],
  templateUrl: './canvas.component.html',
  styleUrl: './canvas.component.css',
})
export class CanvasComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private campaignService = inject(CampaignService);
  private canvasService = inject(CanvasService);

  campaign = signal<CampaignWithCanvas | null>(null);
  loading = signal(true);
  saving = signal(false);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.campaignService.getCampaignById(id).subscribe({
      next: (c) => {
        this.campaign.set(c);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.router.navigate(['/campaigns']);
      },
    });
  }

  addNode(type: NodeType): void {
    // TODO: add node to canvas
    console.log('addNode', type);
  }

  save(): void {
    const c = this.campaign();
    if (!c) return;
    this.saving.set(true);
    this.canvasService
      .saveCanvas(c.id, { nodes: c.nodes ?? [], edges: c.edges ?? [] })
      .subscribe({
        next: () => this.saving.set(false),
        error: () => this.saving.set(false),
      });
  }

  back(): void {
    this.router.navigate(['/campaigns']);
  }
}

import {
  Component,
  HostListener,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CampaignService } from '../../shared/services/campaign.service';
import { CanvasService } from '../../shared/services/canvas.service';
import { SegmentService } from '../../shared/services/segment.service';
import { ToastService } from '../../shared/services/toast.service';
import { CampaignWithCanvas } from '../../shared/models/campaign.model';
import { CanvasEdge, CanvasNode, NodeType } from '../../shared/models/canvas.model';
import { FilterGroup, FilterLeaf, FilterOperator } from '../../shared/models/filter.model';

const NODE_W = 210;
const NODE_H = 76;

interface Condition {
  field: string;
  operator: FilterOperator;
  value: string;
}

interface DragState {
  nodeId: string;
  startMX: number;
  startMY: number;
  startNX: number;
  startNY: number;
}

@Component({
  selector: 'app-canvas',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './canvas.component.html',
  styleUrl: './canvas.component.css',
})
export class CanvasComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private campaignService = inject(CampaignService);
  private canvasService = inject(CanvasService);
  private segmentService = inject(SegmentService);
  private toast = inject(ToastService);

  readonly NODE_W = NODE_W;
  readonly NODE_H = NODE_H;

  campaign = signal<CampaignWithCanvas | null>(null);
  nodes = signal<CanvasNode[]>([]);
  edges = signal<CanvasEdge[]>([]);
  loading = signal(true);
  saving = signal(false);

  selectedNodeId = signal<string | null>(null);
  selectedNode = computed(() =>
    this.nodes().find((n) => n.id === this.selectedNodeId()) ?? null,
  );

  connectingFrom: string | null = null;
  private drag: DragState | null = null;

  editConditions: Condition[] = [];
  editLogic: 'AND' | 'OR' = 'AND';
  editSmsMessage = '';
  audienceCount: number | null = null;
  audienceLoading = false;

  readonly FIELDS = [
    { value: 'country', label: 'País' },
    { value: 'status', label: 'Estado' },
    { value: 'age', label: 'Edad' },
    { value: 'plan', label: 'Plan' },
    { value: 'last_purchase_days', label: 'Días últ. compra' },
  ];

  readonly OPERATORS: { value: FilterOperator; label: string }[] = [
    { value: 'eq', label: '=' },
    { value: 'neq', label: '≠' },
    { value: 'gt', label: '>' },
    { value: 'gte', label: '≥' },
    { value: 'lt', label: '<' },
    { value: 'lte', label: '≤' },
    { value: 'contains', label: 'contiene' },
    { value: 'in', label: 'en lista' },
  ];

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.campaignService.getCampaignById(id).subscribe({
      next: (c) => {
        this.campaign.set(c);
        this.nodes.set(c.nodes ?? []);
        this.edges.set(c.edges ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.router.navigate(['/campaigns']);
      },
    });
  }

  // ─── Nodes ─────────────────────────────────────────────────────────────────

  addNode(type: NodeType): void {
    const count = this.nodes().length;
    const node: CanvasNode = {
      id: crypto.randomUUID(),
      type,
      x: 80 + count * 260,
      y: 140,
      config: type === 'sms' ? { message: '' } : { op: 'AND', conditions: [] },
    };
    this.nodes.update((ns) => [...ns, node]);
    this.select(node.id);
  }

  deleteNode(id: string, event: MouseEvent): void {
    event.stopPropagation();
    this.nodes.update((ns) => ns.filter((n) => n.id !== id));
    this.edges.update((es) =>
      es.filter((e) => e.source_node_id !== id && e.target_node_id !== id),
    );
    if (this.selectedNodeId() === id) {
      this.selectedNodeId.set(null);
      this.connectingFrom = null;
    }
  }

  select(id: string): void {
    if (this.connectingFrom && this.connectingFrom !== id) {
      this.createEdge(this.connectingFrom, id);
      this.connectingFrom = null;
      return;
    }
    this.connectingFrom = null;
    this.selectedNodeId.set(id);
    this.audienceCount = null;
    const node = this.nodes().find((n) => n.id === id);
    if (!node) return;
    if (node.type === 'segment') {
      const cfg = node.config as FilterGroup;
      this.editLogic = cfg.op ?? 'AND';
      this.editConditions = (cfg.conditions ?? []).map((c) => {
        const leaf = c as FilterLeaf;
        return {
          field: leaf.field,
          operator: leaf.operator,
          value: Array.isArray(leaf.value)
            ? (leaf.value as string[]).join(', ')
            : String(leaf.value),
        };
      });
    } else {
      this.editSmsMessage = (node.config as { message: string }).message ?? '';
    }
  }

  deselectAll(): void {
    if (this.connectingFrom) {
      this.connectingFrom = null;
      return;
    }
    this.selectedNodeId.set(null);
  }

  nodeSummary(node: CanvasNode): string {
    if (node.type === 'sms') {
      const msg = (node.config as { message: string }).message;
      return msg ? msg.slice(0, 26) + (msg.length > 26 ? '…' : '') : 'Sin mensaje';
    }
    const n = ((node.config as FilterGroup).conditions ?? []).length;
    return n === 0 ? 'Sin filtros' : `${n} condición${n === 1 ? '' : 'es'}`;
  }

  // ─── Segment config ────────────────────────────────────────────────────────

  addCondition(): void {
    this.editConditions = [
      ...this.editConditions,
      { field: 'country', operator: 'eq', value: '' },
    ];
    this.flushSegmentConfig();
  }

  removeCondition(i: number): void {
    this.editConditions = this.editConditions.filter((_, idx) => idx !== i);
    this.flushSegmentConfig();
  }

  onConditionChange(): void {
    this.flushSegmentConfig();
  }

  onLogicChange(): void {
    this.flushSegmentConfig();
  }

  private flushSegmentConfig(): void {
    const id = this.selectedNodeId();
    if (!id) return;
    const group: FilterGroup = {
      op: this.editLogic,
      conditions: this.editConditions
        .filter((c) => c.value.trim())
        .map((c) => ({
          field: c.field,
          operator: c.operator,
          value:
            c.operator === 'in'
              ? c.value.split(',').map((v) => v.trim()).filter(Boolean)
              : c.value,
        })) as FilterLeaf[],
    };
    this.nodes.update((ns) =>
      ns.map((n) => (n.id === id ? { ...n, config: group } : n)),
    );
  }

  recalculate(): void {
    const id = this.selectedNodeId();
    if (!id) return;
    this.flushSegmentConfig();
    this.audienceLoading = true;
    this.audienceCount = null;
    const node = this.nodes().find((n) => n.id === id);
    if (!node) return;
    this.doSave(() => {
      this.segmentService.getAudience(id, node.config as FilterGroup).subscribe({
        next: (res) => {
          this.audienceCount = res.count;
          this.audienceLoading = false;
        },
        error: () => (this.audienceLoading = false),
      });
    });
  }

  // ─── SMS config ────────────────────────────────────────────────────────────

  get smsChars(): number {
    return this.editSmsMessage.length;
  }

  get smsSegments(): number {
    return Math.ceil(this.smsChars / 160) || 1;
  }

  onSmsChange(): void {
    const id = this.selectedNodeId();
    if (!id) return;
    this.nodes.update((ns) =>
      ns.map((n) =>
        n.id === id ? { ...n, config: { message: this.editSmsMessage } } : n,
      ),
    );
  }

  // ─── Edges ─────────────────────────────────────────────────────────────────

  startConnect(nodeId: string, event: MouseEvent): void {
    event.stopPropagation();
    this.connectingFrom = nodeId;
    this.selectedNodeId.set(null);
  }

  private createEdge(sourceId: string, targetId: string): void {
    const exists = this.edges().some(
      (e) => e.source_node_id === sourceId && e.target_node_id === targetId,
    );
    if (exists || sourceId === targetId) return;
    this.edges.update((es) => [
      ...es,
      { id: crypto.randomUUID(), source_node_id: sourceId, target_node_id: targetId },
    ]);
  }

  deleteEdge(id: string, event: MouseEvent): void {
    event.stopPropagation();
    this.edges.update((es) => es.filter((e) => e.id !== id));
  }

  edgePath(edge: CanvasEdge): string {
    const src = this.nodes().find((n) => n.id === edge.source_node_id);
    const tgt = this.nodes().find((n) => n.id === edge.target_node_id);
    if (!src || !tgt) return '';
    const sx = src.x + NODE_W;
    const sy = src.y + NODE_H / 2;
    const tx = tgt.x;
    const ty = tgt.y + NODE_H / 2;
    const cp = Math.max(Math.abs(tx - sx) * 0.45, 60);
    return `M ${sx} ${sy} C ${sx + cp} ${sy}, ${tx - cp} ${ty}, ${tx} ${ty}`;
  }

  edgeMid(edge: CanvasEdge): { x: number; y: number } {
    const src = this.nodes().find((n) => n.id === edge.source_node_id);
    const tgt = this.nodes().find((n) => n.id === edge.target_node_id);
    if (!src || !tgt) return { x: 0, y: 0 };
    return {
      x: (src.x + NODE_W + tgt.x) / 2,
      y: (src.y + NODE_H / 2 + tgt.y + NODE_H / 2) / 2,
    };
  }

  // ─── Drag ──────────────────────────────────────────────────────────────────

  onNodeMouseDown(event: MouseEvent, nodeId: string): void {
    if ((event.target as HTMLElement).closest('.port, .node-delete')) return;
    event.preventDefault();
    event.stopPropagation();
    const node = this.nodes().find((n) => n.id === nodeId)!;
    this.drag = {
      nodeId,
      startMX: event.clientX,
      startMY: event.clientY,
      startNX: node.x,
      startNY: node.y,
    };
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (!this.drag) return;
    const nx = Math.max(0, this.drag.startNX + event.clientX - this.drag.startMX);
    const ny = Math.max(0, this.drag.startNY + event.clientY - this.drag.startMY);
    this.nodes.update((ns) =>
      ns.map((n) => (n.id === this.drag!.nodeId ? { ...n, x: nx, y: ny } : n)),
    );
  }

  @HostListener('document:mouseup')
  onMouseUp(): void {
    this.drag = null;
  }

  // ─── Save ──────────────────────────────────────────────────────────────────

  save(): void {
    this.doSave();
  }

  private doSave(onDone?: () => void): void {
    const c = this.campaign();
    if (!c) return;
    this.saving.set(true);
    this.canvasService
      .saveCanvas(c.id, {
        nodes: this.nodes().map((n) => ({
          id: n.id,
          type: n.type,
          x: n.x,
          y: n.y,
          config: n.config,
        })),
        edges: this.edges().map((e) => ({
          id: e.id,
          source_node_id: e.source_node_id,
          target_node_id: e.target_node_id,
        })),
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          if (!onDone) this.toast.show('Canvas guardado');
          onDone?.();
        },
        error: () => {
          this.saving.set(false);
          this.toast.show('Error al guardar el canvas', 'error');
        },
      });
  }

  back(): void {
    this.router.navigate(['/campaigns']);
  }
}

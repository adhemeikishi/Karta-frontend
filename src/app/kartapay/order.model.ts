/** Types miroir de `com.qrmenu.kartapay.OrderDtos` (backend) — commandes Karta Pay (admin). */

export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';

export const ORDER_STATUSES: readonly OrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'READY',
  'COMPLETED',
  'CANCELLED',
];

export type FulfillmentType = 'DINE_IN' | 'TAKEAWAY';

export interface OrderLine {
  id: string;
  itemId: string;
  itemNameSnapshot: string;
  unitPriceCentsSnapshot: number;
  quantity: number;
  lineTotalCents: number;
  /** JSON brut (voir `OrderService.snapshotJson` côté backend), ou `null` sans option choisie. */
  modifiersSnapshot: string | null;
}

export interface OrderSummary {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  fulfillmentType: FulfillmentType;
  tableNumber: string | null;
  customerName: string | null;
  totalCents: number;
  currency: string;
  createdAt: string;
}

export interface OrderDetail extends OrderSummary {
  subtotalCents: number;
  updatedAt: string;
  lines: OrderLine[];
}

export interface UpdateOrderStatusRequest {
  status: OrderStatus;
}

/**
 * Miroir de `Order.transitionTo` côté backend : seules ces transitions sont acceptées.
 * Sert uniquement à ne proposer que des boutons qui fonctionneront — le backend revalide
 * de toute façon, ce n'est qu'une question d'UX, pas de sécurité.
 */
export const ORDER_STATUS_TRANSITIONS: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY', 'CANCELLED'],
  READY: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'En attente',
  CONFIRMED: 'Confirmée',
  PREPARING: 'En préparation',
  READY: 'Prête',
  COMPLETED: 'Terminée',
  CANCELLED: 'Annulée',
};

export const FULFILLMENT_LABELS: Record<FulfillmentType, string> = {
  DINE_IN: 'Sur place',
  TAKEAWAY: 'À emporter',
};

/** Un style par statut, en réutilisant les classes badge existantes — jamais de nouvelle couleur. */
export function orderStatusBadgeClass(status: OrderStatus): string {
  switch (status) {
    case 'COMPLETED':
    case 'READY':
      return 'badge badge-active badge-dot';
    case 'CONFIRMED':
      return 'badge badge-ready badge-dot';
    case 'PREPARING':
      return 'badge badge-draft badge-dot';
    case 'CANCELLED':
      return 'badge badge-cancelled badge-dot';
    default:
      return 'badge badge-inactive badge-dot';
  }
}

/** Une option sélectionnée, telle que figée dans `OrderLine.modifiersSnapshot` (JSON). */
export interface OrderLineModifier {
  name: string;
  priceDeltaCents: number;
}

/** `modifiersSnapshot` est une chaîne JSON côté backend (ou `null`) : ne jamais faire confiance à sa forme. */
export function parseModifiersSnapshot(snapshot: string | null): OrderLineModifier[] {
  if (!snapshot) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(snapshot);
    return Array.isArray(parsed) ? (parsed as OrderLineModifier[]) : [];
  } catch {
    return [];
  }
}

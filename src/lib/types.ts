/** Shared DTO types passed from server components to client views. */

export type SellerDTO = {
  id: string;
  name: string;
  slug?: string | null;
  shopTitle?: string | null;
  province?: string | null;
  bio?: string | null;
  avatar?: string | null;
  verified: boolean;
};

export type ReviewDTO = {
  id: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
  sellerReply?: string | null;
  canReview?: boolean; // buyer-side hint (delivered purchase)
};

export type AuthenticityDTO = {
  hologramCode: string;
  status: "VERIFIED" | "PENDING" | "REJECTED";
  labStatus: string;
  tests: Array<{ name: string; result: string; detail: string }>;
  inspector?: string | null;
  issuedAt?: string | null;
  notes?: string | null;
};

export type ArtworkDTO = {
  id: string;
  code: string;
  slug: string;
  title: string;
  description: string;
  story?: string | null;
  price: number;
  compareAtPrice?: number | null;
  images: string[];
  materials?: string | null;
  dimensions?: string | null;
  yearMade?: string | null;
  province?: string | null;
  stock: number;
  status: string;
  featured: boolean;
  rating: number;
  ratingCount: number;
  sizes: Array<{ label: string; dims: string }>;
  colors: Array<{ label: string; hex: string }>;
  seller: SellerDTO;
  categoryId: string;
  categorySlug: string;
  categoryTitle: string;
  authenticity?: AuthenticityDTO | null;
  reviews: ReviewDTO[];
  reviewNote?: string | null;
  publishedAt?: string | null;
  expiresAt?: string | null;
  createdAt: string;
};

export type CategoryDTO = {
  id: string;
  slug: string;
  title: string;
  tagline?: string | null;
  image?: string | null;
  count: number;
};

export type BlogPostDTO = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  image?: string | null;
  author: string;
  category?: string | null;
  readTime: number;
  featured: boolean;
  createdAt: string;
};

export type CartItemDTO = {
  id: string;
  artworkId: string;
  title: string;
  image: string;
  price: number;
  quantity: number;
  variant?: string | null;
  sellerName: string;
  stock: number;
  available: number; // stock − active reservations
  code: string;
  sellerId: string;
};

export type ShippingMethodDTO = {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  priceToman: number;
};

export type AddressDTO = {
  id: string;
  title: string;
  receiverName: string;
  phone: string;
  province: string;
  city: string;
  postalCode?: string | null;
  line1: string;
  isDefault: boolean;
};

export type SessionUserDTO = {
  id: string;
  email: string;
  name: string;
  role: "BUYER" | "ARTISAN" | "ADMIN";
  slug?: string | null;
  shopTitle?: string | null;
  province?: string | null;
  bio?: string | null;
  avatar?: string | null;
  iban?: string | null;
  verified: boolean;
} | null;

export type OrderItemDTO = {
  id: string;
  title: string;
  image: string;
  unitPrice: number;
  quantity: number;
  sellerId: string;
  sellerOrderId?: string | null;
  sellerName?: string | null;
};

export type OrderEventDTO = {
  id: string;
  type: string;
  status?: string | null;
  detail?: string | null;
  actor: string;
  sellerOrderId?: string | null;
  createdAt: string;
};

export type SellerOrderDTO = {
  id: string;
  sellerId: string;
  sellerName: string;
  sellerShopTitle?: string | null;
  status: string;
  gross: number;
  discountShare: number;
  net: number;
  commission: number;
  shippingShare: number;
  itemIds: string[];
  paidAt?: string | null;
  shippedAt?: string | null;
  deliveredAt?: string | null;
};

export type OrderDTO = {
  id: string;
  orderNumber: string;
  buyerId?: string | null;
  buyerName: string;
  buyerPhone: string;
  city: string;
  address: string;
  postalCode?: string | null;
  note?: string | null;
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  status: string;
  createdAt: string;
  items: OrderItemDTO[];
  sellerOrders: SellerOrderDTO[];
  events: OrderEventDTO[];
  payments: Array<{
    id: string;
    provider: string;
    amount: number;
    status: string;
    refNumber?: string | null;
    message?: string | null;
    createdAt: string;
  }>;
};

export type SellerOrderRowDTO = SellerOrderDTO & {
  orderNumber: string;
  orderStatus: string;
  orderCreatedAt: string;
  buyerName: string;
  items: Array<OrderItemDTO>;
  orderAddress: string;
  orderCity: string;
  orderPhone: string;
  orderNote?: string | null;
};

export type LedgerEntryDTO = {
  id: string;
  kind: string;
  amount: number;
  detail?: string | null;
  status: string;
  availableAt?: string | null;
  createdAt: string;
  orderId?: string | null;
  sellerOrderId?: string | null;
};

export type PayoutDTO = {
  id: string;
  amount: number;
  iban: string;
  status: string;
  adminNote?: string | null;
  reference?: string | null;
  createdAt: string;
  decidedAt?: string | null;
  paidAt?: string | null;
  sellerName?: string;
};

export type InvoiceDTO = {
  id: string;
  number: string;
  kind: string;
  status: string;
  amount: number;
  description: string;
  createdAt: string;
  paidAt?: string | null;
  orderNumber?: string | null;
  artworkTitle?: string | null;
};

export type SubscriptionDTO = {
  id: string;
  planId: string;
  planTitle: string;
  status: string;
  startsAt: string;
  expiresAt: string;
  maxActiveListings?: number | null;
  listingFeeToman?: number;
  commissionBps?: number;
};

export type PlanDTO = {
  id: string;
  slug: string;
  title: string;
  tag?: string | null;
  priceToman: number;
  periodDays: number;
  maxActiveListings: number | null;
  listingFeeToman: number;
  commissionBps: number;
  features: string[];
  highlight: boolean;
};

export type LabRequestDTO = {
  id: string;
  kind: string;
  preferredDate?: string | null;
  note?: string | null;
  status: string;
  createdAt: string;
  artworkTitle: string;
  artworkCode: string;
};

export type MemberRequestDTO = {
  id: string;
  workshop: string;
  province: string;
  portfolio?: string | null;
  status: string;
  createdAt: string;
  userName: string;
  userEmail: string;
};

export type ReturnRequestDTO = {
  id: string;
  orderItemId: string;
  itemTitle: string;
  orderNumber: string;
  orderNumberShort: string;
  buyerName?: string;
  sellerName?: string;
  sellerOrderId?: string | null;
  reason: string;
  detail?: string | null;
  status: string;
  resolution?: string | null;
  createdAt: string;
};

export type AdminTransactionDTO = {
  id: string;
  kind: string;
  amount: number;
  detail?: string | null;
  createdAt: string;
};

export type AuditLogDTO = {
  id: string;
  actor: string;
  action: string;
  target?: string | null;
  detail?: string | null;
  createdAt: string;
};

export type ContactMessageDTO = {
  id: string;
  name: string;
  email: string;
  subject?: string | null;
  message: string;
  handled: boolean;
  createdAt: string;
};

export type NotificationDTO = {
  id: string;
  type: string;
  title: string;
  body: string;
  link?: string | null;
  readAt?: string | null;
  createdAt: string;
};

export type BalanceDTO = {
  pending: number; // در انتظار تحویل
  holding: number; // در دوره نگهداری
  cleared: number; // قابل تسویه
  lockedInPayouts: number;
  available: number; // cleared − locked
};

export type ArtisanStatsDTO = {
  views: number | null; // null = plan does not include stats
  sales: number;
  revenue: number;
};

// ---------- Discounts ----------

export type DiscountAudience = "ALL" | "BUYER" | "ARTISAN";

export type DiscountKind = "PERCENT" | "FIXED";

export type DiscountArtworkDTO = {
  artworkId: string;
  code: string;
  slug: string;
  title: string;
  image: string;
  price: number;
  artisanName: string;
  shopTitle?: string | null;
};

export type DiscountCampaignDTO = {
  id: string;
  title: string;
  occasion: string;
  description?: string | null;
  startsAt: string;
  endsAt: string;
  active: boolean;
  createdAt: string;
  artworks: DiscountArtworkDTO[];
  codeCount: number;
};

export type DiscountCodeDTO = {
  id: string;
  campaignId?: string | null;
  campaignTitle?: string | null;
  code: string;
  title: string;
  description?: string | null;
  kind: DiscountKind;
  amount: number;
  maxPrice?: number | null;
  minPrice?: number | null;
  audience: DiscountAudience;
  maxUses: number;
  usedCount: number;
  perUserLimit: number;
  startsAt?: string | null;
  expiresAt?: string | null;
  active: boolean;
  createdAt: string;
  /** Public sidecar fields (filled for the storefront view) */
  remaining?: number;
  claimedByMe?: boolean;
  myUses?: number;
};

export type DiscountRedemptionDTO = {
  id: string;
  code: string;
  codeTitle: string;
  userName: string;
  userEmail: string;
  status: string;
  createdAt: string;
};

export type DiscountStatus =
  | "VALID"
  | "NOT_FOUND"
  | "INACTIVE"
  | "NOT_STARTED"
  | "EXPIRED"
  | "EXHAUSTED"
  | "USER_LIMIT"
  | "AUDIENCE_MISMATCH";

export type AdminDiscountsDTO = {
  campaigns: DiscountCampaignDTO[];
  codes: DiscountCodeDTO[];
  redemptions: DiscountRedemptionDTO[];
  stats: {
    campaigns: number;
    activeCampaigns: number;
    codes: number;
    activeCodes: number;
    redemptions: number;
  };
};

// ---------------------------------------------------------------------------
// Per-page data bundles (Phase 4: NO monolithic loadAppData — each route's
// Server Component loads exactly what that page needs, paginated).
// ---------------------------------------------------------------------------

export type ShellData = {
  user: SessionUserDTO;
  cartCount: number;
  categories: CategoryDTO[];
  unreadNotifications: number;
  demoMode: boolean;
};

export type CatalogResult = {
  artworks: ArtworkDTO[];
  total: number;
  page: number;
  pageSize: number;
};

export type AppData = {
  user: SessionUserDTO;
  categories: CategoryDTO[];
  artworks?: ArtworkDTO[];
  catalog?: CatalogResult;
  posts?: BlogPostDTO[];
  cart?: CartItemDTO[];
  addresses?: AddressDTO[];
  shippingMethods?: ShippingMethodDTO[];
  discounts?: {
    campaigns: DiscountCampaignDTO[];
    codes: DiscountCodeDTO[];
  };
  // Buyer
  myOrders?: OrderDTO[];
  favorites?: string[];
  // Artisan
  myArtworks?: ArtworkDTO[];
  sellerOrders?: SellerOrderRowDTO[];
  artisanOrders?: OrderDTO[];
  ledger?: LedgerEntryDTO[];
  balance?: BalanceDTO;
  payouts?: PayoutDTO[];
  invoices?: InvoiceDTO[];
  subscription?: SubscriptionDTO | null;
  labRequests?: LabRequestDTO[];
  // Admin
  admin?: {
    memberRequests: MemberRequestDTO[];
    plans: PlanDTO[];
    subscriptions: Array<SubscriptionDTO & { sellerName: string; sellerEmail: string }>;
    transactions: AdminTransactionDTO[];
    audit: AuditLogDTO[];
    messages: ContactMessageDTO[];
    labQueue: Array<{
      id: string;
      code: string;
      title: string;
      sellerName: string;
      hologramCode: string;
      status: string;
      labStatus: string;
    }>;
    stats: {
      users: number;
      artworks: number;
      orders: number;
      revenue: number;
      pendingMembers: number;
      pendingArtworks: number;
      messages: number;
    };
    payouts: PayoutDTO[];
    returns: ReturnRequestDTO[];
    revenueByKind: Array<{ kind: string; amount: number }>;
    settings: Record<string, string>;
    discounts: AdminDiscountsDTO;
  };
};

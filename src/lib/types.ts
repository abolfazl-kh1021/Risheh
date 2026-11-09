/** Shared DTO types passed from server components to the client SPA. */

export type SellerDTO = {
  id: string;
  name: string;
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
  code: string;
};

export type SessionUserDTO = {
  id: string;
  email: string;
  name: string;
  role: "BUYER" | "ARTISAN" | "ADMIN";
  shopTitle?: string | null;
  province?: string | null;
  bio?: string | null;
  avatar?: string | null;
  verified: boolean;
  planId?: string | null;
} | null;

export type OrderItemDTO = {
  id: string;
  title: string;
  image: string;
  unitPrice: number;
  quantity: number;
  sellerId: string;
};

export type OrderDTO = {
  id: string;
  orderNumber: string;
  buyerName: string;
  buyerPhone: string;
  city: string;
  address: string;
  postalCode?: string | null;
  note?: string | null;
  subtotal: number;
  shipping: number;
  total: number;
  status: string;
  createdAt: string;
  items: OrderItemDTO[];
  tracking: Array<{ id: string; status: string; detail?: string | null; actor: string; createdAt: string }>;
  payments: Array<{
    id: string;
    gateway: string;
    amount: number;
    status: string;
    refNumber?: string | null;
    message?: string | null;
    createdAt: string;
  }>;
};

export type LedgerEntryDTO = {
  id: string;
  kind: string;
  amount: number;
  detail?: string | null;
  status: string;
  createdAt: string;
  orderId?: string | null;
};

export type SettlementDTO = {
  id: string;
  amount: number;
  iban: string;
  status: string;
  adminNote?: string | null;
  createdAt: string;
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
  planId: string;
  status: string;
  createdAt: string;
  userName: string;
  userEmail: string;
};

export type PlanDTO = {
  id: string;
  title: string;
  tag?: string | null;
  price: number;
  unit: string;
  artworks: string;
  support: string;
  discount: string;
  features: string[];
  highlight: boolean;
};

export type AdminTransactionDTO = {
  id: string;
  actor: string;
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

export type AppData = {
  user: SessionUserDTO;
  categories: CategoryDTO[];
  artworks: ArtworkDTO[];
  posts: BlogPostDTO[];
  cart: CartItemDTO[];
  // Discounts (public storefront view — active campaigns & codes)
  discounts?: {
    campaigns: DiscountCampaignDTO[];
    codes: DiscountCodeDTO[];
  };
  // Buyer
  myOrders?: OrderDTO[];
  favorites?: string[];
  // Artisan
  myArtworks?: ArtworkDTO[];
  artisanOrders?: OrderDTO[];
  ledger?: LedgerEntryDTO[];
  settlements?: SettlementDTO[];
  labRequests?: LabRequestDTO[];
  plan?: PlanDTO | null;
  // Admin
  admin?: {
    memberRequests: MemberRequestDTO[];
    plans: PlanDTO[];
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
    settlements: Array<{
      id: string;
      amount: number;
      iban: string;
      status: string;
      adminNote?: string | null;
      createdAt: string;
      sellerName: string;
    }>;
    discounts: AdminDiscountsDTO;
  };
};

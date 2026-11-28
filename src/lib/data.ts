import { db } from "@/lib/db";
import { getCurrentUser, getGuestKey } from "@/lib/session";
import { cached, invalidateCache, PUBLIC_CATALOG_KEY, PUBLIC_CATALOG_TTL_MS } from "@/lib/cache";
import { unreadNotificationCount } from "@/lib/notify";
import { effectivePlan } from "@/lib/payments/finalize";
import type {
  AdminDiscountsDTO,
  AppData,
  ArtworkDTO,
  BalanceDTO,
  BlogPostDTO,
  CartItemDTO,
  CatalogResult,
  CategoryDTO,
  DiscountArtworkDTO,
  DiscountCampaignDTO,
  DiscountCodeDTO,
  DiscountRedemptionDTO,
  LedgerEntryDTO,
  OrderDTO,
  OrderEventDTO,
  PlanDTO,
  SellerOrderDTO,
  SellerOrderRowDTO,
  ShellData,
} from "@/lib/types";
import { withCanonicalCategories } from "@/lib/categories";
import type { Prisma } from "@prisma/client";

// ============================================================================
// Mappers
// ============================================================================

type ArtworkWithRelations = Prisma.ArtworkGetPayload<{
  include: {
    seller: true;
    category: true;
    authenticity: true;
    reviews: { include: { user: true }; orderBy: { createdAt: "desc" } };
  };
}>;

export function mapArtwork(a: ArtworkWithRelations): ArtworkDTO {
  return {
    id: a.id,
    code: a.code,
    slug: a.slug,
    title: a.title,
    description: a.description,
    story: a.story,
    price: a.price,
    compareAtPrice: a.compareAtPrice,
    images: JSON.parse(a.images || "[]") as string[],
    materials: a.materials,
    dimensions: a.dimensions,
    yearMade: a.yearMade,
    province: a.province,
    stock: a.stock,
    status: a.status,
    featured: a.featured,
    rating: a.rating,
    ratingCount: a.ratingCount,
    sizes: JSON.parse(a.sizes || "[]"),
    colors: JSON.parse(a.colors || "[]"),
    seller: {
      id: a.seller.id,
      name: a.seller.name,
      slug: a.seller.slug,
      shopTitle: a.seller.shopTitle,
      province: a.seller.province,
      bio: a.seller.bio,
      avatar: a.seller.avatar,
      verified: a.seller.verified,
    },
    categoryId: a.categoryId,
    categorySlug: a.category.slug,
    categoryTitle: a.category.title,
    authenticity: a.authenticity
      ? {
          hologramCode: a.authenticity.hologramCode,
          status: a.authenticity.status as "VERIFIED" | "PENDING" | "REJECTED",
          labStatus: a.authenticity.labStatus,
          tests: JSON.parse(a.authenticity.tests || "[]"),
          inspector: a.authenticity.inspector,
          issuedAt: a.authenticity.issuedAt?.toISOString() ?? null,
          notes: a.authenticity.notes,
        }
      : null,
    reviews: a.reviews.map((r) => ({
      id: r.id,
      userName: r.user.name,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt.toISOString(),
      sellerReply: r.sellerReply,
    })),
    reviewNote: a.reviewNote,
    publishedAt: a.publishedAt?.toISOString() ?? null,
    expiresAt: a.expiresAt?.toISOString() ?? null,
    createdAt: a.createdAt.toISOString(),
  };
}

const ORDER_INCLUDE = {
  items: { include: { sellerOrder: true, artwork: { include: { seller: true } } } },
  sellerOrders: { include: { seller: true } },
  events: { orderBy: { createdAt: "asc" as const } },
  payments: true,
} satisfies Prisma.OrderInclude;

type OrderWithRelations = Prisma.OrderGetPayload<{ include: typeof ORDER_INCLUDE }>;

export function mapOrder(o: OrderWithRelations): OrderDTO {
  return {
    id: o.id,
    orderNumber: o.orderNumber,
    buyerId: o.buyerId,
    buyerName: o.buyerName,
    buyerPhone: o.buyerPhone,
    city: o.city,
    address: o.address,
    postalCode: o.postalCode,
    note: o.note,
    subtotal: o.subtotal,
    discount: o.discount,
    shipping: o.shipping,
    total: o.total,
    status: o.status,
    createdAt: o.createdAt.toISOString(),
    items: o.items.map((i) => ({
      id: i.id,
      title: i.titleSnapshot,
      image: i.imageSnapshot,
      unitPrice: i.unitPrice,
      quantity: i.quantity,
      sellerId: i.sellerId,
      sellerOrderId: i.sellerOrderId,
      sellerName: i.artwork?.seller?.shopTitle ?? i.artwork?.seller?.name ?? null,
    })),
    sellerOrders: o.sellerOrders.map((so) => ({
      id: so.id,
      sellerId: so.sellerId,
      sellerName: so.seller.name,
      sellerShopTitle: so.seller.shopTitle,
      status: so.status,
      gross: so.gross,
      discountShare: so.discountShare,
      net: so.net,
      commission: so.commission,
      shippingShare: so.shippingShare,
      itemIds: o.items.filter((i) => i.sellerOrderId === so.id).map((i) => i.id),
      paidAt: so.paidAt?.toISOString() ?? null,
      shippedAt: so.shippedAt?.toISOString() ?? null,
      deliveredAt: so.deliveredAt?.toISOString() ?? null,
    })),
    events: o.events.map(
      (e): OrderEventDTO => ({
        id: e.id,
        type: e.type,
        status: e.status,
        detail: e.detail,
        actor: e.actor,
        sellerOrderId: e.sellerOrderId,
        createdAt: e.createdAt.toISOString(),
      })
    ),
    payments: o.payments.map((p) => ({
      id: p.id,
      provider: p.provider,
      amount: p.amount,
      status: p.status,
      refNumber: p.refNumber,
      message: p.message,
      createdAt: p.createdAt.toISOString(),
    })),
  };
}

export function mapPlan(p: Prisma.PlanGetPayload<Record<string, never>>): PlanDTO {
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    tag: p.tag,
    priceToman: p.priceToman,
    periodDays: p.periodDays,
    maxActiveListings: p.maxActiveListings,
    listingFeeToman: p.listingFeeToman,
    commissionBps: p.commissionBps,
    features: JSON.parse(p.features || "[]") as string[],
    highlight: p.highlight,
  };
}

function mapLedger(l: Prisma.LedgerEntryGetPayload<Record<string, never>>): LedgerEntryDTO {
  return {
    id: l.id,
    kind: l.kind,
    amount: l.amount,
    detail: l.detail,
    status: l.status,
    availableAt: l.availableAt?.toISOString() ?? null,
    createdAt: l.createdAt.toISOString(),
    orderId: l.orderId,
    sellerOrderId: l.sellerOrderId,
  };
}

// ============================================================================
// Shell (header/footer/tabbar) — small, per-request
// ============================================================================

export async function loadCategoryCounts(): Promise<CategoryDTO[]> {
  const rows = await cached("categories-with-counts", PUBLIC_CATALOG_TTL_MS, async () => {
    const [categoriesRaw, counts] = await Promise.all([
      db.category.findMany({ orderBy: { order: "asc" } }),
      db.artwork.groupBy({
        by: ["categoryId"],
        where: { status: "PUBLISHED", deletedAt: null },
        _count: { _all: true },
      }),
    ]);
    const countMap = new Map(counts.map((c) => [c.categoryId, c._count._all]));
    return categoriesRaw.map(
      (c): CategoryDTO => ({
        id: c.id,
        slug: c.slug,
        title: c.title,
        tagline: c.tagline,
        image: c.image,
        count: countMap.get(c.id) ?? 0,
      })
    );
  });
  return withCanonicalCategories(rows);
}

export async function loadShellData(): Promise<ShellData> {
  const user = await getCurrentUser();
  const guestKey = await getGuestKey();
  const [cartCount, categories, unread] = await Promise.all([
    user
      ? db.cartItem.count({ where: { userId: user.id } })
      : guestKey
        ? db.cartItem.count({ where: { guestKey } })
        : Promise.resolve(0),
    loadCategoryCounts(),
    user ? unreadNotificationCount(user.id) : Promise.resolve(0),
  ]);
  return {
    user,
    cartCount,
    categories,
    unreadNotifications: unread,
    demoMode: process.env.DEMO_MODE === "true",
  };
}

// ============================================================================
// Public catalog — paginated, filterable, sortable (M1, Phase 4)
// ============================================================================

export type CatalogQuery = {
  category?: string; // slug or "all"
  q?: string;
  province?: string;
  minPrice?: number;
  maxPrice?: number;
  verifiedOnly?: boolean;
  featured?: boolean;
  sort?: "newest" | "price-asc" | "price-desc" | "rating";
  page?: number;
  pageSize?: number;
};

const CATALOG_SELECT = {
  seller: true,
  category: true,
  authenticity: { select: { status: true } },
  reviews: { select: { rating: true } },
} satisfies Prisma.ArtworkInclude;

export async function loadCatalog(query: CatalogQuery): Promise<CatalogResult> {
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(48, Math.max(6, query.pageSize ?? 12));
  const where: Prisma.ArtworkWhereInput = {
    status: "PUBLISHED",
    deletedAt: null,
    ...(query.category && query.category !== "all"
      ? { category: { slug: query.category } }
      : {}),
    ...(query.q
      ? {
          OR: [
            { title: { contains: query.q } },
            { description: { contains: query.q } },
            { story: { contains: query.q } },
            { materials: { contains: query.q } },
            { seller: { is: { shopTitle: { contains: query.q } } } },
            { seller: { is: { name: { contains: query.q } } } },
          ],
        }
      : {}),
    ...(query.province ? { province: { contains: query.province } } : {}),
    ...(query.minPrice !== undefined || query.maxPrice !== undefined
      ? {
          price: {
            ...(query.minPrice !== undefined ? { gte: query.minPrice } : {}),
            ...(query.maxPrice !== undefined ? { lte: query.maxPrice } : {}),
          },
        }
      : {}),
    ...(query.verifiedOnly ? { authenticity: { is: { status: "VERIFIED" } } } : {}),
    ...(query.featured ? { featured: true } : {}),
  };

  const orderBy: Prisma.ArtworkOrderByWithRelationInput[] =
    query.sort === "price-asc"
      ? [{ price: "asc" }]
      : query.sort === "price-desc"
        ? [{ price: "desc" }]
        : query.sort === "rating"
          ? [{ rating: "desc" }, { ratingCount: "desc" }]
          : [{ featured: "desc" }, { createdAt: "desc" }];

  const [rows, total] = await Promise.all([
    db.artwork.findMany({
      where,
      include: CATALOG_SELECT,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.artwork.count({ where }),
  ]);

  const artworks: ArtworkDTO[] = rows.map((a) => ({
    id: a.id,
    code: a.code,
    slug: a.slug,
    title: a.title,
    description: a.description,
    story: a.story,
    price: a.price,
    compareAtPrice: a.compareAtPrice,
    images: JSON.parse(a.images || "[]") as string[],
    materials: a.materials,
    dimensions: a.dimensions,
    yearMade: a.yearMade,
    province: a.province,
    stock: a.stock,
    status: a.status,
    featured: a.featured,
    rating: a.rating,
    ratingCount: a.ratingCount,
    sizes: JSON.parse(a.sizes || "[]"),
    colors: JSON.parse(a.colors || "[]"),
    seller: {
      id: a.seller.id,
      name: a.seller.name,
      slug: a.seller.slug,
      shopTitle: a.seller.shopTitle,
      province: a.seller.province,
      bio: a.seller.bio,
      avatar: a.seller.avatar,
      verified: a.seller.verified,
    },
    categoryId: a.categoryId,
    categorySlug: a.category.slug,
    categoryTitle: a.category.title,
    authenticity: a.authenticity
      ? {
          hologramCode: a.authenticity.status,
          status: a.authenticity.status as "VERIFIED" | "PENDING" | "REJECTED",
          labStatus: a.authenticity.status,
          tests: [],
          inspector: null,
          issuedAt: null,
          notes: null,
        }
      : null,
    reviews: [],
    createdAt: a.createdAt.toISOString(),
  }));

  return { artworks, total, page, pageSize };
}

export async function loadProduct(idOrSlug: string): Promise<ArtworkDTO | null> {
  const a = await db.artwork.findFirst({
    where: {
      OR: [{ slug: idOrSlug }, { id: idOrSlug }, { code: idOrSlug }],
      status: "PUBLISHED",
      deletedAt: null,
    },
    include: {
      seller: true,
      category: true,
      authenticity: true,
      reviews: { include: { user: true }, orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
  return a ? mapArtwork(a) : null;
}

export async function loadHomeData(): Promise<{
  categories: CategoryDTO[];
  featured: ArtworkDTO[];
  latest: ArtworkDTO[];
  posts: BlogPostDTO[];
}> {
  const [categories, featuredRows, latestRows, posts] = await Promise.all([
    loadCategoryCounts(),
    db.artwork.findMany({
      where: { status: "PUBLISHED", deletedAt: null, featured: true },
      include: { seller: true, category: true, authenticity: true, reviews: { include: { user: true }, orderBy: { createdAt: "desc" } } },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    db.artwork.findMany({
      where: { status: "PUBLISHED", deletedAt: null },
      include: { seller: true, category: true, authenticity: true, reviews: { include: { user: true }, orderBy: { createdAt: "desc" } } },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    db.blogPost.findMany({ orderBy: [{ featured: "desc" }, { createdAt: "desc" }], take: 6 }),
  ]);
  return {
    categories,
    featured: featuredRows.map(mapArtwork),
    latest: latestRows.map(mapArtwork),
    posts: posts.map(mapPost),
  };
}

export function mapPost(p: Prisma.BlogPostGetPayload<Record<string, never>>): BlogPostDTO {
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt,
    content: p.content,
    image: p.image,
    author: p.author,
    category: p.category,
    readTime: p.readTime,
    featured: p.featured,
    createdAt: p.createdAt.toISOString(),
  };
}

export async function loadBlogList(): Promise<BlogPostDTO[]> {
  const rows = await db.blogPost.findMany({ orderBy: [{ featured: "desc" }, { createdAt: "desc" }], take: 48 });
  return rows.map(mapPost);
}

export async function loadBlogPost(slug: string): Promise<BlogPostDTO | null> {
  const p = await db.blogPost.findUnique({ where: { slug } });
  return p ? mapPost(p) : null;
}

// ============================================================================
// Cart & checkout (M5)
// ============================================================================

export async function loadCartData(): Promise<{
  cart: CartItemDTO[];
  addresses: AppData["addresses"];
  shippingMethods: AppData["shippingMethods"];
}> {
  const user = await getCurrentUser();
  const guestKey = await getGuestKey();
  const where = user ? { userId: user.id } : guestKey ? { guestKey } : { id: "__none__" };
  const [cartRaw, addresses, shippingMethods] = await Promise.all([
    db.cartItem.findMany({
      where,
      include: { artwork: { include: { seller: true } } },
      orderBy: { createdAt: "asc" },
    }),
    user
      ? db.address.findMany({ where: { userId: user.id, deletedAt: null }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] })
      : Promise.resolve([]),
    db.shippingMethod.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
  ]);

  const reservationSums = await db.stockReservation.groupBy({
    by: ["artworkId"],
    where: { status: "ACTIVE", artworkId: { in: cartRaw.map((c) => c.artworkId) } },
    _sum: { quantity: true },
  });
  const reservedMap = new Map(reservationSums.map((r) => [r.artworkId, r._sum.quantity ?? 0]));

  const cart: CartItemDTO[] = cartRaw.map((c) => ({
    id: c.id,
    artworkId: c.artworkId,
    title: c.artwork.title,
    image: (JSON.parse(c.artwork.images || "[]") as string[])[0] ?? "",
    price: c.artwork.price,
    quantity: c.quantity,
    variant: c.variant,
    sellerName: c.artwork.seller.name,
    sellerId: c.artwork.sellerId,
    stock: c.artwork.stock,
    available: Math.max(0, c.artwork.stock - (reservedMap.get(c.artworkId) ?? 0)),
    code: c.artwork.code,
  }));

  return {
    cart,
    addresses: addresses.map((a) => ({
      id: a.id,
      title: a.title,
      receiverName: a.receiverName,
      phone: a.phone,
      province: a.province,
      city: a.city,
      postalCode: a.postalCode,
      line1: a.line1,
      isDefault: a.isDefault,
    })),
    shippingMethods: shippingMethods.map((s) => ({
      id: s.id,
      slug: s.slug,
      title: s.title,
      description: s.description,
      priceToman: s.priceToman,
    })),
  };
}

// ============================================================================
// Buyer orders (M7)
// ============================================================================

export async function loadBuyerOrders(take = 30): Promise<OrderDTO[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const rows = await db.order.findMany({
    where: { buyerId: user.id },
    include: ORDER_INCLUDE,
    orderBy: { createdAt: "desc" },
    take,
  });
  return rows.map(mapOrder);
}

export async function loadOrderForViewer(
  orderNumber: string,
  viewer: { id: string; role: string } | null,
  guestKey: string | null = null
): Promise<OrderDTO | null> {
  const order = await db.order.findUnique({
    where: { orderNumber },
    include: ORDER_INCLUDE,
  });
  if (!order) return null;
  // Authorization: the buyer, the anonymous guest (cookie key), a seller of any
  // item, or an admin. Guest identity is the httpOnly guest cookie itself.
  if (viewer) {
    if (viewer.role === "ADMIN") return mapOrder(order);
    if (order.buyerId === viewer.id) return mapOrder(order);
    const isSeller = order.items.some((i) => i.sellerId === viewer.id);
    if (isSeller) return mapOrder(order);
  }
  if (guestKey && order.guestKey === guestKey && !order.buyerId) return mapOrder(order);
  return null;
}

export async function loadFavorites(userId: string): Promise<ArtworkDTO[]> {
  const favs = await db.favorite.findMany({
    where: { userId },
    include: {
      artwork: {
        include: { seller: true, category: true, authenticity: true, reviews: { include: { user: true }, orderBy: { createdAt: "desc" } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return favs.filter((f) => f.artwork.status === "PUBLISHED").map((f) => mapArtwork(f.artwork));
}

export async function loadFavoriteIds(userId: string): Promise<string[]> {
  const favs = await db.favorite.findMany({ where: { userId }, select: { artworkId: true } });
  return favs.map((f) => f.artworkId);
}

// ============================================================================
// Artisan dashboard (M4/M8/S5/S6)
// ============================================================================

export async function loadArtisanArtworks(): Promise<ArtworkDTO[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const rows = await db.artwork.findMany({
    where: { sellerId: user.id, deletedAt: null },
    include: {
      seller: true,
      category: true,
      authenticity: true,
      reviews: { include: { user: true }, orderBy: { createdAt: "desc" } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return rows.map(mapArtwork);
}

export async function loadSellerOrderRows(take = 60): Promise<SellerOrderRowDTO[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const rows = await db.sellerOrder.findMany({
    where: { sellerId: user.id },
    include: {
      order: { select: { orderNumber: true, status: true, createdAt: true, buyerName: true, address: true, city: true, buyerPhone: true, note: true } },
      items: { include: { artwork: { include: { seller: true } } } },
      seller: true,
    },
    orderBy: { createdAt: "desc" },
    take,
  });
  return rows.map((so) => ({
    id: so.id,
    sellerId: so.sellerId,
    sellerName: so.seller.name,
    sellerShopTitle: so.seller.shopTitle,
    status: so.status,
    gross: so.gross,
    discountShare: so.discountShare,
    net: so.net,
    commission: so.commission,
    shippingShare: so.shippingShare,
    itemIds: so.items.map((i) => i.id),
    paidAt: so.paidAt?.toISOString() ?? null,
    shippedAt: so.shippedAt?.toISOString() ?? null,
    deliveredAt: so.deliveredAt?.toISOString() ?? null,
    orderNumber: so.order.orderNumber,
    orderStatus: so.order.status,
    orderCreatedAt: so.order.createdAt.toISOString(),
    buyerName: so.order.buyerName,
    orderAddress: so.order.address,
    orderCity: so.order.city,
    orderPhone: so.order.buyerPhone,
    orderNote: so.order.note,
    items: so.items.map((i) => ({
      id: i.id,
      title: i.titleSnapshot,
      image: i.imageSnapshot,
      unitPrice: i.unitPrice,
      quantity: i.quantity,
      sellerId: i.sellerId,
      sellerOrderId: i.sellerOrderId,
      sellerName: i.artwork?.seller?.shopTitle ?? null,
    })),
  }));
}

export async function loadFinanceData(): Promise<{
  ledger: LedgerEntryDTO[];
  balance: BalanceDTO;
  payouts: AppData["payouts"];
  invoices: AppData["invoices"];
  subscription: AppData["subscription"];
  sellerOrders: SellerOrderRowDTO[];
}> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      ledger: [],
      balance: { pending: 0, holding: 0, cleared: 0, lockedInPayouts: 0, available: 0 },
      payouts: [],
      invoices: [],
      subscription: null,
      sellerOrders: [],
    };
  }
  const [ledgerRows, payouts, invoiceRows, sub, sellerOrders] = await Promise.all([
    db.ledgerEntry.findMany({ where: { sellerId: user.id }, orderBy: { createdAt: "desc" }, take: 100 }),
    db.payoutRequest.findMany({ where: { sellerId: user.id }, orderBy: { createdAt: "desc" } }),
    db.invoice.findMany({
      where: { payerId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { order: { select: { orderNumber: true } }, listing: { select: { title: true } } },
    }),
    effectivePlan(user.id),
    loadSellerOrderRows(30),
  ]);
  const subscriptionRow = await db.subscription.findFirst({
    where: { sellerId: user.id, status: "ACTIVE" },
    include: { plan: true },
    orderBy: { expiresAt: "desc" },
  });

  const sumBy = (status: string) =>
    ledgerRows.filter((l) => l.kind === "SALE" && l.status === status).reduce((s, l) => s + l.amount, 0);
  const pending = sumBy("PENDING");
  const holding = sumBy("HOLDING");
  const cleared = ledgerRows.filter((l) => l.status === "CLEARED").reduce((s, l) => s + l.amount, 0);
  const lockedInPayouts = payouts
    .filter((p) => p.status === "PENDING" || p.status === "APPROVED")
    .reduce((s, p) => s + p.amount, 0);

  return {
    ledger: ledgerRows.map(mapLedger),
    balance: {
      pending,
      holding,
      cleared,
      lockedInPayouts,
      available: Math.max(0, cleared - lockedInPayouts),
    },
    payouts: payouts.map((p) => ({
      id: p.id,
      amount: p.amount,
      iban: p.iban,
      status: p.status,
      adminNote: p.adminNote,
      reference: p.reference,
      createdAt: p.createdAt.toISOString(),
      decidedAt: p.decidedAt?.toISOString() ?? null,
      paidAt: p.paidAt?.toISOString() ?? null,
    })),
    invoices: invoiceRows.map((i) => ({
      id: i.id,
      number: i.number,
      kind: i.kind,
      status: i.status,
      amount: i.amount,
      description: i.description,
      createdAt: i.createdAt.toISOString(),
      paidAt: i.paidAt?.toISOString() ?? null,
      orderNumber: i.order?.orderNumber ?? null,
      artworkTitle: i.listing?.title ?? null,
    })),
    subscription: subscriptionRow
      ? {
          id: subscriptionRow.id,
          planId: subscriptionRow.planId,
          planTitle: subscriptionRow.plan.title,
          status: subscriptionRow.status,
          startsAt: subscriptionRow.startsAt.toISOString(),
          expiresAt: subscriptionRow.expiresAt.toISOString(),
          maxActiveListings: subscriptionRow.plan.maxActiveListings,
          listingFeeToman: subscriptionRow.plan.listingFeeToman,
          commissionBps: subscriptionRow.plan.commissionBps,
        }
      : null,
    sellerOrders,
  };
}

export async function loadLabRequests(): Promise<AppData["labRequests"]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const rows = await db.labRequest.findMany({
    where: { sellerId: user.id },
    include: { artwork: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return rows.map((l) => ({
    id: l.id,
    kind: l.kind,
    preferredDate: l.preferredDate,
    note: l.note,
    status: l.status,
    createdAt: l.createdAt.toISOString(),
    artworkTitle: l.artwork.title,
    artworkCode: l.artwork.code,
  }));
}

export async function loadPlanState(sellerId: string): Promise<{
  subscription: AppData["subscription"];
  activeCount: number;
  plans: PlanDTO[];
}> {
  const [sub, activeCount, plansRaw] = await Promise.all([
    db.subscription.findFirst({
      where: { sellerId, status: "ACTIVE" },
      include: { plan: true },
      orderBy: { expiresAt: "desc" },
    }),
    db.artwork.count({ where: { sellerId, status: { in: ["PUBLISHED", "PENDING_REVIEW"] }, deletedAt: null } }),
    db.plan.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
  ]);
  return {
    subscription: sub
      ? {
          id: sub.id,
          planId: sub.planId,
          planTitle: sub.plan.title,
          status: sub.status,
          startsAt: sub.startsAt.toISOString(),
          expiresAt: sub.expiresAt.toISOString(),
          maxActiveListings: sub.plan.maxActiveListings,
          listingFeeToman: sub.plan.listingFeeToman,
          commissionBps: sub.plan.commissionBps,
        }
      : null,
    activeCount,
    plans: plansRaw.map(mapPlan),
  };
}

// ============================================================================
// Discounts (S7)
// ============================================================================

type CampaignWithRelations = Prisma.DiscountCampaignGetPayload<{
  include: {
    codes: true;
    artworks: { include: { artwork: { include: { seller: true } } } };
  };
}>;

function mapCampaignArtwork(
  link: { artwork: Prisma.ArtworkGetPayload<{ include: { seller: true } }> },
  opts: { publishedOnly: boolean }
): DiscountArtworkDTO | null {
  if (opts.publishedOnly && link.artwork.status !== "PUBLISHED") return null;
  return {
    artworkId: link.artwork.id,
    code: link.artwork.code,
    slug: link.artwork.slug,
    title: link.artwork.title,
    image: (JSON.parse(link.artwork.images || "[]") as string[])[0] ?? "",
    price: link.artwork.price,
    artisanName: link.artwork.seller.name,
    shopTitle: link.artwork.seller.shopTitle,
  };
}

function mapCampaign(
  c: CampaignWithRelations,
  opts: { publishedOnly: boolean }
): DiscountCampaignDTO {
  const artworks = c.artworks
    .map((l) => mapCampaignArtwork(l, { publishedOnly: opts.publishedOnly }))
    .filter((a): a is DiscountArtworkDTO => a !== null);
  return {
    id: c.id,
    title: c.title,
    occasion: c.occasion,
    description: c.description,
    startsAt: c.startsAt.toISOString(),
    endsAt: c.endsAt.toISOString(),
    active: c.active,
    createdAt: c.createdAt.toISOString(),
    artworks,
    codeCount: c.codes.length,
  };
}

export function mapDiscountCode(
  c: Prisma.DiscountCodeGetPayload<{ include: { campaign: true } }>
): DiscountCodeDTO {
  return {
    id: c.id,
    campaignId: c.campaignId,
    campaignTitle: c.campaign?.title ?? null,
    code: c.code,
    title: c.title,
    description: c.description,
    kind: c.kind as DiscountCodeDTO["kind"],
    amount: c.amount,
    maxPrice: c.maxPrice,
    minPrice: c.minPrice,
    audience: c.audience as DiscountCodeDTO["audience"],
    maxUses: c.maxUses,
    usedCount: c.usedCount,
    perUserLimit: c.perUserLimit,
    startsAt: c.startsAt?.toISOString() ?? null,
    expiresAt: c.expiresAt?.toISOString() ?? null,
    active: c.active,
    createdAt: c.createdAt.toISOString(),
  };
}

/** Storefront discounts: active campaigns + active codes (+ per-user claim state). */
export async function loadStorefrontDiscounts(userId: string | null): Promise<
  NonNullable<AppData["discounts"]>
> {
  const now = new Date();
  const [campaignsRaw, codesRaw, myRedemptions] = await Promise.all([
    db.discountCampaign.findMany({
      where: { active: true, endsAt: { gte: now } },
      include: {
        codes: { where: { active: true } },
        artworks: { include: { artwork: { include: { seller: true } } } },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.discountCode.findMany({
      where: { active: true, OR: [{ expiresAt: null }, { expiresAt: { gte: now } }] },
      include: { campaign: true },
      orderBy: { createdAt: "desc" },
    }),
    userId
      ? db.discountRedemption.findMany({ where: { userId }, select: { codeId: true } })
      : Promise.resolve([] as Array<{ codeId: string }>),
  ]);

  const myCounts = new Map<string, number>();
  for (const r of myRedemptions) myCounts.set(r.codeId, (myCounts.get(r.codeId) ?? 0) + 1);

  const campaigns = campaignsRaw.map((c) => mapCampaign(c, { publishedOnly: true }));
  const codes = codesRaw.map((c) => ({
    ...mapDiscountCode(c),
    remaining: Math.max(0, c.maxUses - c.usedCount),
    claimedByMe: (myCounts.get(c.id) ?? 0) > 0,
    myUses: myCounts.get(c.id) ?? 0,
  }));

  return { campaigns, codes };
}

/** Full management view for the admin panel. */
export async function loadAdminDiscounts(): Promise<AdminDiscountsDTO> {
  const now = new Date();
  const [campaignsRaw, codesRaw, redemptionsRaw, redemptionCount] = await Promise.all([
    db.discountCampaign.findMany({
      include: {
        codes: true,
        artworks: { include: { artwork: { include: { seller: true } } } },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.discountCode.findMany({ include: { campaign: true }, orderBy: { createdAt: "desc" } }),
    db.discountRedemption.findMany({
      include: { user: true, code: true },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    db.discountRedemption.count(),
  ]);

  const redemptions: DiscountRedemptionDTO[] = redemptionsRaw.map((r) => ({
    id: r.id,
    code: r.code.code,
    codeTitle: r.code.title,
    userName: r.user.name,
    userEmail: r.user.email,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
  }));

  return {
    campaigns: campaignsRaw.map((c) => mapCampaign(c, { publishedOnly: false })),
    codes: codesRaw.map((c) => ({
      ...mapDiscountCode(c),
      remaining: Math.max(0, c.maxUses - c.usedCount),
    })),
    redemptions,
    stats: {
      campaigns: campaignsRaw.length,
      activeCampaigns: campaignsRaw.filter((c) => c.active && c.endsAt >= now).length,
      codes: codesRaw.length,
      activeCodes: codesRaw.filter((c) => c.active).length,
      redemptions: redemptionCount,
    },
  };
}

// ============================================================================
// Admin (S3/S5/S7)
// ============================================================================

export async function loadAdminData(): Promise<NonNullable<AppData["admin"]>> {
  const [members, plansRaw, subs, txns, audit, messages, labQueue, userCount, artworkCount, orderCount, pendingMembers, pendingArtworks, payouts, returns, revenueByKind, settingsRows, discounts] =
    await Promise.all([
      db.memberRequest.findMany({ include: { user: true }, orderBy: { createdAt: "desc" } }),
      db.plan.findMany({ orderBy: { sortOrder: "asc" } }),
      db.subscription.findMany({
        include: { seller: { select: { name: true, email: true } }, plan: true },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      db.platformRevenueEntry.findMany({ orderBy: { createdAt: "desc" }, take: 60 }),
      db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 60 }),
      db.contactMessage.findMany({ orderBy: { createdAt: "desc" }, take: 60 }),
      db.authenticityRecord.findMany({
        include: { artwork: { include: { seller: true } } },
        orderBy: { updatedAt: "desc" },
        take: 24,
      }),
      db.user.count(),
      db.artwork.count({ where: { deletedAt: null } }),
      db.order.count(),
      db.memberRequest.count({ where: { status: "PENDING" } }),
      db.artwork.count({ where: { status: "PENDING_REVIEW" } }),
      db.payoutRequest.findMany({ include: { seller: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 40 }),
      db.returnRequest.findMany({
        include: {
          item: { include: { order: { select: { orderNumber: true } }, artwork: { include: { seller: { select: { name: true } } } } } },
          buyer: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 40,
      }),
      db.platformRevenueEntry.groupBy({ by: ["kind"], _sum: { amount: true } }),
      db.setting.findMany(),
      loadAdminDiscounts(),
    ]);

  const settings: Record<string, string> = {};
  for (const s of settingsRows) settings[s.key] = s.value;

  return {
    memberRequests: members.map((m) => ({
      id: m.id,
      workshop: m.workshop,
      province: m.province,
      portfolio: m.portfolio,
      status: m.status,
      createdAt: m.createdAt.toISOString(),
      userName: m.user.name,
      userEmail: m.user.email,
    })),
    plans: plansRaw.map(mapPlan),
    subscriptions: subs.map((s) => ({
      id: s.id,
      planId: s.planId,
      planTitle: s.plan.title,
      status: s.status,
      startsAt: s.startsAt.toISOString(),
      expiresAt: s.expiresAt.toISOString(),
      sellerName: s.seller.name,
      sellerEmail: s.seller.email,
    })),
    transactions: txns.map((t) => ({
      id: t.id,
      kind: t.kind,
      amount: t.amount,
      detail: t.detail,
      createdAt: t.createdAt.toISOString(),
    })),
    audit: audit.map((a) => ({
      id: a.id,
      actor: a.actor,
      action: a.action,
      target: a.target,
      detail: a.detail,
      createdAt: a.createdAt.toISOString(),
    })),
    messages: messages.map((m) => ({
      id: m.id,
      name: m.name,
      email: m.email,
      subject: m.subject,
      message: m.message,
      handled: m.handled,
      createdAt: m.createdAt.toISOString(),
    })),
    labQueue: labQueue.map((r) => ({
      id: r.id,
      code: r.artwork.code,
      title: r.artwork.title,
      sellerName: r.artwork.seller.name,
      hologramCode: r.hologramCode,
      status: r.status,
      labStatus: r.labStatus,
    })),
    stats: {
      users: userCount,
      artworks: artworkCount,
      orders: orderCount,
      revenue: revenueByKind.reduce((s, k) => s + (k._sum.amount ?? 0), 0),
      pendingMembers,
      pendingArtworks,
      messages: messages.filter((m) => !m.handled).length,
    },
    payouts: payouts.map((p) => ({
      id: p.id,
      amount: p.amount,
      iban: p.iban,
      status: p.status,
      adminNote: p.adminNote,
      reference: p.reference,
      createdAt: p.createdAt.toISOString(),
      decidedAt: p.decidedAt?.toISOString() ?? null,
      paidAt: p.paidAt?.toISOString() ?? null,
      sellerName: p.seller.name,
    })),
    returns: returns.map((r) => ({
      id: r.id,
      orderItemId: r.orderItemId,
      itemTitle: r.item.titleSnapshot,
      orderNumber: r.item.order.orderNumber,
      orderNumberShort: r.item.order.orderNumber,
      buyerName: r.buyer.name,
      sellerName: r.item.artwork.seller.name,
      sellerOrderId: r.sellerOrderId,
      reason: r.reason,
      detail: r.detail,
      status: r.status,
      resolution: r.resolution,
      createdAt: r.createdAt.toISOString(),
    })),
    revenueByKind: revenueByKind.map((k) => ({ kind: k.kind, amount: k._sum.amount ?? 0 })),
    settings,
    discounts,
  };
}

// ---------------------------------------------------------------------------
// Cache invalidation (same public key as before)
// ---------------------------------------------------------------------------

export function invalidatePublicCatalog(): void {
  invalidateCache(PUBLIC_CATALOG_KEY);
  invalidateCache("categories-with-counts");
}

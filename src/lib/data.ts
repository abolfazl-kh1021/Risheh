import { db } from "@/lib/db";
import { getCurrentUser, getGuestKey } from "@/lib/session";
import { cached, invalidateCache, PUBLIC_CATALOG_KEY, PUBLIC_CATALOG_TTL_MS } from "@/lib/cache";
import type {
  AppData,
  ArtworkDTO,
  BlogPostDTO,
  CartItemDTO,
  CategoryDTO,
  DiscountArtworkDTO,
  DiscountCampaignDTO,
  DiscountCodeDTO,
  DiscountRedemptionDTO,
  OrderDTO,
  PlanDTO,
} from "@/lib/types";
import type { Prisma } from "@prisma/client";

type ArtworkWithRelations = Prisma.ArtworkGetPayload<{
  include: {
    seller: true;
    category: true;
    authenticity: true;
    reviews: { include: { user: true } };
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
    })),
    createdAt: a.createdAt.toISOString(),
  };
}

export function mapOrder(o: Prisma.OrderGetPayload<{
  include: { items: true; tracking: true; payments: true };
}>): OrderDTO {
  return {
    id: o.id,
    orderNumber: o.orderNumber,
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
    })),
    tracking: o.tracking.map((t) => ({
      id: t.id,
      status: t.status,
      detail: t.detail,
      actor: t.actor,
      createdAt: t.createdAt.toISOString(),
    })),
    payments: o.payments.map((p) => ({
      id: p.id,
      gateway: p.gateway,
      amount: p.amount,
      status: p.status,
      refNumber: p.refNumber,
      message: p.message,
      createdAt: p.createdAt.toISOString(),
    })),
  };
}

export function mapPlan(p: {
  id: string;
  title: string;
  tag: string | null;
  price: number;
  unit: string;
  artworks: string;
  support: string;
  discount: string;
  features: string;
  highlight: boolean;
}): PlanDTO {
  return {
    id: p.id,
    title: p.title,
    tag: p.tag,
    price: p.price,
    unit: p.unit,
    artworks: p.artworks,
    support: p.support,
    discount: p.discount,
    features: JSON.parse(p.features || "[]") as string[],
    highlight: p.highlight,
  };
}

/**
 * Public catalog (categories + published artworks + posts), mapped to DTOs.
 * Cached via the TTL cache-aside helper (10s) — identical for every visitor,
 * invalidated by catalog-affecting actions. User-specific data is NEVER cached.
 */
async function loadPublicCatalog(): Promise<{
  categories: CategoryDTO[];
  artworks: ArtworkDTO[];
  posts: BlogPostDTO[];
}> {
  const [categoriesRaw, artworksRaw, postsRaw] = await Promise.all([
    db.category.findMany({ orderBy: { order: "asc" } }),
    db.artwork.findMany({
      where: { status: "PUBLISHED" },
      include: {
        seller: true,
        category: true,
        authenticity: true,
        reviews: { include: { user: true }, orderBy: { createdAt: "desc" } },
      },
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
    }),
    db.blogPost.findMany({ orderBy: { featured: "desc" }, take: 24 }),
  ]);

  const categories: CategoryDTO[] = categoriesRaw.map((c) => ({
    id: c.id,
    slug: c.slug,
    title: c.title,
    tagline: c.tagline,
    image: c.image,
    count: artworksRaw.filter((a) => a.categoryId === c.id).length,
  }));

  const artworks = artworksRaw.map(mapArtwork);
  const posts: BlogPostDTO[] = postsRaw.map((p) => ({
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
  }));

  return { categories, artworks, posts };
}

export async function loadAppData(): Promise<AppData> {
  // User + guest cookie first, so the cart query hits the DB with a WHERE
  // clause instead of loading every visitor's cart and filtering in JS.
  const [user, guestKey] = await Promise.all([getCurrentUser(), getGuestKey()]);

  const { categories, artworks, posts } = await cached(
    PUBLIC_CATALOG_KEY,
    PUBLIC_CATALOG_TTL_MS,
    loadPublicCatalog
  );

  const cartWhere = user
    ? { userId: user.id }
    : guestKey
      ? { guestKey }
      : { id: "__none__" }; // no session, no cart
  const cartRaw = await db.cartItem.findMany({
    where: cartWhere,
    include: { artwork: { include: { seller: true, category: true } } },
  });
  const myCart = cartRaw;

  const cart: CartItemDTO[] = myCart.map((c) => ({
    id: c.id,
    artworkId: c.artworkId,
    title: c.artwork.title,
    image: (JSON.parse(c.artwork.images || "[]") as string[])[0] ?? "",
    price: c.artwork.price,
    quantity: c.quantity,
    variant: c.variant,
    sellerName: c.artwork.seller.name,
    stock: c.artwork.stock,
    code: c.artwork.code,
  }));

  const data: AppData = {
    user,
    categories,
    artworks,
    posts,
    cart,
  };

  // Discount campaigns & codes are public storefront content; the per-user
  // claim state is filled when a session exists (never cached).
  data.discounts = await loadStorefrontDiscounts(user?.id ?? null);

  if (user) {
    // Buyer orders + favorites in parallel (no waterfall)
    const [orders, favs] = await Promise.all([
      db.order.findMany({
        where: { buyerId: user.id },
        include: { items: true, tracking: true, payments: true },
        orderBy: { createdAt: "desc" },
      }),
      db.favorite.findMany({ where: { userId: user.id }, select: { artworkId: true } }),
    ]);
    data.myOrders = orders.map(mapOrder);
    data.favorites = favs.map((f) => f.artworkId);
  }

  if (user && user.role === "ARTISAN") {
    // All seller-scope reads run concurrently (previously 6 sequential awaits).
    const [mine, sellerOrders, ledger, settlements, labs, planRow] = await Promise.all([
      db.artwork.findMany({
        where: { sellerId: user.id },
        include: {
          seller: true,
          category: true,
          authenticity: true,
          reviews: { include: { user: true }, orderBy: { createdAt: "desc" } },
        },
        orderBy: { createdAt: "desc" },
      }),
      db.order.findMany({
        where: { items: { some: { sellerId: user.id } }, status: { in: ["PAID", "PREPARING", "SHIPPED", "DELIVERED"] } },
        include: { items: true, tracking: true, payments: true },
        orderBy: { createdAt: "desc" },
      }),
      db.ledgerEntry.findMany({ where: { sellerId: user.id }, orderBy: { createdAt: "desc" }, take: 50 }),
      db.settlementRequest.findMany({ where: { sellerId: user.id }, orderBy: { createdAt: "desc" } }),
      db.labRequest.findMany({
        where: { sellerId: user.id },
        include: { artwork: true },
        orderBy: { createdAt: "desc" },
      }),
      user.planId
        ? db.subscriptionPlan.findUnique({ where: { id: user.planId } })
        : Promise.resolve(null),
    ]);
    data.myArtworks = mine.map(mapArtwork);
    data.artisanOrders = sellerOrders.map(mapOrder);

    data.ledger = ledger.map((l) => ({
      id: l.id,
      kind: l.kind,
      amount: l.amount,
      detail: l.detail,
      status: l.status,
      createdAt: l.createdAt.toISOString(),
      orderId: l.orderId,
    }));

    data.settlements = settlements.map((s) => ({
      id: s.id,
      amount: s.amount,
      iban: s.iban,
      status: s.status,
      adminNote: s.adminNote,
      createdAt: s.createdAt.toISOString(),
    }));

    data.labRequests = labs.map((l) => ({
      id: l.id,
      kind: l.kind,
      preferredDate: l.preferredDate,
      note: l.note,
      status: l.status,
      createdAt: l.createdAt.toISOString(),
      artworkTitle: l.artwork.title,
      artworkCode: l.artwork.code,
    }));

    data.plan = planRow ? mapPlan(planRow) : null;
  }

  if (user && user.role === "ADMIN") {
    const [members, plansRaw, txns, audit, messages, labQueue, userCount, artworkCount, orderCount, pendingMembers, pendingArtworks, allSettlements, shopOrders] =
      await Promise.all([
        db.memberRequest.findMany({ include: { user: true }, orderBy: { createdAt: "desc" } }),
        db.subscriptionPlan.findMany(),
        db.ledgerEntry.findMany({ orderBy: { createdAt: "desc" }, take: 40 }),
        db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 40 }),
        db.contactMessage.findMany({ orderBy: { createdAt: "desc" }, take: 40 }),
        db.authenticityRecord.findMany({
          include: { artwork: { include: { seller: true } } },
          orderBy: { updatedAt: "desc" },
          take: 24,
        }),
        db.user.count(),
        db.artwork.count(),
        db.order.count(),
        db.memberRequest.count({ where: { status: "PENDING" } }),
        db.artwork.count({ where: { status: "PENDING" } }),
        db.settlementRequest.findMany({ include: { seller: true }, orderBy: { createdAt: "desc" }, take: 30 }),
        // Admin also operates the shop-side order pipeline (M7): all active orders.
        db.order.findMany({
          where: { status: { in: ["PAID", "PREPARING", "SHIPPED", "DELIVERED"] } },
          include: { items: true, tracking: true, payments: true },
          orderBy: { createdAt: "desc" },
        }),
      ]);

    // Revenue aggregated in the DB instead of loading every order into memory.
    const revenueAgg = await db.order.aggregate({
      _sum: { total: true },
      where: { status: { notIn: ["CANCELLED", "PENDING_PAYMENT"] } },
    });
    const revenue = revenueAgg._sum.total ?? 0;

    data.artisanOrders = shopOrders.map(mapOrder);
    data.admin = {
      memberRequests: members.map((m) => ({
        id: m.id,
        workshop: m.workshop,
        province: m.province,
        portfolio: m.portfolio,
        planId: m.planId,
        status: m.status,
        createdAt: m.createdAt.toISOString(),
        userName: m.user.name,
        userEmail: m.user.email,
      })),
      plans: plansRaw.map(mapPlan),
      transactions: txns.map((t) => ({
        id: t.id,
        actor: "—",
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
      settlements: allSettlements.map((s) => ({
        id: s.id,
        amount: s.amount,
        iban: s.iban,
        status: s.status,
        adminNote: s.adminNote,
        createdAt: s.createdAt.toISOString(),
        sellerName: s.seller.name,
      })),
      stats: {
        users: userCount,
        artworks: artworkCount,
        orders: orderCount,
        revenue,
        pendingMembers,
        pendingArtworks,
        messages: messages.filter((m) => !m.handled).length,
      },
      discounts: await loadAdminDiscounts(),
    };
  }

  return data;
}

/** Invalidate the cached public catalog after catalog-affecting writes. */
export function invalidatePublicCatalog(): void {
  invalidateCache(PUBLIC_CATALOG_KEY);
}

// ---------------- Discounts ----------------

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
  // Only published artworks are shown on the storefront side of campaigns.
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
async function loadStorefrontDiscounts(userId: string | null): Promise<
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
async function loadAdminDiscounts(): Promise<NonNullable<AppData["admin"]>["discounts"]> {
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

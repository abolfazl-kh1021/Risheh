/**
 * Risheh seed — demo/sample data extracted from the original design archive.
 * All data is clearly SAMPLE data for the demo build (see docs/DATA_MODEL.md).
 * Run: bun prisma/seed.ts
 */
import { PrismaClient } from "@prisma/client";
import { scryptSync, randomBytes } from "crypto";
import catalog from "./seed-data/catalog.json";
import assetMap from "./seed-data/asset_map.json";

const db = new PrismaClient();

/** Map a remote/source URL to the local downloaded copy under /assets/img */
function img(url: string | undefined): string {
  if (!url) return "/assets/img/logo-mark.webp";
  const local = (assetMap as Record<string, string>)[url];
  return local || "/assets/img/logo-mark.webp";
}

function localImg(name: string): string {
  return `/assets/img/${name}`;
}

const PWD_HASH = (_salt: string, pass: string) => {
  const s = randomBytes(16).toString("hex");
  return `${s}:${scryptSync(pass, s, 64).toString("hex")}`;
};

const DEMO_PASSWORD = "risheh1403";

async function main() {
  // DEMO_MODE gate (rule ۱۰): without it, NO seed and NO default accounts.
  // Escape hatch for local dev only: `SEED_FORCE=1 bun prisma/seed.ts`.
  if (process.env.DEMO_MODE !== "true" && process.env.SEED_FORCE !== "1") {
    console.error(
      "Refusing to seed: DEMO_MODE=true required (or SEED_FORCE=1 for local dev).\n" +
        "بدون حالت دمو هیچ داده نمونه‌ای ساخته نمی‌شود؛ ادمین را با `bun run admin:create` بسازید."
    );
    process.exit(1);
  }
  console.log("Seeding Risheh demo data…");
  await db.returnRequest.deleteMany();
  await db.orderEvent.deleteMany();
  await db.paymentEvent.deleteMany();
  await db.paymentAttempt.deleteMany();
  await db.stockReservation.deleteMany();
  await db.orderItem.deleteMany();
  await db.sellerOrder.deleteMany();
  await db.order.deleteMany();
  await db.invoice.deleteMany();
  await db.subscription.deleteMany();
  await db.plan.deleteMany();
  await db.ledgerEntry.deleteMany();
  await db.payoutRequest.deleteMany();
  await db.address.deleteMany();
  await db.notification.deleteMany();
  await db.rateLimitBucket.deleteMany();
  await db.discountRedemption.deleteMany();
  await db.discountCode.deleteMany();
  await db.discountArtwork.deleteMany();
  await db.discountCampaign.deleteMany();
  await db.auditLog.deleteMany();
  await db.verificationEvent.deleteMany();
  await db.cartItem.deleteMany();
  await db.memberRequest.deleteMany();
  await db.labRequest.deleteMany();
  await db.authenticityRecord.deleteMany();
  await db.review.deleteMany();
  await db.favorite.deleteMany();
  await db.contactMessage.deleteMany();
  await db.blogPost.deleteMany();
  await db.shippingMethod.deleteMany();
  await db.artwork.deleteMany();
  await db.category.deleteMany();
  await db.session.deleteMany();
  await db.user.deleteMany();

  // ---------------- Users ----------------
  const pass = () => PWD_HASH("x", DEMO_PASSWORD);

  const admin = await db.user.create({
    data: {
      email: "admin@risheh.ir",
      passwordHash: pass(),
      name: "مدیریت ریشه",
      role: "ADMIN",
      phone: "021-12345678",
      verified: true,
    },
  });

  const artisan = await db.user.create({
    data: {
      email: "artisan@risheh.ir",
      passwordHash: pass(),
      name: "استاد سهراب سپهری‌راد",
      role: "ARTISAN",
      shopTitle: "کارگاه و نگارخانه استاد سهراب سپهری‌راد",
      province: "اصفهان",
      bio: "پیشکسوت میناکاری و قلم‌زنی اصفهان با بیش از ۳۵ سال فعالیت در میدان نقش‌جهان؛ دارنده نشان درجه‌یک هنری وزارت میراث فرهنگی.",
      avatar: localImg("img_2e787d364347.webp"),
      slug: "sohrab-sepehrirad",
      iban: "IR420170000000123456789001",
      verified: true,
    },
  });

  const rugMaster = await db.user.create({
    data: {
      email: "shirazi@risheh.ir",
      passwordHash: pass(),
      name: "استاد حاج یعقوب شیرازی",
      role: "ARTISAN",
      shopTitle: "کارگاه قالی‌بافی استاد شیرازی",
      province: "فارس",
      bio: "پیشکسوت هنر قالی‌بافی و احیاگر نقوش کهن عشایری فارس (بیش از ۴۰ سال سابقه طراحی و نظارت بر دار قالی).",
      slug: "haj-yaqub-shirazi",
      verified: true,
    },
  });

  const esmaili = await db.user.create({
    data: {
      email: "esmaili@risheh.ir",
      passwordHash: pass(),
      name: "کارگاه اسماعیلی",
      role: "ARTISAN",
      shopTitle: "کارگاه میناکاری اسماعیلی اصفهان",
      province: "اصفهان",
      bio: "میناکاری بر مس خالص با لعاب کوارتز نسوز و رنگ‌های سنتی لاجورد و شنگرف.",
      slug: "esmaili-mina",
      verified: true,
    },
  });

  const habibian = await db.user.create({
    data: {
      email: "habibian@risheh.ir",
      passwordHash: pass(),
      name: "کارگاه حبیبیان نائین",
      role: "ARTISAN",
      shopTitle: "کارگاه بافت حبیبیان نائین",
      province: "اصفهان",
      bio: "بافت فرش نائین ۹ لا با ابریشم سفید خالص کاشان و نقوش اسلیمی شاه‌عباسی.",
      slug: "habibian-nain",
      verified: true,
    },
  });

  const motamedi = await db.user.create({
    data: {
      email: "motamedi@risheh.ir",
      passwordHash: pass(),
      name: "استاد رسول معتمدی",
      role: "ARTISAN",
      shopTitle: "کارگاه قلم‌زنی معتمدی",
      province: "اصفهان",
      bio: "دارنده نشان درجه‌یک هنری (قلم‌زنی مس) — زادگاه اصفهان، پل خواجو.",
      slug: "rasul-motamedi",
      verified: true,
    },
  });

  const buyer = await db.user.create({
    data: {
      email: "buyer@risheh.ir",
      passwordHash: pass(),
      name: "آرش کامانی",
      role: "BUYER",
      phone: "09121234567",
    },
  });

  const pendingArtisan = await db.user.create({
    data: {
      email: "nazari@risheh.ir",
      passwordHash: pass(),
      name: "استاد فرهاد نظری",
      role: "ARTISAN",
      shopTitle: "کارگاه سفال و لعاب نظری",
      province: "همدان",
      bio: "سفالگر لالجین؛ متقاضی پیوستن به گنجینه ریشه.",
      verified: false,
    },
  });

  // ---------------- Categories ----------------
  const catDefs: Array<{
    slug: string;
    title: string;
    tagline: string;
    arr: string;
  }> = [
    { slug: "carpet", title: "فرش، گلیم و زیرانداز", tagline: "قالیبافی و گلیم", arr: "rugs" },
    { slug: "metal", title: "میناکاری و قلم‌زنی", tagline: "نقش و آتش بر مس", arr: "metals" },
    { slug: "pottery", title: "سفال و سرامیک دست‌ساز", tagline: "سفالگری و لعاب کهن", arr: "pots" },
    { slug: "wood", title: "صنایع چوبی و خاتم", tagline: "خاتم‌کاری و منبت", arr: "woods" },
    { slug: "textile", title: "پارچه و نساجی سنتی", tagline: "ترمه، قلمکار و دارایی", arr: "textiles" },
    { slug: "wicker", title: "سبدبافی و حصیربافی", tagline: "کپوبافی و حصیر نخل", arr: "wickers" },
    { slug: "jewelry", title: "زیورآلات و جواهرات سنتی", tagline: "فیروزه و نقره‌کاری", arr: "jewels" },
    { slug: "calligraphy", title: "تابلو، نگارگری، خوشنویسی و نقاشی", tagline: "هنرهای روی بوم و کاغذ", arr: "artworks" },
  ];

  const categories: Record<string, { id: string; title: string }> = {};
  for (const [i, c] of catDefs.entries()) {
    const mc = (catalog as any).mainCategories[i];
    const items = (catalog as any)[c.arr];
    const created = await db.category.create({
      data: {
        slug: c.slug,
        title: c.title,
        tagline: mc.subtitle,
        image: img(mc.img),
        order: i,
      },
    });
    categories[c.slug] = { id: created.id, title: c.title };
    console.log(`  category ${c.slug}: ${items.length} items`);

    // Artworks for this category
    for (const [j, it] of items.entries()) {
      const sellerPick = [rugMaster, esmaili, habibian, motamedi, artisan, rugMaster][j % 6];
      const isArtisanOwned = j % 6 === 4;
      // Give a couple of artworks to the demo artisan in PENDING/DRAFT state
      let status = "PUBLISHED" as "PUBLISHED" | "PENDING_REVIEW" | "DRAFT";
      if (isArtisanOwned && j === 4) {
        status = c.slug === "wicker" ? "PENDING_REVIEW" : c.slug === "pottery" ? "DRAFT" : "PUBLISHED";
      }
      const price = Number(String(it.priceNum || it.price).replace(/,/g, "")) || 1000000;
      await db.artwork.create({
        data: {
          code: `RSH-${10000 + i * 100 + j}`,
          slug: `${c.slug}-${j + 1}`,
          title: it.title,
          sellerId: isArtisanOwned ? artisan.id : sellerPick.id,
          categoryId: created.id,
          description: it.desc || "",
          price,
          images: JSON.stringify([img(it.img)]),
          materials: it.tag || it.cheleh || null,
          dimensions: it.dim || it.specs || null,
          province: (it.origin || "").split("،")[0] || null,
          stock: 1,
          status,
          featured: j === 0,
          rating: [4.9, 4.7, 4.8, 5, 4.6, 4.8][j % 6],
          ratingCount: [32, 18, 64, 12, 27, 41][j % 6],
        },
      });
    }
  }

  // ---------------- Hero artwork (product-details page) ----------------
  const heroRug = await db.artwork.create({
    data: {
      code: "RSH-9834",
      slug: "shikargah-silk-qashqai",
      title: "فرش دستباف ایرانی ابریشم طرح شکارگاه و لچک‌ترنج",
      sellerId: rugMaster.id,
      categoryId: categories["carpet"].id,
      description:
        "بافته شده با ابریشم خالص و پشم مرغوب دست‌ریس، رنگرزی ۱۰۰٪ گیاهی و طبیعی با روناس، نیل و پوست گردو. گره ترکی متراکم و مقاوم در برابر سایش با ضمانت اصالت فیزیکی مادام‌العمر نگارخانه ریشه.",
      story:
        "فرش دستباف پیش‌رو، نه تنها یک زیرانداز نفیس، بلکه تجلی‌گاه پیوند عمیق انسان، طبیعت و خیال در فرهنگ کوچ‌نشینان ایل قشقایی است. طرح لچک‌ترنج و شکارگاه از کهن‌ترین الگوهای شاهانه دوران صفویه و قاجار است که با دستان توانمند زنان و مردان ایلاتی فارس بازآفرینی شده است. خطوط اسلیمی پرپیچ‌وخم، غزال‌های گریزپا، ترنج مرکزی نماد خورشید و پرندگان اساطیری با ابریشم سفید و الوان بر زمینه قرمز لاکی تنیده شده‌اند.",
      price: 2500000,
      compareAtPrice: 2850000,
      images: JSON.stringify([
        "/assets/img/dl_adb2247fe0.webp",
        "/assets/img/dl_107450bfad.webp",
        "/assets/img/dl_da52ea0e69.webp",
        "/assets/img/dl_43da100e3a.webp",
      ]),
      materials: "ابریشم و پشم بهاره",
      dimensions: "۱۲۰ × ۱۸۰ cm",
      yearMade: "۱۴۰۱ (نو و بی‌نقص)",
      province: "فارس",
      stock: 3,
      status: "PUBLISHED",
      featured: true,
      rating: 4.8,
      ratingCount: 124,
      sizes: JSON.stringify([
        { label: "زرع و نیم", dims: "۱۲۰ × ۱۸۰ cm" },
        { label: "قالیچه", dims: "۱۵۰ × ۲۲۰ cm" },
        { label: "کناره", dims: "۸۰ × ۲۰۰ cm" },
      ]),
      colors: JSON.stringify([
        { label: "قرمز لاکی قشقایی", hex: "#8B1E1E" },
        { label: "سرمه‌ای درباری", hex: "#14233c" },
        { label: "کرم یشمی", hex: "#2d504b" },
      ]),
    },
  });

  // Home-page featured items (from index.html)
  const homeFeatured: Array<{
    title: string;
    price: number;
    rating: number;
    cat: string;
    seller: string;
    imgName: string;
    desc: string;
    spec: string;
  }> = [
    {
      title: "گلدان میناکاری فیروزه‌ای نفیس صراحی",
      price: 1890000,
      rating: 4.7,
      cat: "metal",
      seller: esmaili.id,
      imgName: "img_0dba2821a3c2.webp",
      desc: "نگارگری چندلایه لاجورد و شنگرف با لعاب کوارتز نسوز بر زمینه مس خالص، امضای کارگاه اسماعیلی میدان نقش‌جهان.",
      spec: "ارتفاع ۳۰ سانتی‌متر",
    },
    {
      title: "جعبه چوبی خاتم‌کاری اعلا",
      price: 2200000,
      rating: 4.9,
      cat: "wood",
      seller: artisan.id,
      imgName: "img_0e0f286d86e4.webp",
      desc: "جعبه جواهرات چوبی با خاتم‌کاری شش‌ضلعی شیراز؛ ترکیب چوب آبنوس، برنج، استخوان شتر و صدف طبیعی.",
      spec: "چوب گردو و برنج",
    },
    {
      title: "بشقاب میناکاری دست‌ساز طرح اسلیمی",
      price: 1500000,
      rating: 4.8,
      cat: "metal",
      seller: artisan.id,
      imgName: "img_2c9aefb7f178.webp",
      desc: "بشقاب مینای پرداز روی مس با نقش اسلیمی زرنگار، قطر ۳۰ سانتی‌متر، مناسب پذیرایی و دیوارکوب.",
      spec: "قطر ۳۰ سانتی‌متر",
    },
    {
      title: "رومیزی قلمکار پنبه‌ای چاپ چوبی اعلا",
      price: 950000,
      rating: 4.7,
      cat: "textile",
      seller: artisan.id,
      imgName: "img_640acbe0be23.webp",
      desc: "رومیزی قلمکار سنتی اصفهان با چاپ چوبی دستی و رنگ ثابت گیاهی؛ کتان طبیعی ۱۰۰٪.",
      spec: "کتان طبیعی ۱۰۰٪",
    },
  ];
  for (const [i, f] of homeFeatured.entries()) {
    await db.artwork.create({
      data: {
        code: `RSH-99${10 + i}`,
        slug: `home-featured-${i + 1}`,
        title: f.title,
        sellerId: f.seller,
        categoryId: categories[f.cat].id,
        description: f.desc,
        price: f.price,
        images: JSON.stringify([localImg(f.imgName)]),
        materials: f.spec,
        stock: 2,
        status: "PUBLISHED",
        featured: true,
        rating: f.rating,
        ratingCount: 12 + i * 7,
      },
    });
  }

  // Artisan's own artworks (from my-artworks.html) with varied statuses
  const artisanOwn: Array<{
    title: string;
    desc: string;
    price: number;
    status: string;
    cat: string;
    imgName: string;
    spec: string;
  }> = [
    {
      title: "بشقاب میناکاری اسلیمی زرنگار",
      desc: "بشقاب مینای اعلای اصفهان با نقش اسلیمی و رنگ‌های گیاهی؛ مناسب دیوارکوب و پذیرایی مجلسی.",
      price: 1500000,
      status: "PUBLISHED",
      cat: "metal",
      imgName: "img_2c9aefb7f178.webp",
      spec: "قطر ۳۰ سانتی‌متر • وزن ۶۵۰ گرم",
    },
    {
      title: "جعبه خاتم‌کاری شش‌ضلعی شیراز",
      desc: "جعبه خاتم شش‌ضلعی با بدنه چوب گردو و خاتم اعلا؛ درب چفت‌دار و روکش براق دست‌کار.",
      price: 2200000,
      status: "PUBLISHED",
      cat: "wood",
      imgName: "img_0e0f286d86e4.webp",
      spec: "چوب گردو و برنج • ابعاد ۲۲×۱۲ سانتی‌متر",
    },
    {
      title: "تنگ فیروزه‌کوبی نیشابور طرح شاه‌عباسی",
      desc: "تنگ سفالین فیروزه‌کوبی با نگاره شاه‌عباسی؛ فیروزه نیشابور به‌دست‌آمده روی لعاب قلیایی.",
      price: 3400000,
      status: "PENDING_REVIEW",
      cat: "pottery",
      imgName: "img_531a64913ca4.webp",
      spec: "ارتفاع ۲۶ سانتی‌متر",
    },
    {
      title: "قالیچه تمام ابریشم طرح لچک‌ترنج",
      desc: "قالیچه تمام ابریشم با ۶۰ رج؛ طرح لچک‌ترنج افشان با زمینه لاکی و حاشیه سرمه‌ای.",
      price: 64000000,
      status: "PUBLISHED",
      cat: "carpet",
      imgName: "img_08d280d34ba1.webp",
      spec: "۱۵۰ × ۱۰۰ سانتی‌متر • ۶۰ رج",
    },
    {
      title: "مجمع قلمزنی سیاه‌قلم برنجی سبک صفوی",
      desc: "مجمع کتاب برنجی با قلم‌زنی سیاه‌قلم به سبک صفوی؛ حاشیه اسلیمی و زمینه آهنگ‌اندود.",
      price: 11600000,
      status: "DRAFT",
      cat: "metal",
      imgName: "img_616b7310e1f8.webp",
      spec: "ابعاد ۲۴×۱۶ سانتی‌متر",
    },
  ];
  const artisanArtworkIds: string[] = [];
  for (const [i, a] of artisanOwn.entries()) {
    const created = await db.artwork.create({
      data: {
        code: `RSH-98${40 + i}`,
        slug: `sohrab-${i + 1}`,
        title: a.title,
        sellerId: artisan.id,
        categoryId: categories[a.cat].id,
        description: a.desc,
        price: a.price,
        images: JSON.stringify([localImg(a.imgName)]),
        materials: a.spec,
        province: "اصفهان",
        stock: 1,
        status: a.status as "PUBLISHED" | "PENDING_REVIEW" | "DRAFT",
        rating: [4.8, 4.9, 0, 4.7, 0][i],
        ratingCount: [24, 31, 0, 15, 0][i],
      },
    });
    artisanArtworkIds.push(created.id);
  }

  // ---------------- Authenticity records ----------------
  const allArtworks = await db.artwork.findMany({ include: { category: true } });
  let holoIdx = 1000;
  for (const aw of allArtworks) {
    const verified = aw.status === "PUBLISHED";
    await db.authenticityRecord.create({
      data: {
        artworkId: aw.id,
        hologramCode: `RSH-${aw.code.replace("RSH-", "")}-H${holoIdx++}`,
        status: verified ? "VERIFIED" : "PENDING",
        labStatus: verified ? "ISSUED" : "QUEUED",
        tests: JSON.stringify([
          { name: "سنجش متریال و الیاف", result: "تایید", detail: "ابریشم خالص و پشم دست‌ریس" },
          { name: "رنگرزی گیاهی", result: "تایید", detail: "روناس، نیل و پوست گردو" },
          { name: "تراکم گره", result: "تایید", detail: "گره ترکی متراکم" },
        ]),
        inspector: verified ? "واحد اصالت‌سنجی ریشه" : null,
        issuedAt: verified ? new Date("2024-08-12") : null,
        notes: verified ? "دارای گواهی اصالت با امضای کتبی استادکار." : null,
      },
    });
    if (verified) {
      await db.verificationEvent.create({
        data: {
          recordId: (
            await db.authenticityRecord.findFirst({ where: { artworkId: aw.id } })
          )!.id,
          actor: "آزمایشگاه مرکزی ریشه",
          action: "ISSUED",
          detail: "شناسنامه اصالت با هولوگرام امن صادر شد.",
        },
      });
    }
  }

  // Reviews for hero rug
  const reviewSamples = [
    { name: "مریم گلستانی", rating: 5, comment: "کیفیت بافت و رنگ‌ها فراتر از انتظار بود؛ بسته‌بندی هم بی‌نقص بود." },
    { name: "کاوه رهنما", rating: 5, comment: "شناسنامه اصالت و هولوگرام خیال راحت خرید اینترنتی را می‌دهد. ممنون از تیم ریشه." },
    { name: "سپیده محمدی", rating: 4, comment: "فرش بسیار زیباست؛ فقط ارسال یک روز دیرتر از موعد انجام شد." },
  ];
  for (const r of reviewSamples) {
    await db.review.create({
      data: {
        artworkId: heroRug.id,
        userId: buyer.id,
        rating: r.rating,
        comment: r.comment,
      },
    });
  }

  // ---------------- Plans (C2C engine, §۴.۳ — values from the scope document) ----------------
  const plans = [
    {
      id: "free", slug: "free", title: "پلن رایگان", tag: "شروع بدون هزینه",
      priceToman: 0, periodDays: 0, maxActiveListings: 3, listingFeeToman: 30000, commissionBps: 1000,
      features: ["تا ۳ آگهی فعال", "کارمزد ثبت هر آگهی ۳۰٬۰۰۰ تومان", "پروفایل پایه کارگاه", "کارمزد فروش ۱۰٪"],
      sortOrder: 0,
    },
    {
      id: "bronze", slug: "bronze", title: "پلن برنز (۳ ماهه)", tag: "پایه و نوپا",
      priceToman: 1500000, periodDays: 90, maxActiveListings: 10, listingFeeToman: 15000, commissionBps: 1000,
      features: ["تا ۱۰ آگهی فعال", "کارمزد ثبت هر آگهی ۱۵٬۰۰۰ تومان", "نشان پروفایل و آمار پایه", "کارمزد فروش ۱۰٪"],
      sortOrder: 1,
    },
    {
      id: "silver", slug: "silver", title: "پلن نقره (۶ ماهه)", tag: "رشد فروش",
      priceToman: 2700000, periodDays: 180, maxActiveListings: 30, listingFeeToman: 5000, commissionBps: 1000,
      features: ["تا ۳۰ آگهی فعال", "کارمزد ثبت هر آگهی ۵٬۰۰۰ تومان", "اولویت در فهرست و آمار کامل", "کارمزد فروش ۱۰٪"],
      sortOrder: 2,
    },
    {
      id: "gold", slug: "gold", title: "پلن طلایی (۱۲ ماهه)", tag: "حرفه‌ای‌ها",
      priceToman: 4800000, periodDays: 365, maxActiveListings: null, listingFeeToman: 0, commissionBps: 1000,
      features: ["آگهی فعال نامحدود", "ثبت آگهی بدون کارمزد", "آگهی ویژه، نشان طلایی و آمار کامل", "کارمزد فروش ۱۰٪"],
      highlight: true, sortOrder: 3,
    },
  ];
  for (const p of plans) {
    await db.plan.create({ data: { ...p, features: JSON.stringify(p.features) } });
  }

  // ---------------- Subscriptions (demo artisans) ----------------
  const subFor = (sellerId: string, planId: string) =>
    db.subscription.create({
      data: {
        sellerId, planId, status: "ACTIVE",
        startsAt: new Date(Date.now() - 15 * 24 * 3600 * 1000),
        expiresAt: new Date(Date.now() + 300 * 24 * 3600 * 1000),
      },
    });
  await Promise.all([
    subFor(artisan.id, "gold"),
    subFor(rugMaster.id, "gold"),
    subFor(esmaili.id, "silver"),
    subFor(habibian.id, "silver"),
    subFor(motamedi.id, "bronze"),
  ]);

  // ---------------- Member request (pending artisan) ----------------
  await db.memberRequest.create({
    data: {
      userId: pendingArtisan.id,
      workshop: "کارگاه سفال و لعاب نظری",
      province: "همدان",
      portfolio: "laljin-pottery.ir/nazari",
      status: "PENDING",
    },
  });

  // ---------------- Platform settings (tunables — never hardcode in code) ----------------
  await db.setting.createMany({
    skipDuplicates: true,
    data: [
      { key: "LISTING_ACTIVE_DAYS", value: "60", group: "listing", description: "مدت اعتبار هر آگهی منتشرشده (روز)" },
      { key: "LISTING_FEE_REFUND_ON_REJECT", value: "true", group: "finance", description: "بازگشت کارمزد ثبت آگهی به‌صورت اعتبار در صورت رد" },
      { key: "RESERVATION_MINUTES", value: "15", group: "orders", description: "مهلت رزرو موجودی پیش از پرداخت (دقیقه)" },
      { key: "PENDING_PAYMENT_TTL_MINUTES", value: "60", group: "orders", description: "مهلت پرداخت سفارش پیش از انقضا (دقیقه)" },
      { key: "RETENTION_DAYS", value: "3", group: "finance", description: "دوره نگهداری وجه فروشنده پس از تحویل (روز)" },
      { key: "DEFAULT_COMMISSION_BPS", value: "1000", group: "finance", description: "کارمزد فروش پیش‌فرض (نقطه‌اساس: ۱۰۰۰ = ۱۰٪)" },
    ],
  });

  // ---------------- Shipping methods (from DB, not code) ----------------
  await db.shippingMethod.createMany({
    data: [
      { slug: "free", title: "ارسال رایگان بیمه‌شده ریشه", description: "بیمه کامل مرسول؛ تحویل ۳ تا ۷ روز کاری", priceToman: 0, sortOrder: 0 },
      { slug: "courier", title: "پیک اختصاصی و بیمه‌شده ریشه", description: "تحویل سریع درون‌شهری", priceToman: 50000, sortOrder: 1 },
      { slug: "tipax", title: "ارسال سریع تیپاکس سراسری", description: "تحویل ۲ تا ۴ روز کاری", priceToman: 75000, sortOrder: 2 },
    ],
  });

  // ---------------- Blog ----------------
  const posts = [
    {
      slug: "raz-e gerahaye-javidan",
      title: "راز گره‌های جاودان؛ چگونه اصالت رنگرزی طبیعی و پشم دست‌ریس قشقایی را بشناسیم؟",
      excerpt:
        "تفاوت میان پشم دباغی شیمیایی و تاروپود تابیده‌شده با دوک دستی زنان عشایر، تنها در لمس نیست؛ در عمق شکست نور و اصالت رنگ‌های جوشیده با روناس کوهی، پوست گردو و پوست انار نهفته است. در این جستار پژوهشی، با استانداردهای تشخیص فرش دست‌باف اصیل آشنا می‌شوید.",
      content:
        "تفاوت میان پشم دباغی شیمیایی و تاروپود تابیده‌شده با دوک دستی زنان عشایر، تنها در لمس نیست؛ در عمق شکست نور و اصالت رنگ‌های جوشیده با روناس کوهی، پوست گردو و پوست انار نهفته است.\n\nنکته اصالت‌سنجی: پشم‌های رنگرزی‌شده طبیعی با گذشت زمان و تابش غیرمستقیم آفتاب، شفاف‌تر و دل‌نشین‌تر شده و هرگز کدر یا خاکستری نمی‌شوند. در مقابل، رنگ‌های شیمیایی پس از چند دهه به خاکستریِ بی‌روح می‌گرایند.\n\nدر استانداردهای تشخیص فرش دستباف اصیل، سه نشانه کلیدی بررسی می‌شود: یکنواختی تاب تار و پود، عمق رنگ در تار و پودِ داخلی گره‌ها (نه تنها سطح)، و بوی پشم طبیعی در مقابل بوی مواد نسوزنده صنعتی.",
      image: localImg("img_b1981e90af30.webp"),
      author: "دکتر پرویز فرش‌چیان",
      category: "دستبافته‌های ایلیاتی",
      readTime: 8,
      featured: true,
    },
    {
      slug: "falsafe-rang-firoozei",
      title: "فلسفه رنگ فیروزه‌ای در میناکاری اصفهان و تقابل آن با لاجورد نیشابور",
      excerpt:
        "چگونه ترکیب اکسید مس و دمای ۸۰۰ درجه کوره، کهن‌ترین رنگ آسمانی را بر پیکر ظروف مسی اصفهان پدید می‌آورد و پیوند آن با حکمت معنوی شیخ لطف‌الله چیست؟",
      content:
        "چگونه ترکیب اکسید مس و دمای ۸۰۰ درجه کوره، کهن‌ترین رنگ آسمانی را بر پیکر ظروف مسی اصفهان پدید می‌آورد؟\n\nلعاب فیروزه‌ای قلیایی، حاصل واکنش اکسید مس در دمای حدود ۸۰۰ درجه است؛ رنگی که در سنت ایرانی نماد آسمان و آرامش است. میناکاران اصفهان این رنگ را با «خانه‌بندی» — لحیم مفتول‌های سیمین روی زمینه مس — تثبیت می‌کنند تا لعاب مادام‌العمر شود.",
      image: localImg("img_ba422ffe1783.webp"),
      author: "سودابه رضوانی",
      category: "میناکاری و فلزکاری",
      readTime: 6,
      featured: false,
    },
    {
      slug: "negahdari-khatam",
      title: "راهنمای گام‌به‌گام نگهداری از جعبه‌های خاتم‌کاری در اقلیم‌های مرطوب و خشک",
      excerpt:
        "خاتم، چینشی مینیاتوری از چوب آبنوس، برنج، استخوان شتر و صدف است. برای جلوگیری از برآمدن مفتول‌ها در رطوبت شمال یا خشکی کویر چه راهکارهایی وجود دارد؟",
      content:
        "خاتم، چینشی مینیاتوری از چوب آبنوس، برنج، استخوان شتر و صدف است.\n\nبرای جلوگیری از برآمدن مفتول‌ها، رطوبت نسبی محیط را میان ۳۵ تا ۵۵ درصد نگه دارید، از تماس مستقیم با آب بپرهیزید و سالی یک‌بار سطح را با روغن بادام تلخ و پنبه نرم تغذیه کنید.",
      image: localImg("img_e873191fc5ab.webp"),
      author: "مهندس مهدوی‌پور",
      category: "نگهداری و مرمت",
      readTime: 5,
      featured: false,
    },
    {
      slug: "goftogho-ghalamzani-tabriz",
      title: "گفت‌وگو با آخرین بازماندگان قلم‌زنی برجسته مکتب تبریز",
      excerpt:
        "روایتی اختصاصی از حجره حاج علی‌اصغر ثروتی در دالان امیر بازار تبریز؛ جایی که ضربه‌های فولادی قلم پس از شصت سال هنوز نقوش شاهنامه را بر نقره بیدار نگه داشته است.",
      content:
        "روایتی اختصاصی از حجره حاج علی‌اصغر ثروتی در دالان امیر بازار تبریز.\n\n«سیاه‌قلم، پر کردن شیارهای کنده‌کاری‌شده نقره با ملغمه دوده و روغن است؛ کنتراستی که نقوش شاهنامه را از پس شصت سال هنوز بیدار نگه داشته است.» این حجره، آخرین کانون مکتب تبریز است.",
      image: localImg("img_a4962a61c0f2.webp"),
      author: "کیوان نامور",
      category: "دیدار با اساتید",
      readTime: 11,
      featured: false,
    },
    {
      slug: "tarif-zare-onim",
      title: "تفاوت زرع‌ونیم، قالیچه و پرده‌ای؛ راهنمای انتخاب فرش اصیل برای دکوراسیون معاصر",
      excerpt:
        "چگونه مقیاس سنتی با ابعاد اتاق‌های امروز منطبق می‌شود؟ بررسی هندسه قالی ایرانی در چیدمان‌های مینی‌مالیستی مدرن بدون شکستن هارمونی خانه.",
      content:
        "چگونه مقیاس سنتی با ابعاد اتاق‌های امروز منطبق می‌شود؟\n\nزرع‌ونیم (حدود ۱.۵×۱ متر) برای زیر میز جلومبلی، قالیچه (۲×۱.۵) برای فضای نشیمن و پرده‌ای (۳×۲) برای تالار؛ قاعده طلایی این است که حاشیه فرش دست‌کم ۴۰ سانتی‌متر از مبلمان بیرون بزند تا ترنج کامل دیده شود.",
      image: localImg("img_640acbe0be23.webp"),
      author: "نسترن حسینی",
      category: "راهنمای خرید",
      readTime: 7,
      featured: false,
    },
    {
      slug: "gereh-chini-orsi",
      title: "هنر گره‌چینی و ارسی؛ بازی نور و چوب در معماری و دست‌سازه‌های ایرانی",
      excerpt:
        "اتصال صدها قطعه چوب گردو و چنار بدون یک قطره چسب یا میخ؛ دانشی کهن که در پنجره‌های ارسی عمارت‌های کاشان و شیراز شاهکاری از فیزیک و عرفان آفرید.",
      content:
        "اتصال صدها قطعه چوب گردو و چنار بدون یک قطره چسب یا میخ.\n\nگره‌چینی، دانش هندسی ترکیب قطعات چندگوشه بر پایه نسبت‌های طلایی است؛ در پنجره‌های ارسی کاشان، شیشه‌های رنگی میان شبکه چوبی، نور را به هندسه‌ای از عرفان بدل می‌کنند.",
      image: localImg("img_0e6a1c7eb5b7.webp"),
      author: "فرید عماد",
      category: "معماری و گره‌چینی",
      readTime: 9,
      featured: false,
    },
    {
      slug: "shenasname-dijital-hologram",
      title: "چگونه شناسنامه دیجیتال و هولوگرام ریشه مانع از جعل آثار فاخر می‌شود؟",
      excerpt:
        "ثبت اثر در زنجیره تأیید اصالت، درج امضای دیجیتال استادکار، و سنجش متریال در آزمایشگاه مرکزی؛ پشت‌صحنه گواهی هولوگرافیک اختصاصی پلتفرم ریشه.",
      content:
        "ثبت اثر در زنجیره تأیید اصالت، درج امضای دیجیتال استادکار، و سنجش متریال در آزمایشگاه مرکزی.\n\nهر اثر پس از عبور از آزمون‌های فیزیکی، شیمیایی و ساختاری، کد هولوگرافیک یکتا می‌گیرد که استعلام برخط آن در صفحه استعلام اصالت ریشه امکان‌پذیر است؛ «کد نیافتن» به معنای تقلبی بودن اثر نیست، بلکه یعنی اثر در سامانه ثبت نشده است.",
      image: localImg("img_ca1d96390021.webp"),
      author: "واحد اصالت‌سنجی ریشه",
      category: "اصالت و تکنولوژی",
      readTime: 4,
      featured: false,
    },
  ];
  for (const p of posts) {
    await db.blogPost.create({ data: p });
  }

  // ---------------- Demo order for buyer ----------------
  const cartArtworks = [
    { aw: heroRug, qty: 1 },
    {
      aw: await db.artwork.findFirstOrThrow({ where: { slug: "home-featured-1" } }),
      qty: 1,
    },
  ];
  const subtotal = cartArtworks.reduce((s, c) => s + c.aw.price * c.qty, 0);
  const shipping = 0;
  const order = await db.order.create({
    data: {
      orderNumber: "RSH-ORD-1001",
      buyerId: buyer.id,
      buyerName: "آرش کامانی",
      buyerPhone: "09121234567",
      address: "تهران، خیابان ولیعصر، نرسیده به پارک‌وی، پلاک ۲۲، واحد ۴",
      city: "تهران",
      postalCode: "1969734512",
      subtotal,
      shipping,
      total: subtotal + shipping,
      status: "PREPARING",
      shippingMethodId: (await db.shippingMethod.findFirstOrThrow({ where: { slug: "free" } })).id,
    },
  });
  for (const c of cartArtworks) {
    await db.orderItem.create({
      data: {
        orderId: order.id,
        artworkId: c.aw.id,
        titleSnapshot: c.aw.title,
        imageSnapshot: (JSON.parse(c.aw.images) as string[])[0],
        unitPrice: c.aw.price,
        quantity: c.qty,
        sellerId: c.aw.sellerId,
      },
    });
  }
  const orderItems = await db.orderItem.findMany({ where: { orderId: order.id } });

  // Invoice + payment (labeled demo) + per-seller sub-orders + ledger (M8)
  const invoice = await db.invoice.create({
    data: {
      number: "RSH-INV-1001",
      payerId: buyer.id,
      kind: "ORDER",
      status: "PAID",
      amount: subtotal + shipping,
      description: `پرداخت سفارش ${order.orderNumber} (نمایشی)`,
      orderId: order.id,
      paidAt: new Date(),
    },
  });
  const attempt = await db.paymentAttempt.create({
    data: {
      invoiceId: invoice.id,
      orderId: order.id,
      provider: "demo",
      authority: "DEMO-AUTH-1001",
      amount: subtotal + shipping,
      status: "SUCCESS",
      refNumber: "DEMO-REF-883019284712",
      message: "تراکنش نمایشی با موفقیت تایید شد (بدون انتقال پول واقعی).",
      verifiedAt: new Date(),
    },
  });
  await db.paymentEvent.create({
    data: { paymentAttemptId: attempt.id, type: "VERIFY_SUCCESS", detail: "تایید نمایشی درگاه دمو", payload: "{\"simulated\":true}" },
  });

  // One SellerOrder per seller + proportional ledger entries
  const goldPlan = await db.plan.findUniqueOrThrow({ where: { id: "gold" } });
  const bySeller = new Map<string, typeof orderItems>();
  for (const it of orderItems) {
    const list = bySeller.get(it.sellerId) ?? [];
    list.push(it);
    bySeller.set(it.sellerId, list);
  }
  for (const [sellerId, items] of bySeller) {
    const gross = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
    const commission = Math.round((gross * goldPlan.commissionBps) / 10000);
    const so = await db.sellerOrder.create({
      data: {
        orderId: order.id, sellerId, status: "PREPARING", gross,
        discountShare: 0, net: gross, commission, shippingShare: 0, paidAt: new Date(),
      },
    });
    await db.orderItem.updateMany({ where: { id: { in: items.map((i) => i.id) } }, data: { sellerOrderId: so.id } });
    await db.ledgerEntry.createMany({
      data: [
        { sellerId, orderId: order.id, sellerOrderId: so.id, kind: "SALE", amount: gross, status: "PENDING", detail: `فروش اقلام سفارش ${order.orderNumber} (در انتظار تحویل)` },
        { sellerId, orderId: order.id, sellerOrderId: so.id, kind: "COMMISSION", amount: -commission, status: "CLEARED", detail: `کارمزد فروش پلتفرم سفارش ${order.orderNumber}` },
      ],
    });
    await db.platformRevenueEntry.create({
      data: { kind: "COMMISSION", amount: commission, sellerId, orderId: order.id, sellerOrderId: so.id, detail: `کارمزد فروش سفارش ${order.orderNumber}` },
    });
  }
  await db.orderEvent.createMany({
    data: [
      { orderId: order.id, type: "PAYMENT", status: "PAID", detail: "پرداخت (نمایشی) تایید شد؛ سفارش در صف آماده‌سازی کارگاه‌ها قرار گرفت.", actor: "درگاه نمایشی ریشه" },
      { orderId: order.id, type: "STATUS", status: "PREPARING", detail: "سفارش در کارگاه در حال آماده‌سازی و بسته‌بندی است.", actor: "سامانه" },
    ],
  });

  // ---------------- Cart items for buyer (as in cart-checkout source) ----------------
  await db.cartItem.create({
    data: {
      userId: buyer.id,
      artworkId: heroRug.id,
      quantity: 1,
      variant: JSON.stringify({ size: "زرع و نیم — ۱۲۰ × ۱۸۰ cm", color: "قرمز لاکی قشقایی" }),
    },
  });
  await db.cartItem.create({
    data: {
      userId: buyer.id,
      artworkId: (await db.artwork.findFirstOrThrow({ where: { slug: "home-featured-1" } })).id,
      quantity: 1,
    },
  });

  // ---------------- Ledger & payout for artisan ----------------
  await db.ledgerEntry.createMany({
    data: [
      { sellerId: artisan.id, kind: "PAYOUT", amount: -1200000, detail: "واریز شبا IR420170000000123456789001 — تسویه دوره قبل", status: "CLEARED" },
      { sellerId: artisan.id, kind: "SALE", amount: 2200000, status: "HOLDING", availableAt: new Date(Date.now() + 3 * 24 * 3600 * 1000), detail: "فروش جعبه خاتم‌کاری — در دوره نگهداری" },
    ],
  });
  await db.payoutRequest.create({
    data: {
      sellerId: artisan.id,
      amount: 1850000,
      iban: "IR420170000000123456789001",
      status: "PENDING",
    },
  });

  // ---------------- Lab request ----------------
  await db.labRequest.create({
    data: {
      artworkId: artisanArtworkIds[2],
      sellerId: artisan.id,
      kind: "SAMPLE_SEND",
      preferredDate: "۱۴۰۳/۰۹/۱۵",
      note: "درخواست اعزام نمونه برای سنجش لعاب و صدور شناسنامه.",
      status: "NEW",
    },
  });

  // ---------------- Contact messages ----------------
  await db.contactMessage.createMany({
    data: [
      { name: "لیلا اکبری", email: "leila@example.com", subject: "کارشناسی اثر", message: "سلام، یک قوطی مینای قدیمی دارم؛ مایل‌ام کارشناسی و قیمت‌گذاری شود. تشکر." },
      { name: "حسین رستمی", email: "hossein@example.com", subject: "همکاری استادکاران", message: "با سلام، کارگاه ترمه‌بافی در یزد داریم و مایل به همکاری با ریشه هستیم." },
    ],
  });

  // ---------------- Audit log ----------------
  await db.auditLog.createMany({
    data: [
      { actor: "admin@risheh.ir", action: "APPROVE_ARTISAN", target: "استاد رسول معتمدی", detail: "تایید عضویت پلن برنزی" },
      { actor: "admin@risheh.ir", action: "VERIFY_ARTWORK", target: "RSH-9834", detail: "صدور شناسنامه اصالت هولوگرام‌دار" },
      { actor: "system", action: "SETTLE_REQUEST", target: "استاد سهراب سپهری‌راد", detail: "درخواست تسویه ۱٬۸۵۰٬۰۰۰ تومان در صف بررسی" },
    ],
  });

  // ---------------- Discount campaigns & codes (demo) ----------------
  const daysFromNow = (d: number) => new Date(Date.now() + d * 24 * 60 * 60 * 1000);

  const yaldaCampaign = await db.discountCampaign.create({
    data: {
      title: "یلدای ریشه ۱۴۰۵",
      occasion: "شب یلدا",
      description: "جشن بلندترین شب سال با منتخب دست‌سازه‌های اصیل؛ همراه با کدهای هدیه ویژه.",
      startsAt: daysFromNow(-7),
      endsAt: daysFromNow(30),
      artworks: {
        create: [
          { artworkId: heroRug.id },
          { artworkId: (await db.artwork.findFirstOrThrow({ where: { slug: "home-featured-1" } })).id },
          { artworkId: (await db.artwork.findFirstOrThrow({ where: { slug: "home-featured-2" } })).id },
          { artworkId: (await db.artwork.findFirstOrThrow({ where: { slug: "carpet-1" } })).id },
          { artworkId: (await db.artwork.findFirstOrThrow({ where: { slug: "metal-1" } })).id },
          { artworkId: (await db.artwork.findFirstOrThrow({ where: { slug: "jewelry-1" } })).id },
        ],
      },
    },
  });

  const mirasCampaign = await db.discountCampaign.create({
    data: {
      title: "هفته میراث فرهنگی",
      occasion: "هفته میراث فرهنگی",
      description: "به پاس میراث‌داران هنر ایران؛ آثار برگزیده با همکاری مستقیم کارگاه‌ها.",
      startsAt: daysFromNow(0),
      endsAt: daysFromNow(45),
      artworks: {
        create: [
          { artworkId: (await db.artwork.findFirstOrThrow({ where: { slug: "home-featured-3" } })).id },
          { artworkId: (await db.artwork.findFirstOrThrow({ where: { slug: "home-featured-4" } })).id },
          { artworkId: artisanArtworkIds[0] },
          { artworkId: artisanArtworkIds[3] },
          { artworkId: (await db.artwork.findFirstOrThrow({ where: { slug: "textile-1" } })).id },
        ],
      },
    },
  });

  const [
    yaldaCode,
    mirasCode,
    welcomeCode,
    artisanCode,
    nowruzExpiredCode,
    offerDoneCode,
  ] = await Promise.all([
    db.discountCode.create({
      data: {
        campaignId: yaldaCampaign.id,
        code: "YALDA-1405",
        title: "هدیه بلندترین شب سال",
        description: "۱۵٪ تخفیف روی آثار منتخب یلدا، حداکثر تا سقف ۸۰۰٬۰۰۰ تومان.",
        kind: "PERCENT",
        amount: 15,
        maxPrice: 800000,
        minPrice: 1500000,
        audience: "ALL",
        maxUses: 100,
        perUserLimit: 1,
        startsAt: daysFromNow(-7),
        expiresAt: daysFromNow(30),
        usedCount: 1,
      },
    }),
    db.discountCode.create({
      data: {
        campaignId: mirasCampaign.id,
        code: "MIRAS-WEEK",
        title: "هفته میراث فرهنگی",
        kind: "PERCENT",
        amount: 10,
        audience: "ALL",
        maxUses: 200,
        perUserLimit: 1,
        expiresAt: daysFromNow(45),
        usedCount: 1,
      },
    }),
    db.discountCode.create({
      data: {
        code: "WELCOME-GIFT",
        title: "هدیه خرید اول ریشه",
        description: "۳۰۰٬۰۰۰ تومان تخفیف نخستین خرید از گنجینه ریشه.",
        kind: "FIXED",
        amount: 300000,
        minPrice: 1500000,
        audience: "BUYER",
        maxUses: 500,
        perUserLimit: 1,
        expiresAt: daysFromNow(90),
      },
    }),
    db.discountCode.create({
      data: {
        code: "ARTISAN-CLUB",
        title: "کلوپ استادکاران",
        description: "۲۰٪ تخفیف خرید ویژه اعضای استادکار گنجینه ریشه.",
        kind: "PERCENT",
        amount: 20,
        maxPrice: 2000000,
        audience: "ARTISAN",
        maxUses: 50,
        perUserLimit: 1,
        expiresAt: daysFromNow(20),
        usedCount: 1,
      },
    }),
    db.discountCode.create({
      data: {
        campaignId: yaldaCampaign.id,
        code: "NOWRUZ-LAST",
        title: "پرتلاش نوروزی (منقضی)",
        kind: "PERCENT",
        amount: 12,
        audience: "ALL",
        maxUses: 100,
        perUserLimit: 1,
        expiresAt: daysFromNow(-5),
        usedCount: 37,
      },
    }),
    db.discountCode.create({
      data: {
        code: "OFFER-DONE",
        title: "پیشنهاد لحظه‌ای (تکمیل ظرفیت)",
        kind: "PERCENT",
        amount: 50,
        audience: "ALL",
        maxUses: 2,
        perUserLimit: 1,
        expiresAt: daysFromNow(10),
        usedCount: 2,
      },
    }),
  ]);
  await db.discountRedemption.createMany({
    data: [
      { codeId: yaldaCode.id, userId: buyer.id, status: "CLAIMED" },
      { codeId: artisanCode.id, userId: artisan.id, status: "CLAIMED" },
      { codeId: mirasCode.id, userId: habibian.id, status: "CLAIMED" },
      { codeId: offerDoneCode.id, userId: buyer.id, status: "APPLIED" },
      { codeId: offerDoneCode.id, userId: pendingArtisan.id, status: "APPLIED" },
    ],
  });
  await db.auditLog.createMany({
    data: [
      { actor: "admin@risheh.ir", action: "DISCOUNT_CAMPAIGN_CREATE", target: yaldaCampaign.title, detail: "شب یلدا — ۶ اثر منتخب استادکاران" },
      { actor: "admin@risheh.ir", action: "DISCOUNT_CODE_CREATE", target: "YALDA-1405", detail: "۱۵٪ با سقف ۸۰۰٬۰۰۰ تومان" },
    ],
  });

  const counts = {
    users: await db.user.count(),
    categories: await db.category.count(),
    artworks: await db.artwork.count(),
    authenticity: await db.authenticityRecord.count(),
    blog: await db.blogPost.count(),
    plans: await db.plan.count(),
  };
  console.log("Seed complete:", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

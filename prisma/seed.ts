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
  console.log("Seeding Risheh demo data…");
  await db.discountRedemption.deleteMany();
  await db.discountCode.deleteMany();
  await db.discountArtwork.deleteMany();
  await db.discountCampaign.deleteMany();
  await db.auditLog.deleteMany();
  await db.verificationEvent.deleteMany();
  await db.trackingEvent.deleteMany();
  await db.paymentAttempt.deleteMany();
  await db.orderItem.deleteMany();
  await db.order.deleteMany();
  await db.cartItem.deleteMany();
  await db.settlementRequest.deleteMany();
  await db.ledgerEntry.deleteMany();
  await db.memberRequest.deleteMany();
  await db.labRequest.deleteMany();
  await db.authenticityRecord.deleteMany();
  await db.review.deleteMany();
  await db.favorite.deleteMany();
  await db.contactMessage.deleteMany();
  await db.blogPost.deleteMany();
  await db.subscriptionPlan.deleteMany();
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
      planId: "gold",
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
      planId: "gold",
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
      planId: "silver",
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
      planId: "silver",
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
      planId: "bronze",
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
      let status = "PUBLISHED";
      if (isArtisanOwned && j === 4) {
        status = c.slug === "wicker" ? "PENDING" : c.slug === "pottery" ? "DRAFT" : "PUBLISHED";
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
      status: "PENDING",
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
        status: a.status,
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
        status: verified ? "VERIFIED" : aw.status === "PENDING" ? "PENDING" : "PENDING",
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

  // ---------------- Subscription plans (admin model) ----------------
  const plans = [
    {
      id: "bronze",
      title: "پلن برنزی (۳ ماهه)",
      tag: "پایه و نوپا",
      price: 1500000,
      unit: "تومان / ۳ ماه",
      artworks: "۱۰ اثر نفیس",
      support: "پشتیبانی تیکتی ۴۸ ساعته",
      discount: "بدون تخفیف",
      features: ["بارگذاری تا ۱۰ اثر در غرفه", "شناسه تایید هویت و اصالت مقدماتی", "پشتیبانی تیکتی استاندارد"],
    },
    {
      id: "silver",
      title: "پلن نقره‌ای (۶ ماهه)",
      tag: "۱۰٪ تخفیف تمدید",
      price: 2700000,
      unit: "تومان / ۶ ماه",
      artworks: "۳۰ اثر برگزیده",
      support: "پاسخ‌گویی زیر ۱۲ ساعت",
      discount: "۱۰٪ تخفیف دوره‌ای",
      features: ["بارگذاری تا ۳۰ اثر برگزیده", "نشان نقره‌ای کارگاه تاییدشده میراث", "اولویت متوسط در فهرست جستجو"],
    },
    {
      id: "gold",
      title: "پلن طلایی سالانه (۱۲ ماهه)",
      tag: "۲۰٪ تخفیف ویژه سالانه",
      price: 4800000,
      unit: "تومان / سالانه",
      artworks: "نامحدود",
      support: "پشتیبانی VIP و ارزیاب اختصاصی",
      discount: "۲۰٪ تخفیف سالانه",
      features: ["بارگذاری نامحدود آثار هنری", "صفحه اختصاصی کاتالوگ با دامنه", "معرفی در صفحه نخست و ویترین ریشه", "اولویت نخست پیشنهاد به خریداران"],
      highlight: true,
    },
    {
      id: "national",
      title: "پلن پیشکسوتان و گنجینه ملی",
      tag: "ویژه چهره‌های ماندگار",
      price: 0,
      unit: "همراهی ویژه",
      artworks: "نامحدود",
      support: "ارزیاب اختصاصی و بیمه آثار",
      discount: "مزایای ویژه ملی",
      features: ["ویترین ملی پیشکسوتان", "مستندسازی اختصاصی کارگاه", "بیمه حمل و نمایش آثار موزه‌ای"],
    },
  ];
  for (const p of plans) {
    await db.subscriptionPlan.create({ data: { ...p, features: JSON.stringify(p.features) } });
  }

  // ---------------- Member request (pending artisan) ----------------
  await db.memberRequest.create({
    data: {
      userId: pendingArtisan.id,
      planId: "silver",
      workshop: "کارگاه سفال و لعاب نظری",
      province: "همدان",
      portfolio: "laljin-pottery.ir/nazari",
      status: "PENDING",
    },
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
      status: "PAID",
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
  await db.paymentAttempt.create({
    data: {
      orderId: order.id,
      gateway: "DEMO",
      authority: "DEMO-AUTH-1001",
      amount: subtotal + shipping,
      status: "SUCCESS",
      refNumber: "DEMO-REF-883019284712",
      message: "تراکنش نمایشی با موفقیت تایید شد (بدون انتقال پول واقعی).",
      verifiedAt: new Date(),
    },
  });
  await db.trackingEvent.create({
    data: { orderId: order.id, status: "PAID", detail: "پرداخت تایید شد؛ سفارش در صف آماده‌سازی کارگاه قرار گرفت.", actor: "سامانه" },
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

  // ---------------- Ledger & settlements for artisan ----------------
  await db.ledgerEntry.createMany({
    data: [
      { sellerId: artisan.id, orderId: order.id, kind: "SALE", amount: 1890000, detail: "فروش گلدان میناکاری — سفارش RSH-ORD-1001", status: "CLEARED" },
      { sellerId: artisan.id, kind: "COMMISSION", amount: -189000, detail: "کارمزد پلتفرم (۱۰٪) سفارش RSH-ORD-1001", status: "CLEARED" },
      { sellerId: artisan.id, kind: "PAYOUT", amount: -1200000, detail: "واریز شبا IR420170000000123456789001 — تسویه دوره قبل", status: "CLEARED" },
      { sellerId: artisan.id, kind: "SALE", amount: 2200000, detail: "فروش جعبه خاتم‌کاری — سفارش دوره جاری", status: "PENDING" },
    ],
  });
  await db.settlementRequest.create({
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
    plans: await db.subscriptionPlan.count(),
  };
  console.log("Seed complete:", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

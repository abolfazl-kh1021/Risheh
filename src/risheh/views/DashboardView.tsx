"use client";

import { MSymbol } from "@/components/icons";
import { faNum, faPrice, faDateTime, ORDER_STATUS_FA } from "@/lib/fa";
import type { AppData } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = { data: AppData; navigate: (to: string) => void; refresh: () => void };

export function DashboardView({ data, navigate }: Props) {
  const user = data.user;

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-gutter py-space-xl">
        <div className="bg-surface-container-lowest rounded-2xl elevation-1 p-10 text-center flex flex-col items-center gap-3">
          <MSymbol name="lock_person" size={44} className="text-outline" />
          <p className="font-headline-md text-primary font-bold">دسترسی به داشبورد نیازمند ورود است</p>
          <p className="text-sm text-on-surface-variant">
            برای مشاهده داشبورد، مدیریت آثار و پیگیری سفارش‌ها ابتدا وارد حساب خود شوید.
          </p>
          <button
            onClick={() => navigate("login")}
            className="mt-1 bg-primary text-on-primary rounded-xl px-6 py-3 text-sm font-bold hover:bg-primary-container transition"
          >
            ورود | ثبت‌نام
          </button>
        </div>
      </div>
    );
  }

  if (user.role === "ADMIN") {
    return (
      <div className="max-w-7xl mx-auto px-gutter py-space-lg">
        <div className="bg-primary-container text-surface-bright rounded-3xl p-6 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-headline-lg font-bold">پیشخوان مدیریت ریشه</h1>
            <p className="text-xs text-on-primary-container mt-1">
              شما با حساب مدیریت وارد شده‌اید؛ سامانه اپراتوری در بخش مدیریت در دسترس است.
            </p>
          </div>
          <button
            onClick={() => navigate("admin")}
            className="bg-tertiary-fixed-dim text-tertiary-container rounded-xl px-5 py-3 text-sm font-bold hover:brightness-105 transition flex items-center gap-2"
          >
            <MSymbol name="admin_panel_settings" size={18} />
            رفتن به پیشخوان مدیریت
          </button>
        </div>
      </div>
    );
  }

  if (user.role === "ARTISAN") return <ArtisanDashboard data={data} navigate={navigate} />;
  return <BuyerDashboard data={data} navigate={navigate} />;
}

function ArtisanDashboard({ data, navigate }: Props) {
  const user = data.user!;
  const artworks = data.myArtworks ?? [];
  const published = artworks.filter((a) => a.status === "PUBLISHED").length;
  const pending = artworks.filter((a) => a.status === "PENDING").length;
  const orders = data.artisanOrders ?? [];
  const needShip = orders.filter((o) => o.status === "PAID" || o.status === "PREPARING").length;
  const ledger = data.ledger ?? [];
  const gross = ledger.filter((l) => l.kind === "SALE").reduce((s, l) => s + l.amount, 0);
  const cleared = ledger.filter((l) => l.status === "CLEARED").reduce((s, l) => s + l.amount, 0);
  const pendingSettle = (data.settlements ?? [])
    .filter((s) => s.status === "PENDING" || s.status === "APPROVED")
    .reduce((s, l) => s + l.amount, 0);
  const available = Math.max(0, cleared - pendingSettle);
  const rating = published > 0 ? artworks.reduce((s, a) => s + a.rating, 0) / Math.max(1, published) : 0;

  const stats = [
    { icon: "payments", label: "فروش کل ناخالص", value: `${faPrice(gross)} تومان`, sub: "مجموع فروش ثبت‌شده در دفتر ریشه" },
    { icon: "account_balance_wallet", label: "موجودی قابل تسویه", value: `${faPrice(available)} تومان`, sub: "پس از کسر کارمزد و درخواست‌های جاری", action: () => navigate("finance") },
    { icon: "storefront", label: "آثار فعال در ویترین", value: `${faNum(published)} شاهکار`, sub: `${faNum(pending)} اثر در صف کارشناسی`, action: () => navigate("artworks") },
    { icon: "inventory", label: "نیاز به ارسال فوری", value: `${faNum(needShip)} سفارش`, sub: "سفارش‌های پرداخت‌شده در صف اقدام", action: () => navigate("orders") },
    { icon: "star", label: "رضایت مجموعه‌داران", value: rating > 0 ? `${faNum(rating.toFixed(1))} از ۵` : "—", sub: "میانگین امتیاز آثار منتشرشده" },
  ];

  return (
    <div className="max-w-7xl mx-auto px-gutter py-space-lg pb-space-xl">
      {/* Header */}
      <div className="bg-gradient-to-l from-primary-container to-primary text-surface-bright rounded-3xl p-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-headline-lg font-bold">{user.shopTitle || `کارگاه ${user.name}`}</h1>
          <p className="text-xs text-on-primary-container mt-1 flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1">
              <MSymbol name="person" size={13} />
              {user.name}
            </span>
            {user.province && (
              <>
                <span className="text-tertiary-fixed-dim">✦</span>
                <span>{user.province}</span>
              </>
            )}
            {user.verified && (
              <>
                <span className="text-tertiary-fixed-dim">✦</span>
                <span className="flex items-center gap-1 text-tertiary-fixed-dim">
                  <MSymbol name="workspace_premium" size={13} />
                  کارگاه تاییدشده میراث
                </span>
              </>
            )}
          </p>
        </div>
        <button
          onClick={() => navigate("artworks")}
          className="bg-tertiary-fixed-dim text-tertiary-container rounded-xl px-5 py-3 text-sm font-bold hover:brightness-105 transition flex items-center gap-2"
        >
          <MSymbol name="add_photo_alternate" size={18} />
          ثبت و عرضه اثر جدید
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mt-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className={cn(
              "bg-surface-container-lowest rounded-2xl elevation-1 p-4 flex flex-col gap-1",
              s.action && "cursor-pointer hover:elevation-2 transition-all"
            )}
            onClick={s.action}
          >
            <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
              <MSymbol name={s.icon} size={16} className="text-secondary" />
              {s.label}
            </div>
            <span className="text-headline-sm font-black text-primary whitespace-nowrap">{s.value}</span>
            <span className="text-[10px] text-outline leading-snug">{s.sub}</span>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
        <QuickLink icon="brush" title="مدیریت آثار" desc="ثبت، ویرایش و پیگیری وضعیت آثار" onClick={() => navigate("artworks")} />
        <QuickLink icon="local_shipping" title="سفارش‌ها و ارسال" desc="بسته‌بندی امن و تحویل مرسولات" onClick={() => navigate("orders")} />
        <QuickLink icon="currency_exchange" title="امور مالی و تسویه" desc="دفتر تراکنش‌ها و واریزهای شبا" onClick={() => navigate("finance")} />
        <QuickLink icon="science" title="آزمایشگاه اصالت" desc="اعزام نمونه و رزرو آتلیه عکاسی" onClick={() => navigate("lab")} />
      </div>

      {/* Recent orders */}
      <section className="mt-space-lg bg-surface-container-lowest rounded-2xl elevation-1 p-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="font-headline-md text-primary font-bold">سفارش‌های جدید خریداران و نیازمند ارسال</h2>
          <button onClick={() => navigate("orders")} className="text-xs font-bold text-secondary hover:text-primary flex items-center gap-1">
            مشاهده همه
            <MSymbol name="chevron_left" size={14} />
          </button>
        </div>
        {orders.length === 0 ? (
          <div className="text-center py-6">
            <MSymbol name="inbox" size={32} className="text-outline" />
            <p className="text-xs text-on-surface-variant mt-2">هنوز سفارشی ثبت نشده است.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[640px]">
              <thead>
                <tr className="text-outline border-b border-outline-variant/40">
                  <th className="py-2 text-right font-medium">کد سفارش</th>
                  <th className="py-2 text-right font-medium">اثر خریداری‌شده</th>
                  <th className="py-2 text-right font-medium">مشتری</th>
                  <th className="py-2 text-right font-medium">وضعیت</th>
                  <th className="py-2 text-right font-medium">تاریخ</th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 5).map((o) => (
                  <tr key={o.id} className="border-b border-outline-variant/30 last:border-0">
                    <td className="py-2.5 font-mono text-[11px] font-bold text-primary">{o.orderNumber}</td>
                    <td className="py-2.5 text-on-surface-variant">
                      {o.items.filter((i) => i.sellerId === user.id).map((i) => i.title).join("، ") || "—"}
                    </td>
                    <td className="py-2.5 text-on-surface-variant">
                      {o.buyerName} — {o.city}
                    </td>
                    <td className="py-2.5">
                      <span className="font-bold text-on-tertiary-container">{ORDER_STATUS_FA[o.status] ?? o.status}</span>
                    </td>
                    <td className="py-2.5 text-outline">{faDateTime(o.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Recent ledger */}
      <section className="mt-4 bg-surface-container-lowest rounded-2xl elevation-1 p-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="font-headline-md text-primary font-bold">تراکنش‌های مالی، کارمزد پلتفرم و واریزهای شبا</h2>
          <span className="text-[11px] text-outline">کارمزد تضمین اصالت و بیمه: ۱۰٪</span>
        </div>
        {ledger.length === 0 ? (
          <p className="text-xs text-on-surface-variant text-center py-4">دفتر تراکنش خالی است.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[640px]">
              <thead>
                <tr className="text-outline border-b border-outline-variant/40">
                  <th className="py-2 text-right font-medium">مربوط به</th>
                  <th className="py-2 text-right font-medium">نوع</th>
                  <th className="py-2 text-left font-medium">مبلغ</th>
                  <th className="py-2 text-right font-medium">وضعیت</th>
                </tr>
              </thead>
              <tbody>
                {ledger.slice(0, 5).map((l) => (
                  <tr key={l.id} className="border-b border-outline-variant/30 last:border-0">
                    <td className="py-2.5 text-on-surface-variant line-clamp-1">{l.detail ?? "—"}</td>
                    <td className="py-2.5">
                      <span className={cn("font-bold", l.kind === "SALE" ? "text-secondary" : l.kind === "COMMISSION" ? "text-error" : "text-on-tertiary-container")}>
                        {l.kind === "SALE" ? "فروش" : l.kind === "COMMISSION" ? "کارمزد" : l.kind === "PAYOUT" ? "واریز شبا" : "اشتراک"}
                      </span>
                    </td>
                    <td className={cn("py-2.5 text-left font-black", l.amount >= 0 ? "text-secondary" : "text-error")} dir="ltr">
                      {faPrice(l.amount)}
                    </td>
                    <td className="py-2.5 text-outline">{l.status === "CLEARED" ? "تسویه‌شده" : "در انتظار"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Seller support */}
      <section className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-surface-container-lowest rounded-2xl elevation-1 p-4">
          <h3 className="text-sm font-bold text-primary flex items-center gap-2 mb-1.5">
            <MSymbol name="shield" className="text-secondary" size={18} />
            پوشش ۱۰۰٪ بیمه حمل
          </h3>
          <p className="text-[11px] text-on-surface-variant leading-relaxed">
            جبران خسارت کامل از درب کارگاه تا تحویل به مشتری توسط بیمه ریشه.
          </p>
        </div>
        <div className="bg-surface-container-lowest rounded-2xl elevation-1 p-4">
          <h3 className="text-sm font-bold text-primary flex items-center gap-2 mb-1.5">
            <MSymbol name="lock" className="text-secondary" size={18} />
            حساب امانی تضمین‌شده (Escrow)
          </h3>
          <p className="text-[11px] text-on-surface-variant leading-relaxed">
            وجه خریدار پیش از ارسال کالا در حساب امانی تایید و بلوکه می‌شود.
          </p>
        </div>
        <div className="bg-surface-container-lowest rounded-2xl elevation-1 p-4">
          <h3 className="text-sm font-bold text-primary flex items-center gap-2 mb-1.5">
            <MSymbol name="support_agent" className="text-secondary" size={18} />
            پشتیبان ویژه کارگاه شما
          </h3>
          <p className="text-[11px] text-on-surface-variant leading-relaxed">
            هماهنگی اختصاصی بسته‌بندی نفیس و تشریفات — مهندس رزم‌جو (داخلی ۴)
          </p>
        </div>
      </section>
    </div>
  );
}

function BuyerDashboard({ data, navigate }: Props) {
  const user = data.user!;
  const orders = data.myOrders ?? [];
  const favs = data.favorites?.length ?? 0;
  const totalSpent = orders
    .filter((o) => o.status !== "CANCELLED" && o.status !== "PENDING_PAYMENT" && o.status !== "PAYMENT_FAILED")
    .reduce((s, o) => s + o.total, 0);

  return (
    <div className="max-w-7xl mx-auto px-gutter py-space-lg pb-space-xl">
      <div className="bg-gradient-to-l from-primary-container to-primary text-surface-bright rounded-3xl p-6">
        <h1 className="font-headline-lg font-bold">خوش آمدید، {user.name}</h1>
        <p className="text-xs text-on-primary-container mt-1">
          سرای کلکسیونری شما در ریشه — پیگیری سفارش‌ها، علاقه‌مندی‌ها و شناسنامه آثار خریداری‌شده.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
        <StatBox icon="receipt_long" label="سفارش‌های من" value={faNum(orders.length)} onClick={() => navigate("orders")} />
        <StatBox icon="favorite" label="علاقه‌مندی‌ها" value={faNum(favs)} onClick={() => navigate("favorites")} />
        <StatBox icon="payments" label="مجموع خریدها" value={`${faPrice(totalSpent)} تومان`} />
        <StatBox icon="verified" label="شناسنامه اصالت" value="استعلام برخط" onClick={() => navigate("verify")} />
      </div>

      <section className="mt-space-lg bg-surface-container-lowest rounded-2xl elevation-1 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-headline-md text-primary font-bold">آخرین سفارش‌ها</h2>
          <button onClick={() => navigate("orders")} className="text-xs font-bold text-secondary hover:text-primary flex items-center gap-1">
            مشاهده همه
            <MSymbol name="chevron_left" size={14} />
          </button>
        </div>
        {orders.length === 0 ? (
          <div className="text-center py-8 flex flex-col items-center gap-2">
            <MSymbol name="shopping_bag" size={36} className="text-outline" />
            <p className="text-sm text-on-surface-variant">هنوز سفارشی ثبت نکرده‌اید؛ از گنجینه ریشه دیدن فرمایید.</p>
            <button
              onClick={() => navigate("categories/all")}
              className="bg-primary text-on-primary rounded-xl px-5 py-2.5 text-xs font-bold hover:bg-primary-container transition"
            >
              مشاهده آثار اصیل
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {orders.slice(0, 4).map((o) => (
              <button
                key={o.id}
                onClick={() => navigate("orders")}
                className="text-right bg-surface-container-low rounded-2xl p-3 flex items-center gap-3 hover:bg-surface-container transition"
              >
                { }
                <img src={o.items[0]?.image ?? ""} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-primary font-mono">{o.orderNumber}</p>
                  <p className="text-[11px] text-on-surface-variant line-clamp-1">
                    {o.items.map((i) => i.title).join("، ")}
                  </p>
                  <p className="text-[11px] font-bold text-on-tertiary-container mt-0.5">
                    {ORDER_STATUS_FA[o.status] ?? o.status} — {faPrice(o.total)} تومان
                  </p>
                </div>
                <MSymbol name="chevron_left" size={18} className="text-outline shrink-0" />
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function QuickLink({ icon, title, desc, onClick }: { icon: string; title: string; desc: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="bg-surface-container-lowest rounded-2xl elevation-1 p-4 text-right hover:elevation-2 transition-all group"
    >
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center">
          <MSymbol name={icon} size={18} />
        </div>
        <span className="text-sm font-bold text-primary group-hover:text-secondary transition-colors">{title}</span>
      </div>
      <p className="text-[11px] text-on-surface-variant mt-1.5">{desc}</p>
    </button>
  );
}

function StatBox({ icon, label, value, onClick }: { icon: string; label: string; value: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "bg-surface-container-lowest rounded-2xl elevation-1 p-4 text-right flex flex-col gap-1",
        onClick && "hover:elevation-2 transition-all"
      )}
    >
      <span className="flex items-center gap-1.5 text-xs text-on-surface-variant">
        <MSymbol name={icon} size={16} className="text-secondary" />
        {label}
      </span>
      <span className="text-headline-sm font-black text-primary">{value}</span>
    </button>
  );
}

"use client";

import { useMemo, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { MSymbol } from "@/components/icons";
import { ARTWORK_STATUS_FA, faNum, faPrice } from "@/lib/fa";
import { createArtworkAction, setArtworkStatusAction, updateArtworkAction, submitForReviewWithPayAction, resubmitRejectedArtworkAction } from "@/lib/actions/artworks";
import { IMAGE_LIBRARY } from "@/risheh/imageLibrary";
import type { AppData, ArtworkDTO } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = { data: AppData; navigate: (to: string) => void; refresh: () => void };

type FormState = {
  title: string;
  categoryId: string;
  description: string;
  story: string;
  price: string;
  materials: string;
  dimensions: string;
  province: string;
  stock: string;
  images: string[];
};

const EMPTY_FORM: FormState = {
  title: "",
  categoryId: "",
  description: "",
  story: "",
  price: "",
  materials: "",
  dimensions: "",
  province: "",
  stock: "1",
  images: [],
};

const TAB_FILTERS = [
  { id: "ALL", label: "همه آثار" },
  { id: "PUBLISHED", label: "در ویترین فروشگاه" },
  { id: "PENDING", label: "در صف کارشناسی" },
  { id: "DRAFT", label: "پیش‌نویس" },
  { id: "SOLD", label: "فروخته‌شده" },
  { id: "ARCHIVED", label: "بایگانی" },
];

export function ArtworksView({ data, navigate, refresh }: Props) {
  const { toast } = useToast();
  const user = data.user;
  const [filter, setFilter] = useState("ALL");
  const [editing, setEditing] = useState<ArtworkDTO | "new" | null>(null);

  const artworks = useMemo(() => {
    const list = data.myArtworks ?? [];
    return filter === "ALL" ? list : list.filter((a) => a.status === filter);
  }, [data.myArtworks, filter]);

  if (!user || (user.role !== "ARTISAN" && user.role !== "ADMIN")) {
    return (
      <div className="max-w-7xl mx-auto px-gutter py-space-xl">
        <div className="bg-surface-container-lowest rounded-2xl elevation-1 p-10 text-center flex flex-col items-center gap-3">
          <MSymbol name="palette" size={44} className="text-outline" />
          <p className="font-headline-md text-primary font-bold">این بخش ویژه استادکاران است</p>
          <p className="text-sm text-on-surface-variant">
            {user
              ? "مدیریت آثار تنها برای حساب‌های استادکار فعال است. برای عرضه آثار، با نقش استادکار ثبت‌نام کنید."
              : "برای مدیریت آثار ابتدا وارد حساب استادکار خود شوید."}
          </p>
          <button
            onClick={() => navigate(user ? "dashboard" : "login")}
            className="mt-1 bg-primary text-on-primary rounded-xl px-6 py-3 text-sm font-bold hover:bg-primary-container transition"
          >
            {user ? "بازگشت به داشبورد" : "ورود | ثبت‌نام"}
          </button>
        </div>
      </div>
    );
  }

  const counts = TAB_FILTERS.map((t) => ({
    ...t,
    n: t.id === "ALL" ? (data.myArtworks ?? []).length : (data.myArtworks ?? []).filter((a) => a.status === t.id).length,
  }));

  return (
    <div className="max-w-7xl mx-auto px-gutter py-space-lg pb-space-xl">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div>
          <h1 className="font-headline-lg text-primary font-extrabold">مدیریت آثار و محصولات ثبت‌شده</h1>
          <p className="text-xs text-on-surface-variant mt-1">ویترین اختصاصی کارگاه شما در پلتفرم ریشه</p>
        </div>
        <button
          onClick={() => setEditing("new")}
          className="bg-primary text-on-primary rounded-xl px-5 py-3 text-sm font-bold hover:bg-primary-container transition flex items-center gap-2 shadow-sm"
        >
          <MSymbol name="add_circle" size={18} />
          ثبت و بارگذاری اثر نفیس جدید
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none mb-4">
        {counts.map((t) => (
          <button
            key={t.id}
            onClick={() => setFilter(t.id)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition",
              filter === t.id
                ? "bg-primary text-on-primary shadow-sm"
                : "hover:bg-surface-container-low text-on-surface-variant"
            )}
          >
            {t.label} ({faNum(t.n)})
          </button>
        ))}
      </div>

      {/* Grid */}
      {artworks.length === 0 ? (
        <div className="bg-surface-container-lowest rounded-2xl elevation-1 p-10 text-center flex flex-col items-center gap-2">
          <MSymbol name="draw" size={40} className="text-outline" />
          <p className="text-sm text-on-surface-variant">
            {filter === "ALL" ? "هنوز اثری ثبت نکرده‌اید؛ نخستین شاهکار خود را ثبت کنید." : "اثری در این وضعیت وجود ندارد."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {artworks.map((a) => (
            <div key={a.id} className="bg-surface-container-lowest rounded-2xl elevation-1 overflow-hidden">
              <div className="relative h-40">
                { }
                <img src={a.images[0] ?? ""} alt={a.title} className="w-full h-full object-cover" />
                <div className="absolute top-2 right-2 flex flex-col gap-1.5 items-end">
                  <StatusChip status={a.status} />
                  {a.stock <= 1 && <span className="bg-pomegranate text-white text-[10px] font-bold rounded-full px-2 py-0.5">تک‌نسخه</span>}
                </div>
              </div>
              <div className="p-3 flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-[10px] text-outline">
                  <span className="font-bold text-on-tertiary-container">{a.categoryTitle}</span>
                  <span>کد: {a.code}</span>
                </div>
                <p className="text-sm font-bold text-primary line-clamp-1">{a.title}</p>
                <p className="text-xs font-black text-primary">{faPrice(a.price)} تومان</p>
                <p className="text-[10px] text-outline flex items-center gap-1">
                  {a.status === "PUBLISHED" && (
                    <>
                      <MSymbol name="verified" size={12} className="text-secondary" />
                      دارای هولوگرام و تبارنامه رسمی
                    </>
                  )}
                  {a.status === "PENDING" && (
                    <>
                      <MSymbol name="hourglass_top" size={12} className="text-on-tertiary-container" />
                      در نوبت کارشناسی و آزمون اصالت
                    </>
                  )}
                  {a.status === "DRAFT" && (
                    <>
                      <MSymbol name="edit_note" size={12} className="text-outline" />
                      پیش‌نویس — برای انتشار ارسال کنید
                    </>
                  )}
                  {a.status === "REJECTED" && (
                    <>
                      <MSymbol name="cancel" size={12} className="text-error" />
                      توسط کارشناس رد شد
                    </>
                  )}
                  {a.status === "SOLD" && (
                    <>
                      <MSymbol name="sell" size={12} className="text-primary" />
                      به خریدار تحویل شد
                    </>
                  )}
                </p>
                <div className="flex gap-1.5 mt-1">
                  <button
                    onClick={() => setEditing(a)}
                    className="flex-1 py-1.5 px-2 rounded-lg bg-surface-container-low hover:bg-surface-container text-primary text-xs font-bold transition flex items-center justify-center gap-1"
                  >
                    <MSymbol name="edit" size={14} />
                    ویرایش اطلاعات
                  </button>
                  {a.status === "PUBLISHED" ? (
                    <button
                      onClick={async () => {
                        const res = await setArtworkStatusAction(a.id, "ARCHIVED");
                        if (res.ok) {
                          toast({ title: "وضعیت اثر", description: "اثر از ویترین به بایگانی منتقل شد." });
                          refresh();
                        } else toast({ title: "خطا", description: res.error, variant: "destructive" });
                      }}
                      title="بایگانی اثر"
                      className="py-1.5 px-2 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface-variant transition"
                    >
                      <MSymbol name="archive" size={14} />
                    </button>
                  ) : a.status === "DRAFT" || a.status === "REJECTED" || a.status === "EXPIRED" ? (
                    <button
                      onClick={async () => {
                        const res =
                          a.status === "REJECTED"
                            ? await resubmitRejectedArtworkAction(a.id).then((r) =>
                                r.ok ? { ok: true as const, redirectUrl: null, message: r.message ?? "ارسال شد" } : { ok: false as const, error: r.error }
                              )
                            : await submitForReviewWithPayAction(a.id);
                        if (res.ok) {
                          if (res.redirectUrl) {
                            toast({ title: "کارمزد ثبت آگهی", description: res.message });
                            window.location.href = res.redirectUrl;
                          } else {
                            toast({ title: "ارسال برای بازبینی", description: res.message ?? "اثر وارد صف بازبینی شد." });
                            refresh();
                          }
                        } else toast({ title: "خطا", description: res.error, variant: "destructive" });
                      }}
                      className="flex-1 py-1.5 px-2 rounded-lg bg-primary text-on-primary text-xs font-bold transition flex items-center justify-center gap-1"
                    >
                      <MSymbol name="publish" size={14} />
                      {a.status === "REJECTED" ? "ارسال دوباره پس از ویرایش" : "ارسال برای بازبینی"}
                    </button>
                  ) : (
                    <button
                      onClick={() => navigate(`product/${a.id}`)}
                      className="py-1.5 px-2 rounded-lg bg-surface-container-low hover:bg-surface-container text-primary transition"
                      title="مشاهده در فروشگاه"
                    >
                      <MSymbol name="visibility" size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Editor */}
      {editing && (
        <ArtworkEditor
          data={data}
          artwork={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          refresh={refresh}
          toast={toast}
        />
      )}
    </div>
  );
}

function StatusChip({ status }: { status: string }) {
  const map: Record<string, { c: string; icon: string }> = {
    PUBLISHED: { c: "bg-secondary text-white", icon: "check_circle" },
    PENDING_REVIEW: { c: "bg-tertiary-fixed-dim text-tertiary-container", icon: "hourglass_top" },
    EXPIRED: { c: "bg-surface-container-high text-outline", icon: "schedule" },
    DRAFT: { c: "bg-surface-container text-on-surface-variant", icon: "edit_note" },
    REJECTED: { c: "bg-error text-white", icon: "cancel" },
    ARCHIVED: { c: "bg-surface-container-high text-outline", icon: "archive" },
    SOLD: { c: "bg-primary text-on-primary", icon: "sell" },
  };
  const s = map[status] ?? map.DRAFT;
  return (
    <span className={cn("inline-flex items-center gap-1 text-[10px] font-bold rounded-full px-2.5 py-1 shadow-sm", s.c)}>
      <MSymbol name={s.icon} size={12} />
      {ARTWORK_STATUS_FA[status] ?? status}
    </span>
  );
}

function ArtworkEditor({
  data,
  artwork,
  onClose,
  refresh,
  toast,
}: {
  data: AppData;
  artwork: ArtworkDTO | null;
  onClose: () => void;
  refresh: () => void;
  toast: ReturnType<typeof useToast>["toast"];
}) {
  const [form, setForm] = useState<FormState>(
    artwork
      ? {
          title: artwork.title,
          categoryId: artwork.categoryId,
          description: artwork.description,
          story: artwork.story ?? "",
          price: String(artwork.price),
          materials: artwork.materials ?? "",
          dimensions: artwork.dimensions ?? "",
          province: artwork.province ?? "",
          stock: String(artwork.stock),
          images: artwork.images,
        }
      : EMPTY_FORM
  );
  const [busy, setBusy] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);

  const activeImage = form.images[galleryIndex];

  const submit = async (publish: boolean) => {
    setBusy(true);
    const payload = { ...form, images: form.images };
    const res = artwork
      ? await updateArtworkAction(artwork.id, payload)
      : await createArtworkAction(payload);
    setBusy(false);
    if (res.ok) {
      toast({ title: "اثر", description: res.message ?? "ذخیره شد." });
      refresh();
      onClose();
    } else {
      toast({ title: "خطا", description: res.error, variant: "destructive" });
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-inverse-surface/40 backdrop-blur-sm flex items-start justify-center overflow-y-auto p-4">
      <div className="bg-surface-container-lowest rounded-3xl elevation-3 w-full max-w-3xl my-6">
        <div className="bg-primary-container text-surface-bright rounded-t-3xl px-5 py-4 flex items-center justify-between">
          <h3 className="font-headline-sm font-bold flex items-center gap-2">
            <MSymbol name="verified" className="text-tertiary-fixed-dim" />
            {artwork ? "ویرایش اثر" : "ثبت و بارگذاری اثر نفیس جدید"}
          </h3>
          <button onClick={onClose} aria-label="بستن" className="w-9 h-9 rounded-xl hover:bg-surface-bright/10 flex items-center justify-center">
            <MSymbol name="close" />
          </button>
        </div>
        <div className="p-5">
          <p className="text-[11px] text-on-surface-variant bg-tertiary-fixed/40 border border-tertiary-fixed-dim/60 rounded-xl p-3 mb-4 leading-relaxed">
            مشخصات اثر را وارد نمایید؛ اثر پس از اعتبارسنجی کارشناس و آزمون‌های آزمایشگاه اصالت به خریداران نمایش
            داده می‌شود. (حالت نمایشی: بارگذاری فایل نیازمند سرویس ذخیره‌سازی است؛ تصاویر را از کتابخانه تصاویر
            ریشه انتخاب کنید.)
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="عنوان کامل اثر هنری" required value={form.title} onChange={(v) => setForm({ ...form, title: v })} placeholder="مثال: بشقاب میناکاری اسلیمی زرنگار" />
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold text-on-surface-variant">رسته و شاخه صنایع دستی *</span>
              <select
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                className="bg-surface-container-low rounded-xl px-3 py-2.5 text-sm border border-outline-variant/40 focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">انتخاب دسته‌بندی…</option>
                {data.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </label>
            <Field label="قیمت پیشنهادی فروش (تومان)" required value={form.price} onChange={(v) => setForm({ ...form, price: v })} placeholder="مثال: 1500000" ltr />
            <Field label="موجودی انبار" value={form.stock} onChange={(v) => setForm({ ...form, stock: v })} placeholder="۱" ltr />
            <Field label="ابعاد دقیق (سانتی‌متر)" value={form.dimensions} onChange={(v) => setForm({ ...form, dimensions: v })} placeholder="قطر ۳۰ سانتی‌متر" />
            <Field label="متریال و مواد اولیه" value={form.materials} onChange={(v) => setForm({ ...form, materials: v })} placeholder="مس خالص، لعاب کوارتز" />
            <Field label="استان ساخت" value={form.province} onChange={(v) => setForm({ ...form, province: v })} placeholder="اصفهان" />
            <div className="md:col-span-2">
              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-bold text-on-surface-variant">توضیحات اثر *</span>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="bg-surface-container-low rounded-xl px-3 py-2.5 text-sm border border-outline-variant/40 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
              </label>
            </div>
            <div className="md:col-span-2">
              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-bold text-on-surface-variant">روایت و داستان اثر (اختیاری)</span>
                <textarea
                  rows={3}
                  value={form.story}
                  onChange={(e) => setForm({ ...form, story: e.target.value })}
                  className="bg-surface-container-low rounded-xl px-3 py-2.5 text-sm border border-outline-variant/40 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
              </label>
            </div>

            {/* Images */}
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-on-surface-variant">
                  تصاویر اثر * <span className="text-outline">(دست‌کم یک تصویر — فرمت‌های JPG، PNG)</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowLibrary(true)}
                  className="px-3.5 py-1.5 rounded-lg bg-surface-container-lowest text-secondary border border-secondary text-xs font-bold hover:bg-secondary hover:text-on-secondary transition-colors"
                >
                  انتخاب از کتابخانه تصاویر
                </button>
              </div>
              <div className="flex gap-2 flex-wrap">
                {form.images.map((img, i) => (
                  <div key={i} className={cn("relative w-20 h-20 rounded-xl overflow-hidden border-2", i === galleryIndex ? "border-tertiary-fixed-dim" : "border-transparent")}>
                    { }
                    <img src={img} alt={`تصویر ${i + 1}`} className="w-full h-full object-cover cursor-pointer" onClick={() => setGalleryIndex(i)} />
                    <button
                      type="button"
                      onClick={() => {
                        setForm({ ...form, images: form.images.filter((_, j) => j !== i) });
                        setGalleryIndex(0);
                      }}
                      className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-error text-white flex items-center justify-center"
                      aria-label="حذف تصویر"
                    >
                      <MSymbol name="close" size={12} />
                    </button>
                  </div>
                ))}
                {form.images.length === 0 && (
                  <div className="w-20 h-20 rounded-xl border-2 border-dashed border-outline-variant flex items-center justify-center text-outline">
                    <MSymbol name="add_a_photo" />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 mt-5 pt-4 border-t border-outline-variant/40">
            <button
              onClick={() => submit(false)}
              disabled={busy}
              className="px-4 py-2.5 rounded-lg bg-surface-container text-on-surface-variant text-xs font-bold hover:bg-surface-container-high transition disabled:opacity-60"
            >
              ذخیره پیش‌نویس
            </button>
            <button
              onClick={() => submit(true)}
              disabled={busy}
              className="px-6 py-2.5 rounded-lg bg-primary text-on-primary text-xs font-bold hover:bg-primary-container transition shadow-sm flex items-center gap-2 disabled:opacity-60"
            >
              <MSymbol name="publish" size={16} />
              {busy ? "در حال ارسال…" : "ارسال اثر جهت ارزیابی و ویترین"}
            </button>
          </div>
        </div>
      </div>

      {/* Image library modal */}
      {showLibrary && (
        <div className="fixed inset-0 z-[70] bg-inverse-surface/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowLibrary(false)}>
          <div className="bg-surface-container-lowest rounded-3xl elevation-3 w-full max-w-2xl p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-headline-sm text-primary font-bold">کتابخانه تصاویر ریشه</h4>
              <button onClick={() => setShowLibrary(false)} aria-label="بستن" className="w-9 h-9 rounded-xl hover:bg-surface-container flex items-center justify-center">
                <MSymbol name="close" />
              </button>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-[50vh] overflow-y-auto">
              {IMAGE_LIBRARY.map((img) => {
                const selected = form.images.includes(img);
                return (
                  <button
                    key={img}
                    type="button"
                    onClick={() =>
                      setForm((f) =>
                        selected
                          ? { ...f, images: f.images.filter((i) => i !== img) }
                          : f.images.length >= 8
                            ? f
                            : { ...f, images: [...f.images, img] }
                      )
                    }
                    className={cn(
                      "relative aspect-square rounded-xl overflow-hidden border-2 transition",
                      selected ? "border-tertiary-fixed-dim" : "border-transparent hover:border-outline"
                    )}
                  >
                    { }
                    <img src={img} alt="" loading="lazy" className="w-full h-full object-cover" />
                    {selected && (
                      <span className="absolute inset-0 bg-primary/40 flex items-center justify-center">
                        <MSymbol name="check" className="text-white" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setShowLibrary(false)}
              className="mt-4 w-full py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary-container transition"
            >
              تایید انتخاب ({faNum(form.images.length)} تصویر)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  ltr,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  ltr?: boolean;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-bold text-on-surface-variant">
        {label} {required && <span className="text-error">*</span>}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        dir={ltr ? "ltr" : undefined}
        className={cn(
          "bg-surface-container-low rounded-xl px-3 py-2.5 text-sm border border-outline-variant/40 focus:outline-none focus:ring-1 focus:ring-primary",
          ltr && "text-left"
        )}
      />
    </label>
  );
}

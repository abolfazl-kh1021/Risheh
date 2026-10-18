"use client";

import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { MSymbol } from "@/components/icons";
import { AUTH_STATUS_FA, faDateTime, faNum, LAB_STATUS_FA } from "@/lib/fa";
import { requestLabAction } from "@/lib/actions/artworks";
import type { AppData } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = { data: AppData; navigate: (to: string) => void; refresh: () => void };

export function LabView({ data, navigate, refresh }: Props) {
  const { toast } = useToast();
  const user = data.user;
  const [busyId, setBusyId] = useState<string | null>(null);

  if (!user || (user.role !== "ARTISAN" && user.role !== "ADMIN")) {
    return (
      <div className="max-w-7xl mx-auto px-gutter py-space-xl">
        <div className="bg-surface-container-lowest rounded-2xl elevation-1 p-10 text-center flex flex-col items-center gap-3">
          <MSymbol name="science" size={44} className="text-outline" />
          <p className="font-headline-md text-primary font-bold">آزمایشگاه اصالت ویژه استادکاران است</p>
          <p className="text-sm text-on-surface-variant">
            {user
              ? "سرویس‌های آزمایشگاهی تنها برای کارگاه‌های فعال ریشه در دسترس است."
              : "برای استفاده از سرویس‌های آزمایشگاه ابتدا وارد حساب استادکار شوید."}
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

  const artworks = data.myArtworks ?? [];
  const labRequests = data.labRequests ?? [];

  const requestLab = async (artworkId: string, kind: "SAMPLE_SEND" | "PHOTO_SESSION") => {
    setBusyId(`${artworkId}-${kind}`);
    const res = await requestLabAction({
      artworkId,
      kind,
      note: kind === "SAMPLE_SEND" ? "درخواست اعزام نمونه برای سنجش آزمایشگاهی" : "رزرو آتلیه عکاسی صنعتی",
    });
    setBusyId(null);
    if (res.ok) {
      toast({ title: "آزمایشگاه اصالت", description: res.message });
      refresh();
    } else {
      toast({ title: "خطا", description: res.error, variant: "destructive" });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-gutter py-space-lg pb-space-xl">
      <div className="bg-gradient-to-l from-primary-container to-primary text-surface-bright rounded-3xl p-6">
        <h1 className="font-headline-lg font-bold">آزمایشگاه اصالت ریشه</h1>
        <p className="text-xs text-on-primary-container mt-1">
          سنجش عیار و اصالت آثار کارگاه شما — استانداردهای طلایی ریشه و مزایای الصاق هولوگرام امن
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-space-lg">
        {/* Portfolio queue */}
        <section className="lg:col-span-2 flex flex-col gap-3">
          <h2 className="font-headline-md text-primary font-bold flex items-center gap-2">
            <MSymbol name="biotech" className="text-secondary" />
            صف پرونده‌های فعال کارگاه شما
          </h2>
          {artworks.length === 0 && (
            <p className="text-xs text-on-surface-variant bg-surface-container-lowest rounded-2xl p-6 text-center elevation-1">
              هنوز اثری ثبت نشده است.
            </p>
          )}
          {artworks.map((a) => {
            const rec = a.authenticity;
            return (
              <div key={a.id} className="bg-surface-container-lowest rounded-2xl elevation-1 p-3 flex items-center gap-3">
                { }
                <img src={a.images[0] ?? ""} alt={a.title} className="w-16 h-16 rounded-xl object-cover shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-primary line-clamp-1">{a.title}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-[10px] font-mono text-outline">{a.code}</span>
                    {rec && (
                      <>
                        <span
                          className={cn(
                            "text-[10px] font-bold rounded-full px-2 py-0.5",
                            rec.status === "VERIFIED" ? "bg-secondary/10 text-secondary" : "bg-tertiary-fixed text-on-tertiary-fixed"
                          )}
                        >
                          {AUTH_STATUS_FA[rec.status] ?? rec.status}
                        </span>
                        <span className="text-[10px] text-outline">{LAB_STATUS_FA[rec.labStatus] ?? rec.labStatus}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  <button
                    onClick={() => requestLab(a.id, "SAMPLE_SEND")}
                    disabled={busyId === `${a.id}-SAMPLE_SEND`}
                    className="px-3 py-1.5 rounded-lg bg-primary text-on-primary text-[10px] font-bold hover:bg-primary-container transition flex items-center gap-1 disabled:opacity-60"
                  >
                    <MSymbol name="assignment_add" size={13} />
                    اعزام نمونه
                  </button>
                  <button
                    onClick={() => requestLab(a.id, "PHOTO_SESSION")}
                    disabled={busyId === `${a.id}-PHOTO_SESSION`}
                    className="px-3 py-1.5 rounded-lg bg-surface-container-low text-primary text-[10px] font-bold hover:bg-surface-container transition flex items-center gap-1 disabled:opacity-60"
                  >
                    <MSymbol name="photo_camera" size={13} />
                    رزرو آتلیه
                  </button>
                </div>
              </div>
            );
          })}

          {/* My lab requests */}
          {labRequests.length > 0 && (
            <div className="bg-surface-container-lowest rounded-2xl elevation-1 p-4">
              <h3 className="text-sm font-bold text-primary mb-2 flex items-center gap-2">
                <MSymbol name="history_edu" className="text-secondary" size={17} />
                درخواست‌های ثبت‌شده من
              </h3>
              <div className="flex flex-col gap-2">
                {labRequests.map((l) => (
                  <div key={l.id} className="flex items-center justify-between text-[11px] bg-surface-container-low rounded-xl p-2.5">
                    <div>
                      <p className="font-bold text-primary">{l.artworkTitle}</p>
                      <p className="text-outline">
                        {l.kind === "SAMPLE_SEND" ? "اعزام نمونه به آزمایشگاه" : "رزرو آتلیه عکاسی"} —{" "}
                        {l.preferredDate ?? "بدون تاریخ پیشنهادی"}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "font-bold shrink-0",
                        l.status === "NEW" ? "text-on-tertiary-container" : l.status === "DONE" ? "text-secondary" : "text-outline"
                      )}
                    >
                      {l.status === "NEW" ? "ثبت‌شده" : l.status === "SCHEDULED" ? "زمان‌بندی‌شده" : l.status === "DONE" ? "انجام‌شده" : "رد‌شده"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Services */}
        <aside className="flex flex-col gap-3">
          <div className="bg-surface-container-lowest rounded-2xl elevation-1 p-4">
            <h3 className="text-sm font-bold text-primary flex items-center gap-2 mb-1.5">
              <MSymbol name="science" className="text-secondary" size={17} />
              آزمایشگاه سنجش عیار و اصالت
            </h3>
            <p className="text-[11px] text-on-surface-variant leading-relaxed">
              برای آثاری با قیمت بیش از ۵۰ میلیون تومان، آزمون متالورژی نقره و مس، تست خلوص سنگ فیروزه و
              سن‌سنجی کربن رایگان انجام شده و هولوگرام طلایی صادر می‌گردد.
            </p>
            <p className="text-[10px] font-bold text-secondary flex items-center gap-1 mt-2">
              <MSymbol name="verified" size={13} />
              صدور گواهی اصالت دوزبانه (فارسی / انگلیسی)
            </p>
          </div>

          <div className="bg-surface-container-lowest rounded-2xl elevation-1 p-4">
            <h3 className="text-sm font-bold text-primary flex items-center gap-2 mb-1.5">
              <MSymbol name="photo_camera" className="text-secondary" size={17} />
              آتلیه تخصصی عکاسی ریشه
            </h3>
            <p className="text-[11px] text-on-surface-variant leading-relaxed">
              در صورت عدم دسترسی به تجهیزات عکاسی صنعتی، تیم آتلیه ریشه اثر شما را با نورپردازی ۳۶۰ درجه ثبت
              می‌کند.
            </p>
          </div>

          <div className="bg-tertiary-fixed/40 border border-tertiary-fixed-dim rounded-2xl p-4">
            <h3 className="text-sm font-bold text-on-tertiary-fixed-variant flex items-center gap-2 mb-1.5">
              <MSymbol name="qr_code_2" size={17} />
              تگ رمزنگاری‌شده NFC ضدجعل ریشه
            </h3>
            <p className="text-[11px] text-on-tertiary-fixed-variant leading-relaxed">
              پس از تایید نهایی، پلاک فلزی هولوگرام‌دار و تگ NFC امن روی اثر الصاق و در دفتر کل اصالت ریشه ثبت
              می‌شود؛ صحت کد را می‌توانید در صفحه استعلام برخط بررسی کنید.
            </p>
          </div>

          <div className="bg-surface-container-lowest rounded-2xl elevation-1 p-4">
            <h3 className="text-sm font-bold text-primary flex items-center gap-2 mb-2">
              <MSymbol name="checklist" className="text-secondary" size={17} />
              استانداردهای طلایی اصالت
            </h3>
            <ul className="text-[11px] text-on-surface-variant flex flex-col gap-1.5 list-disc pr-4">
              <li>سنجش متریال و الیاف (طیف‌سنجی)</li>
              <li>راستی‌آزمایی رنگرزی گیاهی در برابر رنگ شیمیایی</li>
              <li>شمارش میکروسکوپی تراکم گره و یکنواختی</li>
              <li>مطابقت امضای استادکار (طُغرا)</li>
              <li>بایگانی اثر انگشت نساجی (نقشه گره یکتا)</li>
            </ul>
          </div>
        </aside>
      </div>

      <p className="text-[10px] text-outline mt-4 text-center">
        وضعیت پرونده‌ها و درخواست‌ها از داده‌های واقعی سرور خوانده می‌شود؛ زمان‌بندی نهایی نمونه‌برداری پس از
        تایید مدیریت آزمایشگاه اعلام می‌گردد ({faNum(labRequests.length)} درخواست فعال).
      </p>
    </div>
  );
}

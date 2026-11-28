import type { Metadata } from "next";
import { GuestTrackView } from "@/risheh/views/GuestTrackView";

export const metadata: Metadata = {
  title: "پیگیری سفارش مهمان",
  description: "با شماره سفارش و شماره موبایل، وضعیت سفارش خود را ببینید (بدون پیامک — rate-limited).",
  alternates: { canonical: "/track" },
  robots: { index: false, follow: true },
};

export default function TrackPage() {
  return <GuestTrackView />;
}

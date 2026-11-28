"use server";

import { db, dbTx } from "@/lib/db";
import { getGuestKey, getCurrentUser } from "@/lib/session";

/**
 * Guest cart merge (Phase 3): after login/registration, move the anonymous
 * cart rows into the user cart, deduplicating per artwork (max quantity kept).
 * Returns the number of merged rows.
 */
export async function mergeGuestCart(userId: string): Promise<number> {
  const guestKey = await getGuestKey();
  if (!guestKey) return 0;
  const guestItems = await db.cartItem.findMany({ where: { guestKey, userId: null } });
  if (guestItems.length === 0) return 0;

  let merged = 0;
  await dbTx(async (tx) => {
    for (const gi of guestItems) {
      const existing = await tx.cartItem.findFirst({
        where: { userId, artworkId: gi.artworkId },
      });
      if (existing) {
        await tx.cartItem.update({
          where: { id: existing.id },
          data: { quantity: Math.min(10, Math.max(existing.quantity, gi.quantity)) },
        });
        await tx.cartItem.delete({ where: { id: gi.id } });
      } else {
        await tx.cartItem.update({
          where: { id: gi.id },
          data: { userId, guestKey: null },
        });
      }
      merged += 1;
    }
  });
  return merged;
}

export async function countMyCart(): Promise<number> {
  const user = await getCurrentUser();
  if (!user) return 0;
  return db.cartItem.count({ where: { userId: user.id } });
}

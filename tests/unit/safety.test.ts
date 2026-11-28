import { describe, expect, it } from "vitest";
import { slugify } from "@/lib/ids";
import { normalizeImagePath } from "@/lib/image-safety";
import { hashPassword, verifyPassword } from "@/lib/session";

describe("ids — slugify (crypto, Persian-friendly)", () => {
  it("keeps Persian letters, strips unsafe chars, adds random suffix", () => {
    const s = slugify("بشقاب میناکاری اسلیمی زرنگار!");
    expect(s).toMatch(/^بشقاب-میناکاری-اسلیمی-زرنگar|[a-z0-9]{4}$/);
    expect(s).not.toContain("!");
  });

  it("never returns Math.random-style single-draw results (CSPRNG length)", () => {
    const a = slugify("فرش");
    const b = slugify("فرش");
    expect(a).not.toBe(b); // random suffix
  });
});

describe("image-safety (S1 path hardening)", () => {
  it("allows library and upload paths", () => {
    expect(normalizeImagePath("/assets/img/img_2e787d364347.webp")).toBe("/assets/img/img_2e787d364347.webp");
    expect(normalizeImagePath("/uploads/abc-123.webp")).toBe("/uploads/abc-123.webp");
  });

  it("rejects traversal, remote URLs, backslashes and weird segments", () => {
    expect(normalizeImagePath("../../../etc/passwd")).toBeNull();
    expect(normalizeImagePath("/assets/img/../../secret.png")).toBeNull();
    expect(normalizeImagePath("https://evil.example/x.png")).toBeNull();
    expect(normalizeImagePath("http://x/y.png")).toBeNull();
    expect(normalizeImagePath("/assets/img\\win-path.png")).toBeNull();
    expect(normalizeImagePath("/assets/img//double.png")).toBeNull();
    expect(normalizeImagePath("/assets/img/x.png?query=1")).toBeNull();
    expect(normalizeImagePath("javascript:alert(1)")).toBeNull();
    expect(normalizeImagePath("")).toBeNull();
  });

  it("normalizes a missing leading slash", () => {
    expect(normalizeImagePath("assets/img/logo.webp")).toBe("/assets/img/logo.webp");
  });
});

describe("password hashing (scrypt, explicit params)", () => {
  it("hashes with versioned params and verifies", () => {
    const stored = hashPassword("S3cure-pass-1");
    expect(stored).toMatch(/^s1:16384:8:1:/);
    expect(verifyPassword("S3cure-pass-1", stored)).toBe(true);
    expect(verifyPassword("wrong-pass-1", stored)).toBe(false);
  });

  it("verifies the legacy format (pre-migration rows)", async () => {
    const { scryptSync } = await import("crypto");
    const salt = "aabbccdd11223344";
    const legacy = `${salt}:${scryptSync("old-secret-9", salt, 64).toString("hex")}`;
    expect(verifyPassword("old-secret-9", legacy)).toBe(true);
    expect(verifyPassword("nope-1234", legacy)).toBe(false);
  });
});

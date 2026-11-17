import { describe, expect, it } from "vitest";
import { compareUnlock, latestUnlocker } from "../queries";

const row = (unlockedAt: string, unlockedAtText: string | null = null) => ({
  unlockedAt,
  unlockedAtText,
});

describe("latestUnlocker", () => {
  it("取最后一个日期确切的，不取沉底的「已不可考」（issue #69）", () => {
    const list = [
      row("2026-01-01"),
      row("2026-05-01"),
      row("2000-01-01", "已不可考"),
    ].sort(compareUnlock);
    expect(latestUnlocker(list)).toEqual(row("2026-05-01"));
  });

  it("全是不可考时没有「最近」", () => {
    expect(latestUnlocker([row("2000-01-01", "已不可考")])).toBeNull();
    expect(latestUnlocker([])).toBeNull();
  });

  it("只有一个人时首解就是最近", () => {
    expect(latestUnlocker([row("2026-01-01")])).toEqual(row("2026-01-01"));
  });
});

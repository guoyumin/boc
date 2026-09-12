import { describe, expect, it } from "vitest";
import { canonicalRole, isOfficialRole, roleSlug, roleTeam } from "../roles";

describe("角色名匹配", () => {
  it("官方写法直接对上", () => {
    expect(roleSlug("厨师")).toBe("chef");
    expect(roleTeam("麻脸巫婆")).toBe("evil");
  });

  it("少个连字符、多个空格也能对上（诺-达鲺 / 诺达鲺）", () => {
    expect(roleSlug("诺达鲺")).toBe("nodashii");
    expect(roleSlug("诺 - 达鲺")).toBe("nodashii");
    expect(roleTeam("诺达鲺")).toBe("evil");
    expect(isOfficialRole("诺达鲺")).toBe(true);
  });

  it("canonicalRole 收敛成官方写法，认不出来的原样返回，空的当通用", () => {
    expect(canonicalRole("诺达鲺")).toBe("诺-达鲺");
    expect(canonicalRole(" 厨师 ")).toBe("厨师");
    expect(canonicalRole("自制角色")).toBe("自制角色");
    expect(canonicalRole("")).toBe("通用");
    expect(canonicalRole("通用")).toBe("通用");
  });

  it("认不出来的回落到门环纹样、不分阵营", () => {
    expect(roleSlug("不存在")).toBe("generic");
    expect(roleSlug("通用")).toBe("generic");
    expect(roleTeam("通用")).toBeNull();
    expect(isOfficialRole("通用")).toBe(false);
  });
});

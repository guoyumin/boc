import { describe, expect, it } from "vitest";
import { parseScriptJson } from "../script-json";

describe("parseScriptJson", () => {
  it("读出 _meta 里的剧本名与作者，_meta 本身不算角色", () => {
    const raw = JSON.stringify([
      { id: "_meta", name: "宏伟岩廊", author: "Ben and Jams" },
      "chef",
      "noble",
    ]);
    expect(parseScriptJson(raw)).toEqual({
      scriptName: "宏伟岩廊",
      scriptAuthor: "Ben and Jams",
      roleCount: 2,
    });
  });

  it("容忍 _meta 里多出来的字段", () => {
    const raw = JSON.stringify([
      {
        id: "_meta",
        name: "宏伟岩廊",
        author: "Ben and Jams",
        bootlegger: ["一条规则"],
        firstNight: ["a"],
        otherNight: ["b"],
      },
      "chef",
    ]);
    expect(parseScriptJson(raw).scriptName).toBe("宏伟岩廊");
  });

  it("没有 _meta 时剧本名为空，角色照样计数", () => {
    expect(parseScriptJson('["chef","noble","monk"]')).toEqual({
      scriptName: null,
      scriptAuthor: null,
      roleCount: 3,
    });
  });

  it("角色可以是带 id 的对象", () => {
    const raw = JSON.stringify([{ id: "custom_role", name: "自制角色", team: "townsfolk" }]);
    expect(parseScriptJson(raw).roleCount).toBe(1);
  });

  it("不是 JSON / 顶层不是数组 / 空数组都报中文错", () => {
    expect(() => parseScriptJson("not json")).toThrow(/不是合法的 JSON/);
    expect(() => parseScriptJson('{"id":"_meta"}')).toThrow(/顶层必须是一个数组/);
    expect(() => parseScriptJson("[]")).toThrow(/空数组/);
  });

  it("元素既不是字符串也不是带 id 的对象时报错", () => {
    expect(() => parseScriptJson("[123]")).toThrow(/第 1 个元素/);
  });

  it("只有 _meta 没有角色时报错", () => {
    expect(() => parseScriptJson('[{"id":"_meta","name":"空剧本"}]')).toThrow(/没有解析到任何角色/);
  });
});

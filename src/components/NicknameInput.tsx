"use client";

import { useEffect, useState } from "react";
import { saveNickname, useStoredNickname } from "./useNickname";

export { NICK_KEY } from "./useNickname";

export default function NicknameInput({
  name = "nickname",
  required = true,
  placeholder = "微信里用的名字",
  className = "input",
}: {
  name?: string;
  required?: boolean;
  placeholder?: string;
  className?: string;
}) {
  const stored = useStoredNickname();
  const [edited, setEdited] = useState<string | null>(null);
  const value = edited ?? stored;

  // 输入的昵称记到浏览器里，下次自动带出（ROS-01）
  useEffect(() => {
    if (edited !== null) saveNickname(edited);
  }, [edited]);

  return (
    <input
      className={className}
      name={name}
      value={value}
      maxLength={20}
      required={required}
      placeholder={placeholder}
      autoComplete="off"
      onChange={(e) => setEdited(e.target.value)}
    />
  );
}

/**
 * 群联系人。只在这一处写，页面文案和 Server Action 的提示都从这里取，
 * 换人 / 换号只改这个文件。
 */
export const WECHAT_ID = "CHDC1047";

/** 加好友要备注的暗号，不然通过率低 */
export const WECHAT_NOTE = "血染新人";

/** 报名、注册成功后的提示：光注册没用，具体时间地点在群里 */
export const JOIN_HINT = `具体时间地点请加微信 ${WECHAT_ID}（备注「${WECHAT_NOTE}」）`;

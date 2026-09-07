/**
 * 主题：auto / dark / light，存在 localStorage。只有功能站参与切换
 * （社团主页固定深色，见 globals.css 里 data-site 的用法）。
 */
export const THEME_KEY = "boc-theme";

/**
 * 首屏渲染前把手动选择写到 <html> 上，避免深浅色闪一下。
 * 由根 layout 用 next/script 的 beforeInteractive 注入。
 */
export const THEME_INIT = `try{var t=localStorage.getItem(${JSON.stringify(THEME_KEY)});if(t==="dark"||t==="light"){document.documentElement.setAttribute("data-theme",t)}}catch(e){}`;

-- 用户名不区分大小写：登录时忽略大小写查，所以数据层面也不能出现只差大小写的两个账号。
-- 注册那边已经挡了，但这条索引是兜底：将来改名、导数据、手动 INSERT 都绕不过去。
CREATE UNIQUE INDEX `users_username_ci_unique` ON `users` (lower(`username`));

# =============================================================================
# Light Keepers - 備份 job 容器（INF-1 / 工作項 M.1）
#
# 基底刻意用 postgres:15-alpine：pg_dump 的主版本必須與 PostGIS 容器
# （postgis/postgis:15-3.3-alpine，PostgreSQL 15）相同，否則 pg_dump 會拒絕
# 對較新的 server 執行。日後升級 DB 主版本時，這裡要同步升。
# =============================================================================
FROM postgres:15-alpine

# openssh-client / rclone：第二副本推送用（CD-6 / 工作項 C1.3）
#   openssh-client → 方案 A，rsync over SSH 推到內網 Mac mini
#   rclone         → 方案 B，加密（crypt）後推到 S3 相容冷儲存
# 兩者都裝：REPLICA_MODE 是 runtime 決定的，image 不該綁死走哪條路。
# rclone 位於 alpine community repo，官方 postgres:15-alpine 已啟用該 repo。
RUN apk add --no-cache rsync tzdata coreutils openssh-client rclone

COPY entrypoint.sh   /usr/local/bin/entrypoint.sh
COPY backup.sh       /usr/local/bin/backup.sh
COPY replicate.sh    /usr/local/bin/replicate.sh
COPY healthcheck.sh  /usr/local/bin/healthcheck.sh
RUN chmod +x /usr/local/bin/entrypoint.sh /usr/local/bin/backup.sh \
             /usr/local/bin/replicate.sh /usr/local/bin/healthcheck.sh

# 不需要 postgres server，覆寫官方 image 的 entrypoint
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]

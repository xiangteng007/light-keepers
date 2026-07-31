# =============================================================================
# Light Keepers - 備份 job 容器（INF-1 / 工作項 M.1）
#
# 基底刻意用 postgres:15-alpine：pg_dump 的主版本必須與 PostGIS 容器
# （postgis/postgis:15-3.3-alpine，PostgreSQL 15）相同，否則 pg_dump 會拒絕
# 對較新的 server 執行。日後升級 DB 主版本時，這裡要同步升。
# =============================================================================
FROM postgres:15-alpine

RUN apk add --no-cache rsync tzdata coreutils

COPY entrypoint.sh /usr/local/bin/entrypoint.sh
COPY backup.sh     /usr/local/bin/backup.sh
RUN chmod +x /usr/local/bin/entrypoint.sh /usr/local/bin/backup.sh

# 不需要 postgres server，覆寫官方 image 的 entrypoint
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]

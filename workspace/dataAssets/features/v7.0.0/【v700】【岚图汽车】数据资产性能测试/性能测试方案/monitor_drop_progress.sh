#!/usr/bin/env bash

set -u
set -o pipefail
umask 077

SCRIPT_DIR=$(
  cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")" >/dev/null 2>&1
  pwd
)

PLATFORM_HOST="iov-bigdata-tianji-prod-stack.voyah.cn"
QUERY_URL="http://${PLATFORM_HOST}/dmetadata/v1/syncTask/realTimeTableList"
QUERY_ETAG="6.3.34-dataAssets-ltqc1780557112487"
DATABASE="iov_dq"
DATA_SOURCE_ID="333"
TABLE_PREFIX="test_sale_data_"
FINAL_INDEX=300000

CHECK_INTERVAL_SECONDS=600
RETRY_INTERVAL_SECONDS=180
MAX_ATTEMPTS=4

SCHEDULER_CURL_FILE="${SCRIPT_DIR}/scheduler_restart.curl"
LOG_FILE="${SCRIPT_DIR}/monitor_drop_progress.log"

SCHEDULER_ENDPOINT="/api/rdos/batch/batchJob/startSqlImmediatelyEncryption"
SCHEDULER_COMMAND=""
DATAASSETS_COOKIE=""
TABLE_STATUS=""
LAST_ERROR=""
TMP_DIR=""


timestamp() {
  date "+%Y-%m-%d %H:%M:%S"
}


log() {
  printf "[%s] %s\n" "$(timestamp)" "$*" | tee -a "${LOG_FILE}"
}


fatal() {
  log "错误：$*"
  exit 1
}


cleanup() {
  if [[ -n "${TMP_DIR}" && -d "${TMP_DIR}" ]]; then
    rm -rf -- "${TMP_DIR}"
  fi
}


require_command() {
  command -v "$1" >/dev/null 2>&1 || fatal "缺少依赖命令：$1"
}


format_table_name() {
  printf "%s%05d" "${TABLE_PREFIX}" "$1"
}


next_checkpoint() {
  local current=$1

  if (( current == 1 )); then
    printf "100"
  elif (( current + 100 >= FINAL_INDEX )); then
    printf "%s" "${FINAL_INDEX}"
  else
    printf "%s" "$((current + 100))"
  fi
}


configure_direct_connection() {
  case ",${no_proxy:-}," in
    *",${PLATFORM_HOST},"*) ;;
    *) no_proxy="${no_proxy:+${no_proxy},}${PLATFORM_HOST}" ;;
  esac

  case ",${NO_PROXY:-}," in
    *",${PLATFORM_HOST},"*) ;;
    *) NO_PROXY="${NO_PROXY:+${NO_PROXY},}${PLATFORM_HOST}" ;;
  esac

  export no_proxy
  export NO_PROXY
}


load_scheduler_command() {
  local mode

  [[ -e "${SCHEDULER_CURL_FILE}" ]] ||
    fatal "缺少调度 curl 文件：${SCHEDULER_CURL_FILE}"
  [[ ! -L "${SCHEDULER_CURL_FILE}" ]] ||
    fatal "调度 curl 文件不能是符号链接：${SCHEDULER_CURL_FILE}"
  [[ -f "${SCHEDULER_CURL_FILE}" ]] ||
    fatal "调度 curl 路径不是普通文件：${SCHEDULER_CURL_FILE}"

  if mode=$(stat -f "%Lp" "${SCHEDULER_CURL_FILE}" 2>/dev/null); then
    :
  elif mode=$(stat -c "%a" "${SCHEDULER_CURL_FILE}" 2>/dev/null); then
    :
  else
    fatal "无法读取调度 curl 文件权限"
  fi

  if (( (8#${mode} & 8#077) != 0 )); then
    fatal "调度 curl 文件权限必须为 0600，当前为 ${mode}"
  fi

  # 附件里的命令是单行文本；只把两个反斜杠加 n 还原为 Shell 续行。
  # JSON 请求体内部的单个反斜杠加 n 保持不变。
  SCHEDULER_COMMAND=$(
    perl -0pe 's/\\\\n/\\\n/g' "${SCHEDULER_CURL_FILE}"
  ) || fatal "无法读取或规范化调度 curl 文件"

  [[ "${SCHEDULER_COMMAND}" == *"${SCHEDULER_ENDPOINT}"* ]] ||
    fatal "调度 curl 文件不包含预期接口"

  DATAASSETS_COOKIE=$(
    printf "%s\n" "${SCHEDULER_COMMAND}" |
      sed -n "s/^[[:space:]]*-b '\\(.*\\)' \\\\$/\\1/p"
  )

  [[ -n "${DATAASSETS_COOKIE}" ]] ||
    fatal "无法从调度 curl 的 -b 参数读取 Cookie"
}


query_table_once() {
  local table_name=$1
  local body_file="${TMP_DIR}/query-body.json"
  local error_file="${TMP_DIR}/query-error.log"
  local payload
  local http_code
  local curl_status

  payload=$(printf \
    '{"size":200,"search":"%s","dbNames":["%s"],"dataSourceId":"%s"}' \
    "${table_name}" \
    "${DATABASE}" \
    "${DATA_SOURCE_ID}")

  http_code=$(
    curl \
      --silent \
      --show-error \
      --location \
      --request POST \
      --noproxy "${PLATFORM_HOST}" \
      --connect-timeout 30 \
      --max-time 120 \
      --output "${body_file}" \
      --write-out "%{http_code}" \
      "${QUERY_URL}" \
      --header "If-None-Match: ${QUERY_ETAG}" \
      --header "Cookie: ${DATAASSETS_COOKIE}" \
      --header "User-Agent: Apifox/1.0.0 (https://apifox.com)" \
      --header "content-type: application/json;charset=UTF-8" \
      --header "Accept: */*" \
      --data-raw "${payload}" \
      2>"${error_file}"
  )
  curl_status=$?

  if (( curl_status != 0 )); then
    LAST_ERROR="查询 curl 退出码 ${curl_status}"
    return 1
  fi

  if [[ ! "${http_code}" =~ ^2[0-9][0-9]$ ]]; then
    LAST_ERROR="查询接口 HTTP 状态码 ${http_code:-未知}"
    return 1
  fi

  if ! jq -e \
    '(.success == true) and (.code == 1) and (.data | type == "array")' \
    "${body_file}" >/dev/null 2>&1; then
    LAST_ERROR="查询接口返回无效 JSON 或业务状态失败"
    return 1
  fi

  if jq -e \
    --arg table "${table_name}" \
    '.data | any(.tableName? == $table)' \
    "${body_file}" >/dev/null 2>&1; then
    TABLE_STATUS="PRESENT"
  else
    TABLE_STATUS="ABSENT"
  fi

  LAST_ERROR=""
  return 0
}


query_table() {
  local table_name=$1
  local attempt

  for ((attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1)); do
    if query_table_once "${table_name}"; then
      if [[ "${TABLE_STATUS}" == "PRESENT" ]]; then
        log "查询 ${table_name}：仍存在"
      else
        log "查询 ${table_name}：已不存在"
      fi
      return 0
    fi

    log "查询接口失败（${attempt}/${MAX_ATTEMPTS}）：${table_name}；${LAST_ERROR}"

    if (( attempt < MAX_ATTEMPTS )); then
      log "等待 ${RETRY_INTERVAL_SECONDS} 秒后重试查询接口"
      sleep "${RETRY_INTERVAL_SECONDS}"
    fi
  done

  fatal "查询接口连续 ${MAX_ATTEMPTS} 次失败，终止监控；目标表 ${table_name}"
}


run_scheduler_once() {
  local body_file="${TMP_DIR}/scheduler-body.json"
  local error_file="${TMP_DIR}/scheduler-error.log"
  local curl_status

  (
    cd "${SCRIPT_DIR}" || exit 125
    bash -c "${SCHEDULER_COMMAND}"
  ) >"${body_file}" 2>"${error_file}"
  curl_status=$?

  if (( curl_status != 0 )); then
    LAST_ERROR="调度 curl 退出码 ${curl_status}"
    return 1
  fi

  if ! jq -e \
    'type == "object" and ((.success? == true) or (.code? == 1))' \
    "${body_file}" >/dev/null 2>&1; then
    LAST_ERROR="调度接口返回无效 JSON 或业务状态失败"
    return 1
  fi

  LAST_ERROR=""
  return 0
}


run_scheduler() {
  local target_table=$1
  local attempt

  for ((attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1)); do
    log "触发删表调度（${attempt}/${MAX_ATTEMPTS}）：停滞表 ${target_table}"

    if run_scheduler_once; then
      log "删表调度接口调用成功：停滞表 ${target_table}"
      return 0
    fi

    log "调度接口失败（${attempt}/${MAX_ATTEMPTS}）：${LAST_ERROR}"

    if (( attempt < MAX_ATTEMPTS )); then
      log "等待 ${RETRY_INTERVAL_SECONDS} 秒后重试调度接口"
      sleep "${RETRY_INTERVAL_SECONDS}"
    fi
  done

  fatal "调度接口连续 ${MAX_ATTEMPTS} 次失败，终止监控；停滞表 ${target_table}"
}


main() {
  local current_index=1
  local current_table
  local last_absent_table=""
  local waiting_for_recheck=0
  local scheduler_trigger_count=0

  require_command curl
  require_command jq
  require_command sed
  require_command perl
  require_command stat
  require_command mktemp
  require_command tee

  TMP_DIR=$(mktemp -d "${TMPDIR:-/tmp}/drop-progress-monitor.XXXXXX") ||
    fatal "无法创建临时目录"
  trap cleanup EXIT
  trap 'exit 130' INT
  trap 'exit 143' TERM

  configure_direct_connection
  load_scheduler_command

  log "开始监控删表进度；检查序列：00001、00100、00200…300000"
  log "平台连接已强制绕过系统代理：${PLATFORM_HOST}"
  log "查询间隔 ${CHECK_INTERVAL_SECONDS} 秒；接口失败重试间隔 ${RETRY_INTERVAL_SECONDS} 秒"

  while true; do
    current_table=$(format_table_name "${current_index}")
    query_table "${current_table}"

    if [[ "${TABLE_STATUS}" == "ABSENT" ]]; then
      last_absent_table="${current_table}"
      waiting_for_recheck=0
      log "已确认进度节点：${last_absent_table}"

      if (( current_index == FINAL_INDEX )); then
        log "${current_table} 已无法查询，达到监控停止条件"
        log "注意：该结果只证明最终检查表已不可查询，不代表逐张验证了全部 300000 张表"
        return 0
      fi

      current_index=$(next_checkpoint "${current_index}")
      continue
    fi

    if (( waiting_for_recheck == 0 )); then
      if [[ -n "${last_absent_table}" ]]; then
        log "定位边界：最后不存在 ${last_absent_table}；第一张仍存在 ${current_table}"
      else
        log "当前尚无已确认删除节点；第一张检查表仍存在 ${current_table}"
      fi

      waiting_for_recheck=1
      log "等待 ${CHECK_INTERVAL_SECONDS} 秒后复查 ${current_table}"
      sleep "${CHECK_INTERVAL_SECONDS}"
      continue
    fi

    scheduler_trigger_count=$((scheduler_trigger_count + 1))
    log "${current_table} 连续 ${CHECK_INTERVAL_SECONDS} 秒仍存在，判定删除进度停滞"
    run_scheduler "${current_table}"
    log "调度累计触发 ${scheduler_trigger_count} 次；等待 ${CHECK_INTERVAL_SECONDS} 秒后复查 ${current_table}"
    sleep "${CHECK_INTERVAL_SECONDS}"
  done
}


main "$@"

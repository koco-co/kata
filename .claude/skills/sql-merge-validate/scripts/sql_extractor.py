"""
Deterministic SQL structure extractor for merge-validation pipeline.
Pure regex, no side effects, no DB, no network.
"""
import re


def _extract_balanced_array_contents(sql_text):
    """
    从 explode(filter(array(...), ...)) 结构中提取 array 的完整内容。
    因为 array 内部有嵌套括号，必须用括号平衡法而非贪婪正则。
    返回所有匹配到的 array 内容字符串列表。
    """
    results = []
    for m in re.finditer(r'explode\s*\(\s*filter\s*\(', sql_text, re.I):
        idx = sql_text.find('array(', m.end())
        if idx == -1:
            continue
        depth = 0
        start = idx + len('array(')
        for i in range(start, len(sql_text)):
            c = sql_text[i]
            if c == '(':
                depth += 1
            elif c == ')':
                if depth == 0:
                    results.append(sql_text[start:i])
                    break
                depth -= 1
    return results


def _extract_stack_blocks(sql_text):
    """
    提取所有 LATERAL VIEW STACK(N, ...) stack_t 块，返回结构列表。
    stackRuleIds 通过解析 STACK 参数串里的 5 位整数字面量取得（每 3 个一组取第 2 个）。
    这能正确处理 total/13022/'0' 这类没有 hit_cnt_rule_<id> 的行数规则。
    保证 stackArity == len(stackRuleIds)。
    """
    blocks = []
    for stack_m in re.finditer(
        r'LATERAL\s+VIEW\s+STACK\(\s*(\d+)\s*,(.+?)\)\s*stack_t',
        sql_text, re.I | re.S
    ):
        arity = int(stack_m.group(1))
        params = stack_m.group(2)

        # rule_id 是 5 位整数字面量（13xxx），按出现顺序取
        # 每组 3 个参数的中间那个就是 rule_id
        raw_ids = [int(x) for x in re.findall(r'\b(\d{5})\b', params)]
        # 取前 arity 个（防止参数里有其他 5 位数）
        stack_rule_ids = raw_ids[:arity]

        # sumRuleIds：从 hit_cnt_rule_<id> 列名取（仅覆盖有聚合列的规则，不含表行数 fn1）
        sum_rule_ids = [int(x) for x in re.findall(r'hit_cnt_rule_(\d+)', params)]

        # 该块的聚合查询 fromTable：找 STACK 之前最近一个 _temp_sample_table_#{jobId} 表
        head = sql_text[:stack_m.start()]
        from_table = ''
        where_filter = ''
        fr_list = list(re.finditer(
            r'from\s+`[^`]+`\.`([^`]+_temp_sample_table_#\{jobId\})`\s+where\s+1\s*=\s*1\s*(.*)',
            head, re.I | re.S
        ))
        if fr_list:
            last_fr = fr_list[-1]
            from_table = last_fr.group(1)
            where_rest = last_fr.group(2)
            # 去掉 ) agg_temp_tab 之后的内容
            wp = re.match(r'(.*?)\s*\)\s*agg_temp_tab', where_rest, re.I | re.S)
            if wp:
                where_filter = re.sub(r'\s+', ' ', wp.group(1)).strip()

        blocks.append({
            'fromTable': from_table,
            'fromCount': 1,
            'whereFilter': where_filter,
            'sumRuleIds': sum_rule_ids,
            'stackArity': arity,
            'stackRuleIds': stack_rule_ids,
        })
    return blocks


def _extract_union_segments(sql_text, merged_rule_ids):
    """
    提取不可合并规则的独立 union 段（即 <rule_id> as rule_id 且不在任何 STACK 块内）。
    返回 [{"ruleId": int, "fromTable": str, "dirtyTable": str}]。
    """
    segments = []
    seen_rids = set()

    for m in re.finditer(r'(\b\d{5,}\b)\s+as\s+rule_id', sql_text, re.I):
        rid = int(m.group(1))
        if rid in merged_rule_ids or rid in seen_rids:
            continue
        seen_rids.add(rid)

        # 找这个 rule_id 出现处附近的 FROM 表：在该 rid 前后取片段正向搜 FROM
        ctx_start = max(0, m.start() - 500)
        ctx = sql_text[ctx_start: m.end() + 200]
        from_tables = re.findall(r'FROM\s+`[^`]+`\.`([^`]+)`', ctx, re.I)
        from_table = from_tables[-1] if from_tables else ''

        dirty_table = f'dq_monitor_#{{jobId}}_{rid}'
        segments.append({
            'ruleId': rid,
            'fromTable': from_table,
            'dirtyTable': dirty_table,
        })

    return segments


def extract_facts(sql_text, package_id):
    """
    Parse one package's merge SQL string into a structural-facts dict.
    Pure regex, deterministic, no side effects.

    Returns dict with keys:
      packageId, hasRand, sampleBaseTable, partitionPred,
      mergeBlocks, unionSegments, dirtyExplodeRuleIds, dirtyTables
    """
    s = sql_text

    # ── hasRand：出现 rand( 则为 True ─────────────────────────────────────
    has_rand = bool(re.search(r'\brand\s*\(', s, re.I))

    # ── sampleBaseTable：<base>_temp_sample_table_#{jobId} ───────────────
    sample_base = None
    m = re.search(r'`(\w+?)_temp_sample_table_#\{jobId\}`', s)
    if m:
        sample_base = m.group(1)

    # ── partitionPred：抽样表灌数语句的 where 1=1 之后的谓词 ──────────────
    # 格式：insert into `schema`.`<base>_temp_sample_table_#{jobId}` select ... from `schema`.`<base>` where 1=1 <pred> ;
    partition_pred = ''
    if sample_base:
        fill_m = re.search(
            r'insert\s+into\s+`[^`]+`\.`[^`]+_temp_sample_table_#\{jobId\}`'
            r'\s+select.+?from\s+`[^`]+`\.`[^`]+`\s+where\s+1=1\s*(.+?)\s*;',
            s, re.I | re.S
        )
        if fill_m:
            partition_pred = fill_m.group(1).strip()

    # ── mergeBlocks：LATERAL VIEW STACK 块 ──────────────────────────────
    merge_blocks = _extract_stack_blocks(s)

    # ── dirtyExplodeRuleIds：explode(filter(array(if(cond,'id',NULL),...))) ──
    merged_ids = set()
    for b in merge_blocks:
        merged_ids |= set(b['stackRuleIds'])

    dirty_explode_ids = []
    for arr_content in _extract_balanced_array_contents(s):
        # 提取 if(condition, 'RULE_ID', NULL) 形式中的 rule_id
        ids = [int(x) for x in re.findall(r"if\(.*?,\s*'(\d{5,})'", arr_content, re.S)]
        dirty_explode_ids.extend(ids)
    dirty_explode_ids = sorted(set(dirty_explode_ids))

    # ── unionSegments：不在 STACK 合并块内的独立段 ───────────────────────
    union_segments = _extract_union_segments(s, merged_ids)

    # ── dirtyTables：dq_monitor_#{jobId}_<key|id> 去重 ───────────────────
    dirty_tables = sorted(set(re.findall(r'dq_monitor_#\{jobId\}_(\w+)', s)))

    return {
        'packageId': package_id,
        'hasRand': has_rand,
        'sampleBaseTable': sample_base,
        'partitionPred': partition_pred,
        'mergeBlocks': merge_blocks,
        'unionSegments': union_segments,
        'dirtyExplodeRuleIds': dirty_explode_ids,
        'dirtyTables': dirty_tables,
    }

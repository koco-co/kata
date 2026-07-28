// 并行分片 D（缺口用例：多表比对×5 / 列表查询 / 脏数据 / 规则集导入）：与 full-a/b/c 配合 --workers 并行。
// 交付以 full.spec.ts 为准。
import "../cases/c0028-验证StarRocks3x数据源唯一性校验重复率单字段规则校验";
import "../cases/c0038-验证StarRocks3x数据源多表比对异常数据五类分类统计";
import "../cases/c0039-验证StarRocks3x数据源规则配置列表查询与筛选";
import "../cases/c0040-验证StarRocks3x数据源规则任务编辑与重跑";
import "../cases/c0041-验证StarRocks3x数据源规则任务删除";
import "../cases/c0042-验证任务查询页查询StarRocks3x规则任务实例与校验通过异常状态详情";
import "../cases/c0043-验证脏数据管理配置StarRocks3x数据源脏数据存储与时效";

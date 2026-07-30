// fixtures.ts — StarRocks3.x（浙商证券）feature 依赖的环境预置资源
//
// zszq-test 环境没有走 config/env 的 env profile 机制（该 feature 独立环境），
// 预置数据源显示名集中在此登记，环境迁移时只需核对本文件。

/** StarRocks3.x 预置数据源在 UI 下拉中的显示名。 */
export const STARROCKS3X_DATASOURCE_LABEL = "pw_sr3（STAR_ROCKS_3X）";

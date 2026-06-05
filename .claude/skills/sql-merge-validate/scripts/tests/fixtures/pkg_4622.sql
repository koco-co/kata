set hive.default.fileformat.managed = orc;  set hive.default.fileformat = orc;  CREATE TABLE IF NOT EXISTS `pw_test`.`dtstack_dq_monitor_temp_data` (
            `tenant_id` int,
            `monitor_id` int,
            `rule_id` int,
            `record_id` int,
            `job_key` varchar(255),
            `expansion` varchar(1024),
            `val` varchar(255)) PARTITIONED BY (job_id string) STORED AS PARQUET location 'hdfs://ns1/dtInsight/hive/warehouse/pw_test.db/dtstack_dq_monitor_temp_data'; 
 create table IF NOT EXISTS `pw_test`.`test_info_1_temp_sample_table_#{jobId}` (id int ,age int ,string_num string ,name string ,address string ,money string ,buy_date date ,date_detail string ,dt string ); insert into `pw_test`.`test_info_1_temp_sample_table_#{jobId}`  select id,age,string_num,name,address,money,buy_date,date_detail,dt from `pw_test`.`test_info_1` where 1=1   and dt='2026-06-04'  ;
 
  
   insert into `pw_test`.`dtstack_dq_monitor_temp_data` partition(job_id = '#{jobId}') select tenant_id,monitor_id,rule_id,record_id,job_key,CONCAT(expansion,'#smapleCuount:',sample_count) as expansionWithSampleCount,val from (SELECT 10481 AS tenant_id, 4471 AS monitor_id,  rule_id, 0 AS record_id, '#{jobId}' AS job_key,  expansion,  val FROM (
 select rule_id,val,expansion from (select count(1) as total,  COALESCE(SUM(CASE WHEN string_num not in ('25','30','28','35') THEN 1 ELSE 0 END ),0) AS hit_cnt_rule_13036 ,  '0' as hit_rule_expansion_13036 
 ,
 COALESCE(count( distinct coalesce(string_num,"NULL") ),0) AS hit_cnt_rule_13035 ,  '0' as hit_rule_expansion_13035 
 ,
 COALESCE(SUM(CASE WHEN  CHAR_LENGTH(money)  < 2  THEN 1 ELSE 0 END ),0) AS hit_cnt_rule_13034 ,  CONCAT(MIN(CHAR_LENGTH(money)), '/', MAX(CHAR_LENGTH(money))) as hit_rule_expansion_13034 
 ,
 COALESCE(SUM(CASE WHEN length(name)=0 THEN 1 ELSE 0 END ),0) AS hit_cnt_rule_13020 ,  '0' as hit_rule_expansion_13020 
 ,
 COALESCE(SUM(CASE WHEN id is null or age is null THEN 1 ELSE 0 END ),0) AS hit_cnt_rule_13019 ,  '0' as hit_rule_expansion_13019 
  from `pw_test`.`test_info_1_temp_sample_table_#{jobId}` where 1=1   and  (  id <= 100  ) ) agg_temp_tab  LATERAL VIEW STACK(
        5,
         hit_cnt_rule_13036,13036, hit_rule_expansion_13036,
 hit_cnt_rule_13035,13035, hit_rule_expansion_13035,
 hit_cnt_rule_13034,13034, hit_rule_expansion_13034,
 hit_cnt_rule_13020,13020, hit_rule_expansion_13020,
 hit_cnt_rule_13019,13019, hit_rule_expansion_13019 
    ) stack_t AS val, rule_id, expansion 
 
) merge_ids  ) ttt CROSS JOIN ( SELECT COUNT(*) AS sample_count FROM `pw_test`.`test_info_1_temp_sample_table_#{jobId}` ) cnt_sub;  
 drop table if exists `pw_test`.`dq_monitor_#{jobId}_13036`;create table `pw_test`.`dq_monitor_#{jobId}_13036`(id int,age int,string_num string,name string,address string,money string,buy_date date,date_detail string,dt string,rule_check_sum_field STRING  ,dq_job_id STRING ,dq_rule_id INT ,check_column STRING ,cyc_time STRING )PARTITIONED BY (`part_time` INT) STORED AS PARQUET ;drop table if exists `pw_test`.`dq_monitor_#{jobId}_13034`;create table `pw_test`.`dq_monitor_#{jobId}_13034`(id int,age int,string_num string,name string,address string,money string,buy_date date,date_detail string,dt string,rule_check_sum_field STRING  ,dq_job_id STRING ,dq_rule_id INT ,check_column STRING ,cyc_time STRING )PARTITIONED BY (`part_time` INT) STORED AS PARQUET ;drop table if exists `pw_test`.`dq_monitor_#{jobId}_13020`;create table `pw_test`.`dq_monitor_#{jobId}_13020`(id int,age int,string_num string,name string,address string,money string,buy_date date,date_detail string,dt string,rule_check_sum_field STRING  ,dq_job_id STRING ,dq_rule_id INT ,check_column STRING ,cyc_time STRING )PARTITIONED BY (`part_time` INT) STORED AS PARQUET ;drop table if exists `pw_test`.`dq_monitor_#{jobId}_13019`;create table `pw_test`.`dq_monitor_#{jobId}_13019`(id int,age int,string_num string,name string,address string,money string,buy_date date,date_detail string,dt string,rule_check_sum_field STRING  ,dq_job_id STRING ,dq_rule_id INT ,check_column STRING ,cyc_time STRING )PARTITIONED BY (`part_time` INT) STORED AS PARQUET ; 
drop table if exists `pw_test`.`dq_monitor_#{jobId}_eUvlyF1G` ;
create table if not exists `pw_test`.`dq_monitor_#{jobId}_eUvlyF1G` USING PARQUET TBLPROPERTIES ('parquet.compression' = 'SNAPPY') AS 
SELECT *
	FROM (
    	SELECT 
            *,
            ROW_NUMBER() OVER (PARTITION BY dt_rule_tag ORDER BY rand()) as rn
        FROM (
            SELECT 
                *
            FROM `pw_test`.`test_info_1_temp_sample_table_#{jobId}` 
            LATERAL VIEW explode(
                filter(
                    array(
                        if(string_num not in ('25','30','28','35'), '13036', NULL),
if( CHAR_LENGTH(money)  < 2 , '13034', NULL),
if(length(name)=0, '13020', NULL),
if(id is null or age is null, '13019', NULL) 
                    ), x -> x is not null 
                )
            ) tmp AS dt_rule_tag
            WHERE dt_rule_tag != '' 
        ) exploded_data
	) t
	WHERE rn <= 100 ; 
 


DROP table IF EXISTS `pw_test`.test_info_1_temp_sample_table_#{jobId} ; ;
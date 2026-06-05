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
 select rule_id,val,expansion from (select count(1) as total,  COALESCE(SUM(CASE WHEN ((id<='0' OR id>='5') OR (id NOT IN('1'))) THEN 1 ELSE 0 END ),0) AS hit_cnt_rule_13038 ,  '0' as hit_rule_expansion_13038 
 ,
 COALESCE(SUM(CASE WHEN (id<'0' OR id>'100') THEN 1 ELSE 0 END ),0) AS hit_cnt_rule_13037 ,  '0' as hit_rule_expansion_13037 
 ,
 COALESCE(SUM(CASE WHEN  CHAR_LENGTH(address)  < 1  THEN 1 ELSE 0 END ),0) AS hit_cnt_rule_13033 ,  CONCAT(MIN(CHAR_LENGTH(address)), '/', MAX(CHAR_LENGTH(address))) as hit_rule_expansion_13033 
 ,
 COALESCE(SUM(CASE WHEN length(name)=0 THEN 1 ELSE 0 END ),0) AS hit_cnt_rule_13021 ,  '0' as hit_rule_expansion_13021 
 ,
 COALESCE(SUM(CASE WHEN id is null and age is null THEN 1 ELSE 0 END ),0) AS hit_cnt_rule_13018 ,  '0' as hit_rule_expansion_13018 
  from `pw_test`.`test_info_1_temp_sample_table_#{jobId}` where 1=1   and  (  id <= 100  ) ) agg_temp_tab  LATERAL VIEW STACK(
        6,
         hit_cnt_rule_13038,13038, hit_rule_expansion_13038,
 hit_cnt_rule_13037,13037, hit_rule_expansion_13037,
 hit_cnt_rule_13033,13033, hit_rule_expansion_13033,
 total,13022, '0',
 hit_cnt_rule_13021,13021, hit_rule_expansion_13021,
 hit_cnt_rule_13018,13018, hit_rule_expansion_13018 
    ) stack_t AS val, rule_id, expansion 
 
) merge_ids  ) ttt CROSS JOIN ( SELECT COUNT(*) AS sample_count FROM `pw_test`.`test_info_1_temp_sample_table_#{jobId}` ) cnt_sub;  
 drop table if exists `pw_test`.`dq_monitor_#{jobId}_13038`;create table `pw_test`.`dq_monitor_#{jobId}_13038`(id int,age int,string_num string,name string,address string,money string,buy_date date,date_detail string,dt string,rule_check_sum_field STRING  ,dq_job_id STRING ,dq_rule_id INT ,check_column STRING ,cyc_time STRING )PARTITIONED BY (`part_time` INT) STORED AS PARQUET ;drop table if exists `pw_test`.`dq_monitor_#{jobId}_13037`;create table `pw_test`.`dq_monitor_#{jobId}_13037`(id int,age int,string_num string,name string,address string,money string,buy_date date,date_detail string,dt string,rule_check_sum_field STRING  ,dq_job_id STRING ,dq_rule_id INT ,check_column STRING ,cyc_time STRING )PARTITIONED BY (`part_time` INT) STORED AS PARQUET ;drop table if exists `pw_test`.`dq_monitor_#{jobId}_13033`;create table `pw_test`.`dq_monitor_#{jobId}_13033`(id int,age int,string_num string,name string,address string,money string,buy_date date,date_detail string,dt string,rule_check_sum_field STRING  ,dq_job_id STRING ,dq_rule_id INT ,check_column STRING ,cyc_time STRING )PARTITIONED BY (`part_time` INT) STORED AS PARQUET ;drop table if exists `pw_test`.`dq_monitor_#{jobId}_13021`;create table `pw_test`.`dq_monitor_#{jobId}_13021`(id int,age int,string_num string,name string,address string,money string,buy_date date,date_detail string,dt string,rule_check_sum_field STRING  ,dq_job_id STRING ,dq_rule_id INT ,check_column STRING ,cyc_time STRING )PARTITIONED BY (`part_time` INT) STORED AS PARQUET ;drop table if exists `pw_test`.`dq_monitor_#{jobId}_13018`;create table `pw_test`.`dq_monitor_#{jobId}_13018`(id int,age int,string_num string,name string,address string,money string,buy_date date,date_detail string,dt string,rule_check_sum_field STRING  ,dq_job_id STRING ,dq_rule_id INT ,check_column STRING ,cyc_time STRING )PARTITIONED BY (`part_time` INT) STORED AS PARQUET ; 
drop table if exists `pw_test`.`dq_monitor_#{jobId}_NqRKYxee` ;
create table if not exists `pw_test`.`dq_monitor_#{jobId}_NqRKYxee` USING PARQUET TBLPROPERTIES ('parquet.compression' = 'SNAPPY') AS 
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
                        if(((id<='0' OR id>='5') OR (id NOT IN('1'))), '13038', NULL),
if((id<'0' OR id>'100'), '13037', NULL),
if( CHAR_LENGTH(address)  < 1 , '13033', NULL),
if(length(name)=0, '13021', NULL),
if(id is null and age is null, '13018', NULL) 
                    ), x -> x is not null 
                )
            ) tmp AS dt_rule_tag
            WHERE dt_rule_tag != '' 
        ) exploded_data
	) t
	WHERE rn <= 100 ; 
 


DROP table IF EXISTS `pw_test`.test_info_1_temp_sample_table_#{jobId} ; ;
set hive.default.fileformat.managed = orc;  set hive.default.fileformat = orc;  CREATE TABLE IF NOT EXISTS `pw_test`.`dtstack_dq_monitor_temp_data` (
            `tenant_id` int,
            `monitor_id` int,
            `rule_id` int,
            `record_id` int,
            `job_key` varchar(255),
            `expansion` varchar(1024),
            `val` varchar(255)) PARTITIONED BY (job_id string) STORED AS PARQUET location 'hdfs://ns1/dtInsight/hive/warehouse/pw_test.db/dtstack_dq_monitor_temp_data'; 
 create table IF NOT EXISTS `pw_test`.`test_info_1_temp_sample_table_#{jobId}` (id int ,age int ,string_num string ,name string ,address string ,money string ,buy_date date ,date_detail string ,dt string ); insert into `pw_test`.`test_info_1_temp_sample_table_#{jobId}`  select id,age,string_num,name,address,money,buy_date,date_detail,dt from `pw_test`.`test_info_1` where 1=1   and dt='2026-06-04'  ;
 
  
   insert into `pw_test`.`dtstack_dq_monitor_temp_data` partition(job_id = '#{jobId}') select tenant_id,monitor_id,rule_id,record_id,job_key,CONCAT(expansion,'#smapleCuount:',sample_count) as expansionWithSampleCount,val from (select 10481 as tenant_id,4471 as monitor_id,13032 as rule_id,0 as record_id,'#{jobId}' as job_key,  '0' as expansion, count(1) AS val FROM `pw_test`.`test_info_1_temp_sample_table_#{jobId}` WHERE cast(string_num as double)*(id+age) is null or age>=cast(string_num as double)*(id+age)  and dt='2026-06-04'  and  (  id <= 100  )  union select 10481 as tenant_id,4471 as monitor_id,13025 as rule_id,0 as record_id,'#{jobId}' as job_key,  '0' as expansion, sum(case when count=1 then 1 else 0 end)/sum(case when cnt=0 then 0 else 1 end) as val
from (
    select count(distinct age) /count(1)  as count,count(1) as cnt from `pw_test`.`test_info_1_temp_sample_table_#{jobId}` where 1=1  and dt='2026-06-04'  and  (  id <= 100  )  
 union all 
select count(distinct id) /count(1)  as count,count(1) as cnt from `pw_test`.`test_info_1` where 1=1  
) temp  ) ttt CROSS JOIN ( SELECT COUNT(*) AS sample_count FROM `pw_test`.`test_info_1_temp_sample_table_#{jobId}` ) cnt_sub;  
 drop table if exists `pw_test`.`dq_monitor_#{jobId}_13032`;create table `pw_test`.`dq_monitor_#{jobId}_13032`(id int,age int,string_num string,name string,address string,money string,buy_date date,date_detail string,dt string,rule_check_sum_field STRING  ,dq_job_id STRING ,dq_rule_id INT ,check_column STRING ,cyc_time STRING )PARTITIONED BY (`part_time` INT) STORED AS PARQUET ;drop table if exists `pw_test`.`dq_monitor_#{jobId}_13025`;create table `pw_test`.`dq_monitor_#{jobId}_13025`(id int,age int,string_num string,name string,address string,money string,buy_date date,date_detail string,dt string,rule_check_sum_field STRING  ,dq_job_id STRING ,dq_rule_id INT ,check_column STRING ,cyc_time STRING )PARTITIONED BY (`part_time` INT) STORED AS PARQUET ; 
INSERT INTO `pw_test`.`dq_monitor_#{jobId}_13032` PARTITION( part_time= '20260605') SELECT *,0,'#{jobId}',13032,'age' as check_column ,'2026-06-05 15:07:50' FROM (select * from `pw_test`.`test_info_1_temp_sample_table_#{jobId}` where cast(string_num as double)*(id+age) is null or age>=cast(string_num as double)*(id+age)  and dt='2026-06-04'  and  (  id <= 100  ) ) dirty_t_47;drop table if exists `pw_test`.`dq_monitor_#{jobId}_13025`; 
 create table `pw_test`.`dq_monitor_#{jobId}_13025` (tableName varchar(2048),columnName varchar(2048),val varchar(2048),cnt int); insert into `pw_test`.`dq_monitor_#{jobId}_13025`  select tableName,columnName,val,cnt from ( select tableName, columnName, val,cnt from ( select '`test_info_1`.`test_info_1`' as tableName,'age' as columnName,concat(CAST(age AS varchar(2048))) as val,count(*) as cnt from `pw_test`.`test_info_1_temp_sample_table_#{jobId}` where 1=1  and dt='2026-06-04'  and  (  id <= 100  )  group by age having cnt>1 limit 10000 ) t1
 union all 
select tableName, columnName, val,cnt from ( select '`pw_test`.`test_info_1_t2`' as tableName,'id' as columnName,concat(CAST(id AS varchar(2048))) as val,count(*) as cnt from `pw_test`.`test_info_1` where 1=1  group by id having cnt>1 limit 10000 ) t2 ) temp ;
 


DROP table IF EXISTS `pw_test`.test_info_1_temp_sample_table_#{jobId} ; ;
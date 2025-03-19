import React, { useState, useEffect } from "react";
import AWS from "aws-sdk";

const Filter = ({ accounts }) => {
  const [selectedAccount, setSelectedAccount] = useState(null); // Holds the selected account

  const handleSelectChange = (e) => {
    const selectedName = e.target.value;
    const account = accounts.find((acc) => acc.targetName === selectedName);
    setSelectedAccount(account); // Set selected account's data
  };

  useEffect(() => {
    if (!selectedAccount) return;

    console.log("Selected Account:", selectedAccount);

    AWS.config.update({
      accessKeyId: selectedAccount.accessKey,
      secretAccessKey: selectedAccount.secretKey,
      region: selectedAccount.region,
    });

    const athena = new AWS.Athena();
    const databaseName = "cur_billing_data";
    const tableName = selectedAccount.targetName;

    // Extract S3 bucket and path details
    const curUrlParts = selectedAccount.cururl.split(" ")[0].split("/");
    const s3Bucket = curUrlParts[0]; // Extracts "mycurreportd0130"
    const s3BasePath = `s3://${s3Bucket}/${curUrlParts[1]}/cur/data/`; // Constructs "s3://mycurreportd0130/d0130/cur/data/"
    const partitionedPath = `${s3BasePath}BILLING_PERIOD=*/`; // Adds partition wildcard for Athena
    const outputLocation = selectedAccount.output; // Athena query results location

    console.log("Table Name:", tableName);
    console.log("Input location",selectedAccount.cururl);
    console.log("S3 Bucket:", s3Bucket);
    console.log("S3 Base Path:", s3BasePath);
    console.log("Partitioned Path:", partitionedPath);
    console.log("Output Location:", outputLocation);

    const executeAthenaQuery = async (query) => {
      try {
        console.log("Executing query:", query); // ✅ Log the query before running
        const response = await athena.startQueryExecution({
          QueryString: query,
          ResultConfiguration: { OutputLocation: outputLocation }
        }).promise().then(response => {console.log("Query execution started:", response);return response;})
         // ✅ Log response
        
      } catch (error) {
        console.error("Athena query failed:", error); // ✅ Log Athena error
        throw error; // Ensure error propagates
      }
    };
    

    const setupAthenaTable = async () => {
      try {
        console.log("Setting up Athena table...");
        // Step 1: Check if the database exists
        await executeAthenaQuery(`SHOW DATABASES LIKE '${databaseName}';`);
        console.log("Database exists");

        // Step 2: Create Database if it does not exist
        await executeAthenaQuery(`CREATE DATABASE IF NOT EXISTS ${databaseName};`);
        console.log("Database created");

        // Step 3: Create Table with Partitioning
        const createTableQuery = `
        CREATE EXTERNAL TABLE IF NOT EXISTS  ${databaseName}.${tableName} (
          bill_bill_type STRING,
          bill_billing_entity STRING,
          bill_billing_period_end_date STRING,
          bill_billing_period_start_date STRING,
          bill_invoice_id STRING,
          bill_invoicing_entity STRING,
          bill_payer_account_id STRING,
          bill_payer_account_name STRING,
          cost_category STRING,
          discount STRING,
          discount_bundled_discount STRING,
          discount_total_discount STRING,
          identity_line_item_id STRING,
          identity_time_interval STRING,
          line_item_availability_zone STRING,
          line_item_blended_cost DECIMAL(18,9),
          line_item_blended_rate DECIMAL(18,9),
          line_item_currency_code STRING,
          line_item_legal_entity STRING,
          line_item_line_item_description STRING,
          line_item_line_item_type STRING,
          line_item_net_unblended_cost DECIMAL(18,9),
          line_item_net_unblended_rate DECIMAL(18,9),
          line_item_normalization_factor DECIMAL(18,9),
          line_item_normalized_usage_amount DECIMAL(18,9),
          line_item_operation STRING,
          line_item_product_code STRING,
          line_item_resource_id STRING,
          line_item_tax_type STRING,
          line_item_unblended_cost DECIMAL(18,9),
          line_item_unblended_rate DECIMAL(18,9),
          line_item_usage_account_id STRING,
          line_item_usage_account_name STRING,
          line_item_usage_amount DECIMAL(18,9),
          line_item_usage_end_date STRING,
          line_item_usage_start_date STRING,
          line_item_usage_type STRING,
          pricing_currency STRING,
          pricing_lease_contract_length STRING,
          pricing_offering_class STRING,
          pricing_public_on_demand_cost DECIMAL(18,9),
          pricing_public_on_demand_rate DECIMAL(18,9),
          pricing_purchase_option STRING,
          pricing_rate_code STRING,
          pricing_rate_id STRING,
          pricing_term STRING,
          pricing_unit STRING,
          product STRING,
          product_comment STRING,
          product_fee_code STRING,
          product_fee_description STRING,
          product_from_location STRING,
          product_from_location_type STRING,
          product_from_region_code STRING,
          product_instance_family STRING,
          product_instance_type STRING,
          product_instancesku STRING,
          product_location STRING,
          product_location_type STRING,
          product_operation STRING,
          product_pricing_unit STRING,
          product_product_family STRING,
          product_region_code STRING,
          product_servicecode STRING,
          product_sku STRING,
          product_to_location STRING,
          product_to_location_type STRING,
          product_to_region_code STRING,
          product_usagetype STRING,
          reservation_amortized_upfront_cost_for_usage DECIMAL(18,9),
          reservation_amortized_upfront_fee_for_billing_period DECIMAL(18,9),
          reservation_availability_zone STRING,
          reservation_effective_cost DECIMAL(18,9),
          reservation_end_time STRING,
          reservation_modification_status STRING,
          reservation_net_amortized_upfront_cost_for_usage DECIMAL(18,9),
          reservation_net_amortized_upfront_fee_for_billing_period DECIMAL(18,9),
          reservation_net_effective_cost DECIMAL(18,9),
          reservation_net_recurring_fee_for_usage DECIMAL(18,9),
          reservation_net_unused_amortized_upfront_fee_for_billing_period DECIMAL(18,9),
          reservation_net_unused_recurring_fee DECIMAL(18,9),
          reservation_net_upfront_value DECIMAL(18,9),
          reservation_normalized_units_per_reservation DECIMAL(18,9),
          reservation_number_of_reservations DECIMAL(18,9),
          reservation_recurring_fee_for_usage DECIMAL(18,9),
          reservation_reservation_a_r_n STRING,
          reservation_start_time STRING,
          reservation_subscription_id STRING,
          reservation_total_reserved_normalized_units DECIMAL(18,9),
          reservation_total_reserved_units DECIMAL(18,9),
          reservation_units_per_reservation DECIMAL(18,9),
          reservation_unused_amortized_upfront_fee_for_billing_period DECIMAL(18,9),
          reservation_unused_normalized_unit_quantity DECIMAL(18,9),
          reservation_unused_quantity DECIMAL(18,9),
          reservation_unused_recurring_fee DECIMAL(18,9),
          reservation_upfront_value DECIMAL(18,9),
          resource_tags STRING,
          savings_plan_amortized_upfront_commitment_for_billing_period DECIMAL(18,9),
          savings_plan_end_time STRING,
          savings_plan_instance_type_family STRING,
          savings_plan_net_amortized_upfront_commitment_for_billing_period DECIMAL(18,9),
          savings_plan_net_recurring_commitment_for_billing_period DECIMAL(18,9),
          savings_plan_net_savings_plan_effective_cost DECIMAL(18,9),
          savings_plan_offering_type STRING,
          savings_plan_payment_option STRING,
          savings_plan_purchase_term STRING,
          savings_plan_recurring_commitment_for_billing_period DECIMAL(18,9),
          savings_plan_region STRING,
          savings_plan_savings_plan_a_r_n STRING,
          savings_plan_savings_plan_effective_cost DECIMAL(18,9),
          savings_plan_savings_plan_rate DECIMAL(18,9),
          savings_plan_start_time STRING,
          savings_plan_total_commitment_to_date DECIMAL(18,9),
          savings_plan_used_commitment DECIMAL(18,9),
          split_line_item_actual_usage DECIMAL(18,9),
          split_line_item_net_split_cost DECIMAL(18,9),
          split_line_item_net_unused_cost DECIMAL(18,9),
          split_line_item_parent_resource_id STRING,
          split_line_item_public_on_demand_split_cost DECIMAL(18,9),
          split_line_item_public_on_demand_unused_cost DECIMAL(18,9),
          split_line_item_reserved_usage DECIMAL(18,9),
          split_line_item_split_cost DECIMAL(18,9),
          split_line_item_split_usage DECIMAL(18,9),
          split_line_item_split_usage_ratio DECIMAL(18,9),
          split_line_item_unused_cost DECIMAL(18,9)
        ) 
        ROW FORMAT DELIMITED 
        FIELDS TERMINATED BY ',' 
        STORED AS TEXTFILE 
        LOCATION '${selectedAccount.cururl}';
        `;
        
        await executeAthenaQuery(createTableQuery);
        console.log("Table created");

        // Step 4: Load new partitions
        await executeAthenaQuery(`MSCK REPAIR TABLE ${databaseName}.${tableName};`);
        console.log("Partitions loaded");

        // Step 5: Query some data from the table to verify
        const fetchDataQuery = `SELECT
        line_item_usage_account_id as account,
        product as productName,
        product_product_family as productFamily,
        product_region_code as region,
        line_item_resource_id as resourceId,
        line_item_operation as operation,
        COALESCE(reservation_effective_cost, savings_plan_savings_plan_effective_cost, line_item_unblended_cost) as effectiveCost,
        resource_tags as resourceTag,
        line_item_usage_start_date as startDate,
        line_item_usage_end_date as endDate,
        line_item_usage_amount as usageAmount
          FROM ${databaseName}.${tableName} LIMIT 10;`;
        const fetchDataExecution = await executeAthenaQuery(fetchDataQuery);
        console.log("Data fetched");

        console.log("Athena Query Execution ID:", fetchDataExecution.QueryExecutionId);
      } catch (error) {
        console.error("Error in Athena operations:", error);
      }
    };

    setupAthenaTable();
  }, [selectedAccount]);

  return (
    <div>
      {/* Dropdown to list all target names */}
      {accounts.length > 0 ? (
        <>
          <label>Select an Account: </label>
          <select onChange={handleSelectChange} defaultValue="">
            <option value="" disabled>Select an account</option>
            {accounts.map((acc, index) => (
              <option key={index} value={acc.targetName}>
                {acc.targetName}
              </option>
            ))}
          </select>

          {/* Render selected account details */}
          {selectedAccount && (
            <div
              className="account-details"
              style={{
                marginTop: "15px",
                padding: "10px",
                border: "1px solid #ccc",
                borderRadius: "8px",
              }}
            >
              <h3>Account Details</h3>
              <p><strong>Target Name:</strong> {selectedAccount.targetName}</p>
              <p><strong>Region:</strong> {selectedAccount.region}</p>
              <p><strong>Access Key:</strong> {selectedAccount.accessKey}</p>
              <p><strong>Secret Key:</strong> {selectedAccount.secretKey}</p>
              <p><strong>CUR URL:</strong> {selectedAccount.cururl}</p>
              <p><strong>Output S3 URI:</strong> {selectedAccount.output}</p>
            </div>
          )}
        </>
      ) : (
        <p>No accounts available.</p>
      )}
    </div>
  );
};

export default Filter;

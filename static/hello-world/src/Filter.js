import React, { useState, useEffect } from "react";
import AWS from "aws-sdk";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import "./Filter.css";

const Filter = ({ accounts }) => {
  // If accounts array is empty, don't render anything
  if (!accounts || accounts.length === 0) {
    return null;
  }

  const [selectedAccount, setSelectedAccount] = useState(accounts[0]);
  const [queryResults, setQueryResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    account: "",
    productName: "",
    productFamily: "",
    region: "",
    resourceId: "",
    operation: "",
    effectiveCost: "",
    startDate: "",
    endDate: "",
    usageAmount: "",
  });

  const handleSelectChange = (e) => {
    const selectedName = e.target.value;
    const account = accounts.find((acc) => acc.targetName === selectedName);
    setSelectedAccount(account);
    setQueryResults([]);
    setError(null);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const filteredResults = queryResults.filter((row) => {
    const accountMatch =
      row.account?.toLowerCase().includes(filters.account.toLowerCase()) ||
      !filters.account;

    let productMatch = true;
    if (filters.productName && row.productName) {
      try {
        if (typeof row.productName === "string") {
          const productObj = JSON.parse(row.productName);
          productMatch =
            productObj.product_name
              ?.toLowerCase()
              .includes(filters.productName.toLowerCase()) || false;
        } else if (typeof row.productName === "object") {
          productMatch =
            row.productName.product_name
              ?.toLowerCase()
              .includes(filters.productName.toLowerCase()) || false;
        }
      } catch (e) {
        productMatch = false;
      }
    }

    const productFamilyMatch =
      row.productFamily
        ?.toLowerCase()
        .includes(filters.productFamily.toLowerCase()) ||
      !filters.productFamily;

    const regionMatch =
      row.region?.toLowerCase().includes(filters.region.toLowerCase()) ||
      !filters.region;

    const resourceIdMatch =
      row.resourceId
        ?.toLowerCase()
        .includes(filters.resourceId.toLowerCase()) || !filters.resourceId;

    const operationMatch =
      row.operation?.toLowerCase().includes(filters.operation.toLowerCase()) ||
      !filters.operation;

    // Filter by cost
    const costMatch =
      !filters.effectiveCost ||
      (row.effectiveCost &&
        row.effectiveCost.toString().includes(filters.effectiveCost));

    // Filter by dates
    const startDateMatch =
      !filters.startDate ||
      (row.startDate &&
        row.startDate.toLowerCase().includes(filters.startDate.toLowerCase()));

    const endDateMatch =
      !filters.endDate ||
      (row.endDate &&
        row.endDate.toLowerCase().includes(filters.endDate.toLowerCase()));

    // Filter by usage amount
    const usageMatch =
      !filters.usageAmount ||
      (row.usageAmount &&
        row.usageAmount.toString().includes(filters.usageAmount));

    return (
      accountMatch &&
      productMatch &&
      productFamilyMatch &&
      regionMatch &&
      resourceIdMatch &&
      operationMatch &&
      costMatch &&
      startDateMatch &&
      endDateMatch &&
      usageMatch
    );
  });

  useEffect(() => {
    if (!selectedAccount) return;

    console.log("Selected Account:", selectedAccount);
    setIsLoading(true);
    setError(null);

    AWS.config.update({
      accessKeyId: selectedAccount.accessKey,
      secretAccessKey: selectedAccount.secretKey,
      region: selectedAccount.region,
    });

    const athena = new AWS.Athena();
    const databaseName = "cur_billing_data";
    const tableName = selectedAccount.targetName;
    const outputLocation = selectedAccount.output;

    const executeAthenaQuery = async (query) => {
      try {
        console.log("Executing query:", query);
        const startResponse = await athena
          .startQueryExecution({
            QueryString: query,
            ResultConfiguration: { OutputLocation: outputLocation },
          })
          .promise();

        console.log("Query execution started:", startResponse);
        return startResponse;
      } catch (error) {
        console.error("Athena query failed:", error);
        throw error;
      }
    };

    const getQueryResults = async (queryExecutionId) => {
      try {
        let queryStatus = "RUNNING";
        while (queryStatus === "RUNNING" || queryStatus === "QUEUED") {
          const statusResponse = await athena
            .getQueryExecution({
              QueryExecutionId: queryExecutionId,
            })
            .promise();

          queryStatus = statusResponse.QueryExecution.Status.State;
          console.log(`Query status: ${queryStatus}`);

          if (queryStatus === "FAILED" || queryStatus === "CANCELLED") {
            const errorReason =
              statusResponse.QueryExecution.Status.StateChangeReason;
            console.error("Query failed with reason:", errorReason);
            throw new Error(`Query execution failed: ${errorReason}`);
          }

          if (queryStatus === "RUNNING" || queryStatus === "QUEUED") {
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }

        // Query completed successfully, get the results
        const resultsResponse = await athena
          .getQueryResults({
            QueryExecutionId: queryExecutionId,
          })
          .promise();

        console.log("Raw query results:", resultsResponse);

        // Process the results into a more usable format
        const headers = resultsResponse.ResultSet.Rows[0].Data.map(
          (header) => header.VarCharValue
        );

        const rows = resultsResponse.ResultSet.Rows.slice(1).map((row) => {
          const rowData = {};
          row.Data.forEach((data, index) => {
            const columnName = headers[index];
            let value = data.VarCharValue;

            // Handle null values
            if (value === null || value === undefined) {
              rowData[columnName] = null;
              return;
            }

            // Parse JSON strings for product and resource tags
            if (columnName === "productName" || columnName === "resourceTag") {
              try {
                value = JSON.parse(value);
              } catch (e) {
                console.log(`Could not parse JSON for ${columnName}:`, value);
              }
            }

            // Convert numeric values
            if (
              columnName === "effectiveCost" ||
              columnName === "usageAmount"
            ) {
              const num = Number(value);
              if (!isNaN(num)) {
                value = num;
              }
            }

            rowData[columnName] = value;
          });
          return rowData;
        });

        console.log("Processed row data:", rows);
        return rows;
      } catch (error) {
        console.error("Error getting query results:", error);
        throw error;
      }
    };

    const selectData = async () => {
      try {
        await executeAthenaQuery(`SHOW DATABASES LIKE '${databaseName}';`);
        console.log("Database exists");

        const fetchDataQuery = `SELECT
          line_item_usage_account_id as account,
          CAST(product as JSON) as productName,
          product_product_family as productFamily,
          product_region_code as region,
          line_item_resource_id as resourceId,
          line_item_operation as operation,
          COALESCE(reservation_effective_cost, savings_plan_savings_plan_effective_cost, line_item_unblended_cost) as effectiveCost,
          CAST(resource_tags as JSON) as resourceTag,
          line_item_usage_start_date as startDate,
          line_item_usage_end_date as endDate,
          line_item_usage_amount as usageAmount
        FROM ${databaseName}.${tableName}
        LIMIT 100;`;

        const fetchDataExecution = await executeAthenaQuery(fetchDataQuery);
        console.log(
          "Data fetch initiated, execution ID:",
          fetchDataExecution.QueryExecutionId
        );

        const results = await getQueryResults(
          fetchDataExecution.QueryExecutionId
        );
        console.log("Fetched data from Athena:", results);
        setQueryResults(results);
      } catch (error) {
        console.error("Error in data fetch:", error);
        setError(error.message || "An error occurred fetching the data");
      } finally {
        setIsLoading(false);
      }
    };

    selectData();
  }, [selectedAccount]);

  // Helper function to extract product name from the product object
  const getProductName = (product) => {
    if (!product) return "N/A";

    if (typeof product === "string") {
      try {
        const productObj = JSON.parse(product);
        return productObj.product_name || "N/A";
      } catch (e) {
        return "N/A";
      }
    }

    return product.product_name || "N/A";
  };

  const formatCost = (cost) => {
    if (cost === null || cost === undefined) return "$0.00";
    const numCost = typeof cost === "string" ? parseFloat(cost) : cost;
    return !isNaN(numCost) ? `$${numCost.toFixed(4)}` : "$0.00";
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    try {
      const date = new Date(dateStr);
      return date.toLocaleString();
    } catch (e) {
      return dateStr;
    }
  };

  // Generate region data for pie chart
  const generateRegionChartData = (results) => {
    if (!results || results.length === 0) return [];

    const regionCosts = {};

    results.forEach((row) => {
      const region = row.region || "Unknown";
      const cost =
        typeof row.effectiveCost === "number"
          ? row.effectiveCost
          : parseFloat(row.effectiveCost) || 0;

      if (regionCosts[region]) {
        regionCosts[region] += cost;
      } else {
        regionCosts[region] = cost;
      }
    });

    const chartData = Object.keys(regionCosts)
      .map((region) => ({
        name: region,
        value: parseFloat(regionCosts[region].toFixed(2)),
      }))
      .sort((a, b) => b.value - a.value);

    // Check if all values are zero
    const allValuesZero = chartData.every((item) => item.value === 0);

    // If all values are zero, assign equal values for visualization
    if (allValuesZero && chartData.length > 0) {
      return chartData.map((item) => ({
        ...item,
        value: 1, // Equal value for equal pie segments
        actualValue: 0, // Store the actual value (0) for display
      }));
    }

    return chartData;
  };

  // Replace the existing generateDateChartData function with this updated version
  const generateDateChartData = (results) => {
    if (!results || results.length === 0) return [];

    // Extract all end dates
    const allDates = results
      .filter((row) => row.endDate)
      .map((row) => new Date(row.endDate));

    // Find min and max dates
    const minDate =
      allDates.length > 0 ? new Date(Math.min(...allDates)) : null;
    const maxDate =
      allDates.length > 0 ? new Date(Math.max(...allDates)) : null;

    if (!minDate || !maxDate) return [];

    console.log("Min date:", minDate, "Max date:", maxDate);

    // Group costs by date
    const dateCosts = {};

    results.forEach((row) => {
      if (!row.endDate) return;

      try {
        // Parse the date
        const endDate = new Date(row.endDate);

        // Format as YYYY-MM-DD 12:00:00
        const dateObj = new Date(
          endDate.getFullYear(),
          endDate.getMonth(),
          endDate.getDate(),
          12,
          0,
          0
        );

        const dateKey = dateObj.toISOString();

        // Format date as M/D/YYYY, 12:00:00 PM
        const formattedDate = `${
          dateObj.getMonth() + 1
        }/${dateObj.getDate()}/${dateObj.getFullYear()}, 12:00:00 PM`;

        const cost =
          typeof row.effectiveCost === "number"
            ? row.effectiveCost
            : parseFloat(row.effectiveCost) || 0;

        if (dateCosts[dateKey]) {
          dateCosts[dateKey].cost += cost;
        } else {
          dateCosts[dateKey] = {
            date: formattedDate,
            cost: cost,
            timestamp: dateObj.getTime(), // Store timestamp for sorting
            isWeekend: dateObj.getDay() === 0 || dateObj.getDay() === 6, // Check if weekend (0 = Sunday, 6 = Saturday)
          };
        }
      } catch (e) {
        console.error("Error processing date:", e, "for date:", row.endDate);
      }
    });

    let chartData = Object.values(dateCosts)
      .map((entry) => ({
        date: entry.date,
        cost: parseFloat(entry.cost.toFixed(2)),
        timestamp: entry.timestamp,
        isWeekend: entry.isWeekend,
      }))
      .sort((a, b) => a.timestamp - b.timestamp);

    if (chartData.length > 0) {
      // Calculate trend data points (4 evenly spaced points)
      const trendPoints = calculateTrendPoints(chartData);

      // Keep only weekend points
      const weekendPoints = chartData.filter((point) => point.isWeekend);

      // Create a new array with only weekend points and trend points
      // Make sure to prevent duplicates (if a weekend point is also a trend point)
      const filteredPoints = [...weekendPoints];

      // Add trend points that aren't already in the weekendPoints
      trendPoints.forEach((trendPoint) => {
        if (!filteredPoints.some((p) => p.timestamp === trendPoint.timestamp)) {
          filteredPoints.push({
            date: trendPoint.date,
            cost: null, // No visible dot for the regular cost line
            timestamp: trendPoint.timestamp,
            isWeekend: false,
            trendCost: trendPoint.trendCost,
            isTrendPoint: true,
          });
        } else {
          // If the point exists (it's a weekend), add the trend value
          const existingPoint = filteredPoints.find(
            (p) => p.timestamp === trendPoint.timestamp
          );
          existingPoint.trendCost = trendPoint.trendCost;
          existingPoint.isTrendPoint = true;
        }
      });

      // Sort points chronologically
      chartData = filteredPoints.sort((a, b) => a.timestamp - b.timestamp);
    }

    return chartData;
  };

  // Helper function to calculate trend points using linear regression
  const calculateTrendPoints = (data) => {
    if (data.length <= 1) return data.map((d) => ({ ...d, trendCost: d.cost }));

    // Calculate number of points needed (4 or less if data has fewer points)
    const numPoints = Math.min(4, data.length);

    // Get indices for evenly distributed points
    const indices = [];
    if (numPoints === 1) {
      indices.push(0);
    } else {
      const step = (data.length - 1) / (numPoints - 1);
      for (let i = 0; i < numPoints; i++) {
        indices.push(Math.round(i * step));
      }
    }

    // Simple linear regression to calculate trend
    let sumX = 0,
      sumY = 0,
      sumXY = 0,
      sumX2 = 0;
    const n = data.length;

    data.forEach((point, i) => {
      sumX += i;
      sumY += point.cost;
      sumXY += i * point.cost;
      sumX2 += i * i;
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Create trend points for selected indices
    return indices.map((i) => ({
      timestamp: data[i].timestamp,
      date: data[i].date,
      trendCost: parseFloat((intercept + slope * i).toFixed(2)),
    }));
  };

  // Generate product data for pie chart
  const generateProductChartData = (results) => {
    if (!results || results.length === 0) return [];

    const productCosts = {};

    results.forEach((row) => {
      const product = getProductName(row.productName);
      const cost =
        typeof row.effectiveCost === "number"
          ? row.effectiveCost
          : parseFloat(row.effectiveCost) || 0;

      if (productCosts[product]) {
        productCosts[product] += cost;
      } else {
        productCosts[product] = cost;
      }
    });

    const chartData = Object.keys(productCosts)
      .map((product) => ({
        name: product,
        value: parseFloat(productCosts[product].toFixed(2)),
      }))
      .sort((a, b) => b.value - a.value);

    // Check if all values are zero
    const allValuesZero = chartData.every((item) => item.value === 0);

    // If all values are zero, assign equal values for visualization
    if (allValuesZero && chartData.length > 0) {
      return chartData.map((item) => ({
        ...item,
        value: 1, // Equal value for equal pie segments
        actualValue: 0, // Store the actual value (0) for display
      }));
    }

    return chartData;
  };

  const COLORS = [
    "#0088FE",
    "#00C49F",
    "#FFBB28",
    "#FF8042",
    "#8884d8",
    "#82ca9d",
    "#ffc658",
    "#8dd1e1",
    "#a4de6c",
    "#d0ed57",
  ];

  const regionChartData = generateRegionChartData(filteredResults);
  const productChartData = generateProductChartData(filteredResults);
  const dateChartData = generateDateChartData(filteredResults);

  // Custom label for pie chart segments
  const renderCustomLabel = ({ name, payload }) => {
    // Check if there's an actualValue (means it was a zero value)
    if ("actualValue" in payload) {
      return `${name}: $0.00`;
    }
    // Regular cost display for non-zero values
    return `${name}: $${payload.value.toFixed(2)}`;
  };

  // Custom tooltip formatter
  const customTooltipFormatter = (value, name, props) => {
    // Check if it has an actualValue property (was a zero value)
    if (props.payload && "actualValue" in props.payload) {
      return ["$0.00", name];
    }
    return [`$${value}`, name];
  };

  // Calculate total cost
  const calculateTotalCost = (chartData) => {
    return chartData
      .reduce((sum, entry) => {
        // Use actualValue if present (for zero cases), otherwise use value
        const valueToAdd =
          "actualValue" in entry ? entry.actualValue : entry.value;
        return sum + valueToAdd;
      }, 0)
      .toFixed(2);
  };

  return (
    <div className="filter-container">
      {/* Visualization Containers */}
      {/* Visualization Containers - updated structure */}
      <div className="visualizations-container">
        {/* Cost by Date Line Chart */}
        <div className="visualization-section">
          <h3>Cost by Date</h3>
          {isLoading ? (
            <div className="loading-viz">Loading...</div>
          ) : dateChartData.length === 0 ? (
            <div className="empty-viz">No data available</div>
          ) : (
            <>
              <div className="line-chart-container">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart
                    data={dateChartData}
                    margin={{ top: 5, right: 5, left: 5, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10 }}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis />
                    <Tooltip
                      formatter={(value, name) => {
                        if (name === "Sunday Cost") return [`$${value}`, name];
                        if (name === "Trend") return [`$${value}`, name];
                        return [value, name];
                      }}
                    />
                    {/* Sunday cost line */}
                    <Line
                      type="monotone"
                      dataKey="cost"
                      stroke="#8884d8"
                      strokeWidth={2}
                      dot={(props) => {
                        const { cx, cy, payload } = props;
                        if (payload.isSunday) {
                          return (
                            <circle
                              cx={cx}
                              cy={cy}
                              r={6}
                              fill="#ff7300"
                              stroke="#ff7300"
                            />
                          );
                        }
                        return null;
                      }}
                      activeDot={{ r: 8 }}
                      connectNulls={false}
                      name="Sunday Cost"
                    />
                    {/* Trend line */}
                    <Line
                      type="monotone"
                      dataKey="trendCost"
                      stroke="#82ca9d"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={(props) => {
                        const { cx, cy, payload } = props;
                        if (payload.isTrendPoint) {
                          return (
                            <circle
                              cx={cx}
                              cy={cy}
                              r={6}
                              fill="#82ca9d"
                              stroke="#82ca9d"
                            />
                          );
                        }
                        return null;
                      }}
                      activeDot={{ r: 8 }}
                      name="Trend"
                      connectNulls={true}
                    />
                  </LineChart>
                </ResponsiveContainer>
                <div className="total-cost">
                  Total: $
                  {dateChartData
                    .reduce((sum, entry) => sum + (entry.cost || 0), 0)
                    .toFixed(2)}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Cost by Region Chart */}
        <div className="visualization-section">
          <h3>Cost by Region</h3>
          {isLoading ? (
            <div className="loading-viz">Loading...</div>
          ) : regionChartData.length === 0 ? (
            <div className="empty-viz">No data available</div>
          ) : (
            <>
              <div className="pie-chart-container">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={regionChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={90}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {regionChartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={customTooltipFormatter} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
                <div className="total-cost">
                  Total: ${calculateTotalCost(regionChartData)}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Cost by Product Chart */}
        <div className="visualization-section">
          <h3>Cost by Product</h3>
          {isLoading ? (
            <div className="loading-viz">Loading...</div>
          ) : productChartData.length === 0 ? (
            <div className="empty-viz">No data available</div>
          ) : (
            <>
              <div className="pie-chart-container">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={productChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={90}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {productChartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={customTooltipFormatter} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
                <div className="total-cost">
                  Total: ${calculateTotalCost(productChartData)}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Loading indicator */}
      {isLoading && (
        <div className="loading">
          <p>Loading data... This may take a few moments.</p>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="error-panel">
          <h3>Error</h3>
          <p>{error}</p>
          <div className="troubleshooting">
            <h4>Troubleshooting Steps:</h4>
            <ol>
              <li>
                Check that the IAM user has the required permissions on the S3
                bucket
              </li>
              <li>Verify that the S3 bucket policy allows access</li>
              <li>Confirm the S3 bucket and path are correct</li>
              <li>
                Check that the Athena service role has access to the S3 bucket
              </li>
            </ol>
          </div>
        </div>
      )}

      {/* Data Table */}
      <div className="data-table-container">
        <h3>
          AWS Cost Data{" "}
          {queryResults.length > 0 ? `(${filteredResults.length} results)` : ""}
        </h3>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>
                  ID
                  <div className="filter-input">
                    <input
                      id="account"
                      name="account"
                      type="text"
                      value={filters.account}
                      onChange={handleFilterChange}
                      placeholder="Filter by ID"
                    />
                  </div>
                </th>
                <th>
                  Product
                  <div className="filter-input">
                    <input
                      id="productName"
                      name="productName"
                      type="text"
                      value={filters.productName}
                      onChange={handleFilterChange}
                      placeholder="Filter by product"
                    />
                  </div>
                </th>
                <th>
                  Family
                  <div className="filter-input">
                    <input
                      id="productFamily"
                      name="productFamily"
                      type="text"
                      value={filters.productFamily || ""}
                      onChange={handleFilterChange}
                      placeholder="Filter by family"
                    />
                  </div>
                </th>
                <th>
                  Region
                  <div className="filter-input">
                    <input
                      id="region"
                      name="region"
                      type="text"
                      value={filters.region}
                      onChange={handleFilterChange}
                      placeholder="Filter by region"
                    />
                  </div>
                </th>
                <th>
                  Resource ID
                  <div className="filter-input">
                    <input
                      id="resourceId"
                      name="resourceId"
                      type="text"
                      value={filters.resourceId}
                      onChange={handleFilterChange}
                      placeholder="Filter by resource ID"
                    />
                  </div>
                </th>
                <th>
                  Operation
                  <div className="filter-input">
                    <input
                      id="operation"
                      name="operation"
                      type="text"
                      value={filters.operation}
                      onChange={handleFilterChange}
                      placeholder="Filter by operation"
                    />
                  </div>
                </th>
                <th>
                  Cost
                  <div className="filter-input">
                    <input
                      id="effectiveCost"
                      name="effectiveCost"
                      type="text"
                      value={filters.effectiveCost || ""}
                      onChange={handleFilterChange}
                      placeholder="Filter by cost"
                    />
                  </div>
                </th>
                <th>
                  Start Date
                  <div className="filter-input">
                    <input
                      id="startDate"
                      name="startDate"
                      type="text"
                      value={filters.startDate || ""}
                      onChange={handleFilterChange}
                      placeholder="Filter by start date"
                    />
                  </div>
                </th>
                <th>
                  End Date
                  <div className="filter-input">
                    <input
                      id="endDate"
                      name="endDate"
                      type="text"
                      value={filters.endDate || ""}
                      onChange={handleFilterChange}
                      placeholder="Filter by end date"
                    />
                  </div>
                </th>
                <th>
                  Usage
                  <div className="filter-input">
                    <input
                      id="usageAmount"
                      name="usageAmount"
                      type="text"
                      value={filters.usageAmount || ""}
                      onChange={handleFilterChange}
                      placeholder="Filter by usage"
                    />
                  </div>
                </th>
                <th>
                  Account
                  <div className="filter-input">
                    <select
                      onChange={handleSelectChange}
                      value={selectedAccount?.targetName || ""}
                      className="account-select-table"
                    >
                      {accounts.map((acc, index) => (
                        <option key={index} value={acc.targetName}>
                          {acc.targetName}
                        </option>
                      ))}
                    </select>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="11" className="loading-cell">
                    Loading data...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan="11" className="error-cell">
                    Error loading data
                  </td>
                </tr>
              ) : filteredResults.length === 0 ? (
                <tr>
                  <td colSpan="11" className="empty-cell">
                    No data available
                  </td>
                </tr>
              ) : (
                filteredResults.map((row, index) => (
                  <tr key={index}>
                    <td>{row.account || "N/A"}</td>
                    <td>{getProductName(row.productName)}</td>
                    <td>{row.productFamily || "N/A"}</td>
                    <td>{row.region || "N/A"}</td>
                    <td>{row.resourceId || "N/A"}</td>
                    <td>{row.operation || "N/A"}</td>
                    <td className="cost-cell">
                      {formatCost(row.effectiveCost)}
                    </td>
                    <td>{formatDate(row.startDate)}</td>
                    <td>{formatDate(row.endDate)}</td>
                    <td className="number-cell">{row.usageAmount || "0"}</td>
                    <td>{selectedAccount.targetName}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Filter;

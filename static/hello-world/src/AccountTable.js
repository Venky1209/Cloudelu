import React, { useState } from "react";
import "./AccountTable.css";

// Enhanced dummy data for the table
const dummyData = {
  "Account1": {
    tableData: [
      {
        account: "AWS Dev",
        productName: "EC2",
        productFamily: "Compute Instance",
        region: "US East (N. Virginia)",
        resourceId: "i-0abccd23efgh5678",
        operation: "Run Instances",
        effectiveCost: "$25.36",
        resourceTag: "Environment=Production",
        startDate: "14/05/24",
        endDate: "23/11/24",
        usageAmount: "$0.12 per hour"
      },
      {
        account: "AWS Dev",
        productName: "S3",
        productFamily: "Storage",
        region: "US West (Oregon)",
        resourceId: "bucket-xyz",
        operation: "Store Data",
        effectiveCost: "$15.20",
        resourceTag: "Environment=Staging",
        startDate: "01/06/24",
        endDate: "15/12/24",
        usageAmount: "$0.05 per GB"
      }
    ]
  },
  "Account2": {
    tableData: [
      {
        account: "AWS Prod",
        productName: "RDS",
        productFamily: "Database Instance",
        region: "Europe (Frankfurt)",
        resourceId: "db-abc123xyz456",
        operation: "CreateDBInstance",
        effectiveCost: "$48.75",
        resourceTag: "Department=Finance",
        startDate: "14/05/24",
        endDate: "23/11/24",
        usageAmount: "$0.25 per hour"
      },
      {
        account: "AWS Prod",
        productName: "Lambda",
        productFamily: "Serverless Function",
        region: "US West (Oregon)",
        resourceId: "arn:aws:lambda:us-west-2:123456789012:function:my-function",
        operation: "InvokeFunction",
        effectiveCost: "$9.45",
        resourceTag: "Team=DevOps",
        startDate: "14/05/24",
        endDate: "23/11/24",
        usageAmount: "$0.00001667 per request"
      }
    ]
  },
  "Account3": {
    tableData: [
      {
        account: "AWS Test",
        productName: "CloudFront",
        productFamily: "Content Delivery",
        region: "South America (São Paulo)",
        resourceId: "E123ABC456XYZ",
        operation: "DataTransferOut",
        effectiveCost: "$32.60",
        resourceTag: "Application=MediaStreaming",
        startDate: "12/03/25",
        endDate: "12/03/25",
        usageAmount: "$0.085 per GB"
      },
      {
        account: "AWS Test",
        productName: "DynamoDB",
        productFamily: "NoSQL Database",
        region: "Africa (Cape Town)",
        resourceId: "arn:aws:dynamodb:af-south-1:123456789012:table/MyTable",
        operation: "ReadCapacityUnit",
        effectiveCost: "$20.80",
        resourceTag: "Service=Analytics",
        startDate: "12/03/25",
        endDate: "12/03/25",
        usageAmount: "$0.00065 per read unit"
      }
    ]
  }
};

// Default data for accounts not in the dummy data
const defaultData = {
  tableData: [
    {
      account: "AWS Dev",
      productName: "EC2",
      productFamily: "Compute Instance",
      region: "US East (N. Virginia)",
      resourceId: "i-0abccd23efgh5678",
      operation: "Run Instances",
      effectiveCost: "$25.36",
      resourceTag: "Environment=Production",
      startDate: "14/05/24",
      endDate: "23/11/24",
      usageAmount: "$0.12 per hour"
    }
  ]
};

const AccountTable = ({ accountName }) => {
  // Get data for the selected account or use default data
  const data = dummyData[accountName] || defaultData;
  
  // State for filters
  const [filters, setFilters] = useState({
    account: "",
    productName: "",
    productFamily: "",
    region: "",
    resourceId: "",
    operation: "",
    effectiveCost: "",
    resourceTag: "",
    startDate: "",
    endDate: "",
    usageAmount: ""
  });
  
  
  // Handle filter changes
  const handleFilterChange = (e, key) => {
    setFilters({
      ...filters,
      [key]: e.target.value
    });
  };
  
  // Apply filters to table data
  const filteredData = data.tableData.filter(item => {
    return Object.keys(filters).every(key => {

      if (!filters[key]) return true;
      
      if (key === 'startDate' || key === 'endDate') {
        // Convert dates to comparable format
        const filterDate = new Date(filters[key]);
        const itemDate = new Date(item[key].split('/').reverse().join('-'));
        
        if (key === 'startDate') {
          return itemDate >= filterDate;
        } else {
          return itemDate <= filterDate;
        }
      }
      
      
      return String(item[key]).toLowerCase().includes(filters[key].toLowerCase());
    });
  });
  

  // Get unique values for filter dropdowns
  const getUniqueValues = (key) => {
    const values = data.tableData.map(item => item[key]);
    return ["", ...new Set(values)];
  };

  return (
    <div className="account-tables">
      <h2 className="table-title">Resource Usage Details</h2>
      
      {/* Resource Usage Table */}
      <div className="table-container">
        <table className="resource-table">
          <thead>
            <tr className="header-row">
              <th className="table-header">Account</th>
              <th className="table-header">Product Name</th>
              <th className="table-header">Product Family</th>
              <th className="table-header">Region</th>
              <th className="table-header">Resource ID</th>
              <th className="table-header">Operation</th>
              <th className="table-header">Effective Cost</th>
              <th className="table-header">Resource Tag</th>
              <th className="table-header">Start Date</th>
              <th className="table-header">End Date</th>
              <th className="table-header">Usage Amount</th>
            </tr>
            <tr className="filter-row">
            <td className="filter-cell">
                <select 
                    className="filter-select"
                    value={filters.account}
                    onChange={(e) => handleFilterChange(e, 'account')}
                >
                    <option value="">All Accounts</option>
                    {props.allAccounts.map((account) => (
                    <option key={account.targetName} value={account.targetName}>
                        {account.targetName}
                    </option>
                    ))}
                </select>
</td>

  <td className="filter-cell">
    <input 
      type="text"
      className="filter-input"
      placeholder="Filter..."
      value={filters.productName}
      onChange={(e) => handleFilterChange(e, 'productName')}
    />
  </td>
  <td className="filter-cell">
    <input 
      type="text"
      className="filter-input"
      placeholder="Filter..."
      value={filters.productFamily}
      onChange={(e) => handleFilterChange(e, 'productFamily')}
    />
  </td>
  <td className="filter-cell">
    <input 
      type="text"
      className="filter-input"
      placeholder="Filter..."
      value={filters.region}
      onChange={(e) => handleFilterChange(e, 'region')}
    />
  </td>
  <td className="filter-cell">
    <input 
      type="text"
      className="filter-input"
      placeholder="Filter..."
      value={filters.resourceId}
      onChange={(e) => handleFilterChange(e, 'resourceId')}
    />
  </td>
  <td className="filter-cell">
  <input 
    type="date" 
    className="date-input" 
    value={filters.startDate}
    onChange={(e) => handleFilterChange(e, 'startDate')}
  />
</td>
<td className="filter-cell">
  <input 
    type="date" 
    className="date-input" 
    value={filters.endDate}
    onChange={(e) => handleFilterChange(e, 'endDate')}
  />
</td>
  <td className="filter-cell">
    <input 
      type="text"
      className="filter-input"
      placeholder="Filter..."
      value={filters.operation}
      onChange={(e) => handleFilterChange(e, 'operation')}
    />
  </td>
  <td className="filter-cell">
    <input 
      type="text"
      className="filter-input"
      placeholder="Filter..."
      value={filters.effectiveCost}
      onChange={(e) => handleFilterChange(e, 'effectiveCost')}
    />
  </td>
  <td className="filter-cell">
    <input 
      type="text"
      className="filter-input"
      placeholder="Filter..."
      value={filters.resourceTag}
      onChange={(e) => handleFilterChange(e, 'resourceTag')}
    />
  </td>
  <td className="filter-cell">
    <input type="date" className="date-input" defaultValue="2025-03-12" />
  </td>
  <td className="filter-cell">
    <input type="date" className="date-input" defaultValue="2025-03-12" />
  </td>
  <td className="filter-cell">
    <input 
      type="text"
      className="filter-input"
      placeholder="Filter..."
      value={filters.usageAmount}
      onChange={(e) => handleFilterChange(e, 'usageAmount')}
    />
  </td>
</tr>


          </thead>
          <tbody>
            {filteredData.map((item, index) => (
              <tr key={index} className={index % 2 === 0 ? 'data-row-even' : 'data-row-odd'}>
                <td className="data-cell">{item.account}</td>
                <td className="data-cell">{item.productName}</td>
                <td className="data-cell">{item.productFamily}</td>
                <td className="data-cell">{item.region}</td>
                <td className="data-cell resource-id">{item.resourceId}</td>
                <td className="data-cell">{item.operation}</td>
                <td className="data-cell cost">{item.effectiveCost}</td>
                <td className="data-cell">{item.resourceTag}</td>
                <td className="data-cell">{item.startDate}</td>
                <td className="data-cell">{item.endDate}</td>
                <td className="data-cell">{item.usageAmount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AccountTable;

import React from "react";

// Enhanced dummy data for visualizations
const dummyData = {
  "Account1": {
    costByDate: {
      days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      costs: [150, 230, 210, 180, 170, 190, 250]
    },
    costByProduct: [
      { name: "EC2", value: 1068, color: "#4285F4" },
      { name: "S3", value: 580, color: "#FBBC05" },
      { name: "RDS", value: 773, color: "#EA4335" },
      { name: "Lambda", value: 368, color: "#34A853" }
    ],
    costByRegion: [
      { name: "US East (Ohio)", value: 735, color: "#4285F4" },
      { name: "US West (N. California)", value: 685, color: "#34A853" },
      { name: "Europe (Ireland)", value: 464, color: "#FBBC05" },
      { name: "Europe (London)", value: 165, color: "#EA4335" },
      { name: "Middle East (UAE)", value: 230, color: "#46BFBD" }
    ]
  },
  "Account2": {
    costByDate: {
      days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      costs: [120, 180, 230, 150, 200, 170, 210]
    },
    costByProduct: [
      { name: "EC2", value: 850, color: "#4285F4" },
      { name: "S3", value: 420, color: "#FBBC05" },
      { name: "RDS", value: 630, color: "#EA4335" },
      { name: "Lambda", value: 290, color: "#34A853" }
    ],
    costByRegion: [
      { name: "US East (Ohio)", value: 620, color: "#4285F4" },
      { name: "US West (N. California)", value: 540, color: "#34A853" },
      { name: "Europe (Ireland)", value: 380, color: "#FBBC05" },
      { name: "Europe (London)", value: 210, color: "#EA4335" },
      { name: "Middle East (UAE)", value: 180, color: "#46BFBD" }
    ]
  },
  "Account3": {
    costByDate: {
      days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      costs: [180, 200, 160, 220, 240, 190, 170]
    },
    costByProduct: [
      { name: "EC2", value: 920, color: "#4285F4" },
      { name: "S3", value: 510, color: "#FBBC05" },
      { name: "RDS", value: 680, color: "#EA4335" },
      { name: "Lambda", value: 320, color: "#34A853" }
    ],
    costByRegion: [
      { name: "US East (Ohio)", value: 680, color: "#4285F4" },
      { name: "US West (N. California)", value: 590, color: "#34A853" },
      { name: "Europe (Ireland)", value: 420, color: "#FBBC05" },
      { name: "Europe (London)", value: 190, color: "#EA4335" },
      { name: "Middle East (UAE)", value: 210, color: "#46BFBD" }
    ]
  }
};

// Default data for accounts not in the dummy data
const defaultData = {
  costByDate: {
    days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    costs: [150, 230, 210, 180, 170, 190, 250]
  },
  costByProduct: [
    { name: "EC2", value: 1068, color: "#4285F4" },
    { name: "S3", value: 580, color: "#FBBC05" },
    { name: "RDS", value: 773, color: "#EA4335" },
    { name: "Lambda", value: 368, color: "#34A853" }
  ],
  costByRegion: [
    { name: "US East (Ohio)", value: 735, color: "#4285F4" },
    { name: "US West (N. California)", value: 685, color: "#34A853" },
    { name: "Europe (Ireland)", value: 464, color: "#FBBC05" },
    { name: "Europe (London)", value: 165, color: "#EA4335" },
    { name: "Middle East (UAE)", value: 230, color: "#46BFBD" }
  ]
};

const DummyVisualization = ({ accountName }) => {
  // Get data for the selected account or use default data
  const data = dummyData[accountName] || defaultData;
  
  // Calculate max value for the line chart
  const maxCost = Math.max(...data.costByDate.costs) + 50;
  
  // Calculate totals
  const totalByProduct = data.costByProduct.reduce((sum, item) => sum + item.value, 0);
  const totalByRegion = data.costByRegion.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="cost-tracker" style={{ 
      backgroundColor: '#f5f7fa', 
      borderRadius: '8px', 
      padding: '20px', 
      boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
      marginBottom: '30px'
    }}>
      <h1 style={{ 
        fontSize: '24px', 
        fontWeight: '600', 
        color: '#172B4D', 
        marginBottom: '5px' 
      }}>Cost Tracker</h1>
      <p style={{ 
        fontSize: '14px', 
        color: '#5E6C84', 
        marginBottom: '25px' 
      }}>AWS Cost and Usage Data</p>
      
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        flexWrap: "wrap",
        gap: "20px"
      }}>
        {/* Cost by Date Chart */}
        <div style={{ 
          flex: "1 1 30%", 
          minWidth: "300px", 
          backgroundColor: "white", 
          borderRadius: "8px", 
          padding: "20px", 
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)" 
        }}>
          <h2 style={{ 
            fontSize: '18px', 
            fontWeight: '500', 
            color: '#172B4D', 
            marginBottom: '15px',
            textAlign: 'center'
          }}>Cost by Date</h2>
          <div style={{ position: "relative", height: "220px" }}>
            <svg width="100%" height="220">
              {/* Grid lines */}
              {[0, 1, 2, 3, 4].map((i) => (
                <line 
                  key={`grid-${i}`}
                  x1="40" 
                  y1={170 - (i * 40)} 
                  x2="95%" 
                  y2={170 - (i * 40)} 
                  stroke="#eee" 
                  strokeWidth="1" 
                />
              ))}
              
              {/* Y-axis */}
              <line x1="40" y1="10" x2="40" y2="170" stroke="#ccc" strokeWidth="1" />
              
              {/* X-axis */}
              <line x1="40" y1="170" x2="95%" y2="170" stroke="#ccc" strokeWidth="1" />
              
              {/* Y-axis labels */}
              {[0, 50, 100, 150, 200].map((value, i) => (
                <text
                  key={`y-label-${i}`}
                  x="35"
                  y={170 - (i * 40)}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fontSize="10"
                  fill="#5E6C84"
                >
                  {value}
                </text>
              ))}
              
              {/* Plot line */}
              <polyline
                points={data.costByDate.costs.map((cost, index) => {
                  const x = 40 + ((index * (95 - 40)) / (data.costByDate.days.length - 1)) + "%";
                  const y = 170 - ((cost / maxCost) * 160);
                  return `${x},${y}`;
                }).join(" ")}
                fill="none"
                stroke="#0052CC"
                strokeWidth="2"
              />
              
              {/* Data points */}
              {data.costByDate.costs.map((cost, index) => {
                const x = 40 + ((index * (95 - 40)) / (data.costByDate.days.length - 1)) + "%";
                const y = 170 - ((cost / maxCost) * 160);
                return (
                  <g key={index}>
                    <circle
                      cx={x}
                      cy={y}
                      r="4"
                      fill="white"
                      stroke="#0052CC"
                      strokeWidth="2"
                    />
                    <text
                      x={x}
                      y={y - 10}
                      textAnchor="middle"
                      fontSize="10"
                      fill="#172B4D"
                    >
                      ${cost}
                    </text>
                  </g>
                );
              })}
              
              {/* X-axis labels */}
              {data.costByDate.days.map((day, index) => {
                const x = 40 + ((index * (95 - 40)) / (data.costByDate.days.length - 1)) + "%";
                return (
                  <text
                    key={index}
                    x={x}
                    y="185"
                    textAnchor="middle"
                    fontSize="11"
                    fill="#5E6C84"
                  >
                    {day}
                  </text>
                );
              })}
            </svg>
          </div>
        </div>
        
        {/* Cost by Product Chart */}
        <div style={{ 
          flex: "1 1 30%", 
          minWidth: "300px", 
          backgroundColor: "white", 
          borderRadius: "8px", 
          padding: "20px", 
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)" 
        }}>
          <h2 style={{ 
            fontSize: '18px', 
            fontWeight: '500', 
            color: '#172B4D', 
            marginBottom: '15px',
            textAlign: 'center'
          }}>Cost by Product</h2>
          <div style={{ position: "relative", height: "220px" }}>
            <svg width="100%" height="200" viewBox="0 0 200 200">
              {/* Pie chart */}
              {data.costByProduct.map((product, index, arr) => {
                const total = arr.reduce((sum, item) => sum + item.value, 0);
                let startAngle = 0;
                
                for (let i = 0; i < index; i++) {
                  startAngle += (arr[i].value / total) * 360;
                }
                
                const endAngle = startAngle + (product.value / total) * 360;
                
                // Convert angles to radians
                const startRad = (startAngle - 90) * Math.PI / 180;
                const endRad = (endAngle - 90) * Math.PI / 180;
                
                // Calculate SVG arc path
                const x1 = 100 + 70 * Math.cos(startRad);
                const y1 = 100 + 70 * Math.sin(startRad);
                const x2 = 100 + 70 * Math.cos(endRad);
                const y2 = 100 + 70 * Math.sin(endRad);
                
                // Determine if the arc should be drawn as a large arc
                const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;
                
                return (
                  <path
                    key={index}
                    d={`M 100 100 L ${x1} ${y1} A 70 70 0 ${largeArcFlag} 1 ${x2} ${y2} Z`}
                    fill={product.color}
                    stroke="white"
                    strokeWidth="1"
                  />
                );
              })}
              
              {/* Center text */}
              <text
                x="100"
                y="95"
                textAnchor="middle"
                fontSize="12"
                fill="#5E6C84"
              >
                Total
              </text>
              <text
                x="100"
                y="115"
                textAnchor="middle"
                fontSize="16"
                fontWeight="bold"
                fill="#172B4D"
              >
                ${totalByProduct}
              </text>
            </svg>
          </div>
          
          {/* Legend */}
          <div style={{ marginTop: "10px" }}>
            {data.costByProduct.map((product, index) => (
              <div key={index} style={{ 
                display: "flex", 
                alignItems: "center", 
                marginBottom: "5px",
                justifyContent: "space-between"
              }}>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <div style={{ 
                    width: "12px", 
                    height: "12px", 
                    backgroundColor: product.color, 
                    marginRight: "5px",
                    borderRadius: "2px"
                  }}></div>
                  <span style={{ fontSize: "12px" }}>{product.name}</span>
                </div>
                <span style={{ fontSize: "12px", fontWeight: "500" }}>${product.value}</span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Cost by Region Chart */}
        <div style={{ 
          flex: "1 1 30%", 
          minWidth: "300px", 
          backgroundColor: "white", 
          borderRadius: "8px", 
          padding: "20px", 
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)" 
        }}>
          <h2 style={{ 
            fontSize: '18px', 
            fontWeight: '500', 
            color: '#172B4D', 
            marginBottom: '15px',
            textAlign: 'center'
          }}>Cost By Region</h2>
          <div style={{ position: "relative", height: "220px" }}>
            <svg width="100%" height="200" viewBox="0 0 200 200">
              {/* Pie chart */}
              {data.costByRegion.map((region, index, arr) => {
                const total = arr.reduce((sum, item) => sum + item.value, 0);
                let startAngle = 0;
                
                for (let i = 0; i < index; i++) {
                  startAngle += (arr[i].value / total) * 360;
                }
                
                const endAngle = startAngle + (region.value / total) * 360;
                
                // Convert angles to radians
                const startRad = (startAngle - 90) * Math.PI / 180;
                const endRad = (endAngle - 90) * Math.PI / 180;
                
                // Calculate SVG arc path
                const x1 = 100 + 70 * Math.cos(startRad);
                const y1 = 100 + 70 * Math.sin(startRad);
                const x2 = 100 + 70 * Math.cos(endRad);
                const y2 = 100 + 70 * Math.sin(endRad);
                
                // Determine if the arc should be drawn as a large arc
                const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;
                
                return (
                  <path
                    key={index}
                    d={`M 100 100 L ${x1} ${y1} A 70 70 0 ${largeArcFlag} 1 ${x2} ${y2} Z`}
                    fill={region.color}
                    stroke="white"
                    strokeWidth="1"
                  />
                );
              })}
              
              {/* Center text */}
              <text
                x="100"
                y="95"
                textAnchor="middle"
                fontSize="12"
                fill="#5E6C84"
              >
                Total
              </text>
              <text
                x="100"
                y="115"
                textAnchor="middle"
                fontSize="16"
                fontWeight="bold"
                fill="#172B4D"
              >
                ${totalByRegion}
              </text>
            </svg>
          </div>
          
          {/* Legend */}
          <div style={{ marginTop: "10px" }}>
            {data.costByRegion.map((region, index) => (
              <div key={index} style={{ 
                display: "flex", 
                alignItems: "center", 
                marginBottom: "5px",
                justifyContent: "space-between"
              }}>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <div style={{ 
                    width: "12px", 
                    height: "12px", 
                    backgroundColor: region.color, 
                    marginRight: "5px",
                    borderRadius: "2px"
                  }}></div>
                  <span style={{ fontSize: "12px" }}>{region.name}</span>
                </div>
                <span style={{ fontSize: "12px", fontWeight: "500" }}>${region.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DummyVisualization;

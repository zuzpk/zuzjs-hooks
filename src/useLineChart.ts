import { useEffect, useState } from 'react';

// Define TypeScript interfaces for data and component props
export interface DataPoint {
  x: number;
  y: number;
}

export interface UseLineChartDimensions {
  width: number;
  height: number;
}

export interface UseLineChartReturn {
  pathD: string;
  areaPathD: string;
}

export interface LineChartProps {
  data: DataPoint[];
  width?: string | number;
  height?: string | number;
  lineColor?: string;
  strokeWidth?: number;
  gradientStartColor?: string;
  gradientEndColor?: string;
  padding?: number,
  animated?: boolean; // New prop to control animation
}

// Helper function to generate a smooth SVG path from data points
// This uses cubic Bezier curves for smoothing.
const getSmoothLinePath = (data: DataPoint[], width: number, height: number, padding: number = 20): string => {
  
  if (!data || data.length === 0 || width <= 0 || height <= 0) return "";

  // Calculate min/max for x and y values to scale the data
  const minX = Math.min(...data.map(d => d.x));
  const maxX = Math.max(...data.map(d => d.x));
  const minY = Math.min(...data.map(d => d.y));
  const maxY = Math.max(...data.map(d => d.y));

  // Determine scaling factors, ensuring padding
  const scaleX = (width - 2 * padding) / (maxX - minX);
  const scaleY = (height - 2 * padding) / (maxY - minY);

  // Function to convert data point to SVG coordinate
  const toSvgCoords = (point: DataPoint) => {
    const svgX = (point.x - minX) * scaleX + padding;
    // SVG Y-axis is inverted, so we subtract from height
    const svgY = height - ((point.y - minY) * scaleY + padding);
    return { x: svgX, y: svgY };
  };

  // Convert all data points to SVG coordinates
  const svgPoints = data.map(toSvgCoords);

  let path = "";
  if (svgPoints.length > 0) {
    // Start the path at the first point
    path = `M ${svgPoints[0].x},${svgPoints[0].y}`;

    for (let i = 0; i < svgPoints.length - 1; i++) {
      const p0 = svgPoints[i];
      const p1 = svgPoints[i + 1];

      // Calculate control points for cubic Bezier curve
      // This is a simplified approach for smooth curves.
      // For more advanced smoothing, consider D3's curve generators.
      const cp1 = {
        x: (p0.x + p1.x) / 2,
        y: p0.y
      };
      const cp2 = {
        x: (p0.x + p1.x) / 2,
        y: p1.y
      };

      // Add cubic Bezier curve segment
      path += ` C ${cp1.x},${cp1.y} ${cp2.x},${cp2.y} ${p1.x},${p1.y}`;
    }
  }
  return path;
};

// Helper function to generate the SVG path for the filled area below the line
const getAreaPath = (data: DataPoint[], width: number, height: number, padding: number = 20): string => {
  if (!data || data.length === 0) return "";

  // Reuse the line path generation logic for the top boundary of the area
  const linePath = getSmoothLinePath(data, width, height, padding);

  // Calculate min/max for x values to scale the data
  const minX = Math.min(...data.map(d => d.x));
  const maxX = Math.max(...data.map(d => d.x));

  // Determine scaling factor for x
  const scaleX = (width - 2 * padding) / (maxX - minX);

  // Get SVG coordinates for the first and last points of the line
  const firstPointSvgX = (data[0].x - minX) * scaleX + padding;
  const lastPointSvgX = (data[data.length - 1].x - minX) * scaleX + padding;

  // The bottom Y-coordinate of the chart, accounting for padding
  const chartBottomY = height - padding;

  // Construct the area path:
  // 1. Start at the first point of the line path
  // 2. Follow the smooth line path
  // 3. Draw a vertical line down from the last point to the bottom of the chart
  // 4. Draw a horizontal line across the bottom to the x-coordinate of the first point
  // 5. Draw a vertical line up from the bottom to the first point's y-coordinate (closing the path)
  return `${linePath} L ${lastPointSvgX},${chartBottomY} L ${firstPointSvgX},${chartBottomY} Z`;
};


// Custom React hook for the line chart logic
const useLineChart = (data: DataPoint[], dimensions: UseLineChartDimensions = { width: 600, height: 300 }, padding: number = 20): UseLineChartReturn => {
  const [pathD, setPathD] = useState<string>("");
  const [areaPathD, setAreaPathD] = useState<string>("");

  useEffect(() => {
    // Generate the SVG path whenever data or dimensions change
    const newPathD = getSmoothLinePath(data, dimensions.width, dimensions.height, padding);
    setPathD(newPathD);

    // Generate the area path for the gradient fill
    const newAreaPathD = getAreaPath(data, dimensions.width, dimensions.height, padding);
    setAreaPathD(newAreaPathD);
  }, [data, dimensions.width, dimensions.height, padding]);

  return { pathD, areaPathD };
};

export default useLineChart
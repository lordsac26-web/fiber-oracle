import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { motion } from 'framer-motion';

export default function EnhancedChart({
  option,
  style = { height: '400px' },
  theme = 'dark',
  animated = true,
}) {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (!chartRef.current) return;

    // Initialize chart
    chartInstance.current = echarts.init(chartRef.current, theme);
    chartInstance.current.setOption(option);

    // Handle window resize
    const handleResize = () => {
      chartInstance.current?.resize();
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      chartInstance.current?.dispose();
    };
  }, [option, theme]);

  const container = (
    <div
      ref={chartRef}
      style={style}
      className="rounded-lg border border-slate-700/50 dark:border-slate-600/50 overflow-hidden"
    />
  );

  return animated ? (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {container}
    </motion.div>
  ) : (
    container
  );
}
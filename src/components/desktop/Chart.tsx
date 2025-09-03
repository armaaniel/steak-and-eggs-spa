import React from 'react';
import { useState, useEffect } from 'react';
import { LineChart, Line, Tooltip, ResponsiveContainer, YAxis } from 'recharts';
import {toCurrency} from '../../utils.js'

interface ChartProps {
  chartData: any[];
  dataKey: string;
}

const Chart = React.memo(({chartData}: ChartProps) => {
									
	return (
		
 	   	<ResponsiveContainer width="100%" height={"100%"}>
			<LineChart data = {chartData}>
				<Line type="monotone" dataKey='value' stroke="#8884d8" strokeWidth={2} dot={false} />
      		<Tooltip cursor={false} position={{ x: 0, y: 0 }} labelFormatter={(index) => chartData[index].date}
			contentStyle={{ border: 'none', background: 'none', display: 'flex', padding:'4px', gap:'8px' }} 
			formatter={(value) => toCurrency(value as number)}/>
          <YAxis domain={[dataMin => (dataMin*0.95), dataMax => (dataMax * 1.05)]} hide={true} />
			
    		</LineChart>		
		</ResponsiveContainer>
	)
});

export default Chart;
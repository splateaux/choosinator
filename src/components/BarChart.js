import React from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart } from 'chart.js';
import {
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  Title,
} from 'chart.js';

Chart.register(
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  Title
);

const CustomBarChart = ({ data, games, users }) => {
  const userColors = users.reduce((acc, user) => {
    acc[user.id] = user.color;
    return acc;
  }, {});

  const dataSeries = games.map((game) => {
    const gamePoints = data[game.id] || [];
  
    const userPoints = users.map((user) => {
      const userPointData = gamePoints.find(
        (pointData) => pointData.userId === user.id
      );
  
      return userPointData ? userPointData.points : 0;
    });
  
    const totalPoints = userPoints.reduce((sum, points) => sum + points, 0);
  
    return {
      gameName: game.name,
      userPoints: userPoints,
      totalPoints: totalPoints,
    };
  });
  
  dataSeries.sort((a, b) => b.totalPoints - a.totalPoints);

  const chartData = {
    labels: dataSeries.map((item) => item.gameName),
    datasets: users.map((user, index) => ({
      label: `User ${index + 1}`,
      data: dataSeries.map((item) => item.userPoints[index]),
      backgroundColor: userColors[user.id],
    })),
  };


  const options = {
    indexAxis: 'y',
    scales: {
      x: {
        type: 'linear',
        stacked: true,
        ticks: {
          beginAtZero: true,
        },
      },
      y: {
        stacked: true,
      },
    },
    plugins: {
      legend: {
        display: true,
      },
    },
  };

  return (
    <div>
      <h3>Games Points Distribution</h3>
      <Bar data={chartData} options={options} />
    </div>
  );
};

export default CustomBarChart;

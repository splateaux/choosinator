export default function customTransport(options) {
    return (record) => {
      const logs = JSON.parse(localStorage.getItem('logs') || '[]');
      logs.push(record);
      localStorage.setItem('logs', JSON.stringify(logs));
    };
  }
  
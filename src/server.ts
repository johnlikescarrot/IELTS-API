import app from './app';

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

const server = app.listen(PORT, HOST, () => {
  console.log(`🚀 IELTS-API server listening on http://${HOST}:${PORT}`);
  console.log(`📖 Interactive Docs available at http://${HOST}:${PORT}/api/v1/docs`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

export default server;

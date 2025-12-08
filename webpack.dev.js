const path = require('path');
const common = require('./webpack.common.js');
const { merge } = require('webpack-merge');

module.exports = merge(common, {
  mode: 'development',
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [
          'style-loader',
          'css-loader',
        ],
      },
    ],
  },
  devServer: {
    static: [
      {
        directory: path.resolve(__dirname, 'dist'),
      },
      {
        directory: path.resolve(__dirname, 'src/public'),
        publicPath: '/public',
      }
    ],
    port: 8081,
    host: '0.0.0.0',
    server: {
      type: 'http',
    },
    client: {
      overlay: {
        errors: true,
        warnings: true,
      },
    },
    proxy: [
      {
        context: ['/api'],
        target: 'https://story-api.dicoding.dev/v1',
        changeOrigin: true,
        secure: true,
        pathRewrite: { '^/api': '' },
        timeout: 60000,
        onProxyReq: (proxyReq, req, res) => {
          proxyReq.setTimeout(60000);
        },
        onError: (err, req, res) => {
          console.log('Proxy error for /api:', err);
          res.status(504).json({ error: 'Gateway Timeout' });
        },
      },
      {
        context: ['/notifications'],
        target: 'https://story-api.dicoding.dev',
        changeOrigin: true,
        secure: true,
        timeout: 60000,
        onProxyReq: (proxyReq, req, res) => {
          proxyReq.setTimeout(60000);
        },
        onError: (err, req, res) => {
          console.log('Proxy error for /notifications:', err);
          res.status(504).json({ error: 'Gateway Timeout' });
        },
      },
      // BAGIAN YANG DIPERBAIKI: Harus menggunakan format Object dengan 'context' key
      {
        context: ['/subscriptions'], // <-- MEMPERBAIKI SyntaxError
        target: 'http://localhost:4000',
        changeOrigin: true,
        timeout: 60000,
        onProxyReq: (proxyReq, req, res) => {
          // Add timeout handling
          proxyReq.setTimeout(60000);
        },
        onError: (err, req, res) => {
          console.log('Proxy error for /subscriptions:', err);
          res.status(504).json({ error: 'Gateway Timeout' });
        },
      },
    ],
  },
});
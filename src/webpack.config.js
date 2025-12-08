// webpack.config.js

// 1. Impor plugin di bagian atas file
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  // ...konfigurasi Anda yang lain (entry, output, module)
  
  plugins: [
    // ...plugin Anda yang lain (HtmlWebpackPlugin, dll.)

    // 2. Tambahkan CopyWebpackPlugin
    new CopyWebpackPlugin({
      patterns: [
        {
          // Asumsi file Anda ada di 'src/service-worker.js'
          // MENJADI INI:
            navigator.serviceWorker.register('/scripts/sw.js')
            from: '/scripts/sw.js', // File sumber
            to: '/scripts/sw.js',
          
          // Salin ke root folder output (dist/service-worker.js
        },
        {
          from: 'manifest.json',
          to: 'manifest.json',
        }
      ],
    }),
  ],
};
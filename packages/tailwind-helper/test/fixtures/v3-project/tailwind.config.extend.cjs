const localColors = require('./local-colors.cjs');

module.exports = {
  content: ['./src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ...localColors,
        brand: {
          500: '#3366ff'
        }
      }
    }
  }
};

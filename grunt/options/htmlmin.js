module.exports = {

  main: {
    options: {
      removeComments: true,
      collapseWhitespace: true,
      minifyCSS: true
    },
    files: {
      '<%= path %>/index.html': '<%= path %>/index.html',
      '<%= path %>/dashif.html': '<%= path %>/dashif.html',
      '<%= path %>/player.html': '<%= path %>/player.html'
    }
  }
  
};
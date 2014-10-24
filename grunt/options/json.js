module.exports = {

  main: {
    options: {
      namespace: 'jsonData',
      includePath: false,
      processName: function(filename) {
        return filename.toLowerCase();
      }
    },
    src: [
    '<%= appDashif %>/json/sources.json',
    '<%= appDashif %>/json/notes.json',
    '<%= appDashif %>/json/contributors.json',
    '<%= appDashif %>/json/player_libraries.json',
    '<%= appDashif %>/json/showcase_libraries.json'
    ],
    dest: '<%= path %>/json.js'
  }
  
};
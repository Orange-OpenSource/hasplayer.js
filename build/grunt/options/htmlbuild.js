module.exports = {

    dist: {
        src: '<%= path %>/dashif.html',
        dest: '<%= path %>',
        options: {
            beautify: true,
            relative: true,
            styles: {
                main: ['<%= path %>/style.css']
            }
        }
    }
};